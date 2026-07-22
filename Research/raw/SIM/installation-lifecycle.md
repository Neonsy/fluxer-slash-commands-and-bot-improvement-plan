# Installation and Managed-Role Simulations

## SIM-I01 — zero-permission first install becomes active

### Scenario and purpose

Application `app-A` is newly authorized into community `guild-G` with requested bot permissions `0`. The scenario proves that activation is a durable relationship transition, not the accidental presence of a member, and that a zero-permission install still receives one owned authority anchor.

### Decision and current-state evidence

- **Controlling QAD:** `../QAD/trails/01-installations-and-managed-roles.md` -> `Durable installation identity` (QAD-003/004/019), `Managed-role cardinality` (QAD-005), `Installation activation and failure` (QAD-017/018), `Durable lifecycle state set` through `Forward installation effect order` (QAD-149–160). Exact deadlines are QAD-154.
- **Exact spec:** `../QAD/specs/bot-platform-reconciler-ownership.md` -> `Installation lifecycle`.
- **Current constraints:** CS-INSTALL and CS-ROLE. In `fluxer_api/src/api/oauth/OAuth2RequestService.ts` the present order is member first and no role when permissions are zero; `GuildRoleService.systemCreateRole` allocates a new ID on every call. There is no lifecycle row/CAS/effect ledger.

### Actors, permissions, and initial state

- Installer `manager-M` is a current community member with `Manage Guild` and has completed OAuth consent.
- `app-A` owns exactly one bot user `bot-A`; the bot is not a member of `guild-G`.
- No installation row exists, no managed role exists, and the application is not suspended.
- Input contains `(application=app-A, community=guild-G, requested_permissions=0, operation_id=op-1)`.

### Expected processing and state changes

1. OAuth validates the application, installer authority, community, scope, rollout eligibility, and suspension state. No resource is written on failure.
2. `ApplicationInstallationService` conditionally claims the `(guild-G, app-A)` relationship as `INSTALLING`, lifecycle version 1, internal generation 1, `op-1`; it preallocates and persists `role-R` and the approved zero permission bitfield.
3. The role effect `guild-G/app-A/generation-1/create-role` creates or verifies exactly `role-R`, owned by this installation generation, even though permissions are zero.
4. The member effect creates or verifies `bot-A` membership. The assignment effect assigns `role-R` and verifies it.
5. The service rereads the canonical installation, owned role, member, assignment, permission value, application, and suspension overlay. A CAS advances `INSTALLING(v1)` to `ACTIVE(v2)` only if all invariants still hold.
6. Only after the CAS may Gateway events, guild-targeted bot APIs, command/settings access, and interactions become eligible. OAuth returns success only now and within the 15-second forward deadline.

### Effects, ownership, and observability

- **Persisted/source of truth:** the installation row and lifecycle/effect records belong solely to `ApplicationInstallationService`; the role and member remain guild resources but carry the installation owner/generation needed for lifecycle enforcement.
- **User-visible:** `manager-M` sees an active installation and a managed role with zero permissions. The role may initially use the application name but identity does not depend on it.
- **Operator-visible:** lifecycle state/version, stable effect IDs, elapsed time, and sanitized results are observable. Audit/Gateway events are deduplicated by effect ID and attribute `manager-M` as initiator without secrets.
- **Authorization boundary:** neither role existence nor member existence grants authority before `ACTIVE`; ordinary role/member APIs cannot delete the managed role, remove its assignment, or kick the bot.

### Failure, idempotency, cleanup, and recovery

- Retrying `op-1` returns/resumes its current result; it cannot allocate another role. A different operation during `INSTALLING` gets `409 Conflict`.
- A crash after a side effect but before its ledger update causes verify-or-apply, not blind creation. Ownership mismatch is a failed invariant, never an overwrite.
- If a live request has not activated by 15 seconds it enters SIM-I02 rollback. If the process dies before making that transition, SIM-I02's 30-second stale-row branch claims rollback; neither path may later activate unexpectedly.

### Conclusion and implementation gap

The trace validates QAD's activation invariant: a mandatory preallocated owned role plus member plus assignment can be retried deterministically, and the final CAS is the single authority boundary. Current OAuth cannot satisfy the scenario because it omits both the durable aggregate and the zero-permission role, so this is a substantive implementation acceptance test, not present behavior.

## SIM-I02 — partial install rolls back, cleanup exhausts, manual recovery converges

### Scenario and purpose

Role `role-R` is created, but member creation either fails during the live request or the process crashes before recording activation or rollback. The first role-delete compensation then fails. This tests request-side failure, stale `INSTALLING` abandonment, partial cleanup visibility, bounded retries, manual recovery, and non-atomic external effects.

### Decision and current-state evidence

- **Controlling QAD:** QAD-017/018 and QAD-149–158, especially `Installation deadlines` (QAD-154), `Cleanup retry schedule` (QAD-155), `Cleanup visibility and recovery authority` (QAD-156), `Manual recovery cycle` (QAD-157), `Retry-safe lifecycle effects` (QAD-158), and `Install rollback effect order` (QAD-161).
- **Current constraints:** CS-INSTALL/CS-ROLE/CS-OPS. `fluxer_api/src/api/oauth/OAuth2RequestService.ts` catches the OAuth failure but has no durable compensating lifecycle; `fluxer_api/src/api/guild/services/GuildRoleService.ts` (`systemCreateRole`) emits immediately and ordinary delete rejects an absent role. The current queue, ledger, side effects, and acknowledgement are separate, and generic dead-letter retry is unavailable. Multi-resource atomicity therefore must not be claimed.

### Actors, permissions, and preconditions

- Same actors and authority as SIM-I01; canonical row is `INSTALLING(v1,generation=1,op-2,role-R)`.
- In the live-failure branch, role creation and its audit/Gateway effect completed but bot membership did not. In the crash branch, any subset of role/member/assignment effects may have completed, but the activation CAS did not.
- Cleanup storage/worker infrastructure may be available even when the request's forward dependency is failing.

### Expected processing and state changes

1. In the live-failure branch, the member failure records its safe class and moves by CAS to `ROLLING_BACK_INSTALL`; no application authority was ever enabled. A concurrent authorized uninstall/cancel request during `INSTALLING` requests this rollback; it does not start a competing `UNINSTALLING` operation or skip cleanup.
2. In the crash branch, the caller receives no success and the row remains `INSTALLING`. At 30 seconds after creation, the reconciler conditionally claims that exact state/version as abandoned and moves it to `ROLLING_BACK_INSTALL`. Even if role, member, and assignment now happen to exist, it never resumes forward work or performs the `ACTIVE` CAS; a stale forward worker loses its next version check.
3. Through the live request's 25-second budget, or immediately after the stale reconciler claim, rollback attempts in order: managed-role detachment, owned bot-member removal, then owned role deletion. An absent effect is already converged; an existing effect is removed only after exact owner/generation verification.
4. Role deletion fails. Independent safe checks still run. Because role absence is unproven, the state cannot become `DORMANT`; it becomes `INSTALL_CLEANUP_FAILED` with exact progress.
5. The first compensating pass counts as attempt 1. Each due retry conditionally re-enters `ROLLING_BACK_INSTALL`, performs the compensating pass, and returns to `INSTALL_CLEANUP_FAILED` if absence is still unproven. Attempts run at 5s, 30s, 2m, 10m, 1h, 6h, 24h, then daily through 25 total, each with +/-20% jitter. The canonical installation row, not queue delivery count, owns attempts/next due time.
6. A one-minute due-state sweep repairs a lost enqueue. A worker claims a versioned lease, rereads state/ownership, and reuses the role-delete effect ID. Duplicate workers become no-ops after CAS/verification.
7. If 25 attempts exhaust, visible `INSTALL_CLEANUP_FAILED` remains and automatic retry stops. A community owner/Administrator/Manage Guild sees sanitized status and may request cleanup retry; an instance administrator needs the dedicated recovery ACL for cross-community detail/action. Application ownership alone grants neither.
8. Manual retry, limited to one new recovery cycle per five minutes, increments `recovery_cycle`, keeps lifetime history, attempts immediately, and starts another bounded 25-attempt schedule. Once absence of the owned role/member/assignment is verified, CAS reaches `DORMANT`.

### Effects, boundaries, and user/operator behavior

- OAuth reports failure and never later reports success. The application cannot receive community data or call guild APIs in any cleanup state.
- A retry can emit a missing audit/Gateway record for an already-committed effect using the same ID, but cannot report the role deleted while it still exists.
- Recovery UI cannot directly edit state, skip an effect, mark complete, change owner, or delete the lifecycle row. Generic job cancellation stops a lease only; it does not change truth.
- Dormant configuration/history remains; partial resources do not grant authority.

### Conclusion and implementation gap

The scenario justifies explicit failed cleanup state and deterministic effect ownership: a distributed sequence cannot be atomic, but it can be honest, bounded, and convergent. Current code lacks rollback, lifecycle CAS, due-state indexes, and a recovery surface. Simulation review caught an earlier install-cleanup state wording mismatch in the reconciler matrix; it has been corrected to QAD-149's `INSTALL_CLEANUP_FAILED`.

## SIM-I03 — uninstall failure followed by same-application reinstall

### Scenario and purpose

An active installation with manager configuration and bot-managed public panels is uninstalled. Member removal succeeds but role deletion initially fails. After convergence, the same application is reinstalled. This tests revocation-first cleanup, dormant retention, identity reuse, generation isolation, and non-reactivation of old controls.

### Decision and current-state evidence

- **Controlling QAD:** QAD-003/004/019 (`(community, application)` public relationship), QAD-020 (dormant configuration), QAD-130 (inert messages), QAD-150/151/158/159/162 (legal transition, CAS, deterministic effects, authority gate, uninstall order), plus `../QAD/specs/component-state-lifecycle-and-storage.md` -> `Copy, forward, deletion, credentials, uninstall, and suspension`.
- **Current constraints:** CS-INSTALL/CS-ROLE/CS-MESSAGE. `fluxer_api/src/api/oauth/ApplicationService.ts` currently removes bot memberships during deletion; roles have no association and may remain. Current messages have no generation-bound component ownership.

### Actors, permissions, and initial state

- `manager-M` is owner/Administrator/Manage Guild and requests uninstall with `op-U1`.
- Installation is `ACTIVE(v7,generation=3)`, owns member `bot-A`, role `role-R3`, command/settings overrides, and panel message `msg-P` bound to generation 3.
- Outstanding response token/capability/component click `cap-old` exists.

### Expected processing and state changes

1. CAS claims `ACTIVE(v7) -> UNINSTALLING(v8,op-U1)`. This immediately blocks guild events/APIs/interactions/settings and makes `cap-old` terminal before any resource deletion.
2. The panel remains visible but its controls render inert. No cron or reconnect may reactivate it.
3. Cleanup attempts managed-role detachment, owned member removal, and owned role deletion, recording each result and continuing safe later steps despite failure.
4. Role deletion fails, so the state becomes `UNINSTALL_FAILED`; it remains unauthorized. Each QAD-155 retry conditionally re-enters `UNINSTALLING`, reuses the same owned effects, and returns to `UNINSTALL_FAILED` if cleanup remains incomplete. A concurrent reinstall gets conflict rather than queueing behind it.
5. Once owned resources are verified absent and authority revoked, the relationship transitions to `DORMANT`. Community command/settings configuration and matching per-user component presentation state remain dormant; application delivery/read access does not.
6. Reinstall reuses the `(guild-G,app-A)` relationship but claims a new internal generation 4 and preallocated role `role-R4`. It never reclaims an unverified role by name. The normal SIM-I01 effects reach `ACTIVE`.
7. Matching stable command/setting keys may reapply current retained manager configuration under current validation/approval. `msg-P` stays inert because it is generation 3. The application must explicitly request reconciliation with message ID, expected version, current schema, and an explicit preserve-state election; a valid request creates a new message version bound to generation 4.
8. `cap-old` and every generation-3 response/confirmation remains terminal even if identifiers or message content still exist.

### Persistence, external effects, cleanup, and recovery

- Relationship identity and dormant configuration persist until authorized reset or permanent application/community deletion. Role/member resources do not persist after successful uninstall.
- Developer-owned external databases are unaffected; Fluxer neither deletes nor promises to restore them.
- Audits show revocation, each cleanup effect, failure/retry, reinstall generation, and explicit message reconciliation without rewriting earlier events.
- Permanent application deletion differs: credentials/authority are revoked first and per-community uninstall children reconcile asynchronously; afterward application-owned configuration is erased under its deletion journal and reinstall is impossible.

### Conclusion and implementation gap

The scenario validates that public relationship reuse and internal generation rotation are compatible: retained manager intent can return without reviving prior authority. Current code can add the same bot later but cannot identify/clean the old role or bind messages/capabilities to a generation, so all safety properties are implementation gaps.

## SIM-I04 — managed-role presentation, bounded installer authority, and recommendation drift

### Scenario and purpose

A role designer and application managers exercise invite-mode and code-defined first installs plus an existing managed role while a developer publishes a broader declaration. This distinguishes Discord-portable invite authority, the code-defined exact-set exception for `Manage Guild`, the durable installed ceiling, the owner/Administrator expansion boundary, and role hierarchy.

### Decision and current-state evidence

- **Controlling QAD:** `Permission and hierarchy authority` (QAD-008–011/038/136); `Membership, deletion, and removal ownership` (QAD-006/007/014); `Permission recommendations and reauthorization` (QAD-032–035); QAD-151 CAS serialization; and QAD-214 human review. Exact source behavior is `../QAD/specs/application-install-permission-source.md`.
- **Current constraints:** CS-ROLE/CS-AUTH. `packages/constants/src/BotPermissionUtils.ts` and its tests reject an `Administrator` request from a `Manage Guild`-only installer and allow a non-administrator to grant only held permissions. `GuildRoleService.resolveRequestedPermissions` and role-management tests likewise reject non-owner permission grants beyond the actor's permissions and enforce ordinary hierarchy. Managed authority/presentation field classes do not exist.

### Actors, permissions, and preconditions

- `designer-D` has only `Manage Roles`; `manager-M` has `Manage Guild` and `View Channel` but lacks `Administrator`, `Manage Messages`, and authority over high role `R-high`; `admin-A` has `Administrator` and sufficient hierarchy for the allowed position/supplemental-role changes; `ordinary-O` has neither management permission.
- New `app-B` has no relationship with the community and has explicitly published code-defined `View Channel + Manage Messages` as required bot permissions at revision 4/hash `h4`. Its consent request contains no caller-added permission, managed-role position, or supplemental role.
- New portable `app-C` has published no declaration and therefore remains in invite mode. One invite requests `View Channel + Manage Messages`; a second requests only `View Channel`.
- Existing `app-A` has an active generation that owns role `role-R` at lifecycle/role version 9 with permissions—and a durable installed authority ceiling—of `View Channel`.
- Developer recommendation changes to `View Channel + Manage Messages`. `manager-M` also proposes moving `role-R` above `R-high` and assigning `R-high` as a supplemental role.

### Expected processing and outcomes

1. `designer-D` may change name/color/icon-or-Unicode-emoji/hoist/mentionable subject to ordinary hierarchy and expected version. It may not edit permissions, position, supplemental role assignment, membership, or deletion. A rejected request explains the stronger application-management gate without exposing private data.
2. `manager-M` may install code-defined `app-B` with exactly revision 4/hash `h4`, including `Manage Messages` even though the manager does not hold it. Consent displays source/revision/set and commit rechecks all three. A concurrent declaration/source change applies nothing and restarts review. The committed set becomes the relationship ceiling.
3. If `manager-M` alters the code-defined request/URL by adding or removing a permission, choosing position, or supplying a supplemental role, then the entire install is rejected or the saved declaration is used unchanged; caller input never overrides it. Preview/audit provide visibility, while canonical saved-set equality enforces the exception.
4. If `manager-M` authorizes invite-mode `app-C` with `View Channel + Manage Messages`, then current held-bit rules reject the request because the manager lacks `Manage Messages`. The second invite requesting only held `View Channel` may succeed and commits that set as `app-C`'s ceiling. `admin-A` may instead approve any normalized known-bit invite set. The editable invite parameter never becomes authenticated developer intent.
5. For existing code-defined `app-A`, `manager-M` can inspect the larger declaration but cannot add `Manage Messages` above its retained `View Channel` ceiling, move `role-R`, or assign a supplemental role. Uninstall/reinstall cannot reset the ceiling. A reinstall at or below the ceiling is allowed under its current source; broader requirements remain pending without a role or authority write.
6. `admin-A` passes the expansion gate. After exact preview, expected-version confirmation, current installation/suspension checks, and applicable target invariants, `admin-A` may raise `app-A`'s ceiling and apply `View Channel + Manage Messages`, an allowed position, and an allowed supplemental-role change. The committed result and human actor are audited; application declaration publication remains a separate event.
7. The developer declaration alone changes no existing role. `Manage Messages` remains unavailable/pending until the owner or `Administrator` approves the exact current diff. A later declaration reduction likewise does not silently remove authority. Invite-mode applications have no application-global recommendation to apply.
8. `ordinary-O` cannot modify either category. No actor can remove the managed assignment, delete the role, or kick the installed bot through ordinary APIs; uninstall owns those effects.
9. Two owner/Administrator writes against role version 9 cannot both commit. The loser refetches version 10 and decides again; Fluxer never field-merges security changes from stale forms. Rejected `manager-M` requests performed no write.
10. Application rename or permission-source change does not overwrite customized presentation or an existing ceiling, because relationship/application identity, source/revision, generation, and owned IDs—not labels—bind the records.

### Effects and failure boundaries

- Guild role storage remains the immediate effective-permission source; installation metadata owns managed lifecycle and the durable ceiling. Invite mode retains the manager's held-bit restriction. Code-defined mode deliberately treats `Manage Guild` as trusted installer authority for one authenticated saved set, while revision/equality and the retained ceiling prevent caller selection or later broadening.
- Audit identifies the human actor, application/relationship, source mode, declaration revision/hash where applicable, requested/committed set or prior/new ceiling, safe permission facts, and effect result. First-install consent, declaration publication, and owner/Administrator expansion are separate events.
- If the audit/Gateway emission fails after the role CAS, reconciliation completes the deterministic emission; it does not roll back a committed permission update or duplicate it.

### Conclusion and implementation gap

The projection validates the two-source rule: `Manage Roles` owns presentation; invite mode preserves portable URL-selected permissions under the current held-bit ceiling; code-defined mode lets `Manage Guild` approve exactly the authenticated saved set; either committed set becomes the relationship ceiling; and owner/`Administrator` owns later expansion, position, and supplemental roles. Current code implements only the invite held-bit rule and has no declaration or durable ceiling, so code-defined first-install authority and all managed lifecycle controls remain Train I2 gaps. QAD-214 reviews the fixed boundary rather than selecting it.

## SIM-I05 — legacy bot remains unbackfilled but obeys suspension and permanent deletion

### Scenario and purpose

`app-L` was authorized before the managed-installation rollout. Its bot is a guild member with ordinary roles but has no installation row or managed generation. The rollout activates, staff suspend the app in that guild, the community removes the bot, and the developer later deletes the application. This tests QAD-012/QAD-013's no-backfill promise against safety suspension, ordinary removal, fresh-install boundaries, deletion, rollout, and restore non-resurrection.

### Decision and current-state evidence

- **Controlling QAD:** QAD-012/QAD-013 (no inference/adoption), QAD-015 (revocation-first application deletion), QAD-140/QAD-141/QAD-190 (scoped suspension), QAD-159 (managed authority gate and legacy compatibility), QAD-193/QAD-197 (non-resurrection and deletion lifecycle).
- **Exact specs:** `../QAD/specs/application-data-lifecycle.md` -> `Legacy bot relationships`, `Permanent application deletion sequence`, `Minimal non-resurrection journal and backup interaction`; `../QAD/specs/application-suspension-control-plane.md` -> `Enforcement boundary`, `Relationship to adjacent lifecycle states`; `../QAD/specs/stacked-branch-pr-and-rollout-strategy.md` -> Train I rollout scope/no-backfill rules.
- **Current constraints:** CS-INSTALL/CS-ROLE/CS-ADMIN. Current OAuth bot placement creates membership and sometimes an ordinary role but no durable application-role association; current application deletion can enumerate/remove bot memberships but cannot identify an OAuth-created role for cleanup.

### Actors, permissions, and initial state

- Legacy `bot-L` is a member of `guild-G` with ordinary roles `R-old` and `R-community`; neither row has application ownership metadata. No installation record exists.
- `manager-M` has the current authority to remove the legacy bot; safety staff has suspension authority. Managed-installation writers are rolling out to new installs only.
- A backup predates the later suspension/removal/deletion.

### Expected processing and state transitions

1. Rollout scans/counts the relationship as explicitly unbackfilled legacy state but creates no installation row, managed role, generation, or inferred owner. `R-old` is never claimed by name/assignment. Existing bot membership/permission behavior continues under the current path.
2. A guild-scoped suspension row keyed by authenticated `app-L` plus `guild-G` blocks its bot REST actions, guild events/interactions, and new authority in G without requiring an installation row. The shared bot credential may continue for other unsuspended guilds. Ordinary UI labels the bot suspended; no managed lifecycle state is fabricated.
3. `manager-M` removes the legacy bot through the current ordinary member-removal path. This does not run managed uninstall, create `DORMANT`, delete `R-old`/`R-community`, or clear the safety history. Role ownership cannot be inferred, so ordinary roles remain under their existing community lifecycle.
4. While suspension remains, a new OAuth attempt is blocked. After staff clears suspension, reauthorization cannot adopt the absent legacy relationship: it enters the new installation path, creates a fresh managed relationship/generation/role after explicit current approval, or fails without later activation.
5. Before reinstallation completes, the application owner permanently deletes `app-L`. Credentials/sessions/interaction authority revoke first. The deletion orchestrator enumerates any remaining legacy memberships through the existing application-derived bot identity and removes them, while managed rows—if a fresh install had reached one—use their own lifecycle child operations.
6. Deletion never guesses/deletes `R-old` or any ordinary role. It removes application-owned command/config/secret state under the deletion journal and preserves separately governed public authorship/audit/report evidence.
7. During restore from the older backup, suspension/deletion journal replay runs before bot authentication or guild delivery. The restored legacy membership cannot authorize, and cleanup removes it again without inventing an installation or role owner.

### Failure, compatibility, and operator boundaries

- A failed legacy member removal is visible/retryable under application-deletion reconciliation, but no generic worker success or missing member is treated as proof that guessed roles were cleaned.
- Installation-only lifecycle dashboards must label the relationship `Legacy/unmanaged`, not `ACTIVE` or failed. Managed rollout completion explicitly allows only these known unbackfilled relationships and tracks their count until natural removal/fresh install.
- Application-wide suspension/deletion works because application authentication and the deterministic bot identity are known; managed-role cleanup cannot work because ownership is not known. The scenario does not blur those evidence boundaries.

### Conclusion and implementation gap

The trace validates prospective migration without granting legacy bots a safety exemption: Fluxer can block or delete a known application/bot relationship while refusing to infer managed resources it cannot prove. Fresh installation is the only transition into the new ownership model. Current code has the membership/deletion pieces but not legacy classification, scoped suspension, rollout accounting, or restore-journal enforcement.

## SIM-I06 — permanent application and community deletion revoke first and clean different owners

### Scenario and purpose

Application `app-A` has active, dormant, incomplete, and legacy relationships across several communities when its owner permanently deletes it. Separately, `guild-Z` is permanently deleted while several applications remain valid elsewhere. Cleanup workers fail midway and an older backup is later restored. This tests the complete QAD-015/QAD-197 ownership matrix, revocation-before-cleanup, resumable child effects, retained evidence, handle release, and non-resurrection without confusing application-global and community-scoped deletion.

### Decision and current-state evidence

- **Controlling QAD:** QAD-015, QAD-019/020, QAD-031, QAD-129/130, QAD-162, QAD-178/188, QAD-193/194/197, QAD-205, QAD-211/213, QAD-221/222/225, and QAD-233–235.
- **Exact specs:** `../QAD/specs/application-data-lifecycle.md` -> `Data matrix`, both permanent-deletion sequences, and `Minimal non-resurrection journal and backup interaction`; `../QAD/specs/bot-platform-reconciler-ownership.md` -> `Permanent deletion orchestration`; `../QAD/specs/bot-platform-disaster-recovery.md` -> journal replay and recovery hold.
- **Current constraints:** CS-INSTALL/CS-ROLE/CS-HARVEST/CS-OPS. Current application deletion revokes the bot token, removes bot memberships, anonymizes the bot user, and deletes the application, while current community deletion owns community resources. No installation/configuration/component/ephemeral deletion graph or independently recoverable non-resurrection journal exists.

### Actors, data, and initial state

- `app-A` is active in `guild-G1`, dormant in `guild-G2`, midway through install cleanup in `guild-G3`, and has one known legacy membership in `guild-G4`. It owns global permission declaration, command/declarative definitions, manifest history, endpoint signing material, credentials, and handle `alpha`.
- Community-scoped data includes managed roles, command policy/aliases/recommendations, declarative values/history, component state, account/community preference references, passive usage, public bot messages, one live recipient ephemeral, and separately submitted safety evidence.
- `guild-Z` contains active/dormant relationships for `app-B` and `app-C`; both applications also serve other communities. A backup predates both deletion operations.

### Application-deletion projection

1. If the owner confirms permanent deletion of `app-A`, then Fluxer durably writes the application tombstone and revokes bot/OAuth credentials, Gateway/HTTP sessions, interaction tokens, capabilities, transport delivery, install/publication writes, and dashboard ownership before any community child cleanup. A worker outage cannot leave the deleted application authorized.
2. If child cleanup starts, then the deletion orchestrator creates/reuses one deterministic operation per active, dormant, incomplete, or legacy relationship. Active/incomplete managed relationships run their owned uninstall/role/config cleanup; dormant rows are deleted rather than retained; legacy members are removed through the known application/bot identity without guessing an ordinary role owner.
3. If `guild-G3` is unavailable while `G1`, `G2`, and `G4` complete, then successful children remain complete and `G3` stays visibly pending/failed under the same deletion operation. The application remains globally revoked; retry resumes the `G3` child rather than recreating or rerunning completed resources.
4. If relationship cleanup is verified, then application-owned permission declarations, command/category/setting schemas, drafts, heads, targets, configuration/provider rows, user preference references, component state, OAuth grants, endpoint keys, and encrypted transport material are removed in their owned order. Reverse indexes are verified/rebuilt; absence from one cache or queue is not proof of deletion.
5. If public messages authored by the bot remain in a surviving community, then current deleted-bot anonymization/remapping preserves their content but strips application/component authority. A live recipient ephemeral remains readable only to its recipient until normal dismissal/expiry with deleted attribution and no app mutation/control authority. Submitted report evidence and existing guild audit snapshots continue only under their separate retention/hold policies.
6. If source/secret absence and every child are verified, then the deletion journal completes. The public application ID is never reused. Handle release is a distinct deterministic child due within 24 hours; it conditionally releases only if the lookup still belongs to deleted `app-A`. An ambiguous/missed release pages operators and quarantines `alpha` rather than transferring it unsafely.

### Community-deletion projection

7. If `guild-Z` deletion begins, then its orchestrator first blocks all application authority scoped to `Z`, including bot actions, interactions, pending capabilities, installs, responses, and configuration delivery. It does not revoke `app-B`/`app-C` credentials or transports for other communities.
8. If scoped cleanup proceeds, then every active/dormant relationship, managed member/role, command/category policy, recommendation, declarative value/history/reference, community preference/usage row, component state, public message, recipient ephemeral, guild audit, search entry, and reverse index owned by `Z` is deleted. Application-global schemas, manifests, permission declarations, credentials, signing keys, and other-community data survive.
9. If an application endpoint is offline or one cleanup effect crashes, then community deletion does not wait for application cooperation and does not reopen scoped authority. Deterministic children reconcile until verified; no notification acknowledgement is treated as deletion proof.

### Restore, evidence, and failure boundaries

10. If the older backup is restored, then deletion-journal replay runs before bot authentication, interaction delivery, configuration reads, or writers. Restored `app-A` credentials/relationships and all restored `guild-Z` scoped rows remain blocked and are purged again. If the journal or its integrity proof cannot be verified, the platform enters the internal recovery hold rather than exposing possibly deleted data or authority.
11. Configuration Forget/expiry markers contain only value-free identity/revision/cutoff metadata and live beyond every backup that can reintroduce the values plus validation/drill margin. Neither deletion journal stores erased content, secrets, interaction payloads, or report evidence.
12. Audit/telemetry distinguishes revocation accepted, child cleanup pending/failed/completed, secret destruction, index verification, and handle release without claiming cross-community atomicity. Operator repair may retry owned effects but cannot undo a permanent tombstone or select a new semantic target by name.

### Conclusion and implementation gap

The two deletion scopes deliberately preserve different things: application deletion destroys application-global sources and every relationship while retaining separately governed public/evidence records; community deletion destroys the community and all scoped application data while leaving applications valid elsewhere. In both cases, authority ends synchronously at the tombstone and cleanup is resumable evidence, not the security gate. Current deletion code supplies only part of the membership/anonymization precedent and cannot yet prove this graph or restore behavior.
