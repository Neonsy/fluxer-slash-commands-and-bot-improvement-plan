# Command Persistence Specification

Status: repository-derived decision under QAD-145 and QAD-165, extended by QAD-227 through QAD-235. Names are proposed source-model/table names; implementation must use the repository's table generator and generated migrations rather than editing generated output.

## Storage principles

- Use Fluxer's query-first `defineTable` pattern and explicit denormalized lookup tables; do not introduce database secondary indexes.
- Stable public command identity is a Fluxer Snowflake. Stable semantic identity is `(application_id, developer_key)`.
- Immutable command and manifest revisions are written before a single versioned head pointer is conditionally advanced. Readers only observe the head, so an interrupted publish cannot expose a partial manifest.
- Community configuration and user preferences reference `(application_id, command_id)` and survive command absence as already decided.
- Security-relevant fields are typed columns and part of the canonical definition hash. Human-facing option/description/localization trees use validated canonical JSON because they are fetched as a unit and are never queried independently.
- Every source/index pair is maintained by one repository. Reconciliation repairs incomplete denormalized writes; callers never write lookup tables directly.

## Identity and history retention

One application may retain at most 1,000 command identities. Inactive identities still count until an explicit retirement completes. Retirement is allowed only when the identity is absent from retained manifests and no guild configuration, user preference, active interaction, or other reference still depends on it. A later command using the same developer key receives a new ID and inherits nothing.

The retained history is the newest 20 manifests plus at most 5 additionally pinned manifests. Temporary safety retention is allowed only while an in-flight operation still references a manifest. Command and manifest rows outside those sets may be removed only after a reference check; cleanup never removes the current manifest or an identity that still has dependants.

## Application command identity

### `application_commands`

Partition key `(application_id)`; clustering key `(command_id)`.

| Column | Type | Meaning |
|---|---|---|
| `application_id` | Snowflake | Owning application |
| `command_id` | Snowflake | Stable Discord-compatible command resource ID |
| `developer_key` | normalized string | Immutable application-scoped semantic key |
| `type` | small integer | Initially chat-input only |
| `created_at` | timestamp | First registration |
| `deleted_at` | nullable timestamp | Dormant definition marker; row is retained |
| `current_command_revision` | integer | Revision selected by current manifest head |
| `version` | integer | CAS/versioned-update field |

### `application_command_keys`

Primary key `(application_id, developer_key)` with `command_id` and `created_at`. This is the uniqueness/tombstone lookup and is not deleted by ordinary command deletion. Re-registering the same key resolves the same command identity; a same-name different key receives a new identity.

## Stable command categories

`application_command_categories` uses partition `(application_id)` and clustering `(category_id)`. It stores permanent `category_key`, `created_at`, nullable `dormant_at`, current category revision, and row version. `application_command_category_keys` conditionally maps `(application_id, category_key)` to `category_id` and is retained until permanent application deletion. At most 100 keys may ever be reserved and at most 25 may be active in one manifest.

`application_command_category_revisions` is partitioned by `(application_id, category_id)` and clustered by `category_revision`; immutable rows contain default/localized labels, developer order, canonical hash, creator, and creation time. Category names/order are presentation, never lookup or policy identity.

## Immutable definitions and published manifests

### `application_command_revisions`

Partition key `(application_id, command_id)`; clustering key `(command_revision)`.

Columns: `schema_version`, `developer_enabled`, `default_name`, `execution_mode`, `default_member_permissions`, `allowed_native_operations`, `contexts`, `integration_types`, `availability_mode`, canonical `definition_json`, `definition_hash`, `created_at`, and `created_by_user_id`. Rows are immutable.

`definition_json` contains validated descriptions, options, QAD-227 collection declarations, QAD-228 canonical sibling relationship graphs, QAD-229 temporal types/static bounds/fixed timezone policy, choices, autocomplete declarations, and localizations. The typed authority columns are duplicated deliberately so review/diff/authorization does not depend on interpreting presentation JSON. Relationship equality constants and fixed timezone policy are public schema, not secret/community state, and no submitted option or resolved temporal value is persisted here.

QAD-229 does not copy a saved account or community timezone into command tables. CS verifies that the current account/profile timezone is staff-only and that `GuildRow` has no community timezone. An eligible current account setting may supply invocation context; ordinary baseline users have neither stored fallback and the picker requires an explicit timezone. Any future community/account fallback remains owned by its settings system and must exist there before SIM or implementation treats it as available.

### `application_command_manifest_heads`

Primary key `(application_id)`.

Columns: `published_manifest_revision`, `published_manifest_id`, `next_manifest_revision`, `draft_id`, `draft_version`, `updated_at`, and `version`. Publication uses compare-and-set on `version` and the expected prior published revision.

### `application_command_manifests`

Partition key `(application_id)`; clustering key `(manifest_revision)`.

Columns: `manifest_id` Snowflake, `manifest_hash`, `entry_count`, `category_count`, `published_at`, `published_by_user_id`, `publication_mode` (`IMMEDIATE`, `DRAFT`, or later `RECOVERY`), and nullable `recovery_source_revision`. Rows are immutable.

### `application_command_manifest_entries`

Partition key `(application_id, manifest_revision)`; clustering key `(command_id)`.

Columns: `command_revision`, `developer_key`, and nullable `category_id`. A separate immutable manifest-category partition maps every active `category_id` to its selected `category_revision`. Both complete partitions are written and validated before advancing the manifest head.

## Optional draft

### `application_command_drafts`

Primary key `(application_id)`.

Columns: `draft_id` Snowflake, `base_manifest_revision`, `draft_version`, `draft_hash`, `validation_state`, sanitized `validation_errors_json`, `created_at`, `updated_at`, and `updated_by_user_id`. One draft exists per application; edits conditionally increment `draft_version`.

### `application_command_draft_entries`

Partition key `(application_id, draft_id)`; clustering key `(developer_key)`.

Columns contain nullable `command_id` for new commands, nullable stable `category_id`, plus the same validated typed authority fields and canonical definition JSON as a command revision. Draft categories use a companion partition with existing/new category identities and revisions. Draft publication validates both complete partitions, writes immutable revisions/manifest entries, then advances the head.

## Community targeting

Default `ALL_INSTALLED_COMMUNITIES` and `NONE` modes require no target rows. `SELECTED_COMMUNITIES` uses both query directions:

- `application_command_targets_by_command`: partition `(application_id, command_id)`, clustering `(guild_id)`.
- `application_command_targets_by_guild`: partition `(guild_id)`, clustering `(application_id, command_id)`.

Each row stores the command revision that last changed targeting and `targeted_at`. Only active installations may be targeted, but dormant rows may temporarily remain during reconciliation and never grant availability by themselves.

## Community command configuration

### `guild_application_command_config_heads`

Primary key `(guild_id, application_id)`. Columns: monotonic `config_version`, `updated_at`, `updated_by_user_id`, and version for CAS. Bulk reset advances this head only after the replacement rows are ready.

### `guild_application_command_configs`

Partition key `(guild_id, application_id)`; clustering key `(command_id)`.

Columns: nullable tri-state `enabled_override`, nullable `community_alias`, serialized/validated invocation-policy reference or policy version, approved authority-envelope hash/revision, `pending_authority_review`, `updated_at`, `updated_by_user_id`, and row `version`. Absence means inherit application defaults. Rows remain dormant when the command or installation is absent.

The picker already discovers installed applications by guild, so this partition is loaded once per application and merged with the published manifest and targeting state.

### `guild_application_command_category_configs`

Partition key `(guild_id, application_id)`; clustering key `(category_id)`. Columns: `disabled`, `updated_at`, `updated_by_user_id`, and row `version`. Mutations advance the shared `guild_application_command_config_heads.config_version` through CAS. One row is the authoritative group gate; a toggle never rewrites member command rows.

Rows remain dormant when a category is absent. Reactivating the same permanent category key/ID restores the row, while permanent application or guild deletion removes it under their existing lifecycle. Effective availability denies when either this category row is disabled or the individual command is disabled; a per-command enable cannot override the category row.

### Community provider recommendations

`guild_command_provider_recommendations`: partition `(guild_id)`; clustering key `(normalized_shared_name)`. Columns: `provider_kind` (`NATIVE` or `APPLICATION`), nullable `application_id`, stable `command_id`, `updated_at`, `updated_by_user_id`, and row `version`. The manager-owned row uses the shared guild/application-command config head/versioning service but is never stored in `user_*` preference tables.

The selected identity must expose the exact normalized shared invocation name when written and whenever it affects ordering. A row remains dormant through temporary rename, command absence, application uninstall, or suspension and resumes only for the same identity/name after reactivation/reinstall. Permanent command retirement, application deletion, community deletion, or explicit manager reset removes it. User account deletion removes actor attribution according to ordinary audit/lifecycle rules but does not convert a community-owned recommendation into user state.

### Policy-reference query indexes

The command-policy repository maintains derived `guild_application_command_policy_refs_by_role` and `guild_application_command_policy_refs_by_channel` query tables. Each partitions by `(guild_id, subject_id)` and clusters by `(application_id, command_id)`, storing only source config/policy version and active/dormant state—never audience member lists, command inputs, or a second mutable policy document.

The authoritative source remains `guild_application_command_configs` and its referenced versioned policy. One source mutation conditionally updates/reconciles its reverse rows and config version; stale/missing index rows cannot authorize or write policy. QAD-235's authorized count/filter rereads current source versions before display. Role/channel/command/application/community deletion removes affected query rows through the existing source-owned reconciliation/deletion flow.

## Synchronized user preferences

### Global command identity preferences

`user_command_preferences`: partition `(user_id)`, clustering `(application_id, command_id)`; nullable `favorite_rank`, `hidden`, and `updated_at`. Hiding and favorites are account-wide. Absence means defaults.

### Explicit duplicate-provider preferences

- `user_command_provider_preferences`: partition `(user_id)`, clustering `(normalized_shared_name)`; selected `application_id`, `command_id`, and `updated_at`.
- `user_guild_command_provider_preferences`: partition `(user_id, guild_id)`, clustering `(normalized_shared_name)`; selected provider and `updated_at`.

The community row overrides the global row. A preference is ignored, not deleted, when its selected provider is unavailable.

### Alias-presentation preference

Add the global `command_name_presentation` enum to the existing user-settings row and its nullable community override to the existing user-guild-settings row. This preserves those rows' current ownership of synchronized global and guild-scoped UI preferences rather than creating a one-column table.

### Passive usage ordering

`user_guild_command_usage`: partition `(user_id, guild_id)`, clustering `(application_id, command_id)`; a bounded/saturating usage score, `last_used_at`, `expires_at`, and a deterministic ranking value derived only from successful invocations. It never stores arguments, option values, message content, or recallable command history.

Each successful invocation refreshes a sliding 90-day inactivity TTL. Database TTL is used where supported and the expiry timestamp plus cleanup reconciler enforces the same lifecycle on every backend. An expired row contributes no ranking even before physical cleanup. The user-owned **Reset command ordering** action deletes all passive rows in the chosen community immediately without changing favorites, hidden commands, name-presentation choices, or explicit provider preferences. Account deletion and community deletion remove their respective rows; leaving a community also removes that user's community-scoped rows. Rejoining starts with no prior passive ranking.

## Publication consistency and repair

1. Reserve stable command/category IDs and keys with conditional insertion.
2. Build and validate the complete canonical candidate, including identities, definitions, category state, targets, developer availability, and authority.
3. After hash match, compare canonical bytes with the current head and return QAD-232 no-op before writes when equal.
4. Write immutable command/category revisions.
5. Write the complete immutable manifest and command/category entry partitions.
6. Compare-and-set the manifest head.
7. Emit one deterministic publication event keyed by manifest ID.

Rows written before a failed head CAS are unreachable immutable candidates and can be garbage-collected after a safety window. A reconciler verifies source/index pairs and never reconstructs security fields from client caches.

Publication-only IDs, revision counters, timestamps, actor, and mode are excluded from semantic equality. The canonical comparison includes every active identity/content/target/authority field and uses the same default filling, map/set sorting, and meaningful-order preservation as hashing/serialization. Exact bytes, not hash alone, decide equality. No-op requests create no persistence row or durable request-history record; bounded aggregate metrics remain outside registry authority.

The QAD-233 dashboard reads these canonical sources and their existing denormalized query tables. It owns no manifest/draft/target/health copy, cache-as-authority, or export store. A no-change draft stays in the existing draft tables until an explicit edit/discard; permanent application deletion removes it with other drafts.
