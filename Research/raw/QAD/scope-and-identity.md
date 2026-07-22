# Scope and Identity

Accepted process: `trails/00-process-scope-and-compatibility.md`.

## Open questions

No unresolved identity product question remains. QAD-224 now bounds application-lifetime command identities and defines reference-safe retirement; it is a product retention decision rather than a fact inferred from Fluxer's nonexistent current command registry.

## Resolved identity matrix

| Concept | Identity | Public wire form | Cardinality / reuse |
|---|---|---|---|
| Interaction | Fluxer Snowflake | Decimal string `id` | One per invocation; reused across delivery attempts; never reassigned |
| Delivery attempt | Internal integer on interaction delivery | Diagnostic attempt metadata only | Increments for the single allowed HTTP retry; not a new interaction |
| Initial/follow-up response | Message Snowflake | Decimal string message `id` | Initial response at most one; follow-ups use approved cap; never reassigned |
| Public bot-managed message | Existing Message Snowflake | Ordinary message `id` | No parallel bot-message ID |
| Ephemeral message | Message Snowflake in recipient-scoped storage | Message-shaped response visible only to invoker | Never inserted into a channel partition |
| Command definition | Application-scoped immutable developer key plus published command Snowflake where Discord-compatible endpoints require it | Discord-facing `id` is a decimal Snowflake; Fluxer extensions also expose immutable key | Key lifecycle remains governed by dormant-command policy |
| Component definition | Application-authored `custom_id` string | `custom_id` | Unique within the rendered message; may recur in another message/version |
| Component occurrence | Composite `(application_id, message_id, message_version, component path/custom_id)` | Source message/version plus `custom_id` in interaction data | No standalone Snowflake; stale versions never retarget |
| Response authority | 32 random bytes, base64url; hash stored server-side | Opaque interaction token only on authorized response routes | Application/audience/interaction bound; expires after 15 minutes; never reused |

All new Snowflakes use the existing branded-bigint and decimal-string wire conventions. Interaction tokens are secrets, not identifiers suitable for logs or audit fields.

## Proposed direction

- Preserve accepted one-application-to-one-bot and community-only application-command scope.
- Permit one account to own at most 50 non-deleted applications; suspended, dormant, or otherwise retained applications still count until permanent deletion completes.
- Keep identities independent of mutable labels and presentation.
- Use an internal lifecycle generation only where stale authority must be distinguished without changing a public community/application identity.
