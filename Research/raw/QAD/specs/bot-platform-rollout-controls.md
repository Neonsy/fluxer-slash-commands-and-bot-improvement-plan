# Bot Platform Internal Rollout Controls

Status: repository-derived rollout design under QAD-139 and QAD-191. Observation-window durations are deployment decisions, not public product promises.

## Boundary

These are temporary engineering rollout controls, not a self-hosted product feature and not the rejected global application-interaction switch.

- They have no public REST setting, community setting, instance discovery field, developer toggle, or durable per-application product state.
- Production deployments may supply them through the existing private instance/deployment configuration and NATS propagation pattern. Source defaults are fail-closed while a stack is incomplete and are changed to fully enabled before the flag is removed.
- Stable self-hosted releases expose the completed feature, not a supported long-term way to disable the entire interaction system while leaving bots active.
- Targeted suspension remains the incident control. Rollout flags cannot clear or bypass suspension, installation state, permissions, schema validation, or authorization.

## Initial controls

Use one typed versioned object rather than scattered environment booleans:

```text
bot_platform_rollout_v1:
  installation_writes_percent
  command_registry_writes_percent
  gateway_interaction_delivery_percent
  http_interaction_delivery_percent
  command_picker_percent
  ephemeral_responses_percent
  message_components_percent
  declarative_administration_percent
  delegated_native_actions_percent
  application_allowlist[]
  community_allowlist[]
  revision
```

Percentages are integers 0-100. Deterministic eligibility hashes the stable application ID and, for community behavior, community ID; it never uses random selection per request. Allowlisted IDs force eligibility only for that layer and never bypass prerequisites. Each layer requires its dependency layers, so configuration validation rejects impossible combinations such as picker without registry reads or delegated actions without interaction delivery/audit support.

There is no flag for schema validity, suspension checks, permission enforcement, lifecycle generation, or audit causality. Safety and data-integrity invariants are always active once their reader code lands.

## Enforcement ownership

The API owns the canonical validated revision. Services fetch it at startup, subscribe to versioned NATS updates like current Gateway rollout configuration, reject stale revisions, and retain the last valid value on malformed/unavailable updates.

Every user-visible layer is enforced at its authoritative server entry point:

- install/registry/configuration writers in API services;
- Gateway interaction creation before enqueue/dispatch;
- outgoing HTTP delivery before enqueue;
- response/component/delegated-action endpoints before authority creation;
- command catalog response before the client can render picker entries.

Client checks are presentation only. An ineligible writer returns the structured temporary-unavailable error; it never partly writes. Existing persisted state remains readable to authorized managers/reconcilers, while ordinary invocation/control surfaces are hidden or inert as appropriate.

## Dark rollout order

For each stack:

1. land additive schema/table definitions and tolerant readers with writers at zero;
2. deploy every service that reads/round-trips the new contract;
3. run compatibility and reconciliation scans on empty/existing data;
4. enable internal allowlisted test applications/communities;
5. increase deterministic writer/delivery percentage while watching required gates;
6. enable dependent UI only after authoritative server paths are live;
7. reach 100 percent and complete the deployment-specific observation window;
8. change code defaults to enabled, remove conditional branches/config fields/tests, then remove old schema compatibility only in a later independently safe change.

Turning a flag down stops new authority/writes; it never rolls schema backward, deletes data, resurrects an older representation, or claims a partially completed distributed action was atomic. Reconcilers remain enabled so dark/incomplete state can converge.

## Removal criteria

A rollout field must be deleted, not immortalized, once all are true:

- every supported service/client version tolerates the landed data/wire fields;
- the feature has run at 100 percent through the required operational observation window;
- rollback no longer needs to disable its writer because the next compatible rollback artifact includes it;
- reconciliation reports no unexplained backlog;
- security, correctness, latency, saturation, and failure-rate gates pass;
- the stack's release/runbook explicitly identifies targeted suspension or normal deployment rollback as the remaining recovery mechanism.

The pull request that introduces a field owns a removal issue/criterion and code-searchable identifier. The final branch in that feature stack removes it when safe. If release timing prevents same-stack removal, the flag has an owner and deadline, but it still does not become a supported product control.

## Evidence and classification

- Fluxer currently has validated private Gateway rollout configuration, deterministic user/guild percentage selection, NATS publication, source defaults, and subscriber invalidation.
- QAD-139 explicitly rejected a permanent global operator interaction switch but allowed internal deployment rollout controls.
- This reuses the existing rollout transport/validation pattern, scopes enforcement to authoritative feature entry points, and adds mandatory removal rather than creating a permanent product setting.
