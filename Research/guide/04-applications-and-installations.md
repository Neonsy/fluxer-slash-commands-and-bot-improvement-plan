# Applications and Installations

## Why installation needs its own model

Fluxer already lets an OAuth application add its bot to a community. The plan keeps that invite path and adds the durable relationship state needed for commands, management, cleanup, and recovery.

That relationship must own the bot member, the managed role that carries the approved bot permissions, the application's current authority generation, community configuration, cleanup, and recovery. Without that ownership, Fluxer cannot tell whether a role belongs to the application, whether a partial install is safe, or what should happen on uninstall and reinstall.

## Current behavior

The verified repository baseline has the following behavior:

- Creating an OAuth application allocates one application ID, one bot user, client and bot credentials, and an application row
- The bot user ID has the same numeric value as the application ID
- The application row has no command, installation, transport, callback, signing-key, suspension, or lifecycle state
- Application creation checks a limit of 25 by listing the owner's applications and then creating separately, so concurrent requests can both observe one remaining slot
- OAuth consent adds the bot member inline
- A role is created only when normalized requested permissions are greater than zero
- That role is an ordinary mutable community role with no application owner or installation generation
- Current invite authorization requires `Administrator` or `Manage Guild`
- A non-administrator can approve only requested bits they personally hold
- Removing the bot deletes its member row but does not identify or delete an OAuth-created role
- Reauthorization can create a new ordinary role while an older unassigned role remains
- Permanent application deletion revokes the bot credential and removes memberships, but cannot identify OAuth-created roles for cleanup

That is the starting point, not the intended lifecycle.

The [applications](../reference/current-state.md#applications) and [OAuth placement](../reference/current-state.md#oauth-placement-and-bot-roles) sections show the source behind this summary.

## Planned application identity

The application is the global record owned by the developer. It has one immutable Snowflake, one bot account, credentials, a mutable display name, and a stable public handle.

The handle grammar is:

```text
^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$
```

After canonicalization it must be 2 through 32 characters. Input is Unicode-normalized, lowercased, whitespace becomes `-`, and repeated hyphens collapse. Underscore, colon, slash, remaining whitespace, non-ASCII letters, invisible characters, and leading or trailing hyphens are rejected.

Public claims reject every canonical handle containing `fluxer` and the exact reserved names:

```text
system
system-message
admin
api
gateway
support
safety
security
staff
official
moderation
auth
oauth
login
billing
payments
deleted
everyone
here
native
```

Only an audited instance bootstrap path may assign a reserved handle to a first-party application. Public callers receive `APPLICATION_HANDLE_UNAVAILABLE` for both a reserved name and an existing claim.

The handle is provisional until the first command manifest publishes. Before that boundary, the owner can conditionally claim a replacement and then release the never-public provisional handle. The first publication freezes it. Ownership transfer retains the application ID and handle.

## Recoverable application creation

The planned owner cap rises from 25 to 50 non-deleted applications while retaining the authenticated default-user, CAPTCHA, and 10-per-hour route controls.

Fifty gives developers room for separate test, staging, migration, and production applications without adding an exception system for ordinary use.

The rollout should track cap rejections, slot use, creation abuse, cleanup backlog, and the cost of retained resources. Those numbers will show whether 50 remains a sensible default.

Creation becomes one resumable operation:

1. Validate and moderate metadata.
2. Establish a deterministic operation ID.
3. Conditionally reserve one owner-capacity slot.
4. Allocate the application and bot ID.
5. Derive or accept the handle candidate.
6. Conditionally reserve the handle for that application operation.
7. Create or verify the deterministic bot and application rows.
8. Generate and store credential hashes.
9. Activate only when every required resource is consistent.
10. Return plaintext credentials only from that successful activation.

Suspended, dormant, and retained deleting applications count toward the cap. A failed creation's slot also counts while activation or cleanup remains ambiguous. Reconciliation releases it only after proving that no application, credential, bot, or handle remains live.

The application row and handle lookup cannot be assumed atomic. `ApplicationRepository` repairs the lookup only when ownership is unambiguous. A disagreement fails closed. Repair never guesses from display names or overwrites another claim.

## Planned installation identity

One durable relationship is keyed by community ID and application ID. There is no public installation ID and there can be only one active relationship for the pair.

The relationship persists through uninstall as `DORMANT`. Reinstall starts a new internal generation while keeping manager-owned configuration attached to the same application and community identities.

Every generation preallocates its deterministic effect identities and a new managed-role ID. A retry addresses the same role, member, assignment, audit emission, and lifecycle effects. It does not allocate replacements.

## Lifecycle states

The exact planned states are:

| State | Meaning |
| --- | --- |
| `DORMANT` | The application is not installed. Retained community configuration may exist. |
| `INSTALLING` | Forward installation work is in progress and grants no application authority. |
| `ACTIVE` | Every required resource is verified. This is the only lifecycle state that can grant community-scoped application authority. |
| `ROLLING_BACK_INSTALL` | A failed or cancelled install is removing its owned effects. |
| `INSTALL_CLEANUP_FAILED` | Install rollback remains incomplete after the current automatic retry cycle. |
| `UNINSTALLING` | Authority has ended and uninstall cleanup is running. |
| `UNINSTALL_FAILED` | Uninstall cleanup remains incomplete after the current automatic retry cycle. |

Suspension is a separate overlay. A legacy bot has no installation row. `LEGACY` is not a lifecycle state.

Allowed transitions are fixed:

```text
no record or DORMANT -> INSTALLING -> ACTIVE
INSTALLING -> ROLLING_BACK_INSTALL -> DORMANT
ROLLING_BACK_INSTALL -> INSTALL_CLEANUP_FAILED
INSTALL_CLEANUP_FAILED -> ROLLING_BACK_INSTALL on retry
ACTIVE -> UNINSTALLING -> DORMANT
UNINSTALLING -> UNINSTALL_FAILED
UNINSTALL_FAILED -> UNINSTALLING on retry
```

Active reauthorization does not change lifecycle state. An uninstall request during `INSTALLING` requests rollback. Permanent application deletion drives each non-dormant relationship through its applicable cleanup path before deleting the relationship record.

## Concurrency and operation ownership

Each installation row stores a monotonic `lifecycle_version` and current `operation_id`. Every transition conditionally writes only when the expected state and version still match.

A renewable lock keyed by community and application reduces competing work. It is advisory. If a worker loses the lock lease and continues, its next database comparison fails. Database state, not the lock, decides correctness.

- Retrying the same operation ID returns its current status.
- Starting a conflicting operation returns `409 Conflict`.
- Security-relevant writes are never field-merged from stale forms.
- A stale worker cannot move the relationship after another operation advanced its version.

One installation-domain service owns all transitions. OAuth consent, community uninstall, global deletion, suspension recovery, and workers delegate to that same owner. Member and role services continue to own their local resource invariants.

## Installation timing

Forward work has 15 seconds to reach `ACTIVE`. At that deadline, the live request moves to rollback and reports failure. The request may continue its first rollback pass until 25 seconds.

Any `INSTALLING` record still present 30 seconds after creation is abandoned. Reconciliation transitions it to rollback and is forbidden from completing forward installation.

These are initial reviewed defaults for the synchronous OAuth flow. They are not derived from a generic worker timeout. A later evidence-based review may tune them.

## Resource creation order

After claiming `INSTALLING`, Fluxer persists generation, operation ID, managed-role ID, approved permissions, and effect identities. It then:

1. Creates or verifies the managed role
2. Adds or verifies the bot member
3. Assigns or verifies the role to that bot
4. Rereads resource ownership and every installation invariant
5. Conditionally commits `ACTIVE`

The role comes first so role capacity or creation failure occurs before a visible bot member is added. Every installation receives one role, including a zero-permission install.

If any installation step fails, rollback removes the managed-role assignment, removes the installation-owned bot member, and deletes the installation-owned role in that security-reducing order. Failure in one effect does not suppress another independently safe effect. Final verification, not successful API calls alone, permits `DORMANT`.

An ownership mismatch is a hard failure. Cleanup never deletes a resource merely because its name resembles the application.

## Two permission sources

Fluxer preserves portable invite permissions and adds an explicit application declaration.

### Invite mode

When `required_bot_permissions` is absent or explicitly cleared to `null`, the application is in `INVITE` mode.

- The OAuth `permissions` query is the requested set.
- Omission requests the empty set under current compatible behavior.
- Owner or `Administrator` may approve any normalized known permission set.
- `Manage Guild` without `Administrator` may approve only when every requested bit is personally held.
- The exact committed set becomes the durable relationship ceiling.

Existing applications start in invite mode. Fluxer does not infer a declaration from an old URL, membership, or role.

### Code-defined mode

An application owner may publish:

```text
required_bot_permissions: decimal bitfield string
expected_permission_source_revision: positive integer
```

A non-null canonical value selects `CODE_DEFINED`, including the explicit value `"0"`. Omitting the field from a patch leaves the source unchanged. Publishing `null` returns to `INVITE`. Negative, noncanonical, invalid, or unknown bits are rejected instead of being masked.

Fluxer stores and returns the source, declared set, monotonic revision, and canonical SHA-256 source hash. Only the authenticated developer publication path for the same application can change it.

In code-defined mode:

- The OAuth builder shows the saved declaration read-only
- The URL may include the bitfield for portability, but Fluxer treats it as a hint
- Edited, omitted, duplicated, or stale query bits cannot change the selected set
- Consent captures the exact source, set, revision, and hash
- Commit rereads them before claiming installation
- Owner, `Administrator`, or `Manage Guild` may approve exactly the current declaration
- `Manage Guild` may approve declared bits the manager does not personally hold
- No installer may add optional permissions, choose managed-role position, or attach supplemental roles in that consent

A source or revision race applies nothing and returns to consent with current data.

## The durable permission ceiling

The exact first-install set becomes the relationship ceiling in both permission modes.

Publishing a larger or smaller code-defined declaration does not mutate an active or dormant managed role. It creates a visible recommendation or diff only. Invite mode has no application-global recommendation.

On reauthorization or reinstall:

- `Manage Guild` may approve a set at or below the retained ceiling under the current source rules
- Only the community owner or `Administrator` may raise the ceiling
- Only the community owner or `Administrator` may change permission bits later
- Only the community owner or `Administrator` may move the managed role
- Only the community owner or `Administrator` may add or remove supplemental ordinary roles from the bot

Every broader change uses exact preview, expected versions, current installation and suspension checks, hierarchy checks, audit, and final current permission enforcement. Preview and audit improve visibility. They do not replace authorization.

## Managed-role presentation and ownership

The managed role starts with the application's current display name. A later application rename does not overwrite it.

Members with `Manage Roles` may change presentation fields such as name, color, icon or Unicode emoji, hoist, and mentionability, subject to ordinary hierarchy and version checks. They cannot change permissions, role position, supplemental roles, membership, ownership, or deletion.

Only the installation bot may hold the managed role. Ordinary APIs reject:

- Assigning it to another member
- Removing it from the bot
- Deleting it
- Kicking the managed bot

Uninstall owns all of those effects so the role, member, assignment, authority, and retained configuration stay consistent.

## Uninstall

The community owner, `Administrator`, or `Manage Guild` may uninstall.

The transition from `ACTIVE` to `UNINSTALLING` is the security boundary. It immediately blocks scoped bot API actions, Gateway events, command discovery and invocation, interaction delivery, configuration access, response tokens, and delegated capabilities.

Cleanup then attempts all independently safe owned effects, verifies resource absence and stopped delivery, and moves to `DORMANT`. Failure leaves authority revoked and the relationship visibly retryable. Uninstall retains dormant configuration and the approved permission ceiling.

Successful uninstall treats retained data by owner and purpose:

| Data | Result after uninstall |
| --- | --- |
| Relationship | Remains `DORMANT` without time-based expiry while both application and community exist |
| Bot member, managed role, and assignment | Removed and verified absent |
| Managed-role presentation and last approved permission proposal | Retained for reinstall review |
| Supplemental ordinary roles | Not retained or reassigned by Fluxer |
| Application permission declaration | Remains application-global and cannot rewrite the dormant ceiling |
| Command definitions and manifest history | Remain application-global |
| Community command policy, aliases, and provider recommendation | Remain dormant until reset or owning-resource deletion |
| Declarative setting values | Remain dormant and unavailable to the application, while managers retain reset and forget controls |
| Public bot messages | Remain visible with application controls inert |
| Component state | Retained only for explicit definition-identical message reconciliation |
| Ephemeral messages | Remain available only to the recipient until ordinary dismissal or expiry, with application edits and controls revoked |
| Interaction tokens, capabilities, and pending actions | Become permanently terminal |
| Guild audit | Follows the existing 45-day audit retention |
| Submitted report evidence | Follows its separate open or hold state, then the proposed 180-day period after terminal resolution. That policy change still requires privacy and legal review. |

Dormant configuration has no automatic uninstall-age expiry. It ends through authorized reset or permanent application or community deletion. Passive command ordering is different. It stops accumulating and continues only through its existing sliding 90-day inactivity period.

## Cleanup retry schedule

The synchronous cleanup pass is attempt one. Later attempts run after:

```text
5 seconds
30 seconds
2 minutes
10 minutes
1 hour
6 hours
24 hours
then every 24 hours
```

Each delay receives up to plus or minus 20 percent jitter. Automatic retry stops after 25 total attempts. The terminal failure remains visible and alerts operators.

The community owner, `Administrator`, or `Manage Guild` may request cleanup retry. Instance administrators need a dedicated recovery permission. Application ownership alone grants no community cleanup authority.

A manual retry opens a new persisted recovery cycle, keeps lifetime attempt history, runs immediately, and follows the same bounded 25-attempt schedule. Only one cycle can be active. New cycles are limited to one per installation every five minutes. Repeating the active operation ID is idempotent.

No recovery interface may edit state directly, skip cleanup, delete evidence, or declare success without verification.

## Reinstall

Reinstall preserves the community and application relationship, then allocates a new generation and a new managed-role ID.

The review shows:

- Current permission source, revision, and set
- Dormant role presentation and last approved permissions
- New permission, command, and authority differences
- Dormant command and declarative configuration that will become active
- Deleted or invalid resource references that still need attention

Retained data is not authority. The new role receives only the newly approved set. Supplemental roles are never silently reassigned. Old interaction tokens, controls, confirmations, and capabilities stay terminal.

## Reset

Owner, `Administrator`, or `Manage Guild` may reset selected manager-owned configuration while an installation is active or dormant.

Supported reset scopes include:

- Managed-role presentation and default proposal
- One command
- Every command for the application
- Declarative settings
- All community-owned application configuration

Reset is version-checked, summarized, confirmed for bulk scope, and audited. It does not remove the application, reinstall it, reactivate it, erase application-global definitions, or delete public messages.

## Suspension and reinstatement

Instance safety operators may suspend one application everywhere or only in one community. Community managers cannot override this state.

Suspension immediately blocks every targeted path that can create application authority. The application-wide form terminates bot Gateway sessions. The community-scoped form leaves the shared session available for unaffected communities but filters events and rejects targeted actions.

State, configuration, messages, and evidence remain. Managers may still uninstall. Owners retain safe read-only diagnosis plus credential and transport repair, but cannot activate delivery or publish into the suspended scope.

Reinstatement enters `REINSTATING` first. Reconciliation verifies application identity, credentials, each active installation's member and owned role, endpoint health, manifest consistency, and the absence of deletion or broader suspension. Failure stays enforced as suspended. Success permits only new activity for relationships already `ACTIVE`. It never installs a dormant relationship or revives old authority.

## Legacy bot memberships

Existing bot memberships are not backfilled into installation rows or managed roles. Fluxer cannot safely infer role ownership from a mutable name, current assignment, or generic bot-invite provenance.

A legacy bot keeps current membership, role, permission, and removal behavior until the community removes it and performs a fresh installation. Rollout and recovery label it as legacy or unmanaged, never `ACTIVE`.

Legacy status does not bypass safety. Application-wide or community-scoped suspension can block a known application and bot relationship without fabricating managed resources. Permanent application deletion can revoke credentials and remove the known bot membership. It still cannot guess and delete an ordinary role.

## Permanent application deletion

Permanent deletion is irreversible and wins over suspension or cleanup state.

The deletion sequence:

1. Writes a durable application tombstone
2. Revokes credentials, sessions, interaction tokens, capabilities, transport delivery, installation writes, publication, and dashboard access
3. Creates or resumes one cleanup child for every active, dormant, incomplete, and legacy relationship
4. Runs owned uninstall cleanup and strips component authority
5. Removes community configuration and preference references
6. Removes application-owned permission declarations, commands, categories, settings schemas, drafts, manifests, targets, and configuration sources after references are gone
7. Preserves or anonymizes public message authorship under existing deleted-bot behavior and removes live control authority
8. Destroys encrypted signing and transport secrets and removes OAuth authorizations
9. Verifies reverse indexes and object references
10. Completes the deletion journal

Cleanup is asynchronous and resumable. A failed community child remains visible, but global authority stays revoked. The application Snowflake is never reused.

Handle release runs as a separate reconciled child operation and is due no later than 24 hours after deletion acceptance. It must prove the lookup is still owned by the deleted application. A missed deadline pages operators. Ambiguous ownership keeps the handle quarantined.

## Permanent community deletion

Community deletion first blocks all application authority in that community. It then removes every active or dormant relationship, managed member and role, command policy, settings value, community preference, component state, public message, ephemeral message, audit record, search entry, and reverse index owned by that community.

Application-global definitions, credentials, signing keys, and other-community relationships remain. Cleanup does not require the application endpoint to be online.

## Restore and non-resurrection

Deletion and value-erasure journals retain only identity, generation or revision, scope, operation, time, result, and integrity proof. They do not retain erased values, credentials, response tokens, or report evidence.

Restore replays those journals before bot authentication, interaction delivery, settings reads, or services that change data are enabled again. Restored deleted or suspended authority stays blocked and is cleaned again. If journal integrity cannot be verified, the platform enters a recovery hold instead of exposing uncertain authority or data.

Each deployment must set the journal duration. It must exceed the age of every backup that can restore the target, plus the time needed for restore validation, reconciliation, drills, and a safety margin. The repository does not currently provide one universal RPO, RTO, backup retention, or drill interval.

## What must be tested before release

Application and installation work is acceptable only when tests prove:

- Concurrent creation cannot exceed 50 or duplicate a handle
- Partial creation exposes no active application or reusable credential
- The source row and handle index reconcile without guessing ownership
- First publication freezes the handle and deletion releases it safely within 24 hours
- Exactly one managed role exists for every new installation, including zero-permission installs
- Install succeeds only after role, member, assignment, ownership, and permission invariants are verified
- A failed request can never activate later
- The 15, 25, and 30-second boundaries behave exactly as documented
- Lifecycle compare-and-set rejects stale workers and conflicting operations
- Install and uninstall retries reuse deterministic resources and effects
- Invite and code-defined permission sources cannot be confused or changed through URL edits
- The durable ceiling blocks reinstall and reauthorization expansion by `Manage Guild`
- Managed-role presentation, authority, position, supplemental roles, membership, and deletion enforce their distinct permission owners
- Uninstall revokes before cleanup and preserves only the documented dormant data
- Bounded automatic and manual retry cycles remain visible after exhaustion
- Suspension blocks targeted authority without becoming uninstall
- Reinstatement creates only new eligible authority
- Legacy relationships are never adopted or assigned guessed roles
- Permanent application and community deletion preserve their distinct ownership boundaries
- Older backups cannot resurrect deleted, suspended, expired, or erased authority

## When this will be built

Stage `F` must be completed first because lifecycle state, per-owner application slots, handle claims, and security-sensitive configuration require true conditional writes. Temporary rollout controls must also exist before any feature begins writing new data.

Stage `I` is then implemented in three parts:

- `I1` adds the installation state machine, deterministic effects, timing, rollback, retry, and new-install OAuth path while the new production write paths remain disabled.
- `I2` adds managed-role ownership, permission sources, durable ceilings, hierarchy rules, and protected assignment and deletion.
- `I3` adds management, uninstall, reset, cleanup recovery, responsive web, accessibility, and public documentation.

Stage `S` follows with first-class attribution, suspension, restore controls, deletion protection, and the report evidence lifecycle. Application handle creation is completed in `C1` only after those safety foundations are present.

Existing relationships are never migrated by turning on a percentage flag. Rollout uses the new installation path only for fresh installations and tracks legacy relationships separately.

## Continue reading

- Previous: [First working bot](03-first-working-bot.md)
- [Research index](../README.md)
- Next: [Commands and discovery](05-commands-and-discovery.md)
