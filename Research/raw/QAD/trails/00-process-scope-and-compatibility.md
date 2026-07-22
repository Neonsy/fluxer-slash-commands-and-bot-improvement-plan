# Process, Scope, and Compatibility Trail

## Record status

Structured from the recovered 2026-07-17–20 `Analyze bot commands and roles` task, later explicit publication instructions, the accepted decision index, and repository inspection. This is not a verbatim transcript; `../provenance.md` classifies decision authority.

## Current Fluxer basis

- This work remains analysis-only. `Research/` was originally ignored outside the repository through `/home/neon/.config/git/ignore`; QAD-226 now authorizes an independent research-only publication without any product schema/code or product-implementation change.
- `fluxer_api/src/api/oauth/ApplicationService.ts` and the surrounding OAuth model establish one bot user for an application.
- `packages/constants/src/AppConstants.ts`, `fluxer_app/src/features/platform/transport/RestTransport.ts`, and `fluxer_app/src/features/gateway/transport/GatewaySocket.ts` expose the existing REST and Gateway major-version convention.
- The repository contains the responsive React client but no Flutter/Dart project. `fluxer_app/src/features/ui/state/MobileLayout.ts` is responsive web behavior, not the separate native client.
- Existing application interaction commands, component payloads, ephemeral responses, and declared application settings are not implemented, so most platform-surface decisions extend current Fluxer rather than preserve an existing bot-interaction contract.

## Decision trail

### Original local analysis boundary — QAD-001 and QAD-002

- **Question:** Where should planning evidence live, and may product implementation begin?
- **Options considered:** tracked design artifacts immediately; untracked ad hoc notes; ignored structured local research.
- **Original answer:** keep structured research in an externally ignored `Research/` directory and make no product implementation mutations during analysis.
- **Current status:** QAD-001's local-only publication rule is superseded by QAD-226. QAD-002 remains active only as the no-product-implementation boundary.
- **Why this was sound:** structured notes made the reasoning reviewable while the ignore rule and no-implementation boundary protected `main` and product behavior during an uncertain design phase. QAD-226 changes only publication, not that safety boundary.
- **Classification:** historical process decision plus a still-current product-code scope boundary.

### Independent research publication — QAD-226 (supersedes QAD-001)

- **Question:** After research completion, should the artifact remain machine-local, be added to an existing branch, or be published with independent history?
- **Options considered:** retain local-only notes; commit `Research/` to `main`/another existing branch; publish only `Research/` on a dedicated orphan branch; or allow one root safety ignore file beside the research artifact.
- **User-authorized answer:** create the exact branch `implementation-plan` with a parentless research-only root, publish the complete `Research/` tree, and push it to `origin`; do not modify existing branch history, product code, or unrelated files. A later user-approved branch-safety amendment permits one root `.gitignore` that ignores every root entry except itself and `Research/`, and no other root content. Later user-requested review corrections may be research-only descendants on the same independent history. Preserve the global ignore rule unless removing only its exact `Research/` entry is necessary.
- **Why this is sound:** a parentless Research-only root makes the artifact shareable and its history/tree separation verifiable without attaching it to `main`; the narrowly scoped root ignore file prevents checkout/worktree residue from entering the branch while preserving exactly the intended research artifact. Later review commits preserve separation as long as they contain only `Research/` and that safety file. A local-only artifact would not meet the explicit publication outcome, and using an existing branch would violate the isolation requirement. Independent history does not make merging impossible, so verification—not an absolute structural claim—proves that `main` remains untouched.
- **Evidence:** the current task instruction explicitly authorizes and prescribes the orphan branch, commit, push, isolation, cleanup, and final live-remote verification. Repository `AGENTS.md` separately forbids automated pull requests/comments; QAD-226 grants neither.
- **Tradeoffs and unknowns:** publication creates durable remote state and requires careful tree/parent/remote verification, but avoids product-history contamination. Remote permissions/availability remain external and must be reported if they block the authorized push.
- **Dependencies and consequences:** supersedes QAD-001; narrows QAD-002 to product implementation. It gates publication on the QAD/CS/SIM consistency review, requires a parentless research-only root commit, permits only explicitly requested Research corrections plus the exact branch-safety `.gitignore` as descendants, and requires proof that `main` and unrelated work remain untouched.
- **Classification:** explicit current user-authorized process/VCS decision, not a product decision or implementation recommendation.

### Discord as comparison and compatibility baseline — QAD-002A and QAD-002B

- **Question:** Is Discord the specification, merely irrelevant, or a compatibility baseline that can be intentionally exceeded?
- **Tradeoff:** blind parity eases migration but can preserve poor constraints; ignoring parity imposes needless migration work.
- **Recommendation and answer:** use Discord as a familiar comparison and migration baseline, prefer additive compatible extensions, but allow documented intentional incompatibility when a better Fluxer design requires it.
- **Why this is sound:** Fluxer's existing REST/Gateway version posture already serves Discord-shaped clients, so preserving familiar wire behavior reduces migration risk; keeping Fluxer decisions authoritative avoids importing external limitations without product justification.
- **Classification:** extends Fluxer's existing Discord-oriented API posture without making Discord product behavior authoritative.

QAD-220 later makes the supported community chat-input subset a hard drop-in acceptance invariant: only endpoint/credential configuration changes for compatible Discord bot code, while Fluxer extensions remain optional and every deliberate difference is manifest-tested/documented.

### Application-to-bot cardinality — QAD-106

- **Question:** May one application own multiple bot identities?
- **Alternative:** multiple bots per application would require separate installation, credential, role, command, and audit cardinalities.
- **Recommendation and answer:** preserve exactly one bot user per application; require another application for another bot identity.
- **Why this is sound:** the current application ID deterministically identifies one bot user and every existing credential/ownership path assumes that cardinality. Multiple bots would make all downstream ownership keys ambiguous without an accepted use case to justify the expansion.
- **Classification:** preserves the current OAuth/application model.

### Per-owner application limit — QAD-207

- **Question:** Should the current limit of 25 applications owned by one account remain the hard ceiling?
- **Current precedent:** `MAX_APPLICATIONS_PER_USER` is 25; `OAuth2ApplicationsRequestService` counts current owned applications before creation. The route separately requires an authenticated default user, CAPTCHA, and the `OAUTH_DEV_CLIENT_CREATE` limit of 10 per hour.
- **Options considered:** retain 25; raise the ordinary ceiling to 50; or retain 25 and add a reviewed per-owner exception mechanism.
- **Answer:** raise the code-defined ownership maximum to 50 non-deleted applications. Suspended, dormant, and retained applications continue to count until permanent deletion completes. Preserve the existing creation authentication, CAPTCHA, and 10/hour limit.
- **Why this is sound:** 50 accommodates separate test, staging, migration, and production identities without adding an exception/entitlement system, while the independent 10/hour and CAPTCHA controls still bound creation bursts. Counting every retained application and conditionally reserving one of the owner's 50 slots prevents suspension, failed cleanup, or concurrent requests from bypassing the resource ceiling.
- **Calibration and review:** the repository proves the current value and protections, not demand for 50. This is an accepted product value that doubles the worst-case bot/credential/application rows per owner; implementation must measure cap rejections, slot utilization, creation abuse, cleanup backlog, and retained-resource cost before and after rollout. Material pressure at either end triggers product review of 25, 50, or an explicit exception path—never silent deletion or an unbounded increase.
- **Classification:** intentionally changes one existing code constant while preserving the surrounding creation protections and one-application-to-one-bot model.

### Initial installation and command contexts — QAD-107, QAD-108, and QAD-117

- **Question:** Which contexts and command entry types belong to the master plan?
- **Options considered:** community, DM, group-DM, global/user installation, chat-input, user-context, message-context, and Activity entry commands.
- **Recommendation and answer:** community-installed applications and chat-input slash commands only. DM/group-DM commands, user/global installations, user-context commands, message-context commands, and Activity entry commands are out of scope. The protocol remains structurally extensible without promising those products.
- **Why this is sound:** current guild membership, permissions, audit, and channel services provide evidence-backed ownership for community chat input, while the excluded contexts lack equivalent installation, audience, and lifecycle contracts. Starting there prevents unreviewed authority models from entering the base design.
- **Classification:** preserves current community concepts while adding a deliberately narrow new application-command surface.

### Responsive web versus native mobile — QAD-135

- **Question:** Does “no mobile work” exclude responsive web behavior in this repository?
- **Options considered:** exclude all narrow-layout behavior; include responsive React work but exclude the separate Flutter client.
- **Recommendation and answer:** normal responsive React behavior remains required; no Flutter/native-client mutations are part of the stacks. Public contracts remain client-neutral and capability-versioned.
- **Why this is sound:** the tracked repository owns and tests responsive React layouts but contains no Flutter implementation to change or validate. Client-neutral contracts and negotiated fallback let the external native client adopt later without weakening the in-scope web experience.
- **Classification:** preserves the repository's current responsive-web ownership boundary.

### Evidence requirement — QAD-145

- **Question:** May decisions rely only on greenfield reasoning or Discord comparison?
- **Recommendation and answer:** no. Each material question must durably record relevant current implementation, schema, test, documentation, and history evidence and state whether the answer preserves, extends, replaces, or intentionally differs from it.
- **Why this is sound:** without repository evidence, a plan can mistake a proposed service for current behavior or break an existing contract; classification makes the migration cost and ownership change visible to implementers and reviewers.
- **Classification:** strengthens the planning process; it does not alter product behavior.

### Interaction and component identity allocation — QAD-163 and QAD-164

- **Question:** Which interaction/message/component identities are Fluxer resources, which are developer-authored selectors, and which require independent IDs or tombstones?
- **Options considered:** give every component occurrence a Snowflake; expose only developer keys; use existing resource Snowflakes plus versioned composite addressing and opaque response authority.
- **Recommendation and answer:** interactions and response messages receive Snowflakes and serialize as decimal strings. Public bot-managed messages remain ordinary messages; ephemerals use message Snowflakes in recipient-scoped storage. Command keys and component `custom_id` values are application-authored strings. A component occurrence is addressed by application, message, message version, and component path/key rather than another Snowflake. HTTP retry reuses the interaction ID. Response authority is a 32-byte base64url secret stored only as a hash and scoped to the 15-minute response window.
- **Current precedent:** `fluxer_api/src/api/BrandedTypes.ts` uses branded bigint Snowflakes for first-class resources, `packages/schema/src/primitives/SchemaPrimitives.ts` accepts and serializes their decimal wire form, and existing message rows already carry an internal integer `version`. That version is not exposed by current public message schemas or guaranteed monotonic under the read-then-unconditional-patch helper. Current SSO creates cryptographically random base64url tokens, while client message `nonce` values are selectors/deduplication hints rather than resource IDs.
- **Deletion/reuse answer:** Snowflakes and response tokens are never reused. A `custom_id` may recur in another message/version because the composite address disambiguates it and stale versions fail. Command-key and application-handle reuse follow their own retained-configuration and naming policies.
- **Why this is sound:** it assigns first-class IDs only to durable resources, binds reusable developer selectors to immutable message identity/version, and uses a secret type for bearer authority. That follows existing type boundaries while preventing stale controls or reused labels from retargeting an action.
- **Classification:** preserves Fluxer's existing resource ID and message-version conventions, extends them to new interaction resources, and avoids speculative component-instance entities.

### Shared compatibility manifest and fixtures — QAD-196

- **Question:** How can the plan prove its Discord migration baseline across TypeScript, Erlang, Rust, React, OpenAPI, and real transports without treating one SDK or duplicated fixtures as the specification?
- **Options considered:** independent runtime snapshots; a single SDK smoke test; prose-only compatibility claims; or one schema-owned manifest and fixture corpus plus cross-runtime and real-service probes.
- **Repository-derived answer:** classify each relevant surface as compatible, compatible-additive, intentional difference, or out of scope; bind every entry to source date, migration/fallback, schema symbol, and tests. Reuse one bounded fixture corpus across runtimes and add raw-protocol plus pinned-development-SDK smoke tests. Exact scope is in `specs/discord-compatibility-conformance.md`.
- **Why sound / evidence:** Fluxer already has Zod/API/client tests, generated OpenAPI, Rust workspace tests, Erlang checks, and aggregate commands, but no shared bot-protocol corpus; component/message data crosses manually mirrored runtimes. Independent goldens can agree with themselves while disagreeing on the wire, and one SDK cannot prove the public contract. Current Discord public pages cited by the individual specs remain the comparison source, not the Fluxer authority.
- **Tradeoffs, assumptions, and unknowns:** a shared corpus and real-service probe increase CI and review cost but make deliberate differences visible and prevent silent migration regressions. The pinned SDK is only representative; comparison-source updates require reviewed manifest diffs rather than automatic policy changes.
- **Dependencies / consequences / supersession:** depends on QAD-002A/QAD-002B, QAD-138/QAD-187/QAD-189, and is strengthened by QAD-220. Implement schema-owned fixtures/loaders and generator-cleanliness/compatibility gates. It supersedes no product decision; it replaces unsupported prose-only conformance claims.
- **Classification:** repository-derived test/compatibility recommendation, not a claim that the currently unimplemented platform already conforms.

## Cross-cutting completeness audit

- **Scope:** supplements QAD-001, QAD-002, QAD-002A, QAD-002B, QAD-106, QAD-107, QAD-108, QAD-117, QAD-135, QAD-145, QAD-163, QAD-164, QAD-196, QAD-207, and QAD-226. Each entry's specific answer still controls.
- **Shared credible alternatives and rejection:** keeping current bot/OAuth behavior only would avoid new code but cannot provide the accepted platform; copying Discord wholesale would ease one migration path but would make an external product authoritative and block Fluxer extensions; broadening immediately to DM/user installs/context commands/native mobile/multiple bots creates unsupported cardinalities and clients; mutable labels or a Snowflake for every component occurrence either retarget authority or add entities without ownership value; publishing on `main` or remaining local violates QAD-226's explicit isolation/shareability requirements. These are rejected only for the scoped reasons in the individual entries, not as universal rules.
- **Evidence-backed soundness:** `fluxer_api/src/api/oauth/ApplicationService.ts`, `packages/constants/src/AppConstants.ts`, `fluxer_app/src/features/platform/transport/RestTransport.ts`, `fluxer_app/src/features/gateway/transport/GatewaySocket.ts`, `fluxer_app/src/features/ui/state/MobileLayout.ts`, the typed Snowflake/schema paths cited above, and the repository-wide absence of Flutter and application-interaction persistence establish the present boundary. The official Discord pages linked by the specs establish only the dated comparison contract. The conclusion is least disruptive because it preserves existing identity/version/client ownership and makes every new surface explicit.
- **Tradeoffs:** security gains stable server identities and avoids external-spec authority; operations gain a bounded initial surface but must monitor external-contract drift; compatibility preserves a hard guild chat-input baseline while documenting exceptions; maintenance avoids duplicate native/mobile/multi-bot systems but adds a conformance corpus; users get predictable migration and responsive web but not the excluded contexts. Raising the owner cap increases retained-resource exposure, mitigated by existing creation protections.
- **Assumptions and unknowns:** source authority is classified in `../provenance.md`; external Discord contracts can change after their cited retrieval date; the remote may reject the authorized orphan push; official production deployment values remain external. None of those unknowns authorizes scope expansion.
- **Consequences and dependencies:** QAD-145 governs evidence for every later decision; QAD-002A/B, QAD-196, and QAD-220 govern compatibility tests; QAD-106/107/108/117 determine installation/command cardinalities; QAD-163/164 determine storage and wire IDs; QAD-226 gates research publication while QAD-002 continues to block product implementation.
- **Supersession:** QAD-226 supersedes QAD-001. QAD-220 strengthens QAD-002B's migration preference into a scoped acceptance invariant. QAD-196 supplies its verification mechanism. No other decision in this trail is known to be superseded; later additions must link both directions.
