# Declarative Settings Update, Delivery, Audit, and Attention

Status: repository-derived contract under QAD-126, QAD-131 through QAD-134, QAD-145, QAD-178, QAD-194, and QAD-200.

## Manager API and concurrency

Only the community owner, `Administrator`, or `Manage Guild` may use these community endpoints:

- `GET /guilds/{guild_id}/applications/{application_id}/configuration`
- `PATCH /guilds/{guild_id}/applications/{application_id}/configuration`
- `POST /guilds/{guild_id}/applications/{application_id}/configuration/reset`
- `GET /guilds/{guild_id}/applications/{application_id}/configuration/activity`

Reads return the current schema/configuration versions, each setting's source (`INHERIT`, `NULL`, `VALUE`), effective value, validation/reference state, application synchronization state, and safe attention items.

Mutation requests carry `expected_configuration_version`, a 1–128-character opaque idempotency key, and at most 100 setting operations. The service:

1. rechecks current manager permission and installation/suspension state;
2. resolves the exact current schema and head;
3. validates the complete resulting snapshot and every live resource reference;
4. writes the immutable candidate revision/values;
5. conditionally advances only the expected head version;
6. creates audit, attention, and delivery effects under the committed configuration operation ID.

A stale version returns `CONFIGURATION_VERSION_CONFLICT` with the safe current version and changed setting keys, never values. Reusing an idempotency key with the same normalized request returns the original result; reusing it for different data returns `IDEMPOTENCY_KEY_CONFLICT`. Mutation deduplication records retain request hash/status/result for 24 hours and never retain raw values outside the immutable community configuration itself.

The current `executeVersionedUpdate` helper is insufficient because it performs a read followed by an unconditional patch. A prerequisite database change adds an expected-column conditional update primitive and proves identical applied/not-applied behavior in Cassandra and Postgres KV integration tests.

## Application read and acknowledgement API

An authenticated application with an active, unsuspended installation may use:

- `GET /applications/{application_id}/guilds/{guild_id}/configuration`
- `GET /applications/{application_id}/guilds/{guild_id}/configuration?after_version={n}`
- `POST /applications/{application_id}/guilds/{guild_id}/configuration/{version}/ack`

The first two return only that application's declared effective configuration and validation states. The application cannot list another application, write manager values, read dormant values while uninstalled, or acknowledge a version from another installation generation.

Acknowledgement is monotonic, generation-bound, and idempotent. It records `APPLIED`, `REJECTED`, or `NEEDS_RETRY` plus an allowlisted stable application error code and optional bounded public-safe message; it never accepts arbitrary logs or changes Fluxer's persisted source value. Acknowledging an older version cannot move `last_acknowledged_version` backward. `REJECTED` appears to managers as not applied and needs attention.

## Reliable latest-state delivery

Every committed version creates one deterministic delivery identity `(application_id, guild_id, installation_generation, configuration_version)`.

- Gateway applications receive `APPLICATION_CONFIGURATION_UPDATE` as a typed dispatch carrying the full bounded current snapshot, schema/configuration versions, hash, validation states, and delivery ID.
- HTTP applications receive the same schema-owned body through the verified signed dispatcher, but configuration delivery uses the durable reconciler rather than the three-second interaction deadline queue.
- A newer committed configuration supersedes delivery of any older unacknowledged full snapshot. Audit history remains intact, but the worker sends the latest source rather than replaying obsolete intermediate values.
- The source head and delivery-state row, not JetStream delivery, own progress. Reconnect, verified endpoint recovery, or reinstatement schedules the latest version immediately.
- Retry begins at 1 second with exponential backoff capped at 5 minutes while delivery is eligible. Offline, dormant, or suspended state pauses attempts without treating the configuration as lost.
- The application can always reconcile through authenticated GET, so event loss cannot make a stale event authoritative.

Delivery rows retain safe status, versions, attempt count, timestamps, and failure class. They never duplicate configuration values, response bodies, headers, signatures, or tokens.

## Audit contract

Add new stable Fluxer audit action constants without repurposing existing Discord-compatible numbers:

- `APPLICATION_CONFIGURATION_UPDATE`
- `APPLICATION_CONFIGURATION_RESET`
- `APPLICATION_CONFIGURATION_SCHEMA_PUBLISH`
- `APPLICATION_CONFIGURATION_ACKNOWLEDGE`
- later `APPLICATION_ADMIN_ACTION_EXECUTE`

The numeric allocation is generated from the central audit-action source in its implementation PR and reserved in the compatibility manifest; the planning contract fixes names and semantics rather than guessing an unused wire number before the full enum extension is reviewed.

One configuration operation gets a preallocated causation/audit identity. The guild audit row records application ID, actor manager ID, configuration/schema versions, operation type, changed stable setting keys (bounded to 20 plus total count), and result state. It stores no old/new/effective values, free-form application error, field contents, or private resource metadata. Reset records scope/key count, not removed values.

Schema publication is developer activity rather than guild manager activity. Guild-facing rows are emitted only when publication changes effective/default/validity state for that community; application developer tooling retains the publication revision and safe validation result without community values.

Configuration audit visibility follows QAD-178: owner/`Administrator`/`View Audit Log` see normal guild audit; `Manage Guild` sees the application configuration activity it is authorized to manage even without unrelated moderation audit access. Existing 45-day guild audit TTL remains unchanged.

## Manager attention and notifications

Fluxer has message/push notifications and a mentions-oriented notifications page, but no general durable administration inbox whose semantics fit application configuration. Initial implementation therefore does not send bot-controlled DMs, email, mention, or mobile/desktop push for configuration changes.

Instead, add a durable, coalescing community-integration attention feed keyed by `(guild_id, application_id, attention_type, subject_key)` with safe type, current source version, first/last occurrence, status, and resolution version. It contains no setting value or arbitrary application text. Initial attention types are:

- schema/default changed;
- value unconfigured or invalid;
- resource reference invalid;
- application has not acknowledged current version;
- application rejected a version;
- permission/authority review required;
- delivery offline/unhealthy;
- dormant/suspended state.

The Integrations navigation and application card show a badge/count only to users whose current server-side permission is owner, `Administrator`, or `Manage Guild`. Opening the page rechecks permission and fetches details. A targeted user-session invalidation may refresh already connected eligible managers, but the durable row—not a transient Gateway event—is the notification source. Granting or losing manager permission immediately changes visibility; Fluxer does not snapshot or delegate recipients to the application.

Attention resolves automatically only when the authoritative source proves the condition gone (for example, a valid replacement value or current-version `APPLIED` acknowledgement). Dismissal is per manager and cosmetic; it does not mark a community-wide operational problem resolved.

## Failure and recovery

- Audit or delivery enqueue failure after head commit cannot roll back the saved configuration. Deterministic effect rows let QAD-194 reconciliation complete them.
- A failed head CAS leaves an unreachable candidate snapshot that is never delivered or audited as committed.
- A partial cross-table write never advances the source head until the complete candidate is verifiably readable.
- If audit-integrity effects cannot converge, configuration remains saved but privileged UI reports incomplete activity logging and rollout alerts; the system never fabricates audit success.
- Application acknowledgement cannot hide invalid references, manager attention, suspension, or lifecycle state.

## Current Fluxer evidence and classification

- Existing repositories carry integer version metadata and explicit query rows, but the general read/increment/update helper is unconditional and does not guarantee monotonic versions or optimistic concurrency.
- Fluxer already has Gateway and HTTP delivery, worker/JetStream infrastructure, permission-gated Community Settings -> Integrations, and a 45-day guild audit store.
- Existing user notifications are centered on message/push/mention behavior rather than a generic durable admin task inbox.

This **extends** current settings/audit/Gateway/worker conventions, **intentionally adds** true compare-and-set and immutable head publication for concurrent managers, and **avoids misusing** ordinary message notifications for private administrative state.
