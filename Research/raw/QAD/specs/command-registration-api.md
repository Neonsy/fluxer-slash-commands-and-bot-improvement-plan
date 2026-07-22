# Command Registration API

Status: repository-derived decision under QAD-145 and QAD-169, extended by QAD-227 through QAD-233 and the deferred QAD-237 consumer boundary.

## Compatible endpoint surface

Initial command registration supports the Discord chat-input command endpoint shapes:

### Application-wide

- `GET /applications/{application_id}/commands`
- `POST /applications/{application_id}/commands`
- `PUT /applications/{application_id}/commands`
- `GET /applications/{application_id}/commands/{command_id}`
- `PATCH /applications/{application_id}/commands/{command_id}`
- `DELETE /applications/{application_id}/commands/{command_id}`

### Community-scoped compatibility views

- `GET /applications/{application_id}/guilds/{guild_id}/commands`
- `POST /applications/{application_id}/guilds/{guild_id}/commands`
- `PUT /applications/{application_id}/guilds/{guild_id}/commands`
- `GET /applications/{application_id}/guilds/{guild_id}/commands/{command_id}`
- `PATCH /applications/{application_id}/guilds/{guild_id}/commands/{command_id}`
- `DELETE /applications/{application_id}/guilds/{guild_id}/commands/{command_id}`

Only chat-input type `1` is accepted initially. Context/user/message/Activity command types return a structured unsupported-type error rather than being persisted for a client that cannot invoke them.

## Fluxer single-schema mapping

The application-wide endpoint publishes the application-wide schema and defaults new commands to all active installations.

The community endpoint is a compatibility view over the same stable command:

- create/edit validates the supplied definition against the command's one application-wide schema;
- an identical definition adds or preserves that community as a target;
- a different structural or metadata definition for an existing stable key returns `COMMAND_SCHEMA_CONFLICT` with the current command/revision;
- deleting through a community endpoint removes only that community target;
- bulk community overwrite replaces only that application's target set for the named community and never deletes an application-wide command;
- GET returns commands effectively targeted to that community, subject to developer availability—not community invocation policy.

This deliberately rejects Discord deployments that depend on different definitions for the same logical command in different guilds. They must use distinct immutable keys/commands or publish one schema.

## Stable-key compatibility

Fluxer request/response objects add optional `key` as an additive extension.

- Native Fluxer tooling must send a key on first creation.
- A compatibility client that omits it receives a normalized key derived from the initial command name, with a deterministic suffix only on key collision.
- The generated key is returned and remains immutable; later rename by command ID does not alter it.
- POST preserves Discord's type+current-name upsert behavior and response status (`201` create, `200` update).
- PATCH addresses the stable command ID.
- Bulk overwrite matches entries by explicit Fluxer `key` first and then current type+name for compatibility. An unmatched renamed entry without key is a new command, matching the safer identity behavior.

## Multi-value extension registration

A body containing no QAD-227 fields follows the unchanged Discord-compatible scalar contract. A Fluxer-aware body may add `multi_value` to `USER`, `ROLE`, `CHANNEL`, or `MENTIONABLE`, or use the registered Fluxer `TARGET` type `1000`, exactly as bounded in `command-schema-limits-and-localization.md`.

The extension automatically marks the command as requiring `fluxer.commands.multivalue.v1` from both the invoking client and the application's active delivery transport. Publication validates and stores the definition even while one side is offline, but discovery/invocation becomes eligible only when both sides have accepted the capability. Missing capability is never interpreted as scalar fallback. Ordinary discovery omits an unsupported command; an exact lookup or saved link returns a safe `CLIENT_UPDATE_REQUIRED` or application-unavailable presentation as appropriate.

The same Fluxer body is intentionally not a Discord registration body. Cross-platform tooling keeps a scalar Discord manifest or generates one explicitly; Fluxer never strips extension fields and forwards a misleadingly weakened definition to Discord.

## Conditional relationship registration

A Fluxer-aware command/subcommand may add the QAD-228 `relationships` array next to its sibling `options`. Registration validates the complete bounded graph, predicate types/constants, one-rule-per-kind limits, symmetric unique conflicts, cycles, and satisfiability before an immutable candidate can publish. Errors point to the relationship entry and referenced stable option keys; the server never drops an invalid edge or guesses a mutable display name.

Using the array marks the command as requiring the client capability `fluxer.commands.conditions.v1`. The application transport needs no new delivery capability because accepted interactions contain the same ordinary option payload; opting in occurs through the registered definition. An unsupported invoking client cannot use the command, ordinary discovery omits it, and exact lookup returns `CLIENT_UPDATE_REQUIRED` rather than a relation-free form.

Discord bodies omit `relationships`. Cross-platform tooling keeps or generates an explicit Fluxer variant; Fluxer does not promise that sending its extension field to Discord will succeed.

## Temporal option registration

A Fluxer-aware definition may use registered types `DATE`/1001, `INSTANT`/1002, `LOCAL_DATETIME`/1003, or `DURATION`/1004 with only the type-appropriate bounds, precision/step, time-direction, and timezone fields from `command-schema-limits-and-localization.md`. Publication validates every static canonical value and fixed IANA identifier. Unsupported fields, noncanonical alternatives, incompatible bounds, overflow, free-form parse instructions, or attempts to combine temporal types with choices/autocomplete/multi-value fail path-aware validation.

Using any temporal type automatically requires `fluxer.commands.temporal.v1` from both the invoking client and active application delivery transport. Publication may persist while a consumer is offline, but discovery/invocation is eligible only when both accepted the capability. Neither side receives a string/integer fallback under the same command identity.

Discord bodies use separately authored/generated scalar options. A cross-platform tool may map `DATE`/`INSTANT`/`LOCAL_DATETIME` to documented string alternatives and `DURATION` to an integer alternative in its own Discord manifest, but Fluxer does not perform or claim that semantic conversion automatically.

## Command category registration

The Fluxer complete-manifest/draft shape may include the QAD-231 top-level `categories` array, and a Fluxer-aware command may include one `category_key`. A Fluxer-only `GET`/`PUT /applications/{application_id}/command-categories` surface reads or replaces the current category registry using `expected_manifest_revision`; replacement publishes a complete immutable manifest and rejects removal of a category still referenced by the resulting command entries. Atomic registry-plus-membership moves use the complete manifest/draft surface.

The server conditionally reserves a category key before first publication, returns its permanent `category_id`, and never binds that key to another category. Removing it from the active registry makes it dormant. Reintroducing the same key restores the same identity and leaves retained community category policy attached. Category name/order edits and command membership moves create command/manifest revisions and catalog invalidation but do not increment command `schema_version` or `authority_revision`.

Discord-compatible request bodies omit `categories` and `category_key`; using only the compatible command routes continues to produce uncategorized commands. Cross-platform tooling publishes category metadata only through the Fluxer extension surface. Older clients may ignore category fields in Fluxer reads and render the server-eligible commands flat; no capability or alternate interaction payload is required.

## Drop-in authority normalization

A Discord command body need not contain any Fluxer authority field. Omitting those extensions activates no delegated broker behavior: the stored compatibility profile uses bot authority and an empty registered-native-operation allowlist. The existing handler can call ordinary bot REST endpoints with its bot token. A structured operation allowlist is the explicit broker opt-in and follows `command-authority-manifest.md`; command registration never silently upgrades a compatibility body into delegated or both-authority execution.

## Canonical unchanged-publication no-op

Every mutation first authenticates/authorizes, consumes its ordinary bucket, parses and validates the complete request, resolves stable command/category identities, and constructs the same canonical prospective manifest used for persistence. Semantic comparison includes all active command/category identities and content, normalized compatible defaults, metadata/localizations, semantically ordered fields, category registry/membership/order, developer availability, canonical target sets, and authority fields. Object/map/set ordering is canonicalized; option/choice/category presentation order remains significant. Publication IDs/revisions/timestamps are excluded.

If candidate and current hashes match, Fluxer also compares canonical bytes/objects; a hash alone is never equality authority. A prospective identity allocation, key claim, dormant/reactivation transition, targeting change, or approval-relevant authority change cannot be a no-op. Exact equality returns the current endpoint object/status and revisions with `Fluxer-Publication-Status: unchanged`. It writes no revision/head/history/audit row, sends no publication/catalog event, and invalidates no cache. A no-change draft remains available until explicitly edited/discarded.

An explicit stale expected manifest/draft/head version returns the existing conflict before no-op success, even when the caller's candidate equals the newer head. For compatible calls without a precondition, if the head changes before CAS, the server rereads once: exact equality between the newly current state and the already validated complete candidate returns no-op; any difference returns `COMMAND_MANIFEST_CONFLICT`. It never rebases a partial PATCH or merges manifests. POST-upsert/PATCH/bulk success bodies/statuses remain compatible; DELETE of an already absent/dormant active resource keeps the compatible unknown-resource result.

## Immutable immediate publication

Every state-changing POST/PATCH/DELETE/PUT creates a complete new immutable published manifest even though the compatibility API appears to mutate commands immediately:

1. Read the expected manifest head.
2. Build the complete candidate snapshot in memory.
3. Validate limits, schema, category registry/membership, authority, targets, and identity uniqueness.
4. Return the QAD-232 no-op result if the canonical complete state equals the head.
5. Write changed immutable command/category revisions and the complete manifest entry partitions.
6. Compare-and-set the application manifest head.
7. Emit one publication event and return objects from the committed head.

No command becomes visible before the head advances. A concurrent head change returns `COMMAND_MANIFEST_CONFLICT`; callers refetch/retry. The server does not silently merge two bulk publications.

DELETE marks the stable command dormant and removes it from the new head; it does not delete community configuration or its key mapping. Re-registering the same key publishes a new revision and restores the same identity/settings subject to current approval.

## Retention and explicit identity retirement

Registration rejects creation of identity 1,001 for an application. Ordinary command deletion remains reversible and keeps the identity. A separate owner-only retirement operation succeeds only after the command is absent from the retained 20-manifest window and 5 optional pins and no guild configuration, user preference, active interaction, or other reference remains. Retirement failure reports only the blocking category, not another user’s private data. Reuse of the developer key afterward creates a new identity with no inherited settings.

Recovery may select only one of the newest 20 manifests or 5 pinned manifests and always publishes a new manifest rather than mutating history.

## Developer dashboard composition

QAD-233 adds no dashboard-specific writer or source table. The authenticated application-owner UI composes the current command/category reads, manifest/draft heads, validation/diff, targeting, identity retirement, retained-history/recovery, installation/suspension, and transport-health services. Every mutation calls the same endpoint/service used without the dashboard and supplies the same expected versions. Bot-token registration authority does not authenticate the human dashboard.

The dashboard may export only application-owned canonical registry/candidate metadata. Safe approval/retirement summaries return bounded status categories/counts; they exclude user preferences/usage, private community audience rules, guild-audit detail, command/interaction values, credentials, tokens, and another person's identity. Suspension limits the dashboard to the reads and credential/transport repair allowed by the suspension contract; ownership loss/deletion fails authorization on every deep link and request.

## Deferred SDK consumer boundary

If QAD-237's later project gates are met, a TypeScript SDK consumes these same public request/response/OpenAPI schemas and canonical fixtures. Its registration helper must require an explicit method call, expose QAD-232 `unchanged` status and every validation/expected-version/rate result, and never register on import/construction, silently retry an ambiguous publication, rebase a PATCH, or maintain a competing manifest source. Raw endpoint use and compatible Discord-library registration remain documented/supported.

## Authorization

- The owning application's bot token may register its commands.
- Fluxer's developer UI may register through the authenticated application-owner path.
- A future client-credentials token may use the Discord-compatible command-update scope, but the initial stack does not invent a broad user token.
- Community managers configure invocation and aliases through community settings; they cannot publish application schemas through these endpoints.

## Evidence

- Fluxer's current OAuth application model binds one bot token and owner to one application.
- Fluxer's rows and repository helper already carry/read/increment integer versions as change metadata, but the helper patches unconditionally and provides neither expected-version compare-and-set nor a monotonic concurrency guarantee. F1 supplies the conditional primitive required by this contract.
- QAD-109 fixes one application-wide schema, QAD-110 permits community targeting, and QAD-112/QAD-113 require immutable automatic revisions behind immediate and staged publication.
- Discord documents the compatible endpoint and POST-upsert/bulk-overwrite shapes at https://docs.discord.com/developers/interactions/application-commands.
