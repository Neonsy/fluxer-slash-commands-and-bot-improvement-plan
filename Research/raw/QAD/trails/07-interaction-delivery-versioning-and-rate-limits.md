# Interaction Delivery, Versioning, and Rate-Limit Trail

## Record status

Structured from the recovered 2026-07-17–20 `Analyze bot commands and roles` task, the accepted decision index, repository inspection, and current Discord developer documentation where comparison was requested. This is not a verbatim transcript; `../provenance.md` classifies decision authority.

## Current Fluxer basis

- Bots already authenticate to the Erlang Gateway, but `fluxer_gateway/src/gateway` has no application-interaction dispatch contract.
- Application records have no interaction callback URL or interaction-signing key.
- `packages/constants/src/AppConstants.ts` sets REST/Gateway API version `1`; `fluxer_gateway/src/gateway/gateway_handler.erl` currently accepts only Gateway `v=1` and rejects other versions.
- `fluxer_api/src/api/middleware/RateLimitMiddleware.ts` implements shared leaky-bucket enforcement, structured `429` errors, retry headers, and a hard-coded ordinary global limit of 50 requests/second.
- Route budgets are code constants aggregated through `fluxer_api/src/api/RateLimitConfig.ts`; normal instance operators do not edit individual budgets.
- `fluxer_api/src/api/rate_limit_configs/WebhookRateLimitConfig.ts` exempts webhook execution and message operations from the ordinary global account limit while applying route buckets: 60/minute for execute/read and 30/minute for edit/delete.

## Decision trail

### Deferred processing — QAD-065

- **Question:** Must applications finish all work synchronously before acknowledgement?
- **Recommendation and answer:** allow acknowledgement/defer followed by a bounded later completion while the user sees pending state. Under the later user-approved QAD-060 correction, receipt/defer/modal opening does not itself commit component input; only the selected application-result or native-effect path's terminal success does.
- **Why this is sound:** many legitimate operations cannot finish inside the acknowledgement window, but silence makes the interaction look lost and invites retries. A durable defer gives the user truthful pending state while the separate response deadline still bounds application authority; separating receipt from success prevents premature consumption or retry after a completed effect.
- **Classification:** new interaction lifecycle.

### Initial-handling and response-authority deadlines — QAD-066 and QAD-067

- **Question:** What are initial-handling and response-authority deadlines?
- **Recommendation and answer:** require an initial response/defer/modal or structured native-action claim within 3 seconds; after acknowledgement/defer, permit original-response mutation and allowed follow-ups for 15 minutes from interaction creation. Expiry ends mutation authority but does not itself erase retained ephemeral output. Component rollback at either deadline still requires proven no-effect.
- **Why this is sound:** these dated Discord-compatible values let existing handlers migrate and give users prompt acknowledgement, while the 15-minute bearer window bounds later mutation. Separating authority expiry from output retention avoids erasing a valid recipient copy merely because the app can no longer edit it.
- **Classification:** new contract chosen for Discord-compatible developer expectations.

### Visibility immutability — QAD-068

- **Question:** Can an existing response switch between public and ephemeral?
- **Recommendation and answer:** no. Visibility is selected at creation/defer and remains immutable; a different visibility requires a separate response.
- **Why this is sound:** audience is a security and retention property established when the resource is created. Allowing later conversion could leak previously private content or hide public history, whereas a separate response has a fresh explicit audience and lifecycle.
- **Classification:** new message-lifecycle invariant.

### Delivery transport choice — QAD-069 and QAD-075

- **Question:** Gateway only, outgoing HTTP only, or both simultaneously/fallback?
- **Recommendation and answer:** each application chooses exactly one active transport: Gateway or outgoing HTTP. Fluxer never silently falls back between them.
- **Why this is sound:** dual or silent fallback delivery can execute one interaction twice and makes outage ownership unknowable. One versioned active transport gives deterministic routing, while explicit switching lets developers verify the replacement before traffic moves.
- **Classification:** Gateway extends current bot transport; HTTP is a new Discord-compatible alternative with explicit ownership.

### HTTP authenticity and key scope — QAD-070 and QAD-071

- **Question:** How does an HTTP receiver authenticate Fluxer, and are signing keys shared instance-wide?
- **Recommendation and answer:** sign the exact timestamp plus raw body with Ed25519 and Discord-compatible headers. Use an application-scoped keypair so compromise/rotation impact is isolated.
- **Why this is sound:** signing the exact received bytes prevents intermediary reserialization ambiguity and lets the receiver verify origin/freshness. Per-application keys contain compromise and permit independent rotation without giving one application material that validates another's traffic.
- **Classification:** new outbound-webhook security boundary.

### Endpoint activation — QAD-072

- **Question:** Does saving a URL immediately redirect live interactions?
- **Recommendation and answer:** no. Send a signed verification interaction and require the expected response within the acknowledgement deadline before activation.
- **Why this is sound:** syntactic validity does not prove endpoint control, signature verification, or deadline readiness. A signed challenge validates the complete receiving path before any real user interaction is redirected or dropped.
- **Classification:** new safe activation workflow.

### Endpoint network policy — QAD-073 and QAD-074

- **Question:** What URLs and redirects may outgoing delivery use?
- **Recommendation and answer:** production endpoints must be public HTTPS. Resolve and reject loopback, private, link-local, metadata, and prohibited destinations at validation and connection time; do not follow redirects.
- **Why this is sound:** application-controlled URLs create an SSRF boundary, and DNS can change after registration. Revalidation/pinning at connection time plus no redirects prevents a public-looking endpoint from reaching internal services or cloud metadata.
- **Classification:** new SSRF-resistant delivery policy.

### Retry behavior — QAD-076

- **Question:** Promise exactly-once delivery, never retry, or retry within the user-visible deadline?
- **Recommendation and answer:** at most one retry for transient connection/server failure only when it can still complete inside the 3-second deadline. Reuse the same interaction identity; never retry ordinary client errors.
- **Why this is sound:** one bounded retry can recover a transient network failure, but retrying past the deadline or on deterministic 4xx responses creates stale work and load. Stable identity lets receivers deduplicate without a false exactly-once transport claim.
- **Classification:** new at-least-once/idempotent delivery behavior.

### Endpoint health suppression — QAD-077

- **Question:** Continue delivering indefinitely to a failing HTTP application?
- **Recommendation and answer:** repeated failures mark delivery unhealthy, suppress commands/controls from ordinary use with a safe unavailable state, and notify developers/managers until verification/health recovery succeeds.
- **Why this is sound:** continuing user-visible invocations against a known failing endpoint wastes bounded capacity and produces predictable timeouts. Suppression limits blast radius while safe status and probes provide a deliberate recovery path without leaking endpoint detail.
- **Classification:** new operational protection.

### Signing-key rotation — QAD-078

- **Question:** Replace the active key immediately or stage rotation?
- **Recommendation and answer:** expose a pending public key, verify delivery signed by it, then activate; retain only the bounded overlap necessary for in-flight verification.
- **Why this is sound:** immediate replacement can strand a receiver that has not deployed the new key, while indefinite dual validity expands compromise exposure. Pending verification proves readiness and a short versioned overlap handles in-flight traffic safely.
- **Classification:** new outage-resistant credential lifecycle.

### Protocol version and capabilities — QAD-138

- **Question:** Version every feature, rely only on one API integer, or combine majors with capability negotiation?
- **Recommendation and answer:** breaking wire changes use a new REST/Gateway major with an overlap period. Additive fields stay within the major. Clients/applications explicitly advertise interaction/component capabilities; unknown or omitted capability is unsupported and receives inert fallback.
- **Why this is sound:** majors make incompatible parsing explicit, while capabilities avoid a new major for every additive feature. Negotiated intersection and inert fallback ensure neither side sends active semantics the other cannot understand.
- **Classification:** extends the current strict API-major mechanism with feature negotiation.

### Layered rate-limit ownership — QAD-143

- **Question:** Build a separate interaction limiter or extend current enforcement?
- **Recommendation and answer:** extend the existing leaky-bucket system. Charge invocation to user and installation, responses to installation, and final native actions to their actual actor. Delegation never bypasses ordinary endpoint limits; applications may only be stricter.
- **Why this is sound:** the existing limiter already owns headers, enforcement, and operational behavior; a second system would produce conflicting budgets. Charging each scarce resource/actor prevents one user, app, or delegated path from shifting load onto another scope.
- **Classification:** preserves the current limiter and adds interaction-specific keys.

### Code-defined budgets — QAD-144

- **Question:** Are numeric budgets permanent API promises or live operator settings?
- **Recommendation and answer:** follow current Fluxer: budgets remain reviewed code constants, not ordinary operator settings or permanent API guarantees. Bots must follow headers and `429` retry state.
- **Why this is sound:** code review and tests keep security/resource defaults consistent across deployments, while response headers let clients adapt if measured tuning changes. Making every value an operator knob would fragment behavior and weaken predictable abuse protection.
- **Classification:** preserves current rate-limit ownership.

### Global-limit exemption — QAD-146

- **Question:** Do token-scoped interaction responses consume the bot user's normal global 50 requests/second?
- **Recommendation and answer:** no. Exempt callbacks/read/edit/delete/follow-up operations, while retaining per-installation/per-interaction buckets. Separate bot/user native actions still consume ordinary limits.
- **Current precedent:** existing webhook execution/message operations are global-exempt, and Discord interaction endpoints follow the same broad model.
- **Why this is sound:** token-scoped responses have their own narrow audience and budgets and should not be starved by unrelated autonomous bot traffic. Per-interaction/installation limits still bound abuse, while separate native actions continue charging the actual bot/user resource they consume.
- **Classification:** extends Fluxer's current webhook behavior to interaction tokens.

### Response endpoint defaults — QAD-147

- **Question:** What bounded defaults ship initially?
- **Recommendation and answer:** exactly one initial response within 3 seconds; at most five follow-ups; 60 reads/minute/interaction; one shared 30 edits-or-deletes/minute/interaction bucket; 50 combined response operations/second/installation.
- **Current precedent:** reuses current Fluxer webhook 60/minute read and 30/minute mutation values and the current 50/second ordinary bot throughput baseline.
- **Why this is sound:** the defaults reuse observed route scales while adding interaction/install scoping and a hard follow-up bound, so the new surface starts within known operational expectations. They remain code defaults advertised through rate-limit state, not immutable throughput promises.
- **Classification:** extends existing constants to new interaction scopes.

### Invocation defaults — QAD-148

- **Question:** What initial per-user/installation invocation budgets fit Fluxer's current rate-limit conventions?
- **Recommendation and answer:** command/modal submissions use 20/10 seconds, controls use 30/10 seconds, autocomplete uses 60/10 seconds, and all delivered interactions use 500/10 seconds per installation.
- **Current precedent:** 20/10 seconds follows existing message and guild mutation buckets; 30/10 seconds follows the reaction bucket; 60/10 seconds follows higher-frequency read/metadata buckets; 500/10 seconds preserves the existing 50/second throughput baseline at installation scope.
- **Why this is sound:** different interaction classes have different expected frequency and cost, so reusing the closest current bucket avoids one arbitrary universal cap. The aggregate installation ceiling prevents many users from multiplying those per-user allowances into unbounded app load.
- **Classification:** extends current code-defined constants to new interaction keys.

### Shared interaction envelope — QAD-181

- **Question:** Which common and trigger-specific fields cross both Gateway and outgoing HTTP delivery?
- **Repository evidence:** Fluxer owns public schemas in `packages/schema`, uses branded Snowflakes with decimal-string wires, computes permissions server-side, and currently has no interaction event. Discord's current type 1-5 envelope is the migration baseline.
- **Answer:** use one tagged schema for verification, chat-input command, component, autocomplete, and modal submit. Preserve compatible fields/type numbers while adding immutable keys/revisions, invoked form, deadlines, trace/attempt metadata, message version, negotiated capabilities, and an explicitly non-authoritative permission snapshot. Route only guild installations initially.
- **Why this is sound:** one schema across transports prevents Gateway/HTTP drift, and tagged trigger variants keep validation exhaustive. Immutable revisions/deadlines make stale/retry behavior explicit, while marking permission context non-authoritative preserves execution-time security checks.
- **Classification:** extends Fluxer's existing schema ownership and Discord migration surface without implementing out-of-scope user/DM commands. Exact fields are in `specs/interaction-envelope.md`.

### Response operations and idempotency — QAD-182

- **Question:** Which callbacks/routes exist, and what can an application safely retry?
- **Repository evidence:** Fluxer already has webhook-style message operations, Snowflake messages, structured errors, route budgets, and message nonce behavior. Discord supplies the callback/original/follow-up route and type baseline but does not itself prove exactly-once follow-up creation.
- **Answer:** preserve compatible response/defer/update/autocomplete/modal and token-scoped message operations. Atomically claim one initial callback; require message versions for public mutations; support optional scoped request keys for truthful retry deduplication; and expose stable conflicts and terminal states. Requests without a creation idempotency key do not receive an exactly-once promise.
- **Why this is sound:** atomic initial claim enforces protocol uniqueness, versions prevent lost public updates, and scoped keys make retry guarantees explicit where the server can prove them. Refusing an exactly-once promise without a key accurately reflects distributed request ambiguity.
- **Classification:** preserves migration-compatible routes and strengthens distributed retry/concurrency semantics. Exact operations/errors are in `specs/interaction-response-lifecycle.md`.

### Gateway negotiation and HTTP registration — QAD-183

- **Question:** Does interaction delivery require a new intent, and which application fields safely activate HTTP delivery?
- **Repository evidence:** Fluxer's Gateway has no intents and accepts additive Identify data plus `ignored_events`; application storage/update APIs are typed and versionable. Discord sends `INTERACTION_CREATE` without an interaction intent and exposes an endpoint URL/application verification key.
- **Answer:** require no intent and make the new dispatch non-ignorable while Gateway mode is active. Compatibility delivery is implicit; capabilities negotiate Fluxer-only additions. Persist an application-scoped active endpoint pointer, at most one pending pointer, and separate configuration records containing URL/verification/generation/requested/accepted capabilities and health; delivery binds only the active generation. Persist the candidate's verified result through a candidate-local conditional update together with the exact application endpoint version, verification-key generation ID, and canonical configuration digest it proved. Then CAS-activate its exact pending pointer on the application row without changing transport mode; lifecycle timestamps are repairable projections. Switch Gateway/HTTP explicitly and rotate keys through a separate pending verified generation.
- **Why this is sound:** no new intent preserves compatible delivery expectations, while non-ignorable dispatch prevents an active app from accidentally dropping core interactions. Durable proof inputs let recovery retry activation after a crash without treating current mutable state as verification evidence. The candidate write never claims to inspect the application row; the one authoritative application-pointer CAS makes any displaced proof inert and gives retry/reconciliation a durable answer without a cross-record transaction.
- **Classification:** preserves current Gateway/application conventions and Discord migration behavior while adding transactional transport/key lifecycle. Exact fields are in `specs/interaction-transport-registration.md`.

### Deadline-owned outgoing delivery — QAD-184

- **Question:** Which queue, concurrency, SSRF/DNS, retry, breaker, telemetry, and dead-letter behavior can meet the three-second contract safely?
- **Repository evidence:** Fluxer already has syntactic outbound endpoint validation, comprehensive public-IP classification, bounded worker lanes, and worker DLQ. Generic workers wait at least 15 seconds and can replay, which conflicts with an expired interaction.
- **Answer:** use a dedicated bounded dispatcher with absolute-deadline scheduling, public DNS validation/address pinning, no redirects, classified one retry, endpoint-scoped circuit suppression/probes, sanitized metrics/traces, and a metadata-only terminal record. Never place an interaction payload in a replayable DLQ.
- **Why this is sound:** a three-second user contract cannot be owned by a generic delayed/replayable queue. A deadline-aware dispatcher can reuse existing network protections while guaranteeing stale payloads are never re-driven and retaining only safe diagnostic metadata.
- **Classification:** extends existing security/queue primitives but intentionally separates deadline-bound delivery from background work. Exact behavior is in `specs/outgoing-interaction-delivery.md`.

### Capability registry and negotiation mechanics — QAD-189

- **Question:** Which identifiers exist, and how do Gateway and HTTP applications safely negotiate them without breaking migration clients or older self-hosted instances?
- **Repository-derived answer:** keep a reviewed stable dotted-ID registry, accept at most 32 bounded strings, ignore well-formed unknown IDs, return only the supported/dependency-valid intersection, and bind that set to the Gateway session or explicitly activated HTTP configuration version. Baseline compatible interactions need no capability; Fluxer-only rich, choice, delegated-action, and declarative-admin behavior does. IDs are never repurposed.
- **Why this did not require another product choice:** it implements accepted QAD-138/183 using Fluxer's strict major and bounded Identify-validation conventions. It does not choose how long Fluxer publicly promises to keep an old stable contract.
- **Classification:** preserve major-version breaking boundaries and extend them with additive negotiated features. Exact mechanics are in `specs/interaction-capability-registry.md`.
- **Supersession:** this registry is the sole capability authority. It replaces the transport-registration draft's abbreviated initial list, `READY.interaction_capabilities` response field, and single combined HTTP capability set. Gateway uses `IDENTIFY.d.capabilities`, `READY.d.capabilities`, and optional `READY.d.unsupported_capabilities`; HTTP keeps requested and accepted sets distinct and exposes unsupported requests only as derived diagnostics.

### Stable protocol retirement promise — QAD-215

- **Question:** How long must a stable capability or API/Gateway major remain usable after deprecation?
- **Options considered:** six months minimizes maintenance but can strand low-frequency/self-hosted clients; twelve months spans a full annual upgrade cycle; eighteen months gives more migration time but materially extends duplicate infrastructure/security maintenance.
- **Recommendation and answer:** at least twelve months after public notice and, when a replacement is necessary, at least twelve months after the stable replacement and migration documentation are available. Preview/experimental features are exempt when clearly labelled. Only a documented security/legal emergency may shorten the period, with public explanation and the safest available fallback.
- **Current precedent:** Fluxer currently accepts only REST/Gateway v1 and has no multi-major support policy. Deprecated GIF aliases provide warning/successor headers but no dated retirement guarantee.
- **Why this is sound:** twelve months gives maintained clients and less-frequent self-hosted deployments a complete release/operations cycle without committing Fluxer to the longer duplicate-surface cost of eighteen months. It is a selected public support commitment, not a duration proven by current telemetry; release owners must review adoption/security/maintenance evidence before announcing retirement and may extend, but not silently shorten, the window.
- **Classification:** extends the current strict-version and warning conventions with a public stable-support promise.

## Still unresolved in this subject

No unresolved product decision remains in this subject.

## Cross-cutting completeness audit

- **Scope:** supplements QAD-065 through QAD-078, QAD-138, QAD-143/QAD-144, QAD-146 through QAD-148, QAD-181 through QAD-184, QAD-189, and QAD-215.
- **Shared credible alternatives and rejection:** require synchronous final responses; invent non-compatible deadlines; allow visibility changes; deliver over both transports or silently fail over; trust caller-selected signing keys; activate unverified/private/redirecting endpoints; retry without the absolute deadline or persist a payload DLQ; create a second limiter; treat permission snapshots/capabilities as authority; assume unknown extensions; or retire stable protocols without overlap. These alternatives break migration, duplicate effects, enable SSRF/key substitution, replay stale intent, fragment operations, broaden authority, or strand clients. Compatible deadlines/routes, one explicit transport, generated application keys, verification/SSRF controls, bounded retry with no re-drive, layered existing limits, negotiated intersection, and a stable overlap promise reject those risks.
- **Evidence-backed soundness:** the official Discord interaction page currently documents mutually exclusive Gateway/outgoing webhook delivery, the three-second initial response, 15-minute token, compatible callback routes, and global-limit exemption; the application resource exposes the endpoint URL. Fluxer's exact Gateway/REST version paths, rate-limit configs/middleware, outbound endpoint/IP helpers, and current Gateway Identify bounds establish reusable local ownership. The new specs state intentional differences rather than claiming current interaction support.
- **Tradeoffs:** security gains signatures, SSRF resistance, non-replay, immutable visibility, and explicit capability scope; operations gain health suppression/idempotency but accept endpoint verification, circuits, key rotation, and deployment-owned tuning; compatibility preserves baseline envelopes/routes/deadlines while bounded retries/follow-ups and extensions are documented; maintenance reuses existing limit/version machinery but adds dispatcher/registry state; users get timely pending/error feedback but unavailable endpoints/old clients can suppress interactive features.
- **Assumptions and unknowns:** public comparison contracts can drift; DNS/network topology and traffic-sensitive thresholds are deployment facts; 12-month support excludes clearly labelled preview and permits only documented security/legal emergency; exact code-default tuning cannot change public deadlines/semantics silently.
- **Consequences and dependencies:** QAD-060/061 own component terminal success/no-effect rollback; QAD-065/066/067/068 own response timing/visibility; QAD-069 through QAD-078 own transport/security/health; QAD-143/144/146/147/148 own limit layering; QAD-181/182 own envelopes/routes/idempotency; QAD-183/184 own activation/dispatcher; QAD-186 owns component outcome/state; QAD-189 owns extension negotiation; QAD-215 owns retirement.
- **Supersession:** QAD-181 through QAD-184 concretize earlier delivery/response decisions. The later QAD-060 correction distinguishes transport acknowledgement from component terminal success without changing the public three-second/15-minute deadlines. QAD-189 implements QAD-138's additive extension path; QAD-215 adds the previously absent public overlap duration without changing major/capability semantics. No health condition authorizes silent transport switching.
