# Bot-Platform Research

This tree is a planning and validation artifact, not an implementation. It was
verified against Fluxer `main` at
`fd62b46faf3505d738f6d5800e787473b14cacd6` on 2026-07-20. Planned behavior is
not present behavior unless a current-state document cites an existing code,
schema, test, or configuration boundary that implements it.

## Information sources

- [`QAD/`](QAD/README.md) records questions, accepted answers, decision status,
  evidence-backed reasoning, alternatives, tradeoffs, dependencies,
  supersessions, assumptions, and unresolved or deployment-owned inputs.
- [`CS/`](CS/README.md) records only verified current repository facts and
  important absences. It does not turn implementation recommendations into
  current behavior.
- [`SIM/`](SIM/README.md) exercises accepted decisions in concrete scenarios
  against current-code constraints. A simulation is not proof that the planned
  feature exists; discrepancies are implementation gaps or unresolved policy.

Comparative external-contract evidence is kept in
[`discord-api-compatibility.md`](discord-api-compatibility.md) and
[`discord-components-v2-reference.md`](discord-components-v2-reference.md).
Those files describe the cited contract as observed on their verification date;
they do not create Fluxer product decisions. The cross-source audit and its
remaining risks are recorded in `consistency-review.md` after QAD, CS, and SIM
validation.

## Reading and authority rules

1. QAD decision status controls planned product behavior. A recommendation,
   repository-derived conclusion, assumption, unresolved question, or
   deployment-owned value is not a user-approved product decision.
2. CS controls claims about what the baseline repository actually implements.
3. SIM demonstrates consequences and gaps; it cannot silently amend QAD.
4. Exact QAD identifiers and repository paths are the traceability keys. Where
   external behavior matters, the dated official contract URL is also cited.
5. A conflict is reported rather than resolved by whichever document is read
   first.

## Scope and publication

No product-code implementation is included. `Research/` is the only tree in the
independent `implementation-plan` history. Its current history is one
parentless commit after the user-requested squash; there are no descendant
review commits at this snapshot. The existing `main` history and tree remain
outside that publication.
