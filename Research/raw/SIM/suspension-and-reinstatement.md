# Suspension and Reinstatement Simulation

## SIM-X01 — community suspension, application-wide escalation, owner review, and fail-closed reinstatement

### Scenario and purpose

Instance safety staff suspend one installation of `app-A`, then escalate to application-wide suspension after compromise evidence. Notifications partially fail. The owner rotates credentials, requests review, and staff accept reinstatement while one installation invariant is broken. This validates authoritative enforcement, audience separation, unaffected-scope behavior, nonblocking notification, review, and reconciliation-only restoration.

### Decision and current-state evidence

- **Controlling QAD:** `../QAD/trails/09-instance-safety-and-suspension.md` -> QAD-140–142, QAD-190, QAD-216–219. QAD-139 explicitly rejects a permanent global product switch and does not prevent targeted suspension or temporary DR hold.
- **Exact spec:** `../QAD/specs/application-suspension-control-plane.md` -> `Separate overlay state`, `Admin authority and endpoints`, `Enforcement boundary`, `Developer and community surfaces`, `Reinstatement`, `Application-owner review`.
- **Current constraints:** CS-ADMIN/CS-INSTALL/CS-DELIVERY/CS-AUTH. `fluxer_api/src/api/admin/controllers/ApplicationAdminController.ts` and `fluxer_api/src/api/admin/services/AdminApplicationService.ts` provide current admin precedent but infer applications from bot membership and have no suspension row/ACL. Bot tokens are shared across communities; Gateway sessions are application-wide. No central installation gate exists.

### Actors, permissions, and initial state

- Safety operator `staff-S` has `application:suspension:manage`; auditor `staff-V` has view only. Community managers have no instance-suspension override.
- `app-A` is active in `guild-G1` and `guild-G2`; one bot Gateway session serves both. Commands, settings, public components, an active ephemeral, response token `tok-old`, and delegated capability `cap-old` exist in G1.
- Operator selects private reason `COMPROMISED`, nonblank private note, and separate safe category `APPLICATION_COMPROMISED`; expected absence/version is current.

### Expected processing and state changes

1. The typed admin request validates application/relationship, ACL, audit reason, private reason bounds, safe category, expected version, and idempotency key. It conditionally writes G1 `SUSPENDED(v1)` before notifications/cache events.
2. The source row immediately blocks bot REST actions targeting G1, interaction creation/delivery/callbacks/follow-ups/autocomplete/components/config/actions/install/reauthorize and transport activation there. Repair-time verification may record inert candidate proof, but it cannot select a transport or deliver work. `tok-old`/`cap-old`/pending confirmations and component commits become permanently invalid through authoritative predicates.
3. The shared Gateway session stays connected because only G1 is suspended. Fluxer filters G1 events/interactions and rejects targeted API actions while G2 continues. It does not trust the bot to self-restrict.
4. Ordinary G1 users no longer discover commands, see controls inert, and see a platform-owned community-scoped `Suspended` indicator/offline overlay only when encountering the bot. They receive no proactive DM/mention/feed and no reason detail.
5. G1 owner/Administrator/Manage Guild sees durable Integrations attention with safe category/scope/time/effects; app owner sees safe category plus remediation/contact guidance and receives current-account transactional email. Private operator note/evidence remains staff-only. Email/attention/invalidation failure is reconciled but never delays or weakens the source suspension write.
6. Existing ephemeral stays visible to its recipient until normal dismissal/expiry, is labeled suspended, retains reporting, and rejects application mutation/control action. Public messages/settings/role/installation/audit remain preserved.
7. Evidence now requires app-wide suspension. A separate CAS writes application `SUSPENDED`; it dominates all installation rows, terminates the bot Gateway session, and rejects Identify/authentication. G2 becomes suspended without copying the private note into community surfaces.
8. Owner may inspect retained manifests/configuration/health and rotate/revoke credentials or repair/verify a candidate transport, but cannot activate it or install/publish/target/deliver/respond/act in the suspended scope. G2's manager uninstalls through the ordinary lifecycle; it reaches verified `DORMANT` and does not clear suspension history or gain a special cleanup bypass.
9. Owner submits one bounded application-wide review tied to that exact suspension scope/version. Managers cannot appeal or view it. Duplicates are idempotent; parallel submissions conflict; version change makes it historical. It stores no attachments, credentials, callbacks, or report evidence.
10. Staff acceptance moves only the application-wide row `SUSPENDED -> REINSTATING`; it does not authorize work. G1 is excluded because its separate community suspension would still block authority, and G2 is verified `DORMANT` and excluded without being reinstalled. After application identity/credentials, healthy transport/key generation, consistent manifest/config heads, lifecycle terminal state, and no deletion are verified, the application-wide history archives and that row clears at a new version. The applicable owner/manager notifications record that scope's reinstatement, but G1 remains community-suspended and G2 remains dormant.
11. Owner submits, and staff separately accepts, a review for G1's exact community-suspension scope/version. G1 now belongs to that transition's candidate set because clearing this overlay would regain authority. Its managed-role assignment is missing, so the community row remains `REINSTATING` and every suspension effect stays enforced. Staff/developer sees only the appropriate safe failed-check class, repairs through installation ownership, and retries; no table patch/force-active or combined-overlay clearing operation exists.
12. After the G1 checks pass, its suspension history archives and community overlay clears at a new version. Owner/managers are notified; ordinary suspended presentation clears only now. G1 may create a fresh Gateway session/new interactions; G2 remains `DORMANT` until a separately authorized reinstall creates a new generation. `tok-old`, `cap-old`, old confirmations, and then-current component versions remain terminal; old panels require new/reconciled component versions.

### Authority, persistence, audit, and failure behavior

- Application-wide overlay dominates community overlay; permanent deletion dominates both and cannot be reinstated. Absence of suspension row means clear only after a verified transition.
- Repeated same mutation ID returns existing result; stale expected version conflicts. Cache is only a short fail-closed optimization with versioned invalidation.
- Every attempt appends admin audit with scope, prior/new state, actor, private reason code (staff audience), safe category, request/result version, and safe failure class—never credentials, URLs, bodies, interaction values, or copied private evidence.
- Notification/email uses existing platform services but is not an enforcement boundary. App-supplied addresses are never used; community managers are never emailed by this feature.
- Suspension rows do not TTL. Audit/history and permanent deletion journal follow their own retention. DR replays suspension journal before authority opens.

### Conclusion and implementation gap

The scenario validates suspension as a reversible, durable overlay separate from credentials, uninstall, and deletion. Community filtering preserves unaffected installations; app-wide session termination handles compromise. Reinstatement is safe only as a reconciled new-authority boundary, not an inverse boolean, and clearing an overlay never reinstalls a relationship deliberately made dormant. No current row, ACL, gate, notification split, review queue, or reinstatement reconciler exists.
