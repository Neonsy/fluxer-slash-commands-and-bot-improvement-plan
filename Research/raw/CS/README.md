# Current State

This directory records repository facts verified against baseline commit
`fd62b46faf3505d738f6d5800e787473b14cacd6`. It is not a decision log, an
implementation plan, or a statement that proposed bot-platform behavior exists.

Source paths are relative to the repository root. Evidence names a complete row
type, schema, event union, or implementation symbol wherever that is more stable
and useful than a line number. Repository-state facts are a dated pre-publication
snapshot and are not predictions about the later orphan-branch operation.

## Index

- `repository.md` — branch, mutation, and local-notes status
- `applications-and-installations.md` — current application creation limits, OAuth,
  installation, and role model
- `commands-and-permissions.md` — current native command, synchronized preference,
  and authorization model
- `messages-and-interactions.md` — current message, gateway, outbound-safety,
  worker-timing, rate, and client boundaries
- `operations-persistence-and-privacy.md` — current concurrency, jobs, harvest,
  rollout/metrics, retention, and recovery boundaries

Implementation ordering and branch strategy are planned behavior and therefore
live in `../QAD/specs/stacked-branch-pr-and-rollout-strategy.md`, not CS.
