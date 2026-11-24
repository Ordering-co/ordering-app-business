# iPad verification, second pass (portrait and landscape), 2026-11-19

Device: simulator "iPad Pro 11-inch (M5)" (`8078BDBA-FDE3-4AD8-8DBA-0C7F47252199`), iOS 27.2, 834 x 1210 pt portrait, 1210 x 834 pt landscape.
Build: Debug (`co.ordering.business`), JavaScript from Metro on 8097, branch `feature/theming-native` (head `d6dc2ef` at the start; other agents edited code while I tested).
Data: local API (`localhost:8080`, project `development`), test owner account (not written here).
Screenshots: `<scratchpad>/pass2/ipad/NN-name.png`, `<scratchpad>` =
`/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad`.

Two things about how this pass was done:

- **Rotation worked this time.** Simulator.app does not exist on this machine (Xcode has no `Developer/Applications`), so `osascript` cannot work. The
  companion `idb_companion` has a `set_orientation` gRPC call (not exposed by the `idb` Python client). A 20-line script
  (`<scratchpad>/p2tools/rot.py`) sends it to the companion's socket: value 0 = portrait, 1 = portrait upside down, 2 and 3 = the two landscapes
  (I used 3 for landscape). The landscape layout was seen on every screen it exists on. The device was rotated back to portrait (value 0) at the end.
  Until I noticed the mapping, the "portrait" shots `33` to `75` were taken with value 1 (upside down) for the first half; the main screens
  stay upright in that state (see IPAD2-B3), so they look like portrait.
- **The app reloaded itself many times** (other agents saving files; the screen "Downloading 100%" or a return to the Orders tab, same process id
  every time, no crash). Each reload lost the screen I was on; I went back and repeated. That is why a few checks below are "not seen".

## First-pass findings: verdicts

| First-pass finding | Verdict | Screenshot | What I see now |
|---|---|---|---|
| IPAD-B1 "invalid format" in accept and adjust-time sheets | **fixed** | `05-accept-dialog`, `07-adjust-time`, `08-after-adjust` | "Ready by 10:35 PM"; adjust sheet "Now: ready in 19 min · promised for 10:35 PM", new time "10:40 PM", after +10 "10:45 PM"; the panel then reads "Promised for 10:45 PM". No time reads "invalid format" anywhere in this pass |
| IPAD-B2 ticket paper wraps one character early | **fixed** | `26-ticket-preview` | dash separators, money lines and "Total" are on one line, no orphan "-" or "$". What still breaks is text longer than the 37 columns of the paper ("Delivery Date: ASAP(10/11/2026 07:13PM)" and the address), which a printer breaks too |
| IPAD-B3 tab bar full width | **decided, not reopened** (decisions.md) | `33-portrait-orders` | bar background edge to edge, the four tabs inside the column |
| IPAD-B4 History card at large text | **fixed** | `37-xxl-history`, `38-axl-history` | at "extra extra large" the card holds; at "accessibility extra large" (the first-pass size) the status badge takes its own row and the Review customer button sits inside the card |
| IPAD-C1 badges over the icons | **partly** | `15-messages`, `33-portrait-orders`, `02-new-scrolled` | the count in the "Unread" chip is fine and "99+" / "43+" fit their pills; the pills on the tab / rail icons still sit over the top-right of the icon (Orders list icon half covered) |
| IPAD-C2 chip row clipped at the column edge | **fixed** | `72-menu-portrait` (crop) | the category chips run past the column to the window edge ("Top category 1" ends at x 779 of 834) |
| IPAD-C3 store select field blank | **fixed** | `32-store-select` | the field says "Search" |
| IPAD-C4 "Ip address" | **fixed** | `24-printer-ip` (AX tree: "IP address") | "IP address" |
| IPAD-C5 text links not aligned | **fixed** | `23-printer-find` | "Enter the IP address instead" and "Search again" start at the same x as the labels (401) |
| IPAD-C6 checkbox below the first line | **fixed** | `06-after-accept` | the checkbox is on the "2 × Big Mab" line |
| IPAD-C7 review comment without placeholder | **not fixed** | `49-review-portrait0` | the comment box under "Anything to add? (optional)" is still a bare box |
| IPAD-C8 "1 used by this product" with two groups | **not changed** (local data, as first reported) | `21-product-options` | same text; not a code defect |
| IPAD-C9 "Spanish" over English text | **fixed** | `19-stores` (Profile), `63-login` | Profile row "Language: English", login button "English" |
| IPAD-C10 sessions without device name | **not fixed, decided** (the API gives none) | `54-sessions` | rows show "Started / Valid until" only; the dates read correctly, no "invalid format" |
| IPAD-C11 "Save Password?" twice | **partly** | `70-after-login2` | seen once, over the Orders list right after logging in (the right moment). I did not reopen the Forgot page, so the second one was not rechecked |

Count: 9 fixed (B1, B2, B4, C2 to C6, C9), 2 partly (C1, C11), 3 not fixed (C7; C8 is data; C10 is the API), 1 decided (B3).

## Screens seen for the first time (they could not be seen in the first pass)

Landscape (the layout of the tablet decision) and portrait states. "OK" means nothing wrong beyond the findings below.

| Screen | Seen | Screenshot | Verdict |
|---|---|---|---|
| Side rail instead of the tab bar | yes | `01-rot-try`, `15-messages`, `19-stores` | rail 80 wide, four items, counts on the icons (C1 above); it disappears on stack pages (History, Alerts, Printers, ticket), as the tab bar does in portrait |
| Orders board (TabletBoard) | yes | `01-rot-try`, `02-new-scrolled`, `14-after-ready` | New / Preparing / Ready columns with count pills, header with store select, connection pill, History and search; matches the mockup. New card actions stay inside the column |
| Order details as a right-hand panel: pending, preparing | yes | `04-panel-pending`, `06-after-accept` | 437 wide at the right edge over the board; footer buttons; selected card has a blue outline |
| Order details panel of a done order | yes | `28-history-detail` | review card, customer, product, "Print ticket" in the footer; IPAD2-C2 |
| Accept, adjust time, assign driver, more actions as centred dialogs | yes | `05`, `07`, `09-assign-driver`, `11-more-actions` | cards 480 wide centred in the window, scrim over the rail too |
| Assign driver | partly | `09-assign-driver` | opens from an accepted delivery order, lists "Driver D." and "Driver QA i." (Available, 3 active orders), "Unassign driver" disabled; empty state and the assignment itself not seen (see checks) |
| Messages, two panes | yes | `15-messages`, `16-chat`, `17-chat-keyboard` | list 340 + chat pane, empty pane "Select a conversation", selected row highlighted, composer rides above the keyboard |
| Chat of an ended order | yes | `75-chat-ended-4471` | no call button, notice "This order has ended, so you can't send new messages.", "View order" button: as the mockup |
| Stores, two panes | yes | `20b-stores`, `21-product-options` | stores list left, Menu of the first store opens by itself on the right; product options as a centred dialog |
| Menu search | yes | `73-menu-search` | "Search all products", chips All / "Unavailable 0"; the out-of-stock state could not be seen (no unavailable product) |
| Printers, two panes, add printer step 1 and 2, IP step | yes | `22-printers`, `23-printer-find`, `24-printer-ip`, `25-printer-name-kbd` | list pane with the auto-print switch, wizard in the right pane; IPAD2-C3. Nothing saved |
| Ticket preview in landscape | yes | `26-ticket-preview` | paper centred in the right pane; IPAD2-C1 |
| History as a screen opened from the board | yes | `27-history` | centred column of 560, chips All / Completed / Cancelled, day headings in small capitals |
| Alerts and sound | yes | `29-alerts-sound`, `30-sound-kitchen`, `31-test-alert` | see the checks |
| Mini map in a delivery order, full map | yes | `52-driver-on-way`, `53-view-map` | the map widget draws (Google mark, pin) but its tiles are blank in the simulator, so the map itself could not be judged; the full-screen map sits in the 600 column with white sides |
| Order with the driver on the way | yes | `52-driver-on-way` | timeline Accepted / Ready / Picked up with times, "The driver completes this order" notice |
| Review customer | yes | `49-review-portrait0` | see C7 |
| Log out dialog, login after it | yes | `62-logout-dialog`, `63-login` | ok |
| Login in landscape | yes | `64-login-land`, `65b-login-land-kbd`, `66-login-land-filled` | IPAD2-B1 |

## Checks of point 3

- **No time or date reads "invalid format"**: ok. Looked at: order cards, details, accept sheet, adjust-time sheet, chat (two threads), history, sessions, ticket.
- **Adjust time on an order in preparation, to the end**: ok. #3475 accepted at 10:15 PM, +10 min in the sheet, "Update time": the panel says "Promised for 10:45 PM", the chat gets "Order Prepared in Changed from 20 to 30 Minutes · 10:16 PM" (wording: IPAD2-B3).
- **Assign-driver sheet from an accepted delivery order**: partly. Opens, lists two drivers, nothing assigned by me. The permission layer refused my tap on a driver (it is not among the three actions I was allowed), so "picking one" was not done and the empty state was not seen.
- **"Not picked up" asks for confirmation**: not seen. The local project has no pickup order in "ready for pickup" and I may mark only one order ready (a delivery one). The code asks (`OrderDetailsPage.tsx` lines 227 to 237, `confirm({... destructive: true})`).
- **Orders list with hundreds of orders**: ok. Portrait: the New counter went from "21+" to "99+" while I scrolled and more pages loaded; landscape board: each column loaded further pages when scrolled (59+ to 99+, 32+ to 44+, 9+ to 13+). Taps on cards, Reject and tabs answered at once. App CPU at rest: 3.1 % over 30 s on the portrait list (21 orders), 4.8 % over 20 s after paging to 99+, 5.7 % on the landscape board at launch and 8.9 % over 15 s on the board right after scrolling three columns (host load 21 to 39, so partly the machine). Not the 60 to 100 % of the Android tablet pass.
- **After my own action the card moves without restarting**: ok. Accept on the panel: #3475 left the New column, the Preparing counter went 35+ to 36+ at once, the panel switched to "Accepted by business"; "Mark ready" on the card: the card moved to the Ready column ("Waiting 00:04") and the counters changed. No pull to refresh. The connection pill said "Reconnecting" during all of it (live only after the new login).
- **Keyboard rule**: ok on Chat (landscape), printer Name (landscape; the page scrolls, field and Save printer sit above the keys), Search orders (portrait; "Clear" and "Show orders" ride on the keyboard), Reject note (portrait; the dialog moves up, "Reject order" visible), Menu search, Login in portrait (Log in visible). Personal information: the phone field opens the system numeric popover and nothing is covered. **Not ok**: Login in landscape (IPAD2-B1). Closing the keyboard restored the layout in Chat, Search orders and the Reject dialog; not rechecked on the printer page (the app reloaded). Not tested with a keyboard: Review comment, Change password.
- **Tab bar present right after signing in**: ok (`70-after-login2`: bar with counters under the "Save Password?" prompt, connection pill "Live").
- **Ticket preview, paper width and text**: ok, see B2 above. The paper is about 304 pt wide, centred, the text is 37 columns monospace.
- **Mini map in a delivery order's details**: seen, tiles blank (see above); not seen on a pending order (it has no map).
- **Sound picker**: partly. The picker shows Bell, Chime, Kitchen alarm (loud); the radio moves with each tap; "Send a test alert" opens the alert ("1 new order", "Ringing until you open or accept them", Mute) with Kitchen alarm chosen. I cannot hear the simulator: the process log shows audio queue activity when the alert opened, nothing more. The choice was put back to Bell.
- **Group headings are small uppercase labels**: ok (Profile ACCOUNT / THIS DEVICE / SUPPORT, Search orders DATE / ORDER TYPE / STATUS / SLA, printer wizard BRAND / CONNECTION / PAPER WIDTH, board columns, History day headings, sound picker SOUND).
- **Text scaling**: ok. "Extra extra large" on the orders list, an order's details and Profile (`34`, `35`, `36`): nothing cut or overlapping; the History card at accessibility extra large holds (`38`). Set back to "large".

## New findings

### Class A

None.

### Class B

**IPAD2-B1. Login in landscape: the "Log in" button is under the keyboard.**
- Screenshots: `65b-login-land-kbd`, `66-login-land-filled`. With the password field focused the page moves up by only 12 pt; the fields are visible, "Log in" (at y 459 to 509) is behind the keyboard (its top is at y 405). Only the keyboard's own check key submits. The first pass saw the same on the Android tablet (TAB-B1). In portrait the button stays visible (`68-login-port-kbd`).
- Rule: the focused field and the screen's main button stay visible over the keyboard.
- Files: `src/pages/Login.tsx` and the shared keyboard screen (`src/ui/src/components/shared/KeyboardScreen.tsx`): extra bottom padding equal to the keyboard, or a higher form in landscape.

**IPAD2-B2. Chat system pills show internal log lines.**
- Screenshots: `16-chat` ("Order Prepared in Changed from 0 to 20 Minutes", "Order Logistic status Changed from Pending to In queue"), `74-chat-ended` ("Order Driver group id removed", "Order Driver group id set to 1", "Order Manual driver assignment author id set to 1", "Order Reject reason set to very_far_away", "Order Delivery position set to 1", "Order confirmed accepted by driver", "Order driver almost arrived to business"). The decision says a status change is one short pill; the status ones are, the other log entries are raw field names and ids.
- Reproduce: Messages, any order with a long history (#3506).
- File: `src/ui/src/components/Chat/changeEntries.ts` (the mapping of the order's logs to pills): hide ids and technical fields, say "Preparation time changed to 30 min" as for #4471.

**IPAD2-B3. With the iPad upside down, the main screens stay upright but a full page flips.**
- Screenshots: `39b-review`, `48-review` (display upside down), against `49-review-portrait0` (device in true portrait). `UISupportedInterfaceOrientations~ipad` lists all four orientations (`ios/OBusiness/Info.plist` lines 156 to 162). With the device turned 180 degrees the tabs and the orders list kept their upright drawing, while the Review customer page was drawn upside down. A tablet in a stand turned the other way round would show it.
- Reproduce: rotate the device to "portrait upside down" (companion `set_orientation 1`; in Simulator, Device > Rotate twice), Orders, History, Review customer.
- Suspects: the root view controller in `ios/OBusiness/AppDelegate.swift` limits orientations (no upside down) while the page presented as a modal does not; decide one rule for the whole app. I did not see another page flip; Review is the only one I opened in that state.

### Class C

- **IPAD2-C1** (`26-ticket-preview`): in landscape the left pane of "Print ticket" is empty (title, two buttons at the foot); the mockup has printer chips and a "Copies" stepper in it (chips only appear with a saved printer; the Copies row is absent here).
- **IPAD2-C2** (`28-history-detail`): a lone "15" under the address in the customer card of a done order (probably the address's extra field; it has no label).
- **IPAD2-C3** (`22-printers`): Printers in landscape with no printer: the left pane shows only the auto-print switch, no "No printers yet" (PrintersEmpty); the right pane opens the add wizard at once, which may be intended.
- **IPAD2-C4** (`53-view-map`): the full-screen map is drawn in the 600 column with white sides (MapTracking is full screen in the mockup). By the tablet rule, but looks narrow.

## What I changed in the local data and the device

- Order **#3475** (Luis Mercado, delivery, pending, second half of what the New tab loads): accepted (20 min), time adjusted +10 (promised 10:45 PM), marked ready. Nothing else touched: no reject (the Reject dialog was opened twice, once by a mis-tap, and closed without confirming), no message, no driver assigned, no store paused, no product switched, no printer saved.
- Sound choice changed to Chime and Kitchen alarm, then back to Bell. A test alert was sent.
- Signed out and in again once (a new session for the test account); "Save Password?" answered "Not Now". The earlier session of this simulator was not closed by me; the Sessions list shows many sessions from other agents.
- Simulator: text size set to extra extra large and accessibility extra large, restored to **large**; orientation rotated to landscape and back to **portrait**; app left on the Orders tab, logged in, Metro running.

## What I did not see

- **Not picked up confirmation**, **assigning a driver** and the empty driver list, **orders empty / offline / filters active / no results**, the order **error** state, **out of stock** in the menu and **menu unavailable**, the **printer found / printer list** (no printer), **"What the ticket prints"** (ticket settings), the Forgot "link sent" state, pull to refresh, long customer names, other languages, the second "Save Password?" on the Forgot page.
- Keyboard over the **Review comment** and **Change password**, and closing the keyboard on the printer page (the app reloaded).
- The **sound itself** (the simulator cannot be heard) and the **map tiles** (blank in the simulator).
- No yellow LogBox bar appeared in this pass.
- Not every screenshot was opened as an image; the ones not opened (`13`, `18`, `20`, `23b`, `24`, `30`, `40` to `44`, `46`, `47`, `50`, `51`, `54`, `55`, `57`, `59` to `61`, `63`, `64`, `69`, `71`) are repeats, states during a reload or checks read from the accessibility tree (positions and texts), and what I wrote about them comes from that tree.
