# Ephemeral Response Lifecycle Simulation

## SIM-E01 — account-wide delivery, reporting, dismissal, expiry, and export exclusion

### Scenario and purpose

An application returns an invoker-only response to Alice. Alice has two active sessions, Bob tries to fetch it, Alice reports then dismisses it, the application retries an edit, and an account export runs. A second response expires naturally. This validates the separate audience/store, terminal deletion, report evidence split, suspension behavior, and export exclusion.

### Decision and current-state evidence

- **Controlling QAD:** `../QAD/trails/05-ephemeral-responses.md` -> QAD-045–054 (audience, sessions/reload, lifetime, dismissal, edits/follow-ups/components), QAD-142, QAD-188, QAD-210–213.
- **Exact specs:** `../QAD/specs/ephemeral-storage-and-access.md` -> `Separate recipient-scoped resource`, `No initial attachment or media-upload surface`, `Reporting path`, `Account export exclusion`; `../QAD/specs/report-evidence-retention-and-erasure.md` -> `Ordinary lifecycle`, `Legacy activation`, `Legal and statutory holds`.
- **Current constraints:** CS-MESSAGE/CS-OPS/CS-HARVEST. `fluxer_api/src/api/models/Message.ts` and `packages/schema/src/domains/message/MessageRequestSchemas.ts`/`packages/schema/src/domains/message/MessageResponseSchemas.ts` are channel-oriented. There is no recipient-scoped response row, account-session dismissal, interaction response authority, or ephemeral export/report path. Current report database/search/object copies have no coordinated expiry lifecycle; the current harvest starts from messages authored by the user.

### Actors, permissions, and initial state

- Alice is the trusted interaction invoker with sessions `A1` and `A2`; Bob is another channel member/session.
- `app-A` is active/unsuspended and creates text/control-only response `eph-1` at `t0` requesting 24 hours. Fluxer derives Alice as the sole recipient and sets absolute expiry no later than `t0+24h`.
- The payload contains bounded text, a non-media control, platform app icon, and authorized emoji. No file/media fields exist.

### Expected processing and state transitions

1. Fluxer allocates a response Message Snowflake but inserts `eph-1` only into Alice-keyed ephemeral storage and response lookup rows with the same absolute TTL. It does not touch channel history, last-message/read state, search, mentions, notifications, pins, forwards, counts, link previews, or analytics content.
2. Authenticated dispatch targets all active sessions for exactly Alice. Both `A1` and `A2` render it and a reload refetches it by Alice/context. Bob's fetch receives the unknown-resource result without revealing existence.
3. If the application adds an attachment, File/Media Gallery/Thumbnail/File Upload component, embed media field, or app-controlled media, validation returns `EPHEMERAL_MEDIA_UNSUPPORTED`; it never silently drops or publishes it. Public messages retain their separate media contract.
4. While active, only Alice may report `eph-1`. Fluxer snapshots the exact displayed version, application/bot/interaction/community/channel attribution, timestamps, representation, and necessary content into private report evidence. Community managers and app owner do not gain access.
5. Alice dismisses from `A1`. A conditional transition writes `ACTIVE -> DISMISSED` first, broadcasts removal to `A1`/`A2`, revokes controls and application mutation, then queues idempotent physical deletion. The async lag cannot make the row readable because logical state is authoritative.
6. An application edit/recreate attempt for the same response receives terminal dismissal. Exact retry returns the same classification and cannot reopen it. The submitted report remains a distinct durable safety record and is not rewritten by dismissal.
7. Alice starts account export while another active `eph-2` exists. Export reads no ephemeral rows/content/component state/IDs/counts/application identity. At most it includes a generic omission-policy statement. Report evidence is not smuggled into the ordinary export.
8. `eph-2` reaches absolute expiry. Reads logically transition/fail as expired before physical cleanup; events remove it from Alice's sessions. Application activity/edits never extend expiry.

### Suspension, retention, deletion, and recovery

- If `app-A` is suspended before normal terminal state, active delivered content remains until dismissal/expiry, gains a platform suspension label, controls/application edits become inert, and Alice can still report it. Lifting suspension cannot revive old control authority.
- Operational metadata is allowlisted (IDs, counts/bytes, safe state/error/timing) for at most 24 hours; content, URLs, values, tokens, signatures, and arbitrary errors never enter logs/metrics/search.
- Report evidence stays while open/reopened, then 180 days after terminal resolution. Exact audited legal/statutory hold pauses purge; an overdue item purges within seven days after release. Account erasure minimizes/pseudonymizes unnecessary participant data without destroying an active case. Only anonymous broad aggregates may remain.
- A report resolved before activation gets `LEGACY_RETAINED`; no new database/search expiry is inferred and later cleanup needs separate staff/legal review. This does not extend object snapshots beyond the current public up-to-one-year lifecycle or a binding legal obligation. A report pending at activation adopts the new generation when later resolved, and reopening a legacy report adopts the current generation on its next resolution.
- Ephemeral payloads are excluded/purged during DR and never restored to users. Report evidence follows the report backup policy, not ephemeral storage.

### External effects, concurrency, and audit

- Report creation has its own idempotency/evidence identity; duplicate submit cannot create inconsistent snapshots. Dismiss/report racing must either snapshot an authorized visible version before terminal transition or return a safe terminal result—never read another recipient's data.
- Application edits require valid response authority, active/non-dismissed state, same recipient/visibility/representation, and preserve original expiry. Five follow-ups maximum share the same derived audience.
- No content is placed in guild audit. Safety access/purge/hold transitions are separately audited without exposing evidence to application/community audiences.

### Conclusion and implementation gap

The trace validates that ephemeral behavior cannot be a flag on an ordinary channel message: audience, query paths, export, reporting, and terminal deletion all require a separate recipient-owned resource. Current code has none of those boundaries. QAD-188's earlier defensive private-file design is superseded initially by QAD-212; the simulation therefore rejects media rather than inventing storage.

## SIM-E02 — report resolution, reopen, hold, purge, and recovery converge across every evidence copy

### Scenario and purpose

A new-policy report is resolved, reopened, resolved again, held beyond expiry, released, and purged while search/object deletion partially fails. A legacy report and an account-erasure request exercise the fail-closed migration and minimization boundaries. This turns QAD-211/213's distributed privacy lifecycle into an executable state chain.

### Decision and current-state evidence

- **Controlling QAD:** QAD-145, QAD-188, QAD-211, QAD-213, and QAD-221.
- **Exact spec:** `../QAD/specs/report-evidence-retention-and-erasure.md` -> `Ordinary lifecycle`, `Legacy activation`, `Legal and statutory holds`, `Account deletion and erasure`, `Storage and purge mechanics`.
- **Current constraints:** CS-OPS. Current report rows/search/object snapshots have no coordinated expiry, hold, reopen, purge, or erasure owner. Search adapters can delete, but current report persistence cannot prove cross-copy completion or non-resurrection.

### Reports, stores, and initial state

- Policy generation `G2` activates at cutoff `T0`. `report-N` is still open at `T0` and has a source row, reporter-dedup row, search document, and cloned evidence object. `report-L` was resolved before `T0` with no policy generation.
- Authorized safety/legal actor `staff-H` can place/release a scoped hold; applications, community managers, reporter, and subject cannot.
- One deterministic purge operation owns source/search/object/index cleanup and the independently recoverable deletion marker.

### Projection chain and expected outcomes

1. If `report-N` resolves at `T1`, then one conditional transition binds `G2`, sets `resolved_at=T1`, and sets `evidence_expires_at=T1+180d`. No worker infers expiry from object age or search timestamps.
2. If the report is explicitly reopened before that deadline, then a version-checked transition clears `evidence_expires_at` and retains evidence for active review. A later resolution at `T2` starts a fresh `T2+180d` deadline; it does not reuse or extend the old timestamp silently.
3. If `staff-H` places a case-scoped hold before expiry, then the hold records authority/category, restricted reason/reference, creator, row version, and mandatory review date at most 90 days away. The hold grants no application/community/export/search visibility and cannot be created through an application path.
4. If ordinary expiry passes while the hold remains valid, then purge queries exclude the report. Review must renew with continuing authority or release; a missed review is an operational exception, not permission to fabricate legal authority or silently delete held evidence.
5. If the hold is released after ordinary expiry, then logical revocation is queued immediately and physical purge must finish within seven days. Release audit exposes no evidence, and the expired case does not regain a new 180-day period.
6. If reopen and purge race, then both condition on current report status, policy generation, expiry, hold version, and row version. A committed reopen makes the purge claim fail; a committed `PURGING` transition makes read/search surfaces unavailable and prevents a stale reopen/write from resurrecting evidence. Exactly one authoritative lifecycle wins.
7. After `PURGING`, Fluxer removes search/read surfaces, cloned objects, dependent indexes/dedup rows, and source content under one operation ID. If object deletion succeeds but search deletion fails, retry observes completed effects and resumes only the missing deletion; it never restores the object or reports terminal success early.
8. Terminal purge leaves only the minimal content-free purge audit and an independently replayed deletion marker. Restoring a backup replays the marker before reads/search/object reconciliation, so no expired evidence becomes visible even if physical backup copies still exist.
9. If the reporter or subject account is deleted or requests erasure while the case is open/held, then unnecessary contact/profile fields are removed and necessary identifiers become report-scoped pseudonyms where feasible. Restricted necessary evidence retains its existing case/deadline/hold lifecycle; account deletion neither destroys the case nor resets/extends retention.
10. `report-L` receives `LEGACY_RETAINED`, and null/unknown policy generation is never purge eligibility. If it is explicitly reopened and later resolved under `G2`, only that new resolution starts the current lifecycle. No bulk destructive backfill or object-lifecycle extension is inferred.

### Privacy, audit, and failure boundaries

- Only non-reidentifying broad aggregates may remain after purge; small cells, report/application/community/message IDs, content excerpts, and object paths are prohibited.
- Holds, evidence reads, purge transitions, restricted erasure decisions, and failures are access-controlled and audited without copying evidence into ordinary guild audit or application traces.
- Activation remains blocked until privacy-policy/legal review accepts the future policy generation; this simulation validates engineering behavior, not universal legal sufficiency.

### Conclusion and implementation gap

The report lifecycle is a versioned distributed deletion operation, not a TTL on one row. Reopen/hold state must win before purge, partial deletion must resume without resurrection, and legacy null generations must fail closed. Current report/search/object ownership cannot implement that chain.
