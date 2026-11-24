# Android tablet, second pass (fixes and the screens the first pass never reached), 2026-11-19

Device: AVD `OBizTablet` (`emulator-5558`), 1280 x 800 dp landscape, 2 px per dp, Android 17 (API 37), Debug build, JavaScript from Metro on 8097, branch
`feature/theming-native`. Data: the local API, the test owner account (typed into the app only, not written here).
Screenshots: `<scratchpad>/pass2/tablet-android/NN-name.png`, `<scratchpad>` =
`/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad`.

The JS thread is free now: `top -H` on the app at rest showed `mqt_v_js` at 0 % (TAB-A1 confirmed gone), every tap in this pass answered at once, and the accept
dialog reads "Ready by 10:15 PM" (TAB-A3 confirmed gone, `01-accept-dialog-fixed.png`).

## Verdict per finding of the first pass

| Id | Verdict | Cause (one line), files, screenshot |
|---|---|---|
| TAB-B3 | **fixed (JavaScript)** | A Modal on Android is laid out inside the system-bar insets (`fitsSystemWindows`) unless it asks for the whole window: its scrim stopped above the taskbar. Every `Modal` of the app now sets `statusBarTranslucent` + `navigationBarTranslucent` (the `SafeAreaProvider` inside each modal already measured the insets and pads by them). `shared/OModal.tsx`, `OBottomPopup.tsx`, `ConfirmDialogHost.tsx`, `LoadingOverlay.tsx`; test `shared/__tests__/modalWindows.test.tsx`. Seen: `01-accept-dialog-fixed.png`, `02-reject-dialog.png`, `03-reject-keyboard.png` (the box still rides above the keyboard), `06-logout-dialog.png`, `35-pause-dialog.png`, `41-test-alert.png`, `45-language.png`: the scrim covers the whole window, the box is centred in the window less the insets. Side effect found and fixed in the same change, see TAB2-B1 |
| TAB-C9 | **native change asked, not made** | The white band is `MainActivity.kt`'s `setOnApplyWindowInsetsListener`, which pads the content view by `systemBars` top and bottom. On this tablet the taskbar reports `navigationBars` = 64 px (32 dp) at the bottom but `tappableElement` = 0 (`dumpsys window`: `type=navigationBars frame=[0,1536][2560,1600]`, `type=tappableElement frame=[0,0][0,0]`); the app window ends at 1536. Nothing in JS can draw under the activity's own padding. See "The native change" below. `00-start.png`, `07-login.png` |
| TAB-B1 | **not a defect** (by the keyboard rule), one suggestion | With the password focused the field sits just above the keyboard (`08-login-keyboard.png`); the keyboard's check key logs in (verified, `10-after-login-enter.png`); a drag on the form closes the keyboard (`keyboardDismissMode='on-drag'`, the rule of `KeyboardScrollView`) and shows "Log in" (`09-login-keyboard-swiped.png`). The scroll could reach the button but any drag that would scroll first closes the keyboard. Suggestion, not done (it changes the app's rule): the auth screens could pass `keyboardDismissMode='none'` so a landscape tablet can scroll with the keyboard up |
| TAB-B2 | **fixed before this pass, verified** | The board's rows get `split.changeOrderStatus`, which applies the server's answer to the lists (`useOrdersSplit`, `applyOrderChange`), and the details panel emits `ORDER_CHANGED_EVENT`. On the device with the socket down ("Reconnecting"): #4195 (the oldest pending I could pick, 78 days) accepted from the dialog moved at once from New to Preparing, counts New 60+ to 59+, Preparing 32+ to 33+ (`16-after-accept.png`); "Mark ready for pickup" from the panel made the panel say "Ready for pickup", "ready 10:00 PM" and the card moved to Ready, 33+ to 32+ and 8+ to 9+ (`19-after-ready-panel.png`, `20-board-after-ready.png`). Test added: `OrdersBoard/__tests__/OrdersBoard.test.tsx` ("an action from a card is applied to the board's lists...") |
| The missing order #4468 | **not a defect of the board** | I looked it up with the search: #4468 is "Rejected by business", reason `Android_pass_test` (`13-search-4468.png`). It was rejected by the other session that ran the Android phone pass at the same time (that is the reason text it typed), not by this one; the first pass's board was stale (no socket) and showed it until the restart refetched. The grouping cannot drop an open order: `splitOrders` maps every status of the controller's `active` slot (0, 3, 4, 7, 8, 9, 13, 14, 18 to 26) to a column; only a status the app does not know is left out, and `flattenOrders` removes only repeated ids |
| TAB-C3 | **not reproduced; a different defect found** | The panel's "Ready in" figure ticks (19:30, 19:21 in two shots `17-panel-4195.png`, `18a.png`). But it is 18 seconds behind the card of the same order ("Ready in 19:48" / "19:39" at the same instant): the card counts from the order's accepted moment plus `prepared_in` (`PreviousOrders/orderTimes.ts`), the panel from its own accepted moment (`OrderDetails/orderTimes.ts`, `preparation clock`). Both files belong to the other agent: TAB2-C1 |
| TAB-C6 | **not a defect** | Both bars are `header.height` (56) tall and share their top and bottom lines; the chat's title has a second line (the order's number), so its first line sits above the one-line "Messages" title. That is the mockup (`Chat.dc.html`: two lines in a 56 bar) in a pane next to a one-line bar. `21-messages-empty-pane.png`, `22b-chat-loaded.png` |
| TAB-C7 | **fixed (a), not a defect (b)** | (a) Stores' second pane was `<View />`; it is now `SelectStore` and Messages' `SelectConversation` is rebuilt on the same piece, `NotFoundSource` (icon tile + "Select a store" / "Select a conversation"): `StoresList/SelectStore.tsx`, `OrderMessage/SelectConversation.tsx`, `pages/Stores.tsx`, tests `StoresList/__tests__/SelectPane.test.tsx` and `pages/__tests__/Stores.test.tsx`. Seen for Messages in `21-messages-empty-pane.png`; for Stores only in Jest: with the stores loaded the first store is selected at once (`32-stores.png`), so the empty pane shows only while the list loads. (b) The chat's skeleton starts at the same line as the loaded header (title bone y 57 to 105, loaded title centre y 80; the bar is the same `ONavbar` box), it is not flush: `23-sk2.png` against `23-sk3.png` |
| TAB-C8 | **not a defect** | The page is a little taller than the window and scrolls; at the end of the scroll "Log out" is whole with 40 dp under it (`05-profile-end.png`). The Language row now says English |
| TAB-A2 | **fixed before this pass, verified** | Rotation to portrait: the phone layout (column, tab bar) was on screen within 1 s (`24-rot-chat-1.png`), back to landscape within 2 s. What each case does: **chat open** (Messages) goes to the phone list; the selection is kept and the same chat is in the second pane again after rotating back (`25-back-landscape-chat.png`). **Order panel open**: portrait shows the phone list of orders without the panel (the board and its panel do not exist in portrait; `27-panel-rotated-portrait.png`); the order is not reopened as a screen (TAB2-C4). **Centred dialog open** (accept): it stays open and re-centres in the portrait window, scrim over the whole window (`29-dialog-rotated-portrait.png`). Nothing wrong in files I own |
| TAB-B4, TAB-C1, TAB-C5 | not mine | The other agent's |
| TAB-C2, C4, C10 | unchanged | C4 (hours over 99) is gone with the new clock text ("Waiting 9d 2h"); C2 and C10 are as decided / normal |

## The native change asked for (TAB-C9)

File `android/app/src/main/java/co/ordering/business/MainActivity.kt`, the listener on `android.R.id.content`:

```kotlin
val systemBarsInsets = insets.getInsets(WindowInsetsCompat.Type.systemBars())
view.setPadding(0, systemBarsInsets.top, 0, systemBarsInsets.bottom)
```

On a tablet whose taskbar is not "tappable" (stashed: only the gesture pill) the bottom 64 px are reserved and painted with the window background. Two options for the Builder base:
(a) pad the bottom by `insets.getInsets(WindowInsetsCompat.Type.tappableElement()).bottom` only when `!resources.getBoolean(R.bool.lock_portrait)` (a tablet); the content then runs to the bottom, under the pill, and the board / rail / lists must keep `max(0, systemBars.bottom - tappable.bottom)` of room at the end through `useSafeAreaInsets()` (the stack screens and the board do not do that today: they would need the bottom inset added where they end); or
(b) leave it: the band is white like the page, the only visible effect is that the rail's right line and the board end 32 dp above the window's bottom edge (class C). I recommend (b) unless the owner wants the rail to reach the bottom.
The modals no longer depend on this: their window covers the display (TAB-B3).

## What I changed (commits, all local)

- `7ab0088` every modal covers the whole Android window (TAB-B3), test `modalWindows.test.tsx`.
- `6829dfd` board test for the applied answer (TAB-B2).
- `888b951` the one empty state in Stores' and Messages' second panes (TAB-C7); a store's closing time never splits from its AM/PM in a narrow card (TAB2-C2).
- `f597a4f` a full-screen modal page pads its end by the window's bottom inset (TAB2-B1); the printers' only-content wizard has no dead close button (TAB2-C3).
- `57c8905` a searchable select sheet's field has a placeholder (TAB2-B2). The other agent made the same change in `OSelect.tsx`; the coordinator resolved the merge (the file now has `placeholder` and `accessibilityLabel`).
- New key: `SELECT_A_STORE` = "Select a store" (`i18n/pending/fix-tablet.json`; the catalog still lacks it: `pnpm i18n:generate`).

## Screens seen for the first time on the tablet

| Screen | Seen | Screenshot | Verdict |
|---|---|---|---|
| Stores, list pane + Menu pane (Stores, Menu) | yes, landscape | `32-stores.png` | list 360, first store selected, menu with categories and product switches: matches. Status line wrapped "11:59 / PM" in the narrow card: fixed (TAB2-C2, `33-crop.png`) |
| Product options sheet (ProductOptions) | yes | `34-product-options.png` | centred dialog, switch for the product and for each option: ok (two groups with the same name come from the data) |
| Pause orders dialog (SheetPause) | yes, not confirmed | `35-pause-dialog.png` | ok, times in the store's zone with the note |
| Printers, two panes, add wizard step 1 and 2 (Printers, PrinterAdd, PrinterFound) | yes, no printer exists | `36-printers.png`, `39-printers-found.png` | wizard beside the list; "Looking for printers..." never ends on the emulator. Dead close button fixed (TAB2-C3); TAB2-C5 below |
| Ticket settings, ticket preview, printer found / empty variants | no | | no printer to add on the emulator (ticket settings need a generic one); the print button of the panel was not tried |
| History over the board (OrdersHistory) | yes | `46-history.png`, `49-history-bottom-pad.png` | page in a centred column, chips, days, cards; list ends above the gesture pill after TAB2-B1 |
| Order search (OrdersSearch) | yes | `11-search.png`, `13-search-4468.png`, `50-crop.png` | ok; a search shows its results in one column over the board under the "Filters on" notice |
| Store filter sheet | yes | `51-store-filter.png` | its search field was a blank box: fixed (TAB2-B2); verified only in Jest (the app reloaded for the merge) |
| Reject dialog, accept dialog | yes | `02-reject-dialog.png`, `01-accept-dialog-fixed.png` | ok; with the keyboard `03-reject-keyboard.png` |
| Adjust time dialog | no | | not opened |
| Assign driver dialog (`assign_driver_enabled` on) | yes, not used | `59-assign-retry.png` | two drivers with radios, "Unassign driver" disabled until one is chosen: ok |
| New-order alert (test alert) | yes | `41-test-alert.png` | centred dialog "1 new order", Mute, Close; the sound cannot be heard |
| Alerts and sound | yes | `40-alerts.png` | ok (stack screen: no rail) |
| Sessions, Personal information, Password | yes | `44-sessions.png`, `42-personal-info.png`, `43-password.png` | column of 560, bottom bar: ok |
| Logout dialog (not confirmed in the dialog check) | yes | `06-logout-dialog.png` | ok. I did sign out once, on purpose, for TAB-B1 and signed in again |
| Language sheet | yes | `45-language.png` | centred dialog, long list scrolls |
| Portrait: orders list in a column, order details, Profile, Messages | yes | `27-panel-rotated-portrait.png`, `30-portrait-details.png`, `31-portrait-profile.png`, `24-rot-chat-1.png` | phone layout in a 560 dp column, details with Reject / Accept bar: ok. Tab bar before the merge: four tabs spread over the full width (the owner's decision is "tabs inside the column"; the other agent's change is in the merge) |
| Login (landscape) | yes | `07-login.png` | ok |

## New findings

### Class A

None.

### Class B

- **TAB2-B1 (fixed, `f597a4f`).** After the modals covered the whole window, the full-screen pages (History, search, the full order actions) drew their last rows under the gesture pill (`46-history.png`). `OModal`'s page now pads its end by the window's bottom inset and gives its content a zero bottom inset, so nothing pads twice (the search's bottom bar kept its place: `50-crop.png`). Test in `OModalInsets.test.tsx`.
- **TAB2-B2 (fixed, `57c8905`).** The store filter sheet's search field had no placeholder (a blank grey box, `51-store-filter.png`): `OSelect` passed `searchPlaceholder` undefined to the field. Default now "Search" (existing key).

### Class C

- **TAB2-C1 (not mine).** The details panel's "Ready in" and the card's differ by 18 s for the same order (see TAB-C3). Files: `OrderDetails/orderTimes.ts` (the panel's moment of acceptance) and `PreviousOrders/orderTimes.ts` (the card's); one of them should take the moment the other uses.
- **TAB2-C2 (fixed, `888b951`).** Store card status "Open · closes 11:59 PM" wrapped "PM" alone on a second line in the 360 dp list pane; the time of day and its AM/PM are joined (a no-break space), so the line breaks before the time.
- **TAB2-C3 (fixed, `f597a4f`).** Printers on a landscape tablet with no printer: the wizard is the pane's only content and its close button did nothing; it is not drawn now.
- **TAB2-C4.** Rotating the tablet to portrait with an order open in the board's panel drops the order (the board does not exist in portrait); it could open as the details screen. Also the Orders badge reads 59+ on the rail (the board loads up to six pages) and 21+ on the tab bar (one page of 50): both are lower bounds, the number changes with the layout.
- **TAB2-C5.** Printers with no printer, landscape: the list pane holds only "Print when I accept an order" (a switch with nothing to act on); the empty text ("No printers yet", the PDF hint) and an add button are not drawn beside the wizard. File: `PrinterSettings/index.tsx` (`noPrinters && !split ? emptyState : list`).
- **TAB2-C6.** Once, right after the coordinator's merge (`OSelect.tsx` had conflict markers for a few seconds), the app showed a black window until it was force-stopped and relaunched (`55-assign-driver.png`, `56-after-black.png`); the same tap on "Assign" worked at once afterwards (`59-assign-retry.png`). I take it for the reload with a file that did not compile, not for a defect, but it is the only time the app was seen black.

## What I did not see

- Not seen: ticket settings, ticket preview, a printer in the list (edit, test, remove), "found" with printers, adjust-time dialog, prep-time sheet as a dialog other than accept, login by code, forgot password, the reject confirmation to its end (it was never confirmed), an offline or error state of the board, the board's store filter after the placeholder fix (only in Jest), the Stores' empty second pane (only in Jest), Stores and Printers in portrait, the new-order alert's sound and vibration, Sessions "sign out" actions.
- Everything about phones (the modal change affects phones too: their sheets now also run under the navigation bar and pad by the inset; not looked at on `emulator-5556`, which I did not touch).
- A release build, the foldable case, a real keyboard over the chat field.

## What I changed in the local data

- Order #4195 (78 days old, "Luis Mer", 10 Cheeseburger): accepted from the board with 20 minutes and marked ready from its panel (it is "Ready for pickup", in the Ready column).
- Opened the chats of #4195 and #4464 (marks their messages as read) and the panel / dialogs of #4467 (nothing confirmed). No reject, no store or product change, nothing paused.
- Signed out once and in again: one more session of this account (the Sessions screen lists it as the current one).
- The device: rotation settings (`accelerometer_rotation` 0, `user_rotation` 0 at the end, landscape). The app is open and logged in, Metro runs on 8097.
