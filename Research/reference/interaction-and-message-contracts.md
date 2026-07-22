# Interaction and Message Contracts

Fluxer does not yet support application interactions, responses, components, or modals. The sections below cover transport, authority, concurrency, and capabilities.

The [orientation](../guide/01-orientation.md) provides the product context. The [glossary](glossary.md) defines the recurring terms used in this contract.

## One trusted record for each interaction

Fluxer creates one tagged interaction object for endpoint verification, commands, components, autocomplete, and modal submission. The server derives application, community, channel, invoker, installation generation, source message, command revisions, permission context, deadlines, and transport.

Common fields include:

```text
id
application_id
type
data
guild_id
channel_id
channel
member
token
version
message
app_permissions
locale
guild_locale
context
attachment_size_limit
permission_snapshot
fluxer
```

The initial implementation requires community context and a community-installed application. Fields for future direct-message or user-installed contexts remain reserved but are not advertised or routed.

The additive `fluxer` object contains:

```text
trace_id
response_deadline
ack_deadline
delivery_transport: GATEWAY | HTTP
delivery_attempt: 1 | 2
invoked_form: DEFAULT | COMMUNITY_ALIAS | QUALIFIED
capabilities
```

An HTTP redelivery keeps the same interaction ID and body. Only attempt metadata and signature timestamp change.

### Interaction types

| Type | Name | Initial use |
| ---: | --- | --- |
| 1 | `PING` | HTTP endpoint verification and health |
| 2 | `APPLICATION_COMMAND` | Chat-input command |
| 3 | `MESSAGE_COMPONENT` | Message or rich-container control |
| 4 | `APPLICATION_COMMAND_AUTOCOMPLETE` | Focused command option |
| 5 | `MODAL_SUBMIT` | Submitted application modal |

## Command, autocomplete, component, and modal data

Command data retains compatible `id`, `name`, `type`, `resolved`, and recursive `options`. Fluxer adds immutable key, command revision, schema version, authority revision and hash, invoked name, and invoked form.

Each option carries compatible name and type plus its immutable key and exactly one of scalar `value`, collection `values`, or nested options. Collection and temporal shapes follow [Command Contracts](command-contracts.md).

Before type-2 interaction creation, Fluxer atomically checks:

- Current schema and all value bounds
- Duplicates and typed identities
- Collection resource visibility and selectability
- Complete conditional relationship graph
- Temporal syntax, resolution, bounds, direction, and current server time
- Installation, command, targeting, category, community, and capability availability
- Current invocation policy and permissions

Any failure prevents application delivery. Resource errors do not confirm that a hidden resource exists.

Autocomplete marks exactly one eligible leaf as focused. Application-backed autocomplete contains only the current option path and bounded permitted entered values. Native resource search stays server-side. Results are capped at 25 items and 64 KiB and are access-filtered before display.

Component data carries component type, application-authored `custom_id`, optional 32-bit message-local component ID, values, safe resolved resources, and the expected source message version. Lookup binds exact application, message, version, component path or ID, and selector. Fluxer rejects stale or ambiguous lookup.

Modal submit preserves compatible `custom_id` and nested response components. Fluxer delivers only response-value fields. Labels, presentation-only fields, hidden metadata, and secrets are not trusted input. The server-owned modal instance schema and version must match.

## Trusted fields and data limits

- Application, community, invoker, installation generation, revisions, source message, and permissions are never application inputs.
- Delivery permission snapshots are convenience data only.
- Native actions reread current permissions, hierarchy, targets, installation, suspension, and authority.
- An application receives only declared fields and resources that the invoker and application may resolve.
- Response tokens, raw HTTP bodies, option and form values, and component selectors stay out of ordinary logs and guild audit.
- One shared schema builds both Gateway and HTTP payloads. Transports do not own different semantic models.

## Choosing Gateway or HTTP delivery

Each application selects exactly one interaction delivery mode:

```text
GATEWAY
HTTP
```

Fluxer never sends one interaction through both modes and never changes mode because one transport is unhealthy.

### Gateway

`INTERACTION_CREATE` is a normal opcode-0 dispatch to the authenticated application bot session. It requires no Gateway intent and cannot be suppressed through the current ignored-event mechanism while Gateway interactions are selected.

Community shard selection uses the existing shard formula. Resume replay keeps the same interaction identity. The response claim prevents a replay from creating a second callback or effect.

`IDENTIFY.d.capabilities` is an optional bounded array. Omission means compatible baseline only. `READY.d.capabilities` returns the accepted intersection. Well-formed unknown or dependency-blocked requests may appear in `READY.d.unsupported_capabilities` for diagnosis.

### HTTP endpoint configuration

Endpoint URL, capability request, verification, health, and generation live in an application-owned configuration record. The application row points to at most one active and one pending configuration.

Verification states are:

```text
PENDING_VERIFICATION
VERIFIED
FAILED
```

Health states are:

```text
UNKNOWN
HEALTHY
UNHEALTHY
DISABLED_BY_INSTANCE
```

Only the application row's active pointer selects delivery. Verification and health cannot select another record. Delivery binds the exact active configuration ID and generation so later replacement cannot retarget queued work.

Owner mutations accept endpoint URL, requested capabilities, and expected endpoint version. They create a new pending configuration. They do not overwrite the active record or switch transport.

Verification:

1. Snapshots the exact pending configuration, application version, and key generation
2. Sends a signed type-1 interaction with requested and accepted capability arrays
3. Requires a valid type-1 response inside three seconds
4. Records immutable proof on that candidate
5. Rereads the candidate and compare-and-sets the application active pointer only when pending identity, generation, endpoint version, key generation, URL, and capability digest still match

The application-row compare-and-set is the sole activation commit. A crash after candidate verification is recoverable by retrying that commit. A displaced or stale candidate never activates itself.

Transport switching uses a version-checked owner operation. HTTP requires an active verified endpoint. Gateway selection does not require the bot to be connected, but commands stay unavailable until an eligible session exists. Clearing the active HTTP endpoint requires switching to Gateway or disabling every interactive feature in the same guarded operation.

### Signing key rotation

Fluxer owns application-scoped Ed25519 key generations. Private material is encrypted under instance key management and never returned in models, API responses, logs, audits, or unprotected backups.

Rotation creates a pending key, exposes its public key, verifies the endpoint using that key, and conditionally activates it. Verification may accept active and pending public keys. Ordinary interaction delivery uses only the active key. Failed or abandoned rotation removes pending private material and leaves the active key unchanged.

Only the current human application owner may edit endpoint, capability request, transport, or verification keys. Bot tokens retain compatible command registration authority but cannot authenticate the human owner interface.

## HTTP delivery security and deadlines

A dedicated interaction-delivery domain owns endpoint verification, DNS-safe connection, Ed25519 signing, deadline-bounded send and retry, health, and terminal status. The generic worker queue and dead-letter system are not used for initial delivery.

Default internal bounds are:

| Resource | Bound |
| --- | ---: |
| In-flight deliveries per application endpoint | 50 |
| Queued but not started per application | 100 |
| In-flight per API process | 1000 |
| Minimum deadline remaining to start queued work | 500 ms |
| Canonical request body | 512 KiB |
| Response body | 1 MiB |
| Transient retry | One, only with at least 500 ms remaining |

The public timing contract is the three-second acknowledgement deadline. Internal bounds may be tuned from evidence.

### SSRF and destination controls

Production endpoints require HTTPS and port 443 or 8443. They reject URL credentials, query, fragment, localhost, private or special literals, and redirects.

Every verification, delivery attempt, retry, and health probe:

1. Resolves A and AAAA within 500 ms
2. Accepts at most eight answers
3. Normalizes and validates every answer as public
4. Rejects the whole request if any answer is prohibited
5. Pins one validated address for the connection
6. Retains the original hostname for TLS SNI and certificate verification
7. Prevents a second unvalidated resolution

Positive public DNS results are cached for no longer than the lower of DNS TTL and 60 seconds. A non-public answer is never cached as usable. Blocked ranges include loopback, private, shared, link-local, documentation, benchmark, multicast, reserved, translation, and cloud metadata ranges for IPv4 and IPv6.

A self-hosted development override is instance-owned, disabled by default, and visibly unsafe. Applications cannot request it.

### HTTP request and retry

Fluxer posts exact canonical JSON with no cookies or credentials. It signs `timestamp || raw_body` and sends compatible signature headers plus non-secret key, attempt, and trace identifiers.

The client does not follow redirects, downgrade to cleartext, reuse cookies, forward proxy credentials, or include internal headers. All connect, TLS, write, and response waits consume the same remaining absolute deadline.

Attempt two is allowed only for:

- Connection reset or refusal
- Timeout before a valid response
- HTTP 408, 425, 429, or 5xx

DNS prohibition, certificate failure, redirect, invalid response, body overflow, and ordinary 4xx are not retried.

### Circuit breaker

Endpoint health uses a rolling 60-second window. The circuit opens after:

- Five consecutive failed interactions
- At least 20 samples with 50 percent or more failures

When open, the endpoint is `UNHEALTHY` and HTTP-backed commands and controls become unavailable before invocation. Signed probes run after 30 seconds, 2 minutes, 10 minutes, then every 30 minutes. Two consecutive successful probes close the circuit. Owners may request an immediate probe no more than once per five minutes but cannot force health state.

There is no replayable interaction dead letter. Terminal metadata lasts 24 hours and contains safe state, attempt, failure class, timestamps, configuration and key generations, and trace ID. It contains no token, signature, DNS answer, raw body, option value, response body, or remote error text.

## Sending the first response

The compatible initial endpoint is:

```text
POST /interactions/{interaction_id}/{interaction_token}/callback
```

Exactly one callback may commit inside three seconds. A canonical byte-equivalent retry returns the existing result. A different second callback conflicts.

| Type | Callback | Valid trigger |
| ---: | --- | --- |
| 1 | `PONG` | `PING` |
| 4 | `CHANNEL_MESSAGE_WITH_SOURCE` | Command, component, modal submit |
| 5 | `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE` | Command, component, modal submit |
| 6 | `DEFERRED_UPDATE_MESSAGE` | Component or source-message modal submit |
| 7 | `UPDATE_MESSAGE` | Component or source-message modal submit |
| 8 | `APPLICATION_COMMAND_AUTOCOMPLETE_RESULT` | Autocomplete |
| 9 | `MODAL` | Command or component |

Unknown, premium, activity, user-command, and message-command callback types are rejected.

Type 4 or 5 selects public or ephemeral visibility at creation. Visibility cannot change later. Type 7 requires an expected message version. Autocomplete cannot defer.

For HTTP delivery, the application may return the callback in the immediate signed response or call the endpoint. The first valid atomic response claim wins and the other observes the stored result.

A defer or modal opening acknowledges transport but is not terminal application success. Component commit occurs only after a persisted terminal application result or a successful selected native effect.

## Opening and submitting modals

A type-9 response opens a bounded modal workflow. The original interaction is acknowledged, but workflow success remains pending.

A valid submit creates a new authenticated type-5 interaction. A component-originated modal carries the same source outcome identity.

Cancel, dismissal, and expiry:

- Create no synthetic modal-submit interaction
- Create no application success result
- Release a component one-use claim only after the ledgers prove no effect
- Revoke upload authority
- Clear client-held field values
- Restore focus to the source composer or control

Modal instances default to five minutes and may last no longer than fifteen minutes from creation or the source interaction deadline.

## Response routes and token scope

The compatible routes are:

```text
GET    /webhooks/{application_id}/{interaction_token}/messages/@original
PATCH  /webhooks/{application_id}/{interaction_token}/messages/@original
DELETE /webhooks/{application_id}/{interaction_token}/messages/@original
POST   /webhooks/{application_id}/{interaction_token}
GET    /webhooks/{application_id}/{interaction_token}/messages/{message_id}
PATCH  /webhooks/{application_id}/{interaction_token}/messages/{message_id}
DELETE /webhooks/{application_id}/{interaction_token}/messages/{message_id}
```

One interaction creates at most **five follow-ups total**, shared by public and ephemeral messages. Fluxer applies this stricter cap to community-installed interactions as an intentional difference from Discord.

The server derives the only recipient for an ephemeral message. Original and follow-up operations are limited to messages owned by the exact interaction and application.

Edits preserve visibility, representation, audience, creation time, and expiry. Public bot-managed edits and source updates require expected message version. Ephemeral edit fails after account-wide dismissal or retention expiry.

### Idempotency

- Initial callback uses interaction ID.
- Component outcome uses interaction ID.
- Follow-up create accepts optional `X-Idempotency-Key` of 1 to 64 safe ASCII characters scoped to application and interaction.
- Same key and same canonical request returns the existing result.
- Same key and different request returns `IDEMPOTENCY_KEY_REUSED`.
- Without a key, each accepted follow-up request creates one message.
- Edit and delete may use a request key for transport retries.
- Public message idempotency never bypasses expected version.

Fluxer persists request fingerprint and result before acknowledging success. Message creation uses a preallocated response Snowflake as deterministic effect identity.

## Interaction and response states

```text
PENDING -> ACKNOWLEDGED | DEFERRED | TIMED_OUT | REVOKED
DEFERRED -> COMPLETED | FAILED | RESPONSE_AUTHORITY_EXPIRED | REVOKED
ACKNOWLEDGED -> RESPONSE_AUTHORITY_EXPIRED | REVOKED
```

Response messages independently move among:

```text
ACTIVE
DISMISSED
EXPIRED
DELETED
```

Dismissed, expired, and deleted messages never reactivate. Completing a defer replaces loading state without changing visibility. Fifteen-minute authority expiry blocks application mutation but does not delete a retained public or ephemeral message.

## Response errors

| HTTP | Code | Meaning |
| ---: | --- | --- |
| 400 | `INTERACTION_CALLBACK_TYPE_INVALID` | Callback not valid for trigger |
| 400 | `INTERACTION_RESPONSE_INVALID` | Path-level validation failure |
| 401 | `INTERACTION_TOKEN_INVALID` | Invalid token without existence detail |
| 403 | `INTERACTION_AUDIENCE_MISMATCH` | Application does not own authority |
| 403 | `INSTALLATION_INACTIVE` | Relationship cannot act |
| 404 | `INTERACTION_UNKNOWN` | No visible interaction |
| 404 | `INTERACTION_RESPONSE_UNKNOWN` | No owned response at selector |
| 409 | `INTERACTION_ALREADY_ACKNOWLEDGED` | Conflicting second callback |
| 409 | `IDEMPOTENCY_KEY_REUSED` | Same key with different operation |
| 409 | `MESSAGE_VERSION_CONFLICT` | Expected and current version differ |
| 409 | `RESPONSE_VISIBILITY_IMMUTABLE` | Public or ephemeral conversion attempted |
| 409 | `MESSAGE_REPRESENTATION_IMMUTABLE` | Legacy or structured conversion attempted |
| 410 | `INTERACTION_ACK_DEADLINE_EXPIRED` | Initial response deadline passed |
| 410 | `INTERACTION_RESPONSE_AUTHORITY_EXPIRED` | Mutation authority ended |
| 410 | `EPHEMERAL_RESPONSE_DISMISSED` | Recipient dismissal is terminal |
| 410 | `RESPONSE_EXPIRED` | Retention ended |
| 410 | `COMPONENT_EXPIRED` | Source control expired |
| 429 | `INTERACTION_FOLLOWUP_LIMIT_REACHED` | Five follow-ups already exist |

An application response that uses a component or action outside the negotiated capability set fails with `INTERACTION_CAPABILITY_REQUIRED` and the required stable capability ID. A dependency failure may name the missing dependency but never reveals a hidden rollout state.

Repeated requests receive the same terminal class where that does not leak another audience's resource.

## Legacy and structured messages

Fluxer adds compatible `IS_COMPONENTS_V2` at bit `1 << 15`.

### Legacy

Legacy messages use existing content, embeds, attachments, stickers or polls where supported, plus at most five top-level action rows containing buttons or selects.

### Structured

Structured messages set `IS_COMPONENTS_V2` and use structured top-level components. They reject ordinary `content`, `embeds`, stickers, and polls. Uploaded files appear only through media or file components. Every structured message includes `fallback_text` for unsupported clients.

Representation is immutable. Edits replace a component tree only within the existing representation.

## Where components may appear

| Type | Component | Placement |
| ---: | --- | --- |
| 1 | Action Row | Message top level or container child |
| 2 | Button | Action row or section accessory |
| 3 | String Select | Message action row or modal label |
| 4 | Text Input | Modal label |
| 5 | User Select | Message action row or modal label |
| 6 | Role Select | Message action row or modal label |
| 7 | Mentionable Select | Message action row or modal label |
| 8 | Channel Select | Message action row or modal label |
| 9 | Section | Structured top level or container child |
| 10 | Text Display | Structured top level, section, container, or modal top level |
| 11 | Thumbnail | Section accessory |
| 12 | Media Gallery | Structured top level or container child |
| 13 | File | Structured top level or container child |
| 14 | Separator | Structured top level or container child |
| 17 | Container | Structured top level only |
| 18 | Label | Modal top level |
| 19 | File Upload | Modal label |
| 21 | Radio Group | Modal label or negotiated rich action row |
| 22 | Checkbox Group | Modal label or negotiated rich action row |
| 23 | Checkbox | Modal label or negotiated rich action row |

Inline types 21 through 23 require `fluxer.forms.choice-controls.v1`. Unnegotiated use remains modal-only. Unknown types are rejected on create or edit. A client missing a known capability renders attributed fallback and inert controls.

### Layout rules

- Action Row contains 1 to 5 buttons, exactly one select, exactly one radio group, exactly one checkbox group, or 1 to 5 individual checkboxes.
- Section contains 1 to 3 Text Displays and exactly one Button or Thumbnail accessory.
- Container contains 1 to 10 permitted children and cannot nest another Container.
- Label contains exactly one input, select, file upload, radio group, checkbox group, or checkbox.
- Modal contains 1 to 5 top-level Label or Text Display components and at least one interactive Label.
- Modal title is 1 to 45 characters.
- Modal `custom_id` is 1 to 100 characters.
- Complete tree depth is at most four nodes including root.
- Optional component IDs are unsigned 32-bit integers unique in the message or modal. Zero means absent and is filled deterministically.
- Every interactive `custom_id` is 1 to 100 UTF-8 characters and unique in that message or modal version.

### Tree and field limits

| Limit | Value |
| --- | ---: |
| Structured top-level components | 10 |
| Components in a structured tree | 40 |
| Legacy action rows | 5 |
| Buttons or individual checkboxes per row | 5 |
| Canonical component JSON | 256 KiB |
| Structured fallback text | 1 to 2000 characters |
| Text Display | 1 to 4000 characters |
| Aggregate component text | 6000 characters |
| Attachments or files | Existing maximum 10 |
| Media Gallery items | 1 to 10 |
| Media alt description | 1 to 1024 when present |

Exact interactive limits are:

- Button styles are primary, secondary, success, danger, or link. Label length is 0 to 80. Link buttons require one safe URL and prohibit `custom_id`. Interaction buttons require `custom_id` and prohibit URL. Premium buttons are out of scope.
- String Select has 1 to 25 options. Label and value are 1 to 100. Description is 0 to 100. Placeholder is 0 to 150. Selection satisfies `0 <= min_values <= max_values <= option count` and default maximum is 1.
- User, Role, Mentionable, and Channel Select have placeholder length 0 to 150 and satisfy `0 <= min_values <= max_values <= 25`. Default maximum is 1 and there are at most 25 defaults.
- Text Input minimum is 0 to 4000, maximum is 1 to 4000, and minimum does not exceed maximum. Value length is at most 4000 and placeholder at most 100.
- File Upload satisfies `0 <= min_values <= max_values <= 10` and uses current upload size and scanning rules.
- Radio Group has 2 to 10 options, zero or one default, and required defaults to true.
- Checkbox Group has 1 to 10 options and selection satisfies `0 <= min_values <= max_values <= option count`. Required defaults to true and minimum defaults to 1.
- Checkbox has boolean default false. Required agreement uses a one-option required Checkbox Group.
- Radio and checkbox option label and value are 1 to 100 and description 0 to 100.
- Label text is 1 to 45 and description 0 to 100.
- Separator spacing is small value 1 or large value 2.
- Container accent color is from `0x000000` through `0xFFFFFF`.

Public media uses an uploaded attachment reference or a public HTTPS URL accepted through existing safety and proxy rules. Private URLs, authenticated URLs, and URL credentials are prohibited.

### Accessibility

- Every control has a computed accessible name.
- Icon-only buttons and unlabeled selects require `accessibility_label` of 1 to 100 characters.
- Non-decorative media requires alt description.
- Decorative media explicitly marks itself decorative and cannot carry misleading alt text.
- Modal labels are programmatically associated with inputs.
- Disabled state and reason are not conveyed by color alone.
- Keyboard order follows schema traversal.
- Focus is preserved or intentionally restored after updates.
- Fallback text states static meaning, application identity, and update requirement without imitating a Fluxer system prompt.

## Who may use a component and when

An interactive component declares:

```text
audience
use_policy: REUSABLE | ONCE_PER_USER | ONCE_GLOBAL
expires_at
```

Audience can only narrow existing message visibility. It supports up to 10 `any_of` and 10 `all_of` predicates drawn from:

```text
INVOKER
MESSAGE_AUTHOR
USERS with 1 to 100 IDs
ROLES with 1 to 100 IDs
NATIVE_PERMISSIONS with a decimal bitfield
```

At most 200 distinct user and role IDs appear across a policy. Audience is reevaluated on every click using current message access, membership, roles, and permissions. Owner or administrator status does not bypass it. Ephemeral controls and security confirmations force invoker-only audience.

Fluxer stores only current committed per-user presentation state. It does not keep selection history and does not index raw `custom_id`. Per-user state may cross a public message version only when application, generation, message, component ID, selector, type, and definition hash remain identical and preservation was explicitly chosen.

### Who owns each component result

Each activation creates an outcome with immutable owner:

```text
UNCLAIMED
APPLICATION_RESULT
NATIVE_EFFECT
```

Outcome status is:

```text
AWAITING_INITIAL
PENDING_COMPLETION
SUCCEEDED
FAILED_NO_EFFECT
TERMINAL_FAILED
RECONCILING
REVOKED
```

A persisted terminal type-4 or type-7 callback, or completed defer, may claim application success after its response effect is durable. A structured native action claims native ownership before execution. Once claimed, the other path cannot commit or roll back the component.

The per-user value commits exactly once only after the selected owner proves success. Rejection, timeout, modal cancellation, stale version, suspension, or inactive installation restores prior presentation only after ledgers prove no effect. Partial or contradictory evidence stays `RECONCILING` and fails closed.

### Preventing duplicate actions

One-use state is:

```text
AVAILABLE
RESERVED
PENDING_COMPLETION
CONSUMED
TERMINAL_FAILED
RECONCILING
```

The first conditional reservation owns the attempt. A concurrent click while pending receives `COMPONENT_CLAIM_IN_PROGRESS`. Only proven success becomes `CONSUMED`, after which later clicks receive `COMPONENT_ALREADY_USED`.

Before defer or modal, reservation is bounded by three seconds. A defer may extend to the 15-minute response deadline. A modal uses its shorter expiry. No claim outlives its component.

A claim returns to `AVAILABLE` only for proven no effect while the exact component remains current and valid. Ambiguous native effects never reopen authority.

Component errors use Fluxer's structured envelope and include:

```text
COMPONENT_SCHEMA_UNSUPPORTED
COMPONENT_PLACEMENT_INVALID
COMPONENT_ID_DUPLICATE
COMPONENT_CUSTOM_ID_DUPLICATE
COMPONENT_AUDIENCE_DENIED
COMPONENT_CLAIM_IN_PROGRESS
COMPONENT_ALREADY_USED
COMPONENT_OUTCOME_OWNER_CONFLICT
COMPONENT_OUTCOME_FAILED
COMPONENT_DEFINITION_CHANGED
COMPONENT_SOURCE_DELETED
COMPONENT_INSTALLATION_GENERATION_STALE
COMPONENT_DELIVERY_UNAVAILABLE
```

Errors do not disclose hidden audience membership or private application state.

### Component expiry and lifecycle

- Public controls default to source-message lifetime without an arbitrary maximum.
- An application may set an earlier absolute expiry.
- Ephemeral controls are clipped to the response's at-most-24-hour lifetime and dismissal.
- Security confirmations are clipped to five minutes.
- Server time is authoritative.
- Expired visible controls remain disabled with a reason.

Copy, quote, forward, snapshot, and cross-post carry static supported content and fallback only. They do not copy interactive ownership, audience, selector, state, or native-operation bindings.

Message or channel deletion revokes lookup immediately. Credential rotation alone does not change installation generation. Temporary transport unavailability disables controls and may later restore them because no authority was issued while unavailable.

Uninstall leaves messages visible and inert. Reinstall does not revive old controls. Suspension permanently invalidates outstanding interactions and the then-current component versions. Lifting suspension requires new or explicitly reconciled versions.

## Ephemeral messages

An ephemeral message, exposed through Discord-compatible response APIs as an ephemeral response, is stored outside ordinary channel messages in a table keyed by its sole server-derived recipient. It has a response Snowflake, application and bot identity, interaction and community context, representation, canonical body, version, creation and expiry, and state.

The authoritative read condition is:

```text
state == ACTIVE and current time < expires_at
```

Database TTL is only a cleanup backstop. Expired or dismissed content never becomes readable because asynchronous deletion lags.

Ephemeral messages:

- Do not update channel history, counts, last message, mentions, notifications, pins, forwards, reads, or search
- Are fetched through the authenticated conversation interface
- Dispatch create, update, and removal only to eligible sessions of that exact account
- Are invisible to another user through an indistinguishable unknown-resource result
- Expire no later than 24 hours
- Keep the original expiry through edits
- Dismiss account-wide and terminally before physical deletion

### Why ephemeral message media is excluded at first

Initial ephemeral messages allow bounded text, embeds without application-controlled media, non-media controls, application icons, and authorized community or Unicode emoji.

They reject:

- Attachment uploads or references
- File, Media Gallery, Thumbnail, and File Upload components
- Embed image, video, or thumbnail fields
- Application-controlled remote media
- Filenames, private object references, or response file URLs

The error is `EPHEMERAL_MEDIA_UNSUPPORTED`. Public responses retain their ordinary media contract. A future ephemeral-file capability requires a separately approved storage and report design.

### Privacy, reporting, and export

Ephemeral content, values, URLs, and embeds never enter ordinary message search, link previews, analytics payloads, logs, traces, or unsubmitted report search.

Safe operational metadata may last at most 24 hours and contains IDs, byte and count totals, transition, failure code, timing, and timestamps only.

Only the active response recipient may report it. The report snapshots the exact displayed version and needed application, interaction, community, time, representation, and content into the shared safety evidence domain. Reporting does not expose the response to community managers. Later dismissal or expiry removes the recipient copy without rewriting the report.

Ordinary account export never includes ephemeral rows, content, component state, per-response IDs, counts, or application identities. Submitted report evidence remains separately governed.

Ephemeral message errors include:

```text
UNKNOWN_EPHEMERAL_RESPONSE
EPHEMERAL_RESPONSE_DISMISSED
EPHEMERAL_RESPONSE_EXPIRED
EPHEMERAL_MEDIA_UNSUPPORTED
EPHEMERAL_REPORT_NOT_ALLOWED
```

## Registering Fluxer-only capabilities

Capabilities are reviewed constants with one schema, API, and Gateway representation. An identifier is 1 to 64 lowercase dotted ASCII characters with bounded hyphens inside segments. Arrays contain at most 32 unique entries. IDs are never renamed, reused, or given incompatible meaning.

Initial capabilities are:

```text
fluxer.commands.multivalue.v1
fluxer.commands.conditions.v1
fluxer.commands.temporal.v1
fluxer.components.rich.v1
fluxer.forms.choice-controls.v1
fluxer.delegated-native-actions.v1
fluxer.declarative-administration.v1
```

Each registry row declares experimental, stable, deprecated, or retired status, introduced API major, replacement, dependencies, transports, and client or application consumers.

Clients bind capabilities through authenticated session bootstrap. Gateway applications bind them at Identify. HTTP applications bind them through pending endpoint verification and activation. An invocation request or application response cannot add a capability by echoing it.

Malformed arrays fail validation. Well-formed unknown IDs are ignored and not accepted. A missing capability produces compatible baseline behavior or an approved inert fallback. Fluxer never sends extension behavior to a consumer that did not advertise support.

A stable public capability remains usable until both applicable conditions are met:

```text
retirement at least 12 months after public notice
retirement at least 12 months after stable replacement and migration docs
```

Security or legal emergency may shorten that window only with public reason, affected contract, effective date, migration guidance where possible, and safest fallback.

## Shared schemas across runtimes

Tagged component and interaction schemas are canonical in shared TypeScript Zod sources. The API validates, assigns component IDs, computes hashes, and writes bounded canonical JSON.

The Rust message service stores and round-trips opaque bounded JSON without becoming another component validator. Gateway forwards schema-owned maps without interpreting action semantics. React consumes generated or inferred types for capability-aware presentation.

One fixture corpus must prove canonical parse, Rust round-trip, Gateway encoding, React rendering, unknown-type fallback, every placement boundary, and maximum-size behavior. Generated files change only through repository generators.

## Required release checks

Implementation must prove:

- All interaction types and callback types over Gateway and HTTP
- Endpoint verification, active and pending separation, transport switch, and key rotation races
- Raw-body Ed25519 verification, DNS rebinding protection, redirect rejection, deadline use, retry classification, overload, breaker probes, and recovery
- Exact three-second and fifteen-minute boundaries under a controlled clock
- Initial, deferred, original, follow-up, edit, delete, idempotency, conflict, replay, and terminal response behavior
- Message representation immutability and expected-version compare-and-set on both database backends
- Every component type, grammar edge, count, byte cap, capability fallback, accessibility rule, and cross-runtime round-trip
- Audience denial before interaction creation, one-use races, immutable outcome owner, per-user commit, proven-no-effect rollback, and ambiguous-effect reconciliation
- Copy, deletion, uninstall, reinstall, credential rotation, suspension, and transport-health lifecycle
- Recipient isolation, account-wide dismissal, expiry, physical deletion lag, report snapshot, media rejection, search exclusion, log redaction, and account-export exclusion
