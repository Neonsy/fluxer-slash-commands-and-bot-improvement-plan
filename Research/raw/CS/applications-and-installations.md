# Applications and Installations

## Applications

- The public `POST /oauth2/applications` path always calls
  `ApplicationService.createApplication`, which allocates one application ID,
  creates one `UserRow` with `bot: true`, and stores that user on the application.
  The creation integration test verifies that the returned bot authenticates as
  that bot user. Evidence:
  `fluxer_api/src/api/oauth/OAuth2ApplicationsController.ts` (`POST
  /oauth2/applications`),
  `fluxer_api/src/api/oauth/ApplicationService.ts` (`createApplication`), and
  `fluxer_api/src/api/oauth/tests/OAuth2ApplicationCreate.test.ts` (`creates
  OAuth2 application with bot user`).
- The bot user ID has the same numeric value as the application ID:
  `ApplicationService.createApplication` calls `applicationIdToUserId`, whose
  implementation rebrands the application ID without changing it. Evidence:
  `fluxer_api/src/api/BrandedTypes.ts` (`applicationIdToUserId`).
- The complete persisted `ApplicationRow` contains owner/name, bot settings,
  OAuth redirect URIs, hashed client/bot credentials, credential timestamps, and
  a row version. It has no command/manifest, installation/lifecycle,
  interaction-transport, callback-URL, or signing-key column. Evidence:
  `fluxer_api/src/api/database/types/OAuth2Types.ts` (`ApplicationRow`,
  `APPLICATION_COLUMNS`) and `fluxer_api/src/api/Tables.ts` (`Applications`).
- `GET /oauth2/applications/@me` exposes `verify_key`, but it is not a persisted
  verification key: `OAuth2RequestService.getApplicationsMe` always returns
  `COMPAT_VERIFY_KEY_PLACEHOLDER`, defined as 64 zeroes. Evidence:
  `fluxer_api/src/api/oauth/OAuth2RequestService.ts`
  (`COMPAT_VERIFY_KEY_PLACEHOLDER`, `getApplicationsMe`) and
  `packages/schema/src/domains/oauth/OAuthSchemas.ts`
  (`ApplicationsMeResponse`).

## Application creation limit and race boundary

- The current per-owner application cap is 25. `createApplication` first lists
  every application owned by the caller, rejects when the returned length is at
  least 25, and then performs a separate create. Evidence:
  `packages/constants/src/LimitConstants.ts`
  (`MAX_APPLICATIONS_PER_USER`) and
  `fluxer_api/src/api/oauth/OAuth2ApplicationsRequestService.ts`
  (`createApplication`).
- That count-before-create sequence has no conditional slot claim, owner-scoped
  lock, or uniqueness condition tying the observed count to the subsequent
  insert. Two concurrent requests can therefore both observe one remaining
  slot; this is a concurrency inference from the two separate service calls, not
  a reproduced runtime race. The QAD-207 conditional-slot design is new rather
  than a description of current enforcement.
- The public creation route is restricted to a default user, requires CAPTCHA,
  and uses an `oauth_dev:clients:create` bucket of 10 requests per hour. These
  controls reduce automated creation but do not make the owner-cap check atomic.
  Evidence: `fluxer_api/src/api/oauth/OAuth2ApplicationsController.ts`
  (`POST /oauth2/applications`, `DefaultUserOnly`, `CaptchaMiddleware`) and
  `fluxer_api/src/api/rate_limit_configs/OAuthRateLimitConfig.ts`
  (`OAUTH_DEV_CLIENT_CREATE`).

## Installation behavior

- OAuth consent performs the placement inline: for a guild it calls
  `GuildMemberService.addUserToGuild`; for a group DM it calls
  `GroupDmOperationsService.addBotRecipientToChannel`. Evidence:
  `fluxer_api/src/api/oauth/OAuth2RequestService.ts`
  (`authorizeConsent`, guild/channel branches).
- A second guild authorization for the same application is rejected with
  `BotAlreadyInGuildError` after a member lookup. The matching integration test
  expects HTTP 400. A second group-DM authorization is different: the recipient
  helper returns the unchanged channel with `recipientAdded: false`, so it is an
  idempotent no-op rather than a rejection. Evidence:
  `fluxer_api/src/api/oauth/OAuth2RequestService.ts` (`authorizeConsent`),
  `fluxer_api/src/api/oauth/tests/OAuth2BotGuildAdd.test.ts` (`should reject
  adding bot that is already in guild`), and
  `fluxer_api/src/api/channel/services/group_dm/GroupDmOperationsService.ts`
  (`addRecipientViaInviteWithResult`).
- There is no application-installation aggregate or application-to-guild role
  association. The application table stores no guild/channel installation data,
  and the guild member row has no application, installation, generation, or
  application-role ownership field. It does retain generic join provenance:
  `join_source_type`, `source_invite_code`, and `inviter_id`; OAuth bot consent
  writes `BOT_INVITE` plus the human installer as inviter. That provenance does
  not identify which ordinary role, if any, the OAuth path created. Evidence:
  `ApplicationRow` in
  `fluxer_api/src/api/database/types/OAuth2Types.ts`, `GuildMemberRow` in
  `fluxer_api/src/api/database/types/GuildTypes.ts`, and
  `fluxer_api/src/api/oauth/OAuth2RequestService.ts` (`authorizeConsent`).
- OAuth creates and assigns a guild role only when normalized requested
  permissions are greater than zero. Evidence:
  `fluxer_api/src/api/oauth/OAuth2RequestService.ts` (`authorizeConsent`) and
  `fluxer_api/src/api/oauth/tests/OAuth2BotGuildAdd.test.ts` (`should add bot
  without permissions when permissions is 0`; `should create role with correct
  permissions and assign to bot`).
- The invite authority gate requires `Administrator` or `Manage Guild`, but a
  non-administrator may authorize only requested permission bits they already
  possess; an administrator may authorize any known bot permission. The unit
  tests explicitly reject an `Administrator` request from a `Manage Guild`-only
  actor and a `Ban Members` request from an actor who lacks it. Evidence:
  `packages/constants/src/BotPermissionUtils.ts` (`canAuthorizeBotInvite`) and
  `packages/constants/src/BotPermissionUtils.test.ts` (`rejects administrator
  requests from users who only have Manage Guild`; `allows non-admin users to
  grant only permissions they already have`; `allows administrators to grant
  any known bot permissions`).
- The created role is an ordinary `GuildRoleRow`. That row has presentation,
  permissions, position, and version fields but no managed kind, application ID,
  installation ID, owner, or generation. `systemCreateRole` writes exactly that
  ordinary row, while normal role update/delete paths can mutate or delete it
  subject to existing `MANAGE_ROLES` and hierarchy checks. Evidence:
  `fluxer_api/src/api/database/types/GuildTypes.ts` (`GuildRoleRow`,
  `GUILD_ROLE_COLUMNS`) and
  `fluxer_api/src/api/guild/services/GuildRoleService.ts`
  (`systemCreateRole`, `updateRole`, `deleteRole`).
- Ordinary role permission updates also reject non-owner permissions the actor
  does not possess, while role mutation remains subject to current hierarchy.
  Evidence: `fluxer_api/src/api/guild/services/GuildRoleService.ts`
  (`resolveRequestedPermissions`, `updateRole`) and
  `fluxer_api/src/api/guild/tests/GuildRoleManagement.test.ts` (`should prevent
  updating role with permissions user does not have`; `should allow owner to
  grant any permissions`).

## Lifecycle limitation

- A generated role cannot be reliably rediscovered from current data by
  application name: role names are mutable, `GuildRoleRow` records no creation
  source/application owner, and `GuildMemberRow`'s generic `BOT_INVITE`/inviter
  provenance does not identify which assigned role the OAuth path created.
  Evidence: the complete row types above, `OAuth2RequestService.authorizeConsent`,
  and `GuildRoleService.updateRole`.
- Kicking/removing a bot deletes its guild-member row. Role assignments disappear
  with that row, but the separately keyed guild-role row is not deleted by the
  member-removal path. Evidence:
  `fluxer_api/src/api/guild/services/member/GuildMemberOperationsService.ts`
  (`removeMember`) and
  `fluxer_api/src/api/guild/repositories/GuildMemberRepository.ts`
  (`deleteMember`).
- Reauthorizing after removal adds the same application-derived bot user. If
  nonzero permissions are requested, `GuildRoleService.systemCreateRole`
  allocates a fresh Snowflake and does not search for the earlier role. The old
  ordinary role can therefore remain unassigned. Evidence:
  `applicationIdToUserId`, `OAuth2RequestService.authorizeConsent`, and
  `GuildRoleService.systemCreateRole`.
- Application deletion removes the bot from every guild, anonymizes the bot user,
  deletes the application record, and invalidates its stored bot credential. Its
  removal loop deletes member rows only; there is no application-role association
  from which it could delete OAuth-created roles. Evidence:
  `fluxer_api/src/api/oauth/ApplicationService.ts` (`deleteApplication`),
  `fluxer_api/src/api/user/repositories/account/UserGuildRepository.ts`
  (`removeFromAllGuilds`), and
  `fluxer_api/src/api/oauth/tests/OAuth2ApplicationDelete.test.ts` (`deletes
  application and invalidates bot token`).

## Current settings and developer surfaces

- Community settings has a permission-filtered `Roles` tab requiring
  `MANAGE_ROLES`. Its `Integrations` category currently contains only the
  `Webhooks` tab, gated by `MANAGE_WEBHOOKS`; there is no application-command
  policy editor or command-policy deep-link target. Evidence:
  `fluxer_app/src/features/user/components/settings_utils/GuildSettingsConstants.ts`
  (`GuildSettingsTabType`, `GUILD_SETTINGS_TABS_DESCRIPTORS`) and
  `fluxer_app/src/features/guild/components/modals/GuildSettingsModal.tsx`
  (`availableTabs`, `handleExternalNavigate`).
- Channel settings currently exposes Overview, Permissions, Invites, and
  Webhooks. The Permissions tab requires `MANAGE_ROLES`; there is no command
  policy reference count, application/command identity, or link into community
  Integrations. Evidence:
  `fluxer_app/src/features/user/components/settings_utils/ChannelSettingsConstants.ts`
  (`ChannelSettingsTabType`, `CHANNEL_SETTINGS_TABS_DESCRIPTORS`) and
  `fluxer_app/src/features/channel/components/modals/ChannelSettingsModal.tsx`.
- The owned-application detail UI currently renders secrets/token rotation,
  application information and redirect URIs, bot profile, an OAuth2 URL builder,
  and application deletion. The corresponding applications controller exposes
  owned-list/current/create/get/update/delete and bot-profile operations. Neither
  surface has command definitions, validation/diff, publication history,
  targeting, suspension/transport health, rollback, or a command dashboard.
  Evidence:
  `fluxer_app/src/features/user/components/modals/tabs/applications_tab/ApplicationDetail.tsx`
  (`SecretsSection`, `ApplicationInfoSection`, `BotProfileSection`,
  `OAuthBuilderSection`, danger section) and
  `fluxer_api/src/api/oauth/OAuth2ApplicationsController.ts` (complete route
  registration).
