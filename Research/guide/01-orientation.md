# Orientation

## The plan

Fluxer is a chat platform organized into communities with members, channels, roles, and permissions. It already lets developers create OAuth applications and invite their bot accounts into those communities. This plan builds the command platform around that existing path. Compatible bots will be able to publish community slash commands, receive interactions, and respond through familiar APIs. Fluxer will add management, safety, privacy, and richer interaction features on top.

Today this is an OAuth invite and a bot membership, not a first-class application installation. In this plan, an installation is the durable relationship that owns lifecycle state, authority, configuration, cleanup, and recovery for one application in one community.

The current behavior described here was verified at commit `fd62b46faf3505d738f6d5800e787473b14cacd6` on 2026-07-22. Everything else in the guide is planned unless it is explicitly identified as current behavior.

## Starting vocabulary

| Term | Meaning in this plan |
| --- | --- |
| Community | A shared Fluxer space containing members, channels, roles, and permissions. Discord API compatibility uses `guild` for the same scope. |
| Application | A developer-owned integration record. OAuth is the authorization protocol used for its invitation and consent flow. |
| Bot | The automated account that belongs to an application and acts with its own current community roles and permissions. |
| Slash command | A named action that a member finds by typing `/` in the message composer. |
| Command picker | The responsive web menu that lists matching built-in and application commands. |
| Interaction | One accepted use of a command or message control that Fluxer records and delivers to the responsible application. |
| Ephemeral message | An interaction message visible only to the account that invoked it. Discord-compatible response APIs call it an ephemeral response. Technical descriptions use recipient-scoped for its audience and storage. |
| Gateway | Fluxer's persistent real-time connection for bot events. An application may instead receive signed interaction requests through verified outgoing HTTP. |
| Installation | The planned relationship between one application and one community. It owns lifecycle, authority, configuration, cleanup, and recovery. |

The [glossary](../reference/glossary.md) defines the remaining domain terms and links each one to its exact contract.

## What is missing

Fluxer already has OAuth applications, bot accounts and credentials, community membership, roles, messages, a Gateway, and permission checks. A bot can be added to a community and use ordinary bot-authenticated API routes.

Fluxer does not currently have the platform needed for third-party application commands. There is no durable installed-application record, third-party command registry, application interaction event, callback contract, response token, application-owned command policy, installed-app settings area, or app-specific suspension and recovery system. The responsive web composer instead uses a fixed client-owned command list and dispatches native commands by hard-coded names.

The existing authorization checks stay in place as these features are added.

The [verified current state](../reference/current-state.md) shows where this starting point lives in the product source.

## The product in three layers

| Layer | What it means |
| --- | --- |
| Discord-compatible base | A supported community slash-command bot keeps familiar command registration, interaction, callback, component, and bot REST shapes unless a difference is explicitly documented. |
| Automatic Fluxer safeguards | Every new installation receives durable lifecycle state, current permission checks, a managed role, attribution, suspension, cleanup, reconciliation, and staged rollout protection. |
| Optional Fluxer extensions | An application may opt into richer command input, rich message controls, ephemeral messages, hosted settings, native administrative actions, and explicit user or bot authority modes. |

Compatibility is the migration baseline. It is not a reason to copy every Discord product choice or to prevent Fluxer from offering safer or richer behavior. Optional fields are added without changing the compatible base and are used only when the client and application declare support. Unsupported features never become weaker actions through silent fallback.

## Who the product is for

### Application developers

Developers should be able to bring an existing compatible bot to Fluxer, register commands, choose one delivery transport, inspect health, and test changes. Fluxer-specific features remain explicit opt-ins. The raw HTTP protocol and supported Discord libraries remain first-class even if a separate official TypeScript SDK is considered after the protocol is stable.

### Community managers

Community owners, members with `Administrator`, and members with `Manage Guild` should have one installed-app area in Integrations. From there they can review installation state, requested permissions, permissions approved by the community, permissions the bot currently has, commands, settings, activity, suspension, uninstall, and repair. Some security-sensitive changes require the owner or `Administrator` even when `Manage Guild` can manage ordinary application settings.

### Community members

When several applications offer a command with the same name, members can choose which application to use and see which application sent the response. Members can also understand whether a command is available and submit typed input. Their favorites, hiding, and ordering choices affect discovery only. They never grant authority.

### Fluxer operators

Operators need targeted suspension, secret-safe diagnostics, reconciliation, checks before each rollout increase, rollback, deletion protection, and restore procedures. A failed cleanup must remain visible and recoverable instead of being represented as complete.

## Scope

The plan covers:

- Applications installed into communities
- Community chat-input slash commands
- Compatible command registration, interactions, callbacks, components, and ordinary bot REST behavior within the documented compatibility scope
- Gateway delivery and verified outgoing HTTP delivery
- Public responses and ephemeral messages
- Compatible components plus optional richer layouts and controls
- Application handles, command targeting, aliases, community policy, and personal discovery preferences
- Community-managed application settings and declared administrative actions
- Explicit native execution as the current user, the bot, or both
- Installation, suspension, audit, privacy, cleanup, reconciliation, disaster recovery, staged rollout, and rollback
- Responsive web experiences for developers, managers, and members

Out of scope:

- Direct-message or group-DM application commands
- Global applications or user-installed applications
- User-context, message-context, or Activity commands
- Work in the separate Flutter or native client
- An official SDK inside the eleven delivery stages
- Application-owned tickets, analytics, subscriptions, billing, external authentication, secrets, or custom dashboards
- Any promise that Fluxer can reverse effects performed by an application outside Fluxer

## Rules that apply throughout

These rules apply to normal flows, retries, failures, suspension, deletion, and recovery.

1. Canonical domain state and its version are authoritative. Caches, queues, user interface state, indexes, notifications, and audit delivery do not prove a transaction committed.
2. Community-scoped application authority requires an `ACTIVE` installation generation with no applicable suspension.
3. Names, labels, aliases, application copy, client permission snapshots, and the presence of a resource never establish identity or authorization.
4. Retry reuses one durable interaction, operation, effect, role, command, message, or capability identity. It does not allocate a replacement and call that recovery.
5. Leaving `ACTIVE`, suspension, deletion, generation change, authority revision change, dismissal, and expiry revoke the authority they govern before cleanup finishes.
6. Reinstall, reinstatement, and restore may create new authority. They never revive old interactions, tokens, confirmations, controls, or delegated capabilities.
7. Rollback can stop code paths that create new data and remove new behavior from discovery. It must leave revocation, suspension, expiry, cleanup, repair, support for existing data, and reconciliation working.
8. Picker order, recommendations, favorites, dashboard visibility, settings links, and capability fallback do not grant permission or weaken server preflight.
9. Partial effects are recorded and reconciled. The design does not claim cross-service atomicity that Fluxer cannot provide.
10. Secrets, response tokens, command values, ephemeral message bodies, and arbitrary application payloads stay out of ordinary logs, metrics, and guild audit records.

## Where to read next

Read the chapters relevant to your work, or follow this order for the full technical design:

1. **Orientation** covers the plan and its scope.
2. **System model** covers objects, owners, authority layers, and lifecycle boundaries.
3. **First working bot** follows one compatible bot from creation to its first public response.
4. **Applications and installations** covers identity, managed roles, permission sources, failure recovery, suspension, and deletion.
5. **Commands and discovery** covers registration, stable identity, publication, targeting, policy, collisions, and typed input.
6. **Interactions and responses** covers trusted interaction creation, delivery transports, deadlines, response authority, and idempotency.
7. **Community management** covers Integrations, settings, builders, and declared actions.
8. **Authority, safety, and data** covers user and bot authority, confirmation, audit, privacy, retention, and erasure.
9. **Failure recovery and operations** covers reconciliation, observability, suspension recovery, rollback, and restore.
10. **Implementation roadmap** contains the dependency graph, boundaries between delivery stages, rollout order, and required validation.
11. **Open decisions** lists choices that still need product, accessibility, deployment, operations, or ownership input.

The reference files contain schemas, error codes, limits, and release checks. The raw archive is not part of the public plan.

## Implementation order

The implementation still has to follow its prerequisites even though the guide starts with the experience people will eventually see.

The dependency graph is:

```text
F  conditional writes and rollout foundation
└─ I  installation lifecycle and managed roles
   └─ S  audit, suspension, and recovery controls
      └─ C  application handles and command registry
         ├─ E  interaction contracts, delivery, and public responses
         │  └─ P  native discovery adapter and application picker
         │     └─ R  ephemeral messages, rich components, and component state
         │        ├─ D  declarative settings and builders
         │        │  └─ A  declarative administrative actions
         │        └─ U  delegated user authority
         └─ M  command manifest drafts and recovery
```

Stage `M` depends only on the command registry in stage `C`, but it is scheduled after the base interaction and component work. Stage `A` depends on the declarative foundations in `D`.

Stage `U` depends on the safety, interaction, private confirmation, rate-limit, and component foundations completed in `R`. It can proceed independently of `D` and `A` when capacity allows. The detailed roadmap preserves those distinctions.

No more than three dependent pull requests may remain open at once. Each pull request must be deployable with its new behavior inactive or unavailable until the stage is complete. Storage changes and code that can read both old and new data must be deployed before any code writes the new data. Delegated user authority stays in its own final high-risk stage.

## What must still be decided before launch

Several launch decisions are still open:

- Release milestones must be selected without weakening dependencies between stages.
- The command-provider collision presentation must be chosen from a real composer prototype after keyboard, screen-reader, narrow-width, touch, and localization review.
- User, bot, combined, and ordinary application-callback authority boundaries need explicit project review before native operation work begins.
- Retention, deletion, backup, report-evidence, and export policy must be approved before writing the affected private or durable data.
- Each deployment must provide measured recovery, replication, restore-drill, capacity, rollout, latency, availability, and alert targets.
- Owners must be assigned for the public protocol, compatibility manifest, generated schemas, version overlap, migration support, and security response.
- Every unsupported Discord feature or API and every intentional difference needs tested migration guidance before Fluxer claims compatibility.

## What completion means

This work is not complete when types and routes exist. The platform must prove that the common tasks above and their failure cases work through real service boundaries.

Completion includes:

- A maintained compatible bot that changes configuration rather than command and handler code
- Installation failure that never grants hidden authority and remains repairable
- Collision-safe discovery with exact provider binding and submission-time authorization
- Deadline, retry, duplicate, wrong-audience, expiry, and transport-failure behavior
- Component concurrency and stale-version rejection
- Ephemeral message privacy, reporting, expiry, deletion, and restore non-resurrection
- Settings conflicts, offline convergence, invalid-reference repair, reset, uninstall, and deletion
- Explicit user, bot, and combined authority with confirmation, current-state recheck, audit, and clear partial-failure reporting
- Suspension, reinstatement, cleanup, reconciliation, rollback, and restore exercises
- Responsive keyboard, screen-reader, unsupported-client, narrow-width, and visual review
- Shared compatibility fixtures, generated contract checks, and a pinned `discord.js` migration smoke test

Static inspection and mocked unit tests are useful, but they are not equivalent to this integration and end-to-end evidence.

## Continue reading

- [Research index](../README.md)
- Next: [System model](02-system-model.md)
