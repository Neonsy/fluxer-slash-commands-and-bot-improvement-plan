# Operations and Data Contracts

This contract covers suspension, reconciliation, abuse protection, observability, rollout, retention, report evidence, backup, and restore. Each deployment must still set the values marked open.

The [orientation](../guide/01-orientation.md) provides the product context. The [glossary](glossary.md) defines the recurring terms used in this contract.

## Suspension does not replace lifecycle state

Suspension is reversible instance safety state. It is not credential revocation, uninstall, dormancy, or deletion.

Application-wide and installation-scoped rows store application, optional community, state, version, private reason, safe category, actor, time, and reinstatement request data. Absence means not suspended.

State is:

```text
SUSPENDED
REINSTATING
```

Application-wide state dominates installation-scoped state. Rows have no TTL. Every mutation uses expected-version compare-and-set and optional idempotency key.

Private reason codes are `COMPROMISED`, `MALICIOUS_BEHAVIOR`, `POLICY_VIOLATION`, `SECURITY_INCIDENT`, or `OTHER`. A private operator reason of 1 to 1000 characters is required.

A separately chosen audience-safe category is `APPLICATION_COMPROMISED`, `SECURITY_CONCERN`, `POLICY_ENFORCEMENT`, or `UNSPECIFIED`. It is not copied, truncated, or summarized from the private reason.

### Who can suspend an app

Full suspension state and history require `application:suspension:view`. Transitions require `application:suspension:manage`. Existing application lookup sees only safe suspended status. Community managers and application owners cannot override instance suspension.

Typed operations suspend or reinstate one application or one application and community relationship. They require the ordinary admin audit-reason header, reason code, expected version, and optional request identity.

### What suspension blocks

One central policy runs after application authentication and community derivation on every authority-creating path:

- Bot REST and delegated native actions
- Interaction creation, transport delivery, callback, follow-up, autocomplete, and component activation
- Command publication and targeting
- Declarative configuration and action delivery
- OAuth installation and reauthorization
- Response token, confirmation, delegated capability, pending component commit, transport activation, and delivery

The source-of-truth write blocks new work immediately. Versioned cache invalidation accelerates propagation but is not authorization. Outstanding authority checks suspension at use and remains permanently invalid after the overlay clears.

Application-wide suspension terminates bot Gateway sessions and blocks new bot authentication. Installation suspension keeps a shared bot session available for other communities but suppresses and rejects all activity in the target community.

### What users and owners can see

While suspended:

- Ordinary discovery and invocation disappear or become inert
- The bot shows a platform-owned suspended indicator in affected scope
- Community owner, `Administrator`, and `Manage Guild` receive a durable Integrations alert with safe status
- The application owner can inspect safe status, manifests, configuration, and delivery health
- The owner may rotate or revoke credentials and repair or verify transport
- Publication, targeting, activation, interactions, responses, and bot actions remain disabled
- Community managers may still uninstall
- Delivered ephemeral messages remain readable under their usual dismissal and expiry rules but lose application mutation and control authority

The current application owner receives a durable developer notice and existing-style transactional account email. Community managers receive no email. Email failure cannot block the transition. Notifications contain safe category, scope, time, operational effect, and audience-appropriate guidance, never private reason, evidence, credentials, or endpoint detail.

The owner may open one version-bound review request with a 1 to 2000 character remediation explanation. The request accepts no attachments, credentials, secrets, callback bodies, or report evidence. Authorized safety operators may ask for more information, reject the request, or accept it. Acceptance starts normal reinstatement, but the application remains suspended until reconciliation finishes.

Review state is `REQUESTED`, `NEEDS_INFORMATION`, `REJECTED`, or `ACCEPTED`. Only one request may be active in `REQUESTED` or `NEEDS_INFORMATION` for the current suspension version. A version change makes the old request historical. Community managers cannot submit or read the owner's review content, and no review state carries a response-time promise.

### Reinstatement

`SUSPENDED` moves to `REINSTATING` and remains enforced. The reconciler checks:

1. Application and bot identity plus required credential repair
2. Every relationship that would regain authority is `ACTIVE` with exact role, member, assignment, and ownership
3. Dormant or permanently deleted relationships are verified as such
4. Selected transport and signing configuration are verified and healthy
5. Manifest and configuration heads are internally consistent
6. No permanent deletion, uninstall, incomplete cleanup, or broader suspension dominates

Only then may the row clear with a new version. Dormant relationships remain dormant. The application reconnects or receives a new interaction. Old interactions, components, confirmations, and capabilities stay terminal.

A failed check leaves `REINSTATING` enforced and reports a safe class in authorized operator and developer views.

## Resource protection

Every request is charged before expensive semantic work where possible. Invalid, stale, duplicate, unauthorized, and idempotent requests consume the applicable budgets. A test or operations rate bypass never bypasses payload, concurrency, ownership, suspension, permission, or authority checks.

### Limits checked before parsing

| Input | Cap before parse |
| --- | ---: |
| Command manifest or draft | 8 MiB plus 16 KiB framing |
| Single command definition | 512 KiB plus 16 KiB framing |
| Interaction callback, response, or component JSON | 512 KiB |
| Autocomplete callback | 64 KiB |
| Declarative schema, value, or action | Its schema-specific cap |
| Gateway Identify | Existing 4096-byte frame cap |

Excess is rejected with HTTP 413 before JSON or Zod allocation. Bot-platform JSON is not compressed initially. Attachments use the existing upload, count, size, and scanning pipeline instead of base64 JSON.

After 100 path errors, the response stops adding details and reports that more were omitted. It never echoes the complete input.

### Concurrency and fanout limits

- One manifest-head mutation may be in flight per application.
- At most two autocomplete requests are pending per user and application.
- At most 50 autocomplete requests are pending per installation.
- At most one component commit is pending per user, message, and component semantic identity.
- One installation may have at most 1000 nonterminal interactions.
- One delegated capability executes exactly one registered operation.
- Bulk work uses separate registered operations with explicit cardinality and confirmation.
- Public message updates require expected version and are never automatically merged or retried.
- Category policy updates one row and never fans out into command rewrites or callbacks.
- Multi-value input is not permission to fan out effects.
- Conditional graphs and temporal input are validated in bounded linear work before delivery.
- Ephemeral message and component audience rules cannot create application-controlled fanout.

Repeated malformed behavior uses route, global, and IP throttling and can affect endpoint health. It does not automatically create a permanent suspension. Suspension remains a separate audited safety-operator action.

## Who repairs incomplete work

The durable domain record decides the current state of the work. JetStream delivers work, and the job ledger shows its progress. Neither replaces that durable record.

Every transition:

- Records deterministic operation and effect identity before enqueue
- Can be rediscovered by a bounded state query when enqueue is lost
- Uses a versioned lease and rereads state after claim
- Verifies or applies external effects by deterministic identity
- Conditionally advances aggregate state
- Turns stale and duplicate workers into no-ops
- Records exact partial state and safe failure

Generic dead-letter or job status never closes a domain operation. Exhaustion enters the explicit failed state and creates alerting plus version-checked recovery.

Reconcilers never infer ownership from names and never overwrite another owner. Ambiguity is a hard invariant failure.

Due-state sweeps process at most **200 rows per page** with a durable cursor.

### Repair owners and schedules

| Aggregate | Sole owner | Repair cadence |
| --- | --- | --- |
| Install, rollback, uninstall | Installation lifecycle domain | Immediate plus one-minute due sweep |
| Permanent application deletion | Application deletion orchestrator | Immediate plus five-minute tombstone sweep |
| Command head and indexes | Command registry repository | Synchronous publication plus five-minute integrity sweep |
| Configuration delivery | Configuration service | Immediate plus one-minute due sweep |
| Message reactivation | Message reconciliation service | Explicit request plus one-minute pending sweep |
| Component outcome | Component outcome service | Immediate terminal signal plus one-minute due sweep |
| Reinstatement | Suspension service | Immediate plus one-minute `REINSTATING` sweep |
| Ephemeral expiry | Ephemeral lifecycle service | Logical read check plus minute-bucket cleanup |
| Native effect and audit integrity | Native action broker | Immediate plus bounded periodic scan |

The current application-deletion task is expanded rather than duplicated. Deletion uses per-community child rows so one failure does not hide other progress.

Command reconciliation verifies that the head references a complete checksum-valid revision. It marks an invalid head unavailable and alerts operators. It removes only unreferenced candidate artifacts older than **one hour** after a fresh reference check.

Configuration delivery always sends the latest source version. Retry starts at one second and caps at five minutes. Suspension, uninstall, and offline state pause rather than consume attempts.

Message reactivation requires an explicit request with message ID, expected version, current component schema, and preserve-state choice. No periodic scan can make an inert panel active.

Component reconciliation never infers success from transport acknowledgement, changes outcome owner, retries a native effect, or reopens stale authority. Partial or contradictory evidence stays fail-closed.

Administrative cancellation stops the current lease only. It does not mark the domain successful. Manual actions are limited to retry, stop future automatic attempts into an explicit failed state, or invoke an already defined product reset or delete operation. There is no generic force-complete or force-ownership action.

## Ephemeral message data

Ephemeral message content is stored outside ordinary channel message partitions. Logical expiry and dismissal revoke reads and controls before asynchronous physical deletion.

Ordinary ephemeral messages last at most 24 hours. Security confirmations last at most five minutes. Operational metadata containing only IDs, counts, state, safe failure, timing, and timestamps lasts at most 24 hours.

Ephemeral content and values never enter ordinary search, autocomplete index, link preview, analytics payload, trace, log, or account export. Disaster restore never returns ephemeral content to the user interface.

Reporting copies one exact displayed version into the shared safety evidence domain. The recipient copy then follows normal dismissal or expiry independently.

## How report evidence is kept and deleted

The proposed policy applies equally to existing message reports and ephemeral report snapshots. Activation requires privacy-policy and legal review because the current public policy states an up-to-one-year snapshot lifecycle.

### New reports

- `OPEN` and `REOPENED` evidence remains while review is active.
- Resolution sets `evidence_expires_at` to **180 days after resolution**.
- Reopen before expiry clears that deadline.
- The next resolution starts a new 180-day period.
- Expiry logically revokes evidence before coordinated physical purge.
- Only anonymous broad aggregates without IDs, excerpts, object references, or reidentifying small cells may remain.

### Legacy activation

Activation records one policy generation and cutoff.

- Reports already resolved before activation become `LEGACY_RETAINED`.
- No new expiry is inferred for them.
- Reports pending at activation adopt the new generation only when later resolved.
- Reopened legacy reports adopt current generation on later resolution.
- New reports use current generation.
- Null or unknown generation never qualifies for purge.

There is no destructive legacy backfill. A later cleanup requires separate legal and safety approval, dry-run counts and sizes, statutory exclusions, staged deletion, recovery analysis, and audit.

### Holds

A hold records a non-secret ID, authority, category, restricted reason or reference, actor, time, next review date, release data, and version. The next review date is mandatory and no more than **90 days away**.

Hold creation and release use separate ACLs and audit. No application, community, reporter, or reported user can create or remove a hold. If ordinary expiry passed while held, release starts logical revocation immediately and physical purge completes within **seven days**.

Binding statutory duties override the 180-day default within exact hold scope. Hold data is not exposed to applications, managers, reporters, search, export, or analytics.

### Account deletion and erasure

Account deletion cannot destroy an open or held safety case. Unneeded direct contact fields are removed. Needed identities use report-scoped pseudonymous references where feasible and never a plain unsalted Snowflake hash.

Resolved evidence keeps its existing deadline and is not extended by account deletion. An erasure request receives a field-level basis and scope review. Restricted evidence remains access-controlled with its own next review or expiry.

### Coordinated purge

One versioned aggregate owns report row, search document, copied objects, and dependent indexes.

1. Conditionally claim `PURGING` after rechecking status, expiry, hold, and reopen version
2. Remove every search entry and read path
3. Delete copied evidence objects and indexes
4. Delete or redact the source to a minimal audit record
5. Record completion or safe failure and retry by deterministic operation ID

Minimal purge audit contains report ID, broad type and category, outcome, resolution and purge times, hold-existed flag, operation result, and integrity proof. It contains no content, participant, application, community, message, contact, invite, or object-path data.

Purge markers remain in the non-resurrection journal longer than every restorable backup plus validation and safety margin.

## Application and community data ownership

Uninstall retains community-owned command and declarative configuration dormant while revoking application access. Permanent application deletion removes application-global definitions and every relationship after global revocation. Permanent community deletion removes all scoped state while leaving the application source available elsewhere.

Public bot-authored messages survive uninstall and become inert. Permanent application deletion preserves or anonymizes them under current deleted-bot behavior while stripping authority. Community deletion removes them with community message data.

Account-wide favorites and hiding survive uninstall because the application may exist elsewhere. Permanent application deletion removes references to that application. Community deletion removes only community-scoped preference and usage data.

Safety reports and guild audit use their own retention. Application or community deletion does not silently reset those policies.

## Backup and disaster recovery

### What must survive recovery

| Class | Recovery behavior |
| --- | --- |
| Durable source | Restore application, installation, command, configuration, suspension, audit, effect, and public message source before derived state |
| Durable secret | Restore encrypted signing-key generations and KMS references without plaintext exposure |
| Derived query state | Rebuild indexes, caches, dashboards, Gateway memory, and denormalized lookups from source |
| Short-lived authority | Never reactivate response tokens, capabilities, confirmations, component commits, queues, or attempts |
| Ephemeral payload | Do not restore to users |
| Passive usage | Empty recovery is allowed and restore may not extend the 90-day inactivity lifecycle |

Each backup set has a signed manifest containing schema and service versions, source stores, object prefixes, cutoff times, checksums, key references, and included recovery classes. Successful upload is not a successful verified backup.

Cross-store snapshots are not described as atomic. Recovery uses immutable heads and entity invariants:

- A command head is used only when its complete revision verifies
- An installation activates only when relationship, generation, role, member, assignment, and ownership agree
- Configuration source is restored but old delivery attempts are discarded
- Privileged effect and audit causality must agree before authority opens

### What recovery must not restore

Every issued authority record binds a server-owned authority epoch. Disaster recovery increments the epoch before external traffic resumes. Old tokens and claims then fail even if wall-clock expiry remains.

Transient queues, pending components, confirmations, and capabilities are purged. Ephemeral rows and objects are excluded or purged before exposure.

Suspension, permanent deletion, manager Forget, and superseded-value expiry have an independently recoverable value-free journal. Restore replays entries newer than the base snapshot before authority or configuration reads.

If journal, cutoff, manifest, or key integrity cannot be verified, the platform remains in recovery hold. Diagnostic reads may remain possible, but no bot action, interaction, installation, configuration delivery, or service that changes data is enabled.

### Restore sequence

1. Block services from writing or delivering new work and select the cutoff
2. Verify and decrypt manifests, durable stores, public objects, and secret references
3. Increment authority epoch and purge transient and ephemeral classes
4. Replay suspension, deletion, configuration erasure, and expiry journal
5. Run schema and canonical-source integrity scans
6. Rebuild denormalized tables and verify publication heads
7. Run installation, deletion, suspension, command, configuration, component, and audit reconcilers
8. Rebuild search and caches and require fresh Gateway Identify
9. Require HTTP endpoint and key health or keep commands unavailable
10. Enable internal automated test applications, verify every required check, then deliberately widen traffic

Every step is idempotent and durable. Failure blocks dependent enablement. Operators do not patch tables around ownership or compare-and-set rules.

## Recovery targets each deployment must set

Before rollout beyond internal allowlists, each deployment records and proves:

- Recovery point objective
- Recovery time objective
- Backup retention and oldest restorable backup age
- Isolated restore-drill interval and latest result
- Geographic replication scope or a clear statement that no replication is promised
- Maximum restore and reconciliation validation window
- Journal safety margin

Evidence comes from a representative encrypted restore. A material backup, replication, key-management, schema, or orchestrator change requires another drill before broad rollout.

Journal retention satisfies:

```text
journal retention >= oldest restorable backup age
                   + Maximum restore and reconciliation validation window
                   + Deployment safety margin
```

Official and self-hosted deployments choose their own measured values. Public documentation identifies the deployment to which a promise applies.

## Observability

Metrics use the `fluxer_bot_platform_` prefix and bounded labels. Required layers cover installation, command registry, interaction routing, responses, components, ephemerals, delegated actions, and suspension.

Allowed labels include service, layer, operation enum, transport, interaction or component type, authority mode, result class, stable error code, rollout group, and retry number.

Metrics never label application, community, channel, message, interaction, capability, user, target, URL, hostname, command, selector, or arbitrary error text. Cardinality tests are required.

One server trace ID links invocation, delivery, callback, response, component, native action, audit, and reconciliation. Access-controlled traces may include safe IDs for lookup. They never include tokens, capabilities, credentials, signatures, headers, bodies, values, ephemeral content, attachments, DNS answers, full URLs, or remote error bodies.

### Metrics required for release

Operators must calculate:

1. Eligible invocation availability
2. Platform delivery timeliness within three seconds
3. Response-operation availability and latency within 15 minutes
4. Lifecycle convergence and backlog age
5. Privileged effect and audit completeness
6. Ephemeral recipient privacy and deletion lag
7. Authorization correctness

Authorization and privacy violations must remain zero and are never traded against an error budget.

Exact percentage, latency, capacity, and alert thresholds are deployment-owned. Security and privacy invariant violations page immediately.

### Required runbooks

Before increasing the traffic using a feature, operators test runbooks for rollout changes, targeted suspension, lifecycle repair, transport and key diagnosis, response and component recovery, native-effect and audit gaps, restore, ephemeral privacy incidents, compatible rollback, and redacted support traces.

Every runbook names prerequisites, scope, safe commands or endpoints, stop conditions, verification, rollback, and escalation. No runbook bypasses repository ownership with manual data edits.

## Temporary rollout switches

Rollout controls are private temporary engineering controls, not a public self-hosted feature or permanent global interaction switch.

One typed versioned object controls percentages for installation writes, command writes, Gateway delivery, HTTP delivery, picker, ephemerals, components, declarative administration, and delegated actions, plus application and community allowlists.

Percentages are integers from 0 to 100. Eligibility hashes stable application and community IDs. Allowlisting affects only one layer and never bypasses prerequisites. Configuration rejects impossible combinations.

There is no flag for schema validation, suspension, permission, generation, or audit integrity. Those checks stay active once every supported service and client that reads the data can accept it.

Server entry points enforce eligibility. Client checks are presentation only. Turning a flag down stops new writes, delivery, or authority. It does not roll schema backward, delete state, revive an old representation, or claim partial work was atomic. Reconcilers continue.

### Rollout order

1. Deploy additive schemas and code that can read both old and new data while new write paths remain disabled
2. Deploy every service that reads and writes the new fields
3. Verify compatibility and reconciliation results
4. Enable the feature for explicitly approved internal applications and communities
5. Gradually increase the percentage of traffic using the new write or delivery path after each required check passes
6. Enable dependent UI after authoritative server paths
7. Reach 100 percent and complete the deployment-owned observation window
8. Make the feature the default, then remove the temporary branch and field

A field is removed only after every supported service and client that reads the data can accept it, the 100 percent rollout completes its observation period, compatible rollback includes the required safety behavior, any remaining backlog has an accepted explanation, and all required checks pass. Targeted suspension or normal deployment rollback must remain available for recovery.

## When rollout may advance

Enabling a feature for any explicitly allowed application or community requires metric and cardinality tests, trace redaction, a dashboard, synthetic success and failure probes, and a runbook for that feature.

Increasing the traffic percentage requires a healthy comparison between the enabled and disabled groups, live alerts, and bounded reconciliation.

Reaching 100 percent requires cross-service dashboards, load and failure evidence, on-call coverage, a compatible software version available for rollback, and a disaster-recovery rehearsal for affected data.

Flag removal requires stable indicators through the selected observation window and all temporary-field removal criteria.

## Required release checks

Implementation must prove:

- Suspension enforcement at every authority source, scoped session behavior, safe notification, owner review, and fail-closed reinstatement
- Every pre-parse, structural, concurrency, and fanout bound under adversarial input
- Domain source ownership, lost enqueue repair, lease expiry, stale workers, deterministic effects, bounded sweeps, manual recovery, and no force-success path
- Ephemeral logical and physical deletion, recipient isolation, report transfer, export exclusion, and disaster non-restore
- Report resolve, reopen, hold, release, 180-day expiry, seven-day purge, account deletion, legacy cutoff, cross-copy fault recovery, and non-disclosure
- Application deletion and community deletion ownership without cross-scope loss or resurrection
- Backup manifest verification, epoch rotation, journal replay, recovery hold, fresh sessions, derived rebuild, and measured restore drill
- Bounded metrics, trace redaction, dashboards, alerts, and every required runbook
- Compatibility between the previous and current read and write paths, background read validation that does not affect users, checks before each rollout increase, rollback of the new write path, continuous safety reconciliation, and removal of temporary flags
