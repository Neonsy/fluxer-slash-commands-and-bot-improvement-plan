# Delegated Native-Action Confirmation Policy

Status: accepted product/security contract under QAD-043, QAD-044, QAD-145, QAD-180, QAD-208, and QAD-209.

## Intent provenance

Every normalized security-relevant operation parameter is labeled by the broker as:

- `SUBMITTED`: exactly supplied through the user's structured interaction option/control;
- `DEFINITION_FIXED`: an immutable reviewed command/component value or safe server-derived value such as `target = invoker`;
- `SERVER_DERIVED`: calculated by Fluxer from a bound predicate, such as messages authored by the invoker inside an exact date range;
- `APPLICATION_SELECTED`: chosen or changed by the application after invocation.

The application cannot assign these labels. Fluxer derives them by comparing the request with the immutable authority definition and authenticated interaction data. A value that cannot be proven submitted/fixed/server-derived is application-selected. Unknown or malformed provenance fails closed.

## Confirmation classes

The required class is the maximum of the operation's registry floor and every normalized parameter/effect escalator. Applications may request more confirmation but cannot lower the class.

### Class 0 — exact direct execution

No additional post-submit prompt is required when all of these hold:

- one bounded target/effect;
- every security-relevant value is `SUBMITTED` or `DEFINITION_FIXED`;
- the operation creates no mass, permission/hierarchy/access, history-pruning, persistent-bearer, or high-impact deletion effect;
- the command picker/form already identifies the application, exact native operation, and invoker permission used.

Examples include an exact ban with no history deletion, unban, kick, timeout set/clear, nickname or voice moderation, one message/attachment deletion, reaction moderation, pin/unpin, metadata-only updates, and other reversible exact configuration changes.

Class 0 is not “trust the command name.” It requires a reviewed operation declaration, platform-rendered authority indication, exact parameter binding, current authorization at execution, and normal audit attribution.

### Class 1 — exact ephemeral confirmation

A platform-owned invoker-only ephemeral confirmation is mandatory when any security-relevant target or parameter is `APPLICATION_SELECTED`, or the application's action differs from what Fluxer can bind to the submitted/fixed intent.

The confirmation renders the actual normalized action, application identity, authority mode, target(s), important parameters, and consequence. Confirm/Cancel actions bind the exact capability and expire under the existing five-minute limit. Editing the pending request invalidates the confirmation rather than updating it in place.

Example: `/cleanup` supplies no message IDs and the application selects twelve messages. Fluxer shows those actual targets/scope before execution.

### Class 2 — high-impact ephemeral confirmation

High-impact confirmation is mandatory regardless of otherwise exact user intent for:

- any bulk or multiple-target mutation;
- ban message-history deletion or any predicate/range-based history deletion;
- permission bit, role membership set/replacement, hierarchy, or channel-overwrite changes;
- channel, role, webhook, emoji, sticker, or similarly durable community-resource deletion;
- persistent access-link creation such as an invite;
- any operation whose normalized effect crosses the code-defined mass/destructive threshold.

The platform first resolves as much exact scope as safely possible and shows target count, bounded range, destructive styling, irreversibility/partial-failure warning, and before/after permission or hierarchy diff where applicable. Confirmation still grants only the exact capability. It is not reusable authorization and does not replace direct MFA/sudo for operations that remain prohibited from delegation.

Example: `/nuke` has definition-fixed `author = invoker` and an exact submitted/default date range. Fluxer, not the application, resolves the matching message set, then shows an invoker-only summary such as “Delete 428 of your messages from July 1–18 in 3 channels?” with Delete/Cancel. Bulk impact therefore overrides otherwise exact provenance.

## Resolution and execution rules

- The confirmation UI is a Fluxer system surface and visually separates trusted operation facts from application-provided explanatory text.
- Mentions, labels, markdown, and application descriptions never determine risk or authority.
- Confirmation never expands an operation beyond its registered schema, command authority envelope, community approval, or invoker/bot current permissions.
- Current membership, permissions, hierarchy, target state, installation generation, suspension, authority revision, parameters hash, and expiry are revalidated after confirmation and immediately before effect.
- A target count or permission diff changing after preview invalidates the pending action; Fluxer does not execute a stale broader effect.
- Cancel, dismiss, expiry, uninstall, suspension, command disablement, or authority change makes the capability terminal.
- `AS_BOT` and `REQUIRE_BOTH` actions initiated through the structured broker use the same intent/risk confirmation policy. Autonomous backend calls remain ordinary bot actions and have no fictitious invoker confirmation.

## Registry floors and parameter escalators

- Ban/unban/kick, timeout, nickname, voice moderation, single message/attachment removal, reaction moderation, pin state, metadata-only channel/role/guild/expression/discovery updates, invite deletion, and safe exact resource creation may be Class 0 when fully bound.
- Role add/remove/replace, permission changes, role/channel hierarchy changes, channel overwrites, invite creation, all bulk variants, and durable resource deletion have a Class 2 floor.
- A ban escalates to Class 2 when message-history deletion is nonzero.
- Channel/role/guild update operations escalate to Class 2 when the normalized field diff changes permissions, access, hierarchy, or another registered high-impact field; broad request schemas are never assigned one static low class.
- Any Class 0 operation escalates to at least Class 1 when the application selects or changes a security-relevant value.
- Any Class 1 operation escalates to Class 2 when its resolved scope meets a high-impact rule.

These floors and escalators are code-defined registry metadata with conformance fixtures. A change is a reviewed security-policy change and cannot be delivered as application data.

## Current Fluxer evidence and classification

- Current guild/channel native services reauthorize the authenticated actor at execution but have no application interaction confirmation system.
- `GuildUpdateRequest` and `GuildMemberUpdateRequest` combine fields with different security effects, so risk must be computed from normalized field diffs rather than route names.
- Current bulk deletion of the authenticated user's own channel messages requires `SudoModeMiddleware`/direct sudo verification, demonstrating that Fluxer already treats bulk irreversible self-action as materially riskier than one deletion.
- Existing ephemeral and component decisions provide an invoker-only, dismissible, five-minute confirmation surface without broadcasting the prompt to the channel.

This **extends** current endpoint authorization with trusted intent and confirmation. It **preserves** direct reauthentication requirements by keeping those operations outside delegation, and it **intentionally avoids** both confirmation fatigue for exact single effects and silent execution for bulk/permission/destructive effects.

## Required validation

- provenance derivation/substitution tests for every operation schema;
- registry-floor and parameter-escalation table tests;
- exact single-action no-prompt tests proving trusted pre-submit disclosure;
- application-selected target/parameter confirmation tests;
- bulk self-message range/count confirmation and stale-count invalidation tests;
- before/after permission and hierarchy diff fixtures;
- confirm/cancel/dismiss/expiry/double-click/replay/race tests;
- app text versus platform fact rendering, accessibility, responsive layout, and secret/content redaction tests;
- bot/delegated/both-mode parity and proof that confirmation never bypasses current native authorization.
