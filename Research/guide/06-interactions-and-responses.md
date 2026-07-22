# Interactions and responses

After a member submits a command, Fluxer has to create trusted work, deliver it to an application, accept a response, and keep later controls safe.

None of this interaction flow exists in the current Fluxer product.

## What exists today

Fluxer already lets bot tokens authenticate Gateway sessions and call ordinary bot REST endpoints. Ordinary channel messages can contain content, embeds, attachments, stickers, references, and reactions.

Fluxer does not currently have any of the following:

- An application command interaction event
- An interaction callback endpoint
- A verified outgoing interaction endpoint
- Interaction response tokens
- Application-owned message components
- Ephemeral message storage

The current message version is internal change metadata. Its update path does not provide the atomic expected-version check required for concurrent application message updates. That database capability must be implemented before interactive messages depend on it.

The [messages and Gateway](../reference/current-state.md#messages-and-gateway) section shows the code behind these limits.

## The planned path from submission to response

When a member submits a command, Fluxer performs the final server-side checks before contacting the application. These include command schema, current target scope, installation generation, suspension, community policy, channel access, member permission, resource visibility, and negotiated capabilities.

If those checks pass, Fluxer creates one trusted interaction record. Delivery attempts, retries, callbacks, and later controls all refer back to that same record.

The record binds at least:

- The application and command revision
- The community, channel, invoker, and intended audience
- The current installation generation
- The selected delivery transport
- The three-second acknowledgement deadline
- The fifteen-minute response-authority deadline
- The capability and authority revisions used for the request

Fluxer derives these facts. The client and application cannot replace the invoker, application, installation generation, source message, command revision, or permission context.

The application receives a Discord-compatible interaction shape for supported community chat-input commands. Fluxer-specific metadata is additive. Delivery-time permission fields help the application decide what to do, but they never authorize a later Fluxer-native effect.

## One transport for each new interaction

An application selects either Gateway delivery or verified outgoing HTTP delivery. Fluxer never duplicates the same interaction across both transports and never changes transport silently during an interaction.

### Gateway delivery

`INTERACTION_CREATE` is delivered to the authenticated bot session that owns the community shard. It needs no additional Gateway intent. Base Discord-compatible delivery works without a Fluxer capability declaration. Capabilities negotiate only Fluxer extensions.

Gateway resume can replay a dispatch. The interaction ID remains the same, and the response claim prevents a replay from creating a second initial result.

### Outgoing HTTP delivery

The application owner registers and verifies an HTTPS endpoint before it can become active. Activation and key rotation prepare and verify a new version, then switch to it with one atomic update. A failed candidate cannot displace a working endpoint.

For each request, Fluxer:

1. Resolves and validates public network addresses
2. Pins one validated address for the connection
3. Preserves hostname certificate verification
4. Rejects redirects and cleartext downgrade
5. Sends canonical JSON signed with the active application Ed25519 key
6. Applies one absolute three-second deadline across connection, TLS, send, and response work

Production endpoints initially accept only ports 443 and 8443. URL credentials, query strings, fragments, private or reserved addresses, and cloud metadata ranges are rejected. DNS is rechecked for retries and probes.

Only one deadline-safe retry is allowed. It reuses the same interaction ID and body. Connection failure, timeout, `408`, `425`, `429`, and `5xx` may qualify. Redirects, certificate failure, prohibited DNS results, invalid response shape, oversized bodies, and ordinary `4xx` do not.

A bounded circuit breaker stops new delivery when the endpoint becomes persistently unhealthy. Commands and controls that rely on it become visibly unavailable. Fresh work resumes only after controlled health probes succeed. Expired interaction payloads are never placed in a replayable dead-letter queue.

## Acknowledgement is not completion

The application must send an initial response or defer within three seconds. It can then use the interaction response authority for up to fifteen minutes.

These events have different meanings:

| Event | Meaning |
| --- | --- |
| Public or ephemeral message callback | A terminal application result exists once its deterministic response effect is persisted. |
| Message update callback | A terminal result exists only if the expected message version matches and the update is persisted. |
| Defer | The interaction is acknowledged, but application work is not complete. |
| Open modal | The triggering interaction is acknowledged, but the workflow is not complete. |
| Valid modal submit | A new authenticated interaction carries the submitted values. |
| Modal cancel or expiry | No synthetic submit or success event is created. |
| Autocomplete result | A bounded read result is returned. It cannot defer, create messages, open modals, or mint native authority. |

This distinction also controls interactive presentation. A pending checkbox or selection cannot become committed merely because the application acknowledged the click. It commits only after the selected application-result or native-effect path records proven success.

## Response authority and operations

Fluxer preserves the compatible initial callback route and webhook-shaped original and follow-up routes. The response credential is opaque, secret, scoped to the application and interaction, bound to the audience and installation generation, and stored only as a hash.

The first valid initial callback wins one atomic claim. An exact retry after canonical parsing returns the existing result. A different second callback conflicts.

Important response rules are:

- Visibility is chosen as public or ephemeral on the initial response or defer and cannot later change
- At most five follow-up messages may be created for one interaction
- Public and ephemeral follow-ups share that limit
- Response reads and mutations can address only messages owned by that interaction and application
- Public message changes require the expected monotonic message version
- Response-authority expiry blocks application mutation but does not delete a response that has its own longer retention
- Initial and follow-up creation use deterministic identities and optional request idempotency keys where retry safety can be guaranteed

A follow-up without an idempotency key creates one message for each accepted request. Fluxer does not claim retry deduplication when the caller has supplied no stable request identity.

## Public responses and message ownership

A public response becomes an ordinary channel message with application attribution and interaction ownership. It participates in normal channel access and message retention.

Bot-managed public messages add planned fields for application ownership, source interaction, component schema, fallback text, component expiry, and a concurrency-safe public version. The internal installation generation remains server-only.

An application cannot claim another message. Update and delete operations verify the owning application, exact interaction or managed-message relationship, current installation generation, and expected message version. A version conflict is reported instead of merged or retried automatically.

## Components and modals

The compatible component model is the migration baseline. Applications may also negotiate richer containers, text blocks, media presentation, radio groups, checkboxes, and accessible form controls.

A message uses one immutable representation:

- Legacy content and embeds with compatible action rows
- Structured components with required static fallback text

One message cannot switch between these forms. Unsupported clients render the safe attributed fallback and inert controls.

Every active control is located through exact application ownership, installation generation, message ID, expected message version, component path or numeric ID, and application `custom_id`. A copied `custom_id` or stale message version cannot retarget a newer control.

Component audience rules can only narrow access already granted by the source message. Fluxer reevaluates current membership, roles, permissions, source access, invoker identity, and message author before creating an interaction or pending state. Community management status does not bypass a component audience.

Controls may be reusable, once per user, or once globally. One-use controls reserve an attempt before delivery, but they become consumed only after proven success. Competing clicks see an in-progress result until the selected outcome is known.

A timeout or rejection may reopen a reservation only after durable records prove that no effect happened. Partial or ambiguous effects stay unavailable while reconciliation determines whether an effect occurred.

Public aggregate message output and private per-person selection state are separate. Concurrent user selections can commit independently. Any public summary update still needs an expected message version and can conflict without losing the already committed per-person state.

## Ephemeral messages

An ephemeral message is not a hidden channel message. Discord-compatible response APIs call it an ephemeral response. Fluxer stores it as a separate recipient-scoped resource keyed to the invoking account and delivers it across that account's eligible active sessions.

It does not enter:

- Channel history or last-message state
- Search, mentions, notifications, pins, forwards, or channel counts
- Ordinary message analytics
- Ordinary account export

Another member receives an indistinguishable unknown-resource result. The application cannot choose another recipient or broaden the audience of an ephemeral control.

Initial ephemeral messages are limited to text and controls. Attachments, files, media galleries, thumbnails, file uploads, attachment references, and media-bearing embeds are rejected. Public bot-managed messages keep their separate media contract.

The application may request a lifetime up to 24 hours. Activity and edits never extend the absolute expiry. Dismissal or expiry first makes the resource logically unreadable and its controls inactive, then asynchronous cleanup removes physical copies. A cleanup delay can never restore read access.

Suspension leaves already delivered content safely readable until its normal dismissal or expiry. It adds platform status and removes application mutation and control authority. Reinstatement never revives those old controls.

Reporting copies only the exact displayed version and necessary attribution into separately governed safety evidence. The report then follows the report-evidence lifecycle described in [authority, safety, and data](08-authority-safety-and-data.md). Dismissing the original response does not delete a submitted report.

## How failures must behave

| Failure | Required result |
| --- | --- |
| Submission becomes stale before creation | Stop before application delivery and return a correction that reveals no private details. |
| HTTP delivery fails transiently | Retry at most once with the same interaction and only inside the deadline. |
| Delivery misses the deadline | Record a terminal delivery failure and never replay the payload. |
| Initial callback is repeated exactly | Return the existing response result. |
| Initial callback changes on retry | Return a conflict and keep the first accepted result. |
| Two public updates happen at the same time | Reject the update based on the older version. |
| A component click is copied or stale | Deny before delivery and do not create pending state. |
| A modal is cancelled or expires | Restore presentation only after proven no effect and send no synthetic success. |
| Uninstall or generation change occurs | Revoke response and control authority immediately. Old messages remain inert. |
| The same app is reinstalled | Create fresh authority. Old responses, controls, and claims remain terminal. |

## What must be proven before release

Validation must cover:

- Raw compatible fixtures and a maintained `discord.js` bot
- Gateway and HTTP delivery, endpoint verification, key rotation, SSRF, and redirect defenses
- Three-second and fifteen-minute boundaries, retry, idempotency, wrong-application use, and wrong-audience use
- Public message version races, component double-click races, concurrent updates, modal submission, and cancellation
- Recipient isolation, dismissal, expiry, reporting, export exclusion, suspension, uninstall, reinstall, and recovery

Cross-language fixtures must show that TypeScript schema ownership, Rust message storage, Erlang Gateway transport, and the responsive web client preserve the same bounded component meaning. Accessibility checks must cover keyboard order, focus restoration, screen-reader names, disabled reasons, static fallback, narrow viewports, and unsupported clients.

See [interaction and message contracts](../reference/interaction-and-message-contracts.md) for the detailed interaction, response, component, and ephemeral message rules.

## Continue reading

- Previous: [Commands and discovery](05-commands-and-discovery.md)
- [Research index](../README.md)
- Next: [Community management](07-community-management.md)
