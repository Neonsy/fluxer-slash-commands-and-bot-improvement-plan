# Common End-to-End Simulations

These scenarios connect the domain-specific simulations into the two ordinary journeys readers are most likely to ask about: an unchanged Discord-compatible bot reaching its first successful response, and an application deliberately opting into Fluxer-managed permissions and delegated native actions. The detailed failure and concurrency branches remain in the linked domain simulations.

## SIM-G01 — a compatible bot goes from creation to its first public command response

### Scenario and purpose

A developer creates a conventional bot, installs it with a standard permission-bearing invite, registers one guild command without any Fluxer-only fields, and answers the first invocation over Gateway. This is the simplest complete example of what “Discord drop-in baseline” means and makes identity, installation, delivery, response, and retry ownership visible in one trace.

### Decision and current-state evidence

- **Controlling QAD:** QAD-002B and QAD-220 (compatible baseline); QAD-003–020 and QAD-038 (installation, invite-mode ceiling, revocation); QAD-021–031, QAD-109–115, QAD-165–174, and QAD-203–207 (identity, registration, handles, limits); QAD-037–040 and QAD-175 (ordinary bot authority); QAD-054–078 and QAD-181–184 (interaction delivery and response).
- **Exact specs:** `../QAD/specs/application-handle-contract.md`, `application-install-permission-source.md`, `command-registration-api.md`, `interaction-envelope.md`, `interaction-response-lifecycle.md`, and `discord-compatibility-conformance.md`.
- **Current constraints:** CS-CREATE, CS-INSTALL, CS-COMMAND, CS-AUTH, CS-DELIVERY, and CS-MESSAGE. Current Fluxer can create an application, invite its bot member, and authenticate the bot, but has no application command registry, installation aggregate, interaction event, response token, or application-attributed response contract.

### Actors, permissions, and initial state

- Developer `dev-D` owns no applications and creates `app-A` with display name `Greeter` and available handle `greeter`.
- Community manager `manager-M` has `Manage Guild`, `View Channel`, and `Send Messages`, but not `Administrator`.
- User `user-U` may view and send in `channel-C`. The application has no `required_bot_permissions` field and no Fluxer capabilities or structured-action allowlist.

### Expected processing and state changes

1. If `dev-D` creates `app-A`, Fluxer conditionally claims one of the owner's 50 application slots and the provisional `greeter` handle, creates the application and its one bot identity, and releases both claims on failed creation. A concurrent request cannot oversubscribe the account cap or duplicate the handle.
2. Because the application has no code-published permission declaration, its invite is in portable invite mode. The standard OAuth request selects exactly `View Channel | Send Messages`; it cannot silently select permissions from a Fluxer setting.
3. When `manager-M` consents, Fluxer rechecks that the manager currently holds both requested bits, creates the installation row/generation and one managed role, assigns that exact role and bot member through the installation state machine, records invite mode plus the committed set as the durable relationship ceiling, and returns success only after `ACTIVE` commits.
4. If the URL is edited to add `Administrator`, consent fails because invite mode cannot exceed the installer's held bits. A failed attempt neither changes the active role nor raises the stored ceiling.
5. `dev-D` registers guild chat-input command `/hello` through the compatible guild route with no Fluxer `key`, authority mode, native-operation allowlist, or capability fields. The first command-head CAS freezes the still-owned `greeter` handle in the same publication boundary. Fluxer derives a stable application-scoped command key, normalizes the command to ordinary bot authority, publishes one immutable application schema, and changes only the target set for this guild.
6. The command picker returns `/hello` with visible `Greeter` attribution and a stable application/command identity. Selecting the row binds those IDs; later label, ordering, alias, or handle changes cannot retarget the submission.
7. On submit, Fluxer rereads the current command head, target, policy, channel availability, `ACTIVE` installation generation, and suspension overlay. It validates the submitted schema version and values before creating interaction `int-1`; picker visibility alone never authorizes delivery.
8. Gateway delivers the compatible interaction without requiring a privileged interaction intent. The envelope includes stable IDs and one opaque response token; omission of Fluxer broker fields means any later bot-token REST call remains bot-authorized rather than silently acting as `user-U`.
9. The application sends one type-4 public callback inside three seconds. Fluxer atomically claims the initial response, creates one public bot/application-attributed message in `channel-C`, and records the interaction terminal result. A byte-equivalent retry observes the same result; a different second callback is rejected and cannot create another message.
10. Success may update only the bounded user/guild/command ranking signal and `last_used_at`. Arguments, option values, message content, and a recallable command history are not stored by personalization.
11. If `user-U` loses channel access before a later submission, server preflight denies the new invocation even if a stale client still displays `/hello`. If the bot later loses `Send Messages`, command invocation does not grant it back and the ordinary bot-authorized response/effect fails under current bot authority.
12. If `manager-M` uninstalls the application, authority leaves `ACTIVE` before member/role cleanup. Pending response tokens and old generation-bound work are revoked. A later reinstall creates a new generation and review; it does not reactivate `int-1` or raise the prior ceiling.

### Conclusion and implementation gap

The compatible path needs no Fluxer-only declaration, SDK, authority mode, or command extension: ordinary invite permissions and bot-token authority retain their familiar meaning. Fluxer adds stable identity, lifecycle ownership, exact retry behavior, and current-state checks around that path. None of the command/interaction state in this trace exists in the current codebase, so this is a cross-domain acceptance projection, not a passing integration test.

## SIM-G02 — an enhanced application composes code-defined install permissions with a delegated native action

### Scenario and purpose

An application deliberately publishes required bot permissions and a structured cleanup command. A `Manage Guild` installer approves the exact code-defined set, a user invokes the command, Fluxer presents a trusted high-impact confirmation, and the native effect executes as the user. This demonstrates how optional Fluxer extensions compose without turning installation authority, invocation policy, bot authority, and delegated user authority into one grant.

### Decision and current-state evidence

- **Controlling QAD:** QAD-008–011, QAD-032–038, QAD-111, and QAD-136 (code-defined exact-set install and later ceiling); QAD-039–044, QAD-175–180, and QAD-208–209 (execution modes, operation registry, confirmation, audit); QAD-116, QAD-138, QAD-189, and QAD-220 (explicit extension/capability opt-in); QAD-181–188 (delivery, response, and component/ephemeral state).
- **Exact specs:** `../QAD/specs/application-install-permission-source.md`, `command-authority-manifest.md`, `delegated-native-operation-registry.md`, `delegated-action-confirmation-policy.md`, `delegated-capability-contract.md`, and `application-audit-contract.md`.
- **Current constraints:** CS-INSTALL, CS-ROLE, CS-AUTH, CS-COMMAND, CS-DELIVERY, and CS-MESSAGE. Current code enforces held-bit invite/ordinary-role ceilings and bot-authenticated native endpoints, but has no authenticated permission declaration, relationship ceiling, structured-action broker, confirmation capability, or causal application audit chain.

### Actors, permissions, and initial state

- `app-B` publishes `required_bot_permissions = View Channel | Send Messages | Manage Messages` as authenticated declaration revision 7, then publishes command `/cleanup` with `execution_mode=AS_USER` and allowlist `channel.messages.bulk_delete`.
- `manager-M` has `Manage Guild`, `View Channel`, and `Send Messages`, but not `Manage Messages`. User `moderator-U` currently has native `Manage Messages` permission and can invoke `/cleanup` in `channel-C`.
- The client and selected delivery transport negotiated the required delegated-action capability. The command collects a date range, then the application resolves the exact bounded message-ID set after invocation.

### Expected processing and state changes

1. Saving declaration revision 7 authenticates the current application owner, canonicalizes and hashes the exact permission set, and does not alter an existing installation or accept caller-selected URL additions.
2. Consent identifies code-defined mode and shows revision 7's exact set. Although `manager-M` lacks `Manage Messages`, `Manage Guild` may approve exactly that authenticated declaration; changing the URL to add `Administrator`, omitting a declared bit, or racing declaration revision 8 causes rejection/review rather than a different grant.
3. Commit rereads revision/hash 7, creates the managed role with exactly those bits, and stores that set as the relationship ceiling. The exception ends at first-install consent: `manager-M` cannot later raise bits, move the role, assign supplemental roles, or reset the ceiling through reinstall.
4. Publishing `/cleanup` explicitly opts the command into the Fluxer broker because its native-operation allowlist is nonempty. `AS_USER` means the eventual native effect uses `moderator-U`'s current authority; the bot's installed `Manage Messages` bit is neither substituted for the user nor treated as invocation permission.
5. Discovery requires compatible capability, command/category/community policy, channel availability, and current invocation permission. If any gate fails, the command is hidden or safely unavailable, but a manipulated submission is still rejected server-side.
6. Submission binds the exact application, command, schema, authority revision, installation generation, invoker, channel, and normalized date range. Fluxer issues no broad bearer authority to the application.
7. The application returns a request for `channel.messages.bulk_delete` with a bounded exact message-ID set. Fluxer verifies that operation was declared, that every target is in the invocation's allowed context, and that the application did not substitute the invoker or an undeclared operation.
8. Because bulk deletion is destructive/high-impact and the application selected the final message set, Fluxer renders an invoker-only trusted confirmation from normalized server data. Application text cannot replace or weaken that prompt; cancellation or expiry performs no effect.
9. On confirmation, one opaque single-use capability is conditionally claimed. Immediately before the effect, Fluxer rereads suspension, installation generation, authority revision, command policy, `moderator-U`'s native permission/hierarchy, target existence, and operation bounds.
10. If those checks still pass, the native service executes the exact deletion set as `moderator-U`. The application cannot use the bot's managed-role authority to rescue a failed `AS_USER` check, and retry observes the deterministic effect identity instead of deleting a second set.
11. The causal audit chain records the actual invoker, application, command, interaction, `AS_USER` mode, normalized operation facts, and committed effects without arguments, arbitrary application payloads, response content, tokens, or private confirmation text.
12. The application may complete the interaction with a truthful public or invoker-only result consistent with the committed outcome. A partial/ambiguous native result remains fail-closed for reconciliation; a receipt, defer, or modal opening alone never marks the component/input effect successful.
13. If an owner or `Administrator` later approves a broader bot permission declaration, that is a separate versioned relationship-authority change with preview, audit, hierarchy checks, and ceiling update. `manager-M` cannot approve that expansion merely because the earlier exact install was allowed.
14. Removing the Fluxer broker fields in a later command revision is an authority-semantic change requiring review; it cannot silently convert an in-flight delegated capability into autonomous bot authority. Old interactions remain bound to their original revision and expire normally.

### Conclusion and implementation gap

The enhanced path is opt-in at two separate boundaries: code-defined installation permissions and the structured native-action broker. The first authorizes only an exact initial bot role; the second authorizes only a confirmed, current-state-checked native effect under the selected principal. Keeping those grants separate is what preserves portability and prevents `Manage Guild`, command visibility, or bot permissions from becoming universal delegated authority. Every broker/declaration/audit element is planned implementation work.
