# Implementation roadmap

The roadmap breaks the work into eleven ordered delivery stages. Each stage contains a short stack of pull requests.

## Sequence and dependencies

The displayed implementation sequence is:

```text
F, I, S, C, E, P, R, M, D, A, U
```

The dependency graph is more precise than that display order:

```text
F
└─ I
   └─ S
      └─ C
         ├─ E
         │  └─ P
         │     └─ R
         │        ├─ D
         │        │  └─ A
         │        └─ U
         └─ M
```

M depends on C, but it is scheduled after the base interaction and component work. Its only technical prerequisite is the immutable command registry.

D depends on R. Declarative settings and builders need ephemeral results plus stable rich-message and component ownership.

A depends on D. Administrative actions build on the declarative settings and builder resources.

U does not depend on D or A. It depends on the interaction, private confirmation, component-state, audit, suspension, rate-limit, and recovery foundations completed in R, so it may proceed independently when capacity and review allow.

## How the work is split

Each stage uses short stacked branches with no more than three dependent pull requests open at once. A later stage starts from updated `main` after its prerequisite stage merges. There is no permanent chain of every planned branch.

Within a stack, each child is based on the preceding branch and targets that parent until the parent merges. Review fixes stay on the branch that owns the behavior. Descendants are then rebased and checked with range differences in order.

Each pull request covers one reviewable security or data-lifecycle boundary and remains deployable with its new write or delivery path disabled. Additive storage changes, code that can read both old and new data, cross-service round trips, and safe fallbacks must be ready before any feature begins writing or delivering new data. Forward migrations do not destroy data.

Generated files are included with the source change and produced by repository generators. Public documentation and OpenAPI are included with the first public API or feature, not deferred to a cleanup branch with no defined scope.

### Stage F: persistence and rollout foundation

This stage changes no application behavior.

| Unit | Branch | Outcome |
| --- | --- | --- |
| F1 | `feat/bot-platform-conditional-writes` | Add one typed expected-column conditional update with applied or not-applied results across Cassandra, Postgres KV, and the in-memory test backend. Prove contention, missing rows, stale versions, and equivalent semantics. |
| F2 | `feat/bot-platform-rollout-controls` | Add the private typed rollout object, deterministic application and community eligibility, dependency validation, version propagation, fail-closed defaults, bounded telemetry helpers, and removal ownership. |

F1 is the prerequisite for installation lifecycle, immutable publication heads, configuration snapshots, message version checks, suspension transitions, and every single-use claim.

F2 adds temporary engineering controls. They are not a public or permanent self-hosted master switch. They cannot disable authorization, revocation, suspension, deletion, generation checks, or schema invariants.

### Stage I: installation lifecycle and managed roles

| Unit | Branch | Outcome |
| --- | --- | --- |
| I1 | `feat/application-installation-lifecycle` | Persist installation state, deterministic effects, deadlines, rollback, uninstall, workers, and telemetry. Keep existing bot memberships unbackfilled. A failed synchronous install can never activate later. |
| I2 | `feat/managed-bot-roles` | Give each new installation exactly one owned managed role and implement invite-mode and code-defined permission sources, durable ceilings, hierarchy, presentation, reinstall generation, mutation protections, audit, and deterministic cleanup. |
| I3 | `feat/application-installation-management` | Add Community Integrations lifecycle, authority review, reauthorization, uninstall, reset, failure, cleanup recovery, dormant-state, responsive web, accessibility, and public operational guidance. |

I1 stays behind `installation_writes_percent`. I2 must preserve the exact two permission-source rules. Invite mode retains the installer's held-bit limit. Code-defined mode permits `Manage Guild` to approve only the exact current authenticated declaration on first install. In either mode, the committed set becomes the relationship ceiling, and later expansion remains owner or `Administrator` only.

The new installation path remains limited to explicitly allowed applications or communities until I3 is deployed. An active installed bot cannot be removed through an ordinary kick path that bypasses lifecycle ownership.

### Stage S: audit, suspension, and recovery controls

| Unit | Branch | Outcome |
| --- | --- | --- |
| S1 | `feat/application-audit-attribution` | Add causal audit columns and indexes, deterministic IDs, application, invoker, bot, interaction, authority, result, partial, compensation, visibility, 45-day retention, and secret or value redaction. |
| S2 | `feat/application-suspension` | Add application-wide and community-scoped suspension, admin ACLs, central enforcement, Gateway termination or filtering, safe audience status, owner notification and review, repair-only access, and reconciled reinstatement. |
| S3 | `feat/application-recovery-controls` | Add the authority epoch, fail-closed recovery hold, ordered restore reconciliation, non-restorable transient cleanup, suspension and deletion journals, runbooks, and proof that restored old authority stays revoked. |
| S4 | `feat/report-evidence-lifecycle` | Add versioned resolution, reopen, hold, expiry, coordinated source, search, and object purge, erasure minimization, grandfathered legacy records, and backup non-resurrection. |

S4 cannot activate until privacy, security, and legal review accepts the future report-evidence policy and public contract change.

### Stage C: application identity and command registry

| Unit | Branch | Outcome |
| --- | --- | --- |
| C1 | `feat/application-command-storage` | Raise the application-owner ceiling to 50 with conditional capacity claims. Add recoverable application creation, stable public handles, freeze and release, command and category identities, immutable revisions and heads, targets, policy and preference storage, background read validation that does not affect users, indexes, reconciliation, limits, and generated contracts. |
| C2 | `feat/application-command-registration` | Add compatible application and community command routes, immediate immutable publication, bulk overwrite, targeting, disablement, exact authority modes, advanced typed options, categories, semantic no-op behavior, review, errors, limits, compatibility fixtures, OpenAPI, and owner current-head reads. |
| C3 | `feat/application-command-administration` | Add community aliases, availability, categories, authority review, role and channel policy, provider recommendation, contextual policy links, local bypass rules, reset, attention, conflicts, and responsive Integrations UI. |

C1 adds storage and validates reads without exposing a public command write path. C2 enables command writes only behind `command_registry_writes_percent`. C3 does not yet add end-user invocation.

The command identity cap is 1,000 retained identities per application at one time. Dormant identities count until safely retired, and retirement frees capacity. Reusing a command after retirement creates a new identity. Handles release within 24 hours only after deletion ownership is proven, otherwise they enter quarantine.

### Stage E: interaction delivery and public responses

| Unit | Branch | Outcome |
| --- | --- | --- |
| E1 | `feat/application-interaction-contracts` | Define tagged interaction and response schemas, compatible numeric types, capability negotiation, response-token hashes, transport configuration, deadlines, status storage, Rust and Erlang code that accepts both old and new data, generated public contracts, and cross-service fixtures. No interactions are created or delivered yet. |
| E2 | `feat/application-interaction-delivery` | Add Gateway delivery, verified HTTP endpoints, signing-key rotation, SSRF-safe deadline dispatch, one bounded retry, breaker health, invocation and autocomplete creation, capability and current-state checks, limits, redacted traces, and real-service probes. |
| E3 | `feat/application-interaction-responses` | Add initial callbacks, original and follow-up operations, defer, autocomplete and modal behavior, public message ownership and versioning, one initial result, five follow-ups, three-second and fifteen-minute lifetimes, idempotency, errors, compatibility smoke, docs, and OpenAPI. |

Through E2, Gateway and HTTP delivery remain available only to explicitly allowed applications and communities. More traffic is enabled only after E3 proves end-to-end response ownership. Ephemeral messages and active components remain rejected until stage R.

### Stage P: native discovery adapter and command picker

| Unit | Branch | Outcome |
| --- | --- | --- |
| P1 | `refactor/app-command-discovery` | Wrap current native command discovery and handlers in a typed provider model, route by immutable identity instead of name at the shared boundary, and prove native behavior parity. No application provider appears yet. |
| P2 | `feat/application-command-picker` | Add application discovery, exact structured selection, providers, aliases, qualified names, advanced options, categories, personal preferences, favorites, hiding, unavailable states, policy recheck, responsive behavior, input-method support, and accessibility. |

P2 cannot choose a collision layout by guesswork. Before the collision presentation is merged, representative variants must be tested in the real composer and product and accessibility review must record the selected design. The underlying identity and query work may proceed before that presentation is approved.

`command_picker_percent` controls discovery and invocation together. Client ranking, display, or stale cached state never becomes authority.

### Stage R: ephemeral messages and rich components

| Unit | Branch | Outcome |
| --- | --- | --- |
| R1 | `feat/ephemeral-interaction-responses` | Add separate account-recipient storage, account-session delivery, dismissal, 24-hour maximum lifetime, text and control payloads only, report snapshots, export exclusion, suspension behavior, cleanup, and privacy tests. |
| R2 | `feat/application-message-components` | Add compatible and structured component grammar, rich containers, buttons, selects, radio and checkbox controls, limits, canonical JSON, application ownership and version, Rust opaque round trip, responsive rendering, accessibility, and inert fallback. These components cannot be delivered to users yet. |
| R3 | `feat/application-component-interactions` | Add audience, reuse, once-per-user and once-global policy, per-person pending and committed state, application-result and native-effect ownership, defer and modal transfer, proven-no-effect rollback, fail-closed reconciliation, versioned public updates, modal lifecycle, and concurrency tests. |

`ephemeral_responses_percent` remains off until the API and client are deployed together. `message_components_percent` cannot turn on until every supported client can render the R2 fallback. R3 tests every callback, defer, modal, native success, native failure, timeout, retry, competing claim, and ambiguous-effect race.

### Stage M: staged command publishing and recovery

| Unit | Branch | Outcome |
| --- | --- | --- |
| M1 | `feat/application-command-drafts` | Add one optional versioned draft, validation, canonical diff, expected base and head, atomic publish, authority review, semantic no-op behavior, and owner Overview, Commands, and Draft views. |
| M2 | `feat/application-command-recovery` | Revalidate a retained immutable manifest and publish it as a new head. Show authority and target differences and complete owner publication, history, pin, and recovery views. |

Recovery does not rewind history. It does not roll back application code, external or application data, public messages, community-owned configuration, interactions, or completed effects.

In the planned sequence, M starts from updated `main` after R even though it depends only on C2. The dependency graph therefore shows M alongside E rather than below R.

### Stage D: declarative settings and builders

| Unit | Branch | Outcome |
| --- | --- | --- |
| D1 | `feat/declarative-application-settings` | Add bounded typed schemas, immutable application and community heads, manager and application APIs, current references, latest-state delivery and acknowledgement, audit, attention, uninstall dormancy, reserved keys, manager forgetting, expiry, and redaction. |
| D2 | `feat/declarative-application-settings-ui` | Add dynamic Integrations controls, live validation, version conflict recovery, saved and applied status, attention, activity, reset, responsive UI, visual checks, and accessibility. |
| D3 | `feat/declarative-application-builders` | Add bounded repeatable groups and versioned message templates, reuse real message validation, inert preview, no arbitrary fetch or attachment store, conflict-safe editing, limits, docs, and tests. |

The stage starts behind `declarative_administration_percent`. D1 does not depend on later action execution. D3 prepares resources and preview ownership without yet enabling native administrative effects.

### Stage A: declarative administrative actions

| Unit | Branch | Outcome |
| --- | --- | --- |
| A1 | `feat/declarative-admin-actions` | Add bounded manager-only application callback actions, visible application-handled labeling, health checks, offline disablement, no delayed queue, invoker-only results, idempotency, limits, and redaction. |
| A2 | `feat/declarative-message-actions` | Add durable native admin operations and exact publish, update, delete, and reconcile actions for application messages, with preview hash, confirmation, bot authority, message ownership, versioning, audit, deterministic effects, and safe compensation. |
| A3 | `feat/declarative-self-role-panels` | Add button, exclusive, and multi-choice panels with at most 25 registered roles, self-only targets, current bot role authority and hierarchy on every click, per-person presentation, private result, attention, per-effect results, compensation, and security tests. |

Application callback actions never inherit the trust presentation of a Fluxer-native operation. External effects remain outside Fluxer's rollback boundary.

### Stage U: delegated user authority

Delegated user authority exists only in stage U. Earlier stages do not grant it through installations, commands, responses, components, settings, or builders.

| Unit | Branch | Outcome |
| --- | --- | --- |
| U1 | `feat/delegated-action-broker` | Add the exact operation registry, opaque hashed single-use capabilities, actor and parameter binding, current permission and hierarchy recheck, generation and authority revocation, deterministic effects, audit, limits, and replay, substitution, race, and fault tests. No operation is enabled. |
| U2 | `feat/delegated-action-confirmation` | Add server-derived provenance, direct low-impact execution, exact application-selected confirmation, high-impact confirmation, five-minute private confirm or deny, changed-scope invalidation, current-state recheck, and trusted platform presentation. |

U3 through U20 add small native adapters in a fixed risk order. Each branch follows its predecessor, and only the next three may be open. No adapter pull request enables more than three exact privileged operation IDs.

| Unit | Branch | Exact operation scope |
| --- | --- | --- |
| U3 | `feat/delegated-member-moderation` | ban, unban, kick |
| U4 | `feat/delegated-member-state` | timeout set, timeout clear, nickname set |
| U5 | `feat/delegated-member-roles` | voice update, role add, role remove |
| U6 | `feat/delegated-member-role-replacement` | complete ordinary-role replacement |
| U7 | `feat/delegated-message-deletion` | message delete, message bulk delete, attachment delete |
| U8 | `feat/delegated-reaction-clearance` | clear all reactions, clear one emoji, remove one user's reaction |
| U9 | `feat/delegated-message-pins` | pin, unpin |
| U10 | `feat/delegated-channel-lifecycle` | channel create, update, delete |
| U11 | `feat/delegated-channel-access` | channel reorder, overwrite set, overwrite delete |
| U12 | `feat/delegated-role-lifecycle` | role create, update, delete |
| U13 | `feat/delegated-role-layout` | role reorder, hoist update, hoist reset |
| U14 | `feat/delegated-community-settings` | safe settings update, feature toggle, vanity update |
| U15 | `feat/delegated-community-discovery` | discovery apply, update, withdraw |
| U16 | `feat/delegated-emoji-lifecycle` | emoji create/clone, update, delete |
| U17 | `feat/delegated-sticker-lifecycle` | sticker create/clone, update, delete |
| U18 | `feat/delegated-expression-bulk-create` | emoji bulk create, sticker bulk create |
| U19 | `feat/delegated-invite-administration` | invite create, invite delete |
| U20 | `feat/delegated-webhook-administration` | credential-free webhook metadata update, webhook delete |

Every adapter includes:

- Typed parameters plus result and preview schemas
- An adapter to the existing native service
- Current permission and target checks
- Confirmation floors and escalation
- Deterministic effect recovery and causal audit
- Limits and compatibility classification
- Negative and race tests
- Generated API documentation and allowlist rollout

Unsupported, excluded, or unclassified operations never fall back to ordinary bot authority.

## Rollout order

Every storage or wire change follows the same order:

1. Add schemas, constants, generated contracts, and code that can read both old and new data
2. Deploy every service that reads or round-trips the new shape
3. Verify old rows, absent fields, compatibility, and reconciliation while new write and delivery paths remain disabled
4. Enable the feature for explicitly approved internal applications and communities
5. Enable the server path that creates the new records or events
6. Enable dependent client discovery only after the server path is active
7. Broaden through 1, 10, 50, and 100 percent when traffic volume supports percentage rollout. Otherwise, use explicit allowlists
8. Require acceptable authorization, privacy, reconciliation, error, latency, and resource results before each increase
9. Keep a software version available for rollback that can read, revoke, and reconcile the new state
10. After full observation and one complete rollback-capable release cycle, remove the temporary layer in its own cleanup pull request

The temporary layers are:

| Layer | First stage that writes or delivers the data | Earliest removal evidence |
| --- | --- | --- |
| `installation_writes_percent` | I1 | I3 fully observed |
| `command_registry_writes_percent` | C2 | C3 and developer registry use fully observed |
| `gateway_interaction_delivery_percent` | E2 | E3 and P2 fully observed |
| `http_interaction_delivery_percent` | E2 | E3 and P2 fully observed |
| `command_picker_percent` | P2 | P2 fully observed |
| `ephemeral_responses_percent` | R1 | R1 privacy and cleanup fully observed |
| `message_components_percent` | R3 | R3 fully observed |
| `declarative_administration_percent` | D1 | A3 fully observed |
| `delegated_native_actions_percent` | U1 | Every U3 through U20 adapter separately observed and the completeness manifest clean |

Observation periods and numerical service targets are deployment-owned. An unset target blocks advancement.

## Rollback rules

Rollback sets the affected write or delivery percentage and any dependent discovery percentage to zero, then deploys a compatible earlier version of that path. It does not delete rows, run a down migration, or claim a distributed action was atomic.

Services must keep reading existing data, and revocation, suspension, expiry, cleanup, audit, and reconciliation remain available until all written state is terminal or permanently supported.

Specific requirements are:

- Response endpoints stay available for at least the maximum existing fifteen-minute response lifetime after new invocation stops
- Retained ephemeral messages keep dismissal, report access, expiry, and cleanup
- Components become inert and keep static fallback
- Installation rollback completes or rolls back every existing pending lifecycle record
- Command rollback preserves immutable heads and community configuration
- Suspension, deletion journals, and authority epochs can never be disabled as feature rollback
- A binary that cannot enforce current safety state is not a valid rollback target
- New columns, tables, and optional wire fields remain until a later separately reviewed cleanup
- Compatibility is tested in both directions before activation. The current write path must work with the previous read path, and the previous write path must work with the current read path

## Checks required for every change

Every pull request runs focused tests, root `pnpm typecheck`, root `pnpm test`, public-export checks when applicable, `git diff --check`, complete branch-diff review, and secret and content leakage review.

Additional checks apply according to the part of the system being changed:

- Table changes need generated Cassandra diff and verification plus Cassandra and Postgres KV integration behavior
- Shared schemas need source generation and generated-drift inspection
- API routes need OpenAPI generation, validation, semantic review, and external Dart-dispatch impact review
- Rust needs formatting, lint with warnings denied, and focused plus workspace tests
- Erlang needs formatting, compilation, Dialyzer, and EUnit
- Documentation needs a build and link and example verification
- Responsive web needs focused tests, build, real wide and narrow visual inspection, keyboard, focus, input method, screen-reader, contrast, and touch checks
- S, R, U, and A need failure injection, concurrency, malformed input, replay, substitution, SSRF, privacy, authorization, redaction, and runbook drills as applicable
- Every path that writes or delivers new production data needs dashboards, alerts, probes, rollback, and reconciliation runbooks before it receives production traffic

A skipped complete check is reported as skipped. Focused or mocked checks are not relabeled as integration, runtime, visual, production, legal, or disaster-recovery proof.

## What must be complete before release

The plan is complete when:

- Every approved stage and launch-blocking policy choice is implemented
- Every temporary layer is removed
- Compatibility fixtures and the migration smoke test pass
- Reconcilers show no unexplained partial state
- Recovery and privacy drills pass
- Excluded work remains outside these stages

The separate Flutter client, direct-message and global application contexts, user and message context commands, Activities, and an official SDK are not in these stages. A future SDK would need a separate post-stability project, owner, support policy, security process, fixtures, and release authorization.

See [acceptance scenarios](../reference/acceptance-scenarios.md) for the release cases that exercise this sequence.

## Continue reading

- Previous: [Failure, recovery, and operations](09-failure-recovery-and-operations.md)
- [Research index](../README.md)
- Next: [Open decisions](11-open-decisions.md)
