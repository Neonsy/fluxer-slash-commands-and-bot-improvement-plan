# Accepted Decisions

## Process

### QAD-001: Research notes are local

The repository-local `Research` directory is ignored through the machine-level Git excludes file. It is not part of Fluxer's tracked source or public documentation.

**Status:** superseded by QAD-226. This records the original local-analysis boundary; it is not the current publication rule.

**Rationale:** the original local-only boundary kept uncertain design work out of tracked product source and public history. QAD-226 superseded only the publication choice after the user explicitly requested a shareable isolated branch; its parentless Research-only root preserves the original separation goal.

### QAD-002: Product implementation has not started

The current work is analysis and design. No Fluxer product-code changes or product-implementation branches or commits have been created for the bot-platform work. QAD-226's independent research-only branch is publication of this planning artifact, not product implementation.

**Rationale:** structured notes made the reasoning reviewable while the ignore rule and no-implementation boundary protected `main` and product behavior during an uncertain design phase. QAD-226 changes only publication, not that safety boundary.

### QAD-002A: Discord is a comparison point, not the specification

Discord may be consulted occasionally as a familiar mental model and a source of tradeoffs to examine. Its behavior is not copied by default and is not authoritative for Fluxer's product or architecture decisions.

**Rationale:** Fluxer's existing REST/Gateway version posture already serves Discord-shaped clients, so preserving familiar wire behavior reduces migration risk; keeping Fluxer decisions authoritative avoids importing external limitations without product justification.

### QAD-002B: Discord API compatibility is a migration baseline, not a design ceiling

Fluxer preserves Discord-compatible public API behavior where doing so does not weaken a better Fluxer feature or decision. Product quality and deliberate Fluxer architecture take precedence over compatibility. Prefer additive extensions, adapters, or explicit versioning to keep migration easy, but accept intentional incompatibility when necessary. Every incompatibility must be identified, justified, documented, and included in migration guidance rather than appearing accidentally.

**Rationale:** Fluxer's existing REST/Gateway version posture already serves Discord-shaped clients, so preserving familiar wire behavior reduces migration risk; keeping Fluxer decisions authoritative avoids importing external limitations without product justification.

### QAD-226: Research is published on an independent research-only branch

The current explicit user instruction supersedes QAD-001's local-only rule. Publish the complete `Research/` tree on a branch named exactly `implementation-plan`, rooted at a parentless research-only commit, and push that branch to `origin`. The branch tree may additionally contain one root `.gitignore` whose exact purpose is to ignore every root entry except itself and `Research/`, preventing files from another worktree/branch from becoming part of this branch. No other root content is allowed. Later user-requested review corrections may add research-only descendants on that same independent history; the branch tip therefore need not itself be parentless. Every commit/tree on the branch contains no product or unrelated repository files; `main`, every pre-existing branch, and their tracked worktrees/indexes remain unchanged and contain no tracked `Research/` files. The publication may remove only the exact case-insensitive global-ignore entry for `Research/` if necessary, or force-add the tree on the isolated branch; every unrelated ignore rule remains untouched. This is an explicitly authorized research/VCS operation, not authorization for product-code implementation, pull-request creation, automated public discussion, or changes to any existing history.

**Rationale:** a parentless Research-only root makes the artifact shareable and its history/tree separation verifiable without attaching it to `main`; the narrowly scoped root ignore file prevents checkout/worktree residue from entering the branch while preserving exactly the intended research artifact. Later review commits preserve separation as long as they contain only `Research/` and that safety file. A local-only artifact would not meet the explicit publication outcome, and using an existing branch would violate the isolation requirement. Independent history does not make merging impossible, so verification—not an absolute structural claim—proves that `main` remains untouched.

## Product and architecture

### QAD-003: Community installations are first-class entities

Installing an application into a community creates a persistent relationship record keyed by community ID and application ID. It is not another actor or user: the bot member remains the actor. The record owns only Fluxer lifecycle metadata, the managed-role association, and future community-scoped application configuration.

**Rationale:** membership alone cannot own configuration, roles, cleanup, or partial failure, while a new public ID on every reinstall would orphan manager-owned state. The stable pair gives one authoritative relationship and the internal generation invalidates stale capabilities without changing public identity.

### QAD-004: One active installation per application and community

An application may have at most one active installation in a community. Reauthorization updates that installation rather than creating a duplicate installation, role owner, or command-configuration scope.

This preserves the current shallow behavior: because one application maps to one bot account, OAuth already rejects adding that bot member to the same community twice.

**Rationale:** membership alone cannot own configuration, roles, cleanup, or partial failure, while a new public ID on every reinstall would orphan manager-owned state. The stable pair gives one authoritative relationship and the internal generation invalidates stale capabilities without changing public identity.

### QAD-005: Every community installation has one managed role

Every community installation creates exactly one managed role, including installations that initially request no permissions. The role is the stable permission and ownership anchor for that installation.

**Rationale:** one role for every installation keeps permission ownership and cleanup uniform and gives managers a visible authority anchor before any later grant. Conditional creation would create two lifecycle variants and make zero-to-nonzero changes allocate identity late.

### QAD-006: Managed-role membership is installation-controlled

Only the bot belonging to an installation may hold that installation's managed role. Fluxer owns assignment and removal as part of the installation lifecycle; ordinary member-role APIs must reject manual assignment to another member and manual removal from the bot.

**Rationale:** the relationship is valid only while its owned member, role, and assignment agree. Routing destructive changes through one authorized uninstall path prevents ordinary APIs from leaving an apparently active installation with missing or reassigned security resources.

### QAD-007: Managed-role deletion belongs to uninstall

An installation's managed role cannot be deleted through ordinary role controls. It is removed only through the application uninstall lifecycle, preventing an active installation from losing its required permission anchor.

**Rationale:** the relationship is valid only while its owned member, role, and assignment agree. Routing destructive changes through one authorized uninstall path prevents ordinary APIs from leaving an apparently active installation with missing or reassigned security resources.

### QAD-008: Managed-role permissions require community-level authority

Only the community owner and members with `Administrator` may edit an installation's managed-role permissions. `Manage Guild` and `Manage Roles` are insufficient because changing the managed role changes the bot's effective authority. The application and bot cannot change or elevate their own managed-role permissions. The role-management UI must explain this stricter requirement when access is denied or controls are disabled.

In the current permission model, `Administrator` expands to all permissions and bypasses channel permission overwrites, although it does not universally bypass role-hierarchy rules.

**Rationale:** changing permission bits, position, or supplemental roles changes the bot principal's effective reach. Letting a `Manage Guild` actor perform that change can let the manager exercise authority indirectly through the bot; limiting grants to bits the manager holds still makes `Manage Guild` an authority-write permission and does not cover hierarchy composition cleanly. Current `canAuthorizeBotInvite`, `GuildRoleService.resolveRequestedPermissions`, and their tests already reject key non-owner/non-administrator escalation cases. Preview, audit, and final bot checks expose the change but do not prevent it after elevation.

### QAD-009: Manage Roles permits non-permission edits

Members with `Manage Roles` may edit non-permission properties of a managed bot role. Permission changes still require the community owner or `Administrator`. Installation-controlled ownership, membership, and deletion remain protected regardless of `Manage Roles`.

**Rationale:** name, color, icon, hoist, and mentionability do not change the bot's permissions, hierarchy reach, managed membership, or lifecycle ownership, so existing `Manage Roles` remains useful for presentation. Permission changes remain behind owner/`Administrator` because they can amplify the manager's effective authority through the bot.

### QAD-010: Managed-role reordering requires community-level authority

Reordering a managed bot role requires the community owner or `Administrator`; `Manage Guild` and `Manage Roles` are insufficient. Role position can expand which members and roles the bot may act upon even when its permission bits do not change, and applicable hierarchy and target invariants still apply.

**Rationale:** changing permission bits, position, or supplemental roles changes the bot principal's effective reach. Letting a `Manage Guild` actor perform that change can let the manager exercise authority indirectly through the bot; limiting grants to bits the manager holds still makes `Manage Guild` an authority-write permission and does not cover hierarchy composition cleanly. Current `canAuthorizeBotInvite`, `GuildRoleService.resolveRequestedPermissions`, and their tests already reject key non-owner/non-administrator escalation cases. Preview, audit, and final bot checks expose the change but do not prevent it after elevation.

### QAD-011: Bots may have supplemental ordinary roles under a stronger gate

An installed bot may receive ordinary roles in addition to its managed role. Assigning or removing any ordinary role from an installed bot requires the community owner or `Administrator`; `Manage Guild` and `Manage Roles` are insufficient because supplemental roles can change the bot's effective authority and bypass protections on the managed role. Applicable hierarchy and target invariants still apply.

**Rationale:** changing permission bits, position, or supplemental roles changes the bot principal's effective reach. Letting a `Manage Guild` actor perform that change can let the manager exercise authority indirectly through the bot; limiting grants to bits the manager holds still makes `Manage Guild` an authority-write permission and does not cover hierarchy composition cleanly. Current `canAuthorizeBotInvite`, `GuildRoleService.resolveRequestedPermissions`, and their tests already reject key non-owner/non-administrator escalation cases. Preview, audit, and final bot checks expose the change but do not prevent it after elevation.

### QAD-012: Do not backfill existing bot memberships

Existing bot memberships and roles are not automatically converted into installation records or managed roles. Migration must not infer role ownership from mutable names or otherwise alter existing permissions, roles, or membership state.

**Rationale:** role ownership cannot be safely inferred from mutable names or current assignments, and backfill could silently change authority.

### QAD-013: Legacy bots adopt the model only through fresh installation

An existing bot remains entirely on the legacy behavior until it is removed and freshly installed. There is no in-place upgrade or adoption flow for creating an installation record or managed role around an existing bot membership.

**Rationale:** role ownership cannot be safely inferred from mutable names or current assignments, and backfill could silently change authority.

### QAD-014: Installed bots are removed only through uninstall

Ordinary member-kick controls must reject installed bots. Removal goes through an explicit application uninstall action requiring the community owner, `Administrator`, or `Manage Guild`. Uninstall owns removal of the bot member, managed role, and installation-scoped configuration so these resources cannot drift apart. The UI must explain why ordinary removal is unavailable.

The current baseline permits bot addition with `Administrator` or `Manage Guild` and limits a non-administrator to requested bits they personally possess. QAD-038 preserves that rule for portable invite-mode applications. An application that explicitly opts into code-defined permissions instead lets `Manage Guild` complete a first install with exactly the authenticated declaration, including bits the installer lacks, but not add optional permissions, move the managed role, assign supplemental roles, or broaden the committed ceiling later. Uninstall remains available because it removes rather than expands authority.

**Rationale:** the relationship is valid only while its owned member, role, and assignment agree. Routing destructive changes through one authorized uninstall path prevents ordinary APIs from leaving an apparently active installation with missing or reassigned security resources.

### QAD-015: Global application deletion revokes first and cleans up asynchronously

Deleting an application globally immediately disables its credentials and interaction authority. Fluxer then runs the normal uninstall lifecycle for every persisted community installation asynchronously, retrying and reconciling partial failures instead of requiring every community cleanup to succeed synchronously before deletion can proceed.

**Rationale:** cleanup spans independent communities and cannot be atomic, but credential revocation is the security boundary Fluxer controls immediately. Durable per-installation cleanup then exposes and retries partial failure instead of keeping a deleted application authorized or claiming false atomicity.

### QAD-016: Application renames do not overwrite managed-role names

A managed role initially uses the application's current name. Later application renames do not rename existing managed roles because communities may customize their non-permission properties through members with `Manage Roles`.

**Rationale:** the managed owner is the immutable application/installation identity, not the mutable role label. Preserving an authorized community customization avoids surprising UI changes while leaving permission and cleanup enforcement unaffected.

### QAD-017: Installation activates only after all required resources exist

An installation becomes active only after the bot member exists, its managed role exists, and that role is assigned to the bot. Commands and all installation-scoped behavior remain unavailable until all three conditions succeed.

**Rationale:** no subset of the three resources proves the intended permission relationship. Gating authority on verified completeness and recording failed compensation prevents partially installed bots from acting and gives operators a truthful recovery target.

### QAD-018: Partial installation failures are rolled back and reconciled

If installation fails after creating some resources, Fluxer attempts immediate rollback. If cleanup cannot complete, the installation remains non-active in an observable failed state and reconciliation retries cleanup. The exact state machine, retry ownership, and timing remain implementation decisions.

**Rationale:** no subset of the three resources proves the intended permission relationship. Gating authority on verified completeness and recording failed compensation prevents partially installed bots from acting and gives operators a truthful recovery target.

### QAD-019: Reinstallation reuses the community-application identity

There is no standalone installation ID. Reinstalling uses the same community ID plus application ID identity and begins a new lifecycle for that relationship. Uninstall explicitly revokes outstanding Fluxer-issued authority. If future component semantics require distinguishing lifecycles, an internal generation may rotate without creating a new public installation identity. Data persisted by the application developer remains the bot's responsibility and is unaffected.

**Rationale:** membership alone cannot own configuration, roles, cleanup, or partial failure, while a new public ID on every reinstall would orphan manager-owned state. The stable pair gives one authoritative relationship and the internal generation invalidates stale capabilities without changing public identity.

### QAD-020: Community configuration survives uninstall

Uninstall revokes authority and removes active installation resources, but preserves Fluxer-owned community configuration such as command aliases and restrictions in a dormant state. Reinstalling the same application reapplies that configuration. The settings UI provides an explicit reset action so authorized community members can choose to return to application defaults.

**Rationale:** the community, not the currently running bot member, owns its configuration. Dormancy preserves deliberate manager work across a reversible uninstall, while explicit reset retains clear deletion authority and identity binding prevents another application from inheriting it.

### QAD-021: Dormant command settings follow stable command identity

After reinstall, Fluxer reapplies saved settings only to command definitions with the same stable command ID. Settings for commands that are currently absent remain dormant rather than being deleted or applied to another command. If the same stable command ID returns, its settings become active again. Reusing only the same display name with a new command ID does not inherit the dormant settings.

**Rationale:** name or order reuse can attach old permissions and aliases to a different command.

### QAD-022: Developers may disable commands without deleting them

An application developer may globally disable a command while retaining its stable definition. The command becomes unavailable for invocation everywhere, community settings remain dormant, and re-enabling the same stable command ID restores those settings.

**Rationale:** the developer owns whether code is offered, while the community owns whether it is allowed locally; neither disable action needs to destroy the other's configuration. This keeps rollback reversible without letting a community invoke code the developer has withdrawn.

### QAD-023: Communities may disable commands without resetting them

The community owner and members with `Administrator` or `Manage Guild` may disable an application command within that community. Local disablement preserves the command's alias, restrictions, and other community settings so re-enabling restores them exactly. `Manage Roles` alone is insufficient.

**Rationale:** the developer owns whether code is offered, while the community owns whether it is allowed locally; neither disable action needs to destroy the other's configuration. This keeps rollback reversible without letting a community invoke code the developer has withdrawn.

### QAD-024: Resetting command configuration requires community-level authority

Resetting community command configuration to application defaults requires the community owner, `Administrator`, or `Manage Guild`. `Manage Roles` alone is insufficient because reset may remove invocation restrictions or other safety-relevant community policy.

**Rationale:** these roles already own community application configuration, and reset affects only that owner's state. Scoping and confirmation make broad deletion deliberate, while preserving developer policy prevents reset from becoming an authorization bypass.

### QAD-025: Reset clears every community-owned command override

Resetting a command clears all community-owned overrides, including its local enabled state, alias, and restrictions, returning them to application defaults. A command disabled globally by its developer remains unavailable because community reset cannot override developer policy.

**Rationale:** these roles already own community application configuration, and reset affects only that owner's state. Scoping and confirmation make broad deletion deliberate, while preserving developer policy prevents reset from becoming an authorization bypass.

### QAD-026: Reset is available per command and per application

Authorized community members may reset one command or every command belonging to an application in that community. Application-wide reset requires explicit confirmation because it removes all community-owned command overrides at once.

**Rationale:** these roles already own community application configuration, and reset affects only that owner's state. Scoping and confirmation make broad deletion deliberate, while preserving developer policy prevents reset from becoming an authorization bypass.

### QAD-027: Commands have immutable developer-defined keys

Each command has an immutable developer-defined key, scoped to its application and separate from its visible name. Community configuration follows this key. Re-registering the same key restores dormant settings even if the application's default display name changed; reusing only a display name does not establish identity.

**Rationale:** name or order reuse can attach old permissions and aliases to a different command.

### QAD-028: Developer command deletion preserves community settings

Deleting a command definition makes it unavailable but does not erase community-owned configuration associated with its immutable command key. Those settings remain dormant, may be discarded through community reset, and become active again if the developer re-registers the same key.

**Rationale:** name or order reuse can attach old permissions and aliases to a different command.

### QAD-029: Dormant command settings do not expire automatically

Dormant community command settings remain until an authorized community reset or permanent application/community deletion. Fluxer does not invent a time-based expiry from uninstall duration or command absence while both owners still exist.

**Rationale:** No current application-command store establishes a safe expiry interval, while existing user and per-community settings are lifecycle-owned persistent rows rather than inactivity-TTL data. An invented timer would silently erase community-owned policy even though the same stable command may legitimately return after a long absence; explicit reset and application/community deletion provide deterministic owners. Measured storage or privacy evidence may justify a separately reviewed bound later.

### QAD-030: Developer disablement overrides community enablement

A command disabled globally by its developer cannot be activated or invoked by a community. Community configuration remains dormant and may be edited or reset as otherwise allowed, but community enablement takes effect only after the developer re-enables the command.

**Rationale:** the developer owns whether code is offered, while the community owns whether it is allowed locally; neither disable action needs to destroy the other's configuration. This keeps rollback reversible without letting a community invoke code the developer has withdrawn.

### QAD-031: Global application deletion removes retained community configuration

Permanently deleting an application permanently deletes its active and dormant community command settings as part of installation cleanup. The deleted application ID and its command keys cannot legitimately return, so retained configuration has no valid future owner.

**Rationale:** dormant data is useful only while the same immutable application can be reinstalled. Once that identity is permanently deleted, retention has no valid future owner and would create orphaned configuration or risk attachment to a different application.

### QAD-032: Reinstall cannot silently expand bot authority

Retained community command configuration does not approve additional bot permissions requested during reinstall. `Manage Guild` may reinstall within the permission ceiling approved for that installation relationship, but a newly required permission above that ceiling remains unavailable until the community owner or a member with `Administrator` explicitly approves the increase. Uninstall/reinstall cannot reset the ceiling and masquerade as a first install.

**Rationale:** an application declaration or reauthorization request describes desired capability but does not own an existing community grant. Explicit review prevents silent escalation and surprising loss of existing workflows, while exact diffs let managers intentionally converge when a code-defined declaration exists.

### QAD-033: Declaration increases do not silently expand active installations

When an application publishes a larger code-defined required-bot-permission declaration, each existing installation remains active with its existing authority. Commands or behavior requiring the added permissions remain unavailable until the community owner or a member with `Administrator` explicitly approves the increase. `Manage Guild` alone cannot approve it.

**Rationale:** the code-defined declaration owns what the application currently requires, but it does not own an existing community grant. Explicit review prevents silent escalation and surprising loss of existing workflows, while exact diffs let managers intentionally converge to the current declaration.

### QAD-034: Declaration reductions do not mutate managed roles

When an application publishes a smaller code-defined required-bot-permission declaration, Fluxer does not automatically remove permissions from existing community-controlled managed roles. The changed declaration and difference from current permissions are shown to the community owner and members with `Administrator` or `Manage Guild`.

**Rationale:** the code-defined declaration owns what the application currently requires, but it does not own an existing community grant. Explicit review prevents surprising loss of existing workflows, while exact diffs let managers intentionally converge to the current declaration.

### QAD-035: Authorized administrators may explicitly apply the current declaration

For an application using code-defined permissions, the permission-difference UI provides an explicit action to apply its current saved required-permission set. Before confirmation it shows the exact permissions that will be added and removed. Only the community owner and members with `Administrator` may apply it. `Manage Guild` users may inspect the declaration but cannot apply a bot-authority change. Invite-mode applications have no application-global recommendation to apply; each reauthorization request is reviewed against the relationship ceiling.

**Rationale:** the code-defined declaration owns what the application currently requires, but it does not own an existing community grant. Explicit review prevents silent escalation and surprising loss of existing workflows, while exact diffs let managers intentionally converge to the current declaration. Invite-mode requests deliberately have no application-global recommendation to apply.

### QAD-037: Acting identity is always server-derived

Fluxer derives the acting identity from trusted authentication and interaction state. A bot may receive an interaction's invoking user ID as context, but cannot choose or override the acting user in a later action request. User-delegated requests reference an opaque interaction credential whose server-side record supplies the invoker. Autonomous bot requests derive the bot user and application from bot authentication. Action endpoints do not accept a caller-selected acting user ID, and permission and hierarchy checks are performed against the derived principal at execution time.

**Rationale:** a caller-controlled user ID would permit confused-deputy and impersonation attacks.

### QAD-038: Permission source bounds Manage Guild installation authority

Fluxer supports two mutually exclusive permission sources so ordinary Discord bots remain portable:

- **Invite mode** is the compatibility default when the application has not published `required_bot_permissions`. Each OAuth authorization uses the normalized, known permission bits in that request's standard `permissions` parameter; an omitted parameter requests an empty set. The parameter remains editable request input, exactly as in the existing invite model, and Fluxer does not claim it authenticates application-owner intent.
- **Code-defined mode** is an explicit opt-in made through the authenticated application configuration API by publishing `required_bot_permissions`, including an explicit empty set. Fluxer stores the canonical known-bit set with a server-owned positive revision and content hash. For that application, URL permissions may be emitted as a cross-platform compatibility hint but cannot select or override the Fluxer grant; consent always uses the current saved declaration.

In code-defined mode, `Manage Guild` may complete a first installation with exactly the current saved required set, including permissions the installer does not personally hold. Consent captures and displays the declaration revision/hash, and commit rechecks it; a concurrent declaration or source-mode change applies nothing and restarts review. No optional/caller-selected additions, role-position choice, or supplemental role are offered.

In invite mode, `Manage Guild` may still complete the standard invite flow, but the existing held-permission rule remains: it cannot grant a bit it does not personally hold. The community owner or `Administrator` may approve any normalized known-bit set requested by the invite. This distinction is required because an editable URL cannot support the code-defined mode's beyond-the-installer exception.

Whichever mode is used, the exact committed set becomes that application/community relationship's approved authority ceiling. The consent transaction stores the normalized source and set, and commit rechecks the application's current source mode before creating any installation state.

After installation, `Manage Guild` cannot broaden that ceiling or directly edit managed-role permission bits, hierarchy position, or supplemental-role assignments. A reinstall may reuse only authority at or below the retained ceiling; later declaration increases remain pending for that relationship, and reductions do not silently remove community-granted authority. Only the community owner or `Administrator` may approve an expansion or perform later bot-authority mutations, subject to applicable hierarchy, target, known-permission, installation, suspension, expected-version, preview, confirmation, and audit checks.

For migration, existing applications remain in invite mode and their links continue to work. No declaration or mode is inferred from previously generated links, bot roles, or memberships. Publishing the optional code field changes future first-install consent to code-defined mode but does not mutate existing grants or relationship ceilings. Previously installed legacy bots remain unchanged under QAD-012/QAD-013.

**Rationale:** requiring a Fluxer-only declaration from every bot would break the standard Discord invite contract and make otherwise portable bots require platform-specific setup. Keeping absence as invite mode preserves that contract and current applications without fabricating migration data. An invite URL is editable, copyable, and stale, however, so it cannot justify letting `Manage Guild` grant permissions the installer lacks; preserving the current held-bit ceiling contains that ambiguity. Applications that need `Manage Guild` to install their full required set can opt into a versioned server-side declaration, which gives consent one authoritative, race-checkable value. The declared set may itself be powerful, so the UI must show it exactly and communities must treat `Manage Guild` as trusted installation authority. In both modes, persisting the committed ceiling prevents uninstall/reinstall, later declaration or URL changes, role reordering, or supplemental roles from turning first-install authority into open-ended bot elevation.

Exact publication, compatibility, consent, concurrency, lifecycle, and verification behavior is specified in `specs/application-install-permission-source.md`.

### QAD-039: User-invoked commands support explicit execution modes

Native actions requested through a user-invoked command support three server-enforced modes: `AS_USER`, authorized against the invoking user; `AS_BOT`, authorized against the installed bot; and `REQUIRE_BOTH`, requiring both principals to pass. These are the exact public, persisted, hash, approval, and generated-contract tokens; `DELEGATED`, `BOT`, and `BOTH` are not aliases. Permission to invoke a command remains separate from permission to execute its resulting native action. `AS_USER` is the safe default inside the Fluxer structured-action broker. QAD-220 later clarifies that a Discord-compatible command which omits every Fluxer broker field remains an ordinary bot-authority command and does not enter that broker. The command UI and community settings show the mode, audit records use the same tokens plus `AUTONOMOUS_BOT` for bot activity with no invoking interaction, and QAD-041 requires owner/`Administrator` approval for a transition that introduces bot authority or removes the invoking-user check from bot-authority execution.

**Rationale:** explicit modes prevent a user-facing command from silently switching principals, and immutable developer semantics keep one command meaning consistent across communities. Community approval controls acceptance without creating a locally rewritten operation the application did not implement.

### QAD-040: Communities cannot rewrite execution modes

The application developer declares a command's supported execution mode. A community may approve that mode or disable the command but cannot rewrite it into another mode, because doing so could conflict with the command's intended behavior and implementation.

**Rationale:** explicit modes prevent a user-facing command from silently switching principals, and immutable developer semantics keep one command meaning consistent across communities. Community approval controls acceptance without creating a locally rewritten operation the application did not implement.

### QAD-041: Every execution-mode change requires community review

Changing an existing command's execution mode makes that command unavailable in each community until an authorized manager reviews the exact old/new mode. Every direction requires review because it changes command semantics, eligibility, authorization failures, and audit attribution. Review accepts or rejects the developer's new definition; a community cannot rewrite it.

Reviewer authority is explicit:

| Transition | Required reviewer |
|---|---|
| `AS_USER` -> `AS_BOT` | community owner or `Administrator` |
| `AS_USER` -> `REQUIRE_BOTH` | community owner or `Administrator` |
| `REQUIRE_BOTH` -> `AS_BOT` | community owner or `Administrator` |
| `AS_BOT` -> `AS_USER` | community owner, `Administrator`, or `Manage Guild` |
| `AS_BOT` -> `REQUIRE_BOTH` | community owner, `Administrator`, or `Manage Guild` |
| `REQUIRE_BOTH` -> `AS_USER` | community owner, `Administrator`, or `Manage Guild` |

The owner/`Administrator` gate applies whenever a transition introduces the installed bot as an authorizing principal or removes the invoking-user check from an existing bot-authority mode. `Manage Guild` may approve transitions that remove bot authority or add the invoking-user requirement without adding bot authority. Approval never grants permissions, operations, hierarchy reach, or supplemental roles: if the destination mode's bot requirements exceed the installed/community-approved envelope, the command remains unavailable until owner/`Administrator` separately approves that expansion. A publication that does not change mode does not enter this transition workflow.

**Rationale:** changing principal can alter eligibility, hierarchy, audit attribution, and application behavior in either direction, so even a restrictive change needs visible review. But letting `Manage Guild` introduce bot execution or remove its user-side check would contradict the rule that it cannot broaden bot authority after installation. The matrix keeps semantic review for all changes while reserving community-bot delegation to owner/`Administrator`; transitions toward solely user-derived authority remain bounded by the invoker's current endpoint permissions and hierarchy.

### QAD-042: Commands declare their allowed native Fluxer operations

Each command definition declares the native Fluxer operations it may request, such as `guild.member.ban` or `guild.member.role.add`. Interaction credentials authorize only those declared operations and reject undeclared requests. A harmless-looking command therefore cannot use its delegated interaction authority to perform an undeclared moderation action.

**Rationale:** a typed allowlist binds review to machine-enforceable operations rather than application-controlled prose. Rejecting undeclared types prevents one compromised or deceptive handler from turning a narrow command interaction into broad platform authority.

### QAD-043: Delegated authority is bound to user intent

For an action executed without additional confirmation, its security-relevant parameters and target must match the normalized values the user submitted or fixed values declared by the command. Permission to perform an operation does not imply intent to perform it against any target. When an application proposes a dynamic or materially different action, Fluxer requires confirmation of the actual structured operation before issuing short-lived authority for that exact action.

**Rationale:** invocation proves intent only for facts the user actually supplied or could see as fixed. Binding those facts prevents post-submit substitution, while confirmation gives the user a trusted view when the application selects a target, scope, or impact later.

### QAD-044: Dynamic-action confirmation uses platform-owned ephemeral UI

Fluxer presents dynamic or materially changed action confirmation as a dismissible ephemeral response visible only to the invoking user. The requesting application is clearly identified, but Fluxer renders the security-critical action summary and confirmation controls from the structured operation. Confirmation grants short-lived authority for that exact action; dismissal or expiry grants none.

**Rationale:** application-rendered text can omit or misrepresent the actual native effect. A platform-rendered prompt sourced from normalized parameters gives the user a trustworthy decision surface and releases only the exact, expiring authority they approved.

### QAD-045: Ephemeral interaction audience is always the invoker

Applications cannot choose recipients for ephemeral interaction responses. Fluxer derives the sole recipient from the trusted interaction invoker and rejects any application attempt to target another user or a recipient list.

**Rationale:** Fluxer can authenticate the invoker but cannot trust an application-supplied recipient. Derivation prevents the response token from becoming an unreviewed private-messaging capability and gives every read/delivery path one enforceable audience.

### QAD-046: Ephemeral responses are account-wide

Fluxer delivers an ephemeral interaction response to every active session belonging to the invoking account, not only the client that initiated the interaction. No other account receives the payload.

**Rationale:** the authenticated account is the privacy principal, not one transient tab. Account-scoped storage avoids lost responses and inconsistent dismissal after reload while recipient checks still exclude every other account.

### QAD-047: Ephemeral responses survive reload during retention

An undismissed ephemeral response remains available after page reload while it is within its retention period. Reloading a client does not itself remove the response; explicit dismissal or expiry does.

**Rationale:** the authenticated account is the privacy principal, not one transient tab. Account-scoped storage avoids lost responses and inconsistent dismissal after reload while recipient checks still exclude every other account.

### QAD-048: Fluxer limits ephemeral response lifetimes

Fluxer, not the application, enforces maximum ephemeral lifetimes. An ordinary ephemeral response may exist for at most 24 hours, while a security confirmation remains actionable for at most 5 minutes. Both deadlines are measured from creation and application edits do not extend them. Applications may request shorter lifetimes, and user dismissal removes the response immediately.

**Rationale:** platform maxima prevent applications from turning transient private UI into indefinite storage, while shorter application deadlines remain possible. The tighter confirmation window limits replay of high-impact authority; both are accepted product bounds rather than current-code-derived values.

### QAD-049: Ephemeral dismissal is account-wide

Dismissing an ephemeral response on one client dismisses it for every active session belonging to the invoking account. Dismissal state belongs to the account rather than an individual device.

**Rationale:** dismissal expresses the recipient's lifecycle decision, so another session or later bot edit must not reverse it. A terminal server state closes reads and controls before asynchronous cleanup and makes cross-session behavior deterministic.

### QAD-050: Ephemeral dismissal is terminal

After the invoking user dismisses an ephemeral response, the application cannot edit, reopen, or resurrect that response. Further operations against the dismissed response fail as terminal, even if its original retention deadline has not elapsed.

**Rationale:** dismissal expresses the recipient's lifecycle decision, so another session or later bot edit must not reverse it. A terminal server state closes reads and controls before asynchronous cleanup and makes cross-session behavior deterministic.

### QAD-051: Applications may edit active ephemeral responses

An application may edit its ephemeral response until the user dismisses it or it expires. Every edit preserves the server-derived invoking-user audience and the original creation-based expiration deadline; edits cannot retarget the response or extend retention.

**Rationale:** bounded edits support deferred progress and correction without granting a new audience or retention period. Rechecking all three predicates ensures a stale token cannot revive a dismissed or expired private resource.

### QAD-052: Interactions may create ephemeral follow-ups

An application may create multiple ephemeral follow-up responses for the same interaction. Fluxer derives the same invoking-user audience for every follow-up; the application cannot target another recipient. A platform-defined per-interaction cap limits abuse and accidental spam.

**Rationale:** a small follow-up set supports multi-step results without forcing public messages, while a hard per-interaction cap prevents one invocation from becoming an unlimited private spam/retention channel. Five is an accepted compatibility-oriented product ceiling.

### QAD-053: An interaction may create five ephemeral follow-ups

Each interaction may create at most five ephemeral follow-up responses in addition to its initial response. This prevents an interaction from becoming an unlimited private-message stream while supporting bounded multi-step output.

**Rationale:** a small follow-up set supports multi-step results without forcing public messages, while a hard per-interaction cap prevents one invocation from becoming an unlimited private spam/retention channel. Five is an accepted compatibility-oriented product ceiling.

### QAD-054: Ephemeral responses support invoker-only components

Ephemeral responses may contain bot-managed buttons and dropdowns. Fluxer permits only the invoking user to operate them, regardless of application-supplied component data. The components become unusable when their containing response is dismissed or expires.

**Rationale:** controls make private workflows useful, but their authority must inherit the response's server-derived audience and terminal lifecycle. That prevents forwarded/rendered payloads or application fields from widening who can act.

### QAD-055: The master plan includes composable rich message containers

Fluxer's bot-message system includes a native structured layout path distinct from passive legacy embeds. A rich container may visually group passive content and interactive controls into one coherent block. The model separates layout, content, and interactive component categories and must work in public and ephemeral bot-managed messages with server-validated nesting and client-native rendering.

**Rationale:** typed structural categories let the server bound and validate layout without accepting arbitrary executable UI, while grouping related content and controls supports richer workflows than a flat action row. The representation remains a data contract, not application code.

### QAD-056: Choice controls work inline and in modal forms

Fluxer's component model includes single-select dropdowns, multi-select dropdowns, radio groups, individual checkboxes, and checkbox groups. Simple choices may appear inline inside rich bot-message containers and trigger interactions directly. Larger or multi-field workflows may place the same kinds of controls in a focused modal and submit their values together.

**Rationale:** the three semantics cover single and multiple bounded choice with compact or visible presentation, and sharing one logical model avoids different state rules for inline and modal placement. Schema placement rules still bound accessibility and layout.

### QAD-057: Legacy and structured message representations are exclusive

Each bot message uses either traditional message content and embeds or the structured component representation with rich containers. The two representations cannot be mixed within one message. Traditional messages remain supported as a separate compatibility path.

**Rationale:** immutable representation gives persistence, Rust round-trip, client rendering, and fallback one unambiguous schema for the message lifetime. Silent conversion or mixing could drop content, reinterpret layout, or make older clients disagree about the canonical message.

### QAD-058: Message representation is immutable

A bot message cannot be converted between the traditional and structured component representations after creation. An application that needs the other representation creates a new message instead of changing the existing message's serialization and rendering contract.

**Rationale:** immutable representation gives persistence, Rust round-trip, client rendering, and fallback one unambiguous schema for the message lifetime. Silent conversion or mixing could drop content, reinterpret layout, or make older clients disagree about the canonical message.

### QAD-059: Controls are per-user inputs with optional shared output

Interactive controls maintain selection, pending, and error state per user rather than exposing platform-level shared control state. After accepting an interaction, the application may update the public bot-managed message with gathered or canonical output such as vote totals, workflow status, or a configuration result. Ephemeral response controls remain scoped to their sole invoking-user audience.

**Rationale:** a control selection is user input, not automatically public truth. Per-user state prevents cross-user leakage and interference, while a separate versioned public update makes any intended shared consequence explicit and concurrency-controlled.

### QAD-060: Inline control state commits only after a proven terminal success

When a user changes an inline control, Fluxer displays temporary per-user pending state. A transport acknowledgement, defer, or modal-opening response does not commit that value. The interaction outcome ledger conditionally selects one immutable commit owner: an application-handled path commits only after Fluxer persists a terminal accepted application result, while a claimed structured-native-action path commits only after its deterministic effect ledger reaches `SUCCEEDED`. The two paths cannot race to claim different meanings for one interaction. Any resulting shared public-message update remains a separate application response.

**Rationale:** protocol acknowledgement proves receipt, not that the workflow or native effect succeeded. Committing on defer could consume a control whose work later fails, while rolling back after a proven native effect could reopen the control and repeat that effect. One persisted commit owner and terminal result keeps presentation, retry, and one-use semantics aligned with what actually happened.

### QAD-061: Proven-no-effect component failures roll back visibly

If the terminal application result rejects a component interaction, a deferred/modal workflow expires, or the initial response deadline passes, Fluxer restores the previous committed control state only after the interaction/effect ledger proves that no native or application commit occurred. It shows an invoker-only ephemeral error where delivery remains possible. A successful native effect remains committed even if the application response path times out. A partial or ambiguous effect enters fail-closed reconciliation and does not restore an apparently reusable control. Other viewers are not shown a public failure message for one user's failed interaction.

**Rationale:** rollback is safe only when Fluxer can prove the attempt had no effect. Reopening after success risks duplicate action, while claiming rollback after partial or unknown outcome misrepresents reality. Invoker-only status avoids turning one user's failure or reconciliation state into public output.

### QAD-062: Public bot-message updates use version checks

An application response that updates a public bot-managed message must reference the message version on which it was based. Fluxer rejects a stale update rather than allowing it to overwrite newer gathered or canonical output. The invoking user receives an ephemeral explanation that the result changed before their update could be applied.

**Rationale:** only the application understands whether two semantic changes can be combined, while Fluxer can reliably detect a stale base version. Rejecting instead of last-write-wins prevents lost public updates and avoids the platform inventing merge behavior.

### QAD-063: Applications own conflict recovery

Fluxer does not automatically retry a public-message update rejected by a version conflict. It returns the conflict to the application, which may refetch current state, recompute, and explicitly submit a new update. This avoids blindly repeating side effects or applying stale derived output.

**Rationale:** only the application understands whether two semantic changes can be combined, while Fluxer can reliably detect a stale base version. Rejecting instead of last-write-wins prevents lost public updates and avoids the platform inventing merge behavior.

### QAD-064: Component interactions are idempotent

Every component interaction has a unique server-issued idempotency identity. Double-clicks, client retransmission, gateway redelivery, or application retries cannot execute the same interaction side effect more than once. Repeated handling returns the already-recorded result or terminal status.

**Rationale:** Gateway/HTTP retries and crashes can redeliver the same click, so transport delivery cannot be treated as unique. A stable interaction/effect identity lets retries observe the original result instead of repeating state changes or privileged actions.

### QAD-065: Interactions support deferred processing

An application may acknowledge an interaction before completing its work. A defer moves the interaction into durable pending completion; it does not commit component input or consume a one-use control. The application must later produce the terminal result within the response-authority/component deadline. Opening a modal likewise transfers pending ownership to that bounded modal workflow; submit may continue to application or native-effect success, while cancel/expiry supplies no success. Fluxer keeps the invoking user's control or command response visibly pending until that terminal outcome.

**Rationale:** many legitimate operations cannot finish inside the acknowledgement window, but silence makes the interaction look lost and invites retries. Separating receipt from completion gives the user truthful pending state, prevents premature one-use consumption, and keeps the later completion deadline bounded.

### QAD-066: Interactions require initial handling within three seconds

An application must send an initial response, defer, open an allowed modal, or claim the structured native-action path within three seconds of delivery. Missing the deadline invalidates the initial application response path. Fluxer shows a retryable timeout only when the outcome ledger proves no effect; proven native success produces its terminal result, while a partial or ambiguous effect remains fail-closed in reconciliation. The deadline is selected for responsive behavior and also matches the Discord interaction baseline.

**Rationale:** these dated Discord-compatible values let existing handlers migrate and give users prompt acknowledgement, while the 15-minute bearer window bounds later mutation. Separating authority expiry from output retention avoids erasing a valid recipient copy merely because the app can no longer edit it.

### QAD-067: Application interaction authority lasts fifteen minutes

After acknowledging or deferring an interaction, the application may edit the original response and create allowed follow-ups for 15 minutes from interaction creation. Expiry ends application mutation authority but does not immediately remove an already-created ephemeral response, which may remain visible until its separate retention deadline or user dismissal.

**Rationale:** these dated Discord-compatible values let existing handlers migrate and give users prompt acknowledgement, while the 15-minute bearer window bounds later mutation. Separating authority expiry from output retention avoids erasing a valid recipient copy merely because the app can no longer edit it.

### QAD-068: Response visibility is immutable

An existing interaction response cannot be converted between public and ephemeral visibility. The application selects visibility when creating or deferring the response; changing visibility requires creating a separate response with its own lifecycle.

**Rationale:** audience is a security and retention property established when the resource is created. Allowing later conversion could leak previously private content or hide public history, whereas a separate response has a fresh explicit audience and lifecycle.

### QAD-069: Applications choose Gateway or outgoing HTTP interaction delivery

Fluxer's master plan supports both `INTERACTION_CREATE` Gateway delivery and signed outgoing HTTP interaction delivery. An application selects one delivery mode at a time so interactions are not duplicated across transports. Gateway delivery may be implemented first because bot Gateway connections already exist, but HTTP delivery remains part of the planned public contract. Interaction responses use the HTTP callback API in either delivery mode.

**Rationale:** dual or silent fallback delivery can execute one interaction twice and makes outage ownership unknowable. One versioned active transport gives deterministic routing, while explicit switching lets developers verify the replacement before traffic moves.

### QAD-070: Outgoing HTTP interactions use Discord-compatible Ed25519 signatures

Fluxer signs outgoing HTTP interaction requests using the Discord-compatible timestamp-plus-raw-body Ed25519 contract and signature headers, and exposes the corresponding application verification key to developers. Private signing material remains under Fluxer control. Endpoint verification, key custody, outbound-network safety, replay resistance, and retry behavior are treated as an explicit security boundary rather than ordinary application metadata.

**Rationale:** signing the exact received bytes prevents intermediary reserialization ambiguity and lets the receiver verify origin/freshness. Per-application keys contain compromise and permit independent rotation without giving one application material that validates another's traffic.

### QAD-071: Interaction-signing keys are application-scoped

Each application has its own Ed25519 interaction-signing keypair rather than sharing an instance-wide key. Fluxer exposes that application's public verification key and securely retains its private signing material, limiting key rotation and compromise impact to one application.

**Rationale:** signing the exact received bytes prevents intermediary reserialization ambiguity and lets the receiver verify origin/freshness. Per-application keys contain compromise and permit independent rotation without giving one application material that validates another's traffic.

### QAD-072: HTTP interaction endpoints must verify before activation

Fluxer sends a signed verification interaction to a newly configured HTTP endpoint and requires the expected response within the interaction acknowledgement deadline. HTTP delivery remains disabled until verification succeeds; saving an endpoint URL alone never redirects live interactions.

**Rationale:** syntactic validity does not prove endpoint control, signature verification, or deadline readiness. A signed challenge validates the complete receiving path before any real user interaction is redirected or dropped.

### QAD-073: Production interaction endpoints are public HTTPS only

Production Fluxer instances accept only public HTTPS interaction endpoints and block loopback, private, link-local, metadata-network, and otherwise non-public destinations, including after DNS resolution. Self-hosted development may provide an explicit instance-level override that is disabled by default.

**Rationale:** application-controlled URLs create an SSRF boundary, and DNS can change after registration. Revalidation/pinning at connection time plus no redirects prevents a public-looking endpoint from reaching internal services or cloud metadata.

### QAD-074: Interaction delivery does not follow redirects

Outgoing HTTP interaction delivery rejects redirects. Application developers must configure and verify the final destination URL directly, preventing redirects from bypassing network validation or unexpectedly receiving signed interaction payloads.

**Rationale:** application-controlled URLs create an SSRF boundary, and DNS can change after registration. Revalidation/pinning at connection time plus no redirects prevents a public-looking endpoint from reaching internal services or cloud metadata.

### QAD-075: Interaction delivery never silently changes transport

Failure of an application's configured HTTP endpoint does not cause Fluxer to deliver the interaction through Gateway. Delivery mode remains explicit, preventing duplicate handling and disclosure through an unintended transport. The invoking user receives a delivery failure when the configured transport cannot handle the interaction.

**Rationale:** dual or silent fallback delivery can execute one interaction twice and makes outage ownership unknowable. One versioned active transport gives deterministic routing, while explicit switching lets developers verify the replacement before traffic moves.

### QAD-076: HTTP delivery receives one deadline-bounded transient retry

Fluxer may retry an outgoing HTTP interaction once after a connection failure or transient server error only when the retry can still complete within the three-second acknowledgement deadline. The retry uses the same interaction identity so applications can deduplicate it. Fluxer does not retry ordinary client-error responses.

**Rationale:** one bounded retry can recover a transient network failure, but retrying past the deadline or on deterministic 4xx responses creates stale work and load. Stable identity lets receivers deduplicate without a false exactly-once transport claim.

### QAD-077: Repeated HTTP failures suppress unavailable commands

After repeated HTTP interaction endpoint failures, Fluxer marks the application's delivery transport unhealthy and temporarily makes its commands unavailable rather than allowing repeated user-facing failures. Fluxer notifies the application developer and periodically rechecks the endpoint before restoring availability. Failure thresholds and probing intervals remain implementation decisions.

**Rationale:** continuing user-visible invocations against a known failing endpoint wastes bounded capacity and produces predictable timeouts. Suppression limits blast radius while safe status and probes provide a deliberate recovery path without leaking endpoint detail.

### QAD-078: Interaction-signing key rotation is staged

Fluxer generates and exposes a pending application verification key before changing the active signing key. It sends endpoint verification signed by the pending key and activates the new keypair only after verification succeeds, avoiding an unexpected delivery outage during rotation.

**Rationale:** immediate replacement can strand a receiver that has not deployed the new key, while indefinite dual validity expands compromise exposure. Pending verification proves readiness and a short versioned overlap handles in-flight traffic safely.

### QAD-079: Native and application commands share one discovery model

Fluxer's existing native and client-local slash commands participate in the same stable identity, naming, collision, permission, and discovery model as application commands, represented as commands from a Fluxer-owned first-party provider. Their execution implementations may remain native where appropriate rather than being routed through third-party interaction delivery.

**Rationale:** users search for an action, not its storage owner, so separate pickers would duplicate navigation and collision behavior. Provider identity keeps native and application entries distinguishable while server authorization remains unchanged.

### QAD-080: Every command has a qualified invocation form

Every command has an always-available provider-qualified invocation form in addition to any friendly unqualified name. The qualified form resolves one exact application and immutable command key, providing a collision-free target for invocation, documentation, support, and automation.

**Rationale:** friendly names can collide or change, but documentation and explicit invocation need a durable address. Combining a unique application handle with an immutable application-scoped key identifies one command without making the mutable display name authoritative.

### QAD-081: Applications have stable globally unique handles

Each application has a globally unique stable handle separate from its mutable display name. The handle resolves to the immutable application ID and is used by qualified command invocation, allowing application display-name changes without breaking commands or documentation.

**Rationale:** friendly names can collide or change, but documentation and explicit invocation need a durable address. Combining a unique application handle with an immutable application-scoped key identifies one command without making the mutable display name authoritative.

### QAD-082: Qualified commands use application-handle colon syntax

Fluxer's additive qualified invocation syntax is `/<application_handle>:<command_key>`, for example `/fluxy:ban`. Normal unqualified invocation and Discord-like picker discovery remain available. The qualified form bypasses friendly-name collisions and resolves the exact application and immutable command key; it is a Fluxer extension rather than a Discord-compatible wire representation.

**Rationale:** friendly names can collide or change, but documentation and explicit invocation need a durable address. Combining a unique application handle with an immutable application-scoped key identifies one command without making the mutable display name authoritative.

### QAD-083: User command personalization does not rename commands

Users may choose a preferred exact command when multiple available applications share an unqualified name, and may personalize command visibility, favorites, and ordering. These preferences cannot enable a developer- or community-disabled command and do not create personal command names. A stale or unavailable preferred target returns the user to explicit selection rather than silently invoking another application.

**Rationale:** command names are shared communication and audit context, so per-user semantic renames would make the same visible invocation mean different things. Additive community aliases provide local vocabulary without breaking developer documentation or original-name recovery.

### QAD-084: Community aliases do not replace application command names

A community alias is an additional shared invocation name rather than a destructive rename of the application's default name. Users may invoke either the application-defined name or the community alias, so a community cannot force members to learn a different command spelling. Collisions on an application-defined name are resolved through the user's preferred exact command or the command picker; the provider-qualified form remains the unambiguous fallback.

**Rationale:** command names are shared communication and audit context, so per-user semantic renames would make the same visible invocation mean different things. Additive community aliases provide local vocabulary without breaking developer documentation or original-name recovery.

### QAD-085: Public command attribution shows the invoked shared name

When a command invocation is represented publicly, Fluxer shows the exact shared form the user invoked together with the application's identity, such as `Neon used /ban · Fluxy` or `Neon used /fluxyban · Fluxy`. Application-default names, community aliases, and qualified names are shared invocation forms; private discovery and duplicate-selection preferences are not disclosed.

**Rationale:** preserving the selected text accurately represents user intent and avoids surprising edits, while visible immutable application attribution supplies the disambiguation needed for readers and audits.

### QAD-086: Duplicate-command preferences have global defaults and community overrides

For an application-defined unqualified name, a user may choose an account-wide preferred exact command and optionally replace it within a particular community. The community-specific preference takes precedence over the account-wide default. Community-alias preferences are necessarily community-scoped. If the selected command is unavailable or no longer matches the invoked name, Fluxer opens explicit selection rather than silently invoking another application.

**Rationale:** implicit usage-based dispatch can invoke the wrong provider without a fresh choice. Explicit defaults are user-owned and predictable, and a community override handles context-specific intent without discarding the account-wide preference.

### QAD-087: Community aliases are unique only within their application

Community administrators may freely choose command aliases even when the same name is used by another application or Fluxer's first-party command provider. Within one application, however, the effective command names and aliases must remain unique so that the application-local name resolves deterministically. Cross-application collisions use the normal user preference, picker, or provider-qualified invocation behavior rather than blocking the alias.

**Rationale:** global uniqueness would let one application monopolize common community vocabulary. Within-application uniqueness prevents one provider from creating ambiguous choices, while the picker already has provider identity to resolve legitimate cross-application collisions.

### QAD-088: Favorites rank above passive usage ordering

Command discovery passively sorts available commands using a minimal user-specific usage signal. Commands the user explicitly favorites rank above usage-derived results. These mechanisms order discovery results; the separate preferred-command setting controls automatic resolution of an otherwise duplicate unqualified name.

**Rationale:** explicit favorites should dominate an inferred signal, and community-scoped recency reflects where a command is actually useful. Storing only identity/rank data improves discovery without creating a searchable history of sensitive arguments or message content.

### QAD-089: Only explicit preferences auto-resolve duplicate names

Favoriting a command changes discovery ordering but does not make it the automatic target of a duplicate unqualified name. Automatic resolution occurs only when the user explicitly selects that exact command as the preferred target for the name; otherwise ambiguous submission requires explicit picker selection.

**Rationale:** implicit usage-based dispatch can invoke the wrong provider without a fresh choice. Explicit defaults are user-owned and predictable, and a community override handles context-specific intent without discarding the account-wide preference.

### QAD-090: Usage ordering never stores command arguments

Usage ordering exists only to rank commands in the picker. Fluxer never stores command option or argument values for this feature and does not treat it as a recallable invocation history. Its retained data is limited to the minimum command-identity usage signal needed to derive picker order.

**Rationale:** explicit favorites should dominate an inferred signal, and community-scoped recency reflects where a command is actually useful. Storing only identity/rank data improves discovery without creating a searchable history of sensitive arguments or message content.

### QAD-091: Command personalization synchronizes across devices

Fluxer synchronizes a user's favorites, preferred-command selections, visibility choices, and minimal command-usage ranking signals through the account so command discovery remains consistent across the user's clients. Account synchronization does not imply that every preference or ranking is aggregated across communities. Synchronization never adds command arguments or option values to the retained personalization data.

**Rationale:** favorites, preferences, hiding, and ordering express one account holder's intent, so they should not diverge by device. Keeping the established account-wide versus community-scoped ownership of each signal—and excluding arguments/values—provides consistency without turning synchronization into cross-community aggregation or command history.

### QAD-092: Users may hide non-Fluxer commands through recoverable controls

Users may hide individual third-party application commands from their own normal discovery, but may not hide commands owned by Fluxer's official first-party provider. Hiding follows the stable command identity across its application-defined name and community aliases. The command picker offers a `Show hidden` toggle that renders hidden commands dimmed with an `Unhide` action, and user settings provide a clean account-wide overview grouped by application with individual and per-application restore controls. The settings UI calls this state `Hidden by you` rather than `disabled`, reserving disabled terminology for developer or community policy that the user cannot override.

**Rationale:** stable identity and account synchronization make hiding predictable across sessions, while a recovery view prevents an irreversible UI trap. Keeping hiding separate from authorization and retained preferences avoids turning personal organization into a security or deletion action.

### QAD-093: Personal command controls have a dedicated user-settings page

Fluxer adds a top-level `Commands` page under user `App settings`. It owns personal favorites, global and community-specific preferred-command selections, and the `Hidden by you` overview. Community aliases, enablement, and permission policy remain in community settings; application command registration remains in the developer-facing `Applications` area; OAuth grants remain under `Authorized apps`.

**Rationale:** one account-level recovery and preference page makes reversible personal controls findable across devices. Keeping community policy, developer registration, and OAuth grants in their existing owner-specific areas avoids mixing personal organization with administration or authorization.

### QAD-094: Users may reset only passive command ordering

The user `Commands` settings page provides an action to reset passive usage-based picker ordering for a selected community, plus an explicit action to reset ordering for all communities. Either reset deletes only the affected minimal usage-ranking signals and preserves favorites, preferred-command selections, and hidden-command choices.

**Rationale:** passive usage is an inferred, community-scoped convenience signal, so users should be able to clear it locally or everywhere without erasing their explicit favorites, provider choices, or hiding decisions. This separates “forget my inferred order” from a destructive reset of deliberate preferences.

### QAD-095: User-hidden commands are hidden account-wide

Hiding a third-party application command is an account-wide choice keyed by its stable command identity. The command remains hidden across every community and under all of its community aliases until the user restores it. This scope is distinct from community policy and from context-specific usage ordering.

**Rationale:** stable identity and account synchronization make hiding predictable across sessions, while a recovery view prevents an irreversible UI trap. Keeping hiding separate from authorization and retained preferences avoids turning personal organization into a security or deletion action.

### QAD-096: Usage-based command ordering is community-scoped

Passive command-usage ranking is calculated independently for each community because command relevance and user behavior differ by context. The community-scoped ranking signal synchronizes across the user's devices but does not affect picker ordering in another community.

**Rationale:** explicit favorites should dominate an inferred signal, and community-scoped recency reflects where a command is actually useful. Storing only identity/rank data improves discovery without creating a searchable history of sensitive arguments or message content.

### QAD-097: Command favorites are account-wide

Favoriting is an account-wide choice keyed by stable command identity. A favorite ranks above passive usage ordering in every community where that command is installed, enabled, and invocable. Application-default names and community aliases do not create separate favorite records for the same command.

**Rationale:** a favorite expresses durable intent about one stable command rather than behavior in one community or under one alias. Account scope preserves that intent across devices and communities, while current availability still prevents a favorite from manufacturing access.

### QAD-098: Usage orders commands within the favorite tier

All available favorites form the picker's highest-ranking tier. Within that tier, the same community-specific passive usage signal orders commands, followed by stable alphabetical and application-identity tie-breakers. Fluxer does not add manual favorite reordering initially.

**Rationale:** explicit favorites should dominate an inferred signal, and community-scoped recency reflects where a command is actually useful. Storing only identity/rank data improves discovery without creating a searchable history of sensitive arguments or message content.

### QAD-099: Hiding suppresses rather than deletes other personalization

While a third-party command is hidden, Fluxer ignores its favorite status and any preferred-command selections that target it, so it cannot rank or resolve automatically. Those choices remain stored as dormant personalization, are identified in the hidden-command overview, and resume when the user unhides the command. Hiding is reversible visibility control, not an implicit reset.

**Rationale:** stable identity and account synchronization make hiding predictable across sessions, while a recovery view prevents an irreversible UI trap. Keeping hiding separate from authorization and retained preferences avoids turning personal organization into a security or deletion action.

### QAD-100: User hiding is discovery-only

Hiding a third-party command removes its unqualified application name and community aliases from normal discovery unless `Show hidden` is enabled. It does not create a personal authorization rule: an explicit provider-qualified invocation still works and may indicate that the command is hidden. Developer or community disablement, by contrast, blocks every invocation form. This is a product-level working decision and does not become part of the authorization boundary.

**Rationale:** stable identity and account synchronization make hiding predictable across sessions, while a recovery view prevents an irreversible UI trap. Keeping hiding separate from authorization and retained preferences avoids turning personal organization into a security or deletion action.

### QAD-101: Picker cards present community aliases with application-name context

The picker renders one card per command identity. When a community alias exists, the normal card presents that alias as its primary name and shows the application-defined name in smaller secondary context. A user preference may bypass community aliases, making the application-defined name primary instead. Both names remain searchable and invocable regardless of presentation preference.

**Rationale:** the alias reflects shared local vocabulary, but always showing the original preserves developer documentation and attribution. A presentation-only preference accommodates user familiarity without changing invocation identity.

### QAD-102: Alias-presentation preference has global defaults and community overrides

Each user has an account-wide default choosing whether picker cards prefer community aliases or application-defined names. The user may override that choice for an individual community, whose override takes precedence. This changes discovery presentation and the default form selected through browsing, not command identity or availability.

**Rationale:** the alias reflects shared local vocabulary, but always showing the original preserves developer documentation and attribution. A presentation-only preference accommodates user familiarity without changing invocation identity.

### QAD-103: The command picker supports application filtering

The picker combines the agreed favorite and community-usage ordering with live text search. It also exposes installed application icons as filters, allowing the user to restrict results to commands from one bot in the Discord-like manner while retaining clear application identity on every result.

**Rationale:** filtering by visible provider helps users resolve collisions, and binding identity at selection prevents later name changes or duplicate text from retargeting submission. Familiar editing/removal behavior keeps the structured token understandable and reversible.

### QAD-104: Command selection binds identity without rewriting typed text

Selecting a picker result binds the exact stable command and application IDs while preserving the invocation name the user typed. The composer visibly indicates the selected application, and public attribution uses the typed shared name plus application identity. An explicit preferred-command selection may bind automatically but remains visibly attributed. Alias-presentation preferences affect card emphasis and the name inserted when browsing before a name has been typed; they never rewrite existing command text.

**Rationale:** filtering by visible provider helps users resolve collisions, and binding identity at selection prevents later name changes or duplicate text from retargeting submission. Familiar editing/removal behavior keeps the structured token understandable and reversible.

### QAD-105: Selected commands remain removable chat-input items

After selection, the command name and application identity form a structured item within the normal chat composer while its arguments remain editable. Users remove or replace that selection using Backspace or Delete in the Discord-like chat-input flow, which returns them to command discovery; they do not edit the bound item into a different registered command or personal alias.

**Rationale:** filtering by visible provider helps users resolve collisions, and binding identity at selection prevents later name changes or duplicate text from retargeting submission. Familiar editing/removal behavior keeps the structured token understandable and reversible.

### QAD-106: Each application owns exactly one bot account

An application has exactly one bot user identity. Its bot credentials authenticate that application and resolve to that single bot actor; separate bot identities require separate applications. This preserves the current Fluxer ownership model and keeps application handles, commands, community installations, managed roles, permissions, and audit attribution unambiguous.

**Rationale:** the current application ID deterministically identifies one bot user and every existing credential/ownership path assumes that cardinality. Multiple bots would make all downstream ownership keys ambiguous without an accepted use case to justify the expansion.

### QAD-107: Direct-message application commands are out of initial scope

The initial third-party application-command implementation operates in communities and does not expose bot commands in direct messages or group DMs. The interaction protocol still carries an explicit context type and does not structurally require community fields in every future interaction, allowing DM support to be designed later without replacing the wire contract. Existing first-party behavior outside communities is not removed by this scope decision.

**Rationale:** current guild membership, permissions, audit, and channel services provide evidence-backed ownership for community chat input, while the excluded contexts lack equivalent installation, audience, and lifecycle contracts. Starting there prevents unreviewed authority models from entering the base design.

### QAD-108: Global or user-installed applications are out of initial scope

The initial bot platform supports community-installed applications only. It does not implement a user-level application installation that follows a user across communities or makes third-party commands globally available outside a community installation. Applications and command definitions still retain globally stable identities; availability and authority are community-installation scoped.

**Rationale:** current guild membership, permissions, audit, and channel services provide evidence-backed ownership for community chat input, while the excluded contexts lack equivalent installation, audience, and lifecycle contracts. Starting there prevents unreviewed authority models from entering the base design.

### QAD-109: Each command key has one application-wide schema

An immutable command key identifies exactly one developer-defined schema within its application. The developer cannot publish divergent names, options, authority declarations, or operation declarations for that key in different communities. Community aliases, restrictions, enablement, and other policy remain separate configuration layered over the shared definition; targeted testing or rollout changes availability rather than forking the schema.

**Rationale:** one immutable key must describe the same inputs and behavior wherever it is invoked for documentation, stale-form validation, and manifest recovery to remain reliable. Community needs are still served through policy that does not redefine the command.

### QAD-110: Developers may target command availability by community

A developer may make a command available to all communities where the application is installed, only a selected set of installed communities, or no communities through global disablement. Targeting never changes the command's single application-wide schema. Communities outside the developer-selected availability cannot activate the command themselves; their retained configuration remains dormant.

**Rationale:** targeting provides staged rollout and testing while preserving the one-schema invariant. Keeping it separate from definition and community approval prevents a target edit from silently changing inputs or local authority.

### QAD-111: New commands auto-enable only within approved authority

A newly added or newly targeted command becomes available automatically when its execution mode, declared native operations, data access, and required bot permissions remain within the application's authority already approved by that community. Any expansion remains unavailable pending the applicable review. Only the community owner or `Administrator` may raise the installed permission ceiling, approve an expansion through hierarchy position or supplemental roles, or approve a QAD-041 transition that introduces bot authority or removes the invoking-user check from bot-authority execution. `Manage Guild` may approve the other QAD-041 transitions and non-bot-authority application configuration explicitly assigned to it elsewhere. Relevant community managers are notified in either case. A returning stable command key restores its retained community configuration instead of being treated as a new command.

**Rationale:** automatic availability is low-friction when it cannot increase granted capability, but an expanded authority envelope is a new community security decision. Comparing exact structured authority avoids both needless reapproval and silent escalation.

### QAD-112: Fluxer automatically versions structural command schemas

Fluxer detects changes to command options, types, required fields, and subcommand structure and automatically increments an execution-schema version; developers neither choose nor manually track it. Clients submit the selected version, and Fluxer rejects stale submissions before application delivery with `COMMAND_SCHEMA_STALE`, refreshes discovery, and preserves compatible entered values where possible. Metadata-only changes such as descriptions, icons, and localizations do not invalidate an open command. Interactions already created continue under their submitted schema version.

**Rationale:** the platform can deterministically detect shape changes and therefore cannot rely on developers to increment a safety-critical counter correctly. Reject-and-refresh prevents old fields from being reinterpreted, while keyed same-type retention minimizes unnecessary user re-entry.

### QAD-113: Command manifests support optional staged publishing

Discord-compatible command registration endpoints may continue to publish changes immediately for straightforward migration. As an additive Fluxer workflow, developers may assemble and validate a complete draft command-manifest revision and atomically publish it, preventing users from observing a partially applied multi-command update. Structural schema versions remain platform-managed in either workflow.

**Rationale:** immediate endpoints let existing developer workflows migrate, while a validated complete candidate prevents large releases from exposing partial intermediate state. Both paths can publish the same immutable manifest, avoiding two registry models.

### QAD-114: The master plan includes command-manifest rollback

Fluxer retains published command-manifest revisions and allows a developer to restore a previous revision by publishing its contents as a new revision, preserving immutable release history. Rollback atomically restores command definitions and developer availability targeting, preserves community configuration through stable command keys, and revalidates current approvals and permissions. It does not roll back application backend code, application data, external effects, or completed interactions; the developer UI and API must state that boundary clearly.

**Rationale:** immutable history makes a definition recovery auditable and prevents rewriting what past interactions used; republishing through current validation avoids reviving obsolete authority. Deferring the recovery UI/API keeps a nonessential control from blocking the core registry.

### QAD-115: Manifest recovery ships as a later stacked pull request

The initial command registry stores immutable published manifest revisions so recovery history exists from the beginning. Optional staged publishing and developer-facing manifest rollback are planned as focused follow-up pull requests rather than expanding the first registry or picker changes. The recovery branch depends on the manifest-publishing foundation but does not need to sit in the dependency path for interaction delivery, picker, ephemeral-response, or component work.

**Rationale:** immutable history makes a definition recovery auditable and prevents rewriting what past interactions used; republishing through current validation avoids reviving obsolete authority. Deferring the recovery UI/API keeps a nonessential control from blocking the core registry.

### QAD-116: Command options begin with Discord parity and remain extensible

Fluxer's initial public chat-input command schema supports the complete Discord-compatible option baseline: subcommands, subcommand groups, strings, integers, booleans, users, channels, roles, mentionables, numbers, and attachments, including compatible static choices, validation bounds, and autocomplete eligibility. The schema remains a versioned tagged union so Fluxer may add platform-defined option types and capabilities later without redesigning command identity or existing payloads. Extensions require explicit client capability and fallback rules rather than treating arbitrary unknown types as valid.

**Rationale:** the documented Discord set covers established migration needs and avoids an immediately incompatible bespoke subset. A bounded tagged union gives exhaustive validation and safe additive evolution instead of accepting ambiguous arbitrary JSON.

### QAD-117: Only chat-input application commands are in scope

The bot-platform master plan covers chat-input slash commands. User-context commands, message-context commands, and Activity primary-entry-point commands are entirely out of scope rather than deferred deliverables. The interaction protocol may remain generally extensible, but the plan does not create product, API, UI, or branch commitments for those command surfaces.

**Rationale:** chat input has a defined option, submission, and interaction model in this plan; the excluded entry types require different selection context, privacy, and authorization contracts. Excluding them prevents unreviewed semantics while leaving future tagged-union extension possible.

### QAD-118: Unavailable-command discovery reveals only safe explanations

Normal command browsing hides commands the current user cannot invoke. Exact search may render a disabled result with a safe reason such as a missing native permission or unavailable channel. Developer-disabled, untargeted, or intentionally private commands remain hidden from ordinary users rather than disclosing their definitions. Authorized community managers can inspect installed commands and their effective status through community settings.

**Rationale:** safe actionable explanations help a user correct local context, while hiding private targeting and suspension detail prevents command or policy enumeration. Audience-tiered manager inspection preserves operability without broad disclosure.

### QAD-119: Fluxer enforces common command invocation policies

The application-command framework provides server-enforced role, individual-user, and channel invocation controls in addition to native permission requirements. Fluxer applies these policies to discovery and rechecks them on submission before delivering an interaction to the application. Applications may impose stricter application-specific guards, but cannot bypass Fluxer policy or use those guards as a substitute for native action authorization.

**Rationale:** common policy can be enforced consistently before private command data leaves Fluxer, and current-state rechecking prevents stale picker results from authorizing. Applications remain free to narrow behavior but cannot weaken the community's platform gate.

### QAD-120: Communities may broaden developer-default invocation policy

Developer-declared invocation permissions establish a command's initial community policy rather than an immutable maximum. The community owner and members with `Administrator` or `Manage Guild` may narrow or broaden local role, user, and channel invocation access. They cannot override developer disablement or targeting, execution-mode enforcement, native operation permissions and hierarchy, or application-internal guards that only restrict behavior further.

**Rationale:** communities own who may use installed functionality in their spaces, but they do not own developer availability or Fluxer's execution safety boundary. Separating configurable defaults from hard gates gives local control without manufacturing authority.

### QAD-121: Individual invocation rules override conflicting role rules

An explicit allow or deny for the invoking user takes precedence over role-based audience rules. Without an individual rule, any matching explicit role deny wins over matching role allows; when no role rule matches, Fluxer uses the command's effective community/default audience. This supports deliberate per-user exceptions while resolving multi-role conflicts deterministically and conservatively.

**Rationale:** explicit per-user intent is the most specific audience rule, deny-overrides across roles prevents an additional role from accidentally restoring blocked access, and an independent channel gate ensures audience exceptions cannot escape location constraints.

### QAD-122: Audience and channel invocation policy are independent gates

Command invocation requires both the effective user/role audience policy and the effective channel policy to allow the request. A user-specific audience allow does not bypass a channel restriction. This keeps `who may invoke` separate from `where invocation is allowed` and makes policy evaluation and audit explanations predictable.

**Rationale:** explicit per-user intent is the most specific audience rule, deny-overrides across roles prevents an additional role from accidentally restoring blocked access, and an independent channel gate ensures audience exceptions cannot escape location constraints.

### QAD-123: Owners and Administrators bypass community invocation restrictions

The community owner and members with `Administrator` bypass community-defined user, role, and channel invocation restrictions. `Manage Guild` authorizes configuration but does not itself bypass the configured policy. No community principal bypasses developer disablement or targeting, application or installation suspension, or final server-enforced execution permission and hierarchy checks.

When the bypass changes the result, Fluxer's server-owned UI explains that owner/Administrator status allowed the invocation and the access-controlled interaction trace records the policy version and safe bypass reason. Applications cannot assert that reason, and invoking a command does not create a new guild audit event solely for this bypass; any resulting native effect follows its ordinary application audit contract.

**Rationale:** owner/Administrator are existing broad community authorities, while `Manage Guild` is configuration power rather than permission to perform every protected action. For example, an Administrator may invoke a command when an ordinary role/channel rule excludes them, but still cannot use a native role action that fails current hierarchy or bot permission checks. Keeping developer, suspension, and final execution checks absolute prevents management status from becoming a cross-boundary bypass.

### QAD-124: Invocation policy and application behavior configuration have separate owners

Fluxer community settings own generic command invocation policy such as eligible users, roles, channels, and native permission requirements. Application-specific behavior configuration—such as a logging destination, ticket category, subscription state, workflow thresholds, or bot-internal staff groups—remains application-owned by default. The later opt-in declarative administration framework may provide native configuration for declared settings under its own persistence contract. Bots may continue exposing undeclared settings through commands or external dashboards, and their internal guards may only restrict behavior beyond Fluxer policy.

**Rationale:** Fluxer can enforce generic access before delivery, but it cannot safely interpret arbitrary application behavior or external state. The opt-in declarative contract creates an explicit typed ownership boundary instead of absorbing private bot configuration implicitly.

### QAD-125: The master plan includes declarative application administration

Fluxer's master plan includes a later native framework through which applications register safe declarative community-administration surfaces. The goal is to let standard per-community bot configuration and administrative actions work inside Fluxer without requiring a custom web dashboard. The framework grows in phases from typed settings, to repeatable groups and message templates, to explicit validated admin actions and richer builders such as role-selection setup. It does not execute arbitrary application HTML, JavaScript, scripts, or secrets, and does not promise to replace analytics, billing, cross-community management, external OAuth flows, or arbitrary custom web applications. Application backends remain responsible for bot-specific behavior.

**Rationale:** a bounded declarative grammar covers common configuration and setup work while keeping validation, authorization, and rendering inside Fluxer's security boundary. Phasing limits blast radius, and excluding executable or secret-bearing content avoids turning community settings into an application-controlled code or credential host.

### QAD-126: Fluxer is authoritative for declared application settings

For configuration keys an application opts into the declarative administration framework, Fluxer stores the authoritative per-community values, validates mutations, audits changes, and exposes reads and update events to the application. A bot credential alone cannot silently rewrite community-owned values; changes originate in authorized Fluxer UI or through an interaction carrying the actual authorized manager's identity. Application-owned operational data such as tickets, logs, analytics, and subscription records remains outside this settings store.

**Rationale:** one authoritative store prevents split-brain updates between Fluxer and an application dashboard, and it preserves manager ownership even when the application is offline or compromised. Keeping undeclared operational data application-owned avoids claiming authority over state Fluxer cannot interpret.

### QAD-127: Declarative settings have immutable application-scoped keys

Each declared setting has an immutable developer-defined key scoped to its application and separate from its mutable or localized label and description. Fluxer associates community values and audit history with that key. Removing a key makes its retained values dormant rather than reassigning them by label or declaration order.

**Rationale:** labels and order are presentation and routinely change; binding values to them could silently retarget configuration. Immutable application-scoped keys preserve identity through localization, reordering, and temporary removal without requiring a global namespace.

### QAD-128: A declarative setting key cannot change value type

The fundamental value type associated with an existing setting key is immutable. Changing from a channel reference to text, for example, requires a new key rather than coercing or reinterpreting community-owned values. A future explicit migration facility may assist with compatible moves, but type mutation is not part of ordinary schema updates.

**Rationale:** implicit coercion can change meaning, lose data, or create unsafe references without manager review. A new key makes the ownership and migration boundary visible and leaves any future conversion workflow subject to an explicit contract.

### QAD-129: Declarative application settings survive uninstall dormantly

Uninstall immediately revokes the application's access to Fluxer-owned declared configuration but retains the community values in a dormant state. Reinstalling the same application restores values for matching stable setting keys. Authorized community managers may explicitly reset or delete retained configuration; permanent deletion of the application or community removes it.

**Rationale:** uninstall is an authority change, not clear evidence that community managers intend data deletion. Immediate access revocation protects the community, while dormant retention supports deliberate reinstall and keeps deletion with the manager or owning-resource lifecycle.

### QAD-130: Uninstall leaves bot-managed messages visible but inert

Uninstall does not erase existing bot-authored or bot-managed message content, but every application-owned interactive control becomes inert and indicates that the application is unavailable. Reinstall does not silently restore control authority. The application must explicitly reconcile current configuration, permissions, targets, and message versions before reactivating or replacing an old panel.

**Rationale:** preserving authored content avoids surprising history loss, while inert controls prevent an old message or component version from regaining authority after an uninstall/generation change. Explicit reconciliation makes replacement and partial failure observable.

### QAD-131: Declarative application settings are manager-only

Only the community owner and members with `Administrator` or `Manage Guild` may see or modify an installed application's declarative settings panel. `Manage Roles`, application-internal administrator groups, ordinary community roles, and per-setting user or role delegation do not grant access. The application may read its declared configuration through its authenticated backend contract but cannot choose who receives community settings-panel access.

**Rationale:** these are Fluxer-owned community settings, so access should follow the existing Integrations administration boundary rather than application-defined roles that the application may influence. This keeps configuration authority distinct from role-management or bot-internal membership.

### QAD-132: Declared settings persist independently of application availability

Fluxer validates, versions, audits, and saves declarative setting changes even when the application is offline, then reliably exposes the latest version through update delivery and authenticated reads so the application can reconcile after reconnecting. The manager UI distinguishes Fluxer persistence, application synchronization, and offline status. Saving configuration does not falsely claim that the application has already applied it.

**Rationale:** the application transport is not the transaction owner for manager-owned state. Separating durable save from delivery preserves intent during outages while truthful synchronization status and full-state reconciliation prevent a successful save from being misrepresented as already applied externally.

### QAD-133: Offline application actions are disabled and never queued

Application-handled declarative admin actions are visibly disabled with an explanation while the application is known to be offline or unhealthy. Fluxer does not queue them for later execution. If availability changes after rendering or submission, the action terminates with an immediate error and requires a fresh manager retry, preserving current intent and preventing delayed or duplicate side effects.

**Rationale:** an administrative action may become unsafe or unwanted as permissions and resources change. Requiring fresh intent avoids executing opaque effects long after their preview and authorization context, while immediate failure is easier to understand and recover from.

### QAD-134: Deleted setting references become invalid rather than retargeted

When a declared setting references a channel, role, user, message, or other community resource that is later deleted or becomes inaccessible, Fluxer preserves the setting key but marks its value as needing attention. It never substitutes another resource. Fluxer notifies the application and authorized community managers, and disables dependent admin actions until the value is corrected.

**Rationale:** a replacement resource may have different audience, permissions, or meaning, so substitution can redirect privileged effects. Preserving the invalid reference makes the failure diagnosable without pretending the old target still exists or discarding manager intent.

### QAD-135: Responsive web is in scope; the separate Flutter client is not

The in-repository React application implements responsive web layouts, including narrow-viewport experiences, and command, settings, message, and interaction UI work must remain responsive there. The separate Flutter/native mobile client is outside this workspace and receives no implementation changes in these PR stacks. Public protocol design remains client-neutral and capability-versioned so later Flutter support does not require replacing the contracts.

**Rationale:** the tracked repository owns and tests responsive React layouts but contains no Flutter implementation to change or validate. Client-neutral contracts and negotiated fallback let the external native client adopt later without weakening the in-scope web experience.

### QAD-136: Manage Roles may edit only non-authoritative managed-role presentation

Members with `Manage Roles` may edit a managed bot role's name, color, icon or Unicode emoji, hoist/display-separately state, and mentionable state. Changing its permissions or hierarchy position requires the community owner or `Administrator`; `Manage Guild` is not sufficient. Role membership and deletion remain controlled by the application installation lifecycle and are not manually editable. The UI must distinguish these restrictions and explain why neither `Manage Roles` nor `Manage Guild` alone can change a bot's authority or position.

**Rationale:** the approved presentation fields cannot enlarge bot permissions, hierarchy reach, managed membership, or lifecycle ownership, so existing role-management UX can remain useful. Naming the field classes and denial reason prevents `Manage Roles` or `Manage Guild` users from mistaking visible role controls for bot-authority access.

### QAD-137: Unsupported interaction UI degrades to inert attributed content

An older or otherwise unsupported client renders every message field it understands and presents unknown rich containers or components as static fallback content carrying the application's identity. Unsupported controls are inert and explain that Fluxer must be updated to interact. A client must never drop the whole message, expose raw component payloads, reinterpret an unknown control as another action, or invoke it. Clients without application-command support cannot discover or invoke application commands.

**Rationale:** attributed static fallback preserves comprehension without asking an old client to guess executable semantics. Keeping unknown controls inert prevents malformed display, raw-data leakage, and actions the client cannot safely represent.

### QAD-138: Protocol majors handle breakage while capabilities handle extensions

Fluxer retains explicit major versions on its REST and Gateway contracts. Breaking wire changes require a new major version with a documented overlap period; additive optional fields do not. Clients and applications advertise supported interaction and component capabilities, and Fluxer sends interactive shapes only when the recipient negotiated the required capabilities. Otherwise it uses the defined inert fallback. Unknown or omitted capabilities are never assumed to be supported.

**Rationale:** majors make incompatible parsing explicit, while capabilities avoid a new major for every additive feature. Negotiated intersection and inert fallback ensure neither side sends active semantics the other cannot understand.

### QAD-139: Instances do not expose a global application-interaction switch

Fluxer does not provide an instance-operator setting that turns off the entire application interaction system while leaving ordinary bots enabled. Deployments may still use internal rollout controls during development and release, and instance safety tooling may target a specific application or installation, but there is no permanent product-level global off switch for slash commands, components, or interaction delivery.

**Rationale:** a permanent global product switch is broader than the application/community incidents it would normally address and risks becoming an unaudited availability control. Narrow suspension and private, removable rollout gates preserve incident and deployment response without changing every unaffected application's product behavior.

### QAD-140: Instance administrators may suspend a targeted application scope

Instance administrators may immediately and reversibly suspend either one application's installation in one community or the application across the entire instance. This is a targeted trust-and-safety and incident-response control for malicious, compromised, or otherwise unsafe applications, not a substitute for a global interaction-system switch. The exact blocked operations, retained state, notification, audit, and reinstatement behavior are defined separately.

**Rationale:** community scope contains harm without disrupting unrelated installations, while application scope closes every installation when the credential or developer is compromised. A reversible, audited overlay is faster and less destructive than deleting durable state during an investigation.

### QAD-141: Suspension blocks all targeted application authority but preserves state

Suspending an installation stops delivery of that community's events and interactions to the application and causes every bot API action targeting that community to be rejected. Commands are hidden from ordinary users and shown to authorized managers as suspended by the instance; existing components become inert. Outstanding response tokens and delegated authority are permanently invalidated. Messages, declared settings, managed roles, installation records, and audit history remain stored, and community managers cannot override the suspension. Application-wide suspension applies these effects to every installation on the instance. Lifting suspension permits only new activity; revoked authority never becomes valid again.

**Rationale:** hiding UI alone leaves API, delivery, and previously delegated authority usable, so suspension must be one server-side authorization overlay across every path. Preserving state and evidence supports investigation and safe reconciliation, while permanently invalidating prior authority prevents lifting the overlay from resurrecting stale capabilities.

### QAD-142: Suspension preserves delivered ephemeral evidence

Ephemeral replies delivered before an application or installation is suspended remain visible to their recipient until normal expiry or account-wide dismissal. Fluxer marks them as originating from a suspended application and disables all controls. The application cannot edit them or send follow-ups after its response authority is revoked. Recipients retain the ability to report the content so suspension does not erase potential abuse evidence.

**Rationale:** immediate erasure can destroy user-visible incident evidence and reporting context, but leaving controls live would preserve application authority. Normal bounded retention plus an inert, platform-labeled view protects evidence without extending the ephemeral lifecycle.

### QAD-143: Interaction limits layer onto Fluxer's existing rate limiter

Interaction invocation is charged independently to the invoking user and the specific application installation. Application responses are charged to the installation, and every resulting native API operation is additionally charged to its actual acting identity under the ordinary endpoint and global limits; delegated authority never bypasses them. Applications may impose stricter internal limits but cannot raise Fluxer's limits. Enforcement extends the existing server-side leaky-bucket service and preserves its structured `429` response and retry headers rather than introducing a parallel limiter.

**Rationale:** the existing limiter already owns headers, enforcement, and operational behavior; a second system would produce conflicting budgets. Charging each scarce resource/actor prevents one user, app, or delegated path from shifting load onto another scope.

### QAD-144: Interaction limit budgets remain code-defined operational defaults

Interaction rate-limit budgets follow Fluxer's current model: route and global budgets are constants defined in the API code rather than ordinary instance-operator settings. Fluxer documents the shipped defaults for developers, but the numeric values are not permanent API guarantees and may change through a reviewed code release. Applications must respond to Fluxer's rate-limit headers and structured `429` results rather than hard-code budgets. The stable contract is the enforcement and feedback format, not a particular number.

**Rationale:** code review and tests keep security/resource defaults consistent across deployments, while response headers let clients adapt if measured tuning changes. Making every value an operator knob would fragment behavior and weaken predictable abuse protection.

### QAD-145: Material planning decisions must be anchored in current Fluxer behavior

Before locking each material bot-platform decision, inspect the relevant Fluxer implementation, schemas, tests, documentation, and, when needed, history. The durable question or accepted-decision record must include the relevant current Fluxer precedent and state whether the plan preserves, extends, replaces, or intentionally differs from it. Discord compatibility and UX are comparison points rather than authorities, and neither convention nor speculative greenfield design may replace codebase evidence.

**Rationale:** without repository evidence, a plan can mistake a proposed service for current behavior or break an existing contract; classification makes the migration cost and ownership change visible to implementers and reviewers.

### QAD-146: Interaction-token responses are exempt from the bot-global budget

Initial interaction callbacks, response reads, edits, deletes, and follow-up operations do not consume the authenticated bot user's global 50-requests-per-second budget. They remain subject to their own per-installation and per-interaction route buckets and lifecycle caps. Any separate native API operation initiated by the application remains subject to the ordinary limits of its actual bot or user actor. This extends Fluxer's existing treatment of webhook execution and webhook-message endpoints and preserves Discord-compatible interaction behavior.

**Rationale:** token-scoped responses have their own narrow audience and budgets and should not be starved by unrelated autonomous bot traffic. Per-interaction/installation limits still bound abuse, while separate native actions continue charging the actual bot/user resource they consume.

### QAD-147: Interaction-response endpoints ship with bounded default buckets

An interaction accepts exactly one initial response within its three-second acknowledgement deadline and at most five follow-up messages over its response lifetime. Response reads default to 60 per minute per interaction. Response edits and deletes share a default mutation bucket of 30 per minute per interaction. All interaction-response operations share an aggregate default of 50 per second per application installation. These code-defined operational defaults reuse Fluxer's existing webhook read and mutation budgets and its existing bot-global throughput baseline; applications must still follow returned rate-limit state because the numbers are not permanent API guarantees.

**Rationale:** the defaults reuse observed route scales while adding interaction/install scoping and a hard follow-up bound, so the new surface starts within known operational expectations. They remain code defaults advertised through rate-limit state, not immutable throughput promises.

### QAD-148: Interaction invocation defaults reuse current Fluxer bucket values

Slash-command and modal submissions default to 20 per 10 seconds per invoking user and application installation, following Fluxer's existing message and guild mutation buckets. Button and select interactions default to 30 per 10 seconds per user and installation, following the existing reaction bucket. Autocomplete defaults to 60 per 10 seconds per user and installation, following existing higher-frequency read and metadata buckets. All delivered interactions share an aggregate default of 500 per 10 seconds per installation, preserving the existing 50-requests-per-second throughput baseline at installation scope. These are code-defined operational defaults and remain subject to the rate-limit-header contract in QAD-144.

**Rationale:** different interaction classes have different expected frequency and cost, so reusing the closest current bucket avoids one arbitrary universal cap. The aggregate installation ceiling prevents many users from multiplying those per-user allowances into unbounded app load.

### QAD-149: Installations use explicit durable lifecycle states

Community application installation records use `DORMANT`, `INSTALLING`, `ACTIVE`, `ROLLING_BACK_INSTALL`, `INSTALL_CLEANUP_FAILED`, `UNINSTALLING`, and `UNINSTALL_FAILED`. `DORMANT` means the application is not installed while retained community configuration may still exist. Failure states expose incomplete cleanup for reconciliation rather than claiming atomic success. Targeted suspension is a separate orthogonal state dimension, and legacy bot memberships have no installation record rather than a `LEGACY` lifecycle state. This intentionally replaces the current OAuth flow's synchronous member creation, conditional ordinary-role creation, and assignment sequence, which has no durable lifecycle or rollback state.

**Rationale:** the states distinguish desired inactivity, forward work, usable authority, compensation, and two different cleanup failures, so retry direction is unambiguous. Keeping suspension separate avoids multiplying every lifecycle state, and absence accurately preserves unmanaged legacy membership.

### QAD-150: Installation lifecycle transitions never skip cleanup phases

A first install or reinstall moves from no record or `DORMANT` to `INSTALLING`, then to `ACTIVE` only after every required resource exists. A failed or cancelled install moves through `ROLLING_BACK_INSTALL` to `DORMANT`; incomplete rollback enters `INSTALL_CLEANUP_FAILED`, from which retry returns only to `ROLLING_BACK_INSTALL`. Uninstall moves `ACTIVE` through `UNINSTALLING` to `DORMANT`; incomplete uninstall enters `UNINSTALL_FAILED`, from which retry returns only to `UNINSTALLING`. Active reauthorization does not change lifecycle state. An uninstall request during `INSTALLING` requests rollback rather than starting a competing cleanup path. No direct state skipping is allowed. Permanent application deletion drives each non-dormant installation through its applicable cleanup path before deleting the record.

**Rationale:** every transition has one semantic direction and every failure resumes through the operation that owns its effects. That prevents a retry from treating partial rollback as uninstall, skipping verification, or creating a second installation during in-flight work.

### QAD-151: Installation transitions use database CAS plus an advisory distributed lock

Each installation record stores a monotonic `lifecycle_version` and the current `operation_id`. Every lifecycle transition conditionally updates the database only when the expected state and version still match. A renewable KV lock keyed by community and application reduces competing work but is not the correctness boundary; if its lease is lost, a stale worker's next conditional transition fails. A repeated request for the same operation returns that operation's current status. A conflicting operation returns `409 Conflict` rather than being silently queued. This extends Fluxer's current KV-lock pattern with durable conditional-write protection supported by its Cassandra/Postgres abstraction.

**Rationale:** leases can expire or be lost while a worker continues, whereas database CAS rejects its stale transition at the source of truth. Stable operation IDs make retries idempotent and explicit conflicts avoid executing a different lifecycle request under the caller's old assumptions.

### QAD-152: A dedicated application-installation domain owns orchestration

Fluxer adds `fluxer_api/src/api/application_installation/` as the installation domain. `ApplicationInstallationService` is the sole owner of installation lifecycle transitions and orchestration, and `ApplicationInstallationRepository` exclusively persists installation state. OAuth consent validates authorization and delegates installation; community uninstall, application deletion, suspension, and reconciliation also delegate rather than duplicating lifecycle logic. Existing guild member and role services continue owning their individual resource operations. Worker tasks invoke the same domain service. This intentionally replaces the current `OAuth2RequestService` ownership of cross-domain member, role, and assignment side effects.

**Rationale:** one domain owner can enforce the state machine and effect ledger across every entry point, while existing guild services continue enforcing local member/role invariants. Duplicating orchestration in OAuth, deletion, and workers would create divergent transition and retry rules.

### QAD-153: Installation success remains synchronous and never finishes after reported failure

OAuth consent reports successful installation only after the installation reaches `ACTIVE`; it does not return `202 Accepted` or present success while the record remains `INSTALLING`. A request failure, deadline expiry, or abandoned stale `INSTALLING` operation moves into install rollback rather than allowing a background worker to complete installation later. Rollback cleanup may continue asynchronously when it cannot finish inside the request. This preserves the current consent flow's synchronous success semantics while adding durable failure recovery and prevents a bot from appearing after the user was shown an installation failure.

**Rationale:** callers can rely on success meaning the complete authority relationship exists, while failure never schedules surprising later activation. Allowing only cleanup to continue asynchronously preserves truthful user feedback without abandoning leaked resources.

### QAD-154: Installation forward work and rollback use bounded synchronous deadlines

Forward installation work has 15 seconds to reach `ACTIVE`. At that deadline a live request transitions to rollback and reports failure. The request may attempt rollback until 25 seconds. Any record still `INSTALLING` 30 seconds after creation is abandoned and reconciliation transitions it to rollback rather than completing forward work. These are selected initial code defaults for a bounded synchronous OAuth experience, not values derived from Fluxer's app proxy or a universal internal-RPC timeout; implementation telemetry may justify a separately reviewed change.

**Rationale:** callers need a prompt, truthful distinction between complete installation and failure, while cleanup may continue safely after the response. Fifteen seconds bounds forward work, the interval through 25 seconds permits one synchronous compensation pass, and the 30-second stale threshold gives reconciliation a deterministic point after which a lost request can never produce surprising late activation. Explicit defaults are testable and reviewable; presenting unrelated transport settings as their source would make the contract accidental and false.

### QAD-155: Cleanup reconciliation uses a jittered 25-attempt schedule

The synchronous cleanup attempt is attempt one. Subsequent installation rollback or uninstall cleanup retries run after 5 seconds, 30 seconds, 2 minutes, 10 minutes, 1 hour, 6 hours, and 24 hours, then every 24 hours until 25 total attempts. Each delay receives up to plus or minus 20 percent jitter to avoid synchronized retry waves. The installation row remains the authoritative retry state rather than relying on a worker message. After attempt 25, automatic retries stop, the failure remains visible, and alerting plus an explicit manual retry are required. This preserves Fluxer's current lifecycle-worker ceiling of 25 deliveries while replacing its generic fixed five-second retry behavior for persistent installation cleanup failures.

**Rationale:** rapid early retries recover transient failures, increasing delays limit sustained load, jitter avoids synchronized storms, and the existing 25-attempt ceiling bounds automation. Keeping failure visible after exhaustion avoids both silent abandonment and an unbounded retry loop.

### QAD-156: Installation cleanup recovery is permission-scoped and state-machine-owned

The community owner and members with `Administrator` or `Manage Guild` can see an installation cleanup failure in Community Settings -> Integrations and request cleanup retry. Instance administrators receive a dedicated installation-recovery ACL for inspecting and retrying any installation. Application developers receive no recovery authority merely from application ownership; they need the applicable community or instance permission. Community-facing errors are sanitized, while authorized instance administrators may receive safe diagnostic identifiers and internal details. Every retry goes through `ApplicationInstallationService`, its lifecycle lock, and database compare-and-set transitions. No interface permits direct state editing, cleanup skipping, false success, or deletion of the recovery record. This extends Fluxer's existing ACL-separated job inspection/cancellation model; the current generic `retryDeadLetterJob` implementation is a nonfunctional stub and is not used as an alternate installation lifecycle owner.

**Rationale:** community managers own the affected resources, while instance operators need narrowly granted cross-community diagnostics; application ownership does not confer guild recovery authority. Domain retries preserve invariants, and sanitized/error-tiered views avoid exposing internal or cross-tenant data.

### QAD-157: Manual cleanup recovery opens a new bounded cycle

Selecting `Retry cleanup` on a terminal installation failure increments a persisted `recovery_cycle`, preserves the lifetime attempt history, performs an immediate attempt, and then follows the same bounded 25-attempt backoff schedule as automatic reconciliation. The action is disabled while a recovery cycle is active. Exhausting the new cycle returns the installation to its visible terminal failure state. Starting a new cycle is limited to once per installation every five minutes, and repeated requests carrying the active operation ID are idempotent. This retains Fluxer's bounded-attempt worker precedent while avoiding a requirement that an authorized manager manually trigger every cleanup attempt.

**Rationale:** a fresh bounded cycle gives an authorized operator useful recovery without erasing evidence or creating an infinite loop. The persisted counter, cooldown, and active-operation idempotency make repeated clicks and concurrent operators observable and abuse-resistant.

### QAD-158: Installation effects converge on owned state under deterministic identities

Install, rollback, and uninstall retries do not replay ordinary blind create/delete calls. Each lifecycle effect has a durable identity derived from the community, application, lifecycle generation, and effect type. The managed-role ID is allocated and persisted before role creation, and no retry generates another. Repeated creation or assignment verifies the expected installation-owned resource and succeeds without duplicating it; cleanup treats an already-absent resource as success only when the expected owned resource is being reconciled. An ownership mismatch is a hard failure and never permits overwrite or deletion. Audit and Gateway emissions carry the deterministic effect identity for deduplication. Installation-specific effect records preserve progress and results. This extends existing no-op behavior for existing members and role assignments while replacing fresh-ID role retries, missing-resource deletion failures, and non-durable secondary-effect delivery for this lifecycle.

**Rationale:** retries after crashes must distinguish “already completed by this operation” from “conflicting resource owned elsewhere.” Preallocated IDs and durable effects make resource writes and duplicate emissions converge without guessing from mutable names or allocating replacements.

### QAD-159: `ACTIVE` is the sole installation authority gate

Only an installation whose lifecycle state is `ACTIVE` and which is not suspended grants the application any community-scoped authority. `INSTALLING` resources may be created only by Fluxer's internal lifecycle service and are unavailable to the bot. The successful compare-and-set transition into `ACTIVE` enables command discovery and invocation, interaction and Gateway delivery, application access to declared community settings, and bot API operations targeting that community. Leaving `ACTIVE` for uninstall first blocks all such operations and permanently revokes outstanding interaction tokens and delegated capabilities before resource cleanup begins. `DORMANT` and all rollback, uninstall, and cleanup-failure states grant no authority. The application bot token remains valid for its other active installations, and legacy bot memberships without installation records retain current membership-and-permission behavior until explicitly removed and reinstalled.

**Rationale:** resource presence can be partial or stale, but the successful guarded transition proves all installation invariants. Checking both lifecycle and suspension on every scoped path prevents partial work from authorizing and limits revocation to the affected community.

### QAD-160: Managed-role creation precedes bot membership and activation

After conditionally claiming `INSTALLING`, the lifecycle operation persists its generation, operation ID, newly allocated managed-role ID, and approved initial permissions. It then creates or verifies that managed role, adds or verifies the bot member, assigns or verifies the managed role, and re-reads every ownership and resource invariant. Only then may it conditionally transition to `ACTIVE`. Any earlier failure enters rollback. This intentionally reverses the current member-before-optional-role OAuth sequence: role-capacity and role-creation failures occur before adding the bot, every managed installation receives its role, and no installation becomes active without its owned role and assignment.

**Rationale:** claiming identity before side effects makes every retry address the same resources, and creating the mandatory role first fails early on role capacity before adding a visible bot. Final reread plus CAS ensures activation reflects observed resources, not merely successful calls.

### QAD-161: Install rollback attempts every safe cleanup effect before verification

After entering `ROLLING_BACK_INSTALL`, each cleanup pass idempotently attempts to remove the managed-role assignment, remove the installation-owned bot membership, and delete the installation-owned managed role, in that security-reducing order. A failure in an earlier effect is recorded but does not prevent later independently safe cleanup effects in the same pass. The operation then verifies that the bot member and managed role are absent and that lifecycle effects are settled. Only complete verification permits transition to `DORMANT`; otherwise the operation remains retryable or enters `INSTALL_CLEANUP_FAILED` according to its attempt state. Dormant community configuration and lifecycle history are preserved.

**Rationale:** detachment and member removal reduce usable authority before deleting the role, and independent safe effects should still run when one cleanup step fails. Ownership checks and final verification prevent compensation from deleting unrelated resources or declaring success on a partial cleanup.

### QAD-162: Uninstall revokes authority before attempting complete cleanup

An authorized uninstall conditionally transitions `ACTIVE` to `UNINSTALLING` and immediately blocks the installation's API, Gateway, command, interaction, and settings authority while permanently revoking its outstanding response tokens and delegated capabilities. Each cleanup pass then attempts managed-role detachment, installation-owned bot-member removal, and installation-owned managed-role deletion without allowing one independently safe failure to suppress later effects. It verifies resource absence, stopped delivery, and revoked authority before transitioning to `DORMANT`; otherwise it remains retryable or enters `UNINSTALL_FAILED`. Retained dormant community configuration is not modified by uninstall.

**Rationale:** revocation at the state transition closes the security boundary even if physical cleanup is slow or partly fails. Continuing independently safe owned effects and verifying the terminal state makes uninstall convergent without pretending cross-resource atomicity.

### QAD-163: Interaction resources use Snowflakes while authored selectors remain strings

Fluxer allocates Snowflakes for interactions and every response message, serializing them as decimal strings on REST/Gateway payloads under the existing Snowflake contract. Public bot-managed messages remain ordinary messages and therefore have no second bot-message ID. An ephemeral response also receives a message Snowflake but lives in recipient-scoped ephemeral storage rather than a channel partition. Applications supply immutable command keys and component `custom_id` strings; these are selectors, not globally unique resource IDs. A rendered component instance is addressed by application, response/public message ID, message version, and component path or `custom_id`, so Fluxer does not invent a separate component-instance Snowflake. Delivery attempts reuse the interaction ID and increment only an internal attempt number.

**Rationale:** it assigns first-class IDs only to durable resources, binds reusable developer selectors to immutable message identity/version, and uses a secret type for bearer authority. That follows existing type boundaries while preventing stale controls or reused labels from retargeting an action.

### QAD-164: Response authority uses opaque non-reusable tokens and versioned composites

An interaction response token is an application-audience-bound, 32-random-byte base64url bearer secret whose hash, not plaintext, is retained server-side for the approved 15-minute authority window. It is not a Snowflake and is never exposed through ordinary message or audit payloads. Component submissions carry the source message ID and expected message version, extending the message row's existing integer version field with the F1 concurrency-safe compare-and-set contract; the current read-then-unconditional-patch helper is not monotonic under concurrent/stale writers. Public Snowflakes and response tokens are never reused after deletion or expiry. Component `custom_id` values may be reused in another message or later message version because message identity/version disambiguates them; a stale version is rejected rather than retargeted. Command-key and application-handle tombstone behavior remains governed by their dedicated lifecycle policies.

**Rationale:** it assigns first-class IDs only to durable resources, binds reusable developer selectors to immutable message identity/version, and uses a secret type for bearer authority. That follows existing type boundaries while preventing stale controls or reused labels from retargeting an action.

### QAD-165: Command persistence is query-first with immutable publication heads

Command storage follows Fluxer's generated `defineTable` and denormalized query-table conventions rather than database secondary indexes. Stable command Snowflakes are uniquely mapped from immutable application-scoped developer keys. Command definitions, manifest revisions, and manifest entries are immutable; publication writes the complete candidate and then compare-and-sets one application manifest head, so readers cannot observe partial publication. One versioned application draft is optional. Community targeting has command-to-guild and guild-to-command query tables. Community configuration is partitioned by community and application and remains dormant. Account-wide favorites/hiding, explicit global and community duplicate-provider choices, existing user/user-guild alias-presentation settings, and community-scoped argument-free usage rows are stored according to their approved scopes. Source/index repair belongs to the command repository and a reconciler. The exact table fields and access paths are fixed in `Research/QAD/specs/command-persistence.md`.

**Rationale:** the tables match known read directions and put source/index repair under one repository owner, following Fluxer's storage conventions. Immutable candidates plus one conditional head make publication atomic to readers and support recovery without mutating history.

### QAD-166: Initial command limits preserve Discord parity with serialized safety caps

Fluxer initially supports 100 chat-input commands per application; 1-32-character developer names and community aliases; 1-100-character descriptions; 25 sibling options and choices; subcommand-group/subcommand/value-option nesting only; 6000-character string values; and Discord-compatible numeric and aggregate 8000-character command-text limits. Immutable developer keys use 1-64 normalized ASCII key characters. Because complete locale dictionaries can exceed the compatibility text calculation, a canonical command definition is additionally capped at 512 KiB UTF-8 and a complete manifest or draft at 8 MiB and 100 commands. Availability-target mutations accept 1000 communities per idempotent page. These remain reviewed code constants. Exact grammar and values are in `specs/command-schema-limits-and-localization.md`.

**Rationale:** preserving familiar semantic limits supports compatible clients, while explicit byte caps bound locale and canonical-serialization amplification that character counts alone miss. Central constants and paged targeting make enforcement testable and operationally bounded.

### QAD-167: Application localizations are validated data with exact-locale fallback

Applications, not Fluxer's platform translation catalogs, own command/option/choice localizations. Keys must be current `AllLocales` values, every localized value independently passes the default field's constraints, and the mandatory default field is the only fallback when the account's exact locale is absent. Publication rejects effective name collisions for each supplied locale. Localization-only publication creates immutable metadata history without incrementing structural schema version or invalidating an in-progress form. Search indexes localized and default text while retaining default-name discoverability. This preserves Fluxer's centralized locale registry and extends it to validated application content.

**Rationale:** one existing locale registry prevents unsupported tags and inconsistent fallback, while keeping application strings outside Lingui preserves content ownership. Effective-name collision checks ensure localization cannot create ambiguous invocation in any supported locale.

### QAD-168: Native commands enter discovery through an adapter, not application persistence

Fluxer's existing built-in commands remain code-owned native features and are never stored as fake application commands or governed by community application policy. The client introduces a typed common discovery-entry union whose native provider wraps the existing localized definitions and handlers while the application provider supplies server registry entries. Native permission/context checks remain picker hints; existing REST services continue authoritative authorization and hierarchy checks. Local transforms, native API actions, native media pickers, and client system messages retain their behavior. Name collisions are attributed provider choices and never dispatch by name alone. The staged adapter and parity requirements are fixed in `specs/native-command-adapter.md`.

**Rationale:** a shared typed discovery shape gives users one picker without moving trusted native handlers or authorization into third-party storage. Provider identity and structured selection prevent a same-name application command from intercepting native behavior.

### QAD-169: Discord command endpoints publish immutable Fluxer manifests

Fluxer supports the standard application-wide and guild application-command GET/POST/PUT/GET-by-ID/PATCH/DELETE paths for chat-input commands. Application-wide writes publish the one application-wide schema. Guild paths are compatibility views that change targeting only: an identical definition may target the guild, but a divergent schema is rejected rather than creating a per-guild fork. Fluxer adds an optional immutable `key`; compatibility requests without one derive it from the initial name. Each apparently immediate mutation builds a complete candidate, writes immutable revisions/entries, and compare-and-sets one manifest head before returning. Delete makes the command dormant and preserves key/configuration. Exact endpoint and identity mapping is in `specs/command-registration-api.md`.

**Rationale:** mapping familiar routes onto one canonical manifest preserves developer migration while rejecting per-guild schema divergence that would break stable identity. Complete publication through a conditional head ensures even compatibility writes cannot expose partial state.

### QAD-170: Schema evolution maps only stable, same-type, currently valid values

Every command field has an immutable parent-scoped key, derived from its initial name only for compatibility clients that omit it. All publications increment command revision; input-shape or validation changes increment schema version; authority changes independently increment authority revision. A stale submission is never delivered or silently rewritten. Fluxer returns the current schema and structural diff, and the client retains only values with the same keyed path and type that still pass current validation, visibly clearing invalid/removed values before explicit resubmission. Metadata-only text/order changes do not invalidate forms. Compatible versus value-dropping changes and mapping are fixed in `specs/command-schema-evolution.md`.

**Rationale:** separate revisions invalidate only the assumptions that changed, reducing needless disruption. Stable keys and same-type revalidation preserve safe input, while visible clearing and explicit resubmission prevent stale values from being coerced into a different command meaning.

### QAD-171: Command failures extend Fluxer's structured error envelope

Command and manifest failures retain Fluxer's `{code, message, ...typed_data}` contract and path-level validation errors. Stable codes distinguish unknown identity, key/name/alias/schema collisions, stale schema, manifest/draft CAS conflict, unsupported type/context, developer/community disablement, targeting, approval pending, inactive/suspended installation, and existing missing-permission/rate-limit outcomes. Sensitive targeting, authority, and suspension details are returned only to their authorized developer/manager/operator audiences. User hiding creates no server error. The status/code/data matrix is fixed in `specs/command-errors-and-rate-limits.md`.

**Rationale:** extending the existing envelope gives clients stable recovery instructions without leaking hidden targeting or suspension state. Reusing proven route-budget scales preserves operational expectations, while stricter publication/identity limits bound expensive validation and churn.

### QAD-172: Command registry limits reuse developer and guild mutation precedents

Command reads default to 60/minute per actor/application; immediate publication and draft edits/validation to 30/minute per application; draft/recovery publication and target pages to 10/minute; new stable command identities to 200/day; and community configuration to the existing 20/10-second guild mutation baseline. Autocomplete retains QAD-148's 60/10-second user/installation limit, at most 25 suggestions, and a 64 KiB response. Bot registration also consumes the ordinary bot-global budget. These are code constants with existing `429` feedback, and invalid/idempotent requests consume route tokens. Exact buckets are in `specs/command-errors-and-rate-limits.md`.

**Rationale:** extending the existing envelope gives clients stable recovery instructions without leaking hidden targeting or suspension state. Reusing proven route-budget scales preserves operational expectations, while stricter publication/identity limits bound expensive validation and churn.

### QAD-173: Picker search and ordering are identity-bound and deterministically cached

The command picker searches effective/original/alias/localized names, descriptions, application names/handles, and qualified forms using normalized comparison while preserving display text. Relevance leads; explicit provider preference, favorites, community usage, locale, lexical provider data, and command Snowflake provide deterministic ties. Results paginate by 50, support application filtering and manager/user unavailable/hidden toggles, and cache against catalog, permission, locale, and preference versions with targeted Gateway invalidation. Selection always binds stable identity and stale catalogs refresh without invocation. Existing listbox, keyboard, IME, and focus behavior is preserved and expanded with complete accessible provider/state labels. Exact behavior is in `specs/command-picker-and-settings-ui.md`.

**Rationale:** explicit deterministic ranking and tie-breaks prevent result reshuffling or implicit dispatch, versioned cache keys prevent stale availability, and reusing proven listbox/IME mechanics protects keyboard and assistive-technology behavior while discovery expands.

### QAD-174: Community command administration extends the existing Integrations area

Owner, `Administrator`, and `Manage Guild` receive an Integrations application detail with Overview, Commands, declarative Configuration, and Activity. The command table exposes effective/original identity, layered availability, targeting, authority, approval, aliases, restrictions, and dormant state. Per-command and bulk enable/disable/reset operations preserve developer disablement and approval gates; reset and authority application require explicit summaries/confirmation. Configuration changes use versions and produce linked parent/detail audit records without invocation arguments. Native commands remain outside application administration. Exact screens and operations are in `specs/command-picker-and-settings-ui.md`.

**Rationale:** the existing Integrations boundary is where authorized managers already expect application controls. Layered state, confirmations, CAS feedback, and linked audit make high-impact changes reviewable without creating a separate authorization or navigation system.

### QAD-175: Command manifests type invocation defaults separately from execution authority

The Discord-compatible command object retains `default_member_permissions`, guild-only `contexts` and `integration_types`, and `nsfw`. Fluxer adds an immutable command key, `execution_mode`, a sorted allowlist of registered native operations, a typed default invocation policy, and an independently versioned authority revision/hash. The compatibility permission field aliases the typed required-permissions value and conflicting values are rejected. Allowed operations form a community-reviewed ceiling rather than endpoint authorization. Any authority-field change creates a new authority revision and follows the accepted review rules. This extends Fluxer's bigint permission registry and Discord-shaped command contract without trusting application labels or presentation JSON. Exact fields are in `specs/command-authority-manifest.md`.

**Rationale:** discovery defaults and executable authority answer different questions and therefore need separate typed fields and revisions. Agreement checks avoid ambiguous aliases, and an authority hash lets interactions/reviews detect any material grant change before execution.

### QAD-176: Delivered permission snapshots are server-derived convenience data only

An interaction may include the server-captured guild/channel, effective invoker and application permission bitfields, current role IDs, capture time, and command authority revision/hash. The payload is explicitly marked non-authoritative and cannot be supplied or modified by the application. Every native action re-fetches current installation, suspension, actor, permission, hierarchy, target, capability, and operation-approval state. Discord-shaped `member.permissions` and `app_permissions` may mirror the bitfields for compatibility. This preserves Fluxer's current server-side effective-permission calculation while preventing stale delivery context from becoming authority.

**Rationale:** the snapshot helps an application render useful behavior without trusting application-computed permissions, but roles and hierarchy can change immediately afterward. Mandatory execution-time lookup preserves the current native services as the only authorization boundary.

### QAD-177: Application causality is first-class guild audit data

Guild audit rows gain typed attribution for the actor, invoker, application, bot, command or hashed component key, interaction, authority mode, non-secret capability record, native operation, confirmation, result, causation parent, and sequence. Existing action types, target, reason, options, changes, and actor indexes remain. New denormalized query tables support application, application-command, interaction, and causation-chain access. Retryable effects preallocate their audit identity so replay cannot create duplicate entries. This extends Fluxer's current query-first audit schema rather than placing security attribution in free-form options. Exact columns and indexes are in `specs/application-audit-contract.md`.

**Rationale:** recording only the bot or user loses who requested, delivered, and authorized an interaction-mediated effect. Typed causal fields and deterministic IDs make retries deduplicate while preserving existing action semantics and query ownership.

### QAD-178: Application audits retain only allowlisted security facts for Fluxer's existing 45-day window

Guild audit storage never receives raw command/form/component values, message or attachment content, callback payloads, private URLs, bearer material, signatures, headers, secrets, or raw component `custom_id`. Native operation definitions, not applications, emit only normalized endpoint-specific facts needed to explain authorization and effects. Audit rows retain Fluxer's current 45-day TTL. Guild audit visibility continues to require owner, `Administrator`, or `View Audit Log`; `Manage Guild` alone sees only application installation/command/configuration activity it may manage. Application ownership grants delivery traces but no guild audit data, and instance access continues to require `guild:audit_log:view`.

**Rationale:** causal accountability needs stable security facts, not arbitrary user/application content. Reusing the current TTL and audience boundaries limits new privacy exposure, and separating management from moderation visibility prevents broader application access from leaking guild evidence.

### QAD-179: Partial and compensating actions form an append-only causal audit chain

A structured native request receives one causation ID. Every independently committed native effect retains its ordinary audit action and a sequence, followed by a normalized `SUCCEEDED`, `FAILED`, or `PARTIAL` summary. Compensation and reconciliation append linked `COMPENSATED` or `COMPENSATION_FAILED` records instead of rewriting history. Existing audit batching/compaction may summarize only rows without application/interaction/causation/effect linkage; it never deletes or replaces a causal-chain row. Pre-effect validation failures normally remain interaction metrics unless an operation explicitly classifies a confirmed attempt as security-relevant. This preserves existing native action history while making partial failure and recovery truthful and groupable.

**Rationale:** independent effects can commit before a later failure, so rewriting history to one success/failure would be false. Append-only grouping preserves what actually happened, its order, and any later compensation without claiming cross-service atomicity.

### QAD-180: Delegated capabilities are opaque, exact, single-use broker records

Delegated native actions exist only through a structured broker authenticated by both the application bot and an application/community/generation-bound interaction credential; no standalone installation ID is introduced. The server derives the invoker and persists the exact registered operation, normalized parameters/hash, source identity and authority revision, absolute expiry, installation generation, confirmation state, idempotency key, result, and causal audit identity. It uses an opaque 32-byte secret hashed at rest rather than a self-contained signed claim. Conditional consumption ownership plus deterministic native-effect identity prevents replay; retries return or resume the same durable result. Confirmation directly claims the exact pending action rather than issuing reusable user authority. Execution revalidates current installation, approval, actor permissions/hierarchy, target, intent, endpoint constraints, and rate limits. Uninstall, suspension, generation change, authority change, denial, and expiry permanently invalidate old authority. Exact storage and transitions are in `specs/delegated-capability-contract.md`.

**Rationale:** every binding removes a replay or substitution dimension, hashing limits database disclosure, and conditional single-use claim prevents duplicate execution. Deterministic effect identity plus current-state reauthorization handles crash retries without turning a short confirmation into reusable impersonation authority.

### QAD-181: One shared envelope preserves Discord interaction types and adds stable Fluxer context

Verification, chat-input commands, message components, autocomplete, and modal submissions use one schema-owned tagged envelope with a Snowflake interaction ID, application/community/channel and invoker context, opaque response token, locale, source message where applicable, and server-derived permission context. Compatible type numbers and trigger payload fields remain intact. Fluxer extensions add immutable command/option keys and revisions, invoked-form attribution, explicit deadlines, diagnostic trace/attempt data, message version, and negotiated capabilities. The initial router accepts only community-installed guild context; future DM/user fields remain reserved rather than implemented. Installation generation and acting authority remain server-side and cannot become caller-selected identity. Exact fields are in `specs/interaction-envelope.md`.

**Rationale:** one schema across transports prevents Gateway/HTTP drift, and tagged trigger variants keep validation exhaustive. Immutable revisions/deadlines make stale/retry behavior explicit, while marking permission context non-authoritative preserves execution-time security checks.

### QAD-182: Interaction callbacks use compatible routes with bounded, truthful idempotency

Fluxer supports compatible initial message/defer, component update/defer, autocomplete, modal, original-response, and follow-up response operations, with exactly one initial callback in three seconds and five total follow-ups in fifteen minutes. Visibility and message representation remain immutable; public mutations require expected message version. Interaction/component identity deduplicates initial handling, while follow-up and mutation retry deduplication uses an optional application/interaction-scoped idempotency key; requests without one are not falsely promised exactly-once creation. Terminal expiry, dismissal, deletion, inactive installation, version conflict, invalid callback type, and reused-key states receive stable structured errors. Exact operations and errors are in `specs/interaction-response-lifecycle.md`.

**Rationale:** atomic initial claim enforces protocol uniqueness, versions prevent lost public updates, and scoped keys make retry guarantees explicit where the server can prove them. Refusing an exactly-once promise without a key accurately reflects distributed request ambiguity.

### QAD-183: Interaction delivery needs no intent and transport activation is explicit

`INTERACTION_CREATE` is an ordinary Gateway dispatch requiring no intent and cannot be silently excluded with Fluxer's current `ignored_events` while Gateway delivery is active. Discord-compatible interaction delivery is implicit for migrated bots; an additive Identify capability array negotiates only Fluxer rich components, form controls, delegated actions, and declarative administration. The application row owns a versioned active endpoint pointer and at most one pending candidate pointer; separate configuration records own URL, requested/accepted capabilities, verification/generation, safe health fields, and repairable lifecycle timestamps. Saving a URL changes only the pending pointer. Successful signed verification uses a candidate-local conditional update to durably fix the result together with the exact application endpoint version, verification-key generation ID, and canonical configuration digest it proved; it does not condition on the separate application row. An exact application-pointer CAS is the sole activation commit, so a displaced proof is inert and delivery binds only the active configuration generation. Gateway and HTTP remain mutually exclusive, and staged key rotation never changes the active key before pending-key verification. Exact fields/operations are in `specs/interaction-transport-registration.md`.

**Rationale:** no new intent preserves compatible delivery expectations, while non-ignorable dispatch prevents an active app from accidentally dropping core interactions. Persisting both the verification result and its exact version/key/configuration inputs on an immutable candidate lets recovery distinguish a retryable activation from stale proof. Separating a candidate-local proof write from the one authoritative application-pointer CAS fits the selected single-row conditional primitive, makes a displaced proof harmless, and avoids claiming a cross-record transaction; the authority-changing pointer/key transitions remain atomic and auditable.

### QAD-184: Outgoing interaction delivery has a deadline-owned SSRF-safe dispatcher

Outgoing HTTP interactions use a dedicated bounded dispatcher rather than Fluxer's generic worker/DLQ, because expired three-second invocations must never be replayed. It extends current outbound-URL and public-IP helpers with resolution-time validation, address pinning, TLS hostname verification, per-attempt re-resolution, no redirects/cookies, request/response bounds, absolute-deadline timeouts, and one classified transient retry. Reviewed per-application/process concurrency and queue bounds fail fast before the deadline. A rolling failure circuit suppresses HTTP-backed commands until signed probes recover it. Only sanitized delivery metadata lives for 24 hours; there is no payload DLQ or re-drive. Exact limits, breaker rules, telemetry, and DNS behavior are in `specs/outgoing-interaction-delivery.md`.

**Rationale:** a three-second user contract cannot be owned by a generic delayed/replayable queue. A deadline-aware dispatcher can reuse existing network protections while guaranteeing stale payloads are never re-driven and retaining only safe diagnostic metadata.

### QAD-185: Components preserve the compatible grammar and add negotiated rich choices

Fluxer adds Discord's compatible `IS_COMPONENTS_V2` flag and numbered component types while enforcing separate immutable legacy and structured message representations. Legacy rows retain the five-row/button/select model; structured messages support sections, containers, text, media, files, separators, and controls with a bounded recursive grammar. Radio and checkbox types retain their compatible numbers and modal behavior, while negotiated Fluxer capability `fluxer.forms.choice-controls.v1` also permits them inline in rich messages. Initial trees allow 10 top-level and 40 total components, 256 KiB canonical JSON, existing Fluxer text/attachment budgets, explicit accessibility names/semantics, and required inert fallback text. Exact placement and limits are in `specs/component-schema-and-limits.md`.

**Rationale:** it implements already accepted QAD-055 through QAD-058 against current Fluxer constants and current compatibility contracts; the inline-choice extension was explicitly approved.

### QAD-186: Component state is per-user, server-authorized, and lifecycle-bound

Every control is revalidated against current message version, application lifecycle, expiry, audience, use policy, and referenced resources. Audience predicates may narrow access to the invoker, message author, enumerated users/roles, or holders of native permissions, but never widen channel visibility. Input remains pending through transport acknowledgement, defer, or modal opening. It atomically commits only the user's bounded current presentation state after the outcome ledger records either a terminal accepted application result or `SUCCEEDED` for the interaction's claimed structured native effect. Rejection/timeout/cancel restores prior state only after proven no-effect; partial or ambiguous effects reconcile fail-closed. Public aggregate output is a separate version-checked message update. Controls may be reusable, once per user, or once globally. Persistent public controls default to message lifetime, ephemeral controls to the response lifetime, confirmations to five minutes, and modals to at most fifteen minutes. Copies are static, deletion revokes authority, uninstall makes controls inert, and reinstall requires explicit reconciliation. Exact storage and transitions are in `specs/component-state-lifecycle-and-storage.md`.

**Rationale:** it turns accepted QAD-059 through QAD-064 and QAD-130 into concrete data/transition rules using the existing internal message-version field/read-increment precedent plus the planned F1 concurrency-safe expected-version CAS prerequisite. The current generic helper is neither conditional nor guaranteed monotonic under concurrent/stale writers, and public message schemas expose no version today. This does not introduce shared user input or automatic reactivation.

### QAD-187: Component semantics have one TypeScript schema authority

Tagged Zod schemas in `packages/schema` own the public recursive component contract and generated TypeScript/OpenAPI types. The API performs authoritative validation, normalization, ID assignment, hashing, authorization, and canonical serialization. Message persistence stores bounded canonical JSON plus typed ownership/version/lifecycle fields; Rust round-trips that JSON opaquely and Gateway forwards it without becoming competing component validators. Cross-language conformance fixtures cover valid, invalid, boundary, and unknown-future data. This deliberately extends Fluxer's current schema/API ownership while minimizing its existing manually mirrored TypeScript/Rust message-contract risk. Exact ownership and fixture requirements are in `specs/component-state-lifecycle-and-storage.md`.

**Rationale:** it follows Fluxer's current schema/API contract ownership and avoids multiplying the existing manually mirrored message-model maintenance burden.

### QAD-188: Ephemeral responses use private recipient-scoped storage

Ephemeral responses never enter ordinary channel message partitions, history, read state, notification/mention handling, search indexes, forwarding, or channel-wide Gateway dispatch. Their sole server-derived recipient owns an account-scoped row with an absolute at-most-24-hour TTL and account-wide terminal dismissal. This decision originally specified private attachment storage, but QAD-212 later removes files and application media from the initial ephemeral surface. Dismissal/expiry revokes reads and controls before idempotent physical cleanup, and operational records retain only allowlisted metadata for 24 hours. A recipient may submit an exact private report snapshot; the resulting safety evidence is separate from the deleted recipient copy and follows ordinary report policy. QAD-210 later fixes export exclusion, while QAD-211 and QAD-213 fix report evidence and legacy-row lifecycle. Exact mechanics are in `specs/ephemeral-storage-and-access.md`.

**Rationale:** these are necessary enforcement consequences of the already accepted invoker-only audience, reload, 24-hour maximum, terminal dismissal, and reporting requirements. Current channel message/public media paths cannot satisfy that privacy boundary.

### QAD-189: Fluxer extensions use a stable capability registry and negotiated intersection

Reviewed lowercase dotted capability constants describe Fluxer-only command shapes, rich components, inline choice controls, delegated native actions, and declarative administration. Gateway Identify/Ready and pending HTTP transport configuration negotiate the server-supported intersection; baseline Discord-compatible interactions require no Fluxer capability. Well-formed unknown IDs are ignored but never accepted, malformed or oversized arrays fail validation, dependencies are explicit, and responses cannot self-enable an extension. Capability IDs and meanings are permanent: evolution adds another ID, deprecation never repurposes one, and breaking baseline changes require a new API/Gateway major. `specs/interaction-capability-registry.md` is the sole authority for the registry and exact negotiation payloads; QAD-189 supersedes the earlier abbreviated list, `READY.interaction_capabilities` field, and combined HTTP capability set in the transport-registration draft. QAD-215 later fixes the external minimum support/deprecation duration.

**Rationale:** it implements accepted QAD-138/183 using Fluxer's strict major and bounded Identify-validation conventions. It does not choose how long Fluxer publicly promises to keep an old stable contract.

### QAD-190: Suspension is a centralized reversible safety overlay

Instance staff with new `application:suspension:view`/`manage` ACLs may suspend one application instance-wide or one community relationship through typed version-checked endpoints with a mandatory categorized/private reason and complete admin audit. Suspension is durable, fail-closed, and checked centrally on every bot action, interaction, response, command/configuration mutation, and install path. Application-wide suspension terminates/rejects the bot's Gateway sessions; community-only suspension keeps the shared session but suppresses that community and rejects its targeted actions. Developers retain read and credential/transport-repair access, while users/managers cannot invoke or override it. Reinstatement remains enforced until identity, installation, role, transport, manifest, and configuration reconciliation succeeds, and never revives old authority. Credential revocation, uninstall, suspension, and permanent deletion remain distinct states. Exact mechanics are in `specs/application-suspension-control-plane.md`; QAD-216 through QAD-219 later fix notification, explanation, email, and review policy.

**Rationale:** it is the minimum safe implementation of accepted QAD-140/141 against Fluxer's current ACL, admin-audit, bot authentication, and shared Gateway-session architecture. Notification audiences and appeals were still observable product policy at this point and were later fixed by QAD-216 through QAD-219 below.

### QAD-191: Rollout controls are temporary, server-enforced, and removed

Bot-platform rollout uses one typed private configuration with deterministic application/community percentages and allowlists for installation writes, registry writes, delivery transports, picker, ephemeral responses, components, declarative administration, and delegated actions. It extends Fluxer's validated private rollout/NATS pattern but never becomes a public/self-hosted master switch, and it cannot gate or bypass security/data-integrity invariants. Each layer is enforced at its authoritative server entry point; schemas and tolerant readers land dark before writers, UI follows server activation, and reducing a flag stops new authority without deleting state. Every flag ships with an owner and removal criteria and is deleted after compatible deployment, 100-percent observation, clean reconciliation, and rollback readiness. Exact sequencing is in `specs/bot-platform-rollout-controls.md`.

**Rationale:** `fluxer_gateway/src/gateway/gateway_rollout_config.erl`, its validator/tests, and `fluxer_api/src/api/admin/controllers/InstanceConfigAdminController.ts` demonstrate validated private rollout configuration, deterministic cohorts, and update propagation. QAD-139 rejects a permanent public master switch. UI-only or immortal flags would misplace enforcement/ownership.

### QAD-192: Every rollout layer has bounded telemetry and a tested recovery runbook

Bot-platform services emit one bounded Prometheus-compatible metric contract and allowlisted trace spans for lifecycle, manifests, delivery, responses/components, ephemerals, delegated actions, suspension, audit, and reconciliation. High-cardinality identities and all content/secrets are prohibited metric labels; traces/logs remain redacted and access controlled. Readiness is measured through invocation/delivery/response availability, convergence, audit completeness, deletion/privacy, and zero-tolerance authorization invariants. Dashboards, alerts, synthetic probes, and tested rollback/suspension/reconciliation/privacy/DR runbooks are required before each rollout gate. Exact traffic-sensitive SLO and alert numbers remain deployment-owned because Fluxer has no topology/traffic evidence from which a universal promise could be inferred. The required instruments and gates are in `specs/bot-platform-observability-and-runbooks.md`.

**Rationale:** Fluxer already exposes Prometheus-style API/Gateway/service metrics and structured logs, but the repository has no deployment topology, traffic baseline, or common runbook contract. Guessing numbers would turn an unsupported estimate into a false operational promise; omitting gates would make QAD-191 percentages unauditable.

### QAD-193: Disaster recovery restores durable sources but never old authority or ephemerals

Backups cover durable application/install/role, immutable command/configuration/preference, public message, audit/effect, suspension, and encrypted signing-key source data; search/query caches are rebuildable. Interaction tokens, capabilities, pending actions/deliveries, Gateway sessions, and ephemeral payloads never reactivate from backup. Restore increments a server authority epoch, purges transient/ephemeral state, replays an independently replicated minimal suspension/deletion journal, validates immutable heads and ownership, rebuilds indexes, and runs observable reconcilers under an internal fail-closed recovery hold before canary activation. HTTP endpoints and components require fresh health/current-state checks. Backup manifests, isolated restore drills, and measured recovery time/point are mandatory. QAD-221 later assigns exact RPO, RTO, backup retention, drill cadence, and geography to deployment-owned, evidence-gated operator policy and fixes the journal-duration formula. Exact behavior is in `specs/bot-platform-disaster-recovery.md`.

**Rationale:** Fluxer uses denormalized Cassandra-style tables, object storage, NATS/JetStream, in-memory Gateway sessions, and search indexes, but contains no complete backup/RPO/RTO contract. Queue delivery is not proof of current authority; restoring expired secrets or private ephemerals would violate QAD-188/QAD-190. Exact mechanics are in `specs/bot-platform-disaster-recovery.md`.

### QAD-194: Durable aggregates, not queue deliveries, own reconciliation

Each installation, deletion, manifest, settings-delivery, message-reactivation, reinstatement, ephemeral-cleanup, and privileged-effect aggregate has one service/repository transition owner. The domain row and deterministic operation/effect IDs are authoritative; JetStream, cron, and the job ledger provide immediate execution, lost-enqueue sweeps, retries, and visibility. Workers use versioned leases, verify-or-apply idempotent effects, bounded state indexes, and explicit failed states; a dead-letter or notification failure never fabricates domain completion. The existing application-deletion task becomes a resumable child-operation orchestrator. Manifest repair never selects history, settings delivery converges to the latest authoritative version, and bot-managed messages reactivate only from an explicit application request. Exact owners/cadences are in `specs/bot-platform-reconciler-ownership.md`.

**Rationale:** Fluxer already has typed worker lanes, JetStream redelivery, a job ledger, cron, and targeted read-repair, while current application deletion is queue-oriented and monolithic. Delivery can be duplicated or lost and therefore cannot establish completion. `specs/bot-platform-reconciler-ownership.md` records exact owners and cadences.

### QAD-195: Resource protection combines existing buckets with structural and concurrency caps

All bot-platform requests—including invalid, stale, unauthorized, duplicate, and idempotent attempts—consume the existing layered leaky-bucket/global system and approved QAD-147/148/172/184 budgets. Route-specific pre-parse caps prevent unbounded JSON allocation; compressed bot-platform JSON is initially rejected. One in-flight manifest-head mutation, bounded autocomplete and installation pending work, one pending component commit per user/component, versioned public writes, exact one-operation delegated capabilities, bounded error lists, and per-application delivery queues prevent amplification. Malformed traffic is throttled/circuit-suppressed and observable but never causes an unaudited automatic permanent ban; explicit QAD-190 suspension handles credible abuse. Exact caps/tests are in `specs/bot-platform-abuse-and-resource-protection.md`.

**Rationale:** current Fluxer has a global default, route leaky buckets, Gateway frame/connection/session limits, typed validation, and webhook exemptions, while the planned recursive schemas, autocomplete, outbound delivery, and publication create new amplification paths. A second limiter would fragment semantics; rate limits alone do not bound parse memory or concurrent aggregate work.

### QAD-196: One compatibility manifest and fixture corpus protects migration behavior

A schema-owned manifest classifies every relevant command, interaction, callback, component, OAuth, extension, deliberate difference, and out-of-scope surface as compatible, additive, intentional difference, or out of scope, with comparison-source date, migration/fallback, and test ownership. One bounded JSON fixture corpus drives Zod/API/OpenAPI, Erlang Gateway, Rust message round-trip, and React rendering tests; runtimes do not fork copies or competing semantics. Real-service probes cover Gateway/HTTP, lifecycle, security, accessibility, load/failure paths, and a pinned development-only `discord.js` migration smoke client configured only through transport endpoints for compatible cases. Generated-contract cleanliness and semantic compatibility diffs are CI gates. Exact layout/matrix is in `specs/discord-compatibility-conformance.md`.

**Rationale:** Fluxer already has Zod/API/client tests, generated OpenAPI, Rust workspace tests, Erlang checks, and aggregate commands, but no shared bot-protocol corpus; component/message data crosses manually mirrored runtimes. Independent goldens can agree with themselves while disagreeing on the wire, and one SDK cannot prove the public contract. Current Discord public pages cited by the individual specs remain the comparison source, not the Fluxer authority.

### QAD-197: Uninstall retains community configuration; permanent owner deletion erases it

Successful uninstall removes the bot member, managed role, assignment, and all current authority but retains the community/application relationship as dormant, including command/declarative configuration and managed-role presentation/last approved permission proposal, indefinitely while both owners exist. Reinstall creates a new generation/role and requires an explicit current permission/authority review; supplemental roles are never reassigned silently. Authorized reset deletes selected retained community values without reinstalling or deleting public messages/audit. Permanent application deletion revokes globally, cleans every relationship/configuration/schema/preference reference/secret, anonymizes retained public authorship, and preserves only normal audit/report evidence plus a minimal non-resurrection journal. Community deletion removes all scoped data while leaving global application source intact. Exact data/sequence is in `specs/application-data-lifecycle.md`; QAD-221 later fixes the journal-duration formula, and QAD-222 distinguishes active reset-to-inheritance from manager-authorized forgetting of a dormant retained value.

**Rationale:** current application deletion anonymizes/remaps the bot while retaining authored messages, and current community deletion removes community resources; QAD-015/QAD-019/QAD-020/QAD-031/QAD-129/QAD-130 already separate revocation, dormant reinstall data, public messages, and owner deletion. Treating uninstall as erasure would contradict those accepted owners; retaining configuration after its application/community owner is permanently gone creates orphaned state. Exact data/sequence is in `specs/application-data-lifecycle.md`.

### QAD-198: Application handles reuse Fluxer's typed identifier and query-table conventions

Application handles use a separate canonical 2–32-character lowercase ASCII letter/digit/hyphen type based on Fluxer's current vanity-code grammar. A direct globally unique `applications_by_handle` row is claimed conditionally and maintained with the authoritative application row solely by `ApplicationRepository`; lookup never scans display names or trusts a cache. The immutable application Snowflake remains the authorization identity. Qualified `/<handle>:<developer_key>` parsing resolves both stable identities and bypasses only friendly-name collision, never availability or authorization. Application APIs expose the handle additively, and a handle is required before first Fluxer command publication without making the new create field unconditionally required for old clients. QAD-203 through QAD-205 later fix initial claim, freeze, reservation, deletion, and reuse policy. Exact mechanics and current-code evidence are in `specs/application-handle-contract.md`.

**Rationale:** reusing a familiar bounded grammar reduces input and moderation complexity, while a direct conditional lookup gives one authoritative owner under concurrency. Keeping Snowflakes as authorization identity means human-readable handle reuse cannot retarget a selected command.

### QAD-199: Declarative settings use bounded tagged types and immutable selected snapshots

The first settings phase supports booleans, 0–1024-character strings, safe integers, finite numbers, stable 25-choice enums, community channel/role/user references, and bounded enum/reference sets. It does not accept arbitrary JSON, regex/executable content, message structures, password/secret fields, or opaque credentials. Presentation text uses Fluxer's current locale registry while values are never localized. Community values distinguish `INHERIT`, explicit `NULL`, and typed `VALUE`; invalidated values are never coerced or retargeted. Application schemas and complete community configuration versions are immutable candidates exposed only through conditionally advanced heads, with 100 settings, 512 KiB schema, and 256 KiB effective-snapshot caps. A real expected-version database primitive is a prerequisite because Fluxer's current `executeVersionedUpdate` only increments versions. QAD-222 later fixes key dormancy, non-reuse, reactivation, and manager-forget policy. Exact grammar, storage, lifecycle, and evidence are in `specs/declarative-settings-schema-and-storage.md`.

**Rationale:** the initial types map to validation and resource-ownership checks Fluxer can enforce, while tagged value states avoid conflating inheritance, explicit null, and a real value. Bounded immutable snapshots support deterministic reads and rollback; refusing secrets, arbitrary JSON, and executable content prevents an unowned security and migration surface.

### QAD-200: Declarative configuration converges from a manager-owned versioned source

Owner/`Administrator`/`Manage Guild` updates require the expected configuration version and a 24-hour idempotency record, validate the complete resulting snapshot, and expose it only by conditional head advance. An active application receives the latest full bounded snapshot through its configured transport, can reconcile through an authenticated read, and acknowledges a version as applied/rejected/retry without changing Fluxer's source value. Newer source versions supersede obsolete delivery while immutable audit history remains. Guild audit records application, manager, version, changed keys/count, and result but never setting values. A durable coalescing Integrations attention feed—not bot DMs, mentions, email, or initial push—surfaces invalid, unsynchronized, offline, approval, dormant, and suspension states only to currently authorized managers. Exact endpoints, retries, audit, notification, and recovery are in `specs/declarative-settings-update-delivery-and-audit.md`.

**Rationale:** true expected-version publication prevents one manager from silently overwriting another, and full-state delivery/read reconciliation tolerates duplicate or missing events without treating queue acknowledgement as application state. Value-free audit and a permission-gated coalesced feed provide accountability without copying sensitive configuration into broad notification channels.

### QAD-201: Declarative builders separate platform-owned effects from application callbacks

Later declarative phases add bounded repeatable groups and versioned normal/embed/rich message templates, followed by at most 25 typed admin actions. Application callback actions deliver validated manager input to a healthy application, are visibly application-handled, may respond only ephemerally to that invoker from the settings surface, and make no Fluxer rollback guarantee for external effects. Fluxer-native actions initially publish/update/delete application messages, publish/update/delete self-role panels, and explicitly reconcile owned messages after reinstall. They use exact server-rendered previews, five-minute confirmation hashes, current bot permissions/hierarchy, expected versions, deterministic effect/audit identities, truthful partial states, and compensation only for unchanged resources created by the same operation. Self-role controls can alter only the clicking member's explicitly configured ordinary roles under the bot's approved `Manage Roles` authority. Exact phases, schemas, limits, lifecycle, and tests are in `specs/declarative-admin-builders-and-actions.md`.

**Rationale:** Fluxer can verify and reconcile only effects performed through its own typed services, so native actions warrant stronger preview, audit, and compensation claims than opaque callbacks. Keeping the two action classes visibly separate covers common workflows without implying that Fluxer can validate or roll back an application's external behavior.

### QAD-202: Implementation uses short merge trains with dark cross-service contracts

The bot platform is implemented as eleven prerequisite-ordered merge trains with no more than three dependent pull requests open at once: conditional persistence/rollout, installation/managed roles, audit/suspension/recovery, command registry, interaction delivery/responses, picker, ephemeral/components, manifest recovery, declarative settings/builders, declarative admin actions, and delegated authority. Each branch has fixed logical commits and acceptance criteria. Additive storage/tolerant readers/fallbacks land before writers/producers; temporary private rollout layers default fail-closed, advance through allowlist/percentage gates, and are removed after full observation. Rollback disables producers/UI but retains readers, suspension, revocation, cleanup, audit, and reconcilers. Generated artifacts stay with their sources; root aggregate validation plus language/domain-specific integration, visual, accessibility, security, failure, and compatibility gates apply. Descendants are rebased/range-diffed after parent changes and squash merges; any force-push remains separately authorized. Public docs/OpenAPI ship with their surface, and no official SDK or Flutter work enters these trains. QAD-237 separately permits a future post-stability SDK project without changing this DAG. Repository rules require human-owned PR prose and LLM disclosure. Exact branch names, commits, DAG, checks, and procedures are in `specs/stacked-branch-pr-and-rollout-strategy.md`.

**Rationale:** the accepted platform crosses persistence, generated contracts, API, Gateway, workers, and UI, so ordering tolerant readers and dark prerequisites before writers is necessary for mixed-version safety. Short trains cap review/rebase cost, while preserving revocation, suspension, cleanup, and reconciliation during producer rollback prevents deployment controls from weakening security or data lifecycle.

### QAD-203: Application handles are chosen at creation and frozen by first publication

Fluxer's developer UI prefills an editable handle derived from the application name. The create API accepts an optional explicit handle; omission preserves existing clients by atomically claiming the normalized name with a deterministic short application-ID suffix on collision and an `app-<id>` fallback when necessary. Existing applications receive no bulk backfill: an owner may claim explicitly, while first compatible command publication lazily claims a deterministic handle rather than failing migration. An automatically generated handle may be replaced only before the application has ever published a command. The first manifest-head publication freezes the handle before discovery; there is no ordinary later rename or independent handle transfer. Handle reservation, deterministic bot-user creation, application persistence, and credential activation become one recoverable operation with idempotent cleanup/reconciliation, replacing the current possibility of an orphaned bot user after a partial create failure. Exact mechanics and evidence are in `specs/application-handle-contract.md`.

**Rationale:** optional deterministic allocation preserves old clients and avoids a risky mass migration, while freezing at first publication stabilizes external addressing. Treating application, bot, credentials, and handle as one recoverable operation prevents a partial create from leaking claimable or active resources.

### QAD-204: Application handles reserve a narrow platform and safety namespace

Public application claims reject every canonical handle containing `fluxer` and the exact handles `system`, `system-message`, `admin`, `api`, `gateway`, `support`, `safety`, `security`, `staff`, `official`, `moderation`, `auth`, `oauth`, `login`, `billing`, `payments`, `deleted`, `everyone`, `here`, and `native`. Generic category names remain claimable. Only an audited instance-administrator/bootstrap path may allocate a reserved handle to a first-party application, and public failures use the same unavailable result for reserved and already claimed values. The reviewed code-defined set may grow, but additions never silently seize an existing claim; conflicts use suspension/safety handling. This extends Fluxer's existing username and vanity anti-impersonation rules without turning the global namespace into a broad trademark dictionary. Exact policy and evidence are in `specs/application-handle-contract.md`.

**Rationale:** a narrow explicit list blocks the highest-risk platform impersonation without exhausting useful generic names. Indistinguishable public failures reduce namespace probing, and audited first-party assignment plus non-seizure preserves ownership accountability.

### QAD-205: Deleted applications release their handles within 24 hours

Permanent application deletion immediately revokes the application and bot, then releases its handle through a conditionally owned, independently reconciled cleanup step as soon as safely possible and no later than 24 hours after deletion acceptance. Published and unpublished handles follow the same rule; a later claim is a new application identity and never resurrects the deleted Snowflake. Unsubmitted qualified text resolves the current handle owner and visibly identifies it in the picker, while a selected/submitted interaction stores immutable application and command IDs and cannot be retargeted by reuse. Fluxer therefore accepts that old external documentation may eventually identify a new application rather than permanently consuming human-readable names. This adds a reusable-name lifecycle while preserving Fluxer's existing permanently unique Snowflake identity. Exact mechanics are in `specs/application-handle-contract.md` and `specs/application-data-lifecycle.md`.

Deletion acceptance durably records the release operation and deadline. Approaching or missing the deadline is an operator-pageable product-contract breach and remains visible while safe retries continue. Ambiguous ownership keeps the deleted application revoked and the handle quarantined; it never permits an unsafe transfer merely to satisfy the time target.

**Rationale:** unsent qualified text resolves the current owner and visibly identifies it in the picker; a selected/submitted invocation stores immutable application and command IDs and can never be retargeted by later handle reuse. The application Snowflake remains permanently non-reusable.

### QAD-206: Passive command ordering expires after 90 days of inactivity

Fluxer retains only a bounded command-identity ranking signal and `last_used_at` for each user/community/command under a sliding 90-day inactivity TTL refreshed by successful invocation. It never stores arguments, option values, message content, or recallable command history. Expired rows stop influencing order even before physical cleanup. Resetting command ordering deletes passive rows immediately without changing favorites or explicit preferences; leaving/deleting the community and deleting the account remove applicable rows. This introduces a privacy-minimized usage signal because Fluxer currently has no command-history contract, while using its existing TTL-capable repository conventions. Exact storage and lifecycle are in `specs/command-persistence.md`.

**Rationale:** a sliding expiry preserves recent ranking value but removes a passive behavioral record after prolonged nonuse, and immediate reset/departure deletion gives the relevant owner control. Ninety days is an accepted product balance rather than a limit derived from current code.

### QAD-207: One account may own up to 50 applications

Raise the code-defined per-owner application ceiling from 25 to 50 non-deleted applications. Suspended, dormant, or otherwise retained applications continue to count until permanent deletion completes. Preserve the current authenticated-default-user requirement, CAPTCHA, `MAX_APPLICATIONS` error contract, and 10-per-hour application-create route limit, so the larger ownership ceiling does not become a burst allowance. Creation conditionally reserves an owner-scoped capacity slot so concurrent requests cannot exceed 50. This intentionally changes `MAX_APPLICATIONS_PER_USER` while preserving Fluxer's current centralized limit/error and creation-protection patterns. The implementation belongs in C1 before recoverable application/handle creation; rollout measures cap rejection, slot utilization, abuse, cleanup backlog, and retained-resource cost because the repository proves the old value, not demand for the selected new one.

**Rationale:** 50 accommodates separate test, staging, migration, and production identities without adding an exception/entitlement system, while the independent 10/hour and CAPTCHA controls still bound creation bursts. Counting every retained application and conditionally reserving one of the owner's 50 slots prevents suspension, failed cleanup, or concurrent requests from bypassing the resource ceiling.

### QAD-208: Delegated authority covers every applicable community mutation

The master plan does not stop after ban/kick examples. A schema-owned completeness manifest classifies every bot-authenticated community mutation as delegated-eligible, bot-only, direct-user-only, or out of scope; CI rejects unclassified additions. Exact adapters cover appropriate member/moderation, message/reaction/pin moderation, channel/overwrite, role, safe community/discovery, expression, invite, and credential-free webhook administration actions through sequential risk-coherent PRs. They derive the invoker only from trusted interaction state and call existing native services; unsupported operations fail and never fall back to bot authority. Human content/identity/personal-state impersonation, community deletion/ownership transfer/MFA, persistent webhook credential creation/execution, private/account/instance actions, and autonomous workflows are explicitly excluded. This extends current service checks comprehensively while preserving ordinary bot calls as bot authority. Exact catalog, exclusions, completeness checks, and implementation order are in `specs/delegated-native-operation-registry.md`.

**Rationale:** classifying every bot-authenticated mutation closes the gap where an unreviewed endpoint could fall back to bot authority, while exact adapters preserve the existing service's permission/hierarchy checks. Explicit exclusions retain direct reauthentication and identity boundaries that delegated interaction consent cannot satisfy.

### QAD-209: Confirmation follows trusted intent provenance and impact

One exact bounded action may execute without a post-submit prompt only when every security-relevant value is provably user-submitted or immutable definition-fixed, the pre-submit UI discloses the native operation/permission, and no high-impact escalator applies. Application-selected or changed facts require a platform-owned invoker-only exact confirmation. Bulk/multiple-target effects, history deletion, permission/hierarchy/access changes, durable resource deletion, persistent-access creation, and registered destructive thresholds always require detailed high-impact confirmation with counts/ranges/diffs. Thus `/nuke` targeting the invoker's own messages in a bound date range still previews the server-derived count and requires ephemeral Delete/Cancel. Confirmation is exact, expires in five minutes, revalidates current state, and never substitutes for excluded direct MFA/sudo actions. This extends current endpoint authorization and bulk-action caution without prompting for every exact single action. Exact classes and tests are in `specs/delegated-action-confirmation-policy.md`.

**Rationale:** provenance-based classes avoid habituating users to prompts for harmless exact actions, yet always interpose trusted review when the application chooses facts or the impact is durable/broad. Existing stronger sudo/MFA requirements remain a floor, not something confirmation can replace.

### QAD-210: Ephemeral responses are excluded from ordinary account exports

Ordinary account harvest/export never reads or snapshots ephemeral response content, attachments, component state, filenames, or per-response metadata, including responses that remain active and undismissed when export generation begins. An archive may state the omission policy generically but does not create a durable per-response substitute. Submitted report evidence remains a separate safety record governed by the general report policy. This preserves Fluxer's current author-owned message-harvest boundary and prevents export artifacts from extending the accepted at-most-24-hour ephemeral lifecycle. Exact behavior is in `specs/ephemeral-storage-and-access.md`.

**Rationale:** exporting would create a durable archive artifact beyond the response's at-most-24-hour lifecycle and would introduce a new received-transient-data category contrary to current author-owned harvest behavior.

### QAD-211: Ordinary and ephemeral reports share one bounded evidence lifecycle

Open or reopened reports retain necessary evidence until terminal resolution; resolution starts a 180-day evidence period, and reopening before expiry clears that deadline. Exact legal/statutory holds pause deletion only within their audited case scope, require a reason and review date, and trigger purge within seven days after release when ordinary expiry has passed. Account deletion or erasure removes unnecessary contact/profile data and pseudonymizes identifiers where feasible without letting a participant destroy an open or held safety case. Attachments, search copies, and other cloned evidence share the same lifecycle; only non-reidentifying broad aggregates may remain afterward. The same policy governs ordinary message reports and submitted ephemeral-response reports. This is an explicit future cross-copy policy change: `fluxer_marketing/content/policies/privacy.md` sections 7.9/7.10 currently promise report snapshots for up to one year with an automated object-storage lifecycle and rare binding-legal extensions, while the Cassandra report/search code has no coordinated expiry/hold/purge contract. The 180-day-after-resolution baseline therefore requires privacy-policy and legal review plus coordinated row/search/object implementation; repository inspection does not verify the deployed object-lifecycle rule. QAD-213 later grandfathers already-resolved legacy database/search records without overriding the existing public object-storage promise and applies the new generation to then-pending reports only on later resolution. Exact behavior is in `specs/report-evidence-retention-and-erasure.md`.

**Rationale:** one policy generation across rows, search, cloned objects, holds, and backups avoids contradictory copies. The selected 180 days after resolution may be shorter or longer than six months from report creation and changes the current public one-year wording, so it requires privacy-policy/legal review and migration/communications rather than being described as current cleanup. It reduces post-resolution exposure but reduces the ordinary appeal/investigation window.

### QAD-212: Initial ephemeral responses do not support files or application media

Initial ephemeral responses support bounded text/embed fields and non-media controls, plus already-authorized platform application icons and community/Unicode emoji. They reject attachment uploads/references, file/media/thumbnail/upload components, media-bearing embed fields, and application-controlled remote media with a stable unsupported-media error; public bot responses retain ordinary media behavior. The protocol remains additively extensible, but future ephemeral files require an explicit capability and a separately approved recipient-private storage, delivery, cleanup, and reporting design. This supersedes only QAD-188's defensive private-attachment implementation path, not its separate recipient-scoped response storage or reporting boundary. Exact behavior is in `specs/ephemeral-storage-and-access.md` and `specs/component-schema-and-limits.md`.

**Rationale:** no accepted initial use case requires the extra private-object, scanning, export, cleanup, and evidence surface. Failing explicitly is safer than silently dropping content or building unused infrastructure.

### QAD-213: Legacy resolved reports are grandfathered without destructive backfill

Reports already resolved before QAD-211 activation receive no newly inferred database/search expiry unless a later staff-reviewed migration explicitly changes them. This legacy marker does not extend object snapshots beyond Fluxer's existing public up-to-one-year lifecycle or a binding legal obligation; the deployed object-lifecycle mechanism was not verified from repository code. Reports pending at activation adopt QAD-211 when they are subsequently resolved; any future reopening and re-resolution also adopts it. New reports use QAD-211 normally. The implementation marks or otherwise deterministically distinguishes the policy generation, purges only rows governed by the new policy, and never derives a destructive database/search deadline from an old `resolved_at`. A later legacy cleanup requires its own reviewed proposal, dry-run counts, cross-copy inventory, privacy-policy/legal review, hold handling, and authorization. This is the least disruptive safe database migration because lost safety evidence cannot be reconstructed and the current row/search model has no coordinated purge generation.

**Rationale:** this preserves database/search evidence whose safe cross-copy deletion cannot be inferred, while preserving the public object-storage ceiling and accepting temporary dual policy generations. A later cleanup requires cross-copy counts, policy/legal review, holds, and staged non-resurrection verification.

### QAD-214: The complete master plan receives project review before implementation

No bot-platform implementation branch begins merely because the planning questions are complete. The full decisions, current-code comparisons, specifications, branch/commit DAG, migrations, security boundaries, compatibility choices, and remaining deployment-owned inputs are first shared in Fluxer's developer server. QAD-038 resolves the prior `Manage Guild` privilege-ceiling gap with two sources: portable invite mode retains the current held-bit ceiling, while code-defined mode makes a versioned application record authoritative and permits the exact declared first-install set beyond that ceiling. Either committed set becomes the relationship ceiling, and later authority expansion remains owner/`Administrator`-only. Human review must verify that every dependent contract and Train I2 implementation preserves those boundaries. Material maintainer feedback is reconciled into the plan before product-code work starts; conflicting product intent returns to decision-making rather than being silently overridden. This adds an explicit human design-review gate while preserving the repository's current contribution process and the rule that pull-request prose remains human-owned with truthful LLM disclosure.

**Rationale:** the plan adds public contracts, persistence, privileged authority, privacy retention, cross-runtime schemas, migrations, and eleven merge trains. Repository `AGENTS.md` forbids automated pull requests/comments and `.github/CONTRIBUTING.md` documents the human contribution process. Deferring the first holistic review to dependent PRs would make architectural correction more expensive and fragment security/product context.

### QAD-215: Stable public protocols receive at least twelve months of usable overlap

A stable capability or REST/Gateway major cannot retire until at least twelve months after public deprecation notice and, when replacement is necessary, at least twelve months after the stable replacement and migration documentation are available. During that period the old contract retains its published semantics; retirement never reuses its identifier and produces the defined fallback or explicit unsupported result. Additive compatible fields do not force a new major. Clearly labelled preview/experimental features carry no stable-duration promise. A documented security or legal emergency may shorten the window only when continued support is materially unsafe or prohibited, with public explanation, migration guidance where possible, and the safest available fallback. This adds a public lifecycle Fluxer does not currently have: API/Gateway support is v1-only, while existing deprecated GIF aliases emit warning headers without a dated retirement contract. Exact mechanics are in `specs/interaction-capability-registry.md`.

**Rationale:** twelve months gives maintained clients and less-frequent self-hosted deployments a complete release/operations cycle without committing Fluxer to the longer duplicate-surface cost of eighteen months. It is a selected public support commitment, not a duration proven by current telemetry; release owners must review adoption/security/maintenance evidence before announcing retirement and may extend, but not silently shorten, the window.

### QAD-216: Suspension is visibly communicated to owners, managers, and encountering users

An application or installation suspension creates a durable developer notification for the current application owner and a durable Integrations alert visible to the owner, `Administrator`, and `Manage Guild` users of every affected community. Ordinary users receive no proactive feed notification, but an installed suspended bot is rendered offline with a platform-owned `Suspended` indicator on its member/profile surfaces; its commands and controls remain visibly unavailable. Application-wide suspension applies that presentation everywhere and terminates its Gateway session. Installation-only suspension applies a server-owned presentation overlay only in that community, without falsifying the bot's presence in unaffected communities. Notification delivery is reconciled but never delays or authorizes enforcement. Whether the application owner also receives transactional email, and the exact safe reason copy each audience sees, remain separate choices. This extends the planned Integrations attention surface and current presence/member rendering rather than relying on bot-authored messages.

**Rationale:** managers and developers need actionable status, while ordinary users need truthful encounter-time state without a disruptive community-wide announcement. A server-owned overlay cannot be forged by the bot and does not leak the state into unaffected communities.

### QAD-217: The application owner also receives existing-style transactional email

Suspension and reinstatement send the current application owner a transactional email in addition to the durable developer-panel notification, but only through Fluxer's existing account-email service/configuration and bounce handling. It never uses an application-supplied address and sends no email to community managers or ordinary users. If the owner has no usable account email or instance email is unavailable, the in-app record remains authoritative and enforcement/reinstatement proceeds. Email content contains only the safe audience copy selected separately, never the private operator reason, credentials, endpoint details, or investigation evidence. This preserves Fluxer's current precedent of transactional email for verification, suspicious-activity disablement, temporary bans/unbans, account deletion, report resolution, and data-export completion rather than creating a new marketing or bot-controlled mail channel.

**Rationale:** suspension is comparable to existing account/safety events and may require action while the owner is not signed in. Reusing the verified account channel limits address abuse, while making in-product state authoritative and omitting private details keeps mail failure and disclosure outside enforcement truth.

### QAD-218: Suspension explanations are audience-safe and never expose the operator record

Instance staff with the suspension-view ACL see the complete private operator reason and authorized evidence. The application owner sees a separately selected safe category, affected scope, effective time, disabled behavior, and platform-generated remediation/contact guidance. Affected community owner/`Administrator`/`Manage Guild` users see the safe category, scope, time, and operational effects but not investigation or developer-remediation details. Ordinary users see only the platform-owned `Suspended`/`Unavailable` state. Safe categories are reviewed constants and include an unspecified category; they are not derived by copying or truncating private text. Successful reinstatement notifies the owner and affected managers, while ordinary presentation returns only after reconciliation succeeds. This separates operational transparency from private safety evidence and applies identically to in-app and owner-email copy.

**Rationale:** reviewed safe categories include an unspecified option and are never generated by copying or summarizing the private operator note.

### QAD-219: Application owners receive a bounded in-product suspension review workflow

The current application owner can submit a lightweight `Request review` action bound to the exact application/installation suspension scope and version. At most one request is active for that version; it contains a bounded remediation explanation and enters an instance-staff queue. Authorized staff may request more information, reject, or accept. Acceptance moves the suspension into the existing fail-closed `REINSTATING` verification flow and never directly restores authority; rejection or pending review leaves enforcement unchanged. Community managers cannot review or appeal on the developer's behalf, and review content is visible only to the owner and authorized instance staff. Status changes use the accepted owner notification channels, carry no guaranteed response SLA, and are audited/rate-limited. This adds a focused workflow because Fluxer has no current application-suspension or appeal surface and avoids requiring every deployment to operate an external help desk for the ordinary path.

**Rationale:** tying the request to one suspension version prevents stale appeals from changing a later enforcement action, and bounded ownership/rate rules prevent queue abuse. Staff acceptance starts reconciliation rather than granting authority, so review cannot bypass the same safety checks required for ordinary reinstatement.

### QAD-220: Supported Discord guild slash commands are a hard drop-in baseline

Within the initial community-installed chat-input scope, an ordinary Discord bot's command models, interaction handlers, callback/component payloads, and ordinary bot REST logic must work without Fluxer-specific source rewrites; migration changes only credentials and endpoint/version transport configuration. Fluxer authority fields are optional. Omitting all broker fields normalizes to compatibility bot authority with an empty structured-operation allowlist: ordinary REST calls authenticate and authorize the bot exactly as they do today, and Fluxer never pretends they used the invoker's authority. Supplying a structured operation allowlist explicitly opts into the Fluxer broker; if its mode is omitted, QAD-039's safe delegated-user default applies. Community policy can restrict invocation but cannot rewrite an unchanged bot's execution identity. Fluxer extensions remain additive/capability-negotiated, while installation, managed-role, suspension, rate-limit, and bot-attributed audit enforcement still protect the baseline automatically. CI must run raw fixtures and a pinned `discord.js` bot whose compatible command/handler models change only endpoint/token configuration. Every exception remains an explicit compatibility-manifest entry with migration guidance; current accepted exceptions include out-of-scope DM/user-installed/context/Activity invocation, divergent per-community schemas, bounded follow-ups, and initial ephemeral media. This strengthens QAD-002B from a preference into an acceptance invariant without making Discord a ceiling for optional Fluxer features.

**Rationale:** omission must preserve existing bot-token semantics for a credible migration baseline, while an explicit nonempty allowlist is an unambiguous signal that the developer accepts broker constraints. This prevents accidental delegation and prevents compatibility code from being silently denied.

### QAD-221: Disaster-recovery promises are deployment-owned and evidence-gated

Fluxer does not publish or hardcode universal bot-platform RPO, RTO, backup-retention, restore-drill-frequency, or geographic-replication numbers because the repository contains no deployment topology or backup contract capable of supporting them. Before a deployment enables the bot platform beyond internal allowlists, its operator must record those values and demonstrate them through an isolated representative restore drill. Material backup/restore changes require another drill, and the deployment sets a recurring tested cadence. Geographic replication is claimed only when configured and exercised. The suspension/deletion non-resurrection journal must outlive the oldest restorable backup plus the maximum restore/reconciliation validation window and an operator safety margin. Missing, stale, or unverifiable backup/journal evidence keeps the platform in QAD-193's fail-closed recovery hold. This is a repository-derived ownership decision, not an unanswered numerical product guess; official Fluxer deployment values still require its operations evidence before launch.

**Rationale:** repository inspection finds data/worker/index primitives but no complete backup topology, retention schedule, RPO/RTO, or restore-drill contract. A universal number would therefore be an unsupported operational promise; no gate would weaken QAD-193's non-resurrection requirement. `specs/bot-platform-disaster-recovery.md` defines the invariant/drill evidence that deployments must measure.

### QAD-222: Developers may make setting definitions dormant but cannot retire or erase community values

The initial declarative framework has no developer-controlled permanent-retirement operation. Removing a definition makes its immutable key dormant, unavailable to the application, still reserved against reuse/type mutation, and visible to authorized community managers with its retained value/state. Republishing the same key may reactivate only the same fundamental type and identity; current validation and manager review still apply. Only community owner/`Administrator`/`Manage Guild` may reset an active value to inheritance or explicitly forget a dormant retained value. Forgetting deletes that key's value-bearing current/historical configuration rows and reference state after a safe head transition while retaining value-free version/audit metadata; a minimal value-free non-resurrection marker is independently recoverable until no backup can restore the erased value, so erased snapshots cannot return. Permanent application or community deletion performs the already accepted full cleanup. This follows QAD-126 through QAD-131 and QAD-197: Fluxer, not the developer, owns declared community state, and irreversible developer deletion/repurposing would violate that boundary. A future retirement/migration feature requires a new reviewed decision rather than speculative initial machinery.

**Rationale:** allowing a developer to erase or repurpose a key would let application-side schema churn destroy manager-owned state or retarget it to a different meaning. Dormancy preserves identity, while authorized Forget and owning-resource deletion provide explicit, auditable erasure paths.

### QAD-223: Dormant declarative setting keys continue to consume the 100-key application budget

The existing 100-setting application limit counts every reserved stable setting key, whether its current definition is active, deprecated, or dormant. Removing a definition therefore does not refund capacity, and reactivating the same key consumes no additional slot. Permanent application deletion removes the key registry with the application; a future reviewed retirement/migration facility may define a safe release path, but the initial implementation has none. Publication reports the current reserved count and offending new keys without exposing community values. This applies QAD-199's bounded-schema promise to QAD-222's permanent key reservation: excluding dormant keys would let repeated remove/add cycles create unbounded tombstones and bypass the accepted resource boundary.

**Rationale:** QAD-199 already promises a bounded 100-setting application schema and QAD-222 makes dormant identities non-reusable. Excluding dormant keys would let definition churn bypass that accepted bound and grow tombstones indefinitely.

### QAD-224: Command history is bounded with safe retirement

One application may retain at most 1,000 command identities, including inactive commands whose identity is being preserved. It may retain its latest 20 manifests plus at most 5 explicitly pinned older manifests for recovery. Temporary references may delay deletion only while an interaction, publication, recovery, or reconciliation operation still needs the exact data.

The application owner may permanently retire an inactive command only when it is absent from the retained manifests and no guild configuration, user preference, availability record, or live operation still references it. Retirement frees one of the 1,000 identities. Reusing the same developer key afterward creates a new command identity with no inherited settings; the old command ID is never reused. This keeps recovery useful and preserves other parties' state without allowing unbounded per-application history.

The exact 1,000 and 20+5 values are accepted product bounds rather than current-code-derived capacities. Rollout measures retained bytes, blocked retirements, pin use, cleanup delay, and legitimate cap rejections alongside the 8 MiB manifest bound; material pressure triggers explicit product review rather than silent reference pruning or an unbounded increase.

**Rationale:** the 100-active-command and 200-new-identities-per-day compatibility limits bound live and burst behavior but not lifetime tombstones or immutable history. Unbounded retention permits storage amplification; blind TTL pruning breaks QAD-021/QAD-028 community ownership and recovery. Explicit retirement makes deletion authority and safety conditions visible while preserving permanent Snowflake non-reuse.

### QAD-225: Superseded application-configuration values expire after 45 days

A configuration value remains indefinitely while it is the current active or dormant value. Once a newer configuration revision supersedes it, the old value payload becomes inaccessible after 45 days and is purged; non-sensitive revision and audit metadata follow Fluxer's existing 45-day audit window rather than preserving the value indirectly. Explicit Forget, guild deletion, and application deletion may remove it earlier under their existing rules. Before purge, Fluxer writes a minimal value-free expiry marker to the independently recoverable non-resurrection journal and retains it under QAD-221's backup-age/validation-window/safety-margin formula, so expired payloads cannot be resurrected from backups. This gives operators a bounded troubleshooting window without retaining obsolete user-selected values forever.

**Rationale:** indefinite old values multiply privacy exposure without owning current behavior, while a TTL on the current dormant value would contradict QAD-129/QAD-197/QAD-222. The superseded-only window preserves bounded rollback/diagnostic utility and matches the existing guild-audit retention scale without claiming that audit rows and configuration payloads are the same record.

### QAD-227: Multi-value resource options and `TARGET` are bounded Fluxer extensions

Fluxer adds repeatable `USER`, `ROLE`, `CHANNEL`, and `MENTIONABLE` command options plus a repeatable Fluxer `TARGET` type containing users, roles, and channels. Registration opts in with `multi_value: {min_values, max_values}`; `min_values` defaults to 1, `max_values` is required, and the platform ceiling is 50. `required` continues to control whether the option itself may be omitted. Collections preserve selection order and reject duplicates. Scalar interactions retain `value`; collections use `values`, with IDs for single-kind collections and typed `{type, id}` entries for `MENTIONABLE` and `TARGET`.

This is an additive, explicitly capability-gated extension. Unchanged Discord command definitions and scalar interaction handlers retain their compatible meaning. Unsupported clients never coerce collections: ordinary discovery omits the command and exact lookup produces an update-required state. Native resource search is the default; an explicitly registered application autocomplete callback receives only the current option path and permitted ordered selections. It remains bounded to 25 suggestions/64 KiB, and the existing 512 KiB interaction envelope limit remains unchanged.

Submission is atomic. Fluxer revalidates schema, cardinality, duplicate identity, command access, and resource visibility/selectability before delivery; one invalid value prevents invocation, preserves valid selections for correction, and requires resubmission. Selection never grants action authority, so the application still enforces command-specific behavior and every Fluxer-native action reauthorizes under its existing contract. Shape, allowed-target, or cardinality changes increment `schema_version`; stale values are never coerced or truncated. Multi-value contents remain prohibited from logs, traces, analytics, and command history, while bounded non-identifying counts/error classes may support capacity monitoring. Release requires complete keyboard and screen-reader selection/removal/error behavior. Exact schema, fallback, errors, evolution, and test consequences are in the existing command and interaction specifications.

**Rationale:** the selected form solves the supplied resource-batch use cases without changing any Discord scalar field or surprising a migrated handler with an array. Typed identity, all-or-nothing delivery, server access checks, application/native reauthorization, and non-coercing stale behavior prevent display labels, partial validation, or an old client from retargeting an action. Fifty is small relative to the existing byte envelope while still requiring boundary/load evidence before rollout.

### QAD-228: Conditional command options use a bounded server-authoritative relationship graph

Each command or subcommand may add one Fluxer-only `relationships` array beside its sibling value options. The initial kinds are `required_if`, `visible_if`, and symmetric `conflicts_with`. Relationships reference immutable sibling option keys and never cross subcommand branches. A condition may test only `is_set`, `is_unset`, or typed equality with one definition-declared eligible scalar value. Scripts, regex, range/order comparisons, resource-ID comparisons, collection searches, and nested Boolean expressions are unsupported. One option may have at most one required and one visibility condition; unique conflict pairs are bounded by the existing 25-sibling option ceiling.

The client evaluates the graph live as guidance, but the server validates the complete graph at registration and reevaluates every rule at submission. Missing/self/cross-branch keys, duplicates, directed cycles, and statically unsatisfiable required/hidden or required/conflict combinations are rejected. A false visibility condition hides an empty option, but a populated option remains visible for correction. Conditional requirement changes only requiredness; a conflict disables its empty peer or marks both populated peers. Fluxer never silently clears a value. Every applicable rule must pass, and a bounded safe error list is returned in option order before any bot invocation.

Relationships are an additive client capability; accepted bot interaction options retain their normal scalar or QAD-227 collection payload. Discord definitions and handlers remain unchanged when the extension is omitted. Unsupported clients omit the command from ordinary discovery and show an update-required exact result rather than ignoring its rules. Every relationship edit increments `schema_version`; stale forms retain only currently valid input, identify corrections, and require resubmission. Hidden, disabled, required, conflicting, and invalid states are release-gated on keyboard and screen-reader operation. Exact schema, graph, capability, error, compatibility, and rollout consequences are in the existing specifications.

**Rationale:** a single typed sibling graph makes symmetric edges, graph validation, canonical hashing, generated types, and path errors uniform. Stable keys survive display renames. The deliberately small predicate language covers the supplied examples without creating a second executable policy engine, while server reevaluation and no-silent-clear behavior prevent manipulated/old clients from changing accepted meaning.

### QAD-229: Temporal command options keep dates, instants, local time, and duration distinct

Fluxer adds four capability-gated temporal option types: `DATE` is a Gregorian calendar day without time/zone; `INSTANT` is an exact UTC moment; `LOCAL_DATETIME` is a wall-clock value resolved with an IANA timezone; and `DURATION` is a nonnegative elapsed millisecond count. Canonical values are locale-independent: `YYYY-MM-DD`, UTC RFC 3339 at millisecond precision, `YYYY-MM-DDTHH:mm:ss.SSS` plus resolution fields, and a JavaScript-safe integer respectively. Date/time years are limited to `0001–9999`; applications may declare tighter typed bounds, and invalid dates, overflow, or out-of-bound values are rejected rather than clamped. No narrower universal duration cap is invented without evidence.

A fixed command timezone wins for local/date comparison context; otherwise an explicit picker choice, saved account timezone, then community timezone apply. Missing context requires a choice and never silently uses locale/device settings. Nonexistent daylight-saving local times are rejected; repeated times require explicit earlier/later selection. The delivered local value includes local text, zone, selected offset, and resolved instant. `ANY`/strict `PAST`/strict `FUTURE` restrictions are server-evaluated at submission. Constrained relative helpers may normalize forms such as `in 2 hours`, but show the exact result before acceptance and never send raw/free-form natural language.

Temporal definitions require `fluxer.commands.temporal.v1` from both invoking client and application transport. Existing Discord definitions remain unchanged; cross-platform applications register explicit scalar alternatives and Fluxer never silently converts. Semantic type, precision, timezone, bound, or time-direction changes increment `schema_version`; changed local resolution requires reconfirmation, while display/helper copy alone is metadata. Native/manual input, timezone/DST choices, bounds, and errors are release-gated on responsive keyboard/screen-reader behavior. Raw temporal values and zones never enter logs, traces, analytics, or command history; later native-action audit may record only its operation-owned normalized expiry/duration.

**Rationale:** separate types prevent locale, timezone, and unit ambiguity at the API boundary. Canonical values plus server resolution make cross-runtime fixtures possible; explicit gaps/overlaps and no-clamping/no-coercion prevent silent schedule changes; the capability/fallback boundary preserves ordinary Discord migration without pretending its scalar types carry richer meaning.

### QAD-230: Bounded command input is composer-first without restricting compatible modals

Fluxer prefers the normal command composer for bounded, structured options that remain understandable and accessible in place. A modal is appropriate for genuinely long-form input, several tightly related form fields, a form-specific upload, or a layout that would otherwise make the composer confusing or inaccessible. There is no normative field-count threshold, and a modal is not the automatic substitute for a supported multi-value, conditional, or temporal composer control.

This is developer guidance and first-party UX policy, not a protocol prohibition. After Fluxer creates and delivers the command interaction, the application may return the existing Discord-compatible `MODAL` callback; modal submission remains a separate interaction, and dismissal, cancellation, timeout, or validation failure is never presented as successful workflow completion. Opening and closing transfer/restore focus predictably, recoverable validation preserves bounded live input only for the modal lifetime, and cancellation/expiry clears it under the existing form lifecycle. Aggregate path metrics may measure completion/cancellation/latency without recording arguments or field values.

**Rationale:** composer-first reduces interruption for bounded slash-command input, while criteria based on comprehension/accessibility avoid cramming real forms into one line. Preserving the compatible callback lets migrated Discord bots retain intentional modal workflows without turning modal use into an automatic fallback or claiming a cancelled form completed.

### QAD-231: Stable developer-owned command categories provide an inherited community deny

An application may define up to 25 active localized command categories, each with a permanent application-scoped key, 1–32-character default/localized label, stable server identity, and deterministic developer order. A command belongs to zero or one category, and only the developer controls category definitions and membership. Category labels and order are presentation metadata; invocation hierarchy remains command/subcommand structure. Category keys remain reserved for the application's lifetime, with at most 100 reserved keys, so removal and later reactivation cannot retarget or evade retained community policy.

Authorized community managers may disable or re-enable a category as one versioned policy row. A disabled category is a fail-closed availability gate: per-command enablement and owner/Administrator invocation-policy bypass cannot override it, and commands later assigned to that stable category inherit the deny. Developer disablement, targeting, installation/suspension, per-command disablement, ordinary audience/channel rules, and final action authorization remain independent gates. Rename/reorder does not change policy; removing a category makes its policy dormant, reactivating the same key restores it, and moving a command immediately applies the destination category's current policy.

Capable clients group categories accessibly; active search may flatten matches while retaining category context. Collapse state is bounded device-local presentation only and grants no authority. Older clients may ignore category presentation and show eligible commands individually, while server filtering still enforces category policy. Category registration is a Fluxer additive manifest extension and is never sent to Discord. Community policy updates use expected versions, are atomic rather than command-by-command rewrites, and audit only the actor, stable category identity, state transition, and affected count—never command input.

**Rationale:** one developer-owned membership avoids duplicated result rows and conflicting category denies, while a stable policy row makes disable inheritance predictable for later commands and avoids partial bulk writes. Permanent keys prevent rename or delete/re-add from retargeting policy. Flat compatible fallback preserves command migration because grouping is presentation and denial remains server authority.

### QAD-232: Semantically unchanged command publication is a validated no-op

After authentication, rate charging, parsing, validation, identity resolution, and current policy checks, Fluxer compares a prospective complete publication with the current manifest's canonical semantic state. Equality includes stable command/category identity, schema, metadata/localizations, category membership/order, developer availability, targeting, and authority fields; it ignores JSON object/map order, equivalent omitted defaults, and publication-only IDs/timestamps. Ordered presentation/input collections remain ordered. A hash match is only an index—canonical bytes must also match—and a new identity, dormant/reactivation transition, target change, or approval-relevant authority change is never equal.

An equal candidate returns the endpoint's normal compatible success object/status and the current committed revisions, with an additive `Fluxer-Publication-Status: unchanged` response header. It allocates no command/category/manifest revision or identity, emits no publication/audit/catalog event, invalidates no cache, and creates no durable no-op history row; the immediate response and bounded aggregate metric are sufficient. Route limits still apply. A no-change draft remains intact and explicitly discardable rather than being silently deleted.

An explicit stale expected head/version remains a conflict even when the requested end state now matches, preserving the caller's concurrency precondition. Without such a precondition, a CAS race may reread once and return no-op only if the newly current canonical state exactly equals the already validated complete candidate; otherwise it returns the normal manifest conflict. Compatible POST/PATCH/bulk status and body shapes remain unchanged, and deleting an already absent/dormant command retains the compatible unknown-resource behavior rather than becoming a new idempotent-delete contract.

**Rationale:** semantic canonical comparison handles startup libraries that reorder JSON or omit defaults, while full validation and exact bytes prevent a hash/idempotency shortcut becoming an authorization or collision boundary. Preserving explicit preconditions protects concurrency intent; allowing only exact convergent races avoids pointless conflicts without merging.

### QAD-233: The developer command dashboard is an owner-authorized view over canonical APIs

Fluxer provides the current application owner one responsive dashboard over the existing command registry, drafts, targeting, installation/transport health, retained publications, and recovery APIs. It reads authoritative heads/revisions on every operation and stores no dashboard-owned copy. Views cover Overview, Commands/Categories, Draft & Validation, Publications & Recovery, and Delivery Health, with stable identity, schema/authority revisions, developer availability, compatibility/capability status, safe targeting/approval summaries, dormant identities, and categorized retirement blockers.

All mutations—draft edit/validate/publish, immediate publication, developer availability/targeting, category definition/membership, explicit retirement, and retained-history recovery—use the existing owner-authorized APIs and expected versions. Conflicts offer refresh, safe candidate export, and explicit manual reapplication; the dashboard never silently merges or presents a stale candidate as committed. Recovery republishes retained registry contents as a new head and explicitly does not roll back application code, external/application data, existing messages, community-owned configuration, or completed interactions/effects. A no-op appears as the current operation result but not as publication history.

The UI never exposes bot/client secrets, tokens, signing material, command/modal values, interaction bodies, user favorites/hiding/usage/provider preferences, private community audience rules, guild audit details, or another user's identity behind a retirement blocker. Exports contain only application-owned canonical schema/metadata. Suspension permits safe read-only diagnosis and credential/transport repair already allowed by the suspension contract; publication remains blocked. Ownership loss and permanent deletion revoke dashboard access immediately. Every deep link and request rechecks current owner authorization, and missing/stale targets fall back safely without revealing another application.

**Rationale:** one UI over canonical APIs improves operability without creating another writer or stale source of truth. Owner-only authorization matches the current application ownership model; sanitized summaries help debugging while preserving community/user boundaries; explicit recovery wording prevents a registry rollback from being mistaken for distributed effect rollback.

### QAD-234: A community provider recommendation ranks below explicit user choices

For one exact normalized duplicate command name, community owner, `Administrator`, or `Manage Guild` may recommend one currently matching native or installed-application command by stable provider/application/command identity. Inside the same text-relevance and favorite tier, ordering is: applicable explicit user provider preference, favorite state/rank, community recommendation, passive community usage, then existing locale/lexical/identity ties. A user's applicable community-specific/global provider preference remains the only mechanism that may auto-resolve a duplicate; favorites and recommendations only order visible choices.

The recommendation never enables, authorizes, hides, selects, executes, or promotes a weaker text match. Fluxer ignores it for a user when the target is hidden or currently unavailable, disabled, untargeted, uninstalled, suspended, retired, or no longer exposes that exact normalized shared name. It does not automatically choose another provider. Ordinary ranking/explicit selection continues, and availability/authorization are rechecked on selection and submission.

The manager-owned versioned row is separate from user preferences and retains stable identity through temporary command absence, rename, uninstall, and matching reinstall/reactivation; permanent command/application/community deletion or explicit manager reset removes it. UI labels it `Recommended by this community`, offers a clear personal override, and never implies Fluxer endorsement, safety, or extra permission. Mutation uses existing community application-management authority, optimistic concurrency, safe cache invalidation, and configuration audit without revealing any user's preferences or usage.

**Rationale:** explicit user intent remains strongest, favorites remain stronger than shared guidance, and shared guidance can help first-use discovery before a weak inferred usage signal. Stable identity and exact-name/current-availability checks prevent rename or provider disappearance from retargeting. Keeping recommendation out of dispatch/authorization avoids community preference becoming authority.

### QAD-235: Role and channel settings link to one authorized Integrations policy editor

Role details and channel-permission settings may show a contextual application-command entry. For an actor who also currently has community owner, `Administrator`, or `Manage Guild`, it shows only the current count of explicit command-policy rules that reference that stable role/channel and opens Community Settings -> Integrations -> Commands with a typed stable-ID subject filter. The count is not an effective-access claim: role access also depends on a member's other roles, channel gates, command availability, and final authorization.

The contextual surface never mutates or copies policy. Integrations remains the only editor, persistence owner, mutation API, version/conflict handler, cache invalidator, and audit source. `Manage Roles`, channel-management permission, or visibility of the source settings page alone grants no Integrations access. Without Integrations authority, the actor receives at most generic noninteractive guidance that bot command access is managed there—no counts, links carrying policy context, command/application names, states, membership, tooltips, or accessibility-label disclosures.

Navigation carries immutable guild plus `ROLE|CHANNEL` subject ID and optional stable application/command IDs, never mutable labels or policy values. The destination reauthorizes and rereads current catalog/policy versions. Deleted resources, removed commands/apps, stale counts, lost permission, and concurrent edits fail safely without retargeting; back navigation restores the source page and focus. Responsive/keyboard/screen-reader behavior and bounded source-surface navigation metrics are required, while views/navigation create no audit entry or duplicate state.

**Rationale:** authorized reference counts answer whether a resource is explicitly mentioned without pretending to compute a member's effective command access. Stable-ID filtered navigation improves discovery while a single owner prevents drift/partial writes. Reauthorization/no-data unauthorized presentation closes the privilege gap between role/channel management and application management.

### QAD-236: Collision-picker controls require prototype and accessibility evidence

The duplicate-provider picker keeps its accepted invariants—visible/accessibly named provider identity, immutable identity-bound selection, deterministic relevance and QAD-234 precedence, explicit-preference-only auto-resolution, current authorization, safe unavailable states, and coherent keyboard/pointer/touch/IME/screen-reader behavior—but does not yet freeze the exact visual/control pattern.

Before implementation chooses flat versus exact-collision grouping, ordinary list navigation versus an additional provider-cycling shortcut, or star/row/menu/details preference controls, representative variants must run in the real composer against no/two/many-provider, large catalog, localized/long-name, stale/unavailable, narrow/touch, high-zoom/reduced-motion, keyboard/IME, and screen-reader cases. Context-menu or long-press actions require an equivalent visible keyboard/screen-reader path; Tab cannot be repurposed without evidence that expected focus navigation remains coherent.

The evidence records tasks, observed errors/confusion, accessibility results, invariant failures, and rejected tradeoffs. No unsupported numerical success threshold is invented. Any variant that obscures provider identity, changes dispatch/authority, traps focus, or lacks an accessible preference path fails. Product/accessibility review must record the selected design as a QAD-173/QAD-236 addendum and update the picker specification before production implementation proceeds.

**Rationale:** visual density, grouping, shortcut, and action discoverability are empirical interaction questions. Freezing security/identity semantics prevents prototype drift, while delaying only presentation avoids treating an untested mockup as protocol or forcing implementation to defend an arbitrary control.

### QAD-237: An official TypeScript SDK is a separate post-stability project

QAD-202 remains authoritative for the existing eleven implementation trains: none contains or depends on an official SDK, and compatible Discord libraries/raw HTTP remain supported migration paths. After the public protocol, generated schemas/OpenAPI, compatibility manifest, shared cross-runtime fixtures, and real-service raw/Discord smoke tests are stable, a separately reviewed and authorized project may publish one thin official TypeScript reference SDK. Other languages may implement the same public contract without depending on TypeScript internals.

The protocol and shared fixtures—not SDK code or snapshots—remain authoritative. Initial scope is generated public types, command/schema builders and local validation/canonicalization, explicit hash-aware registration, interaction signature verification/parsing, deadlines and response/defer/follow-up/autocomplete/modal helpers, capability/fallback handling, and fixture-backed test utilities. Importing or constructing the SDK performs no network write; registration is explicit/observable, conflicts and rate limits remain truthful, and helpers never claim to reproduce Fluxer's availability, community policy, audit, idempotency persistence, delegated authority, or final permission checks.

Before the library is called officially supported, maintainers must assign ownership, supported protocol/runtime ranges, semantic version/deprecation/security-update policy, release signing/provenance, secret-safe diagnostics, and compatibility testing. The SDK must pass the same raw fixtures and service smoke paths, exclude secrets/arguments/private responses from default logs/serialization, and preserve QAD-215 protocol overlap. This QAD authorizes durable planning only—not package creation, publication, another implementation train, or support for additional languages.

**Rationale:** deferral prevents an unstable convenience layer from becoming an accidental specification or multiplying change work. A thin generated/fixture-backed consumer can later improve ergonomics while raw parity protects other languages and migrated Discord bots. Explicit maintenance/security gates avoid calling an unowned package official.
