# Normalized Interaction Envelope

Status: repository-derived compatibility design under QAD-037, QAD-066 through QAD-070, QAD-138, QAD-181, and QAD-227 through QAD-229.

## Common envelope

Fluxer uses one tagged interaction object for verification, chat-input command, component, autocomplete, and modal-submit triggers:

```text
id                         interaction Snowflake decimal string
application_id             application Snowflake decimal string
type                       numeric Discord-compatible interaction type
data?                      trigger-specific tagged payload
guild_id?                  community Snowflake; required for the initial feature scope
channel_id?                source channel Snowflake
channel?                   safe partial source channel where already available
member?                    invoking member with user and delivery-time permissions
user?                      reserved for future non-community contexts
token                      opaque interaction response token
version                    wire-envelope version, initially 1
message?                   source message for component-derived interactions
app_permissions?           delivery-time decimal permission bitfield compatibility field
locale?                    invoking account locale
guild_locale?              community locale when configured
context?                   initially GUILD (0)
attachment_size_limit      current application upload limit in bytes
permission_snapshot?       QAD-176 non-authoritative Fluxer extension
fluxer?                    additive extension object described below
```

The initial implementation accepts only community context and community-installed applications. The optional fields needed by future DM or user-installed contexts remain reserved in the schema but those contexts are not routed or advertised.

`fluxer` contains only additive metadata that cannot be represented compatibly:

```text
trace_id                    opaque non-secret diagnostic ID
response_deadline           absolute 15-minute timestamp
ack_deadline                absolute 3-second timestamp
delivery_transport          GATEWAY | HTTP
delivery_attempt            1 or 2; HTTP diagnostics only
invoked_form?               DEFAULT | COMMUNITY_ALIAS | QUALIFIED
capabilities                negotiated extension identifiers used for this payload
```

The interaction ID and body remain the same on the one permitted HTTP redelivery; only delivery attempt metadata/signature timestamp changes. The internal installation generation is not exposed as a public installation ID. Server-side response/action records bind it without making it an application-selected input.

## Type numbers

Preserve the Discord baseline:

| Type | Name | Initial Fluxer use |
|---:|---|---|
| 1 | `PING` | HTTP endpoint verification/health only |
| 2 | `APPLICATION_COMMAND` | Chat-input commands only |
| 3 | `MESSAGE_COMPONENT` | Message/rich-container controls |
| 4 | `APPLICATION_COMMAND_AUTOCOMPLETE` | Focused chat-input option |
| 5 | `MODAL_SUBMIT` | Submitted application modal |

User-context and message-context command types are not added to type 2 in the initial scope.

## Command and autocomplete data

Keep the compatible fields `id`, `name`, `type`, `resolved`, and recursive `options`. Fluxer additionally supplies immutable/revision identity:

```text
key
revision
schema_version
authority_revision
authority_hash
invoked_name
invoked_form
```

Every submitted option contains compatible `name`, numeric `type`, and exactly one of scalar `value`, QAD-227 collection `values`, or nested `options`; it additionally contains its immutable option `key`. `values` is permitted only under negotiated `fluxer.commands.multivalue.v1`. `USER`, `ROLE`, and `CHANNEL` collections contain ordered Snowflake strings; `MENTIONABLE` and Fluxer `TARGET` type `1000` contain ordered `{type, id}` values. Duplicate typed identities are invalid.

Autocomplete uses the same object and marks exactly one eligible leaf `focused: true`. Native resource search stays server-side. When the definition explicitly enables application autocomplete, the type-4 interaction contains only the current option path and bounded permitted entered values, including the ordered current collection; it does not add wider resource resolution merely because autocomplete is frequent. Suggestions use the option's element shape, are access-filtered, and retain the existing 25-item/64 KiB response limits.

Before creating a type-2 interaction, the server atomically checks current schema/bounds/duplicates, command access, and every resource's visibility/selectability. Any invalid element prevents application delivery; the client receives a safe keyed correction that does not confirm a hidden resource. Server resolution maps accepted referenced users, members, roles, channels, and attachments into the compatible `resolved` dictionaries after access filtering. Applications cannot add resolution fields to a later action request, and resource selection never substitutes for the application's or a native operation's current authorization checks.

For QAD-228, the same preflight evaluates the complete current `relationships` graph from submitted option presence and typed scalar values. A conditionally missing, hidden-populated, or conflicting option prevents creation/delivery and returns only stable option keys plus safe reason classes. Relationships are definition metadata and are not copied into the accepted interaction; the application's ordinary handler sees only the already specified option payload.

QAD-229 temporal leaf values are capability-gated but remain in the existing option `value` member:

```text
DATE             canonical `YYYY-MM-DD` string
INSTANT          canonical UTC `YYYY-MM-DDTHH:mm:ss.SSSZ` string
DURATION         nonnegative JavaScript-safe integer milliseconds
LOCAL_DATETIME   {
                   local_datetime: `YYYY-MM-DDTHH:mm:ss.SSS`,
                   time_zone: canonical IANA identifier,
                   utc_offset: `Z` or signed `±HH:MM`,
                   instant: canonical UTC RFC 3339 milliseconds
                 }
```

For local input the client submits its previewed tuple/overlap selection. The server resolves it against the current timezone registry and accepts only an exact valid match; a gap, unresolved overlap, unknown zone, or changed offset/instant returns correction/reconfirmation before interaction creation. The delivered tuple is server-derived. `DATE` direction checks use the resolved comparison zone without adding it to the date value; `INSTANT` is already exact; `DURATION` has no zone.

Temporal preflight also checks canonical syntax, calendar validity, representation/definition bounds, precision/step, and strict `PAST`/`FUTURE` against the server submission clock. It performs no application autocomplete or free-form language parsing. Raw relative text and localized display strings never enter the interaction.

`name` remains the application-defined compatible name. `invoked_name` records the default, community alias, or qualified shared spelling selected by the user. Public attribution follows QAD-085; dispatch never resolves only by either mutable name.

## Component data

Message-component interactions include:

```text
component_type              numeric type
custom_id                   application-authored selector
component_id?               optional 32-bit message-local structural ID, not a Snowflake
values?                     selected string/resource IDs as defined by the component type
resolved?                   access-filtered resource objects for entity selects
source_message_version      expected monotonic message/component version
```

The common `message` is the source message visible to the invoker and includes application ownership and current version. Fluxer locates the component by application, message ID, expected version, and component path/ID/custom ID. It rejects stale or ambiguous lookup instead of retargeting. Per-user committed selection state is not disclosed to other users.

## Modal-submit data

Modal data preserves the compatible shape:

```text
custom_id                   modal selector, 1-100 characters
components                  validated nested submitted component response tree
source_message_version?     present only when the modal originated from a message control
```

Only response-value fields are delivered; labels, disabled presentation fields, hidden arbitrary metadata, and secrets are never echoed as trusted input. Entity selections include an access-filtered `resolved` dictionary. Modal schema/version ownership is retained server-side and must match the submitted modal instance.

## Trust and minimization

- Fluxer derives application, community, channel, invoker, installation generation, source message/version, command revisions, and permissions server-side.
- Delivery snapshots help application behavior but never authorize a native action.
- The application receives only fields declared by the command/component schema and resources the invoker/application may resolve in the source context.
- Response tokens, raw HTTP bodies, command/form values, and component selectors are excluded from ordinary logs and guild audit rows.
- Payload construction uses shared schema validation before either Gateway serialization or Ed25519-signed HTTP serialization; transports do not own divergent models.

## Evidence and compatibility

- Fluxer already represents public IDs as branded bigint internally and decimal strings on REST/Gateway payloads.
- Current permissions are computed server-side in `GatewayService` and native services revalidate at execution.
- Current API schemas are Zod-owned under `packages/schema`, which remains the wire source of truth.
- The compatible baseline follows Discord's current [interaction object and type definitions](https://docs.discord.com/developers/interactions/receiving-and-responding).
- This preserves the migration shape while adding stable keys/revisions, explicit deadlines, traceability, and non-authoritative permission metadata. Community-only routing intentionally narrows the initial implementation without closing the protocol to future contexts.
