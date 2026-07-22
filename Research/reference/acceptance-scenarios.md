# Acceptance Scenarios

These 44 scenarios define release acceptance for the planned platform. Scenarios that cross service boundaries must pass against production APIs and real services. Static inspection and mocks are not enough.

The [orientation](../guide/01-orientation.md) provides the product context. The [glossary](glossary.md) defines the recurring terms used in these scenarios.

## SIM-G01

**Compatible bot reaches its first public response**

A developer creates an application, installs it in a community, registers a compatible chat-input command, receives one trusted interaction through the selected transport, responds publicly, and uninstalls. The path requires no Fluxer-only declaration or official SDK. Every response and retry stays bound to the accepted command revision and installation generation. Uninstall revokes old response and component authority before cleanup.

## SIM-G02

**Code-defined install permissions and a delegated native action remain separate**

A developer publishes code-defined bot permissions and one reviewed native operation. `Manage Guild` may approve exactly the authenticated saved permission set on first install. That set authorizes only the bot role.

The broker separately authorizes one effect under current `AS_USER`, `AS_BOT`, or `REQUIRE_BOTH` rules. Command visibility, manager status, or broad bot permission never implies delegated authority. Authority changes require community review and do not rewrite an in-flight interaction.

## SIM-I01

**A zero-permission first install becomes active**

An authorized manager installs an application with permission value zero. Fluxer claims `INSTALLING`, allocates and creates the mandatory zero-permission managed role, adds the bot, assigns the role, rereads every ownership invariant, and reaches `ACTIVE` through one final compare-and-set.

No community authority exists before that transition. Missing the 15-second forward deadline causes rollback. A request abandoned for 30 seconds can only roll back and can never activate later.

## SIM-I02

**A partial install rolls back and manual recovery converges**

Role creation succeeds but member creation or later recording fails, then role cleanup also fails. The installation never becomes active. Rollback attempts detachment, owned membership removal, and owned role deletion without letting one failure suppress another safe step.

The row exposes `INSTALL_CLEANUP_FAILED` and follows the jittered 25-attempt schedule. After exhaustion, an authorized manager or recovery operator may open a new bounded recovery cycle. Missing or unrelated resources never count as proof of cleanup.

## SIM-I03

**Uninstall failure followed by reinstall does not revive old authority**

An active installation leaves `ACTIVE`, revokes its generation, then member removal succeeds while role deletion fails. The relationship remains unauthorized in `UNINSTALL_FAILED` until exact owned cleanup converges to `DORMANT`.

Reinstall reuses the community and application pair but creates a new generation and managed role after current review. Retained command and setting intent may return.

Old response tokens, capabilities, messages, controls, and generation-bound claims remain terminal until an explicit current-version message reconciliation creates new authority.

## SIM-I04

**Managed-role presentation and bot authority have different owners**

`Manage Roles` may edit name, color, icon, hoist, and mentionability but cannot change permission, position, membership, deletion, or supplemental roles. Invite mode preserves the installer's held-permission rule.

Code-defined mode permits `Manage Guild` to approve exactly one authenticated saved set on first install, and that set becomes the relationship ceiling. Only community owner or `Administrator` may later raise the ceiling, move the managed role, or change supplemental roles. A developer recommendation alone changes no effective authority.

## SIM-I05

**A legacy bot stays unbackfilled but obeys suspension and deletion**

A bot installed before the new lifecycle has membership and ordinary roles but no installation row. Rollout does not infer generation, managed role, or role owner from names or assignments. Scoped suspension can still block the known authenticated application in one community.

Ordinary removal leaves ordinary roles alone and creates no dormant managed relationship. A later authorization uses a fresh managed installation. Permanent application deletion revokes and removes known bot membership without guessing an ordinary role, including after backup restore.

## SIM-I06

**Application deletion and community deletion clean different owners**

Permanent application deletion first revokes global credentials, sessions, installation, publication, and delivery authority. It then reconciles active, dormant, incomplete, and legacy relationships before removing application-owned definitions and secrets.

Permanent community deletion first revokes only that community, then removes every scoped application relationship and record while applications remain valid elsewhere. Public bot-authored content and safety evidence follow their separate lifecycle. Restored older backups replay tombstones before any authority or data exposure.

## SIM-C01

**Compatible registration with duplicate providers binds exact selection**

Several eligible providers expose the same shared command name. Registry identity remains provider plus command ID, never display text. The picker shows provider attribution and submission stores the exact selected IDs. Explicit user provider preference may resolve a collision.

Favorites, community recommendation, and passive usage only order candidates and never choose one. A stale or unavailable preference is ignored rather than retargeted.

## SIM-C02

**Command deletion is dormant and retirement waits for a reference check**

Developer deletion makes a stable command identity dormant while community and user references remain bound to it. One application may retain at most 1,000 command identities at one time, including inactive identities.

Retirement succeeds only after retained manifests and every configuration, preference, interaction, and other reference are gone. Safe retirement frees capacity. Later use of the same key creates a new command ID and inherits nothing.

Recovery may use one of the newest 20 manifests or five additional pins, revalidate it, and publish it as a new head rather than rewinding history.

## SIM-C03

**Limits, no-op publication, concurrent heads, stale forms, and recovery**

Full validation and canonical byte comparison make a request that changes nothing return without creating a revision or event. One complete candidate becomes visible through a single head compare-and-set. Competing publishers and forms based on older versions receive conflicts and preserve their candidates.

Fluxer never field-merges security state. The developer dashboard distinguishes committed head, draft, validation result, publication history, and reconciliation state. Recovery republishes retained content as a new head.

## SIM-C04

**Category policy, contextual links, manager bypass, and final authority stay distinct**

A stable category deny applies to current and future member commands through one community row. Category deny is absolute and cannot be overridden by owner or `Administrator` bypass.

Role or channel settings may link an authorized manager into the one Integrations policy editor, but they do not duplicate or write policy. A documented manager bypass may affect community-authored audience and channel policy only.

It cannot bypass installation, suspension, targeting, current permission, hierarchy, component audience, capability, or native-effect authorization.

## SIM-C05

**Concurrent creation respects the 50-application cap and handle release is safe**

An owner with 49 retained applications submits two concurrent creates. One conditionally reserves slot 50 and the other receives `MAX_APPLICATIONS`. A partial create holds its slot until cleanup proves no live application, credential, bot, or handle remains.

Permanent deletion revokes first and continues to consume the slot until deletion completes. Handle release conditionally proves ownership and completes within 24 hours. A missed deadline pages operators and quarantines the handle instead of transferring ambiguous ownership. A later claimant receives a new Snowflake and cannot retarget prior submissions.

## SIM-C06

**Advanced options fail closed across capability, schema, limit, and permission changes**

A command uses multi-value resources, conditional relationships, or temporal input while clients, transports, schema revisions, or permissions change. One server preflight checks capability support, collection identity, limits, conditions, time resolution, current schema, access, and permission before interaction creation. Unsupported semantics never downgrade.

Stale values remain available for visible correction where safe, but no uncertain or partially valid collection reaches the application. Fluxer never invents timezone, condition precedence, or resource identity.

## SIM-C07

**Personal command state synchronizes without becoming authority or history**

Favorites, hiding, explicit provider preference, alias presentation, and passive usage synchronize with their account or community scope. Hiding remains reversible and discovery-only. Only explicit provider preference may select a provider.

Passive usage stores no arguments or values and expires after 90 days of inactivity. A failed optimistic client update returns to the last confirmed server state. None of this state grants command availability or native authority.

## SIM-C08

**Excluded command contexts remain unavailable without narrowing future protocol**

The first release accepts one application with one bot and community chat-input commands. Direct messages, group DMs, global and user installs, context commands, Activities, and multi-bot applications are rejected before interaction creation with an audience-safe unsupported result. Reserved envelope and schema fields keep future extension possible. The system does not advertise, persist for execution, or partially route unsupported features.

## SIM-C09

**The native adapter preserves behavior while collisions bind exact providers**

Native commands enter the provider-aware catalog through a typed adapter while their existing handler and server authorization behavior remain unchanged. A name collision displays native and application attribution. Explicit selection or preference binds exact provider identity.

Mutable names can never route application work into a native handler or the reverse. The collision interface is not released until a real composer prototype passes keyboard, screen-reader, focus, and narrow-layout review.

## SIM-C10

**Handle allocation stays provisional until atomic first-publication freeze**

Application creation conditionally claims a unique handle. An automatically generated handle can be replaced only before any command publication. The first visible manifest-head publication freezes the handle before discovery. Competing replacement, publication, retry, and source-index recovery use conditional ownership. No published application can be redirected by rename, failed creation, stale cache, or another claimant.

## SIM-C11

**A staged draft remains one candidate through edit, drift, validation, and publish**

One application draft has one ID, base manifest revision, and version. Editing advances that candidate instead of creating a second registry. If the live head changes, publish rejects the stale base while preserving the draft.

After complete validation, immutable revisions are written and one head compare-and-set exposes the candidate. Fluxer never silently merges or rebases it. Draft bodies and values stay out of logs and metrics.

## SIM-C12

**Community-compatible registration changes targeting without forking schema**

Community registration validates against the one application-wide command schema. An identical definition adds or preserves that community target. A different definition returns `COMMAND_SCHEMA_CONFLICT`. Community delete removes only that target. Community bulk overwrite replaces only that application's exact target set and cannot delete or alter another provider's commands. Concurrent target and manifest changes resolve through current head and expected versions.

## SIM-D01

**A defer commits within three seconds and completes before fifteen minutes**

The initial callback or defer must be durably claimed inside three seconds. A valid defer preserves its original visibility and may complete or create follow-ups only during the 15-minute response-authority window.

After that deadline, logical mutation authority fails even if physical cleanup lags. Expiry of response authority does not itself delete an ephemeral message still within its separate retention period or a public message.

## SIM-D02

**Outgoing HTTP retry, unsafe redirect, overload, and breaker recovery are bounded**

Endpoint activation proves the exact public HTTPS destination, signing generation, and capability set. Delivery pins a validated public address, follows no redirect, and applies the remaining absolute deadline. Only a qualifying transient failure receives one retry with the same interaction ID.

Queue and in-flight bounds fail fast before deadline exhaustion. Circuit opening makes commands unavailable before invocation. Two controlled health successes close it. One interaction is never duplicated across Gateway and HTTP.

## SIM-D03

**Layered limits charge every relevant actor and scope**

One accepted operation charges every applicable route, user, bot, application, installation, interaction, response-token, and native-action budget. Token-scoped response routes may be exempt from bot-global charging where documented, but remain bounded by response and follow-up rules.

Invalid, stale, duplicate, and idempotent requests consume their normal buckets. Rate acceptance is separate from authorization and effect success. Retry headers report stable current bucket state while code-defined numeric defaults remain tunable.

## SIM-D04

**Autocomplete results are bounded, query-bound, and superseded**

Autocomplete creates a bounded read interaction tied to one query identity. At most two requests remain pending per user and application and 50 per installation. Newer text makes older results ineligible for display even if old work completes later.

Responses contain at most 25 suggestions and 64 KiB. Native resource search stays server-side unless application autocomplete was declared. Final submit performs full current schema, access, and permission preflight again.

## SIM-D05

**Modal open, submit, cancellation, and expiry are distinct outcomes**

Opening a modal acknowledges the source interaction but does not mean the application workflow succeeded or that a component value committed. A valid submit creates a new authenticated interaction bound to the modal schema.

Cancel, dismissal, and expiry create no submit event and no synthetic success. They revoke form upload authority, clear client-held values, and restore focus. Field values, uploads, bodies, and custom IDs remain outside logs, traces, analytics, and ordinary audit.

## SIM-D06

**Oversized and adversarial input stops before parse or fanout**

Byte, stream, nesting, count, graph, and pending-work limits reject input before expensive parsing or allocation. Valid-looking work is bounded again before persistence, delivery, user fanout, or native effects. One application cannot consume every dispatcher or worker.

Multi-value input does not authorize bulk effects. Invalid, stale, and duplicate attempts still consume the applicable budgets. Error output is limited to 100 path errors and never echoes the body.

## SIM-D07

**Client, Gateway, and HTTP capabilities converge on one registry**

One permanent registry defines capability syntax, dependencies, consumer type, supported transport, version, deprecation, and retirement. A client session, Gateway Identify, or verified HTTP configuration binds the accepted intersection. Invocation and response cannot add capabilities by echoing them.

Malformed values fail and unknown values are never accepted. Missing or dependency-blocked capability creates compatible baseline or inert fallback, never semantic downgrade. Stable contracts keep at least twelve months of applicable overlap unless emergency safety or law requires otherwise.

## SIM-P01

**Two users select concurrently while public aggregate output also changes**

Each user receives independent pending and committed component state. The selected application or native outcome owner commits each value at most once under the interaction identity. A public aggregate message update is a separate expected-version compare-and-set.

A stale application update receives conflict and cannot overwrite another user's committed state. Fluxer does not attempt to merge application semantics or expose individual selection values publicly by default.

## SIM-P02

**Stale click, one-use race, unsupported client, copy, uninstall, and reinstall stay safe**

Control authority binds exact application, installation generation, message, message version, component path, selector, and definition hash. A copied or stale selector cannot retarget an action. One-use reservation has one conditional winner. Concurrent callers see in-progress. Success changes the claim to used.

A rejection with proven no effect returns it to available so another caller may retry. An ambiguous effect remains fail-closed or terminal. Unsupported clients render attributed inert fallback. Copying carries static content only.

Uninstall makes the old generation inert and reinstall never revives it. Explicit reconciliation can create a new version only under current ownership and schema.

## SIM-P03

**Component audience denies before interaction creation and has no manager bypass**

Fluxer reevaluates current message access, membership, role, native permission, source invoker, and author predicates before creating an interaction or pending state. Audience can only narrow existing visibility. Owner, administrator, `Manage Guild`, and local command-policy bypass do not override it. Ephemeral message and security-confirmation controls remain exact invoker-only. Denial reveals no hidden audience membership or application state.

## SIM-A01

**An unchanged compatible bot command remains bot-authorized**

A compatible command omits Fluxer authority fields and normalizes to `AS_BOT` with no native-operation broker opt-in. Interaction delivery may include invoker context, but later ordinary REST calls authenticate and authorize only the bot.

Fluxer never grants the bot the invoker's permission or attributes autonomous bot work to that human. Current managed role, installation, suspension, endpoint rules, and bot audit remain authoritative.

## SIM-A02

**Deceptive application copy cannot substitute actor or evade confirmation**

An application labels a destructive cleanup request as harmless and selects hidden targets. Fluxer ignores application wording for authority. The immutable operation registry and typed parameters determine actor, targets, risk floor, and audit.

Application-selected security values require confirmation and bulk or destructive effects require high-impact confirmation. Current authority is reread, one capability is consumed once, and partial work keeps deterministic effect state. Broad autonomous bot authority remains a separate managed-role risk.

## SIM-A03

**All execution modes and review transitions preserve principal boundaries**

`AS_USER` requires the invoker, `AS_BOT` requires the bot, and `REQUIRE_BOTH` requires both at effect time. Every transition among modes reviews additions and removals to operations, permissions, parameters, and effects.

Approval records a reviewed definition but grants no role, permission, hierarchy, or target authority. An in-flight capability remains bound to its original authority revision and fails if current approval or lifecycle no longer permits it. Unsupported work never falls back to another mode.

## SIM-A04

**The same native operation selects confirmation class from provenance and effect**

An exact low-impact action disclosed before submission may use Class 0. An application-selected security target requires Class 1. Multiple targets, permissions, hierarchy, durable deletion, history deletion, or another high-impact effect requires Class 2 even when user intent was exact.

Fluxer, not the application, selects the class. Confirmation is invoker-only, exact, short-lived, and followed by current-state revalidation. Application responses include only the result fields allowed for their audience.

## SIM-S01

**Concurrent manager save while application is offline converges to latest state**

Two authorized managers save against the same configuration version while the application is offline. Each request validates a complete immutable snapshot. One compare-and-set wins and the other receives `CONFIGURATION_VERSION_CONFLICT` with changed keys but no values. Persistence succeeds independently of application health.

The source remains not applied until acknowledged. Reconnect sends only the latest full state, so an obsolete queue delivery cannot roll configuration backward.

## SIM-S02

**Dormant key retention, expiry, reset, forget, and deletion keep ownership clear**

Developers own stable definitions and managers own saved community values. Removing a definition makes its key dormant, type-fixed, and still counted against the 100-key budget. Reset writes `INHERIT` without erasing identity or history.

Superseded values expire after 45 days under a value-free cutoff marker. Manager Forget irreversibly removes value-bearing current and historical copies plus derived commitments. Permanent application or community deletion removes its owned scope. Backup restore replays markers before reads or delivery.

## SIM-S03

**Callback deception and native self-role effects use separate trust models**

An application callback and a native self-role panel present similar UI. Callback work is explicitly labelled application-handled and Fluxer makes no external rollback claim.

Native work uses a reviewed operation, exact server preview, current manager and bot authority, deterministic ledger, and per-effect audit. A user can change only their own configured ordinary roles. Concurrent role or hierarchy change may produce a reported partial result.

Safe work reconciles or compensates only unchanged operation-owned resources. Suspension or stale schema stops remaining authority.

## SIM-S04

**Repeatable configuration and an offline-native message preserve separate ownership**

Manager-owned repeatable groups and separately versioned message templates feed one Fluxer-native message operation. Neither resource is silently interpolated into the other's identity or lifecycle.

Fluxer owns exact preview, bot authorship, channel permission, message ownership, expected version, deterministic publish or update or delete, audit, and recovery. The operation may proceed while the application is offline because it is platform-native. Callback actions remain disabled offline and are never queued.

## SIM-E01

**An ephemeral message is delivered, reported, dismissed, expired, and excluded from export**

The message lives in recipient-scoped storage outside channel messages and appears on eligible sessions of exactly the invoker account. Another user receives an indistinguishable unknown result. Account-wide dismissal and expiry revoke reads, controls, and application edits before physical deletion.

Initial ephemeral content has no attachment or application-controlled media. Ordinary export, search, analytics, and logs exclude it. Reporting snapshots only the exact governed safety evidence. Suspension preserves safe reading within retention and revokes app mutation authority.

## SIM-E02

**Report resolution, reopen, hold, purge, and restore converge across every copy**

A versioned report aggregate owns database row, search document, copied objects, and indexes. Resolution schedules evidence expiry 180 days later. Reopen before purge or a current legal hold wins.

Hold review is due within 90 days and release after elapsed expiry starts purge immediately with a seven-day completion target. Partial purge resumes under one operation ID without recreating data. Legacy rows without a current policy generation fail closed.

Account erasure and backup restore honor exact hold, cutoff, and non-resurrection markers. Privacy and legal approval remain required before activation.

## SIM-X01

**Community suspension, application escalation, owner review, and reinstatement fail closed**

Safety operators first suspend one community relationship, leaving other communities available, then escalate the application after compromise. Application-wide suspension terminates shared sessions and delivery. State, messages, configuration, retention, and cleanup remain durable but authority is blocked.

Owners and managers receive audience-safe scope information, and the owner may submit a version-bound review. Reinstatement stays enforced while identity, credentials, active relationships, managed roles, transport, manifests, configuration, and deletion state reconcile. Dormant or unrepaired relationships never reactivate, and old issued authority remains terminal.

## SIM-R01

**Cross-store restore does not resurrect deleted, suspended, ephemeral, or delegated state**

An older backup is restored after deletion, suspension, ephemeral dismissal, configuration Forget, and issued delegated actions. Recovery blocks new writes, verifies signed manifests and keys, increments authority epoch, purges transient and ephemeral classes, and replays non-resurrection journals before reads or delivery.

Recovery then verifies immutable heads, rebuilds indexes, and runs domain reconcilers. Deleted and suspended applications remain blocked. Old generations, tokens, capabilities, confirmations, and ephemeral messages remain dead. Unverifiable cutoff or journal coverage leaves recovery hold enforced. Drills report achieved recovery point, time, and backlog convergence.

## SIM-O01

**A staged rollout reaches a limited group and rolls back safely**

Additive schemas and code that can read both old and new data are deployed before any feature writes new data. Cross-service round-trip and reconciliation checks must pass before writes are enabled for explicitly allowed applications. The percentage of eligible traffic then increases gradually while dashboards and alerts are monitored. If the new write path fails, it is disabled without reversing the schema changes.

Data remains readable and generation, suspension, revocation, cleanup, audit, expiry, reconciliation, and repair continue. Once durable partial state exists, an older software version that cannot enforce it is not a valid rollback. Temporary rollout controls are removed after full observation and compatible recovery evidence.

## SIM-O02

**Dependencies keep later features from being released too early**

Components wait for response ownership, public versioning, fallback, and outcome reconciliation. Provider collision controls wait for real-composer usability and accessibility evidence. Delegated authority waits for reviewed manifests, confirmation, revocation, current-state authorization, causal audit, deterministic effects, and recovery.

Declarative native actions wait for settings, message ownership, and component foundations. SDK work remains a separate post-stability project with protocol, fixture, support, security, and provenance owners. Release requires the approved dependency graph plus its failure, rollback, and recovery drills.

## Coverage check

The catalog contains:

- 2 end-to-end scenarios
- 6 installation and deletion scenarios
- 12 command and discovery scenarios
- 7 interaction-delivery scenarios
- 3 component scenarios
- 4 authority scenarios
- 4 declarative administration scenarios
- 2 ephemeral and report scenarios
- 1 suspension scenario
- 1 disaster-recovery scenario
- 2 rollout scenarios

Total: **44 scenarios**.
