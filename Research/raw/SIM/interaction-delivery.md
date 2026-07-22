# Interaction Acknowledgement and Delivery Simulations

## SIM-D01 — defer inside three seconds, complete before fifteen minutes, then expire

### Scenario and purpose

A healthy Gateway application receives a command, defers an ephemeral response at 2.2 seconds, completes it at 8 minutes, retries the callback, and attempts another edit after 15 minutes. This tests acknowledgement uniqueness, visibility immutability, bounded follow-ups, idempotency, and separation of response authority from retained output.

### Decision and current-state evidence

- **Controlling QAD:** `../QAD/trails/07-interaction-delivery-versioning-and-rate-limits.md` -> `Deferred processing` (QAD-065), `Deadlines` (QAD-066/067), `Visibility immutability` (QAD-068), `Response endpoint defaults` (QAD-147), `Response operations and idempotency` (QAD-182).
- **Exact spec:** `../QAD/specs/interaction-response-lifecycle.md` -> `Initial callbacks`, `Request idempotency`, `Deferred and terminal states`, `Error matrix`.
- **Current constraints:** CS-DELIVERY/CS-MESSAGE/CS-RATE. Gateway has no interaction event, current applications have no response-token authority, and current messages are public channel resources. Existing webhook-shaped routes/rate limits are precedent only.

### Actors, permissions, and initial state

- `user-U` submits exact command identity in `guild-G`; invocation policy and installation/suspension checks pass.
- `app-A` uses one active Gateway transport and negotiated baseline capabilities. Interaction `int-1` starts `PENDING` at server time `t0`; its opaque response token is stored only as a hash.
- Application intends an invoker-only response and at most two follow-ups.

### Expected processing and transitions

1. Fluxer durably creates `int-1`, absolute acknowledgement deadline `t0+3s`, response-authority deadline `t0+15m`, delivery attempt metadata, and a response-token hash before Gateway dispatch.
2. At `t0+2.2s`, a type-5 defer atomically claims the sole initial callback and sets visibility `EPHEMERAL`. State becomes `DEFERRED`; all sessions of `user-U` see pending state. Other accounts receive nothing.
3. A byte-equivalent retry for the same initial callback returns the existing defer result. A different type or public visibility gets `INTERACTION_ALREADY_ACKNOWLEDGED`/visibility conflict and cannot replace it.
4. At eight minutes, completing the original writes an ephemeral recipient-scoped response and changes interaction state to `COMPLETED`. It removes loading state but cannot change visibility. Its output expiry is based on response creation/QAD limits and is never extended by later edits.
5. Follow-up creates use optional `X-Idempotency-Key`; same key and canonical body returns the existing message, while changed content conflicts. Without a key, each accepted request can create a message; Fluxer does not promise exactly once. Initial plus at most five follow-ups are allowed.
6. At `t0+15m`, interaction state remains `COMPLETED`, but the separate response-authority deadline predicate becomes expired. A later edit/delete/follow-up returns terminal `410` and performs no mutation. The already-created ephemeral remains readable only to `user-U` until its own earlier dismissal or at-most-24-hour expiry.
7. Invocation and response operations charge the correct user/installation/interaction buckets. Response-token operations are exempt from the ordinary bot global 50/s bucket but not their own limits.

### Ownership, security, and operational effects

- Interaction state/token ownership belongs to Fluxer's interaction domain; the application cannot substitute audience or deadline. Ephemeral data belongs to the recipient-scoped lifecycle, not the channel message partition.
- Audit/telemetry records IDs, types, timings, attempt/result classes, sizes, and rate state—not token, arguments, response content, or arbitrary application errors.
- Suspension/uninstall before completion changes state to `REVOKED`, rolls pending component state back if applicable, and cannot be bypassed by an exact retry.

### Failure, concurrency, and cleanup

- Simultaneous immediate HTTP response and callback endpoint (for HTTP mode) race the same atomic claim; exactly one initial response wins.
- A crash after deterministic message allocation resumes/observes the same effect; public edits separately require expected message version.
- Expiry cleanup is idempotent. Authority expiry is a logical read/write check even if physical token rows have not yet been deleted.

### Conclusion and implementation gap

The scenario validates that a short acknowledgement deadline and longer mutation window need independent states: expiration of authority must not erase a response that is still within retention. Current code has neither interaction state nor recipient-scoped output, so all transitions require implementation.

## SIM-D02 — outgoing HTTP transient retry, unsafe redirect, overload, and breaker recovery

### Scenario and purpose

An application moves from Gateway to outgoing HTTP, rotates its signing key, then delivers interactions. One interaction gets a connection reset and a successful retry; another returns a redirect; later failures open the endpoint circuit. This tests versioned transport ownership and key rotation as well as deadline-owned retries, SSRF/DNS enforcement, no replayable DLQ, health suppression, and recovery.

### Decision and current-state evidence

- **Controlling QAD:** QAD-069–078, QAD-181/183/184, QAD-189, QAD-215. Key trail headings are `Delivery transport choice`, `Endpoint activation`, `Endpoint network policy`, `Retry behavior`, and `Endpoint health suppression`.
- **Exact specs:** `../QAD/specs/outgoing-interaction-delivery.md` -> `Ownership and deadline`, `SSRF and DNS rebinding defense`, `Retry classification`, `Circuit breaker and availability`, `Terminal records, telemetry, and dead letters`; `../QAD/specs/interaction-transport-registration.md` -> `Application fields`, `Owner API`.
- **Current constraints:** CS-DELIVERY and CS-OUTBOUND. Applications lack callback URL/key/health state. Existing shared URL/IP helpers provide partial outbound-safety precedent; generic workers have acknowledgement/replay timing incompatible with three seconds.

### Actors, permissions, and preconditions

- Developer saved candidate `https://bot.example:443/interactions` and requested capabilities. Signed verification within three seconds activated the endpoint candidate and its accepted capability intersection but did not switch live delivery. Gateway remains active at configuration version 3 with signing-key generation 3; one old Gateway delivery, `int-G0`, is still queued.
- DNS currently returns only permitted public addresses. Application/installation is active, endpoint initially healthy, and queue/circuit thresholds have capacity.

### Expected processing and outcomes

1. If the developer selects HTTP with stale expected version 2, Fluxer returns `409`; Gateway/version 3 remains active, `int-G0` remains owned by that transport, and no HTTP delivery begins.
2. If the developer retries with expected version 3, Fluxer atomically selects exactly HTTP/version 4 and invalidates `int-G0` as queued work of the previous transport. `int-G0` is not rerouted or duplicated; only interactions admitted after the switch use HTTP, so Gateway and HTTP are never live delivery owners at once.
3. If the developer tries to clear the active HTTP URL alone, Fluxer rejects the mutation and keeps HTTP/version 4 intact. Clearing can succeed only in the same version-checked operation that selects Gateway or disables every interactive surface; either permitted branch invalidates HTTP-queued work and cannot silently retain an interactive command with no delivery owner.
4. If the developer starts key rotation, Fluxer creates pending generation 4 and exposes only its public key. Candidate verification is signed with generation 4 and the endpoint may accept active generation 3 plus pending generation 4 during that check, while every ordinary interaction continues to use only active generation 3. If verification fails or is abandoned, Fluxer deletes pending private material and generation 3 stays active.
5. If a fresh rotation creates pending generation 5, verification succeeds, and the persisted application-version/key-generation proof still matches, one CAS activates generation 5 and retires generation 3 after the bounded overlap. A stale activation returns `409` and never changes the active signer, but staleness alone neither abandons the pending generation nor deletes its private material. Recovery retries only the exact stored CAS; a changed proof input requires fresh verification, while explicit pending-pointer replacement or clearing owns abandonment and private-key deletion.
6. For interaction `int-H1`, Fluxer persists token hash/config generation/terminal slot, validates/resolves at most eight addresses within 500ms, rejects if any answer is prohibited, pins one validated address for TLS while preserving hostname/SNI, and signs `timestamp || raw_body` with the active app-scoped Ed25519 key.
7. Attempt 1 gets connection reset at 1.1s. Because this is transient and at least 500ms remains, attempt 2 rereads/revalidates DNS, reuses the exact interaction ID/body, and succeeds before the absolute 3s deadline. The application deduplicates by interaction ID; Fluxer records two attempts and one valid acknowledgement.
8. For `int-H2`, the endpoint returns `302`. Redirect is never followed and never retried. TLS/certificate failure, prohibited DNS, malformed/oversized body, and ordinary 4xx are likewise terminal. `408`, `425`, `429`, 5xx, reset/refusal, or timeout may receive at most one retry if time remains.
9. If per-endpoint queue reaches 100 or a queued item cannot start with 500ms remaining, Fluxer fails it as overload; it does not enqueue in the generic worker. Limits of 50 in-flight per endpoint and 1,000 per process bound the surface.
10. Five consecutive failures, or >=20 samples with >=50% failures in 60s, opens the endpoint circuit. New HTTP-backed commands/controls become safely unavailable before user submission/delivery. The circuit affects this endpoint/application, not unrelated apps.
11. There is no automatic Gateway fallback and no replayable interaction DLQ. A 24-hour metadata-only terminal record supports diagnostics but contains no raw body, response, DNS answers, signatures, tokens, or submitted values.
12. Signed health probes run at 30s, 2m, 10m, then every 30m. Two consecutive successes close the circuit. Developer-triggered probe has a five-minute cooldown and cannot force health. Only new interactions are authorized after recovery; expired `int-H2` is never replayed.

### External effects, audit, and failure boundaries

- Endpoint activation/key rotation uses pending verified state and CAS. Saving a URL or pending key never silently redirects live traffic.
- URL credentials/query/fragment, non-HTTPS production, private/link-local/metadata destinations, unvalidated re-resolution, redirects, cookies, proxy credentials, and cleartext downgrade are rejected.
- Metrics remain low-cardinality; IDs are limited to access-controlled traces. Application-visible failure is audience-safe. Verification/notification failure cannot weaken enforcement.
- A stable public capability/major cannot be retired before QAD-215's minimum twelve-month notice/replacement overlap absent a documented security/legal emergency.

### Conclusion and implementation gap

The trace validates a dedicated dispatcher rather than a durable retry queue: a deadline-bound payload becomes dangerous and useless after three seconds. Explicit transport and circuit state make failures honest without cross-transport duplication. Current code supplies some URL/IP/rate primitives but no dispatcher, signing registration, breaker, or interaction lifecycle.

## SIM-D03 — layered rate limits charge every relevant actor and scope

### Scenario and purpose

Many users invoke one installation while its application responds and requests a native action. The projection turns QAD-143/144/146–148 into explicit if-this-then-that chains for per-user, per-installation, per-interaction, bot-global, and actual-actor budgets, including invalid requests, retries, feedback, and scope isolation.

### Decision and current-state evidence

- **Controlling QAD:** QAD-143/144 layer interaction limits onto the existing limiter and keep defaults code-defined; QAD-146 exempts response-token operations from the bot-global budget; QAD-147 fixes response/follow-up buckets; QAD-148 fixes invocation-class and installation aggregate defaults.
- **Exact spec:** `../QAD/specs/command-errors-and-rate-limits.md` -> interaction invocation/response buckets, invalid-attempt charging, `429` shape, and actual-actor native-action charging.
- **Current constraints:** CS-RATE. Current middleware supplies structured `429`/retry state, an ordinary authenticated-account global 50/s budget, and webhook read/mutation precedents, but no interaction-, installation-, or response-token-scoped limiter.

### Actors, clocks, and initial budgets

- `user-U1` and `user-U2` invoke `app-A` through active `installation-I`; `user-V` invokes unrelated `app-B` through `installation-J`.
- `int-1` belongs to `I`; `app-A` also produces unrelated autonomous bot REST traffic at 50/s. The code-defined defaults are 20 slash/modal submissions per 10 seconds per user+installation, 30 button/select, 60 autocomplete, and 500 delivered interactions per 10 seconds per installation.
- For each interaction, one initial callback and at most five follow-ups are lifecycle caps; reads allow 60/minute, edits/deletes share 30/minute, and all response operations share 50/second per installation.

### Projection chain and expected outcomes

1. If `user-U1` submits 21 slash commands against `I` inside 10 seconds, then the first 20 may proceed subject to every other gate and the 21st receives the existing structured `429` plus retry/rate headers. `user-U2` retains a separate user+installation bucket, but both users still contribute to `I`'s 500/10-second aggregate.
2. If enough distinct users would deliver interaction 501 for `I` inside the same window, then that attempt is rate-limited at the installation aggregate even when its personal bucket has capacity. Traffic for unrelated `J` is unaffected; one application's saturation cannot consume another installation's counters.
3. If `user-U1` sends invalid schema values, unauthorized submissions, or rapid retries, then each request that reaches the protected route consumes the documented applicable attempt budget. Invalid work cannot become a free amplification loop, while an idempotent retry does not create a second accepted interaction/effect.
4. If `app-A` reads `int-1` response state 61 times in one minute, then read 61 is limited by that interaction's read bucket. If it performs 31 combined edits/deletes, then mutation 31 is limited by the shared mutation bucket; alternating methods does not yield two independent budgets.
5. If `app-A` attempts a sixth follow-up, then the lifecycle cap rejects it even if rate buckets have capacity. If many valid response operations across different interactions exceed 50/second for `I`, then the installation response aggregate limits them even though each interaction bucket remains below its own ceiling.
6. If `app-A`'s autonomous bot traffic has exhausted the bot-global 50/s budget, then valid initial callbacks, response reads/edits/deletes, and follow-ups using interaction-token authority do not consume or depend on that bot-global bucket. They still consume their interaction and installation response buckets.
7. If handling `int-1` requests a Fluxer-native effect as the bot, then that endpoint also charges the bot's ordinary route/global limits. If an exact delegated effect acts as `user-U1`, then it charges `user-U1`'s ordinary endpoint/global limits. Interaction capacity never grants or disguises native API capacity, and changing authority mode cannot shift the cost to a different actor.
8. If any relevant bucket denies a request, then the server returns the existing structured rate result and authoritative retry headers without partial delivery/effect. The application must follow those values rather than hard-code the current defaults; changing a numeric default requires reviewed code/tests/docs, not an ordinary instance setting.

### Concurrency, observability, and failure boundaries

- Counter ownership is atomic enough that concurrent boundary requests cannot all observe the final token and overshoot a hard bucket. A limiter-store uncertainty fails according to the existing protected-route policy; it never fabricates unused capacity.
- Metrics use bounded operation/scope/result labels and never interaction tokens, arguments, response content, user IDs, application errors, or arbitrary paths. Access-controlled traces may correlate stable IDs without becoming the rate-limit source of truth.
- Rate-limit acceptance is not authorization, delivery success, or effect success. Deadline, suspension, installation, schema, permission, hierarchy, idempotency, and response-lifecycle checks remain separate required gates.

### Conclusion and implementation gap

The projection shows how layered budgets prevent load from moving between users, installations, response tokens, and actual native actors. Exemption means “use the narrow response budgets instead of bot-global,” never “unlimited,” and returned state is the stable client contract while numbers remain tunable code defaults. Current limiter behavior supplies response/operational precedent; all new scope keys and interaction lifecycle counters require implementation.

## SIM-D04 — autocomplete results are bounded, query-bound, and superseded

### Scenario and purpose

User `user-U` types three successive values into an application-autocomplete option while earlier requests are still running. The application returns one stale valid result, one malformed result, and one current valid result. This tests focused-path minimization, the three-second terminal callback, pending-work caps, query supersession, typed/access-filtered suggestions, final-submission revalidation, and privacy.

### Decision and current-state evidence

- **Controlling QAD:** QAD-116, QAD-148, QAD-172, QAD-181/182, QAD-189, QAD-195, QAD-227, and QAD-229. Autocomplete is a distinct interaction, not command execution or authority.
- **Exact specs:** `../QAD/specs/interaction-envelope.md` -> `Command and autocomplete data`; `../QAD/specs/interaction-response-lifecycle.md` -> callback type 8; `../QAD/specs/bot-platform-abuse-and-resource-protection.md` -> pending caps and `Autocomplete-specific safety`; `../QAD/specs/command-errors-and-rate-limits.md` -> autocomplete limits.
- **Current constraints:** CS-COMMAND/CS-DELIVERY/CS-RATE. Current React autocomplete supplies listbox/keyboard/IME mechanics for local native commands, but there is no application option schema, type-4 delivery, query identity, response callback, or user/installation pending-work owner.

### Actors, schema, and initial state

- `command-17` has a string/resource option that explicitly enables application autocomplete; its active schema and installation pass current discovery/preflight. `user-U` and the application transport have every capability required by that option shape.
- The code defaults permit 60 autocomplete attempts per 10 seconds per user+installation, at most two pending autocomplete interactions per user/application, and 50 per installation. Each result permits at most 25 suggestions and 64 KiB canonical JSON.
- Queries `q1`, `q2`, and `q3` refer to the same stable command/option path but have distinct server interaction/query identities.

### Projection chain and expected outcomes

1. If `user-U` focuses the eligible leaf and types `q1`, then Fluxer creates a type-4 interaction only after current installation, command/schema, client/application capability, user, and rate checks. Exactly one leaf is marked `focused`; delivery contains only its current option path and bounded permitted entered values, not unrelated form fields or wider resource resolution.
2. If the user types `q2` before `q1` completes, then `q2` receives a new interaction/query identity and makes `q1` ineligible to populate the UI. `q1` may finish for bounded accounting, but its response cannot overwrite the newer request even if its suggestions are otherwise valid.
3. If the user types `q3` while `q1` and `q2` are both still nonterminal, then the new input identity immediately makes both older results display-ineligible. Fluxer fails `q3` fast as temporarily unavailable and creates no third delivery; the client shows that temporary-unavailable state rather than repopulating the `q3` input with a late `q1` or `q2` result. After either pending interaction terminates, a fresh `q4` may receive a new delivery/query identity. Installation pending 51 is independently rejected without consuming another installation's capacity.
4. If the application attempts type 5 defer, type 4 message, type 9 modal, follow-up creation, or a native-action claim for an autocomplete interaction, then callback validation rejects it. Autocomplete accepts only one terminal type-8 result within the three-second acknowledgement deadline; a late result is terminal and never reopens the query.
5. If a response has 26 suggestions, exceeds 64 KiB, uses a wrong option/element type, duplicates an invalid typed resource, includes an inaccessible resource, or is otherwise malformed, then Fluxer rejects the whole response. It neither truncates/strips silently nor displays a valid-looking subset.
6. If `q1` returns after `q2`, then its exact valid response remains superseded and invisible. If the current eligible query returns at most 25 type-correct/access-visible suggestions, then the client binds each row to the current query plus stable option/value identity and announces provider attribution; labels alone cannot retarget selection.
7. If `user-U` selects a suggestion and later submits the command, then normal type-2 preflight rereads current schema, resource visibility/selectability, collection bounds, conditions, temporal rules, installation, and command policy. Autocomplete selection is input convenience, not authorization or a promise that the resource is still valid.
8. Every invalid, superseded, duplicate, and successful attempt consumes the documented autocomplete/installation budget where applicable. Retry/rate feedback uses existing headers; an idempotent transport response cannot create another displayed result for the same query identity.

### Privacy, accessibility, and operational boundaries

- Raw query text, entered values, selected IDs, and suggestion labels/results do not enter logs, traces, audit, analytics, command history, or high-cardinality metrics. Bounded type/result/latency/supersession classes are sufficient.
- IME composition, keyboard movement, focus, screen-reader option naming, loading, empty, stale, and error states use the existing accessible listbox precedent, but client behavior never overrides server query identity.
- Native resource search remains server-side and does not contact the application unless the definition explicitly opts into application autocomplete.

### Conclusion and implementation gap

Autocomplete is a short-lived read interaction whose result is useful only for one current query identity. Bounding pending work and making newer input supersede older display eligibility prevents slow applications from creating UI races or load amplification, while final submission remains the only command preflight. The current client has presentation precedent only; every application delivery, response, cap, and query-binding rule is new.

## SIM-D05 — modal opening, valid submit, cancellation, and expiry are distinct outcomes

### Scenario and purpose

An application intentionally opens a modal from a command and from a message component. One user submits valid fields; another cancels; a third lets the modal expire. This tests type-9 acknowledgement, separate type-5 modal-submit identity, callback legality, focus/state handling, component pending ownership, no synthetic cancellation success, and bounded data lifetime.

### Decision and current-state evidence

- **Controlling QAD:** QAD-054–061, QAD-065–068, QAD-148, QAD-181/182, QAD-185/186, and QAD-230.
- **Exact specs:** `../QAD/specs/interaction-response-lifecycle.md` -> `Command/component-to-modal workflow`; `../QAD/specs/interaction-envelope.md` -> `Modal-submit data`; `../QAD/specs/component-schema-and-limits.md` -> modal limits and command-to-modal presentation; `../QAD/specs/component-state-lifecycle-and-storage.md` -> outcome ownership and expiry.
- **Current constraints:** CS-MESSAGE/CS-DELIVERY/CS-COMMAND. The baseline has no application interaction/modal protocol or component state. Current React focus/dialog patterns are UI precedent only.

### Actors, forms, and initial state

- `command-17` is valid and delivered as `int-command`; `component-4` is a current reusable control on message version 8 and creates `int-component` with a per-user pending reservation.
- The application returns a valid bounded modal: title/custom ID in range, one to five top-level Label/Text Display nodes, at least one interactive Label, unique component/custom IDs, and no disabled modal controls. Its default lifetime is five minutes and never exceeds fifteen minutes or the source deadline.
- Submitted fields may contain bounded text/choice/resource/upload references permitted by the registered modal schema; no field value is trusted as actor or authority.

### Projection chain and expected outcomes

1. If the application returns callback type 9 inside three seconds for `int-command`, then that callback atomically claims the sole initial response and opens the modal. The command interaction is acknowledged/delivered, but the application workflow is not marked completed and no success message/effect is fabricated.
2. If type 9 is returned for `PING`, autocomplete, or a modal-submit interaction—or a second differing initial callback races it—then Fluxer rejects the invalid/conflicting response. Type 9 is allowed only from a command or component and cannot be used to chain modal submits indefinitely.
3. If the source is `int-component`, then opening the modal moves the exact component outcome to `PENDING_COMPLETION`; it does not commit the selected value or consume the control as successful. The modal instance carries the server-owned source outcome identity, message/component version, application, invoker, generation, and expiry.
4. If the user submits, then Fluxer validates the live modal instance/schema/version, field tree/types/bounds, uploads, current entity visibility, application/installation/suspension, source message/version where applicable, and the submitting account. Only then does it create a separate type-5 `MODAL_SUBMIT` interaction containing response values and access-filtered resolution; presentation labels/hidden metadata are not echoed as trusted input.
5. If modal validation fails while the live form can be corrected, then bounded eligible input remains only in that modal, focus moves to the first error/summary, and no application submit interaction is delivered. Corrected explicit submission produces one new interaction; replay cannot produce a second accepted submit.
6. If the application returns a terminal accepted type-4/type-7 result for a component-origin submit and the application-result path owns the source outcome, then the response effect is persisted before the user's component state commits once. If a structured native effect owns it, only deterministic `SUCCEEDED` commits; a callback cannot race a second meaning.
7. If the user closes/cancels the command modal, then no type-5 interaction, application callback, native capability, success response, or application-visible field/cancel payload is created. Focus returns to the originating composer/trigger, live values and form-upload authority clear, and aggregate telemetry may record only cancellation/latency class.
8. If a component-origin modal is cancelled or expires, then the source outcome becomes a proven-no-application-success failure only after ledgers show no native/application effect. The prior per-user presentation may then be restored under the component use policy; partial or ambiguous native effects instead remain `RECONCILING`. The original interaction/token is terminal and is never reused as a fresh attempt.
9. If the absolute modal/source deadline passes, then later submission fails terminally even if the client retained stale fields. Uninstall, suspension, source-message/version change, component expiry, dismissal, or generation change likewise revokes submission/commit authority and never remaps by `custom_id` alone.

### Privacy, accessibility, and rate boundaries

- Modal submits share the 20/10-second user+installation class and installation aggregate; invalid/replayed submissions consume applicable attempts. Opening a modal does not grant extra follow-up or native-action capacity.
- Keyboard trap, accessible names/descriptions, validation announcement, responsive layout, predictable initial/restored focus, and cancel/expiry cleanup are release gates. No normative field count replaces task/accessibility judgment beyond the structural maximum.
- Field values, uploads, raw bodies, and custom IDs are excluded from audit/log/trace/analytics payloads. Only a later authorized native effect may audit its own normalized security facts.

### Conclusion and implementation gap

Opening a modal acknowledges transport but does not prove workflow or component success. A valid submit is a new authenticated interaction; cancel and expiry are absence of success, not callbacks applications can reinterpret. This separation makes focus/data cleanup and component rollback testable. None of the application modal or outcome lifecycle exists today.

## SIM-D06 — oversized and adversarial inputs stop before parse or fan-out

### Scenario and purpose

A client/application sends declared-oversized, chunked-oversized, compressed, deeply invalid, concurrent, and retrying bot-platform requests across publication, callbacks, autocomplete, components, and native actions. This tests pre-parse memory bounds, existing limiter ownership, bounded validation errors, concurrency caps, application isolation, and the absence of automatic permanent punishment.

### Decision and current-state evidence

- **Controlling QAD:** QAD-143–148, QAD-166, QAD-172, QAD-184, QAD-195, and QAD-227–235.
- **Exact spec:** `../QAD/specs/bot-platform-abuse-and-resource-protection.md` in full, with existing route budgets in `command-errors-and-rate-limits.md` and dispatcher bounds in `outgoing-interaction-delivery.md`.
- **Current constraints:** CS-RATE/CS-OUTBOUND/CS-OPS. Fluxer has global/route/Gateway limits, typed validation, worker lanes, and some payload limits, but no bot-platform route set or the planned identity-scoped pending-work owners.

### Inputs and initial capacities

- `app-A` sends a manifest with `Content-Length` beyond 8 MiB+16 KiB, a chunked single-definition body beyond 512 KiB+16 KiB framing, compressed callback JSON, and a bounded body containing more than 100 independent path errors.
- Concurrent work targets one application head, one `(user,message,component)` identity, one installation at 1,000 nonterminal interactions, one delegated capability, and an HTTP endpoint at its own queue/in-flight caps. `app-B` is otherwise healthy.

### Projection chain and expected outcomes

1. If declared length exceeds the route cap, then Fluxer returns `413` and stops before JSON allocation/Zod parsing, canonicalization, candidate persistence, interaction creation, or application delivery. If chunked/slow streaming crosses the cap, the bounded reader terminates at the same limit; omitting or lying about `Content-Length` does not bypass it.
2. If bot-platform JSON is compressed, then the initial contract rejects it rather than decompressing into an unbounded body. Attachments are accepted only through the existing bounded/scanned upload pipeline, never as base64 JSON used to evade route caps.
3. If a body is within the byte cap but violates many schema paths, then structural limits bound recursion/arrays/strings/graphs before expensive semantic work. Error construction stops after 100 safe path errors, reports omission, and never echoes the complete body, secrets, hidden resources, or attacker-selected arbitrary paths.
4. Every invalid, stale, duplicate, unauthorized, and idempotent attempt consumes the existing applicable route/global/IP/identity bucket where possible before expensive work. A trusted testing limit bypass does not bypass body, concurrency, ownership, suspension, permission, or authority checks.
5. If two manifest-head mutations race for `app-A`, then at most one owns the in-flight/CAS path; the other conflicts/fails rather than waiting behind an unbounded mutex. A rejected or canonical no-op request still consumes its route token and cannot create revisions/events/audits as amplification.
6. If the same user repeatedly activates one component while its outcome is pending, then Fluxer returns the same pending/terminal interaction identity and does not emit additional application deliveries. If the installation already has 1,000 nonterminal interactions, then a new invocation fails temporarily unavailable while issued confirmations/native actions continue safely toward terminal state.
7. If one delegated capability requests a generic loop or multiple operation IDs, then schema/registry validation rejects it. Exactly one registered operation/effect identity is allowed; reviewed bulk operations own explicit cardinality and confirmation rather than hiding fan-out in a generic request.
8. If `app-A` fills its HTTP endpoint's 50 in-flight/100 queue limits, then new `app-A` delivery fails under its endpoint/installation state and may affect its circuit. It cannot borrow `app-B` capacity, enter a replayable DLQ, or force expired payload replay. `app-B` remains available.
9. If repeated malformed/oversized endpoint responses or security invariant failures persist, then bounded counters, circuit suppression, and the targeted-suspension runbook may activate under their own authority/audit. Fluxer does not create an unaudited automatic permanent ban merely from parser failures; internal unavailability is not recorded as an application strike.

### Observability and recovery boundaries

- Metrics distinguish `413`, validation truncation, limiter denial, concurrency saturation, circuit suppression, and authorization denial with bounded labels. Tokens, bodies, IDs as labels, arguments, option/modal/component values, endpoint errors, and candidate definitions remain excluded.
- Retry headers describe capacity timing, not future authorization. Reconciliation repairs only deterministic owned rows/effects; it cannot turn a rejected request into a publication, interaction, or native success.
- Boundary tests cover exact and over-limit bytes, chunk framing, slow streams, nesting, 100/101 errors, pending caps, per-app queue isolation, and concurrent CAS/effect claims.

### Conclusion and implementation gap

The chain closes both halves of resource protection: bytes are bounded before parsing, and valid-looking work is bounded before it multiplies into persistence, delivery, UI, or native effects. Existing limit machinery is reusable, but every bot-platform cap and pending-work identity requires implementation and failure-injection tests.

## SIM-D07 — client, Gateway, and HTTP capability negotiation converge on one registry

### Scenario and purpose

A Fluxer client, Gateway bot, and outgoing HTTP application request mixtures of known, unknown, dependency-blocked, malformed, and omitted capabilities. Commands requiring client-only or two-sided features are discovered and submitted while sessions/configurations change. This tests the sole QAD-189 registry, bounded intersection, exact wire fields, configuration activation, fallback, session binding, and stable evolution.

### Decision and current-state evidence

- **Controlling QAD:** QAD-138, QAD-183, QAD-189, QAD-215, and QAD-227–229.
- **Exact specs:** `../QAD/specs/interaction-capability-registry.md` in full; `../QAD/specs/interaction-transport-registration.md` -> Gateway and owner API; `../QAD/specs/interaction-envelope.md` -> delivered relevant subset.
- **Current constraints:** CS-DELIVERY/CS-CONTRACT. Current Gateway accepts additive Identify fields and strict major v1, but no capability registry/intersection exists. Applications have no requested/accepted HTTP capability configuration, and clients have no server-bound command-capability session.

### Registry and initial requests

- The reviewed initial registry contains exactly the seven IDs in QAD-189. `fluxer.forms.choice-controls.v1` depends on `fluxer.components.rich.v1`; command multi-value and temporal capabilities are `BOTH`, while conditions is `CLIENT`.
- Client `client-C` requests conditions, multivalue, and one well-formed unknown ID. Gateway bot `bot-A` omits capabilities on session `S0`, then requests rich, dependent choice-controls, temporal, an unknown ID, and a duplicate on new session `S1`.
- HTTP application `app-H` has active configuration generation 7, application endpoint version 12, and proposes a new requested set containing temporal plus an unknown ID.

### Projection chain and expected outcomes

1. If a request array is malformed, has more than 32 unique entries, or contains an identifier outside the 1–64-character lowercase dotted syntax with internal single hyphens, then client bootstrap, Gateway Identify, or HTTP candidate validation fails path-aware before activation/delivery. All seven permanent registry IDs—including the three with hyphenated segments—pass the same validator; leading/trailing/repeated hyphens fail. Well-formed unknown IDs are tolerated for forward compatibility but never appear in the accepted set.
2. If `bot-A` omits `IDENTIFY.d.capabilities` on `S0`, then baseline Discord-compatible interactions remain eligible and `READY.d.capabilities` is empty. Omission does not infer rich/components/delegated/admin support, and a response cannot enable one by echoing an ID.
3. If `bot-A` creates `S1`, then Gateway removes duplicates, resolves dependencies/transport support, and stores only the supported intersection. `READY.d.capabilities` returns accepted IDs; optional `READY.d.unsupported_capabilities` reports the well-formed unknown/dependency-blocked requests for diagnostics. If choice-controls is requested without/while rich is unsupported, it is not accepted.
4. If the bot resumes `S1`, then the accepted set remains bound to that session. Adding an ID to an interaction response or resume payload has no effect; changing requested capabilities requires a new Identify/session. A server registry-support change uses the ordinary reconnect/resume boundary rather than mutating established semantics silently.
5. If `app-H` changes `interaction_endpoint_requested_capabilities`, then Fluxer creates a distinct pending configuration record and CASes only the application pending pointer/version against expected application endpoint version 12. Signed verification sends that record's requested and server-accepted arrays; owner-visible reads expose separate active and pending requested/read-only accepted/derived unsupported sets. The active generation-7 pointer and accepted set remain authoritative until explicit successful compare-and-set activation.
6. Failed verification marks only that candidate `FAILED`; explicit pending-pointer replacement or clearing records abandonment. Successful verification uses a candidate-local conditional update keyed by its exact identity/generation and expected `PENDING_VERIFICATION` state to fix the accepted intersection together with the snapshot's application endpoint version, verification-key generation ID, and canonical configuration digest; it does not inspect the application row atomically. Activation then wins only by CASing those stored proof inputs and the exact pending ID/generation into the application row's active pointer and clearing pending. A replacement may leave an immutable verified proof on a displaced candidate, but that proof is inert. A stale activation CAS changes no live URL/mode/capability set and does not by itself abandon the candidate or delete pending key material; recovery retries the exact CAS when the proof still matches, otherwise a new candidate must be verified. Retirement/abandonment timestamps remain idempotent repairable projections, not selection authority. Unsupported values grant nothing, and a verified record without the pointer CAS is not active.
7. If authenticated `client-C` bootstrap accepts `fluxer.commands.conditions.v1`, then catalog reads/submission bind that server-accepted client session. A caller cannot add it only on the invocation request. A conditions command requires that client capability but no application payload capability; without it, ordinary discovery omits the command and exact lookup is inert/update-required.
8. If a command uses QAD-227 multivalue or QAD-229 temporal types, then both the invoking client's accepted set and active application transport's accepted set must contain the exact required capability. Missing either side creates no interaction and performs no scalar coercion. A cross-platform application must publish an explicit compatible scalar counterpart rather than reinterpret the same definition.
9. If an accepted interaction is delivered, then `INTERACTION_CREATE.d.capabilities`/the normalized envelope contains only the negotiated subset relevant to that payload. A callback using an unnegotiated rich control/native action fails `INTERACTION_CAPABILITY_REQUIRED`; it cannot upgrade the session/configuration.
10. If a stable capability is deprecated, then its ID/meaning remains reserved and usable until QAD-215's minimum notice and replacement overlap. Retirement stops acceptance and yields explicit inert/configuration behavior; self-hosted instances may support a subset but never redefine an ID.

### Failure, compatibility, and observability boundaries

- Baseline command delivery, compatible components/callbacks, and ephemeral visibility require no Fluxer capability. Missing extension support affects only definitions/responses that require it.
- Registry/catalog/configuration diagnostics expose IDs, verification/health/lifecycle state, dependencies, and the caller's sets, not hidden rollout internals, other applications, command input, response bodies, or secrets.
- Shared fixtures cover omission, empty, duplicate, unknown, malformed, dependency-blocked, transport-unsupported, session resume/new Identify, HTTP stale activation, client-only/BOTH discovery, deprecation, and retirement across old/new readers.

### Conclusion and implementation gap

One permanent registry and negotiated intersection lets compatible consumers remain unchanged while extensions fail before semantic downgrade. Session/configuration binding prevents applications or clients from declaring support only when convenient. Current versioning and Identify validation are precedents; all registry, client binding, and HTTP/Gateway intersection state is new.
