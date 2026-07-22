# Messages and Interactions

## Messages

- The complete TypeScript `MessageRow` contains ordinary channel-message
  content, author/webhook identity, mentions, attachments, embeds, stickers,
  references/snapshots, calls, flags, reactions, and an internal integer
  `version`. The public `MessageResponseSchema`, `MessageRequestSchema`, and
  `MessageUpdateRequestSchema` expose the ordinary message fields but not that
  version. None of these contracts contains an application owner, interaction
  ID/token, component tree, or recipient-scoped ephemeral state. Evidence:
  `fluxer_api/src/api/database/types/MessageTypes.ts` (`MessageRow`,
  `MESSAGE_COLUMNS`) and
  `packages/schema/src/domains/message/MessageRequestSchemas.ts`
  (`MessageRequestSchema`, `MessageUpdateRequestSchema`) and
  `packages/schema/src/domains/message/MessageResponseSchemas.ts`
  (`MessageBaseResponseSchema`, `MessageResponseSchema`).
- The Rust message service defines its own corresponding `Message` and
  `MessageDbRow` representations with the same current storage boundary and the
  same absences. Evidence: `fluxer_messages/src/types.rs` (`Message`) and
  `fluxer_messages/src/shard_impl.rs` (`MessageDbRow`).
- The internal message version is not a concurrency-safe monotonic or
  compare-and-set contract. `MessageDataRepository` calls
  `executeVersionedUpdate`, which reads a version, calculates its successor, and
  then patches unconditionally. Concurrent or stale writers can therefore write
  the same or an older derived value. Evidence:
  `fluxer_api/src/api/channel/repositories/message/MessageDataRepository.ts`
  (`upsertMessage`) and
  `fluxer_api/src/api/database/CassandraVersionedUpdate.ts`
  (`executeVersionedUpdate`).
- Ordinary message send persists `messageRowData` through
  `upsertMessage` before dispatching `MESSAGE_CREATE`; normal delivery broadcasts
  to the channel, while the DM spam-suppression path can dispatch only to the
  sender. Evidence:
  `fluxer_api/src/api/channel/services/message/MessagePersistenceService.ts`
  (`createMessage`),
  `fluxer_api/src/api/channel/services/message/MessageSendService.ts`
  (`sendMessage` post-create dispatch), and
  `fluxer_api/src/api/channel/services/message/MessageGatewayDispatch.ts`
  (`dispatchMessageCreateBroadcast`, `dispatchMessageCreateToUser`).
- There is no application interaction-response or ephemeral-response persistence
  model in these authoritative message row/response types. Current
  `channel/services/interaction/` code concerns ordinary pins, reactions, and
  read/typing state; it is not an application-interaction protocol.

## Gateway and delivery

- Bot tokens can authenticate gateway sessions: the API RPC identifies the bot
  token, validates it with `BotAuthService`, loads the bot user, and returns bot
  session data consumed by the Erlang gateway. Evidence:
  `fluxer_api/src/api/rpc/RpcService.ts` (`parseTokenType`, `handleSessionRequest`)
  and `fluxer_gateway/src/session/session_init.erl` (`build_state`).
- The complete API dispatch-event union contains ordinary guild/channel/message,
  presence, relationship, and voice events but no application interaction event.
  The Erlang normalizer's known-event map likewise contains no interaction event.
  Evidence: `fluxer_api/src/api/constants/Gateway.ts`
  (`GatewayDispatchEvent`) and `fluxer_gateway/src/utils/event_atoms.erl`
  (`known_event_map`).
- Persisted applications have no HTTP interaction callback endpoint, transport
  mode, signing public key, or key-rotation state. The developer application
  response's `verify_key` is only the 64-zero compatibility placeholder described
  in `applications-and-installations.md`. Evidence: `ApplicationRow`,
  `OAuth2RequestService.getApplicationsMe`, and `ApplicationsMeResponse`.

## Current outbound-endpoint and worker-timing precedents

- The shared outbound URL helper accepts only HTTP(S), can require HTTPS, rejects
  embedded URL credentials plus query/fragment data, can reject localhost, and
  rejects a hard-coded subset of private/special IP *literals*. Its list covers
  common local/private/link-local/CGNAT/benchmark/multicast ranges but is not a
  complete public-address test: for example, it accepts the documentation range
  `192.0.2.0/24`. Its path builder also rejects absolute replacement URLs.
  Evidence: `packages/hono/src/security/OutboundEndpoint.ts`
  (`validateOutboundEndpointUrl`, `isPrivateOrSpecialIPv4`,
  `isPrivateOrSpecialIPv6`, `buildEndpointUrl`).
- `packages/ip_utils/src/IpAddress.ts` separately exposes
  `isPublicIpAddress`, which parses IPv4/IPv6 and checks a broader reserved-range
  table that includes the IPv4 documentation networks. The outbound URL helper
  does not call it. These helpers are useful SSRF primitives but do not by
  themselves prove hostname DNS resolution/pinning, redirect revalidation, or
  connect-time destination checks for a future callback delivery client. No
  present application callback client composes those full controls because
  callback delivery does not exist.
- Existing JetStream lanes use explicit acknowledgement with 15-second
  `realtime`, 30-second `unfurl`, 60-second `lifecycle`, and 120-second `batch`
  acknowledgement waits; lane delivery limits are 3 or 25. This is durable
  background-work precedent, not evidence that the generic worker can satisfy a
  three-second interaction acknowledgement. Evidence:
  `fluxer_api/src/api/worker/WorkerLaneConfig.ts` (`LANE_CONFIG`) and
  `fluxer_api/src/api/worker/JetStreamWorkerQueue.ts` (`ensureConsumers`).

## Current rate-limit precedent

- The ordinary global account limit returned by `getGlobalRateLimit` is 50
  requests per second unless a test override or the existing high-limit user
  flag applies; bots and webhooks are among the authenticated account types that
  can enter this middleware. Evidence:
  `fluxer_api/src/api/middleware/RateLimitMiddleware.ts`
  (`getAccountType`, `shouldApplyGlobalRateLimit`, `getGlobalRateLimit`).
- Current webhook execute/message routes provide route-scoped precedents: execute
  and message-read use 60 per minute, while message-edit and message-delete each
  use 30 per minute, and those routes are exempt from the ordinary global limit.
  There is no interaction-, installation-, or response-token-scoped limiter in
  the present route configuration. Evidence:
  `fluxer_api/src/api/rate_limit_configs/WebhookRateLimitConfig.ts`
  (`WEBHOOK_RATE_LIMIT_CONFIGS`) and a repository search of current rate-limit
  configurations for interaction response routes.

## Client boundary

- Baseline tracked files contain no Dart source, `pubspec.yaml`, or Flutter
  Android/iOS project tree. The API's mobile-app notice points instead to the
  separate `fluxerapp/flutter_client` repository. Evidence:
  `fluxer_api/src/api/system/PneumaticPostNotices.ts` (`githubUrl`) plus
  `git ls-tree -r fd62b46f...` inspection for `*.dart`, `pubspec.yaml`, and Flutter
  platform project paths.
- This repository nevertheless contains server compatibility behavior for that
  external client, including Flutter user-agent detection and login/registration
  gates. Evidence: `fluxer_api/src/api/utils/UserAgentUtils.ts`
  (`isFluxerFlutterClient`) and
  `fluxer_api/src/api/auth/FlutterClientGate.ts`.
- The in-repository React app has a mobile-browser/narrow-viewport layout with
  640px enable and 768px disable thresholds. Evidence:
  `fluxer_app/src/features/ui/state/MobileLayout.ts`
  (`MOBILE_ENABLE_BREAKPOINT`, `MOBILE_DISABLE_BREAKPOINT`, `MobileLayout`).

## Current cross-service message boundary

- The existing message path already crosses shared Zod response schemas,
  TypeScript persistence/API services, the Rust message reader, Erlang gateway
  dispatch, and React client models/rendering. No bot-component behavior is
  asserted here. Representative evidence:
  `packages/schema/src/domains/message/MessageResponseSchemas.ts`,
  `fluxer_api/src/api/database/types/MessageTypes.ts`,
  `fluxer_messages/src/types.rs`,
  `fluxer_api/src/api/constants/Gateway.ts`, and
  `fluxer_app/src/features/messaging/models/MessagingMessage.ts`.
