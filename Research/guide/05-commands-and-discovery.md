# Commands and Discovery

## From a local command list to a provider-aware registry

Fluxer's current responsive web client has a fixed slash-command list. It filters those local entries by text, channel type, and client-side permission hints. Parsing and execution branch on hard-coded names such as `/kick`, `/ban`, and `/msg`.

That model has no third-party provider identity, immutable command key, typed application options, manifest, targeting, alias, community policy, favorite, hidden state, or duplicate-provider choice. The server still protects native effects through its normal API permission and hierarchy checks, but the picker itself is not an application-command platform.

The planned model keeps native commands code-owned and adds application commands through a shared discovery shape. A selected row always binds stable provider and command identity. Search text never becomes the dispatch key.

## What belongs to whom

| Owner | State it controls |
| --- | --- |
| Application developer | Stable command and category keys, command schema, display text, localizations, developer availability, targeting, execution mode, allowed native operations, and published manifests |
| Community manager | Local enablement, aliases, audience and channel rules, category disablement, authority review, reset, and one provider recommendation for an exact duplicate name |
| Community member | Favorites, hiding, explicit duplicate-provider preference, alias-presentation preference, and resettable passive ordering |
| Fluxer | Stable IDs, publication atomicity, current availability, capability intersection, schema validation, suspension, permission enforcement, rate limits, safe errors, and audit |

One layer cannot write another layer's state. A favorite cannot enable a command. A community alias cannot rename the developer definition. A manager cannot publish a new application schema. A developer cannot erase community policy through ordinary command deletion.

## Stable identity

Every application command has:

- One Fluxer command Snowflake used by compatible routes
- One immutable `developer_key` scoped to the application
- One mutable default display name
- Optional application-owned localizations
- Optional community aliases

The developer key uses 1 to 64 ASCII lowercase letters, digits, `_`, and `-`. Its first character must be a letter or digit.

A community alias is an additional shared invocation name. It never replaces the developer name, so both remain executable while otherwise available. Aliases must follow the command-name grammar and be unique within the application in that community. Public attribution shows the shared name the member actually invoked while retaining visible application identity.

A native Fluxer command has its own typed native provider identity. It is not stored as a fake application command and is not governed by installed-application policy.

The collision-free exact form is:

```text
/<application_handle>:<developer_key>
```

The first colon separates handle from key. Qualified resolution first finds the current handle owner, then resolves that application's key. It still applies every normal install, target, suspension, category, community, channel, audience, permission, and capability check.

## One schema for every community

One command key has one application-wide schema. Targeting decides where that schema is offered. It does not fork the definition.

This is a deliberate compatibility difference. Discord-shaped community routes remain available, but they are views over the one schema:

- Creating or editing an identical definition adds or preserves the community target
- A different definition for the same stable key returns `COMMAND_SCHEMA_CONFLICT`
- Deleting through a community route removes only that community target
- Bulk community overwrite replaces only the application's target set for that community
- Community GET returns commands targeted there, subject to developer availability, not the member's local invocation policy

An application that genuinely needs different structures must publish different stable commands.

Targeting has three canonical modes:

- `ALL_INSTALLED_COMMUNITIES` needs no per-community target rows
- `NONE` offers the command nowhere
- `SELECTED_COMMUNITIES` keeps explicit forward and reverse target rows

Only active installations may be newly targeted. A dormant target row can remain temporarily during reconciliation, but never grants availability by itself. Target pages change at most 1000 communities per idempotent request.

## Compatible registration routes

The initial API supports the familiar chat-input command routes.

Application-wide:

```text
GET    /applications/{application_id}/commands
POST   /applications/{application_id}/commands
PUT    /applications/{application_id}/commands
GET    /applications/{application_id}/commands/{command_id}
PATCH  /applications/{application_id}/commands/{command_id}
DELETE /applications/{application_id}/commands/{command_id}
```

Community-scoped compatibility views:

```text
GET    /applications/{application_id}/guilds/{guild_id}/commands
POST   /applications/{application_id}/guilds/{guild_id}/commands
PUT    /applications/{application_id}/guilds/{guild_id}/commands
GET    /applications/{application_id}/guilds/{guild_id}/commands/{command_id}
PATCH  /applications/{application_id}/guilds/{guild_id}/commands/{command_id}
DELETE /applications/{application_id}/guilds/{guild_id}/commands/{command_id}
```

Only chat-input type `1` is accepted initially. User, message, Activity, direct-message, global-app, and user-install commands return structured unsupported results instead of persisting definitions that Fluxer cannot invoke.

The owning bot token may register commands. The authenticated human application owner may use the developer dashboard. A future client-credentials scope can be designed separately. Community managers never gain schema-publication authority from their community role.

## Compatible key derivation

Fluxer adds optional `key` to command objects.

- Fluxer-native tooling must send it on first creation.
- A compatible client that omits it receives a normalized key derived from the first name.
- A deterministic suffix resolves key collision.
- The generated key is returned and remains immutable.
- POST keeps compatible type-plus-current-name upsert behavior and `201` create or `200` update status.
- PATCH addresses the stable command ID.
- Bulk overwrite matches explicit keys first, then unchanged type and current name for compatibility.
- A renamed keyless entry that cannot be matched safely becomes a new command rather than inheriting old policy by guesswork.

## Immutable publication

Every successful state-changing compatible mutation produces a complete immutable manifest behind an immediate-looking API.

1. Read the expected manifest head.
2. Resolve and conditionally reserve stable command and category identities.
3. Construct the complete candidate in memory.
4. Validate schema, limits, categories, authority, targets, and uniqueness.
5. Compare the canonical candidate with the current head.
6. Write changed immutable command and category revisions.
7. Write the complete immutable manifest and entry partitions.
8. Compare-and-set the head.
9. Emit one deterministic publication event.

Services and clients see only the complete manifest selected as current. A failed attempt to select a new manifest can leave unreachable immutable rows for later cleanup, but it cannot expose only part of that manifest.

A concurrent head change returns `COMMAND_MANIFEST_CONFLICT`. Fluxer does not rebase a partial PATCH or merge two manifests. Callers refetch and decide again.

## Semantically unchanged publication

A request that produces the exact current canonical state is a success no-op only after normal authentication, authorization, rate charging, parsing, validation, identity resolution, and precondition checks.

Equality includes all active identities, definitions, compatible defaults, localizations, the order of fields where order affects behavior, category registry and membership, developer availability, targets, and authority fields. Maps and sets are canonicalized where their order has no meaning. Exact bytes or objects are compared after a hash match. Hash equality alone never decides.

An identity allocation, dormant reactivation, target change, category change, or authority-review effect cannot be treated as unchanged. A stale explicit expected version remains a conflict even when the submitted content happens to match the new head.

An unchanged result returns the current object and revision with:

```text
Fluxer-Publication-Status: unchanged
```

It creates no revision, head, history row, audit row, catalog event, or cache invalidation. It still consumes the route token.

## Deletion, dormancy, retirement, and recovery

Ordinary command deletion removes the command from the current manifest and marks its stable identity dormant. It does not erase the key or community configuration. Re-registering the same key restores the same identity and dormant settings, subject to current authority review.

One application may retain at most 1,000 command identities. Inactive identities count until explicit owner-only retirement succeeds. Creation of identity 1,001 is rejected.

Retirement requires the command to be absent from the retained manifest window and to have no community configuration, user preference, active interaction, or other reference. Failure reveals only bounded blocker categories and counts to the owner, never another person's identity or values. Reusing the developer key after retirement creates a new command ID and inherits nothing.

The retained history is the newest 20 manifests plus at most 5 pinned manifests. Recovery validates selected retained content and publishes it as a new head. It does not undo backend code, external data, messages, community configuration, or completed interactions and effects.

## Initial schema limits

These are developer-visible code constants, not per-instance settings.

| Field or collection | Initial limit |
| --- | --- |
| Chat-input commands per application | 100 |
| Active categories per application | 25 |
| Lifetime-reserved category keys | 100 |
| Category label | 1 to 32 characters |
| Developer key | 1 to 64 characters |
| Command name | 1 to 32 characters using compatible chat-input grammar |
| Community alias | 1 to 32 characters using the same invocation grammar |
| Command or option description | 1 to 100 characters |
| Options at one level | 25 |
| Choices for one option | 25 |
| Selected values in one multi-value resource option | At most 50, with a declared maximum |
| Conditional relationships beside one sibling option list | 350 |
| String option value | 0 to 6000 characters, further bounded by its definition |
| Choice display name | 1 to 100 characters |
| String choice value | 1 to 100 characters |
| Localizations per field | One for each supported `AllLocales` entry, currently 34 |
| Counted command text | 8000 characters using longest effective localizations |
| Canonical serialized command | 512 KiB UTF-8 |
| Complete manifest or draft | 8 MiB UTF-8 and at most 100 commands |
| Target changes in one request | 1000 communities |

Nesting permits an optional subcommand group, then subcommand, then value options. It goes no deeper. A level contains either subcommands or value options, not both. Required options precede optional options. Sibling normalized names are unique. `choices` and `autocomplete` are mutually exclusive. Bounds inappropriate to a type are rejected. JSON integers must be within the JavaScript-safe integer range.

## Localizations

The application owns its command, option, choice, and category localizations. Fluxer's platform translation catalogs do not synthesize application text.

Locale keys must be supported Fluxer locale identifiers. Every localized value independently follows the default field's grammar and length. The non-localized value is mandatory and is the only fallback when an exact account locale is missing.

Effective names must remain unique for every supplied locale. Localization-only changes create metadata history but do not increment structural schema version or invalidate an open form. Search indexes both localized and default text while preserving provider identity.

## Fluxer command extensions

The compatible scalar command model remains valid on its own. Fluxer extensions are available only when the client and application support the required capability.

### Multi-value resources

`USER`, `ROLE`, `CHANNEL`, and `MENTIONABLE` options may declare a collection with `1 <= min_values <= max_values <= 50`. `TARGET`, permanent numeric type `1000`, accepts users, roles, and channels.

Order is preserved. Duplicate typed identities are invalid. A present collection cannot be empty and must satisfy its bounds. Native resource search is the default. Application autocomplete is explicit and its output is revalidated and access-filtered by Fluxer.

This extension requires `fluxer.commands.multivalue.v1` from both the client and the active application delivery transport. Missing capability never converts it to a scalar option. Ordinary discovery omits it and exact lookup shows an attributed update or unavailable state.

### Conditional option relationships

A sibling option list may define `required_if`, `visible_if`, and symmetric `conflicts_with` relationships by immutable option key. Registration rejects missing, self, cross-branch, duplicate, cyclic, type-invalid, or statically unsatisfiable graphs.

`is_set` checks presence, including `false`, zero, or an allowed empty string. It is not a truthiness test. `equals` requires exact type equality with no coercion.

The client uses the graph for presentation, but submission reevaluates the current server graph. A hidden option that already has input remains visible for correction. Fluxer never silently clears a newly hidden value or chooses one side of a conflict.

This extension requires `fluxer.commands.conditions.v1` from the client. Accepted interaction payloads retain the ordinary option shape, so no delivery capability is needed.

### Temporal options

Fluxer reserves:

```text
1001 DATE
1002 INSTANT
1003 LOCAL_DATETIME
1004 DURATION
```

`DATE` uses canonical Gregorian `YYYY-MM-DD` in years 0001 through 9999. `INSTANT` uses canonical UTC RFC 3339 with milliseconds. `LOCAL_DATETIME` combines canonical local text, an IANA time zone, resolved UTC offset, and resolved instant. `DURATION` uses nonnegative JavaScript-safe integer milliseconds.

The server does not round, clamp, infer browser locale, guess device timezone, shift through a daylight-saving gap, or choose one occurrence in an overlap. Missing zone context requires explicit selection. The current baseline gives ordinary users no saved account or community timezone fallback, so the initial picker must ask.

This extension requires `fluxer.commands.temporal.v1` from the client and active transport. Discord manifests need separately authored scalar alternatives. Fluxer does not treat automatic coercion as compatible behavior.

### Categories

An application may define stable categories with immutable keys and IDs. Each command belongs to zero or one active category. Category labels and order are presentation. They never affect identity or invocation path.

Community managers may disable a category. That one policy row denies current and future member commands atomically. A per-command enable cannot override a disabled category. Removing a category from the active manifest makes it dormant. Reactivating the same key restores the same identity and retained policy.

Older clients may render eligible commands flat. Ignoring grouping cannot bypass the server's category rule.

## Schema evolution and open forms

Each command carries three counters:

- `command_revision` increments for every published change
- `schema_version` increments when accepted input shape or validation changes
- `authority_revision` increments when execution mode, required native permission, allowed native operation, or related approval envelope changes

Presentation-only changes do not invalidate an open form. Structural changes do.

When a member submits a stale schema version, Fluxer creates no interaction. It returns `COMMAND_SCHEMA_STALE` with the current version and a sanitized keyed diff. The client then:

1. Matches the selected subcommand path and fields by immutable keys
2. Retains only same-type values that still pass current validation
3. Keeps unaffected fields
4. Visibly marks removed, invalid, newly required, hidden-populated, conflicting, or inaccessible values
5. Requires explicit resubmission

Type changes never coerce. Scalar and collection values never wrap, unwrap, truncate, or choose one element automatically. Local-time resolution changes require visible reconfirmation even when the command schema itself did not change.

An interaction already accepted under an older revision keeps that revision for attribution and completes under its captured authority, subject to current revocation and execution checks.

## Invocation policy and execution authority

The compatible command object keeps `default_member_permissions`, guild context `0`, guild installation type `0`, and `nsfw`. Fluxer adds the immutable key, one execution mode, a sorted allowed-native-operation list, a typed invocation default, and a versioned authority hash.

An ordinary compatible definition that omits every Fluxer authority field normalizes to:

```text
execution_mode: AS_BOT
allowed_native_operations: []
structured broker: disabled
```

The handler may use ordinary bot-authenticated routes. Those routes authorize the current bot and never infer the invoking member from the interaction.

A nonempty native-operation allowlist explicitly opts into the structured broker. If mode is omitted there, it normalizes to `AS_USER`. The only accepted and emitted modes are `AS_USER`, `AS_BOT`, and `REQUIRE_BOTH`. The draft names `DELEGATED`, `BOT`, and `BOTH` are invalid.

The allowlist is a review ceiling, not effect authority. Unknown operations reject publication. A later request must name an allowed operation, bind exact normalized parameters and target, negotiate the capability, and pass current broker and native endpoint checks.

Every execution-mode change makes the command unavailable in each community until the exact old and new modes are reviewed. The application defines the mode. A community can approve it or keep the command disabled, but cannot rewrite it.

| Transition | Required reviewer |
| --- | --- |
| `AS_USER` to `AS_BOT` | Community owner or `Administrator` |
| `AS_USER` to `REQUIRE_BOTH` | Community owner or `Administrator` |
| `REQUIRE_BOTH` to `AS_BOT` | Community owner or `Administrator` |
| `AS_BOT` to `AS_USER` | Community owner, `Administrator`, or `Manage Guild` |
| `AS_BOT` to `REQUIRE_BOTH` | Community owner, `Administrator`, or `Manage Guild` |
| `REQUIRE_BOTH` to `AS_USER` | Community owner, `Administrator`, or `Manage Guild` |

The stronger reviewer is required when a transition introduces bot authority or removes the invoking-user check from bot-authority execution. Approval changes no bot permission, hierarchy reach, operation grant, or supplemental role. A separate blocker can therefore keep the command unavailable after semantic review.

Changing mode, required native permission, allowed operations, or operation constraints increments `authority_revision`, changes the authority hash, and enters the applicable review path. Display, localization, category, and ordinary option presentation cannot smuggle an authority change because authority is stored and hashed in typed fields.

## When a command is actually available

At submission, the server checks every current condition:

- Developer availability
- Application and community targeting
- `ACTIVE` installation generation
- Application-wide and community-scoped suspension
- Client and application capability intersection
- Category deny
- Per-command community state
- Audience policy
- Channel policy
- Required native invocation permission
- Execution prerequisites
- Current schema and typed values

Both category and per-command disable deny. A local enable cannot override a developer disable or category deny.

Community owner and `Administrator` bypass only community-authored audience and channel restrictions. `Manage Guild` can edit those restrictions but receives no invocation bypass. No manager bypasses developer disablement, targeting, suspension, inactive installation, unsupported context, or final bot and native permission and hierarchy checks.

## Discovery and search

The picker query is scoped to member, community, channel, and locale. It searches:

- Effective and original command names
- Localizations
- Community aliases
- Command and option descriptions
- Application display names and handles
- Qualified handle and command forms

Comparison applies Unicode NFKC and locale-independent case folding without rewriting display text. Search never executes from a string result.

Relevance tiers are deterministic:

1. Exact qualified or effective name
2. Exact alternate, original, or alias
3. Effective-name prefix
4. Alternate or provider prefix
5. Token prefix
6. Substring
7. Description or fuzzy match

Within one tier, ordering uses:

1. Applicable explicit provider preference for the exact duplicate name
2. Favorite status and rank
3. Applicable community provider recommendation
4. Community-scoped passive usage score
5. Active-locale match
6. Normalized primary name
7. Application handle or provider type
8. Command Snowflake

Only explicit provider preference may automatically bind a duplicate. An unavailable explicit preference opens provider selection rather than falling through to recommendation-based dispatch. Favorites, recommendation, and usage only order visible choices.

Results page at 50 through opaque cursors. Cache keys include community, channel, locale, catalog version, command-config version, effective permission version, and preference version. A stale selection forces refresh and preserves typed text. It never invokes the cached identity.

## Favorites, hidden commands, and provider preferences

Members may:

- Favorite application commands account-wide
- Hide third-party commands account-wide
- Set a global provider preference for an exact duplicate name
- Override that provider preference in one community
- Choose global and per-community alias presentation
- Reset passive ordering in one community

Hiding affects discovery only. Direct or qualified invocation still runs normal availability and authorization. Hidden commands remain recoverable in User Settings. Native Fluxer commands cannot be hidden through this application-command control.

Passive usage stores only a bounded ranking signal and last-used time for a user, community, application, and command. It never stores arguments, values, message content, or a recallable history.

A successful invocation refreshes a sliding 90-day inactivity expiry. Leaving a community deletes that member's scoped passive rows. Reset ordering deletes them immediately without changing favorites, hiding, or explicit provider choices.

## Community command management

Community owner, `Administrator`, and `Manage Guild` can open the installed application's Integrations detail. The command view shows stable identity, category, developer state, targeting, local state, execution mode, authority review, alias, restrictions, dormant state, and override count.

The developer's invocation policy is the initial community default, not an immutable maximum. Authorized community managers may narrow or broaden user, role, and channel access. The evaluation order is exact:

1. An explicit rule for the invoking member overrides conflicting role rules.
2. Without an individual rule, any matching role deny wins over matching role allows.
3. When no role rule matches, the effective community or developer audience default applies.
4. The independent channel policy must also allow the invocation.
5. Owner and `Administrator` may bypass only the community-authored audience and channel result.
6. Current developer availability, targeting, suspension, installation, capability, and final execution checks still apply.

An application may add a stricter internal guard after delivery. It cannot use that guard to bypass Fluxer policy or substitute for native action authorization.

Managers can:

- Enable or disable one command locally
- Disable or clear one category deny
- Set a community alias unique within that application
- Configure user, role, channel, and native-permission invocation policy
- Review allowed authority changes within their permission tier
- Reset one command or all application commands
- Set or clear one provider recommendation for an exact shared name

Bulk enable or disable changes only community enablement. It skips rows blocked by developer state or authority approval and reports the result. Bulk reset requires a summary and explicit confirmation. No bulk operation silently changes managed-role permissions, execution mode, or native-operation approval.

All mutations use expected versions and write safe community audit data without command arguments. A category toggle writes one category policy effect. It does not claim to rewrite every member command.

### Role and channel entry points

Role and channel settings may show how many explicit command policies reference that stable role or channel, then link into the one authorized Integrations editor.

Source-page access does not grant command-policy access. The server separately requires community owner, `Administrator`, or `Manage Guild` before returning even a count. `Manage Roles` or channel-management permission alone is insufficient.

The count is not a claim about effective access. Other roles, individual rules, channel policy, owner or `Administrator` bypass, command availability, and final execution checks can change the actual result. The source page therefore performs no edit and stores no policy copy. Integrations reauthorizes, rereads current source versions, and owns every write, conflict, confirmation, audit event, and cache invalidation.

### Developer command dashboard

Only the current authenticated human application owner can open the developer command dashboard. A bot token retains registration API access but cannot authenticate that human interface.

The dashboard reads the canonical registry, draft, target, installation, suspension, and delivery-health services. It does not keep a second copy of that state. Its planned views cover current counts and the current manifest, commands and categories, draft validation, retained publications and recovery, and sanitized delivery health.

Exports contain only application-owned canonical registry and candidate metadata. They exclude credentials, signing material, interaction and modal values, user preferences and usage, private community audience policy, guild audit detail, and another person's identity. Suspension leaves only the safe reads and credential or transport repair allowed by the safety contract. Ownership loss or deletion revokes dashboard access immediately.

## Community-recommended provider

A community recommendation exists only when multiple visible providers expose the same exact normalized name. It is keyed by stable provider and command identity plus that shared name.

The recommendation ranks below explicit user provider preference and favorites, and above passive usage. It never auto-selects, changes authority, claims Fluxer endorsement, crosses an application filter, or makes an unavailable provider eligible.

A rename, uninstall, suspension, or temporary command absence makes the retained recommendation dormant. It resumes only when the same identity exposes the same name again. Permanent command retirement, application deletion, community deletion, or manager reset removes it.

## Accessibility and the duplicate-provider design

The current client already has an ARIA listbox, active descendant wiring, keyboard navigation, IME guards, focus scrolling, and responsive placement. The new picker must preserve those mechanics and add accessible provider, favorite, disabled, and safe unavailability labels.

The product has not yet chosen the final duplicate-provider presentation. Flat rows, grouped rows, provider cycling, and the preferred-provider control must be compared in the real composer. Release requires recorded keyboard, screen-reader, touch, narrow-width, high-zoom, reduced-motion, localization, pagination, stale-state, and many-provider evidence.

Until that review, implementation may build identity, query, ranking, and availability infrastructure. It may not guess a production grouping or shortcut. Every candidate must preserve exact identity binding, explicit-preference-only automatic resolution, visible provider attribution, and existing focus and IME behavior.

## Safe errors

Command APIs extend Fluxer's existing `{code, message, ...typed_data}` envelope. Important stable classifications include:

- Unknown command
- Key, name, alias, schema, manifest, draft, and configuration conflicts
- Stale schema
- Unsupported type or context
- Invalid multi-value, relationship, or temporal input
- Developer, category, or community disablement
- Unavailable target
- Pending authority approval
- Inactive installation
- Suspended application
- Missing native permission
- Rate limit

Details are audience-scoped. Ordinary members do not receive private targeting, dormant policy, retirement blockers, or internal suspension reasons. Invalid resource selection does not confirm whether a hidden or inaccessible target exists. User hiding generates no server error because it is not authority.

## Initial rate limits

| Operation | Initial code-defined default |
| --- | --- |
| Command and manifest reads | 60 per minute per authenticated actor and application |
| Immediate publication | 30 per minute per application |
| New stable command identities | 200 per day per application, in addition to publication budget |
| Draft edit or complete draft validation | 30 per minute per application |
| Draft or recovery publication | 10 per minute per application |
| Target-list page mutation | 10 per minute per application, up to 1000 targets each |
| Community command-config mutation | 20 per 10 seconds per user, community, and application |
| Autocomplete | 60 per 10 seconds per user and installation |
| Aggregate interaction delivery | 500 per 10 seconds per installation |

Bot-token registration also consumes the ordinary bot-global 50 requests per second. Invalid and unchanged requests consume their normal route token. Autocomplete returns at most 25 suggestions and 64 KiB of canonical response data.

These numbers are initial operational defaults returned through normal rate-limit state. They are not permanent throughput guarantees.

## What stays compatible

The compatible base preserves chat-input command models, endpoint shapes, option and choice semantics, localizations, decimal Snowflake and permission strings, ordinary bot authority, and interaction handlers where Fluxer has not documented a difference.

Important deliberate differences and additions are:

- One application-wide schema with community targeting instead of divergent community definitions
- Immutable developer keys and application handles
- Bounded command identity and manifest history
- Community aliases, policy, provider recommendation, and personal preferences
- Category-level policy
- Schema-version refresh with no silent value coercion
- Multi-value, conditional, and temporal options require declared client and application capabilities
- The final collision-picker presentation cannot be selected before the required prototype evidence exists
- Only community chat-input commands are in initial scope

The compatibility corpus must classify each feature and API as compatible, compatible additive, an intentional difference, or out of scope. Raw protocol fixtures are authoritative. A pinned `discord.js` client provides migration evidence, not a replacement specification.

## What must be tested before release

Command and discovery work is acceptable only when tests prove:

- Command and option identity survives rename and never follows display-name reuse
- Application-wide and community routes preserve one schema and correct targeting semantics
- Publication exposes only complete heads and rejects stale races
- Publishing an unchanged definition still runs full validation and creates no history entries or events
- Dormant deletion, reactivation, retirement, and bounded recovery preserve reference ownership
- Every documented schema, serialization, identity, category, and target limit rejects its boundary plus one
- Localization fallback and collision checks are exact and deterministic
- Unsupported Fluxer extensions never downgrade to weaker scalar behavior
- Stale forms preserve only same-key, same-type, currently valid values and require resubmission
- All availability conditions are rechecked at submission
- Owner and `Administrator` bypass only community-authored audience and channel rules
- Duplicate providers remain attributable and only explicit preference can auto-resolve
- Recommendations and passive usage affect order only
- Favorites, hiding, and usage store no authority or command values
- User and community state follows the documented deletion and dormancy rules
- Aliases, bulk operations, categories, recommendations, and resets use versions and safe audit
- Picker prototypes provide the required evidence before final collision controls are implemented
- The raw fixture corpus, API schemas, Gateway, message service, web client, OpenAPI, and pinned compatibility client consume one reviewed contract

## When this will be built

Command work begins only after conditional writes, installations, managed roles, attribution, suspension, cleanup, and restore safety are available.

Stage `C` is split into:

- `C1` for application capacity, handles, recoverable creation, immutable command and category storage, target and preference tables, background read validation that does not affect users, reconciliation, limits, and generated contracts
- `C2` for compatible registration, immediate immutable publication, authority fields, Fluxer option extensions, requests that make no change, targeting, errors, rate limits, and gradual activation of command writes
- `C3` for community invocation policy, aliases, category deny, authority review, recommendation, contextual role and channel policy links, reset, audit, and responsive management

Stage `E` must then create and deliver trusted interactions before application commands can be invoked end to end. Stage `P` first adapts existing native commands to typed provider identity, then exposes application discovery and structured composer selection.

The `P2` interface cannot merge until the collision design is approved. Manifest drafts and recovery make up stage `M`. They require only the immutable registry, but are scheduled after the base response and component work so the team does not build recovery before the features it would recover.

## Continue reading

- Previous: [Applications and installations](04-applications-and-installations.md)
- [Research index](../README.md)
- Next: [Interactions and responses](06-interactions-and-responses.md)
