# Failure, recovery, and operations

The platform crosses databases, queues, the Gateway, HTTP endpoints, message storage, search, object storage, and native community services. Fluxer cannot make all of those effects one transaction, so every incomplete operation must be visible, idempotent, and recoverable.

These operating and recovery rules are planned. Fluxer already has worker, metrics, audit, and rollout infrastructure, but no bot-platform lifecycle owner or recovery contract.

## Current limitations that shape the plan

Current background work uses JetStream, the message broker that carries queued work, plus a separate human-facing job ledger. Queue publication, ledger updates, handler side effects, acknowledgements, and publication to a dead-letter queue for exhausted work are separate operations.

That means:

- A queued job may exist without its ledger row
- A completed effect may run again after failure before acknowledgement
- A handler can succeed even when its success status was not recorded
- Generic dead-letter state cannot prove a domain operation completed

Current row versions also do not provide a general expected-version compare-and-set. The helper reads a version, derives the next value, and writes without requiring the observed value to remain current.

The existing queues and job ledger remain useful for delivery and visibility. Conditional writes provide the missing correctness boundary. The durable domain record, not the queue or UI, decides the current state.

The [workers and persistence](../reference/current-state.md#workers-and-persistence) section shows how the current queue, ledger, and row-version behavior was verified.

## Durable intent before asynchronous work

Every lifecycle or privileged operation follows one model:

1. Write the intended transition and deterministic operation and effect identities
2. Move the durable domain record into an explicit pending state
3. Enqueue immediate work
4. Let a bounded sweep repair lost enqueue or delivery
5. Claim a versioned lease and reread current state
6. Verify or apply each deterministic effect
7. Record every exact result
8. Use a conditional update to move the durable domain record into an explicit final or blocked state. A final state may record success, failure, expiry, or revocation

The queue accelerates work. It does not prove that work was recorded or completed. A delivery acknowledgement, cache update, UI state, audit event, or index is never transaction proof.

A retry reuses the same effect identity. It does not allocate a second role, message, command revision, response, capability, delivery, or audit entry. A stale or duplicate worker does nothing after rereading the current durable state.

Automatic attempts are bounded. When they are exhausted, the domain enters an explicit failed state and exposes a version-checked retry or repair path. A generic job screen cannot mark the domain complete or force ownership.

## One responsible service for each recovery path

Separate services own separate state machines:

| State | Responsible service | Required behavior |
| --- | --- | --- |
| Install, rollback, uninstall | Installation lifecycle | Verify owned role, bot member, assignment, generation, revocation, and cleanup. |
| Permanent application deletion | Application deletion orchestrator | Block authority first, track cleanup by community, remove secrets and owned data, verify absence, complete deletion journal. |
| Command publication | Command registry | Keep one complete immutable head, repair derived indexes, and disable an invalid head rather than expose partial data. |
| Settings delivery | Configuration service | Preserve the saved head, deliver only the latest full version, and pause safely while offline or suspended. |
| Message reconciliation | Application message service | Reactivate old content only after an explicit current request, ownership proof, version check, and new generation binding. |
| Component outcome | Component outcome service | Keep the first selected result owner, commit proven success once, release only proven no-effect work, and hold ambiguity closed. |
| Reinstatement | Suspension service | Verify identity, installation, role, transport, manifests, configuration, and dominant lifecycle state before clearing the overlay. |
| Ephemeral message expiry | Ephemeral message lifecycle | Revoke logical access first and delete private copies without extending their lifetime. |
| Native effect and audit | Native action broker | Resume deterministic effects and causal audit or block authority and raise an incident. |

There is no catch-all reconciler that guesses which subsystem owns a transition.

## Installation and cleanup failures

An installation becomes active only after its required bot member, managed role, role assignment, permission source, and ownership all agree. Failure before activation cannot later turn into hidden authority.

Rollback and uninstall revoke the installation generation before cleanup. If cleanup fails, the relationship remains visibly failed or uninstalling. Reinstall conflicts while the relationship is `UNINSTALLING` or `UNINSTALL_FAILED`. After cleanup reaches `DORMANT`, reinstall may create a fresh generation. Old tokens, responses, controls, and capabilities remain terminal.

Reconciliation verifies stored resource IDs and ownership. It never finds a role by name, adopts a legacy bot membership, substitutes a missing resource, or deletes something merely because it resembles the expected object.

## Partial native effects

Native operations prevalidate their complete plan, but they never promise atomicity across services.

Each effect is deterministic and append-only. A retry resumes only uncommitted effects. A result can be successful, failed before effect, partial, compensating, compensated, compensation failed, or still reconciling.

Automatic compensation is deliberately narrow. It may remove a resource created solely by that operation when the resource is still at the exact expected version. It cannot overwrite or delete pre-existing content, reverse a later independent user or administrator change, or guess an application-specific rollback.

Application-handled external effects remain outside Fluxer's recovery boundary. Fluxer can expose the application's status and delivery facts, but it cannot verify or reverse the application's database, billing, subscription, or third-party effects.

## Suspension contains incidents without deleting evidence

Suspension is a durable, reversible safety overlay. It is separate from uninstall, credential rotation, and permanent deletion.

Fluxer can suspend:

- One application in one community
- The application across every community

Application-wide suspension terminates bot Gateway sessions and blocks bot authentication. Community-only suspension leaves the shared session connected for other communities but filters and rejects all work in the affected community.

The central policy is enforced wherever application authority could be created or used, including bot REST, installation, command publication, interaction creation and delivery, callbacks, responses, components, settings delivery, transport activation, confirmations, and native actions.

The durable write blocks new work immediately. Cache invalidation, Gateway events, notifications, and email happen afterward and cannot be the authorization source.

While suspended:

- Commands disappear or become unavailable
- Controls become inert
- Existing safe content follows its ordinary retention
- Cleanup, expiry, evidence handling, and repair continue
- Managers may still uninstall
- Application owners may inspect non-sensitive health information, rotate or revoke credentials, and verify an inactive transport candidate
- No owner or community manager can override instance suspension

Private operator reasons remain restricted to safety operators. Public and owner-facing status uses a separately selected safe category and platform-written guidance.

Legacy bot relationships do not bypass suspension. Fluxer can block the known application and bot identity without inventing a managed installation row or role. Clearing the overlay does not adopt or reinstall that legacy relationship. Permanent application deletion removes the known bot membership but never guesses an owned role from its name or current assignment.

## Reinstatement creates new authority

Reinstatement first enters a still-blocking `REINSTATING` state. It does not simply delete a suspension row.

The reconciler verifies:

1. Application and bot identity and credential health
2. Every relationship that would regain authority is active and owns its managed role and assignment
3. Dormant and deleted relationships are truly terminal and excluded
4. Interaction transport and signing state are verified and healthy
5. Manifest and configuration heads are internally consistent
6. No uninstall, deletion, or broader suspension dominates the request

Failure leaves the scope blocked with a safe failed-check category. Success permits only new sessions and interactions for already active installations. Old response tokens, component claims, confirmations, capabilities, and message controls remain terminal. Existing interactive messages require explicit reconciliation into a new version and generation.

## Resource and abuse protection

Limits apply before expensive parsing, persistence, delivery, fanout, or native effects. They cover body bytes, stream time, nesting, item counts, pending work, applications, installations, commands, interactions, users, bots, response credentials, components, settings, and concurrency.

Every applicable budget is charged. Passing a rate limit does not mean the work is authorized or successful. Rejected, duplicate, stale, and invalid attempts still consume the documented attempt budgets where appropriate.

Important protections include:

- Bounded parse and validation errors
- Application and endpoint queue isolation
- No replayable interaction payload dead-letter queue
- No hidden loop of native operations inside a generic capability
- All-or-nothing resource collection validation before application delivery
- Bounded autocomplete queries and results
- Component pending-work limits and one-use claims
- Publication identity and tombstone quotas that deletion cannot evade
- Per-application circuit suppression rather than platform-wide failure

Repeated malformed work is throttled and may invoke a targeted suspension runbook. It does not automatically cause a permanent application ban without the required safety authority and audit.

## Observability without content leakage

Metrics use bounded labels for layer, transport, state, outcome, safe error class, and rollout group. Application, community, user, interaction, command, message, and capability IDs do not become metric labels.

Logs, traces, metrics, alerts, and job records exclude tokens, signatures, credentials, DNS answers, raw request and response bodies, command values, form fields, ephemeral message bodies, setting values, component selectors, and arbitrary application errors.

The required service indicators cover:

- Valid invocation availability
- Platform delivery inside the three-second contract
- Response-operation availability and latency
- Lifecycle convergence and oldest backlog age
- Privileged effect and audit completeness
- Ephemeral message privacy and deletion lag
- Authorization correctness, where accepted invariant violations must remain zero

Dashboards connect invocation, delivery, callback, response, optional native effect, audit, and reconciliation. Alerts exist for invariant failure, deadline miss caused by Fluxer, saturation, circuit growth, elevated failure, stuck lifecycle work, private-data deletion lag, rollout-revision divergence, compatibility drift, and restore failure.

Exact latency, availability, error, saturation, capacity, and alert thresholds are not guessed in the repository plan. Each deployment must set them from its topology and observed traffic before proceeding to the relevant production rollout step.

## Runbooks before broad rollout

Operators need tested runbooks for:

1. Changing or stopping one rollout layer
2. Suspending and reinstating an application or installation
3. Reconciling installation, publication, settings, and message state
4. Diagnosing Gateway and HTTP delivery and rotating endpoint keys
5. Recovering response, component, and ephemeral message storage
6. Containing delegated-action replay, partial effects, or missing audit
7. Restoring data and validating generation and ownership
8. Responding to a recipient-privacy incident
9. Rolling back services and clients without rolling storage backward
10. Collecting a redacted support trace

Each runbook identifies prerequisites, scope, safe commands or endpoints, stop conditions, verification, rollback, and escalation. It cannot recommend manual database edits that bypass service ownership or conditional writes.

## Backup and disaster recovery

Backups distinguish five classes:

| Class | Recovery treatment |
| --- | --- |
| Durable source | Restore applications, relationships, generations, roles, command and settings heads, suspension, audit and effects, and public messages before rebuilding derived state. |
| Durable secrets | Restore only through encrypted secret or key-management storage. Rotate and reverify if the required key material is unavailable. |
| Rebuildable state | Rebuild query tables, search, caches, dashboards, and session state from canonical sources. |
| Short-lived authority | Never reactivate response tokens, capabilities, confirmations, pending control commits, or delivery attempts. |
| Ephemeral message payload | Do not restore ephemeral interaction messages to the user interface. |

Every backup set needs a signed manifest with schema and build versions, store and object scope, cutoffs, checksums, encryption references, and included and excluded recovery classes. Cross-store snapshots are not described as atomic.

Before external traffic resumes, recovery:

1. Blocks services from writing or delivering new work
2. Verifies the backup manifest and keys
3. Increments a server-owned bot-authority epoch
4. Restores canonical durable state
5. Replays suspension, deletion, manager-forget, and expiry markers newer than the snapshot
6. Purges short-lived authority and ephemeral message payloads
7. Validates immutable heads, installation ownership, effects, and causal audit
8. Rebuilds derived indexes and caches
9. Runs repair processes while the recovery hold continues blocking unsafe authority
10. Reopens only a small, selected portion of traffic after every invariant passes

If the journal, cutoff, manifest, key, or causal records cannot be verified, the recovery hold remains active. Developers and managers may inspect non-sensitive state, but no bot action, installation, interaction, settings delivery, or service that changes data is enabled.

The journal retains no deleted payload. Its minimum lifetime is:

```text
oldest restorable backup age
+ Maximum restore and reconciliation validation window
+ Deployment safety margin
```

The deployment must record and prove recovery point, recovery time, backup retention, recurring restore-drill frequency, replication geography or its absence, and the latest representative encrypted restore result. Missing or stale evidence blocks rollout beyond internal allowlists.

## How recovery will be tested

Failure injection must cover:

- Process crashes before and after each effect, lost enqueue, and duplicate delivery
- Stale leases, conflicting workers, and partially written audit
- Role or message ownership mismatch, cleanup exhaustion, and circuit suppression
- Suspension invalidation and reinstatement failure
- Older backup restore, missing journal entries, rebuilt indexes, private data that must not return, and limited reopening for selected traffic

Passing unit tests does not prove operational recovery. Each high-risk stage also needs real-service integration, runbook drills, redacted telemetry inspection, and a representative restore exercise for its affected data.

See [operations and data contracts](../reference/operations-and-data-contracts.md) for the detailed lifecycle, reconciliation, suspension, resource-protection, observability, restore, and rollout rules.

## Continue reading

- Previous: [Authority, safety, and data](08-authority-safety-and-data.md)
- [Research index](../README.md)
- Next: [Implementation roadmap](10-implementation-roadmap.md)
