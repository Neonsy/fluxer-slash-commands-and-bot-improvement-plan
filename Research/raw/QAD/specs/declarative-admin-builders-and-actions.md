# Declarative Administration Builders and Actions

Status: master-plan contract under QAD-125, QAD-130 through QAD-134, QAD-145, QAD-179, QAD-186, and QAD-201. It defines later stacked phases; phase-one typed settings do not depend on these builders shipping.

## Framework boundary

Declarative administration gives an application native, validated setup UI without arbitrary application HTML/JavaScript or a required external dashboard. It has two deliberately different execution classes:

1. **Application callback action:** Fluxer validates and delivers manager input to the application. The application owns any external or bot-private effect. Fluxer can authenticate the manager and constrain later Fluxer API calls, but cannot truthfully preview or roll back arbitrary external behavior.
2. **Fluxer-native declarative action:** a registered platform operation owns validation, preview, authorization, execution, audit, idempotency, compensation, and recovery. Application text never changes the actual operation.

Every screen labels the class. An application callback must never visually imitate a Fluxer-native confirmation or claim platform-enforced effects.

## Phased schema

### Phase 1: typed settings

Use `specs/declarative-settings-schema-and-storage.md`. It ships independently.

### Phase 2: repeatable groups and message templates

Applications may add bounded repeatable groups whose rows use only phase-one field types:

- at most 10 group definitions per application;
- at most 25 rows per group and 100 rows across all groups in one community;
- at most 10 fields per row;
- immutable group/field keys and stable row Snowflakes;
- manager-controlled create/reorder/edit/delete under configuration-version CAS;
- all rows count toward a 256 KiB canonical community structured-configuration cap unless stored as a separately selected builder resource below.

Message templates are separately versioned builder resources because rich payloads do not fit ordinary scalar settings:

- at most 25 active templates per application/community;
- immutable template key and resource Snowflake;
- at most 256 KiB canonical payload per template and 2 MiB across active templates;
- normal content up to Fluxer's current 4000-character bot-message limit;
- up to the current 10 embeds with the existing embed field/title/description/aggregate validators;
- either legacy rows or QAD-185 structured rich components, never a mixed representation;
- explicit compatible `allowed_mentions`, defaulting to none for roles/users/everyone;
- no raw HTML, script, remote executable content, arbitrary API request, or phase-two attachment-byte store;
- media is allowed only through a later reviewed community/application asset resource or an already valid message-schema reference—never by fetching an arbitrary manager/application URL during publish.

The real message request schemas and current permissions are revalidated at preview and execution. The builder does not fork message validation constants.

### Phase 3: admin actions and self-role panels

An action definition has an immutable 1–64-character key, localized title/description/submit label, stable class/operation, bounded typed input schema, setting/builder dependencies, availability declaration, and result contract. Applications may publish at most 25 active admin actions and each action may contain at most 25 input fields. Canonical definition size is 64 KiB; the complete action manifest remains within the 512 KiB declarative schema cap.

Initial Fluxer-native admin operations are intentionally narrow:

- `PUBLISH_APPLICATION_MESSAGE`
- `UPDATE_APPLICATION_MESSAGE`
- `DELETE_APPLICATION_MESSAGE`
- `PUBLISH_SELF_ROLE_PANEL`
- `UPDATE_SELF_ROLE_PANEL`
- `DELETE_SELF_ROLE_PANEL`
- `RECONCILE_APPLICATION_MESSAGE` after reinstall

These are registry entries with typed handlers, not developer-selected REST method/path strings. More native operations require a new reviewed registry entry, authority declaration, audit schema, tests, and capability evolution where necessary.

## Message publish/update/delete

- The target must be a current community channel the initiating manager can view and the application bot can view/send in.
- The bot must have every content-specific permission at execution (`SEND_MESSAGES`, `EMBED_LINKS`, attachment/media permission when later supported, and so on).
- Platform execution uses the installed bot user as the message author; manager identity remains invoker/causation attribution. It never fabricates a user-authored message.
- Update/delete accepts only a message currently owned by that application installation relationship and expected message version. Community moderators retain their ordinary delete authority outside the builder.
- Preview renders the exact sanitized message using the actual client message components, marks mentions that would notify, identifies the application/channel/authority, and never causes mentions, link unfurls, attachment fetches, or component activation.
- Publish/update requires a final `Publish`/`Update` confirmation against the preview hash. Delete always requires a destructive confirmation naming the exact message/channel.
- A successful publish returns the public message link plus an invoker-only ephemeral result. The public message is the effect, not an ephemeral copy.

Application connectivity is not required for a purely Fluxer-native message action, but the installation must be active/unsuspended and the bot authority valid. Application-handled actions retain QAD-133 offline disablement.

## Self-role panel builder

A self-role panel is a bot-managed public message plus a server-owned mapping that lets a user add/remove roles only on themselves.

Initial grammar:

- presentation mode: toggle buttons, exclusive select, or multi-select;
- 1–25 options, each with stable option key, role ID, 1–100-character localized label/description, and optional Unicode or accessible community emoji;
- multi-select declares `min_values`/`max_values` within the option count; exclusive selection may declare whether choosing one removes another role from this same panel;
- optional eligibility policy may narrow by current role/native permission but cannot widen channel visibility;
- result is always an invoker-only ephemeral success/failure explanation; public control presentation remains per-user as required by QAD-186.

At publish and every click Fluxer verifies:

- panel/application/installation/message version and channel access are current;
- mapped roles still exist, are not `@everyone`, are not managed, and remain below the bot's authoritative managed role;
- the bot currently has `MANAGE_ROLES` and can apply every requested change;
- the user is still a member, is changing only their own roles, satisfies eligibility, and has not exceeded the current selection rule;
- no application-supplied option can reference an unregistered role or change another user.

The community owner/`Administrator`/`Manage Guild` may configure/publish the panel under the accepted Integrations authority. Actual self-assignment runs with the bot's explicitly approved role authority; it is not a delegation of `Manage Roles` to the clicking user. Audit attribution records bot authority, invoking user, panel/message identity, and exact normalized role effect.

Deleted/inaccessible roles disable their options, create manager/application attention, and yield an invoker-only safe explanation. Fluxer never substitutes another role.

## Application callback actions

The application declares bounded inputs using phase-one types. Submitting the form is an interaction from the authorized manager and includes the effective configuration version and exact action revision.

- The UI identifies the receiving application and shows which field categories will be shared.
- The submit step is an explicit confirmation; an application may additionally mark it destructive, but cannot suppress server-required confirmation for a later structured native operation.
- Fluxer rechecks manager permission, dependencies, installation, transport health, schema version, and rate limits before delivery.
- The application may respond only to the invoking manager through the approved ephemeral response contract from this settings surface. Public messages or native side effects require their ordinary bot authority or a separately registered Fluxer-native request.
- Fluxer does not infer truth from the action name or developer result text. The result is labeled application-provided.
- Offline/unhealthy actions are disabled and never queued. A delivery race fails immediately and requires fresh manager intent.

Application/external partial effects cannot be rolled back by Fluxer. A response may report `SUCCEEDED`, `FAILED`, or `PARTIAL` with bounded user-safe text and links, but this is application-provided status. The platform stores only safe delivery/result metadata for the normal 24-hour trace window, not form values or arbitrary response bodies.

## Native operation lifecycle and partial failure

Every confirmed native action creates a durable operation with:

- application/community/installation generation;
- action definition/revision and builder resource/version;
- manager invoker, acting bot, expected target/message/config versions;
- immutable normalized plan/hash and confirmation hash/time;
- idempotency key, deterministic ordered effect IDs, status/result, causation/audit IDs;
- no bearer token or unrestricted API authority.

States are `PREVIEWED`, `CONFIRMED`, `EXECUTING`, `SUCCEEDED`, `FAILED`, `PARTIAL`, `COMPENSATING`, `COMPENSATED`, and `COMPENSATION_FAILED`. Confirmation expires after the accepted five-minute window and any plan/version change requires a new preview.

The service validates the entire plan before effects, but it never promises cross-service atomicity. Each effect is idempotent and append-only audited. A retry resumes only uncommitted effects under the same operation ID. Safe automatic compensation is limited to resources created solely by that operation and unchanged since creation—for example, delete a just-created message if binding its server-owned panel metadata fails. Fluxer never deletes/overwrites a pre-existing resource or reverses a role change after subsequent user/admin changes merely to simulate rollback.

Multi-role panel clicks prevalidate all changes, apply deterministic role effects, and report truthful partial status if a concurrent hierarchy/role change interrupts them. Reconciliation retries safe remaining effects; compensation uses expected membership/version checks. The user receives an ephemeral result and authorized managers receive attention for unresolved partial/compensation failure.

## Ownership, lifecycle, and limits

- Builder definitions are application-wide immutable schemas; community builder resources/values are community-owned versioned data.
- Uninstall preserves published public content, makes controls inert, and retains builder configuration dormant. Reinstall never silently reactivates it.
- `RECONCILE_APPLICATION_MESSAGE` requires explicit manager/application choice, current preview, valid new installation generation/authority, and expected message version.
- Permanent application/community deletion follows QAD-197. Ordinary public messages retain/anonymize according to current message lifecycle; authority metadata is revoked.
- Invalid, stale, duplicate, preview, and execute requests consume the QAD-195 route/resource budgets.

## Required validation

- schema boundary/size/localization fixtures across API/OpenAPI/client;
- real preview parity tests proving preview and execution share message validators and canonical hash;
- permission/hierarchy/channel visibility races between preview and execution;
- message ownership/version, mention suppression, uninstall/suspension/reinstall, and stale-generation tests;
- every self-role presentation mode, role deletion/hierarchy change, double click, concurrent selection, and partial multi-role effect;
- application callback offline/race/idempotency/ephemeral-recipient tests;
- native effect crash/retry/compensation tests proving no duplicate public message or unintended role reversal;
- audit/log redaction tests for form/template values and application responses.

## Current Fluxer evidence and classification

- Fluxer's current message schemas already own content, embeds, allowed mentions, attachment, and rich-message validation; builders must reuse them.
- Current permission services and role hierarchy checks remain the final boundary for message/role effects.
- Current bot-authored messages are ordinary messages by a bot user; no separate synthetic author is needed.
- Current version-bearing rows, message/role services, audit actions, and worker patterns provide partial primitives, but current public messages have no expected-version CAS or component ownership. F1 conditional persistence, interaction/public-message versioning, and the QAD-185/186 component lifecycle/effect-ledger outputs are explicit prerequisites before these builders can write interactive messages.

This **extends** current message, permission, and audit services and composes the planned component ownership/lifecycle after its earlier train lands. It **intentionally differs** from arbitrary embedded dashboards by permitting only schema-owned UI and enumerated native effects, while retaining application callbacks for behavior Fluxer cannot own.
