# Application Data Lifecycle: Uninstall, Reset, and Permanent Deletion

Status: repository-derived lifecycle matrix under QAD-015, QAD-019 through QAD-038, QAD-129/130, QAD-162, QAD-178, QAD-188, QAD-193, QAD-197, QAD-221, QAD-233, and QAD-234/QAD-235. Minimal deletion-journal duration follows QAD-221's deployment-owned formula.

## Lifecycle meanings

- **Uninstall** ends one active community relationship generation but preserves its `(community_id, application_id)` record as `DORMANT` for deliberate reinstall.
- **Community reset** is an authorized selective/full return of community-owned configuration to its application/default state; command override rows may be removed, while active declarative values advance to an `INHERIT` revision. It does not uninstall or delete the application. QAD-222's separate **Forget stored value** action erases a dormant declarative value and its value-bearing history.
- **Permanent application deletion** irreversibly removes the application and every active/dormant community relationship/configuration after revoking authority.
- **Permanent community deletion** irreversibly removes all community-scoped application data as part of the community's existing full deletion.

None of these is suspension. Application-owned external databases are outside Fluxer.

The QAD-233 developer dashboard has no independent data lifecycle. It reads the same application-owned sources listed below, stores no shadow registry/export, and rechecks current ownership for every request/deep link. Suspension permits only the safe read-only diagnosis and credential/transport repair defined by the suspension contract. Ownership loss revokes access immediately; permanent application deletion makes the dashboard unavailable as soon as credentials/authority are revoked, before background child cleanup finishes.

QAD-235 contextual role/channel navigation likewise stores no independent policy, summary, or deep-link record; its reverse query rows are rebuildable source-owned indexes removed with the referenced source/resource. QAD-234's manager-owned recommendation follows dormant community configuration lifecycle, not user preference retention.

## Legacy bot relationships

A pre-rollout bot membership with no `(community_id, application_id)` installation row remains explicitly legacy under QAD-012/QAD-013. Rollout and recovery never infer a managed role/generation from names, assignments, or bot membership and never synthesize an installation row. Its ordinary bot token, membership, roles, removal, and permission behavior remain the current behavior until the community explicitly removes it and performs a fresh installation through the new lifecycle.

Legacy status does not bypass instance safety or owner-ending deletion. Application-wide suspension and application/community-scoped suspension are keyed by authenticated application plus community and block legacy bot REST/Gateway/interaction authority without requiring a managed installation row. A community may remove the legacy bot through its existing ordinary member path; there is no managed role to clean and no dormant managed relationship is created. Clearing suspension never converts or reinstalls it.

Permanent application deletion revokes application credentials first, then uses the existing application/bot membership index to remove legacy bot members alongside managed-installation child cleanup. It does not guess or delete an ordinary role by name or current assignment. Restore replays application deletion/suspension before bot authority opens; a restored legacy membership cannot reactivate a deleted or suspended application. These compatibility paths remain until all legacy relationships disappear naturally or a separately approved adoption migration replaces QAD-012/QAD-013.

## Data matrix

| Data | Successful uninstall | Permanent application deletion | Permanent community deletion |
|---|---|---|---|
| Relationship identity/generation/state | retain as `DORMANT` without time-based expiry while both owners exist | delete after every installation cleanup; retain minimal deletion journal/tombstone | delete; retain minimal deletion journal/tombstone |
| Bot member/managed role/assignment | remove and verify absent | same for every installation | removed with community resources |
| Managed-role presentation and last approved permission proposal | retain dormant as community-owned desired configuration; show in reinstall review | delete | delete |
| Supplemental ordinary role assignments | not retained/reassigned by Fluxer | no special data | roles/community deleted |
| Optional code-defined bot permission declaration/revision | application-global source remains; changing/removing it does not mutate the dormant ceiling | delete with application source | application-global source remains |
| Command/category definitions/manifests/history/dashboard views | application-global source remains; dashboard reflects dormant installation | revoke dashboard, then delete source/drafts/heads/targets/category keys after tombstone; audit snapshots remain by policy | application-global source remains; remove this community target/config and dashboard reflects removal |
| Community command aliases/availability/restrictions/approval state | retain dormant until authorized reset or owning application/community deletion; no time-based expiry | delete | delete |
| Community provider recommendations | retain dormant; ignore unavailable/name-mismatched provider until the same identity/name is active | delete rows selecting the application/commands | delete |
| Declarative setting schema | application source remains | delete | application source remains |
| Community declarative values/versions/reference-invalid state | retain dormant; application access revoked, managers may reset | delete | delete |
| Community duplicate-provider/presentation preferences | retain dormant for reinstall | delete application references | delete community-scoped rows |
| Account-wide favorites/hiding/provider preference | retain because application may exist elsewhere | delete references to deleted application/commands | retain account-wide rows; delete only community-specific preference |
| Passive usage ordering | no extension of its pending TTL; dormant community stops accumulating | delete references | delete community scope |
| Public bot-authored messages | preserve content; controls inert; explicit reconciliation required after reinstall | preserve/anonymize/remap author under current deleted-bot behavior; strip authority/state | delete with community/message data |
| Component per-user state | retain dormant only for explicit definition-identical message reconciliation | delete | delete with message/community |
| Ephemeral recipient copies | active copy remains only to normal dismissal/expiry; controls/app edits revoked | same, with deleted/suspended attribution as applicable | expire/remove because conversation/community no longer exists; submitted reports separate |
| Interaction tokens/capabilities/pending actions | immediately terminal | immediately terminal globally | immediately terminal for community |
| Application credentials/OAuth authorizations/transport keys | application-global credentials remain for other installations | revoke/delete; encrypted key material destroyed after required verification | application-global credentials remain |
| Installation/command/configuration activity and guild audit | retain through existing 45-day audit TTL, with dormant state | retain existing audit snapshots through their policy/TTL | guild audit removed under community deletion; instance/admin deletion audit follows its policy |
| Submitted safety report evidence | QAD-211: retain while open/held, then 180 days after terminal resolution | same shared QAD-211 lifecycle; owner deletion does not reset it | same shared QAD-211 lifecycle, subject to exact hold/erasure rules |
| Search/cache/reverse indexes | remove active availability; retain only needed dormant manager lookup | delete/rebuild references | delete/rebuild references |

“Indefinitely” for dormant community configuration is the already accepted product behavior: it ends only by authorized reset or permanent application/community deletion, not elapsed uninstall time.

## Reinstall review

Reinstall allocates a new lifecycle generation and new managed-role ID. The install review shows:

- current permission source: saved code declaration/revision or normalized invite request;
- dormant managed-role presentation and last approved permissions;
- differences/new permissions and commands/authority revisions;
- dormant command/declarative configuration that will become active;
- invalid/deleted resource references that remain `Needs attention`.

Nothing grants authority merely because it was retained. Invite-mode applications continue to take the normalized set from each OAuth request, with `Manage Guild` limited to personally held bits. Code-defined applications take the current saved declaration/revision and permit `Manage Guild` to approve exactly that set beyond personally held bits. The exact first-install result becomes the relationship's retained authority ceiling in either mode. The optional application declaration survives uninstall, but publishing, changing, or removing it never rewrites a relationship ceiling. On reinstall, `Manage Guild` may approve only a set at or below that ceiling. Owner/`Administrator` is required to raise it or perform another managed-bot authority mutation. The new role receives only the applicable approved set. Retained presentation may be reapplied after ownership is established. Supplemental ordinary roles are never silently reassigned.

The source migration is prospective and compatibility-preserving. Existing applications remain in invite mode; an absent declaration is not reinterpreted as a code-defined empty set. Fluxer does not infer a declaration, managed relationship, or ceiling from old links, memberships, or roles, and it does not alter existing legacy bots. A later code opt-in changes future consent only.

## Manager reset operations

Owner/Administrator/Manage Guild may reset while active or dormant:

```text
managed-role presentation/default proposal
one command
all commands
declarative settings
all community-owned application configuration
```

Reset is version-checked, explicitly summarized/confirmed for bulk scope, and audited. Managed-role presentation returns to its defaults, selected command override rows are removed, and active declarative settings advance to a new `INHERIT` revision without rewriting their history. For a dormant declarative key, the separately labelled QAD-222 **Forget stored value** action first advances the head and then deletes that key's value-bearing current/historical rows and reference state; it is not an ordinary reset and the erased snapshot cannot be restored. Neither operation deletes application-global definitions, value-free audit/report evidence, public messages, or the dormant relationship itself, and neither reinstalls or reactivates the application.

Deleting a user preference uses that user's existing preference authority, not community manager authority.

## Permanent application deletion sequence

1. write permanent tombstone and revoke credentials/sessions/interaction authority;
2. block install/publication/delivery and enumerate active/dormant relationship child operations;
3. run QAD-162 uninstall cleanup for every active/incomplete relationship and strip component authority;
4. remove community command/declarative/configuration/provider-recommendation and user preference references;
5. delete the optional required-permission declaration and command/declarative schemas, drafts, immutable heads/revisions/targets after no live relationship references them;
6. anonymize/remap retained public message authorship using current deleted-bot behavior and delete per-user component state;
7. destroy encrypted interaction signing keys/transport secrets and delete OAuth authorizations;
8. verify reverse indexes/object references, then complete the deletion journal.

Cleanup is resumable under QAD-194. The public application ID/Snowflake is never reused. Under QAD-205, deletion acceptance durably schedules handle release as an independently reconciled child operation with a deadline no later than 24 hours later. Release conditionally proves the lookup remains owned by the deleted application. An approaching or missed deadline is an operator-pageable product-contract breach; reconciliation continues, but ambiguous ownership leaves the application revoked and handle quarantined rather than transferring it unsafely. Reuse is a fresh claim and never restores the deleted application ID.

## Permanent community deletion sequence

The community deletion orchestrator first blocks scoped application authority, then deletes every active/dormant relationship, retained config/value/preference/usage row, public bot message and component state, managed-role/member resource, guild audit/search/index entry, and private ephemeral conversation copy. Application-global schemas/credentials/history remain for other communities. Child cleanup is idempotent and does not require application availability.

## Minimal non-resurrection journal and backup interaction

The security journal retains only application/community identity, generation/version, deletion scope/time, operation/result, and integrity proof—never content/configuration values/credentials. QAD-222 Forget and QAD-225 expiry add value-free configuration markers containing application/community/setting identity, affected revision or supersession cutoff, operation type/time, and an access-controlled server-keyed integrity proof over only that marker metadata. No retained digest or commitment is derived from the erased value. Restore replays these markers before configuration reads/delivery and purges any restored value-bearing current/history/reference/delivery copy. A marker must live longer than every backup that could restore its target plus the maximum restore-validation/reconciliation/drill window and safety margin; it may be compacted only after no restorable backup can resurrect the data.

Because the repository has no backup-retention/RPO policy, an exact universal number cannot be fixed independently. QAD-221 assigns those values to each deployment's recorded and restore-tested operator policy; its formula and fail-closed restore rule determine the required journal duration.

## Evidence and classification

- Current application deletion anonymizes the bot user and retains/remaps authored messages, while current guild deletion removes channels/messages/members/roles/settings/search data.
- Accepted decisions retain dormant command/declarative settings without automatic time expiry, delete them on authorized reset or application/community deletion as applicable, and preserve inert public messages after uninstall.
- This preserves current message/guild deletion semantics, extends them with durable relationship/configuration cleanup, and prevents retained permission state from silently authorizing reinstall.
