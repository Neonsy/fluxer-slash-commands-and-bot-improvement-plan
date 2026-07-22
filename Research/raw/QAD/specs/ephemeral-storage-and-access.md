# Ephemeral Response Storage, Access, and Deletion

Status: accepted architecture under QAD-045 through QAD-054, QAD-142, QAD-188, and QAD-210 through QAD-212. Report evidence follows `report-evidence-retention-and-erasure.md`.

## Separate recipient-scoped resource

An ephemeral response is not inserted into the ordinary channel message partition. It receives the approved message Snowflake but lives in an account-scoped table keyed for its sole server-derived recipient:

```text
ephemeral_response_by_recipient
  recipient_user_id
  response_message_id
  application_id
  bot_user_id
  interaction_id
  community_id
  channel_id
  source_message_id?
  representation
  canonical_body
  version
  created_at
  expires_at
  state                 ACTIVE | DISMISSED | EXPIRED | DELETED
```

Application/interaction lookup tables contain only what the response routes need and carry the same absolute TTL. Rows use database TTL as a cleanup backstop, but the authoritative read condition is `state == ACTIVE && now < expires_at`; asynchronous deletion is never allowed to make an expired or dismissed response readable again.

The row never updates channel last-message/read state, message history, mentions, notifications, pins, forwards, ordinary message counts, or guild/channel message indexes. A recipient sees it only in the relevant conversation's authenticated ephemeral surface. Reload fetches that surface by recipient and context. Gateway create/update/dismiss events target all sessions of exactly that user and never use a channel-wide dispatch.

Ordinary responses expire no later than 24 hours after creation and confirmations no later than five minutes. Requested shorter expiry is stored as the absolute deadline. Edits retain it. Dismissal conditionally changes the terminal state first, dispatches removal to the recipient's sessions, revokes components/application mutation, and queues idempotent physical deletion.

## No initial attachment or media-upload surface

Initial ephemeral responses are short information/action surfaces. They permit bounded text/embed fields and non-media controls, plus platform-owned application icons and community/Unicode emoji already authorized to the viewer. They reject:

- attachment uploads and attachment references;
- File, Media Gallery, Thumbnail, and File Upload components;
- embed image/video/thumbnail fields and application-controlled remote media;
- filenames, private object references, or public media URLs presented as response files.

Link buttons and ordinary safe textual links remain links; Fluxer does not fetch or embed their target as ephemeral media. The response schema returns `EPHEMERAL_MEDIA_UNSUPPORTED` rather than silently dropping media. Public application/bot responses retain the ordinary attachment and rich-media contract.

The public schema remains additively extensible, but supporting ephemeral files later requires a new negotiated capability and a separately approved recipient-authenticated storage/media/report design. The unused defensive private-media design from QAD-188 is therefore superseded for the initial implementation rather than built speculatively.

## Indexing and operational observability

Ephemeral content, component values, URLs, and embeds never enter ordinary message search, report search as unsubmitted content, autocomplete indexes, link previews, analytics event payloads, traces, or logs.

Operational delivery records may retain only response/interaction/application/community IDs, byte/count totals, state transition, safe failure code, transport timing, and timestamps for at most 24 hours. Metrics are aggregate. Logs never contain canonical bodies, submitted values, URLs, response tokens, signatures, or arbitrary application error bodies.

The recipient-scoped table is the only product query surface; this is not a hidden search index.

## Reporting path

While the response is active, only its recipient can create a report from it. The server snapshots the exact displayed response version, application/bot identity, interaction and community/channel context, timestamps, and representation/content required for review into existing private report evidence. Initial ephemeral responses have no attachments to clone. Application text cannot alter the platform attribution or report target.

Submitting the report is a separate durable safety action. It does not make the ephemeral response visible to community managers or other members, and later dismissal/expiry deletes the recipient copy without rewriting already-submitted evidence. Report visibility remains limited to the existing instance report/safety authority. Report evidence follows the same QAD-211 retention, legal-hold, access, account-deletion, and erasure policy as ordinary message-report evidence; the bot-platform implementation must not invent a weaker or second report-retention regime.

The current report service already snapshots message context, while report rows/search have no coordinated expiry/purge lifecycle. `fluxer_marketing/content/policies/privacy.md` separately states that object snapshots live up to one year; repository inspection did not verify the deployed object lifecycle. QAD-211 adds the future shared lifecycle in `report-evidence-retention-and-erasure.md` and requires privacy-policy/legal review.

## Account export exclusion

Ordinary account harvest/export never reads or snapshots ephemeral response rows, canonical bodies, or component state, including a response that is active and undismissed when export generation begins. Export generation therefore cannot extend the product's at-most-24-hour response lifetime or turn transient received application UI into a durable archive artifact.

The archive may contain a static policy/readme statement that ephemeral interaction responses are intentionally excluded; it does not include per-response IDs, counts, application identities, or content as a substitute. Expired or dismissed data is never resurrected for export. Submitted report evidence remains a separately access-controlled safety record and is not inserted into the ordinary account archive unless the future general report/privacy policy explicitly requires it.

## Errors

```text
UNKNOWN_EPHEMERAL_RESPONSE       absent, wrong recipient, or hidden terminal resource
EPHEMERAL_RESPONSE_DISMISSED     authorized application mutation after terminal dismissal
EPHEMERAL_RESPONSE_EXPIRED       authorized application mutation after expiry
EPHEMERAL_MEDIA_UNSUPPORTED      file/upload/media content on the initial surface
EPHEMERAL_REPORT_NOT_ALLOWED     caller is not the recipient or response cannot be reported
```

Recipient reads use the unknown-resource response for another account and do not disclose that a private response exists.

## Evidence and classification

- Current channel messages are persisted, indexed, harvested, and dispatched through channel-oriented paths; none can express a sole server-owned recipient.
- Current ordinary attachments use separate public/media behavior. QAD-212 deliberately avoids extending that surface into recipient-only responses until a future private-media design is approved.
- Current message reports snapshot message context; rows/search have no coordinated expiry while the public policy separately states an up-to-one-year object-snapshot lifecycle. QAD-211 changes this to one prospective cross-copy lifecycle after policy/legal review.
- Current user harvest queries messages by author, so excluding received ephemeral application content preserves that established export ownership boundary.
- This intentionally separates ephemeral resources from ordinary messages, keeps the initial response surface text/control-only, and reuses report snapshots only under the bounded shared evidence lifecycle.
