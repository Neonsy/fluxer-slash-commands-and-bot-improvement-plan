# Component, Concurrency, and Client Simulations

## SIM-P01 — two users select concurrently while the application races a public aggregate update

### Scenario and purpose

A structured public poll contains a reusable radio group. Alice and Bob select different choices at the same time. The application returns terminal accepted results for both per-user choices, then two workers try to update the shared result from message version 7. This tests per-user versus shared state, terminal-outcome ownership, idempotency, CAS, stale recovery, and authorization at click time.

### Decision and current-state evidence

- **Controlling QAD:** `../QAD/trails/06-components-and-bot-managed-messages.md` -> QAD-055–064 (`Per-user input versus shared output`, `Pending state and terminal outcome`, `Concurrent public updates`, `Idempotent component interaction`), plus QAD-185/186.
- **Exact specs:** `../QAD/specs/component-state-lifecycle-and-storage.md` -> `Application-owned message fields`, `Per-user state and terminal outcome`, `Interactive component policy`; `../QAD/specs/interaction-response-lifecycle.md` -> `Initial callbacks`, `Request idempotency`.
- **Current constraints:** CS-MESSAGE/CS-DELIVERY/CS-OPS. `MessageRow` and the internal TypeScript/Rust message models carry an integer version but no application/component fields or per-user state; the public request/update/response schemas expose no message version. Current Gateway has no component interaction. `MessageDataRepository` calls `executeVersionedUpdate`, but that helper reads a version and then unconditionally patches its derived successor, so concurrent/stale writes are neither monotonic nor the expected-value CAS required by this scenario. The F1 conditional-write prerequisite must supply equivalent real CAS across supported backends and expose the planned public expected-version boundary.

### Actors, permissions, and initial state

- Message `msg-1` is structured, owned by active `app-A` generation 5, current version 7, with radio component `(component_id=4,custom_id=poll,definition_hash=h1,use=REUSABLE)` and public fallback text.
- Alice and Bob can currently view the channel and pass the component's server-owned audience predicates. Neither selection is globally shared by default.
- Alice's previous committed value is `red`; Bob has none.

### Expected processing and state changes

1. Each click rereads message/version, installation generation/state/suspension, component hash/expiry/use policy, current channel visibility/membership/roles/permissions, and submitted option validity. A client-provided permission snapshot cannot authorize it.
2. Fluxer creates stable interactions `int-A` and `int-B`; each user's sessions show only their bounded pending value. No committed row changes yet.
3. A type-5/type-6 defer for either interaction or a type-9 modal opening preserves only pending state. Neither response commits a value; exact redelivery returns the same pending result.
4. A persisted type-4/type-7 terminal accepted application result for `int-A` conditionally claims `APPLICATION_RESULT`, atomically overwrites Alice's state to `blue`, and increments her state version. Exact redelivery returns that terminal result and cannot commit again. The corresponding terminal result for `int-B` independently commits Bob's `green`; Alice never renders Bob's selection as selected and vice versa.
5. The application computes a shared count and two workers send updates with `expected_message_version=7`. One CAS creates version 8. The other receives `MESSAGE_VERSION_CONFLICT` with current version/refetch information and performs no write.
6. Fluxer does not merge application semantics. The loser refetches current message/aggregate data, recomputes under application ownership, and may submit a deliberate update against version 8. An idempotency key cannot bypass expected-version checks.
7. If the terminal application result times out or rejects, a modal is cancelled/expires, suspension starts, or the definition/version becomes stale before commit, the affected user's UI rolls back to the prior committed value only after the ledgers prove no effect and shows an invoker-only safe explanation.

### Persistence, effects, and lifecycle

- Public message/version and canonical component tree are message source truth. Per-user rows store only current bounded presentation value; they are overwritten, not historized/searchable/audited.
- Application can publish a shared aggregate as a separate message CAS but individual values are not exposed by default.
- Interaction/audit/effect IDs make duplicate delivery safe. Logs exclude custom values, arbitrary application errors, tokens, and content.
- State is removed on semantic component replacement/permanent message/application/community/account deletion. Uninstall preserves it dormantly only for explicit later reconciliation.

### Conclusion and implementation gap

The scenario validates the separation between independently committed presentation state and application-owned public output. Optimistic concurrency prevents a lost update without pretending Fluxer can merge poll semantics. All component ownership/state/delivery is absent today.

## SIM-P02 — stale click, once-global race, unsupported client, copy, uninstall, and reinstall

### Scenario and purpose

Two users race a once-global button while another user has a stale client. The message is then copied and the application uninstalled/reinstalled. This tests one-time claims, unknown capability fallback, static copies, expiration, generation boundaries, and explicit reconciliation.

### Decision and current-state evidence

- **Controlling QAD:** QAD-057/058 (representation immutable), QAD-064, QAD-130 (uninstall inert), QAD-137 (unsupported clients), QAD-138/189 (capabilities), QAD-163/164 (identity), QAD-185/186 (limits/lifecycle).
- **Exact specs:** `../QAD/specs/component-schema-and-limits.md` -> `Representation boundary`, `Message and tree limits`, `Accessibility contract`; `../QAD/specs/component-state-lifecycle-and-storage.md` -> `Expiration`, `Copy, forward, deletion, credentials, uninstall, and suspension`.
- **Current constraints:** CS-MESSAGE and `../CS/messages-and-interactions.md` -> `Client boundary`. React responsive web exists; no Flutter project exists. Current message schemas do not support structured trees or inert fallback.

### Actors, permissions, and preconditions

- `msg-2` version 12 contains a once-global button under definition hash `h2`, expires at `T`, and has static fallback “A claim action is available.” It is below 10 top-level/40 total components and 256 KiB canonical JSON.
- Modern users Carol/Dan negotiate the required capability. Eve's client omits it. All can view the public message.
- Current installation generation is 9.

### Expected processing and outcomes

1. Carol and Dan click concurrently. Both pass current audience checks, but a durable conditional once-global claim reserves the message/component semantic identity for Carol's stable interaction. Dan receives retryable `COMPONENT_CLAIM_IN_PROGRESS`, not `COMPONENT_ALREADY_USED`, because no terminal accepted application result or successful native effect has consumed it.
2. The application rejects Carol before any native effect. The interaction/effect ledger proves no commit, so Carol's pending UI rolls back and the reservation releases to `AVAILABLE`. If that proof were missing after a crash or partial effect, the claim would remain `RECONCILING` and fail closed rather than reopen.
3. Dan retries against the still-current component, conditionally reserves it, and receives a persisted terminal accepted application result. The claim advances to `CONSUMED`; a later Carol click now receives `COMPONENT_ALREADY_USED`. A defer or modal opening would leave it pending instead. A consumed or ambiguously effected claim is never cleared for blind replay; the application must publish a new component instance if another attempt is appropriate.
4. A click carrying message version 11 or old definition hash receives stale/definition-changed failure, rolls back pending UI, and cannot be remapped by `custom_id` alone. Any reservation for that stale component version becomes terminal; its ledger still reconciles a possible prior effect but never reopens obsolete authority.
5. Eve sees application attribution plus supported static fallback and inert “update Fluxer” affordance. The client does not drop the whole message, expose raw JSON/custom IDs, reinterpret an unknown action, or invoke it. Server capability checks independently reject active clicks.
6. Copy/quote/forward/cross-post serializes only static supported content/fallback. It strips interactive ownership, audiences, custom IDs, claims, native bindings, and user state. The copy never becomes a second active control.
7. At time `T`, server time makes the control expired even if a client clock is wrong. It remains visible/disabled where message persists, and attempts return `COMPONENT_EXPIRED`; any pending reservation becomes terminal/inert rather than reopening authority.
8. Uninstall immediately makes original controls and reservations inert while retaining visible content and generation-9 state. Reinstall establishes generation 10 but does not revive them.
9. Application explicitly requests reconciliation with message ID, current expected version, new schema, and preserve-state choice. Fluxer validates ownership/current generation/capabilities/schema; a single new version binds generation 10. State carries only for elected component IDs whose application, message, numeric ID, custom ID, type, and definition hash all match.

### Boundaries, deletion, and recovery

- A message cannot switch between legacy and structured representation; replacement is a new message. Unsupported clients must always have bounded fallback before a producer is enabled.
- Message/channel deletion immediately revokes source lookup and claims; physical state cleanup is asynchronous/idempotent. Permanent application deletion strips authority and state permanently.
- Bot credential rotation without generation change may temporarily disable controls and allow them after verified health; suspension differs by permanently invalidating then-current interactions and requiring new/reconciled versions.
- Rust stores/round-trips bounded opaque canonical component JSON, Gateway transports without semantic interpretation, and shared schema/API remain authoritative. Conformance fixtures must prove cross-language parity.

### Conclusion and implementation gap

The trace demonstrates that interaction authority belongs to an exact message version/generation, not a copied payload or reusable `custom_id`. Static fallback preserves comprehensibility without unsafe interpretation. No native Flutter result can be claimed because that repository is absent; shared protocol and React fallback are the verifiable scope.

## SIM-P03 — component audiences deny before interaction creation and never inherit manager bypass

### Scenario and purpose

A public application message contains controls with composed user, role, permission, invoker, and message-author audiences. Users change roles and permissions after rendering, an Administrator attempts a bypass, and an application tries to place a broader audience on an ephemeral control. This tests the complete QAD-186 audience formula as an authorization boundary before pending state or delivery.

### Decision and current-state evidence

- **Controlling QAD:** QAD-059, QAD-061, QAD-186, and QAD-188.
- **Exact spec:** `../QAD/specs/component-state-lifecycle-and-storage.md` -> `Audience schema`, `Per-user state and terminal outcome`; `../QAD/specs/ephemeral-storage-and-access.md` -> `Separate recipient-scoped resource`.
- **Current constraints:** CS-MESSAGE/CS-AUTH. Current messages have no component tree, trusted source-invoker field, component audience, or per-user pending state; current permission services demonstrate only the need to reread authoritative membership/roles/permissions.

### Actors, predicates, and initial state

- Public `msg-A` version 4 is owned by active `app-A`. Control `control-A` has `any_of=[USERS(Alice), ROLES(operators)]` and `all_of=[NATIVE_PERMISSIONS(MANAGE_MESSAGES)]`.
- Alice is explicitly named and currently has `MANAGE_MESSAGES`. Bob has role `operators` at render time but loses it before clicking. Carol retains `operators` but lacks `MANAGE_MESSAGES`. Ada is community owner/Administrator but matches neither `any_of` branch; her effective native permissions do not make that failed branch pass.
- `control-B` uses `INVOKER` on a command response whose trusted source invoker is Alice. `control-C` uses `MESSAGE_AUTHOR` on a bot-authored message. Ephemeral `eph-A` belongs to Alice, while the application proposes a `USERS(Bob)` audience for its control.

### Projection chain and expected outcomes

1. If Alice can still view `msg-A`, matches the explicit-user disjunct, and currently holds `MANAGE_MESSAGES`, then both formula halves pass. Fluxer may create one interaction and per-user pending state only after those server-owned reads complete.
2. If Bob clicks after losing `operators`, then the server's current role read makes every `any_of` predicate false. The request fails before interaction allocation, application delivery, or pending-state mutation; a cached rendered row is not authority.
3. If Carol still has `operators` but lacks `MANAGE_MESSAGES`, then `any_of` passes and `all_of` fails. If another user has the permission but matches no user/role disjunct, the inverse fails. Fluxer never treats the two arrays as one loose union.
4. If Ada clicks as owner/Administrator, then ordinary component audience evaluation still denies her. Manager policy bypass applies only to its separately accepted command-policy boundary and cannot override an application-authored component restriction.
5. If a client supplies forged member roles, permission bits, message-author identity, or a different invoker, then those fields are ignored/rejected. Fluxer derives membership, effective permissions, current stored author, and trusted source invoker from authoritative state.
6. If Alice clicks `control-B`, then trusted source identity satisfies `INVOKER`. Bob cannot satisfy it. Publishing or reconciling the same predicate on a message with no trusted source invoker fails validation rather than treating the current clicker or application text as the invoker.
7. If a human clicks `control-C` on the bot-authored message, then `MESSAGE_AUTHOR` resolves to the stored bot author and grants no human access. A mutable display name or application attribution cannot substitute another author identity.
8. If the application proposes `USERS(Bob)`, a role predicate, or any broader audience for `eph-A`, then validation rejects the response/control mutation and writes nothing. A valid ephemeral control is stored only with the platform-forced trusted-invoker audience; it can never broaden Alice's recipient-scoped resource. Bob's fetch/click remains unknown-resource before component evaluation.
9. If Alice loses membership, source access, or an operation-required role/permission before a structured native/broker effect, then execution-time authorization prevents that effect and follows proven-no-effect rollback or fail-closed reconciliation. Passing the component's initial click check is not durable authority for a later native effect.
10. If the application-result path owns the admitted interaction, a later change only to Alice's component-audience match does not revoke its terminal presentation-state commit. The commit still requires the exact current interaction/component generation, deadline, and persisted terminal accepted result; deletion, suspension, or a stale component version continues to invalidate it under the ordinary lifecycle rules.

### Security, privacy, and operational boundaries

- Denials expose no private predicate membership, hidden role, permission bit, or ephemeral existence. Logs retain only bounded audience/result classes, never audience IDs or client-supplied snapshots.
- Duplicate IDs are normalized and definition limits are schema fixtures, while this scenario validates runtime composition and current-state ownership.
- Audience only narrows existing message visibility. It cannot make a user eligible who cannot already access the source message/resource.

### Conclusion and implementation gap

The projection proves that component audience is a server-evaluated conjunction/disjunction over current identities, not presentation, manager status, or a client permission snapshot. Its denial must happen before pending state and delivery, and ephemeral ownership is stricter still. None of these audience/source-invoker primitives exists today.
