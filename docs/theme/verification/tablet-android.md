# Android tablet verification (landscape and portrait), 2026-11-19

Device: AVD `OBizTablet` (created for this pass), port 5558, Android 17 (API 37, `google_apis_playstore`, arm64), 2560 x 1600 px at 320 dpi
= 1280 x 800 dp in landscape (`sw800dp w1280dp h800dp`, `xlrg`), 800 x 1280 dp in portrait. 2 px per dp.
Build: Debug `co.ordering.business` (the existing `app-debug.apk`, not rebuilt), JavaScript from Metro on 8097, branch `feature/theming-native`.
Data: local API (`localhost:8080`, project `development`), test owner account (not written here).
Screenshots: `<scratchpad>/pass1/tablet-android/NN-name.png`, `<scratchpad>` =
`/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad`.

**This pass is incomplete and the reason is the app, not the plan.** On this device the JavaScript thread of the app ran at 60 to 100 % of a
core from the first minute to the last (`top -H`: thread `mqt_v_js`, 41 CPU-minutes at the end, process resident memory grown from 0.8 to 1.6 GB),
and every touch was answered 15 seconds to 6 minutes late, some never (TAB-A1). Seen with the host at load 20 to 40 (other agents building), so
part of it is the machine; but the phone emulator (`emulator-5556`) showed the same thread at 50 % with 10 CPU-minutes, so it is not only the tablet.
What was reached is described exactly below; what was not is under "What I did not see".

## How the AVD was created (to recreate it)

The SDK has no `avdmanager`. Two files under `~/.android/avd/`, copied from `OBizTest` with these changes, no skin file:

`~/.android/avd/OBizTablet.ini`
```
avd.ini.encoding=UTF-8
path=/Users/work/.android/avd/OBizTablet.avd
path.rel=avd/OBizTablet.avd
target=android-37.0
```
`~/.android/avd/OBizTablet.avd/config.ini` = `OBizTest.avd/config.ini` with `AvdId=OBizTablet`, `hw.lcd.width=2560`, `hw.lcd.height=1600`,
`hw.lcd.density=320`, `hw.initialOrientation=landscape`, `hw.ramSize=4096`, `hw.cpu.ncore=4`, `hw.device.name=pixel_tablet`,
`skin.name=2560x1600`, `skin.path=2560x1600`, and the `hw.device.hash2` line removed. Boot (first try, about 60 s):
`$HOME/Library/Android/sdk/emulator/emulator -avd OBizTablet -port 5558 -no-snapshot -no-audio -no-window`.
App: `adb -s emulator-5558 install -r android/app/build/outputs/apk/debug/app-debug.apk`, `reverse tcp:8097` and `tcp:8080`, then the preference
`debug_http_host` = `localhost:8097` written by pushing a `co.ordering.business_preferences.xml` to `/data/local/tmp` and
`run-as co.ordering.business cp` it into `shared_prefs/` (`run-as ... sh -c 'cat > ...'` fails: "can't create temporary file"; the `pm clear`
had to come first). The first launch asks for "nearby devices": "Don't allow" at (1280, 1016). Rotation:
`settings put system accelerometer_rotation 0`, then `user_rotation 1` (portrait) or `0` (landscape). The emulator is left in landscape,
`accelerometer_rotation` = 0.

## Is the device taken for a tablet, and did the rotation behave?

Yes to both. In landscape the app drew the tablet layout from the first frame (side rail, board, two panes, centered column, centered dialogs):
the window is 1280 x 800 dp, `smallestScreenSize` 800 dp, so both halves of the rule (`DeviceInfo.isTablet()` or shorter side of 600 dp)
hold; the phone layout was never shown. `MainActivity` did not lock the orientation: `dumpsys activity` showed
`requestedOrientation=SCREEN_ORIENTATION_UNSPECIFIED` (the `values-sw600dp/bools.xml` rule works), and `user_rotation 1` rotated the display
(`mDisplayRotation=ROTATION_90`, `w800dp h1280dp`, activity not restarted: a chat opened before the rotation was still open after returning).
Weak point: the JavaScript side took a very long time to follow the rotation (TAB-A2). Back to landscape it followed in under 12 s.

## Screen by screen

"Seen" = yes only where the screen was reached and looked at; "partly" says what is missing. Not listed screens: see "What I did not see".

| Screen (mockup) | Seen | Screenshot | Verdict |
|---|---|---|---|
| Login (Login) | yes, landscape | 01, 02-login-filled, 03 | centered column of 560 dp (x 720 to 1840 px), fields 48, button 50, language pill top right. Soft keyboard covers the Log in button (TAB-B1) |
| Notifications permission (NotificationsPermission) | yes | 04 | centered card 440 dp wide, buttons 50 and 44: ok |
| Orders board (TabletBoard) | yes | 05, 18, 20 | rail 80, header 56, three columns with count pills and cards: close to the mockup; findings TAB-B2, TAB-C1 to C4 |
| Order details panel, pending (OrderPending) | yes | 06, 07, 12 | panel 437 dp at the right edge over the board; ok except TAB-C2 |
| Order details panel, preparing (OrderPreparing) | yes | 28 | "Late by 15:45", Adjust time, checklist, one footer button: ok; TAB-C5 |
| Order details panel, ready (OrderReadyPickup) | yes | 29 | status, "Driver not assigned yet", Accepted/Ready timeline; no footer action (a delivery order waiting for a driver) |
| Order "more" sheet as centered dialog (SheetOrderMore) | yes | 08 | dialog 480 dp centered in the window; TAB-B3 (scrim) |
| Accept sheet as centered dialog (SheetAccept) | yes | 10 | 480 dp, presets 10 to 45, stepper, "Accept · 20 min"; TAB-A3 ("Ready by invalid format"), TAB-B3 |
| Connection sheet as centered dialog (SheetConnection) | yes | 19 | ok; TAB-B3 |
| Messages list + chat, two panes (Messages, Chat) | yes | 21, 22, 23, 27 | list 360 dp, chat pane with header, "Send to" chips, compose bar, "Select a conversation" empty state; TAB-C6, TAB-C7 |
| Profile (Profile) | partly | 30 | centered column 560; all rows, Log out; the Language row arrived late and pushes Log out under the edge (TAB-C8) |
| Stores, list pane (Stores) | partly | 16, 17 | left pane: title, search, three skeleton cards and the dashboard link; the right pane empty (no "select a store" message). Never loaded (TAB-A1) |
| Stores, menu pane (Menu), product options sheet (ProductOptions) | no | | not reached |
| Printers, ticket settings, ticket preview, printer add/found/empty | no | | the Printers row was tapped twice, no navigation in 6 minutes (TAB-A1) |
| Orders history, search (OrdersHistory, OrdersSearch) | no | | not reached |
| Reject / prep time / pause / driver sheets as dialogs (SheetReject, SheetPrepTime, SheetPause, SheetDriver) | no | | only accept, more and connection were opened |
| New-order alert, logout dialog, language sheet, sessions, profile edit, password, forgot, login code, review, map, offline/empty/error states | no | | not reached |
| Portrait: phone layout in a column of 600, tab bar | partly | 24, 25, 26 | Messages only; TAB-B4, TAB-A2 |

Counts (47 mockups): seen 9 (login, permission, board, 3 panels, 3 dialogs) plus messages = 10; partly 3 (Profile, Stores list pane, portrait); not seen about 34.

## Findings

### Class A

**TAB-A1. The app is nearly unusable on this device: the JS thread is saturated and touches arrive minutes late or never.**
- Evidence: `adb shell top -H -p <pid>`: `mqt_v_js` at 75 to 100 % from the first minute after a cold start (also on the Messages and Profile tabs, so
  not the board alone), 41 CPU-minutes after 90 minutes; `dumpsys gfxinfo`: 2475 frames, 90 % janky. Accept tapped at 8:39, the dialog appeared 8:40,
  its button answered 8:41; "Mark ready" tapped 9:15, done 9:21; the Stores tab opened 3 minutes after the tap and stayed on its skeleton for more
  than 2 minutes (screens 16, 17); the Messages chat spinner took 4 minutes (22 to 27); a tap on the Printers row (twice) and one on the Stores rail
  item (screens 31, 32) had no effect in 6 and 3 minutes; the connection pill needed 4 minutes (19). `uiautomator dump` itself slows it (stopped
  using it at the end).
- Likely causes seen: the socket never connects (pill "Reconnecting", sheet "Disconnected", `sockets.orderingplus.com` is not reachable from the
  local stack), every card on a board of 248 + 43 + 9 orders ticks a clock each second, and the board and the panel are both mounted. Not proven;
  the host load (20 to 40) is part of it. Worth profiling on a free machine and on a release build; the phone emulator shows the same thread at 50 %.
- Files to look at: `src/ui/src/components/OrdersBoard/`, `src/ui/src/components/WebsocketStatus/` (reconnect loop), `src/ui/src/components/OrdersOption/`
  (per-card timers).

**TAB-A2. After a rotation to portrait the app kept drawing the landscape layout (rail, two panes) for about 9 minutes.**
- Screenshot: `24-rotated-portrait-messages.png`, `25-portrait-messages-settled.png` (rail and two panes in an 800 dp wide window: the chat pane is
  cut at the right edge, the "Driver" chip and the send button are clipped), then `26-portrait-messages-phone-layout.png` (correct).
- Reproduce: Messages with a chat open, `user_rotation 1`. The window itself rotated at once (`w800dp h1280dp`); `useLayout()` did not follow until the
  next touch was processed, about 9 minutes later. Back to landscape: followed in under 12 s. May be only TAB-A1 (a queue of work ahead of the
  `Dimensions` event) but the cost is a screen that is wrong on rotation. File: `src/theme/platform.ts` (`useLayout`, `useWindowDimensions`),
  `src/navigators/BottomNavigator.tsx` (`tabBarPosition`).

**TAB-A3. The accept dialog says "Ready by invalid format".**
- Screenshot: `10-accept-dialog.png`, `11-...`: under "20 min", the line "Ready by invalid format". Not tablet specific, but it is in the main
  tablet flow. File: `src/ui/src/components/OrderActions/AcceptSheet.tsx`, `useTimeLabel`: `utils.parseTime(moment.format('HH:mm'), { utc: false })`
  returns "invalid format" for a bare `HH:mm` (it expects a date string); the fallback `moment.format('hh:mm A')` is only used when `parseTime` is missing.

### Class B

**TAB-B1. Login in landscape: the soft keyboard covers the Log in button and the page cannot scroll it into view.**
- Screenshots: `02-login-filled.png`, `03-login-keyboard-scrolled.png`. The keyboard takes the lower half (800 px of 1600); with the password field
  focused the page scrolls only until the field touches the keyboard; "Log in" shows as an 18 px blue strip. The way out is the keyboard's Enter key or
  closing the keyboard. The column should scroll to the end (extra bottom padding equal to the keyboard) or the form should sit higher in landscape.
  File: `src/pages/Login.tsx` / the login screen's `KeyboardScreen` (`src/ui/src/components/shared/KeyboardScreen.tsx`).

**TAB-B2. The board does not refresh after an action and cannot tell the business (no socket).**
- Screenshots: `11-...`, `13-...`, `14-...`, `15-state.png`. After "Accept" (confirmed in the Messages list: "Accepted by business 08:41PM") card #4464 stayed in
  the New column with its Accept / Reject buttons, the New count stayed 249 and the panel kept "Pending", for 10 minutes, until the app was restarted
  (then New 248, Preparing 43, "Ready in 02:20"). The same after "Mark ready": the card stayed in Preparing ("Late 20:28") while the panel showed
  "Ready for pickup". With the socket down the lists depend on it. A done action should move the card (or refetch the group) without the socket;
  at least the buttons of a card whose order just changed must not offer the same action again. Files:
  `src/ui/src/components/OrdersBoard/`, `OrdersOption/index.tsx` (the update after `handleChangeOrderStatus`).

**TAB-B3. The scrim of a centered dialog leaves the bottom strip of the window undimmed (three of four dialogs).**
- Screenshots: `08-panel-more-menu.png`, `10-accept-dialog.png` (and `19-...`): below y = 1490 px (the last 55 dp) the board shows at full brightness and
  the "Accept" button of the panel shows through half dimmed. In the same session a dialog (`11-board-buttons-busy-and-dialog-3.png`) covered the whole
  window and was centered on 1600, the others on 1488 px (their root bounds are `[0,0][2560,1488]`). The tablet's taskbar / gesture area
  (`Taskbar` window in `dumpsys window`) is the likely cause: the `Modal` window stops above it. File: `src/ui/src/components/shared/OModal.tsx`
  (`<Modal statusBarTranslucent navigationBarTranslucent>`; on Android a Modal does not draw under the navigation bar unless it is told to).

**TAB-B4. Portrait: the bottom tab bar is the full 800 dp width while the content is a column of 600.**
- Screenshot: `26-portrait-messages-phone-layout.png`: content x 240 to 1360 px (560 dp with the gutters), the bar from 0 to 1600 px, four cells of 200 dp
  (the Orders icon at x about 94 dp, outside the column). Same as IPAD-B3 (decision to confirm). File: `src/ui/src/components/AppShell/TabBar.tsx`.

### Class C

- **TAB-C1.** Header of the board has the History button where the mockup has none, and the connection pill, as decided (OQ-07). The pill's
  "Reconnecting" is wider (252 px) than "Live" (131 px): the History and search buttons move 60 px left when the state changes. Fix by giving the pill a
  minimum width or putting it at the right of the search.
- **TAB-C2.** The detail panel overlays the board without reflowing it: the Preparing cards run under the panel's edge (their right padding and the column
  background are cut, the cards touch the panel's line at x 1685 px) and the Ready column is fully hidden. Acceptable as decided; but the board could
  shift left or the columns could scroll horizontally so the open order's column stays whole.
- **TAB-C3.** The panel's timer ("Waiting 804:06:48") does not tick (same value over two screenshots a minute apart); the card's does. Seen in `15-state.png`,
  later it ticked again.
- **TAB-C4.** Pending cards show "Waiting 217:07:01" (hours above 99) and Preparing "Preparing 1188:14:50": the data is old; the format `h:mm:ss` with three or
  four digits of hours is wide for the pill and will wrap on a long name. Cap or switch to days.
- **TAB-C5.** The panel's footer says "Mark ready for pickup" on a Delivery order while the card says "Mark ready" (`OrderDetailsPage.tsx:221`).
- **TAB-C6.** The chat pane header (name, "Order No. 4469 · Delivery") starts at y 66 px and is taller than the list's header ("Messages" at y 98): the two
  titles are not on one baseline. Cosmetic.
- **TAB-C7.** A second pane with nothing selected: Messages shows "Select a conversation" with an icon (good); Stores' right pane is plain white with
  no message (`16-stores-skeleton.png`, `17-...`), and during the load the chat pane is a skeleton drawn flush to the top of the window (y 57 px)
  with no header inset.
- **TAB-C8.** Profile: the Language row (new, after the load) makes the page longer than the screen; the Log out button is cut at the bottom edge
  (y 1450 of 1512 in the 2420-px view) with no end padding, the page scrolls. The row says "Language: Spanish" while all the texts are English.
- **TAB-C9.** The first board screenshot shows the rail's right line and the board's bottom ending at y 1537 px, 63 px above the window's bottom, then a
  white band down to the gesture bar: the tab area does not extend under the taskbar (same inset as TAB-B3), a white strip under the columns at all times.
- **TAB-C10.** Android back key on the Login screen (keyboard already closed) left the app: `input keyevent 4` after the password was typed
  sent the app to the launcher (`02-home-screen-app-left-by-back-key.png`). Normal Android behavior on a root screen; noted because the keyboard was thought open.

## Checked and fine (measured from the accessibility tree, px / 2 = dp)

- Rail 80 dp, items 64 x 64 (cell 15 to 143 px), icon 24, label 10: matches the mockup. Header height 56 dp (buttons 44). Page gutter 20 dp.
- Board: three columns of 376 dp with 15 dp gaps, count pills, cards with Reject (101 dp) and Accept (203 dp) both 44 dp high, Mark ready 44, same
  as the phone; the New "Waiting", Preparing "Ready in 02:20" / "Late", Ready "Waiting" labels and the colored late cards (red, yellow) are drawn.
- Panel 437 dp (decision: 440), header with back, print and more, status chips, customer card with call and chat buttons (44), items, totals, "More details".
- Centered dialogs 480 dp wide, close button 44, rounded, centered in the window.
- Login, Profile: columns of 560 dp (x 720 to 1840 / 800 to 1920 px), centered in the free area beside the rail.
- Messages: list pane 360 dp, rows 74 dp, unread badges, filter chips "All / Unread 31+", chat pane with "Send to" chips and compose bar; the chat open
  before a rotation was restored after returning to landscape.
- Rotation: the OS rotates; the activity is not recreated; the orientation is not locked on a tablet.

## What I changed in the local data

- Order #4464 (fifth newest pending): accepted from the board through the dialog with 20 minutes at 8:40 PM, marked ready from the panel at 9:16 PM.
  It is now "Ready for pickup" and is in the Preparing column of the board until a refresh (TAB-B2). Nothing else (no chat message, no reject, no store or
  product change). Opening the #4469 chat marked nothing (it had no unread).
- After the last restart (`33-final-state.png`): #4464 is in Ready ("Waiting 27:09"), counts New 248, Preparing 42, Ready 10. Order #4468,
  the newest pending one at the start (first card of New, 249), is no longer shown in any column although New only dropped by one (the accepted #4464):
  I never pressed an action on #4468 (I only opened its panel and its "more" dialog), so either the New list and its count disagree or something outside
  this pass changed it; worth a look by whoever owns the board's grouping (`src/ui/src/components/OrdersBoard/`).
- On the device: the app was force-stopped and relaunched three times; Android rotation settings changed (see above).

## What I did not see

- Not reached because the app did not answer (TAB-A1): Stores (list loaded, menu pane, products, product options sheet), Printers (two panes, ticket
  settings, ticket preview, add/found), History over the board, order search, the store filter, the reject / prep-time / pause / driver dialogs, the new-order
  alert, Alerts and sound, Sessions, Personal information, Password, the logout dialog, the language sheet, empty and error states of the board.
- Portrait: only Messages (phone layout in a column, tab bar). Not seen in portrait: the board, a panel or a dialog open while rotating, Orders, Stores, Profile.
  What happens to an open panel or sheet on rotation was not tested (a chat survived).
- A real keyboard over a chat message field; long-press and double-tap behaviors; touch target audit on screens that were not reached.
- The foldable case; a release build; the phone-sized window of the same AVD.
- The app was relaunched at the end of the pass and was still loading when I stopped; it should be logged in (the session survives a restart).
