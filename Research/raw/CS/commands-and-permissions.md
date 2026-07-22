# Commands and Permissions

## Existing commands

- The React client implements a fixed local slash-command list including message
  transforms and `/nick`, `/kick`, `/ban`, `/msg`, `/saved`, `/sticker`, and
  `/gif`. This is a hook-returned client array, not an application command
  registry. Evidence: `fluxer_app/src/features/devtools/hooks/useCommands.ts`
  (`useCommands`).
- Composer discovery reads that local array and filters it by text, channel type,
  and optional client-side permission metadata. Evidence:
  `fluxer_app/src/features/messaging/hooks/useTextareaAutocomplete.ts`
  (`useCommands`, `canUseCommand`, command autocomplete case) and
  `fluxer_app/src/features/messaging/utils/SlashCommandUtils.ts`
  (`filterCommandsByQuery`).
- Parsing and argument autocomplete are hard-coded by command name. For example,
  `parseCommand` branches on literal `/kick`, `/ban`, and `/msg`, and the
  autocomplete regular expressions enumerate those same names. Evidence:
  `fluxer_app/src/features/devtools/utils/CommandUtils.ts` (`parseCommand`) and
  `fluxer_app/src/features/messaging/utils/SlashCommandUtils.ts`
  (`COMMAND_ARG_MENTION_REGEX`, `COMMAND_ARG_REGEX`).
- The composer submit path parses and executes recognized native commands before
  falling through to ordinary message send; moderation commands call the
  existing guild/member HTTP command modules. Evidence:
  `fluxer_app/src/features/messaging/hooks/useTextareaSubmit.ts` (the
  `parsedCommand` branch) and
  `fluxer_app/src/features/devtools/utils/CommandUtils.ts` (`executeCommand`).
- The persisted application model has no command definitions, immutable command
  identity, manifest, alias, publication head, or community command policy.
  Evidence: the complete `ApplicationRow` and `APPLICATION_COLUMNS` in
  `fluxer_api/src/api/database/types/OAuth2Types.ts` and the application tables
  in `fluxer_api/src/api/Tables.ts`.

## Current autocomplete and option boundary

- The current `Command` union has only `simple` and `action` entries containing
  a local name/description plus optional content, permission, and guild
  requirement. It has no application/provider identity, stable command key,
  typed option definition, multi-value cardinality, conditional relationship,
  temporal type, or category membership. Evidence:
  `fluxer_app/src/features/devtools/hooks/useCommands.ts` (`Command`,
  `useCommands`).
- Command discovery uses a case-insensitive substring filter and retains the
  local array order after client permission filtering. Each command result is
  keyed by its name and renders only that name and description; there is no
  provider attribution, collision grouping, community recommendation, favorite,
  or preferred-provider control. Evidence:
  `fluxer_app/src/features/messaging/utils/SlashCommandUtils.ts`
  (`filterCommandsByQuery`),
  `fluxer_app/src/features/messaging/hooks/useTextareaAutocomplete.ts` (the
  `command` branch), and
  `fluxer_app/src/features/channel/components/AutocompleteCommand.tsx`.
- The reusable autocomplete is already an ARIA listbox with option rows, active
  descendant wiring in the textarea, looping arrow navigation, Enter/forward-Tab
  selection, and IME-composition guards. The floating list also supports
  Home/End. This is an accessibility and interaction precedent, not evidence for
  any multi-provider collision layout or extra provider-cycling shortcut.
  Evidence: `fluxer_app/src/features/channel/components/Autocomplete.tsx`,
  `AutocompleteItem.tsx`,
  `fluxer_app/src/features/channel/components/textarea/TextareaInputField.tsx`,
  and
  `fluxer_app/src/features/messaging/hooks/useTextareaAutocompleteKeyboard.ts`.

## Current timezone precedent

- `UserRow` stores optional `timezone` and `timezone_privacy_flags`, the profile
  UI offers an IANA-zone search/select control, and the account service validates
  the selected identifier against the shared supported-zone registry. That
  profile setting is currently staff-only: `canUseProfileTimezone` returns true
  only for `UserFlags.STAFF`, and non-staff update fields are stripped. Evidence:
  `fluxer_api/src/api/database/types/UserTypes.ts` (`UserRow`, `USER_COLUMNS`),
  `fluxer_app/src/features/user/components/modals/tabs/my_profile_tab/TimezoneProfileSettings.tsx`,
  `fluxer_api/src/api/user/UserHelpers.ts` (`canUseProfileTimezone`), and
  `fluxer_api/src/api/user/services/UserAccountProfileService.ts`
  (`processTimezoneUpdate`).
- The complete current `GuildRow`/`GUILD_COLUMNS` has no community timezone.
  Therefore the baseline supplies a saved account-zone context only for eligible
  staff accounts and no saved community-zone context; it does not supply a
  general fallback for temporal command input. Evidence:
  `fluxer_api/src/api/database/types/GuildTypes.ts` (`GuildRow`,
  `GUILD_COLUMNS`).

## Current synchronized preference storage

- Account settings already contain one opaque, size-checked
  `synced_preferences` snapshot. `UserAccountSettingsService` normalizes updates,
  the model persists the string in `UserSettingsRow`, and focused tests cover
  replace, clear, malformed input, and size behavior. Evidence:
  `fluxer_api/src/api/database/types/UserTypes.ts` (`UserSettingsRow`),
  `fluxer_api/src/api/user/services/UserAccountSettingsService.ts`, and
  `fluxer_api/src/api/user/tests/UserSettingsSyncedPreferences.test.ts`.
- Account and per-community preferences have separate current rows:
  `UserSettingsRow` is keyed by user, while `UserGuildSettingsRow` is keyed by
  user and guild. Updates propagate through `USER_SETTINGS_UPDATE` and
  `USER_GUILD_SETTINGS_UPDATE`, and the React client owns a
  `SyncedPreferencesEngine`. This is a synchronization and ownership precedent,
  not an existing command-preference schema. Evidence:
  `fluxer_api/src/api/database/types/UserTypes.ts`,
  `fluxer_api/src/api/user/services/UserAccountUpdatePropagator.ts`,
  `fluxer_api/src/api/constants/Gateway.ts`, and
  `fluxer_app/src/features/user/state/SyncedPreferencesEngine.ts`.
- The settings repository supplies explicit account, per-guild, and all-guild
  deletion methods. Neither current row has an inactivity-expiry field, and the
  repository writes no TTL. Account deletion owns eventual settings cleanup.
  No application-command hide, favorite, provider preference, per-command reset,
  or cross-device command state exists today. Evidence:
  `fluxer_api/src/api/user/repositories/UserSettingsRepository.ts`,
  `fluxer_api/src/api/user/services/UserDeletionService.ts`, the complete
  `UserSettingsRow`/`UserGuildSettingsRow` definitions, and repository searches
  for command preference and settings TTL handling.

## Existing authorization

- Client permission filtering controls autocomplete visibility only; native
  command execution calls normal API endpoints, whose services repeat permission
  and target-hierarchy checks. Evidence:
  `useTextareaAutocomplete.ts` (`canUseCommand`),
  `fluxer_api/src/api/guild/services/GuildModerationService.ts` (`createBan`),
  `fluxer_api/src/api/guild/services/member/GuildMemberOperationsService.ts`
  (`removeMember`), and
  `fluxer_api/src/api/guild/services/GuildRoleService.ts` (`updateRole`,
  `deleteRole`).
- An HTTP `Authorization: Bot ...` credential is validated against the
  application's bot-token hash and placed in request context as the bot `User`.
  Evidence: `fluxer_api/src/api/middleware/UserMiddleware.ts` (`parseAuthHeader`,
  bot branch) and `fluxer_api/src/api/oauth/BotAuthService.ts`
  (`validateBotToken`).
- Consequently, current native guild services receive one `userId` actor whether
  that actor authenticated with a user session or a bot token. They do not
  receive a delegated invoking-user/application/interaction authority object.
  Evidence: the service method signatures named above and `UserMiddleware`.

## Audit limitation

- A persisted guild audit entry has exactly `guild_id`, `log_id`, one `user_id`,
  generic `target_id`, `action_type`, `reason`, `options`, and serialized
  `changes`. It has no first-class application, installation, interaction,
  invoking-user, causation/idempotency, result, or authority-mode fields.
  Evidence: `fluxer_api/src/api/database/types/GuildTypes.ts`
  (`GuildAuditLogRow`, `GUILD_AUDIT_LOG_COLUMNS`).
- Audit rows and their query-table copies receive a 45-day TTL. The current
  message-delete batching path groups qualifying entries by deleting the source
  rows and inserting one replacement `MESSAGE_BULK_DELETE` row; the current
  format therefore is not an append-only causal-effect ledger. Evidence:
  `fluxer_api/src/api/guild/GuildAuditLogService.ts`
  (`createBatchedMessageDeleteLog`),
  `fluxer_api/src/api/guild/repositories/GuildModerationRepository.ts`
  (`AUDIT_LOG_TTL_SECONDS`, `deleteAuditLogs`,
  `batchDeleteAndCreateAuditLogs`), and
  `fluxer_api/src/api/worker/tasks/BatchGuildAuditLogMessageDeletes.ts`.
