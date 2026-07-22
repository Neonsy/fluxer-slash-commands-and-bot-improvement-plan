# Operations, Persistence, and Privacy Boundaries

## Application configuration and administrative control

- The persisted application record is one mutable `ApplicationRow`. Its
  `version` field is updated with the row, but there is no separately addressable
  configuration revision, publication head, installation generation, or
  declarative desired-state document. Evidence:
  `fluxer_api/src/api/database/types/OAuth2Types.ts` (`ApplicationRow`,
  `APPLICATION_COLUMNS`) and
  `fluxer_api/src/api/oauth/repositories/ApplicationRepository.ts`
  (`upsertApplication`).
- The complete application-admin controller exposes lookup, list-by-owner,
  list-by-guild, and transfer-ownership operations. It has no suspend, reinstate,
  disable, or quarantine operation, and the application row has no corresponding
  state. Evidence:
  `fluxer_api/src/api/admin/controllers/ApplicationAdminController.ts`
  (`ApplicationAdminController`),
  `fluxer_api/src/api/admin/services/AdminApplicationService.ts`
  (`AdminApplicationService`), and the complete `ApplicationRow` above.
- Guild placement is inferred administratively by treating bot member IDs as
  candidate application IDs and loading matching applications. It is not read
  from an installation ledger. Evidence:
  `AdminApplicationService.listGuildApplications` and
  `applications-and-installations.md`.

## Row versions are not compare-and-set guards

- `executeVersionedUpdate` reads the current row, derives `nextVersion`, and then
  calls `table.patchByPk` with the primary key and new version. It does not pass
  the observed version as a write condition or inspect a conditional-write
  result. Evidence:
  `fluxer_api/src/api/database/CassandraVersionedUpdate.ts`
  (`executeVersionedUpdate`) and
  `fluxer_api/src/api/database/CassandraTableDsl.ts` (`patchByPk`).
- Consequently, two callers that read the same version can derive the same next
  version and issue independent unconditional patches. This is a direct
  concurrency inference from that helper, not a claim that every database API in
  the repository lacks conditional operations. The helper is used for
  applications, channels, messages, guilds, roles, members, user settings, and
  other mutable rows; its `version` is change metadata, not an optimistic-lock
  guarantee. Evidence: repository call sites of `executeVersionedUpdate`,
  including `ApplicationRepository.upsertApplication`.

## Queue, retry, and ledger ownership

- Background work uses a NATS JetStream work-queue stream and a separate
  Cassandra human-facing ledger. The work stream is file-backed, single-replica,
  and configured with a seven-day maximum age; lane consumers use explicit
  acknowledgements and lane-level delivery limits of 3 or 25. The dead-letter
  stream is also single-replica and has a 30-day maximum age. Evidence:
  `fluxer_api/src/api/worker/JetStreamWorkerQueue.ts`
  (`ensureStream`, `ensureDlqStream`, `ensureConsumers`) and
  `fluxer_api/src/api/worker/WorkerLaneConfig.ts` (`LANE_CONFIG`).
- `WorkerService.addJob` publishes to JetStream first and writes the ledger
  afterward. A ledger-write failure is logged and swallowed, so successful queue
  publication does not guarantee a ledger row. Worker status/progress writes are
  likewise caught and logged, and handler success is acknowledged even if
  `markSucceeded` fails. Evidence:
  `fluxer_api/src/api/worker/WorkerService.ts` (`addJob`) and
  `fluxer_api/src/api/worker/WorkerRunner.ts` (`processJob`).
- Handler side effects, ledger transitions, dead-letter publication, and message
  acknowledgement are separate operations. For example, a process failure after
  handler side effects but before `ack` permits redelivery; the framework does
  not make those side effects atomic with acknowledgement or provide a generic
  side-effect idempotency record. Evidence: `WorkerRunner.processJob`.
- A job's `maxAttempts` is stored in its envelope and ledger, but
  `WorkerRunner.processJob` decides the final delivery from the lane's
  `maxDeliver` and does not read the envelope's `max_attempts`. The admin surface
  can list, inspect, and cooperatively cancel jobs; it exposes no retry endpoint,
  and `WorkerService.retryDeadLetterJob` returns `false`. Evidence:
  `JetStreamWorkerQueue.enqueue`, `WorkerRunner.processJob`,
  `fluxer_api/src/api/admin/controllers/JobsAdminController.ts`
  (`JobsAdminController`), and `WorkerService.retryDeadLetterJob`.
- The day-bucket ledger row is created with status `queued`. Later state methods
  update `JobsById` and `JobsActive`, but not `JobsByDayBucket`; `listJobs` filters
  on the day-bucket status before loading the authoritative row. Status-filtered
  historical listings can therefore omit changed-status jobs or return a changed
  job under the stale `queued` filter. Evidence:
  `fluxer_api/src/api/jobs/JobLedgerRepository.ts`
  (`createJob`, status transition methods, `listJobs`).
- The registered task set includes application deletion but no application
  installation, application-role reconciliation, or installation-effects
  repair task. Evidence:
  `fluxer_api/src/api/worker/WorkerTaskRegistry.ts` (`workerTasks`) and
  `fluxer_api/src/api/worker/WorkerLaneConfig.ts` (`LANE_CONFIG`).

## Report evidence and retention

- An in-app report stores reporter identity, reported-object metadata, a copied
  message-context window, copied attachment descriptors, resolution metadata,
  and content-warning snapshots in `IARSubmissionRow`. Attachments are copied
  from the CDN bucket into the reports bucket. Evidence:
  `fluxer_api/src/api/database/types/ReportTypes.ts` (`IARSubmissionRow`,
  `IAR_SUBMISSION_COLUMNS`) and
  `fluxer_api/src/api/report/ReportService.ts`
  (`gatherMessageContext`, `cloneAttachmentsForReport`).
- The public privacy policy states that report snapshots are kept for up to one
  year, that an automated object-storage lifecycle deletes them, and that rare
  binding legal obligations can extend retention. The Cassandra report row has
  no expiry, purge state, retention generation, or legal-hold field. Its
  repository interface can create, read, list, and resolve reports but cannot
  delete or reopen one. Evidence:
  `fluxer_marketing/content/policies/privacy.md` (sections 7.9 and 7.10),
  `IARSubmissionRow`, and
  `fluxer_api/src/api/report/IReportRepository.ts` (`IReportRepository`).
- Report search stores a derived document containing reporter and reported
  identifiers, category, free-form additional information, names, resolution
  metadata, and the public comment. Search adapters implement deletion, but no
  production call site invokes `deleteReport` or `deleteReports`; the worker
  registry has no report-retention purge task. Evidence:
  `fluxer_api/src/api/search/report/ReportSearchSerializer.ts`
  (`convertToSearchableReport`),
  `fluxer_api/src/api/search/IReportSearchService.ts`, and
  `fluxer_api/src/api/worker/WorkerTaskRegistry.ts`.
- The repository therefore does not show a coordinated lifecycle that expires
  the Cassandra report, copied report attachments, duplicate-report reservation,
  and search document together, or records a hold exception across those copies.
  An object-store lifecycle may exist in deployed infrastructure outside this
  repository; it was not verifiable from this baseline.

## Current account-harvest boundary

- The user-data worker discovers message references only through
  `listMessagesByAuthor(userId, 100000)`, fetches those surviving messages, and
  writes them under per-channel files. It therefore exports stored messages
  authored by the requesting user, not every message the user could view.
  Evidence: `fluxer_api/src/api/worker/tasks/HarvestUserData.ts`
  (`harvestMessages`).
- The same export serializes current account settings, including decoded
  `synced_preferences`, and the user's per-community settings. It has no
  application-command preference model to export. Evidence:
  `HarvestUserData.ts` (`buildUserDataJson`).
- Current storage has no recipient-scoped application ephemeral object, so the
  harvest cannot include one. This current authored-message boundary supports
  QAD-052's proposed exclusion of ephemeral responses, but it is not runtime
  validation of the future ephemeral lifecycle or report-snapshot exception.

## Existing rollout and metrics precedents

- Gateway rollout configuration already has typed defaults and validation,
  API-owned persistence, an admin update path, an RPC fetch, and NATS change
  publication. The gateway fetches initial state, subscribes for changes, and
  applies only validated configuration; percentage eligibility can use stable
  ID modulo hashing for guilds and for sessions configured in modulo mode.
  Evidence: `fluxer_gateway/src/gateway/gateway_rollout_config.erl`,
  `fluxer_gateway/src/gateway/gateway_rollout_config_validate.erl`,
  `fluxer_api/src/api/instance/InstanceConfigRepository.ts`,
  `fluxer_api/src/api/admin/controllers/InstanceConfigAdminController.ts`, and
  `fluxer_api/src/api/rpc/RpcService.ts`.
- The shared Hono metrics middleware emits Prometheus-text request counters,
  latency histograms, 5xx counters, and uptime. Its request labels are bounded to
  method and status class rather than paths, user IDs, payloads, or content.
  This is a low-cardinality precedent, not an existing bot-platform SLO or
  rollout gate. Evidence: `packages/hono/src/middleware/Metrics.ts`
  (`createMetricsMiddleware`).
- These mechanisms show reusable control-plane and observability patterns, but
  there are no bot-platform rollout fields, interaction-delivery health
  dimensions, application/installation suspension metrics, selected numerical
  SLOs, or evidence-backed observation durations in the current repository.

## Backup and recovery contract

- The repository does contain backup commitments. The hosted-service privacy
  policy says database backups are encrypted and off-site, deleted database data
  can remain in them for up to 30 days, and deleted attachments have a separate
  recovery window of up to 24 hours and are not part of long-term backups.
  Evidence: `fluxer_marketing/content/policies/privacy.md` (sections 6.1, 7.4,
  7.10, and 9).
- Self-hosting documentation separately tells operators to back up `.env`, the
  Postgres data volume, and the SeaweedFS data volume, with cold-backup commands
  and a preference for native database/object-storage backups in production.
  Evidence: `fluxer_docs/docs/operator/get-started.md` (`Backups`).
- No repository source states numeric recovery-point or recovery-time objectives,
  a defined backup cadence, a restore-test cadence, or a service-wide recovery
  owner. The policy retention windows and self-hosting backup instructions are
  therefore current backup/erasure statements, not an RPO/RTO or tested-restore
  guarantee.
