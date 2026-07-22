# Declarative Settings Simulations

## SIM-S01 — concurrent manager save while application is offline, then latest-state reconciliation

### Scenario and purpose

Two managers edit the same opted-in application configuration from version 6 while the application transport is offline. One save wins, delivery fails, a referenced channel is deleted, and the application later reconnects. This tests source-of-truth ownership, CAS, value-free audit, offline persistence, reference invalidation, idempotency, and latest-state delivery.

### Decision and current-state evidence

- **Controlling QAD:** `../QAD/trails/08-declarative-application-administration.md` -> QAD-125–134, especially `Source of truth`, `Settings-panel authority`, `Offline persistence and synchronization`, `Invalid resource references`; QAD-199/200.
- **Exact specs:** `../QAD/specs/declarative-settings-schema-and-storage.md` -> `Phase-one definition grammar`, `Immutable community configuration persistence`; `../QAD/specs/declarative-settings-update-delivery-and-audit.md` -> `Manager API and concurrency`, `Application read and acknowledgement API`, `Reliable latest-state delivery`, `Failure and recovery`.
- **Current constraints:** CS-SETTINGS, CS-AUTH, CS-DELIVERY, CS-OPS. Current application/OAuth schemas have no setting definitions or manager-owned values. Existing application `verify_key` is a placeholder, not a persisted interaction signing-key generation; current transport cannot deliver this contract. Existing `executeVersionedUpdate` is a read followed by an unconditional patch/increment, which is why the F1 true-CAS prerequisite exists.

### Actors, permissions, and initial state

- `manager-A` is guild owner; `manager-B` has `Manage Guild`; `role-editor-R` has only `Manage Roles`; app developer/bot has no manager write authority.
- Application schema head 3 defines `log_channel` (`CHANNEL`), `threshold` (`NUMBER`), and `mode` (`ENUM`). Community configuration head is version 6. Transport is offline but installation remains active.
- Both managers read version 6. `manager-A` sends `{log_channel=C1, threshold=10}` with request ID `req-A`; `manager-B` sends `{threshold=20}` with `req-B`.

### Expected processing and state changes

1. The panel/API permits owner/Administrator/Manage Guild only. `role-editor-R`, application owner alone, bot token, and application-declared roles cannot read/edit manager state.
2. Each request resolves the exact current schema, validates the complete resulting typed snapshot and live references, writes an immutable candidate plus deterministic effects, then CAS-advances only expected head 6.
3. Assume `req-A` wins: head becomes 7 and is immediately authoritative even though app delivery is offline. Audit records manager, app, schema/config versions, changed stable keys (bounded list plus count), operation/result—but no old/new/effective values.
4. `req-B` loses with a version conflict and safe current version/diff. Its unreachable candidate is never visible, delivered, or audited as committed. UI refetches and requires a deliberate merge/new request; server does not field-merge stale manager intent.
5. Offline state pauses delivery without rolling back head 7 or burning attempts. UI separately says persisted version 7 and not synchronized/applied. No delayed application-handled admin action is queued.
6. Channel `C1` is deleted. Fluxer preserves key/value identity, marks the reference `NEEDS_ATTENTION`, notifies eligible manager/app surfaces, and disables dependent action. It never substitutes another channel or silently clears history.
7. `manager-A` corrects it to `C2`, publishing head 8. On verified reconnect, delivery schedules only latest full snapshot 8 with stable event ID `(app,guild,config-v8)`; obsolete v7 need not be delivered though its audit/revision remains.
8. Retry begins at 1s and exponentially caps at 5m while eligible. Application may authenticated-read current state. Its generation-bound acknowledgement for v8 updates sync status but cannot hide invalid references, suspension, or lifecycle state; acknowledgement for another generation/version is rejected.
9. Repeating `req-A` within the 24-hour request idempotency window returns its prior result. Same key/different canonical change conflicts. Audit/enqueue failure after head commit is completed by deterministic reconciliation and cannot make the saved config disappear.

### Ownership, security, and operational effects

- Fluxer configuration head is manager-owned source truth. Application receives declared effective configuration only; undeclared bot-private data remains external/application-owned and unaffected.
- No arbitrary JSON, HTML/script/executable, credential/secret/password, private key, recovery code, or webhook secret type is accepted. Values do not enter guild audit, delivery metadata, logs, or attention messages.
- `INHERIT`, `NULL`, and `VALUE` remain distinct. Default changes affect inherited values, are versioned, and alert managers before dependent app actions are considered synchronized.
- A newer full-state delivery supersedes older pending delivery; JetStream/endpoint acknowledgement is not source truth.

### Conclusion and implementation gap

The scenario validates saving independently of app availability while keeping applied status honest. A complete immutable snapshot and one true CAS prevent half saves/lost updates; latest-state delivery prevents obsolete replay. Every storage, UI, delivery, and audit field is currently absent.

## SIM-S02 — dormant key retention, revision expiry, manager reset/forget, and deletion

### Scenario and purpose

The developer removes setting `log_channel`, tries to reuse its key with a different type, and repeatedly churns definitions near the 100-key cap. A manager resets, later forgets the dormant value, and the application is eventually permanently deleted. This tests immutable type/key ownership, quota, current/superseded retention, uninstall/reinstall, redaction, and irreversible deletion.

### Decision and current-state evidence

- **Controlling QAD:** QAD-127–129, QAD-197, QAD-199, QAD-222/223, QAD-225. QAD-222 is `No developer-controlled permanent setting retirement`; QAD-223 counts dormant keys; QAD-225 fixes superseded values at 45 days.
- **Exact spec:** `../QAD/specs/declarative-settings-schema-and-storage.md` -> `Phase-one definition grammar`, `Limits`, `Superseded value retention`, `Lifecycle`.
- **Current constraints:** CS-SETTINGS/CS-INSTALL. No setting key registry, values, snapshot history, deletion journal, or configuration generation currently exists.

### Actors, permissions, and preconditions

- `app-A` has 99 reserved setting identities including active/deprecated/dormant. `log_channel` is immutable type `CHANNEL` with current manager-owned value `C2`; old superseded values exist.
- Developer owns schema publication; `manager-M` is owner/Administrator/Manage Guild. Installation is active generation 4.

### Expected processing and state transitions

1. Developer publishes a schema without `log_channel`. A complete candidate/head CAS makes its definition dormant. Application access/delivery stops for the key, but immutable key/type mapping, current value/reference state, and manager visibility persist.
2. Dormant `log_channel` still consumes one of 100 slots. Adding one distinct key can reach 100; a 101st is rejected. Repeated remove/add cannot bypass the bound because dormant identities count.
3. Developer attempt to republish `log_channel` as `STRING`, retire/reuse it, or erase community values is rejected. Republishing the same `CHANNEL` identity can reactivate it after retained value revalidation; changed constraints never coerce values and can mark attention.
4. Uninstall immediately revokes application reads/delivery but leaves schema heads/revisions/values/reference state dormant. Same-app reinstall may restore matching keys only after new active generation/current validation. A different application/display name cannot inherit.
5. Manager reset for `log_channel` writes a new configuration revision whose source is `INHERIT`; history is not rewritten. App/default policy determines the effective current value. Application-wide reset requires explicit confirmation and records scope/count, never removed values.
6. Current values persist until replaced or deleted. Once superseded, value-bearing revisions expire after 45 days; earlier manager/permanent deletion rules still win. Logical expiry precedes physical cleanup and backups cannot resurrect expired values.
7. While the definition is dormant, `manager-M` selects `Forget stored value` with expected version. Head transition first removes value from current state; cleanup idempotently deletes that key's value-bearing rows in retained revisions and reference-state rows. Only value-free revision/audit metadata may remain and is never restoration/delivery source; no digest or commitment derived from the forgotten low-entropy value remains available for dictionary testing.
8. Permanent application deletion removes every application-global key mapping plus all community schema/value data under its deletion tombstone/non-resurrection journal. Permanent community deletion removes only that community's values, revisions, references, delivery state, and indexes; application-global definitions/key mappings and other-community data survive. Both differ from developer schema removal and ordinary uninstall, and neither deleted scope can be restored by reinstall.

### Failure, concurrency, retention, and audit

- A crash during forget cannot expose a partially redacted current head: head/state transition is authoritative and cleanup reconciles all value-bearing rows. A stale expected version conflicts instead of deleting a newer value.
- Superseded-value cleanup must reference-check current heads and active recovery state. Report/audit retention is independent; guild config audit is value-free and retains its normal 45-day TTL.
- DR restores durable current source values only if not deleted/expired, replays the independently recoverable manager-Forget/superseded-expiry and permanent-deletion markers before reads/delivery, and emits a new generation-bound latest snapshot. Old delivery attempts are purged. The value-free marker records application/community/key, affected revision or supersession cutoff, operation/type/time, and integrity proof; it never retains the erased value.
- Application or developer cannot discover forgotten values from historical snapshots, logs, delivery records, hashes, or backups.

### Conclusion and implementation gap

The trace validates a deliberately asymmetric ownership model: developers own definitions, managers own community values, and only lifecycle owners remove the identity. Counting dormant keys closes churn-based resource growth, while manager forget provides privacy deletion without letting a developer repurpose state. No current storage implements these distinctions.

## SIM-S03 — callback deception boundary, native self-role publication, and partial role effects

### Scenario and purpose

An application publishes one callback action with a platform-sounding label and one Fluxer-native self-role panel builder. Its transport is initially offline. A manager publishes the panel, publication crashes after message creation, and a later user selection races a role deletion. This tests QAD-201's two action classes, exact preview/confirmation, offline behavior, idempotent native effects, safe compensation, self-only authority, partial failure, audit, and uninstall/reinstall behavior.

### Decision and current-state evidence

- **Controlling QAD:** QAD-125, QAD-130–134, QAD-179, QAD-186, QAD-195, and QAD-201.
- **Exact spec:** `../QAD/specs/declarative-admin-builders-and-actions.md` -> `Framework boundary`, `Phase 2: repeatable groups and message templates`, `Phase 3: admin actions and self-role panels`, `Message publish/update/delete`, `Self-role panel builder`, `Application callback actions`, `Native operation lifecycle and partial failure`, and `Ownership, lifecycle, and limits`.
- **Current constraints:** CS-SETTINGS/CS-MESSAGE/CS-AUTH/CS-OPS. Fluxer currently has bot-authored messages, message/role permission checks, and TTL-bounded guild audit whose message-delete batching may replace source rows; it has no declarative builder/action registry, trusted preview hash, self-role panel mapping, compaction-safe causal ledger, or callback result distinction.

### Actors, permissions, and initial state

- `manager-M` has `Manage Guild` but not `Manage Roles`; application `app-A` is installed and unsuspended. Its bot's managed role has `MANAGE_ROLES` and is above eligible ordinary roles `R1` and `R2`.
- The application definition contains callback action key `verify-and-publish` with developer label “Fluxer verified publish” and native action key `self-roles` using registered operation `PUBLISH_SELF_ROLE_PANEL`. The callback accepts bounded phase-one fields; neither definition contains a REST method/path or executable payload.
- The native builder has two options bound exactly to `R1` and `R2`, safe fallback text, no mentions, and current builder revision 4. Application transport is offline.

### Expected processing and state transitions

1. Schema publication preserves the immutable action keys/classes. The UI visibly labels `verify-and-publish` as application-handled despite its developer wording; that text cannot imitate the platform native badge/confirmation or change the operation class.
2. Because transport is offline, the callback action is disabled and no manager submission is queued. The native self-role publication remains available because Fluxer owns it, but only after current installation, channel, message, bot permission, role hierarchy, schema, and manager authority checks.
3. `manager-M` opens the native action. Fluxer renders an exact inert preview with application/channel identity, both role labels, fallback, and mention effects. Preview performs no send, link unfurl, component activation, or role change and yields a canonical plan hash tied to builder revision 4 and current authority.
4. Manager confirms within five minutes. Fluxer creates one durable operation/effect set under an idempotency key and revalidates every input. `Manage Guild` authorizes configuration/publication; the bot's approved `MANAGE_ROLES` and hierarchy—not the manager's personal role permission—will authorize later self-assignment.
5. Message creation succeeds, then binding the server-owned panel mapping fails. State becomes `COMPENSATING`; because the new message was created solely by this operation and is still at its expected version, Fluxer deletes it using the deterministic effect ID. A crash/redelivery observes the completed create/delete effects and cannot emit a duplicate message. If the message had been independently changed or compensation failed, Fluxer would preserve it inert, record `COMPENSATION_FAILED`, and alert authorized managers rather than deleting changed content.
6. A fresh confirmed operation after repair publishes exactly one bot-authored public message and panel mapping and reaches `SUCCEEDED`. Audit causality records manager invoker, acting bot, application, operation, normalized roles, message, and result; it stores no callback form values or arbitrary application response.
7. User `U` selects both roles. Fluxer rechecks message/panel version, installation generation, channel visibility, membership, eligibility, bot permission/hierarchy, role existence, and self-only target. Application data cannot substitute another target user or an unregistered role.
8. The deterministic `R1` add commits. Before the `R2` effect, an authorized role administrator deletes/moves `R2`, so the second effect fails current validation. The operation reports truthful `PARTIAL`, returns an invoker-only safe result, appends each effect/audit result, and creates manager attention.
9. Reconciliation resumes only uncommitted effects. It may remove `R1` as compensation only if the role assignment is still exactly the operation-owned expected state; a later user/admin change prevents reversal and leaves an explicit partial outcome. It never recreates/substitutes `R2`, rewrites audit history, or claims atomicity.
10. After transport recovery, the callback action may accept fresh manager intent. Its response is visibly application-provided; `SUCCEEDED` proves only delivery/application-reported status. External effects cannot be previewed, rolled back, or described as platform-verified, and any Fluxer API mutation still uses ordinary bot authority or a registered native operation.
11. Uninstall leaves the public panel content but makes controls inert and retains builder configuration dormant. Reinstall creates a new generation and does not reactivate the panel; explicit `RECONCILE_APPLICATION_MESSAGE` with current preview, authority, ownership, and message version is required.

### Security, concurrency, retention, and recovery boundaries

- Preview/confirmation hashes and expected versions prevent a stale UI from publishing changed targets. Same idempotency key/different plan conflicts; exact retry returns/resumes the original operation.
- Callback text/results never enter native trust chrome. Native operation definitions—not application prose—own permission checks, effects, audit fields, compensation, and safe errors.
- Public message and role effects follow their ordinary retention/deletion owners. Operation metadata is bounded and value-safe; application callback values/responses are not copied into logs or guild audit.
- Suspension, uninstall, generation change, message deletion, or stale schema before an effect blocks remaining work. Recovery uses the operation/effect ledger and current state, never a queued message as proof of success.

### Conclusion and implementation gap

The scenario validates QAD-201's essential trust split: Fluxer can truthfully preview, execute, audit, and cautiously compensate enumerated native effects, while application callbacks remain clearly application-handled. It also demonstrates why self-role changes require per-effect truth rather than an atomicity claim. All builder/action, panel, ledger, preview, compensation, and attention behavior is currently unimplemented.

## SIM-S04 — repeatable configuration and an offline-native message template preserve separate ownership through effects

### Scenario and purpose

A manager edits repeatable configuration rows and separately manages a generic message template used by one native action. The manager previews and publishes the template while the application is offline, retries after a crash, then attempts stale update/delete operations. This exercises declarative Phase 2 and generic message operations independently of S03's callback/self-role path without inventing template interpolation.

### Decision and current-state evidence

- **Controlling QAD:** QAD-125–134, QAD-145, QAD-178/179, QAD-186, QAD-194/195, QAD-199–201.
- **Exact spec:** `../QAD/specs/declarative-admin-builders-and-actions.md` -> `Phase 2: repeatable groups and message templates`, `Message publish/update/delete`, `Native operation lifecycle and partial failure`, `Ownership, lifecycle, and limits`; setting storage/update specs own configuration CAS.
- **Current constraints:** CS-SETTINGS/CS-MESSAGE/CS-AUTH/CS-OPS. Current messages and role/channel authorization provide implementation boundaries, but there is no repeatable-group/template resource, component ownership, expected public-message version, preview hash, native builder ledger, or compaction-safe causal audit.

### Configuration, template, and initial state

- Community configuration version 11 has group `links` with stable row IDs `row-1`/`row-2`. Separately versioned template `welcome` version 4 contains fixed normal text/embed fields, uses explicit `allowed_mentions=none`, and contains no attachment-byte store or arbitrary fetch URL. The native action declares both resources as dependencies but does not interpolate group values into message content.
- Manager Morgan has Integrations authority and channel visibility. Active installation `app-A` is unsuspended; its bot can view/send/embed in `channel-C`. Application transport is offline.
- Existing owned public message `msg-W` is version 6. A different application's message and an ordinary moderator-owned deletion path also exist for ownership checks.

### Projection chain and expected outcomes

1. If Morgan creates, reorders, edits, or deletes group rows with expected configuration version 11, then Fluxer validates the complete bounded resulting snapshot, preserves stable row Snowflakes, and advances one configuration head. A concurrent stale edit conflicts without partial row mutation or silent merge.
2. Template publication validates immutable template key/resource identity, current template version, total canonical caps, normal message/embed/mention schemas, and exactly one legacy-or-structured representation. Arbitrary HTML/script/API requests, mixed representations, unreviewed remote media fetching, or an attachment-byte store reject the whole candidate before persistence.
3. Preview resolves the exact current group/template/configuration/channel/application/bot context through the real message validators and renders inertly with mentions visibly suppressed. It causes no send, mention, unfurl, media fetch, component activation, or audit effect, and produces a canonical plan hash tied to every source version.
4. Because `PUBLISH_APPLICATION_MESSAGE` is Fluxer-native, application transport being offline does not disable it. Morgan confirms within five minutes; execution rechecks manager/channel/install/suspension/bot/content permissions and all source versions. An application-callback action remains offline-disabled and is never queued.
5. A successful publish writes one ordinary bot-authored public message plus application/installation ownership and current version, then returns its link with an invoker-only result. Manager causation is audited, but the public author is never fabricated as Morgan.
6. If the process crashes after the already-owned message write but before result/audit completion, then retry uses the same operation/effect IDs. Reconciliation recognizes that exact application/installation-owned message and completes the missing result/audit records without publishing another message. If the message write never committed, retry may create it once; it never substitutes or deletes pre-existing content.
7. Updating `msg-W` requires matching application installation ownership and `expected_message_version=6`. A concurrent moderator/application edit causing version 7 returns `MESSAGE_VERSION_CONFLICT`; a same-label message or another application's message is never substituted. Fresh preview/confirmation against version 7 is required.
8. Deleting an owned message requires a destructive exact message/channel confirmation and current ownership/version. The builder cannot delete another application's message. Community moderators retain their ordinary separately authorized delete route, whose action does not become a builder operation retroactively.
9. If a referenced group row, template, configuration head, bot permission, channel, installation generation, or message version changes after preview, then the confirmation hash becomes stale and execution applies nothing. The manager must review a newly rendered plan; the service never silently substitutes current values.
10. Uninstall preserves public content but makes controls/builder authority inert and retains community configuration dormant. Reinstall does not reactivate it; explicit `RECONCILE_APPLICATION_MESSAGE` requires current preview, ownership/version, new generation/authority, and the selected preserve-state behavior. Permanent deletion follows the separate lifecycle and never restores template authority from retained content.

### Failure, audit, and privacy boundaries

- Each effect is idempotent and causal rows are ineligible for destructive audit compaction. Partial/compensation status is truthful and cannot be overwritten by a final success label.
- Template/group contents, preview bodies, message text, URLs, setting values, and arbitrary application errors do not enter audit/log/trace/attention payloads. Authorized attention identifies only safe application/resource/state classes.
- Invalid/stale/duplicate/preview/execute attempts consume their accepted budgets; bounded resources prevent group/template fan-out.

### Conclusion and implementation gap

Repeatable groups are manager-owned versioned configuration and templates are separately versioned builder resources; an action may depend on both without conflating their storage or interpolating one into the other. The native message operation owns preview, bot authority, message ownership/version, idempotency, and recovery. Offline application status does not erase that platform ownership. None of the Phase 2 resource or operation machinery exists today.
