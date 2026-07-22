# Application Install Permission Source

Status: accepted contract under QAD-032 through QAD-038. This specification preserves the Discord-compatible OAuth invite model and adds an explicit code-defined permission source without confusing command invocation permissions with bot installation authority.

## Current repository basis

- `OAuthAuthorizeRequest` and `OAuthConsentRequest` accept the standard optional `permissions` string.
- `OAuth2RequestService.authorizeConsent` parses that request, rejects invalid/negative values, normalizes it with `normalizeBotInvitePermissions`, and creates the bot role from the result.
- `OAuthBuilderSection` constructs the same query value from its local permission controls.
- `ApplicationRow` has no persisted install-permission declaration. `canAuthorizeBotInvite` therefore limits a non-administrator installer to permission bits the actor already holds.

The URL is the current requested-permission source. It is not evidence that the application owner selected an immutable required set.

## Application contract

The application configuration publication input adds one optional field:

```text
required_bot_permissions: decimal bitfield string | null
expected_permission_source_revision: positive integer
```

Its semantics are:

- omitting `required_bot_permissions` from a patch leaves the current source unchanged;
- publishing a non-null value opts into `CODE_DEFINED`, including the explicit value `"0"`;
- explicitly publishing `null` opts back into `INVITE`;
- invalid, negative, noncanonical, or unknown permission bits reject the code-defined publication rather than being masked;
- only the application-authenticated developer-publication principal for that same application may write it; an OAuth installer, community manager, bot installation, or invite URL cannot.

Fluxer persists and returns:

```text
permission_source: INVITE | CODE_DEFINED
required_bot_permissions: decimal bitfield string | null
permission_source_revision: positive integer
permission_source_hash: canonical SHA-256 digest of version, source, and declared set
```

The source is derived: `null` means `INVITE`, and a non-null bitfield means `CODE_DEFINED`. Existing applications migrate to `INVITE` with no inferred declaration. Every semantic source/set change uses expected-version compare-and-set and advances the revision/hash; a no-op publication does neither. Community grants and relationship ceilings are never inputs to this application-global record.

## Link builder and portability

In `INVITE`, the existing permission picker remains editable and writes the standard OAuth `permissions` query. Omission requests the empty set under the current compatibility behavior.

In `CODE_DEFINED`, the picker is read-only and reflects the saved declaration. The generated link may include that bitfield so the URL remains useful on Discord-compatible services, but Fluxer treats it only as a compatibility hint. Edited, omitted, duplicated, or stale query bits never override the saved declaration; consent clearly identifies the code-defined source.

## Consent and commit

At consent creation Fluxer resolves and stores an immutable transaction snapshot:

```text
application_id
community_id
permission_source
normalized_permission_set
permission_source_revision
permission_source_hash
installer_id
expires_at
```

For `INVITE`, `normalized_permission_set` comes from the OAuth request and retains current invite normalization. For `CODE_DEFINED`, it comes only from the saved application record. Consent renders exact permission names and the normalized decimal bitfield from this snapshot.

Immediately before claiming the installation operation, Fluxer re-reads the application permission source. A source-mode change or a code-defined revision/hash change terminates the old transaction without installation, membership, or role mutation and restarts consent from the current source. Changing the URL after transaction creation cannot mutate its snapshot.

The initial authorization matrix is:

| Source | Owner / `Administrator` | `Manage Guild` without `Administrator` |
|---|---|---|
| `INVITE` | may approve the normalized known invite set | may approve only if every requested bit is personally held, preserving `canAuthorizeBotInvite` |
| `CODE_DEFINED` | may approve the exact current declaration | may approve the exact current declaration, including bits not personally held |

Neither path offers optional additions, managed-role position selection, or supplemental roles. The exact committed set becomes the relationship's durable authority ceiling. A failed equality, source, revision, held-bit, hierarchy, lifecycle, or compare-and-set check produces no partial installation mutation.

## Later changes and lifecycle

- Publishing, changing, or clearing the code field never mutates an active or dormant relationship ceiling.
- A code-defined increase is a pending recommendation for existing relationships; a decrease is shown as a diff and does not silently revoke granted authority.
- Invite mode has no application-global permission recommendation. A later invite is a reauthorization request evaluated against the retained ceiling.
- `Manage Guild` may reinstall or reauthorize only at or below the relationship ceiling. Owner/`Administrator` is required to broaden it or change permission bits, managed-role position, or supplemental roles afterward.
- Uninstall retains the ceiling and application permission-source record. Permanent application deletion removes the application source; permanent community deletion removes the relationship ceiling.
- Existing legacy bot memberships and roles are not adopted, rewritten, or used to infer either source under QAD-012/QAD-013.

## Required verification

Tests cover both sources; omitted versus explicit `"0"` versus explicit `null`; authenticated and cross-application publication; invalid/unknown bits; current invite-link behavior; held and unheld invite bits; code-defined bits the installer lacks; link edits in both modes; concurrent source/declaration changes during consent; exact consent output; no-partial-mutation failures; durable ceiling creation; reinstall at/below/above the ceiling; and application/community deletion lifecycle.
