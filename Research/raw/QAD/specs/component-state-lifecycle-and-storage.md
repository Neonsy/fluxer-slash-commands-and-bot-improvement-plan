# Component State, Audience, Lifecycle, and Cross-Language Storage

Status: repository-derived architecture under QAD-059 through QAD-064, QAD-130, QAD-137, QAD-163/164, and QAD-186/187, reconciled by the user-approved QAD-060 terminal-outcome correction.

## Application-owned message fields

Extend the stored `MessageRow` for bot-managed messages with:

```text
application_id?
source_interaction_id?
application_generation?          internal-only generation bound at creation
component_schema_version?
components_json?                 canonical validated component tree
component_fallback_text?
component_default_expires_at?
version                          planned concurrency-safe message version, seeded from the existing integer field
```

Under this planned contract, public message responses expose application attribution, source interaction where authorized, parsed components, fallback text, expiry, and the new concurrency-safe message version. They never expose the internal installation generation or accept it as application input. Application ownership is set only by Fluxer's interaction/bot message service from authenticated application state. Applications cannot claim another message or generation. A traditional bot message without controls may still carry application attribution, but component fields are null.

Current message persistence supplies only an internal integer version and read/increment/update precedent: `MessageDataRepository` calls `executeVersionedUpdate`, which derives a successor from a read and then patches unconditionally. Concurrent writers may write the same successor, and a stale writer may write an older derived value, so this is neither an atomic compare-and-set nor a guaranteed monotonic contract. Current public message request/update/response schemas expose no version. The F1 persistence foundation must add and validate a concurrency-safe expected-version conditional operation for both Cassandra and Postgres KV before components rely on it. Under that planned boundary, new messages start at version 1, public/application updates supply `expected_message_version`, and only a matching version may write the next one. `MESSAGE_VERSION_CONFLICT` returns current version and a safe refetch link, never silently merges or retries.

## Interactive component policy

Every interactive component has a Fluxer extension:

```text
fluxer:
  audience?                server-enforced predicate; default channel viewers
  use_policy?              REUSABLE | ONCE_PER_USER | ONCE_GLOBAL; default REUSABLE
  expires_at?              absolute timestamp; absent means source-message lifetime
```

Each accepted component also has a server-computed `definition_hash` over type, stable numeric component ID, `custom_id`, option values, min/max/required behavior, audience, use policy, and native-operation envelope. Presentation-only text is excluded. Per-user state may carry across a public message version only when application ID/generation, message ID, component numeric ID, `custom_id`, type, and definition hash all remain equal.

## Audience schema

Audience never expands channel/message visibility. It is an additional current-state restriction:

```text
audience:
  any_of?: predicate[]     at most 10; empty means no disjunctive restriction
  all_of?: predicate[]     at most 10; every entry must pass

predicate :=
  {type: INVOKER}
  {type: MESSAGE_AUTHOR}
  {type: USERS, ids: user_id[]}            1-100
  {type: ROLES, ids: role_id[]}            1-100
  {type: NATIVE_PERMISSIONS, permissions: decimal_bitfield}
```

If `any_of` is nonempty, at least one predicate must pass; every `all_of` predicate must pass. Duplicate IDs are normalized; at most 200 distinct user/role IDs exist across the policy. `INVOKER` is valid only when the source message/response has a trusted source invoker. `MESSAGE_AUTHOR` means the current stored author; a bot-authored message does not accidentally make a human eligible.

Audience is evaluated on every click against current channel access, membership, roles, and effective permissions. Owner/Administrator does not bypass an application-declared component audience unless a distinct platform moderation operation requires it. Applications may impose stricter backend checks but cannot broaden server audience.

Ephemeral responses force audience to exactly the trusted invoker and reject any broader authored policy. Platform security confirmations also force invoker-only audience.

## Per-user state and terminal outcome

Fluxer stores only current committed presentation state, never a selection history:

```text
message_component_user_state
  message_id
  application_id
  application_generation
  component_id
  custom_id_hash
  definition_hash
  user_id
  committed_value                 typed bounded value/IDs only
  state_version
  updated_at
```

Query identity is `(message_id, component_id, user_id)`; raw `custom_id` is not an index. Values use the component's bounded schema and are not searchable/audited. State follows the source component lifecycle, is overwritten rather than historized, and is removed on component semantic replacement, permanent message/application/community deletion, or account deletion. Dormant uninstall preserves it with the inert message so explicit reactivation can deliberately preserve matching state.

Fluxer also persists one idempotent outcome record for each component interaction. It contains no raw submitted value:

```text
component_interaction_outcome
  interaction_id
  message_id / component_id / user_id
  definition_hash / application_generation
  commit_owner                    UNCLAIMED | APPLICATION_RESULT | NATIVE_EFFECT
  status                          AWAITING_INITIAL | PENDING_COMPLETION |
                                  SUCCEEDED | FAILED_NO_EFFECT | TERMINAL_FAILED |
                                  RECONCILING | REVOKED
  native_effect_id?
  acknowledgement_deadline
  completion_deadline?
  canonical_result_fingerprint?
```

The record and the ordinary interaction/native-effect ledgers are one logical source of truth. The commit owner is selected conditionally and never changes:

- A persisted terminal accepted application result may claim `UNCLAIMED -> APPLICATION_RESULT` and `SUCCEEDED`. A type-4/type-7 terminal callback or a successfully completed defer may supply that result only after its deterministic response effect is persisted. A type-5/type-6 defer and a type-9 modal opening move only to `PENDING_COMPLETION`.
- A structured native-action request conditionally claims `UNCLAIMED -> NATIVE_EFFECT` before executing. Once claimed, application responses may provide pending/final presentation but cannot commit or roll back the component; the deterministic native-effect ledger alone resolves it to `SUCCEEDED`, proven failure, or `RECONCILING`.
- A terminal application result that already claimed the interaction prevents a later structured native action from reusing that component authority. Exact retries observe the stored owner/result; a competing meaning is rejected.
- A component-opened modal carries the source outcome identity. Submit continues that same pending outcome through either owner path; cancel/expiry is a no-effect failure and creates no synthetic application success.

On input:

1. server validates current message/version, application generation/status, component definition/expiry/use policy, audience, and resource values;
2. server creates the interaction/outcome record and sends the invoker a pending state;
3. a defer or modal opening extends pending state only to the bounded response/modal/component deadline;
4. the selected owner's persisted `SUCCEEDED` result atomically commits the bounded per-user value and increments state version exactly once;
5. application rejection, timeout, modal cancel/expiry, suspension, or stale version restores prior presentation only after the ledgers prove no commit/effect; a partial or ambiguous effect enters `RECONCILING` instead;
6. any public aggregate/output change is a separate version-checked message update and never exposes individual values by default.

For `ONCE_PER_USER`, a durable conditional claim keyed by message/component semantic identity/user prevents a second consumed interaction. `ONCE_GLOBAL` uses the same claim without user ID. The claim has an explicit state machine:

```text
AVAILABLE -> RESERVED(interaction_id, lease_deadline)
RESERVED -> PENDING_COMPLETION(interaction_id, completion_deadline)
RESERVED | PENDING_COMPLETION -> CONSUMED(result/effect identity)
RESERVED | PENDING_COMPLETION -> AVAILABLE
RESERVED | PENDING_COMPLETION -> TERMINAL_FAILED(result/effect identity)
RESERVED | PENDING_COMPLETION -> RECONCILING
RECONCILING -> CONSUMED | AVAILABLE | TERMINAL_FAILED
```

The first conditionally inserted reservation owns the pending attempt. A concurrent click while it is `RESERVED` or `PENDING_COMPLETION` receives retryable `COMPONENT_CLAIM_IN_PROGRESS`, not `COMPONENT_ALREADY_USED`, because pending has not consumed the control. Only the selected owner's `SUCCEEDED` result advances it to `CONSUMED`; later clicks then receive `COMPONENT_ALREADY_USED`. A one-use `TERMINAL_FAILED` claim returns `COMPONENT_OUTCOME_FAILED`, and `RECONCILING` remains unavailable with `COMPONENT_CLAIM_IN_PROGRESS` plus safe retry guidance rather than reopening authority.

Before a defer/modal, the reservation is bounded by the three-second acknowledgement deadline. A valid defer transfers it to `PENDING_COMPLETION` no later than the interaction's 15-minute response-authority deadline; a modal uses its shorter configured expiry, and neither may outlive the component. Application rejection, timeout, or modal cancel/expiry may release to `AVAILABLE` only after the ledgers prove that no commit or native effect occurred and the exact component is still current/valid. A failed claimed native action restores prior presentation but retains its deterministic terminal failure. The same interaction cannot be repeated; a reusable control may create a distinct newly authorized interaction, while a one-use claim requires a new component version if the application wants to offer another attempt. A crashed/expired attempt is reconciled under its stable interaction/effect identity: proven success consumes it, proven application-path no-effect may release it, and any partial or ambiguous native effect remains `RECONCILING` and fails closed. Stale message/version, suspension, deletion, component expiry, uninstall, or generation change makes the claim terminal/inert rather than reopening old authority.

## Expiration

- Public reusable/single-use controls default to the source message's lifetime and have no arbitrary numeric maximum, preserving persistent panels such as role menus. Every click is newly authorized, so the 15-minute response-token lifetime applies to that click, not the source control.
- Applications may set an earlier absolute expiry; edits cannot extend an already-issued interaction but may publish a new future component version.
- Ephemeral controls are clipped to the response's at-most-24-hour lifetime and terminal dismissal.
- Platform security confirmation controls are clipped to five minutes.
- Modal instances default to five minutes and may last at most fifteen minutes from creation/source interaction deadline.
- Client clocks only render countdown/disabled hints. Server time is authoritative.

Expired controls remain visible but disabled with a reason and fallback where the message persists. Server interaction attempts return `COMPONENT_EXPIRED`.

## Copy, forward, deletion, credentials, uninstall, and suspension

- Copy, quote, forward, snapshot, and cross-post serialize static supported content/fallback only. Interactive ownership, audiences, custom IDs, user state, and native-operation bindings are not copied. A new active panel requires the application to create a new owned message.
- Message or channel deletion immediately makes source lookup fail and revokes interaction creation; state cleanup is idempotent/asynchronous.
- Permanent application deletion leaves/remaps visible authored content according to existing deleted-user behavior, permanently strips interaction authority, and deletes component/user state. It never reactivates.
- Bot-token or signing-key rotation alone does not change application/community generation. Controls become temporarily unavailable while no healthy delivery path exists and may resume after the new credential/path is healthy.
- Uninstall preserves visible messages/state but makes controls inert. Reinstall does not revive the old generation. The application must explicitly reconcile an owned message by ID/current version; Fluxer validates ownership/current schema and writes a new version bound to the current generation. State survives only for definition-identical component IDs the reconciliation explicitly elects to preserve.
- Instance suspension permanently invalidates outstanding interactions and marks then-current component versions inert. Lifting suspension permits new/reconciled component versions, never resurrection of prior response/delegated authority.
- Temporary HTTP circuit/Gateway unavailability disables controls as unavailable without changing generation; recovery may restore them because no authority was issued while unavailable.

## Canonical schema ownership across TypeScript, Rust, and Erlang

The public JSON contract is canonical in new tagged Zod schemas under `packages/schema/src/domains/message/ApplicationComponentSchemas.ts`, beside current message request/response schemas and shared constants. OpenAPI and TypeScript types derive from that source.

Recursive component grammar is not manually reimplemented in every service:

- API validates, normalizes, assigns missing numeric IDs, computes hashes, and serializes canonical component JSON.
- Cassandra/Postgres-KV message storage keeps the bounded canonical JSON text plus typed ownership/version/lifecycle columns.
- `fluxer_messages` adds an opaque bounded `serde_json::value::RawValue` field and round-trips it without semantic mutation; Rust does not become a second component validator.
- Gateway forwards the API/message-service JSON map and does not interpret component action semantics. Server-side interaction creation returns to the API domain for validation/authorization.
- React consumes generated/inferred TypeScript schema types and performs capability-aware rendering; client validation is presentation only.

Committed conformance fixtures cover every component type, nesting boundary, numeric/string Snowflake form, unknown future type, max-size tree, and invalid placement. Tests parse canonical fixtures through Zod, round-trip through Rust storage/serialization, pass through Gateway encoding, and compare normalized JSON. CI fails on a fixture/schema mismatch. Generated files are changed only through the repository generator.

This deliberately extends Fluxer's current manually mirrored TypeScript/Rust message representation with opaque canonical component JSON, avoiding a third hand-maintained Erlang grammar while keeping authoritative validation in the existing shared-schema/API boundary.

## Errors

In addition to QAD-182 response errors:

```text
COMPONENT_SCHEMA_UNSUPPORTED
COMPONENT_PLACEMENT_INVALID
COMPONENT_ID_DUPLICATE
COMPONENT_CUSTOM_ID_DUPLICATE
COMPONENT_AUDIENCE_DENIED
COMPONENT_CLAIM_IN_PROGRESS
COMPONENT_ALREADY_USED
COMPONENT_OUTCOME_OWNER_CONFLICT
COMPONENT_OUTCOME_FAILED
COMPONENT_DEFINITION_CHANGED
COMPONENT_SOURCE_DELETED
COMPONENT_INSTALLATION_GENERATION_STALE
COMPONENT_DELIVERY_UNAVAILABLE
```

Errors follow Fluxer's path-aware structured envelope and do not disclose hidden audience membership or application state to unauthorized users.

## Evidence and classification

- Current message rows and internal TypeScript/Rust message models carry an integer `version`, while public message schemas omit it. `MessageDataRepository.ts` uses `executeVersionedUpdate`, but `CassandraVersionedUpdate.ts` does not condition the patch on the previously read version; concurrent/stale writers can duplicate or regress the stored value. F1 must add the real public conditional/monotonic boundary.
- Current TypeScript and Rust message models are manually mirrored while Gateway primarily dispatches encoded JSON.
- Current `packages/schema` owns public Zod/OpenAPI contracts and has a documented generator for its existing protobuf-owned settings types.
- This preserves the internal version-field and schema-ownership precedents, intentionally adds a concurrency-safe monotonic expected-version CAS plus server-owned interaction state/lifecycle, and avoids speculative recursive generators in languages that do not need to interpret component semantics.
