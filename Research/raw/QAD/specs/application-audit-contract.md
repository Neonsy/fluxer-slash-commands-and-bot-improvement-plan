# Application Audit Contract

Status: repository-derived decision under QAD-145, QAD-177, QAD-178, QAD-179, QAD-227 through QAD-235, and the deferred QAD-237 SDK boundary.

## First-class guild audit columns

Extend `GuildAuditLogRow` rather than hiding application attribution in free-form `options`:

```text
actor_user_id              existing user_id semantics, renamed only in model/API if compatible
invoker_user_id?           human who triggered the interaction
application_id?
bot_user_id?
command_id?
command_revision?
component_key_hash?        SHA-256, never raw custom_id
interaction_id?
authority_mode?            AS_USER | AS_BOT | REQUIRE_BOTH | AUTONOMOUS_BOT
capability_id?             non-secret Snowflake record ID
native_operation?
confirmation_state?        NOT_REQUIRED | CONFIRMED | DENIED | EXPIRED
result_state?              SUCCEEDED | FAILED | PARTIAL | COMPENSATED | COMPENSATION_FAILED
result_code?               allowlisted stable code
causation_id?              root operation/interaction Snowflake
parent_log_id?
sequence?
```

Keep current `target_id`, action type, reason, normalized options, and changes. Existing audit action numbers are not repurposed. Native bans/kicks/role changes retain their existing action type and gain attribution. Compatible integration/command-permission action values are used where applicable.

The first three audit values exactly match the command execution mode. `AUTONOMOUS_BOT` means bot-authenticated activity with no invoking interaction, such as an unattended workflow or ordinary bot REST call; it is not an alias for a user-triggered command using `AS_BOT`. Internal operation classifications such as `DELEGATED_ELIGIBLE` never appear as audit authority modes.

Audit log IDs for retryable lifecycle/broker effects are allocated and persisted with the deterministic effect before the side effect. `GuildAuditLogService` accepts that ID so replay cannot duplicate the entry.

## Query tables

Retain current guild, guild+actor, guild+action, and guild+actor+action tables. Add repository-owned denormalized tables:

- `guild_audit_logs_by_application`: `(guild_id, application_id)` partition, `log_id` clustering.
- `guild_audit_logs_by_application_command`: `(guild_id, application_id, command_id)` partition, `log_id` clustering.
- `guild_audit_logs_by_interaction`: `(guild_id, interaction_id)` partition, `log_id` clustering.
- `guild_audit_logs_by_causation`: `(guild_id, causation_id)` partition, `sequence, log_id` clustering.

Capability lookup belongs to the capability repository, not another long-lived guild-audit index. All audit source/query rows use the existing 45-day TTL.

Current message-delete batching deletes qualifying ordinary `MESSAGE_DELETE` rows and inserts one replacement `MESSAGE_BULK_DELETE` row. That remains permitted only for rows with none of the new causal/application fields. Any row carrying `application_id`, `interaction_id`, `causation_id`, `capability_id`, `parent_log_id`, `sequence`, or `result_state` is ineligible for destructive grouping/compaction in every source and query table. A bounded summary may be appended, but it never deletes or replaces causal source/effect/compensation rows. This check is enforced both when scheduling/reading batches and in the repository mutation so a stale worker cannot bypass it.

## Prohibited raw data

Never store in audit rows:

- raw command arguments, autocomplete queries/results, select/radio/checkbox values, modal/form text, or arbitrary application metadata;
- message/ephemeral content, attachment bytes, private attachment URLs, or upload tokens;
- interaction response tokens, delegated capability bearer material, bot/OAuth tokens, signatures, authorization headers, cookies, or encrypted payloads;
- raw component `custom_id` values, which developers may use as opaque state;
- callback bodies, response bodies, stack traces, DNS/IP resolution details, or developer server secrets.

## Allowed normalized security parameters

The platform action broker may record only endpoint-defined allowlisted fields needed to explain the action: target resource IDs, operation enum, role/permission bitfields, duration/expiry, message-delete window, target count, bounded reason under existing audit-reason rules, boolean enforcement flags, normalized before/after changes, result/error class, and confirmation outcome.

Applications cannot choose which fields enter audit. The native operation definition builds the record.

QAD-227 collection membership is raw command input and is never audited merely because it was selected, rejected, autocompleted, or delivered. If a later authorized Fluxer-native operation actually attempts or commits an auditable effect, that operation may record its existing allowlisted target IDs/counts and causal result; the native operation—not the command argument—owns that audit fact. Logs, traces, analytics, and command history retain neither selected IDs nor values.

QAD-228 registration/publication history may retain the canonical public relationship definition like any other command schema revision. Runtime condition evaluation, rejected input, hidden values, and correction details do not create guild audit rows or copy option values. Operational metrics may count safe relationship-error classes without option values or high-cardinality labels.

QAD-229 temporal values, zones, offsets, resolved instants, relative helper text, and validation corrections are raw command input and never enter guild audit, logs, traces, analytics, or command history. If a later authorized native operation uses a normalized expiry/duration, that operation may record only its existing allowlisted security fact and causal result; it does not copy the command field or client preview.

QAD-230 aggregate composer-versus-modal metrics contain only bounded outcome/error/latency classes and never command arguments, modal fields, uploads, or arbitrary application metadata. A cancelled/dismissed/expired modal does not create a guild audit entry or masquerade as a successful application effect.

QAD-231 category configuration is auditable application administration. One atomic toggle records actor, application ID, stable category ID, operation, normalized before/after disabled state, affected-command count at evaluation, config version, and operation ID. It does not enumerate command inputs or produce one false child action per member. Developer category definition/membership publication remains developer history; any resulting native action still uses its own ordinary audit contract.

QAD-232 unchanged registration produces no publication-history or guild-audit entry because no committed state changed. Bounded operational metrics may count the authenticated operation/result but never store the candidate definition, targets, actor identity, or high-cardinality application/command/category labels. Existing pending authority review remains unchanged and visible through its owning surface; no-op neither clears nor duplicates it.

QAD-233 dashboard reads, filters, diffs, and exports do not create guild audit entries. State-changing operations retain their existing developer-publication or community-audit ownership; the UI creates no parallel log. Dashboard/history/export responses exclude guild audit targets, user preferences/usage, private community policy, inputs, secrets, and blocker identities. Recovery history identifies the selected source/current new manifest without implying rollback of external effects.

QAD-234 provider-recommendation set/clear is community application configuration. Its audit entry records actor, guild, normalized exact shared name, selected stable provider/application/command identity, before/after state, config version, and operation ID. It never records or exposes any user's explicit preference, favorites, hidden state, passive usage, or whether a particular user followed the recommendation. Ranking/selection/invocation creates no recommendation-specific guild audit row.

QAD-235 contextual counts, navigation, filtered reads, browser history, and focus restoration create no guild audit entry. A policy mutation reached through the link is the ordinary Integrations mutation and produces exactly its existing audit record—never a role/channel-page duplicate. Telemetry retains only bounded source type and navigation/result class, without guild/role/channel/application/command IDs, counts as identifying labels, policy membership, or input/configuration values.

A future QAD-237 SDK may expose typed fields for application-supplied public reason/causal inputs only where the public endpoint already permits them. It cannot write guild audit rows, choose allowlisted native-operation fields, fabricate server attribution/actor/authority, or treat a local log as Fluxer audit. Its default diagnostics retain the same raw-value/secret prohibitions as this contract.

## Visibility and retention

- Retain application-attributed guild audit rows for the existing 45 days.
- Community owner/`Administrator` and members with `VIEW_AUDIT_LOG` see native action entries.
- `Manage Guild` without `VIEW_AUDIT_LOG` sees only installation/command/configuration activity that the same permission authorizes, not moderation action history.
- Application developers receive delivery/trace status in their developer tooling but no guild audit targets, reasons, or human identity merely because they own the app.
- Instance administrators require the existing `guild:audit_log:view` ACL for guild audit data; broader job/application ACLs do not imply it.
- Data export follows the same audience and TTL; no permanent developer copy is created by Fluxer.

## Partial actions and compensation

One interaction/native-action request has a `causation_id`. Every independently committed native effect gets its ordinary action entry with sequence and attribution. A final summary entry records `SUCCEEDED`, `FAILED`, or `PARTIAL` with allowlisted counts/codes.

Compensation never rewrites history. It creates new linked entries with `COMPENSATED` or `COMPENSATION_FAILED`, identifying the original log/effect. Reconciliation can append a later terminal summary. UI groups the causation chain while preserving the append-only record.

An action rejected before any native effect is normally an interaction delivery/result metric rather than a community audit entry. Security-relevant confirmed attempts may receive a failed summary under an explicit native-operation policy, without raw arguments.

## Evidence

- Current guild audit rows have Snowflake `log_id`, guild, user, target, numeric action, reason, options, and JSON changes.
- Current query tables denormalize by guild/user/action and apply a 45-day TTL in `GuildModerationRepository`.
- Current `GuildAuditLogService` generates a fresh Snowflake then dispatches; retry-safe application effects require the accepted preallocated effect identity.
- Current `GuildAuditLogService`/`GuildModerationRepository.batchDeleteAndCreateAuditLogs` can group message-deletion entries by deleting originals and inserting a bulk replacement, so causal rows require the explicit compaction exclusion above rather than inheriting a false append-only guarantee.
