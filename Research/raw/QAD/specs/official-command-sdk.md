# Deferred Official Command SDK Contract

Status: user-approved deferred deliverable under QAD-237. This specification does not add work to QAD-202's eleven implementation trains and authorizes no package creation or publication.

## Authority and purpose

The public HTTP/Gateway protocol, generated schema/OpenAPI artifacts, compatibility manifest, service behavior, and shared raw conformance fixtures are authoritative. A future SDK is one TypeScript consumer and reference implementation; its source, types, helpers, examples, and snapshots cannot create undocumented protocol behavior or override a server result.

Compatible Discord libraries and direct raw-protocol clients remain supported migration paths. Applications do not need the SDK for ordinary compatible command registration, interaction handling, callbacks, components, or bot REST calls. Other languages may consume the same public contracts/fixtures without translating TypeScript internals or waiting for an official wrapper.

## Project-start gates

A separate reviewed SDK project may begin only after all of the following evidence exists:

1. The relevant public command, interaction, response, capability, error/rate, and compatibility contracts are implemented and reviewed through QAD-214.
2. Schema/OpenAPI generation is clean and the versioned compatibility manifest has no unexplained public surface.
3. Shared raw fixtures pass every owning runtime, including schema/API/Gateway and applicable client/service round trips.
4. Real-service raw-protocol and pinned Discord-library migration smoke tests pass for compatible behavior and explicit Fluxer extensions.
5. Protocol support/deprecation follows QAD-215 and has an explicit version/range representation the SDK can expose.
6. Maintainers assign package ownership, security response, dependency updates, supported Node/runtime ranges, semantic-version policy, documentation ownership, and release signing/provenance.

“Stable” is demonstrated by those contracts/tests/owners, not a calendar delay. A failed or missing gate leaves the SDK deferred; it does not weaken a gate or move work into an existing train.

## Initial thin scope

The first separately approved TypeScript SDK may provide:

- generated public command, option, localization, category, authority, capability, interaction, and response types where the schema generator is authoritative;
- schema builders and local validation/canonicalization that consume the same public rules/fixtures;
- explicit registration/manifest clients that expose canonical hash/no-op status, validation failures, expected-version conflicts, targeting, drafts, and recovery truthfully;
- raw-body Ed25519 interaction signature verification and typed parsing without logging the body;
- deadline-aware acknowledgement, message/defer/follow-up, autocomplete, modal, and component response helpers;
- explicit capability declaration/negotiation plus documented Discord-compatible alternatives for Fluxer-only fields;
- test utilities/loaders that run the shared conformance corpus against application handlers or a real service boundary.

No SDK package name, repository/package location, runtime version range, release cadence, or registry is selected by this research. Those are part of the later project review and cannot be inferred from the TypeScript recommendation.

## Side-effect and retry rules

Importing, constructing, configuring, or generating types performs no network I/O, registration, token exchange, telemetry upload, or filesystem mutation. A caller must explicitly invoke every registration/publication operation. Optional startup registration is an explicit application method with visible result handling and a disable/configuration path; package import never registers automatically.

The client exposes platform status, response headers, retry timing, conflicts, and partial/terminal results. It may automatically retry only a transport attempt that the underlying public contract identifies as safe and within its deadline/idempotency scope. It never converts an ambiguous timeout into “succeeded,” hides an expected-version conflict, invents exactly-once behavior, silently rebases a manifest, or retries an application/native effect without a valid public idempotency contract.

## Server-owned boundaries

SDK helpers never claim to implement or replace:

- current command availability, targeting, installation/suspension, or community category/policy checks;
- user preferences, provider recommendations, picker ranking, or authorization;
- server rate limiting, audit persistence, lifecycle/reconciliation, privacy retention, or deletion;
- delegated capability issuance/consumption, confirmation, native permission/hierarchy checks, or final action authorization;
- durable response/idempotency records, message versions, application transport health, or server time;
- Discord/Fluxer fallback selection on behalf of an application without an explicit manifest/configuration choice.

Local validation is early developer feedback only. The server remains authoritative and the SDK must preserve structured failures rather than translating them into false local success.

## Compatibility and versioning

Every SDK release declares its supported protocol/capability range and consumes the versioned compatibility manifest. Semantic-versioning rules distinguish SDK API compatibility from protocol compatibility. Deprecation and security handling are documented before the first supported release and cannot promise less usable public-protocol overlap than QAD-215.

Generated symbols trace to their schema source/version. Handwritten convenience APIs remain thin adapters over generated/public operations and have raw-protocol escape hatches. Unknown additive fields/capabilities follow the protocol's tolerant-reader and fail-closed executable-feature rules; the SDK never guesses an unknown action.

Examples keep compatible Discord migration and Fluxer-only extensions separate. They do not imply that a Fluxer extension body can be sent to Discord or that a compatible scalar alternative has richer Fluxer semantics.

## Security, privacy, and diagnostics

Default logs, errors, inspection helpers, and diagnostic serialization exclude credentials, bot/client secrets, signing private material, authorization/cookie headers, signatures, response tokens, command arguments/option values, autocomplete text/results, modal/component values, private responses, attachment/upload data, arbitrary request/response bodies, and application endpoint secrets.

Diagnostics use bounded operation/result/error classes and opt-in redacted hooks. Supplying a logger does not make sensitive bodies safe. Signature verification requires the exact raw request bytes, rejects malformed/expired or mismatched inputs under the public contract, and never logs those bytes. Test secrets are deterministic fixture-only values and cannot resemble production credentials.

Dependencies are minimized and reviewed. Release artifacts need reproducible provenance/signing, published checksums/metadata, an assigned vulnerability-reporting channel, and a supported security-update process before `official` or `supported` terminology is used.

## Validation and release evidence

The SDK consumes, rather than forks, the shared raw fixture corpus. Required later-project checks include:

- generated-source cleanliness and schema/version traceability;
- raw request/response versus SDK parse/serialize parity;
- compatible migrated Discord-library and SDK/raw-client service smoke tests;
- QAD-232 equal/near-match/stale/race registration behavior;
- every declared capability and explicit unsupported/fallback path;
- signature/body/deadline/idempotency/conflict/rate-limit behavior;
- secret/value/logging snapshot and malicious diagnostic-object tests;
- supported Node/runtime matrix, package import side-effect test, and release artifact/provenance verification;
- examples that work against the real public service boundary and do not mock server authorization as success.

SDK snapshots alone are never conformance evidence. A divergence is fixed in the SDK unless an explicitly reviewed protocol decision changes the authoritative schema/fixture/service together.

## Documentation and lifecycle

Documentation begins with raw protocol authority, compatibility scope, supported versions, installation/configuration, no-import-side-effects, secret handling, server-owned authorization, error/rate/idempotency semantics, and Discord migration. Generated API reference supplements task-based examples; neither copies private research prose as public contract.

Deprecating the SDK does not deprecate the protocol. Package transfer, archival, replacement, or end-of-support needs an owner-approved notice/security plan and preserves applicable protocol overlap. Other language libraries remain independent consumers and are not described as unsupported merely because only TypeScript has an official reference.

## Relationship to the implementation plan

QAD-237 clarifies QAD-202: “no official SDK is invented” means none is included in or required by the current eleven trains. The future SDK is a separate proposal after their protocol/conformance outputs are stable. It requires its own scope, branch/PR/release plan, validation, human review, and explicit authority to publish.
