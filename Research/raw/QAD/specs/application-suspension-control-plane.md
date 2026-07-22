# Application and Installation Suspension Control Plane

Status: accepted enforcement, notification, and review design under QAD-140 through QAD-142, QAD-190, QAD-216 through QAD-219, and QAD-233.

## Separate overlay state

Suspension is a reversible instance safety overlay, not credential revocation, uninstall, or deletion.

```text
application_suspension
  application_id
  state                   SUSPENDED | REINSTATING
  version
  reason_code
  operator_reason
  created_at
  created_by_admin_id
  reinstatement_requested_at?
  reinstatement_requested_by_admin_id?

installation_suspension
  application_id
  community_id
  state                   SUSPENDED | REINSTATING
  version
  reason_code
  operator_reason
  created_at
  created_by_admin_id
  reinstatement_requested_at?
  reinstatement_requested_by_admin_id?
```

Absence means not suspended. There is no public installation ID. Application-wide state dominates every community row. Suspension rows are durable and do not TTL. `version` is the compare-and-set boundary; repeated matching requests are idempotent, while a conflicting expected version returns the current safe state.

Private reason codes initially are `COMPROMISED`, `MALICIOUS_BEHAVIOR`, `POLICY_VIOLATION`, `SECURITY_INCIDENT`, and `OTHER`. A nonblank operator reason of 1-1000 characters is mandatory and private to instance safety staff.

A separately selected safe category is one of `APPLICATION_COMPROMISED`, `SECURITY_CONCERN`, `POLICY_ENFORCEMENT`, or `UNSPECIFIED`. It drives localized audience templates and is never formed by copying, truncating, or algorithmically summarizing the private operator reason. Staff may choose `UNSPECIFIED` whenever greater detail would expose an investigation, victim, exploit, or internal control.

## Admin authority and endpoints

Add independent ACLs following current `AdminACLs` conventions:

```text
application:suspension:view
application:suspension:manage
```

The view ACL sees full reason/history. Existing `application:lookup` sees only that the application/installation is suspended and a safe public status. `application:suspension:manage` is required for both suspension and reinstatement; the wildcard continues to include it. Community owner/Administrator/Manage Guild cannot override instance suspension.

Typed admin operations are:

```text
POST /admin/applications/{application_id}/suspend
POST /admin/applications/{application_id}/reinstate
POST /admin/applications/{application_id}/guilds/{guild_id}/suspend
POST /admin/applications/{application_id}/guilds/{guild_id}/reinstate
GET  /admin/applications/{application_id}/suspension
GET  /admin/applications/{application_id}/guilds/{guild_id}/suspension
```

Mutations require the audit reason header already used by admin mutations plus the typed reason code, expected version, and optional request idempotency key. The service validates the application/relationship before conditionally writing the blocking state. It never relies on a later Gateway/UI event to enforce suspension.

## Enforcement boundary

Every path that can create application authority calls one central suspension policy after authenticating the bot/application and deriving any community:

- bot REST actions and structured native actions;
- interaction creation, Gateway dispatch, outgoing HTTP delivery, callbacks, follow-ups, autocomplete, and components;
- command publication/targeting and declarative configuration/action delivery;
- OAuth bot installation and reauthorization;
- response tokens, delegated capabilities, pending confirmations, pending component commits, transport activation, and interaction delivery.

The authoritative state read is cacheable only with versioned invalidation and a short fail-closed maximum age. A suspension write immediately blocks new work at the source of truth, then broadcasts invalidation. Outstanding authority is permanently invalid because its server-side validation checks suspension/generation/state; clearing suspension cannot revive it.

Application-wide suspension actively terminates existing bot Gateway sessions and rejects bot Identify/authentication until reinstated. Installation-only suspension cannot terminate the shared bot session: Gateway remains connected for other communities, but Fluxer suppresses events/interactions from the targeted community and rejects every targeted API action there. This distinction preserves unaffected installations without trusting the bot to self-restrict.

## Developer and community surfaces

While suspended:

- ordinary users cannot discover/invoke commands and see controls as inert/unavailable;
- the installed bot renders offline with a platform-owned `Suspended` indicator on member/profile surfaces; for installation-only suspension this is a community-scoped presentation overlay and does not alter presence elsewhere;
- owner/Administrator/Manage Guild receives a durable affected-community Integrations alert and sees the safe suspension status, but never the private operator reason;
- application owners can use QAD-233's owner-authorized dashboard to read suspension status, retained manifests/configuration, delivery health/history, and rotate/revoke credentials or repair/verify transport; dashboard publication/targeting/recovery actions remain disabled;
- the current application owner receives a durable developer notification for both application-wide and installation-only suspension/reinstatement;
- owners cannot install, publish/target commands, activate transport, deliver interactions, respond, or perform bot actions in the suspended scope;
- community managers retain their ordinary ability to uninstall; uninstall does not clear the instance suspension record;
- delivered ephemeral responses follow QAD-142.

Credential-management access is deliberately retained so a compromised application can be repaired. It does not bypass the suspension policy.

Repair-time endpoint verification is a bounded diagnostic write, not application authority: it may record inert candidate proof but cannot activate a transport, deliver an interaction, or select the candidate while any applicable suspension remains.

Ordinary users receive no proactive notification feed, DM, or mention. Notification/attention creation is reconciled and may fail independently without delaying the authoritative suspension write.

The current application owner also receives suspension/reinstatement mail through Fluxer's existing transactional account-email service. It uses only the owner's current account email and ordinary instance configuration/bounce handling; it never sends to application-provided addresses or community managers. Missing/unavailable email cannot block the transition. The template contains no private operator reason, credentials, endpoint details, or evidence.

Owner notification displays the safe category, exact application/community scope, effective time, disabled surfaces, and platform-generated category-specific remediation/contact guidance. Manager notification displays the safe category, scope, time, and operational effects, without developer remediation or investigation detail. Ordinary surfaces expose only `Suspended`/`Unavailable`. Reinstatement notifies owner/managers, but removes ordinary suspended presentation only after reconciliation succeeds.

## Reinstatement

Reinstatement first conditionally changes `SUSPENDED -> REINSTATING`; it does not immediately enable commands or reconnect delivery. Its candidate set contains only relationships that would regain authority when the overlay clears. A successfully uninstalled `DORMANT` relationship is excluded and stays dormant; reinstatement never installs or reactivates it. An installation still in `INSTALLING`, rollback, uninstall, or cleanup-failure processing blocks the scope until it reaches a verified terminal lifecycle state. For an installation-only suspension whose relationship became `DORMANT`, staff may clear the overlay after application identity and lifecycle-terminal checks; a later reinstall is a separately authorized new generation.

The reconciler verifies:

1. application and bot identity still exist and credentials are valid/rotated as required;
2. each candidate installation that would regain authority is `ACTIVE`, owns its managed role, and the bot member still has it; every excluded relationship is verified `DORMANT`/permanently deleted rather than merely missing resources;
3. the selected interaction transport and signing configuration are verified/healthy;
4. current manifest publication/configuration heads are internally consistent;
5. no permanent deletion/uninstall or broader application suspension dominates the scope.

On success, the suspension row is archived to append-only admin history and removed/marked cleared with a new version; new Gateway sessions/activity may begin only for installations already `ACTIVE`. Dormant/uninstalled relationships remain dormant and require ordinary authorized reinstall before receiving authority. The application must reconnect Gateway or receive a new HTTP interaction. Existing messages stay inert until the application publishes/reconciles a new component version. Old interaction tokens, component claims, confirmations, and delegated capabilities remain terminal.

Failed checks leave `REINSTATING` enforced as suspended and expose a safe failed-check class to authorized staff/developers. A staff member can return it to `SUSPENDED`, repair, and retry without fabricating a successful state.

## Application-owner review

The current owner may create a review request only for the exact current suspension scope/version. One request may be active in `REQUESTED` or `NEEDS_INFORMATION`; duplicate request IDs are idempotent and competing submissions conflict. The request stores a bounded 1-2000-character remediation explanation, owner, timestamps, suspension version, state, and staff decision metadata. It accepts no attachments, credentials, secrets, callback bodies, or private report evidence.

Authorized suspension staff may transition it to `NEEDS_INFORMATION`, `REJECTED`, or `ACCEPTED`. The owner may append one bounded response only while information is requested; staff can repeat that state through versioned transitions without creating parallel cases. Acceptance requests `SUSPENDED -> REINSTATING` through the normal conditional transition and does not mark the review successful until reconciliation finishes. Any suspension-version change makes the old request historical and requires a new request for the new state. Review submission/updates are rate-limited, audited, private to owner/staff, and carry no response-time guarantee. Community managers cannot submit or view developer review content.

## Audit and events

Every attempted transition creates an admin audit record with application, optional community, prior/new state, reason code, actor, timestamp, expected/result version, request identity, result, and safe failure class. It never stores credentials, callback bodies, private URLs, or submitted interaction values.

Successful state changes also create the application activity/guild-visible event needed for authorized developer/community status screens, using a safe status rather than the private operator note. Gateway/cache invalidation is retried/reconciled but is not the authorization source of truth.

## Relationship to adjacent lifecycle states

- **Credential rotation/revocation:** changes authentication material/health; it does not create or clear a safety suspension. Rotation may be performed during suspension.
- **Uninstall:** ends one community relationship/generation and performs its approved cleanup; it does not clear an application-wide or retained installation suspension history.
- **Application suspension:** reversible overlay preserving application, installation, role, commands, configuration, messages, and evidence.
- **Permanent application deletion:** irreversible tombstone/cleanup; reinstatement is impossible and deletion wins over every suspension state.
- **Community deletion:** permanently removes the relationship/community data under its deletion policy; retained instance safety/audit history follows its own policy.

## Evidence and classification

- Fluxer has typed admin ACL constants, typed admin controllers, required/auditable mutation patterns, and an application admin service, but currently no suspension state.
- Fluxer already sends transactional email for security/account/report lifecycle events, including suspicious-activity disablement, temporary bans/unbans, scheduled deletion, report resolution, and completed data harvests; owner suspension mail extends that service rather than adding a separate mail system.
- Gateway can terminate account sessions; an application-wide bot suspension can use the same control-plane shape, while a community-only suspension must be filtered rather than disconnect the shared bot.
- This extends the existing admin ACL/audit model, adds a centralized fail-closed authorization overlay, and keeps lifecycle states intentionally distinct.
