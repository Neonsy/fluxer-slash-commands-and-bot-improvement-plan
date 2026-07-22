# Discord Compatibility Fixtures and Conformance

Status: repository-derived compatibility test strategy under QAD-002A/B, QAD-196, QAD-220, and QAD-227 through QAD-237.

## Hard drop-in baseline

QAD-220 makes compatible community-installed chat-input behavior an acceptance invariant, not a best-effort goal. For a surface classified `compatible` or `compatible_additive`, a Discord bot changes only credentials and endpoint/version transport configuration. Its command objects, SDK models, interaction handlers, callback/component payloads, and ordinary bot REST calls are not rewritten into Fluxer-specific forms. Omitted Fluxer capabilities/authority fields select the baseline; they never cause rejection or delegated-authority inference.

Optional Fluxer behavior uses additive fields/namespaces, explicit broker registration, or negotiated capabilities. The baseline still receives server-owned installation, permission, suspension, rate-limit, and bot-attributed audit enforcement. An intentional difference or out-of-scope surface is not called drop-in and must carry exact migration/fallback documentation.

QAD-227 is `compatible_additive`: scalar `USER`/`ROLE`/`CHANNEL`/`MENTIONABLE` definitions and interaction `value` remain byte/meaning compatible. `multi_value`, `values`, and Fluxer `TARGET` type `1000` require `fluxer.commands.multivalue.v1` and are intentionally not sent to Discord. Cross-platform fixtures therefore pair an unchanged scalar Discord/Fluxer baseline with a separate Fluxer extension manifest and prove the extension cannot alter the baseline handler.

QAD-228 is also `compatible_additive`: `relationships` is Fluxer-only registration metadata gated by `fluxer.commands.conditions.v1`, while an accepted interaction delivers the same ordinary option payload. Baseline fixtures omit the field. Extension fixtures prove an unsupported client cannot ignore the graph and that the identical Discord-style handler receives only validated values after a capable client succeeds.

QAD-229 is `compatible_additive`: option types `1001–1004`, resolved local-time tuples, and `fluxer.commands.temporal.v1` are Fluxer-only. Baseline fixtures keep Discord scalar options untouched. Cross-platform extension fixtures use separately authored string/integer Discord alternatives and prove Fluxer never labels automatic scalar coercion as compatible temporal behavior.

QAD-230 is `compatible`: it preserves the command-trigger type-9 `MODAL` callback and type-5 modal-submit interaction without changing their wire shapes. Composer-first is presentation/developer guidance. Fixtures prove an intentional migrated command-to-modal flow still works and cancellation emits neither a modal-submit interaction nor a false successful completion.

QAD-231 is `compatible_additive`: categories and `category_key` exist only in Fluxer-aware manifest/tooling data, never Discord command registration bodies or interaction payloads. Baseline commands remain independently addressable. A client that ignores grouping renders only the flat commands the server says are eligible; it cannot bypass category disable.

QAD-232 is `compatible`: semantically equal POST/PATCH/bulk operations retain their normal success statuses and bodies/current resources while avoiding internal revision/event churn. The optional response header is additive. Explicit stale Fluxer preconditions retain conflicts, and repeated DELETE behavior is not changed.

QAD-233 is `compatible_additive`: the owner dashboard composes Fluxer registry/health APIs and changes no bot command, interaction, callback, or REST migration surface. Bot tokens cannot authenticate the human UI but retain their documented registration authority.

QAD-234 is `compatible_additive`: a community recommendation changes first-party picker ordering only after server availability filtering. It is absent from Discord command/interaction payloads, never auto-resolves, and leaves provider-qualified/explicit-selection behavior intact.

QAD-235 is `compatible_additive`: role/channel entry points and filtered Integrations navigation are first-party settings UI. They add no bot API, policy writer, command payload, permission grant, or external-client requirement.

QAD-236 changes no protocol classification. It gates the final first-party collision-picker presentation on prototype/accessibility evidence while requiring every candidate to preserve the compatibility manifest and immutable selection semantics.

QAD-237 is a deferred `compatible_additive` consumer project, not part of the current implementation. If later shipped, the TypeScript SDK must consume this manifest/fixture corpus and match raw behavior. Its existence cannot make SDK use mandatory or weaken compatible Discord-library/raw migration.

## Canonical compatibility manifest

Add a reviewed `packages/schema/fixtures/bot_platform/v1/compatibility-manifest.yaml`. Each relevant Discord surface is classified as:

```text
compatible              same accepted/emitted meaning and wire shape
compatible_additive     compatible baseline plus optional Fluxer fields/capability
intentional_difference  documented different behavior with rationale/migration
out_of_scope            recognized but not implemented in this plan
```

Every entry includes surface/field/route/event/type number, authoritative Fluxer schema symbol, comparison-document URL and retrieval date, capability if any, migration/fallback behavior, and owning test IDs. The manifest, not memory or an SDK's incidental implementation, is the review checklist. Updating a comparison baseline is a normal reviewed change and never silently rewrites expected Fluxer decisions.

The initial manifest covers:

- application-command CRUD, command/option/choice types, permissions, localizations, contexts/integration types, Snowflake/string bitfields, errors and rate-limit headers;
- interaction types 1-5, callback types/routes, initial/deferred/original/follow-up behavior, Ed25519 raw-body signatures, and Gateway `INTERACTION_CREATE`;
- component type numbers/fields/placement, legacy rows, Components V2 flag/containers, modals, and unknown-component fallback;
- application/bot OAuth installation shape relevant to migration;
- Fluxer command keys/aliases/qualified names, negotiated capabilities, inline choice placement, authority manifests, private ephemeral lifecycle, declarative administration, and recovery features as additive/different entries;
- QAD-227 registration bounds, ordered interaction collections, typed `MENTIONABLE`/`TARGET` identity, two-sided capability requirement, native versus application autocomplete, and unsupported-client fallback;
- QAD-228 relationship kinds/predicates/bounds, stable sibling keys, graph rejection, unchanged interaction delivery, client-only capability, and update-required fallback;
- QAD-229 type codes/canonical values, precision/bounds, timezone source and gap/overlap resolution, strict server time, resolution mismatch, two-sided capability, and explicit scalar-alternative documentation;
- QAD-230 composer/modal selection guidance, unchanged command-to-modal callbacks, cancellation/no-submit behavior, focus/accessibility, and telemetry redaction;
- QAD-231 category registry/key/label/order/membership limits, policy precedence/lifecycle, flat-client fallback, and atomic administration;
- QAD-232 canonical semantic equality/default/order rules, compatible no-op response, explicit-stale and race behavior, full validation/rate charging, and absence of revision/event/audit/cache side effects;
- QAD-233 owner authorization, canonical reads/operations, sanitized blockers/exports, conflicts, history/recovery wording, suspension/ownership loss, and no dashboard-owned source;
- QAD-234 exact-name/stable provider identity, user-preference/favorite/recommendation/usage precedence, native/alias/localization and unavailable lifecycle, manager CAS/audit, personal override, and no auto-selection/authority;
- QAD-235 role/channel ACL and explicit-reference count semantics, stable-ID navigation, source-owned indexes, stale/lost-permission/back-focus behavior, non-disclosure, and one-editor/write/audit proof;
- QAD-236 collision-picker invariant/prototype/accessibility evidence gate and explicit non-selection of grouping/cycling/preference visuals;
- QAD-237 post-stability project gates, raw authority, no-import-side-effects, thin scope, server-owned boundaries, support/version/security/provenance requirements, and raw-versus-SDK parity;
- explicitly out-of-scope user-installed/global-app and DM invocation contexts, plus user/message-context and Activity commands; application-wide chat-input registration remains supported.

Known deliberate differences already include guild registration as targeting rather than divergent per-guild schema, immutable legacy/structured representation, bounded follow-ups, initial ephemeral media rejection, Fluxer community aliases/preferences, and stricter server-owned authority/privacy. They must appear in migration documentation and cannot be “fixed” by a compatibility test without a new decision.

## Fixture layout

Use small hand-reviewed JSON fixtures, not copied SDK snapshots or live production payloads:

```text
packages/schema/fixtures/bot_platform/v1/
  compatibility-manifest.yaml
  commands/{valid,invalid,boundary}/
  interactions/{gateway,http,callbacks}/
  components/{legacy,structured,modal,fluxer_extensions,invalid}/
  signatures/
  errors/
  lifecycle/
```

Each fixture has a sidecar or manifest row stating input/output role, expected normalized JSON or stable error/path/status, required capability, and participating runtimes. IDs/timestamps/keys are deterministic test values; secrets are test-only. Golden normalized JSON uses decimal Snowflake strings and canonical ordering where the protocol specifies it, while tests compare objects when member order is irrelevant.

Boundary pairs exist at and one beyond every code limit. Invalid fixtures cover unknown fields where strict, unknown additive fields where tolerant, malformed strings/numbers/bitfields, duplicate keys/IDs, nesting/depth, stale versions, unsupported capability, wrong audience, replay, and expiry.

Multi-value boundary fixtures cover 1/50/51 elements, developer min/max, optional omission, required presence, duplicate typed identity, mixed target kinds, one stale/inaccessible member, scalar/multi schema changes, non-truncating stale refresh, 25/26 autocomplete results, and no partial application delivery.

Conditional fixtures cover zero and 350/351 relationships; each kind/operator; false/zero/empty-string presence; typed equality and coercion rejection; self/missing/cross-branch/duplicate references; cycles and required-hidden/required-conflict impossibility; multiple conflicts; stale relationship edits; no silent clearing; all-errors ordering/cap; manipulated clients; and ordinary/exact unsupported-client discovery.

Temporal fixtures cover all four option codes and exact normalized JSON; canonical/noncanonical syntax; leap years; year and safe-integer boundaries; precision/step; min/max; strict past/future with a fixed test clock; fixed/explicit/account/community/missing zones; canonical/unknown zone IDs; representative daylight-saving gaps and both overlap occurrences; pinned timezone-data version plus client/server resolution mismatch; stale schema changes; constrained relative-helper normalization; unsupported/free-form text; capability fallback; and absence of raw values/zones from telemetry/audit fixtures.

Composer/modal fixtures cover a bounded composer-native form, an intentional command-to-modal callback, validation retry, cancel/dismiss/expiry without modal submit or success state, focus transfer/restoration, and absence of field/upload data from metrics/audit.

Category fixtures cover 0/25/26 active and 100/101 reserved keys; zero/one/invalid membership; localization/order/rename; removal/reactivation; move into/out of a disabled category; a new command entering a disabled category; per-command enable precedence; config/manifest CAS races; atomic audit/result counts; grouped and flat clients; and unchanged Discord command/interaction payloads.

No-op fixtures pair canonical-equivalent object/map ordering and omitted defaults with meaningful-order, identity, lifecycle, target, category, and authority near-matches. They assert compatible statuses/bodies, the additive header, explicit stale conflicts, convergent/divergent CAS results, rate charging, exact comparison after hash match, retained drafts, and zero new revision/event/audit/cache invalidation.

Dashboard fixtures cover every authoritative view/operation, page/filter/deep-link boundaries, sanitized retirement/approval/health output, no-op display outside history, conflict/manual reapplication, recovery wording, suspension/read-only state, ownership loss/deletion races, safe export, accessibility, and absence of user/community/input/secret data or shadow state.

Provider-recommendation fixtures cover every precedence combination, explicit-preference unavailable behavior, favorites, passive usage, native/application providers, default/alias/localized collisions, hidden/disabled/untargeted/uninstalled/suspended/renamed/retired targets, matching reinstall, concurrent manager edits, safe audit/cache invalidation, personal override copy, and no auto-selection/invocation/payload change.

Contextual-policy fixtures cover authorized and unauthorized role/channel source pages, counts of explicit references versus effective-access wording, Manage Roles/channel-management non-escalation, stable typed navigation, destination reauthorization, stale/deleted/recreated subjects, removed apps/commands, concurrent policy versions, Back/focus/responsive accessibility, no source mutation/audit, and no disclosure through errors/tooltips/accessibility/telemetry.

QAD-236 additionally requires recorded real-composer variant evidence; fixture/render tests alone cannot select grouping, cycling, or preference controls. Once a design is separately approved, its fixtures are added without weakening the invariant corpus.

## One fixture, multiple runtimes

The same committed fixture corpus is consumed by:

1. `packages/schema` Zod parse/normalize/error tests;
2. Fluxer API request/response/OpenAPI contract tests and persistence round-trips;
3. Erlang Gateway Identify/Ready/dispatch JSON encoding and signature-header tests;
4. Rust message-service opaque component round-trip tests;
5. React parser/model/render tests for supported, inert fallback, keyboard/focus, and accessibility behavior.

Each runtime may have a small loader but may not fork fixture copies. A schema-owned fixture hash/index makes missing runtime cases visible in CI. If a runtime does not semantically interpret a field, its conformance obligation is byte/object-preserving round-trip, bounds, and safe unknown handling rather than a competing validator.

## Protocol and SDK smoke tests

In addition to fixtures, a containerized end-to-end compatibility probe starts the actual API, Gateway, message service, NATS, and database dependencies and exercises both interaction transports.

- A raw protocol probe registers commands, installs the bot, Identifies, invokes each interaction type, verifies/defer/responds, handles components/modals, edits/follows up, and observes uninstall/suspension/fallback.
- A pinned `discord.js` development-only smoke client is configured only with Fluxer's endpoint/version transport adapter and token. Its command models, interaction handlers, components, and REST method inputs are not rewritten into Fluxer-specific payloads for compatible cases. This detects migration breakage that schema fixtures alone miss.
- Fluxer extensions use a separate thin extension client and prove their omission does not break the baseline SDK client.
- The pinned `discord.js` client registers and invokes the unchanged scalar counterpart. It is not modified to understand `multi_value`; the separate extension client proves capability-gated collections and scalar fallback documentation independently.
- The pinned client handler remains unchanged for a QAD-228 command because relationship metadata is not delivered. A separate capable Fluxer client exercises the conditional composer and proves server rejection when client rules are bypassed.
- QAD-229 uses the separate Fluxer extension client and an explicit scalar Discord counterpart. The pinned Discord client is not modified to recognize Fluxer temporal codes, and its successful scalar path is not treated as proof of temporal semantics.
- The pinned Discord client may intentionally answer a compatible command with a modal; QAD-230 changes no handler or payload. A separate Fluxer UI test proves composer-first presentation and truthful cancel/focus behavior.
- The pinned Discord client registers uncategorized commands unchanged. Separate Fluxer tooling publishes QAD-231 category metadata and proves a flat client sees eligible commands without extension parsing while server category denial still holds.
- A future QAD-237 official SDK is added only after its project-start gates and runs the same scenarios as a further consumer. It never replaces the raw probe, pinned `discord.js` migration smoke, or separate extension client as independent evidence.

The pinned third-party `discord.js` version is recorded in the compatibility manifest/lockfile and upgraded deliberately with a manifest diff. If a QAD-237 SDK later exists, its supported version is recorded separately. One library is evidence, not proof of all ecosystem clients; raw fixtures remain authoritative.

## Required scenario matrix

At minimum, end-to-end tests cover:

- command create/bulk overwrite/patch/dormant delete, localizations, aliases, categories, collisions, provider preference, permission/channel/category policy, and developer disablement;
- all trigger envelopes over Gateway and HTTP, raw-body signature verification, duplicate delivery, defer/timeout, callback/follow-up idempotency, rate-limit headers, stale schema/message version;
- legacy and structured public/ephemeral messages, every initial component type, modal submission, per-user pending/commit/rollback, once policies, expiry, copy-as-static, unsupported client fallback;
- transport verification/switch/key rotation, DNS/redirect/response-size/retry/circuit failures;
- install/rollback/uninstall/reinstall/reconciliation, managed-role ownership/hierarchy, suspension/reinstatement, permanent deletion;
- delegated-action authorization/revalidation/replay/confirmation/audit/partial compensation when that separate high-risk stack is enabled;
- old reader/new writer and new reader/old writer combinations required by each additive database/wire migration.

## Generated contracts and CI gates

The schema source is changed first, then repository generators produce TypeScript/OpenAPI/protobuf artifacts where applicable. CI runs generator cleanliness and fails on uncommitted generated diff. OpenAPI route/schema snapshots are semantically diffed against the compatibility manifest; a removed/changed compatible field requires an intentional-difference/deprecation entry.

Per-branch fast gates run the fixture subset owned by changed symbols plus typecheck/lint/unit tests. Any shared wire/database branch runs all cross-runtime conformance. Stack tips additionally run real-service integration, browser accessibility, load/failure-injection, and the pinned SDK smoke. The root repository `pnpm test`, `pnpm typecheck`, OpenAPI validation/generation check, Cassandra schema diff/verify, Gateway checks, and Rust workspace tests remain the canonical aggregate commands where relevant; branch strategy records the exact applicable subset.

Fuzz/property tests generate bounded command/component/envelope trees from the schema and assert parse/round-trip termination, deterministic normalization, no privilege broadening, and graceful unknown-field/type handling. Fuzz output becomes a fixture only when it protects a diagnosed regression.

## Evidence and classification

- Fluxer currently has Vitest schema/API/client tests, API test fixtures, generated OpenAPI, Rust workspace tests, Erlang Gateway checks, and a root aggregate test/typecheck tool, but no bot-protocol conformance corpus.
- The application platform crosses manually mirrored message types and multiple runtimes, so isolated unit snapshots cannot protect wire compatibility.
- This preserves current test/generator entry points, adds one shared fixture authority plus an end-to-end migration probe, and treats deliberate Fluxer improvements as documented contracts rather than failures.
