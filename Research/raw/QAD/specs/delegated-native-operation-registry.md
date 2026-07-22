# Delegated Native-Operation Registry

Status: accepted complete-coverage and confirmation boundary under QAD-037 through QAD-044, QAD-145, QAD-175, QAD-180, QAD-208, and QAD-209. Exact classes are in `delegated-action-confirmation-policy.md`.

## Coverage rule

The master plan does not stop after a small moderation sample. Every current or future bot-authenticated, community-scoped mutation must be classified in one schema-owned manifest as one of:

- `DELEGATED_ELIGIBLE`: an application may request the exact typed action under trusted interaction-invoker authority;
- `BOT_ONLY`: the effect is performed as the authenticated application/bot and never impersonates the invoker;
- `DIRECT_USER_ONLY`: the effect changes personal identity/state or requires direct reauthentication and cannot be delegated to an application;
- `OUT_OF_SCOPE`: the surface is outside community-installed chat-input commands, such as DMs/global apps or instance administration.

CI compares generated OpenAPI/controller operation IDs with this manifest. Adding a bot-authenticated community mutation without a classification fails generation/tests. A delegated command requesting an operation without an enabled `DELEGATED_ELIGIBLE` adapter receives a typed unsupported-operation result; it never retries through the ordinary bot endpoint or silently falls back to bot authority.

The registry is an authorization and review catalog, not a second implementation of guild logic. Each adapter normalizes an operation-specific schema and invokes the existing native service with the invoker ID derived from the server-side interaction record. Current permission, hierarchy, target, rate-limit, installation, suspension, and ordinary endpoint invariants are then checked by that service/broker boundary. The application cannot provide the actor ID or a REST method/path.

## Eligible operation catalog

Every operation below is single-community and exact-target. Bulk variants are distinct operation IDs rather than a hidden parameter on a single-target grant.

### Member moderation

- `guild.member.ban`: target, bounded reason, temporary/permanent duration, and current bounded message-deletion option;
- `guild.member.unban`: exact banned user;
- `guild.member.kick`: exact current member;
- `guild.member.timeout.set`: exact member, absolute bounded end time, and bounded reason;
- `guild.member.timeout.clear`: exact member;
- `guild.member.nickname.set`: exact member and normalized nickname/null;
- `guild.member.voice.update`: exact member and a tagged mute, deafen, move, or disconnect request;
- `guild.member.role.add`: exact member and role;
- `guild.member.role.remove`: exact member and role;
- `guild.member.roles.replace`: exact member plus the complete bounded desired ordinary-role set.

Member profile avatar/banner/bio/pronouns/accent/profile/mention-preference fields are personal identity state and are not exposed through the delegated member-management adapter.

### Message, reaction, and pin moderation

- `channel.message.delete`: exact channel/message;
- `channel.messages.bulk_delete`: the existing bounded exact message-ID set;
- `channel.message.attachment.delete`: exact message/attachment;
- `channel.message.reactions.clear`: exact message;
- `channel.message.reactions.clear_emoji`: exact message/emoji;
- `channel.message.reaction.remove_user`: exact message/emoji/member;
- `channel.message.pin`: exact message;
- `channel.message.unpin`: exact message.

These operations may remove or classify existing content but never create or edit content under the human author's identity.

### Channels and permission overwrites

- `guild.channel.create`: existing guild channel type and bounded create schema;
- `guild.channel.update`: exact guild channel and compatible type-specific update fields;
- `guild.channel.delete`: exact guild channel;
- `guild.channels.reorder`: complete bounded expected-version position update;
- `channel.permission_overwrite.set`: exact channel plus role/member overwrite and allow/deny bits;
- `channel.permission_overwrite.delete`: exact channel and overwrite target.

Group-DM ownership, recipients, and other DM-only fields are outside the community-installed scope. Managed application-role invariants remain enforced when a permission overwrite targets an application role; delegated channel management cannot bypass the accepted Integrations ownership rules.

### Roles and member-list layout

- `guild.role.create`: bounded name/color/permission definition;
- `guild.role.update`: exact ordinary role and bounded mutable fields;
- `guild.role.delete`: exact ordinary role;
- `guild.roles.reorder`: bounded expected-version role-position update;
- `guild.role_hoists.update`: bounded exact hoist-position update;
- `guild.role_hoists.reset`: reset the community hoist ordering.

Managed application roles are rejected by ordinary role adapters. Their presentation and authority remain owned by the installation/Integrations service.

### Community configuration and discovery

- `guild.settings.update`: the current bounded guild-update fields except `mfa_level`, password, and every field that requires direct sudo/reauthentication;
- `guild.feature_toggle.set`: one code-defined user-toggleable community feature and value;
- `guild.vanity.set`: normalized vanity code or null;
- `guild.discovery.apply`: exact current application fields;
- `guild.discovery.update`: exact current application revision and fields;
- `guild.discovery.withdraw`: exact current discovery application.

The adapter never accepts the generic current `GuildUpdateRequest` wholesale: fields newly added to that schema remain unavailable until explicitly reviewed and added to the operation registry.

### Community expressions

- `guild.emoji.create`: one upload or existing clone source, bound by content/source hash;
- `guild.emoji.update`: exact emoji and mutable metadata;
- `guild.emoji.delete`: exact emoji and explicit reference-purge choice;
- `guild.emojis.bulk_create`: the current bounded set, with every item bound;
- `guild.sticker.create`: one upload or existing clone source, bound by content/source hash;
- `guild.sticker.update`: exact sticker and mutable metadata;
- `guild.sticker.delete`: exact sticker and explicit reference-purge choice;
- `guild.stickers.bulk_create`: the current bounded set, with every item bound.

Large media is staged through a rate-limited private application upload and represented in the capability only by owned object reference, size/type, and content hash. The application cannot place an arbitrary URL or unbounded base64 body in a capability row.

### Invites and credential-free webhook administration

- `channel.invite.create`: exact channel and bounded age/use/temporary settings; the invite code is delivered only in the platform-owned invoker response, while the application receives status and non-secret reference metadata;
- `invite.delete`: exact invite identity/current code;
- `webhook.metadata.update`: exact existing webhook and safe metadata/channel target, with every credential redacted from the application result;
- `webhook.delete`: exact existing webhook, with no token result.

There is no delegated webhook-create/token-rotate/token-read/execute operation. A temporary invoker grant cannot mint reusable application authority.

## Explicit exclusions

The following remain `BOT_ONLY`, `DIRECT_USER_ONLY`, or out of scope even if a current generic OpenAPI declaration happens to list bot authentication:

- sending or editing messages as the human, scheduling human messages, reacting as the human, typing, read/ack state, personal notes, and personal member-profile state;
- attachment upload authority except as part of a bot-owned application message or the private hash-bound staging flow above;
- community creation, deletion, and ownership transfer;
- changing community MFA level or satisfying any password/MFA/sudo challenge;
- webhook creation, tokens, execution, or token-authenticated message operations;
- accepting invites, group-DM membership/ownership, DM calls, voice presence, and other non-community application contexts;
- user account, OAuth authorization, billing, relationship, pack ownership, instance-administration, and safety-admin actions;
- reads/searches, which use their existing data-access rules and create no delegated mutation capability.

Application interaction responses, bot-managed messages, declarative message publication, self-role panels, automated moderation, schedules, and other unattended workflows act as the bot under its installed permissions. They do not masquerade as the invoker merely because an interaction happened earlier.

## Registry entry contract

Each `DELEGATED_ELIGIBLE` constant owns:

- stable operation ID and capability-version requirement;
- tagged parameter and normalized-result schemas;
- existing native service adapter and current permission/hierarchy predicates;
- permitted `AS_USER`/`AS_BOT`/`REQUIRE_BOTH` modes;
- single/bulk classification and confirmation risk class;
- intent-binding fields and platform-preview renderer;
- result visibility (`APPLICATION_SAFE`, `INVOKER_ONLY`, or redacted references);
- idempotent effect identity/reconciliation behavior;
- audit action/normalized fields and secret/content redaction;
- route plus broker rate/concurrency limits;
- current compatibility-manifest mapping and tests.

Unknown operations and unknown fields fail closed. Changing parameters, permission semantics, result visibility, or risk class creates a new reviewed registry revision and command authority review; a stable ID is never repurposed.

## Stacked implementation sequence

The shared capability and confirmation framework lands first. Eligible adapters then land sequentially in small risk-coherent PRs, never enabling more than three exact privileged operation IDs per PR:

1. ban, unban, kick;
2. timeout set/clear, nickname set;
3. member voice update, role add/remove;
4. complete member-role replacement;
5. single/bulk message and attachment deletion;
6. clear-all/clear-emoji/remove-user reactions;
7. pin/unpin;
8. channel create/update/delete;
9. channel reorder plus overwrite set/delete;
10. role create/update/delete;
11. role reorder plus hoist update/reset;
12. community settings update, feature toggle, vanity;
13. discovery apply/update/withdraw;
14. emoji create/update/delete;
15. sticker create/update/delete;
16. emoji/sticker bulk create;
17. invite create/delete;
18. credential-free webhook metadata update/delete.

Every PR contains the registry/schema change, adapter calling the existing service, audit/effect mapping, compatibility classification, authorization/intent/confirmation fixtures, failure/race tests, and rollout allowlist. A later PR starts only after its predecessor is merged/rebased; at most three dependent PRs remain open under QAD-202.

## Current Fluxer evidence and classification

- Bot authentication currently resolves the bot user and existing guild/channel services accept that authenticated `userId`, so ordinary bot REST calls are bot-authority actions.
- Dedicated moderation, ban, role, channel, expression, discovery, invite, webhook, message-deletion, reaction, and pin services already perform current permission/hierarchy and target validation.
- `GuildMemberUpdateRequest` and `GuildUpdateRequest` are broad mixed-purpose schemas containing both administrative and personal/reauthenticated fields; reusing them wholesale would violate least authority.
- Current message/read/reaction routes include both personal-self effects and moderator effects, requiring explicit classification rather than method/path inference.
- Community deletion and ownership transfer explicitly require owner/sudo verification, and webhook create returns a durable token.

This **extends** existing service authorization by supplying a server-derived interaction invoker through a separate exact broker. It **preserves** ordinary bot-token calls as bot authority. It **intentionally differs** from a generic “forward this user ID/REST request” design and excludes impersonation, direct-reauthentication, private-account, and credential-minting actions.

## Required validation

- generated completeness test for every bot-authenticated community mutation operation ID;
- negative tests for every excluded class and for generic method/path/actor input;
- per-operation schema, permission, hierarchy, target, stale-state, authority-revision, audit, rate, idempotency, and failure-injection fixtures;
- `AS_USER`/`AS_BOT`/`REQUIRE_BOTH` current-state tests and explicit proof that unsupported operations never fall back to another authority mode or an ordinary bot endpoint;
- content/credential redaction and result-audience tests;
- managed-role and community lifecycle invariant tests;
- cross-service registry/OpenAPI/compatibility-manifest generation cleanliness.
