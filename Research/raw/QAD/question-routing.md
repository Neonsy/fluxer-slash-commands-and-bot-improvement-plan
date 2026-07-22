# Remaining Question Routing

Updated 2026-07-21 after the QAD-rationale, current-state, and simulation review.

This file controls which questions still require the user's product/security/operations choice. Repository-derived mechanics have been written directly with current-code evidence and a preserve/extend/replace classification under QAD-145. If new inspection exposes a materially different observable, authority, compatibility, or data-lifecycle choice, it returns here rather than being silently selected.

## Repository-derived work completed

- Installation identity/lifecycle, managed-role ownership/recovery, uninstall/reinstall behavior, no legacy backfill, portable invite permissions under the held-bit ceiling, the exact code-defined first-install exception for `Manage Guild`, and an owner/`Administrator` gate for later authority expansion.
- Command identity, immutable manifests, registration, targeting, policy, picker mechanics, aliases/preferences, localization, errors/rates, persistence, and compatible migration surface.
- Interaction envelopes, response lifecycle, Gateway/HTTP registration and delivery, rate/resource protection, capability negotiation mechanics, and conformance fixtures.
- Component/rich-container grammar, limits, canonical ownership, per-user state, audiences, expiry, concurrency, fallback, and lifecycle.
- Private ephemeral access/storage/cleanup, account-export exclusion, text/control-only initial payloads, and report snapshot mechanics under the shared report-evidence policy.
- Bot/delegated authority architecture, exact capability storage/revalidation/replay prevention, audit attribution/redaction/45-day guild TTL, and partial/compensation representation.
- Declarative settings types/limits/storage/concurrency/delivery/audit/attention plus later message/self-role builder/action mechanics.
- Targeted suspension enforcement/reinstatement, rollout controls, observability/runbooks, reconciliation, abuse protection, disaster-recovery mechanics, and application data lifecycle.
- Eleven-train dependency DAG, branch names, logical commits, PR scopes, dark migrations, flags, rollback, generators/checks, rebase procedure, docs placement, and out-of-scope work.

## Product/security decision resolved

QAD-038 now records two permission sources. Applications remain Discord-compatible invite-mode applications unless they explicitly publish `required_bot_permissions` through the authenticated application API. Invite mode continues to accept the standard OAuth `permissions` request and keeps the current rule that a `Manage Guild` installer may grant only personally held bits. In code-defined mode, the versioned application declaration—not URL bits—is authoritative, and `Manage Guild` may complete a first install with exactly that current set even when it includes bits the installer lacks. The committed set becomes the relationship's retained authority ceiling in either mode. Only the community owner or `Administrator` may broaden it later, move the managed role, assign supplemental roles, or approve another bot-authority mutation; applicable hierarchy and target checks remain independent requirements.

This preserves the current invite contract for existing and portable bots instead of requiring Fluxer-only setup. The beyond-the-installer exception is narrower because an editable URL cannot prove developer intent. In code-defined mode, exact consent presentation, the server-owned declaration, commit-time source/revision checks, and the durable installed ceiling enforce the boundary. In invite mode, the current held-bit check contains caller-edited permission requests. No mode or declaration is inferred from old links, memberships, or roles, and legacy bots remain unchanged. QAD-214 review must verify this resolved split across Train I2 rather than choose it.

## Deployment-owned inputs

Numerical SLO/error/latency alert thresholds and rollout observation durations require real deployment topology/traffic evidence. The deployment owner must record them before a production gate; they are not a universal product answer that can be inferred now. The code/runbook instruments and mandatory gates are already fixed.

Bot-platform RPO, RTO, backup retention, recurring restore-drill frequency, and geographic-replication claims are likewise deployment-owned under QAD-221. Deletion/suspension journal retention is formula-bound to the oldest restorable backup plus restore/reconciliation validation and a safety margin.

## Question order and working rule

The two durable-growth questions, QAD-038, and all PDF-derived candidates QAD-227 through QAD-237 are resolved. QAD-236 deliberately preserves a later evidence-backed collision-picker selection; it is a recorded implementation gate, not an unresolved product-policy question to answer from prose. QAD-237 is a deferred post-stability project boundary, not work in the existing trains. Rerun the cross-file consistency audit after QAD/CS/SIM integration; any newly discovered material choice returns here rather than being silently selected.

Do not ask the user to approve schema layout, tables/indexes, error names, service boundaries, current-code-derived limits, test matrices, rollout plumbing, or branch mechanics already fixed by QAD-145/QAD-202.
