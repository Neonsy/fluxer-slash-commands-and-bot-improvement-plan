# Command Contracts

The command registry does not exist yet. Its rules cover registration, identity, schemas, publication, discovery, preferences, policy, errors, and rate limits.

The [orientation](../guide/01-orientation.md) provides the product context. The [glossary](glossary.md) defines the recurring terms used in this contract.

## What commands this covers and how they are identified

The initial platform supports only community-installed chat-input application commands.

One application owns one application-wide schema for each stable command. The stable public resource identity is a Fluxer Snowflake. Stable semantic identity is `(application_id, developer_key)`.

The developer key:

- Is immutable and scoped to its application
- Is 1 to 64 ASCII lowercase letters, digits, `_`, or `-`
- Begins with a letter or digit
- Is distinct from the mutable visible command name

Community configuration and user preference always reference application and command IDs. Display name, alias, localization, array order, or handle reuse cannot retarget stored state.

An application may retain at most **1,000 command identities**. Inactive identities count until explicit retirement completes. Retirement requires absence from retained manifests, community configuration, user preferences, active interactions, and every other reference. A later use of the same developer key receives a new command ID and inherits nothing.

## Registration routes

The compatible application-wide routes are:

```text
GET    /applications/{application_id}/commands
POST   /applications/{application_id}/commands
PUT    /applications/{application_id}/commands
GET    /applications/{application_id}/commands/{command_id}
PATCH  /applications/{application_id}/commands/{command_id}
DELETE /applications/{application_id}/commands/{command_id}
```

The community-scoped compatibility routes are:

```text
GET    /applications/{application_id}/guilds/{guild_id}/commands
POST   /applications/{application_id}/guilds/{guild_id}/commands
PUT    /applications/{application_id}/guilds/{guild_id}/commands
GET    /applications/{application_id}/guilds/{guild_id}/commands/{command_id}
PATCH  /applications/{application_id}/guilds/{guild_id}/commands/{command_id}
DELETE /applications/{application_id}/guilds/{guild_id}/commands/{command_id}
```

Only command type `1`, chat input, is initially accepted. User, message, Activity, direct-message, group-DM, global, and user-installed contexts are unavailable and stop before interaction creation.

### One application schema across communities

Application-wide registration publishes the authoritative schema and defaults new commands to all active installations.

A community route is a compatibility view over the same command:

- Identical create or edit adds or preserves that community as a target
- A different definition for an existing stable key returns `COMMAND_SCHEMA_CONFLICT`
- Community delete removes only that community target
- Community bulk overwrite replaces only that application's targets in that community
- Community GET returns commands targeted to that community subject to developer availability, not local invocation policy

Fluxer never forks a command schema per community. Applications that need different structures use distinct stable commands.

### How compatible command IDs map

Fluxer adds optional `key` to command request and response objects.

- Native Fluxer tooling supplies it on first creation.
- A compatible client that omits it receives a deterministic key derived from the initial name, with a suffix on collision.
- The generated key is returned and remains immutable.
- POST preserves compatible type and current-name upsert behavior, including `201` for create and `200` for update.
- PATCH addresses the command ID.
- Bulk overwrite matches explicit key first, then current type and name for compatibility.
- An unmatched rename without a key is a new command. Fluxer does not guess identity.

## How publication works

Definitions, command revisions, category revisions, manifests, and manifest entries are immutable. A single manifest head selects the complete manifest that services and clients read as current.

Publication order is:

1. Reserve stable command and category IDs through conditional insert
2. Validate the complete canonical candidate
3. Compare canonical bytes with the current head after normalization
4. Return unchanged when equal
5. Write immutable command and category revisions
6. Write the complete immutable manifest and entry partitions
7. Compare-and-set the manifest head using the expected prior revision
8. Emit one deterministic event keyed by manifest ID

Rows written before a failed head update remain unreachable and may be collected after a safety window. A reconciler never chooses between valid heads or synthesizes a partial head.

### Publishing an unchanged definition

Semantic equality includes every active identity, definition, target, authority, category, and lifecycle field after the same default filling and canonical ordering used for serialization. Fields whose order affects behavior keep that order. Hash equality is followed by exact canonical-byte comparison.

Publication-only IDs, timestamps, actors, revision counters, and mode are excluded from semantic equality.

An unchanged request:

- Returns the compatible current resource and status
- Adds `Fluxer-Publication-Status: unchanged`
- Consumes its route budget
- Creates no new revision, manifest, publication event, audit row, request-history row, or cache invalidation
- Does not clear or duplicate existing approval state
- Still returns an explicit conflict when the caller supplied a stale expected version

## How long manifests and drafts are kept

The registry retains the newest **20 manifests** plus at most **5 additionally pinned manifests**. Temporary retention beyond that is allowed only while an in-flight operation references a manifest.

Cleanup requires a current reference check and never removes the current head or a still-referenced command identity.

One optional draft exists per application. It has one base manifest revision, draft ID, version, canonical hash, validation state, sanitized path errors, and complete candidate entries.

- Edits conditionally advance draft version.
- A changed live head causes publish conflict.
- Fluxer does not field-merge or automatically rebase a candidate.
- Full validation precedes immutable writes and the one head update.
- An unchanged draft remains until explicit edit or discard.

Recovery revalidates a retained manifest and republishes its registry content as a new head. It never rewinds history or claims to roll back application code, external data, messages, community policy, completed interactions, or effects.

## Command schema limits

Initial code-defined limits are:

| Field or collection | Limit |
| --- | --- |
| Active chat-input commands per application | 100 |
| Active command categories | 25 |
| Lifetime-reserved category keys | 100 |
| Category label | 1 to 32 characters |
| Developer key | 1 to 64 characters |
| Command name or community alias | 1 to 32 characters using compatible chat-input grammar |
| Command or option description | 1 to 100 characters |
| Options at each permitted level | 25 |
| Nesting | Command, optional group, subcommand, then value options only |
| Choices per option | 25 |
| Choice display name | 1 to 100 characters |
| String choice value | 1 to 100 characters |
| String input | 0 to 6000 characters within declared bounds |
| Integer | JavaScript safe-integer range |
| Number | Finite IEEE-754 double within compatible range |
| Localizations per localizable field | At most one for each current `AllLocales` entry, currently 34 |
| Counted command text | 8000 characters using longest effective localization |
| Canonical command definition | 512 KiB UTF-8 |
| Complete canonical manifest or draft | 8 MiB UTF-8 and 100 commands |
| Target changes in one request | 1000 communities |

Required options precede optional options. A level contains subcommands or value options, never both. Sibling normalized names are unique. Choices and autocomplete are mutually exclusive. Bounds must match type and satisfy minimum not greater than maximum. JSON integers are precision-checked before conversion.

## Selecting more than one resource

`USER`, `ROLE`, `CHANNEL`, and `MENTIONABLE` may add:

```text
multi_value: {min_values?, max_values}
```

`min_values` defaults to 1. Both values satisfy `1 <= min_values <= max_values <= 50`. The option's ordinary `required` field controls whether the entire option may be absent. A present collection is never empty.

Fluxer reserves option type **1000** as `TARGET`, which accepts users, roles, and channels.

- Collection order is preserved.
- Duplicate typed identities are invalid.
- `USER`, `ROLE`, and `CHANNEL` elements are Snowflake strings.
- `MENTIONABLE` elements are `{type: USER | ROLE, id}`.
- `TARGET` elements are `{type: USER | ROLE | CHANNEL, id}`.
- Static choices are not accepted for these resource collections.
- Native access-filtered search is the default.
- Application autocomplete must be explicitly enabled and its results are revalidated and access-filtered.

The extension requires `fluxer.commands.multivalue.v1` from both the invoking client and the active application transport. Missing support creates no interaction and never coerces a collection into a scalar.

## Options that depend on other options

One `relationships` array may exist beside a command or subcommand's sibling value options. It supports:

```text
required_if
visible_if
conflicts_with
```

Predicates use `is_set`, `is_unset`, or typed `equals` against a distinct sibling option. Presence includes `false`, zero, and an allowed empty string. `equals` accepts only an exact scalar value valid under the referenced `STRING`, `INTEGER`, `BOOLEAN`, or `NUMBER` schema. It performs no coercion.

Each affected option has at most one required rule and one visibility rule. Each conflict contains exactly two distinct sibling keys and is unordered. Registration rejects:

- Self, missing, or cross-branch references
- Duplicate entries or conflict pairs
- Invalid predicate types
- Directed required or visibility cycles
- Required-hidden or otherwise statically unsatisfiable combinations
- A conflict between two unconditionally required options

The array has at most **350 entries**, composed of up to 25 required rules, 25 visibility rules, and 300 unique pairs. Submission evaluates the complete graph. No rule takes precedence. Errors are ordered by option declaration, capped at 100, and reveal stable option keys and safe reasons only.

This feature requires the client capability `fluxer.commands.conditions.v1`. The accepted application payload remains the ordinary validated option data and contains no relationship graph.

## Date and time options

Fluxer permanently reserves:

```text
1001 DATE
1002 INSTANT
1003 LOCAL_DATETIME
1004 DURATION
```

Canonical values are:

- `DATE` is valid proleptic Gregorian `YYYY-MM-DD` in years 0001 through 9999.
- `INSTANT` is UTC `YYYY-MM-DDTHH:mm:ss.SSSZ`. Offsets and omitted milliseconds are rejected.
- `LOCAL_DATETIME` is local `YYYY-MM-DDTHH:mm:ss.SSS` plus canonical IANA zone, resolved offset, and canonical instant.
- `DURATION` is an integer millisecond count from zero through `Number.MAX_SAFE_INTEGER`.

Temporal options reject choices, autocomplete, and multi-value. They support same-type bounds. `DATE`, `INSTANT`, and `LOCAL_DATETIME` support `time_direction` of `ANY`, `PAST`, or `FUTURE`. `INSTANT` and `LOCAL_DATETIME` support minute, second, or millisecond precision. Coarser precision requires lower fields to be zero and never rounds. Duration supports a positive safe-integer `step_ms`.

`LOCAL_DATETIME` may fix a canonical IANA zone of 1 to 255 ASCII characters. Otherwise resolution precedence is:

1. Explicit picker selection
2. Saved account timezone
3. Saved community timezone
4. Require explicit selection

The verified baseline supplies no general account or community fallback for ordinary users. Fluxer never guesses a device zone, locale, gap resolution, or overlap occurrence. A client submits its previewed local, zone, offset, and instant tuple. Any server-current mismatch requires visible reconfirmation before interaction creation.

Temporal definitions require `fluxer.commands.temporal.v1` on both client and application transport.

## Categories

An optional manifest-level category registry defines immutable keys, stable IDs, localized labels, and developer order.

- At most 25 categories are active.
- At most 100 keys may ever be reserved.
- Keys use the developer-key grammar and are never reused during the application's lifetime.
- A command belongs to zero or one active category.
- Category membership never changes invocation path.
- Missing, dormant, or foreign category references reject publication.
- Default and effective localized category names are unique after normalization.

Communities may disable one category through one versioned policy row. The deny applies to current and later members. A per-command enable cannot override it. Rename and reorder preserve identity. Removing and later reactivating the same key restores the retained community row.

## Localization

Applications own command, option, choice, and category localizations. Platform catalogs never synthesize application text.

- Locale keys must be values from the shared locale registry.
- Default text is mandatory fallback.
- Rendering uses exact account locale, then default.
- Every localized field independently satisfies length and grammar.
- Effective command and sibling option names remain unique for every supplied locale.
- Localization-only edits create a command revision but not a new schema version.
- Search indexes default and localized text, boosting active locale while retaining default-name matching.

## Changing a command schema

Every option, subcommand, and group has an immutable key scoped to its parent. Choice identity is typed value, not label.

Each command revision carries:

- `command_revision` for every change
- `schema_version` for accepted-shape or validation changes
- `authority_revision` for execution mode, native permissions, operations, or authority constraints

Presentation text, localization, stable-key order, developer availability, targeting, and category presentation or membership do not invalidate an open form. Structural changes advance schema version.

On stale submission, the server returns `COMMAND_SCHEMA_STALE` and does not deliver an interaction. The client:

1. Loads the current schema
2. Maps path and fields by immutable keys
3. Retains only same-type values that remain valid under current bounds, choices, temporal resolution, context, access, permissions, and relationships
4. Preserves visible collection chips for correction without partially delivering them
5. Marks removed, newly required, hidden-populated, conflicting, or invalid fields
6. Requires explicit resubmission

Fluxer never coerces types, wraps scalar into collection, selects one collection item, truncates a collection, clears a newly hidden populated value silently, chooses one side of a conflict, or automatically invokes a rewritten request.

Interactions already accepted under an older revision retain that revision, subject to current lifecycle and authority revalidation.

## Availability and community policy

Effective availability requires all of:

- Active unsuspended installation
- Developer-enabled command
- Current manifest membership
- Current community targeting
- Supported context and integration type
- Required client and application capabilities
- Category not disabled
- Command not disabled by community
- Reviewed current authority where required
- Current invocation audience and channel policy

Community owner, `Administrator`, and `Manage Guild` may configure commands. `Manage Roles` alone is insufficient.

Community configuration supports enablement, an alias unique within the application, audience and channel policy, authority review, reset, and discoverability preview. Reset clears every community-owned override while preserving developer policy. Reset may target one command or all application commands and requires explicit confirmation for bulk scope.

Owners and administrators may bypass community invocation restrictions where the approved local policy says so. That bypass never overrides installation, suspension, targeting, developer disablement, category deny, component audience, capability, current endpoint permission, hierarchy, or native-action authorization. Category deny is absolute, including for owners and administrators.

## How commands declare authority

Compatible command fields remain:

```text
default_member_permissions
contexts
integration_types
nsfw
```

Fluxer adds:

```text
key
execution_mode: AS_USER | AS_BOT | REQUIRE_BOTH
allowed_native_operations
default_invocation_policy
authority_revision
authority_hash
```

A compatible request with no Fluxer authority fields normalizes to `AS_BOT` and an empty operation list. The bot receives the interaction and may use ordinary bot REST as the bot principal.

A nonempty operation list explicitly enables the structured broker. When execution mode is omitted in that case, it normalizes to `AS_USER`. `AS_BOT` and `REQUIRE_BOTH` broker use must be explicit.

The spellings `DELEGATED`, `BOT`, and `BOTH` are rejected. They are not aliases.

`default_member_permissions` is the compatible alias for the required-permissions part of default invocation policy. Conflicting simultaneous values are rejected. Operation names come only from the reviewed registry. Inclusion creates a review ceiling, not effect authority.

## Showing the right application for a command

Native and application commands share one `CommandDiscoveryEntry` union, but native commands remain code-owned and outside application persistence.

Native handlers preserve existing behavior and server authorization. Application policy cannot modify native commands, and third-party hiding cannot hide them. Server execution never routes to a native handler by name.

Every command has a qualified form:

```text
/<application_handle>:<developer_key>
```

The first colon separates handle and key. Parsing then resolves immutable application and command identities. Qualified spelling bypasses friendly-name collision only.

For a duplicate shared name, ranking precedence is:

1. Current availability filtering
2. Explicit applicable user provider preference
3. Favorites
4. Community provider recommendation
5. Passive usage and deterministic baseline ordering

Only an explicit user preference may auto-resolve a collision. Community recommendation changes ordering but never selection. Picker cards show application attribution and bind IDs without rewriting typed text.

The exact collision presentation cannot be selected until a real composer prototype provides keyboard, screen-reader, and narrow-viewport evidence. Grouping, cycling, and preference-control visuals are not fixed by the protocol contract.

## Saving and removing user preferences

| Preference | Scope and behavior |
| --- | --- |
| Favorite | Account-wide and ranks inside the favorite tier by usage |
| Hidden | Account-wide, discovery-only, reversible, and does not delete other state |
| Provider preference | Global default with per-community override, explicit identity only |
| Alias presentation | Global default with per-community override |
| Passive usage | Per user, community, application, and command |

Passive usage stores only a bounded ranking signal and `last_used_at`. It never stores arguments, values, content, or recallable history. Successful invocation refreshes a sliding **90-day inactivity TTL**. Expired rows stop ranking before physical cleanup.

Reset command ordering deletes passive rows for the selected community without changing favorites, hidden state, alias presentation, or provider preference. Leaving a community deletes that user's community-scoped rows. Account and community deletion remove their applicable rows.

## Command errors

Errors retain Fluxer's `{code, message, ...typed_data}` shape. Field validation uses `INVALID_FORM_BODY` or `VALIDATION_ERROR` with bounded path entries. Clients branch on stable codes.

Key domain errors include:

| HTTP | Code | Meaning |
| --- | --- | --- |
| 404 | `UNKNOWN_APPLICATION_COMMAND` | No visible command |
| 409 | `COMMAND_KEY_CONFLICT` | Stable key belongs to another command for this owner |
| 409 | `COMMAND_NAME_COLLISION` | Visible same-provider name conflict |
| 409 | `COMMAND_ALIAS_COLLISION` | Community alias conflict |
| 409 | `COMMAND_SCHEMA_CONFLICT` | Community compatibility write differs from global schema |
| 409 | `COMMAND_SCHEMA_STALE` | Submission uses stale schema |
| 409 | `COMMAND_MANIFEST_CONFLICT` | Published head changed |
| 409 | `COMMAND_DRAFT_CONFLICT` | Draft ID or version changed |
| 409 | `COMMAND_CONFIG_CONFLICT` | Community configuration changed |
| 409 | `COMMAND_RETIREMENT_BLOCKED` | Safe blocker categories and counts remain |
| 400 | `COMMAND_PROVIDER_RECOMMENDATION_INVALID` | Not a current exact-name collision or selected provider invalid |
| 400 | `COMMAND_UNSUPPORTED_TYPE` | Type is outside initial scope |
| 400 | `COMMAND_CONTEXT_UNAVAILABLE` | Context is unavailable |
| 400 | `COMMAND_OPTION_VALUES_INVALID` | Collection count, duplicate, type, or safe target failure |
| 400 | `COMMAND_OPTION_RELATIONSHIP_INVALID` | Required, hidden, or conflicting option state |
| 400 | `COMMAND_TEMPORAL_VALUE_INVALID` | Format, range, precision, direction, zone, gap, overlap, or resolution failure |
| 403 | `COMMAND_DEVELOPER_DISABLED` | Developer disabled the command |
| 403 | `COMMAND_COMMUNITY_DISABLED` | Community disabled the command |
| 403 | `COMMAND_CATEGORY_DISABLED` | Category deny applies |
| 404 | `COMMAND_NOT_TARGETED` | Community is not targeted |
| 403 | `COMMAND_APPROVAL_REQUIRED` | Current authority revision requires review |
| 403 | `APPLICATION_INSTALLATION_INACTIVE` | Relationship cannot act |
| 403 | `APPLICATION_SUSPENDED` | Applicable suspension blocks authority |

Submission errors use stable, audience-safe reasons inside `typed_data`:

| Error | Safe reasons |
| --- | --- |
| `COMMAND_PROVIDER_RECOMMENDATION_INVALID` | `NOT_A_COLLISION`, `NAME_MISMATCH`, `PROVIDER_UNAVAILABLE`, `IDENTITY_INVALID` |
| `COMMAND_OPTION_VALUES_INVALID` | `TOO_FEW`, `TOO_MANY`, `DUPLICATE`, `DISALLOWED_TARGET_TYPE`, `TARGET_UNAVAILABLE` |
| `COMMAND_OPTION_RELATIONSHIP_INVALID` | `CONDITIONALLY_REQUIRED`, `HIDDEN_VALUE`, `CONFLICT` |
| `COMMAND_TEMPORAL_VALUE_INVALID` | `INVALID_FORMAT`, `INVALID_CALENDAR_VALUE`, `OUT_OF_RANGE`, `OVERFLOW`, `PRECISION_MISMATCH`, `PAST_REQUIRED`, `FUTURE_REQUIRED`, `TIME_ZONE_REQUIRED`, `UNKNOWN_TIME_ZONE`, `NONEXISTENT_LOCAL_TIME`, `AMBIGUOUS_LOCAL_TIME`, `RESOLUTION_CHANGED` |

When a Fluxer extension is unavailable, ordinary discovery omits the command. Exact lookup or a saved link may return `CLIENT_UPDATE_REQUIRED` or the applicable safe application-unavailable result. It never exposes the same command with its unsupported semantics removed.

Target, policy, category, and blocker detail is returned only to its authorized audience. Hidden or inaccessible resources return the same unavailable result without revealing private details. Errors never echo raw submitted temporal values, option values, or another user's preference.

## Rate and resource limits

| Operation | Planned default |
| --- | --- |
| Command and manifest reads | 60 per minute per actor and application |
| Immediate POST, PATCH, DELETE, or PUT publication | 30 per minute per application |
| New stable command identities | 200 per day per application, in addition to publication limit |
| Draft edits | 30 per minute per application |
| Complete draft validation | 30 per minute per application |
| Draft or recovery publish | 10 per minute per application |
| Target mutation | 10 per minute per application and 1000 target changes per request |
| Community command configuration | Existing guild baseline of 20 per 10 seconds per user, community, and application |
| Autocomplete | 60 per 10 seconds per user and installation |
| Aggregate interaction delivery | 500 per 10 seconds per installation |

Bot-token registration also consumes the ordinary bot-global 50 requests per second. Invalid, stale, duplicate, unauthorized, and unchanged requests consume their ordinary buckets.

Manifest publication has an 8 MiB canonical cap and 16 KiB framing allowance. A single definition has a 512 KiB cap and 16 KiB framing allowance. Excess is rejected before JSON parsing. Bot-platform JSON does not accept compression initially.

Autocomplete returns at most **25 suggestions** and **64 KiB** canonical payload. At most two autocomplete requests are pending per user and application and 50 per installation. Newer input makes older results ineligible for display.

## Required release checks

Implementation must prove:

- Stable identity under rename, delete, dormancy, retirement, reinstall, and handle reuse
- One complete application-wide schema across community route create, overwrite, delete, and concurrent publication
- Immutable candidate and one-head visibility under interruption and database compare-and-set races
- Canonical equal and near-match no-op behavior with zero unintended side effects
- Every schema boundary at and one beyond its limit
- Stale-form mapping without coercion, truncation, hidden clearing, automatic merge, or delivery
- Capability, relationship, temporal, category, localization, policy, and targeting enforcement before interaction creation
- Deterministic provider selection and no mutable-name routing between native and application handlers
- Synchronized preference ownership, 90-day passive expiry, reset, leave, deletion, and privacy behavior
- Exact structured error audience and rate charging
- Real-composer keyboard, screen-reader, focus, IME, and narrow-layout evidence before collision UI approval
