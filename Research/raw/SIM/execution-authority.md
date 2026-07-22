# Bot and Delegated Authority Simulations

## SIM-A01 — unchanged compatible bot command remains bot-authorized

### Scenario and purpose

An unchanged Discord-style bot registers `/ban` without Fluxer authority fields. A human invokes it; the bot later calls the ordinary ban endpoint using its bot token. This proves that compatibility does not fabricate delegated user authority or a stronger causal claim.

### Decision and current-state evidence

- **Controlling QAD:** `../QAD/trails/04-execution-authority-and-audit.md` -> `Trusted acting identity` (QAD-037), `Explicit execution modes` (QAD-039/040), `Drop-in baseline versus broker opt-in` (QAD-220), `First-class application audit causality`/`Minimized audit storage` (QAD-177/178).
- **Exact specs:** `../QAD/specs/command-authority-manifest.md` -> `Compatibility input and explicit broker opt-in`; `../QAD/specs/command-registration-api.md` -> `Drop-in authority normalization`.
- **Current constraints:** CS-AUTH and CS-COMMAND. `fluxer_api/src/api/oauth/BotAuthService.ts` derives the bot user from its credential. Native moderation services reauthorize that bot. `fluxer_api/src/api/models/GuildAuditLog.ts` can record only one actor and generic details; no invoker/application/interaction causal fields exist.

### Actors, permissions, and initial state

- `user-U` may invoke the command under community policy but lacks `Ban Members`.
- `bot-A` has `Ban Members` and sufficient hierarchy; `target-T` is below it.
- Registration omitted `allowed_native_operations` and `execution_mode`; installation is active and unsuspended.

### Expected processing and state changes

1. Registration stores compatibility normalization: execution is ordinary bot authority and broker allowlist is empty. Omission does not mean `AS_USER` until a nonempty structured-operation allowlist explicitly opts into the broker.
2. Invocation policy may allow `user-U` to send an interaction to the application. That gate is distinct from native action authorization.
3. If the application calls the ordinary ban endpoint with its bot token, authentication derives `bot-A`. A caller-supplied `user-U` field cannot change the principal.
4. The native service checks `bot-A`'s current guild permission, hierarchy, target state, route limits, and ordinary safety rules. `user-U`'s missing permission neither blocks nor authorizes the bot call.
5. The ban audit remains a bot-authority action. New causal fields may link the application/interaction only if the ordinary interaction path can truthfully supply them; it must not label the action delegated or claim Fluxer proved `user-U` approved the exact ban.
6. Community invocation policy can stop future interaction invocation, but it cannot rewrite an already autonomous bot REST call into user authority.

### Security, failure, and idempotency boundaries

- Bot application text such as “acting as moderator `user-U`” has no security effect. Labels/names are not proof.
- Removing `Ban Members`, changing hierarchy, suspension, uninstall, or ordinary endpoint rate limiting makes the next call fail under current state. A delivery-time permission snapshot is never authoritative.
- Ordinary endpoint retry/idempotency remains that endpoint's contract; compatibility registration alone does not grant exactly-once native effects.
- Audit cannot store response tokens, command arguments, arbitrary application metadata, or invented intent facts.

### Conclusion and implementation gap

The scenario validates QAD-220's compatibility boundary: unchanged bots continue to act as bots, and Fluxer does not silently weaken or strengthen their authority. Current bot authentication already supports the principal rule, but interaction registration/delivery and first-class causal audit are absent.

## SIM-A02 — deceptive cleanup request cannot substitute the actor or evade high-impact confirmation

### Scenario and purpose

Application `app-A` declares a broker-enabled `/cleanup` command but submits “ban target `victim-V` as administrator `admin-X` and delete recent history” after the invoker selected only a channel. Its UI labels the action “safe archive.” This tests trusted actor derivation, declared operation envelopes, provenance, confirmation escalation, stale previews, replay, partial failure, and deception resistance.

### Decision and current-state evidence

- **Controlling QAD:** QAD-037–044, QAD-175/176, QAD-179/180, QAD-208/209. In particular `Binding user intent` (QAD-043), `Platform-owned confirmation` (QAD-044), and `Intent-derived confirmation classes` (QAD-209).
- **Exact specs:** `../QAD/specs/delegated-capability-contract.md` -> `Boundary and endpoint`, `Single use and replay`, `Authoritative execution revalidation`; `../QAD/specs/delegated-action-confirmation-policy.md` -> `Intent provenance`, `Confirmation classes`, `Resolution and execution rules`.
- **Current constraints:** CS-AUTH/CS-MESSAGE. Current services can reauthorize an authenticated human or bot but there is no interaction-bound server record, structured broker, capability, confirmation surface, causal effect ledger, or multi-actor audit.

### Actors, permissions, and preconditions

- Trusted interaction record derives invoker `user-U`, `app-A`, `guild-G`, active generation 7, command/authority revision 12, channel, and absolute response deadline.
- `user-U` has permission to delete their own messages but not `Ban Members`; `bot-A` has broader bot permissions. `admin-X` is unrelated.
- Approved command envelope allows only `channel.messages.bulk_delete` with definition-fixed `author=user-U`; it does not allow ban.
- Application request uses `request_key=rk-9`, supplies an application-selected target set and misleading prose.

### Expected processing and state changes

1. The dedicated broker authenticates `bot-A`, resolves the opaque interaction secret by hash, and derives every principal/scope from server state. It rejects caller-supplied `admin-X` as actor. An ordinary REST path cannot accept the interaction secret as user authority.
2. Requested `guild.member.ban` is outside the exact approved operation allowlist and fails before capability creation. There is no fallback to bot authority, even though `bot-A` could autonomously call a different ordinary endpoint.
3. For the allowed bulk-delete request, Fluxer normalizes and labels `author=user-U` as definition-fixed, channel/date bounds as submitted/fixed, and application-chosen message IDs as application-selected/server-verified as appropriate. The application cannot provide provenance labels.
4. Bulk/history deletion has a Class 2 floor regardless of the command name, application styling, or otherwise exact range. Fluxer resolves the current exact count/range, checks QAD's direct-reauth exclusions, and renders an invoker-only five-minute platform confirmation with application identity, actual count/scope, destructive styling, partial-failure warning, and Cancel/Delete.
5. Application prose is visually separated and cannot change trusted facts. Confirming claims only the exact pending capability; no reusable user token is returned to the application.
6. Before claim, the broker may perform a preliminary reread of expiry, generation, suspension, command availability, authority revision/hash, principals, target set/count, endpoint constraints, and parameter hash to reject already-stale work cheaply. This check is not execution authority.
7. A conditional consumption claim keyed by capability ID permits one executor. Deterministic effect IDs resume after crash. The same `(interaction,rk-9)` returns current status; same key with different parameters conflicts. Double-click/replay cannot execute twice.
8. After winning the claim and immediately before each native deletion effect, the broker rereads expiry, generation, suspension, command availability, authority revision/hash, invoker membership/permissions, bot state if mode is `REQUIRE_BOTH`, exact target set/count, endpoint safety/rate limits, and parameter hash. If any value or preview count/diff changed, the capability becomes terminal stale and no new effect runs. A resumed worker performs the same revalidation before its next effect.
9. Every committed deletion gets append-only causal audit; a later partial failure writes terminal summary and any compensation/reconciliation as new entries, never rewrites successful effects. Because these rows carry application/interaction/causation/effect linkage, current message-delete batching must reject them as compaction candidates; a summary may append but cannot delete source entries. Raw message content/arguments/secrets are excluded.
10. Cancel, dismissal, five-minute expiry, 15-minute response deadline, uninstall, suspension, authority change, or generation change makes the capability terminal. Reinstall/reinstatement cannot revive it.

### User/operator effects, retention, and recovery

- `user-U` sees a trusted confirmation or a precise safe denial; other channel members do not see the prompt.
- The application sees only normalized status/result references needed by the contract, never reusable authority or unrelated private details.
- Capability terminal/replay state lasts 24 hours from creation; non-secret causal audit lasts the existing 45-day guild-audit window. A DR authority-epoch bump invalidates restored transient capabilities.
- Operators can reconcile a claimed partial effect from its ledger. They cannot clear consumption and rerun blindly, change actor, edit parameters, or mark a missing audit chain successful.

### Conclusion and implementation gap

Inside the structured broker, the trace defeats deceptive presentation and actor substitution because authority derives from immutable server state and risk derives from structured effects, not application words. It does not stop a broadly permissioned bot from autonomously calling its ordinary bot-authority endpoints; communities must bound that separate authority through the managed role, and audit attributes those calls to the bot rather than pretending they were delegated. The trace also shows why confirmation alone is insufficient: exact allowlists, current reauthorization, single-use claims, and causal reconciliation are all required. None of those broker domains exists today.

## SIM-A03 — all execution modes and every review transition preserve principal boundaries

### Scenario and purpose

One broker-enabled message-moderation command moves through `AS_USER`, `REQUIRE_BOTH`, and `AS_BOT` while the invoker and bot alternately lose permission. The developer tries every direction of mode change and reuses an interaction issued under the old authority hash. This tests actual execution semantics, the exact reviewer matrix, pending-review disablement, revision invalidation, audit attribution, and the rule that approval cannot grant adjacent authority.

### Decision and current-state evidence

- **Controlling QAD:** QAD-037–042, QAD-111, QAD-175–180, and QAD-220. QAD-039 fixes the exact public modes; QAD-041 fixes the six transition reviewers; QAD-042 keeps the operation envelope independent.
- **Exact specs:** `../QAD/specs/command-authority-manifest.md` -> `Compatibility input and explicit broker opt-in`; `../QAD/specs/delegated-native-operation-registry.md` -> `Registry entry contract`, `Required validation`; `../QAD/specs/delegated-capability-contract.md` -> `Authoritative execution revalidation`; `../QAD/specs/application-audit-contract.md` -> authority attribution.
- **Current constraints:** CS-AUTH/CS-COMMAND. Current native services authorize one authenticated user or bot and current audit stores one actor, but there is no command authority revision, community mode review, interaction-bound broker, or multi-principal causal audit.

### Actors, command, and initial state

- `command-17` has nonempty allowlist `[channel.message.delete]`, active authority revision 4/hash `h4`, and initially omits `execution_mode`; broker normalization therefore selects `AS_USER`.
- Invoker `user-U` initially has the native message-management permission and hierarchy. Installed `bot-A` initially lacks it. Invocation policy, installation, targeting, suspension, target, and response deadlines otherwise pass.
- `manager-M` has `Manage Guild`; `admin-A` has `Administrator`. Neither mode approval can change the managed-role ceiling, bot permissions, operation allowlist, hierarchy position, or supplemental roles.

### Projection chain and expected state changes

1. If the application requests the registered delete under revision 4, then the broker derives `user-U`, rechecks the user's current native permission/hierarchy/target/rate state, and succeeds as `AS_USER`; `bot-A`'s missing permission does not substitute for or veto the selected user principal. If `user-U` loses permission before effect claim, the same request fails terminally with no fallback to `AS_BOT`.
2. If the developer publishes `AS_USER -> REQUIRE_BOTH`, then a new authority revision/hash is created and the command becomes unavailable pending review. `manager-M` cannot approve because the transition introduces the bot as an authorizing principal; only owner/`Administrator` may approve it.
3. If `admin-A` approves that exact revision, then approval activates only the reviewed mode/envelope. It does not grant `bot-A` the missing permission, so execution still fails until both `user-U` and `bot-A` independently pass their current permission, hierarchy, target, installation, suspension, and rate checks.
4. If both principals pass, then one deterministic effect may commit and audit records `REQUIRE_BOTH`, the invoker, application/bot, interaction, authority revision/hash, and actual native result. Removing either principal's required state before claim makes the request fail without partially authorizing through the other.
5. If the developer publishes `REQUIRE_BOTH -> AS_USER`, then the command again disables pending review. `manager-M` may approve because the transition removes bot authority; after approval only the user's native authorization decides the effect. The approval still cannot reduce or rewrite the developer's operation semantics.
6. If the developer publishes `AS_USER -> AS_BOT`, then only owner/`Administrator` may approve because the change introduces bot authority and removes the invoking-user check from effect authorization. Once approved, `bot-A` must pass current native checks; `user-U` still must pass ordinary command invocation policy but does not lend or veto native effect permission merely by lacking the operation permission.
7. If the developer publishes `AS_BOT -> REQUIRE_BOTH`, then `manager-M` may approve because bot authority already existed and the change adds the user's check. Execution fails while `user-U` lacks permission. Conversely, `REQUIRE_BOTH -> AS_BOT` requires owner/`Administrator` because it removes that user check.
8. If the developer publishes `AS_BOT -> AS_USER`, then `manager-M` may approve because the transition removes bot authority. Every one of the six directions creates pending review; no apparently restrictive transition activates automatically.
9. If an interaction/capability from revision 4 is presented after any mode revision, then exact authority revision/hash revalidation makes it terminal stale before effect. Approval of a later revision cannot update, reinterpret, or revive the old capability, and retry retains the old terminal result.
10. Registration, storage, generated types, review records, interaction context, and audit use only `AS_USER`, `AS_BOT`, and `REQUIRE_BOTH`. `DELEGATED`, `BOT`, and `BOTH` are rejected rather than normalized. `AUTONOMOUS_BOT` appears only for unattended bot activity, never for this user-triggered broker chain.

### Failure, audit, and compatibility boundaries

- An unregistered or mode-ineligible operation fails closed and never calls an ordinary bot endpoint. A compatible command with an empty allowlist remains the separate SIM-A01 bot-token path and does not acquire broker semantics.
- A mode reviewer accepts or rejects the exact immutable developer revision. Community configuration cannot rewrite the mode, add operations, broaden bot permissions, or make a stale interaction current.
- Failed current-state checks record only the safe operation/result/authority facts allowed by audit policy; command arguments, response credentials, and private target content remain excluded.

### Conclusion and implementation gap

The projection proves that the three modes are authorization formulas, not labels: `AS_USER` requires the invoker, `AS_BOT` requires the installed bot, and `REQUIRE_BOTH` requires both at execution time. The tiered six-direction review matrix controls which new developer definition a community accepts without granting any permission itself. Current code has single-principal endpoint checks but none of the manifest, review, broker, revision, or causal-audit machinery.

## SIM-A04 — identical native operations select Class 0, Class 1, or Class 2 from provenance and effect

### Scenario and purpose

One approved command requests a single message pin using an exact user-submitted target, then the application changes only the target provenance. A final variant requests a bulk deletion. This isolates confirmation-class selection from execution mode and proves that applications may raise but never lower platform friction.

### Decision and current-state evidence

- **Controlling QAD:** QAD-043/044, QAD-175–180, QAD-208/209.
- **Exact specs:** `../QAD/specs/delegated-action-confirmation-policy.md` -> `Intent provenance`, `Confirmation classes`, `Resolution and execution rules`, `Registry floors and parameter escalators`; `../QAD/specs/delegated-capability-contract.md` -> execution revalidation and single-use claim.
- **Current constraints:** CS-AUTH/CS-MESSAGE. Current native endpoints can reauthorize one authenticated actor but have no immutable interaction provenance, confirmation-class registry, platform confirmation, or exact broker capability.

### Actors, authority, and approved envelope

- Command `command-pin` revision 9 permits `channel.message.pin` for one message under `AS_USER`. The picker identifies `app-A`, the native operation, and Alice's required permission.
- Alice submits exact channel/message `msg-7`. The definition fixes the operation and channel type. The application later submits the same operation but substitutes `msg-8`, which Alice did not select.
- A separate approved cleanup operation can resolve several exact message IDs and has the registry's bulk/high-impact Class 2 floor.

### Projection chain and expected outcomes

1. For `msg-7`, Fluxer derives `SUBMITTED` target provenance and `DEFINITION_FIXED` operation/context from the immutable interaction and authority definition. The application cannot supply or relabel provenance.
2. Because the request has one bounded effect, only submitted/fixed security values, and a Class 0 registry floor with no mass/permission/history/destructive escalator, Fluxer requires no second prompt. It still issues/claims one exact capability, reauthorizes Alice and the target at execution, performs the pin once, and writes causal audit.
3. If `app-A` substitutes `msg-8`, the broker labels the changed target `APPLICATION_SELECTED`. The operation remains within its allowlist, but the required class becomes at least Class 1; Fluxer renders an invoker-only platform confirmation containing the actual target, application, authority mode, and consequence.
4. If the application marks `msg-8` as submitted, supplies trusted-looking prose, or requests Class 0, then server derivation still selects Class 1. The application may request Class 2 for additional caution but cannot lower the computed maximum.
5. If the pending Class 1 request changes target, parameter hash, command/authority revision, installation generation, or normalized effect after preview, then the old confirmation becomes terminal stale. It is never updated in place or reused for the changed action.
6. If the normalized operation becomes bulk deletion, includes history pruning, changes permission/hierarchy/access, or crosses another registry high-impact floor, then Class 2 wins regardless of otherwise submitted/fixed provenance. Exact user intent does not remove the high-impact prompt.
7. The same provenance/risk calculation applies under `AS_BOT` and `REQUIRE_BOTH`; those modes alter which principals must pass current authorization, not the confirmation class. Autonomous bot REST calls remain outside the structured broker and receive no fictitious human confirmation.
8. If Alice cancels, dismisses, or lets a Class 1/2 confirmation expire, then the capability becomes terminal and no native effect or success audit is created. Replaying the interaction/request key returns the terminal result rather than falling back to direct execution.
9. If current permission, hierarchy, target state, suspension, installation, or rate state fails immediately before a confirmed or Class 0 effect, then execution fails closed. Confirmation and exact submission are intent evidence, never permission grants.

### Audit, privacy, and user effects

- The broker derives provenance/class from the immutable interaction/definition and binds the resulting confirmation state and exact parameter hash to the capability. Guild audit records the accepted confirmation state, result, and normalized effect facts allowed by the native operation—not command arguments, application prose, or prompt content.
- Class 0 remains visible in interaction status and ordinary operation attribution; “no additional prompt” never means invisible or unaudited.
- Only the invoker sees Class 1/2 confirmation. Target existence and permission failures use audience-safe errors.

### Conclusion and implementation gap

The same registered operation can legitimately require no second prompt or a trusted confirmation solely because provenance changed, while effect floors can force Class 2. This boundary prevents both confirmation fatigue and application-selected action without consent. Current code has none of the provenance/class/capability machinery.
