# Compatibility Contract

Discord provides the migration reference and minimum baseline for supported community-installed chat-input behavior. It does not determine Fluxer-only product policy.

The comparison was checked against Discord's official command, interaction, and component documentation on **2026-07-20**. Because that documentation can change, implementation fixtures must record the comparison date and later changes must be reviewed deliberately.

The [orientation](../guide/01-orientation.md) provides the Fluxer product context. The [glossary](glossary.md) defines the recurring terms used in this contract.

## What compatibility means

Every public route, event, field, type, error, and behavior is classified as:

| Classification | Meaning |
| --- | --- |
| `compatible` | Same accepted and emitted meaning and wire shape |
| `compatible_additive` | Compatible baseline plus optional Fluxer field or capability |
| `intentional_difference` | Different behavior with rationale and migration or fallback |
| `out_of_scope` | Recognized feature or API not implemented in this plan |

Persistence and service internals with no public effect are documented as internal implementation rather than disguised public compatibility.

## What existing bots can reuse

For a feature or API that Fluxer classifies as compatible, a Discord community bot can run on Fluxer after changing its credentials and documented API, Gateway, or HTTP connection settings. Its supported command objects, interaction handlers, callback payloads, components, and ordinary bot REST calls remain unchanged.

Omitted Fluxer fields and capabilities select the compatible baseline. They never cause rejection, delegated-principal inference, or an automatic richer meaning.

The baseline still receives Fluxer's server-owned installation, suspension, permission, rate, and bot-attributed audit enforcement. Compatibility never weakens authorization.

Compatible migration is proved by raw protocol fixtures and a pinned `discord.js` smoke application. No SDK, internal type, or copied library snapshot is the protocol authority.

## Verified Discord comparison

The dated comparison establishes:

- Three seconds for the initial response
- Fifteen minutes for interaction-token follow-up authority
- Mutually exclusive Gateway `INTERACTION_CREATE` or outgoing HTTP delivery
- HTTP callback routes for interaction response
- Interaction webhook exemption from the application global rate limit
- Command Snowflake, application ID, mutable name, permissions, contexts, integration types, and server version
- Initial chat-input options for subcommand, group, string, integer, boolean, user, channel, role, mentionable, number, and attachment
- Components V2 flag at `1 << 15`
- At most 40 Components V2 components
- At most five legacy action rows
- Component types 21 through 23 restricted to modal Labels in the dated Discord contract

Discord documents the five-follow-up cap for certain user-installed cases, not as a universal community-install limit. Fluxer deliberately applies five to every initial supported interaction.

## Supported and unsupported features

### Commands

Compatible:

- Chat-input command CRUD shapes
- Command, option, and choice baseline fields and types
- Localizations, permission bitfields, contexts, and integration types
- Application-wide command routes
- Normal success status and body for semantic no-op publication

Compatible additive:

- Immutable `key`, stable internal identity, and application handle
- Fluxer authority fields and operation registry opt-in
- Provider-aware discovery, alias, recommendation, and user preference
- Categories and developer dashboard
- Multi-value resource fields and `TARGET` type 1000 under capability
- Relationships under client capability
- Temporal types 1001 through 1004 under client and application capability

Intentional difference:

- Community registration controls targeting and cannot fork one command schema per community
- Deletion retains dormant identity and community state
- Commands outside community chat-input scope are rejected rather than stored

Out of scope:

- Direct-message and group-DM invocation
- Global or user-installed application contexts
- User and message context commands
- Activities
- Multiple bot accounts per application

### Interactions and responses

Compatible:

- Interaction types 1 through 5
- Three-second initial response and fifteen-minute mutation authority
- Compatible callback types and routes
- Gateway and HTTP delivery shapes
- Raw-body Ed25519 signature headers
- Defer, original message, follow-up, edit, and delete shapes
- Type-9 command or component to modal flow
- Type-5 modal submit
- Modal cancellation creating no submit interaction

Compatible additive:

- Stable keys and revisions in the envelope
- Explicit deadlines, trace ID, transport, attempt, and negotiated capabilities
- Non-authoritative permission snapshot
- Expected message version and typed idempotency

Intentional difference:

- Five follow-ups for every supported Fluxer interaction
- Stricter endpoint SSRF, redirect, activation, retry, and circuit behavior
- Ephemeral message lifecycle independent of the ordinary channel store

### Components and messages

Compatible:

- Numbered compatible component fields and placements
- Legacy action rows
- Components V2 flag, immutable representation, containers, and 40-component limit
- Modal Labels and compatible form controls

Compatible additive:

- Mandatory fallback text for structured unsupported-client behavior
- Fluxer audience, use policy, expiry, per-user state, and message version
- Negotiated inline radio and checkbox controls
- Richer capability-aware rendering

Intentional difference:

- Legacy and structured representation cannot be converted after creation
- Fluxer uses a reviewed 10 top-level structured limit and exact recursive grammar
- Initial ephemeral messages reject files and application-controlled media
- Copied content is static and carries no interaction authority

### Applications and administration

Compatible:

- Existing OAuth application and bot shape where migration uses it
- Invite mode permission request and ordinary bot-token authority

Compatible additive:

- Durable installations, managed roles, handles, lifecycle generations, and suspension
- Code-defined install permission source
- Declarative settings and builders
- Structured delegated action broker and causal audit

Intentional difference:

- Code-defined first-install permissions have authenticated source and relationship ceiling
- Stronger managed-role ownership and community authority checks
- Fluxer-native delegated authority never comes from an ordinary bot REST call
- Stronger private data, report, deletion, and recovery rules

## How Fluxer-only features are negotiated

`fluxer.commands.multivalue.v1` is required by both client and application transport. Scalar resource options remain compatible. Missing capability never coerces a collection into one value.

`fluxer.commands.conditions.v1` is required by the client. Relationships are registration metadata and are not delivered to the application. Missing capability never ignores the graph.

`fluxer.commands.temporal.v1` is required by client and application transport. Temporal type codes and resolved local-time tuples are Fluxer-only. Missing capability never silently sends a string or number under the same definition.

`fluxer.forms.choice-controls.v1` permits inline rich radio and checkbox placement. Without it, those controls remain modal-only or the response uses inert fallback.

Baseline command delivery, compatible components, callbacks, and ephemeral visibility require no Fluxer capability.

## Compatibility manifest

The implementation adds one reviewed manifest at the schema fixture owner. Each entry records:

- Public feature, route, event, field, and type number
- Classification
- Authoritative Fluxer schema symbol
- Official comparison URL and retrieval date
- Required capability
- Migration or fallback behavior
- Owning tests

The manifest covers commands, options, choices, interactions, callbacks, signatures, components, OAuth installation, Fluxer extensions, errors, rate headers, lifecycle behavior, deliberate differences, and out-of-scope contexts.

Updating the external comparison is a reviewed change. It never silently changes accepted Fluxer policy.

## Shared protocol fixtures

One versioned fixture corpus contains commands, interactions, components, signatures, errors, and lifecycle cases. Every fixture states input or output role, normalized result or stable error, required capability, and participating runtimes.

IDs, times, and keys are deterministic test values. Secrets are fixture-only. Boundary pairs exist at and one beyond every code limit.

Invalid fixtures cover malformed fields, strict and tolerant unknowns, numbers, bitfields, duplicate keys, component IDs, nesting, stale versions, unsupported capability, wrong audience, replay, and expiry.

Extension fixtures specifically prove:

- Multi-value lengths 1, 50, and 51, duplicate identity, stale target, and no partial delivery
- Relationship counts 0, 350, and 351, cycles, unsatisfiable graphs, false and zero presence, typed equality, stale edits, and bounded error order
- Every temporal type, calendar and safe-integer boundary, precision, step, direction, IANA zone, gap, both overlap choices, server resolution change, stale schema, and absent telemetry values
- Modal open, validation retry, cancellation, dismissal, expiry, focus return, and absence of false success
- Category counts 0, 25, and 26 plus 100 and 101 reserved keys, disable precedence, dormancy, and flat-client behavior
- Semantic equal and near-match publication, stale precondition, race, rate charge, and zero internal churn
- Provider recommendation precedence, availability, rename, suspension, reinstall, concurrent manager edits, and no automatic selection

## Testing every runtime against the same fixtures

The same fixture corpus is consumed by:

1. Shared Zod parse, normalize, and error tests
2. API, persistence, and OpenAPI contract tests
3. Erlang Gateway Identify, Ready, dispatch, and signature-header tests
4. Rust opaque component round-trip tests
5. React parser, model, fallback, keyboard, focus, and accessibility tests

Runtimes may have small loaders but cannot fork fixture copies. A runtime that does not interpret a field must preserve its bounded representation and handle unknowns safely rather than inventing another validator.

## Testing a real compatible bot

The end-to-end environment starts the real API, Gateway, message service, NATS, and database dependencies.

A raw protocol probe registers, installs, identifies, invokes, verifies, defers, responds, uses components and modals, edits, follows up, and observes uninstall, suspension, and fallback through both transports.

A pinned development-only `discord.js` bot changes only its Fluxer credentials and documented API, Gateway, or HTTP connection settings for compatible cases. Its supported command objects, interaction handlers, callback payloads, components, and ordinary bot REST calls remain unchanged. Fluxer extensions use a separate thin client so they cannot contaminate baseline evidence.

One third-party library is migration evidence, not proof of every ecosystem client. Raw fixtures remain authoritative.

## Generated contracts and automated checks

Schema source changes first. Repository generators produce TypeScript, OpenAPI, and protobuf artifacts where applicable. CI fails on uncommitted generated changes.

OpenAPI semantic diff checks the compatibility manifest. Removing or changing a compatible field requires an explicit intentional-difference or deprecation entry.

Shared wire or database changes run the full cross-runtime corpus. Stack tips also run real-service integration, browser accessibility, load and failure injection, and the pinned migration bot.

Fuzz and property tests generate bounded schemas and envelopes and prove termination, deterministic normalization, safe unknown handling, and no privilege broadening. Generated failures become permanent fixtures only when they protect a diagnosed regression.

## Supported APIs and a future SDK

Stable public protocol and capability contracts receive at least twelve months of usable overlap after notice and, when required, after a stable replacement and migration documentation exist.

An official TypeScript SDK is a separate post-stability project. It is not part of the eleven delivery stages and cannot make SDK use mandatory.

SDK work may start only after protocol review, clean generation, manifest completeness, shared fixture success, raw and Discord-library migration smoke success, explicit version support, package ownership, security response, dependency ownership, runtime range, release policy, and provenance are established.

If later built, the SDK consumes the same raw contracts and fixtures. It performs no network, registration, token exchange, telemetry, or filesystem work merely from import or construction. It never hides conflicts, invents exactly-once behavior, retries ambiguous effects, or replaces server authorization.

## Before claiming compatibility

The platform cannot claim compatible behavior until:

- Every public feature and API is classified
- Every deliberate difference has migration and fallback text
- Every fixture passes every owning runtime
- Raw Gateway and HTTP probes pass through real services
- The pinned Discord-library bot migrates without handler or compatible payload rewrite
- Unsupported contexts and capabilities fail without semantic downgrade
- Generated artifacts are clean and changes to public behavior are explained
- Lifecycle, security, accessibility, load, failure, rollback, and recovery cases pass for the claimed feature or API
