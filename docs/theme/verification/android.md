# Device pass: Android phone

Date: 2026-11-19 (session 18:52 to 20:50, emulator clock) · Device: emulator `emulator-5556`, AVD `OBizTest`, phone 1080x2400, 420 dpi
(2.625 px per dp), Android 17 (API 37), arm64, gesture navigation, 4 GB RAM · Build: Debug `co.ordering.business` (applicationId and
bundle of the redesign), JavaScript from Metro on port 8097 · API: local (`http://localhost:8080`, project `development`) · Account: the
owner's test account (typed into the app only; **screenshots 04, 05, 52, 53 show its e-mail: do not commit them**).

Screenshots: `/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad/pass1/android/`
(numbered `NN-area-what.png`; the unnumbered `t*`, `q*`, `r*`, `pp*`, `rj*`, `s*` files are working shots taken while waiting for the app).

How the app was driven: `adb -s emulator-5556` (`uiautomator dump` for frames, `input tap/swipe/text/keyevent`, `screencap`).

**Setup note (read first).** The app became almost unusable on this emulator as soon as the "New" tab had loaded (see A1). To be able to
work, two things were done that are not part of the plan: (1) from about 19:00 the debug preferences were changed to
`js_dev_mode_debug=false` / `js_minify_debug=true` (a minified bundle from the same Metro; the file was put back to its original
content, `debug_http_host` only, at the end); (2) from 19:55 the Orders list was kept short with the search screen (order number
`4469` / `4468`, then Pickup + Pending, then Completed), because with the unfiltered list taps were ignored for minutes. The A1
measurements below were taken **before** the preference change (dev bundle) and again after it (minified): the behaviour is the same.

## 1. Screen by screen

Seen: **yes** = reached, looked at in a screenshot, compared with its mockup · **partly** = reached but not every state · **no**.

| Mockup | Seen | Screenshot | Verdict |
|---|---|---|---|
| Login | yes | 00, 02, 03, 04, 05, 07 | Matches the spec (gutter 20, field 50, buttons 50, errors in red, wrong-password notice). Logo is an icon tile, not the 180x44 placeholder (C7). Back leaves the app. |
| LoginCode | **no** | none | Not requested (the iOS agent does it). |
| Forgot | yes (not sent) | 06 | Matches the empty state; "sent" state not seen (nothing was sent). Button text "Recover Password" (mockup "Send again in 0:45" is the sent state). |
| NotificationsPermission | yes | 10, 11b, 11c | Matches (tile 44, 18/600 title, buttons 50 / 44). "Not now" is black, mockup `#616161` (C5). Appeared after the app was started again with the permission revoked (it was already granted before): see section 4. |
| Main (New) | yes | 08, 09, 12, 17, 41, 72 | Cards, buttons (44, flex 1:2), gutters and gaps match. Tab pill 28 dp instead of 36 (B4). Clock text green (C4). Performance: A1. |
| OrdersInProgress | partly | 13b, 17, 18 | First group "Preparing 44" seen (card, "Mark ready", clock "Preparing hh:mm:ss"); the "Ready for pickup" and "With driver" groups were not scrolled to (list of 50). |
| OrdersHistory | yes | 19c, 20, 90 | Filter chips and day groups present; Review button overflows the card (B1). |
| OrdersSearch | yes | 21, 22, 26, 87, 90 | Matches. No count in "Show orders" (data not given). Keyboard: C3. Results: B2. |
| OrdersOffline | yes | 82 | Pill "Offline", red notice, yellow "Filters on" notice; detail line of the offline notice has zero height (B6); "Pending sync" not seen. |
| OrdersEmpty | **no** | none | The account always has pending orders. |
| NewOrderAlert | yes (test alert) | 69 | Sheet matches (tile 44, 18/600, "Mute", button 50). The test order has no "Accept" button; real alerts not seen (no socket events). |
| OrderPending | yes | 23, 27 | Matches (header 56, chips, customer card with call and chat, products, bill, "More details", bar 50/50). |
| OrderPreparing | yes | 30 | Matches (time card, "Adjust time", progress, checklist "0 of 1 done"). Driver card of the mockup is absent for a delivery order (no "Assign"): not reproduced as a defect, see "not seen". |
| OrderReadyPickup | partly | 34 | Only a delivery order was ready; no pickup order could be taken to "Ready" (see section 5). |
| OrderDelivery | partly | 34 | Driver card "Not assigned yet" and the notice "The driver completes this order" seen; with a driver on the way not seen. |
| OrderDone | yes | 91 | Review card, customer card, products and bill; status row overflows (B3). |
| OrderError | **no** | none | No status change failed. |
| SheetAccept | yes | 24, 28, 29 | Presets, stepper, "Accept · 20 min" work; "Ready by invalid format" (A2); the "ticket prints" line of the mockup is absent. |
| SheetReject | yes | 73, 74, 78 | Matches (reasons, note, "Call Optkeys first", "This can't be undone"). One attempt closed the sheet without rejecting (B8). |
| SheetPrepTime | yes | 31 | "Now: ready in 0 min · promised for invalid format" and "invalid format" as the new time (A2). |
| SheetDriver | **no** | none | No "Assign" button on the orders reached. |
| SheetOrderMore | yes | 32 | Matches (rows 56, tiles 40). |
| TicketPreview | yes | 33, 79 | Text wraps badly (B10); printer chips and copies stepper absent (no printer configured). |
| MapTracking | partly | 80 | Screen, back button and "Open in Maps" present; the map shows no tiles or pins (no Maps key / network on the emulator). |
| Review | yes | 81 | Rating buttons and comment field; "Send Review" disabled until a rating. Not sent. |
| SheetConnection | yes | 88 | Matches (state, description, "Server: Disconnected", "Notifications: On", "Reconnect now"). |
| Messages | yes | 47, 84 | Rows, avatars, status chips, counters; "Unread 33+" badge off the chip (B9). |
| Chat | yes | 48, 49 | Header, recipients, bubbles, links, photo, composer; recipients row cut and quick replies missing (B7). Keyboard keeps the send button visible. The message was **not sent** (blocked, see section 3). |
| ChatEnded | yes | 51 | Ended notice clipped (B8). |
| Stores | yes | 36, 37, 38, 39, 41, 42, 83 | Cards, status, switch, "More store settings" link; search works. Dimmed switch offline. |
| SheetPause | yes | 40 | Matches plus an extra "15 minutes" option; times one hour behind the device clock (B12). |
| Menu | yes | 43, 44 | Chips, category title, product rows, switch, "Unavailable" reason, notice with "View". No category switch (B11). |
| MenuUnavailable | partly | 45 | Search field and chips "All / Unavailable 0" seen with all products available; a list of unavailable products not seen. |
| ProductOptions | partly | 46 | Only the empty state ("This product has no options") plus an extra "Option groups" row; no product with option groups reached. |
| Profile | yes | 52 | Matches except "Help center" row (absent). |
| ProfileEdit | yes | 53 | One "Name" field (mockup: first and last name, B13). Nothing saved. |
| ProfilePassword | yes | 54, 55 | Matches, mismatch error shown; unsaved-changes dialog on Back (generic title "Ordering", C8). Nothing saved. |
| Notifications | yes | 68 | Matches (success notice, "Always on", switches, sound radios, "Send a test alert"). No "New messages" / "Order updates" rows. |
| LanguageSheet | yes | 01, 70 | 11 languages (mockup 5), selected row tinted, check on the right. |
| Sessions | yes | 56 | "This device" card and the other sessions with "Sign out" (not used) and "Sign out of all other devices". "Current" chip is solid, mockup soft (C6). |
| LogoutDialog | yes | 71 | Matches; Back closes it. Not confirmed. |
| Printers | yes | 63 | With one printer: switch "Print when I accept an order" (off), card, "Test print / Edit / trash", "Ticket" row (C9). |
| PrintersEmpty | yes | 57 | Matches. |
| PrinterAdd | yes | 58, 59 | Brand tiles, connection radios, paper width, notice per connection; "Other (ESC/PO…" truncated (B14). |
| PrinterFound | partly | 60, 61, 62 | No discovery possible: "Bluetooth permission is required to find printers", "Enter the address instead" shows a Bluetooth port field; Save works with a typed address. |
| TicketSettings | yes | 64, 65 | Preview, six switches, "Details", copies stepper; preview dashes wrap (B10). |
| TabletBoard | n/a | none | Tablet only; not a phone screen. |

**Count (46 phone mockups): 35 seen, 7 partly, 4 not seen** (LoginCode, OrdersEmpty, OrderError, SheetDriver).

## 2. Findings

### Class A

**ANDROID-A1. The Orders list makes the app unresponsive for minutes.** Evidence: screenshots 12, 13b, 19b, 24, 74 (the `ui` dumps showed `order-card-3269` at y=117 099 px, so all
cards are rendered). After login the "New" tab loads every page (the counter climbs 25, 62, 109, 157, 200, 250 and the same for
"In progress" 50) and renders them all in one `ScrollView`. The JavaScript thread (`mqt_v_js`) then sits at 90 to 100 % CPU, `dumpsys gfxinfo`
reported 97 % janky frames, and input waits behind it: switching tab took 1 to 1.5 minutes, opening an order 4 minutes, a tap on Accept or on
"search" never opened anything for 10 minutes, Back did nothing, taps were lost altogether and later appeared as stray actions. With the list
filtered to one order the CPU fell to 3 % and everything answered at once. Reproduce: sign in with this account (250 pending orders) and tap
anything in the first minutes. Debug build, 4 GB emulator and a loaded host make it worse, but the same thing happened with the minified
bundle, and a store with a few hundred orders is not unusual. Guess: `src/ui/src/components/OrdersOption/index.tsx` (a `ScrollView` with
`list()` instead of a virtualized list; all pages are fetched), `src/ui/src/components/PreviousOrders/OrderCard.tsx` and `useNow.ts` (every visible
and invisible card re-renders every second).

**ANDROID-A2. The prep-time sheet and the accept sheet print "invalid format".** Screenshots 28, 31. On an accepted order the card says "Ready in 24:53 ·
Promised for 08:43PM" but "Adjust time" shows "Now: ready in 0 min · promised for invalid format" and, after "+10 min", "invalid format" in the big
"New promised time"; the accept sheet says "Ready by invalid format". The mockup shows a real time ("Ready by 12:50 PM"). The
"Promised for" line uses another formatter and works, so the time format taken from the project config (`utils.parseTime`) is the
one failing here. Reproduce: any pending order, Accept; any accepted order, Adjust time. Guess:
`src/ui/src/components/OrderActions/AcceptSheet.tsx` (line 26 to 32, `timeLabel`) and `PrepTimeSheet.tsx` ("ready in 0 min" also reads the wrong field).

### Class B (most visible first)

**B1. History card: the "Review customer" button runs off the card.** Screenshots 19c, 20. With a long status chip ("Order picked up completed by customer",
"Order not picked up by customer", "Delivery completed by driver") the soft button is pushed past the card's right edge and cut at the screen
edge (cards #4472, #4471, #3457). Mockup: chip left, button right, both inside the card (the row must wrap or shrink the chip).
Guess: `src/ui/src/components/PreviousOrders/OrderCard.tsx`.

**B2. Order card in search results: extra chip and clock overflow.** Screenshots 26, 35, 88. Searching adds the status chip ("Pending", "Ready for pickup") to the
first line, and "Waiting 214:49:16" / "Waiting 2888:03:45" no longer fits: it leaves the card (x up to 1054 px of 1080) or is cut ("Waiting 00:").
Guess: `OrderCard.tsx` (first row has no wrapping or shrinking).

**B3. Order details status row overflows.** Screenshot 91. For a completed pickup the chip "Order picked up completed by customer", the type chip and
"Took 1825 min" do not fit one line; the clock is cut at the screen edge ("Took 182"). Guess: `src/ui/src/components/OrderDetails/StatusRow.tsx`.

**B4. Orders tabs are 28 dp tall.** Screenshots 08, 17. The track is 36 dp (95 px) and the active pill 28 dp; the mockup has a 36 dp pill in a 46 dp track (padding 5). The pills are
also a touch target below 44. Code comment in `Tabs.tsx` says the size is the whole bar on purpose. Guess: `src/ui/src/components/shared/Tabs.tsx`, `OrdersOption/index.tsx` (`size='sm'`).

**B5. "Clear" and "View" are grey filled buttons.** Screenshots 26, 41, 44, 82. In the yellow notices ("Filters on…", "1 product is unavailable") the action is a `#E0E0E0` block; the
spec is a text button `#6B5300`, 600, underlined, 44 touch height. Guess: `OrdersOption/OrdersNotices.tsx`, `BusinessProductList`, `shared/ONotice.tsx`.

**B6. Offline notice loses its second line.** Screenshot 82. "You're offline" has a second text node ("Showing orders from 08:32PM.") whose frame is 2 px high:
nothing is drawn. The mockup has the sentence and "N changes will sync when you're back online". Guess: `OrdersOption/OrdersNotices.tsx`.

**B7. Chat header row and missing quick replies.** Screenshots 48, 49. "No driver yet" runs off the right edge ("No dr"); the mockup puts the note under the chips.
Both "Business" and "Customer" are selected by default (mockup: Customer only). The row of quick replies ("On it", "Ready in 10 min"…) is absent. Guess: `Chat/index.tsx`.

**B8. Ended-chat notice clipped; reject sheet closed once without rejecting.** Screenshot 51: "This order has ended, so you can't send new" is cut after one line (mockup wraps
to two). Screenshot 75: the first time, after picking "Other", typing the note and tapping "Reject order" with the keyboard up, the sheet closed and the order stayed Pending;
the second time the same steps rejected it (screenshot rj4). Not reproduced on demand; possible tap-through on the layout change when the keyboard goes away. Guess: `Chat/index.tsx`, `OrderActions/RejectSheet.tsx`.

**B9. Messages: counter badge off the chip; no offline notice.** Screenshots 47, 84. The "33+" badge of the "Unread" filter sits on the chip's top-right corner, outside the border (mockup: counter inside the chip).
Offline, Messages shows no notice at all (Orders and Stores do). The task expected "an offline notice". Guess: `MessagesOption/index.tsx`.

**B10. Ticket preview text wraps.** Screenshots 33, 64, 65. The monospace ticket (12 px) is wider than the paper: every dashed line leaves a lone "-" on the next line
and "$ 31,00" breaks from its product. The mockup draws a 260 dp paper with flex rows. "Print with the system printer" wraps onto two lines in a 50 dp button. Guess:
`TicketPreview/index.tsx`, `PrintTicketSettings`.

**B11. Tab bar is 84 dp tall and Android adds 24 dp under it.** Screenshots 08, 36, 52. Bar top at y=2117 px: 84 dp + 24 dp gesture area; the mockup bar is 64 dp. The labels sit at the top,
with 30 dp of empty space below them. Guess: `AppShell/TabBar.tsx` (`bottomBarBox`, `min_bottom_space` 20 plus the system inset). Same extra space under the order action bar and the sheets (2285 to 2337 px).

**B12. Pause times are one hour behind the device.** Screenshots 40, 41. Device clock 8:22 PM, "30 minutes · Until 7:52 PM", "1 hour · Until 8:22 PM"; the paused card says
"Paused · until 7:52 PM", a time already past. Probably the store's time zone against the device's. Guess: `BusinessController/index.tsx` (pause sheet).

**B13. Missing pieces of mockups.** Menu: no "Category on" switch next to the category title (mockup `Pizzas · 7 products · Category on`); Profile edit: one "Name" field (mockup first and last name);
Chat quick replies (B7); Printers: "Test print" / "Edit" are not the two flex-1 buttons of the mockup; Profile: no "Help center". Some may be the "capability hidden" or "not drawn" cases of the decisions: check `docs/theme/decisions.md`.

**B14. Add printer.** Screenshot 58: the third tile reads "Other (ESC/PO…" (truncated). Screenshot 60: choosing Bluetooth and "Find printers" showed no system prompt
("Bluetooth permission is required to find printers." with no link to settings); on this emulator "nearby devices" had been denied for good in an earlier session (flags
`USER_FIXED`), which may explain the silent refusal, but the screen offers no way out except typing an address. Guess: `PrinterEdition/PrinterAdd.tsx`, `src/context/PermissionsContext.tsx`.

### Class C

- **C1.** Orders counters: tab pill shows "250", the bar badge "250+" (both from the same count); the pill counter keeps changing while pages load (25 to 250).
- **C2.** Chat system lines show raw backend text ("Order Status Changed from Order status pending to Order status accepted by restaurant · 07:04PM") in 2 lines each.
- **C3.** Keyboard over the search screen: the action bar stays above the keyboard with about 90 px of white under it (screenshot 22); after hiding the keyboard with Back the bar stayed in the middle of the screen for about 20 s (screenshots r5, r6; under load).
- **C4.** "Waiting" clock is green for an order waiting 217 hours; the mockup text is `#6B5300`, 600 (at-risk cards `#FFF4CC` never appear).
- **C5.** Notifications sheet: "Not now" is black (`#616161` in the mockup); the system prompt appears about 2 s after the tap, with the orders list and tab bar showing in between (screenshots 11b, 11c).
- **C6.** Sessions: "Current" chip is solid green with white text (mockup `#D6FFF7` / `#00713F`); the other sessions show only dates (no device name: decided).
- **C7.** Login: the logo is a store icon on a tile, not the 180x44 "[YOUR LOGO]" box; the language button shows "Spanish" while every text is English (the local API has no `es` strings).
- **C8.** Unsaved-changes dialog is titled "Ordering" (screenshot 56 first take).
- **C9.** Printers card: "Generic ESC/POS · Bluetooth · 80 mm" wraps with a leading "· 80 mm"; the delete dialog's "Remove printer" wraps onto two lines (screenshot 66); "Print when I accept an order" starts off.
- **C10.** Stores back: with the search open, Back closes the keyboard and then goes to the Orders tab (the search stays); in the menu it closes the search as asked.

## 3. What I did to the local data

| What | State now |
|---|---|
| Order **#4469** (Delivery) accepted through the sheet (preset 15 then +5 +5 = 25 min), then "Mark ready for pickup" | **Ready for pickup**; cannot be undone |
| Order **#4468** rejected with "Other" and the note `Android_pass_test` | **Rejected by business**; cannot be undone |
| Store **Crops Grocery** paused 30 minutes, then "Resume now" | Open again |
| Product **Green Peppers** (Crops Grocery) switched off, then on | Available |
| Printer "Test_android" (Other ESC/POS, Bluetooth, typed address) added, Ticket settings opened, printer **removed** | No printers |
| Notification permission: revoked with `pm revoke` to see the sheet, then granted from the sheet | Granted |
| Login language switched to English and Profile language Spanish again | Spanish (as found) |
| One new session (this sign-in) | present (not deleted) |

Not done because the permission system refused: sending the chat message (a customer would receive it; the text was typed and erased, nothing sent), and accepting a third
order (#3569, a pickup order) to be able to run "Not picked up". **"Not picked up" and its confirmation were therefore not seen** (the order picked, #4469, is a Delivery,
whose bar has no such button once it is ready).

## 4. Android specific checks

| Check | Result |
|---|---|
| System Back: Login leaves the app; Forgot returns to Login; every sheet (language, accept, prep time, more, pause, new-order alert, connection) closes first; dialogs (discard, remove printer, log out) close first; ticket, chat, details, map return one level | **ok** (the unsaved-changes dialog returns on the next Back by design) |
| Back with a keyboard up | first press hides the keyboard, second leaves the screen: ok. Menu search: keyboard, then the search closes: ok. Stores search: keyboard, then goes to the Orders tab (C10) |
| Keyboard over the accept sheet's stepper, reject note, chat input, login | send / submit buttons stay visible above the keyboard (reject sheet jumps to the top of the screen under the status bar: fine) |
| Space under bars and sheets over the gesture area | sheets, action bars and tab bar leave the 24 dp gesture area free; the bar itself is taller than designed (B11) |
| Status bar and navigation bar | status bar: dark icons on white on every screen, on the grey scrim and over the map; navigation bar: dark pill on white; readable everywhere. The status bar is not dimmed by the scrim |
| Rotation (`accelerometer_rotation 0`, `user_rotation 1`) | **stays portrait** (screenshot 86); user rotation put back to 0, accelerometer rotation left at 0 |
| Offline (airplane mode on) | Orders: "Offline" pill, red notice, cached card; Stores: yellow notice, switches dimmed; Messages: cached list, **no notice** (B9). Airplane mode off: the app recovers by itself (the "Offline" pill becomes "Reconnecting" and the notice goes; the socket never connects locally). `settings get global airplane_mode_on` = **0** at the end |
| Permission prompts | At launch no "nearby devices" prompt appeared (it had been answered "Don't allow" in an earlier session and is stored). Notifications: the app's own sheet showed after sign-in only once the OS permission was revoked and the app restarted; tapping "Turn on notifications" closed the sheet and the system prompt "Allow OBusiness to send you notifications?" came about 2 s later: answered **Allow**. Printers, Bluetooth: no prompt (B14). Camera / photos (Change photo, chat attach) and call buttons were not pressed |
| Keyboard and pointer behaviour found | none beyond the above |

## 5. What I did not see

- LoginCode (not requested), OrdersEmpty (always pending orders), OrderError (no failed change), SheetDriver (no "Assign" button on the orders reached: for a Delivery order in preparation the driver card did not appear, which may be a defect or a config: not confirmed).
- OrderReadyPickup (a pickup order ready), OrderDelivery with a driver on the way, and "Not picked up" plus its confirmation (see section 3).
- The "Ready for pickup" and "With driver" groups of In progress, the end of the New list ("load more" never reached: hundreds of cards), "Pending sync" on a card, the "sent" state of Forgot password, the keyboard over the Printers name field with a real printer, real discovery, a test print, the printed ticket.
- Map tiles and the driver's position (no Maps key on the emulator), the "Open in Maps" hand-off, call buttons, "Change photo", chat attachments, "Share PDF" and the system print dialog.
- The real new-order alert with "Accept" (no socket events locally), push notifications, OneSignal.
- A product with option groups (ProductOptions), the list of unavailable products (MenuUnavailable), the category switch, "Make all available".
- Pull to refresh was not exercised as a gesture (a stray refresh spinner appeared once from a held touch).
- Anything on a tablet or a physical phone.
