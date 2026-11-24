# iPad verification (portrait), 2026-11-19

Device: simulator "iPad Pro 11-inch (M5)" (`8078BDBA-FDE3-4AD8-8DBA-0C7F47252199`), iOS 27.2, 834 x 1210 pt (1668 x 2420 px).
Build: Debug (`co.ordering.business`), JavaScript from Metro on 8097, branch `feature/theming-native`.
Data: local API (`localhost:8080`, project `development`), test owner account (not written here).
Screenshots: `<scratchpad>/pass1/ipad/NN-name.png`, where `<scratchpad>` is
`/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad`.

**Scope of this pass: portrait only.** The simulator could not be rotated (see "What I did not see"): the two-pane
tablet layouts and the kitchen board are not covered here.

## Is the device taken for a tablet?

Yes. Everywhere the app drew the tablet rules: content column of 600 pt centered (x 117 to 717, gutter 20 so
fields and cards are 560 wide at x 137), sheets and dialogs as centered cards (sheets 480 wide at x 177 to 657,
inner width 440; the logout dialog 290 inside; the new-order alert and the notification-permission card 480),
the Sessions row says "iPad · this tablet". No screen showed the phone layout stretched to 834 pt except the
tab bar (IPAD-B3). Page headers, action bars (the border line over the bottom button spans the column, 117 to 717) and
the keyboard-avoiding layouts all sit inside the column.

## Screen by screen

"Seen" = yes unless noted. Verdict: ok = nothing wrong beyond the findings listed.

| Screen (canvas) | Seen | Screenshot | Verdict |
|---|---|---|---|
| Login | yes | 02, 03 (keyboard), 07 (error state) | ok. Column of 560, fields 50, button 50, version at the foot; with the keyboard the page shrinks and nothing important is covered |
| Language sheet (login) | yes | 04 | ok: centered card 480, close 44, list scrolls |
| Forgot password | yes (empty state only) | 05 | ok; "link sent" state not seen |
| Login code | yes (empty state) | 06 | ok: 6 boxes centered, Verify bar in the column |
| Notifications permission (app sheet) | yes | 09 | ok: card of 480 centered over the list |
| System notification prompt | yes | 10 | answered Allow |
| Orders, New | yes | 11 | ok (IPAD-C1 badge) |
| Orders, In progress | yes | 15 | ok |
| Orders, History | yes | 16 | ok |
| Search and filter | yes | 12 | ok. A page in the column, not a modal |
| Search, store select | yes | 13 | ok, IPAD-C3 |
| Search, custom dates | yes | 14 | ok (calendar in a 480 card) |
| Accept sheet | yes | 17 | **B1** ("Ready by invalid format"); not confirmed (no order accepted) |
| Reject sheet | yes | 18, 19 (keyboard) | ok: card moves above the keyboard, all visible; not confirmed |
| Order detail, pending | yes | 20 | ok |
| More actions (order) | yes | 21 | ok |
| Print ticket (preview) | yes | 22 | **B2** |
| Order detail, preparing (accepted) | yes | 44 | ok (IPAD-C6) |
| Adjust time (accepted order) | yes | 45 | **B1** |
| Review customer | yes | 46 | ok (IPAD-C7) |
| Connection status sheet | yes | 49 | ok |
| New order alert | yes (test alert) | 41 | ok: 480 card, centered |
| Messages | yes | 23 | ok (IPAD-C1) |
| Chat | yes | 24, 25 (keyboard) | ok: input stays above the keyboard |
| Stores | yes | 26 | ok |
| Pause orders sheet | yes (opened, closed without pausing) | 29 | ok |
| Store menu | yes | 27 | ok (IPAD-C2) |
| Product options | yes | 28 | ok (IPAD-C8) |
| Profile | yes | 30 | ok |
| Edit information | yes | 31 | ok |
| Country select | yes | 32 | ok |
| Change password | yes | 33 | ok |
| Alerts and sound | yes | 40 | ok |
| Language (profile) | yes | 42 | ok |
| Sessions | yes | 34 | ok. Sign out buttons not used |
| Log out dialog | yes (cancelled) | 43 | ok |
| Printers, empty | yes | 35 | ok |
| Add printer, step 1 | yes | 36 | ok |
| Add printer, step 2 (find, IP) and model select | yes | 37, 38, 39 | ok (IPAD-C4, C5). Nothing saved |
| Orders, empty / offline / filters active / no results | no | | not seen |
| Order states ready, done, error | no | | not seen |
| Assign driver, map and tracking | no | | not seen |
| Chat of an ended order | no | | not seen |
| Menu search and out of stock, menu unavailable | no | | not seen |
| What the ticket prints (settings), printer found / printer list | no | | not seen (needs a printer) |
| Forgot, "link sent" state | no | | not seen |
| Tablet kitchen board (TabletBoard) | no | | landscape only, not seen |

Count: 40 screens seen in portrait, 0 partly, 12 not seen (listed above).

## Findings

### Class A

None. No crash, red screen or flow that could not be completed in what I reached.

### Class B

**IPAD-B1. "invalid format" in the accept and adjust-time sheets.**
- Screenshots: `17-accept-sheet.png` ("Ready by invalid format" under the 20 min stepper), `45-adjust-time.png` ("Now: ready in 7 min · promised for invalid format" and the big "invalid format" where the new promised time should be).
- Expected: a clock time ("Ready by 09:05PM"), as the mockups (`SheetAccept`, `SheetPrepTime`).
- Reproduce: Orders, New, Accept on any card; or open an accepted order, Adjust time.
- Cause (read in code): `useTimeLabel` in `src/ui/src/components/OrderActions/AcceptSheet.tsx` (lines 28 to 34) calls the submodule's `utils.parseTime(moment.format('HH:mm'), { utc: false })`; `parseTime` (`src/@/components/src/contexts/UtilsContext/index.js` line 191) tests `dayjs(time, ['HH:mm','hh:mm A','hh:mm']).isValid()` and returns `t('INVALID_FORMAT')` when false. The submodule extends only `utc`, `relativeTime`, `updateLocale`: no `customParseFormat`, so a format array is not parsed. `PrepTimeSheet.tsx` uses the same label. Probably on every device, not only the iPad. Suggested fix without touching the submodule: format the date with dayjs in the app and the project's 12/24 hour setting, or extend `customParseFormat` once in the app.

**IPAD-B2. Ticket preview: the paper wraps one character early.**
- Screenshot: `22-print-ticket.png`. Each dash separator breaks, leaving a lone "-" on the next line; money lines break ("$" at the end of the line, "31,00" below); the "Delivery Date" line breaks before ")".
- Expected: lines break where the printer breaks them (the component's own comment: "what is read here breaks where the printer breaks"); no orphan characters.
- Reproduce: any order, print icon in the header.
- Cause guess: `src/ui/src/components/TicketPreview/TicketPaper.tsx`: `MONOSPACE_ADVANCE = 0.6` while Menlo's advance is 0.602 em (1233/2048); at 37 columns the sheet is about 0.1 pt too narrow for 37 letters, so the 37th letter wraps. On the iPad the letters are not shrunk (theme size fits), so it shows; the phone may show it too (not checked). Add slack to `sheetWidth` (for example one more column) or use the real advance on iOS.

**IPAD-B3. The bottom tab bar is full width while everything else is in the 600 column.** (Decision to confirm.)
- Screenshots: `11-…` onward: `15-orders-inprogress.png`, `23-messages.png`, `26-stores.png`, `30-profile.png`.
- The bar spans 0 to 834, four cells of 208 pt: the Orders icon is at x about 104 and Profile at about 730, far outside the column (117 to 717) of the content above. The decision says "phone layout inside a centered column of 600 with the bottom tab bar", which can be read both ways. If the bar should also be in the column: `src/ui/src/components/AppShell/` or the bottom navigator; otherwise nothing to do, but then say it in `decisions.md`.

**IPAD-B4. At a large text size a History card overflows.**
- Screenshot: `47-text-axl.png` (system text size "accessibility extra large", set with `simctl ui content_size`, restored to `large`).
- Card #4471: the green badge "Order picked up completed by customer" plus the "Review customer" button no longer fit; the button sticks out 25 pt to the right of the card. Other cards were fine.
- Expected: the row wraps, or the badge shrinks (the button must stay inside the card).
- Cause guess: the History card in `src/ui/src/components/PreviousOrders/` (badge and button on one row without wrap).

### Class C

- **IPAD-C1** (`23-messages.png`, `26-stores.png`, `15-orders-inprogress.png`): the red "248+" badge on the Orders tab icon overlaps the icon and sticks out to the left; the "32+" badge on the "Unread" chip sits over the chip's top-right corner and touches the text. Badge text wider than the circle: give the badge a minimum width and an offset that grows with the text.
- **IPAD-C2** (`27-menu.png`): the category chip row is cut at the column's right edge (x 717, mid-word "Top cate") instead of bleeding to the screen edge or fading; in a column of 600 on a wide screen it looks like a clip. Same for any horizontal scroller.
- **IPAD-C3** (`13-search-store-select.png`): the search field in the "Select Business" sheet is empty and has no placeholder or icon, while the country sheet's field says "Search" (`32-country-select.png`).
- **IPAD-C4** (`38-printer-ip.png`): the label reads "Ip address"; should be "IP address".
- **IPAD-C5** (`37-printer-find.png`, `38-printer-ip.png`): the text links "Enter the IP address instead" and "Search again" start 20 pt to the right of the labels and fields above (the button's own padding), so they do not align with the left edge (x 157 against 137).
- **IPAD-C6** (`44-details-preparing.png`): in the item list the checkbox sits lower than the item's first line (about 12 pt below the "7 ×" and name line).
- **IPAD-C7** (`46-review.png`): the comment field has no placeholder or hint, a bare box.
- **IPAD-C8** (`28-product-options.png`): the card says "1 used by this product" but the page lists two option groups with the same title "THANKS · CHOOSE 1" and the same options; probably data of the local project, listed for completeness.
- **IPAD-C9**: the profile row and the login language button say "Spanish" while every text of the app is English (no Spanish strings are shown). If Spanish is the stored language, the translations are missing for it; if the label is wrong, the label.
- **IPAD-C10** (`34-sessions.png`): the rows of the other devices show only "Started / Valid until" dates, no device name or platform, so they cannot be told apart (the API may not give it).
- **IPAD-C11**: after typing the login the system "Save Password?" sheet appeared twice (once over the Forgot page, once over the Orders list after logging in). It is the iOS password manager; the fields could carry the right `textContentType` / `autoComplete` so it offers the save at the right moment. I answered "Not Now".

## iPad-specific checks

- **Status bar**: visible (time, date, app name on the left, Wi-Fi and battery on the right) in dark text over the white page; the headers start below it (header title at y 47). No overlap. No home indicator is drawn by this simulator model, and the tab bar has about 30 pt below its icons.
- **Multitasking**: `UIRequiresFullScreen` is `true` in `ios/OBusiness/Info.plist` (line 146). A resize grip (the small arc) is drawn at the bottom-right corner of every screenshot; dragging it (`idb ui swipe` from the corner) did nothing and the app stayed full screen with the same layout (`48-resize-try.png`). Split View, Slide Over and Stage Manager sizes were not available to try.
- **Text sizes**: the default `large` was seen everywhere; one run at "accessibility extra large" (IPAD-B4). The app scales text a little (headers and chips grew about 10 percent) but the cards held, except B4.
- **Keyboard**: the iPad keyboard is docked at the full width (not part of the app). Login: the page rises, version line above the keys. Reject sheet: the card moves up and stays whole, the note field visible. Chat: the input bar stays over the keys. Nothing important was covered.
- **Modal presentation of "full-screen modals"**: search and the login code are ordinary pages in the column, not modals; no popovers were seen (every select opens as a card of 480).
- **System prompts**: notification permission (app card, then the system prompt: allowed), "Save Password?" (C11). No local-network prompt appeared when searching for printers.
- **Sheets**: all sheets are cards of 480 (inner 440), rounded on the four corners, closed by their own X (44); the scrim covers the tab bar too. The logout dialog is narrower (290 inner).

## What I changed in the local data and the device

- Logged in with the test owner account on this simulator (a new session). Answered the system notification prompt with Allow.
- Tapped "Email me a login code" once on the login screen (a code request for the test account; no code was used).
- No order was accepted, rejected, changed or messaged; no store paused (the pause sheet was opened and closed); no product switched; no printer saved; no session closed; no profile field changed.
- Simulator only: text size set to "accessibility extra large" for one screenshot and restored to `large`; the app reloaded once by accident (a stray key sequence opened the React Native developer menu, which I cancelled).

## What I did not see

- **Landscape.** `simctl` has no rotate command, `osascript` could not drive the Simulator (no window: "Can't get application Simulator"), and `notifyutil` on the device had no effect (the screen stayed 834 x 1210). Two attempts, then stopped as asked. So the side rail, the kitchen board with the detail panel, the two panes of Messages, Stores and Printers, and the "tablets rotate freely" rule are **not seen**; they are covered by the Android tablet pass.
- Orders empty, offline, filters active and no-results states; order states ready (pickup and delivery), done and error; assign driver; map and tracking; chat of an ended order; menu search, out-of-stock and menu unavailable; the ticket settings; a printer in the list or found; the login "link sent" state; the logout itself.
- The text of the yellow LogBox bar that showed over the bottom of the first screens (it is limited to the column's width, so the dev tools are also in the column); the Metro log only shows bundler warnings (`libphonenumber-js` package.json, `p-queue` exports), none from the app's own code.
- Pull to refresh, scrolling to the end of long lists, long customer names, other languages.
