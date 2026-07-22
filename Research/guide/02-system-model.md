# System Model

## Ownership boundaries

Every object has one owner and one purpose.

An application is global. An installation is the relationship between that application and one community. A command belongs to the application but can be targeted and configured per community. An interaction is one accepted attempt to use a command or control. A response belongs to that interaction. None of these objects gets its authority from its display name.

Everything in this chapter is planned unless a section is labelled **Current**.

## Application

An application is the developer-owned global record. It owns:

- One immutable application Snowflake
- Exactly one bot account
- One mutable display name
- One stable public handle after first command publication
- Bot and OAuth credentials
- Command and category definitions
- Published command manifests and optional drafts
- One selected interaction delivery mode
- Application-scoped signing keys and verified endpoint configuration when HTTP delivery is used
- Optional declared bot permissions
- Optional Fluxer capability declarations
- Application-wide suspension state

The application ID is the authorization identity. The bot user ID has the same numeric value in current Fluxer, but it remains a separately typed bot identity. The handle and display name are human-facing addresses, not authorization inputs.

One account may own at most 50 non-deleted applications in the planned system. Suspended, dormant, deleting, and otherwise retained applications count until permanent deletion completes. Creation reserves capacity conditionally so concurrent requests cannot both claim the final slot.

## Application handle

The public handle provides an unambiguous command spelling.

```text
/<application_handle>:<developer_key>
```

A handle is 2 to 32 characters after normalization. It uses lowercase ASCII letters, digits, and internal hyphens. It cannot begin or end with a hyphen. Reserved platform and safety names cannot be claimed publicly. Reserved and already claimed names return the same unavailable result so callers cannot distinguish them.

An omitted handle is derived deterministically from the application name, with an application-ID suffix on collision and `app-<short-application-id>` as the empty-base fallback. It remains replaceable only until the first published command manifest. That first publication freezes it before the command becomes discoverable.

Permanent deletion revokes the application immediately and schedules a conditionally owned handle release no later than 24 hours after deletion acceptance. Ambiguous ownership keeps the handle quarantined. A later claim is a new application identity. An interaction that was already submitted remains bound to immutable application and command IDs and cannot be retargeted by handle reuse.

## Installation

An installation is the durable relationship keyed by:

```text
(community_id, application_id)
```

There is no separate public installation ID. At most one installation for an application can be active in one community. Reinstall reuses the stable relationship and rotates an internal generation so retained community configuration can return without reviving old authority.

The installation owns:

- Lifecycle state and lifecycle version
- Current operation ID and generation
- The application bot member in that community
- Exactly one installation-managed role, even when it has zero permissions
- Assignment of that role to the application bot only
- The approved permission ceiling
- Dormant manager-owned configuration
- Deterministic effect records for install, rollback, and uninstall
- Cleanup progress and recovery cycles
- Installation-scoped suspension overlay

Only `ACTIVE` grants community-scoped application authority. Resource presence by itself is not enough.

## Installation lifecycle

The state machine makes direction and recovery explicit.

```text
no record or DORMANT
  -> INSTALLING
  -> ACTIVE

INSTALLING failure or cancellation
  -> ROLLING_BACK_INSTALL
  -> DORMANT

incomplete install rollback
  -> INSTALL_CLEANUP_FAILED
  -> ROLLING_BACK_INSTALL on retry

ACTIVE uninstall
  -> UNINSTALLING
  -> DORMANT

incomplete uninstall
  -> UNINSTALL_FAILED
  -> UNINSTALLING on retry
```

No operation may skip those cleanup states. An uninstall request during `INSTALLING` asks the installation operation to roll back. It does not start a second cleanup owner.

Every transition compares the expected state and monotonic lifecycle version in the database. A renewable distributed lock reduces contention, but compare-and-set is the correctness boundary. Retrying the same operation ID returns that operation's current status. A conflicting operation returns `409 Conflict` instead of being queued under stale assumptions.

## Managed role and bot authority

Every new installation has one managed role. Fluxer allocates and stores the role ID before creating it, then creates or verifies the role, adds or verifies the bot member, assigns or verifies the role, rereads the ownership invariants, and only then commits `ACTIVE`.

The managed role carries the approved bot permissions and is a lifecycle-owned resource.

- Only the installation bot may hold it.
- Ordinary member-role APIs cannot remove it from the bot or assign it to someone else.
- Ordinary role deletion cannot delete it.
- The bot cannot be removed through an ordinary kick while the installation is managed.
- Uninstall owns detachment, bot-member removal, and role deletion.

Permission ownership is intentionally split:

| Change | Required community authority |
| --- | --- |
| Role name, color, icon or emoji, hoist, mentionability | `Manage Roles`, subject to ordinary hierarchy and version checks |
| Permission bits | Community owner or `Administrator` |
| Managed-role position | Community owner or `Administrator` |
| Add or remove a supplemental ordinary role from the bot | Community owner or `Administrator` |
| Uninstall or cleanup retry | Community owner, `Administrator`, or `Manage Guild` |

`Manage Guild` may approve the exact permission set during installation under the permission-source rules. That install-specific authority does not become a general ability to edit permission bits, role position, or supplemental roles later.

## Command

A command has two stable identities:

- A public command Snowflake for compatible routes
- An immutable developer key scoped to its application

The display name, localized names, community alias, picker order, and application display name may change. They do not change command identity. Community settings, preferences, interactions, and recovery follow stable IDs and keys.

The application owns the command definition and one application-wide schema. It may choose all active installations, no installations, or selected communities as the target set. A community owns local availability, alias, invocation policy, category disablement, authority approval, and provider recommendation. A member owns personal favorites, hiding, provider preference, and passive ordering.

These layers are evaluated together. A community cannot reactivate a developer-disabled command, bypass targeting, override suspension, or grant an unsupported capability.

## Published command manifest

A published manifest is a complete immutable snapshot. Fluxer first writes the command and category revisions, then uses one conditional update to select that complete manifest as the current version. Services and clients cannot read the new revisions as current before the complete manifest is selected.

That arrangement means an interrupted or losing publication can leave unreachable immutable candidates, but it cannot expose a partial live manifest. A concurrent head change returns a conflict. The server never silently merges two complete publications.

The newest 20 manifests plus at most 5 pinned manifests are retained for recovery. Recovery publishes selected old registry content as a new manifest. It does not roll back application code, external data, messages, community settings, or completed effects.

## Interaction

An interaction is one accepted trigger. It receives a Fluxer Snowflake and one trusted record before delivery. That record binds:

- Application, community, channel, and invoker
- Command ID, command revision, schema version, and authority revision
- The current installation generation
- The selected delivery transport and endpoint generation where applicable
- One opaque response token whose hash is stored server-side
- A three-second initial acknowledgement deadline
- A fifteen-minute response-authority deadline
- Negotiated capabilities
- Source message and message version for control interactions

The client and application cannot rewrite those fields. Permission snapshots in the delivered payload are server-derived conveniences and are explicitly non-authoritative. Native effects and bot REST calls check current state again.

One HTTP retry reuses the same interaction ID and body. Gateway resume replay also reuses the interaction. A delivery attempt number is diagnostic metadata, not a second interaction.

## Response and message

An interaction may claim exactly one initial response within three seconds. It may then create at most five follow-up messages during its fifteen-minute response-authority window.

Public responses are ordinary channel messages with application attribution and existing message Snowflakes. Ephemeral messages also receive message Snowflakes but live in separate invoking-account storage and never enter a channel-message partition.

Response visibility is fixed when the initial response or defer chooses `PUBLIC` or `EPHEMERAL`. Public and ephemeral messages cannot be converted into each other later. Legacy and structured message representation is also immutable.

Public message updates require an expected message version. A stale update returns a conflict and current version rather than overwriting another result. Ephemeral messages add dismissal and retention checks. Dismissed, expired, and deleted messages never reactivate.

## Component occurrence

An application-authored component selector such as `custom_id` is not globally unique. A rendered control is located by the composite identity:

```text
(application_id, message_id, message_version, component path or custom_id)
```

That composite prevents an old message version or reused selector from pointing to a new action. Shared public output and each person's pending or committed control state remain separate.

## Authority layers

Several permissions answer different questions. Treating them as one grant would create serious privilege confusion.

| Layer | Question it answers | What it does not grant |
| --- | --- | --- |
| Installation permission source | Which bot permissions may be approved for the managed role | Command invocation or user authority |
| Installation lifecycle | Is this application allowed to act in this community at all | Any permission absent from the bot's current roles |
| Developer availability and targeting | Is the application offering this command here | Community approval or member permission |
| Community invocation policy | Which audiences and channels may invoke it | Native endpoint authority |
| Personal discovery preferences | How the picker presents eligible commands | Availability or authorization |
| Command execution mode | Should a structured native action use current user, bot, or both principals | Permission to run an undeclared operation or target |
| Allowed native operations | Which structured operation names may be requested | Approval of parameters or current targets |
| Confirmation and capability | Did this user approve this exact current action | Reusable or general user authority |
| Current endpoint checks | May the selected principal perform the concrete effect now | Permission for later retries with changed state |

A compatible command that omits all Fluxer authority fields uses `AS_BOT`, has an empty native-operation allowlist, and does not activate the structured broker. Its handler can call ordinary bot-authenticated REST endpoints. Those endpoints see the bot, not the invoking user.

A nonempty native-operation allowlist is the explicit broker opt-in. If execution mode is omitted in that case, it normalizes to `AS_USER`. The only valid modes are `AS_USER`, `AS_BOT`, and `REQUIRE_BOTH`. Every effect still rechecks current installation, suspension, authority revision, user or bot permission, hierarchy, target, and operation constraints.

## Suspension is separate from lifecycle

Suspension is a durable reversible safety overlay at application scope or application-plus-community scope. It is not uninstall, credential deletion, or permanent deletion.

Application-wide suspension blocks the bot everywhere and terminates its Gateway sessions. Community-scoped suspension filters and rejects work only in the targeted community so other active installations can continue.

Outstanding authority checks suspension at use time. Clearing suspension cannot revive an old response token, pending confirmation, component claim, or delegated capability. Reinstatement first enters `REINSTATING`, then verifies identity, active installation resources, transport health, manifest consistency, and absence of dominating deletion or suspension. New authority resumes only after those checks succeed.

## Data ownership across uninstall and deletion

Uninstall ends one active generation and leaves the stable relationship `DORMANT`. It removes the bot member and managed role, revokes interaction and capability authority, and stops application access. It retains community-owned command policy, aliases, declarative values, provider recommendation, and managed-role presentation for a deliberate reinstall review.

Permanent application deletion is global. It first writes a tombstone and revokes credentials, sessions, interaction authority, publication, installation, delivery, and dashboard access. It then cleans every relationship and deletes application-owned definitions and community references through resumable child operations. Public message content and separately governed safety evidence follow their own policies.

Permanent community deletion is scoped to the community. It blocks community authority first, removes every active and dormant relationship and all community-scoped application data, and leaves application-global definitions and credentials available in other communities.

A manager reset is neither uninstall nor deletion. It returns selected community-owned configuration to defaults using version checks and audit. It does not reactivate, reinstall, or delete the application.

## Current model compared with the plan

**Current:** The application row holds owner, display name, bot settings, OAuth redirects, credential hashes, timestamps, and a row version. OAuth consent adds the bot member inline and creates an ordinary mutable role only when requested permissions are nonzero.

There is no application-to-community installation record or role ownership association. The command picker is a local client list. There is no third-party command, interaction, response-token, transport, component, or ephemeral message model.

The [current-state reference](../reference/current-state.md) links these findings to the code that was reviewed.

**Planned:** Application, installation, command, interaction, response, component, suspension, audit, and recovery each get stable identities and versioned authority. Existing bot memberships are not backfilled because Fluxer cannot safely infer role ownership from names or current assignments. A legacy bot enters the managed system only after removal and a fresh install.

## Which implementation stage owns each part

The dependency order follows the state and authority model:

- Stage `F` adds real conditional writes and temporary rollout controls.
- Stage `I` adds the installation state machine, managed roles, and manager screens.
- Stage `S` adds causal audit, suspension, deletion protection, and restore controls.
- Stage `C` adds recoverable application creation, handles, command storage, publication, targeting, and community administration.
- Stage `E` adds interaction records, transport, delivery, and public responses.
- Stage `P` adapts native commands to stable provider identity and exposes the application picker.
- Stage `R` adds ephemeral messages, rich components, and component state.
- Stage `D` builds declarative settings and builders on the `R` foundations. Stage `A` then adds declarative administrative actions.
- Stage `U` also builds on the safety and interaction foundations completed in `R`, but does not depend on `D` or `A`.

This order prevents later user-facing features from inventing their own identity, lifecycle, or retry semantics.

## Continue reading

- Previous: [Orientation](01-orientation.md)
- [Research index](../README.md)
- Next: [First working bot](03-first-working-bot.md)
