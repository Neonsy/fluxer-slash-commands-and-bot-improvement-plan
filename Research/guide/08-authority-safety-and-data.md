# Authority, safety, and data

Applications sit on a trust boundary. A command may begin with a human gesture, run through application code, use a bot account, and end in a native community mutation. Fluxer must preserve the identity and authority of every participant across that path.

Everything in this chapter is planned unless a paragraph says otherwise.

## Four different execution paths

The platform does not treat every action after a command as delegated user activity.

| Path | Acting authority | What the application receives |
| --- | --- | --- |
| Compatible callback | The application handles its own work. | One trusted interaction and scoped response authority. |
| Ordinary bot REST call | The installed bot. | Its existing bot credential and current bot permissions. |
| Fluxer-native builder action | A fixed platform operation, normally using the installed bot for its effect. | A reviewed declarative definition, not generic REST access. |
| Delegated native action | The current user, the installed bot, or both as declared. | One typed, single-use capability for one registered operation. |

Invoking a command never gives an ordinary bot endpoint the member's permission. A bot-authenticated call remains a bot action even when an interaction caused the application to make it.

Application callback work remains external application work. Fluxer cannot call it native, atomic, reversible, or platform-verified merely because the form appeared in Fluxer.

## Explicit authority modes

Commands that opt into the native-action broker publish one of three modes:

- `AS_USER` requires the current invoking member
- `AS_BOT` requires the installed bot
- `REQUIRE_BOTH` requires each actor independently

Compatible commands that omit every Fluxer authority extension keep normal bot behavior. They normalize internally to bot execution with no native-operation allowlist. If an application supplies a native-operation allowlist but omits the mode, the safe default is `AS_USER`.

One actor's permission never substitutes for another actor's missing permission. Fluxer reevaluates current membership, permission, hierarchy, target, installation, suspension, command authority revision, and operation approval immediately before the effect.

The interaction includes a server-generated permission snapshot for application convenience. It is marked non-authoritative. It can help an application avoid asking for work that is likely to fail, but it can never grant native or bot authority.

## Authority changes require review

A command stores an authority revision and canonical authority hash outside presentation text. Changes to execution mode, required permissions, allowed native operations, or operation constraints change that revision.

Community approval accepts a reviewed definition. It does not itself grant the current user or bot any permission. Authority still depends on the live installation and actor state at execution.

Presentation edits cannot hide a security change inside labels or descriptions. The application cannot choose a different actor or native operation at runtime than the approved typed definition permits.

## How delegated native actions are limited

Delegated authority exists only through a dedicated broker. It never accepts a generic method, path, actor ID, permission bitfield, or application-written audit record.

The application authenticates as its bot, presents the secret interaction credential through a protected header, and requests one registered operation with typed parameters, a request key, and the expected authority revision.

Fluxer resolves the trusted interaction and derives:

- Application and installation generation
- Community and channel
- Invoking member and installed bot
- Command or component identity and authority revision
- Response deadline
- Allowed operation envelope

The stored capability is opaque, hashed, revocable, audience-bound, and single use. It identifies the exact operation, normalized parameters, actors, interaction, authority revision, expiry, causation, and deterministic effect. It contains no reusable general permission or unrestricted API authority.

A conditional claim lets one worker execute it. Exact retry returns or resumes the existing result. A process crash cannot clear the claim and invite another execution. Terminal denied, failed, expired, or revoked capabilities never become executable again.

Uninstall, suspension, application or community deletion, installation generation change, command disablement, authority change, response revocation, confirmation cancellation, and required membership loss all invalidate pending authority.

## When confirmation is required

Fluxer derives where every security-relevant value came from:

- Submitted directly by the member
- Fixed by the reviewed definition
- Derived by the server from a bound rule
- Selected or changed by the application

The application cannot assign these labels or lower the confirmation requirement.

Fluxer selects the highest required class from the operation's registry floor and its actual normalized effects.

### Class 0, exact direct execution

No second prompt is required for one bounded, low-impact effect when all important values were submitted or fixed and the command UI already disclosed the exact native action and authority.

Examples may include an exact kick, timeout change, nickname change, pin, or one message deletion when the operation's own risk rules permit it.

Class 0 still uses a reviewed operation, current authorization, one-use effect identity, and audit. It never means that Fluxer trusts the command name.

### Class 1, exact private confirmation

An invoker-only platform confirmation is required when the application selects or changes an important target or parameter. The prompt shows the real operation, application, authority, target, and consequence.

The confirmation binds the exact capability and expires within five minutes and never later than the interaction response deadline. Any edit invalidates it.

### Class 2, high-impact private confirmation

High-impact confirmation is mandatory for bulk changes, permission and hierarchy changes, access changes, durable resource deletion, persistent access links, history deletion, and any effect crossing the registered mass or destructive threshold.

Fluxer resolves as much exact scope as possible and shows counts, ranges, destructive styling, partial-failure warnings, and before-and-after permission or hierarchy differences where relevant. A changed target count or effect invalidates the prompt.

Confirmation does not expand the registered operation, approved authority envelope, or current permissions. It is not a reusable grant and does not replace direct reauthentication for operations that remain excluded from delegation.

## What delegation explicitly does not allow

The broker does not support:

- Impersonating the member for messages, reactions, typing, read state, notes, or personal profile state
- Community creation, deletion, or ownership transfer
- Password, MFA, or sudo challenges
- Webhook token creation, rotation, reading, or execution
- Account, billing, relationship, safety-admin, or instance-admin actions
- User-installed, direct-message, group-message, Activity, or other non-community contexts
- A generic fallback from an unsupported operation to bot authority

Autonomous workflows, schedules, application callbacks, and ordinary bot REST calls continue to act as the bot under the bot's current installed permissions.

## Audit records causation, not raw input

Application-attributed guild audit extends existing native action records with causal fields. It records the application, bot, invoking member where present, command or component, interaction, authority mode, capability, native operation, confirmation state, result, and ordered effect chain.

Each deterministic effect receives a preallocated audit identity. Retry cannot duplicate the entry. Partial work creates one record for every committed effect and a summary of what committed and failed. Compensation appends linked records rather than rewriting history.

Causal application rows are not eligible for destructive message-delete batching that would replace individual records with a summary.

Audit must never store:

- Command arguments, autocomplete values, form fields, or selected component values
- Message or ephemeral message content
- Attachment data, private URLs, or upload tokens
- Bot, OAuth, response, or capability bearer secrets
- Signatures, headers, cookies, encrypted payloads, or raw callback bodies
- Raw application `custom_id` values
- Stack traces, DNS answers, or arbitrary remote errors

Only the native operation can select allowlisted security facts such as exact target IDs, operation, permission changes, bounded duration, deletion range, count, stable result code, and confirmation outcome.

Application-attributed guild audit follows the existing 45-day retention. Community owner, `Administrator`, and `View Audit Log` can see native action history. `Manage Guild` without audit permission sees only installation, command, and configuration activity it is already authorized to manage. Application developers receive delivery health, not community audit targets or human identities.

## Data ownership and lifecycle

Every new record must name its owner, purpose, access rule, retention, deletion behavior, backup behavior, export policy, and prohibited data.

Several operations that may look similar have different meanings:

| Operation | Effect |
| --- | --- |
| Uninstall | Ends one community relationship generation and revokes authority. Retained community configuration becomes dormant. |
| Reset | Writes community configuration back to inherited defaults. It does not uninstall or erase all history. |
| Forget stored value | Removes one dormant community-owned value and its value-bearing history. |
| Suspension | Adds a reversible safety overlay. It does not delete the application or installation. |
| Permanent application deletion | Revokes global authority, then removes the application and all scoped relationships and definitions. |
| Permanent community deletion | Revokes and removes all application state owned by that community while other communities survive. |

Uninstall immediately makes interaction tokens, pending actions, delegated capabilities, and old controls terminal. Public messages stay as content with inert controls. Ephemeral messages remain only until their normal dismissal or expiry. Community command policy and settings remain dormant for explicit reinstall review.

Reinstall creates a new generation and managed role. Retained data is not authority. Old tokens, confirmations, components, and capabilities remain dead.

Permanent deletion revokes before cleanup. A minimal tombstone and non-resurrection journal remain long enough to stop older backups from restoring deleted authority or values. Application-owned databases and external effects remain outside Fluxer's deletion and transactional boundary.

## Ephemeral message data and export

Ephemeral messages belong only to the invoking account and are excluded from ordinary account export. The export may state the policy in general, but it includes no ephemeral message content, IDs, counts, application identity, or component state.

Submitting a report creates a new safety-evidence record. That record is not added to the reporter's ordinary export and is not available to the application or community managers.

## Report evidence lifecycle

Current Fluxer report storage copies message context and attachments into report data. The current public privacy policy states that report snapshots are kept for up to one year with automated object-storage deletion and rare legal extensions. Repository inspection did not verify a coordinated database, search, and object lifecycle.

The plan changes future report evidence to one coordinated lifecycle for ordinary reports and ephemeral message reports:

- Open and explicitly reopened cases retain necessary evidence for review
- Resolution starts a 180-day evidence period
- Reopening before expiry clears that deadline, and the next resolution starts a new period
- An authorized case-specific legal or statutory hold pauses deletion and requires review at least every 90 days
- If ordinary expiry passed during a hold, release starts logical revocation immediately and physical purge completes within seven days
- Account deletion removes unnecessary contact data and uses report-scoped pseudonyms where feasible without letting a participant destroy an active case
- Only non-reidentifying broad aggregate counts may remain after purge

The purge is one versioned distributed operation across the report row, duplicate-report state, search document, cloned evidence objects, and indexes. It first disables every read path and search entry, then deletes each copy idempotently. Partial deletion resumes without recreating a removed copy.

Already resolved reports from before policy activation are marked as legacy retained. No destructive database or search deadline is inferred for them. Pending reports adopt the new generation when later resolved. A separate reviewed migration would be required to clean legacy records.

This report policy cannot activate until privacy, security, and legal review accepts the applicable deployment and public-policy change. A lawful stricter rule may shorten retention. A properly authorized hold has its own bounded lifecycle.

## What must be tested before release

Before delegated actions or data-writing features are enabled, validation must include:

- All authority modes with independent user and bot permission changes
- Actor and target substitution attempts
- Stale authority revisions, generation changes, suspension, and uninstall
- Exact retry, double claim, process crash, and deterministic-effect recovery
- Every confirmation floor and escalation rule
- Confirmation cancel, dismissal, expiry, changed counts, and replay
- Audit causation, compaction exclusion, partial effects, compensation, and redaction
- Uninstall, reinstall, permanent deletion, account deletion, and community deletion matrices
- Ephemeral message isolation and export exclusion
- Report resolution, reopen, hold, release, expiry, partial purge, erasure, and backup non-resurrection

See [administration and authority contracts](../reference/administration-and-authority-contracts.md) for the detailed authority and audit rules. See [operations and data contracts](../reference/operations-and-data-contracts.md) for retention, deletion, suspension, and recovery.

## Continue reading

- Previous: [Community management](07-community-management.md)
- [Research index](../README.md)
- Next: [Failure, recovery, and operations](09-failure-recovery-and-operations.md)
