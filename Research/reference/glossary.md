# Glossary

These terms are used throughout the plan. **Planned** means required by the plan rather than behavior present in the verified repository baseline.

## Platform basics

**Fluxer**

A chat platform organized into communities. Each community contains members, channels, roles, and permissions.

**Community and guild**

A shared Fluxer space with its own members, channels, roles, and permissions. Fluxer product copy uses **community**. Discord-compatible API fields may use **guild**, such as `guild_id`, for the same scope.

**OAuth**

The authorization protocol behind Fluxer's application invitation and consent flow. An OAuth application is the developer-owned integration record, not the bot account or an installation.

**Bot account**

The automated account that represents an application inside a community. It authenticates with its own credential and acts with its current membership, roles, permissions, and hierarchy.

**Slash command**

A named action that a member finds by typing `/` in the message composer. This plan initially covers application-owned chat-input commands in communities.

**Message composer and command picker**

The composer is the responsive web control where a member writes a message or starts a slash command. The command picker is the menu that searches and presents matching built-in and application commands.

**Gateway**

Fluxer's persistent real-time connection for client and bot events. The planned base interaction path can deliver an interaction over this connection or through verified outgoing HTTP, but never both for the same interaction.

**REST API**

Fluxer's request-and-response HTTP interface. An ordinary bot REST call authenticates as the bot and never inherits the invoking member's authority.

**Snowflake**

A numeric identifier allocated once for a durable Fluxer resource. In this plan, application, command, and interaction Snowflakes are stable identities rather than display labels.

## Reference files

- [Verified current state](current-state.md) describes what exists in the pinned Fluxer repository baseline.
- [Application and installation contracts](application-and-installation-contracts.md) cover identity, lifecycle, permissions, suspension, and deletion.
- [Command contracts](command-contracts.md) cover registration, publication, discovery, policy, and typed input.
- [Interaction and message contracts](interaction-and-message-contracts.md) cover delivery, responses, components, and ephemeral message data.
- [Administration and authority contracts](administration-and-authority-contracts.md) cover community management, settings, native actions, and delegated authority.
- [Operations and data contracts](operations-and-data-contracts.md) cover persistence, recovery, rollout, privacy, retention, and deletion.
- [Compatibility](compatibility.md) defines the supported Discord baseline and deliberate differences.
- [Acceptance scenarios](acceptance-scenarios.md) contain the complete release behavior catalogue.

## People and principals

**Application owner**

The current human owner of an application. The owner manages application-level definitions, credentials, command publication, interaction transport, and safe repair controls. Application ownership alone grants no authority over a community.

**Community manager**

A community owner or member with `Administrator` or `Manage Guild`. This group manages installations, community command policy, declarative settings, and cleanup recovery where the specific contract allows it. Some authority-changing actions require the community owner or `Administrator` and deliberately exclude `Manage Guild`.

**Invoker**

The authenticated human who starts an interaction. Fluxer derives this identity from server-side interaction state. An application cannot supply or replace it.

**Bot principal**

The application's single bot account. Ordinary bot-token REST calls act as this bot and use its current membership, roles, permissions, hierarchy, installation state, and suspension state.

**Delegated principal**

The invoker used by the structured native-action broker for one exact reviewed operation. Delegation never turns an ordinary bot REST request into a user request.

**Instance administrator**

An operator acting through explicit administrative ACLs. Application lookup, suspension management, guild audit access, installation recovery, and legal-hold access remain separate permissions.

## Application and installation identity

**Application**

One developer-owned identity with exactly one bot account. The immutable application Snowflake remains the authorization identity.

**Application handle**

A planned globally unique, human-readable application address of 2 to 32 lowercase ASCII letters, digits, and internal hyphens. It is used in qualified commands. It is not the application ID, bot username, OAuth client ID, installation ID, or authorization identity.

**Installation**

A planned persistent relationship keyed by `(community_id, application_id)`. It is not a user or actor. It owns lifecycle metadata, an internal generation, the managed-role association, the relationship authority ceiling, and retained community configuration.

**Installation generation**

A planned server-owned value rotated for a new install lifecycle. Response tokens, controls, and delegated capabilities bind to it so reinstall cannot revive old authority. It is not exposed as a public installation ID.

**Legacy bot**

A bot membership created before managed installations and lacking an installation row. Fluxer never infers its managed role or generation from a name, role assignment, or membership. It enters the managed model only after ordinary removal and a fresh installation.

**Managed role**

The one planned role owned by an installation, including a zero-permission installation. Fluxer controls its membership and deletion. `Manage Roles` may change presentation. Only the community owner or `Administrator` may change permissions, position, or supplemental role authority after installation.

**Relationship ceiling**

The maximum bot permission set approved for a community and application relationship. Reinstall does not erase it. `Manage Guild` may reinstall or reauthorize at or below it. Raising it requires the community owner or `Administrator`.

**Permission source**

The application-wide planned source for first-install bot permissions. `INVITE` uses the OAuth request and the installer's held-permission rule. `CODE_DEFINED` uses an authenticated, revisioned application declaration that `Manage Guild` may approve exactly on first install.

## Command identity and discovery

**Command ID**

The planned stable Fluxer Snowflake for a command resource.

**Developer key**

An immutable application-scoped command key of 1 to 64 lowercase ASCII letters, digits, `_`, and `-`, beginning with a letter or digit. It provides semantic identity independently of display name.

**Command revision**

An immutable revision created for every published command change.

**Schema version**

A counter advanced only when accepted input shape or validation changes. Presentation-only changes do not advance it.

**Authority revision**

A counter advanced when execution mode, native permissions, allowed operations, or another reviewed authority field changes.

**Manifest**

An immutable complete publication that selects command and category revisions. Services and clients read only the complete manifest selected by the current head.

**Draft**

One optional versioned candidate per application. It is not a second registry and it is never merged automatically with a changed published head.

**Dormant command**

A command identity that is absent or developer-disabled while its stable key and community configuration remain retained. Dormancy grants no availability.

**Retirement**

Permanent release of a command identity only after no retained manifest, community setting, user preference, interaction, or other reference depends on it. Reusing the developer key after retirement creates a new command ID and inherits nothing.

**Qualified invocation**

The exact form `/<application_handle>:<developer_key>`. It resolves stable provider and command identity, but bypasses no installation, targeting, policy, capability, suspension, or authorization check.

**Provider**

Either a Fluxer-native command or an application command. Discovery binds provider identity before submission and never routes by mutable name alone.

**Community recommendation**

A manager-owned ranking choice for one duplicate shared command name. It ranks below explicit user provider preference and favorites and above passive usage. It never auto-selects a provider.

## Interactions and responses

**Interaction**

A server-created Snowflake record for a command, autocomplete request, component activation, modal submit, or endpoint verification. The application, community, channel, invoker, revisions, installation generation, deadlines, and permissions are server-derived.

**Interaction response token**

An opaque 32-byte base64url credential stored only as a hash. It is bound to one interaction and installation generation, cannot be reused as general application authority, and ends after the 15-minute response window or earlier revocation.

**Idempotency key**

A stable request identity supplied when a caller may retry the same operation. Fluxer can return or resume the first result for that key instead of performing the operation again. Without a key, the API does not claim that separate retry requests will be deduplicated.

**Acknowledgement deadline**

The three-second deadline for the one initial interaction response or defer.

**Response-authority deadline**

The 15-minute deadline for completing a defer and performing token-scoped response operations. Expiry ends application mutation authority. It does not itself delete an already delivered response.

**Public response**

An ordinary channel message owned by the application interaction and subject to message visibility, representation, version, and channel lifecycle.

**Ephemeral message**

An interaction message visible only to the invoking account and stored outside ordinary channel messages. Discord-compatible response APIs call it an **ephemeral response**. Storage and authorization descriptions may call it **recipient-scoped** because the server derives exactly one recipient. It lasts no longer than 24 hours, while security confirmations last no longer than five minutes.

**Component outcome owner**

The immutable owner of one component outcome, either `APPLICATION_RESULT` or `NATIVE_EFFECT`. A competing application response or native action cannot claim the same outcome with another meaning.

**Message component and modal**

A component is an interactive control attached to an application response, such as a button or select menu. A modal is a form opened from an interaction and submitted as another interaction.

**Message version**

The planned concurrency-safe monotonic version of a public bot-managed message. Updates require the expected version and advance by one only through a real compare-and-set operation.

**Representation**

Either legacy message content with action rows or structured Components V2. A message cannot change representation after creation.

**Capability**

A negotiated extension identifier such as `fluxer.commands.multivalue.v1`. Capabilities are permanent identifiers with explicit consumer, dependency, transport, deprecation, and retirement rules. They are not permissions.

## Authority, effects, and audit

**Execution mode**

One of `AS_USER`, `AS_BOT`, or `REQUIRE_BOTH`. Current authority for every required principal is checked immediately before effect.

**Native operation**

A reviewed, typed platform operation implemented by an adapter to existing Fluxer services. It is never an arbitrary REST method, path, actor, permission bitfield, or audit payload supplied by an application.

**Delegated capability**

An opaque, exact, single-use server record authorizing at most one registered native operation. It binds application, installation generation, invoker, command or component authority revision, normalized parameters, confirmation, expiry, and idempotent effect identity.

**Confirmation Class 0**

No second prompt after trusted pre-submit disclosure for an exact, low-impact action whose security-relevant inputs are user-submitted or definition-fixed.

**Confirmation Class 1**

An invoker-only platform confirmation required when the application selected or changed a security-relevant target or parameter.

**Confirmation Class 2**

An invoker-only high-impact confirmation required for bulk, destructive, permission, role membership, hierarchy, overwrite, durable deletion, or persistent access-link effects.

**Deterministic effect identity**

A stable identity allocated before an external or database effect. Retry verifies or resumes the same effect rather than allocating a new role, message, audit record, action, or target.

**Domain aggregate**

A durable record and its related lifecycle state that one service changes as a unit. It decides the current state even when a queue, index, or user interface has not caught up.

**Causation chain**

Append-only linked audit records for one interaction or operation, its independently committed effects, partial results, compensation, and final summary.

**Compare-and-set**

A conditional write that succeeds only when the persisted expected state and version still match. Existing baseline row version increments are metadata and are not this guarantee.

## Lifecycle and operations

**Dormant**

An installed relationship state with no current application authority. Retained community configuration may still exist for deliberate reinstall or reset.

**Suspension**

A durable, reversible, fail-closed instance safety overlay. It is distinct from credential rotation, uninstall, dormancy, and permanent deletion.

**Reinstating**

A suspension state that still blocks authority while reconciliation proves identity, lifecycle, managed-role, transport, manifest, configuration, and deletion invariants.

**Reconciliation and reconciler**

Reconciliation compares durable state with the resources and effects that should exist, then completes safe missing work or leaves the operation visibly blocked. A reconciler is the service process that performs this repair. A queue or generic job status may deliver or report the work, but it does not decide its current state.

**Fail closed**

Block an action when required state, authority, or proof is missing, invalid, or ambiguous instead of assuming the action is safe.

**Terminal**

A final lifecycle state that cannot become usable again. A later valid action must create new authority or a new version instead of reviving the old one.

**Fanout**

The number of recipients, resources, or follow-up operations created by one request.

**Recovery hold**

An internal disaster-recovery state used when backup manifests, journal coverage, keys, or cutoffs cannot be verified. Reads for diagnosis may remain possible, but application authority, delivery, installation, configuration exposure, and services that change data stay blocked.

**Non-resurrection journal**

An independently recoverable, content-free record of suspension, deletion, value forgetting, and superseded-value expiry. Restore replays it before authority or data exposure.

**Current state**

Behavior verified in the repository at the pinned baseline commit and date. It is evidence, not a product decision.

**Planned behavior**

An accepted design contract that still requires implementation and validation.

**Deployment-owned input**

A value that cannot be chosen from repository evidence alone, such as RPO, RTO, backup age, rollout observation duration, SLO target, alert threshold, or geographic replication promise. Each deployment must choose it from measured evidence and named ownership.
