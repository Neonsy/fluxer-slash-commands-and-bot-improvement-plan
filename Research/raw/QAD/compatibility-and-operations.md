# Compatibility and Operations

Accepted process: `trails/07-interaction-delivery-versioning-and-rate-limits.md` and `trails/09-instance-safety-and-suspension.md`.

## Open questions

QAD-227 through QAD-237 resolve all PDF-derived compatibility candidates. QAD-236 is an evidence gate before collision-picker visual controls are chosen. QAD-237 authorizes only a separately reviewed post-stability TypeScript SDK project; raw protocol and compatible Discord libraries remain authoritative/supported, and no existing implementation train gains SDK work. Deployment-specific recovery and observability numbers must still be supplied from measured operator evidence before rollout.

## Proposed direction

- Introduce additive schemas before enabling writers and readers.
- Keep exposed behavior behind a feature flag until end-to-end and fallback behavior is verified.
- Make unknown components inert but visibly attributable rather than dropping or misrendering the message.
- Support immediate installation/application revocation and invalidation of outstanding response authority.
- Define reconciliation jobs and observable incomplete lifecycle states before rollout.

## Resolved specifications

- `specs/interaction-capability-registry.md`
- `specs/application-suspension-control-plane.md`
- `specs/bot-platform-rollout-controls.md`
- `specs/bot-platform-observability-and-runbooks.md`
- `specs/bot-platform-disaster-recovery.md`
- `specs/bot-platform-reconciler-ownership.md`
- `specs/bot-platform-abuse-and-resource-protection.md`
- `specs/discord-compatibility-conformance.md`
- `specs/official-command-sdk.md`

QAD-215 fixes the stable public protocol retirement promise at a minimum twelve months of usable overlap, subject only to a documented security/legal emergency exception.

QAD-221 assigns RPO/RTO, backup retention, drill cadence, and geographic claims to each deployment under mandatory restore evidence and fail-closed constraints.
