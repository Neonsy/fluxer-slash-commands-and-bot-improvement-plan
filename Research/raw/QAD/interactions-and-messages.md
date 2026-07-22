# Interactions and Messages

Accepted ephemeral process: `trails/05-ephemeral-responses.md`.

Accepted component/message process: `trails/06-components-and-bot-managed-messages.md`.

Accepted delivery process: `trails/07-interaction-delivery-versioning-and-rate-limits.md`.

## Decision status

QAD-227 through QAD-237 close every PDF-derived decision: advanced options, composer behavior, categories, unchanged publication, developer tooling, provider recommendation, contextual policy navigation, the collision-picker evidence gate, and the deferred SDK boundary. QAD-224 and QAD-225 close the two cross-cutting durable-growth questions found by the earlier audit. QAD-038 now preserves portable invite permissions under the held-bit ceiling, adds the exact code-defined first-install exception, and fixes the owner/`Administrator` expansion boundary. QAD-236 deliberately leaves only an evidence-backed presentation selection for implementation review; it is not an unresolved policy question. `question-routing.md` retains deployment-owned launch inputs and the QAD-214 human-review gate.

## Proposed direction

- Ship the base normalized interaction and response lifecycle before ephemeral and rich component layers.
- Preserve mutually exclusive Gateway/HTTP delivery, stable interaction identity, and idempotent handling.
- Store explicit application and interaction ownership and reauthorize every component interaction server-side.

## Resolved specifications

- `specs/interaction-envelope.md`
- `specs/interaction-response-lifecycle.md`
- `specs/interaction-transport-registration.md`
- `specs/outgoing-interaction-delivery.md`
- `specs/component-schema-and-limits.md`
- `specs/component-state-lifecycle-and-storage.md`
- `specs/ephemeral-storage-and-access.md`
- `specs/report-evidence-retention-and-erasure.md`
