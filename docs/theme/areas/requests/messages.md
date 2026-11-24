# Requests of area `messages` (the Messages tab, the chat, the ended chat)

## Schema keys (defaults that differ from the mockups; the code reads the keys as they are)

| Key | Value asked | Why | Mockup |
|---|---|---|---|
| `chat_bubble.base.meta` | `{typography.body_sm}` (12 / 1.5) | the time and "Sent to" under a bubble, and the text of the notice pill, are 12 / 1.5; `{typography.caption}` is 10 / 13 | Chat, ChatEnded |
| `conversation_row.base.meta` | `{typography.body_sm}` (12 / 1.5) | the time and the `#1053 · Delivery` line are 12 / 1.5 | Messages |
| `conversation_row.base.ended_color` | `{color.text_muted}` (`#616161`) | an ended order's row is `#616161` in the mockup; the schema has `text_disabled` (`#909090`), which is the disabled chip's ink | Messages (Nora Ali) |
| `chat_bubble.slots.send.shape` | `icon` (radius 8) | the send button is 44 with a corner of 8, as the image button; the slot says `round` (the driver app's) | Chat |

No `THEME-KEY-PENDING` marker is in the code: every key above exists, only its default is off.

## Primitives (owner: shared)

| Item | Why |
|---|---|
| `FilterChip` `trailing` (a count badge after the label) | the `Unread` chip draws a count after its text (`Unread 2`); today the count is written inside the label (`Unread 2`), without the badge |
| `OInput` hint inside the box (`label_position: above` takes every placeholder up) | the chat's field and the search field keep their hint inside the box; both pass an empty `label` to stop the placeholder becoming a label (`label=''`). An `inline` / `hint` prop would say it |
| `NotFoundSource` as `empty_state` | the list's empty and error states still use the legacy `NotFoundSource` (its owner converts it); this area passes only `content` and `conditioned={false}` |

## Backend

| Item | Why |
|---|---|
| `last_message` on each order of the dashboard list (`{ comment, type, created_at, author: { id, name, level } }`) | the last-message line of a row is not drawn (the owner's decision: "not drawn" while the API lacks it, OQ-09), and the role tag after the customer's name (`(Driver)`) needs the author's level. The code already reads `order.last_message.author.level` (or `author_level`) and tags the title when it is not the customer: with the field the tag appears with no app change; the preview line (and `messages.preview`) is added with it |
| a "has messages" filter and an unread filter on the orders list (`where=unread_direct_count>0`) | the `Unread` chip and the search filter only the rows loaded (45 per page); a count with a "+" says there are more |
| the unread counts for more than 100 orders (`api-core` returns none past `excessive_orders_count`) | with more than 100 orders on a page the counts are absent and the tab shows nothing |
| `unread_direct_count` that excludes the "order placed" row (type 0) | it counts once per order today |

## Notes for the coordinator

- Libraries no longer imported by this area: `react-native-gifted-chat`, `react-native-lightbox-v2`, `react-native-parsed-text` (undeclared, came with gifted-chat), `rn-placeholder`, `react-native-fast-image` (only if no other area imports them), `@react-native-documents/picker` (the dead file attach). Still imported: `react-native-image-picker`, `@react-native-clipboard/clipboard`, `react-native-signature-canvas` (behind `messages.signature`, default false).
- `i18n/translations.json` (not mine to edit): `WRITE_MESSAGE` should read "Write a message"; the `STORE_MESSAGE_N`, `ADMIN_MESSAGE_N`, `DRIVER_MESSAGE_N` entries carry machine-translated key text in the other languages (`tienda_message_1`): empty those values. The quick messages already ignore any `<prefix>_message_<n>` text, so nothing shows meanwhile.
- `jest/helpers/b4MessagesDefaults.js` / `b4MessagesUiMock.js` are shared with the ReviewCustomer and order tests: `chatDefaults` gained `orderId` and lost `type`, `messagesOptionDefaults` has a row with `last_direct_message_at` and `unread_direct_count`.
