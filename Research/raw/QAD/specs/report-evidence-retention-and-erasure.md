# Report Evidence Retention, Hold, and Erasure

Status: accepted future platform-wide policy under QAD-145, QAD-188, QAD-211, and QAD-213. It governs ordinary reports and application-ephemeral report snapshots equally, prospectively and without destructive legacy backfill. Moving to 180 days after resolution requires privacy-policy/legal review because the current public policy states an up-to-one-year report-snapshot lifecycle.

## Ordinary lifecycle

- An `OPEN` or explicitly `REOPENED` report retains the evidence required for review until it reaches a terminal resolution. Aging reports are operationally alerted rather than silently deleted.
- Resolving a report sets `resolved_at` and `evidence_expires_at = resolved_at + 180 days`.
- Reopening before expiry clears `evidence_expires_at`; the next resolution starts a new 180-day period.
- At expiry, report content/context, additional information, direct identifiers no longer independently required, cloned objects, and report-search documents are logically revoked and then physically deleted by an idempotent purge operation.
- Only anonymous aggregate counts by broad category/outcome/time period may remain after purge. Aggregates contain no report/user/application/message/community IDs, content excerpts, object references, or small-cell breakdown that could reidentify a case.

There is no different or longer bot/ephemeral-report policy. Reporting an ephemeral response snapshots the exact active version into the same report-evidence domain, then the ordinary 180-day-after-resolution lifecycle applies.

## Legacy activation

Policy activation records one durable cutoff/policy generation. It does not calculate expiries for reports already resolved before that cutoff:

- a pre-activation resolved report with no policy generation is `LEGACY_RETAINED`; no new database/search expiry is inferred. This marker does not override the public up-to-one-year object-snapshot lifecycle or a binding legal obligation;
- a report still pending at activation receives the new generation when it is resolved and then expires 180 days later;
- a future explicit reopen of a legacy report adopts the current generation when it is resolved again;
- all newly submitted reports use the current generation;
- purge queries require an explicit new-policy generation and expiry, so a null/legacy marker fails closed rather than being treated as old enough to delete.

There is no bulk destructive backfill. A later legacy cleanup needs a separately accepted staff/legal migration with dry-run counts and sizes, affected date ranges/types, NCMEC/statutory exclusions or holds, staged deletion, recovery limits, and audit. Until then, legacy storage is an intentional compatibility cost rather than an accidental target of the new worker.

## Legal and statutory holds

A hold overrides ordinary purge only for evidence within its exact case scope. A hold records a non-secret hold ID, authority/category, access-controlled reason/reference, creator, creation time, next review date, release authority/time, and row version. Hold creation/release is separately ACL-protected and fully audited.

- The next review date is mandatory and at most 90 days away; review renews or releases the hold but never fabricates legal authority.
- A hold has no application- or community-controlled path.
- If ordinary expiry passed while held, release queues logical revocation immediately and completes physical purge within seven days.
- Statutory safety referrals and preservation requests use the same restricted hold machinery but may have an externally mandated scope/duration. The 180-day product default does not override a binding obligation.
- Hold data and access are not exposed to applications, community managers, ordinary reporters, search, account export, or analytics.

This policy is an engineering baseline, not a claim that one duration satisfies every jurisdiction. Deployment/legal ownership must validate applicable duties, and the public privacy policy must be reviewed/updated before activation. The product implements coordinated storage limitation, evidence isolation, reviewability, and deletion rather than relying on divergent row/search/object behavior.

## Account deletion and erasure

Account deletion does not erase an open/held safety case or allow either reporter or subject to destroy evidence unilaterally.

- Direct reporter contact/profile fields that are no longer necessary are removed at account deletion; open/held fields needed for case contact, defence, or an applicable obligation are access-restricted and removed when that need ends.
- User foreign keys needed during an open/held case are replaced where feasible with report-scoped pseudonymous references. A plain unsalted hash of a Snowflake is prohibited.
- Resolved ordinary evidence continues only until its existing 180-day deadline; account deletion never resets or extends it.
- An erasure request triggers a recorded field/evidence review. Data without a current case, safety, legal-claim, or binding-retention basis is erased. A restricted/denied portion records its basis, scope, reviewer, and next review/expiry without exposing evidence in the response.
- Content inside evidence may remain indirectly identifying when alteration would destroy evidentiary integrity; access restriction and bounded expiry apply instead of pretending it was anonymized.

The separate enforcement/account-deletion record retains only what its own lifecycle requires. Report evidence is not kept longer merely for possible future profiling or repeat-offender analytics.

## Storage and purge mechanics

Extend the authoritative report row with explicit lifecycle/version fields and maintain bounded expiry/hold query tables owned only by `ReportRepository`. TTL alone is insufficient because evidence can span source rows, reporter-dedup rows, search documents, and cloned objects.

The purge aggregate:

1. conditionally transitions eligible evidence to `PURGING`, rechecking current status, expiry, hold version, and reopen state;
2. removes it from every report search/read surface;
3. deletes copied attachment/evidence objects and dependent indexes;
4. deletes or content-redacts the source report according to the minimal post-purge audit schema;
5. records terminal completion/failure and retries safely under one deterministic operation ID.

The minimal purge audit records only report ID, broad type/category, terminal outcome, resolution/expiry/purge timestamps, hold-existed boolean, operation result, and integrity proof. It contains no content, direct participant identifiers, application/community/message IDs, invite codes, contact data, or object paths. Its own retention follows the general safety-administration audit policy rather than becoming a shadow report database.

Backups must not resurrect expired evidence. Purge/deletion markers remain in the independently replayed deletion journal longer than every backup capable of restoring the row plus the restore-validation window; restored search indexes and evidence objects reconcile from current authoritative lifecycle state.

## Current Fluxer evidence and classification

- `IARSubmissions` currently has `PENDING`/`RESOLVED`, resolution fields, full reporter/target/message context, and no expiry, hold, reopen, purge, or delete contract.
- `ReportRepository` can create/read/resolve/list reports but cannot delete them; report search adapters already expose delete methods that can join a purge operation.
- Account-deletion administration currently resolves some pending reports against an administratively deleted reported user but does not erase or expire their evidence.
- Ordinary reports may include cloned message attachment evidence; QAD-212 removes attachments from the initial ephemeral response surface, so initial ephemeral reports snapshot text/structured control evidence only.
- `fluxer_marketing/content/policies/privacy.md` sections 7.9/7.10 promise report snapshots for up to one year, automated object-storage lifecycle deletion, and rare binding-legal extension. That is a public contract; repository inspection did not verify the deployed storage rule, and the row/search code does not coordinate to it.
- [GDPR Article 5](https://eur-lex.europa.eu/eli/reg/2016/679/art_5/oj) establishes storage limitation but supplies no universal product-specific 180-day report duration; the selected duration remains Fluxer's reviewed baseline subject to applicable legal validation.

This **changes** the current public up-to-one-year snapshot contract to 180 days after resolution and **extends** the report/search/object boundaries with one coordinated purge, hold, reopen, pseudonymization, and reconciliation lifecycle. It does not claim the current system intentionally retains every copy indefinitely or that the documented object lifecycle was code-verified.

## Required validation

- resolve/reopen/expiry/hold/release concurrency and stale-version tests;
- 180-day boundary and seven-day post-release purge tests under a controlled clock;
- report source, dedup row, search document, and cloned-object deletion fault injection/reconciliation;
- account deletion and erasure field-by-field fixtures for reporter and subject roles;
- legal-hold ACL, mandatory review date, audit, and non-disclosure tests;
- ephemeral versus ordinary report parity tests;
- backup/restore non-resurrection and deletion-journal tests;
- aggregate small-cell/reidentification review and proof that no content/identifier enters retained metrics;
- activation/migration tests proving pre-policy resolved reports are grandfathered, pending reports adopt the policy only on later resolution, and null/unknown generations never purge.
