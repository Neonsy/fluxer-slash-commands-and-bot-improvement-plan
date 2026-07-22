# Command Schema Evolution

Status: repository-derived decision under QAD-145 and QAD-170, extended by QAD-227 through QAD-233.

## Stable field identity

Every option, subcommand, and subcommand group carries an immutable application-authored `key` scoped to its parent. It is an additive Fluxer field. A compatibility registration that omits it derives a key from the initial name; later display-name changes do not change the key. Sibling keys are unique.

Choice identity is its typed value, not its display label. Changing a choice label/localization is metadata; changing its value removes one choice and adds another.

## Revision counters

Each command revision carries:

- `command_revision`: increments for every published change.
- `schema_version`: increments only when accepted input shape or validation changes.
- `authority_revision`: increments when execution mode, default native permission, allowed native operations, or related approval envelope changes.

Presentation-only changes do not invalidate an open form. Authority changes never become effective merely because entered values can be mapped.

## Metadata-only changes

These create a command revision without incrementing `schema_version`:

- default/localized command, subcommand, option, or choice display text;
- descriptions and localizations;
- presentation order where stable keys are unchanged;
- developer enablement or community targeting;
- category label/localization/order changes, or assigning/removing/moving a command's stable category membership;
- NSFW/presentation metadata that does not alter accepted values.

## Compatible structural changes

These increment `schema_version`, but a client can retain every still-valid value:

- add an optional option;
- change required to optional;
- widen numeric or string bounds;
- add a choice;
- broaden allowed channel types;
- add a new subcommand/group without changing existing keyed paths;
- change autocomplete behavior when an already-entered value remains valid under the destination validator.
- widen a multi-value maximum or broaden the allowed typed target kinds when every retained element remains valid.
- change a QAD-228 relationship only when every currently entered keyed value remains valid after reevaluation.
- widen a QAD-229 temporal bound or relax `PAST`/`FUTURE` to `ANY` when the same-type entered value and resolution remain valid.

## Potentially value-dropping changes

These increment `schema_version`; refresh retains unaffected values and explicitly clears/flags only values that no longer validate:

- remove an option, subcommand, group, or choice;
- make an optional option required;
- narrow numeric/string bounds or allowed channel types;
- move a keyed field to another parent/path;
- switch between choices and autocomplete;
- change an option type;
- change a choice's typed value.
- add or remove `multi_value`, narrow collection bounds, or narrow the allowed `MENTIONABLE`/`TARGET` kinds.
- add, remove, or change a QAD-228 relationship when it makes entered input newly required, hidden, or conflicting.
- change temporal type, precision/step, timezone requirement/fixed zone, narrow bounds, or change time direction when entered input may no longer resolve or validate identically.

Type changes never coerce values. A string `"1"` does not become integer `1`, and a user ID does not become a mentionable value implicitly.

Scalar-to-collection and collection-to-scalar changes never wrap or select one value automatically. A lower `max_values` never truncates an existing collection. The client preserves still-visible chips for correction, marks the over-limit or invalid typed entries, and requires the user to change and resubmit the whole option.

Every relationship-array change increments `schema_version`, even when a particular open form happens to remain valid. Refresh evaluates the complete current graph after ordinary keyed/type mapping. It preserves values that remain valid and visible, keeps newly hidden populated values visible as corrections, marks newly required/conflicting fields, and requires resubmission. It never clears a now-hidden value or auto-selects one side of a conflict.

Every temporal type, precision/step, timezone-policy, bound, or time-direction edit increments `schema_version`. Refresh retains a temporal value only under the same type when its canonical representation, bound/direction result, and local-time resolution still match current rules. A fixed/contextual zone change or different offset/instant for the same local text requires visible reconfirmation; Fluxer never preserves the text while silently replacing its instant. Locale formatting, picker layout, and helper copy that do not change canonical acceptance are metadata-only.

Timezone-database updates are not command revisions. A `LOCAL_DATETIME` submission therefore includes the client's previewed local/zone/offset/instant tuple; the server resolves with its current data. Any mismatch returns a safe resolution-changed refresh and requires confirmation before delivery, even when `schema_version` is unchanged.

QAD-231 category changes never remap entered option values because category identity is outside the invocation schema. They still publish a new manifest/catalog version. Before delivery, the server reevaluates the command's current membership and destination category policy; a command newly entering a disabled category becomes unavailable and the stale form is not delivered. Removing a category requires no active command reference in the resulting manifest, makes its stable identity/policy dormant, and later reactivation of the same permanent key restores that identity rather than guessing from a label.

QAD-232 equality is computed only after this file's revision classification and canonical normalization. A metadata-equivalent request does not create a `command_revision`; a different metadata value creates only that revision, while a structural/authority change increments its existing counters. No-op cannot suppress a dormant/reactivation, targeting, category-membership, or authority-review consequence.

QAD-233 dashboard diffs use immutable stable keys/IDs and the same canonical classification. They distinguish metadata, schema, authority, category, targeting, dormant/reactivation, and approval effects; sanitize values the owner is not allowed to see; and label a local/draft candidate separately from the committed head. Conflict refresh never auto-applies that candidate.

## Refresh mapping algorithm

1. Server submission includes command ID and submitted `schema_version`.
2. If stale, the server does not deliver an interaction and returns `COMMAND_SCHEMA_STALE` with current command/revision/version and a sanitized structural diff.
3. Client loads the current schema and matches the selected subcommand path and fields by immutable keys.
4. It retains only same-type values that pass current bounds, choices, temporal/timezone resolution, context, target accessibility, permission-sensitive resolution, and the complete current relationship graph. For a collection, every element is revalidated by typed identity; valid chips may remain visible while invalid chips or whole-collection bound failures are marked, but no partial collection is delivered.
5. It keeps unaffected fields, visibly marks cleared/now-required/invalid fields, and requires the user to submit again.
6. Attachments survive only while their upload token remains valid and the same attachment field key/type remains.

The server never rewrites and automatically invokes a stale submission. Interactions already accepted under an older revision keep that revision and complete under the authority captured for that interaction, subject to normal revalidation.

## Compatibility clients

Clients that omit option keys receive generated keys in command responses and should persist them on subsequent writes. A bulk overwrite without keys matches option identity conservatively by unchanged parent path, type, and current name. Rename plus omitted key is treated as remove/add, not guessed identity.

## Evidence

- Current Fluxer schemas reject invalid input centrally rather than relying on UI coercion.
- Existing message rows carry integer versions and repositories use read/increment/update helpers, but public message schemas expose no version and the generic helper does not protect stale writes. The command registry therefore depends on F1's new expected-version conditional primitive rather than treating current version metadata as compare-and-set.
- Current slash-command parsing is name-based and has no safe mapping semantics; stable option keys are therefore a necessary extension rather than behavior to preserve.
