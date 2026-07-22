# Stacked Branch, Pull Request, Commit, and Rollout Strategy

Status: repository-derived implementation strategy under QAD-115, QAD-135, QAD-145, QAD-191 through QAD-196, QAD-202, and QAD-227 through QAD-237. This plan authorizes no Git operation by itself.

## Governing rules

- Work proceeds as short merge trains of at most three simultaneously open dependent pull requests. A later train starts from updated `main` after its prerequisite train merges; there is no permanent 25-PR chain.
- Every child branch is based directly on the preceding branch in its train. Pull requests target their parent branch until the parent merges, then are retargeted/rebased onto `main` or the remaining parent.
- Each pull request has one reviewable security/data-lifecycle boundary and must be deployable with new behavior dark or unavailable until its train is complete.
- Additive readers, storage, schemas, and fallback renderers land before producers. No PR both introduces an intolerant wire/storage shape and enables its producer.
- Migrations are forward-compatible and non-destructive. Rollback disables producers/UI while keeping readers, revocation, cleanup, suspension, and reconciliation alive.
- Delegated user authority is a separate final high-risk train. Ordinary installation, commands, responses, and components never quietly acquire it.
- The separate Flutter client is absent and untouched. `fluxer_app` responsive web, shared public contracts, and old-client fallback are in scope.
- Public docs and generated OpenAPI land with the first PR that exposes a developer/user surface. They are not deferred to an unowned final cleanup. No official SDK enters these trains; the pinned `discord.js` development smoke and generated OpenAPI/Dart workflow cover migration. QAD-237 permits only a later separately reviewed TypeScript reference project after protocol/conformance/support gates.
- The repository has no RFC/ADR directory convention. These ignored research notes are not copied into a product branch wholesale. Before implementation, the owner should obtain project agreement through the maintainers' chosen design venue; any public design prose and every PR description must be human-reviewed/authored under `.github/CONTRIBUTING.md`, with truthful LLM disclosure.

## Dependency DAG

```text
F  conditional-write + rollout foundation
└─ I  installation lifecycle + managed roles + community management
   └─ S  audit attribution + targeted suspension + recovery controls
      └─ C  handles + command registry + community command administration
         ├─ E  interaction contracts + delivery + public responses
         │  └─ P  native discovery adapter + application picker/composer
         │     └─ R  ephemeral responses + rich components + component state
         │        ├─ D  declarative settings/builders/actions
         │        └─ U  delegated user authority (separate high-risk train)
         └─ M  staged manifest publishing + recovery
```

`M` technically depends only on the immutable command registry, but is scheduled after the base interaction/component path as already decided. `D` needs private invoker results and rich component/message ownership. `U` needs audit, suspension, interactions, ephemeral confirmation, rate limits, and component state. No train implements DM/global applications, context commands, Activity commands, or Flutter.

The QAD-237 SDK is intentionally absent from this DAG. It cannot become a hidden twelfth train, prerequisite, migration requirement, or cleanup commit. If its post-stability gates are later satisfied, it receives a new separately approved project/branch/release plan under `official-command-sdk.md`.

## Merge trains and exact branch scopes

Branch names are stable plan names. Pull request titles use the repository's conventional-title rule and add `1/3`, `2/3`, etc. only when useful to reviewers.

### Train F — persistence and temporary rollout foundation

#### F1 `feat/bot-platform-conditional-writes`

Base: `main`.

Commits:

1. `test(database): define conditional row update semantics`
2. `feat(database): add expected-value conditional updates`
3. `test(database): verify conditional updates across backends`

Scope/acceptance: extend the table DSL, Cassandra executor, Postgres KV executor, and in-memory test executor with one typed expected-column update returning applied/not-applied. Prove create/update contention, missing row, stale version, and equivalent backend semantics. Do not change application behavior. This closes the verified gap in `executeVersionedUpdate`, which increments but does not compare.

#### F2 `feat/bot-platform-rollout-controls`

Base: F1.

Commits:

1. `feat(constants): define temporary bot platform rollout layers`
2. `feat(api): validate and distribute bot platform rollout state`
3. `test(api): verify deterministic fail-closed rollout selection`

Scope/acceptance: implement the private typed QAD-191 rollout object, deterministic app/community selection, dependency validation, NATS revision propagation, source defaults, bounded telemetry helpers, and owner/removal metadata. No public/self-host product switch and no feature endpoint yet. Security/revocation checks cannot be flagged off.

### Train I — installation and managed roles

#### I1 `feat/application-installation-lifecycle`

Base: merged F train.

Commits:

1. `feat(schema): add application installation lifecycle records`
2. `feat(api): persist application installation operations`
3. `feat(api): reconcile installation lifecycle effects`
4. `feat(oauth2): orchestrate new bot installations`
5. `test(api): cover installation failure and recovery`

Scope/acceptance: add generated tables/types, repository/service/state machine, deterministic effects, locks plus CAS, 15/25/30-second deadlines, rollback/uninstall retry schedules, workers, telemetry, and the new-install OAuth path behind `installation_writes_percent`. Existing bot memberships receive no backfill/installation row. Success remains synchronous; failure cannot later create a bot unexpectedly. At this stage any role effect preserves current ordinary-role semantics so the new writer remains off in production.

#### I2 `feat/managed-bot-roles`

Base: I1.

Commits:

1. `feat(schema): add installation-owned managed role metadata`
2. `feat(api): enforce managed bot role ownership`
3. `feat(api): bind managed roles to installation effects`
4. `test(api): cover managed role permissions and cleanup`

Scope/acceptance: add managed-role kind/owner/generation, exactly one owned role for each new installation, permission-source mode, permission/hierarchy/presentation mutation rules, assignment/deletion protections, reinstall generation behavior, deterministic cleanup, audit/Gateway payloads, and no legacy inference by name. `Manage Roles` controls only approved presentation fields and receives explanatory errors/UI metadata. QAD-038 preserves standard invite-selected permissions under the current held-bit check and permits `Manage Guild` to exceed that check only for the exact current code-defined declaration. Either committed set becomes the relationship ceiling; later ceiling expansion, permission mutation, hierarchy position, and supplemental-role assignment require owner/`Administrator`.

Security gate: I2 adds an optional `required_bot_permissions` application configuration field written through the authenticated application publication API. Absence means invite mode; a present canonical decimal bitfield, including `"0"`, means code-defined mode. An ordinary omitted patch field leaves the mode unchanged, while an explicit clear returns it to invite mode. Every source/declaration change advances a server-owned revision/hash. Existing applications remain invite-mode compatible, and old URLs/memberships/roles are never imported. Invite mode continues to normalize the standard OAuth `permissions` parameter and enforce `canAuthorizeBotInvite`. In code-defined mode, incoming query bits cannot influence Fluxer's selected set. Consent captures the source, normalized set, and applicable revision/hash; commit compare-and-set rechecks the source so a concurrent change denies without partial mutation and restarts review.

I2 allows a `Manage Guild` first install beyond personally held bits only when the grant equals the current canonical code-defined set; it rejects optional/caller-added bits, position changes, and supplemental roles. Tests cover existing invite links, absent versus explicit-zero declaration, authenticated publish/update/clear, invite held/unheld bits, edited/omitted/stale URL parameters in both modes, source/declaration changes during consent, declared sets including bits the installer lacks, exact-set tampering, durable ceiling creation, reinstall at/below/above the ceiling, later declaration changes, attempted `Administrator`/unheld/held additions after install, role-position and supplemental-role changes, owner/Administrator expansion, applicable hierarchy/target invariants, audit, and denial without partial mutation. Preview/audit are required evidence but do not replace held-bit enforcement, declaration equality, commit-time source/revision checking, and ceiling enforcement. QAD-214 review verifies this boundary before implementation begins.

#### I3 `feat/application-installation-management`

Base: I2.

Commits:

1. `feat(api): expose application installation management`
2. `feat(app): add installation and managed role settings`
3. `feat(app): surface installation cleanup recovery`
4. `test(app): verify responsive installation management`

Scope/acceptance: community Integration overview, install/reauthorize/uninstall/reset/retry status endpoints, permission proposal review, lifecycle errors, cleanup recovery, dormant state, UI explanations, responsive web/accessibility tests, and public operator/developer docs. Activate only allowlisted installations until this branch is deployed. No ordinary kick path may remove an active installed bot.

### Train S — attribution, suspension, and disaster-recovery controls

#### S1 `feat/application-audit-attribution`

Base: merged I train.

Commits:

1. `feat(schema): add application audit causation fields`
2. `feat(api): persist idempotent application audit chains`
3. `feat(api): query application attributed audit activity`
4. `test(api): verify audit redaction and causal retries`

Scope/acceptance: additive audit columns/query tables, preallocated deterministic audit IDs, application/invoker/bot/interaction/authority/causation/result fields, 45-day TTL, visibility rules, value/secret redaction, and partial/compensation grouping. Existing audit reads remain compatible.

#### S2 `feat/application-suspension`

Base: S1.

Commits:

1. `feat(admin): persist targeted application suspension`
2. `feat(api): enforce application suspension centrally`
3. `feat(gateway): terminate and filter suspended applications`
4. `feat(admin): manage application suspension recovery`
5. `test(security): verify suspension fail closed behavior`

Scope/acceptance: new instance ACLs/endpoints/audit, app-wide and app+community overlay, central API/Gateway/install/config/interaction gate, authority revocation, QAD-216/218 visible audience-safe state and alerts, QAD-217 owner transactional email, QAD-219 bounded owner review, developer repair-only access, reconciliation-owned reinstatement, admin UI, and security matrix. Enforcement cannot wait on notification or review delivery.

#### S3 `feat/application-recovery-controls`

Base: S2.

Commits:

1. `feat(api): add bot authority epoch and recovery hold`
2. `feat(worker): reconcile restored application state`
3. `feat(operations): preserve deletion and suspension recovery journals`
4. `docs(operations): add bot platform recovery runbooks`
5. `test(operations): verify restored authority stays revoked`

Scope/acceptance: fail-closed recovery hold, global authority-epoch bump, non-restorable transient/ephemeral cleanup, minimal independently replicated suspension/deletion journal integration, ordered restore reconciler, drills/runbooks, and tests that old capabilities/tokens/components never reactivate. QAD-221 makes measured deployment RPO/RTO/retention/drill/geography records launch gates rather than guessed code constants.

#### S4 `feat/report-evidence-lifecycle`

Base: S3.

Commits:

1. `feat(schema): define report evidence lifecycle and holds`
2. `feat(api): manage report resolution reopening and holds`
3. `feat(worker): purge expired report evidence`
4. `feat(privacy): apply erasure to report evidence`
5. `test(privacy): verify report retention and non-resurrection`

Scope/acceptance: one QAD-211 lifecycle for ordinary and ephemeral report evidence, versioned resolution/reopen/hold transitions, expiry indexes, search/cloned-object purge reconciliation, account-deletion/erasure minimization, anonymous-only post-purge aggregates, audit/access controls, and backup non-resurrection tests. QAD-213 grandfathers pre-activation resolved reports without expiry; pending reports adopt the new generation only when later resolved. Purge requires an explicit new-policy generation and never infers a destructive legacy deadline.

### Train C — application handles and command registry

#### C1 `feat/application-command-storage`

Base: merged S train.

Commits:

1. `feat(constants): raise application ownership limit to 50`
2. `feat(schema): define application handles and command contracts`
3. `feat(api): make application creation recoverable`
4. `feat(api): persist application handles conditionally`
5. `feat(api): store immutable application command revisions`
6. `feat(worker): reconcile command source and query rows`
7. `test(api): verify application creation and command identity`

Scope/acceptance: raise the current code-defined per-owner cap from 25 to 50 non-deleted applications while preserving authenticated-user, CAPTCHA, and 10/hour route enforcement; conditionally reserve owner-capacity slots so concurrent creation cannot exceed 50; add the accepted handle validator/lookup/allocation/freeze/release lifecycle, durable 24-hour release deadline, safe quarantine, alert/status, and failure injection; make bot/application/credential/handle creation recoverable; add stable command/developer/category keys, immutable command/category/manifest rows, heads, targets, configuration/preference tables, dark readers/reconcilers, canonical hashes/limits including QAD-227 collection metadata/`TARGET` identity, QAD-228 canonical relationship graphs, QAD-229 temporal definitions/type registry, QAD-231 category registries/membership/policy rows, QAD-234 manager recommendation rows, and QAD-235 source-owned role/channel policy-reference indexes, cap/rejection/resource telemetry, generated artifacts, and no enabled public command writer. Existing application-create clients remain compatible.

#### C2 `feat/application-command-registration`

Base: C1.

Commits:

1. `feat(api): publish immutable command manifests`
2. `feat(api): add compatible application command routes`
3. `feat(api): target commands to installed communities`
4. `feat(api): validate command authority changes`
5. `test(compat): verify application command registration`

Scope/acceptance: global/guild compatible routes, immediate publication over immutable heads, bulk overwrite, one application-wide schema, stable-key derivation, targeting, developer disablement, QAD-039's exact `AS_USER | AS_BOT | REQUIRE_BOTH` public/persisted enum with no draft aliases, QAD-041's exhaustive execution-mode transition classification, QAD-220 optional-authority normalization and explicit broker opt-in, QAD-227 `multi_value`/`TARGET`, QAD-228 relationship graph, QAD-229 temporal type/bound/precision/timezone validation, QAD-231 Fluxer-only category registry/membership publication, and QAD-232 canonical no-op validation/equality/response/races/side-effect suppression with unchanged baseline bodies, authority review, errors/rate limits, OpenAPI/docs, compatibility fixtures, reconciliation, owner dashboard current-head reads, and writer rollout flag. Tests cover accepted/emitted enum values, rejection of `DELEGATED`/`BOT`/`BOTH`, compatible omission, all six non-identity mode transitions, pending-state creation, reviewer tier, separate envelope blockers, and denial without partial approval. No context/DM/global-app command behavior.

#### C3 `feat/application-command-administration`

Base: C2.

Commits:

1. `feat(api): enforce community command invocation policy`
2. `feat(api): manage command aliases and approval`
3. `feat(app): add application command administration`
4. `test(app): verify command policy and settings access`

Scope/acceptance: owner/`Administrator`/`Manage Guild` APIs and Integration Commands UI, alias/name rules, developer/category/community disablement, QAD-041 mode-review previews and reviewer-tier enforcement, QAD-231 atomic category toggle/inherited deny/new-member behavior, QAD-234 exact-name community provider recommendation with CAS/audit/dormancy, QAD-235 ACL-gated role/channel explicit-reference counts and stable-ID linked Integrations view with one writer/audit source, role/user/channel/native-permission policy precedence, exact owner/`Administrator` local-policy bypass and `Manage Guild` non-bypass, bulk operations/reset, safe unavailable reasons, audit/attention, CAS, responsive/accessibility tests. It does not implement end-user picker invocation yet.

### Train E — interaction contracts, delivery, and public responses

#### E1 `feat/application-interaction-contracts`

Base: merged C train.

Commits:

1. `feat(schema): define application interaction envelopes`
2. `feat(schema): define interaction response operations`
3. `feat(api): persist interaction response authority`
4. `feat(compat): add interaction capability fixtures`
5. `test(compat): verify cross-service interaction contracts`

Scope/acceptance: tagged schema authority, compatible numeric types/fields, QAD-227 ordered `values`/typed `TARGET` envelope, QAD-228 client-only condition capability, QAD-229 temporal codes/resolved local tuple/two-sided capability, client/application capability registry, response token hashes, transport configuration models, deadline/status persistence, OpenAPI/TypeScript generation, tolerant Erlang/Rust readers and shared fixtures. No producer sends an interaction yet.

#### E2 `feat/application-interaction-delivery`

Base: E1.

Commits:

1. `feat(gateway): deliver application interactions`
2. `feat(api): register verified interaction endpoints`
3. `feat(api): dispatch signed HTTP interactions safely`
4. `feat(api): invoke application commands and autocomplete`
5. `test(security): verify interaction delivery boundaries`

Scope/acceptance: Gateway no-intent dispatch, explicit Gateway/HTTP mode, signing-key verification/rotation, SSRF-safe deadline dispatcher, breaker/health, command submission/autocomplete creation, QAD-227 all-or-nothing collection validation, QAD-228 authoritative relationship reevaluation, QAD-229 canonical/server-clock/timezone resolution and mismatch rejection, install/suspension/client/application capability checks, rate/concurrency limits, redacted delivery traces, real-service probes. Delivery flags remain allowlist-only until E3.

#### E3 `feat/application-interaction-responses`

Base: E2.

Commits:

1. `feat(api): handle initial interaction callbacks`
2. `feat(api): manage public interaction responses`
3. `feat(messages): attribute bot managed response messages`
4. `feat(api): enforce response deadlines and idempotency`
5. `test(compat): exercise migrated interaction clients`

Scope/acceptance: compatible callback/original/follow-up routes, ack/defer/autocomplete/modal contract, QAD-230 preservation of intentional command-to-modal callbacks and truthful no-submit cancellation semantics, public message create/update/delete with ownership/version, exactly one initial response and five follow-ups, 3-second/15-minute lifetimes, idempotency/error matrix, pinned development-only `discord.js` smoke, docs/OpenAPI. Ephemeral and components remain rejected until their trains.

### Train P — native discovery adapter and end-user picker

#### P1 `refactor/app-command-discovery`

Base: merged E train.

Commits:

1. `refactor(app): type native command discovery entries`
2. `refactor(app): route native command selection by identity`
3. `test(app): preserve native slash command behavior`

Scope/acceptance: wrap current native command definitions/handlers in a typed provider union, remove name-only dispatch at the shared boundary, preserve localized behavior/transforms/API calls, and prove parity. No application provider is visible.

#### P2 `feat/application-command-picker`

Base: P1.

Commits:

1. `feat(app): query application command discovery`
2. `feat(app): bind exact commands in the composer`
3. `feat(app): add command preferences and hidden recovery`
4. `feat(app): add provider filtering and unavailable states`
5. `test(app): verify picker keyboard and accessibility behavior`

Before commit 2 fixes collision presentation, QAD-236 requires real-composer variant evidence and a recorded product/accessibility selection. If that review has not chosen grouping, optional cycling, and the preference-control surface, P2 may implement underlying identity/query infrastructure but cannot merge a guessed production collision UI.

Scope/acceptance: search/ranking/pagination/cache invalidation, app filtering, aliases/original/qualified forms, exact structured selection removable by Backspace/Delete, QAD-227 multi-value composer, QAD-228 live conditional states, QAD-229 native/manual temporal controls with timezone/DST/relative-preview behavior, QAD-230 composer-first placement and modal focus/cancel criteria, QAD-231 category grouping/search flattening/collapse accessibility/flat fallback, QAD-234 explicit preference/favorite/community recommendation/passive usage order with visible ordering-only label/personal override and no auto-selection, QAD-236 prototype matrix/invariant evidence/recorded selection, capability-specific unsupported-client states, duplicate preferences, favorites/hiding/settings, QAD-206 sliding 90-day passive usage, stale refresh without collection/conditional/temporal coercion or silent clearing/shifting, owner/`Administrator` bypass disclosure plus server-owned bounded trace, current-policy recheck, responsive/IME/listbox/screen-reader/visual tests. `command_picker_percent` gates discovery and invocation together; text, collection identity, conditional input, temporal meaning, category policy, and provider recommendation are never rewritten into authority client-side.

### Train R — ephemeral responses and rich component interactions

#### R1 `feat/ephemeral-interaction-responses`

Base: merged P train.

Commits:

1. `feat(schema): define text-and-control ephemeral responses`
2. `feat(api): persist private ephemeral responses`
3. `feat(app): render and dismiss ephemeral responses`
4. `feat(api): report and expire ephemeral responses`
5. `test(privacy): verify ephemeral recipient isolation`

Scope/acceptance: separate recipient rows, account-session delivery/dismissal, 24-hour max TTL, explicit QAD-212 rejection of attachment/file/media/upload payloads, no channel/search/mention/account-export path under QAD-210, report snapshots under QAD-211, inert suspension state, cleanup/reconciliation, and cross-account/privacy tests. `ephemeral_responses_percent` remains off until API/client deploy together.

#### R2 `feat/application-message-components`

Base: R1.

Commits:

1. `feat(schema): define rich application components`
2. `feat(messages): persist application component trees`
3. `feat(messages): round trip component payloads`
4. `feat(app): render rich components with fallback`
5. `test(compat): verify component grammar and accessibility`

Scope/acceptance: legacy versus structured grammar, Components V2/rich containers, buttons/selects/radio/checkbox capability, limits, canonical JSON, typed ownership/version, Rust opaque round-trip, fallback/static rendering, responsive/accessibility fixtures. Producers remain off; older clients never receive an active unsupported tree.

#### R3 `feat/application-component-interactions`

Base: R2.

Commits:

1. `feat(api): authorize application component state`
2. `feat(api): deliver component and modal interactions`
3. `feat(messages): update bot managed messages conditionally`
4. `feat(app): handle per-user component presentation`
5. `feat(worker): reconcile application component outcomes`
6. `test(interactions): verify component concurrency and expiry`

Scope/acceptance: audience/use/expiry policies, per-user pending/committed state, QAD-060 deterministic application-result/native-effect outcome ownership, defer/modal pending transfer, proven-no-effect rollback, fail-closed partial/ambiguous reconciliation, CAS public aggregate updates, modal/choice controls, QAD-230 modal validation/focus restoration/cancel-expiry cleanup and accurate completion state, copies/uninstall/reinstall/expiry behavior, double-click/concurrency/security tests, invoker-ephemeral errors. Tests cover every terminal callback/defer/modal/native-success/native-failure/timeout race, exact retry, competing owner claim, success without callback, no premature one-use consumption, no reopen after effect, and no partial mutation. Enable `message_components_percent` only after R2 fallback is everywhere.

### Train M — staged command publishing and recovery

#### M1 `feat/application-command-drafts`

Base: updated `main` after R train (technical minimum: C2).

Commits:

1. `feat(api): persist application command drafts`
2. `feat(api): validate atomic command publications`
3. `feat(app): review and publish command drafts`
4. `test(commands): verify draft conflicts and validation`

Scope/acceptance: optional one-draft model, validation/diff, expected base/head version, atomic publish, authority review, QAD-232 no-change draft/result behavior, and QAD-233 owner dashboard Overview/Commands/Draft views with canonical source reads, pagination, sanitized blockers/exports, conflicts, suspension/ownership-loss/privacy/accessibility tests. Compatible immediate registration remains.

#### M2 `feat/application-command-recovery`

Base: M1.

Commits:

1. `feat(api): republish prior command revisions`
2. `feat(app): preview command manifest recovery`
3. `test(commands): verify manifest recovery boundaries`

Scope/acceptance: select immutable history, revalidate, publish old contents as a new revision, preserve community config by stable keys, surface authority/target diffs, and complete QAD-233 Publications & Recovery dashboard/history/pins/deep links while explicitly stating that backend code/data/messages/community configuration/completed effects do not roll back.

### Train D — declarative settings and builders

#### D1 `feat/declarative-application-settings`

Base: merged R train.

Commits:

1. `feat(schema): define declarative application settings`
2. `feat(api): persist declarative schemas and snapshots`
3. `feat(api): manage versioned community configuration`
4. `feat(api): deliver and acknowledge configuration`
5. `test(api): verify configuration lifecycle and redaction`

Scope/acceptance: QAD-199 tagged types/limits/locales/sensitive boundary, immutable heads, manager and app APIs, reset/reference invalidation, latest snapshot delivery/ack/reconciliation, audit/attention, uninstall retention, QAD-222 dormant/non-reusable keys plus manager-owned forgetting, and QAD-223 counting of every reserved key against the 100-key budget. Default-off `declarative_administration_percent`.

#### D2 `feat/declarative-application-settings-ui`

Base: D1.

Commits:

1. `feat(app): render declarative application settings`
2. `feat(app): edit configuration with conflict recovery`
3. `feat(app): surface application sync and attention state`
4. `test(app): verify declarative settings accessibility`

Scope/acceptance: owner/`Administrator`/`Manage Guild` Integration Configuration UI, dynamic typed controls, live validation, version conflict merge/refetch, persisted-versus-applied status, attention/activity/reset, responsive/accessibility/visual tests. No delegated panel access.

#### D3 `feat/declarative-application-builders`

Base: D2.

Commits:

1. `feat(schema): define repeatable groups and message templates`
2. `feat(api): persist declarative builder resources`
3. `feat(api): preview application message templates`
4. `feat(app): add repeatable and message builders`
5. `test(app): verify builder limits and preview parity`

Scope/acceptance: QAD-201 phase-two grammar, versioned resources, exact message-schema reuse, inert preview, no arbitrary URL fetch/attachment store, CAS UI, 25-resource/size limits, docs/tests.

### Train A — declarative admin actions

#### A1 `feat/declarative-admin-actions`

Base: merged D train.

Commits:

1. `feat(schema): define declarative admin actions`
2. `feat(api): publish and invoke application admin actions`
3. `feat(app): render application handled admin actions`
4. `test(interactions): verify admin callback lifecycle`

Scope/acceptance: bounded action manifest/inputs, manager-only invocation, app-handled label, transport health/offline disablement, no queue, invoker-only ephemeral result, version/idempotency/rate/redaction tests.

#### A2 `feat/declarative-message-actions`

Base: A1.

Commits:

1. `feat(api): persist native admin action operations`
2. `feat(messages): publish application messages declaratively`
3. `feat(app): preview and confirm application messages`
4. `test(messages): verify native message action recovery`

Scope/acceptance: enumerated publish/update/delete/reconcile message operations, server preview hash/confirmation, bot permission/current manager visibility, message ownership/version, causal audit, idempotent effects/safe compensation, public link plus ephemeral result.

#### A3 `feat/declarative-self-role-panels`

Base: A2.

Commits:

1. `feat(schema): define self role panel resources`
2. `feat(api): execute self role panel operations`
3. `feat(app): build and manage self role panels`
4. `test(security): verify self role hierarchy and concurrency`

Scope/acceptance: 25-option button/exclusive/multi panels, only self/registered ordinary roles, current bot `Manage Roles`/hierarchy every click, per-user presentation and ephemeral result, invalid-role attention, deterministic partial/compensation behavior, audit/security tests.

### Train U — delegated user authority (high risk)

#### U1 `feat/delegated-action-broker`

Base: updated `main` after R train; schedule after stable core operation, independently of D/A if team capacity permits.

Commits:

1. `feat(schema): define delegated native operation registry`
2. `feat(api): persist exact delegated capabilities`
3. `feat(api): broker idempotent delegated effects`
4. `feat(audit): attribute delegated native operations`
5. `test(security): attack delegated capability boundaries`

Scope/acceptance: opaque hashed single-use capability records, exact operation/target/parameters/invoker/interaction/expiry, permission/hierarchy revalidation, generation/authority invalidation, deterministic effects, audit/rate limits, replay/substitution/race/fault-injection security suite. No operation is enabled yet.

#### U2 `feat/delegated-action-confirmation`

Base: U1.

Commits:

1. `feat(api): preview exact delegated native actions`
2. `feat(app): confirm delegated application actions`
3. `test(security): verify confirmation binding and expiry`

Scope/acceptance: server-derived submitted/fixed/server-derived/application-selected provenance; Class 0 pre-submit disclosure/direct execution; Class 1 exact dynamic confirmation; Class 2 bulk/permission/destructive confirmation with counts/diffs; five-minute invoker-only confirm/deny/expiry state; current permission/scope recheck; no reusable user OAuth grant; and UI that distinguishes app text from native facts. Exact policy and fixtures are in `delegated-action-confirmation-policy.md`.

#### U3–U20 delegated native-operation adapters

Base: each branch is based on the merged/rebased predecessor, starting from U2. Only the next three dependent PRs may be open at once.

| PR | Branch | Exact operations |
|---|---|---|
| U3 | `feat/delegated-member-moderation` | ban, unban, kick |
| U4 | `feat/delegated-member-state` | timeout set, timeout clear, nickname set |
| U5 | `feat/delegated-member-roles` | voice update, role add, role remove |
| U6 | `feat/delegated-member-role-replacement` | complete ordinary-role replacement |
| U7 | `feat/delegated-message-deletion` | message delete, message bulk delete, attachment delete |
| U8 | `feat/delegated-reaction-clearance` | clear all reactions, clear one emoji, remove one user's reaction |
| U9 | `feat/delegated-message-pins` | pin, unpin |
| U10 | `feat/delegated-channel-lifecycle` | channel create, update, delete |
| U11 | `feat/delegated-channel-access` | channel reorder, overwrite set, overwrite delete |
| U12 | `feat/delegated-role-lifecycle` | role create, update, delete |
| U13 | `feat/delegated-role-layout` | role reorder, hoist update, hoist reset |
| U14 | `feat/delegated-community-settings` | safe settings update, feature toggle, vanity update |
| U15 | `feat/delegated-community-discovery` | discovery apply, update, withdraw |
| U16 | `feat/delegated-emoji-lifecycle` | emoji create/clone, update, delete |
| U17 | `feat/delegated-sticker-lifecycle` | sticker create/clone, update, delete |
| U18 | `feat/delegated-expression-bulk-create` | emoji bulk create, sticker bulk create |
| U19 | `feat/delegated-invite-administration` | invite create, invite delete |
| U20 | `feat/delegated-webhook-administration` | credential-free webhook metadata update, webhook delete |

Every branch uses this fixed logical commit sequence with its table scope substituted:

1. `feat(schema): register delegated <scope> operations`
2. `feat(api): execute delegated <scope> operations`
3. `feat(audit): attribute delegated <scope> effects`
4. `test(security): verify delegated <scope> boundaries`
5. `docs(api): document delegated <scope> operations`

Scope/acceptance: no PR enables more than three exact privileged operation IDs. Each adds typed parameter/result/preview schemas, the adapter to the existing native service, current permission/hierarchy/target revalidation, QAD-209 registry floor/provenance/escalation rules, deterministic effect/reconciliation and audit mapping, rate/rollout wiring, compatibility classification, negative/failure/race tests, and generated API documentation. The exclusions and full coverage manifest in `delegated-native-operation-registry.md` are mandatory; an unsupported/unclassified operation never falls back to bot authority.

## Dark migrations and producer order

For every table or wire change:

1. add schema/constants/generated artifacts and tolerant readers;
2. deploy/read old and new rows with absence defaults;
3. add writers behind the relevant private rollout layer at zero percent;
4. canary allowlisted test applications/communities;
5. enable dependent server paths before UI discovery;
6. roll through 1%, 10%, 50%, then 100% when traffic volume makes percentage canaries meaningful, otherwise use explicit allowlists;
7. require clean authorization, privacy, reconciliation, error, latency, and resource dashboards at every gate;
8. keep the rollback target release able to read/revoke/reconcile the new state;
9. after 100% and at least one complete rollback-capable release cycle with clean reconciliation, remove the temporary layer in a dedicated `chore(...)` PR.

Observation time and numerical SLO/alert thresholds remain deployment-owned under QAD-192 because the repository contains no traffic/topology evidence. A release owner must record them before each production gate; “no value chosen” means no gate advancement.

Temporary layers map to trains as follows:

| Layer | First writer/producer | Removal point |
|---|---|---|
| `installation_writes_percent` | I1 | after I3 fully observed |
| `command_registry_writes_percent` | C2 | after C3/registry developer use observed |
| `gateway_interaction_delivery_percent` | E2 | after E3 and P2 fully observed |
| `http_interaction_delivery_percent` | E2 | after E3 and P2 fully observed |
| `command_picker_percent` | P2 | after P2 fully observed |
| `ephemeral_responses_percent` | R1 | after R1 privacy/cleanup observed |
| `message_components_percent` | R3 | after R3 fully observed |
| `declarative_administration_percent` | D1 | after A3 fully observed |
| `delegated_native_actions_percent` | U1 | after U3–U20 are separately observed and the completeness manifest is clean |

Incomplete released source uses fail-closed defaults. Final source changes defaults to fully enabled before removal. These are private transitional controls, not documented permanent self-host settings; a self-host build never needs a permanent master toggle.

## Rollback rules

- Rollback means set the affected producer/discovery layer to zero and deploy a compatible prior producer, not delete rows or run a down migration.
- Readers, revocation checks, suspension, expiry, cleanup, audit, and reconcilers stay deployed until all state they understand is terminal or permanently supported.
- New columns/tables/unknown optional fields remain. Physical removal occurs only in a later separately reviewed cleanup after no supported version needs them.
- Interaction response endpoints remain available for at least the maximum existing 15-minute response lifetime after invocation production stops. Ephemeral cleanup/report access persists for retained items; components become inert rather than disappear.
- An installation writer rollback stops new operations but completes/rolls back every existing `INSTALLING`, `UNINSTALLING`, or cleanup-failed record. It never falls back to the old untracked OAuth side-effect path for those applications.
- Command head rollback stops publication/discovery producers but preserves immutable heads/configuration. It never rewrites the head to a guessed older revision.
- Suspension and deletion journals are safety state and cannot be disabled as a feature rollback. A binary that cannot enforce current suspension/authority epochs is not a valid rollback target.
- Public message data stays readable with static fallback. No rollback reactivates an unknown control or old delegated capability.
- Database/wire rollback compatibility is demonstrated in tests using current writer -> previous tolerant reader and previous writer -> current reader before activation.

## Generated artifacts and validation gates

Generated files are changed only by their source generator and committed with the source change that requires them so every commit remains buildable.

### Baseline for every implementation PR

- focused unit/integration tests for its boundary;
- `pnpm typecheck`;
- `pnpm test` (the repository-documented complete test command);
- `pnpm knip` when public exports/modules change;
- review `git diff --check` and the complete branch diff against its parent;
- confirm no secret/content appears in fixtures, logs, snapshots, or test output.

### Conditional gates

- Table/type changes: run `pnpm dev:cassandra:diff`, apply in isolated development infrastructure as documented, and `pnpm dev:cassandra:verify`; exercise both Cassandra and Postgres KV integration behavior.
- Shared protobuf schema changes: edit source under `packages/schema/proto`, run `pnpm --filter @fluxer/schema generate`, and verify generated drift only.
- API schemas/routes: run `pnpm openapi:generate` and `pnpm openapi:validate`; inspect the semantic OpenAPI diff and external Dart dispatch impact.
- Rust/message changes: `cargo fmt --all -- --check`, `cargo clippy --workspace -- -D warnings`, and focused plus workspace tests as required by CI.
- Erlang/Gateway changes: repository CI helper/Makefile formatting, compile, Dialyzer, and EUnit gates.
- Documentation changes: `pnpm docs:build` and link/example verification.
- React UI: focused Vitest, typecheck/build, real wide and narrow responsive visual inspection, keyboard-only navigation, focus/IME behavior, screen-reader naming, contrast/touch target checks, and screenshots/recordings in the human-authored PR.
- Security-sensitive trains S/R/U/A: failure injection, concurrency/race tests, malformed/fuzz fixtures, replay/substitution/SSRF/privacy/authorization matrices, redaction review, and the applicable runbook drill.
- Rollout-capable PRs: dashboard/alert/synthetic probe and rollback/reconciliation runbook exist before nonzero production activation.

Root `pnpm test`/`pnpm typecheck` are required on these cross-cutting branches even when focused checks pass. A skipped/unavailable complete check must be reported with evidence and cannot be relabeled equivalent to a partial check.

## Stack update, review, and merge procedure

- Use ordinary Git branches; do not mix JJ state into this plan unless the worktree actually adopts JJ later.
- Keep review changes on the branch that owns the behavior. During review, use fixup commits locally, autosquash before final review if maintainers prefer, then rebase every descendant; never duplicate the same fix in children.
- After a parent changes, run `git range-diff <old-parent>..<old-child> <new-parent>..<new-child>` and inspect the child diff before updating its remote branch.
- After the parent is squash-merged (the current history has linear PR commits and no recent merge commits), fetch `main`, rebase the first remaining child with `--onto origin/main <old-parent-tip>`, retarget its PR to `main`, then rebase later children in order.
- Preserve the reviewed child patch; do not merge `main` into stacked branches merely to avoid a controlled rebase.
- Any force update uses `--force-with-lease`, only with explicit authorization to push, and only after verifying the remote tip. Branch/commit/push operations remain separately authorization-gated.
- Re-run focused tests after any parent-only rebase; re-run the complete required matrix when conflict resolution or generated artifacts changed.
- Merge one PR at a time. Do not merge a child before its parent or leave a public producer dependent on an unmerged tolerant reader.
- PR titles obey `.github/workflows/validate.yaml`; PR descriptions use the repository template, are human-authored, explain stack parent/flag/rollback, and disclose LLM help. Do not paste these research notes as GitHub prose.

## Completion criteria for the master plan

The implementation series is complete only when:

- all approved trains and their launch-blocking policy choices are implemented;
- temporary flags for completed features are removed;
- readers/reconcilers show no legacy partial state except explicitly unbackfilled bots;
- compatible protocol/docs/OpenAPI/conformance fixtures and migration smoke pass;
- operator recovery, suspension, privacy, and deletion drills pass;
- skipped Flutter/DM/context/global-app/official-SDK work remains explicitly out of scope rather than half implemented.

## Current Fluxer evidence and classification

- The monorepo spans TypeScript schemas/API/React, Rust services, and Erlang Gateway; shared contracts cannot safely be UI-only PRs.
- Root scripts define `pnpm test`, `pnpm typecheck`, Cassandra diff/apply/verify, OpenAPI generation/validation, docs build, and knip. CI additionally runs Rust formatting/Clippy/tests and Gateway formatting/compile/Dialyzer/EUnit.
- Pull request titles use Conventional Commit form and current history is linear/squash-style; `.github/CONTRIBUTING.md` requires understandable human-owned work and disclosure of LLM help.
- There is no repository RFC/ADR convention and no Flutter tree.

This **preserves** Fluxer's monorepo generators, validation, title, linear-history, and documentation conventions; **extends** them with short dependency stacks and explicit dark rollout/rollback gates required by this cross-service feature; and **intentionally avoids** a permanent mega-branch or public feature master switch.
