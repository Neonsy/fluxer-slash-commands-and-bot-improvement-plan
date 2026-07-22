# Verified Current State

This baseline was verified on **2026-07-22 UTC** at commit **`fd62b46faf3505d738f6d5800e787473b14cacd6`**, whose subject was `fix(devcontainer): wait for documentation server readiness`. The first investigation used the same commit on 2026-07-20 UTC.

Unless marked as an inference, each statement is a verified baseline fact. Planned capabilities are listed separately.

Short source notes point to the code, tests, and policy text used to check each section. Every link is pinned to the baseline commit, so it will keep showing the material that was reviewed even after the product repository changes.

The [orientation](../guide/01-orientation.md) explains how this baseline relates to the planned product. The [glossary](glossary.md) defines the recurring terms used here.

## Repository snapshot

At verification time:

- The `Neonsy/fluxer` working clone was on `main` at the pinned commit with no tracked or untracked changes.
- Local `main` and fetched `origin/main` pointed to the same commit.
- The baseline tree and every local or fetched remote ref available at verification time contained no tracked `Research/` path.
- No local or fetched remote ref available at verification time was named `implementation-plan`.
- A global Git ignore rule matched `Research/` case-insensitively.
- The repository used a pnpm workspace.
- Shared TypeScript wire schemas lived in the private `@fluxer/schema` package with hand-authored Zod schemas and generated protobuf TypeScript.
- The private `@fluxer/openapi` package generated and validated public and administrative OpenAPI documents from route and schema sources.
- The tree contained no official Fluxer command SDK package or public TypeScript client generator.

These repository and branch statements describe the pre-publication snapshot only. They do not predict later branch or worktree state.

> **Checked in the pinned source:** the [source tree](https://github.com/Neonsy/fluxer/tree/fd62b46faf3505d738f6d5800e787473b14cacd6), [workspace package list](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/pnpm-workspace.yaml#L1), [schema generator](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/packages/schema/package.json#L14), and [OpenAPI generator](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/packages/openapi/src/scripts/GenerateSpec.ts#L65).

## Applications

The existing public `POST /oauth2/applications` flow calls `ApplicationService.createApplication` and creates:

- One application Snowflake
- One bot `UserRow`
- One application record
- Bot and client credentials

The bot user ID has the same numeric value as the application ID. The application creation integration test verifies that the returned bot credential authenticates as that bot user.

The persisted `ApplicationRow` contains owner and name, bot settings, OAuth redirect URIs, hashed client and bot credentials, credential timestamps, and a row version. It contains no command manifest, installation lifecycle, community relationship, interaction transport, callback URL, real interaction signing key, suspension, or declarative administration fields.

`GET /oauth2/applications/@me` exposes `verify_key`, but the baseline implementation always returns a compatibility placeholder of 64 zeroes. It is not a persisted application verification key.

### Current creation controls

- The per-owner cap is **25 applications**.
- Creation first lists the owner's applications, rejects when the count is at least 25, and then performs a separate create.
- The public route requires an authenticated default user and CAPTCHA.
- The route bucket is **10 creation requests per hour**.

The count and create are separate service calls. Two concurrent callers can therefore observe the same remaining slot. This is a direct concurrency inference from the code, not a reproduced race. The plan's conditional slot reservation and cap of 50 do not exist in this baseline.

> **Checked in the pinned source:** [`ApplicationService.createApplication`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/oauth/ApplicationService.ts#L100), [`ApplicationRow`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/database/types/OAuth2Types.ts#L5), the [current owner-cap check](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/oauth/OAuth2ApplicationsRequestService.ts#L69), the [creation route and its safeguards](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/oauth/OAuth2ApplicationsController.ts#L72), and the [10-per-hour route limit](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/rate_limit_configs/OAuthRateLimitConfig.ts#L31).

## OAuth placement and bot roles

OAuth consent performs community placement inline:

- Guild consent calls `GuildMemberService.addUserToGuild`.
- Group DM consent calls `GroupDmOperationsService.addBotRecipientToChannel`.
- A second guild authorization for the same application returns `BotAlreadyInGuildError` and HTTP 400.
- A repeated group DM authorization is an idempotent no-op when the recipient is already present.

For guild installation, the baseline:

1. Validates the invite request
2. Adds the bot member
3. Creates and assigns an ordinary role only when normalized requested permissions are greater than zero

The invite authority rule requires `Administrator` or `Manage Guild`. A non-administrator may authorize only requested permission bits the actor already possesses. An administrator may authorize any known bot permission.

The created role is an ordinary `GuildRoleRow`. It has presentation, permissions, position, and version fields. It has no managed kind, application ID, installation ID, owner, or generation. Existing role update and delete paths may mutate or delete it under ordinary `MANAGE_ROLES` and hierarchy checks.

Guild member rows contain generic join provenance such as `BOT_INVITE` and inviter identity. They do not identify which role the OAuth flow created.

### What is not present

The baseline has no:

- Application-installation aggregate
- Application-to-community relationship row
- Installation lifecycle state or generation
- Application-to-role ownership association
- Mandatory role for zero-permission bots
- Install rollback state or deterministic cleanup ledger
- Application-role reconciler
- Managed-role membership, deletion, or position protection

### Current removal and deletion behavior

Removing a bot deletes its guild member row. Role assignments disappear with membership, but the separately keyed ordinary role is not deleted by that path.

Reauthorizing later adds the same application-derived bot user. If nonzero permissions are requested, a fresh role Snowflake is allocated without searching for an earlier OAuth-created role. An old ordinary role can remain unassigned.

Permanent application deletion removes the bot from every guild, anonymizes the bot user, deletes the application, and invalidates the stored bot credential. It cannot identify and remove OAuth-created roles because no ownership association exists.

> **Checked in the pinned source:** [`OAuth2RequestService.authorizeConsent`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/oauth/OAuth2RequestService.ts#L191), [`canAuthorizeBotInvite`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/packages/constants/src/BotPermissionUtils.ts#L17), [`GuildRoleRow`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/database/types/GuildTypes.ts#L165), [`GuildRoleService`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/guild/services/GuildRoleService.ts#L67), and the [application deletion test](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/oauth/tests/OAuth2ApplicationDelete.test.ts#L22).

## Commands and discovery

The React client owns a fixed local slash-like command array. It includes message transforms and commands such as `/nick`, `/kick`, `/ban`, `/msg`, `/saved`, `/sticker`, and `/gif`.

Discovery and execution are local or name-based:

- Composer discovery filters the client array by text, channel type, and optional permission hints.
- Parsing and option autocomplete use hard-coded command names and regular expressions.
- Composer submission executes recognized native commands before ordinary message send.
- Moderation commands call existing API modules, whose services repeat permission and hierarchy checks.

The current command union contains only `simple` and `action` entries with local display metadata. It has no provider identity, stable application command key, typed options, categories, manifest, publication head, community policy, target set, alias, execution mode, or native-operation allowlist.

The picker uses a case-insensitive substring filter and local array order. Rows show only command name and description. It has no provider attribution, collision grouping, favorites, provider preference, community recommendation, or passive usage ordering.

The reusable autocomplete UI already provides a useful accessibility precedent:

- ARIA listbox and option semantics
- Active-descendant wiring
- Looping arrow navigation
- Home and End support
- Enter and forward-Tab selection
- IME composition guards

This does not prove any planned multi-provider collision design.

> **Checked in the pinned source:** the [client command list](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_app/src/features/devtools/hooks/useCommands.ts#L80), [command filtering](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_app/src/features/messaging/utils/SlashCommandUtils.ts#L118), [command parsing and execution](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_app/src/features/devtools/utils/CommandUtils.ts#L71), and the [accessible autocomplete list](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_app/src/features/channel/components/Autocomplete.tsx#L237).

## Existing synchronized preferences

Account settings contain one opaque size-checked `synced_preferences` snapshot. Account and per-community settings use separate rows keyed by user and by user plus community. Updates propagate through current Gateway events, and the React client has dedicated code for encoding and merging the synchronized snapshot.

The repository provides explicit account, per-community, and all-community deletion methods. The rows have no inactivity expiry or database TTL.

There is no command-specific hiding, favorite, provider preference, community recommendation, passive usage score, or reset model in the baseline. The existing system is evidence for synchronization and ownership patterns only.

The account profile also has an IANA timezone field and validator, but it is staff-only in the baseline. `GuildRow` has no community timezone. An ordinary user therefore has no verified stored account or community timezone fallback for planned temporal command input.

> **Checked in the pinned source:** [`UserSettingsRow`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/database/types/UserTypes.ts#L225), [synchronized preference updates](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/user/services/UserAccountSettingsService.ts#L262), the [client preference codec and merge logic](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_app/src/features/user/state/SyncedPreferencesEngine.ts#L174), and the [staff-only timezone gate](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/user/UserHelpers.ts#L271).

## Authentication and authority

Bot credentials are validated against the application's stored bot-token hash and produce the bot `User` in request context. Native guild services receive one authenticated `userId` whether the credential was a user session or a bot token.

Current services do not receive:

- A delegated interaction invoker
- An application execution mode
- A structured native-operation declaration
- A delegated capability
- A user-and-bot combined principal

Ordinary bot REST calls are therefore bot-authority calls. Client permission filtering is only a discovery hint. The API service remains authoritative for permissions, hierarchy, targets, and other endpoint invariants.

The current guild audit model has a user actor, target, numeric action, reason, options, and JSON changes. It has no first-class application, bot, invoker, command revision, interaction, authority mode, capability, causation chain, confirmation, or partial-effect fields.

Audit rows use a 45-day TTL. Current message-delete batching can remove qualifying individual audit rows and replace them with one bulk record. The planned causal audit rows and their compaction exclusion do not exist.

> **Checked in the pinned source:** the [bot credential branch in request authentication](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/middleware/UserMiddleware.ts#L158), [`BotAuthService.validateBotToken`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/oauth/BotAuthService.ts#L31), [`GuildAuditLogRow`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/database/types/GuildTypes.ts#L143), and the [45-day audit retention](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/guild/repositories/GuildModerationRepository.ts#L44).

## Messages and Gateway

Current messages are ordinary channel-oriented resources. They affect message history and can be indexed, harvested, and dispatched to channel audiences. There is no recipient-scoped application ephemeral message object.

Message data crosses shared Zod response schemas, TypeScript API and persistence services, the Rust code that reads messages, Erlang Gateway dispatch, and React models. Current TypeScript and Rust message shapes are manually mirrored.

Internal message rows carry an integer `version`, but public request and response schemas expose no concurrency version. `executeVersionedUpdate` reads a row, computes the next version, and then patches by primary key without conditioning on the observed version.

Two concurrent updates can derive the same next version, and an update based on older data can write an older derived value. The current version is change metadata, not a compare-and-set guarantee.

Bot tokens can authenticate Gateway sessions. The API and Erlang dispatch-event registries contain ordinary guild, channel, message, presence, relationship, and voice events. They contain no application interaction event.

Applications have no persisted HTTP interaction endpoint, delivery mode, signing key, key rotation, endpoint health, or capability negotiation.

The repository contains no Flutter source or project. It points to a separate Flutter client repository. The in-repository React app has a mobile-browser layout that enables at 640 pixels and disables at 768 pixels.

> **Checked in the pinned source:** [`MessageRow`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/database/types/MessageTypes.ts#L128), [`executeVersionedUpdate`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/database/CassandraVersionedUpdate.ts#L7), the [API Gateway event union](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/constants/Gateway.ts#L3), the [Gateway event map](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_gateway/src/utils/event_atoms.erl#L32), and the [React mobile breakpoints](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_app/src/features/ui/state/MobileLayout.ts#L9).

## Existing outbound delivery and timing code

The shared outbound endpoint helper can require HTTPS, reject URL credentials, query, fragment, localhost, selected private or special IP literals, and absolute replacement paths. Its literal-IP list is not a complete public-address classifier. Another package provides broader public-IP classification, but the endpoint helper does not compose it with hostname resolution, pinning, redirect revalidation, and connect-time checks.

No application callback delivery client exists in the baseline. The planned deadline-owned dispatcher and its SSRF controls are new work.

Existing JetStream lanes use explicit acknowledgement with waits of:

- 15 seconds for realtime
- 30 seconds for unfurl
- 60 seconds for lifecycle
- 120 seconds for batch

Lane delivery limits are 3 or 25. These settings show how Fluxer handles durable background work today. They do not meet or prove the planned three-second interaction acknowledgement contract.

> **Checked in the pinned source:** the [outbound endpoint checks](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/packages/hono/src/security/OutboundEndpoint.ts#L12), the broader [`isPublicIpAddress` helper](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/packages/ip_utils/src/IpAddress.ts#L308), [worker lane timing](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/worker/WorkerLaneConfig.ts#L14), and [JetStream consumer setup](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/worker/JetStreamWorkerQueue.ts#L69).

## Existing rate-limit code

- Ordinary authenticated accounts, including bots where applicable, receive a global limit of 50 requests per second unless an existing override applies.
- Current webhook execute and message-read routes use 60 per minute.
- Webhook message edit and delete routes use 30 per minute.
- Those webhook routes are exempt from the ordinary global limit.

There is no interaction, installation, response-token, component, application endpoint, or native-action broker limiter in current route configuration.

> **Checked in the pinned source:** the [global account limit](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/middleware/RateLimitMiddleware.ts#L79) and [webhook route limits](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/rate_limit_configs/WebhookRateLimitConfig.ts#L31).

## Workers and persistence

Background work uses a file-backed, single-replica NATS JetStream work queue and a separate Cassandra human-facing ledger.

- The work stream has a seven-day maximum age.
- Lane delivery limits are 3 or 25.
- The dead-letter stream is single-replica with a 30-day maximum age.
- Job publication occurs before ledger creation.
- A ledger-write failure is logged and swallowed after successful publication.
- Handler effects, ledger state, dead-letter publication, and message acknowledgement are separate operations.
- A crash after an external effect but before acknowledgement can cause redelivery.
- The generic framework has no universal side-effect idempotency record.
- The envelope carries `maxAttempts`, but the worker runner uses the lane's `maxDeliver` instead.
- Administrative job APIs can inspect and cooperatively cancel. The exposed retry implementation returns `false`.

The registered task set includes application deletion. It has no application installation, managed-role reconciliation, installation repair, command registry repair, settings delivery, component outcome, or ephemeral expiry task.

> **Checked in the pinned source:** [JetStream stream setup](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/worker/JetStreamWorkerQueue.ts#L28), [`WorkerService.addJob`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/worker/WorkerService.ts#L22), [`WorkerRunner.processJob`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/worker/WorkerRunner.ts#L170), and the [registered task set](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/worker/WorkerTaskRegistry.ts#L48).

## Reports, privacy, and export

The current in-app report row stores reporter identity, reported-object metadata, a copied message-context window, copied attachment descriptors, resolution data, and warning snapshots. Report attachments are copied into a reports bucket. Report search stores a derived document with identities, categories, names, additional information, and resolution metadata.

The public privacy policy states that report snapshots are kept for up to one year and that object-storage lifecycle rules remove them, subject to rare binding legal obligations. The repository does not show one deletion process that covers the report row, copied objects, deduplication state, and search document.

The report row has no expiry, purge state, policy generation, reopen state, or legal-hold field. The repository can create, read, list, and resolve reports. Search adapters expose delete methods, but no production call site or retention worker was found.

Account harvest exports messages authored by the requesting user, current account settings, decoded synchronized preferences, and per-community settings. It does not export every message the user can view. Because no ephemeral message store exists, it exports no application ephemeral message.

> **Checked in the pinned source:** [`IARSubmissionRow`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/database/types/ReportTypes.ts#L28), [report message and attachment capture](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/report/ReportService.ts#L833), the [public report retention policy](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_marketing/content/policies/privacy.md#L255), and [account message harvest](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/worker/tasks/HarvestUserData.ts#L227).

## Rollout, observability, backup, and recovery

The Gateway already has a reusable private rollout pattern with typed validation, API-owned persistence, administrative updates, RPC fetch, NATS publication, stable percentage selection, and validated subscriber updates. It has no bot-platform rollout layers.

Shared HTTP metrics expose request counters, latency histograms, 5xx counters, and uptime with bounded method and status-class labels. There are no bot-platform SLOs, alert thresholds, rollout checks, application or installation health metrics, or selected observation durations.

The hosted privacy policy states that database backups are encrypted and off-site. Deleted database data can remain in backups for up to 30 days. Deleted attachments have a separate recovery window of up to 24 hours and are not part of long-term backups.

Self-hosting documentation instructs operators to back up environment configuration, the Postgres volume, and the SeaweedFS volume. It recommends native database and object-storage backups for production.

The repository states no numeric RPO, RTO, backup cadence, restore-test cadence, geographic replication promise, or service-wide recovery owner. The planned disaster-recovery contract therefore requires each deployment to select and prove those values. It does not reinterpret current policy retention windows as recovery guarantees.

> **Checked in the pinned source:** the [Gateway rollout configuration](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_gateway/src/gateway/gateway_rollout_config.erl#L118), [shared HTTP metrics](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/packages/hono/src/middleware/Metrics.ts#L109), the [hosted-service deletion and backup wording](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_marketing/content/policies/privacy.md#L231), and the [self-hosting backup guidance](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_docs/docs/operator/get-started.md#L310).

## What still needs to be built

The pinned baseline does not implement the planned:

- Durable installation state machine, managed role, relationship ceiling, or generation
- Application handles and recoverable application creation
- Application command registry, manifests, drafts, targeting, policies, categories, or provider-aware discovery
- Interaction creation, Gateway or HTTP delivery, callbacks, response tokens, or capability negotiation
- Public message compare-and-set, structured component lifecycle, ephemeral messages, or modal ownership
- Declarative community settings, builders, manager attention, or latest-state application delivery
- Delegated native-action broker, trusted confirmation, causal audit, or effect reconciliation
- Targeted application or installation suspension
- Bot-platform reconcilers, non-resurrection journal, recovery hold, or measured deployment recovery requirements
- Bot-platform compatibility corpus, migration smoke client, or official SDK

Those absences are the implementation gap this research plans to close. They must not be presented as current functionality until production code and the required validation exist.

> **Checked in the pinned source:** representative current owners include [`ApplicationRow`](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/database/types/OAuth2Types.ts#L5), the [client command list](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_app/src/features/devtools/hooks/useCommands.ts#L80), the [API Gateway event union](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/constants/Gateway.ts#L3), and the [registered background tasks](https://github.com/Neonsy/fluxer/blob/fd62b46faf3505d738f6d5800e787473b14cacd6/fluxer_api/src/api/worker/WorkerTaskRegistry.ts#L48).
