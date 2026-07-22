# Decision Provenance

This file records how each accepted QAD answer entered the plan. It classifies decision authority; it is not a verbatim transcript and does not replace the local rationale, evidence, alternatives, or supersession history in the trails.

## Recovered source record

The original design task was recovered from the local Codex task archive:

- task title: `Analyze bot commands and roles`
- task ID: `019f7040-ae0a-7912-bb2e-39b83813d315`
- decision work: 2026-07-17 through 2026-07-20 UTC

That task contains the original one-question-at-a-time approvals, the user's instruction on 2026-07-18 to infer implementation/security answers from the codebase where accuracy was high, the later direct product answers, the instruction to create QAD/CS/SIM, and the initial publication request. Later research-review tasks contain the explicit corrections and additions made after the first published Research snapshot. The task archive is local evidence and is not part of this branch, so the durable trails remain the reviewable explanation of each answer.

## Provenance classes

- **Direct user decision:** the user approved, rejected, selected, or corrected the material behavior in a task. The trail may summarize the exchange, but must not claim to quote it.
- **User-authorized derivation:** the user explicitly asked the agent to resolve questions it could answer accurately from code, existing decisions, or security/implementation constraints. The result is accepted plan material, but is not represented as the user's personal product preference.
- **Accepted-decision consequence:** the answer follows from an already accepted boundary and makes it implementable without adding another product choice. It remains reviewable and can be wrong if the dependency was applied incorrectly.
- **Repository/current-contract conclusion:** the answer reports or derives from verified code/contracts. It is not product approval and must be corrected when its evidence is wrong.

## QAD authority map

| QAD IDs | Provenance | Preserved qualification |
|---|---|---|
| QAD-001, QAD-002, QAD-002A, QAD-002B | Direct user scope/compatibility decisions in the original task | QAD-001 is historical and is superseded by QAD-226. |
| QAD-003–148 | Direct user decisions in the original one-question-at-a-time sequence | Trail wording is a structured summary rather than a transcript. Later explicit corrections supersede the original answer where identified below. |
| QAD-149–162 | Direct user decisions in the original installation-lifecycle sequence | The user approved the state machine, ownership, deadlines, retries, recovery, effect order, rollback, and uninstall answers individually. |
| QAD-163–202 | User-authorized derivations from repository evidence and already accepted constraints | On 2026-07-18 the user explicitly asked the agent to write accurately inferable answers without interrupting for approval. These entries are accepted implementation/security architecture, not direct product-preference answers. QAD-175–187 were also identified as implementation/security derivations in the task itself. |
| QAD-203–220 | Direct user decisions and corrections in the original task | This includes the selected handle, retention, application-cap, delegated-action, report, review-gate, protocol, suspension, and Discord drop-in policies. QAD-213 is the user's least-disruptive legacy-report choice; QAD-214 is the required developer-server review gate. |
| QAD-221–223 | User-authorized derivations from repository evidence and prior decisions | The user again asked on 2026-07-20 for confidently inferable questions to be resolved. Deployment-owned DR values and permanent bounded setting-key behavior were recorded under that authority; deployment numbers remain external evidence, not inferred values. |
| QAD-224–225 | Direct user decisions in the original task | The user selected bounded command history and the 45-day superseded-value window after the remaining alternatives were presented. |
| QAD-226 | Direct user publication/VCS instruction | It supersedes only QAD-001's local-only publication rule and does not authorize product implementation. |
| QAD-227–237 | Direct user decisions in the later command-specification review | The trails identify the individual approvals and preserve the supplied draft as non-authoritative input. |

## Later corrections and supersession

Later review did not reopen every accepted answer. It produced three different kinds of change:

- The user directly corrected QAD-038's install-permission source and ceiling, QAD-039's public execution-mode tokens, QAD-041's six mode-review transitions, QAD-060's terminal component-input owner, QAD-189's capability/negotiation ownership, and the related operative cross-references. Those later answers supersede their earlier forms.
- Consequential edits to QAD-008–011, QAD-032–035, QAD-061/065/066, QAD-111, QAD-136, QAD-186, specs, and SIM apply those directly corrected boundaries; they are not separately attributed as new user choices.
- Source-path, current-code, enum, field-ownership, concurrency, rationale, and simulation-trace corrections are evidence repairs. Agreement to fix an inconsistency does not turn a repository fact or implementation detail into a personal product preference.

When the authority map and a local trail label appear to conflict, the more specific later trail correction and its supersession text control. QAD-214 still requires project review of the complete plan before implementation; that gate validates the architecture and deployment fit, not missing provenance.
