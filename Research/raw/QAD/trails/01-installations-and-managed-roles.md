# Installations and Managed Roles Trail

## Record status

Structured from the recovered 2026-07-17–20 `Analyze bot commands and roles` task, the accepted decision index, later explicit corrections, and repository inspection. This is not a verbatim transcript; `../provenance.md` classifies decision authority.

## Current Fluxer basis

- `fluxer_api/src/api/oauth/ApplicationService.ts` creates one bot account for an application.
- `fluxer_api/src/api/oauth/OAuth2RequestService.ts` and `fluxer_api/src/api/oauth/tests/OAuth2BotGuildAdd.test.ts` implement authorization by directly adding that bot member to a guild; the same bot cannot be added twice.
- There is no persistent community-application installation record.
- The current OAuth path creates an ordinary role only when nonzero bot permissions are requested. That role has no application/installation ownership marker.
- `packages/constants/src/BotPermissionUtils.ts` and its tests allow a non-administrator installer to grant only permission bits they already possess; they explicitly reject an `Administrator` request from a `Manage Guild`-only actor.
- `fluxer_api/src/api/guild/services/GuildRoleService.ts` and the current role editor treat name, color, hoist, mentionable state, permissions, and position as ordinary role concerns; there is no managed-bot-role subtype.
- `GuildRoleService.resolveRequestedPermissions` and role-management tests likewise reject non-owner permission bits the actor lacks, and current role changes retain hierarchy checks.
- Removing and later reauthorizing a bot cannot reliably rediscover or reclaim the prior role because mutable role names are not ownership.

## Decision trail

### Durable installation identity — QAD-003, QAD-004, and QAD-019

- **Question:** Is installation merely bot membership, a new public installation object, or a durable community/application relationship?
- **Options considered:** continue inferring from membership; create a standalone public installation ID on every reinstall; key the relationship by `(community_id, application_id)` and optionally rotate only an internal generation.
- **Recommendation and answer:** add a first-class persistent relationship keyed by community and application, with at most one active installation. Reinstall reuses that public identity; an internal lifecycle generation may exist only if stale-authority isolation needs it.
- **Why this is sound:** membership alone cannot own configuration, roles, cleanup, or partial failure, while a new public ID on every reinstall would orphan manager-owned state. The stable pair gives one authoritative relationship and the internal generation invalidates stale capabilities without changing public identity.
- **Classification:** extends and replaces the current shallow membership-only installation representation while preserving the existing no-duplicate outcome.

### Managed-role cardinality — QAD-005

- **Question:** Should a role exist only when initial requested permissions are nonzero?
- **Alternative:** preserve conditional role creation, which leaves zero-permission installations without a stable authority anchor.
- **Recommendation and answer:** every installation creates exactly one managed role, including a zero-permission installation.
- **Why this is sound:** one role for every installation keeps permission ownership and cleanup uniform and gives managers a visible authority anchor before any later grant. Conditional creation would create two lifecycle variants and make zero-to-nonzero changes allocate identity late.
- **Classification:** intentionally replaces current conditional ordinary-role creation.

### Membership, deletion, and removal ownership — QAD-006, QAD-007, and QAD-014

- **Question:** May ordinary role/member APIs change managed-role membership, delete the role, or kick the installed bot?
- **Tradeoff:** ordinary controls are familiar but let installation resources drift apart.
- **Recommendation and answer:** Fluxer alone assigns the managed role to its bot; ordinary membership changes, role deletion, and bot kick are rejected. Explicit uninstall owns member removal, role removal, and installation cleanup and requires owner, `Administrator`, or `Manage Guild`.
- **Why this is sound:** the relationship is valid only while its owned member, role, and assignment agree. Routing destructive changes through one authorized uninstall path prevents ordinary APIs from leaving an apparently active installation with missing or reassigned security resources.
- **Classification:** replaces ordinary membership/role lifecycle behavior for newly installed applications only.

### Permission and hierarchy authority — QAD-008, QAD-009, QAD-010, QAD-011, QAD-038, and QAD-136

- **Question:** Which community permissions may modify a bot's effective authority or presentation?
- **Options considered:** ordinary `Manage Roles`; `Manage Guild` limited to permissions the actor holds; unrestricted owner/`Administrator`/`Manage Guild`; owner/`Administrator` only for every authority write; require a saved Fluxer declaration for every bot; or preserve the portable invite model while making an exact code-defined declaration a stronger opt-in source.
- **User correction and answer:** applications without a code-published `required_bot_permissions` field remain in invite mode. The standard OAuth request selects the set, so the current held-bit ceiling remains for a `Manage Guild` installer. An application may explicitly opt into code-defined mode through its authenticated application API. Fluxer versions/hashes that set, URL bits no longer select it, and `Manage Guild` may install exactly the declaration even when it includes bits the installer lacks. The exact committed set becomes the relationship's durable authority ceiling in either mode. Afterward, `Manage Guild` cannot raise that ceiling or directly edit permission bits/position/supplemental roles; uninstall/reinstall retains the ceiling. Owner/`Administrator` may approve expansion subject to all independent hierarchy/target checks. `Manage Roles` remains limited to name, color, icon/Unicode emoji, hoist, and mentionable state; membership/deletion remain installation-owned.
- **Migration:** existing applications stay in invite mode, and their links continue to work. No declaration or mode is inferred from old links, existing bot roles, or memberships; legacy bots remain untouched. A later code opt-in affects future consent but not existing grants or ceilings.
- **Why this is sound:** requiring a Fluxer-only declaration would break Discord portability. The invite parameter is editable, however, so it cannot safely justify granting beyond the installer's held permissions. Code-defined mode supplies the authenticated, revision-checked source needed for that exception. The declared set may itself be powerful, so this deliberately treats `Manage Guild` as trusted installation authority only for the exact declaration; persisting either mode's committed ceiling prevents ongoing role-edit power or an uninstall/reinstall bypass.
- **Supersession:** this user correction replaces the earlier unrestricted user-approved answer, the interim owner/`Administrator`-only rule, and the single-source proposal that would have blocked invite-mode applications until an owner saved a Fluxer setting. QAD-214 remains a verification gate, not a request to reopen the resolved split.
- **Classification:** preserves the current Discord-compatible invite and held-bit behavior, adds a code-defined exact-set first-install exception, then strengthens later authority management to an owner/`Administrator` expansion boundary while preserving presentation-only `Manage Roles` and non-authority `Manage Guild` configuration.

### Legacy migration — QAD-012 and QAD-013

- **Question:** Should existing bot members and roles be backfilled or adopted?
- **Risk:** role ownership cannot be safely inferred from mutable names or current assignments, and backfill could silently change authority.
- **Recommendation and answer:** no backfill and no in-place adoption. Existing bots remain legacy until explicitly removed and freshly installed.
- **Why this is sound:** current rows cannot prove which ordinary role, if any, an installer intended to own, so adoption could seize community-managed resources or silently change permissions. Preserving present behavior avoids destructive guesses; a fresh install creates verifiable ownership and generation from the start.
- **Classification:** preserves all existing bot and role state; new behavior is prospective.

### Global application deletion — QAD-015

- **Question:** Must every community cleanup succeed before an application deletion can complete?
- **Options considered:** synchronous all-or-nothing deletion; immediate credential revocation followed by retryable cleanup.
- **Recommendation and answer:** revoke credentials and interaction authority first, then asynchronously run and reconcile uninstall for each installation.
- **Why this is sound:** cleanup spans independent communities and cannot be atomic, but credential revocation is the security boundary Fluxer controls immediately. Durable per-installation cleanup then exposes and retries partial failure instead of keeping a deleted application authorized or claiming false atomicity.
- **Classification:** extends current application deletion with durable cross-community lifecycle ownership and honest partial-failure handling.

### Role naming — QAD-016

- **Question:** Should an application rename overwrite community-customized managed-role presentation?
- **Recommendation and answer:** initialize the role from the application name but never overwrite it on later application renames.
- **Why this is sound:** the managed owner is the immutable application/installation identity, not the mutable role label. Preserving an authorized community customization avoids surprising UI changes while leaving permission and cleanup enforcement unaffected.
- **Classification:** extends current editable-role behavior while adding stable ownership independent of names.

### Installation activation and failure — QAD-017 and QAD-018

- **Question:** When is an installation usable, and how are partial failures represented?
- **Options considered:** enable after the first resource exists; pretend multi-resource work is atomic; explicit non-active states with rollback and reconciliation.
- **Recommendation and answer:** activation requires bot member, managed role, and assignment. On partial failure, attempt rollback; retain an observable failed state and reconciliation when cleanup cannot finish.
- **Why this is sound:** no subset of the three resources proves the intended permission relationship. Gating authority on verified completeness and recording failed compensation prevents partially installed bots from acting and gives operators a truthful recovery target.
- **Classification:** replaces the current direct side-effect sequence with a durable lifecycle state machine.

### Durable lifecycle state set — QAD-149

- **Question:** Which persisted states make installation, rollback, uninstall, and incomplete cleanup observable?
- **Recommendation and answer:** use `DORMANT`, `INSTALLING`, `ACTIVE`, `ROLLING_BACK_INSTALL`, `INSTALL_CLEANUP_FAILED`, `UNINSTALLING`, and `UNINSTALL_FAILED`. Keep suspension orthogonal and represent legacy bots by the absence of an installation record.
- **Current precedent:** the current OAuth path synchronously adds the member, conditionally creates an ordinary role, and assigns it without a durable lifecycle state or rollback record.
- **Why this is sound:** the states distinguish desired inactivity, forward work, usable authority, compensation, and two different cleanup failures, so retry direction is unambiguous. Keeping suspension separate avoids multiplying every lifecycle state, and absence accurately preserves unmanaged legacy membership.
- **Classification:** intentionally replaces the current side-effect-only sequence with explicit recoverable state.

### Legal lifecycle transitions — QAD-150

- **Question:** Which transitions are legal, including failure retry, uninstall during install, reauthorization, and permanent deletion?
- **Recommendation and answer:** install is no-record/`DORMANT` -> `INSTALLING` -> `ACTIVE`; failure/cancellation is `INSTALLING` -> `ROLLING_BACK_INSTALL` -> `DORMANT`, with `INSTALL_CLEANUP_FAILED` retrying only through rollback. Uninstall is `ACTIVE` -> `UNINSTALLING` -> `DORMANT`, with `UNINSTALL_FAILED` retrying only through uninstall. Reauthorization leaves `ACTIVE` unchanged, uninstall during install requests rollback, and no path skips cleanup.
- **Current precedent:** the current OAuth request executes side effects inline and rejects duplicate bot membership, but has no lifecycle transition guards.
- **Why this is sound:** every transition has one semantic direction and every failure resumes through the operation that owns its effects. That prevents a retry from treating partial rollback as uninstall, skipping verification, or creating a second installation during in-flight work.
- **Classification:** adds an explicit guarded state graph around the accepted lifecycle resources.

### Concurrent transition serialization — QAD-151

- **Question:** Are KV leases sufficient to serialize install/uninstall/reconciliation, and what happens to repeated or conflicting requests?
- **Recommendation and answer:** store a monotonic lifecycle version and operation ID; perform every transition with database compare-and-set on expected state/version; use a renewable per-community/application KV lock only as an advisory efficiency layer. Return current status for the same operation and `409 Conflict` for a conflicting operation rather than queueing it.
- **Current precedent:** Fluxer uses token-checked KV locks for multi-write critical sections and its Cassandra/Postgres query abstraction supports conditional writes, but the current OAuth bot-add sequence has no durable operation claim.
- **Why this is sound:** leases can expire or be lost while a worker continues, whereas database CAS rejects its stale transition at the source of truth. Stable operation IDs make retries idempotent and explicit conflicts avoid executing a different lifecycle request under the caller's old assumptions.
- **Classification:** extends current locking with a durable state-machine correctness boundary.

### Installation domain ownership — QAD-152

- **Question:** Should OAuth, guild services, or a dedicated domain own the cross-resource lifecycle?
- **Recommendation and answer:** add `fluxer_api/src/api/application_installation/`; make `ApplicationInstallationService` and its repository the sole lifecycle/orchestration owners. OAuth, uninstall, deletion, suspension, and worker reconciliation delegate to it, while guild services retain ownership of individual member/role operations.
- **Current precedent:** `OAuth2RequestService` currently performs member creation, optional role creation, and role assignment directly after consent.
- **Why this is sound:** one domain owner can enforce the state machine and effect ledger across every entry point, while existing guild services continue enforcing local member/role invariants. Duplicating orchestration in OAuth, deletion, and workers would create divergent transition and retry rules.
- **Classification:** separates OAuth validation from a new durable installation domain without relocating guild resource invariants.

### Synchronous installation result — QAD-153

- **Question:** May OAuth return pending/success and finish installation later?
- **Recommendation and answer:** report success only after `ACTIVE`. Request failure, deadline expiry, or stale abandonment triggers rollback; cleanup alone may continue asynchronously.
- **Current precedent:** current OAuth consent waits for member/role side effects before returning success.
- **Why this is sound:** callers can rely on success meaning the complete authority relationship exists, while failure never schedules surprising later activation. Allowing only cleanup to continue asynchronously preserves truthful user feedback without abandoning leaked resources.
- **Classification:** preserves synchronous user-visible success while extending failure handling.

### Installation deadlines — QAD-154

- **Question:** How long may forward work run, how much request time remains for rollback, and when is `INSTALLING` abandoned?
- **Recommendation and answer:** 15 seconds to reach `ACTIVE`, rollback attempted synchronously through 25 seconds, and stale `INSTALLING` abandoned after 30 seconds.
- **Current precedent:** current installation success is synchronous, but the repository does not provide one applicable 30-second OAuth edge limit or universal 10-second internal-RPC timeout from which these values can be derived. The app proxy's 30-second `reqwest` setting is an outbound client timeout, `/api` ingress is configured separately, and relevant internal request timeouts differ by path.
- **Why this is sound:** callers need a prompt, truthful distinction between complete installation and failure. Fifteen seconds bounds forward work, the interval through 25 seconds permits one synchronous compensation pass, and the 30-second stale threshold gives reconciliation a deterministic point after which a lost request can never produce surprising late activation. These are selected, testable initial product defaults; implementation telemetry may justify a separately reviewed change.
- **Classification:** adds bounded code-defined operation deadlines for synchronous product behavior rather than inheriting unrelated transport settings.

### Cleanup retry schedule — QAD-155

- **Question:** How quickly and how long should incomplete rollback/uninstall cleanup retry?
- **Recommendation and answer:** count the synchronous attempt, then retry at 5s, 30s, 2m, 10m, 1h, 6h, 24h, and daily through 25 total attempts, with plus/minus 20 percent jitter. Stop automatically after 25 while preserving visible failed state and requiring alert/manual retry.
- **Current precedent:** Fluxer's lifecycle worker lane uses a 25-delivery ceiling, job ledger, and DLQ; its generic failure redelivery is fixed at 5 seconds.
- **Why this is sound:** rapid early retries recover transient failures, increasing delays limit sustained load, jitter avoids synchronized storms, and the existing 25-attempt ceiling bounds automation. Keeping failure visible after exhaustion avoids both silent abandonment and an unbounded retry loop.
- **Classification:** preserves the attempt ceiling while adding domain-appropriate scheduled backoff whose authoritative state lives in the installation row.

### Cleanup visibility and recovery authority — QAD-156

- **Question:** Who may inspect terminal installation cleanup failures and trigger recovery, and may recovery bypass lifecycle invariants?
- **Options considered:** expose only the instance-wide jobs interface; let application owners recover their installations; give community managers a domain-specific recovery control; permit operators to edit terminal state directly.
- **Recommendation and answer:** show sanitized status and a cleanup-retry action to the community owner, `Administrator`, and `Manage Guild`. Give instance administrators a dedicated installation-recovery ACL with safe diagnostic detail and cross-community retry authority. Application ownership alone grants neither. Route every retry through `ApplicationInstallationService`, its lock, and database compare-and-set transitions; expose no direct state edit, skip, false-success, or record-deletion action.
- **Current precedent:** `fluxer_api/src/api/admin/controllers/JobsAdminController.ts` separates job inspection and cancellation behind `jobs:view` and `jobs:cancel`; `JobAdminService` exposes ledger detail, while `WorkerService.retryDeadLetterJob` currently returns `false` and has no controller. Community settings have no job-recovery surface.
- **Why this is sound:** community managers own the affected resources, while instance operators need narrowly granted cross-community diagnostics; application ownership does not confer guild recovery authority. Domain retries preserve invariants, and sanitized/error-tiered views avoid exposing internal or cross-tenant data.
- **Classification:** extends the current ACL-separated operational model with community-scoped, domain-owned recovery rather than making the generic job ledger an installation state authority.

### Manual recovery cycle — QAD-157

- **Question:** Does a manual cleanup retry perform one attempt or resume bounded automatic reconciliation, and how is repeated invocation controlled?
- **Options considered:** one immediate attempt requiring continued manual intervention; an unbounded retry loop; a fresh bounded cycle with an invocation cooldown.
- **Recommendation and answer:** increment a persisted recovery-cycle counter, retain lifetime attempt history, attempt immediately, and run the approved 25-attempt schedule. Disable the action while recovery is active, return to terminal failure if exhausted, limit new cycles to once per installation every five minutes, and treat repeated requests for the active operation as idempotent.
- **Current precedent:** Fluxer's worker jobs have explicit maximum delivery attempts, and the current dead-letter retry hook is unimplemented. Existing mutation routes use code-defined rate limits rather than allowing unconstrained retries.
- **Why this is sound:** a fresh bounded cycle gives an authorized operator useful recovery without erasing evidence or creating an infinite loop. The persisted counter, cooldown, and active-operation idempotency make repeated clicks and concurrent operators observable and abuse-resistant.
- **Classification:** extends the bounded worker-attempt model with domain-specific manual recovery and abuse resistance.

### Retry-safe lifecycle effects — QAD-158

- **Question:** Can reconciliation safely call the current guild create/delete methods again, or must lifecycle effects carry stable identities and converge on observed state?
- **Options considered:** blind replay of ordinary APIs; best-effort read-before-write; durable installation-specific effects with stable resource and emission identities.
- **Recommendation and answer:** derive each effect identity from community, application, lifecycle generation, and effect type; allocate and persist the managed-role ID before creation; make repeated create/assign and already-complete cleanup converge; reject ownership mismatches; and deduplicate audit/Gateway emissions using the same effect identity. Preserve durable effect progress and results.
- **Current precedent:** `fluxer_api/src/api/guild/services/member/GuildMemberOperationsService.ts` (`addUserToGuild`) returns an existing member and `fluxer_api/src/api/guild/services/member/GuildMemberRoleService.ts` (`systemAddMemberRole`) returns when already assigned. In contrast, `fluxer_api/src/api/guild/services/GuildRoleService.ts` (`systemCreateRole`) generates a new snowflake on every call, ordinary role deletion rejects an absent role, and resource writes are followed directly by Gateway and audit calls without a lifecycle effect record.
- **Why this is sound:** retries after crashes must distinguish “already completed by this operation” from “conflicting resource owned elsewhere.” Preallocated IDs and durable effects make resource writes and duplicate emissions converge without guessing from mutable names or allocating replacements.
- **Classification:** extends existing local idempotency where sound and replaces non-convergent lifecycle calls with installation-owned effects.

### Installation authority gate — QAD-159

- **Question:** At which lifecycle states may a bot receive community data or exercise community-scoped authority, and when is that authority revoked?
- **Options considered:** infer authority solely from partially created member/role resources; enable individual features as their resources appear; make successful `ACTIVE` transition the sole gate and revoke before cleanup.
- **Recommendation and answer:** only `ACTIVE` and not suspended enables commands, interactions, settings access, Gateway events, and guild-targeted bot APIs. `INSTALLING` is internal-only. Leaving `ACTIVE` revokes scoped authority, interaction tokens, and delegated capabilities before cleanup. All dormant and failure states remain blocked. Bot credentials continue working for other active installations, and legacy memberships retain current behavior.
- **Current precedent:** current Fluxer determines bot authority from guild membership and permissions and has no installation record or lifecycle middleware; one bot token is application-wide and can target multiple guilds.
- **Why this is sound:** resource presence can be partial or stale, but the successful guarded transition proves all installation invariants. Checking both lifecycle and suspension on every scoped path prevents partial work from authorizing and limits revocation to the affected community.
- **Classification:** adds a per-installation security gate for new managed installations while preserving the existing application-wide token and explicitly preserving legacy behavior.

### Forward installation effect order — QAD-160

- **Question:** In what order should an installation claim state, create resources, validate them, and activate authority?
- **Options considered:** preserve member-first creation; create member and role concurrently; claim durable state, create the managed role first, then member and assignment, verify, and activate.
- **Recommendation and answer:** claim `INSTALLING` and persist generation, operation ID, managed-role ID, and approved permissions; create/verify the role; add/verify the bot member; assign/verify the role; re-read every invariant; then compare-and-set to `ACTIVE`. Any prior failure enters rollback.
- **Current precedent:** `OAuth2RequestService` currently adds the bot member first, creates an ordinary role only for nonzero requested permissions, and then assigns it.
- **Why this is sound:** claiming identity before side effects makes every retry address the same resources, and creating the mandatory role first fails early on role capacity before adding a visible bot. Final reread plus CAS ensures activation reflects observed resources, not merely successful calls.
- **Classification:** intentionally changes resource order and makes role creation mandatory so capacity failure precedes membership and activation always has its authority anchor.

### Install rollback effect order — QAD-161

- **Question:** Should rollback stop at its first failed inverse effect, and in what order should it reduce partial authority?
- **Options considered:** strict reverse sequence that aborts on error; delete only the member; attempt every independently safe cleanup effect and verify final state.
- **Recommendation and answer:** in `ROLLING_BACK_INSTALL`, attempt managed-role detachment, owned bot-member removal, and owned managed-role deletion in that order, recording errors without preventing later safe effects. Verify absence and settled effects before `DORMANT`; otherwise retry or enter `INSTALL_CLEANUP_FAILED`. Preserve dormant configuration and history.
- **Current precedent:** the current OAuth bot-add sequence has no rollback. Ordinary member leave and role deletion are separate operations and are not safe as blind retry primitives when their target is already absent.
- **Why this is sound:** detachment and member removal reduce usable authority before deleting the role, and independent safe effects should still run when one cleanup step fails. Ownership checks and final verification prevent compensation from deleting unrelated resources or declaring success on a partial cleanup.
- **Classification:** adds a state-convergent compensating pass that prioritizes reducing authority and reports incomplete cleanup honestly.

### Uninstall effect order — QAD-162

- **Question:** In what order does an active installation lose authority and resources, and may one cleanup failure prevent later safe effects?
- **Options considered:** remove resources before changing state; revoke only after all cleanup succeeds; transition and revoke first, then attempt and verify every safe cleanup effect.
- **Recommendation and answer:** conditionally enter `UNINSTALLING`, immediately block all installation-scoped authority and revoke outstanding response/delegated tokens, then attempt managed-role detachment, owned member removal, and owned role deletion. Verify absence and revocation before `DORMANT`; otherwise retry or enter `UNINSTALL_FAILED`. Preserve dormant configuration.
- **Current precedent:** current application deletion removes bot memberships through ordinary guild leave behavior, but no installation state gates authority and no managed-role ownership allows complete paired cleanup.
- **Why this is sound:** revocation at the state transition closes the security boundary even if physical cleanup is slow or partly fails. Continuing independently safe owned effects and verifying the terminal state makes uninstall convergent without pretending cross-resource atomicity.
- **Classification:** replaces resource-presence inference with revocation-first uninstall and recoverable final-state verification.

### Reinstall configuration — QAD-020

- **Question:** Should uninstall erase Fluxer-owned community configuration or preserve it for reinstall?
- **Options considered:** delete automatically; preserve indefinitely; preserve with an explicit manager reset/delete control.
- **Recommendation and answer:** preserve configuration dormantly and reapply it to the same application identity after reinstall; provide explicit reset.
- **Why this is sound:** the community, not the currently running bot member, owns its configuration. Dormancy preserves deliberate manager work across a reversible uninstall, while explicit reset retains clear deletion authority and identity binding prevents another application from inheriting it.
- **Classification:** new persistence behavior; no equivalent installation configuration currently exists.

### Uninstall retention versus permanent deletion — QAD-197

- **Question:** Which installation/application data survives ordinary uninstall, and which owner-ending operations erase it permanently?
- **Options considered:** erase all Fluxer-owned state on uninstall; retain all state even after application/community deletion; or preserve community-owned configuration dormantly on uninstall while permanent owner deletion revokes first and removes the owned data under a resumable deletion journal.
- **Accepted answer:** uninstall removes active resources/authority but retains the relationship, configuration, and approved presentation/proposal state for explicit reinstall; permanent application deletion removes every global/scoped source, preference reference, secret, and component authority while preserving only separately governed public authorship/audit/report evidence and a minimal non-resurrection journal; permanent community deletion removes all community-scoped data.
- **Why sound / evidence:** current application deletion anonymizes/remaps the bot while retaining authored messages, and current community deletion removes community resources; QAD-015/QAD-019/QAD-020/QAD-031/QAD-129/QAD-130 already separate revocation, dormant reinstall data, public messages, and owner deletion. Treating uninstall as erasure would contradict those accepted owners; retaining configuration after its application/community owner is permanently gone creates orphaned state. Exact data/sequence is in `specs/application-data-lifecycle.md`.
- **Tradeoffs and unknowns:** dormant retention improves reinstall continuity but creates long-lived manager-owned data and cleanup/index obligations; permanent deletion improves privacy/non-orphaning but needs resumable verification and cannot recover erased values. Application-owned external databases and deployment/legal journal/audit/report periods remain outside this ordinary configuration rule.
- **Dependencies and consequences:** depends on QAD-015/QAD-019 through QAD-032, QAD-129/QAD-130, QAD-162, QAD-178/QAD-188/QAD-193, and QAD-221. Install review must not convert retained permission proposals into authority; deletion/recovery must reconcile every child and prevent backup resurrection.
- **Supersession:** synthesizes and completes the earlier per-resource lifecycle decisions; it does not supersede QAD-020 dormant retention, QAD-130 public-message preservation, or separately governed audit/report evidence.
- **Classification:** user-authorized product/data-lifecycle derivation with implementation detail derived from current deletion ownership; it is accepted architecture, not a direct product-preference answer. QAD-214 reviews the resulting plan rather than repairing missing attribution.

### Code-defined permission changes and reauthorization — QAD-032, QAD-033, QAD-034, and QAD-035

- **Question:** Do a code-defined declaration change or a new invite-mode reauthorization request automatically mutate existing community authority?
- **Options considered:** always synchronize the role; auto-add only; never mutate without manager action.
- **Recommendation and answer:** never silently add or remove permissions. `Manage Guild` may reinstall within the retained installed ceiling, but a code declaration or invite request above it remains unavailable pending owner/`Administrator` approval. Code-defined reductions appear as a diff. `Manage Guild` may inspect the exact declaration but cannot apply a later managed-role mutation; the owner or `Administrator` may apply it after reviewing additions and removals. Invite mode has no application-global recommendation to apply.
- **Why this is sound:** application requirements and invite requests describe desired capability but do not own existing community grants. Explicit review prevents silent escalation and surprising loss of existing workflows, while exact diffs let managers intentionally converge when a code-defined declaration exists.
- **QAD-038 dependency:** exceeding the installer's personally held bits for the exact current code-defined first-install grant is the only `Manage Guild` authority-write exception. Later review does not raise the retained ceiling; owner/`Administrator` and applicable hierarchy/target checks remain required for expansion.
- **Classification:** intentionally strengthens the current one-time OAuth grant path with ongoing community control and no silent authority drift.

## Still unresolved in this subject

No unresolved product decision remains in this subject. Deployment values and QAD-214 human review remain external gates.

## Cross-cutting completeness audit

- **Scope:** supplements QAD-003 through QAD-020, QAD-032 through QAD-035, QAD-038, QAD-136, QAD-149 through QAD-162, and QAD-197. Grouped entries above remain the authority for their individual answers.
- **Shared credible alternatives and rejection:** continue inferring an installation from bot membership; omit the managed role for zero permissions; permit ordinary member/role mutation; infer ownership from role names; backfill legacy bots; auto-synchronize developer permission changes; report success before resource verification; treat cleanup as atomic or queue-owned; allow manual state edits; forbid `Manage Guild` from installing any nonzero bot; require every portable bot to publish Fluxer-only configuration; trust edited invite bits for beyond-held authority; or give `Manage Guild` continuing role-edit power. Those designs respectively lack a durable owner, create lifecycle variants, bypass authority, corrupt ambiguous legacy state, silently expand/reduce community grants, make partial failure unobservable, impair portability, or create open-ended authority amplification. The accepted model instead uses explicit ownership, invite-mode held-bit enforcement, a code-defined exact-set exception, a durable ceiling, owner/`Administrator` expansion, review, states, compare-and-set, locks, deterministic effects, and verified cleanup.
- **Evidence-backed soundness:** `OAuthAuthorizeRequest`/`OAuthConsentRequest` accept an optional permission string, `OAuth2RequestService.authorizeConsent` parses and normalizes that request, `ApplicationRow` has no permission declaration, and `OAuthBuilderSection` constructs the standard URL value. Together with the OAuth add-bot tests, `ApplicationService`, member/role paths, and current admin job ACL, this establishes today's portable URL source, held-bit installer ceiling, shallow synchronous flow, one-bot cardinality, and missing rollback/installation record. That evidence supports preserving invite mode and adding a separately authenticated declaration; it does not itself prove the product-selected beyond-held exception.
- **Tradeoffs:** security gains one authority anchor, no silent post-install expansion, and revocation-first cleanup, while accepting that trusted `Manage Guild` installers may grant a powerful code-declared initial set; invite mode retains the narrower held-bit ceiling. Operations gain observable recovery but accept more durable states, locks, indexes, and alerts; compatibility preserves existing invite links, legacy memberships, and synchronous OAuth success but requires fresh install for adoption; maintenance gains one domain owner at the cost of a state machine/reconciler; users receive truthful progress/recovery and retained configuration but may need explicit reinstall/review and cannot kick installed bots through ordinary controls.
- **Assumptions and unknowns:** no safe legacy ownership mapping is assumed; database CAS/lock behavior and durable ceiling ownership must be validated on both backends; deployment latency/alert targets remain external; application-owned external data is outside Fluxer. Communities treat `Manage Guild` as trusted to approve an application's exact authenticated code declaration, not arbitrary invite bits beyond the installer. Any future legacy adoption, multi-bot cardinality, invite-mode elevation beyond held bits, or broader post-install manager authority requires a new decision.
- **Consequences and dependencies:** QAD-003/004/005 establish ownership/cardinality; QAD-038 owns invite/code permission-source selection, the code-defined first-install exception, and the retained ceiling while QAD-008/010/011 own later permission/position/supplemental-role mutations; QAD-149 through QAD-162 implement QAD-017/018's activation/rollback promise; QAD-019/020 and QAD-197 own reinstall/data lifecycle; command, interaction, settings, suspension, audit, and recovery paths must all gate on `ACTIVE` and the current generation.
- **Supersession:** QAD-149 through QAD-162 resolve the implementation details left open by QAD-018 rather than overturning rollback. QAD-136 clarifies QAD-009's allowed presentation edits. QAD-197 later unifies retained-data deletion semantics. No accepted legacy backfill/adoption decision is superseded.
