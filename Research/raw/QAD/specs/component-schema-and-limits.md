# Component Schema, Grammar, Limits, and Accessibility

Status: repository-derived compatibility design under QAD-054 through QAD-058, QAD-185, and QAD-230.

## Representation boundary

Add the Discord-compatible `IS_COMPONENTS_V2` message flag at `1 << 15`, currently unused by Fluxer.

- **Legacy representation:** existing content, embeds, attachments, stickers/polls where otherwise supported, plus at most five legacy action rows containing buttons/select menus.
- **Structured representation:** `IS_COMPONENTS_V2` plus top-level structured components. `content`, `embeds`, stickers, and polls are rejected. Uploaded attachments appear only through media/file components.
- A message's representation flag is immutable. Edits may replace a component tree only inside the existing representation.
- Every structured message requires `fallback_text` so an unsupported client renders attributed, inert meaning rather than raw or missing content.
- Under QAD-212, initial ephemeral responses additionally reject File, Media Gallery, Thumbnail, File Upload, attachment references/uploads, and media-bearing embed fields. Those types remain available where otherwise permitted on public bot-managed messages and forms.

## Type registry and allowed placement

Preserve current Discord numeric component types and fields where compatible:

| Type | Component | Initial placement |
|---:|---|---|
| 1 | Action Row | legacy/structured message top level; container child |
| 2 | Button | action row; section accessory |
| 3 | String Select | message action row; modal label |
| 4 | Text Input | modal label only |
| 5 | User Select | message action row; modal label |
| 6 | Role Select | message action row; modal label |
| 7 | Mentionable Select | message action row; modal label |
| 8 | Channel Select | message action row; modal label |
| 9 | Section | structured top level; container child |
| 10 | Text Display | structured top level; section/container child; modal top level |
| 11 | Thumbnail | section accessory only |
| 12 | Media Gallery | structured top level; container child |
| 13 | File | structured top level; container child |
| 14 | Separator | structured top level; container child |
| 17 | Container | structured top level only; containers cannot nest |
| 18 | Label | modal top level only |
| 19 | File Upload | modal label only |
| 21 | Radio Group | modal label; Fluxer-rich message action row |
| 22 | Checkbox Group | modal label; Fluxer-rich message action row |
| 23 | Checkbox | modal label; Fluxer-rich message action row |

Types 21-23 use Discord's current numbers/fields. Their inline message placement is a Fluxer extension negotiated by `fluxer.forms.choice-controls.v1`; legacy messages and unnegotiated applications remain modal-only. Inline choice groups still emit ordinary type-3 message-component interactions and retain per-user UI state.

Unknown component types are never accepted on create/edit. A client that receives a newer known-to-server type without negotiating it renders the message fallback and inert unavailable control.

## Layout grammar

- **Action Row:** either 1-5 buttons, exactly one select, exactly one radio group, exactly one checkbox group, or 1-5 individual checkboxes. Different interactive kinds cannot mix in a row.
- **Section:** 1-3 Text Displays plus exactly one Button or Thumbnail accessory.
- **Container:** 1-10 children drawn from Action Row, Text Display, Section, Media Gallery, File, and Separator. No Container child.
- **Label:** exactly one Text Input, select, File Upload, Radio Group, Checkbox Group, or Checkbox.
- **Modal:** 1-5 top-level Label or Text Display components; title 1-45 and `custom_id` 1-100. At least one interactive Label is required.
- Component tree depth is at most four nodes including message/modal root. Component IDs are optional unsigned 32-bit integers, unique within the message/modal; zero is treated as absent and Fluxer fills unused IDs deterministically in traversal order.
- Every interactive `custom_id` is 1-100 UTF-8 characters, unique within that message/modal version. It is opaque application data, not a trusted operation/target and not a secret.

## Message and tree limits

Initial code constants:

| Limit | Value |
|---|---:|
| Structured top-level components | 10 |
| Components across complete structured tree | 40 |
| Legacy action rows | 5 |
| Buttons or individual checkboxes per row | 5 |
| Canonical component-tree JSON | 256 KiB UTF-8 |
| Structured message `fallback_text` | 1-2000 characters |
| Text Display | 1-4000 characters each |
| Sum of Text Display, labels, descriptions, option labels/descriptions, and fallback | 6000 characters |
| Uploaded attachments/files per message or form | existing Fluxer maximum 10 |
| Media Gallery items | 1-10 |
| Media/thumbnail alt description | 1-1024 characters when present |

The 40-component baseline follows current Discord Components V2. The 4000 text-display limit follows Fluxer's existing bot/webhook message length; the 6000 aggregate follows its existing embed budget and prevents many nested text nodes bypassing it.

## Interactive field limits

- **Button:** style primary/secondary/success/danger/link; label 0-80; optional one emoji; at least label, emoji, or accessibility label. Link buttons require one safe URL and prohibit `custom_id`; interaction buttons require `custom_id` and prohibit URL. Premium/SKU buttons are out of scope.
- **String Select:** 1-25 options; label/value 1-100; description 0-100; placeholder 0-150; `0 <= min_values <= max_values <= option count`, default max 1.
- **User/Role/Mentionable/Channel Select:** placeholder 0-150; `0 <= min_values <= max_values <= 25`, default max 1; at most 25 default values. Channel types must be known Fluxer channel enums.
- **Text Input:** short/paragraph style; minimum 0-4000, maximum 1-4000 with min <= max; value max 4000; placeholder max 100.
- **File Upload:** `0 <= min_values <= max_values <= 10`; actual files use the invoking account/channel upload limit and existing scanning pipeline.
- **Radio Group:** 2-10 options, exactly zero/one default, required defaults true.
- **Checkbox Group:** 1-10 options; `0 <= min_values <= max_values <= option count`; required defaults true/min 1.
- **Checkbox:** boolean default false; a required true agreement uses a one-option required Checkbox Group rather than changing boolean meaning.
- Radio/checkbox option value and label are 1-100; description 0-100.
- **Label:** visible label 1-45; description 0-100.
- **Separator:** divider boolean; spacing small (1) or large (2).
- **Container:** optional accent color `0x000000`-`0xFFFFFF`; optional spoiler boolean.
- Media URLs use an existing uploaded `attachment://filename` reference or a public HTTPS URL accepted through Fluxer's URL/media-proxy safety path. Private/authenticated URLs and URL credentials are prohibited.

Modal components cannot be disabled. Message controls may be disabled. Select/radio/checkbox defaults must satisfy their own min/max constraints.

## Accessibility contract

- Every interactive component has a computed accessible name. Visible label is preferred; icon-only Button requires `accessibility_label` 1-100; a Select without an enclosing visible label requires `accessibility_label` 1-100.
- Every non-decorative Thumbnail/Media Gallery item requires alt description; decorative media explicitly sets `decorative: true`, which prohibits misleading alt text.
- Labels are programmatically associated with modal inputs. Descriptions become accessible descriptions, not part of the control name.
- Disabled controls expose disabled state and their unavailable reason through adjacent platform UI; state is not conveyed by color alone.
- Keyboard order follows schema traversal. Rows, radio groups, checkbox groups, and selects use native list/radio/checkbox semantics; updates preserve or intentionally restore focus.
- `fallback_text` describes the static meaning, application identity, and that controls require a newer client. It cannot impersonate a Fluxer system prompt.

## Command-to-modal presentation contract

QAD-230 preserves the type-9 command-to-modal protocol while making modal placement task-driven. Platform examples prefer the command composer for bounded structured options and use a modal for long-form, tightly related multi-field, form-upload, or otherwise inaccessible inline layouts. The component schema does not encode a normative field-count threshold and does not auto-convert QAD-227 through QAD-229 options into modal components.

Opening a modal keeps the application identity and originating command context visible, focuses the first meaningful input or validation summary, and traps traversal within the live dialog. Validation failure preserves eligible bounded inputs for correction. Dismissal/cancellation restores focus to the originating composer/structured command trigger and produces no modal-submit interaction or success state. Expiry/cancellation clears client form values and form-specific upload authority under the existing lifecycle; applications receive neither hidden cancel values nor a synthetic completion callback.

## Evidence and classification

- Fluxer currently limits bot/webhook text to 4000, attachments/embeds to 10, embed aggregate text to 6000, and alt text to 4096 through shared constants/services.
- Message flags currently leave Discord's `1 << 15` Components V2 bit unused.
- The compatibility grammar and field baseline follows Discord's current [Component Reference](https://docs.discord.com/developers/components/reference), including the rich Container/Section/Text Display model and newer radio/checkbox types.
- Fluxer intentionally extends radio/checkbox controls to negotiated inline rich messages and requires accessible/static fallback, while keeping all limits as reviewed code constants.
