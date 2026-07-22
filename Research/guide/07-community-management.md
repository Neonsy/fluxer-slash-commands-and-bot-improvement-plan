# Community management

Community managers need one place to understand an installed application, decide what it may do, configure it, and recover from failures. The planned home is Community Settings, then Integrations.

The installed-application screens are planned. Current Integrations manages webhooks and does not show or manage invited bot applications.

## One home for each installed application

An installed application page presents four connected views:

1. Overview
2. Commands
3. Configuration
4. Activity and health

The page shows the application identity, bot, managed role, installation state, requested permissions, permissions approved by the community, permissions the bot currently has, command availability, delivery health, suspension, retained configuration, incomplete effects, uninstall, deletion, and repair.

It does not treat access to configuration as permission to enlarge bot authority. Controls are shown only to the roles allowed to use them, with a clear explanation when a stronger owner or administrator decision is required.

The lifecycle states stay distinct. Active, installing, failed, uninstalling, cleanup failed, dormant, suspended, and reinstating relationships must not be collapsed into a generic offline label.

## Who may manage what

Community owner and `Administrator` have full access to community application management. `Manage Guild` may manage ordinary installation configuration, command policy, settings, and approved builders within the documented boundaries.

Bot authority is a separate concern:

- In invite mode, an installer can initially approve only permission bits they personally hold
- In code-defined mode, `Manage Guild` can approve only the exact authenticated application declaration on first install
- After installation, only the owner or `Administrator` may enlarge the retained permission ceiling, move the managed role, assign supplemental roles, or approve another bot-authority increase
- `Manage Roles` may change approved presentation fields, but it does not own the application's authority ceiling or managed-role lifecycle

Role and channel settings may link an already authorized manager to the one Integrations policy editor. Those contextual pages do not store another policy, grant application access, or expose counts to a person who lacks owner, `Administrator`, or `Manage Guild` authority.

## Command administration

The Commands view manages community-owned policy around developer-owned command definitions.

Managers can control:

- Application and command availability
- Stable command categories and category-wide policy
- Community aliases
- Role, user, channel, and native-permission restrictions
- Required authority review after a command's execution mode or native-operation envelope changes
- One provider recommendation for an exact duplicate command name
- Bulk reset and repair of stale references

A community policy never changes the command's application-owned schema. Disabling a category affects current and future member commands in that category through one versioned policy source.

A documented owner or `Administrator` bypass may apply to local command invocation policy. `Manage Guild` does not receive that bypass. No local bypass can ignore installation state, suspension, channel access, current permission, component audience, or native-effect authorization.

A provider recommendation only changes ordering. It cannot enable, select, execute, or authorize a command. Explicit user preference and favorites remain stronger. If the provider is unavailable, renamed, uninstalled, suspended, or no longer exposes the exact shared name, Fluxer ignores the recommendation rather than choosing a substitute.

## Typed settings owned by the community

An application may publish a bounded settings schema. The application owns setting definitions. The community owns saved values. Fluxer owns validation, concurrency, delivery, audit, retention, and deletion behavior.

The first settings phase supports:

- Boolean values
- Bounded strings
- Integers and finite numbers
- One enum choice or a bounded enum set
- One channel, role, or current member
- Bounded channel, role, or member sets

It does not accept arbitrary JSON, HTML, scripts, regular expressions, executable expressions, message references, opaque secret fields, tokens, passwords, credentials, private keys, or recovery codes. String fields warn managers not to enter credentials or sensitive personal data. Saved values never enter logs, metrics, traces, search, notifications, errors, or guild audit rows.

Each setting has a stable developer key and an immutable fundamental type. Labels, descriptions, defaults, bounds, and presentation may evolve. Tightened constraints or removed resources never coerce a saved value into a new meaning. The value becomes visible as needing attention until a manager repairs it.

## Saving without losing concurrent work

Configuration is stored as complete immutable snapshots. A manager save contains the expected current version.

Fluxer validates the complete resulting snapshot and every resource reference, writes the candidate, then advances the visible head only if the expected version still matches. Two managers cannot silently overwrite each other. The losing save receives a conflict with the current version and changed setting keys, never another manager's values.

The visible source for a setting is one of:

- `INHERIT`, which resolves the current application default
- `NULL`, when the definition explicitly permits it
- `VALUE`, which stores a community-owned typed value

A required inherited field with no default remains visibly unconfigured. Dependent actions stay unavailable until the missing value is supplied.

Resource deletion does not rewrite immutable history or choose a replacement. Fluxer keeps the broken stable reference visible, records a current validity overlay, and creates attention for repair.

## Saving while an application is offline

A settings save succeeds even when the application is offline. Fluxer stores the current saved version and sends it to the application when delivery is possible.

Every committed version has a stable delivery identity. Gateway and verified HTTP transports receive the same full bounded snapshot. Durable delivery is separate from the three-second interaction path.

If several versions are saved while the application is unavailable, reconnect sends the latest complete state. It does not replay obsolete intermediate values that could move the application backward. The application can always fetch current state directly.

The page distinguishes:

- Saved in Fluxer
- Delivery pending
- Delivered
- Applied
- Application rejected
- Retry requested
- Needs attention

An application acknowledgement is monotonic, installation-generation bound, and idempotent. It cannot change the saved value or move the acknowledged version backward.

## Reset, removal, dormancy, and forgetting

Reset writes a new snapshot using `INHERIT`. It does not erase history or uninstall the application.

When the developer removes a definition, its key becomes dormant. The community value remains visible to authorized managers, but application read and delivery stop. The same key may later reactivate only with the same fundamental type and after revalidation.

All active, deprecated, and dormant setting keys count toward the 100-key application limit. Removing definitions cannot create an unbounded cycle of reusable identities. Developers cannot permanently retire a key, reuse it for another meaning, or delete community-owned values in the first release.

An authorized manager may explicitly forget the stored value of a dormant key. The current configuration first stops exposing that value. Cleanup then removes value-bearing history, reference state, and any digest derived from it. A value-free non-resurrection marker prevents an older backup from bringing it back.

Superseded value payloads expire after 45 days. Current values remain until replaced or deleted. Uninstall preserves current configuration in dormant state and immediately revokes application access. Reinstall uses a new installation generation, shows retained values for review, and sends them only after the relationship is active and approved.

Permanent application deletion removes global definitions and every community's values. Permanent community deletion removes only that community's values and leaves the application's global definitions for other communities.

## Builders are bounded resources, not embedded dashboards

Later phases add repeatable groups and message templates without allowing arbitrary application code inside Community Settings.

Repeatable groups use the same typed fields. Managers own stable row identities, order, and values under the configuration version check.

Message templates are separately versioned resources. They reuse the real message validators and support normal text, embeds, mentions policy, and either legacy or structured components. They cannot contain arbitrary HTML, scripts, REST requests, executable payloads, unreviewed remote fetches, or a private attachment-byte store.

Preview uses the same canonical validators as execution. It is inert. It sends no message, triggers no mention, opens no link preview, fetches no media, and activates no component. The preview produces a hash over the exact plan and source versions.

## Application actions and Fluxer actions

An administrative action is either handled by the application or owned by Fluxer. The UI must label that difference consistently.

### Application-handled actions

Fluxer validates bounded manager input and delivers it to the application. The application owns any external or private effect.

These actions are disabled while the transport is offline or unhealthy. They are never queued for later execution because that would turn old manager intent into a surprise effect. A fresh manager submission is required after recovery.

The result is visibly application-provided. Fluxer can report delivery and the application's declared `SUCCEEDED`, `FAILED`, or `PARTIAL` status. It cannot claim to preview, roll back, or make an external action atomic.

### Fluxer-native actions

A native action selects one exact reviewed operation from a platform registry. The application cannot provide a REST method, path, actor, or arbitrary payload.

The first narrow registry contains:

- Publish, update, delete, and reconcile an application-owned message
- Publish, update, and delete a self-role panel

Fluxer owns validation, preview, current authorization, confirmation, idempotency, effects, audit, compensation, and recovery. Purely native actions can remain available while the application is offline if the installation is active and the bot authority is healthy.

Execution rechecks the manager, installation, suspension, bot permission, hierarchy, channel, message ownership, expected message version, settings, builder revision, and preview hash. Any changed source invalidates the plan and requires a new preview.

## Publishing messages

A native message action writes an ordinary public message authored by the installed bot. The initiating manager remains causation and audit attribution. Fluxer never fabricates a user-authored message.

The manager and bot must both be able to view the target channel. The bot must currently hold every content permission required by the exact message. Updates and deletes work only on messages owned by the same application installation relationship and require an expected version.

One durable operation owns deterministic effect IDs. If a crash happens after the message is created, retry completes the missing records without creating a second message. Safe compensation may delete a message created solely by the failed operation only when it remains unchanged. Fluxer never removes unrelated or independently edited content to imitate rollback.

## Self-role panels

A self-role panel is an application-owned public message plus a server-owned mapping. It can offer buttons, one exclusive choice, or multiple choices across at most 25 registered ordinary roles.

At publication and every click, Fluxer verifies that:

- The panel, message version, installation generation, and channel remain current
- Every role still exists and is not `@everyone` or managed
- Each role remains below the bot's authoritative managed role
- The bot currently has `Manage Roles`
- The member changes only their own roles and meets current eligibility

The manager's `Manage Guild` permission authorizes configuration and publication. The bot's separately approved role authority performs the self-assignment. The clicking member does not receive `Manage Roles` by delegation.

Multi-role changes are not represented as atomic. Each role effect has its own result. A concurrent role deletion or hierarchy change can produce a reported partial outcome. Reconciliation resumes only safe uncommitted work, and compensation never reverses a later independent member or administrator change.

The member receives an invoker-only result. Authorized managers receive attention for an unresolved partial or compensation failure.

## Audit and activity

Community activity records the actor, application, schema and configuration versions, stable changed keys, operation class, status, and safe error category. It never records setting values, form fields, template bodies, application response bodies, credentials, or private resource data.

Owner, `Administrator`, and `View Audit Log` can see normal guild audit entries. `Manage Guild` without `View Audit Log` can see the application configuration activity it is authorized to manage, but not unrelated moderation history.

## What must be proven before release

Validation must cover:

- Every setting type, bound, and prohibited sensitive definition
- Interrupted complete-snapshot writes, stale saves, and reset
- Invalid resources, offline delivery of the latest state, and acknowledgement ordering
- Dormant removal and reactivation, key quota, manager forgetting, and 45-day superseded-value expiry
- Uninstall, reinstall, permanent deletion, and preventing deleted data from returning after backup recovery

The interface needs wide and narrow visual review, keyboard navigation, focus recovery, screen-reader names, conflict recovery, clear persisted-versus-applied language, and clear partial-failure messages.

Builder and action validation must cover preview and execution parity, stale plan hashes, permission and hierarchy races, message ownership and version conflicts, transport outage, duplicate submission, process crash, safe compensation, self-role concurrency, unresolved partial effects, suspension, uninstall, and reinstall.

See [administration and authority contracts](../reference/administration-and-authority-contracts.md) for the detailed settings, builder, action, authority, and audit rules.

## Continue reading

- Previous: [Interactions and responses](06-interactions-and-responses.md)
- [Research index](../README.md)
- Next: [Authority, safety, and data](08-authority-safety-and-data.md)
