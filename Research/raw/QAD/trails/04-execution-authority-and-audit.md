# Execution Authority and Audit Trail

## Record status

Structured from the recovered 2026-07-17–20 `Analyze bot commands and roles` task, the accepted decision index, later explicit corrections, and repository inspection. This is not a verbatim transcript; `../provenance.md` classifies decision authority.

## Current Fluxer basis

- `fluxer_api/src/api/oauth/BotAuthService.ts` authenticates bot credentials as the bot user; ordinary bot REST calls therefore act with that bot's identity.
- `packages/constants/src/BotPermissionUtils.ts` and its tests limit a non-administrator bot inviter to permission bits the actor already holds, including an explicit denial of an `Administrator` request from a `Manage Guild`-only actor. `fluxer_api/src/api/guild/services/GuildRoleService.ts` (`resolveRequestedPermissions`) applies the same non-owner grant ceiling to ordinary role updates.
- Guild moderation and role services such as `fluxer_api/src/api/guild/services/GuildModerationService.ts`, `fluxer_api/src/api/guild/services/member/GuildMemberAuthService.ts`, and `fluxer_api/src/api/guild/services/member/GuildMemberRoleService.ts` authorize the authenticated actor against native permissions and hierarchy.
- Prefix or application-internal bot commands are opaque to Fluxer. If a bot calls a moderation endpoint with its token, Fluxer currently sees the bot as actor and cannot prove which human caused it.
- `fluxer_api/src/api/models/GuildAuditLog.ts` and `packages/schema/src/domains/guild/GuildAuditLogSchemas.ts` store one acting `user_id`, target/action, reason, options, and changes. They have no first-class invoking user, application, interaction, or authority-mode fields.
- No user-delegated capability or structured native-operation broker currently exists.

## Decision trail

### Trusted acting identity — QAD-037

- **Question:** May an application submit a user ID and thereby select whose permissions authorize an action?
- **Risk:** a caller-controlled user ID would permit confused-deputy and impersonation attacks.
- **Recommendation and answer:** no. Autonomous calls derive the bot from bot authentication. Delegated calls reference opaque server-side interaction authority that supplies the invoker. Permission and hierarchy are rechecked against that derived principal at execution.
- **Classification:** preserves current authenticated-actor derivation for ordinary calls and extends it with a separate trusted delegated path.

### Managed bot permission grant — QAD-038

- **Question:** May `Manage Guild` grant bot permissions the manager does not personally hold, and what proves the application owner's required set?
- **Options considered:** preserve the current “actor may grant held bits” restriction for every bot; require owner/`Administrator` for every nonzero install; trust caller-editable invite bits as authenticated developer requirements; require a Fluxer declaration for every bot; treat `Manage Guild` as an unrestricted application-management boundary; or preserve invite mode while adding a versioned code-defined mode for the exact-set exception.
- **User correction and answer:** absence of the optional code-published `required_bot_permissions` field keeps the application in Discord-compatible invite mode, where the OAuth request selects permissions and `Manage Guild` remains limited to held bits. Publishing the field through the authenticated application API opts into code-defined mode. Fluxer versions/hashes that set; URL bits cannot override it; and `Manage Guild` may grant exactly the current declaration even when it exceeds personally held bits. Consent records the source mode and exact set, and code-defined commit rechecks the revision. The committed set becomes the relationship ceiling in either mode; later expansion, managed-role position, supplemental roles, and ceiling-broadening reinstall require owner/`Administrator`.
- **Migration:** existing applications remain invite-mode compatible. No declaration or mode is inferred from old links, memberships, or roles; code opt-in affects future first installs only, and existing legacy bots are unchanged.
- **Why this is sound:** mandatory Fluxer configuration would impair Discord portability, while treating an editable URL as authenticated intent would create an arbitrary elevation path. Retaining the held-bit ceiling for invite mode preserves the current containment. A server-owned code declaration gives consent and commit the race-checkable source needed for the beyond-held-bits exception. That set may still be powerful and can create indirect bot authority, so the decision explicitly treats `Manage Guild` as trusted installer authority only for that exact source. Durable ceiling enforcement prevents either mode from becoming continuing elevation power.
- **Supersession:** replaces the earlier unrestricted user-approved answer, the interim owner/`Administrator`-only answer, and the single-source proposal that would have blocked portable invite-mode bots pending a Fluxer setting. QAD-214 verifies implementation consistency rather than selecting the boundary.
- **Classification:** preserves current invite-mode/held-bit behavior, intentionally broadens code-defined first-install authority to the exact declaration, and narrows all later bot-authority expansion to owner/`Administrator`.

### Explicit execution modes — QAD-039 and QAD-040

- **Question:** Whose native authority applies to an action requested after a user interaction, and may the community rewrite it?
- **Recommendation and answer:** application definitions declare `AS_USER`, `AS_BOT`, or `REQUIRE_BOTH`; `AS_USER` is the safe default. Communities approve or disable but cannot rewrite the mode. Invocation permission remains separate from action authorization.
- **User-approved naming correction:** `AS_USER`, `AS_BOT`, and `REQUIRE_BOTH` are the exact public/persisted/hash/approval tokens. Draft spec values `DELEGATED`, `BOT`, and `BOTH` are not accepted aliases. Audit reuses the three tokens and adds only `AUTONOMOUS_BOT` for bot activity without an invoking interaction. The internal registry classification `DELEGATED_ELIGIBLE` remains because it describes adapter eligibility rather than selected execution mode.
- **Why this is sound:** explicit modes prevent a user-facing command from silently switching principals, and immutable developer semantics keep one command meaning consistent across communities. Community approval controls acceptance without creating a locally rewritten operation the application did not implement.
- **Supersession:** the naming correction supersedes the conflicting enums previously written in the manifest, audit, and native-operation specs; compatible registrations that omit Fluxer authority fields remain unchanged.
- **Classification:** new server-enforced authority model; current bot calls support only effective `AS_BOT` behavior.

QAD-220 later clarifies that this safe `AS_USER`/delegated default applies only after an application explicitly opts into the structured broker with a nonempty native-operation allowlist. A compatibility registration with no Fluxer authority fields remains ordinary bot authority; Fluxer cannot silently convert its bot-token calls.

### Mode changes — QAD-041

- **Question:** Are apparently safer mode changes allowed without review?
- **Options considered:** allow apparently restrictive transitions automatically; let owner/`Administrator`/`Manage Guild` approve every transition; require owner/`Administrator` for every transition; or require review for all changes while tiering the reviewer by whether bot authority is introduced/broadened.
- **User-approved answer:** every mode change disables the command pending review. Owner/`Administrator` is required for `AS_USER -> AS_BOT`, `AS_USER -> REQUIRE_BOTH`, and `REQUIRE_BOTH -> AS_BOT`. `Manage Guild` may also approve `AS_BOT -> AS_USER`, `AS_BOT -> REQUIRE_BOTH`, and `REQUIRE_BOTH -> AS_USER`. Approval accepts/rejects the developer definition and never raises bot permissions, operations, hierarchy, supplemental roles, or the installed ceiling.
- **Why this is sound:** changing principal can alter eligibility, hierarchy, audit attribution, and application behavior in either direction, so a simple “less permission” comparison cannot skip review. Tiering resolves the former contradiction with QAD-111: `Manage Guild` cannot introduce the community bot as an authorizing principal or remove the invoking-user check from bot-authority execution, but may approve transitions that remove bot authority or add that user check. User-authority execution remains bounded by the invoker's current native permission/hierarchy checks.
- **Supersession:** replaces the earlier statement that `Manage Guild` could approve every mode transition; it does not relax owner/`Administrator` gates for permission-ceiling, position, supplemental-role, or native-operation expansion.
- **Classification:** new approval lifecycle.

### Declared native operation envelope — QAD-042

- **Question:** Can any command use its interaction credential to request any native action?
- **Recommendation and answer:** no. Definitions declare exact allowed native operation types, and undeclared operations are rejected independent of labels or names.
- **Why this is sound:** a typed allowlist binds review to machine-enforceable operations rather than application-controlled prose. Rejecting undeclared types prevents one compromised or deceptive handler from turning a narrow command interaction into broad platform authority.
- **Classification:** new action-broker security boundary.

### Binding user intent — QAD-043

- **Question:** Does permission to invoke an operation imply consent to any target and parameters chosen later by the bot?
- **Recommendation and answer:** no. Unconfirmed authority is bound to normalized user-submitted or definition-fixed security parameters. Materially different or dynamic operations require confirmation of the actual structured action.
- **Why this is sound:** invocation proves intent only for facts the user actually supplied or could see as fixed. Binding those facts prevents post-submit substitution, while confirmation gives the user a trusted view when the application selects a target, scope, or impact later.
- **Classification:** new delegated-authority constraint.

### Platform-owned confirmation — QAD-044

- **Question:** May the application render the security-critical confirmation itself?
- **Recommendation and answer:** Fluxer renders an invoker-only ephemeral confirmation from the structured operation, identifies the application, and grants short-lived exact authority only after confirmation.
- **Why this is sound:** application-rendered text can omit or misrepresent the actual native effect. A platform-rendered prompt sourced from normalized parameters gives the user a trustworthy decision surface and releases only the exact, expiring authority they approved.
- **Classification:** new trusted UI and authorization path.

### Typed command authority manifest — QAD-175

- **Question:** Which published fields distinguish command discovery/invocation defaults from the authority a command may request?
- **Repository evidence:** Fluxer owns permissions as bigint constants, serializes bitfields as decimal strings, and computes effective permissions server-side. Discord compatibility supplies `default_member_permissions`, guild contexts, guild installation types, and `nsfw`, but none is an execution grant.
- **Answer:** retain those compatibility fields and add typed execution mode, registered native-operation allowlist, invocation policy, immutable command key, and independent authority revision/hash. Permission aliases must agree; authority changes follow community review.
- **Why this is sound:** discovery defaults and executable authority answer different questions and therefore need separate typed fields and revisions. Agreement checks avoid ambiguous aliases, and an authority hash lets interactions/reviews detect any material grant change before execution.
- **Classification:** extends current permission constants and compatibility objects with an explicit, reviewable authority boundary. Exact fields are in `specs/command-authority-manifest.md`.

### Non-authoritative permission delivery — QAD-176

- **Question:** Which effective permission context should a developer receive, and may it authorize later work?
- **Repository evidence:** `GatewayService.getUserPermissions` already derives current guild/channel permissions, while native services reauthorize the authenticated actor at execution.
- **Answer:** Fluxer may deliver a server-generated snapshot of invoker/application bitfields, roles, location, capture time, and command authority revision. It is explicitly staleable and non-authoritative; every native operation re-fetches all authorization state.
- **Why this is sound:** the snapshot helps an application render useful behavior without trusting application-computed permissions, but roles and hierarchy can change immediately afterward. Mandatory execution-time lookup preserves the current native services as the only authorization boundary.
- **Classification:** preserves server-derived convenience data while preserving endpoint authorization as the sole security boundary.

### First-class application audit causality — QAD-177

- **Question:** Can the current single-actor audit row explain an action performed through an interaction?
- **Repository evidence:** `GuildAuditLogRow` currently stores one user, target, action, reason, options, and changes, with repository-owned denormalized query tables. It cannot directly identify an invoker/application/interaction/authority chain.
- **Answer:** add typed causal attribution columns and query tables for application, application-command, interaction, and causation. Preallocate audit IDs for retryable effects; retain existing native action types and indexes.
- **Why this is sound:** recording only the bot or user loses who requested, delivered, and authorized an interaction-mediated effect. Typed causal fields and deterministic IDs make retries deduplicate while preserving existing action semantics and query ownership.
- **Classification:** extends the current query-first audit model. Exact storage is in `specs/application-audit-contract.md`.

### Drop-in baseline versus broker opt-in — QAD-220

- **Question:** Can an unchanged Discord slash-command bot be accepted without accidentally opting into or being blocked by Fluxer's delegated authority model?
- **Recommendation and answer:** yes. Missing Fluxer authority fields normalize to bot authority with no structured operations; existing handlers and bot-token endpoints remain bot-authorized/audited. A nonempty native-operation allowlist explicitly opts into the broker, where omitted mode safely defaults to delegated user authority. Community policy may restrict invocation but cannot rewrite later bot calls.
- **Why this is sound:** omission must preserve existing bot-token semantics for a credible migration baseline, while an explicit nonempty allowlist is an unambiguous signal that the developer accepts broker constraints. This prevents accidental delegation and prevents compatibility code from being silently denied.
- **Classification:** preserves current bot-token authentication for the compatibility baseline and makes the new broker explicitly additive.

### Minimized audit storage and audiences — QAD-178

- **Question:** What application data belongs in guild audit history, for how long, and who may see it?
- **Repository evidence:** `GuildModerationRepository` applies a 45-day TTL; guild audit viewing and instance `guild:audit_log:view` are already distinct permission boundaries.
- **Answer:** keep the 45-day window and existing audit audiences. Store only operation-defined normalized security facts; categorically exclude raw interaction values/content and every credential or opaque developer payload. `Manage Guild` alone sees application-management activity but not native moderation history; app ownership grants no guild-audit access.
- **Why this is sound:** causal accountability needs stable security facts, not arbitrary user/application content. Reusing the current TTL and audience boundaries limits new privacy exposure, and separating management from moderation visibility prevents broader application access from leaking guild evidence.
- **Classification:** preserves current retention and least-privilege boundaries while tightening application-data minimization.

### Partial and compensating action history — QAD-179

- **Question:** How can audit history truthfully represent multi-effect partial failure and later recovery?
- **Repository evidence:** current native effects produce TTL-bounded audit rows, but message-delete rows may be destructively grouped into a replacement bulk entry and there is no application causation grouping or compensation state.
- **Answer:** retain each committed native effect, group it under a causation ID and sequence, append a terminal normalized summary, and append rather than rewrite any compensation or reconciliation result.
- **Why this is sound:** independent effects can commit before a later failure, so rewriting history to one success/failure would be false. Append-only grouping preserves what actually happened, its order, and any later compensation without claiming cross-service atomicity.
- **Classification:** adds a compaction-ineligible causal action history beside current TTL-bounded/groupable audit behavior, with causal grouping and recovery truth.

### Exact delegated-capability lifecycle — QAD-180

- **Question:** What record, secret, audience, expiry, consumption, replay, revocation, and revalidation contract makes delegated authority enforceable?
- **Repository evidence:** Fluxer already generates opaque 32-byte base64url OAuth secrets, persists server-side token state, supports TTL rows, conditionally claims work with `insertIfNotExists`, and performs native permission/hierarchy checks at endpoint execution. Current OAuth tokens store bearer values directly and are too broad for exact delegated actions.
- **Answer:** use a server-authoritative, exact-operation capability behind the structured broker. Hash opaque secrets at rest; bind the record to application, installation generation, interaction, invoker, authority revision, normalized parameter hash, and absolute deadline. Conditionally claim it once, drive native effects under a deterministic identity, and make retries observe/resume rather than repeat. Revalidate all current security state at execution. Confirmation claims the exact pending action and never returns reusable user authority.
- **Why this is sound:** every binding removes a replay or substitution dimension, hashing limits database disclosure, and conditional single-use claim prevents duplicate execution. Deterministic effect identity plus current-state reauthorization handles crash retries without turning a short confirmation into reusable impersonation authority.
- **Classification:** new high-risk security domain that extends Fluxer's existing token, conditional-claim, and endpoint-authorization precedents. Exact fields/transitions are in `specs/delegated-capability-contract.md`.

### Complete delegated native-operation coverage — QAD-208

- **Question:** Should delegated authority initially cover only ban/kick examples, or every community-scoped native mutation for which acting as the trusted interaction invoker is appropriate?
- **Initial recommendation:** begin with three dedicated moderation operations as the first enabled slice.
- **User correction and answer:** the master plan must cover all applicable actions, not stop at ban and kick. A schema-owned completeness manifest classifies every bot-authenticated community mutation as delegated-eligible, bot-only, direct-user-only, or out of scope; an unclassified new operation fails CI and an unsupported request never falls back to bot authority.
- **Eligible scope:** typed member/moderation, message/reaction/pin moderation, channel/overwrite, role, safe community/discovery, expression, bounded invite, and credential-free webhook administration operations listed in `specs/delegated-native-operation-registry.md`.
- **Explicit exclusions:** human message/identity/personal-state impersonation, community deletion/ownership transfer or MFA changes, webhook credential minting/execution, private/account/instance surfaces, and autonomous application workflows.
- **Implementation answer:** reuse current native services through exact adapters supplied only with the server-derived invoker; land small risk-coherent sequential operation PRs after the shared broker/confirmation foundation.
- **Why this is sound:** classifying every bot-authenticated mutation closes the gap where an unreviewed endpoint could fall back to bot authority, while exact adapters preserve the existing service's permission/hierarchy checks. Explicit exclusions retain direct reauthentication and identity boundaries that delegated interaction consent cannot satisfy.
- **Classification:** extends all appropriate current community service authorization paths while preserving bot-token autonomy and deliberately excluding impersonation, direct reauthentication, and persistent credential escalation.

### Intent-derived confirmation classes — QAD-209

- **Question:** Must every delegated action prompt, or can Fluxer execute an evident exact command without confirmation while still protecting dynamic, destructive, permission, and mass actions?
- **Recommendation and answer:** execute one exact bounded action directly only when every security-relevant value is provably user-submitted or immutable definition-fixed and the pre-submit UI discloses the native operation/permission. Application-selected or changed facts require an invoker-only exact confirmation. Bulk, history deletion, permissions/hierarchy/access changes, durable resource deletion, and persistent-access creation always require a detailed high-impact confirmation.
- **Clarifying example:** `/nuke` may bind `author = invoker` and an exact date range, but Fluxer must derive and preview the resulting message count/range and obtain an ephemeral Delete/Cancel confirmation because bulk irreversible impact overrides otherwise exact intent. This is consistent with the current direct bulk-delete-own path requiring sudo verification; delegated confirmation does not weaken operations that still require direct reauthentication.
- **Why this is sound:** provenance-based classes avoid habituating users to prompts for harmless exact actions, yet always interpose trusted review when the application chooses facts or the impact is durable/broad. Existing stronger sudo/MFA requirements remain a floor, not something confirmation can replace.
- **Classification:** extends current authorization and the accepted ephemeral component system with trusted intent provenance and tiered friction; it intentionally avoids both prompting for every exact single action and silently executing mass/destructive actions. Exact rules are in `specs/delegated-action-confirmation-policy.md`.

## Still unresolved in this subject

No unresolved product decision remains in this subject. The structured delegated-action broker, invite-mode held-bit rule, code-defined exact-set first-install exception, retained authority ceiling, and owner/`Administrator` expansion gate remain separate controls.

## Cross-cutting completeness audit

- **Scope:** supplements QAD-037 through QAD-044, QAD-175 through QAD-180, QAD-208/QAD-209, and QAD-220.
- **Shared credible alternatives and rejection:** trust an application-supplied acting user or permission snapshot; treat invocation permission as execution authority; use one implicit execution mode; issue a broad/reusable delegated bearer; let the application render security-critical confirmation; log only the bot or overwrite partial history; cover only demonstration operations; silently fall back to bot authority; trust edited invite bits beyond the installer's held permissions; or let `Manage Guild` later expand bot authority. These alternatives permit impersonation, stale/broadened grants, deceptive consent, replay, incomplete attribution, uncovered privilege paths, or open-ended privilege amplification. Server-derived principals, typed manifests, invite-mode held-bit enforcement, the code-defined exact-set exception, a durable ceiling, owner/`Administrator` expansion, exact single-use capabilities, platform-owned confirmation, execution-time revalidation, causal append-only audit, and completeness classification reject those failure modes.
- **Evidence-backed soundness:** the exact guild moderation/member-role service paths above perform present permission/hierarchy checks; OAuth secret/TTL/conditional-claim patterns show reusable primitives but current OAuth tokens are too broad; guild audit rows currently lack application causality and message-delete batching can delete originals in favor of one bulk replacement; ordinary Discord-compatible bot REST calls already use bot authentication. The reasoning therefore preserves native endpoint authority and compatible bot calls while adding a separately explicit broker and protecting its causal rows from destructive compaction, rather than claiming current delegated behavior exists.
- **Tradeoffs:** security gains least authority, replay prevention, exact intent, and truthful actor/causation; operations gain forensic chains but must reconcile partial/compensating effects and protect audit privacy; compatibility keeps ordinary bot-authority code unchanged while broker use is opt-in; maintenance requires an exhaustive schema-owned operation registry/adapters; users may see high-impact confirmations and some actions remain bot-only/direct-user-only, but applications cannot impersonate them.
- **Assumptions and unknowns:** every eligible mutation must be classified as services evolve; operation risk classes/thresholds require review; direct sudo/MFA boundaries remain authoritative; deployment alert values remain external. Permission snapshots are convenience data only, never a fallback. Communities treat `Manage Guild` as trusted to consent beyond held bits only to an application's exact authenticated code declaration; any invite-mode or post-install expansion of that boundary requires a new product/security decision.
- **Consequences and dependencies:** QAD-037 is the principal root; QAD-039/040/041 and QAD-175 define reviewable authority; QAD-042/043/044 feed QAD-180/209 exact capability/confirmation; QAD-177/178/179 own causal, minimized audit; QAD-208 requires CI completeness; QAD-220 separates compatible bot authority from explicit broker opt-in.
- **Supersession:** QAD-220 clarifies QAD-039's default: omission of all Fluxer broker fields remains compatible bot authority, while an opted-in broker mode may default safely. QAD-208 expands the earlier three-operation implementation suggestion to all applicable mutations. QAD-209 refines QAD-043/044's confirmation trigger. No later decision permits caller-selected identity.
