# Commands

Accepted lifecycle/schema process: `trails/02-command-lifecycle-and-schema.md`.

Accepted picker/policy process: `trails/03-command-picker-preferences-and-policy.md`.

## Open questions

QAD-227 through QAD-237 close all eleven reviewed PDF-derived questions: advanced options, composer/modal guidance, categories, unchanged publication, developer dashboard, community provider recommendation, contextual policy links, collision-picker validation, and the deferred SDK boundary. QAD-236 intentionally leaves exact collision-picker visual controls evidence-gated rather than silently chosen. QAD-237 places a possible thin TypeScript SDK after protocol/conformance stability and outside QAD-202's existing eleven trains. QAD-224 separately closes application-lifetime identity/history growth. The accepted numeric values are product bounds, not current-code-derived capacities.

## Proposed direction

- Identify commands by application ID plus stable command ID, never by displayed name.
- Give every command a visible application identity and the collision-free `/<application_handle>:<command_key>` qualified form while preserving normal unqualified picker behavior.
- Treat a community alias as an additional shared invocation name; keep the application-defined name executable so communities cannot force users onto a different spelling.
- Do not support per-user semantic renaming initially. Users may instead choose a preferred command for duplicate names and personalize visibility, favorites, and ranking.
- Model native Fluxer commands in the same identity and discovery system rather than expanding the current hard-coded string parser.

## Resolved technical contracts

- `specs/application-handle-contract.md`: 2–32-character lowercase ASCII/hyphen grammar, qualified parsing, direct conditional global lookup, source/index reconciliation, optional explicit or deterministic compatible allocation, no bulk backfill, pre-publication provisional replacement, first-publication freeze, reserved first-party namespace, recoverable application creation, and handle release within 24 hours of permanent deletion.
- `specs/command-persistence.md`: community-scoped passive ordering retains only bounded identity-derived ranking data under a sliding 90-day inactivity TTL; it stores no arguments/history and is immediately resettable.
- QAD-227 extends the existing schema, registration, evolution, picker, interaction, capability, error/resource, audit, compatibility, and rollout specifications with bounded multi-value resource options and `TARGET`; it creates no competing standalone schema.
- QAD-228 extends those same canonical command contracts with a bounded sibling relationship graph and server-authoritative preflight; delivered bot option payloads remain unchanged.
- QAD-229 adds four canonical capability-gated temporal option types with explicit timezone/DST resolution and no locale-dependent wire meaning.
- QAD-230 makes bounded structured input composer-first while preserving compatible command-to-modal callbacks for genuinely form-shaped work.
- QAD-231 adds stable developer-owned categories, one optional membership per command, and an atomic inherited community-disable gate without changing invocation hierarchy.
- QAD-232 makes canonical-equivalent publication a fully validated/rate-charged success no-op while retaining explicit stale-precondition conflicts and suppressing false history/events.
- QAD-233 defines an owner-only developer dashboard as a privacy-bounded view/controller over existing authoritative registry, draft, targeting, health, retirement, and recovery APIs.
- QAD-234 adds one manager-owned exact-name provider recommendation below explicit user preference/favorites and above passive usage; it never auto-selects or changes authority.
- QAD-235 adds ACL-gated role/channel policy-reference counts and stable-ID navigation into the one authoritative Integrations editor, with no linked-surface writes or disclosure.
- QAD-236 freezes collision-picker invariants and requires real composer/accessibility evidence plus recorded review before choosing grouping, cycling, or preference controls.
- `specs/official-command-sdk.md` records QAD-237's separately authorized post-stability TypeScript reference-SDK gate and its protocol-authority/support/security boundaries.
