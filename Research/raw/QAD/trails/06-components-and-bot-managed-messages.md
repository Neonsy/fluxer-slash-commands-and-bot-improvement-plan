# Components and Bot-Managed Messages Trail

## Record status

Structured from the recovered 2026-07-17–20 `Analyze bot commands and roles` task, the accepted decision index, later explicit corrections, repository inspection, and the earlier Discord Components V2 comparison. This is not a verbatim transcript; `../provenance.md` classifies decision authority.

## Current Fluxer basis

- `packages/schema/src/domains/message/MessageRequestSchemas.ts` and `packages/schema/src/domains/message/MessageResponseSchemas.ts`, `fluxer_api/src/api/models/Message.ts`, and `fluxer_messages/src` define the existing message contract across TypeScript and Rust.
- Current messages support ordinary content and passive embeds but have no application owner, source interaction, component collection, component version, or per-user control state.
- Public message updates use the existing message API/persistence path; there is no application-specific compare-and-swap contract or component callback path.
- Any component implementation therefore crosses shared schemas, API persistence, the Rust message service, Erlang Gateway dispatch, React models, and rendering.

## Decision trail

### Rich structured containers — QAD-055

- **Question:** Are controls always separate rows beneath passive embeds, or may Fluxer support a richer grouped layout similar in purpose to Discord Components V2?
- **Recommendation and answer:** the master plan includes native composable rich containers that group passive content and controls while keeping layout, content, and interactive categories structurally distinct and server validated.
- **Why this is sound:** typed structural categories let the server bound and validate layout without accepting arbitrary executable UI, while grouping related content and controls supports richer workflows than a flat action row. The representation remains a data contract, not application code.
- **Classification:** new message representation inspired by, but not limited to, Discord's newer structured components.

### Choice controls and placement — QAD-056

- **Question:** Which choice semantics are needed, and must they all appear inline?
- **Recommendation and answer:** support exclusive radio-style choice, multi-checkbox choice, and dropdown choice with exclusive or multi-select behavior. The same logical controls can appear inline or in modal/form flows where the schema permits.
- **Why this is sound:** the three semantics cover single and multiple bounded choice with compact or visible presentation, and sharing one logical model avoids different state rules for inline and modal placement. Schema placement rules still bound accessibility and layout.
- **Classification:** new component schema.

### Representation boundary — QAD-057 and QAD-058

- **Question:** May one message freely mix legacy content/embeds and the new structured representation, or switch between them after creation?
- **Recommendation and answer:** every message chooses exactly one representation at creation. Legacy and structured forms cannot mix, and representation cannot later change; replacement requires a new message.
- **Why this is sound:** immutable representation gives persistence, Rust round-trip, client rendering, and fallback one unambiguous schema for the message lifetime. Silent conversion or mixing could drop content, reinterpret layout, or make older clients disagree about the canonical message.
- **Classification:** intentionally strict new invariant that protects rendering, persistence, and compatibility boundaries.

### Per-user input versus shared output — QAD-059

- **Question:** Is control state globally shared in the public message?
- **Recommendation and answer:** user input state is per-user. The application may separately publish a shared aggregate or other public result, but one user's control selection does not become another user's selected state.
- **Why this is sound:** a control selection is user input, not automatically public truth. Per-user state prevents cross-user leakage and interference, while a separate versioned public update makes any intended shared consequence explicit and concurrency-controlled.
- **Classification:** new interaction-state model avoiding accidental shared form state.

### Pending state and terminal outcome — QAD-060 and QAD-061

- **Question:** Does a client selection commit immediately, and what happens on rejection or failure?
- **Options considered:** commit on receipt; treat any protocol acknowledgement/defer/modal as success; require only an application callback; let application and native-effect paths race independently; or select one persisted outcome owner and commit only its proven terminal success.
- **User-approved correction:** show temporary per-user pending state. A defer or modal opening preserves pending state but never commits it. An application-handled interaction commits after a persisted terminal accepted result; a claimed structured-action interaction commits only after its deterministic native effect reaches `SUCCEEDED`. Rejection, timeout, cancel, or stale state rolls back only after proven no-effect. Partial or ambiguous native outcomes remain fail-closed in reconciliation.
- **Why this is sound:** receipt is not completion. Committing on defer can consume a control whose work later fails; rolling back after a native effect succeeded can reopen it and repeat the effect. An immutable outcome owner plus the effect ledger makes retries, presentation state, and one-use consumption agree.
- **Supersession:** replaces the earlier acknowledgement-only wording and QAD-186's underspecified “acknowledgement or native success” disjunction with one deterministic terminal-outcome rule.
- **Classification:** new server/application confirmation contract.

### Concurrent public updates — QAD-062 and QAD-063

- **Question:** Who resolves two concurrent updates to the same bot-managed public message?
- **Recommendation and answer:** Fluxer requires an expected message/component version and atomically rejects stale writes. The application owns semantic recovery: refetch, recompute, and retry or explain failure. Fluxer does not merge application state.
- **Why this is sound:** only the application understands whether two semantic changes can be combined, while Fluxer can reliably detect a stale base version. Rejecting instead of last-write-wins prevents lost public updates and avoids the platform inventing merge behavior.
- **Classification:** new optimistic-concurrency boundary built over current message persistence.

### Idempotent component interaction — QAD-064

- **Question:** Can duplicate delivery or response produce duplicate effects?
- **Recommendation and answer:** component interactions have stable identities and idempotent acknowledgement/response handling. Repeating the same interaction identity cannot commit another state transition or native action.
- **Why this is sound:** Gateway/HTTP retries and crashes can redeliver the same click, so transport delivery cannot be treated as unique. A stable interaction/effect identity lets retries observe the original result instead of repeating state changes or privileged actions.
- **Classification:** new distributed-delivery safety rule.

### Uninstall behavior — QAD-130

- **Question:** Does uninstall delete bot-authored content or permit old panels to reactivate automatically after reinstall?
- **Recommendation and answer:** preserve visible message content, make controls inert and visibly unavailable, and require explicit application reconciliation before any old panel can be reactivated or replaced after reinstall.
- **Why this is sound:** public authored content has an independent message lifetime, but its old installation generation no longer has authority. Inert preservation avoids destructive history changes, and explicit versioned reconciliation prevents reinstall from reviving stale controls automatically.
- **Classification:** new application-ownership lifecycle layered onto persistent messages.

### Unsupported clients — QAD-137

- **Question:** What does a client render when it does not understand a component or rich container?
- **Recommendation and answer:** render supported/static fallback content with application attribution and inert controls explaining that Fluxer must be updated. Never drop the whole message, expose raw payloads, reinterpret an unknown action, or invoke it.
- **Why this is sound:** attributed static fallback preserves comprehension without asking an old client to guess executable semantics. Keeping unknown controls inert prevents malformed display, raw-data leakage, and actions the client cannot safely represent.
- **Classification:** new forward-compatibility requirement; current message schemas assume known shapes.

### Initial grammar, limits, accessibility, and fallback — QAD-185

- **Question:** Which component types and placements ship first, how are legacy and rich messages bounded, and what happens on unsupported clients?
- **Repository-derived answer:** retain Discord-compatible numeric component types and `IS_COMPONENTS_V2`, keep the accepted immutable legacy/structured boundary, and add negotiated inline radio/checkbox placement as a Fluxer extension. Bound structured messages to 10 top-level/40 total components and 256 KiB canonical JSON while reusing current Fluxer text, attachment, and embed-budget precedents. Require accessible names/semantics and static fallback text.
- **Why this did not require another product choice:** it implements already accepted QAD-055 through QAD-058 against current Fluxer constants and current compatibility contracts; the inline-choice extension was explicitly approved.
- **Classification:** preserve compatible type identity, extend layout/choice behavior, and reuse current Fluxer safety limits.

### State, audience, use, expiry, and lifecycle — QAD-186

- **Question:** How are per-user inputs stored and committed, how can a control restrict its audience, when is it consumed/expired, and what survives lifecycle events?
- **Repository-derived answer plus QAD-060 correction:** store only the current bounded per-user presentation value; keep it pending through receipt/defer/modal and commit it only from the selected application-result or native-effect owner's proven terminal success; keep shared output as an independent CAS update. Reauthorize current channel visibility plus server-owned invoker/author/user/role/native-permission predicates on every click. Support reusable, once-per-user, and once-global claims. Persistent public panels last with their message unless explicitly shortened; ephemeral, confirmation, and modal lifetimes remain bounded. Copies are static, deletion revokes, uninstall makes inert, and only explicit reinstall reconciliation can bind a new generation.
- **Why this did not require another product choice:** it turns accepted QAD-059 through QAD-064 and QAD-130 into concrete data/transition rules using the existing internal integer version/read-increment precedent plus the planned F1 concurrency-safe expected-version CAS prerequisite. The current generic helper is neither conditional nor guaranteed monotonic under concurrent/stale writers, and public message schemas expose no version. This does not introduce shared user input or automatic reactivation.
- **Classification:** extend current versioned message persistence with server-owned per-user interaction state and lifecycle authority.

### Cross-language schema authority — QAD-187

- **Question:** Must TypeScript, Rust, and Erlang each implement the recursive component validator?
- **Repository-derived answer:** no. `packages/schema`/the API own validation and canonical serialization. Rust stores and round-trips bounded opaque component JSON, Gateway transports it without interpreting action semantics, and committed conformance fixtures detect drift.
- **Why this did not require another product choice:** it follows Fluxer's current schema/API contract ownership and avoids multiplying the existing manually mirrored message-model maintenance burden.
- **Classification:** preserve schema/API authority while intentionally replacing semantic mirroring with opaque transport outside the owning boundary.

## Still unresolved in this subject

No component-specific technical question remains. QAD-212 rejects file/media components on the initial ephemeral surface while retaining them for supported public messages; QAD-211 governs any submitted report evidence.

## Cross-cutting completeness audit

- **Scope:** supplements QAD-055 through QAD-064, QAD-130, QAD-137, and QAD-185 through QAD-187.
- **Shared credible alternatives and rejection:** keep only legacy flat rows; accept arbitrary application JSON/layout/code; let one representation convert silently to another; treat controls as shared mutable input; commit optimistic state or one-use consumption before terminal success; roll back without proving no effect; use last-write-wins public updates; retry/merge conflicts automatically; drop unknown UI or reinterpret it; reactivate old panels automatically after reinstall; or implement competing validators in every runtime. These alternatives create unsafe executable/ambiguous payloads, data loss, cross-user leakage, stale overwrite, duplicate effects, misleading fallback, or schema drift. Bounded tagged grammar, immutable representation, per-user pending state, deterministic outcome ownership/effect reconciliation, message-version CAS, explicit application conflict recovery, inert attributed fallback, generation binding, and one schema authority address those failure modes.
- **Evidence-backed soundness:** the precise schema/message paths in Current Fluxer basis show existing normal/embed message validation, cross-language persistence, and internal integer version fields; current public request/update/response schemas expose no message version. `fluxer_api/src/api/database/CassandraVersionedUpdate.ts` performs a read plus unconditional patch of the derived successor, so concurrent/stale writes are not guaranteed monotonic and true expected-version CAS is new F1 work. Message identity/version and schema ownership can be preserved while adding the public CAS boundary, interaction state, and rich grammar. `specs/component-schema-and-limits.md` cites the current official Discord component reference for the dated compatibility grammar.
- **Tradeoffs:** security reauthorizes every click and isolates per-user state; operations must expire/clean claims and reconcile explicit reactivation; compatibility renders inert fallbacks and preserves baseline types but intentionally freezes representation; maintenance centralizes validation but requires opaque round-trip fixtures across Rust/Erlang; users get accessible rich controls and truthful rollback/conflict feedback, while unsupported clients see attributed inert content instead of a guessed action.
- **Assumptions and unknowns:** official component types/limits may evolve; client capability adoption and accessibility behavior require real visual/assistive testing; shared aggregate conflict policy remains application-owned within CAS; public message retention follows existing message policy. Future media on ephemerals remains separately gated by QAD-212.
- **Consequences and dependencies:** QAD-055 through QAD-058 own grammar/representation; QAD-059 through QAD-064 own per-user acknowledgement/concurrency/idempotency; QAD-130/137 own uninstall/fallback; QAD-185 fixes initial bounds/fallback; QAD-186 owns state/lifecycle; QAD-187 owns cross-language schema authority. All require QAD-181/182 response envelopes and QAD-189 capabilities.
- **Supersession:** QAD-185 through QAD-187 complete the implementation detail left by QAD-055 through QAD-064. The later user-approved QAD-060 correction reconciles QAD-186's native-success path with the earlier acknowledgement-only wording; it changes no audience, lifecycle, or shared-output boundary. QAD-212 removes media only from the initial ephemeral surface, not public components. No decision permits automatic panel resurrection or a competing runtime validator.
