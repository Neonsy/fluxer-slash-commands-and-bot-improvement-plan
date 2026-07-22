# Bot Platform Backup, Restore, and Disaster Recovery

Status: repository-derived data/recovery design under QAD-193 and QAD-221. Numerical recovery promises are mandatory deployment-owned evidence, not universal repository constants.

## Deployment-owned recovery promises

Before bot-platform rollout advances beyond internal allowlists, each deployment records:

- recovery point objective (RPO) and recovery time objective (RTO);
- backup retention and the oldest restorable backup age;
- recurring isolated restore-drill interval and the latest successful result;
- geographic replication scope, or an explicit statement that none is promised;
- maximum restore/reconciliation validation window and non-resurrection-journal safety margin.

The values require measured evidence from a representative encrypted restore; repository design estimates do not satisfy the gate. A material backup store, replication, key-management, schema, or restore-orchestrator change requires another drill before broad rollout. Geographic replication is never inferred merely because a provider stores redundant copies.

The non-resurrection journal retention obeys:

```text
journal_retention >= oldest_restorable_backup_age
                   + maximum_restore_and_reconciliation_validation_window
                   + deployment_safety_margin
```

The runtime does not claim that this makes cross-store snapshots atomic. If manifests, journal coverage, keys, or the recorded cutoff cannot be verified, QAD-193's recovery hold remains enforced. Official Fluxer and self-hosted deployments choose their own measured numbers; public/operator documentation must identify which deployment a promise describes.

## Recovery classes

| Class | Data | Recovery rule |
|---|---|---|
| Durable source of truth | applications; community relationships/generations; managed-role ownership; command definitions/revisions/heads; community configuration; user favorites/hiding/provider choices; declarative setting definitions/values; suspension; audit/effect causality; public bot-managed messages | back up with primary database/object-store policy; restore before derived state |
| Durable secret material | encrypted application interaction signing-key generations and server key references | back up in the secret/KMS system, never plaintext database/log/archive; rotate/reverify if unavailable |
| Rebuildable query/derived state | denormalized reverse query tables whose canonical source is specified; command picker/search indexes; caches; Gateway/session state; dashboards | do not treat as authoritative; rebuild/repair after source restore |
| Short-lived authority | interaction response-token records, delegated capabilities, pending confirmations/component commits, delivery queues/attempts/idempotency claims | never reactivate from backup; invalidate globally after restore |
| Ephemeral payload | recipient-scoped text/control ephemeral responses | do not restore to the user surface; expiry/dismissal privacy wins over availability |
| Low-value passive signal | command usage ordering | QAD-206 permits an empty/rebuilt recovery and never allows backup to extend the sliding 90-day inactivity lifetime |

Ordinary public bot messages follow the message platform's general database/object restore. Application developer databases/dashboards remain outside Fluxer and cannot be recovered by Fluxer.

## Backup consistency and manifests

Every backup set has a signed manifest containing schema version, service build versions, source stores/object prefixes, snapshot/cutoff times, checksums, encryption/key references, and included/excluded recovery classes. Backup validation proves it can read every critical table and secret reference; successful upload alone is not success.

Cross-store snapshots are not falsely called atomic. Recovery uses entity invariants and immutable publication heads:

- a manifest head is usable only if its complete revision and entries exist/checksum correctly; otherwise fall back to the newest prior complete head or disable the application registry pending repair;
- an installation becomes active only when its relationship, generation, managed role, bot member, assignment, and ownership agree;
- configuration desired state is restored, but old delivery attempts are never replayed; a reconciler emits a new generation-bound current-state event;
- committed native effects and audit causality are checked as a pair; missing derived indexes are rebuilt, while an unexplained missing canonical audit/effect record blocks the affected authority and raises an incident.

## Non-resurrection safety

A restore must not turn an old backup of live credentials into current user authority.

- Every Fluxer-issued interaction/response/capability/confirmation record binds a server-owned bot-authority epoch in addition to its normal application/community/generation data.
- Disaster recovery increments the epoch in the live control/secret plane before external traffic resumes. Restored old tokens/claims therefore fail even if their wall-clock expiry has not elapsed.
- Transient delivery queues, pending component state, and capabilities are purged rather than replayed. A user may retry by creating a new interaction after recovery.
- Ephemeral rows/objects are excluded or purged before service exposure. A pre-dismissal backup cannot resurrect content a user dismissed after that snapshot.

Suspension transitions, permanent deletion tombstones, manager-authorized configuration Forget operations, and superseded-value expiry cutoffs are non-resurrection-critical and need an append-only, independently recoverable journal in addition to ordinary snapshots. Restore replays all journal entries newer than the base snapshot before applications are allowed to act or configuration is exposed. If the journal/cutoff cannot be verified, the bot platform remains in an internal recovery hold: developers/managers may inspect state, but no bot action, interaction, install, configuration delivery, or writer is enabled. This hold is a disaster-recovery mode, not QAD-139's public permanent global switch.

The journal does not retain deleted payloads. For configuration Forget/expiry it stores only application/community/setting identity, affected configuration revision or supersession cutoff, operation type/time, and an access-controlled server-keyed integrity proof over that value-free marker metadata; no digest or commitment is derived from the erased value. Suspension/deletion entries retain their existing minimal identity/scope/generation fields. A marker is compacted only after no restorable backup can contain the erased/expired value and replay/drill validation plus the deployment safety margin have completed. All entries follow QAD-221's backup-age/validation-window/safety-margin formula; no universal duration is inferred.

## Restore sequence

1. isolate writers/delivery and establish the target recovery cutoff;
2. verify/decrypt backup manifests and restore durable source stores plus public object data and encrypted key references;
3. increment authority epoch and purge all transient/ephemeral recovery classes;
4. replay the suspension/deletion/configuration-erasure-and-expiry journal through the verified cutoff;
5. run schema compatibility and canonical-source integrity scans;
6. rebuild/repair denormalized query tables and publication heads;
7. run installation/role, deletion, suspension, manifest, configuration, message-component, and audit/effect reconcilers;
8. rebuild search/cache state and restart Gateway sessions from fresh Identify; never restore a session/resume buffer;
9. require HTTP endpoints/signing keys to be healthy or leave their commands unavailable;
10. enable internal allowlisted synthetic applications, verify QAD-192 gates, then widen recovery hold deliberately.

Every step is idempotent and writes a recovery job/operation record. A failed step remains visible and blocks dependent enablement; no operator is instructed to patch tables manually around ownership or CAS checks.

## Restore outcomes by feature

- **Installations/roles:** reconcile exact owned role ID; never allocate another merely because an index is missing.
- **Commands:** restore immutable history and one verified head; dormant/developer-disabled state remains dormant.
- **Community/user settings:** replay Forget/expiry markers against restored values before reads/delivery, then restore the surviving source values/versions and resync clients/bots through new state events. User preferences never silently reset unless the backup genuinely predates them.
- **Interactions/responses/capabilities:** terminal after epoch change; no late outgoing HTTP delivery or callback replay.
- **Ephemerals:** absent after disaster restore; submitted report evidence follows the report backup policy, not ephemeral storage.
- **Public components:** visible messages follow ordinary recovery; controls remain unavailable until their application/install/transport is valid and fresh clicks can create new-epoch interactions. Old issued actions never resume.
- **Audit:** restore within its retention window and rebuild query tables; privileged-effect completeness must pass before delegated action rollout.
- **Suspension/deletion/configuration erasure:** replay the non-resurrection journal and fail closed if its coverage/cutoff cannot be proven current.

## Drills and validation

Before broad rollout, after every material recovery-system change, and on the deployment-recorded recurring schedule, restore a representative encrypted backup into an isolated environment and prove:

- checksums/schema versions and secret references validate;
- old tokens/capabilities/interactions cannot execute;
- dismissed/expired ephemerals are not exposed;
- suspended/deleted applications remain blocked;
- manifests never expose partial revisions;
- installations/roles/configuration converge without duplication;
- manager-forgotten and expired superseded configuration values do not reappear in current/history rows, search/clones, delivery snapshots, or application reads;
- privileged effects have complete audit chains;
- search/query tables rebuild from canonical sources;
- synthetic Gateway/HTTP applications work only after fresh activation.

Record achieved recovery point/time and backlog convergence. Those measurements are evidence for choosing the external RPO/RTO; they are not replaced by a design estimate.

## Evidence and classification

- Fluxer uses Cassandra-style denormalized tables, object storage, NATS/JetStream workers, Gateway memory/session state, and search indexes, but contains no complete backup/DR contract or RPO/RTO.
- Existing job-ledger/worker patterns provide observable background recovery, while accepted immutable heads, generations, CAS, and reconcilers provide entity integrity.
- This preserves canonical/derived ownership, adds explicit non-resurrection and recovery-hold safety, and leaves deployment promises to measured operator policy.
