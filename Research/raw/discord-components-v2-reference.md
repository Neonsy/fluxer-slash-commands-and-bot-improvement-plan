# Discord Components V2 Evidence

Status: dated external-contract evidence, not a Fluxer specification or accepted
answer. Verified 2026-07-20 against the official sources below.

## Official references

- [Component Reference](https://docs.discord.com/developers/components/reference)
- [Components Overview](https://docs.discord.com/developers/components/overview)
- [Using Message Components](https://docs.discord.com/developers/components/using-message-components)
- [Discord change log](https://docs.discord.com/developers/change-log)

## Relevant model

The official reference separates components into three categories:

- Layout: action row, section, separator, container
- Content: text display, thumbnail, media gallery, file
- Interactive: buttons, select menus, and form controls

The Container (`type: 17`) is a top-level layout component with an optional
accent color. Its documented child set includes action rows, text displays,
sections, media galleries, separators, and files.

Components V2 messages set `IS_COMPONENTS_V2` (`1 << 15`) per message. Discord
documents that the flag cannot later be removed, that `content` and `embeds` no
longer work in that representation, that attachments must be exposed through
components, and that the message may contain at most 40 total components.
Legacy message components remain a separate supported behavior with at most five
top-level action rows.

The official reference currently restricts radio groups (`type: 21`), checkbox
groups (`type: 22`), and checkboxes (`type: 23`) to modals inside a Label. It does
not support those controls inline in messages.

## QAD comparison and deliberate differences

- QAD-055/QAD-057/QAD-058 accept a distinct composable representation and its
  immutable boundary; QAD-185 adopts the compatible flag and numbered types.
- QAD-185's 40-total-component bound matches the dated Discord contract, while
  Fluxer's 10 top-level limit and exact recursive grammar are Fluxer policy.
- QAD-056/QAD-185 deliberately add capability-negotiated inline radio and
  checkbox controls. That is a Fluxer extension, not a Discord behavior.
- QAD-137/QAD-189 define inert attributed fallback and capability negotiation;
  those are Fluxer compatibility/security decisions.
- QAD-212 rejects file and application-media components in initial ephemeral
  responses even though Discord's general interaction/component contract can
  carry attachments. Public message media remains a separate accepted surface.

Accessibility, per-user state, acknowledgement, concurrency, retention,
authorization, suspension, and reconciliation rules come from QAD and current
Fluxer constraints. This external reference cannot make those decisions sound by
itself. QAD-196/QAD-220 require a dated compatibility manifest and fixtures to
detect later changes to this live contract.
