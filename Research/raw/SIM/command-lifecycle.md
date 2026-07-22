# Command Registry and Naming Simulations

## SIM-C01 — compatible registration, duplicate providers, recommendation ordering, and exact selection

### Scenario and purpose

Two installed applications publish a command displayed as `/deploy`. One community adds another `/deploy` alias to a different command and recommends one eligible provider. A compatibility client omits Fluxer extensions. The scenario tests immutable identity, collision-safe discovery, provider-precedence ordering, unavailable preferences, community aliases, privacy-bounded usage ranking, and the bot-authority compatibility baseline.

### Decision and current-state evidence

- **Controlling QAD:** `../QAD/trails/02-command-lifecycle-and-schema.md` -> QAD-021/027–029 (stable identity), QAD-109/113/165/169 (one schema, immediate publication, immutable storage, compatible routes), QAD-220 (ordinary bot-authority normalization); `../QAD/trails/03-command-picker-preferences-and-policy.md` -> QAD-079–087, QAD-097–105, QAD-173–174, QAD-198, QAD-203–206, QAD-234, and QAD-236 (provider identity, preference/favorite/usage/recommendation precedence, and collision evidence gate).
- **Exact specs:** `../QAD/specs/command-registration-api.md` -> `Stable-key compatibility`, `Immutable immediate publication`; `../QAD/specs/command-picker-and-settings-ui.md` -> `Picker query`, `Community provider recommendation`, `Collision-picker design evidence gate`.
- **Current constraints:** CS-COMMAND and CS-AUTH. `fluxer_app/src/features/devtools/hooks/useCommands.ts`, `fluxer_app/src/features/messaging/utils/SlashCommandUtils.ts`, and `fluxer_app/src/features/channel/components/AutocompleteCommand.tsx` expose/render only a local name-oriented native registry; there is no server catalog, provider identity, alias store, recommendation, preference control, collision grouping, handle, or application command endpoint.

### Actors, permissions, and initial state

- Developers own `app-A` (`handle=alpha`) and `app-B` (`handle=beta`); both are actively installed in `guild-G`.
- Community manager `manager-M` has `Manage Guild`. User `user-U` can invoke both under server policy.
- `user-U` has an applicable community-specific provider preference for `app-A`, a favorite for `app-B`, and a bounded guild/command usage row favoring `app-B`; neither preference nor usage stores command arguments or message content. `manager-M` recommends `app-A` for the exact normalized shared name `deploy`.
- `app-A` registers `{name:"deploy"}` with no `key` or Fluxer authority fields. `app-B` registers stable key `ship` with name `deploy`.
- A separate `app-A` command key `status` exists; `manager-M` proposes its within-application alias `deploy`.

### Expected processing and state changes

1. The compatible `app-A` registration authenticates the application, derives a normalized immutable key from initial name (adding a deterministic suffix only for an application-local key collision), and normalizes missing authority fields to bot authority plus an empty broker-operation allowlist. It does not silently opt into delegated authority.
2. For each application, registration reads the expected manifest head, validates the complete candidate, writes immutable command revisions/complete manifest entries, then CAS-advances one head. Visibility starts only after the head commits.
3. `app-A/deploy` and `app-B/ship` have distinct application and command Snowflakes despite the same display name. The collision is valid.
4. `manager-M`'s proposed alias `deploy` for `app-A/status` is rejected because aliases are unique among commands in the same application. It would not be rejected merely because `app-B` uses the same name.
5. The picker returns both providers with visible/accessibly named application attribution. Text search never dispatches. Selecting a row binds immutable application/command identity while preserving the exact typed/shared name for public rendering; no later label, order, or handle change can alter that binding.
6. The applicable community-specific preference places `app-A` first and is the only signal allowed to auto-resolve the unqualified duplicate. If that preference is cleared, the `app-B` favorite ranks ahead of the community recommendation; if the favorite is also cleared, the `app-A` recommendation ranks ahead of passive usage. Favorite, recommendation, and usage reorder only and never auto-select.
7. If preferred `app-A` becomes unavailable through targeting, category/command disablement, suspension, context, hiding, or authorization, the stale explicit preference opens attributed selection instead of silently falling through to the favorite/recommended provider. An unavailable recommendation is ignored for visible ordering and never substitutes a different provider. Query and selection recheck the recommendation's exact shared name and stable provider/command identity.
8. Qualified forms `/alpha:deploy` and `/beta:ship` address exact providers. The QAD-236 gate permits the scenario to assert attribution, ordering, filtering, immutable binding, and listbox/IME/focus behavior, but not a final flat/grouped layout, extra cycling key, or preference-control visual.
9. If a deleted application handle is later reused, unsent text resolves the current owner with visible identity. An already-selected/submitted invocation remains bound to immutable application/command IDs and cannot retarget.
10. A successful invocation may refresh only `user-U`'s bounded ranking signal and `last_used_at`. After 90 days without another success, logical expiry removes its ordering influence before physical cleanup; the explicit provider preference/favorite remains. Ordering reset removes passive rows only, while guild departure/deletion and account deletion remove the applicable scope. Arguments, option values, content, and recallable history are never retained.

### Persistence, authority, and audit

- Manifest heads and immutable definitions are application-owned registry truth. Community aliases/policy and the exact-name provider recommendation are manager-owned rows keyed by stable identity. Provider preferences/favorites are user-owned; none alters server availability.
- Recommendation and passive usage are presentation-only. Passive usage is user/guild/command-scoped, privacy-minimized, cannot authorize or auto-select a provider, and expires under QAD-206.
- Public output shows the exact shared name and application attribution; Fluxer does not rewrite it to a qualified spelling.
- Registration audit/publication events attribute the developer/application; alias activity attributes `manager-M`. Neither grants runtime authorization: invocation policy and native endpoint checks still execute.

### Failure, concurrency, and limits

- Concurrent publications against the same head: one wins; the other gets `COMMAND_MANIFEST_CONFLICT`, refetches, and rebuilds a complete candidate. The server never silently merges bulk manifests.
- A failed head CAS leaves an unreachable candidate that is not visible and can be removed after the defined safety/reference check.
- Identity, display name, alias, or application text is never treated as an actor or authorization selector.

### Conclusion and implementation gap

Stable composite provider identity resolves collisions without forbidding familiar names, while explicit-preference-only auto-resolution and ordering-only shared signals prevent community guidance from becoming dispatch authority. The compatibility normalization preserves existing bot-token semantics. Current client name dispatch cannot prove these properties; the registry/provider refactor, identity-bound submission, and QAD-236 prototype review are prerequisites.

## SIM-C02 — deletion is dormant; retirement is reference-gated; later key reuse is new identity

### Scenario and purpose

Developer deletes command key `deploy`, then tries to retire it while retained manifests, community policy, and a user favorite still reference it. Later all references are explicitly removed and the key is reused. This distinguishes deletion, disablement, dormant configuration, irreversible retirement, and key reuse.

### Decision and current-state evidence

- **Controlling QAD:** QAD-021–031 (dormant config, disablement, reset, permanent application deletion), QAD-114/115 (recovery bounds), and QAD-224 (1,000 identities; 20+5 manifests; reference-gated retirement).
- **Exact specs:** `../QAD/specs/command-persistence.md` -> `Identity and history retention`, `Application command identity`, `Community command configuration`, `Synchronized user preferences`; `../QAD/specs/command-registration-api.md` -> `Retention and explicit identity retirement`.
- **Current constraints:** CS-COMMAND. No command row or configuration/reference graph exists, so the current code cannot preserve or prove absence of dependencies.

### Actors, permissions, and initial state

- Developer owns `app-A`. Command stable key `deploy` maps to immutable `command-17` and is in current manifest 44.
- Guild configuration gives it alias `release`; a user favorite and provider preference reference `command-17`; retained manifest 35 also includes it.
- The app has 1,000 retained identities including inactive ones.

### Expected processing and state changes

1. Compatible DELETE builds and publishes manifest 45 without `command-17`, sets the command dormant/deleted marker, and keeps the key mapping and community/user references. It does not erase settings.
2. Discovery hides the absent/developer-disabled command from ordinary users. Manager views can explain dormant status safely. Community enablement cannot override developer absence.
3. Re-registering key `deploy` before retirement resolves `command-17`, creates a new immutable revision, and reactivates its retained alias/policy/preferences subject to current target and authority approval. Same display name with a different key inherits nothing.
4. Instead, the developer requests owner-only retirement while retained manifest 35, guild configuration, and user preference exist. The request fails with blocking categories only; it does not reveal the other user's private preference.
5. Manifest aging alone is insufficient. Recovery/pins keep only the newest 20 plus up to 5 explicitly pinned manifests; temporary extra retention is allowed only for in-flight references. Cleanup rereads references and never removes the current head.
6. Authorized community reset removes manager-owned override references; the user removes favorite/preference; active interactions finish/expire; manifest 35 leaves the retained/pinned window. A second version-checked retirement proves no dependency, removes the old key mapping/identity, and records the irreversible event.
7. Publishing `deploy` afterward creates `command-1000-new` with no inherited aliases, approvals, favorites, or dormant settings. Old selected invocations still identify retired `command-17` and fail; they never retarget.
8. Attempting to create identity 1,001 is rejected. Inactive identities count until retirement completes, preventing churn around the cap.

### Ownership, deletion, retention, and recovery

- Ordinary delete is reversible developer publication. Retirement is owner-only and reference-gated. Community reset is manager-owned. User preferences are removed only by the user or their lifecycle deletion. Permanent application deletion removes active/dormant configuration and identity mappings under deletion/non-resurrection controls.
- Audit records categories/counts but not user-private preference data. Cleanup is idempotent and cannot mark retired if any recheck discovers a reference.
- Application manifest recovery can only select one of the newest 20 or 5 pins, revalidate it, and publish its contents as a new head. It cannot restore backend code/data/external effects/completed interactions.

### Conclusion and implementation gap

The scenario demonstrates why delete and retirement cannot be synonyms: durable configuration is safe only while identity cannot silently acquire a new meaning. The 1,000-identity ceiling plus reference-gated retirement bounds tombstone growth without misattaching state. All persistence and reference checks are new implementation work.

## SIM-C03 — limits, unchanged publication, concurrent heads, dashboard state, stale forms, and recovery

### Scenario and purpose

An application attempts an oversized bulk manifest, repeats a canonically equivalent publication, and then races a real structural change while a user has an old command form and the owner dashboard open. A later recovery selects an earlier manifest. This tests numerical limits, semantic no-op behavior, head concurrency, dashboard source-of-truth boundaries, all-or-nothing visibility, stale mapping, and recovery wording.

### Decision and current-state evidence

- **Controlling QAD:** QAD-109–116, QAD-165–172, QAD-224, QAD-232, and QAD-233. Exact values are `../QAD/specs/command-schema-limits-and-localization.md` -> `Initial limits`; structural behavior is `../QAD/specs/command-schema-evolution.md` -> `Revision counters`, `Refresh mapping algorithm`; publication/dashboard behavior is `../QAD/specs/command-registration-api.md` -> `Canonical unchanged-publication no-op`, `Immutable immediate publication`, `Developer dashboard composition`.
- **Exact UI spec:** `../QAD/specs/command-picker-and-settings-ui.md` -> `Developer Settings -> Command Dashboard`.
- **Current constraints:** CS-COMMAND, CS-RATE, and CS-SURFACES. Fluxer has centralized validation/rate-limit/error conventions and an owned-application settings page, but no application command schema, version distinction, immutable candidate/head, stale structured form, command publication history, or dashboard.

### Actors, permissions, and preconditions

- Developer-owner `owner-D` publishes for `app-A`; user `user-U` has open schema version 8 for command identity `command-17`.
- Current manifest is 50. The first request contains 101 commands; another candidate is 8 MiB plus one byte. A semantically equal request varies JSON/map ordering and omits fields that canonical defaults restore. The real change modifies stable option key `environment` bounds and adds metadata.
- `owner-D` has the dashboard open on manifest 50. A bot token can call registration APIs but cannot authenticate the human dashboard.

### Expected processing and transitions

1. Validation rejects 101 commands before persistence because a manifest has at most 100. It independently rejects canonical manifest size above 8 MiB and command definition above 512 KiB. Other enforced limits include 1–32 names, 1–100 descriptions, 25 options/choices, two organizational levels, 6,000-character strings, 8,000 counted command text, and 64-character immutable developer keys.
2. The equivalent request still authenticates, consumes its ordinary route budget, parses, fully validates, resolves stable identities, and builds canonical bytes. Hash plus byte/object equality with manifest 50 returns the endpoint's compatible status/body and current revisions with `Fluxer-Publication-Status: unchanged`.
3. That no-op allocates no identity/revision/manifest, advances no head, emits no publication/catalog/audit event, invalidates no cache, and creates no durable history. The dashboard shows `No changes — already published` for the action but no new Publications row; any existing draft remains until explicit edit/discard.
4. Repeating the same candidate with explicit stale expected head 49 returns the existing version conflict before no-op success. The dashboard preserves the local candidate and offers refresh/export/manual reapplication; neither service nor UI silently rebases it.
5. Two complete no-precondition requests race with the same real changed candidate. One CAS-publishes manifest 51 and emits one deterministic event. The loser rereads once and returns no-op only because the newly current canonical state exactly equals its already validated candidate. A divergent loser returns `COMMAND_MANIFEST_CONFLICT` and no merge.
6. A crash after complete immutable candidate writes but before head CAS leaves manifest 50 or 51, whichever is still the head, as the only visible truth; readers/dashboard never merge unreachable rows. Reconciliation may garbage-collect an unreferenced candidate after its safety/reference window.
7. The committed metadata edit increments metadata history without invalidating the form; the changed `environment` bounds/shape increments schema version to 9. Submission from form version 8 is rejected before application delivery with the current schema/diff. Fluxer maps only exact stable option paths with unchanged fundamental types, revalidates values, marks invalid data for correction, and requires `user-U` to resubmit. It never coerces or auto-invokes.
8. Dashboard reads come from canonical registry/draft/target/history/health owners, page at 50, and expose no command values, user/community-private policy, credentials, or separate dashboard copy. Ownership loss or application deletion makes the next view/mutation/deep link unauthorized; a stale resource link falls back only to the authorized application overview.
9. `owner-D` later chooses retained manifest 49. Recovery revalidates current limits/authority/targets, previews registry-only scope, writes old contents as new immutable manifest 52 with a recovery source pointer, and CAS-publishes it. Community settings follow stable keys; authority expansion may return to pending approval.
10. Recovery does not undo interactions already delivered, application backend changes, messages, native effects, community-owned settings, or external application data.

### Concurrency, audit, and operational behavior

- Publication/no-op attempts share the expensive 10/minute budget and compatible new-identity ceiling described by QAD-171/172; callers honor structured `429` state/headers. No-op outcome metrics are bounded and do not contain candidate definitions or high-cardinality identities.
- Concurrent heads yield the exact no-op-or-conflict outcomes above. A reconciler can repair derived indexes from a verified head but cannot choose a semantic rollback target or synthesize partial content.
- Operator evidence includes head/revision/hash, validation failure classes, unreachable candidates, publication lag, and reconciliation status; raw options/user values and dashboard exports are not logged.

### Conclusion and implementation gap

The scenario validates that full validation plus canonical equality avoids false publication without weakening concurrency intent, while a single head CAS makes complete visibility testable and stable field identity prevents unsafe stale-value guessing. The dashboard is a view/controller over those owners, and recovery is deliberately republishing, not time travel. No current registry or application page implements these guarantees.

## SIM-C04 — category policy, contextual links, manager bypass, and final authority remain distinct

### Scenario and purpose

A categorized command has overlapping user, role, and channel rules. An individually allowed user, a member with conflicting roles, a policy manager, and an Administrator attempt invocation while category/policy state changes. Role/channel settings also request contextual policy summaries before a referenced subject is deleted. The Administrator then requests a native role effect the bot cannot perform. This tests category deny inheritance and linked-view ACLs without confusing presentation, local policy, or final execution authority.

### Decision and current-state evidence

- **Controlling QAD:** QAD-118–124 (policy ownership, precedence, independent channel gate, manager bypass); QAD-173/174 (server-versioned picker/settings); QAD-175–180 (current-state reauthorization and audit); QAD-231 (stable categories and inherited disable); QAD-235 (ACL-gated contextual policy navigation).
- **Exact specs:** `../QAD/specs/command-picker-and-settings-ui.md` -> `Availability presentation`, `Invocation policy evaluation and manager bypass`, `Category grouping and presentation`, `Community Settings -> Integrations`, `Contextual role/channel policy entry points`; `../QAD/specs/command-authority-manifest.md` -> `Invocation snapshot`; `../QAD/specs/application-audit-contract.md` -> `Visibility and retention`.
- **Current constraints:** CS-COMMAND, CS-AUTH, and CS-SURFACES. Current client-native command filtering is name-oriented and current bot endpoints authorize the bot user; community Integrations contains only Webhooks and role/channel tabs have no command-policy summaries/links. There is no application category/policy row, config version, provider-aware query, trusted invocation snapshot, or manager-bypass trace.

### Actors, policy, and initial state

- `command-17` is active, targeted, installed in `guild-G`, and belongs to stable category `operations`; application and installation are not suspended. The category is initially enabled.
- Alice has an explicit audience allow and also a denied role. Bob has one allowed and one denied role. Morgan has `Manage Guild` and `Manage Roles` but is explicitly denied. Ada has `Administrator` and is excluded by both ordinary audience and channel rules. Rowan has `Manage Roles`/channel-settings access but lacks owner, `Administrator`, and `Manage Guild`.
- Channel `channel-1` is denied for ordinary policy; `channel-2` is allowed. Policy version 8 is current when the picker opens.

### Expected processing and state changes

1. Alice's individual allow overrides her denied role, but invocation in `channel-1` still fails because audience and channel are independent required gates. Her explicit audience allow is not a location bypass.
2. Bob has no individual rule, so the matching role deny wins over the role allow. The safe result does not disclose which private role rule decided the outcome.
3. Morgan can view and edit command policy in Integrations, but `Manage Guild` alone does not authorize invocation; Morgan remains denied by the configured audience rule.
4. Ada bypasses only the community-authored audience/channel restrictions. The picker says `Allowed because you are Owner/Administrator`; submission records policy version 8 and server-owned `local_policy_bypass=ADMINISTRATOR` in the access-controlled interaction trace. The application cannot supply or alter that reason.
5. Morgan atomically disables category `operations` after Ada selects the row. Submission rereads the category/config head and rejects before delivery. Category deny is absolute for Ada too: owner/Administrator bypass covers only community audience/channel rules, and a per-command enable cannot override category disable. The toggle produces one category audit/config mutation, not one rewrite per member.
6. The developer publishes new `command-18` into the still-disabled stable category. It is denied immediately without a new community write. Moving/renaming/relocalizing category presentation does not change stable category identity or the retained deny; removing/reintroducing the same key restores it, while a different key inherits nothing.
7. After Morgan re-enables the category, a separate manager publishes policy version 9 after selection. Submission rereads current state and evaluates version 9; the cached row and version 8 snapshot do not authorize execution. Developer disablement, untargeting, uninstall, suspension, or a qualified spelling would preserve the same denial boundary.
8. Rowan can open the ordinary role/channel source settings but receives no count, link, command/application name, tooltip, or accessible-label detail because source-page authority alone is insufficient. Morgan passes both the source-page check and the separate owner/Administrator/`Manage Guild` check, so the server returns only `N explicit command policies reference this role/channel` plus a stable-ID **Review in Integrations** link; it does not claim effective access.
9. Integrations reauthorizes and rereads current catalog/config/permission versions, owns every edit/CAS/audit operation, and stores no linked-view policy copy. Deleting the referenced role/channel makes the link safely stale; recreating the same label with a new ID does not retarget it. Permission loss closes results, while Back restores the source view/focus only as client navigation state.
10. Presentation never grants authority: count visibility, category grouping/collapse, recommendation, filtering, deep-link presence, or manager edit access cannot invoke a command. Ada's later Fluxer-native role effect is rejected because the bot's current managed role is below the target role. Administrator status and the earlier local-policy bypass do not grant bot or delegated authority.

### Audit, privacy, and failure behavior

- Ordinary invocation/bypass and contextual summary reads do not create high-volume guild audit rows. The bounded invocation trace stores identities, policy version, safe bypass enum, state/result, and timing—never arguments, values, or matched private rule membership. Summary telemetry cannot label subject/application/command identities.
- Any successful native effect would receive the separate causal guild audit contract with actual invoker/application/bot/authority attribution. This rejected pre-effect request remains a safe result trace unless its operation-specific security policy requires a failed summary.
- Cache, query, or required interaction-trace write failure cannot turn a denial into authorization. Authoritative policy and final permission reads fail closed; if the interaction row/trace cannot persist, no delivery occurs. Retry obtains current state rather than reusing a client decision.

### Conclusion and implementation gap

The trace shows why category/configuration authority, contextual presentation, local invocation bypass, and effect authority are separate. Stable category identity makes inherited deny deterministic for current and future members; the linked view improves navigation without duplicating policy ownership or leaking it to source-page-only users. No presentation or manager status crosses suspension or native permission boundaries. Every server category/policy/index/version/trace primitive in this scenario is new work.

## SIM-C05 — concurrent application creation respects the cap and deleted handles release safely

### Scenario and purpose

One owner already has 49 retained applications and submits two concurrent create requests. The winning application is later deleted while handle release experiences retries. This tests QAD-203–205 and QAD-207 across capacity races, partial creation, deletion timing, deadline escalation, safe reuse, and cleanup.

### Decision and current-state evidence

- **Controlling QAD:** QAD-203 (recoverable application/bot/credential/handle creation), QAD-204 (reserved namespace), QAD-205 (release within 24 hours and immutable-identity safety), QAD-207 (50 non-deleted applications while creation controls remain).
- **Exact specs:** `../QAD/specs/application-handle-contract.md` -> `Storage and uniqueness`, `Recoverable application creation`, `Required validation`; `../QAD/specs/application-data-lifecycle.md` -> `Permanent application deletion sequence`.
- **Current constraints:** CS-CREATE and CS-INSTALL. `OAuth2ApplicationsRequestService` currently counts owned applications against `MAX_APPLICATIONS_PER_USER=25`, while the create route separately requires authentication, CAPTCHA, and its 10/hour limit. Current application creation has no owner-scoped conditional capacity slot or recoverable handle/bot/credential operation.

### Actors and initial state

- Owner Olivia has 49 non-deleted applications, including suspended and dormant entries. Both new requests pass authentication, CAPTCHA, and route rate limiting.
- Operations `create-A` and `create-B` request distinct valid handles. Another owner, Noah, later attempts to claim the winning handle after deletion starts.

### Expected processing and state changes

1. Both requests race for owner slot 50. One conditional reservation succeeds for `create-A`; `create-B` receives the existing typed `MAX_APPLICATIONS` result. A count-then-create race cannot produce 51 retained applications.
2. A retry of `create-A` uses the same operation and slot. It verifies any conditionally owned handle/bot/application rows and never consumes a second slot or returns a different credential as if it were a new success.
3. If `create-A` crashes after handle or bot allocation, the partially owned slot remains unavailable while cleanup is ambiguous. Reconciliation either completes the exact operation or proves no live application/credential/resource remains before releasing the slot; a fresh create cannot exploit the uncertainty.
4. After activation, permanent deletion of `app-A` first revokes bot/application authority and durably schedules a handle-release child operation with its acceptance time and 24-hour deadline. `app-A` continues to consume Olivia's slot until permanent deletion completes.
5. Noah's pre-release claim receives `APPLICATION_HANDLE_UNAVAILABLE`. The release worker conditionally verifies that the lookup still belongs to deleted `app-A`; transient store failure causes safe retry, not an overwrite or inferred transfer.
6. Approaching the deadline produces operator-visible status/page. Successful release before 24 hours invalidates caches; Noah may then make a fresh claim whose new application Snowflake has no relationship to `app-A`. Unsent qualified text shows Noah's identity, while every previously selected/submitted invocation remains bound to deleted `app-A` and fails.
7. A failure-injection branch misses the deadline. This is explicitly a product-contract breach: the deleted application stays revoked, the handle stays quarantined, operators remain paged, and reconciliation continues. The system never transfers ambiguous ownership just to report the target as met.
8. Only after permanent application deletion verifies all required cleanup does Olivia's capacity reservation disappear, allowing a later operation to claim slot 50. Handle release and owner-slot release are distinct child lifecycles and neither implies the other completed.

### Limits, evidence, and calibration

- The 10/hour create route, CAPTCHA, and authenticated-default-user requirements still apply before capacity allocation. The larger ceiling is not a burst allowance.
- Safe telemetry covers cap rejections, slots used, same-operation retries, failed-cleanup slots, handle-release age/deadline breaches, retained bytes/resources, and reconciliation state without credentials or submitted secrets.
- The repository proves the current cap and controls but not that 50 or 24 hours fits production load. Rollout/load/failure tests must demonstrate the selected bounds; observed legitimate pressure triggers product review, not silent pruning, unsafe release, or an unbounded cap.

### Conclusion and implementation gap

The scenario makes both numerical promises testable under concurrency and failure. Conditional ownership protects the hard cap and namespace; deadline escalation reports an availability failure truthfully without sacrificing identity safety. Current count-before-create and deletion paths do not provide these guarantees.

## SIM-C06 — advanced options fail closed across capabilities, stale schemas, limits, and permission changes

### Scenario and purpose

Application `app-A` publishes a command combining an ordered multi-value `TARGET`, a bounded conditional option graph, and a zoned local date/time. A capable user fills the composer while client/application capabilities, resource access, schema version, timezone data, and server time change. This tests QAD-227 through QAD-230 as one end-to-end preflight rather than treating rich client controls as authority.

### Decision and current-state evidence

- **Controlling QAD:** `../QAD/trails/02-command-lifecycle-and-schema.md` -> QAD-227 (multi-value/TARGET), QAD-228 (conditional relationships), QAD-229 (temporal types), QAD-170 (stale mapping), QAD-189 (capabilities), QAD-220 (Discord-compatible baseline); `../QAD/trails/03-command-picker-preferences-and-policy.md` -> QAD-230 (composer-first with compatible modal callbacks). QAD-209 separately controls confirmation for high-impact multiple-target native effects.
- **Exact specs:** `../QAD/specs/command-schema-limits-and-localization.md` -> `Fluxer multi-value resource extension`, `Fluxer conditional relationship extension`, `Fluxer temporal option extension`; `../QAD/specs/command-registration-api.md` -> `Multi-value extension registration`, `Conditional relationship registration`, `Temporal option registration`; `../QAD/specs/interaction-envelope.md` -> `Command and autocomplete data`; `../QAD/specs/command-picker-and-settings-ui.md` -> `Multi-value option composer`, `Conditional option states`, `Temporal option composer`, `Composer-first workflow`.
- **Current constraints:** CS-COMMAND, CS-TIME, and CS-DELIVERY. `useCommands.ts` has only local simple/action entries, `SlashCommandUtils.ts` hard-codes scalar/name parsing, and the current listbox has no typed application option graph. The baseline account timezone is staff-only, `GuildRow` has no community timezone, and no application interaction delivery exists.

### Actors, definition, and initial state

- `app-A` is active and has accepted `fluxer.commands.multivalue.v1` and `fluxer.commands.temporal.v1`. User `user-U` has a client accepting those plus `fluxer.commands.conditions.v1`.
- Command `command-advanced` has required ordered `TARGET` option `targets` with `max_values=50`; typed scalar options connected by valid `required_if`, `visible_if`, and `conflicts_with` entries; and a `LOCAL_DATETIME` without a fixed zone plus declared precision/bounds/direction.
- `user-U` is not staff, so current state provides no saved account zone; the guild has no stored community zone. The form opens at schema version 7.

### Expected processing and outcomes

1. Registration rejects a branch with `max_values=51`, duplicate/missing/cross-branch relationship keys, a directed condition cycle, an unsatisfiable required-hidden state, or noncanonical/out-of-range temporal metadata. It drops no edge, truncates no bound, and persists no partial candidate. A valid complete definition publishes with permanent option type identities and required capability metadata.
2. A client missing any required client capability omits the command from ordinary discovery and shows an attributed inert update-required result on exact lookup. Missing application delivery capability makes the rich command unavailable. Fluxer never weakens `TARGET` to one scalar, ignores relationships, or converts temporal meaning under the same identity. Cross-platform tooling must publish an explicit Discord scalar definition; compatible Discord handlers remain unchanged.
3. The capable React flow keeps bounded typed controls in the composer because they remain understandable and accessible; richness alone does not force a modal. An intentional later application modal callback remains valid and retains provider/focus/cancel semantics, but dismissal is not success and the server does not auto-convert the initial form into a modal.
4. `user-U` selects ordered targets `[{type:USER,id:"42"},{type:ROLE,id:"42"},{type:CHANNEL,id:"77"}]`. Equal Snowflake strings with different kinds are distinct identities; repeating `{type:USER,id:"42"}` is rejected. Chip order is preserved. The client never silently sorts, deduplicates, truncates, or partially submits the collection.
5. Conditional presentation follows the published stable-key graph: false visibility hides only an empty field, a populated newly hidden field remains in correction state, true requirement is announced, and two populated conflicting fields remain marked until the user removes one. A manipulated client that sends hidden-populated, missing-required, or conflicting values fails server preflight before interaction creation; no client-cleared value is assumed.
6. Because neither stored-zone fallback is available, `user-U` must explicitly select an IANA zone. A daylight-saving gap is rejected without shifting; an overlap requires the chosen offset/instant; a changed server timezone resolution returns the updated tuple for reconfirmation. Canonical syntax, precision/step, bounds, and strict past/future are rechecked against server time. Raw relative/localized text is never delivered.
7. After selection, access to role `42` is revoked and channel `77` is deleted/recreated under a new ID. Submission rechecks every typed resource and rejects the whole interaction without confirming hidden-resource existence. Still-valid chips remain for correction, but no partial target array reaches `app-A` and a same-label replacement is never selected.
8. The developer publishes schema version 8 with a lower collection maximum and changed relationships/temporal bounds. Version-7 submission is rejected before application delivery. Refresh maps only the same stable option keys and fundamental types, preserves safely reviewable input without treating invalid cardinality/state as accepted, marks every required correction, and requires explicit resubmission; it never coerces, silently clears, truncates, or invokes.
9. Boundary tests accept exactly 50 distinct valid targets when the declared maximum is 50 and reject 51, duplicate typed identities, one invalid element, invalid collection cardinality, relationship entry 351, invalid calendar/leap values, unsafe duration integers, and temporal bound/clock races. Validation work stays within the existing body/definition/manifest/rate limits.
10. A corrected submission creates one interaction containing only canonical ordered `values`, ordinary scalar options after relationship validation, and a server-derived local-time tuple. Resource selection grants no authority. `app-A` enforces its own semantics; a Fluxer-native high-impact multi-target effect separately rechecks current permission/hierarchy/capability and uses QAD-209 confirmation rather than treating command selection as consent.

### Privacy, accessibility, and failure boundaries

- Search, chips, counts, relationship state, timezone/overlap choice, correction, and resubmission must pass keyboard-only, IME, screen-reader, desktop, and narrow-layout tests. The fixed QAD-236 picker invariants still apply to provider selection, but this scenario selects no collision-control visual.
- Logs, traces, analytics, history, audit, and high-cardinality metrics contain no selected IDs, option values, zones, raw phrases, or application autocomplete payloads. Only bounded capability/type/cardinality/error classes are operational evidence.
- Any schema, capability, current-state authorization, timezone-resolution, interaction-persistence, or required-trace uncertainty fails before application delivery. SIM does not invent a fallback, partial success, timezone, or condition precedence.

### Conclusion and implementation gap

The scenario validates one authoritative server preflight across collection identity, conditions, civil time, schema evolution, and current access. Composer controls preserve recoverable user input, while capability and compatibility contracts prevent silent semantic downgrades for migrated Discord bots. Every application option registry, capability, composer control, interaction value, and server preflight in this scenario is new implementation work.

## SIM-C07 — personalized command state synchronizes without becoming authority or history

### Scenario and purpose

One user changes favorites, provider preferences, hiding, and passive ordering on two devices across two communities. The projection tests the complete if-this-then-that chain for QAD-088–100: synchronization and scope, recoverable hiding, dormant explicit choices, qualified invocation, scoped ordering reset, and the prohibition on argument history.

### Decision and current-state evidence

- **Controlling QAD:** QAD-088–100 and QAD-206. These distinguish account-wide favorites/hiding, global plus community-specific provider preferences, community-scoped passive usage, explicit-preference-only automatic resolution, recoverable discovery suppression, and bounded usage expiry.
- **Exact specs:** `../QAD/specs/command-persistence.md` -> `Synchronized user preferences`; `../QAD/specs/command-picker-and-settings-ui.md` -> personal preference, hidden-command, collision, and reset behavior.
- **Current constraints:** CS-PREF and CS-COMMAND. Fluxer has an account `synced_preferences` snapshot, separate per-user/per-guild settings rows, and account/guild settings Gateway updates, but no stable application-command identity or command personalization schema.

### Actors and initial state

- User `user-U` is signed in on laptop `device-L` and phone `device-P` and belongs to `guild-G1` and `guild-G2`.
- Third-party `app-A/command-17` is installed, active, enabled, and invocable in both communities. It has application name `/deploy`, alias `/release` in `guild-G1`, and a duplicate provider in both communities. Fluxer's separate first-party command `native-help` is also visible.
- `command-17` is an account-wide favorite. `user-U` has a global preferred provider for duplicate name `deploy`, a different community-specific preference in `guild-G2`, and independent passive usage rows for `G1` and `G2`. None contains arguments or option values.

### Projection chain and expected state changes

1. If `user-U` hides `command-17` on `device-L`, then the account-owned hidden record is keyed to stable application/command identity, one synchronized account update is emitted, and `device-P` converges to the same state. The community alias does not create a second hidden record. Attempting to hide `native-help` is rejected because first-party commands are not hideable.
2. If either device opens normal discovery in `G1` or `G2`, then `/deploy` and `/release` are absent and cannot auto-resolve. The stored favorite and both preferred-provider choices remain dormant rather than being deleted, and passive usage cannot make the hidden command reappear.
3. If the user enables `Show hidden`, then the exact command appears dimmed and labeled `Hidden by you` with attribution and an `Unhide` action. It is not labeled developer/community disabled, and no private reason or arguments are displayed.
4. If the user explicitly submits the provider-qualified `/app-A:deploy` while the installation, command policy, and final authorization all pass, then hiding alone does not block the interaction; the UI may remind the user it is hidden. If developer disablement, community disablement, uninstall, suspension, or final authorization fails, then qualification cannot bypass that denial.
5. If a successful corrected invocation occurs in `G1`, then only the minimal `user-U`/`G1`/stable-command usage signal is refreshed. `G2` ordering is unchanged, and neither submitted arguments, option values, message content, nor a recallable invocation record is written.
6. If `user-U` resets passive ordering for `G1`, then only `G1` usage rows are removed. The favorite, hidden record, global preference, `G2` preference, and `G2` usage survive. If the user later chooses the all-communities reset, then passive rows for both communities disappear while every explicit choice still survives.
7. If `user-U` unhides from either the picker or the top-level user `Commands` settings page, then the synchronized hidden record is removed across devices. The dormant favorite resumes its high ranking, and the applicable explicit preference may again auto-resolve the duplicate; in `G2` the community-specific preference overrides the global one.
8. If `command-17` becomes temporarily unavailable, then its explicit state remains tied to the same stable identity but contributes no availability or authority. If the same identity returns, it may resume; a same-name command with a different key/application inherits none of it. Account/application/community deletion follows its owning lifecycle instead of label matching.

### Concurrency, privacy, and failure boundaries

- The committed server preference rows are authoritative. Synchronization events invalidate/refetch current server state; an out-of-order event or stale device cache cannot reverse a later committed choice. The QAD does not require simultaneous cross-device edits to be field-merged as one operation.
- Synchronization payloads and operational metrics exclude arguments, option values, message content, and free-form query text. Access to the account does not create community policy authority.
- A failed mutation/synchronization leaves the initiating device visibly retryable and falls back to the last confirmed server state; a local optimistic value is not acknowledged as synchronized or authoritative. Because these are presentation choices, uncertainty never creates or bypasses application availability or authorization.

### Conclusion and implementation gap

The projection demonstrates that synchronization answers “where the same user sees a choice,” while each choice's owner answers “where it applies.” Hiding is recoverable presentation, explicit preference alone may auto-resolve, and passive usage remains scoped, expiring rank data rather than history. Current settings provide useful persistence/event precedent, but every command identity, preference schema, merge rule, picker/settings control, and privacy-bounded usage row is new implementation work.

## SIM-C08 — excluded command contexts remain unavailable without narrowing the protocol

### Scenario and purpose

An application tries to add a second bot, install for one user, register non-chat command types, and invoke its slash command in direct-message contexts. The projection verifies that QAD-106–108/117 exclude product surfaces at registration, installation, discovery, and submission while keeping the interaction envelope extensible and preserving existing first-party behavior.

### Decision and current-state evidence

- **Controlling QAD:** QAD-106 (one bot per application), QAD-107 (no initial third-party DM/group-DM commands), QAD-108 (community installations only), and QAD-117 (chat-input only).
- **Exact specs:** `../QAD/specs/command-registration-api.md`, `../QAD/specs/interaction-envelope.md`, and `../QAD/specs/discord-compatibility-conformance.md` retain explicit tagged command/context fields without promising excluded variants.
- **Current constraints:** CS-INSTALL and CS-COMMAND. Current application identity deterministically maps to one bot user; OAuth can place that bot in guilds and group DMs, while there is no application command registry, community-installation aggregate, or user-installed/global command surface.

### Actors and initial state

- `app-A` owns bot `bot-A` and chat-input `command-17`; it is actively installed only in `guild-G`. User `user-U` shares `guild-G`, a direct message, and `group-DM-X` with relevant participants.
- The developer submits definitions for user-context, message-context, and Activity primary-entry-point commands, requests a user-level installation, and asks to attach `bot-B` to `app-A`.

### Projection chain and expected outcomes

1. If the developer attempts to attach `bot-B` to `app-A`, then the request is rejected before credentials or ownership rows are created because the application already owns `bot-A`. If a distinct bot identity is required, then a separately owned application is required; no command, installation, role, permission, or audit identity is shared implicitly.
2. If the developer submits user-context, message-context, or Activity primary-entry-point definitions, then registration rejects the unsupported tagged type before publishing a manifest head or making a command discoverable. The server does not reinterpret any of them as chat input.
3. If `user-U` requests a user-level installation or global third-party availability, then no installation or grant is created. Stable application/command identity remains global for reference, but availability and authority exist only through an active community installation.
4. If discovery runs inside `guild-G`, then active chat-input `command-17` may appear subject to targeting, policy, suspension, and final authorization. If the same query runs in the direct message or `group-DM-X`, then the third-party command is absent and exact lookup returns an attributed unsupported-context result without creating an interaction.
5. If a manipulated or stale client submits `command-17` with a DM/group-DM context, then server preflight rejects it before application delivery, response-token creation, usage ranking, or native effect. The explicit context tag permits a future separately designed branch; absence of guild fields never implies current DM authorization.
6. If an existing Fluxer first-party command already works outside communities, then that behavior remains unchanged. The third-party scope check is provider/type-specific and cannot hide or disable unrelated first-party functionality.
7. If `app-A` is uninstalled from `guild-G`, then `command-17` becomes unavailable there too. User installation, a globally stable definition, bot presence in `group-DM-X`, or a qualified spelling cannot substitute for the missing active community installation.

### Compatibility, privacy, and failure boundaries

- Unsupported registration/context errors expose only the caller's own application and requested type; they do not reveal private community or DM membership.
- Extensible tagged unions may reserve future variants, but generated schemas, docs, SDK/conformance fixtures, UI, and branches advertise only implemented chat-input/community behavior. Unknown future tags fail closed.
- No migration infers a community installation from bot presence in a DM/group DM, and no separate application is created automatically to satisfy a second-bot request.

### Conclusion and implementation gap

The projection keeps identity extensible without treating structural possibility as product support. Every successful third-party command chain starts with one application/one bot, one active community installation, and a chat-input community context; otherwise it stops before delivery or effects. Current one-bot identity is direct precedent, but the registry/context enforcement and community-installation source of truth are new work.

## SIM-C09 — native adapter preserves behavior while collisions bind exact providers

### Scenario and purpose

Fluxer's existing native `/ban`, `/shrug`, and `/gif` commands are migrated into the shared discovery abstraction. Two applications also expose the friendly name `/ban`, one through a community alias. A user searches, filters, favorites, receives a community recommendation, selects a provider, and submits after availability changes. This tests native behavior parity, first-party ownership, collision-safe identity, ranking versus auto-resolution, stale selection, and the QAD-236 presentation gate.

### Decision and current-state evidence

- **Controlling QAD:** QAD-079–089, QAD-092, QAD-103–105, QAD-118–124, QAD-135, QAD-145, QAD-168, QAD-173/174, QAD-234, and QAD-236.
- **Exact specs:** `../QAD/specs/native-command-adapter.md` in full; `../QAD/specs/command-picker-and-settings-ui.md` -> search/ranking, availability, recommendation, and collision evidence gate; `../QAD/specs/stacked-branch-pr-and-rollout-strategy.md` -> Train P.
- **Current constraints:** CS-COMMAND/CS-AUTH. `useCommands.ts`, `SlashCommandUtils.ts`, and `CommandUtils.ts` own a client-native name/regex/handler split. Native API handlers already call server endpoints that recheck authenticated permission/hierarchy, but there is no typed provider union, application provider, immutable selection token, or multi-provider collision UI.

### Providers, commands, and initial state

- Native registry keys `native-ban`, `native-shrug`, and `native-gif` represent an API action, local text transform, and native picker respectively. They remain Fluxer-owned code features, not rows in application command tables and not fake installations.
- `app-A/command-17` has default name `ban`; `app-B/command-42` has community alias `ban`. Both are active and visible. User `user-U` has no explicit provider preference, has favorited `app-A`, and has passive usage for `app-B`; the community recommends the stable native `ban` identity.
- QAD-236 has fixed identity/attribution/ranking/accessibility invariants but has not yet selected flat versus grouped collision presentation, an extra provider-cycling shortcut, or final preference-control visual.

### Adapter parity projection

1. If the provider abstraction lands, then the first release exposes only typed native `CommandDiscoveryEntry` rows and snapshots current discovery/execution behavior. No application provider becomes visible until each adapted native class passes parity and name-only dispatch is removed at the shared boundary.
2. If `user-U` invokes `native-shrug`, then the same local composer transform, text result, cursor/edit behavior, and undo expectations remain; it does not create an application interaction, public callback, fake application audit, or network effect.
3. If `user-U` invokes `native-gif`, then the same existing picker/focus/selection flow opens. If `native-ban` is selected, then the adapter calls the same native action module/REST endpoint; client permission/context checks remain hints and the server still authorizes current user permission, hierarchy, target, and route state.
4. If a parity fixture differs in localized name/description, context visibility, argument transform, API request, picker behavior, focus, error, or system-message output, then that native class remains on its old handler and the migration does not claim completion. Rollout adapts one class at a time and keeps rollback readers/handlers until parity is proven.

### Collision and exact-selection projection

5. If the shared picker searches `ban`, then it returns the currently visible native, `app-A`, and aliased `app-B` rows with accessible provider attribution and stable provider/command identities. Same friendly text is allowed across providers; within one application, an ambiguous effective-name collision would have been rejected at publication/configuration.
6. If no explicit provider preference applies, then none of favorite, community recommendation, passive usage, lexical match, or a visual top row auto-binds `/ban`. Within the same relevance tier, `app-A`'s favorite ranks ahead, the recommended native row ranks ahead of passive-use peers after favorites, and usage/stable ties follow. The UI copy states that recommendation affects order only.
7. If `user-U` explicitly selects the native row, then the composer stores an immutable native provider/key token while leaving the shared typed text understandable. Submission dispatches only `native-ban`; it cannot be retargeted to either application by another row with the same name. Selecting `app-A` instead creates the exact application interaction and never routes to a native handler based on the string `ban`.
8. If `user-U` sets an explicit exact-name provider preference for `app-B`, then that user-owned choice may auto-resolve the duplicate while it remains currently visible and name-matching. A community-specific preference overrides a global one. Favorite/recommendation/usage continue to affect order only and cannot become implicit dispatch.
9. If an application attempts to disable, alias, edit, hide, or broaden native `ban` through its manifest/community policy, then the operation has no native target. Third-party hide controls reject the native provider, while native context/permission behavior stays code-owned. Managers may recommend the stable native identity but gain no execution or authorization power.
10. If `app-B` becomes suspended/uninstalled/disabled, loses the alias, or a stale cache selects its old identity, then server submission rechecks provider, stable command, exact shared name, installation/target/policy/context, and user authority. It returns explicit selection/unavailable state and never falls through to native or `app-A`. The provider-qualified form remains the exact recovery path for an available identity.
11. If the real-composer prototype/accessibility review has not selected the remaining collision visual, then production P2 cannot guess or merge one. Tests may validate identity-bound rows, deterministic order, filters, stale behavior, keyboard/IME/focus/screen readers, desktop/narrow/touch, and equivalent visible preference access while the final grouping/cycling/control surface remains blocked on the recorded QAD addendum.

### Authorization, privacy, and rollout boundaries

- Selection, ranking, filtering, favorites, recommendations, and provider preference do not grant permission. Native server endpoints and application invocation/native-effect paths retain their separate current authorization checks.
- Public output attributes the actual shared invocation form and selected provider without exposing the user's private preference/favorite/usage reason. Metrics use bounded provider/result classes rather than command/application labels or typed arguments.
- Rolling back application-provider discovery must leave proven native behavior usable. No server application-command payload can invoke a native handler merely because its mutable name/key resembles a native command.

### Conclusion and implementation gap

The adapter is successful only if native behavior remains observably unchanged while discovery gains stable provider identity. Once collisions exist, text and ranking help users find a command but only explicit stable selection—or an applicable explicit user preference—chooses a provider. Current native commands provide the behavior to preserve; the provider abstraction, collision-safe selection, and prototype-gated UI are new work.

## SIM-C10 — compatible handle allocation remains provisional until atomic first-publication freeze

### Scenario and purpose

A compatible application create omits `handle`, collides with an existing normalized candidate, and receives a deterministic suffix. An existing handle-less application lazily claims a handle during first command publication while an owner attempts a provisional replacement. This tests compatibility allocation, recoverability, uniqueness, freeze-before-visibility, and concurrent ownership.

### Decision and current-state evidence

- **Controlling QAD:** QAD-080–082, QAD-145, QAD-198, QAD-203–205, and QAD-207.
- **Exact specs:** `../QAD/specs/application-handle-contract.md` -> `Storage and uniqueness`, `API and compatibility`, `Recoverable application creation`; `../QAD/specs/command-registration-api.md` -> immutable publication; `../QAD/specs/command-persistence.md` -> manifest head.
- **Current constraints:** CS-CREATE/CS-INSTALL/CS-COMMAND. Current application creation has mutable display names and Snowflake identity but no handle query table, recoverable create operation, command publication, or first-head freeze.

### Applications and initial state

- Owner Olivia creates `app-A` through a compatible client sending display name “Music Tools” and no handle. Canonical `music-tools` already belongs to another application. The immutable new application ID supplies deterministic suffix/fallback input.
- Existing `app-B` predates handles and has never published a Fluxer command. It is not bulk-backfilled. Its owner proposes `team-tools` while a compatible first-publication request arrives.
- Owner capacity, CAPTCHA, authentication, and 10/hour creation checks already pass; handle operations remain part of the deterministic application/publication operations.

### Projection chain and expected outcomes

1. For `app-A`, Fluxer conditionally reserves one owner slot and allocates the immutable application ID before deriving a handle. Omission does not reject a compatible client or make mutable display name an authorization identity.
2. If `music-tools` is already claimed, then Fluxer deterministically derives the bounded application-ID suffix and conditionally claims only that result for `app-A`. It never overwrites the existing lookup or chooses a random value that changes across retry. An unusable normalized base falls back deterministically to `app-<short-application-id>`.
3. If creation crashes after the handle claim, then retry under the same creation operation verifies ownership and resumes the same application/bot/credential activation. Cleanup releases the handle/capacity only after proving no live operation-owned resource remains; no partial application or recoverable plaintext credential is exposed.
4. `app-B` remains handle-less until explicit owner claim or first command publication. A background migration, list read, installation, or unrelated settings edit does not allocate or reserve a spelling.
5. If `app-B`'s first compatible command publication begins without a handle, then the publication operation performs the same deterministic conditional handle claim before writing/advancing the first manifest head. Handle conflict, reconciliation ambiguity, or claim failure leaves the head unchanged and the command undiscoverable.
6. Before any published head, an owner-requested provisional replacement first claims `team-tools` for `app-B` and only then conditionally releases the old provisional lookup. If the new claim conflicts or persistence becomes ambiguous, the old handle remains authoritative and no gap/transfer is inferred.
7. If replacement and first publication race, then both condition on the application/handle state and expected publication head. Exactly one wins: either replacement commits before the first-head freeze, or publication freezes the current handle and replacement returns conflict. The system never exposes a command under a handle that its application row does not own.
8. Advancing the first manifest head atomically records/fixes the current handle before catalog visibility/event emission. Every later ordinary rename/transfer request is rejected; application ownership transfer retains the same application ID and handle.
9. Qualified lookup always resolves the current handle owner, but picker selection/submission stores immutable application/command IDs. C05's later deletion/release/reuse lifecycle therefore cannot retarget an already selected interaction or turn provisional allocation into identity authority.

### Failure, compatibility, and observability boundaries

- Handles remain additive in API responses; old clients need not send them. Errors do not reveal whether a spelling is reserved or already claimed.
- Telemetry records allocation class, collision/fallback, retries, freeze conflicts, and reconciliation state without credentials or owner-submitted secrets.
- C05 remains the executable 24-hour deletion/release chain; this scenario owns pre-publication allocation/freeze only.

### Conclusion and implementation gap

Compatibility requires allocation without weakening uniqueness, while stable qualified discovery requires the handle to freeze before the first visible head. Conditional ownership makes retries and the replacement/publication race deterministic. Current application creation has none of these handle or publication primitives.

## SIM-C11 — staged drafts preserve one candidate through edit, head drift, validation, and atomic publish

### Scenario and purpose

An application owner creates one optional draft from manifest 50 in two dashboard tabs while a compatible immediate publication advances the live head. The owner resolves the conflict, validates a complete authority-expanding candidate, publishes it atomically, then attempts a semantic no-op. This tests QAD-113's staged workflow rather than merely mentioning a stored draft.

### Decision and current-state evidence

- **Controlling QAD:** QAD-109–115, QAD-145, QAD-165–172, QAD-224, QAD-232/233.
- **Exact specs:** `../QAD/specs/command-persistence.md` -> `Optional draft`, manifest/head tables; `../QAD/specs/command-registration-api.md` -> canonical no-op and immutable publication; `../QAD/specs/stacked-branch-pr-and-rollout-strategy.md` -> Train M1.
- **Current constraints:** CS-COMMAND/CS-SURFACES/CS-OPS. No current registry, draft/head, owner dashboard, conditional publication, or authority review exists; F1 CAS is a prerequisite.

### Draft, owners, and initial state

- `app-A` has committed manifest/head 50. Owner Dana creates sole draft `draft-D`, base revision 50, draft version 1. Two authorized tabs read version 1.
- The candidate edits several commands/categories and introduces one execution-authority expansion. A compatible bot registration call remains allowed to publish immediately.
- Draft rows are application-owned candidate data; only the manifest head is live discovery truth.

### Projection chain and expected outcomes

1. Creating `draft-D` snapshots base head 50 and allocates one draft identity/version. A second create does not produce competing drafts; it reads/conflicts with the existing candidate according to the owner API.
2. If both tabs edit expected draft version 1, then one complete candidate update advances to version 2. The other receives a draft-version conflict and retains its local export/candidate for explicit review; Fluxer never field-merges the two edits.
3. Draft validation reads the complete command/category/target/authority candidate, returns bounded sanitized keyed errors, and changes only validation state/version. Invalid entries, unavailable targets, or limit failures write no command revision, manifest row, catalog event, or live authority review.
4. If a compatible immediate publication advances live head to 51 while `draft-D` remains based on 50, then the draft remains readable and explicit; it neither follows the new head silently nor blocks the compatible writer.
5. Publishing the stale draft with expected base/head 50 returns `COMMAND_MANIFEST_CONFLICT`. No draft entry becomes visible, the draft is preserved for comparison/export, and the dashboard identifies head drift without claiming an automatic safe merge.
6. Dana explicitly refreshes head 51 and constructs/revalidates a complete replacement candidate under a new draft version/base. Stable keys may be manually reapplied, but the service never guesses conflicts or submits stale values/authority on Dana's behalf.
7. When the complete candidate validates and the expected draft version/base/current head all match, Fluxer writes every immutable command/category revision and complete manifest partition before one head CAS. Readers see all old or all new entries, one catalog/publication event emits, and unreachable loser rows remain non-authoritative for safe cleanup.
8. The authority expansion publishes as definition/history but remains unavailable in communities pending the exact QAD-111 review; draft publication cannot convert developer intent into community approval. Unchanged authority continues normally.
9. If the validated draft is canonically identical to the current head, then full authentication/rate/validation still run and QAD-232 returns the current revisions with `Fluxer-Publication-Status: unchanged`. It allocates no head/history/event and leaves the draft intact until Dana explicitly edits/discards it.
10. Ownership loss revokes draft/dashboard reads immediately; suspension permits only the accepted safe read/repair boundary and blocks publication. Recovery or draft publication never claims to roll back already delivered interactions, messages, native effects, application code, or community-owned configuration.

### Privacy, failure, and operational boundaries

- Draft exports contain only application-owned canonical schema/metadata, never command inputs, community-private policies, user preferences/usage, credentials, or hidden blocker identities.
- Same-operation retry observes the current draft/publication result; audit/event failure after a committed head is reconciled deterministically and cannot hide the live head.
- Metrics remain bounded to draft age/version/conflict/validation/publication classes and contain no candidate bodies.

### Conclusion and implementation gap

The optional draft is a versioned candidate, not a second live registry or automatic merge workspace. Explicit base/head conflict plus one atomic head advance preserves immediate compatibility writers while preventing partial staged visibility. Current code has no command or draft persistence boundary.

## SIM-C12 — guild-compatible registration changes targeting without forking schema

### Scenario and purpose

A Discord-compatible client manages `app-A` commands through guild-scoped registration routes while Fluxer retains one application-wide schema per stable command. The client adds an identical command to a second community, attempts a divergent guild definition, deletes a guild registration, and performs a guild bulk overwrite. This tests the deliberate portability mapping rather than allowing familiar Discord routes to create per-guild schemas or delete global commands.

### Decision and current-state evidence

- **Controlling QAD:** QAD-109/113/165/169/170/220 and `../QAD/specs/command-registration-api.md` -> `Fluxer single-schema mapping`, compatible create/update/delete/bulk behavior, stable-key mapping, and canonical errors.
- **Compatibility evidence:** `../QAD/specs/discord-compatibility-conformance.md` records guild registration as targeting rather than divergent per-guild schema as a known deliberate difference that requires migration coverage.
- **Current constraints:** CS-COMMAND/CS-CONTRACT. Fluxer currently has no application command registry, stable command key, application-wide schema, community target set, compatible registration route, or shared conformance fixture for this behavior.

### Actors, permissions, and initial state

- Authenticated bot application `app-A` owns stable commands `deploy` and `status`. Their application-wide definitions are immutable revisions; `deploy` targets active `guild-G1`, while neither command initially targets active `guild-G2`.
- `app-B` independently targets its own `inspect` command to G2. Its schema and target rows share no owner with app-A.
- Compatible client `client-D` omits Fluxer-only fields where allowed and addresses the guild routes for app-A/G2. Community invocation policy is separate from developer targeting.

### Projection chain and expected outcomes

1. If `client-D` GETs app-A's G2 command collection before targeting, then neither global definition appears merely because it exists for G1. The response is the effective developer-targeted compatibility view and does not apply or disclose G2's separate invocation-policy rules.
2. If the client POSTs the definition canonically identical to global `deploy`, then Fluxer resolves the same stable command identity and adds G2 to that command's target set. It does not create a guild-specific schema, fork the stable key, or disturb the G1 target.
3. If the same compatible POST is retried, then ordinary compatible upsert/idempotency behavior preserves the existing G2 target and returns the same command identity. It does not allocate another command or target entry.
4. If the client POSTs or PATCHes `deploy` with different structure or metadata for G2, then Fluxer returns `COMMAND_SCHEMA_CONFLICT` with the current command/revision. The global definition, manifest head, and every community target remain unchanged; Fluxer never silently rewrites the difference into a local schema.
5. If the application needs genuinely different behavior in G2, then it must create a distinct immutable key/command whose schema is still application-wide and target that identity explicitly. Reusing the same logical key through a guild route is not a migration escape hatch.
6. If the client DELETEs `deploy` through the G2 route, then only app-A's G2 target is removed. The application-wide command and its G1 target survive, retained stable-key/configuration references keep their normal lifecycle, and the route cannot convert target removal into global command deletion or retirement.
7. If app-A's G2 targets currently contain `deploy` and a guild bulk overwrite supplies only the canonically matching `status`, then one complete target-set update removes G2 from `deploy` and adds G2 to `status`. Both global command definitions and app-A's targets in every other community survive; validation is all-or-nothing, and any failure leaves the prior G2 target set intact.
8. Throughout every app-A guild-route mutation, app-B's G2 `inspect` schema and target remain unchanged. A compatible guild bulk overwrite is scoped by both application and community, not treated as ownership of the guild's whole command catalog.

### Concurrency, compatibility, and evidence boundaries

- Guild-route target mutations use the canonical registry's complete-candidate and manifest-head CAS ownership. An explicit stale precondition conflicts; a compatible request without one follows the bounded reread/no-op-or-conflict rule. A concurrent global schema or target change is never field-merged or applied to a different revision.
- Shared fixtures must distinguish identical canonical definitions from structural/metadata divergence and cover POST, PATCH, DELETE, bulk overwrite, other-community preservation, and other-application isolation.
- Logs and metrics expose bounded route/result/conflict classes, not command bodies, community-private policy, invocation values, credentials, or unrelated application identities.

### Conclusion and implementation gap

Discord-compatible guild routes remain portable for applications that use one command definition while Fluxer's stable identity and application-wide schema stay authoritative. Exact target scoping prevents a guild DELETE or bulk overwrite from destroying global or foreign application state, and explicit conflict prevents semantic drift from masquerading as compatibility. Every registry, target, route, CAS, and conformance fixture in this scenario is new implementation work.
