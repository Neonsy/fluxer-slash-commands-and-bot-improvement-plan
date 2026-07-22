# Reconciliation and Disaster-Recovery Simulation

## SIM-R01 — cross-store restore converges without resurrecting deleted, suspended, ephemeral, or delegated state

### Scenario and purpose

A deployment restores a database snapshot taken before an application was deleted, another installation was suspended, Alice dismissed an ephemeral, a manager forgot a dormant setting, a superseded setting value expired, and a delegated capability was consumed. Object/query stores have a different cutoff. This tests recovery hold, authority epoch, journal replay, canonical/derived ownership, ordered reconcilers, incomplete manifests, audit/effect integrity, and deployment-owned recovery evidence.

### Decision and current-state evidence

- **Controlling QAD:** QAD-149–162 (installation ownership/retry), QAD-165 (manifest source/head), QAD-180 (capability lifecycle), QAD-193/194 (recovery/reconciler), QAD-211 (report evidence), QAD-221 (deployment-owned DR values), QAD-222 (manager Forget), and QAD-225 (superseded-value expiry).
- **Exact specs:** `../QAD/specs/bot-platform-disaster-recovery.md` -> `Recovery classes`, `Backup consistency and manifests`, `Non-resurrection safety`, `Restore sequence`, `Restore outcomes by feature`; `../QAD/specs/bot-platform-reconciler-ownership.md` -> `Shared execution model`, `Ownership matrix`.
- **Current constraints:** CS-INSTALL/CS-MESSAGE/CS-ADMIN/CS-OPS/CS-ROLL. Current repo has denormalized database/object/search/Gateway/worker patterns but no complete bot-platform backup manifest, authority epoch, deletion/suspension/configuration-erasure journal, restore hold, or proposed aggregates. Current application deletion removes memberships without durable child installation cleanup; current documentation has backup-retention statements but no numeric RPO/RTO or tested restore cadence.

### Actors, permissions, and initial state

- Recovery operator has deployment authority and isolated restore infrastructure; no public writer/interaction traffic is allowed.
- Signed backup manifest `B` contains durable sources at cutoff `T0`, object prefixes at `T0-2m`, schema/build/key references, and declared exclusions. It predates: deletion of `app-D` at `T1`, G2 suspension at `T2`, Alice's ephemeral dismissal at `T3`, manager Forget for `setting-X` at `T3.2`, the 45-day expiry cutoff for superseded `setting-Y` at `T3.4`, and consumption of delegated `cap-C` at `T4`.
- Independently recoverable non-resurrection journal contains deletion/suspension/configuration-erasure/expiry markers through verified cutoff `T5`. Deployment record is expected to contain measured RPO/RTO, oldest restorable backup age, backup retention, drill cadence/result, geography statement, validation window, and safety margin.

### Expected restore processing and state transitions

1. Recovery isolates every writer/delivery path and establishes target cutoff. It verifies/decrypts signed manifests, checksums, schema/build versions, included/excluded classes, and key references. Cross-store snapshots are explicitly not called atomic.
2. If manifest, secret references, journal coverage, or cutoff cannot be verified, the internal recovery hold remains. Developers/managers may inspect safe state, but no bot action, interaction, install, transport writer, or producer is enabled. This is temporary DR state, not QAD-139's public product switch.
3. Durable application/install/role ownership, command definitions/revisions/heads, settings, suspension/audit causality, and public messages restore before derived query/search/cache/session state. Transient queues/attempts/idempotency claims/pending component commits, response tokens, confirmations, and delegated capabilities are not restored as authority.
4. Before external traffic, the live control/secret plane increments the bot-authority epoch. Every old interaction/response/capability/confirmation record fails epoch validation even if wall-clock expiry has not elapsed. `cap-C` cannot execute again and no old outgoing interaction is replayed.
5. All recipient-scoped ephemeral rows/objects are excluded or purged. Alice never sees the pre-dismissal snapshot. Submitted report evidence, if any, restores only under its separate report policy/expiry/holds.
6. Non-resurrection entries newer than `T0` replay through `T5`. Restored `app-D` is re-tombstoned/blocked and cleanup resumes; G2 stays suspended; restored current/history/reference/delivery copies of forgotten `setting-X` and expired superseded `setting-Y` are purged before reads/delivery. The journal stores only minimal identity/scope/generation or setting/revision-cutoff/time/type/integrity proof, not deleted value payloads.
7. Canonical-source integrity scan checks each command head. If its complete revision/entries/hash exist, it remains. If the selected head is incomplete because cutoffs differ, recovery may select the newest prior complete head only per the DR contract or disable the registry pending repair; it never syntheses a partial head or guesses semantic recovery.
8. Installation reconciliation checks exact relationship/generation/preallocated owned role/member/assignment. It repairs/finishes deterministic effects and derived indexes, never allocates another role just because an index is absent or guesses ownership by name. Any conflict remains fail-closed.
9. Settings restore only source values/versions surviving replayed Forget/expiry/permanent-deletion markers; old delivery attempts are discarded. A new generation-bound latest-full-state event is emitted after eligible reconnect. If marker coverage/cutoff cannot be proved, configuration reads/delivery and dependent rollout stay in recovery hold rather than expose an older value.
10. Public messages restore through ordinary durable policy, but controls remain unavailable until application/install/transport/current schema are valid and a fresh new-epoch click creates authority. Old pending state does not resume.
11. Privileged native effects and causal audit records are checked as a pair. Derived audit query indexes can rebuild; unexplained missing canonical effect/audit blocks affected authority and raises incident rather than fabricating completeness.
12. Search/query/cache rebuilds from canonical sources. Gateway restarts fresh Identify and never restores session/resume buffers. HTTP endpoints/keys must be newly healthy/verified or their commands remain unavailable.
13. Only allowlisted synthetic Gateway/HTTP apps are enabled first. QAD-192 operational gates and all reconcilers must be clean before the hold widens deliberately.

### Idempotency, partial failure, observability, and cleanup

- Each restore step has a durable operation record, versioned lease, stable effect identity, bounded pages (at most 200 due rows with durable cursor), verify-or-apply semantics, and CAS advance. Expired leases recover; stale/duplicate workers no-op.
- Queue/job success is not domain success. Generic DLQ cannot close an aggregate. A failed step is visible and blocks dependents; allowed manual action is domain retry/cancel-to-explicit-failure, never direct mark-complete/force-owner.
- Per-aggregate owners stay distinct: installation lifecycle, expanded existing application-deletion orchestrator, command registry, configuration service, explicit message reconciliation, suspension service, ephemeral expiry, and native-action audit integrity. No catch-all worker mutates unrelated truth.
- Metrics/status expose state/version/generation, safe failed effect, attempts/next retry/age, trace/job links—never secrets/content/raw bodies.

### Retention and deployment-owned boundary

- Non-resurrection journal retention—including configuration erasure/expiry markers—must satisfy `oldest_restorable_backup_age + maximum_restore_and_reconciliation_validation_window + deployment_safety_margin`; deleted payloads/values are not retained. A marker compacts only after no restorable backup can contain the value and replay/drill validation plus margin are complete.
- Numerical RPO/RTO, backup retention, drill interval, achieved results, geography, alert thresholds, and margin are not inferable from repository code. Missing measured deployment records stop broad rollout/recovery enablement. The simulation does not choose them.
- A material backup/replication/KMS/schema/orchestrator change requires another representative encrypted isolated drill. Upload success alone is insufficient.

### Required observed results

- Old capabilities/tokens/interactions fail; dismissed ephemerals are absent; deleted/suspended apps remain blocked; manifests never expose partial revisions; installations/roles/config converge without duplication; audit chains are complete; derived indexes rebuild; fresh synthetic Gateway/HTTP works only after activation.
- The drill records achieved recovery point/time and backlog convergence as evidence. It cannot claim production RPO/RTO from a design estimate.

### Conclusion and implementation gap

The trace validates recovery as ordered re-establishment of invariants, not raw snapshot availability. Epoch rotation plus a journal closes the two critical resurrection paths that an old backup alone cannot see. Because the present repository has no such bot-platform state or complete DR contract, this scenario is both an implementation and deployment launch gate.
