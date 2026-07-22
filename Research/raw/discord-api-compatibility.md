# Discord API Compatibility Evidence

Status: dated external-contract evidence, not a Fluxer decision.

Verified 2026-07-20 against Discord's official developer documentation. Discord
remains a migration comparison under QAD-002A/QAD-002B and the hard compatible
guild slash-command baseline under QAD-220; it is not the authority for
Fluxer-only product policy.

## Classification required for each public contract

- Compatible: Discord clients and bot libraries work without behavioral changes.
- Additive extension: Discord-compatible behavior remains valid and Fluxer exposes optional additional fields or capabilities.
- Intentional incompatibility: Fluxer chooses different behavior and documents the required migration.
- Internal-only: persistence or service architecture has no public API impact.

## Official sources

- [Receiving and Responding to Interactions](https://docs.discord.com/developers/interactions/receiving-and-responding)
- [Application Commands](https://docs.discord.com/developers/interactions/application-commands)
- [Component Reference](https://docs.discord.com/developers/components/reference)

These are live external contracts. The verification date above is part of the
evidence; implementation conformance must pin fixtures and recheck the live
contract as required by QAD-196/QAD-220.

## Verified interaction baseline

- Discord requires an initial response within 3 seconds and documents
  interaction tokens as usable for follow-up operations for 15 minutes.
- An application receives interactions through either the Gateway
  `INTERACTION_CREATE` event or an outgoing webhook; the two delivery modes are
  mutually exclusive. Gateway-delivered interactions are still answered
  through the HTTP callback endpoint.
- Interaction webhook endpoints are outside the application's global rate
  limit, while retaining webhook-style route limits.
- Discord limits follow-ups to five only for a user-installed application that
  is not also installed in the server. It does not document five as the
  universal guild-install limit.
- The command object has a Snowflake `id`, application ID, mutable command name,
  optional `default_member_permissions`, `integration_types`, and `contexts`,
  plus a server-updated version. Discord does not expose Fluxer's proposed
  immutable developer key.
- Discord's chat-input option baseline includes subcommands/groups, string,
  integer, boolean, user, channel, role, mentionable, number, and attachment.

## Decision comparison

- QAD-066/QAD-067 preserve the 3-second/15-minute lifecycle.
- QAD-069/QAD-070/QAD-075 preserve mutually exclusive Gateway/HTTP delivery and
  HTTP callbacks, while adding Fluxer-owned endpoint safety and keys.
- QAD-146 preserves the global-limit exemption.
- QAD-053 intentionally applies a stricter five-follow-up cap to every initial
  Fluxer interaction context. That is compatible with Discord's user-install
  case but an explicit stricter Fluxer limit for guild-installed commands; it
  must remain in the QAD-196 compatibility manifest and QAD-220 migration
  exceptions.
- QAD-116 preserves the compatible initial chat-input option set. QAD-117
  deliberately excludes other command types from the initial Fluxer scope.
- QAD-175 preserves compatible command authority/context fields and adds typed
  Fluxer authority fields. QAD-027/QAD-169/QAD-198 add stable internal/public
  identity that Discord does not provide.
- A 24-hour displayed ephemeral lifetime under QAD-048/QAD-188 is separate from
  the 15-minute application mutation window. QAD-067 correctly ends application
  authority without claiming that an already delivered private copy must vanish
  at 15 minutes.

The five-minute security-confirmation deadline is a Fluxer security/product rule,
not evidence derived from Discord. Installation records, reconciliation state,
managed-role ownership, delegated authority, retention, suspension, and recovery
are likewise Fluxer decisions or repository-derived recommendations and must be
justified in QAD rather than by analogy to Discord.

## Remaining conformance work

The endpoint/payload manifest, pinned fixture corpus, cross-language ownership,
and migration smoke test are planned in QAD-196/QAD-220 and do not exist in the
baseline repository. They must cover commands, delivery/callbacks, follow-up
webhooks, flags/components, OAuth, error codes, rate limits, and Gateway events.
An intentional deviation is not justified merely because this comparison file
lists it.
