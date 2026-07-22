# Command Schema Limits and Localization

Status: repository-derived decision under QAD-145, QAD-166, and QAD-167, extended by the user-approved QAD-227 through QAD-231. Values are code constants and developer-visible operational limits, not instance settings.

## Initial limits

The initial chat-input schema preserves Discord-compatible limits unless an existing Fluxer primitive is more restrictive.

| Field / collection | Initial limit |
|---|---|
| Commands per application | 100 chat-input commands |
| Active command categories per application | 25 |
| Lifetime-reserved category keys per application | 100 |
| Category default/localized label | 1-32 characters |
| Immutable `developer_key` | 1-64 ASCII lowercase letters, digits, `_`, and `-`; first character must be a letter or digit |
| Developer command name | 1-32 characters and Discord-compatible chat-input name grammar |
| Community alias | Same 1-32 invocation grammar as a developer command name |
| Command or option description | 1-100 characters |
| Options at each permitted level | 25 |
| Nesting | Command -> optional subcommand group -> subcommand -> value options; no deeper nesting |
| Choices per option | 25 |
| Selected values in one QAD-227 multi-value option | 50; a definition must declare a lower or equal `max_values` |
| QAD-228 relationships beside one sibling option list | 350 maximum: 25 required, 25 visibility, and 300 unique conflict pairs |
| QAD-229 date/time years | Gregorian `0001` through `9999` |
| QAD-229 duration | Nonnegative JavaScript-safe integer milliseconds; tighter developer bounds permitted |
| Choice display name | 1-100 characters |
| String choice value | 1-100 characters |
| String option value | 0-6000 characters, further restricted by declared min/max |
| Integer | JavaScript-safe integer range, matching the compatibility baseline |
| Number | finite IEEE-754 double in the compatibility range; reject NaN/infinity |
| Localizations per localizable field | At most one per entry in `AllLocales` (currently 34) |
| Counted command text | 8000 characters using the longest effective localization for each name/description/choice/value field |
| Canonical serialized command definition | 512 KiB UTF-8 |
| Canonical complete manifest/draft | 8 MiB UTF-8 and at most 100 commands |
| Availability targets changed in one request | 1000 communities; larger changes page through idempotent batches |

The serialized limits close the gap left by the 8000-character compatibility calculation when many complete locale maps are supplied. They are validated before persistence and hashing. Application-handle naming and lifecycle are fixed separately by QAD-198 and QAD-203 through QAD-205 in `application-handle-contract.md`.

## Structural grammar

- Required options precede optional options.
- A command level contains either subcommands/subcommand groups or value options, never both.
- A subcommand group contains only subcommands.
- A subcommand contains only value options.
- Option names are unique among siblings by normalized default name.
- `choices` and `autocomplete` are mutually exclusive.
- `min_value <= max_value` and `min_length <= max_length`.
- Bounds inappropriate for an option type are rejected rather than ignored.
- Every integer arriving on JSON is checked for safe-integer precision before conversion.

## Fluxer multi-value resource extension

QAD-227 adds capability-gated collection input without changing the compatible scalar union:

- `USER`, `ROLE`, `CHANNEL`, and `MENTIONABLE` may add `multi_value: {min_values?, max_values}`. `min_values` defaults to 1; `max_values` is required; both are integers satisfying `1 <= min_values <= max_values <= 50`.
- The existing `required` field controls whether the whole option may be absent. A present collection is never empty and must satisfy its collection bounds.
- `TARGET` is a Fluxer-only repeatable option type with numeric registry value `1000`; it requires `fluxer.commands.multivalue.v1` and accepts users, roles, and channels. The numeric value is permanent and cannot be repurposed.
- Collection order is significant and preserved. Duplicate IDs are invalid for one-kind options; duplicate `{type, id}` identities are invalid for `MENTIONABLE` and `TARGET`.
- `USER`, `ROLE`, and `CHANNEL` collection elements are Snowflake decimal strings. `MENTIONABLE` elements are `{type: USER | ROLE, id}`; `TARGET` elements are `{type: USER | ROLE | CHANNEL, id}`. Labels never become identity.
- Static `choices` are not accepted on these resource collections. Native access-filtered resource search is the default. `autocomplete: true` explicitly opts into an application callback whose returned values use the same element shape and are revalidated/access-filtered by Fluxer.

An option without `multi_value` retains its Discord-compatible scalar shape and limits. Fluxer extension fields are not emitted to or accepted by Discord; a cross-platform application registers the compatible scalar form there.

## Fluxer conditional relationship extension

QAD-228 permits one `relationships` array beside a command or subcommand's sibling value-option list. It is semantically unordered and canonical storage sorts validated entries by kind and stable keys. Entry shapes are:

```text
{kind: required_if | visible_if, option_key, when: {option_key, operator, value?}}
{kind: conflicts_with, option_keys: [key_a, key_b]}
```

- `option_key` is the affected sibling. `when.option_key` is a distinct sibling and `operator` is `is_set`, `is_unset`, or `equals`.
- `is_set` means the referenced option is present, including `false`, zero, or an allowed empty string; it is not a truthiness test. `is_unset` means absent. Neither accepts `value`.
- `equals` requires `value`, exact type equality, and a value valid under the referenced scalar `STRING`, `INTEGER`, `BOOLEAN`, or `NUMBER` schema. Resource, attachment, subcommand, and collection values cannot be predicate constants. No coercion occurs.
- An affected option has at most one `required_if` and one `visible_if`. `required_if` targets an otherwise optional option; `visible_if` cannot target an unconditionally required option.
- `conflicts_with.option_keys` contains exactly two distinct sibling keys. The pair is unordered/canonically sorted; duplicate pairs and conflicts between two unconditionally required options are rejected.
- Registration rejects self/missing/cross-branch references, duplicate entries, directed cycles across required/visibility edges, and every statically reachable required-but-hidden or otherwise unsatisfiable combination. Conflict edges remain symmetric constraints rather than dependency edges.
- The relationship array may contain at most 350 entries, the natural maximum from 25 required rules, 25 visibility rules, and all `25 choose 2` unique conflict pairs. It also remains inside the 512 KiB command-definition cap.

The schema accepts no other kind/operator or nested condition object. Relationship equality constants are part of the client-visible published definition and must never contain secrets.

## Fluxer temporal option extension

QAD-229 permanently reserves numeric option types under `fluxer.commands.temporal.v1`:

```text
1001  DATE
1002  INSTANT
1003  LOCAL_DATETIME
1004  DURATION
```

- `DATE` accepts only a valid proleptic-Gregorian `YYYY-MM-DD` in years `0001–9999`.
- `INSTANT` accepts only canonical UTC RFC 3339 `YYYY-MM-DDTHH:mm:ss.SSSZ`; offsets and omitted fractional milliseconds are rejected rather than normalized silently.
- `LOCAL_DATETIME` accepts `YYYY-MM-DDTHH:mm:ss.SSS` plus an IANA timezone resolution as specified in `interaction-envelope.md`. Its local text carries no offset.
- `DURATION` accepts a JSON integer millisecond count satisfying `0 <= value <= Number.MAX_SAFE_INTEGER`.

All four reject `choices`, `autocomplete`, and `multi_value`. `DATE`, `INSTANT`, and `LOCAL_DATETIME` may declare same-type `min_value`/`max_value` and `time_direction: ANY | PAST | FUTURE` (default `ANY`). `DURATION` may declare integer `min_value`/`max_value`; time direction is invalid. Every bound is canonical, type-matched, and satisfies `min_value <= max_value`.

`INSTANT` and `LOCAL_DATETIME` may declare `precision: MINUTE | SECOND | MILLISECOND` (default `MILLISECOND`). Coarser precision requires all lower canonical fields to be zero; it never rounds. `DURATION` may declare positive safe-integer `step_ms` (default 1), and submitted values must be an exact multiple. `DATE` has fixed day precision. Precision/step changes are structural validation changes.

`LOCAL_DATETIME` may declare a fixed canonical IANA `time_zone` (1–255 ASCII characters from the server's reviewed timezone registry). Without one, resolution uses explicit picker selection, saved account timezone, then community timezone; missing context requires selection. Saved account and community zones are optional context owned by their respective settings systems, not new fields in the command definition. CS verifies that the current account setting is staff-only and no community timezone setting exists, so the baseline supplies neither fallback for an ordinary user; the picker must require explicit selection rather than infer a device zone or add duplicated command persistence. If separately owned settings later make either value available to the invoking user, the recorded precedence applies. `DATE` uses the same optional/contextual zone only to evaluate `PAST`/`FUTURE` against “today”; the date value itself remains zone-free. `INSTANT` and `DURATION` reject timezone fields.

The server validates calendar syntax, bounds, precision/step, IANA identity, gap/overlap resolution, and time direction. It never clamps, rounds, guesses locale/device timezone, shifts through a gap, or chooses an overlap occurrence.

## Command category registry

QAD-231 adds an optional Fluxer manifest-level `categories` array. Each entry contains immutable `key`, stable server `category_id`, default `name`, optional `name_localizations`, and its developer order. Category keys use the existing 1–64-character developer-key grammar and remain reserved to the application for its lifetime; an application may reserve at most 100 and activate at most 25 in one manifest. Array order is presentation order and reordering does not change identity.

Each command may reference zero or one active sibling registry entry through `category_key`. Subcommands/options cannot carry category membership, category membership never changes an invocation path, and one command is never duplicated under multiple categories. A missing/dormant/foreign category reference rejects the complete candidate. Category names use exact-locale fallback like other application localizations and must be unique after normalization among the application's active categories for the default and every effective supplied locale.

Category definitions, localizations, membership, and reserved-key bookkeeping remain inside the existing 8 MiB manifest and 100-command limits. They do not create another unbounded text or membership budget.

## Localization ownership and fallback

- Applications own command, option, choice, and category localizations. Fluxer's Lingui catalogs translate platform UI only and never synthesize application text.
- Locale keys must be values from `packages/constants/src/Locales.ts`; unknown keys are rejected so a typo cannot silently become dead data.
- The non-localized name/description is mandatory and is the authoritative fallback.
- Rendering uses the account's exact Fluxer locale when supplied by the application, otherwise the default field. It does not guess a translation from an unrelated regional locale.
- Every localized value independently satisfies the default field's length, character, and structural rules.
- Effective command and sibling option names must remain unique within an application for every supplied locale. Publication reports the locale and conflicting stable keys.
- Localization-only edits create an immutable metadata revision but do not increment structural schema version or invalidate an in-progress form.
- Removing a localization immediately falls back to the default after publication; old interactions retain the submitted revision for attribution.
- Search indexes default and all supplied localized names/descriptions, tagged by locale. The picker boosts the active locale but may still match the default name for support/documentation discoverability.

## Evidence

- Fluxer centralizes supported account locales in `packages/constants/src/Locales.ts` and validates them through `LocaleSchema`.
- Fluxer schemas use code-defined `createStringType`, array caps, safe Snowflake parsing, and constants rather than operator-authored validation settings.
- Discord's current application-command documentation specifies 100 chat-input commands, 1-32 names, 1-100 descriptions, 25 options/choices, 6000-character string bounds, and the 8000-character counted command limit: https://docs.discord.com/developers/interactions/application-commands
