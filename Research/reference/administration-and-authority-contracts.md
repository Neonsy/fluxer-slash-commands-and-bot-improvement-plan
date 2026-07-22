# Administration and Authority Contracts

Fluxer does not yet provide application-defined community settings or delegated native actions. The rules below define who may act, what they may do, and what Fluxer must check.

The [orientation](../guide/01-orientation.md) provides the product context. The [glossary](glossary.md) defines the recurring terms used in this contract.

## Separate user, bot, and application authority

Fluxer recognizes three interaction execution modes:

| Mode | Required current authority |
| --- | --- |
| `AS_USER` | Invoker membership, permissions, hierarchy, target, and policy |
| `AS_BOT` | Installed bot membership, permissions, hierarchy, target, and policy |
| `REQUIRE_BOTH` | Every required check for both invoker and bot |

Ordinary bot-token REST calls remain autonomous bot actions. They never inherit the invoker because an interaction happened earlier.

Community review accepts a command definition and authority envelope. It does not grant permission, move a role, satisfy hierarchy, or authorize an effect. Current state is checked again before execution.

Every execution-mode or native-operation change is reviewed in both directions. Review compares old and new principals, operation set, native permission, parameter constraints, and effects.

| Transition | Who may approve |
| --- | --- |
| `AS_USER` to `AS_BOT` | Community owner or `Administrator` |
| `AS_USER` to `REQUIRE_BOTH` | Community owner or `Administrator` |
| `REQUIRE_BOTH` to `AS_BOT` | Community owner or `Administrator` |
| `AS_BOT` to `AS_USER` | Community owner, `Administrator`, or `Manage Guild` |
| `AS_BOT` to `REQUIRE_BOTH` | Community owner, `Administrator`, or `Manage Guild` |
| `REQUIRE_BOTH` to `AS_USER` | Community owner, `Administrator`, or `Manage Guild` |

Approval does not resolve a separate permission, operation, hierarchy, or supplemental-role blocker.

## What delegated actions may do

Delegated authority exists only through a dedicated structured broker. An application cannot add an invoker ID to an ordinary bot request.

The application authenticates as its bot, presents the opaque interaction credential in a secret-bearing header, and submits:

```text
operation
parameters
request_key
expected_authority_revision
```

`request_key` is 1 to 64 safe ASCII characters. The application cannot send a generic HTTP method, path, actor, permission bitfield, or audit payload.

The broker resolves the server-side interaction and derives application, installation generation, community, channel, invoker, bot, command or component, authority revision, and response deadline. Conflicting caller identity is rejected. The requested operation must be in the approved operation envelope and reviewed registry.

## What a delegated capability contains

The broker allocates one capability Snowflake and stores only typed security state:

```text
capability and interaction IDs
application, installation generation, community, channel
invoker and bot IDs
command or component authority identity
operation and normalized parameters hash
intent binding and status
request key and timestamps
confirmation identity and expiry
safe result and revocation data
causation and audit identity
```

Only the native-operation implementation normalizes parameters. Arbitrary application metadata is rejected.

The interaction credential is 32 random bytes encoded as base64url and stored only as SHA-256. A separately exposed capability bearer, if needed, uses another independent 32-byte secret and stores only its hash. Secrets never enter URLs, events, audits, logs, traces, or result objects.

Capability and replay records remain for **24 hours from creation**. Guild audit attribution follows its separate 45-day lifecycle.

## Single use, expiry, and revocation

Capability consumption is claimed conditionally by capability ID before any effect. Exactly one worker owns execution.

- Same interaction and request key returns the existing status or result.
- Reusing a request key with different normalized parameters conflicts.
- A failed worker resumes from durable effect state.
- A claim is never cleared merely because the caller retries.
- Failed, denied, expired, or revoked capability is terminal.

An unconfirmed action must be requested and claimed inside the 15-minute interaction response window. Platform confirmation lasts no more than five minutes and never beyond that response deadline. It grants only the exact capability.

Current authority implicitly revokes a capability when:

- Installation leaves `ACTIVE`, is suspended, or changes generation
- Application or community is deleted or suspended
- Response authority is revoked
- Command or component no longer approves the operation
- Authority revision or hash changes
- Confirmation is denied, dismissed, or expired
- Required invoker membership ends

Uninstall and suspension revoke immediately. Reinstall or reinstatement never revives old capability authority.

## Final execution checks

After winning consumption and immediately before each native effect, Fluxer checks:

1. Capability state, expiry, audience, interaction, request key, and parameter hash
2. Current installation generation and state
3. Current application and suspension state
4. Current command or component availability and authority envelope
5. Current invoker membership, permissions, hierarchy, and target for user authority
6. Current bot membership, permissions, hierarchy, and target for bot authority
7. Both sets for `REQUIRE_BOTH`
8. Required confirmation and trusted intent binding
9. Ordinary endpoint limits, safety rules, and deterministic effect ownership

Failure is terminal and performs no action. Delivery-time snapshots never override current state.

## How input origin affects confirmation

Every security-relevant parameter is classified as `SUBMITTED`, `DEFINITION_FIXED`, `SERVER_DERIVED`, or `APPLICATION_SELECTED`. The application cannot choose the confirmation class.

### Class 0

No second prompt is required only when every security value is user-submitted or definition-fixed, the effect is exact and low impact, and the picker or form identified application, operation, and authority before submission.

Eligible examples include exact ban with no history deletion, unban, kick, timeout, nickname, voice moderation, one message or attachment deletion, reaction moderation, pin state, and reversible exact metadata changes.

Class 0 still requires reviewed registration, trusted disclosure, exact binding, current authorization, single-use effect ownership, and audit.

### Class 1

An invoker-only platform confirmation is mandatory when the application selected or changed a security-relevant target or parameter. It displays normalized action, application, authority mode, targets, important parameters, and consequence. Editing the request invalidates the confirmation.

### Class 2

High-impact confirmation is always required for:

- Bulk or multiple-target mutation
- Message-history or range-based deletion
- Permission bits or role membership replacement
- Hierarchy or overwrite change
- Durable channel, role, webhook, emoji, sticker, or similar deletion
- Persistent access-link creation such as an invite
- Any code-defined mass or destructive threshold

Fluxer resolves exact scope where safe and shows count, range, destructive styling, partial-failure warning, and permission or hierarchy diff. A changed target count or diff invalidates the action.

Risk floors and escalators are reviewed code constants. A low class escalates to Class 1 when the application selects a security value and to Class 2 when effect reaches a high-impact rule.

Confirmation never bypasses schema, approval, current permission, hierarchy, suspension, rate limiting, or direct MFA and sudo boundaries. Cancel, dismissal, expiry, uninstall, suspension, disablement, and authority change are terminal.

## Allowed native operations

Every bot-authenticated community mutation must be classified as `DELEGATED_ELIGIBLE`, `BOT_ONLY`, `DIRECT_USER_ONLY`, or `OUT_OF_SCOPE` in one schema-owned manifest.

CI compares controllers and generated OpenAPI operation IDs with this manifest. An unclassified addition fails validation. Unsupported delegated work never falls back to bot authority.

Each eligible adapter defines its typed parameters and results, supported execution modes, connection to existing Fluxer services, confirmation rule, result audience, effect recovery, audit fields, limits, compatibility mapping, and tests. Result visibility is explicitly `APPLICATION_SAFE`, `INVOKER_ONLY`, or a redacted reference. An adapter cannot return a broader result merely because the application requested it.

### Allowed operations

Member moderation includes:

- `guild.member.ban`, `guild.member.unban`, and `guild.member.kick`
- `guild.member.timeout.set` and `guild.member.timeout.clear`
- `guild.member.nickname.set` and `guild.member.voice.update`
- `guild.member.role.add`, `guild.member.role.remove`, and `guild.member.roles.replace`

Message moderation includes:

- `channel.message.delete`, `channel.messages.bulk_delete`, and `channel.message.attachment.delete`
- `channel.message.reactions.clear`, `channel.message.reactions.clear_emoji`, and `channel.message.reaction.remove_user`
- `channel.message.pin` and `channel.message.unpin`

Channel and overwrite work includes:

- `guild.channel.create`, `guild.channel.update`, and `guild.channel.delete`
- `guild.channels.reorder`
- `channel.permission_overwrite.set` and `channel.permission_overwrite.delete`

Role work includes:

- `guild.role.create`, `guild.role.update`, and `guild.role.delete`
- `guild.roles.reorder`
- `guild.role_hoists.update` and `guild.role_hoists.reset`

Community and discovery work includes:

- `guild.settings.update`, `guild.feature_toggle.set`, and `guild.vanity.set`
- `guild.discovery.apply`, `guild.discovery.update`, and `guild.discovery.withdraw`

Expression work includes:

- `guild.emoji.create`, `guild.emoji.update`, and `guild.emoji.delete`
- `guild.emojis.bulk_create`
- `guild.sticker.create`, `guild.sticker.update`, and `guild.sticker.delete`
- `guild.stickers.bulk_create`
- Hash-bound private media staging instead of arbitrary URL or base64 capability data

Invite and credential-free webhook work includes:

- `channel.invite.create` and `invite.delete`
- `webhook.metadata.update` and `webhook.delete`

Invite code is delivered only in the invoker-owned platform response. Webhook credentials are never returned.

### Explicit exclusions

The broker excludes:

- Human-authored message send or edit
- Reaction, typing, read, acknowledgement, note, or personal state as the human
- Community creation, deletion, or ownership transfer
- MFA, password, or sudo challenges
- Webhook creation, credentials, access, or execution
- Invite acceptance and group-DM membership
- User account, OAuth, billing, relationship, instance, and safety administration
- Direct-message and other non-community contexts
- Reads and searches that retain existing access rules

Application responses, bot-managed messages, declarative publication, self-role panels, schedules, and unattended workflows act as the bot.

### Order for adding native operations

The shared support for capabilities, confirmation, revocation, effects, and audit must be complete before any operation adapter. Eligible adapters then follow this fixed risk order, with no more than three privileged operation IDs enabled by one pull request:

1. Ban, unban, and kick
2. Timeout set and clear, then nickname set
3. Member voice update, then role add and remove
4. Complete member-role replacement
5. Single and bulk message deletion, then attachment deletion
6. Clear all reactions, clear one emoji, and remove one user's reaction
7. Pin and unpin
8. Channel create, update, and delete
9. Channel reorder, then overwrite set and delete
10. Role create, update, and delete
11. Role reorder, then hoist update and reset
12. Community settings, feature toggle, and vanity
13. Discovery apply, update, and withdraw
14. Emoji create, update, and delete
15. Sticker create, update, and delete
16. Emoji and sticker bulk create
17. Invite create and delete
18. Credential-free webhook metadata update and delete

Each adapter pull request includes registry and schema change, existing-service adapter, audit and effect mapping, compatibility classification, authorization and confirmation fixtures, failure and race tests, and a rollout allowlist. A later adapter begins only after its predecessor is merged and rebased.

## What community audit records contain

Application-attributed effects add first-class actor, invoker, application, bot, command revision, component hash, interaction, authority mode, capability, operation, confirmation, result, causation, parent, and sequence fields.

Authority mode is `AS_USER`, `AS_BOT`, `REQUIRE_BOTH`, or `AUTONOMOUS_BOT`. Autonomous bot means bot-authenticated activity with no invoking interaction.

Retryable effect audit IDs are allocated with the deterministic effect before the side effect. Replay cannot create another audit record. Repository-owned query tables support application, command, interaction, and causation lookup. All source and query rows use the existing **45-day TTL**.

Causal rows are never destructively compacted into a bulk message summary.

Audit never stores:

- Command arguments, autocomplete data, selections, modal text, or arbitrary application metadata
- Message or ephemeral message content, attachments, private URLs, or upload tokens
- Response tokens, capability secrets, credentials, signatures, headers, or cookies
- Raw component selectors
- Callback bodies, response bodies, stack traces, DNS details, or remote secrets

Native operations may record only endpoint-defined security facts such as target IDs, operation enum, permission bitfields, duration, bounded reason, counts, normalized changes, result class, and confirmation.

Community owner, `Administrator`, and `VIEW_AUDIT_LOG` see normal native-action entries. `Manage Guild` without audit permission sees only installation and configuration activity already within its authority. Application ownership alone does not expose guild audit targets, reasons, or invoker identity. Instance administrators need the separate guild audit ACL.

One action has one causation ID. Independent effects get append-only entries. A summary records success, failure, or partial result. Compensation appends linked records and never rewrites history.

## What hosted settings may contain

Declarative administration provides platform-rendered setup without arbitrary application HTML or JavaScript. It does not import existing application-private configuration.

Phase one provides typed settings. Phase two adds repeatable groups and message templates. Phase three adds application callback actions and enumerated Fluxer-native actions.

Callback and native classes stay visibly distinct. A callback delivers manager input to an application and cannot promise external rollback. A native action lets Fluxer own preview, authorization, effect, audit, idempotency, compensation, and recovery.

## Phase-one settings

Setting keys use the immutable developer-key grammar. Definitions carry type, localized presentation, section and order, required and null behavior, default, bounds, reference filters, and limited display dependencies.

Supported types are `BOOLEAN`, `STRING`, `INTEGER`, `NUMBER`, `ENUM`, `CHANNEL`, `ROLE`, `USER`, `ENUM_SET`, `CHANNEL_SET`, `ROLE_SET`, and `USER_SET`. Every set is ordered and unique.

- String length is at most 1024 within declared bounds.
- Integers are JavaScript-safe with bounds and step.
- Numbers are finite with bounds and step.
- Enums contain 1 to 25 stable choices.
- Resource sets contain at most 25 current community identities.

There is no arbitrary JSON, regex, executable expression, HTML, script, message payload, password, credential, opaque secret, or private-key setting.

A community value is `INHERIT`, `NULL`, or `VALUE`. Null requires `allow_null`. Inherit resolves current application default. Required inherited state without default is `UNCONFIGURED` and blocks dependent actions.

Fundamental type never changes for a key. Tightened bounds, removed choices, changed filters, or removed defaults never coerce values. They become `NEEDS_ATTENTION`.

### Setting limits

| Scope | Limit |
| --- | ---: |
| Reserved keys including dormant | 100 |
| Sections | 20 |
| Settings per section | 25 |
| Enum or set values | 25 |
| Key or choice key | 64 characters |
| Label, section title, or choice label | 100 characters |
| Description | 1024 characters |
| Placeholder | 100 characters |
| String or default | 1024 characters |
| One definition | 16 KiB |
| Published schema | 512 KiB |
| Effective community snapshot | 256 KiB and 100 values |
| Localizations | At most current 34 locales |

Sensitive-purpose keys and labels are rejected after normalized comparison. String setting inputs warn that values are shared with the application and must not contain credentials or sensitive personal data. Values never enter audit, logs, metrics, traces, errors, search, or notifications.

## Who owns settings and how conflicts are handled

The application owns immutable schema definitions. Community managers own selected values.

Schema publication writes a complete immutable candidate, then uses one conditional update to make it current. Community configuration does the same with a complete snapshot. Services, applications, and clients never see a partial save across several fields.

Only community owner, `Administrator`, or `Manage Guild` may use manager endpoints. A mutation carries expected configuration version, an idempotency key of 1 to 128 characters, and at most 100 operations.

Fluxer rechecks permission, lifecycle, suspension, schema, current version, and resources. An update based on an older version receives `CONFIGURATION_VERSION_CONFLICT` with the current version and changed keys, never values. The same idempotency key and request returns the original result. Different data returns `IDEMPOTENCY_KEY_CONFLICT`. Deduplication lasts 24 hours without duplicating values.

Resource deletion updates a validity overlay and attention state without mutating immutable history or retargeting a value.

Superseded values expire after **45 days**. Before purge, Fluxer writes a value-free non-resurrection marker. Current values persist until replaced or deleted.

Removed definitions become dormant. Their key and type remain reserved and continue to consume the 100-key budget. Developers cannot erase community values or refund a key. An authorized manager may separately forget a dormant value under the erasure contract.

## Application read and delivery

An application with an active unsuspended installation reads only its declared effective configuration. Acknowledgement is generation-bound, monotonic, and idempotent. It reports `APPLIED`, `REJECTED`, or `NEEDS_RETRY` with an allowlisted code and safe message. It cannot change the source value or move acknowledged version backward.

Every version has deterministic delivery identity `(application, community, generation, version)`.

- Gateway sends a typed `APPLICATION_CONFIGURATION_UPDATE` full snapshot.
- HTTP uses durable configuration delivery, not the three-second interaction queue.
- Newer version supersedes older unacknowledged delivery.
- Source head and delivery row own progress, not JetStream.
- Reconnect, endpoint recovery, or reinstatement schedules the latest source.
- Retry starts at one second and grows to a five-minute cap.
- Offline, dormant, and suspended state pause attempts.
- Authenticated GET remains the recovery path.

Delivery rows contain versions, safe status, attempt, time, and failure class only.

## Audit events and manager alerts

Configuration audit records actor, application, schema and configuration versions, operation, up to 20 changed keys plus total count, and result. It records no values.

The stable configuration action names are:

```text
APPLICATION_CONFIGURATION_UPDATE
APPLICATION_CONFIGURATION_RESET
APPLICATION_CONFIGURATION_SCHEMA_PUBLISH
APPLICATION_CONFIGURATION_ACKNOWLEDGE
APPLICATION_ADMIN_ACTION_EXECUTE
```

Their numeric values are allocated from the central audit-action source during implementation and recorded in the compatibility manifest. Existing compatible action numbers are never repurposed.

A durable coalescing manager feed may report schema change, unconfigured or invalid value, invalid resource reference, unacknowledged or rejected version, authority review, unhealthy delivery, dormancy, or suspension. It contains no value or arbitrary application text.

Only current owner, `Administrator`, or `Manage Guild` may see attention. Dismissal is per manager and cosmetic. The source condition resolves it. Initial configuration attention uses no bot DM, mention, email, or mobile or desktop push.

## Repeatable groups and templates

Phase two permits up to 10 group definitions, 25 rows per group, 100 rows per community, and 10 fields per row. Group and field keys are immutable and rows have stable Snowflakes under configuration compare-and-set.

Message templates are separately versioned resources with:

- Up to 25 active templates per application and community
- 256 KiB per template and 2 MiB total
- Up to 4000 content characters and 10 current-compatible embeds
- Legacy or structured representation, never mixed
- Allowed mentions defaulting to none
- No raw HTML, script, executable content, arbitrary request, or attachment-byte store

Preview and execution reuse real message schemas and current permissions.

## Declarative actions and builders

Applications may publish at most **25 active admin actions**, each with at most **25 input fields** and a **64 KiB** definition. The complete manifest remains inside the 512 KiB schema cap.

Initial native operations are publish, update, delete, and reconcile application messages, plus publish, update, and delete self-role panels. They are registry entries, never method and path pairs.

| Operation ID | Effect |
| --- | --- |
| `PUBLISH_APPLICATION_MESSAGE` | Publish an application-owned message |
| `UPDATE_APPLICATION_MESSAGE` | Update an application-owned message |
| `DELETE_APPLICATION_MESSAGE` | Delete an application-owned message |
| `RECONCILE_APPLICATION_MESSAGE` | Reconcile an application-owned message after reinstall |
| `PUBLISH_SELF_ROLE_PANEL` | Publish a self-role panel |
| `UPDATE_SELF_ROLE_PANEL` | Update a self-role panel |
| `DELETE_SELF_ROLE_PANEL` | Delete a self-role panel |

Message operations require current manager and bot channel access, current bot content permissions, application message ownership, and expected message version where applicable. Preview uses the real renderer and causes no mentions, unfurls, fetches, or component activation.

Publish and update confirm the exact preview hash. Delete names the exact message and channel. Native work can proceed while the application is offline if installation and bot authority remain valid.

A self-role panel supports toggle buttons, exclusive select, or multi-select with 1 to 25 stable role options. On publication and every click, Fluxer verifies panel, message version, channel access, installation, role existence, non-managed role status, hierarchy, bot `MANAGE_ROLES`, current member, self-only target, eligibility, and selection rules. Results are invoker-only. Deleted roles disable their exact options and are never substituted.

Application callback submission rechecks manager permission, dependencies, lifecycle, suspension, transport health, schema version, and limits. Result is labelled application-provided and may be sent only ephemerally to the initiating manager. Offline actions are disabled and never queued. Fluxer makes no rollback claim for external effects.

## Native action status

States are `PREVIEWED`, `CONFIRMED`, `EXECUTING`, `SUCCEEDED`, `FAILED`, `PARTIAL`, `COMPENSATING`, `COMPENSATED`, and `COMPENSATION_FAILED`.

An operation stores exact application, community, generation, definitions, manager, bot, target versions, plan and confirmation hashes, idempotency key, deterministic effect IDs, result, causation, and audit identities. It stores no bearer credential.

Confirmation expires after five minutes. Any plan or version change requires new preview. Fluxer validates the whole plan but never promises cross-service atomicity. Retry resumes only uncommitted effects. Automatic compensation touches only unchanged resources created solely by the same operation and never overwrites later human work.

Multi-role effects may partially succeed after a hierarchy race. Fluxer reports the result of each effect, resumes safe effects, uses expected state for compensation, and leaves unresolved work visible.

## Required release checks

Implementation must prove:

- Separate user, bot, and application authority for ordinary bot REST and all three execution modes
- Exact broker input, secret hashing, audience binding, one-use claim, replay, expiry, revocation, and final revalidation
- Complete classification for every bot-authenticated community mutation and negative coverage for every exclusion
- Confirmation provenance, class floors, escalation, stale preview, trusted rendering, cancellation, expiry, double click, and accessibility
- Deterministic effects, partial result, compensation, reconciliation, and append-only causal audit
- Audit attribution, query, TTL, compaction exclusion, redaction, and audience
- Every setting type, limit, locale, sensitive-purpose rejection, type immutability, resource invalidation, concurrent head update, 45-day superseded expiry, dormancy, reset, forget, uninstall, deletion, and restore
- Latest-state delivery, acknowledgement, offline pause, reconnect, audit, and attention
- Builder preview parity, message ownership and version, mention safety, self-role hierarchy, callback offline behavior, partial failure, and log redaction
