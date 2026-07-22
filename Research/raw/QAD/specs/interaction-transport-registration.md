# Interaction Transport Registration

Status: repository-derived compatibility design under QAD-069 through QAD-078, QAD-138, QAD-183, QAD-189, and the deferred QAD-237 consumer boundary. QAD-189's `interaction-capability-registry.md` is the sole authority for capability identifiers, dependencies, negotiation fields, and lifecycle.

## Gateway delivery

`INTERACTION_CREATE` is a normal opcode-0 dispatch to the authenticated application bot session. It requires no Gateway intent, matching Discord behavior. Fluxer's current Gateway has no intent bitfield and instead accepts `ignored_events`; this new event is not suppressible through `ignored_events` while the application is configured for Gateway interactions. Developers disable delivery by disabling commands or changing the application delivery configuration, not by creating a silently unhealthy session.

For guild interactions, the existing shard formula selects the one bot shard that owns the community. Resume replay uses the same interaction ID and sequence semantics; the atomic interaction callback claim prevents replayed dispatch from causing a second response/effect.

Gateway `IDENTIFY.d` gains an optional additive field:

```text
capabilities: string[]       bounded and validated under the QAD-189 registry
```

Base Discord-compatible interaction delivery is implicit and does not require a Fluxer capability, so a migrated bot can receive registered commands without changing its Identify payload. Capabilities negotiate only Fluxer additions. The complete initial registry is defined once in `interaction-capability-registry.md`; this transport contract does not maintain a second list.

Gateway uses the QAD-189 shapes exactly: the bot requests capabilities in `IDENTIFY.d.capabilities`, Fluxer returns the accepted intersection in `READY.d.capabilities`, and may return syntactically valid unknown or dependency-blocked requests in `READY.d.unsupported_capabilities` for diagnostics. Unknown identifiers are never accepted. A command or control requiring an unaccepted capability is unavailable on that session and is never silently down-converted to a different action.

## Application fields

Extend `ApplicationRow`, the application model, and owner-visible response schemas with typed transport pointers rather than a loose URL:

```text
interaction_delivery_mode           GATEWAY | HTTP
interaction_active_endpoint_config_id?
interaction_pending_endpoint_config_id?
interaction_endpoint_version         application-scoped optimistic concurrency integer
interaction_public_key               active Ed25519 public verification key, hex
interaction_pending_public_key?      pending rotation key, hex
interaction_active_key_id             non-secret key generation ID
interaction_pending_key_id?
```

Endpoint URL, capabilities, verification, and health belong to an application-owned configuration record rather than being overwritten in place:

```text
application_interaction_endpoint_configs
  application_id
  endpoint_config_id                  non-reused configuration identity
  endpoint_generation                 increasing application-local generation
  endpoint_url                        normalized HTTPS URL
  verification_status                 PENDING_VERIFICATION | VERIFIED | FAILED
  health_status                       UNKNOWN | HEALTHY | UNHEALTHY | DISABLED_BY_INSTANCE
  requested_capabilities
  accepted_capabilities
  verification_contract_digest?       canonical endpoint/capability/generation proof
  verified_application_endpoint_version?
  verified_key_generation_id?         exact non-secret key generation used
  abandoned_at?
  retired_at?
  last_verified_at?
  last_failure_at?
  safe_failure_code?
```

There is at most one pending pointer and one active pointer per application. Those application-row pointers are the lifecycle-selection authority. A configuration's immutable verification result and proof inputs determine whether it is eligible for activation, and the selected active record's health gates delivery, but neither field can select a different record. `abandoned_at` and `retired_at` are repairable lifecycle projections of pointer changes. The active configuration remains the only delivery/health authority while a candidate is pending. Delivery work binds the exact active configuration ID/generation so a later replacement cannot retarget queued or in-flight work. Superseded configurations remain readable only while an authorized trace or queued/in-flight operation still references them; they are never selected as fallback.

Private Ed25519 material is encrypted under instance key management with a key version and is never returned by repository models, API responses, logs, audits, or backups lacking secret-store protection. Application responses use Discord's compatible `interactions_endpoint_url` and `verify_key` names for the active configuration/key where possible. Fluxer additions expose separate active and pending configuration objects, including their IDs/generations, verification/health/lifecycle state, and requested/accepted/unsupported capability sets; a pending URL never appears as the compatible active URL.

## Owner API

Application-owner create/update APIs add:

```text
interactions_endpoint_url?: string | null
interaction_endpoint_requested_capabilities?: string[]
expected_interaction_endpoint_version?: integer
```

The accepted set is read-only. Owner-visible responses expose active and pending requested/accepted sets plus derived unsupported sets for diagnostics; unsupported values are not executable authority. With the expected application endpoint version, setting a new URL or changing the requested set inserts a configuration with `verification_status=PENDING_VERIFICATION` and CASes only the pending pointer/version. It does not mutate the active pointer or delivery mode. Replacing or clearing a pending candidate first CASes its pointer to the new/empty value; the displaced record receives `abandoned_at` idempotently, and a racing verification cannot activate it.

Fluxer begins verification from one snapshot of the selected pending configuration, application endpoint version, and verification-key generation. It sends a signed type-1 interaction containing the pending requested and server-accepted arrays, requires a valid type-1 response inside three seconds, and rechecks the network destination on connection. A successful response uses a candidate-local conditional update keyed by the exact configuration identity/generation and expected `PENDING_VERIFICATION` state to fix that immutable candidate's accepted intersection, `verification_status=VERIFIED`, `verified_application_endpoint_version`, `verified_key_generation_id`, and a canonical digest covering the candidate ID/generation, normalized endpoint URL, and requested/accepted capability sets. The candidate update may condition only on that configuration's own state; it does not claim to atomically inspect the separate application row. If replacement wins before or after this write, the proof may remain recorded but is inert because a configuration row never selects itself for delivery.

The worker rereads the immutable candidate proof and then CASes the application row: the pending pointer and candidate generation must identify that record, the application endpoint version must equal `verified_application_endpoint_version`, the verification key must equal `verified_key_generation_id`, and the canonical configuration digest must still match the immutable candidate. On success the active pointer moves, the pending pointer clears, and the version increments once. That application-row CAS is the only activation commit. A crash after recording `VERIFIED` but before activation is recoverable by retrying this exact CAS. A stale activation CAS leaves the active configuration, pending candidate, key material, and delivery mode unchanged; if any proof input no longer matches, activation requires a newly created and verified candidate. Staleness alone does not mark the candidate abandoned or delete a pending private key. Explicit pending-pointer replacement or clearing owns abandonment and applicable private-key deletion. The worker records `retired_at` on the displaced active record idempotently; reconciliation repairs missing abandonment/retirement timestamps after a committed pointer change, but delivery never selects by those timestamps. A capability-only change follows the same candidate/verification/activation path rather than silently broadening the live endpoint contract.

Transport switching is explicit:

```text
PUT /oauth2/applications/{application_id}/interaction-delivery
{mode: GATEWAY | HTTP, expected_interaction_endpoint_version}
```

HTTP selection requires an active verified endpoint. Gateway selection succeeds independently of current bot connectivity; commands remain unavailable until an eligible bot session is connected. Switching atomically increments the configuration version and invalidates any queued work for the previous transport. It never sends one interaction to both modes.

Clearing the active HTTP endpoint pointer requires switching to Gateway or disabling all interactive surfaces in the same version-checked operation. This prevents silently discarding live interactions. A pending candidate may be cleared independently without affecting the active pointer or delivery mode.

Key rotation uses a dedicated owner operation. Fluxer generates a pending application-scoped Ed25519 key, exposes its public key, verifies the endpoint with that key, then atomically activates it. During candidate verification the endpoint accepts active and pending public keys; ordinary interactions continue using only the active key. Failed/abandoned rotation deletes pending private material and never changes the active key.

A future QAD-237 SDK may supply raw-body Ed25519 verification/parsing and typed transport/capability configuration helpers only after its separate gates. The exact raw bytes and public key remain inputs; the helper never logs them, stores private server key material, weakens the three-second verification/acknowledgement contract, auto-activates a transport, or treats local verification as server configuration authority. Raw implementations remain first-class.

## Authorization and audit

- Only the current application owner may edit endpoint, requested capabilities, transport, or verification keys. Team authority is not part of this model; adding it requires a separate ownership, membership, lifecycle, and audit decision. Accepted and unsupported sets are server-derived and cannot be written directly.
- Instance suspension may set `health_status=DISABLED_BY_INSTANCE`; application owners cannot override it.
- Owner-visible activity records URL hostname (not query/credentials, which are prohibited), old/new mode, verification/health/lifecycle state, requested/accepted capability diff, key generation IDs, actor, timestamp, and result. Private key material, DNS answers, signatures, and payloads are excluded.
- Every mutation CASes the application endpoint version and exact active/pending/key pointers it depends on, and returns `409` on a stale expected version or displaced candidate. A verified configuration never becomes active without the pointer CAS; lifecycle timestamps are reconciled from the application-row pointers.

## Evidence and classification

- Current Gateway Identify already accepts additive fields and stores `ignored_events`, flags, shard, and properties, but has no intents or interaction dispatch.
- Current application persistence/model/request schemas are typed and versionable; endpoint configuration belongs there rather than an unrelated webhook record.
- Discord's current [interaction delivery model](https://docs.discord.com/developers/interactions/receiving-and-responding) uses mutually exclusive Gateway/HTTP delivery without an interaction intent, and its [application object](https://docs.discord.com/developers/resources/application) exposes `interactions_endpoint_url`.
- This preserves migration behavior, extends capability negotiation, and deliberately makes transport activation/switching transactional and observable.
