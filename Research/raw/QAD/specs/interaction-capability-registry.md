# Interaction Capability Registry and Negotiation

Status: accepted protocol mechanics and support policy under QAD-138, QAD-183, QAD-189, QAD-215, QAD-227 through QAD-229, and the deferred QAD-237 consumer boundary.

## Registry ownership

Capabilities are reviewed constants in `packages/constants`, with one schema/API/Gateway representation. A registry entry contains:

```text
id                       stable lowercase dotted identifier
status                   EXPERIMENTAL | STABLE | DEPRECATED | RETIRED
introduced_api_major
deprecated_at?
replacement_id?
dependencies[]
supported_transports     GATEWAY | HTTP
consumers                CLIENT | APPLICATION | BOTH
```

An identifier is 1-64 ASCII characters. Its first segment matches `[a-z][a-z0-9]*(?:-[a-z0-9]+)*`; each later dot-separated segment matches `[a-z0-9]+(?:-[a-z0-9]+)*`. Hyphens are therefore permitted only inside a segment, never leading, trailing, or repeated. Request arrays contain at most 32 unique entries. IDs are never renamed, reused, or given incompatible meaning. A replacement receives a new ID. Shared fixtures accept every initial registry ID below and reject leading/trailing/repeated hyphens, empty segments, uppercase characters, and overlength values.

The initial extension registry is:

```text
fluxer.commands.multivalue.v1
fluxer.commands.conditions.v1
fluxer.commands.temporal.v1
fluxer.components.rich.v1
fluxer.forms.choice-controls.v1       depends on fluxer.components.rich.v1 for inline message use
fluxer.delegated-native-actions.v1
fluxer.declarative-administration.v1
```

Discord-compatible command delivery, ordinary compatible components, callbacks, and ephemeral visibility do not require a Fluxer capability. Capabilities advertise only behavior a migrating Discord application cannot safely assume.

`fluxer.commands.multivalue.v1` is a `BOTH` capability: the invoking Fluxer client must understand the collection composer and the application transport must understand `values` and `TARGET`. A command definition using QAD-227 automatically declares that requirement. The identifier and its `TARGET` numeric value `1000` are permanent.

`fluxer.commands.conditions.v1` is a `CLIENT` capability. The invoking client must understand QAD-228's live relationship states, but the application receives the ordinary validated option payload and needs no new transport shape. A definition containing `relationships` automatically declares the client requirement.

`fluxer.commands.temporal.v1` is a `BOTH` capability. The invoking client must understand canonical temporal entry/timezone confirmation, and the application transport must understand option types `1001–1004` plus the resolved local-time tuple. A definition using any QAD-229 temporal type automatically declares that requirement; type codes and meanings are permanent.

## End-user client negotiation

Authenticated Fluxer clients advertise the same bounded capability identifiers through the schema-owned session/bootstrap contract, and the server returns the accepted intersection. Command catalog reads and submission bind that server-accepted session set; a caller cannot add a capability only on the invocation request. A command requiring an unsupported client capability is omitted from ordinary discovery. Exact lookup or a saved/deep link yields an inert update-required result with provider attribution, never a scalar rendering or invocation.

## Gateway negotiation

Bot `IDENTIFY.d.capabilities` is an optional string array. Omission means no Fluxer extensions. Gateway validates bounds/syntax, ignores well-formed unknown IDs for forward compatibility, removes duplicates, resolves dependencies, and stores the supported intersection on the session. `READY.d.capabilities` returns only accepted IDs and `READY.d.unsupported_capabilities` may return syntactically valid but unknown/dependency-blocked IDs for diagnostics.

`INTERACTION_CREATE.d.capabilities` contains the accepted subset relevant to that interaction. An application cannot enable an extension by echoing a capability in a response; the server uses the session/configured intersection.

Resume retains the original session's accepted set. A new Identify is required to change it. A server deployment that changes registry support forces the same ordinary reconnect/resume boundary used for other Gateway contract changes rather than mutating an established session silently.

## HTTP negotiation

Outgoing HTTP applications store a requested capability set on the pending interaction-transport configuration. Signed endpoint verification receives both requested and server-accepted arrays. Successful verification fixes the accepted intersection on that exact configuration generation before the application pointer CAS can activate it. Changing the requested set is a new pending configuration and explicit compare-and-set activation under QAD-183; it never silently broadens a live endpoint's contract.

The application transport API keeps activated and candidate capability state distinct:

```text
interaction_endpoint_requested_capabilities             owner-writable request input; active request on reads
interaction_endpoint_accepted_capabilities              read-only active intersection
interaction_endpoint_unsupported_capabilities           read-only active requested-minus-accepted diagnostics
interaction_pending_endpoint_requested_capabilities     read-only pending request
interaction_pending_endpoint_accepted_capabilities      read-only pending verification intersection
interaction_pending_endpoint_unsupported_capabilities   read-only pending requested-minus-accepted diagnostics
```

Signed verification sends the pending configuration's `requested_capabilities` and `accepted_capabilities`; `unsupported_capabilities` may identify the remaining well-formed unknown or dependency-blocked requests. Only the unsuffixed requested field is accepted as owner input: on a mutation it defines the new candidate request, while in a response it reports the active configuration's request. The pending-prefixed response fields report the candidate separately. Active and pending accepted/unsupported values are server-derived, and unsupported values grant no delivery or response behavior. A failed, abandoned, or stale candidate never changes the unsuffixed active response fields. The developer API also exposes a read-only capability catalog. Self-hosted instances may support a subset but cannot redefine an ID.

## Failure and fallback

- Malformed/oversized arrays fail Identify or configuration validation with path-aware errors.
- Well-formed unknown IDs are not fatal and are never accepted.
- Missing capability means the application receives the compatible baseline or the approved inert/static fallback; Fluxer does not send extension-only interactive payloads and hope the application understands them.
- A QAD-227 command requires the capability on both the invoking client and active application transport. If either side lacks it, Fluxer creates no interaction and performs no scalar coercion.
- A QAD-228 command requires `fluxer.commands.conditions.v1` on the invoking client. Without it, Fluxer omits ordinary discovery, returns an inert update-required exact result, and creates no interaction; it never drops the relationships and submits the same fields condition-free.
- A QAD-229 command requires `fluxer.commands.temporal.v1` on both client and active application transport. Missing support creates no interaction and never converts temporal values to a compatible-looking scalar under the same definition.
- A response using a component/action outside the negotiated set fails with `INTERACTION_CAPABILITY_REQUIRED` and the required ID.
- Dependency failure names the missing dependency without exposing hidden instance rollout state.

## Evolution

Additive optional fields that preserve semantics remain in the current API major. A new optional behavior gets a new capability. A breaking baseline envelope/route change requires a new API/Gateway major under QAD-138.

Deprecation marks an ID or major and publishes its notice, retirement date, replacement where required, migration documentation, and support contact. A stable contract retains its old semantics and remains usable until both applicable minimums have elapsed:

```text
retire_at >= public_notice_at + 12 months
retire_at >= stable_replacement_and_migration_docs_at + 12 months   // when replacement is required
```

Retirement stops accepting the capability or major, leaves every identifier permanently reserved, and produces inert fallback or an explicit configuration error. Preview/experimental entries are clearly labelled and do not receive this stable-duration promise. A security/legal emergency can shorten the period only when continued operation is materially unsafe or prohibited; Fluxer publishes the reason, affected contract, effective date, migration guidance where possible, and safest available fallback without disclosing exploit details prematurely.

A future official SDK declares the protocol/capability range it understands and returns the server-accepted intersection; it cannot make an experimental/stable/retired capability usable by local type assertion or response echo. SDK version support follows this registry/QAD-215 rather than defining a parallel capability lifecycle, and every Fluxer-only fallback remains an explicit application choice.

## Compatibility tests

Fixtures cover omitted, empty, accepted, duplicate, unknown, malformed, dependency-blocked, transport-unsupported, deprecated, and retired capability sets across client bootstrap, schema, Gateway Identify/Ready, HTTP verification, command discovery, and interaction delivery. They prove baseline Discord-compatible interactions remain usable with no Fluxer capability, QAD-227/QAD-229 commands require both consumers, and QAD-228 commands require a capable invoking client without changing application delivery payloads.

## Evidence and classification

- Fluxer currently has strict REST/Gateway major `1`, additive Identify fields, and `ignored_events`, but no capability registry.
- Current Gateway validation is explicit and bounded; negotiated arrays should follow that pattern rather than use an unbounded arbitrary map.
- Fluxer currently supports only API/Gateway v1 and has no published multi-major lifecycle. Deprecated GIF aliases demonstrate `Deprecation`, successor `Link`, and `Warning` headers but no dated `Sunset` promise.
- This preserves the strict major for breaking changes, adds forward-compatible feature intersection, and extends current warning practice with QAD-215's explicit stable support guarantee.
