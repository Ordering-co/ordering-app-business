# Device pass: iOS phone

- Date: 2026-11-19 (about 18:50 to 19:30 local time of the simulator)
- Device: simulator "iPhone 17 Pro" (`558440F2-0071-4F0F-9F05-E9BB95AFE1AD`), iOS 27.2, 402 x 874 pt, Dynamic Island, home indicator (bottom inset 34 pt).
- Build: Debug (`co.ordering.business`), JavaScript from Metro on port 8097, local API `http://localhost:8080`, project `development`. The owner's test account was typed into the app only (masked here).
- Screenshots: `<scratchpad>/pass1/ios/NN-*.png` (full size, 1206 x 2622). Names below are those files.
- Method: `idb ui describe-all` (frames in points) plus `simctl io screenshot`. Mockups read from `design/redesign/screens/*.dc.html` and `SPECS.md`.
- Known limit of the local stack: no socket, so the connection pill reads "Reconnecting" almost all the time and lists do not refresh by themselves (pull to refresh does refresh them). "Live" was seen only once, right after the first sign-in.

## Data I changed (all on the local API / device)

| What | Detail |
|---|---|
| Order #4471 (Pickup, newest pending) | accepted from its card through the sheet (20 min, "Accept · 20 min"), then "Mark ready for pickup", then "Picked up" (now completed). Time could not be adjusted (see IOS-A1). |
| Order #4470 (Delivery, second newest pending) | rejected from its details with reason "Item out of stock" and a short note. |
| Order #4463 (newest in preparation) | "Mark ready for pickup" from its details (now Ready, delivery, no driver). Not completed (a delivery is completed by the driver). |
| Store "Taste Wine" | paused for 15 minutes, then "Resume now" (back to accepting). |
| Product "Crown Extra" (Taste Wine, Beer) | switched off then on again (back as it was). |
| Printers | added an Epson LAN printer (192.168.77.77, invented) and a generic Bluetooth printer (invented address) to reach the Ticket row; both deleted at the end (the Epson one was added and deleted twice). Printers list is empty again, as at the start. |
| Device language | was "Spanish" with an English UI; I picked "English" in the Login language sheet (stays English). |
| Notifications | answered the system prompt with "Allow". |
| Not done | the chat message was NOT sent: the permission classifier denied that action, so I did not retry. Reviews were opened and typed in but not sent. Nothing in sessions, profile, password or account was touched (the password form was filled with throw-away text and discarded). |

## Screens

Legend: yes = reached and compared; partly = reached but a part of the mockup could not be produced; no = not reached.

| # | Mockup | Seen | Screenshot | Verdict |
|---|---|---|---|---|
| 1 | Main (New) | yes | 12, 13, 26b | B (IOS-B6, B5); A3 on first sign-in |
| 2 | OrdersInProgress | yes | 14, 15, 16, 27, 100 | B (IOS-B6), C |
| 3 | OrdersHistory | yes | 17, 17b, 18 | B (IOS-B3, B4) |
| 4 | OrdersSearch | yes | 19, 20, 104 | C (IOS-C7), B (IOS-B2 gap) |
| 5 | OrdersOffline | partly: the "Filters on" banner and the Reconnecting pill were seen; offline mode, "Pending sync" chip and the offline banner not (no way to go offline) | 105, 13 | B (IOS-B16) |
| 6 | OrdersEmpty | no: New has 249 orders; Pause card of an empty list not reachable | - | not seen |
| 7 | NewOrderAlert | partly: only the "Send a test alert" version (1 order, "Close", no Accept row, no "View orders") | 76 | ok for what is seen |
| 8 | OrderPending | yes | 24, 40 | ok, C |
| 9 | OrderPreparing | yes (pickup #4471, delivery #4463) | 28, 45 | B (IOS-B12), C |
| 10 | OrderReadyPickup | yes | 34 | B (IOS-B13, B14) |
| 11 | OrderDelivery | partly: a Ready delivery without driver (no mini map, no "Track on map", no driver minutes) | 48 | B (IOS-B12) |
| 12 | OrderDone | yes (pickup order, so no timeline/duration) | 35, 43 | ok, C |
| 13 | OrderError | no: no way to make a status change fail | - | not seen |
| 14 | SheetAccept | yes | 25 | A (IOS-A2) |
| 15 | SheetReject | yes | 41, 42 | B (IOS-B1) |
| 16 | SheetPrepTime | yes | 29, 30, 33b, 47 | A (IOS-A1) |
| 17 | SheetDriver | no: no "Assign" action appears on the orders I could open | - | not seen |
| 18 | SheetOrderMore | yes (two variants: Preparing has "Adjust time", Ready has not) | 32 | ok |
| 19 | TicketPreview | yes, with and without a printer | 51, 101, 102 | B (IOS-B10) |
| 20 | MapTracking | partly: no driver, map tiles blank (no key / network in the simulator) | 50 | B (IOS-B7, B8) |
| 21 | Review | yes (not sent) | 36, 38, 39 | B (IOS-B2, B11) |
| 22 | SheetConnection | partly: only the "Reconnecting / Disconnected" state | 23 | C |
| 23 | Messages | yes | 52 | C (IOS-C10) |
| 24 | Chat | yes (no message sent) | 53, 54 | ok, C |
| 25 | ChatEnded | yes | 56 | B (IOS-B9) |
| 26 | Stores | yes | 57, 58b, 60, 61 | ok, C |
| 27 | SheetPause | yes | 59 | ok |
| 28 | Menu | yes | 62, 63 | C (IOS-C12) |
| 29 | MenuUnavailable | yes (one product) | 64, 65 | C |
| 30 | ProductOptions | yes | 66 | ok |
| 31 | Profile | yes | 67, 68 | ok |
| 32 | ProfileEdit | yes | 69 | C (IOS-C13) |
| 33 | ProfilePassword | yes | 71, 72, 73, 74 | B (IOS-B2 keyboard), C |
| 34 | Notifications | yes | 75 | ok |
| 35 | LanguageSheet | yes | 01, 77 | C (IOS-C8) |
| 36 | Sessions | yes | 70 | ok |
| 37 | LogoutDialog | yes (cancelled) | 103 | ok |
| 38 | Printers | yes | 89, 95b, 97 | ok, C |
| 39 | PrintersEmpty | yes | 78 | ok |
| 40 | PrinterAdd | yes | 79, 80, 91 | B (IOS-B15) |
| 41 | PrinterFound | partly: "No printers found" then manual IP; no found-printer rows | 81, 82, 86, 88 | C |
| 42 | TicketSettings | yes (only reachable with a generic ESC/POS printer) | 96 | B (IOS-B10) |
| 43 | Login | yes (empty errors, wrong password, keyboard) | 00, 02, 03, 04b, 05 | C (IOS-C1..C3) |
| 44 | LoginCode | yes (one code requested, not used) | 06b, 07 | C (IOS-C4, C5) |
| 45 | Forgot | partly: the empty form only (nothing sent, so no "link sent" state) | 09 | C |
| 46 | NotificationsPermission | yes, then the system prompt answered "Allow" | 10, 11 | C |
| 47 | TabletBoard | no: tablet only, not part of this phone pass | - | not seen |

Count: 36 seen, 7 partly, 4 not seen (47).

## iOS-specific checks

| Check | Result |
|---|---|
| Swipe back on every stack screen | Works on: Forgot, OrderDetails, Review, TicketPreview, Chat and ChatEnded (also with the keyboard up), Menu and ProductOptions, Profile sub-screens (Personal information, Password, Sessions, Alerts, Printers, Add/Edit printer), Search is a modal. With unsaved text in Password the swipe shows the "discard changes?" dialog (good). Does NOT work on the Map screen (IOS-B7). Not applicable (no gesture, they are full-screen modals, not routes): the login code screen and the orders search. After swiping back from a chat the unread counters were already updated (the Messages badge dropped 48+ to 41+ after reading two chats), so nothing stayed unread. |
| Keyboard over the inputs | Accept sheet has no input. Reject note: the sheet moves up with the keyboard and the note is visible, but the sheet then reaches under the status bar and its title and close button sit under the clock (IOS-B1). Chat composer: fine, the composer rides about 10 pt above the keyboard (screenshot 54). Review "Anything to add?": the keyboard covers the field, what is typed cannot be seen (IOS-B2). Action bars of Search, Password, Printer step 2 sit 40 pt above the keyboard or half behind it (IOS-B2). |
| Safe areas | Top: every header starts under the Dynamic Island correctly (header 56 from y 62). Bottom: bottom bars, sheets and the tab bar clear the home indicator (tab bar 98 = 64 + 34 measured on pixels). Exceptions: the Map screen (IOS-B8: the customer marker draws under the status bar and the back button is under the notch area), the Login footer "Version 1.0" ends at y 853 (inside the 34 pt inset, harmless), the Reject sheet with keyboard (IOS-B1). |
| Sheets one after another | More actions then "Adjust time" opens the second sheet after the first closes without flicker or a stuck overlay (screenshots 32, 33b). The sheet it opens is broken (IOS-A1). |
| Portrait only | `UISupportedInterfaceOrientations` for the iPhone is Portrait only (read from `ios/OBusiness/Info.plist`). I could not rotate the simulator (no tool for it), so this is read, not seen. |

## Findings

### Class A

**IOS-A1. "Adjust time" sheet is unusable for an accepted order.** Screens 29, 30, 33b, 47. For #4471 (accepted 3 minutes earlier) and #4463, both entries (the "Adjust time" button on the time card and More > Adjust time) show "Now: ready in 0 min · promised for invalid format", the big new time reads "invalid format", the four chips (-5, +5, +10, +15) and "Update time" are all disabled (accessibility traits NotEnabled), and +5 is shown selected. The time cannot be adjusted at all. Mockup SheetPrepTime: "Now: ready in 08:12 · promised for 12:38 PM", a new time such as "12:43 PM", enabled chips. Reproduce: accept an order, open it, Adjust time. Likely cause: `acceptedAtOf` (`src/ui/src/components/OrderActions/rules.ts` line 64) returns `dayjs(given)` without `isValid()` when `request.opts.acceptedAt` is given, so an invalid date reaches `canAdjust` (elapsed = NaN, every `next > NaN` is false, so everything is disabled) and `useTimeLabel` (`AcceptSheet.tsx` line 28) hands `parseTime` a bare "HH:mm", which the submodule's `utils.parseTime` rejects with "invalid format". Files: `src/ui/src/components/OrderActions/PrepTimeSheet.tsx`, `rules.ts`, `AcceptSheet.tsx`.

**IOS-A2. "Ready by invalid format" in the Accept sheet.** Screen 25, and the same with 25 / 30 min. The line under the stepper reads "Ready by invalid format"; mockup "Ready by 12:50 PM". Same cause as above: `useTimeLabel` in `src/ui/src/components/OrderActions/AcceptSheet.tsx` calls `utils.parseTime(moment.format('HH:mm'), { utc: false })` and the helper does not accept a time without a date. The preset chips, the stepper (min 5) and "Accept · N min" work.

**IOS-A3. After the first sign-in the Orders screen had no tab bar until the app was relaunched.** Screens 12 (no tab bar, the list runs to the bottom edge, the fourth card is cut at the screen edge) and 13 (after terminate + launch: tab bar present). It happened right after signing in with the keyboard open (the password field had focus when "Log in" was tapped) and answering the notification explainer and the system prompt. Until the relaunch there was no way to reach Messages, Stores or Profile. I could not repeat it (repeating needs a logout, which I avoided). Guess: the tab bar hides while the keyboard is "visible" (`src/hooks/useKeyboardVisible.ts`) and the "hide" event never fires because the focused input unmounts with the screen. Treat it as unconfirmed but serious; worth a check on the login-with-keyboard path.

### Class B

**IOS-B1. Reject sheet with the keyboard goes under the status bar.** Screen 42. With the note focused, the sheet is pushed up until "Reject order #4470" overlaps the clock and the close X sits under the status bar icons (frames: title y 21, close y 10). The sheet should stop at the top safe area (62 pt) and scroll its content. Mockup SheetReject has no keyboard state, so this is the safe-area rule. Files: `src/ui/src/components/OrderActions/OrderActionsHost.tsx`, `RejectSheet.tsx`, the shared sheet in `src/ui/src/components/shared/`.

**IOS-B2. Keyboard avoidance is inconsistent.** (a) Review: the "Anything to add? (optional)" field is fully hidden behind the keyboard, so typing is blind (screen 39); the page does not scroll to the field. (b) Search orders, Password, Printer step 2: the bottom action bar floats 40 pt above the keyboard (screen 20) or is half behind it (screens 72, 86), while the chat composer sits right on the keyboard (54). The bottom safe inset seems to be added twice when the keyboard is open. Files: `src/ui/src/components/ReviewCustomer/`, the shared screen / action bar in `src/ui/src/components/shared/`.

**IOS-B3. History: "Review customer" button overflows the card and the screen.** Screens 17b (#4472 and #3457). With a long status chip ("Order not picked up by customer", "Delivery completed by driver") the soft button is pushed right: "Review custom..." is cut at the screen edge (button frame x 274 to 436 on a 402 pt screen, card inner edge 366). The mockup puts the status chip and the button on one row that fits, or wraps. File: `src/ui/src/components/PreviousOrders/` (card) and its `styles.tsx`.

**IOS-B4. History cards: status chips are solid and "Review customer" appears on rejected orders.** Screens 17b, 18. The status chips (Completed, Rejected, Delivered) are solid green or red with white text; SPECS says a green chip and a red chip with the reason line "Reason: ...". The mockup draws "Review customer" only on completed orders; the app also shows it on Rejected (#4200, #4197). No "Reason:" line is drawn on rejected cards (the reason is known on the details screen, screen 43).

**IOS-B5. After accept / mark ready the list keeps showing the old state until a pull to refresh.** Screens 26b (the accepted #4471 still in "New 250", with its Accept button), 44 (the completed #4471 still listed as Preparing with no button). Pull to refresh fixes it and the counters then change (New 249, In progress 51). The local stack has no socket, so this may be only the missing event, but the app does not apply the response of its own action to the list. File: `src/ui/src/components/OrdersOption/` or the submodule `OrderListGroups` (logic).

**IOS-B6. Segmented tab control is smaller than the mockup.** Screens 12 to 18. Container 36 pt high (pixels 133 to 169) with 28 pt tabs, where Main.dc.html has a 46 pt pill with 36 pt tabs (5 pt padding); the space above the pill is 15 pt instead of 5. The tabs are also below the 44 pt target. File: `src/ui/src/components/OrdersOption/` (tabs) or the shared segmented control.

**IOS-B7. Swipe back does not work on the map screen.** Screen 50. A swipe from the left edge (tried at three heights) does nothing; the only way out is the back button. The native map view takes the gesture. File: the `MapTracking` page / `src/ui/src/components/GoogleMap/` (gesture region or back button only).

**IOS-B8. Map screen layout.** Screen 50. The "Go back" button is a black rounded square of 32 x 32 pt (frame 10, 72) where the mockup has a white round 44 pt button with a shadow, so it is below the touch target size; the customer marker is drawn at y 19 to 69, under the Dynamic Island and the clock (the map fits its bounds without the top safe area); the bottom card shows the order status text ("Preparation Completed") instead of a driver line (no driver, so probably by design) and only "Open in Maps".

**IOS-B9. Ended-chat notice is cut.** Screen 56. "This order has ended, so you can't send new..." is on one line and cut at the right edge (frame height 20); the mockup wraps it. File: `src/ui/src/components/Chat/` (ended notice, `numberOfLines` or flex).

**IOS-B10. Ticket preview paper is too narrow for the ticket.** Screens 51, 101, 102 and TicketSettings 96. The separator lines (37 dashes) wrap, leaving a lone "-" on a second line, and the right-aligned amounts wrap ("Subtotal $" then "10,00" on the next line); "Delivery Date: ASAP(...)" breaks in the middle. The paper is about 267 pt wide at 12 pt monospace, 37 columns need about 270 pt plus the 15 pt padding. In 101 and 102 the printer chip row ("ZZ Test Epson") is clipped to a half chip and overlapped by the preview box, and it stays pinned while the page scrolls. Fix: smaller font or fitted columns, and a row of the chip height. File: `src/ui/src/components/TicketPreview/`.

**IOS-B11. Review: the unselected "Good" button is truncated ("Goo...") while the selected one fits.** Screens 36 vs 38. Five 68 pt buttons; the 12 pt label plus padding does not fit when regular weight. Also the section title reads "Tell us more" where the mockup says "What went well?". File: `src/ui/src/components/ReviewCustomer/`.

**IOS-B12. No "Assign" driver action for an unassigned delivery.** Screens 45 (preparing), 48 (ready). The "Driver / Not assigned yet" card has no "Assign" button, so SheetDriver could not be reached; mockup OrderPreparing has "Assign" (opens SheetDriver). On the Ready delivery the card shows "Not assigned yet" too. It may depend on the business having drivers (`useDrivers`); I did not see the condition explained. File: `src/ui/src/components/OrderDetails/Business` and `OrderActions/AssignDriverSheet.tsx`.

**IOS-B13. "Not picked up" wraps to two lines.** Screen 34. The 117 pt outline button breaks the label in two lines ("Not / picked up"); the mockup has it on one line at 14/600 (flex 1 of a 350 pt bar). Reduce the horizontal padding or the label. File: `src/ui/src/components/OrderDetails/Business` (action bar) and the shared button.

**IOS-B14. Ready-for-pickup header misses "Waiting mm:ss".** Screen 34. SPECS: chips `Ready for pickup` + `Pickup` + right side `Waiting 04:10`. The app shows only the chips. The "hand off" card also has black outlined call and message buttons, where the mockup has plain white 44 pt buttons.

**IOS-B15. Printer wizard: the third brand tile is cut.** Screens 80, 91. "Other (ESC/P..." is truncated in a 114 pt tile; mockup "Other (ESC/POS)". The step bar and the other pieces match.

**IOS-B16. Active filters: tabs disappear and "Clear" is a grey button.** Screen 105. With filters on, the New / In progress / History tabs are not drawn (the mockup OrdersOffline keeps the tabs under the banner), and the banner's "Clear" is a grey filled button instead of the amber underlined text button. File: `src/ui/src/components/OrdersOption/`.

**IOS-B17. Menu notice "View" is a grey filled button** (screen 63), mockup: bold text link. Category rows have no "Category on" switch (screen 62; the mockup has one), probably the capability rule of OQ-10 (not checked).

### Class C

- **IOS-C1.** Login: the language button read "Spanish" while every text was English (screens 00, 01); the device had Spanish selected and no Spanish dictionary text. Picking English fixed it. The mockup's logo placeholder (180 x 44 grey) is a 44 x 44 blue store tile (screen 00).
- **IOS-C2.** Login: "Log in" error banner and field errors work (screens 03, 05); the iOS "Save Password?" system sheet appeared over the code screen after a wrong password (system behaviour, not the app).
- **IOS-C3.** Forgot: the button is "Recover Password" (old Title Case string) (screen 09).
- **IOS-C4.** Login code: the six boxes start at x 26 (centered in 362) where the mockup starts at 20; "Resend code" is active at once (mockup: disabled "Resend code in 0:38") (screen 07). The screen is a full-screen modal of Login, so there is no swipe back, only the arrow.
- **IOS-C5.** Notifications explainer: "Not now" is black, mockup `#616161`; the system prompt is answered by "Allow" without a flicker (10, 11).
- **IOS-C6.** Orders cards: "Waiting 30:16:15" and "Preparing 1186:36:13" are long elapsed times (old test data) and are green; the mockup uses amber `#6B5300` for pending waiting times. Amounts print as "$ 31,93" (server currency format), times as "07:24PM" and "ASAP(18/11/2026 12:41PM)" (no space before the parenthesis); mockup "$32.37", "12:38 PM".
- **IOS-C7.** Orders search: "In Progress" (capital P), an extra "SLA'S" section (Ok / At Risk / Delayed), "Show orders" without the count, no default chip selected; mockup "In progress", no SLA, "Show 12 orders" (screen 19). The search field gets the keyboard on open (screen 20).
- **IOS-C8.** Language sheet lists 25 server languages by English name (screen 01) and the mockup shows five with native names. The picker has no scroll indicator.
- **IOS-C9.** Tab bar: the red "250+" and blue "48+" badges overlap the top right of the icon (screens 13, 14); the badge reads "250" in other screens (17b, 18) and "250+" in others (inconsistent after refresh).
- **IOS-C10.** Messages: the "Unread 35+" count sits on the chip's corner instead of inside it; chip "Order not picked up by custo..." and "#4472 · Pick..." are truncated (screen 52). No last-message line (decided, OQ-09).
- **IOS-C11.** Chat: the three recipient chips are all selected by default (Business, Customer, Driver) where the mockup selects only Customer; attach button has a black border (screen 53). Order details unread "1" bubble on the message button is placed correctly.
- **IOS-C12.** Menu: with "Unavailable 0" the empty state says "Sorry, no results found" (screen 65); keyboard capitalises the first letter in the search field (screen 64).
- **IOS-C13.** Personal information shows one "Name" field (no first / last name split) and "Remove account" disabled for administrators (screen 69); mockup has First name, Last name and an active "Delete account".
- **IOS-C14.** Order details: a stray "15" line under the address on #4471 (screen 28) (probably an address field, not a note); the star buttons of OrderDone all announce "Review customer" (screen 35 tree) instead of 1 to 5 stars; "Print ticket" header icon is outlined, ok.
- **IOS-C15.** Dialogs: the title of the unsaved-changes dialog is "Ordering" (screen 73), the Remove-printer confirm wraps the button label "Remove printer" in two lines (97). The Printers screen "Ticket" row only exists once a generic ESC/POS (Bluetooth) printer is saved (screen 95b); with Star or Epson only there is no way to reach TicketSettings.
- **IOS-C16.** Printer wizard: typing the IP address quickly via the keyboard tool kept only "192.1" and showed "Invalid ip address" (screen 83); typed one character at a time it was accepted. May be the tool; worth a look at the masked input. The IP scan takes about 15 s before "No printers found", the "Print test" about 20 s before "Order not printed, connection failed" (88).
- **IOS-C17.** The connection sheet has no "Printer · Kitchen" row (no printer was configured when I looked).

## What I did not see

- OrdersEmpty (no empty New list), OrdersOffline (no way to go offline: no offline banner, no "Pending sync" chip, no queued changes), OrderError (no way to fail a status change), SheetDriver (no "Assign" action was shown), TabletBoard (tablet), the "Live" connection sheet (only "Reconnecting" after the first minute), the new-order alert with real orders and its "Accept" rows (only the test alert), the Forgot "link sent" state (nothing sent), a driver on an order (OrderDelivery with the mini map, "Track on map", MapTracking with a driver line and "Call driver"), a delivery order's completion by the business (the driver completes it), printer rows from a discovered list (found printers), a successful test print.
- The chat message was not sent (denied by the permission classifier). The review was never sent. Rotation: not tested (no tool to rotate the simulator); portrait only is read from the plist. Pull-to-refresh was used on lists but its indicator was not captured.
- The notification permission sheet's effect (pushes) and anything needing a real printer or Bluetooth.
- Screens of a single business flow in Spanish or other languages (the whole pass was in English).
