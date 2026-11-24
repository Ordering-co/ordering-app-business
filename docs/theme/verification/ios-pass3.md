# Third device pass: iOS phone

- Date: 2026-11-20 (about 07:36 to 07:56 local time of the simulator and host, 7:36 to 7:56 on the status bar)
- Device: simulator "iPhone 17 Pro" (`558440F2-0071-4F0F-9F05-E9BB95AFE1AD`), iOS 27.2, 402 x 874 pt (screenshots 1206 x 2622).
- Build: Debug (`co.ordering.business`), JavaScript from Metro on port 8097, branch `feature/theming-native`, HEAD `26f67bd` at the start (`85d26fd` when I finished; other agents also had uncommitted edits in `PrinterSettings` and `PrintTicketSettings` in the working tree), local API `http://localhost:8080`, project `development`. The test account was typed into the app only and is not written here (one screenshot, 26, shows the profile card behind the language sheet: do not publish it as is).
- Screenshots: `<scratchpad>/pass7/ios/NN-*.png`, every one opened and looked at. `<scratchpad>` = `/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad`.
- Method: `idb ui describe-all` (frames in points) plus `simctl io screenshot`; times with timestamps around each `idb` call.
- Known limit of the local stack: no socket events; the connection pill read "Reconnecting" the whole pass. The app's CPU at rest was 2.5 to 2.6 % (three samples).
- Incident: one red screen (screenshot 21), "Rendered more hooks than during the previous render" in `MyOrders.tsx:19` (`MyOrders` component stack), after another agent's edit while I was scrolling Sessions. I waited 75 s, terminated and launched the app, and it did not come back (22). Not reported as a finding. Twice before that the Orders screen came back on its "New" tab after I went back from a details screen (the History or In progress tab I had chosen was lost); I read it as the same reloads and did not see it again after the relaunch.

## Data I changed (local API / device)

| What | Detail |
|---|---|
| Order #4467 (Delivery, pending) | accepted from its card (20 min, via the accept sheet) for check 1; later "Mark ready" from its details (now Ready for pickup, no driver). Nothing else was accepted, rejected or sent. |
| Product "Blouse" of Twirly Laundry | switched off and on again (Menu, "View" filter); it is available again ("Unavailable 0"). |
| Printer | a Star TSP100 "Kitchen" (LAN, typed address, not a real device) added and removed again; the Printers screen is empty as before. |
| Not done | no session touched, no profile change, no sign out, no chat message, no text size or notification permission change. |

## Check 1: section 3.3 (fixed in code, never seen on a device)

Counts: **11 seen fixed, 0 seen not fixed, 7 cannot be seen on an iPhone.**

| Finding | Verdict | Screenshot / what I saw |
|---|---|---|
| Tab bar's height and labels on an iPhone (`2578a99`) | **seen fixed** | 00, 47: the bar's top border is at y 776 pt, the screen ends at 874: 98 pt = the 34 pt home-indicator inset plus 64 pt of bar (border included). Labels sit about 44 pt above the screen's end, clear of the indicator; the four tabs are 100 x 43 pt in the accessibility tree (the 43 is the known H7 item). |
| An action on a card, then the Messages tab (`3285c00`) | **seen fixed** | 07, 08, 09: accepted #4467 from its card in Orders, opened Messages without restarting: its row read "Pending" before (tree, after 06) and "Accepted by business" after (09). The Orders tab counts moved at the same time (New 16+ to 15+, In progress 34+ to 35+). |
| Filtered list's stale card after an action from the details (B-2, `329c8b6`) | **seen fixed, once** | 37 to 40: with "Delivery · 4467" on, #4467 opened from the filtered list, "Mark ready" in its details, Back: the card reads "Ready for pickup" at once (40). Fresh launch beforehand; one try only (the three-times sequence needs three actions of mine; not repeated). |
| Login's button over the keyboard (`a6d94cb`) | cannot be seen | The login needs a sign out, which I may not do. |
| Card's and panel's clock (`33b1b25`) | cannot be seen | The panel exists on a landscape tablet only. The card's clock was only read at rest ("Waiting 00:12" on 40). |
| Late order's clock is danger (`33b1b25`) | **seen fixed** | 04: "Late 8h 14m" and "Late 7h 17m" in red on the cards of #4466 and #4465; 05: the details' "Late by 8h 15m" and its bar in red. |
| Full map's refit on a size change (`b01cc64`) | cannot be seen | An iPhone does not rotate (portrait only). |
| Messages row's status chip and unread count (`3318b8f`) | **seen fixed** | 06: one line per row, the count circle stays whole on the right ("2", "1"), a long status ends in an ellipsis ("Not picked up by custo…", "Accepted by driver comp…"). |
| Messages tab's offline notice (`75f780c`) | cannot be seen | The simulator has no way to cut the network from here (no airplane mode command); the pill "Reconnecting" is the socket only. |
| Address note "Notes: 15" (`362dadd`) | **seen fixed** | 03: order #4471, "Notes: 15" at 36,500 under the address (the label grey, the value black). |
| Active tab's count (combined layout, `861752f`) | cannot be seen | This project has the tabs New / In progress / History; the `combine_pending_and_progress_orders` layout is off. |
| Store filter sheet's search placeholder (`57c8905`) | **seen fixed** | 11: Orders search, Store, sheet "Select Business", the field reads "Search". |
| Stores' empty second pane (`888b951`) | cannot be seen | The phone has one pane; the second pane exists on a landscape tablet. |
| Mini map's edge padding at a realistic distance (`6f5089b`) | **seen fixed** | 16: #4463, 0.97 km from the store: the customer pin and the store tile are both whole inside the 140 pt box, with room around them, the Google mark bottom left (tiles blank, no key). |
| Details' "Waiting" color of a pending order (`edde131`) | **seen fixed** | 01: #4467 pending, "Waiting 9d 12h" in the same dark amber as on its card (00); the first-pass finding IOS2-C5 (green in the details) is gone. |
| Sessions: rows written once per change of the list (`3ef2166`), and the virtualized list (`3d5d40e`) | **seen fixed** | See check 3. |
| The Menu "View" filter's one-second frame (`69f9d34`) | **seen fixed** | 43 to 45: "Blouse" switched off, "View" tapped; the first screenshot 0.4 s later (44-view-1) shows the skeleton rows under "All / Unavailable 1", never the whole menu; 44-view-5 shows the one product. |
| The chat composer's bottom space on Android (`98ef5e1`) | cannot be seen | Android only (`Chat/styles.ts` uses the inset alone on Android). |

## Check 2: section 3.4, the iOS rows

Counts: **3 fixed, 1 not fixed, 3 could not see.**

| Finding | Verdict | Screenshot / what I saw |
|---|---|---|
| IOS-C3 Forgot says "Recover Password" | could not see | Needs the signed-out screens; no sign out allowed. |
| IOS-C4 login code boxes and "Resend code" | could not see | Same. |
| IOS-C5 notification explainer's "Not now" color | could not see | Notifications are on for this device ("Notifications are on for this device", 27), so the explainer does not show; resetting the notification permission of the simulator is not in the list of what I may change. |
| IOS-C8 language sheet lists 25 languages | **not fixed** | 26: Profile, Language: English names, 25 rows or more ("Spanish (La - Guatemala)", "Cambodian", "Kannad", "Bulgarian Translation"), where the mockup shows five with native names. No decision records it. `src/ui/src/components/` language sheet (Profile). |
| IOS-C15 Remove-printer dialog's button on two lines | **fixed** | 36: "Cancel" and "Remove" on one line each (the title reads "Remove printer"). |
| IOS-C16 typing an IP address quickly kept "192.1" | **fixed** | 32: `192.168.1.50` typed in one go into the IP field, kept whole, no "Invalid ip address". (The keyboard is the full letters keyboard; see C1 below.) |
| IOS-C17 connection sheet's printer row with a printer | **fixed** | 35: with the printer saved, "Printer · Kitchen" is in the sheet. It has no value on the right (the mockup draws "Ready"): the code draws it only after a test result (`WebsocketStatus/index.tsx`, `trailing` is undefined without `result`), and the printer was "Not tested yet"; a test print was not run. |
| IOS-C14 stray "15" (and the stars' labels) | **fixed** | 03: "Notes: 15"; the stars announce "1 of 5 stars" to "5 of 5 stars". |
| C-4 printers' empty hint 382 wide from x 10 | partly | 28: the text node is still 382 wide from x 10, but the text is centered and starts at about x 25 pt, inside the gutter of 20. |

## Check 3: Sessions (Profile, Sessions)

- Tap to the list drawn: the screen's header was there 0.2 s after the tap returned and the rows (142 nodes) at 0.9 s; the tree did not change after 1.2 s (idb polling; the tap itself takes about 0.2 s). Screenshot 20.
- App CPU at rest on the list: 2.5 to 2.6 %.
- Back while it opens: pressed 0.2 s, 0.5 s, 0.8 s and 1.2 s after the tap it went to Profile every time (4 of 4, within 1.5 s). Pressed with no pause at all (about 0.3 s after the tap) it did nothing in 2 of 3 tries: on Profile there is no button at that spot yet, the Back button is not drawn until the push has started; the third went to Profile.
- Layout against `design/redesign/screens/Sessions.dc.html`: header, "THIS DEVICE" card with the phone tile, "Current" chip, "OTHER DEVICES" label, rows with a divider and an outlined destructive "Sign out" (100 x 44), and the bar "Sign out of all other devices" (50 high) match. Differences: the row is 56 pt high where the mockup draws a minimum of 64 (the theme's `list_row` padding is 5 where the mockup uses 10) (C2 below); the row title is "Started 19/11/2026 11:30 PM" and the second line "Valid until ..." where the mockup has a device name and "Signed in ... expires ..." (the API gives no device name: decided, BACKEND B5).
- Scrolling to the end: swept the list with 40 swipes. The dates go down without a repeat or an out-of-order step from 19/11/2026 to 16/02/2026 (the last row, 11:31 AM, whole, with its divider, above the bar; 24, 25); no blank gap in the screenshots taken during and after (23, 24, 25), no jump. The end was found when a swipe moved nothing. Times read as dates in every row, in the device's 12-hour style ("11:30 PM").

## Check 4: Orders with a filter on

- Orders, search, "Delivery" chip, number 4463 typed, "Show orders": the notice "Filters on: Delivery · 4463. You may miss new orders." with "Clear" (13); the three tabs stay: "New" (no count), "In progress, 1" (selected, the one order #4463), "History" (no count); the search icon is tinted while a filter is on. "New" and "History" show "Sorry, no results found" (14, 15).
- With only "Pickup": "New, 31+", "In progress, 8+", "History"; notice "Filters on: Pickup. …" (18). The filtered New count (31+) is above the unfiltered one (15+): both are lower bounds of what the pages loaded (C-6), so the numbers are not comparable.
- Open an order from the filtered list and back: the filter, the tab and the notice are kept (the notice still reads "Delivery · 4463" after the details of #4463).
- "Clear": every tab back, the notice gone, "New, 15+", "In progress, 35+" (17).
- Search "4467" with Delivery, mark ready from the details: see check 1 (B-2).

## New findings

Class A: none. Class B: 1. Class C: 3.

**IOS3-B1 (B). Menu, "View" on the unavailable notice: the keyboard opens and hides the bar "Make all available".** Screenshots 44-view-5 (the bar half visible, blurred, under the keyboard's emoji and microphone row) and 45-view-nokb (the bar at 20,780 once the keyboard is closed). What the rule says: the screen's main button stays visible over the keyboard (the keyboard rule of the second pass). Reproduce: Stores, any store, switch a product off, tap "View" in the notice. The search field takes the focus and the keyboard covers the bottom bar, whose button is the screen's one action. Best guess: `src/ui/src/components/BusinessProductList/index.tsx` (`openSearch(true)` focuses the field; the bar is not lifted by the keyboard in this state).

**IOS3-C1 (C). The printer wizard's IP address field opens the full letters keyboard.** Screenshot 32. A numbers and punctuation keyboard fits an IP address. Reproduce: Printers, Add printer, Find printers, "Enter the IP address instead", tap the field. Best guess: the IP `OInput` in `PrinterEdition` (`keyboardType`).

**IOS3-C2 (C). The Sessions row is 56 pt high where the mockup draws 64 at least (about 68 with its two lines).** Screenshot 20. `list_row.base.padding_y` is 5 in `src/theme.compiled.json` and the mockup's rows use 10. Best guess: `product.schema.json` `list_row`, or the Sessions rows (`Sessions/index.tsx`).

**IOS3-C3 (C). The card's "Waiting" clock mixes two forms.** Screenshots 40 and 18: "Waiting 00:12" (12 minutes, #4467), "Waiting 02:10" (#3569) beside "Waiting 12h 32m" (#4463) and "Waiting 9d 12h": the minutes form reads as a clock and not as a duration, with no unit. Best guess: `clockToneOf` / the card's ticker (`secondsOf`) in `OrdersOption` (`33b1b25`).

## What I did not see

- The signed-out screens: Login, the login code, Forgot (IOS-C3, IOS-C4), because I may not sign out; the notification explainer's "Not now" (IOS-C5), because the permission is already granted.
- The login's button over the keyboard (the case where the field and the button do not both fit).
- The Messages tab offline, and any offline or error state of the Orders list.
- Everything that exists only on a tablet or on Android: the panel's clock, the full map's refit after a rotation, Stores' empty second pane, the chat composer's bottom space, the combined Active tab.
- The B-2 sequence three times in a row (one try, one order).
- A printer's test result in the connection sheet ("Ready" or "Offline" on the printer row), the ticket settings of a saved printer.
- Whether the Back lost with no pause on Sessions is a late push or a late button: the tree cannot tell the two apart.
