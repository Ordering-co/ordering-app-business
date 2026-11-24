# Phase 9: one look — findings (business app)

Date: 2026-11-19 · Status: **audit only, nothing changed** · Reviewed commit: `2130101` (`docs(theme): the iOS phone pass`) on
`feature/theming-native`. The working tree had only the submodule pointer and `src/config.json` modified, so what was read is the
committed code; the fix agents work on a copy and their changes are not in this text.

How it was made: a read-only pass over `src/ui/src/components/*`, `src/pages`, `product.schema.json`, `docs/theme/components.md` and
`tokens.md`, the 47 mockups with `design/redesign/DESIGN-KIT.md`, and the 115 iOS screenshots of the device pass
(`scratchpad/pass1/ios/NN-*.png`, 1206 x 2622 = 3 px per pt; its report is `verification/ios.md`). Three kinds of evidence, marked in
every finding:

- **Seen**: on a screenshot. Where a number is given it was measured on the pixels (a script walked columns and rows of the PNG; points
  are px / 3; header bottom is y 118, so "15 under the header" is y 133).
- **Read**: in the code or the schema only. Not painted in any screenshot (a state the pass could not reach).
- **Mockup**: the inline values of `design/redesign/screens/*.dc.html` and the kit.

Owners: the area folders of `docs/theme/areas/` (1 shell, 2 access, 3 orders list, 4 order details, 5 messages, 6 stores / menu,
7 profile / printers / ticket), or **primitive** (`src/ui/src/components/shared`), or **schema** (`product.schema.json`).

## The short answer

The nine areas read one theme and, in most places, one place of it. The shared pieces hold: every stack screen is an `ONavbar` with
the same 56 bar (back glyph at x 21, right icons ending at x 381), every sheet has the same header (handle 4, 10 above, 15 under, title
18/600, close glyph centred at x 372), every pinned bar is an `OBottomBar` (line, 10 above, 50 button, 1:2 split, gutter 20 to 382), the
order card matches its mockup box for box, one function (`orderStatusVariant`) colours a status in the list, the details, the messages
and the board, every loading state is a `SkeletonBone`, and pressed feedback is the theme's 0.85 opacity everywhere it was read.
**It is not yet one app in 26 places**, listed below. The five that a user sees in the first minute: outline buttons are black where
every field is grey (H1); the space under the header is 15, 20, 25 or 30 depending on the screen (H2); the same status has two names
(H4) and the same order number five spellings (H5); and the time of day is written four ways (H6).

## Text roles: what each area reads

The schema already gives one key per role, so the table is short; the disagreements are the right-hand column (each is a finding).
"Preset" = the typography token; keys are `components.<x>.base.<key>`.

| Role | Key (preset) | Read by | Where an area reads something else |
|---|---|---|---|
| Screen title | `header.title` (h3 20/700) | every `ONavbar`; the board's header | Login and Home draw `h2` 24/700 (`LoginForm/index.tsx:493`, `Home/index.tsx:97`): the kit's Login title, accepted |
| Header subtitle | `header.subtitle` (body_sm, muted) | every `ONavbar` | none; the content differs by screen (store and time; "Order No. 3460 · Delivery"; "Step 1 of 2") |
| Section title / group heading | `section_header.title` (overline 12/600 capitals) | `SectionTitle`: orders stages, search, profile, alerts, sessions, board history, option groups | `label` as a heading in the printer wizard (`PrinterEdition/PrinterAdd.tsx:67,78,105`, `PrinterFound.tsx:87,167`), the review (`ReviewCustomer/index.tsx:107,135`), the copies (`TicketPreview/index.tsx:163`, `PrintTicketSettings/index.tsx:154`); `body_lg` + count for menu categories (`BusinessProductList/index.tsx:285,368`); `board.column_title` (label) for the tablet's stage names (`OrdersBoard/styles.ts:45`) → H14 |
| Card title / row title | `card.title`, `list_row.title`, `order_card.name`, `item_card.title`, `menu_row.name`, `conversation_row.name` (all label 14/600) | all of them | the hand-off card's name is `h4` 18/600 (`OrderDetails/PartyCards.tsx:189`); the store name is a bare `OText preset='label'` (`BusinessController/index.tsx:177`, no key) → H20 |
| Row detail / metadata | `list_row.subtitle`, `order_card.meta`, `item_card.subtitle`, `menu_row.price` (body_sm muted) | all | the option price is `body` 14 (`StoreProductOptions/index.tsx:39`) where the menu price is 12 → H20 |
| Body, lead | `body` (14); `alert.text`, `empty_state.text`, `toast.text`, dialog message | notices, empty states, dialogs | the lead under a sheet's title is `body_sm` 12 (`StoresList/PauseOrdersSheet.tsx:107`, `OrderActions/RejectSheet.tsx:107`), `new_order_alert.text` is `body_sm`; dialogs and notices 14 → H22 |
| Amounts and totals | `order_card.total_text` (body_lg 16/600), `bill.total` (h4 18/600), `bill.row` (body_sm) | card, details | none found |
| Button label | `typography.button` (14/600; `sm` 12/600) through `OButton`; `link.sizes.md.text` label | every button and link | none (the words differ: H12) |
| Chip, tab, badge text | `chip.text` (14), `chip.selected_text` (14/600), `tabs.base.text` (12/600 on every tab), `badge.text` (12/400), `badge.sizes.sm.text` (10/600), `badge.shapes.plain.text` (12/600), `rating_scale.label` (12) | `FilterChip`, `Tabs`, `OBadge`, `ReviewCustomer` | a badge without `size` falls to `sm` 10/600 (H9); inactive tabs are 600, the mockup's are 400 (H7) |
| Field label / hint / error | `field.label` (label), `field.error` (body_sm, `danger_text`), hints `body_sm` muted | `OInput`, `OTextarea`, `PhoneInputNumber`, `FieldError` (13 uses, three `scope` values with the same keys) | none found |
| Tab-bar label, counter | `bottom_nav.label_text` / `active_label` (caption 10), `badge.sizes.sm` | `TabBarItem` | none |

## Findings, by visibility

### H1. Outline buttons are black; every field and the mockup's outline are grey `#909090`
- **Seen**: `00-start`, `03-login-empty-error` (the email and password boxes: border `(144,144,144)` = `#909090`, 1 pt; the "Email me a login
  code" outline under them: border `(0,0,0)`, 1 pt), `17-history`/`18-history-bottom` ("Load more"), `68-profile-bottom` ("Log out"), `35` ("Print ticket"), `51`, `103` and `97` (Cancel, Edit), `19-search` (Clear). Every neutral outline.
  The Chat's attach button (`53-chat`) also has the black line.
- **Mockup / kit**: "Contorno: borde 1 px `#909090`, fondo blanco, texto negro" (DESIGN-KIT section 2). `tokens.md` T4 records it as an open
  question ("accept a black line (applied)").
- **Rule**: a neutral outline paints `border_strong` (the field's line) and `text`; the engine's single `ink` cannot, so the
  `neutral` outline needs its own line color (`button.colors.neutral.outline_border` or `neutral.ink = border_strong` with the label
  kept `text`). Decide T4 once; today it is the most repeated mismatch of the app.
- **Owner**: schema + primitive (`OButton`).

### H2. The space under the header is 15 on most screens and 20, 25 or 30 on others
- **Seen** (first painted pixel under the bar, bar bottom at 118): 15 → Orders (133), Menu, Profile, Alerts and sound, Product options, Search
  orders, Personal information (all 133). **20** → Order details (138, `OrderDetails/styles.ts:28` `paddingTop: xs`), Messages chips (138,
  `MessagesOption/index.tsx:48` `paddingTop: xs`). **25** → Printers list (143, `PrinterSettings/index.tsx:43` `sm`), Print ticket paper and Ticket
  settings (143, `TicketPreview/index.tsx:70,77`, `PrintTicketSettings/index.tsx:53,55` `sm`), Add printer and Printer found (their content has
  `paddingTop: sm` after the progress bar, `PrinterEdition/PrinterAdd.tsx:36`, `PrinterFound.tsx:53`). **~30** → Stores (148 on `57-stores`; the
  cause is not in `StoresList/styles.tsx`, which adds nothing at the top: to find) and Review (the first text at 147, `ReviewCustomer/styles.ts:21`
  `paddingTop: sm` plus the form gap).
- **Mockup / kit**: the kit's bar is 56 and the content starts under it; the mockups themselves disagree (Main `padding: 15px 20px 0`, Stores
  `10px 20px 0`). `ONavbar`'s own comment says "a screen never adds a space of its own under its bar" (decision H8 of the driver).
- **Rule**: `ONavbar` owns the space (`md` = 15); a screen adds 0. Every `paddingTop` of a screen's content directly under a bar goes.
- **Owner**: areas 3 (Messages chips), 4 (details, review), 6 (Stores), 7 (printers, ticket, printer wizard); the rule is the primitive's.

### H3. The same search field is a labelled box on two screens and a placeholder on two others
- **Seen**: `58b-stores-search`, `59-sheet-pause` (backdrop), `64-menu-unavailable`, `65-menu-after-on`: a bold label ("Search stores", "Search all
  products") above an empty box. `20-search-keyboard` (Orders) and Messages: the text lives in the box as a placeholder. All four open a text
  search of a list, with the same leading magnifier.
- **Read**: `OInput` makes the placeholder the label above the box unless `inline` is passed (`OInput.tsx:49-55,137-140`). `OrdersSearchForm.tsx:111`
  and `MessagesOption/index.tsx:207` pass `inline`; `StoresList/index.tsx:199-205`, `BusinessProductList/index.tsx:436-441` and
  `StoreProductOptions/OptionGroupsSheet.tsx:45` do not.
- **Mockup**: OrdersSearch, Stores and Menu draw a search box with the icon and the placeholder, no label.
- **Rule**: a search field is always `inline` (the box carries its placeholder); a label is for a form field.
- **Owner**: area 6 (three call sites).

### H4. One status, two names: "Ready for pickup" and "Preparation Completed"
- **Seen**: status 4 is "Ready for pickup" on the details chip (`34-after-mark-ready`, `48-4463-ready`) and in the search filters, and
  "Preparation Completed" on the Messages row (`52-messages`, #3460). The map's bottom card reads it the same second way (`49-map`).
- **Read**: `OrderDetails/orderStages.ts:82-87` `statusLabel` maps 4 to `READY_FOR_PICKUP` ("the list says so; the old details said Preparation
  completed"); `PreviousMessages/index.tsx:83` and `GoogleMap/index.tsx:58` still call the raw `getOrderStatus` (`utils/index.tsx:425`).
  `orderStatuses.ts:21` and `OrdersOption/index.tsx:63` use `READY_FOR_PICKUP`.
- **Rule**: one `orderStatusLabel(status, t, order)` in `shared/orderStates.ts` beside `orderStatusVariant`; every chip and subtitle goes
  through it (also `GoogleMap`, the chat's change log is raw API text and stays).
- **Owner**: area 4 writes it, areas 5 and 4 (map) call it; the primitive file hosts it.

### H5. The order number is written in five ways and read unmasked in five places
- **Seen**: "#4471" (cards, Messages row), "Order #4471" (details bar, Review subtitle, sheet titles), "Reject order #4470" (`41-sheet-reject`), "Order
  No. 3460 · Delivery" (chat bar, `53-chat`, `56-chat-ended`), "Order No. 4463" (Print ticket bar, `51-ticket-preview`), "Ask for order #4471"
  (`34`). "Order No." and "Order #" mean the same thing in two neighbouring screens (details → chat).
- **Read**: three implementations of the mask: `OrderActions/rules.ts:43 orderNumberOf` and `OrderDetails/orderData.ts:11 orderNumber` (identical:
  `change_order_id` takes the external id), and `PreviousOrders/orderCardData.ts:8` (a flag). **Unmasked** `order.id`: `PreviousMessages/index.tsx:81`,
  `MessagesOption/index.tsx:67` (the search text), `OrderMessage/index.tsx:83`, `TicketPreview/index.tsx:214`, `OrderDetails/copyText.ts:75`. With
  `change_order_id` on, the card says one number and the chat another. Keys: `ORDER_NUMBER_HASH`, `INVOICE_ORDER_NO`, `ORDER_NO`, `ACCEPT_ORDER_NUMBER`.
- **Rule**: one helper (`orderNumberOf`, the masked number) and one phrase, `ORDER_NUMBER_HASH` ("Order #1053"); "#1053" only where the card has
  no room (the card, the row). "Order No." leaves the UI (the printed ticket keeps its own).
- **Owner**: area 4 owns the helper; areas 5 (chat, messages) and 7 (ticket) switch.

### H6. The time of day is written four ways, and dates two
- **Seen**: "07:04PM" (details bar, `28`; Messages row "02:42PM"; Orders history "12:44PM"; "ASAP(18/11/2026 12:41PM)"), "11:59 PM" and "Until 7:27 PM"
  (Stores `57`, Pause sheet `59`), "7:20 PM" (printer failure, `95b`), and the Accept sheet's "Ready by" (Read, it broke on the pass: A2). The mockup
  writes "12:38 PM".
- **Read**: (a) the project's format through `useUtils().timeFormat` (`hh:mmA`) in orders, details, messages, chat, websocket; (b)
  `StoresList/zonedTime.ts:111 formatClock` ("3:30 PM", own AM/PM, optional 24 h flag) for stores and menu; (c) `printing/formatClock.ts`
  (`toLocaleTimeString`, the device's locale) for printers; (d) `OrderActions/AcceptSheet.tsx:31-32` (`parseTime` or a hard `'hh:mm A'`). Dates
  are `dateFormat` (dd/mm/yyyy) everywhere, but "ASAP(" has no space before the parenthesis (`OrderDetails/orderData.ts:122`).
- **Rule**: one formatter of the project's time format (with an optional zone for a store's clock), used by all four; a space before
  "AM/PM" is the project's format, not each screen's. The format itself (with or without the space) is the owner's call and applies to all.
- **Owner**: shell (the formatter, in `src/utils`); areas 3, 4, 6, 7 switch their call sites.

### H7. The Orders tab pill is smaller than the mockup, and its inactive tabs are bold
- **Seen / measured** (`12-orders-new`, `14`, `17`): track 133 → 169 = **36**, selected tab 137 → 165 = **28**, 4 pt inset. Mockup `Main.dc.html`: track
  **46** (5 padding), tabs **36**, 12 px, inactive at 400. The tabs are under the 44 touch target (`Tabs.tsx` grows the hit slop, the look
  stays). Inactive labels are 600 (`tabs.base.text` is 12/600 for every tab); the mockup bolds only the active one. Known as IOS-B6.
- **Read**: `Tabs.tsx:62-66` takes the schema's `sizes.sm.height` 36 as the whole bar and subtracts the inset, so the track is as high as the size
  says; the mockup's 36 is the tab.
- **Rule**: `tabs.sizes.sm.height` is the tab (36); the track adds the inset (so 46 with 5). Inactive tab weight 400, active 600
  (`StableText` already reserves the width).
- **Owner**: primitive + schema (`tabs`).

### H8. The hand-off card's call and message buttons are black outlines; the customer card's are tonal, the mockup's are white
- **Seen**: `34-after-mark-ready` (black 1 pt outline, black glyph) against `28`/`40`/`45` (blue tint square, blue glyph) for the same two
  actions (call, message), a card apart.
- **Read**: `OrderDetails/PartyCards.tsx:196-216` overrides the slot with `appearance='outline' color='neutral'` (so H1 paints it black); the slot
  (`order_details.slots.call/messages`) is tonal primary.
- **Mockup**: `OrderReadyPickup.dc.html`: 44 square, white fill, no border, glyph `#1862C5`, on the tint card.
- **Rule**: on a tinted card an icon button is `surface` fill, `primary_pressed` glyph (a slot variant `on_tint`), the same two glyphs and
  size everywhere.
- **Owner**: area 4 (+ a slot key in the schema).

### H9. A state word is a 24 px soft pill in one place and a 20 px solid one in another
- **Seen**: "Paid" (`28`, soft green, 24 high, 12 px) against "Always on" (`75-alerts`, solid green, 20 high, 10 px) and the sessions' "Current";
  "Disabled" in the option groups; the history card's "Rejected" is solid red 24 (as the kit's order chips).
- **Read**: `OBadge` defaults to `size='sm'` (20 / 10 px, meant for counters, `OBadge.tsx:31`), so `<OBadge variant='success'>` without a size is a
  counter-sized chip (`Sessions/index.tsx:156`, `NotificationSetting/AlertsAndSound.tsx:85`, `StoreProductOptions/index.tsx:149`). In a group row
  the type chip is `sm` (`PreviousOrders/OrderCard.tsx:220`) and `md` in the card (`:166`).
- **Mockup**: `Sessions.dc.html`: "Current" = `#D6FFF7` / `#00713F`, 24 high, 12 px, radius 10 (`success_soft`, `md`).
- **Rule**: a word with a state colour is `md` and `*_soft` unless it is an order status (solid by the kit); `sm` is only for counts. Default of
  `OBadge` becomes `md` (a count passes `count`).
- **Owner**: primitive (default) + areas 7 (Sessions, Alerts), 6 (option groups), 3 (group row).

### H10. "Waiting" is green on the card and brown in the details; its wording differs too
- **Seen**: `12-orders-new` "Waiting 30:16:35" green with a clock; `14` "Preparing 1186:36:13" green; `40-order-pending-4470` "Waiting 213:23:33" brown
  (`warning_text`). Mockup Main/OrderPending: pending waiting time is `#6B5300` amber.
- **Read**: the card colours the clock by `time_status` (`PreviousOrders/orderTimes.ts`, `timeStateOf`: in time = green); the details row is
  fixed `warning_text` for a new order and `text_muted` for a ready one (`OrderDetails/StatusRow.tsx:41-45`). Two functions write the same
  `mm:ss` / `h:mm:ss` (`PreviousOrders/orderTimes.ts:17 formatClock`, `OrderDetails/orderTimes.ts:113 clockText`), "Late _time_" on the card and
  "Late by" in the details (`ORDER_LATE_BY`, `LATE_BY`). Hours are unbounded ("1904:01:42").
- **Rule**: one `OrderClock` (text and tone) used by card, alert and details; a pending order is `warning_text` unless the project's SLA says
  otherwise, from the same state. One duration formatter; from 24 h on, days ("2 d 3 h").
- **Owner**: area 3 (clock) + area 4 (calls it).

### H11. A long text is cut, wrapped or pushed off the screen depending on the piece
- **Seen**: a button that leaves the screen (`17b-history-top`: "Review custom…" at x 274 to 436 on a 402 screen); a notice cut without an ellipsis
  (`56-chat-ended`: "…you can't send nev"); a label wrapped in a button ("Not / picked up", `34`; "Remove / printer", `97`; "Print with the system /
  printer", `51`); a choice cut with an ellipsis ("Goo…", `36`; "Other (ESC/P…", `79`); a status badge cut ("Order not picked up by custo…", `52`);
  a name that wraps two lines in a card (Stores, `57`). Known as IOS-B3, B9, B11, B13, B15, C10, C15.
- **Read**: `OBadge`, `FilterChip` and `ChoiceTile` force `numberOfLines={1}` (`OBadge.tsx:58`, `FilterChip.tsx:86`, `ChoiceTile.tsx:55`); `OButton` wraps
  unless `fitText`; the ended-chat notice has no limit and its row does not shrink.
- **Rule**: a control whose label is a fixed word (button, tab, rating level, brand tile) shows all of it: it wraps to two lines or its row
  scrolls/wraps, never an ellipsis; a text that comes from the server or the user (a status name, a store name, a note) ends in one ellipsis
  on one line. A row never trades its title's room for a button (the history card's review button goes under the chip or becomes a link).
- **Owner**: primitives (`OBadge`, `ChoiceTile`, `ONotice`), area 3 (history card row), area 7 (wizard tiles), area 5 (ended notice), area 4 (bottom-bar split).

### H12. The same button says different things, in different cases
- **Seen/Read** (fallback texts): **Title Case** "Recover Password" (`ForgotPasswordForm/index.tsx:165`, `09-forgot`), "Save Printer"
  (`PrinterEdition/index.tsx:260`, `81`), "Send Review" (`ReviewCustomer/index.tsx:163`, `36`), "Unassign Driver", "Try Again", "Send Again",
  "Open in Maps", "Copy Text", "Get Verify Code", "Verify Phone" against sentence case everywhere else ("Save changes", "Update password", "Find
  printers", "Show orders"). **Two words for one action**: "Print test" (`PrinterFound.tsx:200`, the button) under the title "Test print" in the
  same card (`81`) and "Test print" on the printer card (`PrinterSettings/PrinterCard.tsx`); "Retry" (stores, menu, options) and "Try Again" (details,
  ticket); "Mark ready" on the card (`PreviousOrders/OrderCard.tsx`) and "Mark ready for pickup" in the details (`OrderDetailsPage.tsx:221`; the
  mockup draws both); "Review customer" (history card, Review bar) and "Write a review" (`StageCards.tsx:190`); "Late by" / "Late".
- **Mockup**: the kit writes sentence case ("Save changes", "Find printers"); the mockups themselves say "Print test" once (PrinterFound) and
  "Test print" once (Printers).
- **Rule**: buttons and titles in sentence case; one verb phrase per action across the app (Retry, Test print, Mark ready for pickup unless the
  card has no room, Review customer). A script can check the case of every `OButton text`.
- **Owner**: `i18n/translations.json` and the owners of each call site (areas 2, 4, 6, 7); the catalog check is the shell's.

### H13. Confirmation dialogs: nine of twelve are titled "Ordering"; the titles and the messages follow no pattern
- **Seen**: `103-logout-dialog` ("Log out?" + a sentence; Cancel outline, "Log out" primary), `97-printer-delete-confirm` (the printer's name as the
  title, "Remove this printer?" as the message; "Remove printer" danger), `73` ("Ordering" as the title).
- **Read**: `shared/confirmAction.ts` defaults the title to `WEB_APPNAME` ("Ordering"); Sessions (3 dialogs), the discard dialog, the order card, the grouped
  card, the details guard, "Make all available" and the photo removal all pass none (9 of 12 `confirm(` calls; only the printer, log out and the
  account have a title). Messages: "Are you sure to delete this session?" with a "Sign out"
  button, "Are you sure that you want to…" (photo, account) beside the short "Remove this printer?" and "This can't be undone." Log out is
  `destructive: false` (primary, as the mockup); the other irreversible ones are danger.
- **Rule**: title = the question or the action ("Log out?", "Remove printer?", "Sign out of this device?"); message = the consequence in one
  sentence; the accept button repeats the verb; **danger** only for what cannot be undone (log out is an account action: primary, kept). Never the app's name.
- **Owner**: primitive (`useConfirm` requires a title) + areas 7, 3, 4, 6 (texts).

### H14. The heading of a group of choices is an overline in one screen and a bold label in another
- **Seen**: `19-search` (DATE, ORDER TYPE, STATUS, SLA'S in capitals) against `79-printer-add` (Brand, Connection, Paper width in 14/600) and `36-review`
  ("How was your experience?", "Anything to add?"); the Menu's categories are 16/600 with a muted count (`62`); the phone's stage title is
  "PREPARING · 43" (`15`) while the tablet board's column is a 14/600 label (read).
- **Mockup**: the mockups themselves split them: OrdersSearch, Notifications, Profile = overline; PrinterAdd, Review, TicketSettings = label;
  Menu = 16/600; OrdersInProgress = overline, TabletBoard = `h2` 14/600.
- **Rule** (proposed): an overline names a **section of a list or a settings page** (SectionTitle); a `label` asks a **question of a form** (the
  wizard's steps, the review). Menu categories keep `body_lg` as a list's own heading; the board's column title is read from
  `section_header` too (same function as the phone's stage title). Needs the owner's yes: it makes the wizard's and the review's headings keep
  their look and the board's change.
- **Owner**: schema (`board.column_title` → `section_header.title`), areas 3, 7; the rule goes in `docs/THEMING.md`.

### H15. A notice's action is a grey filled button; the mockup draws a text link
- **Seen**: `105-search-results` ("Clear" in the "Filters on" banner is a grey filled 44 button), `63-menu-product-off` ("View" in the notice). Known as IOS-B16,
  B17. The same word is a black outline in the search bar (`19`).
- **Read**: `alert.slots.action` = `button` md `tonal` `neutral` (`components.md` section 5); `ONotice` draws it.
- **Mockup**: OrdersOffline, MenuUnavailable: bold text link in the notice's colour.
- **Rule**: a notice's action is a `link` (md, label weight) in the notice's text colour; one slot for every notice.
- **Owner**: schema + primitive (`ONotice`).

### H16. The empty state is drawn four times
- **Read**: `NotFoundSource/index.tsx` (messages), `StoresList/StateBlock.tsx` (stores, menu, options), `OrdersOption/OrdersEmptyState.tsx` (orders, board:
  `<OText preset='body_lg'>` and `body` instead of the `empty_state` keys) and `PrinterSettings/index.tsx:48-49` (own styles). All read
  `components.empty_state` but each composes the tile, the title, the text and the action itself, so a theme edit of the spacing or the title
  reaches three of the four.
- **Seen**: `78-printers-empty`, `105-search-results`, `65-menu-after-on`: the same disc, the same 16/600 title, close in spacing today.
- **Rule**: one `EmptyState` primitive (tile, title, text, action, footnote slot); the four become call sites.
- **Owner**: primitive; areas 3, 5, 6, 7 delete their copies.

### H17. The Menu's "Make all available" bar is hand-made and tonal
- **Read**: `BusinessProductList/index.tsx:478-490` and `styles.tsx:52-58` rebuild the bar (padding, line, bottom space) with a `tonal` `lg` button; every
  other pinned bar is an `OBottomBar` with a `button` slot (solid primary) that also reports its height to the toast (`useReportBottomBar`): a toast
  over this bar covers it. Not seen (`MenuUnavailable` was reached but without the bar).
- **Rule**: `OBottomBar` with a `secondary`/`button` slot; one look for a pinned action.
- **Owner**: area 6.

### H18. One function, two glyphs
- **Seen**: search: the field's leading icon is `magnify` (Material, `vertorIcon='magnify'` in five places) while the header and the empty state
  use `search-outline` (Ionicons), two different magnifiers on `19-search`/`52-messages`. The driver on the order card is the MDI `bike`
  (`PreviousOrders/OrderCard.tsx:198`), in the details `bicycle-outline` (`PartyCards.tsx:250`). Message: `chatbubble-outline` (details, tab
  bar), `chatbubble-ellipses-outline` (chat quick sheet, profile support row), `chatbubbles-outline` (select a conversation). Refresh:
  `refresh` (printer search) and `sync-outline` (pending sync).
- **Mockup / kit**: one glyph per function (search, message, bike, refresh) in the kit's icon table.
- **Rule**: a table of glyph names by function in `docs/THEMING.md`, one icon set (Ionicons) for UI glyphs; `Icon` maps the function
  name (`search`, `message`, `driver`) to the glyph so a call site cannot pick another.
- **Owner**: primitive (`Icon`) + the five `vertorIcon` call sites (areas 3, 5, 6).

### H19. A count is written three ways and sits in three places
- **Seen**: the tab bar's "250+", "249+", "48+" over the glyph (`13`, `14`: the badge overlaps the icon, IOS-C9) and "250" inside the Orders tab pill
  (`12`); "35+" on the corner of the Unread chip instead of inside it (`52`, IOS-C10); "9+" on the call/message button (`OrderDetails/SlotButton.tsx:53`).
  The red/blue pair is by design (orders red, messages blue).
- **Read**: `MessagesOption/index.tsx:169` builds "N+" from the API's "more" flag; the tab bar does the same; the slot caps at 9.
- **Mockup**: counters sit inside the pill (tab) or on the glyph's top end, min 20 wide, 10/600; no "+".
- **Rule**: a count is the number, capped at "99+" for every badge (one `countText()`), placed by its host's slot (inside a tab or chip; on the glyph for a button).
- **Owner**: primitive (`OBadge count`) + areas 1 (tab bar), 5 (chip), 4 (slot button).

### H20. Two roles read two sizes: a customer's name, and a price
- **Seen**: the customer's name is 14/600 in the customer card (`28`) and 18/600 in the hand-off card (`34`, mockup: `h4`); the same price is 12 in a
  menu row (`62`, `menu_row.price` body_sm) and 14 on a product option (`66`, `StoreProductOptions/index.tsx:39` `body`).
- **Rule**: a person's name in a card is `card.title` (14/600); the hand-off name may stay `h4` only if the kit names it ("dato destacado"):
  ask. A price next to a row title is `body_sm` muted everywhere (`list_row.subtitle`).
- **Owner**: areas 4, 6.

### H21. The driver's initials disc is 40 and a different colour pair than every other initials disc
- **Read**: `OrderActions/styles.ts:31-33` draws it from `icon_tile.md round` (40, `primary_text` on `primary_subtle`, `label`); `OAvatar` (messages, details,
  profile) is 44 with `primary_pressed` initials (`INITIALS_PRESET.md` label 600). Not seen (SheetDriver was not reached).
- **Mockup**: `SheetDriver.dc.html` draws 40; `Messages.dc.html` and `OrderPreparing.dc.html` draw 44 — the mockups disagree.
- **Rule**: initials are an `OAvatar` of the list's size; the sheet's row is a `list_row` with `OAvatar md`.
- **Owner**: area 4.

### H22. The lead under a title is 12 in sheets and 14 in dialogs, notices and empty states
- **Seen**: `59-sheet-pause` and `41-sheet-reject` (12, muted) against `103-logout-dialog` (14, muted), `09-forgot` / `00-start` (14 muted).
- **Read**: `PauseOrdersSheet.tsx:107`, `RejectSheet.tsx:107` (`body_sm`) against `ConfirmDialogHost.tsx:69` (`OText` body), `ONotice` body, `empty_state.text`
  body. The mockups draw both (sheets 12, dialogs 14).
- **Rule**: a sentence that explains a title is `body` muted (14) in dialogs and pages, `body_sm` (12) only for a hint under a field or a line
  of metadata; sheets use 14 for their lead.
- **Owner**: areas 6, 4 (sheets).

### H23. Toasts: two words for "copied", and a form error that is a toast
- **Read**: "Copy to clipboard." (`OrderDetailsPage.tsx:147`, `OrderActions/MoreSheet.tsx:50`: an instruction, in the past it should say "Copied") and "Text
  copied" (`Chat/index.tsx:568`). The profile's save error is a toast (`UserFormDetails/index.tsx:185`) where the kit says form errors are inline, never toasts.
- **Rule**: one key, "Copied"; a save error under the form's button (`ONotice danger`), never a toast.
- **Owner**: areas 4, 5, 7.

### H24. The title starts 1 to 2 pt left of the mockup's
- **Measured**: with a back arrow the title starts at x 57.7; the mockup's `10 + 44 + 5` gives 59. The arrow glyph's ink starts at 21.3 (mockup 21) and root
  titles at 21.3, so only the title moves, by `closeButtonInset` (12) against the mockup's `margin`. Right icons end at 380.7 (mockup 380). Cosmetic; recorded
  so nobody rebuilds the header to chase it.
- **Owner**: primitive (`ONavbar`/`BackButton`), low.

### H25. States: a tappable text with no pressed look; a disabled tonal button vanishes on a muted card
- **Read**: `StoreProductOptions/index.tsx:203` ("product-reason", opens the pause sheet) is a `Pressable` without a pressed style; every other
  Pressable reads `themeOpacity('pressed')`. **Seen**: `81-printer-found`: the disabled "Print test" (tonal) on the muted `surface_alt` card
  is grey text on grey, no fill reads as a button (`OCard variant='muted'` + `tonal`).
- **Rule**: pressed feedback on everything tappable from the theme; a button inside a muted card is `solid`/`outline`, not `tonal`.
- **Owner**: areas 6 and 7.

### H26. Left over: dead primitives and duplicated code
- **Read**: `shared/HoldToConfirm.tsx`, `holdLatch.ts`, `OFab.tsx`, `OAlertOriginal.tsx` have no importer outside `shared/` and `ui/index.tsx`;
  `formatClock` exists four times with four meanings (`PreviousOrders/orderTimes.ts`, `StoresList/zonedTime.ts`, `printing/formatClock.ts`,
  and `clockText` is the first one again); `orderNumber` three times (H5). Cleanup, no visible change; do it with H5/H6.
- **Owner**: area 1 (shared), the others for their copies.

## Where the mockups disagree with each other (the code followed each one)

These need a decision before the code is "one look"; they are the mockups' differences, not agents' mistakes.
1. Space under the header: 15 (Main) against 10 (Stores) (H2).
2. A group's heading: overline (OrdersSearch, Notifications, Profile) against a 14/600 label (PrinterAdd, Review, TicketSettings) against 16/600 (Menu) (H14).
3. Initials disc: 44 (Messages, OrderPreparing) against 40 (SheetDriver) (H21).
4. "Print test" (PrinterFound) against "Test print" (Printers) (H12).
5. A stage title with its count: overline "Preparing · 2" on the phone, `h2` label in the tablet column (H14).
6. A customer's name: 14/600 in the contact card, 18/600 in the hand-off card (H20).
7. A lead: 12 in sheets, 14 in dialogs (H22).

## The ten most-used pieces against the mockups

"Painted" = measured on the iOS screenshots (pt); "code" = the key read.

| Piece | Mockup | Painted / code | Verdict |
|---|---|---|---|
| Order card | padding 15, gap 10, chip 24/12, number 16/600, name 14/600, total 16/600, buttons 44 at 1:2, radius 10, 15 between cards | card at x 20 to 382, chip 24, buttons 44 (285 to 329) at 117 : 235, cards 15 apart, number/total `body_lg` | **matches**; the clock tone differs (H10) |
| Header | 56 bar; title 20/700; subtitle 12; arrow box 44, glyph 24; right icons 44 | bar 56 from y 62, arrow ink at 21.3, title at 57.7 (mockup 59), right icons end at 380.7; one and two-line titles centred the same | matches, 1 to 2 pt on the title (H24) |
| Tab pill | track 46, tab 36, 12/600 active, 400 inactive, 5 inset | track **36**, tab **28**, 4 inset, all tabs 600 | **differs** (H7) |
| Bottom bar | line, `10 20 20`, button 50, gap 10, 1:2 for a pair | line at 769, button 780 to 830, x 20 to 382, 1:2; under the button 44 (34 inset + 10) | matches |
| Sheet header | handle 40 x 4, 10 above, title 18/600 + 44 close, gap 15 | handle 4 high at 10 under the sheet top; close glyph centred at x 372; same in `29`, `41`, `59`, `23`, `76`, `32` | matches on all six sheets seen |
| List row | min 56, tile 40, gap 15, title 14/600, detail 12, chevron 20 | rows 56 apart (Profile `67`: 328, 384, 440), Messages rows 75 apart | matches |
| Status chip | 24 high, `0 10`, radius 10, 12 px, solid by state | 24 (`28`, `12`), 12 px, one function for the colour (`orderStatusVariant`); a state word outside orders is 20 (H9) | matches for orders; H9 elsewhere |
| Section title | 12/600, `#616161`, capitals, 0.04em | `overline` 12/600, 0.5 spacing, muted (`15`, `67`) | matches (the role's reach is H14) |
| Store card | border, radius 10, tile 44 radius 8, name 14/600, address 12, divider, status line + switch 44 x 24 | structure as the mockup (`57`): tile with the store's logo, divider at +70, "Open · closes 11:59 PM" + "Accepting orders" + switch; 15 between cards | matches; first card 30 under the header (H2) |
| Conversation row | avatar 44, name 14/600, time 12, `#id · type` + status chip, unread count | avatar 44, rows 75 apart, same lines (`52`); count on the chip's corner (H19) | matches; no last-message line (OQ-09) |

## What is already one (checked, no finding)

- Header geometry on 20 stack and root screens (H24 aside); the gutter on cards, lists, bars and the header: x 20 to 382 everywhere measured.
- Cards 15 apart in Orders, Stores, Printers, the details (measured), sheets' handle and padding, bottom bars, the order card.
- Status colour: one function (`shared/orderStates.ts`) for the card, the details chip, the Messages chip, the history card.
- Button order in bars and dialogs: the secondary or destructive one on the left, the main one on the right (reject / accept, not picked up / picked up,
  Share PDF / Print, Clear / Show orders, Cancel / Log out, Cancel / Remove printer).
- Switch (44 x 24, green, same on `62`, `66`, `75`, `95b`, `96`), radio (right, 24; `59`, `75`), field label above and error under (`03`, `05`, `71`).
- Skeletons: all `SkeletonBone`; no `rn-placeholder` left.
- Focus: 1 pt `primary` border on fields (`58b`, `20`, `07`).

## Who fixes what

| Owner | Findings |
|---|---|
| Primitive / schema | H1, H7, H9 (default), H11 (`OBadge`, `ChoiceTile`, `ONotice`), H13 (title required), H15, H16, H18, H19 (`OBadge`), H24, H25 |
| Shell (area 1) | H6 (formatter), H12 (catalog), H26 |
| Area 2 access | H12 (Recover Password, Verify) |
| Area 3 orders list | H2 (none to change except via H6), H6, H9 (group chip), H10, H11 (history card), H14 (board), H16 |
| Area 4 order details | H2 (details, review), H4, H5, H8, H10, H11 (bar split), H20, H21, H22 |
| Area 5 messages | H2 (chips), H4, H5, H11 (ended notice), H16, H19, H23 |
| Area 6 stores / menu | H2 (Stores), H3, H6, H9, H17, H20, H22, H25 |
| Area 7 profile / printers / ticket | H2 (printers, ticket, wizard), H6, H9, H12, H14, H23, H25 |

## What I did not review

- **Tablet**: the board, the side rail, the two-pane screens; no screenshot exists (`TabletBoard` "not seen" in `verification/ios.md`).
- **Android**: no device pass. Nothing here says anything about Android.
- **States the iOS pass could not reach**: OrdersEmpty, OrdersOffline (offline banner, "Pending sync"), OrderError, SheetDriver and the driver's
  initials, a grouped order card, the "Live" connection sheet, a real new-order alert with its Accept rows, the Forgot "link sent" state, a delivery with a
  driver and the mini map, found printers, a successful test print, the keyboard-open and error states of most forms, and every **loading** state: the
  skeleton sizes against the loaded pieces are not measured here.
- **Narrow phones (320, 360) and large text**: not measured; the "cut" findings of H11 were seen at 402 only.
- **Languages other than English** (longer words in buttons and chips) and right-to-left.
- **The editor's side**: whether each key named above is editable in a card, the labels, the visibility keys; only the painted result and the
  keys the code reads were compared.
- **Every file under `src/pages` and `src/navigators`** was read only for routes and wiring (they hold no visual values); `i18n/translations.json`
  was not read, so the fallback texts quoted come from the code, not from the catalog.
- **Motion** (the sheets' and the tabs' transitions, the pulse of skeletons) and the **printed ticket** (a thermal ticket has its own look).
- The cause of the 30 pt under the Stores header (H2) was not found in the code; it needs a look at the device's view hierarchy.

---

## Round 1: what was done

Date: 2026-11-19 · branch `upgrade/native` (the copy), commits by topic after `75f780c`. "Done" means a change and a test in this round
unless it says "seen done": already in the code when the round started (the first device passes' fix commit `75f780c`), checked here
by reading it, not on a device. Nothing here was seen on a screen: no device was available.

| Item | Status |
|---|---|
| H1 neutral outline is grey | seen done: `OButton` draws the neutral outline with `color.border_strong` (THEMING.md section 7) |
| H2 space under the header | **done**: `ONavbar` leaves 10 and `tight` 5; `tight` on the orders list, Messages and the printer wizard (the board's own header keeps its 5); the wizard's progress, the review's content and the printers/ticket screens add none of their own; the wizard's content is 15 under its progress, as `PrinterAdd` draws. The tablet's paper pane (`paperPane`, no bar over it) keeps its own top padding |
| H3 search field is a placeholder | seen done: `inline` in Stores, Menu, option groups, Orders, Messages. Plus: `OSelect` search field says "Search" when it is given no placeholder (IPAD-C3) |
| H4 one status name | seen done: `statusLabel` is the messages' and the map's |
| H5 order number | **done**: `orderNumberOf` delegates to `orderNumber` (`OrderDetails/orderData`); the review, the map, the sheets' titles and the ticket preview title write `orderNumberText` (`Order #1053`, "Order No." is gone from the UI; the printed ticket and the print job name keep theirs). The Messages search still matches the raw id on purpose (it is a search term, not a text) |
| H6 time and date | **done**: `useFormats` (`time`, `date`, `dateTime`, `orderTime`, `{ zone }`) writes every time of day and date on screen (chat, messages, alert, details, orders, search, stores, menu, sessions, accept and prep-time sheets, printers' "sent at / failed at"); "12:38 PM" with a space; `ASAP (date)` with its space. Not the printed ticket (`src/printing/formatClock.ts` and the frozen files untouched). `StoresList/zonedTime.formatClock` and the legacy `is12Hours` read are gone |
| H7 Orders tab pill | **done, seen** (checked 2026-11-20 against `design/redesign/screens/OrdersInProgress.dc.html`: track with `padding: 5px` and `gap: 5px`, tabs `height: 36px`, `font-size: 12px`, the selected one `font-weight: 600`, the others no weight, so 400). The schema now holds the same: `tabs.sizes.sm.height` 46 (the whole track, the tab is 46 minus 2 x the pill's inset of 5 = 36), `tabs.base.text` 12 at weight 400, and `Tabs.tsx` sets the selected tab to 600 (`StableText`, which reserves the 600 width so selecting moves nothing). The devices measured it: the pill at 36 in a 46 track on the iPhone ([ios-pass2.md](verification/ios-pass2.md), IOS-B6) and 36 dp in 46 dp on the Android phone ([android-pass2.md](verification/android-pass2.md), B4). Nothing still differs; the "Read" and "Rule" lines of H7 above describe the state before it was done |
| H8 hand-off buttons | seen done: `onTint` on the hand-off card's call and message buttons |
| H9 state words | **done**: soft badges at the default size (`md`); the option groups' "Disabled" is a badge now; explicit `size='md'` removed where it is the default; a count keeps `sm` |
| H10 clock color | **done**: the details' Waiting uses `clockToneOf` (new: amber unless late, ready: muted unless at risk or late), as the card |
| H11 long text | **partly done**: `OBadge` never passes its container and ends in an ellipsis; the history card's status and review button both give way (IPAD-B4); the ended-chat notice is `ONotice` again. Left: `ChoiceTile` and `FilterChip` still force one line |
| H12 button wording | **partly done**: new sentence-case keys `RECOVER_PASSWORD_BUTTON`, `SEND_REVIEW_BUTTON`, `SAVE_PRINTER_BUTTON`, `UNASSIGN_DRIVER_BUTTON`, `TRY_AGAIN_SENTENCE`; "Mark ready" is one wording by kind of order (`markReadyText`) on the card, the group and the footer. Left: "Open in Maps" (`OPEN_IN_MAPS`), "Print test" / "Test print" |
| H13 confirm titles | seen done in the first fix commit (titles on the confirm dialogs); not re-audited |
| H14 group headings | **done, closed by the owner**: the overline (`SectionTitle`) is the heading of a group everywhere: the review's two headings, the board's column titles (`board.column_title` and `column_title_color` left the schema), the sheets' blocks (`SheetLabel`). Left as the mockup draws it, on purpose: the Menu's categories (16/600 with a count: a list's own heading, say if they should be overlines too), the field labels of forms, card titles |
| H15 notice action | seen done: `ONotice` draws its action as a link |
| H16 one empty state | **done**: `NotFoundSource` (with a `footnote`) replaces `OrdersEmptyState` and the printers' block (and the printers' pane hint); the orders' words are `useOrdersEmpty` |
| H17 Menu bar | seen done: "Make all available" is an `OBottomBar` |
| H18 one glyph per function | seen done: `shared/glyphs.ts`; the call sites were not re-audited |
| H19 counts | **done**: one `countText` (`shared/`, `99+`, `N+` while more is to load) for the tabs, the tab bar, the Unread chip, the menu's chips, the board's columns, the section titles and the call/message buttons; a count badge keeps its 5 of side padding so "99+" sits inside its pill |
| H20 name and price sizes | **partly done**: the option price is `body_sm` like the menu's. Left: the hand-off card's name is still `h4` (the kit may mean it: ask) |
| H21 driver initials | **left**: the sheet's disc (`icon_tile`, 40) is not an `OAvatar`; the mockups disagree (40 against 44) |
| H22 lead size | **partly done**: the pause sheet's lead is `body` (14); the reject and accept blocks' lines are the `SectionTitle` description (12). Left: whether those should be 14 too |
| H23 toasts | **partly done**: one word, "Copied" (`COPIED`), for the details and the More sheet (the chat's already said it). Left: the profile's save error is still a toast |
| H24 title 1 to 2 pt left | **left** (cosmetic, the primitive's) |
| H25 pressed look, muted tonal | **partly done**: the "product-reason" link has the pressed look. Left: the disabled tonal "Print test" on the muted card |
| H26 dead code | **done**: `PreviousOrders` (the list component; the card modules and `OrderRowsList` stay), `layouts/Container`, `ui/src/config` (constants, currency), 18 unused legacy `utils` functions and their tests, three unused helpers (`gutterCss`, `controlHeightCss`, `iconSizeCss`), `orderStatusName`, `SheetScroll` and `useKeyboardRoom`, `StoresList/sheetRoom`, `OrdersEmptyState`. Left: `HoldToConfirm`, `OFab`, `OAlertOriginal`, which have tests and are exported (decide with the primitives' owner) |

Also in this round, from the iPad and Android tablet passes: IPAD-B3 (the tab bar's tabs in the 600 column over a full-width bar),
IPAD-B4, C1 (count pills), C2 (chips run to the window's edge on a portrait tablet: `columnBleed`), C3, C4 (`PRINTER_IP_ADDRESS`),
C5 (the wizard's links are `OLink`), C6 (checkbox on the product's first line), TAB-C1 (the connection pill has one width), TAB-C5.
The alert sounds are bundled (`docs/SOUNDS.md`). Not done from those passes: IPAD-C7 to C11, B1 and B2 (other owners, or fixed in `75f780c`).
