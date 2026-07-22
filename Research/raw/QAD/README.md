# Questions and Decisions

This directory keeps unresolved questions and accepted decisions separate by subject.

## Index

- `decisions.md` — accepted decisions only
- `provenance.md` — recovered source record and per-range authority classification
- `trails/` — readable topic-by-topic decision process, including current-code evidence, alternatives, recommendation, answer, and classification
- `scope-and-identity.md` — product scope, object identity, and supported contexts
- `installations-and-managed-roles.md` — installation ownership, role behavior, and legacy migration
- `commands.md` — command identity, aliases, collisions, and administration
- `permissions-and-audit.md` — invocation policy, execution authority, and attribution
- `interactions-and-messages.md` — delivery, responses, ephemeral data, and components
- `compatibility-and-operations.md` — rollout, revocation, recovery, and older clients

Proposals remain in their subject file until explicitly accepted. Once accepted, record the decision in `decisions.md` and remove it from the unresolved list.

For every material question, first inspect the relevant current Fluxer implementation, schemas, tests, documentation, and history as needed. Record that evidence and rationale durably alongside the question or accepted decision; do not leave it only in chat. Every canonical QAD entry in `decisions.md` must contain a nearby plain-language `Rationale`; every individual or explicitly grouped trail section must also contain a nearby `Why`, `Reason`, `Rationale`, `Safety boundary`, or `Risk` statement. A shared end-of-trail audit supplements but does not replace those local explanations. The recommendation must identify whether it preserves, extends, replaces, or intentionally differs from current behavior. Discord is a compatibility and UX comparison point, not the source of truth.

Earlier discussions that predate this format are reconstructed in `trails/` from the recovered original task, the accepted decision record, and codebase inspection. `provenance.md` distinguishes direct user decisions from user-authorized derivation, accepted-decision consequences, and repository conclusions. Reconstructed reasoning is not presented as a verbatim transcript.

QAD-001 is retained as historical provenance but is superseded by QAD-226, the current explicit instruction to publish `Research/` plus only the root branch-safety `.gitignore` on the independent `implementation-plan` branch rooted at a parentless commit. Later explicitly requested research-review commits may descend from that root. QAD-002 still prohibits product implementation; the research-only publication is not product code.

## How to read decision status

An entry in `decisions.md` is operative within this plan unless it is explicitly marked superseded. That alone is not proof that the user personally approved it:

- a trail that records **User answer** or **User correction** is a direct user decision to the extent of the preserved record; **User-authorized answer** records explicit authority, while `provenance.md` determines whether the substance was selected directly or delegated for accurate derivation;
- a **Repository-derived answer/outcome** or **Classification** is a conclusion or implementation recommendation derived from current code/contracts, not a new user-approved product choice;
- an **Accepted-decision inference** applies dependencies already in the accepted record and must not silently broaden them;
- the range map in `provenance.md` supplies the default authority when a local trail uses the older generic **Recommendation and answer** label; a more specific later user correction or repository-derived label takes precedence.

An accepted-record entry can also carry an explicit soundness gap. When later evidence or an explicit user correction resolves one, update the canonical answer and preserve the superseded alternative and reason in its trail. QAD-038 now preserves Discord-compatible invite mode under the held-bit ceiling, adds a versioned code-defined exact-set exception for `Manage Guild`, and reserves later expansion for owner/`Administrator`; its trail retains the rejected alternatives and tradeoff.

The complete record for one ID may be distributed: `decisions.md` gives the canonical answer; its topic trail gives the question, alternatives, evidence-backed reasoning, tradeoffs, classification, and supersession history; a linked spec gives implementation consequences and dependencies. A spec is proposed behavior, never current-state proof. When a field is absent or current evidence is insufficient, that is a documentation/evidence gap—not permission to invent rationale or promote a recommendation into product policy.
