# Native Command Adapter

Status: repository-derived decision under QAD-145 and QAD-168.

## Boundary

Fluxer's built-in slash-like commands remain code-owned native features. They are not inserted into application command tables, do not acquire a fake application/installation, and are not editable through application command settings.

The React command picker consumes a common `CommandDiscoveryEntry` union with two providers:

- `native`: stable code key, localized Fluxer-owned text, context/permission hints, and a native execution handler identifier.
- `application`: application/command identity, published schema revision, effective community policy, and interaction invocation metadata.

Native entries are adapted from a typed registry replacing the scattered regex/name arrays in `useCommands.ts`, `SlashCommandUtils.ts`, and `CommandUtils.ts`. The first adapter may wrap existing handlers; handler migration must not change their observable behavior.

## Authorization

- Client permission/context checks remain discovery hints only.
- `/kick`, `/ban`, `/nick`, `/tts`, and every other native operation continue calling their existing REST commands/endpoints.
- Existing API services remain the authoritative permission and hierarchy checks.
- Application command policy rows cannot broaden, disable, alias, or otherwise modify a native command.
- Native commands cannot be user-hidden under the third-party hiding feature.
- If a native and application command share a name, they appear as attributed providers in the shared picker; explicit selection binds the native/application identity without changing typed text.

## Execution classes

- Local text transforms (`shrug`, `tableflip`, `unflip`, `me`, `spoiler`) remain local composer transforms.
- Native API actions (`nick`, `kick`, `ban`, direct message, TTS) call their existing command modules.
- Native pickers (`saved`, `sticker`, `gif`) continue opening their existing UI flows.
- Local client system messages remain client messages and are not converted into application interaction responses.

## Compatibility and rollout

- Add the provider abstraction first and snapshot current native discovery/execution tests.
- Adapt one native class at a time without removing old handlers until parity tests pass.
- Application commands then enter the same picker through a separate provider.
- Server-side application-command invocation never routes to a native handler based on a name string.

## Evidence

- `fluxer_app/src/features/devtools/hooks/useCommands.ts` owns current native display names, translations, contexts, and permission hints.
- `fluxer_app/src/features/messaging/utils/SlashCommandUtils.ts` has name-specific regex discovery and insertion.
- `fluxer_app/src/features/devtools/utils/CommandUtils.ts` parses and dispatches native actions.
- `GuildMemberOperationsService`, `GuildModerationService`, and their controllers independently enforce `KICK_MEMBERS`, `BAN_MEMBERS`, hierarchy, and related server invariants.
