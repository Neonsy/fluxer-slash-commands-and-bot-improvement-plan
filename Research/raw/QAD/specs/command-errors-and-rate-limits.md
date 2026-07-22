# Command Errors and Rate Limits

Status: repository-derived decision under QAD-145, QAD-171, and QAD-172, extended by QAD-227 through QAD-235 and the deferred QAD-237 consumer boundary.

## Error envelope

Command endpoints retain Fluxer's existing JSON error contract:

```json
{
  "code": "COMMAND_SCHEMA_STALE",
  "message": "The command schema changed. Review the updated fields and submit again.",
  "...typed_data": "..."
}
```

Field validation retains `INVALID_FORM_BODY`/`VALIDATION_ERROR` with `errors: [{path, code, message}]`. Messages are safe display fallbacks; clients branch on stable uppercase codes and typed data.

## Domain error catalog

| HTTP | Code | Typed data / use |
|---|---|---|
| 404 | `UNKNOWN_APPLICATION_COMMAND` | `application_id`, `command_id` when safe |
| 409 | `COMMAND_KEY_CONFLICT` | `key`, existing `command_id` for owning developer only |
| 409 | `COMMAND_NAME_COLLISION` | normalized name, type, conflicting command IDs visible to caller |
| 409 | `COMMAND_ALIAS_COLLISION` | guild/application, alias, conflicting command ID; manager-only detail |
| 409 | `COMMAND_SCHEMA_CONFLICT` | command ID/current revision/hash when a guild compatibility write differs from the application-wide schema |
| 409 | `COMMAND_SCHEMA_STALE` | current command revision/schema version plus sanitized keyed structural diff |
| 409 | `COMMAND_MANIFEST_CONFLICT` | expected and current manifest revision; refetch required |
| 409 | `COMMAND_DRAFT_CONFLICT` | expected/current draft ID and version |
| 409 | `COMMAND_CONFIG_CONFLICT` | expected/current community command-config version; refetch required |
| 409 | `COMMAND_RETIREMENT_BLOCKED` | owning developer sees only bounded blocker categories/counts, never another user's identity/value |
| 400 | `COMMAND_PROVIDER_RECOMMENDATION_INVALID` | manager-only safe reason `NOT_A_COLLISION`, `NAME_MISMATCH`, `PROVIDER_UNAVAILABLE`, or `IDENTITY_INVALID` |
| 400 | `COMMAND_UNSUPPORTED_TYPE` | supplied type and supported types |
| 400 | `COMMAND_CONTEXT_UNAVAILABLE` | requested context; initial valid context is guild |
| 400 | `COMMAND_OPTION_VALUES_INVALID` | stable `option_key`, audience-safe reason `TOO_FEW`, `TOO_MANY`, `DUPLICATE`, `DISALLOWED_TARGET_TYPE`, or `TARGET_UNAVAILABLE`; value/index detail only when safe |
| 400 | `COMMAND_OPTION_RELATIONSHIP_INVALID` | ordered bounded `errors` containing stable option keys and safe reason `CONDITIONALLY_REQUIRED`, `HIDDEN_VALUE`, or `CONFLICT`; never submitted values |
| 400 | `COMMAND_TEMPORAL_VALUE_INVALID` | stable `option_key` and safe reason `INVALID_FORMAT`, `INVALID_CALENDAR_VALUE`, `OUT_OF_RANGE`, `OVERFLOW`, `PRECISION_MISMATCH`, `PAST_REQUIRED`, `FUTURE_REQUIRED`, `TIME_ZONE_REQUIRED`, `UNKNOWN_TIME_ZONE`, `NONEXISTENT_LOCAL_TIME`, `AMBIGUOUS_LOCAL_TIME`, or `RESOLUTION_CHANGED`; never raw value |
| 403 | `COMMAND_DEVELOPER_DISABLED` | no sensitive detail |
| 403 | `COMMAND_COMMUNITY_DISABLED` | guild/command; manager settings link capability only for authorized managers |
| 403 | `COMMAND_CATEGORY_DISABLED` | generic unavailable for ordinary callers; stable category ID/name and manager settings link only for authorized managers |
| 404 | `COMMAND_NOT_TARGETED` | ordinary callers receive generic unavailable; developer/manager may receive targeting detail |
| 403 | `COMMAND_APPROVAL_REQUIRED` | current/pending authority revision; full permission/operation diff only for authorized managers |
| 403 | `APPLICATION_INSTALLATION_INACTIVE` | safe installation state category, not internal cleanup detail |
| 403 | `APPLICATION_SUSPENDED` | suspension scope and public reference; internal reason only to instance admins |
| 403 | existing `MISSING_PERMISSIONS` | required native permission may be returned only when safe to reveal |
| 429 | existing throttling contract | standard limit, remaining, reset, retry headers/data |

User-hidden commands do not produce a server error because hiding affects picker discovery only. Direct invocation proceeds through ordinary availability/authorization.

Definition-time `multi_value` mistakes use existing path-aware validation. `COMMAND_OPTION_VALUES_INVALID` covers submission-time collection validation and races; `TARGET_UNAVAILABLE` intentionally merges deleted, inaccessible, and hidden targets. The complete submission fails before interaction delivery—there is no partial-success response. A client lacking `fluxer.commands.multivalue.v1` receives an unavailable catalog item with `CLIENT_UPDATE_REQUIRED` only on exact lookup/deep link; ordinary discovery omits it and the server never accepts a scalar downgrade.

Definition-time relationship shape, reference, type, duplicate, cycle, and satisfiability failures use existing path-aware validation. At submission, every applicable accepted relationship must pass; none has precedence. `COMMAND_OPTION_RELATIONSHIP_INVALID.errors` follows option declaration order, is capped by the existing 100-error response bound, and identifies only actionable option keys/reasons. The bot receives no interaction. A client lacking `fluxer.commands.conditions.v1` receives `CLIENT_UPDATE_REQUIRED` only as an exact unavailable catalog state; ordinary discovery omits the command.

Definition-time temporal type/field/bound/timezone errors use path-aware validation. Submission-time temporal failure returns `COMMAND_TEMPORAL_VALUE_INVALID` without echoing the submitted date, zone, offset, instant, duration, or relative text. `RESOLUTION_CHANGED` instructs the client to display the server-current normalized result and obtain confirmation; it never auto-resubmits. A client/application missing `fluxer.commands.temporal.v1` receives the same safe exact unavailable/application-unavailable states used by other capabilities, not a scalar fallback.

Category key/label/localization/limit/reference errors use path-aware manifest validation. At invocation, category disable is checked before application delivery and returns only the same safe unavailable presentation as other policy gates; ordinary users do not learn dormant definitions or manager policy. Category toggles and other community command settings share `COMMAND_CONFIG_CONFLICT` and the existing guild mutation bucket. One toggle consumes one mutation and never fans out into per-command route charges.

## Initial route buckets

All values are code-defined defaults and return existing rate-limit headers.

| Operation | Bucket key | Limit |
|---|---|---|
| Command/manifest reads | authenticated actor + application | 60/minute |
| Immediate POST/PATCH/DELETE/PUT publication | application | 30/minute |
| New stable command identities | application | 200/day in addition to publication limit |
| Draft entry edits | application | 30/minute |
| Complete draft validation | application | 30/minute |
| Draft publish or later recovery publish | application | 10/minute |
| Target-list page mutation | application | 10/minute; max 1000 target changes/request |
| Community command-config mutation | user + guild + application | existing guild mutation baseline: 20/10 seconds |
| Autocomplete invocation | user + installation | already fixed at 60/10 seconds |
| All interaction delivery | installation | already fixed at 500/10 seconds |

Bot-token registration also consumes the normal bot-global 50 requests/second because it is an authenticated bot API, unlike token-scoped interaction responses.

Autocomplete returns at most 25 suggestions and a 64 KiB canonical response payload. Application-backed QAD-227 autocomplete includes only the current option path and bounded permitted ordered selections; native entity search does not contact the application. The three-second interaction acknowledgement deadline still applies. Invalid requests consume the same route budget; separate sustained-invalid/abuse enforcement is specified with operational protections.

A QAD-232 request whose fully validated canonical result equals the current head returns the current resource/status plus `Fluxer-Publication-Status: unchanged` without a new revision, but still consumes its route token. This is semantic equality, not idempotency-key replay. An explicit stale expected version still returns its ordinary 409 conflict. No-op metrics use bounded operation/auth/result classes without command/category names, IDs as labels, definitions, targets, or actor data.

QAD-233 dashboard list/history/health reads use the existing authenticated application read bucket and page at 50; validation/publish/target/retirement/recovery actions use their existing operation buckets rather than a dashboard bypass. Authorization loss/deletion returns the existing audience-safe unknown/forbidden behavior. Suspended applications may perform only the safe reads and credential/transport repair allowed by the suspension contract; publication keeps `APPLICATION_SUSPENDED`.

QAD-234 recommendation mutations use the existing 20/10-second user+guild+application-configuration budget and `COMMAND_CONFIG_CONFLICT`; validation never echoes another user's preference/usage or unavailable private command detail. QAD-235 contextual summary/navigation uses the existing authenticated settings-read budget. Failing the separate Integrations ACL returns no count or typed subject result; stale/deleted/lost-permission cases use existing safe unknown/forbidden/config-conflict behavior rather than a policy-enumeration error.

A future QAD-237 SDK exposes the original HTTP status, stable code, typed data, rate-limit headers, and publication-status header. Convenience errors may add typed accessors but never collapse stale/conflict/rate/terminal states into a generic success, discard retry timing, fabricate exactly-once behavior, or automatically retry an operation whose public idempotency/deadline contract is insufficient.

## Evidence

- `FluxerError` serializes `{code, message, ...data}` and `ValidationError` serializes path-level errors.
- Current developer application updates use 30/minute, ordinary guild mutations use 20/10 seconds, and developer resource reads use 60/minute.
- QAD-148 already fixes autocomplete at 60/10 seconds per user/installation and aggregate interaction delivery at 500/10 seconds per installation.
- Discord documents a 200 application-command-create daily limit per guild; Fluxer's one-schema model applies the compatible create ceiling to new stable identities per application instead of multiplying it by guild.
