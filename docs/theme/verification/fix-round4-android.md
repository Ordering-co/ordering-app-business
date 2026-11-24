# Fix round 4 (Android phone): what the second Android pass left open

Date: 2026-11-19 / 20 (emulator clock 23:35 to 00:41). Branch `feature/theming-native`, local commits only. Device: `emulator-5556`, AVD `OBizTest`, 1080x2400, 2.625 px per dp, Android 17 (API 37), Debug build from Metro 8097, local API, project `development`. Screenshots: `<scratchpad>/pass5/android/NN-*.png` (scratchpad = `/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad`); every one opened and looked at. Every adb call named the device (`adb -s emulator-5556`).

**The host was loaded the whole time** (load average 19; the other phone emulator `emulator-5554` ran at 340 % CPU for hours). Every action took 5 to 30 s to show on the device, so each judgement below waits for the screen to settle and a "seen" says so. The screenshot of a transition (a frame that lasts a second) could not be caught.

Verdicts: **fixed and seen** / **fixed, seen in its end state only** / **not an app defect** / **not seen**.

## 1. B11 tab bar 84 dp (class B, open since the first pass): fixed and seen

**Measured before** (`uiautomator dump`, `pass5/android/01.png`): window content from y=63 to y=2337 (24 dp status bar above, 24 dp navigation bar below, both padded by `MainActivity`); `tab-bar` 2117 to 2337 = 220 px = **83.8 dp**; the four tabs 2146 to 2259; so the labels end **78 px = 30 dp above the window's bottom**. The mockup (`Main.dc.html`) draws the bar 64 high (1 border, 10, the tab, 10).

**Cause.** `MainActivity.kt` pads the content view by the system bars, so the safe-area inset the JavaScript reads on Android is **0 in every mode** (`helpers.ts` already said so). `AppTabBar` sized itself with `bottomSpace(inset, min)`, i.e. `max(0, bottom_nav.base.min_bottom_space = 20)`: a second space under the labels, on top of the navigation bar that the activity had already left out of the window. The pinned bars, the sheets and the floating buttons had been moved to `barBottomSpace` (inset alone on Android) in an earlier round; the tab bar had not.

**Fix.** `bottomBarBox` takes the space it is given (`{ height, padding, space, growth }`) and `AppTabBar` gives it `barBottomSpace(theme, insets.bottom)`: on iOS the inset the provider gives, never less than the theme's minimum (the iPhone keeps its home-indicator space: 64 + 34 with a 34 inset; 64 + 20 on a phone with none), on Android the inset alone. Files: `src/theme/helpers.ts`, `src/ui/src/components/AppShell/TabBar.tsx`. Tests: `AppTabBar.test.tsx` mocks the safe-area provider with a mutable inset and asserts, per platform, Android inset 0 gives height 64 / padding 10, Android 24 gives 88, iOS 34 gives 98, iOS 0 gives 84 (Platform is switched in the test, the inset comes from the provider); `boxAndClearance.test.ts` pins the box (`space` once, no `min`).

**Seen after** (`02-tabbar-after.png`, `13-messages.png`): `tab-bar` 2169 to 2337 = 168 px = **64 dp**; labels end at 2311, 26 px = 10 dp above the bar's bottom (the bar's own padding), the system's navigation bar below, once.

**Same reasoning for the other bottoms** (measured on the device):
- A stack screen's footer (order details "Mark ready", `15-details.png`; Add printer, `32`; Personal information, `26`; the Sessions bar, `09`): button ends 27 px = 10 dp above the window's bottom: the bar's own padding, no second space. Fine.
- A sheet (assign driver, `19-assign-sheet-4462.png`, accept, `41`): the dialog window runs under the navigation bar; `sheet-body` ends at 2337, the footer button 52 px (20 dp) above it, the inset reading the real navigation bar below. Once. Fine.
- **The chat's composer was the one left on `themeBottomSpace`** (the theme's 20 minimum on top of the activity's padding, as the tab bar had). `Chat/styles.ts` now uses `barBottomSpace`, never less than a bar's own padding (`Math.max(…, bottom_bar.base.padding)`, the gap the keyboard-up composer already has); iOS values are unchanged (34 with the indicator, 20 with none). Test `Chat/__tests__/chatStyles.test.ts`. **Not seen on the device** (no chat opened after the change); jest only.

## 2. ANDROID2-B1 Back from Sessions leaves the app: not reproduced; the Back key is queued behind a loaded JS thread

Reproduced the path 6 times from Profile with ONE press each and a wait for the screen to change: Sessions while loading (twice), Sessions loaded (once), Password, Alerts and sound, Printers (and Personal information through its "Discard?" dialog): **every one went to Profile, none left the app** (`05`, `08`, `10` and the `where` log). What does happen: **the Back key is not answered for 30 to 65 s while Sessions opens** (pressed at 23:44:39 while the skeleton showed, it took effect at about 23:45:40; at 11:38 the same), because the JavaScript thread is busy with that screen (section 4). A tester who sees nothing happen presses again, and on a stack of Sessions → Profile → Orders (the Profile tab goes back to the Orders tab, decision C10) two or three presses reach the Orders root, where Back leaves the app: that is the "left the app in two of three" of the pass.

Code read: no `BackHandler`, `beforeRemove`, `reset` or `replace` touches Sessions (only `StoresList` and `PrinterEdition` own a `BackHandler`, and the menu's `beforeRemove` closes its search); `HomeNavigator` swaps its screens for the splash only while `useSession().loading`, which is true only at the first load. `ReactActivity` (RN 0.88, targetSdk 36) routes Back through `OnBackPressedCallback` to JS and exits only when JS answers "no handler" or when no React instance exists (a Metro reload: `ReactHostImpl.onBackPressed` returns false and the activity finishes), which the first pass saw a lot of (other agents' saves reload the app). Not a defect of the app's navigation; the cost of opening Sessions is the real finding (below, fixed in part).

**Fixed in part.** The screen wrote the dates of each of its 100+ sessions on every render, two `dateTime` calls twice per row. Now the rows are written once per change of the list (`Sessions/index.tsx`, `otherRows`). The Hermes profile of opening Sessions (45 s window, Profiler over CDP): JS busy 34.0 s before, 29.2 s after; `Intl.DateTimeFormat` construction (1.9 s self before) is gone from the top. The rest is React rendering a hundred native rows at once in a debug build (`createNode`, `completeRoot`, dev-only `createTask`). This account has 100+ sessions (every sign-in adds one, nothing is ever deleted by the passes); a real account has a few. A virtualised or paged list would be the structural answer: **not done**.

## 3. ANDROID2-B2 taps dropped for the first minute or two after a launch: the debug bundle on a loaded host, not an overlay and not one piece of the app

**Cold start measured** (`force-stop`, launch; `top -H` per thread and a `uiautomator dump` every 5 to 10 s; `pass5/cold2.txt` in the scratchpad):

| since launch | what |
|---|---|
| +0 to +70 s | the process starts, Metro serves the debug bundle; the JS thread `mqt_v_js` does not exist yet (main thread and Firebase, OneSignal, Jit threads busy) |
| +77 to +121 s | `mqt_v_js` 65 to 97 % for 40 s: running the bundle and the first render |
| +114 s | the Orders list is drawn (tabs, 4 cards, tab bar) |
| +114 s | **a tap on Stores sent the moment the list was drawn was answered: Stores on screen 7 s later** (the polling interval); no tap was dropped |
| +125 to +175 s | `mqt_v_js` 75 % falling to 10 to 30 % |

A second cold start under the Hermes sampling profiler (CDP `Profiler.start`, 100 s from +35 s): **the JS thread was in a call 25 s of the 100** (9 s of it in the first 10 s: executing the bundle, longest unbroken stretch 4.1 s at +44 s), then a steady 16 to 26 % until the end. By function: React in development mode (`runWithFiberInDEV`, `flushSyncWorkAcrossRoots` 12 s of the steady part), `[Host Function] createTask` 5.4 s (React's dev-only async stack tracing), `logComponentRender`, `reportMeasure`, `PerformanceMeasure` (dev profiling) 1.7 s; the app's own components are small (`OText` 1.3 s, `Icon` 1.1 s inclusive, `OrderCardBase` 0.15 s, `OrdersOptionUI` 0.06 s). **No single piece of the launch holds the thread for seconds**: no synchronous parse of a large cache (the offline copy is only written online, after 1.5 s of stillness, and read only when offline), no group fetched twice, no re-render storm beyond the one-second shared ticker. **No overlay**: `GlobalOverlays` mounts `OrderActionsHost`, `NewOrderAlert` and `ConnectionHost`, which draw nothing while they have nothing to say; the tap went through at +114 s.

So: **the debug bundle (React development build, no Hermes bytecode, the bundle served by Metro) on a host at load 19 with another emulator at 340 %.** The Release build measured the board painted in under 2 s with the JS thread at 1 to 2 % (`docs/deps/release-builds.md`); I did not build Release in this round, so that figure is the earlier one, not mine. What a user sees in Debug as "taps dropped" is a tap answered 5 to 30 s late and then repeated.

## 4. Class C

| Item | Verdict | Cause, files, evidence |
|---|---|---|
| Messages row, long status chip: the unread badge drops to a third line | **fixed and seen** | `foot` was a wrapping row (`flexWrap`, made on purpose in round 2 to keep the long status whole). Now one line: the number and type `flexShrink: 0`, the status `flexShrink: 1, minWidth: 0` (the badge already ends a long word in an ellipsis through `numberOfLines`), the count's wrapper `flexShrink: 0`. `PreviousMessages/styles.ts`, `ConversationRow.tsx`; test in `PreviousMessages.test.tsx` (it replaces the "next line whole" test, which asserted the old rule). Seen `13-messages.png`: #3113 "Not picked up by custom…" with its "1" on the same line; "Accepted by business" rows keep chip and count together |
| Check box of the details' product line sits too low | **already fixed (round 2 / earlier), seen** | `15-details.png`, `18`: `product-check` frame 1432 to 1495 (centre 1463) and the line "1 ×" 1437 to 1490 (centre 1463): centred on the first line. No change |
| Menu "View": an unfiltered list for about a second before the filter applies | **fixed, seen in its end state** | `openSearch(true)` set the filter at once, but the controller asks for the filtered list after its 300 ms search delay, so for that gap the screen drew the previous (whole) list. A `filterPending` state now holds the rows as the loading skeleton until the controller's request starts (`loading` on) or 1.5 s pass; the same gap on leaving the filter. `BusinessProductList/index.tsx`; test "View does not show the whole menu while the filtered list is on its way". Seen `24-v1.png` (the filtered list: only Blouse, "Unavailable 1"), `25-blouse-on.png` ("Unavailable 0", "All products are available"). **The one-second frame itself could not be caught** (screenshots lag by 2 to 15 s on this host); the test shows it |
| Assign-driver footer read "Unassign driver" with no driver assigned | **fixed (round 2), seen** | `19-assign-sheet-4462.png`: store of #4462 lists "Driver D." and "Driver QA i."; footer disabled "Assign driver"; `16` for a store with no drivers: the "No drivers for this store yet" state, no button |
| Ticket preview breaks mid-word at the last column | not a defect (decided) | not touched |

## 5. Seen for the first time

| Screen | Seen | Notes, shots |
|---|---|---|
| Profile → Sessions loaded | yes | `09-sessions-loaded.png`: "This device" card (Android · this phone, Started 19/11/2026 11:30 PM, Valid until 19/11/2027 11:30 PM, soft "Current"), "Other devices" rows with outlined "Sign out", the bar "Sign out of all other devices". **No "invalid format" anywhere; times readable.** Loading took 25 to 60 s here (section 2) |
| Personal information | yes | `26`: avatar and "Change photo", Name, Last Name, Email, phone with +57 and flag, "Remove account" disabled with "Administrator accounts can't be removed here.", "Save changes" disabled until a change. Typed one letter in Name (not saved), Back: keyboard first, then the **"Discard?" dialog** ("You have changes that are not saved. Do you want to discard them?", Keep editing / red Discard) `27`; Discard returned to Profile with the name unchanged |
| Printers (none) → Add printer | yes | `31` empty state ("No printers yet", Add printer, PDF line); `32` step 1 of 2: Star / Epson / **"Other (ESC/POS)" whole**, Wi-Fi or LAN / Bluetooth radios, 80 / 58 mm, notice, "Find printers"; `33` step 2: **a yellow notice "Bluetooth permission is required to find printers. Allow "Nearby devices"…" with "Open settings" even though Wi-Fi or LAN was chosen**, then "Enter the IP address instead", Name field, "Test print" disabled, "Save printer" disabled. The way out exists (the IP link). **Finding (C): the wording says Bluetooth for a Wi-Fi/LAN search** (I did not check whether the Star discovery really needs Nearby devices for a LAN search); the text is in the printer wizard; not changed (printing is out of my scope and I could not tell if the permission is really needed for LAN). Nothing was saved |
| Ticket settings | **not seen** | reached only from a saved printer; I added none (adding is allowed but costs about twelve slow steps here) |
| Ticket preview (no printer) | yes | `35-ticket.png`: paper at 37 columns, "Share PDF" and "Print" |
| A completed order's details | yes | `48-completed-details.png` (#3113): "Not picked up by customer" and "Pickup" chips fit one row (the old B3 overflow is gone), customer card with "Not address for pickup", product with options, Total with "Paid", "Order timeline" (Accepted 10:34 PM · Ready 10:35 PM), "More details", "Print ticket" |
| Pickup order accepted, taken to Ready, "Not picked up" | yes | `41` accept sheet ("Accept · 20 min"); `45` ready card with "Not picked up" / "Picked up"; `46-not-picked-confirm.png`: **"Not picked up?" "Mark order #3513 as not picked up? This cannot be undone." Cancel / red Not picked up**; confirmed, the order is in History (`47`) |
| Connection sheet (tap the pill) | yes | `36-connection.png`: "Connection", "Reconnecting" (yellow tile, "Lost the connection to the server. Trying to reconnect. Last update 12:18 AM."), Server "Disconnected" (red), Notifications "On" (green), "Reconnect now", "If orders stop arriving, check your Wi-Fi or mobile data." The socket stays "Reconnecting" on this local setup (known) |

## What I changed in the local data

Pickup orders **#3514** and **#3513** (middle of the New list, found by the "Pickup" order-type filter) accepted with 20 min; **#3513** marked ready for pickup and then "Not picked up" (confirmed, cannot be undone: it is in History). #3514 stays accepted. Product **Blouse** (Twirly Laundry) switched off and on again (Available). A letter typed in the Name field of Personal information and discarded (nothing saved). The Add printer wizard opened to step 2 and left (nothing saved). One more session of the account exists (the relaunches signed nobody out). The order-type filter was cleared; no store paused, no driver assigned, no message sent.

## A native change I ask for

None. (`MainActivity.kt` is right as it is: the JS inset reads 0 on Android by design and the bar now relies on that.)

## What I did not see

- The one-second frame of the Menu "View" before the fix (no screenshot can be taken that fast here) and the chat composer after its fix (jest only).
- Ticket settings (needs a saved printer), the Bluetooth path of the printer wizard, a real printer.
- B1 as the tester saw it (a Back that leaves the app): not reproduced with single presses; the explanation is by the measured delay, not by a captured exit.
- A Release build (the 1 to 2 % figure is the earlier one).
- The iPhone: the tab bar change is asserted in tests through the inset the provider gives (iOS 34 and 0), not looked at on an iPhone.
- Notifications permission sheet, offline notices (airplane mode), sounds, a tablet.
