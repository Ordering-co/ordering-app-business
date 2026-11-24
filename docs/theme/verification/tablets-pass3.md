# Tablets, third pass (the fixes of round 2 that had only unit tests), 2026-11-19

Devices: iOS simulator "iPad Pro 11-inch (M5)" (`8078BDBA-...`, iOS 27.2, 834 x 1210 pt) and the Android AVD `emulator-5558` (1280 x 800 dp, 2 px per dp). Debug builds, JavaScript from Metro 8097, branch `feature/theming-native`, local API, project `development`. Both apps were relaunched once before the pass. The test account was typed into the apps only.

Screenshots: `<scratchpad>/pass3/ipad/NN-*.png` and `<scratchpad>/pass3/tablet-android/NN-*.png` (`<scratchpad>` = `/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad`). The ones named below were opened and looked at.

Verdicts: **fixed**, **not fixed** (what I see), **could not see**.

## Result per item

| # | Item | Device | Verdict | Screenshot |
|---|---|---|---|---|
| 1 | Login in landscape, password focused, keyboard open | Android | **not fixed.** The password field sits just above the keyboard, the page moved up 38 px, "Log in" (y 898 to 998 px) is under the keyboard and does not come into view by itself. A drag of any length closes the keyboard first (on-drag dismiss) and then the whole form shows, "Log in" included; so the button is reachable by drag-and-tap, never over the open keyboard. Portrait was already fine | `tablet-android/06-android-login-kbd`, `07-android-login-kbd-dragged`, `09-android-login-after-short-drag` |
| 1 | same | iPad | **not fixed.** Same: the page moved up 12 pt, "Log in" (y 447 to 497) is behind the keyboard (top at y 407); a drag on the form did not scroll it, the second drag closed the keyboard and showed the button. The keyboard's blue return key is the only way to submit with the keyboard up | `ipad/20-ipad-login-land-kbd`, `21-ipad-login-land-dragged`, `22-ipad-login-land-dragged2` |
| 2 | Upside down (orientation 1): History, completed order, "Review customer" page | iPad | **fixed.** Review page draws the same way up as the Orders / History screen under it (title and back arrow top-left, "Send review" at the bottom) | `ipad/10-ipad-ud-history-tab`, `11-ipad-ud-review` |
| 2 | Accept sheet (centred dialog) and the log-out confirm dialog, upside down and in both landscapes | iPad | **fixed.** Both draw upright and centred in each of the four orientations, the scrim covers the whole window (status bar and rail too) | `ipad/12-ipad-ud-accept-dialog`, `16-ipad-logout-dialog-ud`, `17-ipad-logout-dialog-land2`, `15`, `18` |
| 2 | Rotate with a dialog open | iPad | **fixed.** The accept dialog stayed open through 1 to 2 to 3 and re-centred each time (same for the log-out dialog 3 to 1 to 2 to 3) | `ipad/13-ipad-rot2-dialog-open`, `14-ipad-rot3-dialog-open`, `17`, `18` |
| 3 | Printers, no printer, landscape | iPad | **fixed.** List pane: "No printers yet", the hint and the PDF line; the add wizard is the one way to add (right pane), no extra add button | `ipad/03-ipad-printers-landscape` |
| 3 | same | Android | **fixed.** Same screen, same pieces | `tablet-android/03-android-printers` |
| 4 | Ticket preview, landscape, no printer | iPad | **fixed.** Left pane: icon, "No printers yet", "Share the ticket as a PDF or print it with the system printer. Add a printer in Profile to print here.", Share PDF and Print at the foot. The Copies row is not drawn without a printer (it belongs to one) | `ipad/07-ipad-ticket-landscape` |
| 5 | Full map of #3523 (driver on way) | iPad | **fixed.** Map, back button and bottom card take the whole width in portrait and in landscape (opened fresh): driver disc at the top, customer pin at the bottom, "Order #3523", "Call driver", "Open in Maps". See T3-C3 for the rotation with the map open | `ipad/30-ipad-fullmap-portrait`, `31-ipad-fullmap-landscape`, `32-ipad-fullmap-landscape-fresh` |
| 5 | same | Android | **fixed (width).** Whole width in portrait and in landscape, kept open when rotated. Tiles blank and no pins drawn on the emulator (no key), so the framing could not be judged | `tablet-android/41-3523-fullmap-portrait`, `42-3523-fullmap-landscape` |
| 6 | Card and panel clock of the same order | Android | **not fixed, 1 s apart.** #4466 (accepted 20 min, "Ready in mm:ss"): card 19:29, panel 19:28 in one screenshot; five seconds later card 19:23, panel 19:22. Consistently the card is one second ahead, so a rounding difference rather than a tick phase. See T3-C1 | `tablet-android/29-panel-4466-a`, `30-panel-4466-b` |
| 6 | same | iPad | **could not see.** The panel (right 437 pt) covers the end of the Preparing column's card clock ("Ready in 13" cut), and no order under an hour is left in the New column | `ipad/05-ipad-panel-4466-a`, `06` |
| 7 | Portrait tab bar | iPad | **fixed** (as decided). Background edge to edge, hairline across the whole width, the four tabs in the centred column; count badges "21+" / "45+" on the Orders and Messages icons | `ipad/00-start`, `ipad/10-ipad-ud-history-tab` |
| 7 | same | Android | **fixed.** Same; badges "19+" and "47+" | `tablet-android/34-portrait-orders` |
| 8 | Connection pill width, Live vs Reconnecting | Android | **fixed.** Both states seen: the pill is x 1827 to 2046 in both, History and the search button at the same x | `tablet-android/01-android-orders` (Reconnecting), `12-android-orders-after-login` (Live) |
| 8 | same | iPad | **fixed.** Both seen: x 1715 to 1937 (screenshot px) in both, History and search at the same x | `ipad/04-ipad-board` (Reconnecting), `24-ipad-after-login` (Live) |
| 9 | Board column headings, "99+" | Android | **fixed.** "NEW / PREPARING / READY" small uppercase with a count pill; after scrolling the New column to the end the pill reads "99+" whole inside its pill, the rail's Orders badge "99+" too | `tablet-android/32-new-scrolled` |
| 9 | same | iPad | **fixed for the headings** (pills "55+", "35+", "10+"). "99+" not reached | `ipad/04-ipad-board` |
| 10 | Chat pane: system pills | iPad | **fixed.** #4466: "Preparation time changed to 20 min", "Accepted by business", "Logistic status changed to In queue"; #4471 (ended): "Order placed", "Preparation time changed to 20 min", "Accepted by business", "Ready for pickup", "Picked up by customer"; no raw log lines. The ended-chat notice "This order has ended..." and "View order" fine | `ipad/26-ipad-chat-4466`, `27-ipad-chat-4471` |
| 10 | same | Android | **fixed** (#4466, same pills) | `tablet-android/45-android-chat-4466` |
| 10 | "Select a conversation" pane | both | **fixed** (icon and sentence, centred) | `ipad/25-ipad-messages`, `tablet-android/44-android-messages` |
| 10 | "Select a store" pane | both | **could not see.** In landscape Stores opens the first store's menu by itself, so the empty pane never shows | `tablet-android/46-android-stores` |
| 11 | Tabs with a filter on | iPad portrait / Android portrait | **fixed.** "Filters on: ..." notice, then New / In progress / History; a search for "3523" opens on "In progress 1" with the one card; "Demo" shows New 18+, In progress 23+ | `ipad/29-ipad-3523-filtered`, `tablet-android/35-portrait-filtered`, `39-3523-result` |
| 11 | Tabs with a filter on, landscape | Android | **a flat list, no tabs.** On the landscape board layout a filter replaces the columns with one list (all statuses in one column, history cards mixed with open ones). See T3-C5 | `tablet-android/18-android-filtered`, `25-android-filtered-scrolled` |
| 11 | Card changes at once after an action on a filtered order | Android | **fixed.** In the "Demo" list, Accept on #4466 (20 min): the card became "Accepted by business", "Ready in 19:58" and "Mark ready" at once, and the rail's Orders badge went 59+ to 58+ (and the board then had the card at the top of Preparing) | `tablet-android/26-after-accept-tap`, `27-after-accept`, `28-board-after-clear` |
| 12 | Centred dialog scrim covers the whole window | Android | **fixed.** Log-out dialog and accept dialog: the scrim covers the status bar, the rail and the bottom | `tablet-android/04-android-logout-dialog`, `26-after-accept-tap` |
| 12 | History / Search keep their last row above the gesture pill | Android | **fixed.** History scrolled to the end: "Load more" ends 68 px above the pill; Search orders: "Clear" / "Show orders" above the pill, in landscape and portrait | `tablet-android/33-history-end`, `17-android-search-filled`, `37-search-open` |

## New findings

### Class A

None confirmed. One unconfirmed (see "Process" below): a render error on the Android tablet.

### Class B

**T3-B1. Login in landscape (item 1): the round-2 fix did not change what is seen.** Both tablets: with the password field focused the button "Log in" stays under the keyboard; the page scrolls only the field into view (38 px on Android, 12 pt on iPad). A drag closes the keyboard and then shows the button, so the flow is completable (drag, tap, or the keyboard's return key), but the rule of item 1 ("brought over the keyboard by itself or by dragging") is not met. Screenshots above. Where: `KeyboardScrollView` with `keepEndInSight` set by `AuthScreen` (`hooks/useRevealFocused.ts` `revealOffset({ end })`): the content's end is further than the visible area above the keyboard, so the rule (the field must still show) leaves the scroll where it is; and `keyboardDismissMode='on-drag'` closes the keyboard on the first drag. Same suggestion as TAB-B1: `keyboardDismissMode='none'` on the auth screens, or a smaller form in a landscape window.

### Class C

- **T3-C1. The card's clock and the panel's clock read one second apart** (item 6). #4466 on the Android landscape board: card 19:29 / panel 19:28, then 19:23 / 19:22; the card is always one second ahead. Likely one side floors and the other rounds (or one reads the due time against `Date.now()` and the other against a stamp truncated to the second). `OrderDetails/orderTimes.ts` and the card's clock (`orderClock`).
- **T3-C2. "Picked up" breaks onto two lines** in the card of a ready pickup in the board's Ready column (iPad, #3567: the buttons "Not picked up" and "Picked" / "up" share the row at the column's card width, the second one is the narrower). `ipad/04-ipad-board`, `13-ipad-rot2-dialog-open`. Details of the same order in the phone width fit (earlier passes).
- **T3-C3. Rotating with the full map open does not refit it** (iPad): portrait to landscape with "Track on map" open leaves the framing of the portrait (driver disc and customer pin out of view; the map is blank); closing and reopening in landscape frames both pins (`ipad/31-ipad-fullmap-landscape` against `32-ipad-fullmap-landscape-fresh`). `GoogleMap` fitToCoordinates on a layout change.
- **T3-C4. Stores landscape, left pane: "Open · closes 11:59 PM" wraps** onto two lines ("Open · closes" / "11:59 PM") next to "Accepting orders" and the switch; in portrait it is one line (`tablet-android/46-android-stores` against `36-search-3523`, which shows the portrait list).
- **T3-C5. A filter on the landscape board is a flat list** with no tabs or columns (Android `18`, `25`): the filtered "Demo" list mixes open and closed orders in one column. Portrait keeps the tabs (item 11 fixed there). If the board should keep its columns with a filter, this is a gap; if not, nothing to do (the mockup `OrdersOffline.dc.html` is a phone screen).

### Process (not counted)

- **Hot reloads from another session's edits.** `git status` showed 11 modified files (`OrdersOption`, `PreviousOrders`, `OrderDetails`, `Chat`) that are not mine, and Metro reloaded both apps several times ("Refreshing...", the board back to "Reconnecting"). Twice this showed errors: on the Android tablet, right after the first Accept tap in the filtered landscape list, a LogBox render error "Should have a queue. You are likely calling Hooks conditionally" in `<OrderRowView />` (`PreviousOrders/index.tsx:82`, `OrderCard.tsx:55`); on the iPad a toast "React has detected a change in the order of Hooks called by OrderDetailsPage". After a relaunch the same Accept worked without any error (`tablet-android/27-after-accept`), so I treat both as fast-refresh artifacts of edits in progress; if it ever shows with a clean tree it would be class A (the filtered card's Accept). Screenshots of the error screen itself were not kept (`tablet-android/20-android-accept-dialog` and `21-android-state` are the board mid-reload).
- The iPad's first typing of the sign-in e-mail lost its last two characters: a tool glitch, retyped.
- On iPad in upside-down mode the screenshot is drawn in the app's orientation and idb touches are not rotated; I tapped by the accessibility frames.

## What I changed in the local data and the devices

- **Order #4466** (Demo Admin, delivery, Limetray Test): accepted, 20 min, from the filtered list on the Android tablet (the one accept allowed). Not marked ready. Opened the chats of #4466 and #4471 (their unread counts may have changed). The accept dialog of #4467 was opened on the iPad and closed with its X (nothing sent).
- Signed out and in again on both tablets (two more sessions of the test account); the iPad's "Save Password?" answered "Not Now".
- Android: the system Bluetooth ("nearby devices") permission dialog that appeared on relaunch was answered **Allow**.
- Searches typed ("Demo", "3523") and cleared. No reject, no message, no driver, no store or product, no printer saved, sound untouched.
- iPad left in **portrait** on the Orders tab, logged in; Android tablet in **landscape** (`user_rotation 0`, `accelerometer_rotation 0`) on the Orders board, logged in. Metro on 8097 running.

## What I did not see

- The Copies row (needs a printer), "Select a store" (Stores always opens a menu), the card clock against the panel clock on the iPad, "99+" on the iPad, "Mark ready" after the accept (budget), the map's framing and pins on Android (blank emulator map).
- No sound, no signed build, no printer, no live socket event (the connection pill was "Reconnecting" most of the time on both devices).
