# Bot Platform Abuse and Resource Protection

Status: repository-derived protection contract under QAD-143 through QAD-148, QAD-166, QAD-172, QAD-184, QAD-195, and QAD-227 through QAD-235.

## Principle

Extend Fluxer's existing leaky-bucket/global/Gateway protection rather than build an unreviewed parallel limiter. Every request is charged before expensive semantic work where possible; invalid, stale, duplicate, unauthorized, and idempotent requests consume their ordinary bucket. A rate-limit bypass flag used for trusted testing/operations does not bypass payload, concurrency, ownership, suspension, permission, or authority checks.

Rate limits protect load, not authorization. Hitting a limit never grants an application state transition and retry headers do not promise that a later request will be authorized.

## Fixed first-line bounds

The existing approved values remain the primary budgets:

- command/manifest route and identity quotas from QAD-172;
- invocation/autocomplete/installation delivery budgets from QAD-148;
- response/follow-up budgets from QAD-147;
- one application HTTP dispatcher with 50 in-flight, 100 queued, one retry, circuit suppression, 512 KiB outgoing request, and 1 MiB response from QAD-184;
- command/component/manifest structural and serialized limits from QAD-166/QAD-185;
- at most 50 typed values in one QAD-227 command option, with a required developer `max_values` no greater than that ceiling;
- at most 350 canonical QAD-228 relationship entries beside one 25-option sibling list, with one required/visibility rule per option and each conflict pair unique;
- QAD-229 temporal values fixed to four bounded canonical shapes, year `0001–9999`, safe-integer duration, and at most one reviewed IANA lookup/resolution per temporal option submission;
- at most 25 active QAD-231 categories, 100 lifetime-reserved category keys, and one category membership per command within the existing manifest cap;
- five follow-ups, one initial callback, version/CAS/idempotency rules, and token deadlines.

Add pre-parse body caps to the route itself so JSON/Zod validation cannot be forced to allocate an unbounded body:

| Input | Pre-parse cap |
|---|---:|
| Command manifest/draft publication | 8 MiB plus at most 16 KiB HTTP framing allowance; canonical parsed value remains <= 8 MiB |
| Command single-definition mutation | 512 KiB plus 16 KiB framing; canonical definition remains <= 512 KiB |
| Interaction callback/response/component JSON | 512 KiB |
| Autocomplete callback | 64 KiB |
| Declarative setting schema/value/action JSON | its later schema-specific cap, never the generic upload limit |
| Gateway Identify | existing 4096-byte Gateway frame cap |

Reject declared or streamed excess before parsing with `413`; decompression, if ever allowed, is bounded by the uncompressed cap. Bot-platform JSON routes do not accept compressed bodies initially. Attachments use the existing upload pipeline and size/count/scanning rules rather than base64 JSON.

## Concurrency and amplification controls

- One manifest-head mutation may be in flight per application. Competing writes fail CAS; they do not queue behind an unbounded application mutex.
- At most two autocomplete interactions are pending for one user/application and 50 for one installation. A newer user query makes older results ineligible for display; already-delivered work may finish but cannot overwrite the newer request identity.
- At most one pending component commit exists for one `(user, message, component semantic identity)`. Repeated client activation returns the same pending/terminal interaction result rather than emitting more application deliveries.
- An installation may have at most 1000 nonterminal interactions across Gateway/HTTP delivery and deferred response state. Above the cap, new eligible invocations fail fast as temporarily unavailable; security confirmations/native actions already issued continue toward safe terminal state.
- Public message updates require one expected version; Fluxer never retries or merges stale application output automatically.
- A structured delegated request performs exactly one registered native operation per capability. Bulk/mass actions are distinct registered operations with their own explicit target/cardinality cap and confirmation policy, not loops hidden in one generic action.
- A multi-value command argument is bounded input, not authorization or permission to fan out effects. Submission resolves at most the declared maximum, rejects duplicates and the whole collection on any invalid target, and performs no application delivery until every identity passes current visibility/selectability checks. QAD-209 still requires high-impact confirmation for multiple-target native effects.
- QAD-228 graph parsing, reference/type checks, cycle detection, and bounded satisfiability validation occur before persistence/publication. Submission evaluation is linear over the canonical bounded graph, returns no more than 100 safe path errors, performs no application callback, and never turns a malformed graph or manipulated client into executable policy.
- Temporal parsing is strict and linear over bounded strings/numbers. The server uses its reviewed timezone registry/current clock, performs no unbounded NLP or application autocomplete, rejects unknown zones/gaps/unselected overlaps/resolution mismatches, and never retries by changing the user's instant. Timezone aliases/canonicalization cannot bypass fixed-zone or bound checks.
- Category publication validates the complete bounded registry/membership before one manifest-head CAS. A community toggle updates one versioned policy row and invalidates catalog state once; it never expands into N writes, N deliveries, or application callbacks, and a stale client cannot bypass the current category deny.
- Ephemeral recipient and follow-up rules prevent application-controlled fan-out. Component audiences narrow access but do not create push fan-out.

These caps are reviewed code constants and emit current count/limit/retry state where safe. They are not permanent throughput promises.

## Invalid request and credential behavior

Path-aware validation returns bounded structured errors. Error construction stops after 100 path errors and reports that additional failures were omitted; it never echoes a complete attacker-controlled body.

Do not create an automatic permanent application ban from malformed requests: developer bugs and shared infrastructure can produce bursts, and a permanent action needs QAD-190 authority/audit. Instead:

- ordinary route/global/IP buckets throttle invalid requests;
- consecutive malformed/oversized outgoing HTTP responses count as delivery-health failures and can open the existing endpoint circuit;
- repeated authorization/replay/invariant failures emit security counters and may trigger the targeted-suspension runbook;
- invalid bot credentials are charged to a normalized IP/credential-preview bucket without logging the token;
- application-visible errors reveal only its own configuration/state and never another provider/audience/target.

Requests rejected solely because Fluxer is internally unavailable consume the route attempt but do not create a separate application “strike.”

## Autocomplete-specific safety

Autocomplete payloads contain only the current option path and bounded already-entered values permitted by the command schema. Native QAD-227 entity search remains server-side; only an explicitly enabled application callback receives the permitted ordered current collection. Sensitive fields are omitted. Applications return at most 25 bounded label/value suggestions in 64 KiB; Fluxer validates typed resource identity and current access for every item, strips no data silently, and rejects the whole malformed response. Results bind interaction/query identity and a stale result never populates a newer input.

Autocomplete cannot invoke native actions, create messages/follow-ups, open modals, or mint delegated capabilities. It receives the same server-derived installation/invoker context but no broader data merely because it is frequent.

## Publication protection

Publication first validates bounds/keys/localizations/categories/authority against an immutable candidate, then performs the one head CAS. It cannot partly replace the live registry. New command identities retain the 200/day/application quota; deleting/dormant cycling does not refund or evade it. Command category and declarative-setting registries each count their active/dormant permanent keys toward their separate 100-key application budgets, so definition removal cannot create unbounded tombstones. A QAD-232 canonical no-op still consumes its route token and performs full validation; hash match is followed by exact bounded canonical comparison, and no-op creates no revision/event/audit amplification.

QAD-233 dashboard reads page at 50 and use existing application read/mutation buckets. Validation/export/diff work remains inside the manifest body/count/error caps and cannot request another user's preference/community-policy detail. The dashboard never bypasses suspension/ownership checks, creates a second retry queue, or treats cached health/registry data as authority.

QAD-234 recommendation mutation updates one bounded community config row and emits one ordering invalidation; it performs no application callback, invocation, permission change, or per-user preference/usage read. QAD-235 source summaries require Integrations ACL before querying bounded source-owned role/channel reference indexes; unauthorized callers receive no count/cardinality side channel, and navigation cannot batch-export policy outside the existing paginated editor.

Candidate/draft bytes count against one active draft and the fixed manifest cap. Unreferenced candidate cleanup follows QAD-194 and cannot be used as general blob storage.

## Outbound/application health protection

SSRF, DNS pinning, queue, retry, response-size, circuit, and metadata rules remain QAD-184. Endpoint failures suppress only the unhealthy application's HTTP-backed interactive surface. No payload enters a replayable DLQ, and one application cannot borrow another application's queue/concurrency budget.

Gateway delivery uses the accepted installation budget and existing 4096-byte inbound Identify frame, connection/session/IP rate limits. Outbound interaction payloads are bounded by their component/command envelope limits and are never accepted back as a Gateway command; application responses use authenticated REST callbacks.

## Tests and observability

Test exact boundary/over-bound behavior, including 49/50/51 collection elements, 349/350/351 relationship entries, 24/25/26 active categories, 99/100/101 reserved category keys, year 0000/0001/9999/10000, safe-integer duration boundaries, invalid leap/calendar values, precision/step, min/max, strict past/future clock races, fixed/contextual/missing/unknown zones, daylight-saving gaps/overlaps, tzdata resolution mismatch, duplicate typed identity/relationship/category key, missing/self/cross-branch/category references, condition cycles and unsatisfiable graphs, one-invalid-target atomic rejection, multiple conditional failures/error truncation, category toggle/publication CAS storms, canonical equal/near-match/hash-collision simulation, explicit stale and convergent/divergent no-op races, dashboard pagination/export/ownership loss, recommendation precedence/unavailable targets, contextual-link ACL/count/deletion races, new-member inherited deny, manipulated-client submission, compressed/chunked length bypass, slow streaming, nested component/command complexity, autocomplete supersession, pending-click deduplication, per-application queue isolation, circuit behavior, invalid token redaction, and rate-limit header compatibility. QAD-192 metrics distinguish throttling, structural rejection, saturation, health suppression, and authorization denial without high-cardinality labels; QAD-227 through QAD-235 metrics may record bounded counts/error classes but never selected IDs, temporal values/zones, modal fields, candidate definitions, policy membership, or category/provider labels as unbounded dimensions.

## Evidence and classification

- Fluxer currently has a 50/request-second global default, route leaky buckets, Gateway 600/minute connection/user budgets, 4096-byte Gateway frames, IP/session/connection limits, typed validation, and current webhook global exemptions.
- The accepted command/interaction specs already establish most numeric budgets; this adds pre-parse, concurrency, amplification, and error-shaping boundaries rather than inventing a second rate-limit subsystem.
- This preserves existing limiter ownership, extends it with identity-scoped bounded work, and reserves suspension for explicit audited safety decisions.
