# Declarative Application Administration Trail

## Record status

Structured from the recovered 2026-07-17–20 `Analyze bot commands and roles` task, the accepted decision index, and repository inspection. This is not a verbatim transcript; `../provenance.md` classifies decision authority.

## Current Fluxer basis

- Current application records and `packages/schema/src/domains/oauth/OAuthSchemas.ts` contain OAuth/bot metadata but no developer-declared settings schema or community-owned values.
- Bot-specific configuration currently belongs entirely to the bot's own commands, storage, and optional external dashboard; Fluxer cannot validate or render arbitrary bot-owned configuration.
- Current community settings UI has no application-generated settings section.
- The proposal is therefore a new opt-in native framework, not a migration of existing bot-private data.

## Decision trail

### Master-plan inclusion and boundaries — QAD-125

- **Question:** Should Fluxer only host commands/interactions, or also reduce the need for every bot developer to build a custom dashboard?
- **Options considered:** no native configuration; arbitrary embedded app UI; a safe declarative framework with bounded phases.
- **Recommendation and answer:** include a later phased framework: typed settings, repeatable groups/message templates, then explicit validated admin actions and richer builders such as reaction-role setup. Never execute arbitrary application HTML, JavaScript, scripts, or secrets, and do not claim to replace analytics, billing, external OAuth, cross-community administration, or every custom dashboard.
- **Why this is sound:** a bounded declarative grammar covers common configuration and setup work while keeping validation, authorization, and rendering inside Fluxer's security boundary. Phasing limits blast radius, and excluding executable or secret-bearing content avoids turning community settings into an application-controlled code or credential host.
- **Classification:** new optional platform capability.

### Source of truth — QAD-126

- **Question:** For opted-in settings, is Fluxer a cache of bot state or the authoritative community store?
- **Recommendation and answer:** Fluxer validates, stores, versions, audits, and owns declared per-community values; applications read them and receive changes. A bot credential alone cannot silently rewrite manager-owned values. Bot operational data remains application-owned.
- **Why this is sound:** one authoritative store prevents split-brain updates between Fluxer and an application dashboard, and it preserves manager ownership even when the application is offline or compromised. Keeping undeclared operational data application-owned avoids claiming authority over state Fluxer cannot interpret.
- **Classification:** new split-ownership data model; undeclared current bot configuration remains unchanged.

### Stable setting identity — QAD-127

- **Question:** Do values follow labels/declaration order or immutable keys?
- **Recommendation and answer:** use immutable developer keys scoped to the application; labels and descriptions may change. Removed keys retain dormant values rather than reassigning them.
- **Why this is sound:** labels and order are presentation and routinely change; binding values to them could silently retarget configuration. Immutable application-scoped keys preserve identity through localization, reordering, and temporary removal without requiring a global namespace.
- **Classification:** new persistence invariant modeled consistently with stable command keys.

### Type immutability — QAD-128

- **Question:** May the same setting key change from one fundamental value type to another?
- **Recommendation and answer:** no. A type change requires a new key; any future migration facility must be explicit rather than coercing community data.
- **Why this is sound:** implicit coercion can change meaning, lose data, or create unsafe references without manager review. A new key makes the ownership and migration boundary visible and leaves any future conversion workflow subject to an explicit contract.
- **Classification:** new schema-safety rule.

### Uninstall retention — QAD-129

- **Question:** Does uninstall delete declared configuration?
- **Recommendation and answer:** revoke application access immediately but retain community values dormantly. Same-application reinstall restores matching stable keys. Authorized managers can reset/delete; permanent application or community deletion erases them.
- **Why this is sound:** uninstall is an authority change, not clear evidence that community managers intend data deletion. Immediate access revocation protects the community, while dormant retention supports deliberate reinstall and keeps deletion with the manager or owning-resource lifecycle.
- **Classification:** new lifecycle consistent with accepted dormant command configuration.

### Bot-managed messages after uninstall — QAD-130

- **Question:** Should setup panels/messages vanish or silently reactivate after reinstall?
- **Recommendation and answer:** preserve content, make controls inert, and require explicit reconciliation before reactivation/replacement.
- **Why this is sound:** preserving authored content avoids surprising history loss, while inert controls prevent an old message or component version from regaining authority after an uninstall/generation change. Explicit reconciliation makes replacement and partial failure observable.
- **Classification:** new message/application lifecycle.

### Settings-panel authority — QAD-131

- **Question:** May applications delegate settings-panel access to their own roles or users?
- **Recommendation and answer:** no. Only community owner, `Administrator`, or `Manage Guild` may see or edit the panel. `Manage Roles`, bot-internal groups, and per-setting delegation do not grant access.
- **Why this is sound:** these are Fluxer-owned community settings, so access should follow the existing Integrations administration boundary rather than application-defined roles that the application may influence. This keeps configuration authority distinct from role-management or bot-internal membership.
- **Classification:** new Fluxer-owned administration boundary aligned with install/uninstall authority.

### Offline persistence and synchronization — QAD-132

- **Question:** Must settings saves fail while the application is offline?
- **Recommendation and answer:** Fluxer still validates, versions, audits, and saves. The UI separately reports persisted versus synchronized/applied state, and the application reconciles from reliable updates or authenticated reads.
- **Why this is sound:** the application transport is not the transaction owner for manager-owned state. Separating durable save from delivery preserves intent during outages while truthful synchronization status and full-state reconciliation prevent a successful save from being misrepresented as already applied externally.
- **Classification:** new durable configuration behavior that avoids making application availability the database transaction boundary.

### Offline admin actions — QAD-133

- **Question:** Queue application-handled actions for later when the bot is offline?
- **Recommendation and answer:** no. Disable them visibly while offline/unhealthy; a race after submission fails immediately and requires fresh manager intent. Never queue delayed side effects.
- **Why this is sound:** an administrative action may become unsafe or unwanted as permissions and resources change. Requiring fresh intent avoids executing opaque effects long after their preview and authorization context, while immediate failure is easier to understand and recover from.
- **Classification:** new safety behavior.

### Invalid resource references — QAD-134

- **Question:** If a referenced channel, role, user, or message disappears, should Fluxer substitute another resource or silently clear it?
- **Recommendation and answer:** preserve the key, mark the value `Needs attention`, notify application and managers, and disable dependent actions until corrected. Never retarget silently.
- **Why this is sound:** a replacement resource may have different audience, permissions, or meaning, so substitution can redirect privileged effects. Preserving the invalid reference makes the failure diagnosable without pretending the old target still exists or discarding manager intent.
- **Classification:** new reference-integrity lifecycle.

## Still unresolved in this subject

No unresolved product decision remains in this subject. QAD-225 now bounds superseded value payloads without changing QAD-222's indefinite retention of the current active or dormant manager-owned value.

## Repository-derived contracts completed after reconstruction

### First-phase settings and immutable storage — QAD-199

- **Question:** Which initial setting types, bounds, localization, value-source semantics, sensitive-data boundary, limits, and source tables fit current Fluxer conventions?
- **Current precedent:** Fluxer centralizes Zod schemas, constants, locales, typed Snowflakes, fixed enum/list bounds, and query-first repositories. It has no arbitrary application setting store.
- **Recommendation and answer:** ship bounded booleans, strings, finite numbers, stable enums, community resource references, and 25-item enum/reference sets. Store `INHERIT | NULL | VALUE`, reject secret/arbitrary JSON/executable types, localize presentation only, and publish immutable schema/configuration snapshots through versioned heads. Exact limits and tables are in `specs/declarative-settings-schema-and-storage.md`.
- **Why this is sound:** the initial types map to validation and resource-ownership checks Fluxer can enforce, while tagged value states avoid conflating inheritance, explicit null, and a real value. Bounded immutable snapshots support deterministic reads and rollback; refusing secrets, arbitrary JSON, and executable content prevents an unowned security and migration surface.
- **Classification:** extends current schema/storage conventions without ingesting current bot-private data; adds true CAS because the current version helper is not conditional.

### Manager concurrency, application reconciliation, audit, and attention — QAD-200

- **Question:** How are concurrent manager changes committed, reliably delivered, reconciled, audited without values, and surfaced to eligible managers?
- **Current precedent:** Fluxer has integer repository version metadata, worker/Gateway/HTTP delivery, permission-gated Integrations, and 45-day guild audit, but `executeVersionedUpdate` is an unconditional read/increment/update helper rather than monotonic CAS, and there is no generic durable admin notification center.
- **Recommendation and answer:** use expected-version immutable snapshots, 24-hour request idempotency, latest-full-state delivery plus authenticated reads and generation-bound acknowledgement, value-free causal audit, and a coalescing Integrations attention feed visible only to owner/`Administrator`/`Manage Guild`. Do not misuse DMs/push/mentions for initial admin notifications. Exact endpoints and recovery are in `specs/declarative-settings-update-delivery-and-audit.md`.
- **Why this is sound:** true expected-version publication prevents one manager from silently overwriting another, and full-state delivery/read reconciliation tolerates duplicate or missing events without treating queue acknowledgement as application state. Value-free audit and a permission-gated coalesced feed provide accountability without copying sensitive configuration into broad notification channels.
- **Classification:** extends existing platform infrastructure while adding the missing conflict and durable-attention semantics.

### Bounded builders and two explicit action classes — QAD-201

- **Question:** How can Fluxer cover normal/embed message publishing, reaction-role setup, and other administrative forms without executing arbitrary app UI or pretending it can recover external effects?
- **Current precedent:** message schemas already validate content/embeds/mentions, bot users author ordinary messages, role services enforce permissions/hierarchy, and accepted interaction/audit contracts provide versioned components and causal effects.
- **Recommendation and answer:** later phases add bounded repeatable groups and message templates, then separate application callback actions from enumerated Fluxer-native message/self-role operations. Native operations receive exact preview, confirmation, idempotent effect ledgers, audit, and only safe expected-version compensation; opaque callbacks are labeled application-handled, invoker-ephemeral, offline-disabled, and never falsely platform-verified. Exact grammar/limits/lifecycle are in `specs/declarative-admin-builders-and-actions.md`.
- **Why this is sound:** Fluxer can verify and reconcile only effects performed through its own typed services, so native actions warrant stronger preview, audit, and compensation claims than opaque callbacks. Keeping the two action classes visibly separate covers common workflows without implying that Fluxer can validate or roll back an application's external behavior.
- **Classification:** extends current message/role services, composes the previously accepted QAD-185/186 component and causal-effect contracts after their prerequisite trains land, and intentionally rejects arbitrary embedded dashboards.

### No developer-controlled permanent setting retirement — QAD-222

- **Question:** May a developer irreversibly retire/reuse a setting key or erase community-owned retained values?
- **Accepted-decision inference:** no. QAD-126 makes Fluxer the manager-owned source of truth, QAD-127/128 make key/type identity immutable, QAD-129 gives deletion/reset authority to community managers, and QAD-197 preserves retained configuration until authorized reset or owner deletion.
- **Repository-derived outcome:** removal makes a definition dormant and reserved. The same type/identity may later reactivate. Only authorized managers may reset or explicitly forget the dormant value; forgetting erases value-bearing rows while preserving value-free history metadata. Application/community deletion removes the global mapping.
- **Why this is sound:** allowing a developer to erase or repurpose a key would let application-side schema churn destroy manager-owned state or retarget it to a different meaning. Dormancy preserves identity, while authorized Forget and owning-resource deletion provide explicit, auditable erasure paths.
- **Classification:** applies the already accepted ownership/lifecycle boundary and avoids speculative irreversible developer machinery.

### Dormant keys remain inside the application key budget — QAD-223

- **Question:** Does removing a setting definition refund one of the existing 100 setting-key slots even though QAD-222 permanently reserves the key?
- **Repository-derived answer:** no. Count active, deprecated, and dormant reserved keys together. Reactivating the same key uses its existing slot; only permanent application deletion removes the registry in the initial design.
- **Why this does not need another product choice:** QAD-199 already promises a bounded 100-setting application schema and QAD-222 makes dormant identities non-reusable. Excluding dormant keys would let definition churn bypass that accepted bound and grow tombstones indefinitely.
- **Classification:** closes a resource-accounting consequence of two accepted decisions without changing either public value or ownership policy.

### Superseded values — QAD-225

- **Question:** How long may value-bearing application-configuration revisions remain after a newer revision supersedes them?
- **Options considered:** retain every historical payload indefinitely; expire current and historical payloads on one fixed TTL; or retain the current value for its accepted lifecycle while giving only superseded payloads a bounded troubleshooting window.
- **Accepted answer:** retain the current active or dormant value until replacement or an authorized lifecycle deletion, but purge each superseded value payload after 45 days. Explicit Forget and permanent application/community deletion may purge earlier. Preserve only non-value revision/audit metadata for its separately accepted lifecycle, and prevent backup restore from resurrecting an expired payload.
- **Why this is sound:** indefinite old values multiply privacy exposure without owning current behavior, while a TTL on the current dormant value would contradict QAD-129/QAD-197/QAD-222. The superseded-only window preserves bounded rollback/diagnostic utility and matches the existing guild-audit retention scale without claiming that audit rows and configuration payloads are the same record.
- **Repository evidence:** `fluxer_api/src/api/guild/repositories/GuildModerationRepository.ts` sets `AUDIT_LOG_TTL_SECONDS` to `seconds('45 days')`; Fluxer has no current declarative-configuration history or retention contract. `specs/declarative-settings-schema-and-storage.md` and `specs/application-data-lifecycle.md` define the new source/head and deletion boundaries.
- **Tradeoffs and unknowns:** security/privacy improve through bounded obsolete-value retention, but rollback and debugging cannot inspect payloads older than 45 days. Legal/deployment rules may require earlier deletion or a separately authorized hold; they do not silently extend ordinary product retention. Restore/purge lag objectives remain deployment-owned.
- **Dependencies and consequences:** depends on QAD-129, QAD-178, QAD-197, QAD-200, and QAD-222. Implement expiry indexes, clone/search purge, and backup non-resurrection; simulations must distinguish current dormant values from superseded payloads.
- **Supersession:** supersedes the unresolved retention marker in this trail; it does not supersede current-value retention or explicit deletion rules.
- **Classification:** accepted product retention policy; the 45-day value TTL is not existing Fluxer behavior.

## Cross-cutting completeness audit

- **Scope:** supplements QAD-125 through QAD-134, QAD-199 through QAD-201, QAD-222/QAD-223, and QAD-225.
- **Shared credible alternatives and rejection:** leave bot configuration entirely external; let the application be authoritative for Fluxer-declared values; use mutable/retypable keys or arbitrary JSON/secrets/executable content; erase values on uninstall/definition removal; permit application-selected settings-panel delegates; fail saves while offline or queue opaque actions; silently retarget deleted resource references; let developers erase manager-owned values; exclude dormant keys from limits; or retain every superseded payload. These alternatives create split truth, key/value confusion, secret ingestion, silent data/authority loss, delayed side effects, reference hijack, quota bypass, or unbounded privacy exposure. Manager-owned versioned bounded values, explicit offline synchronization, invalid reference states, enumerated action classes, permanent key reservation, authorized Forget, and superseded-only expiry address those risks.
- **Evidence-backed soundness:** Fluxer's current Zod/constants/locale/typed-Snowflake/query-table patterns, versioned repositories, message/role services, Integrations settings boundary, Gateway/HTTP workers, and 45-day guild-audit TTL are precise precedents; the repository has no generic application settings store, real conditional version helper, or durable attention center. This supports the classified new architecture but does not prove product values such as 100 keys or 45 days.
- **Tradeoffs:** security keeps managers/Fluxer authoritative and refuses secret/arbitrary execution; operations gain offline persistence/reconciliation and bounded history but must manage CAS, attention, delivery, cleanup, and partial effects; compatibility keeps schemas client-neutral/capability-gated but adds Fluxer-specific administration; maintenance gains tagged types and two action classes but more immutable snapshots/indexes; users retain dormant values and receive truthful attention, while developers cannot erase them and managers must resolve invalid references/confirm native effects.
- **Assumptions and unknowns:** exact deployment synchronization/purge alerts remain external; reference membership rules must be enforced at read/action time; future key migration/retirement or secret fields require new decisions; legal rules may require earlier deletion/hold handling but do not silently extend ordinary obsolete-value retention.
- **Consequences and dependencies:** QAD-125 through QAD-134 own product scope/ownership/lifecycle; QAD-199 supplies bounded schema/storage and real CAS prerequisite; QAD-200 owns manager concurrency/delivery/audit/attention; QAD-201 owns phased builders/actions; QAD-222 owns dormancy/Forget; QAD-223 accounts every reserved key; QAD-225 expires only superseded payloads.
- **Supersession:** QAD-222 resolves the retirement ambiguity without changing QAD-126 through QAD-131 ownership. QAD-223 closes the quota consequence. QAD-225 closes the historical-value question while preserving current active/dormant values. QAD-197's owner-deletion lifecycle remains authoritative for full cleanup.
