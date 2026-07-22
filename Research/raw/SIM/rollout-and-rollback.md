# Implementation Ordering, Rollout, and Rollback Simulations

## SIM-O01 — dependent PR train advances from dark readers to canary, then rolls back a writer

### Scenario and purpose

The installation train is implemented after the conditional-write/rollout foundation. A canary reveals elevated cleanup backlog at 10%, so release owners roll the writer to zero and deploy a prior compatible producer. This validates dependency order, no more than three open dependent PRs, tolerant-reader sequencing, deployment-owned gates, flag boundaries, and rollback without data loss.

### Decision and current-state evidence

- **Controlling QAD:** `../QAD/trails/10-branch-commit-and-rollout-strategy.md` -> QAD-202; QAD-139 (no permanent product switch), QAD-191/192 (private rollout/gates), QAD-193/194 (recovery/reconciliation), QAD-195/196 (operations/abuse), QAD-221 (deployment DR records).
- **Exact specs:** `../QAD/specs/stacked-branch-pr-and-rollout-strategy.md` -> `Governing rules`, `Dependency DAG`, `Train F — persistence and temporary rollout foundation`, `Train I — installation and managed roles`, `Dark migrations and producer order`, `Rollback rules`, `Generated artifacts and validation gates`; `../QAD/specs/bot-platform-rollout-controls.md` -> `Initial controls`, `Dark rollout order`.
- **Current constraints:** CS-ROLL, CS-OBS, and `../CS/messages-and-interactions.md` -> `Current cross-service message boundary`. At the recorded pre-publication baseline, `main` had no requested bot-platform product implementation/Research tracking and no implementation-plan ref. Current Gateway rollout validation/distribution and low-cardinality metrics are useful precedents. The monorepo spans shared TypeScript schemas/API/React, Rust messages, and Erlang Gateway, so incompatible producers cannot precede readers.

### Actors, permissions, and preconditions

- Human maintainers/release owner authorize implementation Git/production actions separately; the research plan itself grants none.
- F1 true conditional writes is merged; F2 typed private rollout distribution is merged. I1, I2, I3 are the only open dependent installation PRs, each based on its predecessor and targeting its parent until merge.
- Deployment owner has recorded traffic-appropriate observation time, authorization/privacy/reconciliation/error/latency/resource thresholds, and measured QAD-221 recovery evidence. If absent, the gate cannot advance.

### Expected processing and rollout transitions

1. I1 lands generated schema/tables/types, state-machine repository/service, due indexes/workers, and tolerant readers before any producer. `installation_writes_percent` source default is 0. Existing bot memberships receive no backfill.
2. I2 adds managed-role subtype/ownership/generation and enforcement while writer remains dark. I3 adds management/recovery UI/docs. Review never has more than these three dependent PRs open.
3. Every PR runs focused tests plus root `pnpm typecheck` and `pnpm test`; affected schema/database/OpenAPI/Rust/Erlang/UI/security/rollout gates run exactly as specified. Generated artifacts come only from sources/generators. Skipped/unavailable checks are reported, never called equivalent.
4. Every supported service/client reader/fallback is deployed. Empty/existing data compatibility and reconciliation scans pass. Allowlisted test app/community becomes eligible through deterministic IDs, not random request sampling.
5. `installation_writes_percent` moves through evidence-appropriate allowlist/1%/10%. Rollout cannot bypass suspension, schema, permissions, lifecycle generation, authority, audit, or cleanup. UI/ordinary availability follows authoritative server eligibility.
6. At 10%, dashboard shows cleanup backlog above the recorded gate. Release owner sets writer to 0 and deploys the prior compatible producer. This stops new installation operations but does not delete rows, down-migrate, expose old untracked behavior for those apps, or call partial work atomic.
7. Readers, revocation, suspension, expiry, audit, cleanup, and reconcilers remain. Existing `INSTALLING`, rollback, uninstall, and failure rows continue to active/dormant/explicit failure through owned services. Existing managers can inspect/retry safe state.
8. Root cause is fixed in the owning branch/release, descendants are rebased/range-diffed in order, remote changes use force-with-lease only with explicit authorization, and affected complete checks rerun. The canary restarts from allowlist rather than skipping directly to 10%.
9. After 100%, the deployment-specific observation window and one complete rollback-capable release cycle pass with clean reconciliation. Source default becomes enabled, then a dedicated owner/deadline removes the temporary flag; it does not become a self-host product setting.

### State, audit, compatibility, and external effects

- Canonical rollout revision is API-owned; services reject stale NATS revisions and keep last valid state on malformed/unavailable update. Client checks are presentation only.
- Percentage selection is stable per application/community. Allowlist forces only the named layer and cannot satisfy missing dependencies.
- Public docs/OpenAPI ship with their surfaces. Human maintainers own PR prose and policy disclosures; the research notes are not pasted as automated PR comments/descriptions.
- There is no global flag for suspension checks, validation, permission enforcement, generation, cleanup, or causal audit. A binary that cannot enforce current safety state is not a valid rollback artifact.

### Conclusion and implementation gap

The trace validates short merge trains and forward-compatible rollback: stopping producers while keeping lifecycle ownership alive is the only honest rollback once durable partial state exists. The precise gate values remain deployment evidence, not invented repository constants. No implementation operation was performed by this simulation.

## SIM-O02 — cross-train gates block premature components, collision controls, delegated authority, and SDK work

### Scenario and purpose

A team wants to open rich component delivery and the delegated broker before prerequisite trains have merged, select collision-picker controls without prototype evidence, and add an SDK to the current DAG. This tests the full DAG, public producer ordering, composer/accessibility evidence, high-risk separation, manifest recovery scheduling, old-client fallback, deferred-project boundaries, and PR retarget/rebase behavior.

### Decision and current-state evidence

- **Controlling QAD:** QAD-115 (recovery later), QAD-135 (responsive web/no Flutter), QAD-145 (evidence), QAD-191–196, QAD-202, QAD-208/209 (complete delegated coverage/confirmation), QAD-215 (stable protocol overlap), QAD-230 (composer-first/modal boundary), QAD-236 (collision prototype/accessibility gate), and QAD-237 (separate deferred TypeScript SDK project).
- **Exact specs:** `../QAD/specs/stacked-branch-pr-and-rollout-strategy.md` -> `Dependency DAG`, `Merge trains and exact branch scopes`, `Stack update, review, and merge procedure`, `Completion criteria for the master plan`; `../QAD/specs/command-picker-and-settings-ui.md` -> `Composer-first workflow`, `Collision-picker design evidence gate`; `../QAD/specs/official-command-sdk.md` -> `Project-start gates`, `Relationship to the implementation plan`.
- **Current constraints:** CS-COMMAND/CS-MESSAGE/CS-AUTH/CS-DELIVERY/CS-CONTRACT. Application registry/interactions/components/delegation do not currently exist; shared schemas cross current TypeScript/Rust/Erlang/React boundaries. Private schema/OpenAPI generators exist, but no official command SDK/client generator or Flutter tree exists.

### Actors, permissions, and initial state

- F/I/S/C trains are merged. E1 schema/readers is merged, but E2 delivery and E3 responses are not. R2 component schema branch and U1 broker branch are proposed.
- Stable production clients understand only old messages. Deployment has no static component fallback reader deployed everywhere.
- P2 picker work has fixed provider/identity/ordering invariants but no recorded QAD-236 real-composer prototype review. A developer also proposes adding an official SDK branch after the command API shape compiles but before real-service conformance evidence exists.

### Expected dependency decisions and processing

1. R2 cannot enable a component producer. R requires merged E delivery/responses and P picker; R1 recipient-only errors precedes R2 rich schema, and R2 fallback/opaque round-trip precedes R3 interactions. `message_components_percent` remains zero until R2 fallback exists everywhere.
2. A branch may land additive component schema/tolerant readers and fixtures dark if its parent chain is correct, but no active unknown tree is sent to unsupported clients. Older clients get static attribution/fallback, never raw payload or action reinterpretation.
3. P2 may implement invariant-preserving catalog/query/identity plumbing and prototype variants, but production picker UI cannot select flat versus exact-duplicate grouping, an extra provider-cycling shortcut, or a preferred-provider visual until real-composer desktop/narrow/touch/zoom/IME/keyboard/screen-reader evidence is recorded and product/accessibility review adds a QAD-173/QAD-236 decision. SIM rejects any variant with identity ambiguity, presentation-driven dispatch/authority, a focus trap, or no equivalent accessible preference path.
4. QAD-230 keeps bounded advanced options composer-first when understandable/accessibly operable, with responsive/keyboard/screen-reader evidence before rollout. It does not prohibit an application's intentional compatible modal callback for genuine long-form/form tasks. The callback must preserve provider identity/focus, and cancellation/expiry cannot be reported as success.
5. U1 cannot enable operations. U requires S audit/suspension, E interaction lifecycle, R ephemeral confirmation/component state, rate limits, and complete registry classification. U1 creates broker foundation with no enabled operation; U2 confirmation follows; U3–U20 each adds at most three exact operation IDs sequentially, with no unclassified fallback to bot authority.
6. No more than three U adapter PRs are open at once. Each child targets its predecessor. After a parent changes, descendants range-diff/rebase; after squash merge, first child rebases `--onto origin/main`, retargets, then later children update in order. Child is never merged first.
7. M command drafts/recovery technically depends on C2 immutable registry but is deliberately scheduled after base interaction/component path. Recovery republishes history; it does not block initial registry or become a shortcut for backend rollback.
8. D declarative settings/builders needs merged R; A actions needs merged D; U can proceed independently of D/A only after its own R/safety prerequisites and stable core operation. This keeps manager configuration and delegated human authority from silently entering ordinary command PRs.
9. Every breaking wire change needs a new major and QAD-215 overlap. Additive fields require negotiated capability. Preview features may be retired under their label; stable majors/capabilities require at least twelve months notice and replacement overlap absent documented emergency.
10. The SDK proposal is rejected from the current eleven-train DAG. Generated schema/OpenAPI output alone is insufficient. Only after implemented/reviewed protocol contracts, clean shared fixtures, real-service raw plus pinned-Discord migration smoke, supported-version rules, and assigned ownership/security/runtime/versioning/signing/provenance exist may a separately reviewed project begin. It remains a thin TypeScript consumer with no import-time network/write side effects or server-policy authority; raw protocol and compatible Discord libraries remain supported. Publication needs separate external authorization.
11. Flutter/native implementation remains explicitly out of scope; responsive React, client-neutral contracts, and fallback are required. The plan cannot claim native client completion.

### Rollback and completion boundaries

- If interaction production stops, response endpoints remain for at least the existing 15-minute authority window. Retained ephemerals remain dismissible/reportable/cleaned; components become inert, not erased.
- Command head rollback preserves immutable head/config and stops producer/discovery; it never guesses an older head. Public message fallback remains readable.
- Picker completion additionally requires the recorded QAD-236 design selection; protocol completion does not imply the collision visual is approved. Current-train completion never requires or claims an SDK package.
- Feature completion requires every approved train/gate, temporary flag removal, reconciler cleanup except explicit legacy bots, compatibility/docs/OpenAPI smoke, and recovery/suspension/privacy/deletion drills. A partial DAG is not relabeled complete.

### Conclusion and implementation gap

The scenario validates the DAG as a security/data-lifecycle dependency graph rather than project-management preference. Components require fallback and response ownership; delegated authority requires every revocation/audit/confirmation layer; collision controls require observed usability/accessibility evidence; and an official SDK requires stable protocol/conformance/support ownership outside the current trains. Separating these boundaries prevents a half-enabled or accidentally authoritative public surface.
