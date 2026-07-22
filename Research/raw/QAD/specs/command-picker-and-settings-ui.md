# Command Picker and Settings UI

Status: accepted policy under QAD-118 through QAD-123 and QAD-227 through QAD-236, plus repository-derived UI mechanics under QAD-145, QAD-173, and QAD-174. This covers responsive React UI only, not the separate Flutter client.

## Picker query

The effective-command query is scoped to `(user, guild, channel, locale)` and searches only the initial community command context.

Indexed/searchable text includes the effective primary name, original developer name and localizations, community alias, command/option descriptions, application display name/handle, and qualified `handle:name` form. Comparison applies Unicode NFKC and locale-independent case folding without changing stored/displayed text. Search never executes from a string match; selection binds provider and stable command identity.

Relevance tiers are deterministic: exact qualified/effective name; exact alternate/original/alias; effective-name prefix; alternate/provider prefix; token prefix; substring; then description/fuzzy match.

Within one relevance tier, sort by applicable explicit provider preference for the exact duplicate name, favorite status/rank, matching QAD-234 community recommendation, community-scoped usage score, active-locale match, normalized primary name, application handle/provider type, then command Snowflake. For an empty query, favorites lead; recommendation breaks only the order among providers for the same exact shared name, followed by usage and stable lexical/identity ties. Only an applicable explicit provider preference may auto-resolve a duplicate; favorite, recommendation, and usage never do.

The application-icon strip filters to one installed application or the native provider and has a clear-all control. Filtering never changes authorization or preference.

## Availability presentation

- Normal results omit developer/category/community-disabled, untargeted, suspended, context-invalid, and permission-inaccessible commands.
- Authorized managers can enable **Show unavailable commands**, rendering safe dimmed rows/reasons.
- User-hidden third-party commands remain absent unless **Show commands hidden by you** is active.
- User Settings -> Commands lists all hidden commands grouped by application for recovery.
- Developer-disabled commands cannot be enabled; retained community settings remain visible to managers.
- Native commands are identified as Fluxer and cannot be user-hidden or changed through application settings.
- A command requiring a client capability absent from the accepted client session is omitted from normal results. Exact search, saved selections, and deep links render a disabled attributed `Update Fluxer to use this command` state; they never render a scalar substitute.

## Invocation policy evaluation and manager bypass

The server evaluates the current developer availability, targeting, installation, suspension, category gate, per-command community enablement, audience, channel, required permissions, and execution prerequisites at submission. Picker filtering is only a preview and never authorizes a stale selection. Category disable and per-command disable each deny; a command-level enable never overrides a disabled category.

Community owner and `Administrator` bypass only community-authored audience and channel rules. `Manage Guild` can configure those rules but receives no invocation bypass. Developer disablement, application-wide or community-scoped suspension, installation/targeting/context state, and final bot/delegated native permission and hierarchy checks remain absolute for everyone.

When this local bypass affects presentation or invocation, the server returns the safe reason `Allowed because you are Owner/Administrator` to that manager and stores only the evaluated policy version plus `local_policy_bypass=OWNER|ADMINISTRATOR` in the access-controlled interaction trace. The application cannot provide the flag. The trace does not copy audience membership, command arguments, or values and does not create a guild audit event merely because a command was invoked; any later native effect follows the separate application audit contract.

## Pagination and caching

- Query pages contain 50 rows and use an opaque cursor; the list virtualizes and fetches near its end.
- Client cache keys include guild, channel, locale, catalog version, community command-config version, effective member/permission version, and synchronized preference version.
- Opening `/` renders a valid cached first page immediately. Query/filter changes use cached candidates and a 100 ms debounced server query when incomplete.
- Gateway catalog/install/suspension/config events invalidate affected applications and provider recommendations. Member/role/channel permission events invalidate availability/contextual summaries. Preference events invalidate ordering/hiding.
- Selecting against a stale catalog forces one refresh and preserves typed text; it never invokes the cached identity.

## Keyboard and accessibility

- Preserve the current listbox, IME guard, Arrow Up/Down, Home/End, Tab/Enter, scrolling, and composer focus.
- Escape closes without clearing text. Backspace/Delete removes a selected structured command node.
- The composer owns `aria-controls`, `aria-expanded`, and `aria-activedescendant`; rows use `role=option` and stable IDs.
- Accessible option names include command, application/provider, favorite/disabled state, and safe unavailability reason. Icons have redundant text; color/icon never acts alone.
- Application filters and unavailable/hidden toggles expose pressed/checked state and keyboard focus.

### Multi-value option composer

- A QAD-227 resource option renders an ordered chip collection plus one searchable listbox. Native user/role/channel search is the default; application autocomplete is visibly provider-attributed when the definition opts in.
- Arrow keys move through suggestions, Enter selects the active suggestion, and duplicate selections are rejected with an announced error. When the search field is empty, Backspace removes the last chip; a focused chip can be removed with Delete/Backspace. No operation depends on pointer-only controls or drag ordering.
- Every chip exposes its resource kind and accessible name, removal has a labelled control, focus remains predictable after removal, and an `aria-live` status announces selection count, the declared maximum, duplicate/bound errors, and stale/inaccessible corrections.
- The composer never silently reorders, deduplicates, truncates, or submits a partial collection. If server revalidation fails, valid chips remain, invalid chips or collection bounds are visibly marked, and focus moves to the first actionable correction before explicit resubmission.
- Release requires keyboard-only and screen-reader tests through search, selection, review, removal, maximum 50, invalidation, stale-schema refresh, and unsupported-client fallback at desktop and narrow responsive widths.

### Conditional option states

- The client evaluates the published QAD-228 graph after every option change. This updates presentation only; submission always uses the server's current graph.
- A false `visible_if` hides an empty option. If that option already contains input, it stays visible with a correction message and removal/edit controls; its value is never cleared automatically.
- A true `required_if` adds a visible required state and accessible explanation. False makes an otherwise visible option optional. A symmetric conflict disables only an empty peer; two populated peers remain visible and marked until the user removes one.
- When several rules fail, errors appear in option declaration order and focus moves to the first actionable field without suppressing the others. Copy identifies the related option labels while state and submission bind immutable keys; it never exposes hidden submitted values.
- Hidden, disabled, required, conflicting, and invalid states have redundant text/semantics, predictable focus, keyboard-operable correction, and screen-reader announcements. Manipulating or bypassing client state cannot create an interaction because server preflight reevaluates every rule.

### Temporal option composer

- Render type-specific native controls plus canonical manual entry for `DATE`, `INSTANT`, `LOCAL_DATETIME`, and `DURATION`. Locale changes labels/order/readable preview only; the exact canonical value is visible before acceptance.
- A fixed command timezone is read-only and clearly labelled. Otherwise an explicit user choice leads, followed by an authorized saved account zone and then a saved community-zone suggestion if those independently owned settings exist. The current account setting is staff-only and no community setting exists, so ordinary baseline users must choose explicitly. Locale/browser/device timezone may be offered only as a visible suggestion requiring selection; it never silently becomes submitted context.
- A daylight-saving gap produces an actionable invalid-time message without shifting. An overlap presents the two labelled offsets/instants and requires an explicit earlier/later choice. If server tzdata resolves a submitted preview differently, show the updated tuple and require reconfirmation.
- Constrained helpers recognize only reviewed localized equivalents of exact numeric forms such as `in 2 hours` and duration tokens such as `2h 30m`; free-form NLP is rejected locally. The helper displays the resulting canonical value/zone before setting the option and sends no raw phrase.
- Declared bounds, precision/step, and strict past/future state are visible guidance, but server time/validation remains authoritative. A near-now value that becomes invalid returns to correction rather than invoking automatically.
- Every segment, zone search/choice, overlap choice, preview, error, and correction is keyboard-operable with visible focus and screen-reader labels/announcements. Tests cover locale variance, manual entry, desktop/narrow layout, gap/overlap, resolution change, min/max, strict clock boundaries, and unsupported-client fallback.

### Composer-first workflow

- QAD-230 keeps bounded, typed command options in the composer when they remain understandable and accessible. QAD-227 collection, QAD-228 conditional, and QAD-229 temporal controls do not become automatic modal prompts merely because they are richer than Discord's scalar baseline.
- A modal is appropriate for genuinely long-form text, several tightly related form fields, form-specific upload, or a layout whose inline presentation would be confusing or inaccessible. No field-count threshold overrides that task/accessibility judgment.
- When an application intentionally returns a compatible modal callback, the client retains visible application identity, moves focus into the modal predictably, announces its title/context, and restores focus to the composer/trigger on cancel or close. A modal submit is distinct from initial command delivery; dismiss/cancel/timeout never displays workflow success.
- Recoverable validation preserves bounded field state only for the live modal. Explicit cancellation or expiry clears client form state and upload references under the existing modal/upload lifecycle. Responsive, keyboard-only, screen-reader, cancellation, validation-summary, and focus-restoration tests gate release.
- Product metrics may compare aggregate composer/modal completion, cancellation, validation failure, and latency. They never contain command identity as an unbounded label, option values, modal field values, upload names/content, or arbitrary application metadata.

## Category grouping and presentation

- QAD-231 groups commands only by stable application/category identity; a localized label is presentation and never a dispatch or policy key. One command appears in at most one category, and uncategorized commands remain in a clearly labelled/default section.
- Empty-query browsing may group inside an application by developer order. Active search may flatten matching commands for scanning but retains accessible application/category context on every result. An application/category filter never changes server eligibility.
- Category headers expose name, eligible command count, expanded/collapsed state, and one keyboard-focusable toggle. Collapse state, icons, indentation, and color are redundant presentation; listbox navigation skips hidden descendants predictably and screen readers receive state/count changes.
- Collapse memory is bounded device-local state keyed by stable application/category IDs. It does not sync, affect search ranking, hide exact-search results, enter server policy, or survive category removal as authority. Search temporarily reveals matches without rewriting the saved collapse preference.
- Clients that do not implement grouping render the same server-eligible commands as a flat list. A disabled category never reaches them as invocable merely because they ignore its metadata.

## Community provider recommendation

- QAD-234 applies only when multiple currently visible providers expose the same exact normalized shared invocation name in the current locale/context. It never moves the duplicate-name group into a stronger relevance tier, crosses an active application filter, or ranks an unavailable/hidden target.
- A currently applicable user community-specific provider preference, then global preference, remains the only automatic duplicate binding and ranks first. Favorites rank next. `Recommended by this community` then orders the matching provider ahead of passive usage peers; passive usage and existing stable ties follow. An unavailable explicit preference still opens selection under QAD-086 rather than falling through to recommendation-based dispatch.
- The row binds native or application provider plus stable command identity and the normalized shared name. At query and selection, the server rechecks name match, install/target/category/command/suspension/context/user-hidden/authorization state. Failure ignores the recommendation and runs ordinary visible ranking; it never substitutes another provider.
- Recommended rows show visible application/native attribution and an accessible `Recommended by this community; affects order only` description. The personal **Prefer this provider** action remains distinct and explains its higher precedence. Recommendation copy never claims Fluxer review, endorsement, safety, enablement, or added permission.

## Collision-picker design evidence gate

QAD-236 does not yet choose flat versus exact-duplicate grouping, an additional provider-cycling shortcut, or the final preferred-provider control. Those are blocked on real-composer prototypes and product/accessibility review. Implementations may not infer a final star/menu/long-press/Tab behavior from illustrative research copy.

Every candidate must preserve immutable provider/command binding, visible and accessible provider identity, QAD-234 ranking/labels, explicit-preference-only auto-resolution, current availability/authorization, application filtering, and existing listbox/IME/Escape/focus behavior. A context-menu or long-press preference action requires an equivalent visible keyboard/screen-reader route. An additional Tab behavior is acceptable only if evidence shows it does not break expected focus movement or screen-reader operation.

Prototype evidence covers no/two/many-provider and large-catalog cases; long/localized names; recommendation/favorite/preference/disabled/stale states; pagination/filtering; desktop/narrow/touch; high zoom/reduced motion; keyboard-only/IME; and supported screen readers. Record tasks, environments, observed completion/errors/confusion, focus/announcement results, invariant failures, and rejected tradeoffs. A variant with identity ambiguity, presentation-driven authority/dispatch, focus traps, inaccessible preference controls, or unusable responsive layout fails regardless of speed.

The selected design requires a recorded QAD-173/QAD-236 addendum and corresponding update here before production picker implementation. Until then, simulations and implementation acceptance may assert behavioral invariants but must not assume grouping, cycling, or a preference-control visual.

## Community Settings -> Integrations

Only community owner, `Administrator`, and `Manage Guild` can view or modify application command configuration. Application detail contains:

1. **Overview**: lifecycle/suspension, bot, managed role, declared/granted autonomous permissions, delivery health, uninstall/recovery.
2. **Commands**: searchable/filterable command table.
3. **Configuration**: declared application settings/actions.
4. **Activity**: scoped configuration/installation audit history.

The Commands table shows effective/original identity, application/category attribution, developer/category/community state, targeting, execution mode, native permission/operation summary, approval state, and override count. Filters cover enabled, developer-disabled, category-disabled, community-disabled, pending approval, aliased, restricted, unavailable, and dormant.

Per-command detail supports enablement, free alias subject to invocation grammar/within-application uniqueness, user/role/channel policy, authority review, reset, and a discoverability preview.

An execution-mode review shows the exact old/new principals and why the command is unavailable. `AS_USER -> AS_BOT`, `AS_USER -> REQUIRE_BOTH`, and `REQUIRE_BOTH -> AS_BOT` expose approval only to the community owner/`Administrator`; a `Manage Guild` viewer receives explanatory read-only state. `AS_BOT -> AS_USER`, `AS_BOT -> REQUIRE_BOTH`, and `REQUIRE_BOTH -> AS_USER` may also be approved by `Manage Guild`. The same review separately lists permission, operation, hierarchy, or supplemental-role blockers and never represents mode approval as granting them.

The developer dashboard displays the application's permission source but does not create a separate authority writer. In invite mode, the existing OAuth URL builder keeps its editable permission controls and explains that the URL requests permissions for that authorization; `Manage Guild` can grant only bits it already holds. In code-defined mode, the dashboard reads the current `required_bot_permissions` revision/hash published through the authenticated application API. The builder's permission controls are read-only and may copy that set into the generated URL for portability, but Fluxer consent states that the saved declaration overrides URL edits.

On first install, consent labels the source mode and shows the exact normalized names and bitfield. In invite mode, the submitted OAuth request is the source and the current held-bit installer rule applies. In code-defined mode, `Manage Guild` may approve exactly the current saved declaration even when it includes bits the installer lacks; no optional/caller-selected additions, position choice, or supplemental role are offered. If the application changes source mode or the declaration revision before commit, Fluxer applies nothing and returns to consent with the new source. Later, `Manage Guild` may inspect requested/declared-versus-granted authority but cannot raise the retained installed ceiling or apply permission/position/supplemental-role mutations. Those expansion controls require current owner/`Administrator` and remain disabled with explanatory copy otherwise. This does not narrow `Manage Guild` access to non-authority command policy or declarative configuration.

Category administration lists stable key/ID, localized name, developer order, active/dormant state, member/effectively-disabled counts, and current community override. Developers own definitions and membership in developer tooling; community managers may only disable the category or clear that deny. Rename/reorder never appears as a new category, and dormant categories remain visible to managers when retained policy exists.

A cross-application **Command providers** manager view lists only current duplicate shared names and eligible stable providers, including the native provider when it collides. It can set/clear one QAD-234 recommendation using expected config/row versions. Unavailable retained selections appear as dormant to authorized managers and never silently retarget. The result preview states the precedence below user preference/favorites and above passive usage.

## Contextual role/channel policy entry points

Role detail and channel-permission settings may request QAD-235 summary/navigation only after their ordinary source-page checks. The server separately requires community owner, `Administrator`, or `Manage Guild` before returning a count or typed filter. `Manage Roles`, channel management, or source-page access alone is insufficient.

For an authorized actor, the source shows `N explicit command policies reference this role/channel` and **Review in Integrations**. It does not list commands/applications or claim effective access. The count is derived from current source policy versions because a member's other roles, per-user rules, channel gate, command availability, owner/Administrator bypass, and final authorization cannot be inferred from one subject reference.

Typed navigation into the existing Integrations Commands view carries:

```text
guild_id
subject: {type: ROLE | CHANNEL, id}
application_id?   optional stable narrowing
command_id?       optional stable narrowing
return_focus_id?  client-local navigation only; never authority
```

The URL/navigation state contains only stable IDs, not labels, counts, policy values, or membership. Integrations reauthorizes and rereads catalog/config/permission versions, then filters exact source-policy references. It owns all edits, confirmations, CAS errors, audit, and cache invalidation. The role/channel page has no editor, mutation call, policy snapshot, or offline write.

Without Integrations authority, the source may show only generic noninteractive copy that bot command access is managed in Integrations; it returns no count, contextual link, names, states, policy detail, tooltip, or accessibility-label leak. Deleted subjects/apps/commands show a safe stale result without matching a replacement name/ID. Permission loss closes protected results. Back restores the originating view and focus; direct/stale links fall back only to an authorized Integrations overview. Responsive, history, keyboard, focus, and screen-reader tests cover both entry points.

## Bulk operations and confirmation

- Bulk enable/disable changes only community enablement and skips developer-disabled/approval-blocked rows with a result summary.
- A category toggle conditionally updates one category-policy row and config head. It is atomic, affects current and later members through evaluation, and never reports N successful command rewrites. Concurrent mutation returns the current version for refetch; a per-command enable remains visibly ineffective while the category is disabled.
- Selected/all-command reset requires explicit confirmation listing affected override categories and count.
- Applying a developer authority recommendation always shows additions/removals and requires confirmation.
- Alias/policy edits validate before save and use row/config versions.
- No bulk action silently changes managed-role permissions, execution mode, or native-operation approval.

Every mutation writes a community audit entry with actor, application, affected stable command/category IDs and count, operation, normalized before/after policy, and bulk operation ID. It never records invocation arguments. Bulk command changes use one readable parent entry with linked per-command details; a category toggle has one atomic category entry and current affected count.

## Developer Settings -> Command Dashboard

Only the current authenticated human application owner can open QAD-233 dashboard routes. Bot tokens keep their command APIs but do not authenticate this UI. Every view/deep link rechecks ownership and uses application ID plus stable resource identity; stale/missing targets fall back to the authorized application overview without revealing another application.

The dashboard has five responsive views:

1. **Overview**: current manifest head, command/category counts and limits, developer availability, compatibility/capability summary, targeting/approval counts, installation/suspension and transport health.
2. **Commands & Categories**: stable IDs/keys, names, category, command/schema/authority revisions, active/dormant state, targeting, and safe retirement blocker categories/counts.
3. **Draft & Validation**: current draft/base versions, canonical stable-key diff, bounded path errors, authority/target/category effects, and explicit validate/publish/discard actions.
4. **Publications & Recovery**: retained 20+5 history/pins, source and resulting revisions, and recovery preview that states registry-only scope.
5. **Delivery Health**: source-owned sanitized transport/capability/latency/failure state without endpoint secrets, private response bodies, guild audit, or interaction payloads.

Lists page at 50 and support stable key/name/status/category/target/capability filters. Diffs distinguish committed head, draft/uploaded candidate, and validation result. Mutations use the existing APIs/expected versions. A conflict preserves the local candidate and offers refresh, safe application-owned export, or explicit manual reapplication; it never silently rebases/merges. An unchanged QAD-232 operation displays `No changes — already published` for that action and does not appear as a publication.

Recovery republishes retained registry content as a new head after current validation and confirmation. The confirmation explicitly excludes backend code, external/application data, existing messages, community-owned settings/policy, and completed interactions/effects. Suspended applications are read-only except for already allowed credential/transport repair; ownership loss/deletion closes the dashboard. Focus, tables, diffs, validation summaries, pagination, conflicts, dialogs, and narrow layouts require keyboard/screen-reader tests.

The UI and exports never contain bot/client/signing secrets, tokens, command/modal/interaction values, user favorites/hiding/usage/provider preferences, private community audience policy, guild-audit details, or blocker identities. It stores no separate copy of manifests, drafts, targets, health, or history.

## Current Fluxer evidence

- `Autocomplete.tsx` already implements listbox semantics, keyboard looping, Home/End, Tab/Enter, IME protection, focus scrolling, and responsive floating placement.
- Current command filtering is only a lowercase substring over client-owned names and has no provider identity.
- `GuildSettingsConstants.ts` already has a permission-gated Integrations category.
- Desktop and narrow responsive guild-settings containers render the same tab definitions.
- Published CS verifies that the current command union/category-free application model has no application-command category model.
- Published CS also verifies no community provider recommendation or contextual role/channel command-policy view. The current community Integrations category contains only Webhooks, and current role/channel tabs have separate permission gates but no command-policy summary or deep link.
