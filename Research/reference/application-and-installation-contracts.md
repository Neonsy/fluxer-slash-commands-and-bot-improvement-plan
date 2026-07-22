# Application and Installation Contracts

Fluxer does not yet have durable installations or managed application roles. The rules below cover application identity, installation lifecycle, permission sources, and deletion.

The [orientation](../guide/01-orientation.md) provides the product context. The [glossary](glossary.md) defines the recurring terms used in this contract.

## Application identity

Each application has exactly one bot account. The immutable application Snowflake is the authorization identity and is never reused.

Application creation becomes one recoverable operation that owns:

- The owner capacity claim
- The application and bot Snowflake
- The bot user
- The application source row
- The application handle claim
- Bot and client credential hashes
- Activation or cleanup state

Plaintext credentials are returned only after every required resource is consistent and the application is active. If a success response is lost, the owner must rotate credentials. A retry does not reveal or mint another successful credential for the same operation.

### Ownership limit

One account may own at most **50 non-deleted applications**. Suspended, dormant, failed-cleanup, and otherwise retained applications count until permanent deletion completes.

The existing authenticated-default-user requirement, CAPTCHA, `MAX_APPLICATIONS` error contract, and **10 creation requests per hour** route limit remain.

Creation conditionally reserves one owner slot before allocating durable resources. Concurrent requests cannot both reserve slot 50. The same operation reuses its slot. An ambiguous failed creation continues to consume the slot until reconciliation proves that no live application, credential, bot, or handle remains.

## Application handles

The canonical public grammar is:

```text
^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$
```

The normalized length is 2 through 32 characters. Input is Unicode-normalized, lowercased, has whitespace converted to `-`, and has repeated hyphens collapsed. A stored handle:

- Begins and ends with a letter or digit
- Contains only lowercase ASCII letters, digits, and internal hyphens
- Contains no `_`, `:`, `/`, non-ASCII letters, whitespace, or invisible characters

Canonicalization runs before reserved-name validation. Public claims reject any handle containing `fluxer` and the exact names:

```text
system system-message admin api gateway support safety security staff official
moderation auth oauth login billing payments deleted everyone here native
```

Reserved and already-claimed handles return the same `APPLICATION_HANDLE_UNAVAILABLE` error. Only an audited instance-administrator or bootstrap path may assign a reserved handle to a first-party application. A later reserved-set change never silently seizes an existing claim.

The sole authoritative lookup is a direct conditional row keyed by handle and owned by `ApplicationRepository`. A source and lookup disagreement fails closed and enters reconciliation. Neither a cache, a display-name scan, nor a fuzzy lookup can authorize ownership.

### Claiming and locking a handle

- Creation accepts an optional handle.
- Omission preserves old clients by claiming the normalized application-name candidate.
- Collision adds a deterministic short application-ID suffix within the 32-character limit.
- An empty unusable base falls back to `app-<short-application-id>`.
- Existing applications receive no bulk backfill.
- The first compatible command publication lazily allocates a deterministic handle if necessary.
- An automatically allocated handle may be replaced only before the application has ever published a command.
- The first manifest-head publication freezes the handle before discovery.
- There is no ordinary post-publication rename or independent handle transfer.
- Application ownership transfer retains the application ID and handle.

Permanent application deletion revokes authority immediately and schedules handle release as a separate reconciled child operation. The operation first verifies that the deleted application still owns the handle. Release must happen as soon as safely possible and no later than **24 hours after deletion acceptance**. A missed deadline breaches the product contract and pages operators. Ambiguous ownership keeps the deleted application revoked and the handle quarantined.

A later handle claimant receives a new application identity. Unsubmitted qualified text resolves the current owner and shows that identity. A selected or submitted command remains bound to immutable application and command IDs and cannot be retargeted by handle reuse.

## One installation per application and community

Installing an application creates one persistent relationship keyed by `(community_id, application_id)`. There is no standalone public installation ID.

At most one active installation exists for an application and community. Reauthorization updates the same relationship. Reinstall retains the public pair and creates a new internal generation.

The relationship owns:

- Lifecycle state and version
- Current operation and generation
- One managed-role identity
- Approved bot permissions and relationship ceiling
- Retained managed-role presentation
- Dormant community command and declarative configuration
- Deterministic lifecycle effects and recovery state

The bot member remains the acting principal. The installation is not a user.

## Installation lifecycle

The only lifecycle states are:

```text
DORMANT
INSTALLING
ACTIVE
ROLLING_BACK_INSTALL
INSTALL_CLEANUP_FAILED
UNINSTALLING
UNINSTALL_FAILED
```

Suspension is an orthogonal overlay. A legacy bot has no installation row and does not use a `LEGACY` lifecycle state.

Legal transitions are:

```text
no record or DORMANT -> INSTALLING -> ACTIVE
INSTALLING -> ROLLING_BACK_INSTALL -> DORMANT
ROLLING_BACK_INSTALL -> INSTALL_CLEANUP_FAILED
INSTALL_CLEANUP_FAILED -> ROLLING_BACK_INSTALL
ACTIVE -> UNINSTALLING -> DORMANT
UNINSTALLING -> UNINSTALL_FAILED
UNINSTALL_FAILED -> UNINSTALLING
```

No transition skips a cleanup phase. An uninstall request during `INSTALLING` requests rollback. It does not start a competing uninstall. Permanent application deletion drives every non-dormant relationship through its applicable cleanup path before deleting the record.

Each row has a monotonic `lifecycle_version` and `operation_id`. State transitions require the expected state and version. An advisory renewable lock keyed by community and application reduces contention, but database compare-and-set is the correctness boundary. A repeated matching operation returns its current result. A conflicting operation receives HTTP 409.

### Activation order and deadlines

After claiming `INSTALLING`, Fluxer:

1. Persists generation, operation ID, a preallocated managed-role ID, and approved initial permissions
2. Creates or verifies that exact managed role
3. Adds or verifies the bot member
4. Assigns or verifies the managed role
5. Rereads relationship, role ownership, member, assignment, permission, application, and suspension invariants
6. Conditionally advances to `ACTIVE`

Every installation creates one managed role, including a zero-permission installation.

Forward work has **15 seconds** to reach `ACTIVE`. A live request that misses this deadline moves to rollback and returns failure. It may continue synchronous rollback through **25 seconds**. Any row still `INSTALLING` **30 seconds** after creation is abandoned and moved to rollback by reconciliation. It can never finish forward activation later.

OAuth success is returned only after `ACTIVE`. Forward work is never completed in the background after the caller was shown failure.

### Cleanup and retry

Install rollback and uninstall both attempt every independently safe cleanup effect even when an earlier one fails:

1. Detach the managed role
2. Remove the installation-owned bot member
3. Delete the installation-owned managed role
4. Verify resource absence and settled effects

Rollback reaches `DORMANT` only after full verification. Uninstall first leaves `ACTIVE`, which immediately revokes authority, and reaches `DORMANT` only after cleanup and revocation are verified.

The synchronous cleanup is attempt 1. Later attempts occur after:

```text
5 seconds
30 seconds
2 minutes
10 minutes
1 hour
6 hours
24 hours
every 24 hours until 25 total attempts
```

Every delay receives up to plus or minus 20 percent jitter. The installation row, not queue delivery count, owns the attempt and next due time. After attempt 25, automatic retry stops and the failed state remains visible.

A community owner, `Administrator`, or `Manage Guild` may inspect sanitized failure state and request cleanup recovery. Instance-wide inspection and retry require a dedicated installation-recovery ACL. Application ownership alone grants no recovery authority.

Manual retry:

- Increments a persisted recovery cycle
- Preserves lifetime attempt history
- Attempts immediately
- Opens another bounded 25-attempt schedule
- Is limited to one new cycle per installation every five minutes
- Is disabled while a cycle is active
- Treats repeated requests for the active operation as idempotent

No interface may directly edit lifecycle state, skip cleanup, force success, change ownership, or delete the recovery record.

### Tracking installation side effects

Every install, rollback, and uninstall effect is derived from community, application, generation, and effect type. The managed-role ID is allocated before role creation and never replaced by a retry.

Retry verifies or applies the expected owned resource. An already absent resource counts as converged only for the exact owned cleanup target. Ownership mismatch is a hard failure and never permits overwrite or deletion. Audit and Gateway emission use the same effect identity for deduplication.

## When an installation has authority

`ACTIVE` plus absence of applicable suspension is the only condition that grants a managed installation authority.

All other lifecycle states deny:

- Bot API operations in that community
- Command discovery and invocation
- Interaction creation and delivery
- Configuration access and delivery
- Response tokens and delegated capabilities

Leaving `ACTIVE` permanently revokes outstanding scoped response tokens and delegated capabilities before cleanup. The same bot credential may remain valid for other active unsuspended communities.

## Managed role and supplemental roles

Only the installation's bot may hold its managed role. Ordinary member-role APIs must reject manual assignment to anyone else and manual removal from the bot. Ordinary role controls cannot delete the role. Ordinary member-kick controls cannot remove an installed bot.

Authority by operation is:

| Operation | Required community authority |
| --- | --- |
| Change name, color, icon, hoist, or mentionability | `Manage Roles`, subject to normal hierarchy |
| Change permission bits | Community owner or `Administrator` |
| Reorder the managed role | Community owner or `Administrator`, plus hierarchy invariants |
| Assign or remove a supplemental ordinary role from the bot | Community owner or `Administrator`, plus hierarchy invariants |
| Uninstall | Community owner, `Administrator`, or `Manage Guild` |

The application and bot can never elevate their own managed role. Application rename does not overwrite community-customized role presentation.

## Install permission sources

The application publishes an optional `required_bot_permissions` decimal bitfield using expected-version compare-and-set.

| Input | Resulting source |
| --- | --- |
| Field omitted from a patch | Leave current source unchanged |
| Non-null canonical bitfield, including `"0"` | `CODE_DEFINED` |
| Explicit `null` | `INVITE` |

Invalid, negative, noncanonical, or unknown bits reject publication rather than being masked. Only the authenticated application developer publication principal for the same application may write the field.

The application record exposes:

```text
permission_source: INVITE | CODE_DEFINED
required_bot_permissions: decimal bitfield string | null
permission_source_revision: positive integer
permission_source_hash: SHA-256 of version, source, and declared set
```

A semantic change advances revision and hash. A no-op does not. Existing applications migrate to `INVITE` without an inferred declaration.

### What consent records

Consent stores an immutable transaction snapshot of application, community, source, normalized set, source revision and hash, installer, and expiry. Immediately before claiming installation, Fluxer rereads the source. A source, revision, or hash change cancels the old transaction before any membership or role mutation and restarts consent.

| Source | Owner or `Administrator` | `Manage Guild` without `Administrator` |
| --- | --- | --- |
| `INVITE` | May approve any normalized known invite set | May approve only when every requested bit is personally held |
| `CODE_DEFINED` | May approve the exact current declaration | May approve the exact current declaration, including bits not personally held |

No first-install path accepts optional extra permissions, managed-role position, or supplemental roles. The committed set becomes the relationship ceiling.

In invite mode, the OAuth link is the requested source. In code-defined mode, the link's bitfield is only a portability hint. Edited, omitted, duplicated, or stale URL bits never override the saved declaration.

Publishing, changing, or clearing a declaration never mutates an existing relationship ceiling or active role. A declaration increase becomes a recommendation. A reduction is shown as a diff and does not silently revoke authority.

On reinstall or reauthorization, `Manage Guild` may approve only a set at or below the retained relationship ceiling. The community owner or `Administrator` must broaden the ceiling or change permission bits, role position, or supplemental roles.

## Legacy bot compatibility

Existing bot memberships are not backfilled. Fluxer does not infer role ownership from mutable names or current assignments and does not alter existing roles, permissions, or memberships.

A legacy bot remains on current membership and permission behavior until ordinary removal and fresh installation. It can still be blocked by application-wide or community-scoped suspension because the authenticated application and community are known. Permanent application deletion can revoke its credential and remove known bot memberships, but it never guesses or deletes an ordinary role.

Restore replays suspension and application deletion before bot authority opens. A restored legacy membership cannot reactivate a deleted or suspended application.

## What is kept after uninstall

Successful uninstall removes and verifies the bot member, managed role, assignment, and current authority. It retains the `(community_id, application_id)` relationship as `DORMANT` without time-based expiry while both owners exist.

Dormant retention includes:

- Managed-role presentation
- Last approved permission proposal and relationship ceiling
- Command aliases, availability overrides, restrictions, categories, and approval state
- Declarative setting values, revisions, and invalid-reference state
- Provider recommendations and community presentation preferences
- Explicitly eligible component presentation state for later message reconciliation

Supplemental role assignments are never retained or silently reassigned.

Reinstall allocates a new generation and managed-role ID. Review shows current permission source, retained presentation and permissions, authority and command changes, dormant configuration, and invalid references. Nothing retained grants authority by itself.

Old public messages remain visible and inert. Reinstall never revives controls. Reactivation requires an explicit application request with message ID, expected version, current schema, and a deliberate state-preservation choice. A successful reconciliation creates a new message version bound to the new generation.

## Resetting or forgetting saved data

The community owner, `Administrator`, or `Manage Guild` may reset while active or dormant:

- Managed-role presentation and default proposal
- One command
- All commands
- Declarative settings
- All community-owned application configuration

Reset is version-checked, confirmed for bulk scope, and audited. Command override rows may be removed. Active declarative settings advance to a new `INHERIT` revision. Reset does not remove global definitions, public messages, audit or report evidence, or the dormant relationship.

`Forget stored value` is a separate manager-authorized action for a dormant declarative key. It advances the head, writes a value-free non-resurrection marker, and removes the current and historical value-bearing rows and reference state. No digest or commitment derived from the erased value may remain.

## Permanent application deletion

Deletion is irreversible and ordered:

1. Write a permanent tombstone
2. Revoke credentials, sessions, interaction authority, installation, publication, delivery, and dashboard access
3. Enumerate active, dormant, incomplete, and legacy child relationships
4. Run owned uninstall cleanup for every managed relationship and strip component authority
5. Remove community command, declarative, policy, provider, and user preference references
6. Remove permission declarations, command and declarative schemas, drafts, heads, revisions, categories, and targets after live references are gone
7. Preserve or anonymize public bot-authored messages under existing deleted-bot behavior and remove component state
8. Destroy encrypted signing keys, transport secrets, credentials, and OAuth authorizations
9. Verify reverse indexes and object references
10. Complete the deletion journal

Cleanup is resumable per relationship. One failed community does not block successful child cleanup elsewhere. The application remains revoked throughout.

The application ID is never reused. The separate handle-release operation follows its 24-hour contract. Submitted safety reports and existing guild audit snapshots follow their own retention rules rather than the deletion schedule for the application record.

## Permanent community deletion

Community deletion first blocks every application authority scoped to that community. It then deletes:

- Active and dormant relationships
- Managed roles and members
- Command and category policy
- Provider recommendations
- Declarative values, revisions, references, and delivery state
- Community-scoped user preference and usage rows
- Public messages, components, and ephemeral message copies
- Guild audit, search, cache, and reverse-index data

Application-global definitions, credentials, permission sources, manifests, signing keys, and data for other communities survive. Cleanup is idempotent and does not require application availability.

## Preventing deleted data from returning

Deletion and value-erasure journals contain only identities, generation or version, scope, operation, time, result, and an access-controlled integrity proof. They contain no content, configuration values, credentials, or value-derived digest.

Marker retention must satisfy:

```text
oldest restorable backup age
+ Maximum restore and reconciliation validation window
+ Deployment safety margin
```

The deployment owns those measured values. Restore replays markers before authority or configuration reads. If coverage cannot be verified, the platform remains in recovery hold.

## Required release checks

Implementation is not complete without:

- Concurrent owner-slot and handle-claim tests on both database backends
- Failure injection after capacity claim, handle claim, bot creation, application persistence, credential generation, and each install or cleanup effect
- Exact lifecycle state, deadline, retry, jitter, manual-cycle, and stale-worker tests
- Zero-permission install and one-role cardinality tests
- Permission-source omission, `"0"`, `null`, stale-consent, held-bit, code-defined-bit, and ceiling tests
- Role ownership, presentation, permission, position, supplemental-role, removal, and hierarchy tests
- Uninstall, reinstall, generation isolation, dormant retention, reset, forget, application deletion, community deletion, and restore non-resurrection tests
- Proof that no partial application or installation becomes active and no ambiguous owner is overwritten
