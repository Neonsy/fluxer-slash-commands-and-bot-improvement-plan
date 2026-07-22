# Installations and Managed Roles

Accepted process: `trails/01-installations-and-managed-roles.md`.

## Decision status

QAD-038 is resolved with two modes. Discord-compatible applications remain in invite mode unless they explicitly publish `required_bot_permissions` through the authenticated application API. Invite mode keeps the standard URL request and current held-permission ceiling for `Manage Guild`. Code-defined mode makes the versioned application declaration authoritative and lets `Manage Guild` complete a first install with exactly that set, including bits the installer lacks. Either committed set becomes the relationship ceiling; only the community owner or `Administrator` may broaden it later or change position/supplemental roles. See `question-routing.md`.

## Proposed direction

- Store application and installation ownership on the role; never infer ownership from its name.
- Make failed install and uninstall operations visible and reconcilable rather than pretending they are atomic.
- Preserve the portable invite path, add the exact code-declared first-install exception, then reject `Manage Guild`-only authority expansion and explain that owner/`Administrator` approval is required.

## Resolved specifications

- `specs/application-install-permission-source.md`
- `specs/application-data-lifecycle.md`
