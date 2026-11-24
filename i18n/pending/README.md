# i18n/pending

One file per redesign area, written by the area's agent: `{ "KEY": "English text" }`. They are **inputs to read, not a catalog**:
the catalog (`i18n/translations.json`) is built from the code (`pnpm i18n:generate` scans every `t('KEY', 'English')`, and since
this round also the table reads `['KEY', 'English']`, `labelKey/fallback` and `make('KEY', 'English')`), so a pending key is
merged when the code that reads it exists, and its English is the code's.

## Merged (2026-11-19)

`access`, `shell`, `orders`, `orderActions`, `orderDetails`, `messages`, `profile`, `stores`, `printers`, and `ordersLive`
(its keys were in the code when the merge ran; see "Still to do" for its placeholders). All keys of those files are in the
catalog with the 11 locales filled (machine translation written by an AI agent; **no native speaker has read them**), except the
eight below, which the code reads under another key:

| Pending key | Read instead as | Why |
|---|---|---|
| `ACCEPT_N_ORDERS`, `REJECT_N_ORDERS` (orders) | `ACCEPT_ORDERS_COUNT`, `REJECT_ORDERS_COUNT` (orderActions) | same text |
| `WAITING_TIME` (orderDetails) | `ORDER_WAITING` (orders) | same text |
| `BRAND` (printers) | `PRINTER_BRAND` (existing) | same text |
| `PRINTER_MODEL` (printers) | `MODEL` (existing) | same text |
| `HOW_WAS_YOUR_EXPERIENCE` (orderActions) | `HOW_WAS_YOUR_NO_CUSTOMER` (existing) | same text |
| `PRINTER_GENERIC_ESC_POS` (printers) | kept as a new key | `src/printing/` (frozen) reads it with this wording |

Rules applied: placeholders are `_name_` (lower case, the repository's), never `:name:` or `_NAME_` (only `CASH_CHANGE_OF` keeps
`:amount:`: it exists on the server with that token). **The English of a key that already existed is never changed**; a screen
that needs other wording gets a new key (`LOGIN_BUTTON`, `LOGIN_OR_DIVIDER`, `FORGOT_LINK_SENT`, `FORGOT_SEND_AGAIN`,
`ORDERS_TAB_IN_PROGRESS`, `COPY_DELIVERY_FEE`, `PLEASE_TRY_AGAIN`, `APP_VERSION`).

`UNREAD_KEYS.md` lists the catalog keys no code reads any more (kept on purpose).

## Merged (round 1 of the one-look pass, 2026-11-19)

`fix-actions`, `fix-content`, `fix-details`, `fix-orders`, `fix-printers` and `fix-round1` are in the catalog with the 11 locales
filled (machine translation, no native speaker; "store" is each locale's word for a business: tienda, magasin, negozio,
Geschäft, loja, butik, winkel, المتجر, κατάστημα, магазин, mağaza). Two things the code could not say are now written so the
catalog finds them: the clock words (`CLOCK_DAYS_HOURS`, `CLOCK_HOURS_MINUTES`) are literal `t()` calls, and the account form
lists its labels as `labelKey: 'NAME'` (the scanner's `labelKey` pattern accepts a one-word key).

Standing rule kept: the English of a key that already existed on `main` is never changed. Where a fix agent changed a fallback
the screen now has a **new key** and the old one stays in the catalog untouched: `SEND_REVIEW` -> `SEND_REVIEW_BUTTON`,
`UNASSIGN_DRIVER` -> `UNASSIGN_DRIVER_BUTTON`, `SAVE_PRINTER` -> `SAVE_PRINTER_BUTTON`, `WRITE_MESSAGE` -> `WRITE_A_MESSAGE`,
`FORGOT_PASSWORD_TEXT_MESSAGE` -> `FORGOT_PASSWORD_INSTRUCTIONS` (the last two had been changed in the first merge: their
`main` entries, with their translations, are restored), `IP_ADDRESS` ("Ip address") -> `PRINTER_IP_ADDRESS` ("IP address"),
`INVALID_ERROR_IP_ADDRESS` -> `PRINTER_INVALID_IP_ADDRESS`. `TRY_AGAIN` stays "Try Again" (the sentence-case button is `TRY_AGAIN_SENTENCE`).

One deliberate difference from `main`: the twelve quick-message keys (`ADMIN_MESSAGE_1..4`, `STORE_MESSAGE_1..4`,
`DRIVER_MESSAGE_1..4`) hold an empty English, not the key-looking `admin_message_1` of `main` (the owner's decision: a key is not
a message; `Chat/quickMessages.ts`). They are runtime variables of the project's own dictionary, skipped by the gates.

## Still to do when the live area is done

`NewOrderNotification/` and `WebsocketStatus/` still write `:count:`, `:time:` and `:name:` (keys `NEW_ORDERS_COUNT`,
`NEW_ORDERS_COUNT_ONE`, `PRINTER_AND_MORE`, `PRINTER_LAST_FAILED`, `CONNECTION_PRINTER`, `CONNECTION_LIVE_DESCRIPTION`,
`CONNECTION_RECONNECTING_DESCRIPTION`, `CONNECTION_OFFLINE_DESCRIPTION`). Change them to `_count_`, `_time_`, `_name_` (fallback
and `.replace`), then `pnpm i18n:generate`: the 11 locales of those keys already carry the `_x_` form.
Any key added after this merge: `pnpm i18n:generate`, `pnpm i18n:missing --write ...`, fill, `pnpm i18n:apply-batch ... --strict`.
