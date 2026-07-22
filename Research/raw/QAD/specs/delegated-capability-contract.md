# Delegated Native-Action Capability Contract

Status: accepted security design under QAD-037 through QAD-044, QAD-180, QAD-208, and QAD-209. Exact confirmation classes are in `delegated-action-confirmation-policy.md`.

## Boundary and endpoint

Delegated authority exists only inside the structured native-action broker. An application cannot attach an invoker ID to an ordinary bot endpoint.

An application submits a typed native-action request while authenticated as its bot and presents the opaque interaction response credential through a dedicated secret-bearing header. The route resolves the interaction record and derives application, installation, community, invoker, command/component, authority revision, and response deadline. It rejects any caller-supplied identity that conflicts with that record.

The request includes:

```text
operation: registered native-operation enum
parameters: operation-specific tagged schema
request_key: application-generated idempotency key, 1-64 safe ASCII characters
expected_authority_revision
```

The application cannot send a generic REST method/path, arbitrary permission bitfield, actor ID, or audit payload. The selected operation must be inside the command/component's approved native-operation envelope.

## Persisted capability

The broker allocates a Snowflake `capability_id` and stores:

```text
capability_id
interaction_id
application_id
installation_generation
guild_id
channel_id
invoker_user_id
bot_user_id
command_id? / command_revision? / authority_revision / authority_hash
source_message_id? / source_message_version? / component_key_hash?
operation
normalized_parameters
parameters_hash
intent_binding: SUBMITTED | DEFINITION_FIXED | PLATFORM_CONFIRMED
status
request_key
created_at / expires_at / claimed_at? / completed_at?
confirmation_id? / confirmation_expires_at?
result_code? / result_reference_ids?
revoked_at? / revocation_reason?
causation_id / audit_log_id?
```

Only the native-operation implementation can normalize parameters. Persisted parameters are the minimal typed security data needed to render confirmation and execute the endpoint; arbitrary application metadata is rejected. Canonical serialization and SHA-256 produce `parameters_hash`.

Repository query tables support exact lookup by capability ID and idempotent lookup by `(application_id, interaction_id, request_key)`. A community/application/generation-scoped query table supports bounded cleanup/reconciliation, but mass revocation does not depend on scanning it. There is no standalone public installation ID under QAD-019.

## Secret and signing model

There is no self-contained JWT and no application-selectable signing algorithm. The server-side record is authoritative and directly revocable.

- The already approved interaction credential is 32 random bytes encoded as base64url and stored only as a SHA-256 hash.
- If a flow must expose a separate capability bearer, its wire form contains the non-secret capability Snowflake plus a new independent 32-byte base64url secret; only the secret hash is stored and comparison is constant-time.
- The capability is audience-bound in storage to the exact application, community, and internal installation generation and must be presented together with matching bot authentication.
- Capability secrets never appear in URLs, events, audits, operational logs, traces, error data, or application-readable result objects.

This deliberately uses Fluxer's existing opaque-random-token precedent instead of granting portable signed claims whose authorization state could become stale.

## Expiry and confirmation

- An unconfirmed direct action must be requested and claimed inside the interaction's existing 15-minute response-authority window.
- A platform confirmation may remain actionable for at most the already approved five minutes and never beyond the interaction response deadline.
- Confirmation creates no reusable permission grant. It atomically claims the exact pending capability and the platform executes that action; the application does not receive a general post-confirmation user token.
- Expiry is absolute and is never extended by retries, edits, delivery delay, or application activity.
- Capability and consumption records retain terminal/replay state for 24 hours from creation, then expire. The non-secret audit attribution follows the separate 45-day guild-audit policy.

## Single use and replay

Before any native effect, the repository performs an `insertIfNotExists` consumption claim keyed by `capability_id`. Exactly one worker may own execution. This follows Fluxer's existing conditional-claim pattern and does not rely on a process lock.

The deterministic effect identity is derived from capability ID and operation. Native-operation handlers must be idempotent or durably reconcilable under that identity. A retry using the same `(interaction, request_key)` or capability returns the existing status/result; it never creates or executes another action. Reusing a request key with different canonical parameters is a conflict.

If a worker fails after claiming, reconciliation resumes the claimed operation from its durable effect state. It never clears the claim merely because the requester retries. A terminal failed, denied, expired, or revoked capability can never transition back to executable.

## Revocation

An individual capability can be explicitly revoked before claim. All capabilities also carry implicit revocation predicates checked on every claim/resume:

- installation is not `ACTIVE`, is suspended, or its generation changed;
- application or community was deleted or suspended;
- interaction response authority was revoked;
- command/component was disabled, removed, or no longer approved for the operation;
- authority revision/hash no longer matches;
- confirmation was denied/dismissed/expired;
- invoker is no longer a member where membership is required.

Uninstall and suspension therefore revoke authority immediately by changing authoritative installation state; they need not race a scan of capability rows. Lifting suspension or reinstalling never revives an old generation's capability.

## Authoritative execution revalidation

After winning the consumption claim and immediately before each native effect, the broker revalidates:

1. capability status, expiry, audience, interaction, request key, and parameter hash;
2. current installation generation/state and application status;
3. current command/component availability, authority revision, approved execution mode, and operation envelope;
4. current invoker membership, effective permissions, native role hierarchy, and target state for delegated authority;
5. current bot membership, effective permissions, hierarchy, and target state for bot authority;
6. both sets for `REQUIRE_BOTH` mode;
7. confirmation and intent binding required by the operation policy;
8. ordinary endpoint constraints, rate limits, safety controls, and idempotent effect ownership.

Failure produces a stable terminal result and causal audit summary without performing the action. Current state always wins over the delivery-time permission snapshot.

## Evidence and classification

- `OAuthTokenSecret.ts` already generates 32-byte base64url opaque credentials.
- Fluxer's current OAuth token storage demonstrates server-side token records and TTL, although this design improves secret-at-rest handling by storing only a hash.
- `PneumaticPostRepository.tryCreateDeliveryClaim` and the table DSL provide `insertIfNotExists` conditional ownership.
- Native guild services currently reauthorize authenticated users and hierarchy at execution; the broker preserves that boundary for the derived delegated actor.
- This is a new high-risk domain and intentionally does not reuse ordinary OAuth scopes or allow bots to choose a user principal.
