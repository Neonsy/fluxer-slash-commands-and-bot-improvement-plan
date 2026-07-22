# Application Handle Contract

Status: accepted contract under QAD-080 through QAD-082, QAD-145, QAD-198, and QAD-203 through QAD-205.

## Public grammar

An application handle is a canonical lowercase ASCII identifier:

```text
^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$
```

- Length is 2 through 32 characters after normalization.
- Input is Unicode-normalized, lowercased, whitespace is converted to `-`, and repeated hyphens are collapsed using the same processing rules as Fluxer's current `VanityURLCodeType`.
- A handle cannot begin or end with `-` and cannot contain `_`, `:`, `/`, whitespace after normalization, non-ASCII letters, or invisible characters.
- The canonical value returned by validation is the only stored and displayed handle. Lookup does not perform another fuzzy or locale-sensitive transformation.
- Reserved-name validation runs after canonicalization.

The initial length and grammar deliberately reuse Fluxer's existing vanity-code primitive rather than inventing a second human-typed identifier convention. The implementation should expose a separately named `ApplicationHandleType` so future handle rules cannot accidentally change community vanity URLs, or vice versa.

## Reserved namespace

Public handle claims reject:

- every canonical handle containing the substring `fluxer`;
- the exact canonical handles `system`, `system-message`, `admin`, `api`, `gateway`, `support`, `safety`, `security`, `staff`, `official`, `moderation`, `auth`, `oauth`, `login`, `billing`, `payments`, `deleted`, `everyone`, `here`, and `native`.

Generic terms such as `bot`, `music`, `tickets`, and `tools` remain available. Only an audited instance-administrator/bootstrap path may assign a reserved handle to a first-party application. Public callers receive the same `APPLICATION_HANDLE_UNAVAILABLE` result for a reserved handle and an already claimed handle so the endpoint does not become a reserved-name oracle.

The reserved set is a reviewed code-defined constant shared by validation and tests. Adding a future reserved term does not silently seize or rename an existing valid claim. A conflict discovered after allocation is handled through the application suspension/safety process rather than reassignment.

## Qualified command parsing

The additive exact form remains:

```text
/<application_handle>:<developer_key>
```

Parsing is structural and unambiguous:

1. The first `:` separates the canonical handle from the immutable developer key.
2. The handle must pass `ApplicationHandleType` exactly.
3. The key must pass the accepted 1–64-character developer-key grammar.
4. The server resolves the handle to an application ID, then resolves `(application_id, developer_key)` to the stable command ID.
5. Availability, installation, targeting, command policy, and invocation authorization are evaluated normally. A qualified spelling bypasses name collision only; it bypasses no policy or permission.

Typed picker selection continues to bind application and command IDs. Neither client nor server dispatches an action based only on a rendered qualified string.

## Storage and uniqueness

Add the canonical `handle` to the authoritative application row and maintain an explicit query table:

### `applications_by_handle`

Primary key `(handle)` with:

- `application_id`
- `claimed_at`
- lifecycle/tombstone fields required by the later approved rename and reuse policy
- `version`, if the selected lifecycle requires conditional replacement rather than permanent ownership

`ApplicationRepository` remains the sole writer of both the application source row and handle lookup. A claim uses `insertIfNotExists`; a conflicting application receives a typed `APPLICATION_HANDLE_UNAVAILABLE` error. The source row and lookup may not be assumed atomic across both supported database backends, so creation/change is a resumable operation with deterministic ownership checks:

- a retry by the same application verifies and completes the same claim;
- a lookup owned by another application is never overwritten;
- an application row and lookup disagreement fails closed and enters reconciliation;
- the reconciler repairs only from an unambiguous authoritative claim and never guesses ownership from display names.

Handle resolution is a direct primary-key query, not a table scan, search-index lookup, or cache-only decision. Caches may accelerate it but must invalidate by application/handle version and cannot authorize stale ownership.

## API and compatibility

- Application responses expose `handle` additively; mutable `name` remains the human-facing display name.
- Application creation accepts an optional requested handle so Discord-compatible/current clients that send only `name` do not fail solely because the new field exists.
- Fluxer's developer UI derives and displays a candidate from the application name and lets the owner edit/confirm it before submission.
- When an API client omits the field, Fluxer atomically claims the normalized application-name candidate. A collision appends a deterministic short application-ID suffix while preserving the 32-character cap; a name that produces no usable base falls back to `app-<short-application-id>`.
- Existing applications receive no bulk handle backfill. An owner may explicitly claim one before command publication. A compatible client that publishes the first command while the application remains handle-less triggers the same deterministic automatic claim rather than receiving a migration-breaking failure.
- An automatically allocated handle is provisional only while the application has never published a command. The owner may replace it during that window; replacement atomically claims the new handle before releasing the never-public provisional claim.
- Advancing the first published command-manifest head freezes the handle before the command becomes discoverable. There is no ordinary post-publication rename or independent handle transfer. Any future application-ownership transfer retains the same application ID and handle.
- Permanent application deletion revokes the application and bot immediately, then durably schedules handle release as an independently reconciled cleanup step with a deadline no later than 24 hours after deletion acceptance. Published and unpublished handles follow the same release rule. The released spelling may be claimed by any new application; that is a fresh claim, not transfer or resurrection of the deleted application ID.
- Release retries must conditionally prove the lookup is still owned by the deleted application. Approaching or missing the deadline is an operator-pageable product-contract breach and remains visible while reconciliation continues. Ambiguous ownership never causes transfer: the deleted application remains revoked and the handle remains quarantined until ownership is proved and release succeeds.
- Qualified text that has not yet been invoked always resolves against the current handle owner and shows that application's identity in the picker. Once selected/submitted, the interaction stores immutable application and command IDs, so later handle release or reuse cannot retarget it. Fluxer accepts that old external documentation may resolve to a future application after reuse rather than reserving human-readable names forever.
- A handle is not the OAuth client ID, bot username, application display name, installation ID, or authorization identity. Internal and API authorization continue to use the immutable application Snowflake.
- The built-in admin OAuth application and Fluxer-native command provider use explicitly reserved internal identities and cannot be claimed through public application creation.

## Recoverable application creation

Handle allocation joins application and bot creation in one recoverable service operation rather than extending the current unprotected sequence:

- the existing owner-cap check remains a server-owned code constant but rises from 25 to 50 non-deleted applications per owner under QAD-207;
- the existing authenticated default-user, CAPTCHA, and `10/hour` create-route controls remain in force; the larger ownership ceiling is not a burst allowance;

Creation conditionally reserves one owner-scoped capacity slot for the deterministic creation operation before allocating durable application resources. Retrying the same operation reuses its slot; concurrent operations cannot both claim slot 50. Suspended, dormant, and otherwise retained activated applications count until permanent deletion completes. A failed creation's reserved slot remains counted while activation/cleanup is ambiguous; reconciliation releases an abandoned operation's slot only after proving it activated no application and owns no live credential, bot, or handle resource.

1. validate and moderate all submitted metadata, establish the deterministic creation operation, and conditionally reserve one owner-capacity slot;
2. allocate the immutable application/bot ID and derive the requested/candidate handle;
3. conditionally reserve the handle for that exact application operation;
4. create/verify the deterministic bot user and application source rows;
5. generate and persist credential hashes and mark the application active only when every required resource is consistent;
6. return plaintext credentials only from a successfully activated request;
7. on failure, revoke any generated credentials and idempotently remove the operation-owned bot/source/handle claim; release the capacity slot only when no live resource remains, otherwise keep an internal failed cleanup record for reconciliation and expose no partially active application.

Retries verify operation ownership and never overwrite another application's handle or bot user. A lost success response does not permit secret recovery; the owner uses the existing explicit credential-rotation path. This fixes the current possibility of an orphaned bot user when creation fails after the user row is written but before the application row completes.

## Required validation

- shared schema tests for normalization, boundaries, invalid delimiters, non-ASCII/confusable input, and reserved-name ordering;
- repository integration tests proving conditional uniqueness on both Cassandra-compatible and Postgres KV executors;
- concurrent same-handle claim tests;
- concurrent owner-cap tests proving only one request can reserve slot 50, same-operation retry is idempotent, and retained/deleting applications continue to count until permanent completion;
- explicit, generated, collision-suffixed, empty-base, existing-app lazy claim, provisional replacement, and first-publication freeze tests;
- source/index interruption and reconciliation tests;
- failure injection after handle claim, bot creation, application persistence, and credential generation proving no partially active application or reusable credential remains;
- parser tests for qualified key boundaries and exact first-colon behavior;
- deletion tests proving immediate authority revocation, durable release deadline scheduling, conditionally owned handle release within 24 hours, cache invalidation, safe reuse by another application, and no retargeting of an already submitted interaction;
- release failure-injection tests proving safe retry, approaching/missed-deadline alert/status, continued revocation, and quarantine rather than ambiguous transfer;
- authorization tests proving a qualified invocation does not bypass install, availability, audience, channel, permission, suspension, or authority gates;
- compatibility tests proving application creation without the additive field retains the documented migration path.

## Current Fluxer evidence and classification

- `packages/schema/src/primitives/ChannelValidators.ts` already canonicalizes vanity identifiers to lowercase, maps whitespace to hyphens, collapses repeated hyphens, enforces the same edge grammar, and limits values to 2–32 characters.
- `fluxer_api/src/api/database/CassandraTableDsl.ts` exposes `insertIfNotExists`, and both the in-memory and Postgres KV query executors implement conditional-insert semantics.
- `ApplicationRepository` owns the `applications` source row and the explicit `applications_by_owner` query row, using versioned updates rather than ad hoc secondary indexes.
- Current application names are mutable 1–100-character display strings and application identity is a Snowflake; neither is a safe typed command address.
- `MAX_APPLICATIONS_PER_USER` currently caps ownership at 25, while `OAuth2ApplicationsRequestService` enforces it before creation and the create route independently requires a default authenticated user, CAPTCHA, and the existing `OAUTH_DEV_CLIENT_CREATE` limit of 10/hour.
- Current creation always creates one deterministic bot user before persisting the application, generates bot/client credentials, and has no surrounding rollback if the later application write fails.
- `UsernameType` already blocks exact `everyone`/`here` names and Fluxer/system-message impersonation patterns, while `GuildVanityService` blocks vanity codes containing `fluxer`; the handle namespace narrows and makes that first-party protection explicit for a stable global address.

This **extends** Fluxer's validation and query-first repository conventions. It **intentionally differs** from the current application model by adding a stable public address distinct from display name and Snowflake and by replacing sequential unprotected creation with recoverable ownership, without replacing either existing identity.
