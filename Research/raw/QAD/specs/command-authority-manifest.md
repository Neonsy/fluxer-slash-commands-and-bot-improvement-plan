# Command Authority Manifest and Permission Snapshot

Status: repository-derived decision under QAD-145, QAD-175, QAD-176, and QAD-220.

## Published command authority fields

The Discord-compatible command object retains:

- `default_member_permissions`: nullable decimal permission bitfield string;
- `contexts`: initially only guild context `0`;
- `integration_types`: initially only guild installation `0`;
- `nsfw`: boolean.

Fluxer adds:

```text
key: immutable command key
execution_mode: AS_USER | AS_BOT | REQUIRE_BOTH
allowed_native_operations: sorted unique operation enum strings
default_invocation_policy:
  audience: EVERYONE | NATIVE_PERMISSIONS
  required_permissions: decimal bitfield string
authority_revision: positive integer
authority_hash: canonical SHA-256 digest
```

## Compatibility input and explicit broker opt-in

Every Fluxer-only authority input is optional on Discord-compatible registration routes. A request containing none of `execution_mode`, `allowed_native_operations`, or a Fluxer invocation-policy extension is accepted unchanged and normalized internally as:

```text
execution_mode: AS_BOT
allowed_native_operations: []
structured broker: disabled because the allowlist is empty
```

The bot may handle the interaction and call ordinary bot-authenticated REST endpoints. Those endpoints derive the bot from its token, check its current managed-role permissions/hierarchy, and audit bot authority; they do not inherit or infer the invoking user merely because an interaction exists. Community policy may restrict command discovery/invocation but cannot transparently convert those later bot-token calls into delegated actions.

A nonempty `allowed_native_operations` explicitly opts the command into the structured action broker. If that allowlist is present and `execution_mode` is omitted, it normalizes to `AS_USER` under QAD-039's safe user-authority default. Broker execution then requires the negotiated capability, exact registered operation, trusted interaction state, and the separate broker endpoint. It never intercepts an ordinary bot REST call. `REQUIRE_BOTH` and `AS_BOT` broker modes must be explicitly supplied when a developer wants them.

`AS_USER`, `AS_BOT`, and `REQUIRE_BOTH` are the only accepted and emitted enum values in registration, storage, canonical authority hashing, approval records, interaction context, OpenAPI, and generated types. The earlier draft spellings `DELEGATED`, `BOT`, and `BOTH` are rejected rather than normalized aliases because no shipped public contract requires them and accepting two spellings would make canonical hashes and review diffs ambiguous. This does not affect compatible clients that omit every Fluxer authority field.

This distinction keeps an existing Discord bot functional and honestly bot-attributed while making Fluxer's stronger delegated path optional, explicit, and enforceable.

`default_member_permissions` is the compatibility alias for `default_invocation_policy.required_permissions`; conflicting simultaneous values are rejected. It is a community-editable default under QAD-120, not a substitute for final native endpoint authorization.

`allowed_native_operations` is selected only from a versioned Fluxer registry. Unknown operations reject publication. The list is a review ceiling: the application cannot request another operation during an interaction, and inclusion does not itself authorize any target/action. Operation parameters and the actual actor are validated by the structured action broker.

Any change to execution mode, required native permission, allowed native operations, or operation constraint increments `authority_revision`, changes `authority_hash`, and triggers the approved community review rules. Presentation and option changes cannot smuggle authority changes because the hash uses typed columns outside presentation JSON.

## Invocation permission snapshot

Accepted interaction envelopes include convenience context:

```text
permission_snapshot:
  captured_at
  guild_id
  channel_id
  invoker_permissions          decimal effective bitfield in source channel
  application_permissions     decimal effective bot bitfield in source channel
  invoker_role_ids             current role IDs
  application_role_ids         current bot role IDs
  command_authority_revision
  command_authority_hash
  non_authoritative: true
```

The snapshot is generated server-side after invocation-policy authorization and before delivery. Applications cannot submit or modify it.

It is explicitly non-authoritative:

- delegated/native action execution re-fetches permissions, hierarchy, target, installation state, suspension, capability state, and current operation approval;
- bot-authority API calls use current bot membership/roles and installation state;
- a stale snapshot can only cause the application to decline or alter its own behavior, never grant Fluxer authority;
- audit records identify the authoritative execution decision separately from this convenience snapshot.

The existing Discord-shaped `member.permissions`/`app_permissions` fields may mirror the two bitfields for SDK compatibility. Fluxer extension consumers should prefer the explicit snapshot object and its marker.

## Evidence

- `ChannelConstants.ts` owns Fluxer's bigint permission registry.
- REST schemas serialize permission bitfields as decimal strings.
- `GatewayService.getUserPermissions` computes effective current guild/channel permission state.
- Current bot invite authorization masks against `ALL_PERMISSIONS`; manifest parsing must use the same normalization and reject unknown bits rather than silently authorizing them.
