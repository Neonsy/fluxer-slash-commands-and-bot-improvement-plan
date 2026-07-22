# Declarative Settings Schema and Storage

Status: repository-derived first-phase contract under QAD-125 through QAD-134, QAD-145, QAD-199, QAD-222, and QAD-223. This is an opt-in Fluxer extension negotiated through `fluxer.declarative-administration.v1`; it does not ingest existing bot-private configuration.

## Phase-one definition grammar

An application publishes one immutable, application-wide configuration schema selected by a versioned head. Settings use immutable developer keys with the accepted command-key grammar: 1–64 lowercase ASCII letters, digits, `_`, and `-`, beginning with a letter or digit.

Each setting definition has:

- immutable `key` and fundamental `type`;
- mutable localized `label`, `description`, and optional `placeholder`;
- optional section key and deterministic display order;
- `required`, `allow_null`, and optional application-supplied `default`;
- type-appropriate bounds and reference filters;
- optional dependencies used only to hide/disable fields and actions, never to create a second authorization language;
- immutable creation revision and current definition revision.

The first phase supports these semantic types:

| Type | Stored value | Initial constraints |
|---|---|---|
| `BOOLEAN` | boolean | no numeric/string coercion |
| `STRING` | UTF-8 string | declared min/max within 0–1024; single-line or multiline presentation; no developer regex |
| `INTEGER` | JSON integer | JavaScript-safe integer, declared min/max/step |
| `NUMBER` | finite JSON number | finite IEEE-754 value, declared min/max/step; no NaN/infinity |
| `ENUM` | stable developer choice key | 1–25 choices, each key 1–64 and label 1–100 |
| `CHANNEL` | channel Snowflake | optional allowlist of Fluxer channel types; resource must belong to the community |
| `ROLE` | role Snowflake | optional managed/everyone exclusion; resource must belong to the community |
| `USER` | user Snowflake | user must be a current community member unless the definition explicitly permits a retained departed-user reference |
| `ENUM_SET` | ordered unique choice keys | 0–25 selected values |
| `CHANNEL_SET` | ordered unique channel IDs | 0–25 community resources |
| `ROLE_SET` | ordered unique role IDs | 0–25 community resources |
| `USER_SET` | ordered unique user IDs | 0–25 community members |

Message references, arbitrary JSON, executable expressions, regexes, HTML, scripts, arbitrary component payloads, credentials, and opaque secret/password fields are not phase-one setting types. Repeatable records and message/reaction-role builders use later bounded schemas rather than smuggling structure into strings.

`required` and `allow_null` are distinct. A community value has one of `INHERIT`, `NULL`, or `VALUE`; `NULL` is legal only when `allow_null` is true. `INHERIT` resolves the current application default. A required inherited setting without a default is `UNCONFIGURED`, which is valid stored state but makes dependent actions unavailable until a manager supplies a value.

Changing the fundamental type is rejected forever for that key. Tightening bounds, removing a choice, changing reference filters, or removing a default never coerces an existing value: affected values become `NEEDS_ATTENTION`. Default changes affect only `INHERIT` values, are versioned, appear in configuration activity, and notify eligible managers before dependent application-handled actions are considered synchronized.

## Localization and sensitive-data boundary

- Labels, descriptions, placeholders, section text, and enum-choice labels may provide at most one value for each current `AllLocales` entry.
- A default string is required as fallback. Locale fallback follows the same exact-locale-then-default rule as application commands.
- Values themselves are never localized or translated by Fluxer.
- The schema has no `secret`, `password`, hidden-value, token, credential, private-key, or user-private-personal-data classification. Requests for such a field are rejected.
- Schema publication rejects reserved sensitive-purpose keys/labels such as password, token, credential, secret, private key, recovery code, and webhook secret after normalized comparison. This is defense in depth, not a claim that arbitrary text can be semantically classified perfectly.
- Every string field displays a platform warning that application configuration is shared with the named application and must not contain credentials or sensitive personal data. Submitted values are never written to audit, logs, metrics, traces, error details, search, or notifications.

## Limits

Initial code-defined limits follow existing Fluxer and accepted interaction constants:

| Scope | Limit |
|---|---|
| Reserved setting keys per application, including active, deprecated, and dormant | 100 |
| Presentation sections | 20 |
| Settings per section | 25 |
| Enum choices or multi-select values | 25 |
| Key / choice key | 64 characters |
| Label / section title / choice label | 100 characters |
| Description | 1024 characters, matching Fluxer's current topic/embed-field scale |
| Placeholder | 100 characters |
| String/default value | 1024 characters |
| Canonical one-setting definition | 16 KiB UTF-8 |
| Canonical published schema | 512 KiB UTF-8 |
| Canonical effective community snapshot | 256 KiB UTF-8 and 100 values |
| Localizations per localizable field | current `AllLocales` count (34) |

These are shared constants in `packages/constants`, enforced by tagged Zod schemas before allocation and repeated at canonical serialization. The API owns semantic validation; generated OpenAPI/types and cross-service fixtures follow that source.

## Immutable application schema persistence

Use query-first tables owned solely by `ApplicationConfigurationSchemaRepository`:

- `application_configuration_setting_keys`: `(application_id, setting_key)` -> immutable fundamental type, creation revision, lifecycle state, and tombstone metadata;
- `application_configuration_schema_heads`: `(application_id)` -> selected schema revision/hash and CAS version;
- `application_configuration_schemas`: `(application_id, schema_revision)` -> immutable metadata/hash/publication actor/time;
- `application_configuration_schema_entries`: `(application_id, schema_revision, setting_key)` -> canonical validated definition JSON plus typed type/status/dependency columns.

Publication writes a complete candidate revision and entries, validates every key/dependency/limit, then compare-and-sets the head. Unreachable candidates are harmless and garbage-collected after the recovery window. Readers never merge partial revisions.

## Immutable community configuration persistence

Use snapshot rows rather than in-place per-field mutation:

- `guild_application_configuration_heads`: `(guild_id, application_id)` -> selected `configuration_version`, selected schema revision, hash, synchronization state, updater, time, and CAS version;
- `guild_application_configuration_revisions`: `(guild_id, application_id, configuration_version)` -> immutable operation metadata and canonical size/hash;
- `guild_application_configuration_values`: `(guild_id, application_id, configuration_version, setting_key)` -> typed `INHERIT | NULL | VALUE` data and definition revision;
- `guild_application_configuration_reference_state`: `(guild_id, application_id, setting_key)` -> current resource-validity state/version, invalidation reason class, and time.

A complete immutable candidate snapshot is written before a conditional head advance. The head is the sole visible source, so a crash cannot expose half a multi-field save. Values are typed columns for scalars/references or bounded canonical arrays for sets; no arbitrary JSON setting exists.

Resource references are validated on save and read. Resource deletion/inaccessibility updates the separate current-state overlay and emits attention/delivery work; it does not mutate immutable history or substitute another resource. A new valid value supersedes that state.

`ApplicationConfigurationService` owns schema publication, manager mutation, reset, effective-value resolution, and application reads. Callers and workers never write source/query rows directly.

## Superseded value retention

Superseded values expire after 45 days. Current values persist until replaced or deleted. Before physical purge completes, the configuration owner writes a minimal value-free expiry marker to the independently recoverable non-resurrection journal with application/community/key identity, supersession cutoff/revision, operation time, and integrity proof. Restore replays that marker before exposing configuration, so backups cannot resurrect expired values. Marker retention follows QAD-221's oldest-restorable-backup plus replay/validation/drill window and safety-margin formula; there is no repository-wide numeric duration.

## Lifecycle

- Uninstall leaves heads, revisions, values, and reference state dormant while immediately revoking application access.
- Reinstall exposes the retained configuration in manager review and delivers it only after the new installation generation is active and approved.
- Manager reset writes a new revision containing `INHERIT` for selected keys or all keys; it never rewrites history.
- Permanent application deletion removes the application-global schema/key mappings and every community's values according to QAD-197 and its non-resurrection journal. Permanent community deletion removes only that community's values, revisions, references, delivery state, and indexes; the application-global source survives for other communities.
- A removed definition becomes dormant: application access/delivery stops, its immutable key and type stay reserved, and its value/state remains visible to owner/`Administrator`/`Manage Guild`. Republishing that key can reactivate only the same fundamental type/identity and must revalidate retained values.
- Active, deprecated, and dormant keys all consume the same 100-key application budget. Removal never refunds a slot; reactivation of the same key uses its existing slot.
- The developer has no permanent-retire, key-reuse, or community-value deletion operation. This preserves Fluxer's manager-owned source-of-truth boundary.
- An authorized manager may explicitly `Forget stored value` for a dormant key. After a version-checked head transition removes it from current state, the service durably records the same minimal value-free configuration-erasure marker before cleanup deletes that key's value-bearing rows from retained configuration revisions and its reference-state rows. Value-free revision/audit metadata may remain, but every digest/commitment derived from the erased value is removed so low-entropy values cannot be dictionary-tested. Any retained integrity proof is an access-controlled server-keyed MAC over the value-free marker metadata, never over the erased value. A redacted historical snapshot is never eligible for restoration or application delivery, including after backup restore.
- Permanent application deletion remains the only initial operation that removes the application-global key mapping itself. Community deletion removes only its scoped state. A future migration/retirement facility is out of initial scope and requires a new reviewed contract.

## Required validation

- schema fixtures for every tagged type, boundary, locale, dependency, and prohibited-sensitive definition;
- invalid type mutation, removed choice, tightened constraint, and invalid reference tests;
- 16 KiB/256 KiB/512 KiB canonical-size tests before and after serialization;
- interrupted schema/config candidate writes proving readers remain on the old head;
- concurrent head-advance tests on Cassandra and Postgres KV;
- uninstall/reinstall, reset, resource deletion, application deletion, and community deletion lifecycle tests;
- dormant removal/reactivation, developer deletion denial, manager forget/redaction, key non-reuse, and remove/add quota-bypass tests;
- restore tests proving post-snapshot Forget/expiry markers purge restored current/history/reference/delivery copies before reads;
- tests proving values never appear in audit, logs, errors, metrics, search, or notifications.

## Current Fluxer evidence and classification

- Fluxer centralizes semantic validators in `packages/schema`, operational limits in `packages/constants`, and locales in `AllLocales` (currently 34).
- Existing primitives use JavaScript-safe numbers, bounded strings, typed Snowflakes, fixed enum arrays, and code-defined limits. Existing message/embed fields provide the reused 100/1024/25 scale.
- Repositories own explicit source/query tables; immutable command-head planning already follows this query-first pattern.
- `executeVersionedUpdate` increments a version but currently performs no conditional compare-and-set. The bot-platform foundation must therefore add a real expected-version conditional operation supported equivalently by Cassandra and Postgres KV before this contract relies on CAS.

This **extends** Fluxer's schema, constant, repository, and locale conventions. It **replaces** no existing bot-private configuration and **intentionally adds** immutable snapshots and true CAS because the current generic settings helpers do not provide atomic multi-manager conflict detection.
