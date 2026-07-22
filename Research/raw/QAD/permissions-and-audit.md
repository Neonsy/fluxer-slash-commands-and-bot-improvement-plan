# Permissions and Audit

Accepted process: `trails/04-execution-authority-and-audit.md` and the policy portion of `trails/03-command-picker-preferences-and-policy.md`.

## Decision status

QAD-038 is resolved: Discord-compatible applications retain invite-selected permissions and the existing held-bit ceiling for a `Manage Guild` installer. An application may instead opt into a versioned code-defined permission declaration; only then are URL bits non-authoritative and `Manage Guild` may grant the exact declared set beyond its personally held permissions. The committed set becomes the relationship ceiling in either mode; later expansion, hierarchy-position changes, and supplemental-role assignments require the community owner or `Administrator`. See `question-routing.md`.

QAD-235 separately closes contextual role/channel navigation: only community owner, `Administrator`, or `Manage Guild` may receive policy-reference counts and open the filtered Integrations editor. `Manage Roles` or channel-management permission alone confers no command-policy read or write authority. This does not resolve or alter QAD-038.

## Proposed direction

- Separate discovery, invocation, data access, execution authority, and target hierarchy checks.
- Derive user-triggered action authority from trusted server-side interaction state rather than bot-supplied identity.
- Derive autonomous action authority from the authenticated bot user and its real community permissions and hierarchy.
- Carry structured interaction attribution into audit records.
- Treat exact user-delegated actions as a separate threat-modeled project with revalidation, expiry, replay prevention, and revocation.
- Do not treat confirmation, audit, or final bot checks as substitutes for the installed authority ceiling and owner/`Administrator` expansion gate.

## Resolved specifications

- `specs/application-install-permission-source.md`
- `specs/command-authority-manifest.md`
- `specs/application-audit-contract.md`
- `specs/delegated-capability-contract.md`
- `specs/delegated-native-operation-registry.md`
- `specs/delegated-action-confirmation-policy.md`
