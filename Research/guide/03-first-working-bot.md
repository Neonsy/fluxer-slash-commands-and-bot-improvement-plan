# First Working Bot

## From setup to first response

The first milestone uses a conventional Discord-compatible bot from application creation through its first public slash-command response. It needs no Fluxer-only command option, structured action, ephemeral message, or SDK.

The example application is called `Greeter`, with handle `greeter`. It publishes `/hello`, installs into one community, receives interactions over the Gateway, and answers with a public message.

This is planned work. Current Fluxer can create the application, add its bot member through OAuth, and authenticate that bot. It cannot yet register third-party commands, persist an installation, dispatch an application interaction, or accept an interaction callback.

## Before the developer starts

The platform foundations must already exist:

- Conditional database updates with equivalent behavior on supported backends
- Rollout controls that start disabled and code that can read both old and new data
- Durable installation lifecycle and managed roles
- Application attribution, suspension, cleanup, and restore protection
- Application handles and immutable command manifests
- Interaction schemas, response-token storage, and one selected delivery transport
- Provider-aware discovery with server preflight

Those are implementation prerequisites, not extra steps for the developer.

## Step 1: Create the application

The developer submits the existing application-creation shape and may include the additive handle `greeter`. A compatible client that sends only the display name still works. Fluxer derives and claims a deterministic handle when it is omitted.

The creation operation:

1. Authenticates the default user, applies CAPTCHA, and consumes the existing 10-per-hour create-route budget
2. Conditionally reserves one of the owner's 50 application slots
3. Allocates one immutable application ID and the corresponding bot identity
4. Conditionally reserves the handle for that exact operation
5. Creates or verifies the bot and application rows
6. Stores credential hashes
7. Marks the application active only when every required resource agrees
8. Returns plaintext credentials only from a successful activation

If creation fails, generated credentials are revoked and operation-owned resources are removed idempotently. The capacity slot stays reserved while cleanup is ambiguous. A retry with the same operation reuses its claims. It cannot overwrite another application's handle or create a second bot.

A lost success response does not make plaintext credentials recoverable. The owner uses the existing credential-rotation path.

## Step 2: Choose interaction delivery

This example uses Gateway delivery.

The bot connects with its existing bot token. `INTERACTION_CREATE` is a normal dispatch and requires no interaction intent. A compatible bot does not need to request a Fluxer capability for the base interaction path.

An application may instead choose verified outgoing HTTP, but only one mode is active at a time. Switching transport is version-checked and affects new interactions only. Fluxer never sends one interaction over both modes or silently fails over between them.

## Step 3: Install the application

`Greeter` has not published the optional `required_bot_permissions` field, so the OAuth invite remains in portable invite mode. The invite requests exactly `View Channel` and `Send Messages` through the standard `permissions` parameter.

The community manager has `Manage Guild` and personally holds both requested permissions. Consent captures the normalized permission set, application, community, installer, source mode, and expiry. Commit rechecks current authority and the captured source before any installation mutation.

Fluxer then:

1. Conditionally claims the stable community and application relationship as `INSTALLING`
2. Stores a new internal generation, operation ID, managed-role ID, and approved permission set
3. Creates or verifies the one managed role with those permissions
4. Adds or verifies the bot member
5. Assigns or verifies the managed role on that bot
6. Rereads role ownership, member identity, assignment, permission ceiling, and suspension state
7. Conditionally moves the relationship to `ACTIVE`

OAuth reports success only after the installation commits the `ACTIVE` state. A request that times out or reports failure cannot later complete the installation in the background. Cleanup may continue after failure, but the installation cannot become active.

Editing the URL to add `Administrator` fails because an invite-mode installer without `Administrator` may approve only requested bits they currently hold. That failed consent changes neither role authority nor the relationship ceiling.

## Step 4: Register `/hello`

The bot uses the familiar community command route and sends a chat-input command definition without Fluxer-only fields.

If the request omits `key`, Fluxer derives a normalized immutable developer key from the initial name and returns it. The command also receives a stable Snowflake for compatible endpoint use. A later display-name change does not change either identity.

The community route is a compatibility view over one application-wide schema. For this first registration it publishes the definition and adds the community to the command's target set. A later community-scoped write with a different definition for the same stable key would return `COMMAND_SCHEMA_CONFLICT` rather than create a per-community schema fork.

Before the command becomes visible, Fluxer:

1. Reads the current manifest head
2. Constructs and validates a complete candidate manifest
3. Reserves stable identities as needed
4. Writes immutable command and manifest revisions
5. Conditionally advances one manifest head
6. Freezes the still-owned `greeter` handle at the first successful publication boundary
7. Emits one publication event

A losing concurrent publication cannot expose partial command state. It returns a manifest conflict. A semantically identical request still authenticates, validates, and consumes its route budget, then returns the current result with `Fluxer-Publication-Status: unchanged` and creates no revision, event, audit row, or cache invalidation.

Because the command omits every Fluxer authority field, it normalizes to ordinary bot behavior:

```text
execution_mode: AS_BOT
allowed_native_operations: []
structured action broker: disabled
```

The bot may later call ordinary bot-authenticated API routes. Those routes derive the bot from its token and enforce the bot's current permissions and hierarchy. They do not inherit the invoking member's authority.

## Step 5: Discover the exact provider

The member types `/hello` in a channel where both the member and bot have the required access.

The picker returns the command with visible `Greeter` attribution. If another provider also publishes `/hello`, both remain separate choices under whichever collision design is selected after product and accessibility testing. Only an explicit applicable provider preference may auto-resolve a duplicate. Favorites, community recommendation, and passive usage affect order but never dispatch automatically.

Selecting the result binds application ID and command ID in a structured composer item. It does not rely on the rendered name. The item remains removable with keyboard controls.

The exact qualified spelling is also available:

```text
/greeter:hello
```

That spelling resolves the provider unambiguously, but it does not bypass installation, targeting, policy, channel access, permission, suspension, or capability checks.

## Step 6: Submit the command

Picker visibility is only a preview. On submission the server rereads:

- Application and handle ownership where relevant
- Current command manifest head and command revision
- Target state
- Developer availability
- Category and per-command community policy
- Current channel and audience rules
- Invoking member permissions
- `ACTIVE` installation state and generation
- Application and installation suspension
- Client and application capabilities
- Submitted schema version and option values

A stale or manipulated submission fails before application delivery. The response may include correction data, but it does not reveal private targeting or policy details to a member.

If every check passes, Fluxer creates one trusted interaction record and one opaque response token. The record binds the application, command revision, invoker, community, channel, installation generation, response deadlines, and selected Gateway transport. Untrusted client fields cannot replace those values.

## Step 7: Receive the interaction

The Gateway sends one `INTERACTION_CREATE` payload to the bot session responsible for the community. It uses the compatible interaction shape and includes additive Fluxer metadata such as the immutable command key, revisions, trace ID, and absolute deadlines.

The payload may include server-derived member and application permission snapshots. They are marked non-authoritative. They help the bot render useful choices, but a later REST or structured native effect must check current state again.

Gateway replay after resume uses the same interaction ID. It does not create a new response opportunity. The initial callback claim deduplicates delivery replay.

## Step 8: Send one public response

The bot sends callback type `4`, `CHANNEL_MESSAGE_WITH_SOURCE`, to the compatible callback route within three seconds.

Fluxer atomically claims the initial response for that interaction, creates one ordinary public channel message with bot and application attribution, and records the result. A byte-equivalent retry after canonical parsing returns the existing result. A different second callback receives `INTERACTION_ALREADY_ACKNOWLEDGED` and cannot create another message.

If the bot needs more time, callback type `5` may defer within the same three-second deadline. The application then has up to fifteen minutes from interaction creation to complete the response. Deferring is an acknowledgement, not proof that the application workflow succeeded.

The interaction may create at most five total follow-up messages during that response-authority window. A compatible client that omits `X-Idempotency-Key` gets one message per accepted follow-up request and is not promised retry deduplication. Supplying a safe 1-to-64-character key makes same-key, same-body retries return the original result. Reusing the key with different content conflicts.

After a successful invocation, personalization may update only the bounded member, community, and command ranking signal plus `last_used_at`. It stores no arguments, option values, response or message content, or recallable command history.

## Step 9: Preserve current authorization

Successful command invocation does not grant the bot new permissions.

If the member loses channel access before another submission, the server denies the new command even when a stale client still displays it. If the bot loses `Send Messages` before a bot-authenticated effect or public response that requires it, the current bot-authority check fails. A delivered permission snapshot cannot restore either permission.

The application may explain a failure within safe audience limits. It cannot claim that picker presence, command registration, or an interaction token grants general API authority.

## Step 10: Uninstall safely

The community owner, `Administrator`, or `Manage Guild` may uninstall the application.

The lifecycle transition from `ACTIVE` to `UNINSTALLING` immediately blocks application API, Gateway, command, interaction, settings, response-token, and delegated-capability authority in that community. Physical cleanup then detaches the managed role, removes the installation-owned bot member, deletes the installation-owned role, and verifies absence before moving to `DORMANT`.

Community-owned command settings remain dormant. A later reinstall creates a new generation and a new managed-role ID after a fresh review. It cannot revive the old interaction, response token, component state, or approval. It also cannot raise the retained permission ceiling without the stronger owner or `Administrator` path.

## Failure and concurrency behavior

| Event | Required result |
| --- | --- |
| Two application creations race for slot 50 | Only one operation can reserve it. |
| Two applications claim `greeter` | Conditional ownership lets one succeed. The other receives the same unavailable result used for reserved handles. |
| Application creation fails after a credential or bot exists | Credentials revoke and deterministic cleanup runs. No partially active application is exposed. |
| Consent source or captured permission set changes before commit | No install mutation occurs. Review restarts from current data. |
| Install cannot reach `ACTIVE` in 15 seconds | It enters rollback and reports failure. It never activates later. |
| Role creation, membership, or assignment partially succeeds | Rollback attempts every independently safe owned cleanup and verifies the result. |
| Two installation operations conflict | The same operation ID is idempotent. A different operation receives `409 Conflict`. |
| Two manifest publications race | One head compare-and-set wins. The other refetches after conflict. |
| Gateway redelivers one interaction | The interaction ID and initial callback claim prevent a second response. |
| Initial callback arrives after 3 seconds | It receives `INTERACTION_ACK_DEADLINE_EXPIRED`. |
| Response mutation arrives after 15 minutes | It receives `INTERACTION_RESPONSE_AUTHORITY_EXPIRED`. Existing public content remains under message lifecycle. |
| Uninstall cleanup fails | Authority stays revoked. The installation remains visibly retryable and cannot return to `ACTIVE` through cleanup retry. |

## Compatibility promise and deliberate limits

For this path, the application can keep its compatible command model, interaction handler, callback routes, and bot REST authorization behavior. Migration should change credentials and endpoint or version configuration, not rewrite the handler into a Fluxer-specific payload.

The compatibility claim is bounded:

- Only community chat-input commands are in the first scope
- Community command routes target the one application-wide schema instead of creating divergent per-community definitions
- Follow-ups are capped at five
- Version checks and clear optional idempotency guarantees strengthen mutation behavior
- Installation lifecycle, managed roles, suspension, cleanup, and current-state checks are automatic Fluxer safeguards
- Direct-message, user-installed, context-command, and Activity features remain unsupported

The compatibility suite must use shared raw fixtures, real API and Gateway boundaries, and a pinned `discord.js` bot configured for Fluxer without rewriting compatible command or handler shapes.

## Acceptance checklist

The first bot is ready when tests prove all of the following:

- Application creation cannot oversubscribe the owner cap or leave reusable credentials after partial failure
- Handle creation, first-publication freeze, and later deletion release preserve identity
- Invite-mode consent retains current held-permission checks
- Install success means the relationship is fully `ACTIVE`
- A failed install cannot activate a bot later
- One managed role exists even for a zero-permission installation
- Registration through compatible global and community routes publishes one complete immutable schema
- Publishing an unchanged definition creates no history entry
- Duplicate providers remain visibly and structurally distinct
- Selection binds stable provider and command IDs
- Submission rechecks current installation, suspension, policy, schema, channel, and permissions
- Gateway delivery and replay use one interaction identity
- Exactly one initial callback wins within three seconds
- Public response attribution, follow-up bounds, idempotency, rate limits, and fifteen-minute expiry behave as documented
- Uninstall revokes before cleanup and reinstall cannot revive old authority
- The pinned compatible bot completes the full sequence through production service boundaries

## When this will be built

The first end-to-end compatible response is not one pull request.

- `F1` supplies the compare-and-set primitive used by installation and publication.
- Stage `I` owns installation state, managed roles, permission sources, and community install management.
- Stage `S` owns causal attribution, suspension, restore safety, and report lifecycle prerequisites.
- `C1` and `C2` own recoverable creation, handles, command storage, and compatible registration. `C3` owns community command policy.
- `E1` defines the new interaction contracts and updates Rust and Erlang to read both old and new data. `E2` enables delivery. `E3` enables public responses and a test that runs a pinned compatible bot through a complete interaction and response.
- `P1` preserves native command behavior under a provider-aware adapter. `P2` exposes the third-party command picker after the collision design is approved from prototype evidence.

The public command picker is not released before full server-side authorization against current state. Interaction creation and delivery are not released until every affected service can read the new interaction data.

## Continue reading

- Previous: [System model](02-system-model.md)
- [Research index](../README.md)
- Next: [Applications and installations](04-applications-and-installations.md)
