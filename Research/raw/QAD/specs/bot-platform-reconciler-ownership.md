# Bot Platform Reconciler Ownership

Status: repository-derived worker ownership under QAD-060/QAD-061, QAD-149 through QAD-162, QAD-165, QAD-186, QAD-193, and QAD-194.

## Shared execution model

The durable aggregate row/operation record is the source of truth; JetStream and the job ledger are observable delivery/execution mechanisms, not proof that work exists or finished.

- Every transition writes a deterministic operation/effect identity and the next durable state before enqueueing work.
- Immediate enqueue minimizes latency. A scheduled bounded sweep over state-specific query tables repairs lost enqueue/delivery.
- Workers conditionally claim a versioned lease (`lease_owner`, `lease_expires_at`, `attempt`) and re-read current state after claiming. Expired leases are recoverable.
- Every external/database side effect uses the accepted deterministic effect identity and verify-or-apply semantics. Retry never allocates a new role, publication identity, event identity, or deletion target.
- Success conditionally advances the aggregate; stale/duplicate workers become no-ops. Partial failure records the exact effect result and leaves a visible retryable or failed state.
- Generic worker dead-letter status never silently closes the domain operation. After its bounded delivery attempts, the domain row enters its explicit failed state, pages through QAD-192, and supports a version-checked staff/authorized-manager retry.
- Reconcilers do not guess ownership from names or repair conflicts by overwriting another owner. Ambiguity is a hard failed invariant.

All state indexes are query tables maintained with the canonical row, not unbounded database filtering. Sweeps process at most 200 due rows per page with a durable cursor and stagger/requeue additional pages.

## Ownership matrix

| Aggregate/state | Sole transition owner | Trigger/cadence | Responsibilities |
|---|---|---|---|
| Installation install/rollback/uninstall | `ApplicationInstallationLifecycleService` + `reconcileApplicationInstallation` lifecycle task | immediate; one-minute due-state sweep | role/member/assignment verify-or-apply; authority revocation; rollback; dormant transition; `INSTALL_CLEANUP_FAILED`/`UNINSTALL_FAILED` |
| Permanent application deletion | expanded `ApplicationDeletionService` + existing `applicationProcessDeletion` orchestrator | immediate; five-minute tombstone sweep | block authority first; create per-install cleanup children; anonymize retained authorship per policy; installations/roles/config/messages/credentials cleanup; deletion-journal completion |
| Command publication/head/index | `ApplicationCommandRegistryRepository` + `reconcileApplicationCommandRegistry` batch task | publication synchronous CAS; five-minute integrity sweep | complete immutable candidate/head verification; reverse query-index repair; abandon unreferenced candidate blobs older than one hour; never synthesize a partial head |
| Declarative settings synchronization | `ApplicationConfigurationService` + `reconcileApplicationConfigurationDelivery` lifecycle task | immediate on save/transport recovery/reconnect; one-minute due sweep | retain authoritative value/version; deliver latest version with stable event ID; record acknowledgement; skip obsolete intermediate delivery while preserving audit history; application fetch remains recovery path |
| Bot-managed message reactivation | `ApplicationMessageReconciliationService` + `reconcileApplicationMessage` lifecycle task | explicit application request only; immediate plus one-minute pending-request sweep | validate old/current application ownership, generation, message version, schema/capabilities; write one new version; preserve matching per-user state only when explicitly elected; never auto-reactivate by scanning messages |
| Component interaction outcome | `ApplicationComponentOutcomeService` + `reconcileApplicationComponentOutcome` lifecycle task | immediate on terminal response/effect/deadline; one-minute due-state sweep | preserve immutable application-result/native-effect owner; commit once on proven success; release only proven application-path no-effect; retain native terminal failure; keep partial/ambiguous effects fail-closed |
| Suspension reinstatement | `ApplicationSuspensionService` + `reconcileApplicationReinstatement` lifecycle task | immediate; one-minute `REINSTATING` sweep | QAD-190 identity/install/role/transport/manifest/config checks; clear overlay only after all pass |
| Ephemeral expiry/object cleanup | `EphemeralResponseLifecycleService` + `expireEphemeralResponses` batch task | logical checks on read; minute-bucket cleanup | terminal state/removal dispatch, private-object deletion, orphan verification; never extend TTL |
| Privileged effect/audit integrity | `ApplicationNativeActionBroker` + `reconcileApplicationActionAudit` lifecycle task | immediate after partial write; bounded periodic scan | resume deterministic effect/audit completion or block authority/raise incident; never fabricate missing user input |

The public service/repository names describe ownership; implementation may group tasks in cohesive modules but must not create a catch-all reconciler that mutates unrelated aggregates.

## Installation lifecycle

Canonical state and its by-state/due-at query row are written together with the operation identity. The lifecycle task follows QAD-154 through QAD-160. Reconciliation verifies the persisted managed-role ID before creation, membership before assignment/removal, ownership before deletion, and current generation before every effect. It may resume rollback/uninstall after a crash but cannot turn an invariant conflict into `ACTIVE`/`DORMANT`.

An operator/manager retry creates a new operation attempt against the same lifecycle generation and owned resource identities. It does not create another installation or reset retained configuration.

## Permanent deletion orchestration

The current `applicationProcessDeletion` task is extended rather than competing with another deletion worker. A durable application deletion tombstone/operation becomes its source. It writes child cleanup rows per installed community so one failed guild does not suppress others and progress is resumable beyond one queue delivery.

Deletion order is: tombstone/block new authority; invalidate sessions/tokens; process installation-owned cleanup; revoke/strip interactive authority from messages; apply accepted data-retention/anonymization rules; delete secret/application source rows; verify absence; complete the security deletion journal. The current behavior that catches and logs a guild dispatch failure while continuing is retained only for non-authoritative notifications, never for required cleanup.

## Manifest reconciliation

Publication remains a synchronous complete-candidate plus one-head-CAS operation. The reconciler is not on the success path and never chooses between two valid heads. It:

- verifies every current head references a complete checksum-valid revision;
- repairs derived application/community command query tables from that head/target source;
- marks an invalid head unavailable and alerts rather than exposing partial data;
- deletes only unreferenced candidate/draft artifacts older than the fixed one-hour safety window after rechecking no head/draft references them.

Rollback/recovery selects an immutable known revision through its explicit product operation, not through reconciliation guesswork.

## Settings synchronization

Fluxer persistence succeeds independently of application health under QAD-132. Each community/application source row carries `configuration_version`; delivery state carries `last_delivered_version`, `last_acknowledged_version`, next attempt, and safe failure class. A newer save supersedes delivery of an older unacknowledged full snapshot: the bot receives the latest source version and can fetch it. Audit history still retains manager changes.

Delivery uses one stable event identity for `(application, community, configuration_version)` and transport retry is idempotent. Exponential retry begins at one second and caps at five minutes while the application is healthy enough to attempt; suspension/uninstall/offline state pauses rather than burns attempts. Reconnect/health recovery immediately schedules the latest version.

## Explicit message reconciliation

No cron sweep can make an old inert panel live. The application submits message ID, expected version, desired current component schema, and an explicit preserve-state selection after reinstall/recovery. A durable pending request allows safe retry of that user-authorized application operation. Success creates one new message version bound to the current internal generation. Any ownership/schema/version mismatch fails visibly and requires a fresh request.

## Component outcome reconciliation

Response handling and the native-action broker report their deterministic results through `ApplicationComponentOutcomeService`; neither writes per-user commit/use-policy state independently. The first conditional owner claim is immutable. Synchronous success or proven application-path no-effect resolves immediately. Deadline/crash/partial states enter the due index and the lifecycle task rereads the canonical response and native-effect ledgers before changing anything.

The task consumes on proven selected-owner success, releases only a still-current application-path reservation with proven no effect, retains a deterministic native failure, and leaves partial or contradictory evidence in `RECONCILING` with an alert. It never infers success from transport acknowledgement, retries a native effect, changes commit owner, or reopens a stale/deleted/suspended/generation-invalid component.

## Administration and observability

Job ledger/admin status links to the domain operation, but administrative cancellation only stops the current worker lease; it does not rewrite the domain as successful. Authorized status screens expose aggregate, state, generation/version, safe failed effect, attempts, next retry, oldest age, and trace/job links without content/secrets.

Manual actions are limited to retry, cancel further automatic attempts into an explicit failed state, or perform the already-defined product reset/delete operation. There is no generic “mark complete” or “force ownership” action.

## Evidence and classification

- Fluxer already has typed worker tasks, realtime/lifecycle/batch lanes, JetStream redelivery, a job ledger, cron scheduling, and several explicit reconcilers/read-repair paths.
- The existing application-deletion task is monolithic and queue-delivery-oriented; bot-platform cleanup needs durable child progress rather than another overlapping worker.
- This preserves current worker/lane/job infrastructure, makes domain rows authoritative, and assigns one transition owner per aggregate.
