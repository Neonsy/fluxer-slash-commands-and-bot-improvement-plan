# Command Picker, Preferences, and Invocation Policy Trail

## Record status

Structured from the recovered 2026-07-17–20 `Analyze bot commands and roles` task, the accepted decision index, repository inspection, and the earlier Discord UX comparison. QAD-230/QAD-231 and QAD-234 through QAD-236 were appended on 2026-07-20 from explicit user approval. This is not a verbatim transcript; `../provenance.md` classifies decision authority.

## Current Fluxer basis

- `fluxer_app/src/features/devtools/hooks/useCommands.ts` builds the current local command set and uses current-user/community state to expose native commands.
- `fluxer_app/src/features/devtools/utils/CommandUtils.ts` and `fluxer_app/src/features/messaging/utils/SlashCommandUtils.ts` parse selected names locally and intercept native slash commands before ordinary message sending.
- Native API authorization still occurs server-side after client discovery; client filtering is convenience, not the security boundary.
- There is no current application-provider identity, cross-application collision model, community alias, user command preference store, or server-enforced application-command audience policy.

## Decision trail

### One discovery model — QAD-079

- **Question:** Are native Fluxer commands reserved parser exceptions or a first-party provider in the same picker model?
- **Recommendation and answer:** model native and application commands through one discovery/selection abstraction while retaining first-party identity and protections.
- **Why this is sound:** users search for an action, not its storage owner, so separate pickers would duplicate navigation and collision behavior. Provider identity keeps native and application entries distinguishable while server authorization remains unchanged.
- **Classification:** refactors and extends the existing client-native command registry rather than layering a disconnected second picker.

### Collision-free qualified identity — QAD-080, QAD-081, and QAD-082

- **Question:** How can documentation and users address one exact application command despite duplicate friendly names?
- **Options considered:** picker-only disambiguation; mutable application display name; a stable globally unique application handle and qualified syntax.
- **Recommendation and answer:** every application receives a stable global handle, and every command supports `/<application_handle>:<command_key>` in addition to friendly picker discovery.
- **Why this is sound:** friendly names can collide or change, but documentation and explicit invocation need a durable address. Combining a unique application handle with an immutable application-scoped key identifies one command without making the mutable display name authoritative.
- **Classification:** new addressing layer; it does not replace friendly names.

### Handle grammar, lookup, and compatibility — QAD-198

- **Question:** Which parts of the global handle can current Fluxer conventions determine without deciding product-level ownership and reuse policy?
- **Current precedent:** `packages/schema/src/primitives/ChannelValidators.ts` (`VanityURLCodeType`) already defines a human-typed lowercase 2–32-character ASCII/hyphen identifier; `fluxer_api/src/api/oauth/repositories/ApplicationRepository.ts` maintains an authoritative application row plus an explicit query table, and Fluxer's database abstraction supports conditional insertion.
- **Recommendation and answer:** define a separate handle type with that established grammar, resolve through a conditionally claimed global `applications_by_handle` row, keep the immutable application Snowflake as the authorization identity, and parse the first colon in `/<handle>:<developer_key>` structurally. Make the create field additive and require a handle before first Fluxer command publication rather than breaking existing application-create clients.
- **Still open at this point:** reserved names, the handle-less application claim experience, rename/transfer rules, and deletion/reuse duration.
- **Why this is sound:** reusing a familiar bounded grammar reduces input and moderation complexity, while a direct conditional lookup gives one authoritative owner under concurrency. Keeping Snowflakes as authorization identity means human-readable handle reuse cannot retarget a selected command.
- **Classification:** extends current validator and query-first repository patterns while adding a public stable address that the current application model lacks. Exact mechanics are in `specs/application-handle-contract.md`.

### Handle allocation and publication freeze — QAD-203

- **Question:** Given that Fluxer currently creates the application, deterministic bot user, bot token, and client secret together, when and how should a handle be chosen without breaking existing create clients?
- **Options considered:** require a new field from every client; defer every handle until command registration; bulk-backfill all existing applications; or make creation additive with deterministic compatibility allocation.
- **Recommendation and answer:** the developer UI prefills an editable handle; the API field remains optional and deterministically generates/claims a candidate when omitted. Existing applications are not bulk-backfilled; they claim explicitly or automatically on first compatible command publication. An automatically generated handle may be replaced before any command publication, then the first manifest head freezes it. Handles never transfer separately from the application. Application/handle/bot creation becomes a recoverable operation so a failure cannot expose an orphaned active resource.
- **Why this is sound:** optional deterministic allocation preserves old clients and avoids a risky mass migration, while freezing at first publication stabilizes external addressing. Treating application, bot, credentials, and handle as one recoverable operation prevents a partial create from leaking claimable or active resources.
- **Classification:** extends the current always-bot-backed creation response compatibly, intentionally avoids mass backfill, and replaces its sequential no-rollback failure path. Exact flow is in `specs/application-handle-contract.md`.

### Reserved application-handle namespace — QAD-204

- **Question:** Which global handles must public applications be unable to claim without over-reserving useful generic names?
- **Current precedent:** `UsernameType` blocks `everyone`/`here` and Fluxer/system-message impersonation patterns, while `GuildVanityService` rejects vanity codes containing `fluxer`.
- **Options considered:** reserve only `fluxer`; reserve a very broad dictionary including generic bot categories; or reserve a small explicit platform/security namespace plus every handle containing `fluxer`.
- **Recommendation and answer:** reject every canonical handle containing `fluxer` and the exact platform/security names listed in `specs/application-handle-contract.md`; leave generic names such as `bot`, `music`, `tickets`, and `tools` available. Only an audited instance-administrator/bootstrap path may assign reserved names to first-party applications. Public claim failures do not distinguish reserved from already claimed. Future additions never silently seize an existing claim.
- **Why this is sound:** a narrow explicit list blocks the highest-risk platform impersonation without exhausting useful generic names. Indistinguishable public failures reduce namespace probing, and audited first-party assignment plus non-seizure preserves ownership accountability.
- **Classification:** extends Fluxer's existing identity/vanity anti-impersonation rules for a stable global namespace and intentionally makes the list narrow and code-defined.

### Application-handle deletion and reuse — QAD-205

- **Question:** Should a handle remain permanently unavailable after its application is deleted so old qualified text can never resolve to another application?
- **Options considered:** permanent tombstones for every published handle; permanent tombstones only for short/desirable names; delayed reuse; or release after deletion with identity visible at selection.
- **Initial recommendation:** permanently tombstone published handles and quarantine only never-published handles, prioritizing stable old documentation over name reuse.
- **User concern and revised answer:** permanent ownership unnecessarily consumes human-readable names when the application and bot no longer exist. Deletion immediately revokes authority, then the handle is released as soon as the durable deletion state permits and no later than 24 hours after deletion acceptance. Published and unpublished handles use the same rule and any application may make a fresh claim.
- **Safety boundary:** unsent qualified text resolves the current owner and visibly identifies it in the picker; a selected/submitted invocation stores immutable application and command IDs and can never be retargeted by later handle reuse. The application Snowflake remains permanently non-reusable.
- **Why this is sound:** immediate release couples deletion availability to a cross-row cleanup transaction, while permanent or long quarantine exhausts useful names after their owning identity is gone. The selected one-day bound gives the asynchronous, conditionally owned reconciler a predictable user-facing deadline without making mutable text an authority key. The repository supplies no measured duration; 24 hours is an accepted product commitment that must be load/failure tested before activation.
- **Failure and escalation:** deletion acceptance durably schedules the release child operation and its deadline. Safe retries continue until the conditionally owned lookup is released; approaching or missing 24 hours pages the owning operator and is an SLO/contract breach. If ownership cannot be proved, the deleted application remains revoked and the handle stays quarantined rather than being transferred unsafely; status must expose the breach and reconciliation must continue.
- **Classification:** new lifecycle behavior. It prioritizes reusable names over permanent external-document stability while preserving Fluxer's existing Snowflake-as-identity model.

### Personal naming versus shared naming — QAD-083 and QAD-084

- **Question:** May users or communities semantically rename commands, and does a community alias replace the developer name?
- **Tradeoff:** personal names break shared documentation and visible chat attribution; forcing a community alias removes the user's ability to use the known developer command.
- **Recommendation and answer:** no personal semantic renames. A community alias is an additional shared invocation name, while the application-defined name remains executable. Users may choose whether the picker emphasizes the alias or original name.
- **Why this is sound:** command names are shared communication and audit context, so per-user semantic renames would make the same visible invocation mean different things. Additive community aliases provide local vocabulary without breaking developer documentation or original-name recovery.
- **Classification:** new Fluxer behavior that intentionally differs from an alias-as-replacement design.

### Public attribution — QAD-085

- **Question:** Should public output rewrite text to an internal qualified form?
- **Recommendation and answer:** no text replacement. The submitted message records and renders the exact shared name the user selected and visibly attributes the application identity.
- **Why this is sound:** preserving the selected text accurately represents user intent and avoids surprising edits, while visible immutable application attribution supplies the disambiguation needed for readers and audits.
- **Classification:** extends current chat-input behavior with structured identity rather than mutating user text.

### Duplicate preferences — QAD-086 and QAD-089

- **Question:** How is an unqualified duplicate resolved?
- **Options considered:** usage silently chooses; global preference only; community preference only; global default with community override.
- **Recommendation and answer:** only an explicit user preference auto-resolves. Store an account-wide default per duplicate name with an optional community override. Usage affects ordering only.
- **Why this is sound:** implicit usage-based dispatch can invoke the wrong provider without a fresh choice. Explicit defaults are user-owned and predictable, and a community override handles context-specific intent without discarding the account-wide preference.
- **Classification:** new user preference contract.

### Alias uniqueness — QAD-087

- **Question:** Must a community alias be globally unique across all installed applications?
- **Recommendation and answer:** it must be unique only among commands belonging to the same application. Cross-application collisions remain valid and are handled by attribution and preferences.
- **Why this is sound:** global uniqueness would let one application monopolize common community vocabulary. Within-application uniqueness prevents one provider from creating ambiguous choices, while the picker already has provider identity to resolve legitimate cross-application collisions.
- **Classification:** new namespace rule favoring flexible community naming.

### Favorites and passive usage — QAD-088, QAD-090, QAD-094, QAD-096, QAD-097, and QAD-098

- **Question:** What personalization affects order, at what scope, and what data may it retain?
- **Recommendation and answer:** favorites are account-wide and always outrank passive usage. Usage is community-scoped, stores only minimal stable command-identity ordering signals, and never stores arguments or recallable command history. Within favorites, community usage orders results, then stable alphabetical/application tie-breakers. Reset clears only passive ordering, not explicit choices.
- **Why this is sound:** explicit favorites should dominate an inferred signal, and community-scoped recency reflects where a command is actually useful. Storing only identity/rank data improves discovery without creating a searchable history of sensitive arguments or message content.
- **Classification:** new privacy-minimized picker personalization.

### Passive usage retention — QAD-206

- **Question:** How long may Fluxer retain the minimal community-scoped signal used only to order command-picker results?
- **Current precedent:** Fluxer has no existing command-use history or retention contract to preserve; current explicit favorites and preferences are user-owned state rather than passive activity.
- **Recommendation and answer:** retain only a bounded command-identity ranking signal and `last_used_at` under a sliding 90-day inactivity TTL. Never retain arguments, option values, message content, or recallable command history. Reset deletes passive ordering immediately without touching explicit preferences; leaving/deleting the community or deleting the account removes applicable rows.
- **Why this is sound:** a sliding expiry preserves recent ranking value but removes a passive behavioral record after prolonged nonuse, and immediate reset/departure deletion gives the relevant owner control. Ninety days is an accepted product balance rather than a limit derived from current code.
- **Classification:** new privacy-minimized retention policy, implemented through Fluxer's existing TTL-capable repository patterns rather than permanent preference storage.

### Synchronization and hiding — QAD-091, QAD-092, QAD-093, QAD-095, QAD-099, and QAD-100

- **Question:** Can users hide commands, how do they recover them, and what happens to other preferences?
- **Recommendation and answer:** synchronize personal controls across account sessions. A user may hide third-party, but not official Fluxer, commands account-wide by stable identity. Hiding affects ordinary discovery only; qualified invocation remains available, and favorites/preferences remain dormant. The picker offers `Show hidden`; user settings include an application-grouped Commands page for recovery.
- **Why this is sound:** stable identity and account synchronization make hiding predictable across sessions, while a recovery view prevents an irreversible UI trap. Keeping hiding separate from authorization and retained preferences avoids turning personal organization into a security or deletion action.
- **Classification:** new user-owned discovery controls; hiding never changes server availability or authorization.

### Picker card presentation — QAD-101 and QAD-102

- **Question:** Which name is primary when a community alias exists?
- **Recommendation and answer:** default to the community alias with the original application name shown as secondary context. Users may choose globally, with a community override, to emphasize the original instead.
- **Why this is sound:** the alias reflects shared local vocabulary, but always showing the original preserves developer documentation and attribution. A presentation-only preference accommodates user familiarity without changing invocation identity.
- **Classification:** new presentation preference without semantic renaming.

### Application filtering and exact selection — QAD-103, QAD-104, and QAD-105

- **Question:** How does a user narrow results and how is exact identity represented in the composer?
- **Recommendation and answer:** allow application-icon filtering. Keyboard or pointer selection binds exact command/application identity without rewriting typed text. The structured selected item remains in the ordinary chat input and is removable with Backspace/Delete.
- **Why this is sound:** filtering by visible provider helps users resolve collisions, and binding identity at selection prevents later name changes or duplicate text from retargeting submission. Familiar editing/removal behavior keeps the structured token understandable and reversible.
- **Classification:** extends the current composer interception model into structured selection while preserving expected editing behavior.

### Safe unavailable-command visibility — QAD-118

- **Question:** Hide every unavailable command or explain safe failures?
- **Recommendation and answer:** normal browsing hides unavailable commands. Exact search may show a disabled result only with a safe reason such as missing native permission or wrong channel. Developer-disabled, untargeted, and intentionally private commands remain undisclosed to ordinary users; authorized managers can inspect status.
- **Why this is sound:** safe actionable explanations help a user correct local context, while hiding private targeting and suspension detail prevents command or policy enumeration. Audience-tiered manager inspection preserves operability without broad disclosure.
- **Classification:** extends current permission-filtered discovery with server-backed explanations and anti-enumeration rules.

### Native invocation policy helpers — QAD-119

- **Question:** Must every bot independently implement common role/user/channel command access?
- **Recommendation and answer:** Fluxer provides and enforces role, explicit-user, channel, and native-permission invocation policy, rechecking on submission before delivery. Applications may only add stricter internal guards.
- **Why this is sound:** common policy can be enforced consistently before private command data leaves Fluxer, and current-state rechecking prevents stale picker results from authorizing. Applications remain free to narrow behavior but cannot weaken the community's platform gate.
- **Classification:** new backend policy layer; current native action endpoints already establish server-side authorization as the final boundary.

### Developer defaults versus community policy — QAD-120

- **Question:** Are developer-declared audience rules immutable maxima or community defaults?
- **Recommendation and answer:** owner, `Administrator`, or `Manage Guild` may narrow or broaden role/user/channel invocation defaults. They cannot defeat developer disablement/targeting, execution modes, final permission/hierarchy checks, or stricter application guards.
- **Why this is sound:** communities own who may use installed functionality in their spaces, but they do not own developer availability or Fluxer's execution safety boundary. Separating configurable defaults from hard gates gives local control without manufacturing authority.
- **Classification:** new shared-policy ownership model.

### Deterministic policy precedence — QAD-121 and QAD-122

- **Question:** How do explicit user, multiple role, and channel rules combine?
- **Recommendation and answer:** explicit individual allow/deny overrides role rules; otherwise any matching role deny wins over allows; otherwise use default audience. Audience and channel are separate mandatory gates, so a user allow never bypasses the channel policy.
- **Why this is sound:** explicit per-user intent is the most specific audience rule, deny-overrides across roles prevents an additional role from accidentally restoring blocked access, and an independent channel gate ensures audience exceptions cannot escape location constraints.
- **Classification:** new deterministic authorization contract.

### Manager bypass — QAD-123

- **Question:** Do community managers automatically bypass local invocation restrictions?
- **Recommendation and answer:** owner and `Administrator` bypass community-defined audience/channel restrictions. `Manage Guild` may configure policy but does not automatically bypass it. Nobody bypasses developer disablement/targeting, application-wide or community-scoped suspension, or final execution checks.
- **Why this is sound:** owner/Administrator are existing broad community authorities, while `Manage Guild` is configuration power rather than permission to perform every protected action. For example, an Administrator may invoke a command when an ordinary role/channel rule excludes them, but still cannot use a native role action that fails current hierarchy or bot permission checks. Keeping developer, suspension, and final execution checks absolute prevents management status from becoming a cross-boundary bypass.
- **Disclosure and audit:** the server-owned picker/unavailability result identifies `Allowed because you are Owner/Administrator`, and the bounded access-controlled interaction trace records only the policy version and `local_policy_bypass=OWNER|ADMINISTRATOR`. Applications cannot assert the flag, and it does not reveal private audience-rule membership or create a new high-volume guild audit row by itself.
- **Classification:** new application-command policy aligned with Fluxer's existing distinction between configuration authority and action authorization.

### Fluxer policy versus bot behavior configuration — QAD-124

- **Question:** Which settings belong in Fluxer versus bot commands or external dashboards?
- **Recommendation and answer:** Fluxer owns generic invocation policy. Bot-specific behavior such as log destinations, workflow thresholds, and subscriptions remains application-owned unless the developer opts into the later declarative settings framework.
- **Why this is sound:** Fluxer can enforce generic access before delivery, but it cannot safely interpret arbitrary application behavior or external state. The opt-in declarative contract creates an explicit typed ownership boundary instead of absorbing private bot configuration implicitly.
- **Classification:** preserves existing application ownership of undeclared behavior while adding common platform policy.

### Deterministic picker query, cache, and accessibility — QAD-173

- **Question:** What text is searched, how are ties resolved, when is cached availability invalidated, and how does the picker preserve keyboard/screen-reader behavior?
- **Recommendation and answer:** use stable identity-bound relevance over names/aliases/localizations/descriptions/provider data; apply explicit-provider, favorite, usage, locale, lexical, and Snowflake ties; paginate 50; cache by catalog/permission/preference versions; and preserve/extend the existing listbox/IME/keyboard behavior. Full behavior is in `specs/command-picker-and-settings-ui.md`.
- **Current precedent:** current autocomplete already supplies the listbox/navigation mechanics but filters native commands only by lowercase name substring.
- **Why this is sound:** explicit deterministic ranking and tie-breaks prevent result reshuffling or implicit dispatch, versioned cache keys prevent stale availability, and reusing proven listbox/IME mechanics protects keyboard and assistive-technology behavior while discovery expands.
- **Classification:** preserves mature interaction mechanics while replacing name-only discovery with server-versioned provider-aware results.

### Community command administration UI — QAD-174

- **Question:** Which screens, bulk operations, confirmations, and audit entries expose accepted community command controls?
- **Recommendation and answer:** extend Community Settings -> Integrations with application Overview, Commands, Configuration, and Activity. Provide layered status/filtering, per-command controls, safe bulk enable/disable, confirmed reset/authority changes, CAS handling, and linked audit details. Restrict the area to owner/`Administrator`/`Manage Guild`.
- **Current precedent:** `fluxer_app/src/features/user/components/settings_utils/GuildSettingsConstants.ts` already defines a permission-gated Integrations category and responsive settings containers share tab definitions.
- **Why this is sound:** the existing Integrations boundary is where authorized managers already expect application controls. Layered state, confirmations, CAS feedback, and linked audit make high-impact changes reviewable without creating a separate authorization or navigation system.
- **Classification:** extends current settings information architecture rather than creating a third-party dashboard or desktop-only surface.

### Composer-first command input — QAD-230

- **Question:** Should bounded command input normally stay in the composer or open a modal, and how does that preference coexist with compatible application modal callbacks?
- **Options considered:** force every option into the composer; open a modal for every nontrivial command; impose an arbitrary field-count threshold; or prefer the composer for bounded structured input while reserving modals for genuinely form-shaped work.
- **User-approved answer:** prefer the composer when typed options remain understandable and accessible in place. Use a modal for long-form text, several tightly related fields, a form-specific upload, or a layout whose composer presentation would be confusing or inaccessible. Do not use modals merely to hide missing implementations of QAD-227 through QAD-229, and do not force unsuitable form work into the composer. No field count alone decides placement.
- **Workflow boundary:** this is UX/developer guidance, not a server prohibition. The application may respond to a delivered command interaction with the existing compatible `MODAL` callback. That creates a distinct modal workflow: only a modal submission creates a modal-submit interaction, while cancel/dismiss/timeout leaves the workflow incomplete and is never presented as application success. Application identity remains visible; opening transfers focus into the form and close/cancel restores it to the composer/trigger. Validation may preserve bounded recoverable input only while that modal remains live; cancellation/expiry clears it under the existing lifecycle.
- **Privacy and measurement:** first-party examples and developer documentation teach the criteria without a normative field threshold. Aggregate completion, cancellation, validation-error, and latency metrics may compare paths, but command arguments, modal values, uploads, and arbitrary application metadata remain prohibited from telemetry and audit.
- **Current and supplied evidence:** QAD-056 already allows the same logical controls inline or in modal flows, QAD-181/QAD-182 preserve the Discord-compatible command-to-modal callback, and QAD-186 bounds modal lifetime/state. Current Fluxer has no application command composer or modal callback implementation. The supplied PDF recommends inline completion but does not define placement, cancellation, focus, privacy, or protocol boundaries.
- **Why this is sound:** composer-first reduces interruption for bounded slash-command input, while criteria based on comprehension/accessibility avoid cramming real forms into one line. Preserving the compatible callback lets migrated Discord bots retain intentional modal workflows without turning modal use into an automatic fallback or claiming a cancelled form completed.
- **Compatibility classification:** `compatible`. QAD-230 changes no callback, command, or modal wire shape and explicitly preserves the existing compatible type-9 command response. It governs first-party presentation, documentation, and acceptance tests.
- **Risks and unknowns:** placement quality still needs task-based usability and assistive-technology evidence; developers can misuse either surface; form upload cleanup and validation restoration must follow existing lifecycle ownership; aggregate metrics can still become identifying if labeled with high-cardinality command identity. Rollout therefore gates responsive focus, cancellation, validation, privacy, and accurate completion-state tests.
- **Downstream contracts:** update picker/composer guidance, modal grammar/accessibility, response lifecycle semantics, privacy wording, compatibility tests, and P2/E3/R3 rollout acceptance. Later SIM must distinguish initial command delivery, modal opening, cancellation, modal submission, and completed application effect without inventing a new callback.
- **Authority and currency:** the user approved the compact QAD-230 recommendation on 2026-07-20. The five-page PDF is a non-normative community draft dated 2026-07-10 with no author, revision identifier, citations, or publication channel; accepted QAD contracts control.

### Stable command categories — QAD-231

- **Question:** What identity, ownership, membership, limits, disable precedence, lifecycle, picker, audit, and compatibility rules govern application command categories?
- **Options considered:** mutable display-only headings; community-authored tags; developer categories with multiple membership and conflict precedence; one-time bulk enable/disable rewrites; or stable developer-owned single-membership categories with a separate inherited community policy gate.
- **User-approved answer:** an application owns a bounded category registry. Each category has a permanent application-scoped key, stable server identity, default/localized label, and deterministic developer order. At most 25 categories are active, at most 100 keys are reserved for the application lifetime, labels are 1–32 characters, and each command belongs to zero or one category. Communities may disable/re-enable a stable category but cannot rename it or change membership. Categories organize top-level commands and never replace command/subcommand invocation structure.
- **Policy precedence:** category disable is an independent fail-closed availability gate, not a bulk rewrite. It overrides a per-command enable and owner/Administrator community-policy bypass; a per-command disable also denies. Developer availability/targeting, installation/suspension/context, authority approval, audience/channel policy, and final execution authorization continue to pass independently. A command newly assigned or moved into a disabled category is immediately denied; moving it out removes only that category gate.
- **Lifecycle and concurrency:** rename/reorder preserves identity and policy. Removal makes the category and its community rows dormant; reactivation of the same permanent key restores the same identity and policy so delete/re-add cannot evade a manager's deny. Publication changes definition/membership atomically under the manifest head. Community category toggles update one expected-version config row atomically and publish one catalog/config event, not N command rewrites; conflicts return current version for refetch.
- **Picker and accessibility:** empty browsing may group within application/category; active search may flatten matches but retains application/category context. Collapse/expand is keyboard and screen-reader operable with counts and state, and bounded device-local collapse memory is presentation only. An empty category is omitted from end-user browsing but remains visible to authorized developers/managers. Labels never become dispatch or policy identity.
- **Compatibility and audit:** category definitions/membership are an additive Fluxer manifest surface, never Discord fields. An older client may ignore grouping and render each server-eligible command independently; server-side category policy remains enforced. Category configuration audit records actor, application, stable category identity, before/after disabled state, affected command count, and operation ID, never command inputs. Manager UI reports one atomic result rather than false per-command partial success.
- **Current and supplied evidence:** QAD-109 through QAD-124 already separate developer availability, community command configuration, invocation policy, and final authorization; QAD-145/165/169 establish stable keys and immutable manifest heads; QAD-167 owns localization; QAD-173/174 own picker and Integrations UI. `Research/CS/commands-and-permissions.md` verifies that the current local command union has no provider identity, option definition, or category membership. The PDF suggests categories/group toggles but does not define stable identity, precedence, lifecycle, compatibility, or concurrency.
- **Why this is sound:** one developer-owned membership avoids duplicated result rows and conflicting category denies, while a stable policy row makes disable inheritance predictable for later commands and avoids partial bulk writes. Permanent keys prevent rename or delete/re-add from retargeting policy. Flat compatible fallback preserves command migration because grouping is presentation and denial remains server authority.
- **Compatibility classification:** `compatible_additive`. Existing Discord command definitions/handlers remain unchanged; the extension is used only by Fluxer-aware manifest tooling and presentation. Compatible clients can ignore category metadata, but no client may bypass the server's effective availability result.
- **Risks and unknowns:** 25 active/100 reserved keys are accepted product bounds derived from the existing 25-option/100-command and stable-key precedents rather than usage evidence. Very broad categories can hide many commands, moving membership can change availability immediately, device-local collapse state does not synchronize, and localization can make headings long in practice despite the 32-character bound. Rollout measures legitimate limit pressure and tests rename/removal/reactivation, concurrent toggles/publication, new membership inheritance, search/group accessibility, and old-client flattening.
- **Downstream contracts:** extend existing schema/limits/localization, registration, persistence/evolution, picker/settings, error/audit, compatibility, and C/P rollout specifications. SIM-C01 must cover grouping/fallback; SIM-C04 must cover every deny/rename/remove/reactivate/move/new-command/concurrency path and prove presentation never grants authority.
- **Authority and currency:** the user approved the compact QAD-231 recommendation on 2026-07-20. The PDF remains non-authoritative for the same reasons recorded above.

### Community recommended command provider — QAD-234

- **Question:** May a community recommend one provider for an exact duplicate name, where does that signal rank relative to explicit user choice/favorites/passive usage, and what identity, lifecycle, availability, audit, and compatibility rules keep it presentation-only?
- **Options considered:** forbid community recommendations; let the recommendation auto-resolve; rank it above all personalization; place it below passive usage; or insert it below explicit user choices/favorites and above inferred usage while requiring explicit selection.
- **User-approved answer:** owner, `Administrator`, or `Manage Guild` may recommend one exact currently matching provider. Within the same relevance tier, an applicable explicit provider preference wins, then favorite status/rank, then the community recommendation, then passive community usage and existing locale/lexical/identity ties. Only an explicit user provider preference may auto-resolve a duplicate. A favorite or recommendation never binds the composer without user selection.
- **Identity and matching:** store the normalized exact shared invocation name plus stable provider kind, application ID when applicable, and command ID. Native Fluxer commands may be recommended through their reserved stable provider/command identity. Application names, category labels, aliases, localizations, or command display names are never identity. At evaluation the selected command must still expose that exact normalized shared name in the user's current invocation context.
- **Availability/lifecycle:** ignore the signal when the target is user-hidden, unavailable, disabled, untargeted, uninstalled, suspended, retired, or name-mismatched. Do not retarget another provider or promote a weaker text match. Temporary absence/rename/uninstall leaves manager-owned configuration dormant; the same stable identity can resume after matching reactivation/reinstall. Permanent command retirement/application deletion/community deletion or manager reset removes it. Selection and submission recheck all current gates.
- **Ownership, UI, and audit:** store manager recommendation separately from user-owned preference/usage rows, update it with expected config version, invalidate ordering caches, and audit actor/guild/stable selected identity/normalized name/before-after without user data. UI labels it `Recommended by this community`, explains that it affects order only, and offers the ordinary personal preference override. It must not imply Fluxer endorsement, safety review, enablement, or permission.
- **Current and supplied evidence:** QAD-086/QAD-089 already reserve auto-resolution for explicit user preferences; QAD-088/QAD-097/QAD-098 put favorites above passive usage; QAD-173 fixes relevance-tier/tie order and cache ownership; QAD-174 fixes manager authority/UI. `Research/CS/commands-and-permissions.md` verifies that current discovery renders only local command name/description with no provider attribution, recommendation, favorite, or preferred-provider control. The PDF suggests a community default but does not distinguish recommendation from automatic dispatch or define precedence/lifecycle.
- **Why this is sound:** explicit user intent remains strongest, favorites remain stronger than shared guidance, and shared guidance can help first-use discovery before a weak inferred usage signal. Stable identity and exact-name/current-availability checks prevent rename or provider disappearance from retargeting. Keeping recommendation out of dispatch/authorization avoids community preference becoming authority.
- **Compatibility classification:** `compatible_additive`. It changes Fluxer picker ordering/settings only; command registration, interaction payloads, compatible bot handlers, and provider-qualified invocation are unchanged.
- **Risks and unknowns:** managers may overstate trust through recommendations, localized/alias collisions can make matching hard to explain, dormant rows need lifecycle reconciliation, and ranking changes require usability evidence. Clear copy, exact-match fixtures, personal override, unavailable-provider tests, and no-auto-selection assertions gate rollout.
- **Downstream contracts:** update preference persistence, picker/settings/ranking/cache, config audit, data lifecycle, errors/rates, compatibility, and C3/P2 rollout. SIM-C01 must cover first-use order, every precedence combination, unavailable/renamed/uninstalled targets, native/alias/localization collisions, concurrent edits, personal override, and no authorization/selection effect.
- **Authority and currency:** the user approved the compact QAD-234 recommendation on 2026-07-20. The PDF remains a non-normative community draft with no established authority or revision chain.

### Contextual role/channel links to command policy — QAD-235

- **Question:** What role/channel entry points, summaries, deep-link identity, ACL, stale-state, navigation, telemetry, and ownership rules improve discoverability without duplicating or disclosing Integrations policy?
- **Options considered:** put a second policy editor in every role/channel page; show effective allow/deny command lists to anyone who can manage the resource; expose only a generic link; or show authorized explicit-reference counts and navigate into the one filtered Integrations editor.
- **User-approved answer:** role detail and channel-permission settings may show an application-command entry. If the actor also currently has owner, `Administrator`, or `Manage Guild`, show only the count of explicit command-policy rules referencing that stable subject plus `Review in Integrations`. The wording must not claim effective access because member roles, other rules, channel gates, availability, and final authorization also matter. Unauthorized actors receive at most generic noninteractive guidance with no count/policy/link context.
- **Authority and source-of-truth:** `Manage Roles`, channel-management permission, or source-page access alone grants no command-policy read/write. The destination rechecks QAD-174 authority before returning data. The source surface performs no mutation and stores no policy/cache as authority; Integrations retains the only editor, persistence, mutation API, CAS/conflict behavior, cache invalidation, and audit ownership.
- **Deep-link contract:** typed navigation contains stable `guild_id`, subject `{type: ROLE | CHANNEL, id}`, and optional stable `application_id`/`command_id`; browser state serializes IDs only, never labels, policy values, names, or membership. Integrations rereads the current catalog/config/permission versions and filters explicit references to that exact subject. It never retargets a newly created same-name role/channel/command/application.
- **Stale/navigation/accessibility:** deletion/removal yields a safe missing-subject/result state and clears no policy. Permission loss closes protected results; concurrent edits use ordinary config conflict/refresh. Browser Back returns to the originating role/channel view and focus trigger, while direct/stale links fall back only to an authorized Integrations overview. Desktop/narrow layouts, keyboard, focus, screen-reader context/count wording, and history behavior are release gates.
- **Privacy, audit, and measurement:** unauthorized UI, tooltips, accessibility labels, response size, and errors reveal no counts, command/application names, disabled/targeting state, audience membership, or policy detail. Navigation/views create no guild audit event. Aggregate telemetry records only bounded source type and navigation/result class—never guild/resource/command IDs, policy membership, names, arguments, or configuration values.
- **Current and supplied evidence:** `Research/CS/applications-and-installations.md` verifies that current community Integrations contains only Webhooks, Roles has its own `MANAGE_ROLES` gate, and channel settings has no command-policy reference count or deep link. `GuildSettingsConstants.ts` establishes permission-filtered shared responsive settings navigation; QAD-119 through QAD-124 define policy semantics; QAD-173/174 define source UI/CAS/cache authority. The PDF asks for contextual access but does not define whether it is a second editor, what it reveals, or which permission applies.
- **Why this is sound:** authorized reference counts answer whether a resource is explicitly mentioned without pretending to compute a member's effective command access. Stable-ID filtered navigation improves discovery while a single owner prevents drift/partial writes. Reauthorization/no-data unauthorized presentation closes the privilege gap between role/channel management and application management.
- **Compatibility classification:** `compatible_additive`. This is first-party navigation and policy presentation; bot registration, invocation, payloads, and external clients are unchanged.
- **Risks and unknowns:** even an authorized count can become stale between pages, users may misread explicit-reference counts as effective permission, lost-permission races and browser restoration need testing, and telemetry labels could accidentally identify resources. Precise copy, version refresh, server ACL tests, stale/deletion races, and accessibility validation gate rollout.
- **Downstream contracts:** update picker/settings, policy persistence query ownership, errors/rates, audit/privacy, data lifecycle, compatibility, and C3 rollout contracts. SIM-C04 must cover authorized/unauthorized role/channel entry, explicit-reference count semantics, permission loss, deletion/recreation, app/command removal, concurrent edits, Back/focus, and proof the linked surface cannot mutate/disclose independently.
- **Authority and currency:** the user approved the compact QAD-235 recommendation on 2026-07-20. The PDF remains non-authoritative under the recorded provenance limitations.

### Collision-picker prototype and accessibility gate — QAD-236

- **Question:** Should research choose the final visual grouping, provider-cycling navigation, and preferred-provider control now, or require real composer/accessibility evidence first?
- **Options considered:** lock the first plausible desktop design in prose; defer every collision behavior; ship multiple permanent modes; or freeze the already accepted behavioral/security invariants while prototyping the remaining presentation choices before selection.
- **User-approved answer:** keep immutable identity binding, visible/accessibly named provider attribution, deterministic QAD-234 ranking, explicit-preference-only auto-resolution, current-state authorization, safe unavailable behavior, application filtering, and coherent listbox/IME/focus semantics fixed. Do not yet select flat versus exact-collision grouping, ordinary list navigation versus an extra provider-cycling shortcut, or star/row/menu/details preference controls.
- **Prototype matrix:** run representative variants in the real composer with no collision, two providers, many providers, large catalogs, long/localized names, preference/recommendation/favorite/unavailable explanations, stale cache, pagination, filters, desktop/narrow/touch, high zoom, reduced motion, keyboard-only, IME, and supported screen-reader flows. Context menu/long press requires an equivalent visible keyboard/screen-reader route. Tab cycling is eligible only if evidence shows normal focus expectations remain coherent.
- **Evidence and selection:** record the task, variant, environment, observed completion/error/confusion, focus/announcement behavior, invariant failures, and rejected tradeoffs. Do not invent a numerical threshold without a baseline. Any identity ambiguity, presentation-driven dispatch/authority change, focus trap, inaccessible preference action, or unusable responsive state rejects the variant. Product/accessibility review records the chosen shape as a QAD-173/QAD-236 addendum and updates the canonical picker spec before production UI implementation proceeds.
- **Current and supplied evidence:** existing QAD-079 through QAD-105 and QAD-173 fix behavior, while `Research/CS/commands-and-permissions.md` verifies only native ARIA-listbox/keyboard/IME mechanics and name/description rows—not a multi-provider application picker. The PDF supplies example collision layouts but no user study, accessibility evaluation, device matrix, or authority. The accepted record therefore treats it as a validation need rather than a product answer.
- **Why this is sound:** visual density, grouping, shortcut, and action discoverability are empirical interaction questions. Freezing security/identity semantics prevents prototype drift, while delaying only presentation avoids treating an untested mockup as protocol or forcing implementation to defend an arbitrary control.
- **Compatibility classification:** `not_applicable_ui_evidence_gate`. QAD-236 changes no public protocol; every candidate must preserve the already classified command/interaction compatibility contracts.
- **Risks and unknowns:** prototype participants/environments may be unrepresentative, screen-reader/browser combinations vary, and qualitative evidence can be overread. The record must state coverage/limitations and cannot waive an invariant because one variant performed faster.
- **Downstream contracts:** add the gate/matrix to the picker and P2 rollout specs and keep grouping/cycling/preference control wording explicitly pending evidence. SIM-C01 must enforce invariants and fail closed if later scenarios assume an unapproved visual choice.
- **Authority and currency:** the user approved the explained evidence-gate meaning on 2026-07-20. The PDF's sample presentation remains non-authoritative.

## Cross-cutting completeness audit

- **Scope:** supplements QAD-079 through QAD-105, QAD-118 through QAD-124, QAD-173/QAD-174, QAD-198, QAD-203 through QAD-206, QAD-230/QAD-231, and QAD-234 through QAD-236.
- **Shared credible alternatives and rejection:** resolve/dispatch solely by friendly text; permanently rewrite typed text; let a community alias replace the developer name; allow personal semantic renames; make hiding/recommendation/ranking affect authorization; store arguments/history for usage order; use mutable display names as global handles; permanently tombstone every deleted handle; permit unbounded passive ranking; make every command modal-first; force every form into the composer; use mutable/multi-owner category tags; implement category disable as repeated per-command writes; or duplicate policy editors in role/channel pages. These designs create collisions/retargeting, misleading attribution, shared-documentation breakage, privacy expansion, authority coupling, inaccessible input, category-policy ambiguity, partial writes, ACL drift, or permanent namespace exhaustion. Immutable IDs, visible attribution, additive aliases, explicit-user resolution, presentation-only recommendation, contextual composer/modal criteria, stable atomic category policy, and one linked policy owner address those risks.
- **Evidence-backed soundness:** `fluxer_app/src/features/devtools/hooks/useCommands.ts`, `fluxer_app/src/features/messaging/utils/SlashCommandUtils.ts`, and `fluxer_app/src/features/devtools/utils/CommandUtils.ts` establish string-parsed native discovery; `fluxer_app/src/features/user/components/settings_utils/GuildSettingsConstants.ts` establishes the Integrations/settings precedent; current user/user-guild settings establish sync scopes; `packages/schema/src/primitives/ChannelValidators.ts`, `fluxer_api/src/api/oauth/repositories/ApplicationRepository.ts`, and typed database conditional claims establish handle grammar/query ownership. There is no current third-party picker or stable handle, so these are extensions rather than present behavior.
- **Tradeoffs:** security binds invocation before mutable text/handle/category-label changes and keeps preferences/recommendations/navigation non-authoritative; operations must maintain caches/index reconciliation, handle release, category/recommendation lifecycle, and versioned filtered reads; compatibility retains friendly unqualified/flat command use and compatible modals while qualified names/categories/recommendations/links are additive; maintenance gains one typed discovery/policy model but adds ranking/preference/alias/category/recommendation state; users get favorites, guidance, aliases, filtering, accessible composer/forms, category controls, and contextual policy discovery but lose personal semantic renaming/community category membership and accept device-local collapse state.
- **Assumptions and unknowns:** handle/category demand and ranking/grouping quality need observed tuning; reserved names are a reviewed code list; passive-order cleanup cadence is operational; modal/category accessibility requires real testing; old external documentation cannot be made permanently stable under QAD-205. None changes final authorization or permits hidden argument collection.
- **Consequences and dependencies:** QAD-079/080/081/082 establish merged discovery and exact addressing; QAD-083 through QAD-105 own presentation/personalization; QAD-118 through QAD-124 keep availability/policy separate from execution; QAD-173/174 specify cache/UI ownership; QAD-198/203/204/205 own handle storage/lifecycle; QAD-206 bounds passive data; QAD-230 preserves QAD-181/182 modal callbacks; QAD-231 layers stable group policy; QAD-234 inserts shared guidance below explicit user signals; QAD-235 adds authorized navigation without replacing Integrations; QAD-236 blocks untested collision-control selection while preserving all prior invariants.
- **Supersession:** QAD-203 through QAD-205 close the allocation/reservation/reuse questions left open by QAD-198. QAD-206 adds a TTL to passive ranking without changing explicit favorites/hiding. QAD-205 records the user's rejection of the initial permanent-tombstone recommendation. No preference decision supersedes command authorization.
