# Instance Safety and Suspension Trail

## Record status

Structured from the recovered 2026-07-17–20 `Analyze bot commands and roles` task, the accepted decision index, and repository inspection. This is not a verbatim transcript; `../provenance.md` classifies decision authority.

## Current Fluxer basis

- `fluxer_api/src/api/admin/controllers/ApplicationAdminController.ts` currently supports application lookup, owner listing, guild-member-derived listing, and ownership transfer.
- `fluxer_api/src/api/admin/services/AdminApplicationService.ts` infers applications in a guild from bot membership because no installation record exists.
- There is no current application or installation suspension state, and no application-interaction authority exists to revoke.
- Fluxer does have admin ACL patterns and auditable administrative actions, which provide the control-plane precedent for future targeted suspension.

## Decision trail

### No global operator interaction switch — QAD-139

- **Question:** Should a self-hosted instance expose a permanent master switch that disables every slash command/component while leaving ordinary bots enabled?
- **Recommendation:** initially proposed as an emergency/maintenance option.
- **User answer:** rejected.
- **Accepted outcome:** no product-level global switch. Internal deployment rollout controls may exist, and targeted incident controls remain separate.
- **Why this is sound:** a permanent global product switch is broader than the application/community incidents it would normally address and risks becoming an unaudited availability control. Narrow suspension and private, removable rollout gates preserve incident and deployment response without changing every unaffected application's product behavior.
- **Classification:** preserves the absence of a global application-interaction operator setting.

### Targeted suspension scopes — QAD-140

- **Question:** May instance administrators suspend one installation or one application across the instance?
- **Recommendation and answer:** yes, as immediate reversible trust-and-safety/incident response for malicious or compromised applications.
- **Why this is sound:** community scope contains harm without disrupting unrelated installations, while application scope closes every installation when the credential or developer is compromised. A reversible, audited overlay is faster and less destructive than deleting durable state during an investigation.
- **Classification:** extends the existing admin ACL/control-plane pattern with new installation-aware state.

### Suspension effects — QAD-141

- **Question:** Does suspension merely hide commands, or revoke all targeted authority while preserving evidence/state?
- **Recommendation and answer:** stop event/interaction delivery; reject every bot API action targeting the suspended community; hide commands from ordinary users and show managers the suspension; make components inert; permanently invalidate outstanding response/delegated authority; preserve messages, settings, role, installation, and audit data. Community managers cannot override. Application-wide suspension applies to every installation. Lifting permits only new activity.
- **Why this is sound:** hiding UI alone leaves API, delivery, and previously delegated authority usable, so suspension must be one server-side authorization overlay across every path. Preserving state and evidence supports investigation and safe reconciliation, while permanently invalidating prior authority prevents lifting the overlay from resurrecting stale capabilities.
- **Classification:** new comprehensive enforcement boundary, broader than UI disablement.

### Delivered ephemeral evidence — QAD-142

- **Question:** Erase ephemeral responses on suspension?
- **Recommendation and answer:** retain until normal dismissal/expiry, label suspended, disable controls and application edits/follow-ups, and keep reporting available.
- **Why this is sound:** immediate erasure can destroy user-visible incident evidence and reporting context, but leaving controls live would preserve application authority. Normal bounded retention plus an inert, platform-labeled view protects evidence without extending the ephemeral lifecycle.
- **Classification:** new incident-evidence rule.

### Control plane, enforcement, and reinstatement — QAD-190

- **Question:** Which ACLs/endpoints/states implement suspension, how does it affect Gateway sessions and developer access, and what must pass before reinstatement?
- **Repository-derived answer:** add narrow view/manage ACLs and version-checked application/community suspension operations with mandatory typed/private reason and admin audit. Make a central state check authoritative for every bot/interaction/install path. Terminate shared Gateway sessions only for application-wide suspension; filter/reject one community without harming other installations. Keep credential/transport repair available, and remain fail-closed through a reconciled `REINSTATING` state. Never revive prior authority.
- **Why this did not require another product choice:** it is the minimum safe implementation of accepted QAD-140/141 against Fluxer's current ACL, admin-audit, bot authentication, and shared Gateway-session architecture. Notification audiences and appeals were still observable product policy at this point and were later fixed by QAD-216 through QAD-219 below.
- **Classification:** extend current admin control-plane conventions and add a new centralized authorization overlay. Exact mechanics are in `specs/application-suspension-control-plane.md`.

## Operational safety contracts completed after reconstruction

### Temporary rollout controls — QAD-191

- **Question:** How may operators stage cross-service bot-platform writers without creating the rejected permanent global product switch or allowing a client-side flag to bypass authority?
- **Options considered:** deploy every writer fully enabled; expose a permanent instance product toggle; gate only UI; or use private, typed, deterministic server-side rollout controls with mandatory removal.
- **Repository-derived answer:** use application/community allowlists and deterministic percentages at each authoritative server entry point. Land tolerant readers before producers, preserve data while a flag is reduced, keep safety/reconcilers active, and delete each flag after compatibility, observation, reconciliation, and rollback criteria pass.
- **Why sound / evidence:** `fluxer_gateway/src/gateway/gateway_rollout_config.erl`, its validator/tests, and `fluxer_api/src/api/admin/controllers/InstanceConfigAdminController.ts` demonstrate validated private rollout configuration, deterministic cohorts, and update propagation. QAD-139 rejects a permanent public master switch. UI-only or immortal flags would misplace enforcement/ownership.
- **Tradeoffs, assumptions, and unknowns:** staged rollout reduces blast radius but adds temporary state and cohort complexity. Exact percentages and observation windows are deployment-owned; no flag may weaken authorization, deletion, suspension, or schema invariants.
- **Dependencies / consequences / supersession:** depends on QAD-139 and is consumed by QAD-192/QAD-202. Implementation must assign owner/removal criteria and test every authoritative gate. It supersedes no product decision; it narrows the permitted internal-rollout exception recorded under QAD-139.
- **Classification:** repository-derived implementation/operations contract, not a user-facing product switch.

### Bounded telemetry and tested runbooks — QAD-192

- **Question:** What evidence must exist before a bot-platform rollout cohort expands, and may the repository invent universal production SLOs?
- **Options considered:** rely on logs/manual debugging; hardcode guessed universal thresholds; or require bounded metrics/traces, synthetic probes, dashboards, alerts, and tested recovery runbooks while leaving traffic-sensitive numbers to measured deployments.
- **Repository-derived answer:** require the instruments and runbook/gate categories in `specs/bot-platform-observability-and-runbooks.md`; prohibit content, secrets, and high-cardinality identities in metric labels; deployment owners set and record exact SLO/alert/observation values from topology and traffic evidence.
- **Why sound / evidence:** Fluxer already exposes Prometheus-style API/Gateway/service metrics and structured logs, but the repository has no deployment topology, traffic baseline, or common runbook contract. Guessing numbers would turn an unsupported estimate into a false operational promise; omitting gates would make QAD-191 percentages unauditable.
- **Tradeoffs, assumptions, and unknowns:** instrumentation and drills cost engineering/on-call time but reduce blind expansion and privacy leakage. Production thresholds, owners, and observation durations remain explicit deployment-owned inputs and block the affected gate until supplied.
- **Dependencies / consequences / supersession:** depends on QAD-178, QAD-191, and the domain reconcilers; gates QAD-202 rollout. Implement cardinality/redaction tests and exercise rollback, suspension, reconciliation, privacy, and DR runbooks. Supersedes no decision.
- **Classification:** repository-derived operational requirement with deliberately unresolved deployment-owned values.

### Non-resurrecting disaster recovery — QAD-193

- **Question:** Which bot-platform state may a backup restore, and how is stale authority prevented from becoming live after recovery?
- **Options considered:** restore every persisted/queued object and resume; restore durable sources but immediately enable; or restore canonical durable state under a new authority epoch and fail-closed recovery hold while purging transient authority/ephemerals and reconciling ownership.
- **Repository-derived answer:** back up durable sources and the minimal security journal; never reactivate response tokens, delegated capabilities, pending deliveries/actions, Gateway sessions, or ephemeral payloads. Advance an authority epoch, replay the journal, validate immutable heads/ownership, rebuild derived indexes, and reconcile before canary activation.
- **Why sound / evidence:** Fluxer uses denormalized Cassandra-style tables, object storage, NATS/JetStream, in-memory Gateway sessions, and search indexes, but contains no complete backup/RPO/RTO contract. Queue delivery is not proof of current authority; restoring expired secrets or private ephemerals would violate QAD-188/QAD-190. Exact mechanics are in `specs/bot-platform-disaster-recovery.md`.
- **Tradeoffs, assumptions, and unknowns:** recovery intentionally loses in-flight work and ephemeral responses and may delay availability behind reconciliation; this is safer than replaying stale authority. QAD-221 owns deployment RPO/RTO, retention, drill cadence, geography, and journal-duration values.
- **Dependencies / consequences / supersession:** depends on QAD-188, QAD-190, QAD-194, and QAD-221. Implement epoch checks, recovery hold, journal validation, isolated drills, and non-resurrection tests. Supersedes no accepted decision.
- **Classification:** repository-derived security/recovery contract; deployment performance promises remain unaccepted until evidenced.

### Deployment-owned recovery promises — QAD-221

- **Question:** May the plan publish universal RPO, RTO, backup-retention, restore-drill-frequency, or geographic-replication values when the repository contains no deployment topology or measured restore evidence?
- **Options considered:** hardcode attractive universal targets; omit recovery gates entirely; or require each deployment to record and prove its values through isolated representative restore drills, with fail-closed enablement when evidence is missing/stale.
- **Repository-derived answer:** deployment owners set and exercise those values; material recovery changes require another drill and recurring cadence is recorded. Geographic claims require configured/exercised replication. The suspension/deletion journal must outlive the oldest restorable backup plus maximum restore/reconciliation validation and a safety margin.
- **Why sound / evidence:** repository inspection finds data/worker/index primitives but no complete backup topology, retention schedule, RPO/RTO, or restore-drill contract. A universal number would therefore be an unsupported operational promise; no gate would weaken QAD-193's non-resurrection requirement. `specs/bot-platform-disaster-recovery.md` defines the invariant/drill evidence that deployments must measure.
- **Tradeoffs and unknowns:** deployments retain flexibility to fit topology/cost but bear explicit documentation, drill, journal, and launch-gate work; users receive no unsupported universal recovery guarantee. The actual numbers/geography and evidence freshness remain unresolved deployment-owned values, not product questions.
- **Dependencies and consequences:** depends on QAD-193/QAD-194/QAD-192. Missing evidence keeps recovery/rollout fail closed; observability/runbooks must report achieved recovery point/time and convergence; deletion/suspension cannot be declared non-resurrecting without sufficient journal coverage.
- **Supersession:** replaces any inferred universal DR number in earlier planning with an evidence-gated ownership rule; it does not weaken QAD-193's required mechanics.
- **Classification:** repository-derived ownership decision with intentionally deployment-owned values.

### Aggregate-owned reconciliation — QAD-194

- **Question:** Does a queue/job delivery own lifecycle truth, or must each durable aggregate own state and idempotent recovery independently of delivery?
- **Options considered:** treat worker acknowledgement/dead-letter status as completion; add overlapping cron repair; or keep one domain service/repository owner with deterministic operation/effect IDs while queues, sweeps, and the job ledger only trigger and expose work.
- **Repository-derived answer:** installation, deletion, manifest, settings, message-reactivation, reinstatement, ephemeral cleanup, and privileged-effect aggregates each own their transition truth; workers use versioned leases and verify-or-apply effects, and failures remain explicit rather than being marked complete.
- **Why sound / evidence:** Fluxer already has typed worker lanes, JetStream redelivery, a job ledger, cron, and targeted read-repair, while current application deletion is queue-oriented and monolithic. Delivery can be duplicated or lost and therefore cannot establish completion. `specs/bot-platform-reconciler-ownership.md` records exact owners and cadences.
- **Tradeoffs, assumptions, and unknowns:** durable progress/leases add rows and operational complexity but make retries, crashes, and partial cleanup truthful. Deployment alert thresholds remain external; product reset/delete authority remains controlled by its own decisions.
- **Dependencies / consequences / supersession:** depends on QAD-149 through QAD-162 and supports QAD-193/QAD-200/QAD-202. Implement one transition writer, bounded indexes, explicit terminal failures, and no generic force-complete action. It replaces queue-delivery inference for new bot-platform lifecycles, not the existing queue infrastructure.
- **Classification:** repository-derived architecture recommendation accepted for the plan, not an existing product behavior.

### Layered resource protection — QAD-195

- **Question:** Are route buckets alone sufficient for complex command/interaction work, and should malformed traffic trigger an automatic permanent ban?
- **Options considered:** trust schema validation after full allocation; build a parallel limiter; permanently ban on malformed bursts; or reuse existing buckets plus pre-parse, structural, per-identity concurrency, queue, error-shaping, and circuit bounds while reserving suspension for audited action.
- **Repository-derived answer:** charge every attempt through Fluxer's existing limiter and add the fixed caps in `specs/bot-platform-abuse-and-resource-protection.md`; reject compressed bot-platform JSON initially, bound in-flight work/errors, and use QAD-190 for explicit audited suspension rather than an unaudited automatic ban.
- **Why sound / evidence:** current Fluxer has a global default, route leaky buckets, Gateway frame/connection/session limits, typed validation, and webhook exemptions, while the planned recursive schemas, autocomplete, outbound delivery, and publication create new amplification paths. A second limiter would fragment semantics; rate limits alone do not bound parse memory or concurrent aggregate work.
- **Tradeoffs, assumptions, and unknowns:** conservative caps can throttle legitimate bursts and require evidence-based tuning, but keep memory/queue work and tenant blast radius bounded. Exact throughput is not promised; authorization is never inferred from a limit result.
- **Dependencies / consequences / supersession:** depends on QAD-143 through QAD-148, QAD-166, QAD-172, QAD-184, and QAD-190; informs QAD-192/QAD-202 gates. Add boundary/bypass/load tests and safe typed retry state. Supersedes no decision; it completes their cross-cutting protection layer.
- **Classification:** repository-derived security/operations contract using accepted product limits.

### Suspension recipients and ordinary-user visibility — QAD-216

- **Question:** Who must be informed when staff suspend an application/installation, and should ordinary users be able to distinguish suspension from an outage?
- **Recommendation and answer:** notify the current application owner and expose a durable Integrations alert to owner/Administrator/Manage Guild in affected communities. Do not proactively notify ordinary users, but render the installed bot offline with a platform-owned `Suspended` indicator and show commands/controls unavailable. Community-only suspension applies that view only there; application-wide suspension applies everywhere.
- **Reasoning:** managers and developers need actionable status, while ordinary users need truthful encounter-time state without a disruptive community-wide announcement. A server-owned overlay cannot be forged by the bot and does not leak the state into unaffected communities.
- **Classification:** extends planned application/Integrations surfaces and current member presence rendering.

### Application-owner transactional email — QAD-217

- **Question:** Should suspension/reinstatement email the application owner, or would that introduce an email/privacy behavior Fluxer otherwise avoids?
- **Conditional answer:** yes only if Fluxer already sends comparable transactional emails.
- **Repository result:** Fluxer emails account verification/security events, suspicious-activity disablement, temporary bans/unbans, deletion, report resolution, and harvest completion through one configured account-email service.
- **Accepted outcome:** email only the current application owner's existing account address through that same service; never application-provided addresses or community managers. In-app state remains authoritative if mail is absent/fails, and private enforcement details never enter the template.
- **Why this is sound:** suspension is comparable to existing account/safety events and may require action while the owner is not signed in. Reusing the verified account channel limits address abuse, while making in-product state authoritative and omitting private details keeps mail failure and disclosure outside enforcement truth.
- **Classification:** extends an existing transactional safety/account-state convention rather than creating a bot-controlled email channel.

### Audience-safe suspension reasons — QAD-218

- **Question:** Which suspension explanation may instance staff, the bot owner, community managers, and ordinary users see?
- **Recommendation and answer:** full private reason/evidence remains instance-staff-only. The bot owner receives a separately selected safe category plus scope/time/effects and remediation/contact guidance. Managers receive safe category/scope/time/effects without investigation or developer-remediation detail. Ordinary users receive only the suspended/unavailable state. Reinstatement notifies owner/managers and clears public presentation after reconciliation.
- **Safety boundary:** reviewed safe categories include an unspecified option and are never generated by copying or summarizing the private operator note.
- **Classification:** adds explicit audience separation to the new suspension control plane.

### In-product application-owner review — QAD-219

- **Question:** Must a suspended application owner use an external support channel, or can they request review inside Fluxer?
- **Recommendation and answer:** add a bounded owner-only request tied to the exact suspension version, with one active request, remediation explanation, staff information request/reject/accept states, audit, and rate limits. Acceptance only enters fail-closed `REINSTATING`; it never restores authority directly. Managers cannot appeal for the developer.
- **Why this is sound:** tying the request to one suspension version prevents stale appeals from changing a later enforcement action, and bounded ownership/rate rules prevent queue abuse. Staff acceptance starts reconciliation rather than granting authority, so review cannot bypass the same safety checks required for ordinary reinstatement.
- **Classification:** adds a focused review queue alongside the new suspension control plane; there is no existing application-suspension workflow to preserve.

## Still unresolved in this subject

No unresolved product decision remains in this subject.

## Cross-cutting completeness audit

- **Scope:** supplements QAD-139 through QAD-142, QAD-190 through QAD-195, QAD-216 through QAD-219, and QAD-221.
- **Shared credible alternatives and rejection:** expose one permanent global interaction switch; infer safety from credentials/resources alone; suspend only invocation while leaving other authority live; delete state/evidence on suspension; reinstate before reconciliation; use UI-only rollout flags; operate without bounded telemetry/runbooks; restore queued/transient authority/ephemerals; let queue delivery own completion; rely only on route limits or auto-ban malformed traffic; notify nobody/everyone with one raw reason; require only an external appeal channel; or let managers appeal for the developer. These alternatives create overly broad controls, bypass paths, evidence loss, stale-authority resurrection, false completion, privacy leakage, or confused ownership. Targeted fail-closed overlays, private removable rollouts, aggregate-owned reconciliation, bounded protection, audience-safe notification, and owner-only review address them.
- **Evidence-backed soundness:** current application-admin ACL/audit controllers, shared bot Gateway sessions, validated Gateway rollout config/tests, metrics/logging, JetStream/job/cron infrastructure, rate-limit/validation/outbound helpers, and the absence of installation suspension/backup contracts establish both reusable mechanisms and gaps. The accepted architecture extends those owners rather than claiming present end-to-end safety. Exact paths/evidence are recorded in each linked spec.
- **Tradeoffs:** security gains immediate targeted revocation, private reasons, non-resurrection, and audited abuse handling; operations gain staged cohorts/recovery visibility but must own drills, reconciler backlogs, alerts, and fail-closed holds; compatibility keeps unaffected installations/baseline bots working while scoped controls become unavailable; maintenance adds overlay checks, temporary flags, durable operations, and runbooks; users/managers/developers receive truthful audience-specific state and review, but availability may remain blocked through reconciliation and no response SLA is promised.
- **Assumptions and unknowns:** deployment traffic/topology, SLO thresholds, observation windows, RPO/RTO, backup retention, drill cadence, and geography are explicitly deployment-owned under QAD-192/QAD-221; email may be unavailable; staff review timing is external; notification failure never changes enforcement. Missing recovery evidence must block enablement rather than be guessed.
- **Consequences and dependencies:** QAD-139 bounds rollout versus product controls; QAD-140/141/142 own suspension scope/effects/evidence; QAD-190 owns enforcement/reinstatement; QAD-191/192 own rollout gates; QAD-193/194 own restore/reconciliation truth; QAD-195 owns resource safety; QAD-216/217/218/219 own audience, email, reason, and review behavior. All authoritative bot paths must share the overlay.
- **Supersession:** QAD-190 concretizes QAD-140/141. QAD-216 through QAD-219 close the notification/reason/review choices intentionally left outside QAD-190; they do not weaken enforcement. QAD-221 later owns numerical DR promises under QAD-193. QAD-191's private controls do not supersede QAD-139's rejection of a permanent public switch.
