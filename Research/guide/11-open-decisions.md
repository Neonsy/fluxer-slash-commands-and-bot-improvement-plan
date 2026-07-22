# Open decisions

Most product and security choices are settled. The items still open are user-interface choices that need prototypes, deployment-specific numbers, policy approval, and release decisions.

## What is already decided

Implementation should not reopen these choices without new conflicting evidence or an explicit product decision:

- One durable community installation relationship with a fresh generation on reinstall
- No inferred or automatic backfill of legacy bot relationships
- Exactly one installation-owned managed role for every new installation, including zero-permission bots
- Invite-mode permission selection bounded by the installer's held permissions
- An opt-in code-defined permission source that permits `Manage Guild` to approve only the exact authenticated declaration on first install
- A retained authority ceiling that only the owner or `Administrator` may enlarge later
- Stable application handles and command identities independent of mutable labels
- Discord-compatible community chat-input commands as the base migration path
- Gateway or verified outgoing HTTP as mutually exclusive interaction transports
- Three seconds for initial acknowledgement and fifteen minutes for response authority
- At most five follow-ups per interaction
- Separate recipient-owned storage for ephemeral messages with a maximum requested lifetime of 24 hours
- No media or attachment support in the first ephemeral-message release
- Exact application, message, version, generation, component, and audience binding for controls
- Developers own settings definitions, communities own saved values, and Fluxer owns versioning and delivery status
- Ordinary bot calls remain bot-authorized
- Native authority uses only `AS_USER`, `AS_BOT`, or `REQUIRE_BOTH`
- Delegated effects use a typed, revocable, single-use capability for one registered operation
- Confirmation class follows trusted value provenance and actual impact
- Suspension is separate from uninstall, credential repair, and permanent deletion
- Restore never reactivates transient authority or ephemeral message payloads
- The eleven-stage dependency graph and the limit of three open dependent pull requests
- No direct-message, global or user installation, context command, Activity, Flutter, or official SDK work in the delivery stages

The PRD and reference files already define the data model, errors, service ownership, tests, rollout, and branch units. The sections below list only the decisions that still need an answer.

## Architecture review

Before implementation begins, the complete plan, current-state evidence, security boundaries, compatibility choices, migrations, and branch plan need an architecture review through the project's chosen design venue.

That review must pay particular attention to the two installation permission sources:

- Authenticated ownership, versioning, and exact-set equality for the code-defined declaration
- Preservation of the existing invite-mode held-permission rule
- Consent and commit-time checks when the source or revision changes
- Durable ceiling retention across uninstall and reinstall
- Rejection of added URL bits, role position changes, and supplemental role assignments
- Owner or `Administrator` approval for later expansion

Update the plan to reflect the findings before implementation. If a finding conflicts with product intent, record it as an open decision instead of resolving it in code.

Blocks: all product delivery stages.

## How to group the work into releases

The dependency units are fixed, but they still need to be grouped into supported milestones.

Any grouping must preserve these requirements:

- Compatible installation, commands, interaction delivery, and public response precede optional Fluxer-native extensions
- End-user discovery does not expose application commands before current server invocation paths exist
- Ephemeral results and component ownership precede declarative actions and delegated confirmation
- Delegated authority remains its own high-risk release path
- Temporary rollout layers stay private and removable
- Rollback, suspension, cleanup, audit, and reconciliation remain available across milestone boundaries

Blocks: public milestone commitments and general rollout.

## How duplicate command providers should appear

Stable provider identity, exact selection, ordering precedence, current authorization, unavailable states that reveal no private details, and automatic resolution only from an explicit preference are fixed.

The exact visual and control pattern is not fixed. Before the picker implementation chooses flat rows or collision grouping, optional provider cycling, and the location of preference controls, representative variants must be tested in the real composer.

Evidence must cover:

- Zero, two, and many providers
- Large catalogs and long localized names
- Stale and unavailable providers
- Narrow touch layouts, high zoom, and reduced motion
- Keyboard, input method, and screen-reader use
- A visible accessible equivalent for context menus or long-press actions
- Expected Tab and focus behavior

Any variant that obscures provider identity, changes dispatch meaning, traps focus, or lacks an accessible preference path fails. The selected pattern and its accessibility evidence must be recorded in the picker specification before the collision UI merges.

No unsupported numerical success threshold is invented.

Blocks: the production collision presentation in P2.

## Authority and confirmation security review

The authority modes, compatible bot boundary, operation registry, provenance classes, confirmation classes, and explicit exclusions are specified. Before native operation work begins, the implemented schemas and UI must pass security and product review without weakening those boundaries.

Review must verify that:

- Application callbacks remain visibly application-handled
- Ordinary bot REST never inherits the invoking member
- One actor's permission cannot substitute for the other's
- Application text cannot choose the actor, operation, target, risk floor, or audit fields
- Class 0 exposes the exact action before execution
- Class 1 binds application-selected scope to a private confirmation
- Class 2 covers bulk, access, hierarchy, permission, history, durable credential, and destructive effects
- Confirmation never bypasses live authorization or direct reauthentication exclusions
- Unsupported operations never fall back to another authority mode

Blocks: stage U and the native action portions of stage A.

## How long report evidence should be kept

The proposed policy keeps evidence while a case is open and for 180 days after terminal resolution. It supports explicit reopening and reviewed legal or statutory holds. When an expired hold is released, purge must finish within seven days across every copy. Records resolved before the policy takes effect remain under the existing rules unless a separate migration is approved.

That lifecycle changes the current public up-to-one-year report-snapshot statement. It needs privacy, security, and legal review for each applicable jurisdiction and deployment before activation.

Review must decide and document:

- Whether a stricter lawful deletion rule shortens the ordinary baseline
- Which obligations authorize a case-specific hold
- Who may create, review, renew, and release a hold
- Public privacy-policy wording and activation date
- Account-deletion and erasure field treatment
- Whether any separately reviewed legacy cleanup migration is justified

No implementation may infer a destructive deadline for legacy records. A later legacy migration would need dry-run counts, every storage copy, affected dates and types, legal exclusions, hold treatment, staged deletion, recovery limits, and explicit authorization.

Blocks: S4 activation and any ephemeral-message report rollout that depends on the new policy.

## Production targets and rollout checks

The required metrics, dashboards, alerts, probes, and runbooks are fixed. Their numerical targets require real deployment traffic, topology, capacity, and staffing evidence.

Before each affected production rollout step, record:

- Latency and availability targets
- Error and saturation thresholds
- Capacity and concurrency thresholds
- Backlog age and convergence targets
- Alert floors, rates, and evaluation windows
- Rollout percentages or explicit allowlists
- Observation duration after each step
- On-call and incident response coverage

Authorization and privacy invariant failures remain zero-tolerance and page immediately. The rollout cannot proceed while required numerical values are missing.

Blocks: rollout beyond internal allowlists for the affected layer.

## Backup and disaster-recovery promises

The recovery sequence, authority-epoch rotation, transient-state purge, journal replay, reconciliation hold, backup manifest, and non-resurrection behavior are fixed.

Each deployment must choose and prove:

- Recovery point objective
- Recovery time objective
- Backup retention and oldest restorable backup age
- Recurring isolated restore-drill frequency
- Maximum restore and reconciliation validation window
- Journal safety margin
- Geographic replication scope or an explicit statement that none is promised
- Latest successful representative encrypted restore result

Journal retention must be at least the oldest restorable backup age plus the maximum validation window plus the deployment safety margin.

Repository estimates, backup upload success, or provider redundancy do not prove these promises. Material backup, replication, key-management, schema, or restore-orchestrator changes require another representative drill before broad rollout.

Blocks: rollout beyond internal allowlists and release of the recovery hold.

## Maintaining the public protocol and compatibility

Before public compatibility is claimed, document how the project will maintain:

- The public interaction and command protocol
- Generated schemas and OpenAPI
- The compatibility manifest and conformance fixtures
- The pinned Discord-library migration smoke
- Minimum twelve-month stable public capability replacement overlap
- Migration guidance and developer support
- Security response and emergency deprecation

Every unsupported Discord feature or API and every intentional Fluxer difference must be documented and tested before compatibility is claimed. Discord and other external contracts must be rechecked during implementation because the archived audit can become stale.

Blocks: public compatibility claims and general developer availability.

## Limits that still need production evidence

The following numbers are starting values. Current production traffic does not prove them:

- 24-hour deleted-handle release deadline
- 50 non-deleted applications per owner
- At least twelve months of replacement overlap for stable capabilities
- 1,000 command identities per application
- The newest 20 recoverable manifests plus at most five explicit pins
- Collection, component, queue, settings, and resource bounds recorded in their contracts

Implementation must measure load, failure, adoption, abuse, storage growth, and cleanup behavior and define explicit review triggers. Evidence may support a future reviewed change. It cannot silently weaken authorization, delete referenced state, reinterpret a missed commitment as success, or change a public compatibility promise without migration review.

Blocks: expansion beyond tested capacity limits.

## Production rollout approval

Passing implementation checks does not itself authorize production traffic. Each rollout step can proceed only after its required compatibility, security, privacy, performance, accessibility, reconciliation, rollback, and recovery evidence exists and release approval is recorded.

The approval records the deployed version, rollout group, observation period, evidence links, open incidents, version available for rollback, and result. A rollout step cannot proceed until its allowlist or traffic percentage is set and approval is recorded.

Blocks: the first group to receive production traffic and every later expansion.

## External application behavior

Fluxer cannot decide or validate the behavior of application-owned databases, dashboards, billing, subscriptions, external authentication, or third-party effects.

The product must keep this boundary clear. An application-reported success or partial result is not platform proof. Fluxer retries only where its public contract has an idempotent identity and never promises to roll back an external effect.

Blocks: any UI or documentation claim that an external action is Fluxer-atomic, verified, or reversible.

## A future official SDK

An official TypeScript SDK is not an open task inside this roadmap. Raw HTTP and compatible Discord libraries remain first-class supported paths.

After the public protocol, generated contracts, compatibility manifest, cross-runtime fixtures, and real-service smoke paths are stable, maintainers may propose a separate project. Before calling it official, that project would need:

- A documented maintenance and support policy
- Supported protocol and runtime ranges
- Semantic version, deprecation, and security-update policy
- Release signing and provenance
- Secret-safe diagnostics
- Compatibility testing against the same raw fixtures and service paths

That future review would authorize package creation and release separately. It cannot become an unplanned twelfth stage or a migration requirement.

## How new questions enter the plan

If implementation evidence exposes a materially different user-visible behavior, authority boundary, compatibility promise, data lifecycle, or external effect, work stops at that boundary and the question is recorded here with alternatives and consequences.

Routine schema layout, error naming, service boundaries, tests, rollout mechanics, and branch details already covered by the plan do not need to be repeatedly presented as open decisions.

See [acceptance scenarios](../reference/acceptance-scenarios.md) for the release and failure cases that constrain these decisions.

## Continue reading

- Previous: [Implementation roadmap](10-implementation-roadmap.md)
- [Research index](../README.md)
