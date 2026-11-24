# Second device pass: Android phone

Date: 2026-11-19 (session 21:53 to 23:32, emulator clock) · Device: emulator `emulator-5556`, AVD `OBizTest`, phone 1080x2400, 420 dpi (2.625 px per dp), Android 17 (API 37) ·
Build: Debug `co.ordering.business`, JavaScript from Metro on port 8097 (the checkout's `feature/theming-native` as the other agents were editing it) · API: local
(`http://localhost:8080`, project `development`) · Account: the owner's test account (typed into the app only; the Profile screenshots 112, 130 show its e-mail: do not commit them).

Screenshots: `/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad/pass2/android/` (numbered by time; every file there was opened and looked at).
The folder `.../pass2/android-discarded/` holds 80 working shots that are **not evidence** (see "What went wrong with the setup": they were taken while my taps went to another emulator, or during a reload).
How the app was driven: `adb -s emulator-5556` (`uiautomator dump` for frames, `input tap/swipe/text/keyevent`, `screencap`, `dumpsys audio` for the sound checks).

## What went wrong with the setup (read first)

1. **Part of my input went to the wrong emulator.** The helper `a` in the shared folder `<scratchpad>/bin/` was overwritten at 22:24 by another agent with a version for `emulator-5558`
   (the tablet). Between about 22:25 and 22:46 my commands written as `a shell input ...` hit the tablet, not the phone: about 25 taps and swipes (Stores switch, tab bar, a swipe from the top edge),
   the HOME key, two BACK keys, **an `am force-stop co.ordering.business` and a monkey launch (about 22:44)**, and two taps on "Mark ready" (22:35, on whatever screen the tablet showed). No text was typed there.
   I found it at 22:46 (`wm size` said 2560x1600) and moved to a private helper folder with the serial written in every call. The tablet agent may have seen stray taps and one app restart in that window.
   The phone itself received none of those inputs (its adb log shows only my commands up to 22:34 and again from 22:47). Everything I report below was checked again on the phone after 22:47, or happened before 22:24.
2. **The app reloaded or was relaunched many times** because other agents edited the checkout (Metro full reloads: skeleton screens, a blank white frame, a splash). Each reload loses the screen. One **red screen** came up at 22:10:
   `Failed to compile · Syntax Error · None of these files exist: src/ui/src/config/constants(...)` at `index.tsx` line 3 (`export const flatArray = ...`); it was another agent's mid-edit, it did not come back after a relaunch
   (`39-red-screen-mid-edit.png`). Not reported as a defect.
3. **The host was overloaded** (load average 20 to 60): the emulator needed 2 to 5 s to open a sheet, `uiautomator dump` often 5 to 10 s, a screenshot often showed the frame from before the last input. Cold starts from the launcher took 60 to 120 s
   (bundle download plus JS). One ANR was logged at 22:22 in a secondary process of the app (the OneSignal `SyncJobService` process, pid 27856), killed by the system; the UI process was not hit.
4. The system back key left the app a few times when I pressed it once too often at the root; relaunching is slow, so some sections were checked less than I wanted.

## 1. First-pass findings

Verdicts: **fixed** · **not fixed** · **partly** · **could not see**. Shots are in `pass2/android/`.

| Id | Verdict | Shots | What I saw |
|---|---|---|---|
| A1 Orders list unresponsive | **fixed** (with the host-load caveat) | 02, 04, 05, 07, 22, 23, 92 to 94 | One page loads at launch ("New 22+"); the counters grow as pages load while I scroll (22+ → 60+ → 99+); the tab badge and the pill read the same ("99+"). A tap on Accept opened the sheet within a few seconds and Accept / Mark ready answered; the card moved without a restart. `top -H` at rest: UI thread 3.2 to 3.5 %, `mqt_v_js` 3.4 % (21:55 and 22:00). I did not scroll through all of the hundreds of orders, only far enough to see two further pages arrive. |
| A2 "invalid format" in the prep-time and accept sheets | **fixed** | 05, 12, 33, 34, 32 | Accept sheet: "Ready by 10:16 PM" (+5: 10:23 PM). Adjust sheet: "Now: ready in 9 min · promised for 10:17 PM", +5 gives "10:22 PM", +10 gives "10:27 PM"; after "Update time" the details say "Promised for 10:27 PM". |
| B1 History card: Review button off the card | **fixed** | 138 | The chip and the soft button wrap onto two lines inside the card (cards #4472, #4471, #3457). |
| B2 Search result card: extra chip and clock overflow | **fixed** | 31 | Status chip "Accepted by business" on the first line, the clock wraps to its own right-aligned line ("Ready in 11:22"), nothing leaves the card. |
| B3 Details status row overflows (completed pickup) | **could not see** | none | The completed order I opened (#4471) was lost to a reload; not reached again. |
| B4 Orders tabs 28 dp | **fixed** | 02, 138 | Active pill 95 px = 36 dp in a 121 px = 46 dp track, as drawn. |
| B5 "Clear" / "View" grey filled buttons | **fixed** | 31, 104 | Both are underlined text buttons in the notice's dark yellow, 116 px = 44 dp touch height. |
| B6 Offline notice loses its second line | **could not see** | none | Airplane mode not exercised in this pass. |
| B7 Chat header row, quick replies | **partly** | 96, 97 | Fixed: only "Customer" is selected by default; "No driver yet" is under the chips and not cut. Still absent: the row of quick replies of the mockup. |
| B8 Ended-chat notice; reject sheet closing once | **could not see** | 14, 15, 16 | No ended chat reached. The reject flow (Other, note, "Reject order" with the keyboard up) worked on the first try: the order left the list. The earlier "closed without rejecting" did not come back (one try only). |
| B9 Messages: badge off the chip; no offline notice | **partly** | 95 | The "33+" badge now sits inside the "Unread" chip. Offline notice not exercised. |
| B10 Ticket preview wraps | **fixed** | 128, 129 | The paper holds 37 characters: every dashed line fits, columns of prices line up, the footer button reads "Print" on one line. What still wraps is the ticket's own text longer than 37 characters ("Delivery Date: ASAP(10/11/2026 07:13P", then "M", then ")" on three lines; "New York" then "," alone), which is the printed ticket's content (not themed, see `theme-exceptions.json`). |
| B11 Tab bar 84 dp, 24 dp added under it | **not fixed** | 02, 95, 99, 112 | Bar from y=2117 to 2337 px = 220 px = **84 dp** (mockup 64), the labels end at 2259, so 30 dp of empty space sit under them, and the 24 dp gesture area comes below. Unchanged. |
| B12 Pause times one hour behind | **fixed** | 100, 102 | The sheet says "Times are in the store's time zone (Tegucigalpa)" and lists "Until 10:24 PM" for 30 minutes (store clock 9:55 PM, device 10:54 PM); the card says "Paused · until 10:24 PM" with "Store time: Tegucigalpa". Resume now put it back to "Open · closes 11:59 PM". |
| B13 Missing pieces of mockups | **partly** | 103, 112, 96 | Menu: still no "Category on" switch next to a category title. Chat quick replies: absent (B7). Profile: "Help center" replaced by "About · Version 1.0". Profile edit (first and last name) and the printer buttons: not opened. |
| B14 Add printer ("Other (ESC/PO…", permission dead end) | **could not see** | none | The printer wizard was not opened (time). |
| C1 Counters change while pages load | **fixed (by decision)** | 02, 22, 91 | "N+" while more pages remain, "99+" above 99, same value in the pill and in the bar badge. The first value is the loaded part ("21+") and grows: that is the call in `decisions.md`. |
| C2 Chat system lines raw text | **fixed** | 96, 98 | Short grey pills: "Order status accepted by restaurant · 09:57 PM", "Preparation time changed to 30 min · 10:07 PM", "Order ready · 10:48 PM". |
| C3 Search keyboard / action bar | **partly** | 24, 25, 26, 16, 17 | The "Clear / Show orders" bar now rides on the keyboard with no white gap (26). After closing the keyboard the sheets and bar took 3 to 6 s to come back to their place (host overloaded, so not conclusive). |
| C4 Late orders never coloured | **fixed** | 94 | In "Ready for pickup" #3460 is a red card with a red clock, #3458 a yellow card (at risk). See new finding B3 for a green "Late" clock. |
| C5 Notifications sheet: "Not now" black; delay | **could not see** | none | Needs a revoked permission and a restart; not done. |
| C6 Sessions "Current" chip | **could not see** | 116 | The Sessions screen only showed its skeleton for more than a minute in my screenshots; the frame dump of 11:09 listed `session-current` and cards but I did not capture the loaded screen. |
| C7 Login logo tile; "Spanish" over English texts | **fixed** (language) | `131-login.png` | The language button reads "English". The logo is still the icon tile (placeholder), unchanged. |
| C8 Unsaved-changes dialog titled "Ordering" | **fixed** (the log-out dialog) | 130 | Title "Log out?" with its own sentence. The unsaved-changes dialog itself was not opened. |
| C9 Printers card wrapping | **could not see** | none | Printers not opened. |
| C10 Stores: Back goes to the Orders tab | **unchanged, same as before** | n/a | Back from the Stores root goes to the Orders tab; from the Orders root it leaves the app. Menu search: Back hides the keyboard, then closes the search, then the Menu goes back to Stores. |

Count of the 16 classes A and B: **8 fixed, 3 partly, 1 not fixed, 4 could not see**. Class C (10): 5 fixed, 1 partly, 1 unchanged by design, 3 could not see.

## 2. What the first pass did not see, and now can be reached

| Item | Seen | Shots |
|---|---|---|
| SheetDriver (assign driver) | yes: header "Assign driver", two drivers ("Driver D.", "Driver QA i.", each "Available · 3 active orders", radio), footer button; picking one turns the footer into "Assign Driver D.". I did **not** confirm the assignment (the permission system refused that tap, and assigning is not in the list of actions I may do). Empty list: not seen | 35, 36 |
| OrderDelivery with the driver on the way | yes: status chip "Driver on way", driver card (photo, call, message), mini map block, "Track on map", customer card, notice "The driver completes this order. We'll let you know when it's delivered." | 45 |
| Mini map in the delivery details | yes, but empty: the beige block with the Google logo, no tiles and no pins (no Maps key / network on the emulator) | 45 |
| "Ready for pickup" and "With driver" groups of In progress | yes: small uppercase headings "PREPARING · 25+", "WITH DRIVER · 4+", the red and yellow late cards | 22, 93, 94 |
| MenuUnavailable | yes: "Unavailable 1" chip, the Blouse row with its switch off and "Laundry · until you turn it on", button "Make all available"; after switching it on: "All products are available" and the toast "Enabled product" | 104 to 107 |
| Orders search (full filter form) | yes: Date, Order type, Status, **SLA** (now "SLA", no apostrophe), Store, Driver, Payment method, "Clear" and "Show orders" | 24, 26 |
| Messages list, Chat, a sent message | yes | 95 to 98 |
| Pause sheet, Stores | yes | 99 to 102 |
| History tab | yes | 138 |
| OrderReadyPickup, "Not picked up" and its confirmation | **not seen** (see check list) | none |
| OrderError, OrdersEmpty, LoginCode, ProductOptions with groups, "Pending sync", Forgot "sent" state, Printers family, Review, MapTracking, SheetConnection, NewOrderAlert with Accept | **not seen** in this pass | none |
| Pull to refresh | not exercised as a gesture | none |

## 3. The checks of point 3

| Check | Result | Notes |
|---|---|---|
| No time or date reads "invalid format" | **ok** (sessions not seen) | Accept sheet 05, 12; adjust sheet 33; card 31; details 32, 34, 45, 125; chat 96, 98; history 138; messages 95; pause 100, 102; ticket 128. Sessions: not seen loaded. |
| Adjust-time sheet usable to the end on an order in preparation | **ok** | 33, 34: +10 min, "Update time", the details show the new promised time and the progress bar. |
| Assign-driver sheet from an accepted delivery order | **ok up to the choice** | 35, 36 (not confirmed, empty list not seen). |
| "Not picked up" asks for confirmation | **not seen** | My two accepted orders are both Delivery; the ready orders in the list are all Delivery; marking a second (pickup) order ready was outside my allowance. |
| Hundreds of orders: scroll to the end of what loads, next page, taps, CPU at rest | **ok** (partly measured) | See A1 above. |
| After my own action the card moves without a restart | **ok** | Accept: the card left New and In progress went 43+ → 44+ → 45+ (04 to 10). Mark ready: the card in the search result became "Ready for pickup" under "In progress" at once (91). |
| Keyboard rule on screens and sheets with a field | **ok** | Reject note (15: field and red "Reject order" above the keyboard, sheet pushed to the top); chat composer (97: input and send button above the keyboard, the list shortened); orders search (26: bar rides on the keyboard); menu search (105); login (132: Log in visible above the keyboard). Closing the keyboard restores the layout (16, 17-t3) after a few seconds under load. |
| Tab bar present right after signing in | **ok** | 137: bar and badges, the pill says "Live". |
| Ticket preview: paper width and text | **ok** | 128, 129 (B10). |
| Mini map | **partly** | 45 (block without tiles). |
| Notifications and sound: Bell, Chime, Kitchen alarm; preview; test alert | **ok, by the audio service only** | 113: three radios, "A notification that arrives while the app is in the background plays the Bell.". Choosing Chime then Kitchen alarm: `dumpsys audio` shows a `MediaPlayer` of the app in state `started` each time; "Send a test alert" opens the alert sheet (115) and a player is `started` until the sheet is closed (state `stopped`). I cannot hear the emulator, so which sound played is not verified. Left on Bell. |
| Group headings are small uppercase labels | **ok** | "ACCOUNT / THIS DEVICE / SUPPORT" (112), "SOUND" (113), "DATE / ORDER TYPE / STATUS / SLA" (24), "YESTERDAY" (138), "PREPARING · 25+" (22). |
| Text size two steps larger (1.3) | **ok** | Orders list 124 (nothing clipped, the tabs and the bar fit), details 125 ("Wine.." is the store name cut by the data), Profile 126. Back to `1.0`. |
| System back key on every screen and sheet passed | **ok, one doubt** | Accept sheet, alert sheet, assign sheet close first; details → list; chat: keyboard, then back; Menu search: keyboard, search, Menu → Stores; Stores root → Orders tab; Orders root leaves the app; the log-out dialog closes. **Doubt:** from Sessions, Back left the app in 2 of 3 tries (once while the list was loaded, 11:11; once about 11:15) and went back to Profile once (while the skeleton showed). See new finding B1. |
| App after one minute in the background | **ok** | HOME, 70 s, relaunch: the same ticket preview screen came back (129). |
| Sign out and in once | **ok** | "Log out?" dialog (130), the login screen (English), signed in again, the orders list and the tab bar come back (137). |

## 4. New findings

### Class A

None seen in the app. (The ANR, the red screen and the reloads came from the shared environment, section "What went wrong".)

### Class B

**ANDROID2-B1. Back from "Sessions" can leave the app instead of going to Profile.** Reproduce: Profile → Sessions, wait for the list, press the system Back key. Seen 2 times out of 3 (screenshots 116 is the skeleton just before; the focus after the key was the launcher: `mCurrentFocus=...NexusLauncherActivity`). The third time (skeleton still showing) it went back to Profile, 10 s later. Not understood; overloaded host may play a part. Guess: `src/navigators/routes/` for the Sessions screen, or a `BackHandler` in `src/ui/src/components/Sessions/`.

**ANDROID2-B2. Taps are dropped for the first minute or two after the app is launched from the launcher.** The list is drawn and the tab bar shows, but a tap on the Stores tab (about 11:03, 90 s after a launch) and the first taps after the 11:18 relaunch did not answer; the same taps worked a few minutes later. At 21:55 and 22:47 the first taps worked. Debug build behind Metro, overloaded host, so it may be the bundle and the first JS render; it feels like the first-pass A1 in a milder form. Guess: first hydration of the orders, messages and websocket providers (`src/BusinessApp.tsx`, `RootNavigator`).

**ANDROID2-B3. A late accepted order shows "Late 07:21" with a green clock.** Screenshot 67: order #3449, accepted with 20 minutes, promised time passed, the card says "Late" in the success green. The decision says green is for "success while preparing in time"; a late one should read as at risk or delayed. Guess: `src/ui/src/components/OrderDetails/orderTimes.ts` (the colour of the elapsed time) and `PreviousOrders/OrderCard.tsx`.

### Class C

- **ANDROID2-C1.** Assign-driver sheet with no driver assigned and nothing chosen: the (disabled) footer button reads "Unassign driver" (35). It should read "Assign driver" until a driver is chosen. Guess: `OrderActions/AssignDriverSheet.tsx`.
- **ANDROID2-C2.** Messages row with a long status chip (#3457 "Delivery completed by driver"): the unread badge drops to a third line at the far left under the meta (95). Guess: `MessagesOption/MessageRow`.
- **ANDROID2-C3.** Order details, product line (3 × Pink Lemonade): the check box sits lower than the quantity and the name (32). Guess: `OrderDetails/ProductsCard`.
- **ANDROID2-C4.** "View" in the menu's yellow notice opens the search with the "Unavailable" chip already selected, but the list shows every product for about a second before it filters (105 → 106). Guess: `BusinessProductList` search state.
- **ANDROID2-C5.** Ticket text: lines longer than 37 characters break into one-letter lines ("M", ")" and a lone ","), 128. It is the printed ticket's own text, not themed; report to whoever owns `ticketText`.
- **ANDROID2-C6.** The first-pass **B11** tab bar height and the missing **category switch** (B13) are still open (section 1).

## 5. What I changed in the local data

| What | State now |
|---|---|
| Order **#3449** (Delivery, LuisS Mercado): accepted with 20 min, time adjusted +10 (promised 10:27 PM), marked ready, one chat message to the customer `Pass2_android_test` | **Ready for pickup**; the message was sent ("Sent to: Customer") |
| Order **#3448** (Delivery): accepted with 25 min | **Accepted by business** (in preparation) |
| Order **#3450** (Delivery): rejected, reason "Other", note `Android_pass2_t` | **Rejected**; cannot be undone |
| Assign driver on #3449: sheet opened, "Driver D." picked, **not confirmed** | No driver assigned |
| Store **Twirly Laundry** paused 30 minutes, then "Resume now" | Open again |
| Product **Blouse** (Twirly Laundry) switched off, then on again | Available |
| Alert sound: Chime, Kitchen alarm tried | **Bell** (as found) |
| System text size 1.3 | back to **1.0** |
| Signed out and in once | one more session in the list (not deleted) |

The orders picked were in the middle of the New list (#3450, #3449, #3448; the newest three #4467, #4466, #4465 and the oldest ones were not touched by me).

## 6. What I did not see

- **"Not picked up" and its confirmation**, a Ready pickup order (OrderReadyPickup): no pickup order was in my allowance; all ready orders in the list are Delivery.
- The assign-driver sheet's **empty state** and the confirmed assignment; the "unassign" path.
- Offline: the notice's second line (B6), Messages offline (B9), "Pending sync". Airplane mode was not used.
- **Sessions loaded screen** (the "Current" chip, C6, "Sign out" buttons): only the skeleton was captured.
- Printers, Add printer (the permission dead end, B14), Printer settings, Ticket settings, Printers card wrapping (C9).
- Order details of a **completed** order (B3 status row), the Review screen, the map screen ("Open in Maps"), the SheetConnection, the real NewOrderAlert with Accept, the Notifications permission sheet (C5), the unsaved-changes dialog, Personal information (first and last name).
- ProductOptions with option groups; the category switch (absent); Forgot "sent" state; LoginCode; OrdersEmpty; OrderError.
- Pull to refresh as a gesture; real sounds (I cannot hear the emulator); map tiles and the driver's position; the camera, photos and call hand-offs.
- Anything on a tablet or a physical phone. The socket stayed "Reconnecting" except right after signing in ("Live", 137).
