# Interaction Response Operations and Errors

Status: repository-derived compatibility design under QAD-050 through QAD-068, QAD-147, QAD-182, and QAD-230.

## Initial callbacks

The initial response endpoint is the Discord-compatible:

```text
POST /interactions/{interaction_id}/{interaction_token}/callback
```

It accepts exactly one callback inside the three-second acknowledgement deadline. The initial callback itself is keyed by interaction ID and is idempotent only when a retry is byte-equivalent after canonical parsing; a different second callback is a conflict.

Initial callback types:

| Type | Callback | Valid triggers |
|---:|---|---|
| 1 | `PONG` | `PING` only |
| 4 | `CHANNEL_MESSAGE_WITH_SOURCE` | command, component, modal submit |
| 5 | `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE` | command, component, modal submit |
| 6 | `DEFERRED_UPDATE_MESSAGE` | component, or modal submit retaining a source message |
| 7 | `UPDATE_MESSAGE` | component, or modal submit retaining a source message |
| 8 | `APPLICATION_COMMAND_AUTOCOMPLETE_RESULT` | autocomplete only |
| 9 | `MODAL` | command or component; never modal submit/ping/autocomplete |

The first stack does not implement premium-required, activities, user commands, or message commands. Unknown callback types are rejected rather than ignored.

Type 4/5 chooses `PUBLIC` or `EPHEMERAL` at creation/defer and cannot later change it. Type 7 requires `expected_message_version`; a successful public update creates the next version, while stale state returns the current version without applying a write. Autocomplete is never deferred and returns at most 25 choices/64 KiB under QAD-172.

For outgoing HTTP delivery, the application may return the callback in the signed request's immediate HTTP response or use the callback endpoint. Whichever valid response wins the atomic initial-response claim becomes authoritative; the other observes the recorded result.

Protocol acknowledgement and component-input success are distinct. For an application-owned component outcome, a persisted type-4/type-7 terminal callback is an accepted terminal result; type 5/6 only defers, and type 9 only opens a pending modal workflow. Completing a defer can later supply the terminal application result. If the interaction outcome has already been claimed by a structured native action, no callback type commits or rolls back component state; the native-effect ledger owns that decision. A structured-action claim made inside the initial deadline satisfies the component's initial handling requirement even when no application callback wins, and Fluxer renders the server-owned effect outcome rather than a false retryable timeout.

### Command/component-to-modal workflow

A type-9 response to a command remains the compatible way for an application to open an intentional form. The original command interaction has been delivered and acknowledged by that callback, but the application workflow is not represented as completed. Only a valid later type-5 `MODAL_SUBMIT` interaction carries submitted fields.

For a component source, type 9 likewise acknowledges delivery without committing its pending value or consuming its one-use claim. The modal instance carries the source component-outcome identity. A valid submit continues that same bounded outcome; cancel or expiry proves no application/native success and permits rollback only under the component no-effect rules.

Closing, cancelling, or allowing the modal to expire creates no synthetic modal-submit/cancellation interaction and no application success response. Fluxer may record only bounded aggregate platform outcome/latency classes without field values or high-cardinality application/command labels. Recoverable validation state exists only within the bounded live modal; terminal cancel/expiry revokes form upload authority and clears client-held values under the component lifecycle.

## Token-scoped message operations

Preserve the compatible webhook-shaped routes:

```text
GET    /webhooks/{application_id}/{interaction_token}/messages/@original
PATCH  /webhooks/{application_id}/{interaction_token}/messages/@original
DELETE /webhooks/{application_id}/{interaction_token}/messages/@original
POST   /webhooks/{application_id}/{interaction_token}
GET    /webhooks/{application_id}/{interaction_token}/messages/{message_id}
PATCH  /webhooks/{application_id}/{interaction_token}/messages/{message_id}
DELETE /webhooks/{application_id}/{interaction_token}/messages/{message_id}
```

The create route permits at most five total follow-ups under QAD-147. Public and ephemeral follow-ups share the cap. The server derives the sole recipient of every ephemeral response from the invoker. A follow-up cannot become another user's private message.

Original/follow-up reads, edits, and deletes are limited to messages owned by that interaction/application. Edits preserve visibility, representation, audience, original creation time, and expiry. Public bot-managed message edits and source-message updates require the expected monotonic message version. Ephemeral edits additionally fail after account-wide dismissal or retention expiry.

## Request idempotency

- Initial callback: interaction ID is the uniqueness key; exact retries return the existing callback resource/status.
- Component outcome and per-user control commit: interaction ID is the uniqueness key; redelivery cannot select another commit owner or commit twice.
- Follow-up creation: Fluxer supports an optional `X-Idempotency-Key` of 1-64 safe ASCII characters, scoped to application and interaction. Same key plus same canonical request returns the existing message; different content conflicts. Compatibility clients that omit it create one message per accepted request and are not falsely promised retry deduplication.
- Edit/delete: an optional request key deduplicates transport retries. Repeating a completed delete is a successful no-op only to the same still-authorized interaction owner; it does not reveal whether an unrelated message exists.
- Public message mutation: idempotency never bypasses `expected_message_version`; reuse against different expected version/content conflicts.

Persist the request fingerprint and result before acknowledging success. Message creation uses the preallocated response Message Snowflake as its deterministic effect identity.

## Deferred and terminal states

An interaction state is one of:

```text
PENDING -> ACKNOWLEDGED | DEFERRED | TIMED_OUT | REVOKED
DEFERRED -> COMPLETED | FAILED | RESPONSE_AUTHORITY_EXPIRED | REVOKED
ACKNOWLEDGED -> RESPONSE_AUTHORITY_EXPIRED | REVOKED
```

Response messages independently become `ACTIVE`, `DISMISSED`, `EXPIRED`, or `DELETED`. Dismissed/expired/deleted messages never reactivate. Completing a defer replaces the loading state but does not change the initially chosen visibility. Fifteen-minute response-authority expiry blocks application mutations; it does not itself delete a retained ephemeral or public message.

These response-delivery states do not by themselves define a component commit. Component inputs remain per-user pending through acknowledgement, defer, or modal opening. A terminal accepted application result commits only when the application-result path owns the outcome; a successful deterministic native effect commits only when the native-effect path owns it. Rejection, timeout, modal cancel/expiry, inactive installation, or stale version restores the previous committed state only after proven no-effect. Partial or ambiguous native outcomes remain fail-closed in reconciliation and surface truthful invoker-only status where delivery remains possible.

## Error matrix

Errors use Fluxer's existing `{code, message, ...typed_data}` envelope:

| HTTP | Code | Meaning/data |
|---:|---|---|
| 400 | `INTERACTION_CALLBACK_TYPE_INVALID` | callback not valid for trigger |
| 400 | `INTERACTION_RESPONSE_INVALID` | path-level validation errors |
| 401 | `INTERACTION_TOKEN_INVALID` | invalid token; no existence detail |
| 403 | `INTERACTION_AUDIENCE_MISMATCH` | authenticated application does not own authority |
| 403 | `INSTALLATION_INACTIVE` | current community/application relationship cannot act |
| 404 | `INTERACTION_UNKNOWN` | no visible interaction for authorized audience |
| 404 | `INTERACTION_RESPONSE_UNKNOWN` | no owned response at that selector |
| 409 | `INTERACTION_ALREADY_ACKNOWLEDGED` | conflicting second initial callback; existing callback type may be returned |
| 409 | `IDEMPOTENCY_KEY_REUSED` | same key, different canonical operation |
| 409 | `MESSAGE_VERSION_CONFLICT` | expected/current version and safe refetch URL |
| 409 | `RESPONSE_VISIBILITY_IMMUTABLE` | attempted public/ephemeral conversion |
| 409 | `MESSAGE_REPRESENTATION_IMMUTABLE` | attempted legacy/structured conversion |
| 410 | `INTERACTION_ACK_DEADLINE_EXPIRED` | no initial response possible |
| 410 | `INTERACTION_RESPONSE_AUTHORITY_EXPIRED` | 15-minute mutation authority ended |
| 410 | `EPHEMERAL_RESPONSE_DISMISSED` | terminal user dismissal |
| 410 | `RESPONSE_EXPIRED` | message retention ended |
| 410 | `COMPONENT_EXPIRED` | source control no longer active |
| 429 | `INTERACTION_FOLLOWUP_LIMIT_REACHED` | five follow-ups already created |

Repeated requests receive the same terminal classification where doing so does not leak another audience's resource. Rate-limit errors retain the existing Fluxer retry-header contract.

## Evidence and compatibility

- Fluxer already uses structured errors and path validation, message Snowflakes, webhook-shaped message operations, and code-defined read/mutation budgets.
- Message `nonce` demonstrates an existing deduplication concept, but response creation needs an explicit interaction-scoped key and durable result.
- The route and callback baseline follows Discord's current [interaction response operations](https://docs.discord.com/developers/interactions/receiving-and-responding).
- Fluxer deliberately strengthens the baseline with truthful optional idempotency, version conflicts, terminal ephemeral dismissal, bounded follow-ups, and installation-state enforcement.
