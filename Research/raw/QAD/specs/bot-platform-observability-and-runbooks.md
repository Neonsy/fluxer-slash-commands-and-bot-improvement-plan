# Bot Platform Observability, SLO, and Runbook Contract

Status: repository-derived instrumentation requirements under QAD-192, extended by the deferred QAD-237 SDK diagnostic boundary. Deployment-specific numerical SLO/alert thresholds and observation durations must be chosen by each operator from capacity and traffic evidence; the repository cannot truthfully fix them today.

## Metric contract

Use each service's existing Prometheus-compatible metric surface (`packages/hono` in TypeScript, Gateway metrics in Erlang, existing Rust metrics conventions). Names use the `fluxer_bot_platform_` prefix and bounded labels only.

Required families by layer:

| Layer | Counters/histograms | Gauges |
|---|---|---|
| Installation/role | lifecycle attempts/results/duration; rollback/reconcile effects; ownership invariant failures | active/transitional rows; reconciler backlog and oldest age |
| Command registry | publication/draft/CAS results and duration; definition bytes/count; stale-schema submissions; alias/config mutations | dormant/active manifests; repair backlog/oldest age |
| Interaction routing | created/delivered/acked/failed/expired; enqueue-to-start, delivery, ack, end-to-end duration; retries; capability rejection | queue depth, inflight, unhealthy endpoints/circuits, deadline budget remaining |
| Responses/components | callback/follow-up/edit/delete results; version conflicts; audience denial; outcome-owner claim/conflict; pending/commit/proven-no-effect rollback/terminal failure/reconciling; validation failure | pending interactions/commits; reconciling outcomes; component-expiry cleanup backlog |
| Ephemeral | create/edit/dismiss/expire/delete; recipient-auth denial; unsupported-media rejection | active rows/bytes; logical/physical deletion lag and orphan backlog |
| Delegated actions | capability issue/confirm/deny/consume/replay/revalidate; native effect result/duration; partial/compensation result | pending capabilities/actions; oldest reconciliation age |
| Suspension | suspend/enforcement/reinstatement results and duration; blocked attempts | suspended/reinstating applications/installations; invalidation backlog |

Allowed labels include service, layer/operation enum, transport, interaction/component type, authority mode, result class, stable safe error code, rollout cohort, and retry number. Application, community, channel, message, interaction, capability, user, target, URL/hostname, command/custom ID, and arbitrary error text are prohibited metric labels.

All metrics have cardinality tests. Result/error labels use reviewed enums; unknowns collapse to `other`.

## Traces and structured logs

One server-generated trace/correlation ID links invocation, transport delivery, callback, response, component transition, native action, audit entry, and reconciliation. Span names and attributes are allowlisted and bounded. Authorized developer responses may receive the trace ID for support; it is not authorization.

Never record response tokens, capabilities, credentials, signatures, headers, callback/request bodies, command/form/component values, ephemeral content, attachment content/private paths, DNS answers, full URLs, or remote error bodies. Safe IDs needed for operator lookup may appear only in access-controlled structured logs/traces, never high-cardinality metrics, and follow the data-specific retention already fixed in the relevant specs.

A future official SDK defaults to no telemetry upload and secret/value-safe diagnostics. Its opt-in logger receives only bounded operation/result/error/deadline/rate classes unless an application explicitly handles its own data outside the SDK; it never serializes raw requests/responses, signatures, tokens, arguments, modal/component values, private messages, attachments, or endpoint secrets. SDK diagnostic examples cannot be treated as server observability or authorization evidence.

Required spans are:

```text
bot.installation.transition
bot.manifest.publish
bot.interaction.create
bot.interaction.gateway_deliver | bot.interaction.http_deliver
bot.interaction.callback
bot.response.persist_dispatch
bot.component.authorize_commit
bot.ephemeral.persist_dispatch
bot.capability.issue_consume
bot.native_action.execute
bot.audit.persist
bot.reconcile
bot.suspension.enforce_reinstate
```

## SLI definitions

Before rollout, operators can calculate:

1. **Eligible invocation availability:** eligible invocations that either create a valid interaction or return the correct platform rejection, excluding application-controlled failures.
2. **Platform delivery timeliness:** interactions whose first delivery attempt starts and whose valid acknowledgement is processed within the three-second contract, separating application response time from Fluxer time.
3. **Response-operation availability/latency:** valid token-scoped operations completed without platform failure inside the 15-minute authority window.
4. **Lifecycle convergence:** transitions/reconciliation reaching a valid terminal state, with backlog age.
5. **Audit completeness:** committed privileged native effects with the required linked audit causality.
6. **Ephemeral privacy/deletion:** unauthorized recipient reads accepted (must remain zero), terminal resources still logically readable (must remain zero), and physical-deletion lag.
7. **Authorization correctness:** accepted actions that fail an invariant/revalidation oracle (must remain zero and is not traded against an error budget).

The repository defines calculation queries and synthetic probes, not a fabricated universal percentage/latency target. Production SLO targets and alert thresholds require observed traffic, topology, storage, and staffing. Security/privacy invariant violations page immediately regardless of volume.

## Dashboards and alerts

Each rollout layer needs a dashboard with request volume, success/rejection/failure split, latency percentiles, saturation, rollout cohort comparison, state/backlog/oldest age, and recent deployment/config revision. Cross-layer views trace invocation through delivery, callback, response, optional action, and audit.

Alerts exist before non-allowlisted rollout for:

- any authorization/privacy invariant failure or missing privileged-action audit;
- acknowledgement deadline miss attributable to Fluxer;
- dispatcher/worker queue saturation, dropped work, or circuit growth;
- elevated failure/timeout/CAS conflict/replay/invalid-payload rate;
- reconciler backlog/oldest age growth or lifecycle stuck state;
- ephemeral row deletion lag or any unauthorized recipient access;
- rollout-config revision divergence between API/Gateway/workers;
- schema/fixture incompatibility or restoration/reconciliation failure.

Traffic-sensitive thresholds use an absolute floor plus rate/window to avoid both low-volume blindness and single-event noise. The deployment owns exact numbers.

## Required runbooks

Before enabling a layer beyond internal allowlists, operators must have tested runbooks for:

1. stop/increase/decrease the relevant temporary rollout safely;
2. suspend/reinstate one application or installation;
3. diagnose and reconcile stuck install/uninstall/publication/settings/message states;
4. diagnose Gateway versus HTTP delivery, verify/rotate endpoint keys, and handle circuit suppression;
5. recover response/component/ephemeral persistence and drain safe cleanup backlogs;
6. investigate delegated-action replay/partial effects/audit gaps and stop new authority;
7. restore data, run post-restore reconciliation, and verify generation/ownership invariants;
8. respond to an ephemeral recipient-privacy or content-exposure incident;
9. roll back application/API/Gateway/message-service/client artifacts without rolling schema backward;
10. collect a redacted trace bundle for developer/operator support.

Every runbook states prerequisites, affected scopes, safe commands/endpoints, stop conditions, verification queries/metrics, rollback, and escalation. No runbook advises manual database edits that bypass repository ownership/CAS rules.

## Enablement gates

- **Allowlist > 0:** metric names/cardinality tests, trace redaction tests, local dashboard, synthetic happy/failure probe, and layer runbook exist.
- **Broadening percentage:** cohort comparison shows no unexplained regression; required alerts are live; reconciliation remains bounded.
- **100 percent:** full cross-service dashboards/alerts, load/failure-injection evidence, on-call ownership, rollback artifact, and disaster-recovery rehearsal for the affected data exist.
- **Flag removal:** QAD-191 removal criteria plus stable SLI behavior through the deployment-owned observation window.

## Evidence and classification

- Fluxer already exposes Prometheus-style HTTP metrics, Gateway metrics/timing spans, structured logging, and service-specific Rust metrics, but has no repository-wide dashboard/runbook convention.
- This preserves each runtime's instrumentation mechanism, fixes a common bounded semantic contract, and refuses to invent production targets without topology/traffic evidence.
