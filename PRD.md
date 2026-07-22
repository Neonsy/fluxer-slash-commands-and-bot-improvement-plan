---
title: Fluxer Bot Platform v1
description: Product requirements for community-installed applications, commands, interactions, administration, and platform safety
verified_commit: fd62b46faf3505d738f6d5800e787473b14cacd6
verified_date: 2026-07-22
---

# Fluxer Bot Platform v1

## Summary

Fluxer is a chat platform organized into communities with members, channels, roles, and permissions. It already lets developers create OAuth applications, each with a bot account that can be invited into a community. This plan adds the missing command platform. Developers will be able to publish community slash commands, members will be able to discover and use them in Fluxer, and community managers will be able to control installations, commands, settings, and approved permissions.

Fluxer will own the parts that applications cannot safely manage for themselves, including lifecycle, permission enforcement, suspension, audit, cleanup, recovery, privacy, and rollout.

This is the complete product contract, not a proposal to release every part at once. The first candidate public path combines the required safety foundation with compatible installation, command registration, interaction delivery, public responses, and command discovery. Rich interactions, hosted administration, and delegated authority follow as separately staged extensions. [Release priorities](#release-priorities)

### How to read this plan

No dev-chat history or prior knowledge of the Fluxer repository is required. Read through [What this will let people do](#what-this-will-let-people-do) for the problem, complete scope, and main product journeys. The remaining sections define requirements, release evidence, and delivery order. The [research index](Research/README.md) gives the full technical reading order and shorter review paths for the current product, API, accessibility, security, privacy, recovery, and rollout details.

## Terms used in this plan

| Term | Meaning here |
| --- | --- |
| Community | A shared Fluxer space containing members, channels, roles, and permissions. Discord API compatibility uses the term `guild` for the same scope. |
| Application | A developer-owned integration record. Fluxer uses OAuth, an authorization protocol, for its invitation and consent flow. Each application has one bot account and its own credentials. |
| Bot | The automated account that represents an application inside a community and uses its own current roles and permissions. |
| Slash command | A named action that a member finds by typing `/` in the message composer. |
| Command picker | The responsive web menu that lists matching built-in and application slash commands. |
| Interaction | One command or control use that Fluxer accepts, records, and delivers to the responsible application. |
| Ephemeral message | An interaction message visible only to the account that invoked it. Discord-compatible response APIs call it an ephemeral response. Technical descriptions use recipient-scoped for its audience and storage. |
| Installation | The planned durable relationship between one application and one community. It owns lifecycle, approved authority, community configuration, cleanup, and recovery. |
| Gateway and outgoing HTTP | Gateway is Fluxer's persistent real-time connection for bots. Verified outgoing HTTP sends signed interaction requests to an application's registered web endpoint instead. |

## Problem and goal

Fluxer can invite bots into communities, but it cannot support their commands as a complete product. Developers cannot publish third-party slash commands. Members cannot discover or invoke them. Community managers have no single place to understand an installed app, control its commands, or respond to failures. Fluxer operators lack app-specific suspension, repair, recovery, and privacy controls.

Adding only a command endpoint would leave those gaps in place. The product needs one lifecycle from application creation through installation, command use, administration, failure handling, and deletion.

### Goal

A developer can run a compatible community bot on Fluxer by changing its credentials, API endpoint, and transport settings instead of rewriting supported command handlers. When several applications offer a command with the same name, a member can choose which application to use and see which application sent the response. A community manager can compare the permissions an application requested, the permissions the community approved, and the permissions its bot currently has. Fluxer can contain failures and abuse without reviving expired or revoked access.

## What exists today and what is missing

The current-state column was verified in the Fluxer repository at commit `fd62b46faf3505d738f6d5800e787473b14cacd6` on 2026-07-22. It describes repository behavior, not the proposed system. This table is the shortest map of what the complete plan covers and why each part is necessary.

| Area | Current Fluxer behavior | What the plan adds | Why it is included |
| --- | --- | --- | --- |
| Applications and compatibility | OAuth creation allocates a bot user and credentials. Supported bots can already authenticate and use ordinary bot REST routes, but applications have no public command identity, delivery configuration, or real signing key. | Recoverable creation, stable public handles, credentials and transport lifecycle, generated contracts, compatibility fixtures, and migration guidance. | Existing bots need a stable application identity and a tested configuration-only migration path before Fluxer can claim compatibility. |
| Community installation and permissions | OAuth consent adds the bot member and may create an ordinary mutable role. There is no durable record linking the application, community, approved permissions, bot member, and role. | One versioned installation lifecycle with a fresh authority generation, exactly one managed role, a durable approved permission ceiling, uninstall, reinstall, cleanup, and repair. | Without an owned relationship, Fluxer cannot prove what belongs to an app, revoke before cleanup, repair partial installs, or prevent reinstall from reviving old access. |
| Commands, input, and discovery | The responsive web client has a fixed local command array with hard-coded parsing and execution. There is no third-party registry or provider identity. | Application-scoped registration, immutable publication, targeting, typed input, localization, aliases, community policy, personal preferences, and a command picker that keeps duplicate providers distinct. | Applications need a way to publish commands, and members need to select the exact app when several apps use the same command name. Stable identity prevents renames, aliases, and stale clients from retargeting a command. |
| Interactions and responses | API routes and Gateway dispatch have no application-command interaction, callback contract, verified HTTP delivery, or response token. | One trusted interaction record, Gateway or verified outgoing HTTP delivery, deadlines, bounded retries, response authority, public responses, and truthful idempotency. | Fluxer must bind each invocation to the exact app, command, actor, audience, and installation generation so delivery retries and callbacks cannot duplicate or redirect work. |
| Messages and ephemeral interaction state | Ordinary channel messages support content, embeds, attachments, stickers, and reactions. There is no application component grammar, concurrency-safe public update contract, or ephemeral message store. | Compatible and richer components, modals, versioned control state, safe unsupported-client fallback, and ephemeral messages with explicit access, reporting, expiry, deletion, export, and backup behavior. | Interactive controls need exact ownership and concurrency rules. Ephemeral messages cannot safely behave like hidden channel messages because their audience and data lifecycle are different. |
| Community administration | Community Settings has an Integrations category for webhooks. It does not show or manage invited bot applications. | One installed-app home for lifecycle, commands, permissions, settings, health, activity, suspension, reset, uninstall, repair, app-owned messages, self-role panels, and bounded declared actions. | Managers need one authoritative place to understand and control an app. Applications should not need to build separate dashboards for ordinary community-owned configuration. |
| Execution authority and audit | Bot credentials act only as the bot. Current services do not carry a delegated user, combined user-and-bot principal, or application causation chain. | Explicit application-callback, bot, user, and combined authority paths, exact reviewed native operations, trusted confirmation, single-use capabilities, and causal redacted audit. | A command invocation must not silently lend the member's permissions to a bot or let application text choose a privileged actor, operation, target, or audit record. |
| Safety, data, and operations | Generic audit, workers, metrics, and recovery patterns exist, but there is no app-specific suspension, lifecycle reconciler, ephemeral-message lifecycle, or bot-platform restore contract. | Targeted suspension, resource and abuse protection, durable effects, subsystem-owned reconciliation, retention and erasure rules, observability, runbooks, staged rollout, rollback, and disaster recovery that does not restore expired authority. | The platform crosses services and cannot make every effect one transaction. Failure, abuse, deletion, rollback, and restore must remain contained and recoverable without exposing secrets or reviving revoked access. |
| Clients and accessibility | The in-repository React client supports responsive web layouts. The separate Flutter client is outside this repository. | Responsive developer, manager, member, confirmation, component, and recovery experiences with keyboard, screen-reader, touch, zoom, narrow-width, and inert fallback requirements. | A feature is not complete if supported users cannot discover, understand, operate, or safely fall back from it. Unsupported clients must not turn a rich feature into a weaker action. |

[Verified current-state evidence](Research/reference/current-state.md)

The product has three layers:

| Layer | Meaning |
| --- | --- |
| Discord-compatible base | Existing community slash-command bots keep their familiar command, interaction, callback, component, and bot REST model wherever Fluxer has not documented a deliberate difference. |
| Automatic Fluxer safeguards | Installation state, managed roles, community policy, current permission checks, attribution, suspension, cleanup, reconciliation, and staged rollout protect every app. |
| Optional Fluxer extensions | Apps may opt into richer message controls, ephemeral messages, hosted community settings, native administrative actions, and explicit user or bot authority modes. |

Compatibility sets the migration baseline, not the limit of the product. Fluxer-specific fields remain additive and are used only when the application and client both declare support for them. [Compatibility contract](Research/reference/compatibility.md)

### How permissions fit together

Several permission checks apply at different points. They should remain visible as separate decisions.

| Question | How the plan answers it |
| --- | --- |
| Where does the bot's installation request come from? | An app can use the permissions carried by its OAuth invite or publish an authenticated code-defined permission set for Fluxer to show during installation. |
| What has the community approved? | The exact set accepted during installation becomes the relationship ceiling. Raising that ceiling requires a separate community decision. |
| What can the bot do right now? | Its current roles, permissions, hierarchy, installation state, and suspension state decide what it can actually do. |
| Whose authority does a Fluxer-native action require? | The action declares whether Fluxer must check the current user, the installed bot, or both. Ordinary bot API calls continue to act only as the bot. |

Publishing a different code-defined permission set never changes an installed bot on its own. Installation permissions also do not grant user authority to a command.

## What this will let people do

### Compatible bot from installation to response

A developer creates an app, publishes a compatible community slash command, and installs it into a community. Fluxer preallocates the managed role, adds the bot member, assigns the role, and activates the installation only after all mandatory effects succeed.

A member opens the slash-command menu in Fluxer's responsive web composer. This command picker shows built-in Fluxer commands and commands from installed applications. Each result identifies the application that provides it. Selecting a command binds its stable application and command IDs. Fluxer then rechecks policy and permission, creates one trusted interaction, delivers it through the chosen transport, accepts one public response, and attributes that message to the app. Uninstall revokes the generation and response authority before cleanup. [First working bot](Research/guide/03-first-working-bot.md)

### Fluxer-native administrative action

An app declares an exact reviewed action, such as publishing an app-owned message or a self-role panel, and states whose current authority it requires. A manager separately approves any increased bot authority and the action definition.

Fluxer shows the real operation and targets, chooses confirmation from the trusted source and risk of each input, rechecks current user and bot permission independently, claims a single-use capability, performs the fixed native operation once, and records the causal result. Application copy cannot select the actor, operation, parameters, or confirmation class. [Authority and safety](Research/guide/08-authority-safety-and-data.md)

### Community-managed settings

An app publishes typed setting definitions. Authorized managers edit community-owned values in Integrations even while the app is offline.

Fluxer saves one complete versioned snapshot, rejects stale writes, leaves deleted resource references visible for repair, and shows whether the app has applied the current revision. On reconnect, the app receives the latest complete state rather than a replay of obsolete updates. [Community management](Research/guide/07-community-management.md)

### Ephemeral message

An app sends an ephemeral message to the invoking account across that account's active sessions. Fluxer stores the message outside ordinary channel messages, and other members cannot enumerate it.

Every control rechecks the recipient and lifecycle. Dismissal revokes access before cleanup, an expired message cannot become available again, and ordinary account export excludes the message. Reporting creates a separate evidence record with its own lifecycle. Media stays out of the first release until its ephemeral-file lifecycle has been designed and reviewed. [Interactions and responses](Research/guide/06-interactions-and-responses.md)

## Users and their needs

| User | What the plan gives them |
| --- | --- |
| App developer | Bring an existing compatible bot to Fluxer through configuration changes, publish versioned commands across communities, choose Gateway or verified HTTP delivery, test and inspect failures, recover retained command versions, and opt into richer input, components, ephemeral messages, hosted settings, and native actions without requiring an official SDK. Fluxer handles installation state, current permission checks, suspension, cleanup, privacy, and safe rollout. |
| Community member | Choose between applications that offer the same command name, see which application sent a response, use typed and localized input with accessible controls and clear errors, keep synchronized favorites and discovery choices, and receive public or ephemeral messages with safe fallback on unsupported clients. Personal choices never change command authority. |
| Community manager | Compare requested, approved, and current bot permissions, then manage an application's lifecycle, commands, aliases, settings, health, activity, suspension, and removal from one Integrations area. Managers can edit community-owned settings while an app is offline, repair invalid references, publish approved app-owned messages and self-role panels, and reinstall without reviving old access. |
| Fluxer operator | Suspend one installation or an application across communities, contain overload and abuse, recover partly completed work without duplicate effects, keep secrets and private content out of routine telemetry, enforce retention and erasure rules, and roll out, roll back, or restore durable state without restoring revoked authority. |

## Success measures

| Outcome | Success condition | Evidence |
| --- | --- | --- |
| Existing bots are practical to migrate | The maintained compatibility bot registers, receives, responds, and uninstalls after configuration changes without rewriting its command handlers. | Migration diff, raw protocol fixtures, pinned library tests, and a completed install-to-uninstall run. |
| Installations are understandable and recoverable | Every install reaches a visible active, failed, suspended, uninstalling, or dormant state. Failure never grants hidden authority and repair resumes the same lifecycle. | Lifecycle outcomes, failure injection, cleanup and repair tests, and manager interface review. |
| Members can choose between commands with the same name | Members can identify the application, submit the selected command once, and receive a response that identifies the application without stale policy or personal preferences changing what they are allowed to use. | Discovery, exact-provider selection, submission, delivery, and response outcomes. |
| Interaction delivery is predictable | Each failure class has a bounded retry, timeout, overload, and recovery result for the selected transport. | Latency, retry, timeout, circuit, and rate-limit measurements by transport and failure class. |
| Interactive and ephemeral state stays safe | Concurrent or repeated controls produce at most the allowed effect. Ephemeral message data remains limited to its recipient and expires or deletes without revival. | Component conflict tests, duplicate prevention, recipient-isolation tests, report evidence, and deletion completion. |
| Community management works while apps fail or disconnect | Managers can save and repair community-owned configuration while an app is offline, and reconnect applies only the latest valid state. | Settings conflict tests, offline synchronization, invalid-reference repair, and native action completion. |
| Operations remain supportable | Operators can identify, contain, repair, and recover each supported failure without restoring revoked or expired authority. | Intervention rate by active installation and failure class, suspension exercises, reconciliation results, rollback, and restore drills. |

### Targets that still need evidence

The functional success conditions above are fixed. Numerical targets need implementation and internal traffic before they can be set honestly.

| Measure | Current baseline | Required before release |
| --- | --- | --- |
| Demand and adoption | Not measured | Record the evidence used to choose each public milestone and its expected adoption |
| Compatible bot setup effort | No migration trial exists | Record handler changes, configuration changes, setup time, failures, and support work from representative migrations |
| Installation completion and recovery | No managed installation path exists | Set activation, failure, cleanup, repair, and operator-intervention targets from failure injection and internal use |
| Valid command invocation and delivery | No application interaction path exists | Set availability, platform latency, timeout, overload, and recovery targets for each transport |
| Manager task completion | No installed-application interface exists | Test install, authority review, settings, repair, suspension, and uninstall with representative managers |
| Accessibility | The planned interfaces do not exist | Pass the required keyboard, screen-reader, touch, zoom, narrow-width, and fallback review |
| Authorization and recipient privacy | The planned authority and ephemeral-message paths do not exist | Accepted authorization or recipient-isolation invariant violations remain zero |
| Recovery and support load | No bot-platform recovery path exists | Set backlog, convergence, intervention, recovery point, recovery time, and restore-drill targets |

Before production traffic, each deployment must assign operational responsibility and approve retention, recovery, replication, restore frequency, capacity, rollout, latency, availability, and alert targets.

## What is and is not included

### Included

- A durable community installation lifecycle for existing and new OAuth applications
- Community chat-input slash commands
- Discord-compatible command registration, interaction delivery, callbacks, components, and ordinary bot REST behavior within the documented scope
- Responsive web experiences for developers, managers, and members
- Durable installation, managed-role, command, interaction, response, settings, component, suspension, audit, and recovery state
- Gateway and verified outgoing HTTP delivery
- Public responses and ephemeral messages
- Compatible components plus optional richer layouts and controls
- Community command access, aliases, settings, administrative builders, and declared actions
- Explicit execution using current user authority, bot authority, both, or a normal application callback
- Lifecycle safety, abuse controls, privacy, data deletion, observability, disaster recovery, compatibility testing, rollout, and rollback

### Not included

- Direct-message or group-DM application commands
- Global or user-installed applications
- User-context, message-context, or Activity commands
- Changes to the separate Flutter or native client
- An official SDK in the eleven delivery stages
- Importing Discord behavior when Fluxer has a better documented product decision
- Absorbing an app's tickets, logs, analytics, subscriptions, billing, external authentication, secrets, cross-community tools, or custom dashboards into Fluxer
- Rollback guarantees for effects an app performs outside Fluxer

A thin official TypeScript SDK may be considered only after the public protocol is stable and its maintenance, support, security, and release policies are explicitly approved. [Scope and deferred work](Research/guide/11-open-decisions.md)

## Dependencies and constraints

| Dependency or constraint | Why it matters |
| --- | --- |
| Conditional database updates from stage F | Installation, command publication, one-use actions, and recovery need compare-and-set, a database write that succeeds only while the stored state and version still match, before they can create authority |
| Existing OAuth, bot authentication, permissions, hierarchy, messages, and Gateway behavior | The plan extends these paths and must preserve their current authorization rules unless it documents a reviewed change |
| Shared contracts across TypeScript, Erlang, Rust, OpenAPI, and the responsive web client | A wire or storage change cannot be considered complete when only one runtime understands it |
| A current Discord compatibility comparison | Discord is a moving external reference, so supported behavior and deliberate differences must be rechecked during implementation |
| Security, privacy, accessibility, legal, and operations review at the points identified by the plan | Code completion cannot settle authority, retention, user-interface, or deployment promises by itself |
| Deployment capacity, monitoring, runbooks, backups, and restore drills | A feature remains inside internal allowlists until its deployment can contain failure and recover safely |
| Responsive web as the only client changed by this plan | Unsupported clients need safe fallback. Flutter or another native client requires separately approved work. |
| External application effects remain outside Fluxer's transaction boundary | Fluxer may report delivery and application status, but it cannot claim to verify or reverse an application's database, billing, or third-party work |

## Product requirements

The requirements cover:

- [Applications and installations](#applications-and-installations)
- [Commands and discovery](#commands-and-discovery)
- [Interaction delivery and responses](#interaction-delivery-and-responses)
- [Messages, components, and ephemeral message data](#messages-components-and-ephemeral-message-data)
- [Community controls and settings](#community-controls-and-settings)
- [Execution authority and audit](#execution-authority-and-audit)
- [Safety, data lifecycle, and operations](#safety-data-lifecycle-and-operations)

### Applications and installations

#### APP-01 Stable application identity

An application must have stable IDs and a public handle independent of mutable display names. Creation must treat the application, bot user, credentials, and handle as one recoverable operation. Ownership transfer, deletion, reserved handles, application limits, and credentials must have explicit concurrency and lifecycle rules.

**Acceptance:** Partial creation cannot leave active orphaned credentials or a claimable inconsistent handle. A published command cannot be redirected by renaming a label. [Application contract](Research/reference/application-and-installation-contracts.md)

#### APP-02 Durable community installation

One durable record keyed by community and application must own lifecycle state, authority generation, bot member, managed role, approved permission maximum, app configuration, cleanup, and repair.

Existing bot memberships are not converted automatically. Fluxer cannot safely infer ownership from a mutable role name or current assignment, so a legacy bot enters the managed model only after removal and a fresh installation.

**Acceptance:** A failed or repeated install cannot become active unexpectedly. Uninstall revokes authority before cleanup. Incomplete effects stay visible and repairable. Reinstall creates fresh authority without silently adopting an unrelated role. [Installation contract](Research/reference/application-and-installation-contracts.md)

#### APP-03 Managed authority and administration

The installation owns exactly one managed bot role. Its approved maximum, actual current permissions, hierarchy, presentation, and lifecycle ownership must remain distinct. Configuration access cannot silently enlarge bot authority.

The managed role does not prevent the bot from holding supplemental ordinary roles. Members with `Manage Roles` may change approved presentation fields only. The community owner or a member with `Administrator` must approve permission changes, role movement, or supplemental roles that alter bot authority.

**Acceptance:** Managers can see the permissions an application requested, the permissions the community approved, and the permissions its bot currently has. Only the documented owner or administrator paths can raise the ceiling. Ordinary role editing cannot delete, reassign, or detach the managed role. [Managed authority contract](Research/reference/application-and-installation-contracts.md)

The lifecycle controls have different effects:

| Control | What happens |
| --- | --- |
| Suspend | Temporarily blocks new delivery and authority while preserving the installation and the records needed for review and recovery. |
| Reset | Returns selected community-owned configuration to its defaults without uninstalling the app. |
| Uninstall | Revokes the active generation, removes the bot member and managed role, and retains dormant community configuration for review during a later reinstall. |
| Forget a dormant value | Removes a selected saved value that the app no longer uses and prevents an older backup from restoring it. |
| Permanently delete the application | Revokes the application globally and cleans up its installations, definitions, credentials, and community-owned application data. |

### Commands and discovery

#### CMD-01 Discord-compatible command path

For a feature or API that Fluxer classifies as compatible, a Discord community bot can run on Fluxer after changing its credentials and documented API, Gateway, or HTTP connection settings. Its supported command objects, interaction handlers, callback payloads, components, and ordinary bot REST calls remain unchanged.

**Acceptance:** Raw fixtures and a pinned `discord.js` bot register, receive, and respond to commands after configuration-only migration. Every exception appears in a compatibility manifest with migration guidance. [Command compatibility](Research/reference/compatibility.md)

#### CMD-02 Stable command registry and publication

An application can define, validate, draft, publish, target, retire, and recover commands with identity independent of mutable names. One application command key has one schema across communities. Community policy remains separate from the developer-owned definition.

**Acceptance:** Publication makes one complete validated version current. Edits based on an older version cannot overwrite newer versions. Targeting changes availability without creating a separate schema, and retirement does not retarget old references. [Command registry contract](Research/reference/command-contracts.md)

#### CMD-03 Provider-aware discovery and personal choices

The responsive web picker combines native and application commands while preserving exact provider identity. Favorites, hiding, order, and provider preference may synchronize across a person's devices but never grant authority.

**Acceptance:** Two apps may publish the same name without ambiguity. The selected row submits stable app and command IDs. Hidden commands remain recoverable, and stale personal preferences cannot bypass current community policy. [Discovery contract](Research/reference/command-contracts.md)

#### CMD-04 Typed input and current availability

Fluxer validates command shape, option relationships, localization, limits, temporal input, autocomplete, targeting, installation, suspension, channel access, native permission, and community policy. Discovery may explain safe local failures, but submission always rechecks current state.

Developer targeting, community policy, and personal picker choices answer different questions. Favorites, hiding, ordering, and provider recommendations may change what a member sees first, but they never make an unavailable command eligible or authorize its execution.

**Acceptance:** Malformed or stale submissions never reach the app. Older autocomplete results cannot replace a newer query. Explanations do not reveal private or untargeted commands. [Input and availability contract](Research/reference/command-contracts.md)

### Interaction delivery and responses

#### INT-01 One trusted interaction record

Every invocation creates one trusted record with stable identity, installation generation, application, command version, actor, audience, channel, deadline, capability version, and selected transport. Untrusted client or application payloads cannot rewrite that record.

**Acceptance:** Delivery attempts reuse the interaction identity. Stale installation generations, changed command shape, wrong audience, suspension, and lost permission fail before work begins. [Interaction contract](Research/reference/interaction-and-message-contracts.md)

#### INT-02 Explicit delivery transport

An app chooses Gateway or verified outgoing HTTP. Fluxer validates outbound destinations, signs requests, rotates keys in stages, bounds concurrency and payload size, and never follows redirects, changes transport silently, or replays expired work.

**Acceptance:** Only a qualifying deadline-safe failure receives at most one retry. Transport changes affect new interactions only. Repeated endpoint failure stops fresh delivery visibly until health is proven. [Delivery contract](Research/reference/interaction-and-message-contracts.md)

#### INT-03 Deadline-bound response authority

An app must respond or defer within three seconds and may use a scoped interaction token for the approved follow-up window. Response authority is secret, audience-bound, application-bound, interaction-bound, expiring, and idempotent.

**Acceptance:** A valid repeated initial callback produces one result. Expired, leaked, wrong-app, or wrong-audience authority cannot write. Partial response effects remain observable and repairable. [Response contract](Research/reference/interaction-and-message-contracts.md)

### Messages, components, and ephemeral message data

#### MSG-01 Compatible and richer message components

Apps may use the compatible component model and optionally negotiate richer containers and controls. Component identity is scoped to an exact application, message, message version, and path. Shared message output and per-person pending control state remain separate.

**Acceptance:** Unsupported clients render safe inert attributed fallback. A stale message version never retargets an action. Repeated accepted actions do not duplicate the effect, and concurrent public updates report version conflict. [Component contract](Research/reference/interaction-and-message-contracts.md)

#### MSG-02 Ephemeral messages

An ephemeral message is stored outside ordinary channel messages for the invoking account only. Discord-compatible response APIs expose it as an ephemeral response. It has explicit expiry, dismissal, edit, reporting, export, backup, erasure, and control-access behavior.

**Acceptance:** Another channel member receives an indistinguishable unknown-resource result. Dismissal revokes reads and actions before physical cleanup. Ordinary account export and backup restore do not revive the message. Reporting creates a separate evidence record with its own lifecycle. [Ephemeral message contract](Research/reference/interaction-and-message-contracts.md)

### Community controls and settings

#### ADM-01 One installed-app home

Community Settings > Integrations must present installation overview, commands, configuration, and activity. It shows lifecycle, bot, managed role, requested permissions, permissions approved by the community, permissions the bot currently has, delivery health, suspension, uninstall, deletion, and repair without conflating configuration access with authorization.

**Acceptance:** Each manager role sees only the controls it may use and the reasons for restricted authority. Current, dormant, suspended, failed, and uninstalling states are distinct. [Administration contract](Research/reference/administration-and-authority-contracts.md)

#### ADM-02 Declarative community settings

An app may publish stable typed setting definitions for Fluxer to render. The developer controls the definitions, the community controls its saved values, and Fluxer stores and validates the current version. Fluxer also handles references, conflicts, audit, offline edits, reset, retention, and deletion.

**Acceptance:** Two managers editing the same base version cannot silently overwrite each other. Invalid resource references remain visible for repair. An offline app receives the latest complete state after reconnecting, and uninstall makes retained values dormant. [Settings contract](Research/reference/administration-and-authority-contracts.md)

#### ADM-03 Builders and declared administrative actions

Fluxer may render a bounded grammar of developer-declared administrative builders and exact native actions in Community Settings. Fluxer validates input, current references, declared operation, manager access, application state, and required confirmation.

The first native actions are deliberately concrete. They let an authorized manager publish, update, delete, or repair an app-owned message and publish, update, or delete a self-role panel. The application provides the reviewed definition, while Fluxer owns the permission checks and resulting community change.

**Acceptance:** An app cannot inject arbitrary UI or request an undeclared operation. Offline or suspended apps disable action execution while safe setting edits remain available. External app effects are not presented as Fluxer-atomic or reversible. [Builder and action contract](Research/reference/administration-and-authority-contracts.md)

### Execution authority and audit

#### AUTH-01 Explicit authority mode

Every Fluxer-native operation declares whether it requires the current invoking user, the installed bot, or both. Ordinary compatible bot REST calls continue to use bot authority. Application callbacks remain external app work rather than disguised Fluxer-native actions.

**Acceptance:** Permission from one actor never substitutes for missing permission from another. Changes to an operation's authority mode or required permission set require review and community reapproval where authority increases. [Authority modes](Research/reference/administration-and-authority-contracts.md)

#### AUTH-02 Confirm, recheck, execute once, and record

Sensitive native operations show the real action and targets, confirm when policy requires it, recheck current permission and hierarchy immediately before the effect, execute through a reviewed registry, and record causation, authority, sanitized input, result, and partial failure.

**Acceptance:** Expired confirmation, changed targets, changed permission, repeated submission, or an undeclared action cannot produce the effect. Audit never stores secrets, command arguments that are not approved for retention, saved setting values, or ephemeral message bodies. [Execution and audit contract](Research/reference/administration-and-authority-contracts.md)

### Safety, data lifecycle, and operations

#### OPS-01 Suspension and guarded reinstatement

Fluxer can suspend one installation or the whole application. Suspension blocks new authority and delivery while preserving documented data lifecycles, inert output, evidence, cleanup, and repair. Reinstatement checks current invariants and creates fresh authority.

**Acceptance:** Old tokens, capabilities, confirmations, and panels remain permanently invalid after reinstatement. An unrepaired community stays closed even if the wider app passes review. [Suspension contract](Research/reference/operations-and-data-contracts.md)

#### OPS-02 Durable effects and reconciliation

Lifecycle and native operations record intended and completed effects durably. Reconcilers use those records to finish work, compensate safely, or show that repair is needed without guessing from mutable names. Backup recovery never restores access, expired tokens, ephemeral messages, or already erased data.

**Acceptance:** Partial install, uninstall, setting update, component action, and native operation failures converge or remain visibly blocked with an operator action. Recovery drills prove lasting state and authority invariants. [Reconciliation contract](Research/reference/operations-and-data-contracts.md)

#### OPS-03 Abuse and resource protection

Limits apply before expensive parsing, persistence, delivery, or work that expands across many recipients or resources. They cover application, installation, command, interaction, user, acting bot, response, component, setting, and concurrent work dimensions. Errors report the actual outcome and do not create hidden queues or unbounded retries.

**Acceptance:** Oversized or over-limit work is rejected at the earliest authoritative boundary. Rate-limit responses identify the relevant retry contract without leaking private policy. [Resource protection](Research/reference/operations-and-data-contracts.md)

#### OPS-04 Privacy, retention, deletion, and export

Every new record must have an owner, purpose, access boundary, retention rule, deletion behavior, backup behavior, export policy, and prohibited data. Uninstall, owner deletion, application deletion, account deletion, community deletion, report evidence, and legal or safety retention remain distinct lifecycles.

**Acceptance:** Deletion matrices and tests cover live stores, indexes, caches, derived records, queues, and restore behavior. Secrets, credentials, interaction tokens, private bodies, saved values, and disallowed arguments never enter logs or ordinary audit. [Data lifecycle contract](Research/reference/operations-and-data-contracts.md)

#### OPS-05 Observable staged rollout and rollback

Storage changes, code that can read both old and new data, fallbacks, suspension, cleanup, reconciliation, metrics, alerts, and runbooks must be ready before any feature begins writing new data. Each feature starts disabled and is enabled gradually only after the required compatibility, failure, performance, accessibility, privacy, and recovery checks pass.

**Acceptance:** Services running different deployment versions can read transitional data safely. Rollback disables new behavior and UI but preserves revocation, suspension, cleanup, audit, repair, and support for data written by both versions. [Rollout and recovery contract](Research/reference/operations-and-data-contracts.md)

### Examples of expected behavior

These examples show how the requirements should behave across normal use, failure, concurrency, privacy, and rollback. The [complete acceptance catalogue](Research/reference/acceptance-scenarios.md) contains all 44 release scenarios.

| Situation | Required outcome |
| --- | --- |
| [Compatible bot reaches its first response](Research/reference/acceptance-scenarios.md#sim-g01) | A developer can install a compatible bot, publish a command, receive an interaction, respond publicly, and uninstall after configuration-only migration. Uninstall immediately ends the old response and component authority. |
| [Uninstall fails and the same app is reinstalled](Research/reference/acceptance-scenarios.md#sim-i03) | A failed uninstall revokes the old authority and remains visible for repair. Reinstall waits for cleanup, then creates a fresh generation without reactivating old tokens, messages, controls, or capabilities. |
| [Multiple providers use the same command name](Research/reference/acceptance-scenarios.md#sim-c01) | The picker shows which app owns each command and submits the exact selected provider. Recommendations may change order, but only an explicit user preference may select a provider automatically. |
| [Outgoing HTTP retries, redirects, overloads, or recovers](Research/reference/acceptance-scenarios.md#sim-d02) | Fluxer verifies the endpoint, never follows redirects, and retries only a qualifying failure once within the deadline. Overload stops fresh delivery visibly until the endpoint proves healthy. |
| [A control is stale, copied, unsupported, uninstalled, or reinstalled](Research/reference/acceptance-scenarios.md#sim-p02) | Stale or copied controls cannot be redirected or produce a duplicate effect. Unsupported clients show an attributed fallback, and uninstall or reinstall never makes an old control active again. |
| [Application copy disguises a destructive request](Research/reference/acceptance-scenarios.md#sim-a02) | Fluxer shows the real action, actor, and targets from the registered operation rather than application-written copy. It confirms the action, rechecks current authority, and prevents the same approved use from running twice. |
| [Managers save concurrently while the app is offline](Research/reference/acceptance-scenarios.md#sim-s01) | One concurrent save succeeds and the other receives a conflict. Managers can save while the app is offline, and reconnect delivers only the latest complete configuration. |
| [An ephemeral message is delivered, reported, dismissed, or expires](Research/reference/acceptance-scenarios.md#sim-e01) | Only the invoking account can read or use the message. Dismissal and expiry end access before deletion, while reporting preserves only the evidence governed by safety policy. |
| [A limited rollout is reversed](Research/reference/acceptance-scenarios.md#sim-o01) | Rollback stops new writes and discovery while existing data remains readable. Revocation, suspension, cleanup, expiry, reconciliation, and repair continue to work. |

## Requirements that apply across the platform

### Rules shared by every feature

These rules apply across every feature and failure path:

1. Canonical domain state and its version are authoritative. A cache, queue acknowledgement, UI state, index, or audit event is never transaction proof.
2. Installation authority requires an active generation with no applicable suspension. Leaving active state, deletion, suspension, generation change, authority revision change, dismissal, or expiry revokes authority before cleanup.
3. Names, labels, aliases, application text, client permission snapshots, and resource presence never establish identity or authorization.
4. Retry reuses one durable interaction, operation, or effect identity. It never allocates a second role, command, message, capability, delivery, or audit result.
5. Reinstall, reinstatement, and recovery create new authority. Old interactions, responses, controls, confirmations, and delegated capabilities remain permanently invalid.
6. Rollback may stop code paths that create new data and remove new behavior from discovery, but revocation, suspension, expiry, cleanup, audit, repair, and support for existing data remain operational.
7. Capability fallback, picker order, recommendations, settings links, dashboard presentation, and manager visibility never grant authority or weaken server preflight.

[System model and invariants](Research/guide/02-system-model.md)

### Security, reliability, and operating requirements

| ID | Requirement | Release condition |
| --- | --- | --- |
| NFR-01 Security | Authentication, authorization, audience, hierarchy, installation generation, suspension, and capability checks block the action whenever required state is missing, invalid, or ambiguous. | Threat-model review and negative-path integration coverage pass for that delivery stage. |
| NFR-02 Compatibility | Supported Discord wire fixtures and the maintained `discord.js` consumer remain compatible except for manifest-listed differences. | Raw conformance fixtures, generated schemas, consumer tests, and migration documentation pass together. |
| NFR-03 Reliability | Durable state transitions are idempotent, retry-safe, reconcilable, and observable after crashes or partial external effects. | Failure-injection and recovery tests prove convergence or an explicit blocked state. |
| NFR-04 Performance | Parsing, validation, rate charging, persistence, delivery, and work across many recipients or resources remain bounded under documented payload and concurrency limits. | Capacity and latency targets are set, then load tests pass before percentage rollout. |
| NFR-05 Accessibility | Developer, manager, command-picker, confirmation, component, failure, and recovery interfaces support keyboard and screen-reader operation with safe unsupported-client fallback. | Automated checks, keyboard review, screen-reader review, and narrow-viewport visual review pass. |
| NFR-06 Privacy | Every record has an owner, purpose, access rule, retention rule, erasure path, export policy, backup behavior, and prohibited-data list. | Data-lifecycle review and deletion tests pass before a feature writes its first record. |
| NFR-07 Operability | Metrics, structured secret-safe diagnostics, alerts, dashboards, runbooks, suspension, repair, rollback, and restore procedures exist before traffic expands. | The runbook is approved and a recovery exercise is complete. |

Before rollout, each enabled service and deployment must have approved latency, availability, capacity, retention, recovery, and alert thresholds.

## Release priorities

These groups explain product priority. They are not approved release milestones, dates, or staffing commitments. The final milestone split remains open.

| Priority group | Stages | Outcome | Rule |
| --- | --- | --- | --- |
| Safety foundation | F, I, S | Conditional persistence, managed installations, audit, suspension, cleanup, and recovery | Must exist before application commands can create authority |
| Compatible command path | C, E, P | Registration, delivery, public response, and exact-provider discovery for supported bots | This is the first candidate public product path |
| Interaction and publication extensions | R, M | Ephemeral messages, components, lasting control state, drafts, and manifest recovery | Release only after the compatible response and discovery path is sound |
| Community administration extensions | D, A | Hosted settings, builders, app-owned messages, self-role panels, and reviewed native actions | Release only after message and component ownership is established |
| Delegated authority | U | Native actions using current user authority, bot authority, or both | Keep separate as the final high-risk path |

All eleven stages are required before the complete platform described by this PRD is done. They do not need to appear in one public release. A milestone proposal must preserve the dependencies and required evidence below.

## Delivery sequence

Delivery starts with safe persistence and lifecycle ownership. It then adds the compatible command path before the optional Fluxer-native features. Work spans persistence, APIs and schemas, Gateway delivery, responsive web, background workers, operations, documentation, and compatibility fixtures.

| Order | Stage | Delivers | Direct prerequisite |
| --- | --- | --- | --- |
| 1 | F | Conditional persistence, support for reading old and new data, rollout controls, and recovery prerequisites | None |
| 2 | I | Durable installations and managed roles | F |
| 3 | S | Audit, suspension, cleanup, and reconciliation | I |
| 4 | C | Command registry and publication | S |
| 5 | E | Interaction delivery and public responses | C |
| 6 | P | Provider-aware command picker and community policy | E |
| 7 | R | Ephemeral messages, components, and lasting control state | P |
| 8 | M | Command manifest recovery | C |
| 9 | D | Declarative settings and builders | R |
| 10 | A | Declarative native administrative actions | D |
| 11 | U | Delegated user and bot authority | R |

Dependencies:

- Each stage depends on the prerequisite shown above, even when review order places another stage between them.
- `M` depends on `C` even though it follows `R` in the delivery sequence.
- `U` depends on `R`, not on `D` or `A`, so it may proceed independently when capacity allows.
- No more than three dependent pull requests may remain open at once.
- Storage changes and code that can read both old and new data must be deployed before any code starts writing the new data. Each pull request must remain deployable with new behavior unavailable until its stage is complete.

[Detailed implementation dependencies, branch units, and rollout requirements](Research/guide/10-implementation-roadmap.md)

## Open decisions and risks

Every item below is open.

| Risk or decision | Required response | Blocks |
| --- | --- | --- |
| Product demand and scope | Record the evidence used to choose the first public milestone and the optional stages it includes | A public milestone commitment |
| Release milestones | Split the eleven stages without weakening dependencies, rollback, or evidence requirements | Public milestone commitments and general rollout |
| Provider collisions | Test the real composer and record the selected accessible presentation | The production collision interface in P2 |
| Execution authority | Confirm that schemas and interfaces preserve user, bot, combined, and application-callback boundaries | Stage U and the native-action parts of stage A |
| Data policy | Approve retention, deletion, backup, report-evidence, export, erasure, and hold rules for each deployment | Features that write private or durable data |
| Production limits and recovery promises | Set measured capacity, latency, availability, alert, recovery, replication, restore, and observation targets | Rollout beyond internal allowlists |
| Long-term protocol support | Define maintenance for schemas, fixtures, migration guidance, version overlap, developer support, and security response | Public compatibility claims and general developer availability |
| Compatibility coverage | Classify and test every supported API, unsupported feature, and deliberate difference against current external documentation | Any compatibility claim |

The [open-decisions record](Research/guide/11-open-decisions.md) gives the evidence and release requirements for each item.

## Definition of done

A delivery stage is complete only after its production behavior, failure handling, compatibility, operations, and user experience pass the checks for that part of the system.

Before the whole platform can be released, tests and reviews must cover:

- Each of the four tasks under [What this will let people do](#what-this-will-let-people-do) working through production APIs and real service boundaries
- A pinned compatible bot that changes configuration rather than command and handler code
- Lifecycle failure that never grants hidden authority and remains repairable
- Collision-safe discovery and current-state authorization at discovery and submission
- Deadline, retry, idempotency, wrong-audience, expiry, and transport-failure behavior
- Component concurrency, stale-version rejection, ephemeral privacy, reporting, expiry, and erasure
- Settings conflict, offline synchronization, invalid-reference repair, reset, uninstall, and deletion
- User, bot, and combined authority with confirmation, final recheck, audit, and partial failure
- Suspension, reinstatement, cleanup, reconciliation, metrics, alerts, rollback, and restore drills
- Responsive keyboard, screen-reader, narrow-viewport, fallback, and visual review
- Compatibility fixtures and migration guidance for every intentional difference
- All repository-documented validation commands across every affected package and service

Static inspection and mocked unit tests alone do not satisfy integration or end-to-end acceptance.

## Detailed research and technical references

Start with this PRD. Use the research pages for the reasoning, detailed contracts, and complete acceptance scenarios.

### Where to read more

- New to the plan: [Orientation](Research/guide/01-orientation.md)
- Current implementation: [Verified current state](Research/reference/current-state.md)
- Architecture and ownership: [System model](Research/guide/02-system-model.md)
- Delivery detail: [Implementation roadmap](Research/guide/10-implementation-roadmap.md)
- Safety and authority: [Authority, safety, and data](Research/guide/08-authority-safety-and-data.md)
- Detailed contracts: [Reference material](Research/README.md#reference-material)
- Release behavior: [Complete acceptance catalogue](Research/reference/acceptance-scenarios.md)
- Pending approvals: [Open decisions](Research/guide/11-open-decisions.md)
