# Ephemeral Response Trail

## Record status

Structured from the recovered 2026-07-17–20 `Analyze bot commands and roles` task, the accepted decision index, and repository inspection. This is not a verbatim transcript; `../provenance.md` classifies decision authority.

## Current Fluxer basis

- `packages/schema/src/domains/message/MessageResponseSchemas.ts`, `fluxer_api/src/api/models/Message.ts`, and the Rust message-service types model persisted channel-visible messages; they have no ephemeral interaction-response representation.
- Current public-message dispatch is channel/audience based. There is no server-owned invoker-only delivery, account-wide ephemeral dismissal state, or interaction response authority.
- Ephemeral behavior is therefore a new data lifecycle and delivery contract rather than a flag on existing public messages.

## Decision trail

### Audience ownership — QAD-045

- **Question:** May the application select one or more ephemeral recipients?
- **Recommendation and answer:** no. Fluxer derives exactly one audience: the trusted interaction invoker. Application responses cannot substitute another user or recipient list.
- **Why this is sound:** Fluxer can authenticate the invoker but cannot trust an application-supplied recipient. Derivation prevents the response token from becoming an unreviewed private-messaging capability and gives every read/delivery path one enforceable audience.
- **Classification:** new server-owned privacy boundary.

### Multi-session delivery and reload — QAD-046 and QAD-047

- **Question:** Is ephemeral state local to the initiating browser tab or account-scoped?
- **Recommendation and answer:** deliver to all active sessions for the invoking account and retain the response across reload during its lifetime. No other account receives it.
- **Why this is sound:** the authenticated account is the privacy principal, not one transient tab. Account-scoped storage avoids lost responses and inconsistent dismissal after reload while recipient checks still exclude every other account.
- **Classification:** new account-scoped ephemeral store and dispatch behavior.

### Lifetime limits — QAD-048

- **Question:** Who chooses retention, and what are the maxima?
- **Recommendation and answer:** Fluxer enforces at most 24 hours for ordinary ephemeral responses and 5 minutes for actionable security confirmations, measured from creation. Applications may request shorter lifetimes; edits never extend them.
- **Why this is sound:** platform maxima prevent applications from turning transient private UI into indefinite storage, while shorter application deadlines remain possible. The tighter confirmation window limits replay of high-impact authority; both are accepted product bounds rather than current-code-derived values.
- **Classification:** new platform retention policy.

### Dismissal semantics — QAD-049 and QAD-050

- **Question:** Is dismissal device-local, and can a bot resurrect a dismissed response?
- **Recommendation and answer:** dismissal is account-wide and terminal. The application cannot edit, reopen, or recreate that same response afterward.
- **Why this is sound:** dismissal expresses the recipient's lifecycle decision, so another session or later bot edit must not reverse it. A terminal server state closes reads and controls before asynchronous cleanup and makes cross-session behavior deterministic.
- **Classification:** new account-owned lifecycle state.

### Application edits — QAD-051

- **Question:** May a bot update an active ephemeral response?
- **Recommendation and answer:** yes, while its response authority, retention period, and non-dismissed state all remain valid. Edits preserve the invoker-only audience and original expiry.
- **Why this is sound:** bounded edits support deferred progress and correction without granting a new audience or retention period. Rechecking all three predicates ensures a stale token cannot revive a dismissed or expired private resource.
- **Classification:** new bounded interaction-response operation.

### Follow-ups and spam boundary — QAD-052 and QAD-053

- **Question:** Are ephemeral replies single-message only or an unbounded private stream?
- **Recommendation and answer:** allow follow-ups to the same derived invoker, capped at five in addition to the initial response.
- **Why this is sound:** a small follow-up set supports multi-step results without forcing public messages, while a hard per-interaction cap prevents one invocation from becoming an unlimited private spam/retention channel. Five is an accepted compatibility-oriented product ceiling.
- **Classification:** new bounded response model; deliberately stricter than an unlimited bot-controlled stream.

### Ephemeral components — QAD-054

- **Question:** May ephemeral responses contain controls, and who can operate them?
- **Recommendation and answer:** yes, but only the invoker may operate them. Controls terminate with dismissal or expiry regardless of application payload.
- **Why this is sound:** controls make private workflows useful, but their authority must inherit the response's server-derived audience and terminal lifecycle. That prevents forwarded/rendered payloads or application fields from widening who can act.
- **Classification:** new interaction behavior built on the server-owned audience.

### Evidence after suspension — QAD-142

- **Question:** Should targeted application suspension immediately erase already-delivered ephemeral content?
- **Tradeoff:** deletion limits exposure but can erase abuse evidence and confuse the recipient.
- **Recommendation and answer:** retain it until normal dismissal/expiry, label the application suspended, disable controls and application mutation, and preserve reporting.
- **Why this is sound:** suspension must stop new application authority immediately, but the already-delivered recipient copy has its own short deadline and may be needed for reporting. Inert labeled retention preserves user context/evidence without permitting continued bot control.
- **Classification:** new incident-response lifecycle behavior.

### Storage, access, attachments, indexing, logs, and deletion — QAD-188

- **Question:** How can account-wide reloadable ephemeral responses and attachments actually remain invoker-only, and which ordinary message systems must exclude them?
- **Repository-derived answer:** store them outside channel message partitions in recipient-scoped TTL rows, deliver/fetch only after authenticated recipient derivation, and make dismissal/expiry terminal before asynchronous deletion. Use private attachment storage behind an authenticated media route rather than public ordinary attachment URLs. Never index content or place it in channel history/read/mention/notification/forward paths; retain only allowlisted operational metadata for 24 hours.
- **Reporting mechanics:** only the recipient may submit a report; snapshot the exact response/application/interaction evidence and clone selected attachments into private report storage before the ephemeral copy disappears. The snapshot follows ordinary report policy and remains invisible to community managers.
- **Why this did not require another product choice:** these are necessary enforcement consequences of the already accepted invoker-only audience, reload, 24-hour maximum, terminal dismissal, and reporting requirements. Current channel message/public media paths cannot satisfy that privacy boundary.
- **Classification:** intentionally separate ephemeral persistence/delivery; reuse current private storage and report-snapshot primitives only after recipient authorization.

### Account export exclusion — QAD-210

- **Question:** Should an active, undismissed ephemeral response be snapshotted into the recipient's ordinary account export?
- **Current precedent:** Fluxer's user harvest queries messages authored by that user; an application-authored received response does not naturally enter it.
- **Recommendation and answer:** exclude all ephemeral response content, attachments, component state, and per-response metadata from ordinary exports even while active. The archive may state the omission policy generically but may not create a per-response substitute. Report evidence remains a separate safety record.
- **Reasoning:** exporting would create a durable archive artifact beyond the response's at-most-24-hour lifecycle and would introduce a new received-transient-data category contrary to current author-owned harvest behavior.
- **Classification:** preserves the current export ownership boundary and the accepted transient ephemeral lifecycle.

### Shared report-evidence lifecycle — QAD-211

- **Question:** How long may submitted ordinary and ephemeral-response report evidence remain, and what happens under holds, account deletion, and erasure?
- **Recommendation and answer:** keep necessary evidence while a report is open/reopened, then for 180 days after terminal resolution. Exact audited legal/statutory holds pause purge; if the deadline passed while held, purge within seven days after release. Account deletion/erasure removes unnecessary contact/profile data and pseudonymizes where feasible without letting a participant destroy an active case. Cloned/search evidence follows the same lifecycle and only genuinely anonymous broad aggregates may remain.
- **Current precedent:** Cassandra report/search records have `PENDING`/`RESOLVED` state and evidence snapshots but no coordinated expiry, hold, purge, or erasure contract. Separately, `fluxer_marketing/content/policies/privacy.md` sections 7.9/7.10 promise report snapshots for up to one year, automated object-storage deletion, and rare binding-legal extension; repository inspection did not verify that deployed object-lifecycle mechanism.
- **Why sound / tradeoff:** one policy generation across rows, search, cloned objects, holds, and backups avoids contradictory copies. The selected 180 days after resolution may be shorter or longer than six months from report creation and changes the current public one-year wording, so it requires privacy-policy/legal review and migration/communications rather than being described as current cleanup. It reduces post-resolution exposure but reduces the ordinary appeal/investigation window.
- **Classification:** explicit future platform-wide retention change, not a current-state conclusion. Legacy database/search activation remains a separate destructive-migration choice and existing public object-storage obligations continue until validly changed.

### No initial ephemeral files or application media — QAD-212

- **Question:** Do short invoker-only bot information/action responses need attachments initially?
- **Recommendation and answer:** no. Support bounded text/embed fields and non-media controls, with platform icons and authorized emoji, but reject attachment/file/media/upload components and application-controlled media. Public responses keep ordinary media. A future ephemeral-file capability requires a separately approved private-media design.
- **Reasoning:** no accepted initial use case requires the extra private-object, scanning, export, cleanup, and evidence surface. Failing explicitly is safer than silently dropping content or building unused infrastructure.
- **Supersession:** QAD-188's private-attachment design was a defensive consequence if attachments existed; QAD-212 removes that initial premise. QAD-188's recipient-scoped response and report-snapshot boundaries remain.
- **Classification:** deliberately narrows the initial feature while preserving additive future extensibility.

### Non-destructive legacy report activation — QAD-213

- **Question:** How should QAD-211 affect reports already resolved when database/search records have no coordinated expiry generation but the public policy separately promises object snapshots for up to one year?
- **Recommendation and answer:** do not infer destructive database/search deadlines. Mark already-resolved legacy records as retained pending a separate reviewed migration; reports resolved after activation use QAD-211, including reports that were pending at activation or are later reopened. QAD-213 does not extend object snapshots beyond the current public up-to-one-year/binding-obligation rule.
- **Reasoning:** this preserves database/search evidence whose safe cross-copy deletion cannot be inferred, while preserving the public object-storage ceiling and accepting temporary dual policy generations. A later cleanup requires cross-copy counts, policy/legal review, holds, and staged non-resurrection verification.
- **Classification:** preserves existing legacy data while applying the new bounded lifecycle prospectively.

## Still unresolved in this subject

No unresolved product decision remains in this subject.

## Cross-cutting completeness audit

- **Scope:** supplements QAD-045 through QAD-054, QAD-142, QAD-188, and QAD-210 through QAD-213.
- **Shared credible alternatives and rejection:** store ephemerals as ordinary channel messages; deliver to only one transient session; retain until explicit dismissal; let dismissal hide locally; allow unbounded follow-ups; delete on suspension; export active private responses; support initial application files/media; create a second report lifecycle; or infer destructive expiry for legacy resolved reports. These alternatives leak recipient-private data, produce inconsistent account behavior, permit spam/retention expansion, erase incident evidence, duplicate safety policy, or irreversibly destroy data without a prior promise. Recipient-scoped storage, absolute expiry, account-wide terminal dismissal, bounded follow-ups, preserved suspension evidence, export exclusion, text/control-only initial scope, and policy-generation-aware reporting address those risks.
- **Evidence-backed soundness:** current message partitions/history/search/Gateway are channel-oriented; current account harvest is author-owned; current report rows/search snapshot evidence but have no coordinated expiry/hold/purge contract; `fluxer_marketing/content/policies/privacy.md` separately states an up-to-one-year object-snapshot lifecycle. Those facts support a separate private store and a coordinated future report lifecycle, not a claim of current ephemeral support or proof that the deployed object lifecycle runs. `specs/ephemeral-storage-and-access.md` and `specs/report-evidence-retention-and-erasure.md` record exact ownership and the GDPR storage-limitation source without asserting that law chooses 180 days.
- **Tradeoffs:** security/privacy avoid channel/search/export leakage and bound ordinary copies; operations must run private cleanup/object/report purge and non-resurrection checks; compatibility intentionally rejects initial ephemeral media and caps follow-ups; maintenance adds a private repository/lifecycle but shares report policy; users get cross-session private responses, dismissal/reporting, and clear suspension attribution, but lose content after at most 24 hours and cannot export or initially attach files.
- **Assumptions and unknowns:** the 180-day baseline requires deployment/legal validation; exact statutory holds and erasure bases are case-owned; pre-policy resolved rows remain indefinitely until a separately authorized migration; future ephemeral media needs a new capability/storage decision. Metrics/logs must never become shadow content retention.
- **Consequences and dependencies:** QAD-045 through QAD-054 own audience/UI/lifecycle; QAD-188 owns private storage/access; QAD-142 modifies suspension presentation without extending expiry; QAD-210 separates account export; QAD-211 owns shared evidence; QAD-212 constrains payloads; QAD-213 owns migration generation.
- **Supersession:** QAD-212 supersedes only QAD-188's defensive private-attachment implementation path. QAD-210/211/213 add export, evidence, and legacy rules without changing recipient-copy expiry. No report hold or suspension may resurrect the dismissed/expired recipient copy.
