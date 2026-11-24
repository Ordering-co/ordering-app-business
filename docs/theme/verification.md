# Verification

Date: 2026-11-20, at commit `e70aa4a` · Branch `feature/theming-native`, schema `store_app` 1.0.0 (not published: publishing is the
workflow's, the release handover). This is the one record to open first: the automatic checks and their numbers, what
each device round saw, every finding still open, what was fixed in code but never seen on a device, what was never verified at all,
the Release builds, the state of the eight points of the skill's definition of done, and the incidents of the device work. The long
reports are in [verification/](verification/); this page says where each claim comes from. **No decision is pending with the owner:**
the one question the rounds opened (OQ-02, the tabs with a filter on) was answered on 2026-11-20 (section 7, [decisions.md](decisions.md)).

Ground rule of this page: a line says only what a report or a command proves. A thing nobody saw on a device is written "not seen"
or "not verified", never as done. Where two reports disagree, both are named (section 7). Every device so far is a **simulator or
an emulator** running a Debug build against a local API, except the first two Release builds of section 5, which are also a simulator and
an emulator; final Release builds at the code of `e70aa4a` were built, installed and opened on the Android phone emulator and the iPhone simulator (section 5). No physical phone, tablet or printer has been used.

How to read the ids: `IOS-` is the iPhone simulator's first pass, `IPAD-` the iPad's, `TAB-` the Android tablet's, `ANDROID-` the Android phone's first pass; a `2` after the prefix (`IOS2-`, `IPAD2-`, `TAB2-`, `ANDROID2-`) is that device's second
pass; `IOS3-` is the iPhone's third pass; `T3-` is the third look on both tablets. `B-1`... and `C-1`... are the numbers an earlier version of this page gave to what
fix round 2 found. A letter is the class: A = a crash, a red screen or a flow that cannot finish; B = a visible defect that blocks
nothing; C = a detail.

## 1. Automatic checks

Run by the coordinator at commit `e70aa4a` (2026-11-20, 08:12), the last commit of fix round 6. Each command is the one
`.github/workflows/ci.yml` runs, except where said.

| Check | Command | Result | Starting count (`decisions.md`, `main` at `d055960`) |
|---|---|---|---|
| Schema valid | `pnpm theme:validate` | `product.schema.json 1.0.0 is valid` | no schema |
| Compiled file up to date | `pnpm theme:verify` | `src/theme.compiled.json is up to date` | none |
| No design literal, every category | `pnpm theme:guard` | `ok: 0 literals`; the recorded exceptions are the 8 entries of `theme-exceptions.json`; the command passes no baseline | 2 428 literals in 126 files |
| Every schema key has a reader | `pnpm theme:keys` | every key has a reader; 19 are read through a variable and recorded in `theme-readers.json` | none |
| Every read names something the theme has | `pnpm theme:reads` (since 2026-11-23) | ok: 816 reads in 373 files. Its first run found two visibility keys the schema never had (`orders.timer`, `orders.customer_name`: both decided not to be keys, their reads removed) and two image keys the schema does not have (`placeholder.business_logo`, `placeholder.customer`: reads and the unused bundled picture removed) | none |
| The editor's labels against the Dashboard's catalog | `pnpm theme:labels --catalog <ordering-dashboard>/i18n/translations.json` | no key with another English text (fifteen were found and settled on 2026-11-23); 212 keys to add in the Dashboard (after the Profile of 2026-11-23) | none |
| Extreme themes, resolved as the API serves them | `pnpm theme:extremes` | ok (the earlier run of this page counted 19 of 19: square, pill, light primary, dark surfaces, no shadows, larger text, tablet column, tablet bar not rail, tablet without board, the ten fonts) | none |
| Types | `npx tsc --noEmit` | 0 errors | 0 errors |
| Lint | `pnpm lint:check` | **0 errors, 76 warnings, run by the coordinator** (the earlier version of this page could only quote a fix agent's figure). The warnings are the legacy ones (hook dependency lists, shadowing); an earlier run counted 75 | clean |
| Tests | `npx jest --silent` | **221 suites, 2 492 tests, all passing.** Coverage was not re-run: the last measured figures are from the version of this page of 2026-11-19, at 203 suites (statements 94.04 %, branches 83.56 %, functions 92.34 %, lines 95.30 %, the CI gate 91.31 % against a threshold of 70 %) | 138 suites, 713 tests |
| Translations: catalog complete | `pnpm i18n:verify` | ok. The earlier run counted 995 keys, source `en`, 11 locales (es, fr, it, de, pt, da, nl, ar, el, bg, tr) all filled; the 11 locales are machine translation read by no native speaker, and the keys added by fix round 3 (`STATUS_*`) are machine translation too | not run |
| Translations: catalog matches the code scan | `pnpm i18n:check-generated` | ok | not run |
| Printing and native files untouched | `git status --short -- src/printing android ios`, and `git diff --stat da4aebd..HEAD -- src/printing android ios package.json pnpm-lock.yaml pnpm-workspace.yaml patches` | nothing, and the diff prints nothing: no commit since `da4aebd` touches `src/printing`, `android/`, `ios/`, `package.json`, the lockfile or the patches (the last commit on `src/printing` is `75f780c`) | n/a |
| Release bundles build | the CI step (`react-native bundle`, both platforms) | **the CI step was not run.** The final Release builds (section 5, code of `e70aa4a`) each built their Hermes bytecode bundle locally: 7,240,240 B on Android, 8,916,513 B on iOS, inside the apps that were installed and opened ([../deps/release-builds.md](../deps/release-builds.md), first section) | built locally, not in CI |
| Runtime dependencies | `package.json` | 46 (and 24 dev), counted at `98ef5e1`; `package.json` and the lockfile have not changed since | 73 |
| Publish dry run | `pnpm theme:publish:dry --required` | **not run**: it needs the `THEME_PUBLISH_KEY_PRODUCTION` secret, which only CI can hold; in CI it fails by design until the secret exists. Never run by hand | none |
| The workflows | `{ci,theme-publish,i18n-sync}.yml`, **parked in `.github/workflows-disabled/` on 2026-11-20** (the owner's instruction: no Actions for now) | parsed on 2026-11-19 and unchanged since, only moved. **Nobody has run them on GitHub, and nothing runs there while they are parked** | the original CI had no theme steps |

Notes:

- One test (`LoginForm › … error-email … waitFor`) failed once under load on the run of 2026-11-19 at `f3e31ef` and passed twice.
  Watch it in CI.
- The lint warnings stay until the screens they sit in are touched: fixing a hook dependency list changes behavior.

## 2. The device rounds

Every cell is from the report named in the second column. "Seen" counts are the report's own (the denominator is the canvas's 47
screens, `design/redesign/canvas.json`, or the phone's 46). Where a report gives no count, the cell says "not counted in the report".
All dates are 2026-11-19 unless said. Times are the device's or the commit's; a report that gave none says so.

| Device | Round and report | When | Screens seen / partly / not seen | Findings of the round and verdicts, as the report gives them |
|---|---|---|---|---|
| iPhone 17 Pro simulator, iOS 27.2, Debug | First pass: [ios.md](verification/ios.md) | 18:50 to 19:30 | 36 / 7 / 4 of 47 (not seen: OrdersEmpty, OrderError, SheetDriver, TabletBoard) | 3 class A, 17 B, 17 C |
| none (code only) | Fix round 1: no report. The commits from `75f780c` (21:16) to the merge `d8a13a9` (21:47) and the harmony commits to `d6dc2ef` (22:10) | 21:16 to 22:10 | n/a | Not counted in a report: it fixed the first passes' findings (virtualized lists, one clock per card, the list updated by the app's own actions, the time formats, one keyboard rule, the tab bar after sign-in, the ticket's paper, the harmony review). The second passes below are its verification |
| iPhone 17 Pro simulator | Second pass: [ios-pass2.md](verification/ios-pass2.md) | 21:53 to 22:08 | not counted in the report | Of the 20 class A and B of the first pass: 10 fixed, 4 partly, 0 not fixed, 6 could not be seen. New: 0 A, 2 B (IOS2-B1 mini map clips the pins, IOS2-B2 a filtered list stays stale after an action from the details), 6 C |
| iPhone 17 Pro simulator | Fix round 2 verification: [fix-round2.md](verification/fix-round2.md) | commit `23713a7`, 22:53 | not counted in the report. First seen: a ready pickup and its hand-off card, "Not picked up" with its confirmation, Review with the keyboard, the ended chat, the printer wizard step 2, the ticket settings, the full map with a driver | 17 numbered items plus the class C of the second pass; the items fixed and seen are closed; the tablet items were fixed in code only. New: 1 B (B-1, Messages stale), 4 C (C-1 to C-4). The report gives no total of fixed and not fixed |
| iPhone 17 Pro simulator | Fix round 3: [fix-round3.md](verification/fix-round3.md) | commit `7aaed6d`, 23:14 | not counted in the report | 7 items, each with a verdict and no total: items 1 to 5 fixed (Messages stale, the filtered list's stale card, the Subtotal row, the search button past the gutter, one status wording), item 6 not a defect, item 7 a test only. New: 0 A, 0 B, 1 C (the unread count under a long status chip) |
| Android phone emulator `OBizTest`, 1080 x 2400, Android 17, Debug | First pass: [android.md](verification/android.md) | 18:52 to 20:50 | 35 / 7 / 4 of 46 (not seen: LoginCode, OrdersEmpty, OrderError, SheetDriver) | 2 class A, 14 B, 10 C |
| iPad Pro 11-inch (M5) simulator, iOS 27.2, Debug | First pass, portrait only: [ipad.md](verification/ipad.md) | not given | 40 seen in portrait / 0 / 12 not seen | 0 A, 4 B, 11 C |
| Android tablet emulator `OBizTablet`, 1280 x 800 dp, Android 17, Debug | First pass: [tablet-android.md](verification/tablet-android.md) (incomplete: the app was nearly unusable, TAB-A1) | not given | 10 / 3 / about 34 of 47 | 3 A, 4 B, 10 C |
| Android tablet emulator `OBizTablet` | Second pass: [tablet-android-pass2.md](verification/tablet-android-pass2.md) | not given | not counted in the report. First seen: Stores with the menu pane, product options, pause, Printers with two panes and the wizard, History over the board, search, store filter, the dialogs, Sessions, Personal information, Password, Language, portrait | TAB-A1 to A3 and B2, B3 confirmed fixed. New: 0 A, 2 B (TAB2-B1 fixed and seen, TAB2-B2 fixed in Jest only), 6 C |
| iPad Pro simulator | Second pass, portrait and landscape: [ipad-pass2.md](verification/ipad-pass2.md) | not given | not counted in the report. Landscape seen for the first time on every screen that has it (rail, board, details panel, centred dialogs, Messages, Stores, Printers) | Of the 14 of the first pass: 9 fixed, 2 partly, 3 not fixed (one is data, one is the API, one is a mockup question), 1 decided. New: 0 A, 3 B (IPAD2-B1 the login's button under the keyboard in landscape, IPAD2-B2 raw log lines as chat pills, IPAD2-B3 a full page upside down), 4 C |
| Android phone `OBizTest` | Second pass: [android-pass2.md](verification/android-pass2.md) | 21:53 to 23:32, with incident 1 of section 8 | not counted in the report. First seen: assign driver (the list, not confirmed), a delivery with the driver on the way, the "Ready for pickup" and "With driver" groups, the unavailable-products menu, the full search form, Messages and Chat, the pause sheet, History | Of the 16 class A and B of the first pass: 8 fixed, 3 partly, 1 not fixed (B11, the tab bar height), 4 could not be seen. Of the 10 class C: 5 fixed, 1 partly, 1 unchanged by design, 3 could not be seen. New: 0 A, 3 B (ANDROID2-B1 Back from Sessions, ANDROID2-B2 taps dropped after a launch, ANDROID2-B3 a late order's clock drawn green), 6 C |
| iPad and Android tablet | Third look at what only Jest had shown: [tablets-pass3.md](verification/tablets-pass3.md) | commit `08b3292`, 23:17; times in the report not given | not counted in the report | 12 numbered items, several on both devices, no total: fixed and seen for the modal orientations, Printers and ticket preview with no printer, the full map's width, the tab bar, the connection pill, the board headings, the chat pills, the dialogs' scrim and the lists' end; **not fixed** for the login in landscape (item 1) and the card's clock against the panel's (item 6, one second apart); could not be seen for "Select a store" and the iPad's panel clock. New: 0 A (one unconfirmed render error, section 8), 1 B (T3-B1, the login), 5 C (T3-C1 to C5) |
| Android tablet and iPad | Fix round 4: [fix-round4.md](verification/fix-round4.md) | commit `894e643`, 23:42 | not counted in the report | T3-B1 fixed and seen on both tablets; of the small ones, T3-C1, T3-C2, T3-C3, T3-C4 and ANDROID2-B3 fixed and seen (each on the device its row names), T3-C5 not changed (a question for the owner). The report gives no total. No new finding; the hooks errors of the third look were read in the code and put down to Fast Refresh |
| Android phone `OBizTest` | Fix round 4 on the phone: [fix-round4-android.md](verification/fix-round4-android.md) | 2026-11-19 23:35 to 2026-11-20 00:41, commit `98ef5e1`, the host at a load of 19 | not counted in the report. First seen: Sessions loaded, Personal information with its "Discard?" dialog, Printers empty and the wizard's steps 1 and 2, the ticket preview, a completed order's details, a pickup order taken to "Not picked up", the connection sheet | B11 (tab bar) fixed and seen; ANDROID2-B1 not reproduced and partly fixed (the cost of opening Sessions); ANDROID2-B2 not an app defect (the Debug bundle on a loaded host); of the class C: the Messages badge, the assign footer fixed and seen, the check box already fixed, the Menu "View" fixed and seen in its end state only, the ticket preview not a defect; the chat composer fixed and **not seen**. New: 1 C (the wizard says Bluetooth for a Wi-Fi or LAN search) |
| Android phone `OBizTest` (Android 17, Debug) and iPhone 17 Pro simulator (Debug) | Fix round 5: [fix-round5.md](verification/fix-round5.md) | 2026-11-20, emulator clock 00:44 to 01:15; Sessions fix in commit `3d5d40e`; the host at a load of 16 to 17 | not counted in the report. First seen: Sessions after the virtualization (both devices); on the Android phone only: Add printer with a Star printer by IP and a generic one by address, Ticket settings of a saved generic printer, the ticket preview with two printers, the "Remove printer" dialog, the chat composer with the keyboard closed and open | Sessions with 100+ sessions: **fixed and seen** on the Android phone (tap to the list drawn 102.6 s down to 13.0 and 11.7 s, Back 49.3 s down to 4.6 s, Debug on a loaded host), **seen drawn and working, not measured** on the iPhone. The chat composer's bottom space (fix of `98ef5e1`): fixed and seen. The LAN search's Bluetooth permission: cause found in two places (Star: the frozen `src/printing/usePrinterCommands.tsx`; Epson: the library), nothing changed. Ticket settings: seen, with one new class B (the paper ends at line 14, so three switches never change it, fixed in round 6) and three class C (the "Store details" default, the dialog's two-line button and the card's line starting with a dot; the last two fixed in round 6). No total given |
| iPhone 17 Pro simulator, Debug | Third pass: [ios-pass3.md](verification/ios-pass3.md) | 2026-11-20, 07:36 to 07:56 on the simulator's clock; HEAD `26f67bd` at the start, `85d26fd` at the end | not counted in the report. Seen, among others: the filtered Orders list with its notice, Sessions loaded and scrolled to its end, the Menu's "View", Profile's language sheet, the Printers wizard's IP field, the connection sheet with a saved printer | Of the 18 rows of section 3.3 (as that section stood): **11 seen fixed, 0 seen not fixed, 7 cannot be seen on an iPhone**. Of the first-pass iPhone rows of section 3.4: IOS-C14, C15, C16, C17 fixed, IOS-C8 not fixed (fixed later in round 6), IOS-C3, C4, C5 could not be seen, C-4 partly (the report's own count line says "3 fixed", its table lists four: section 7). New: 0 A, 1 B (IOS3-B1), 3 C (IOS3-C1, C2, C3) |
| Android tablet `OBizTablet` and iPad Pro simulator | Fix round 6, the tablets: [fix-round6-tablets.md](verification/fix-round6-tablets.md) | 2026-11-20, no times in the report; commits `4c9e296`, `ee96704`, `d329aaf` | not counted in the report. First seen: the landscape board with a filter on (columns, notice, a card moving column, History with the filter), the filter across a rotation | T3-C5 **fixed and seen** on both tablets (the board keeps its columns with a filter, OQ-02 answered). New problem found and fixed in the same round: the filter was lost when a tablet turned: **fixed and seen on the iPad only**. T3-C2 (the grouped card's pickup pair): fixed in code, **tests only, not seen**. No new finding; two limits written down (section 3.2) |
| iPhone 17 Pro simulator, Debug | Fix round 6, the iPhone: [fix-round6-ios.md](verification/fix-round6-ios.md) | 2026-11-20, no times in the report; commits `18948d7`, `cbb17d2`, `2b2805d` | not counted in the report | IOS3-B1 (the keyboard hiding "Make all available" after "View"), IOS3-C2 (the Sessions row's height) and IOS-C8 (the language sheet in the languages' own names): **all three fixed and seen**. IOS3-C3 (the card's clock forms) unchanged: a decision (section 3.2) |
| Android phone `OBizTest` (Android 17, Debug) | Fix round 6, printers: [fix-round6-printers.md](verification/fix-round6-printers.md) | 2026-11-20, emulator clock 07:38 to 08:10; commits `aec3395`, `0eea8be`, `e4c92e2` | not counted in the report. First seen: Ticket settings with the window moving, the card and the dialog of a printer, airplane mode on the Orders list, the ended chat, the IP field's number pad. **The iPhone was not looked at by this round** | Ticket settings' paper (class B of round 5): **fixed and seen**. "Local network access is not permitted": **no change needed** (a Debug-build-only declaration, section 3.2 and [../deps/android-native.md](../deps/android-native.md) section 4). The "Remove printer" button on two lines and the card's line starting with a dot: fixed and seen. ANDROID-B6 (the offline notice's second line): **fixed and seen**. ANDROID-B8, first part (the ended chat's notice clipped): **fixed and seen**; second part (the reject sheet closing once): **not reproduced** (one try). IOS3-C1 (the IP field's keyboard): **fixed and seen on Android, not seen on iOS**. The commit `e70aa4a` makes the shared text field honour `keyboardType` as well as `type`, the trap that caused IOS3-C1 |
| Android tablet `OBizTablet` and iPhone 17 Pro simulator `OBizRelease`, **Release** builds | [../deps/release-builds.md](../deps/release-builds.md), first builds at `da4aebd` (the same file holds the final builds, section 5) | not given | Android: board, panel, "More" dialog, Messages, Stores with its menu, Profile, portrait. iOS: login, orders, details, sheet, Messages, Stores, menu, Profile, Alerts and sound, test alert, Printers, wizard steps 1 and 2. No order was changed | no crash, no ANR; the findings are configuration (section 5) |

**Never seen on any device, in any state** (the union of the "did not see" lists of all reports): OrdersEmpty (the account always
has pending orders); OrderError (no way to make a status change fail); the new-order alert with real orders and its Accept rows
(only the "Send a test alert" version: the local stack delivers no socket events); printers found by discovery (nothing exists on
the local network of a simulator); a successful test print and a printed ticket; the "link sent" state of Forgot password; the
connection sheet in its "Live" state with a printer row; "Pending sync" on a card and a queued action replayed (the Android phone's
Orders list was seen offline, in airplane mode, in fix round 6, but without queued actions); sounds and vibration (nobody has heard
or felt either); push in any state; map tiles (blank without a key); an iPhone turned sideways (no tool turns the simulator's
phone); a served theme (a theme that is not the build's defaults); a Release build started offline; the "no results at all" state of
the landscape board with a filter on; the grouped order card's pickup pair; a comma-locale keyboard on the printer wizard's IP field;
a real printer of any kind, LAN, Bluetooth or USB, and the Android 17 local-network permission asked of an app that targets
Android 17 (the app targets 36).

**Seen on one platform only:** Ticket settings (the paper's window moving with the switches), the IP field's number pad, the
"Remove printer" dialog's one-word button, the printer card's line break and the offline notice's second line were seen on the
Android phone only; the language sheet in the languages' own names, the Sessions row at 64 and the Menu's "View" without the keyboard
on the iPhone only; the filter kept across a rotation on the iPad only; Sessions' timings on the Android phone only (the iPhone's list
was seen, not measured). The Review customer page with the keyboard open and the printer wizard's step 2 with the keyboard
are seen on the iPhone simulator and the iPad only; the full map with a driver on the way was seen on the iPhone simulator, the iPad
and the Android tablet (tiles blank everywhere: no key). A ready pickup order and "Not picked up" with its confirmation were seen on
the iPhone simulator (fix round 2) and on the Android phone (fix round 4); the Android tablet never saw them.

## 3. Findings still open

**Open after the last round (commit `e70aa4a`): class A 0, class B 2, class C 18 rows** (the C row of the harmony leftovers holds
nine small items; the open rows are one line each, so the count of rows is not a count of defects). **Fixed in code and not seen on a
device: 16 rows** (section 3.3). Each row says where it is recorded and why it is left. A finding fixed in a later round is not in
3.2: it is in section 3.3 if no device showed it after the fix, and in the list under 3.3 if one did.

**Closed since the previous version of this page** (each by the report named): T3-C5 (the landscape board with a filter on, fixed and
seen on both tablets, [fix-round6-tablets.md](verification/fix-round6-tablets.md)); the Sessions rows (the virtualized list, fixed and
seen on the Android phone, seen on the iPhone, [fix-round5.md](verification/fix-round5.md)); ANDROID-B6 (the offline notice's second
line) and the first part of ANDROID-B8 (the ended chat's notice), fixed and seen on the Android phone,
[fix-round6-printers.md](verification/fix-round6-printers.md); IOS-C8 (the language sheet), IOS3-B1 and IOS3-C2, fixed and seen on the
iPhone, [fix-round6-ios.md](verification/fix-round6-ios.md); the printer screens' class C items (the dialog's button, the card's line
break) and the Ticket settings' preview, fixed and seen on the Android phone; the printer wizard's IP field keyboard (IOS3-C1), fixed
and seen on the Android phone only.

### 3.1 Class A

None open. The eight A findings of the first passes are closed: IOS-A1 and IOS-A2 ("invalid format" in the accept and adjust
sheets), IOS-A3 (no tab bar after sign-in) and TAB-A3 were seen fixed in the second passes; TAB-A1 (idle CPU) and TAB-A2 (rotation)
were seen fixed in the second Android tablet pass; ANDROID-A1 (the orders list freezes the app) and ANDROID-A2 ("invalid format")
were seen fixed on the Android phone in its second pass ([android-pass2.md](verification/android-pass2.md), A1 and A2).

### 3.2 Class B and C open

| Id | Class | What is wrong, where, and why it is left | Where it is recorded |
|---|---|---|---|
| B-3 (IOS-B10, ANDROID2-C5) | B (frozen code, not changed) | The printed ticket's text writes a product name and its price with no space when they fill the width ("COFFEE$ 5,00"), and an address line is one or two columns longer than the paper (the label's length is taken without its ": "), so a line breaks into one-letter lines ("M", ")", a lone ","). The code is the frozen print path and its golden output (`src/printing/utils.tsx`, `legacyTicket.test.tsx`), left by the owner's decision; the preview now breaks at the last column as a printer does. Generic ESC/POS does not have either | [fix-round2.md](verification/fix-round2.md) item 5; [ios-pass2.md](verification/ios-pass2.md); [android-pass2.md](verification/android-pass2.md) C5 |
| ANDROID-B8, second part | B, no verdict | Once, on the Android phone, "Reject order" with the keyboard up closed the sheet without rejecting. **Not reproduced:** the second pass rejected on its first try, and fix round 6 repeated the same steps once more (Orders, Reject on #4194, "Other", a note typed, keyboard up, "Reject order") and the order was rejected at once. Two single tries do not close it. (The first part of the same finding, the ended chat's clipped notice, is fixed and seen: closed above) | [android.md](verification/android.md) B8; [android-pass2.md](verification/android-pass2.md); [fix-round6-printers.md](verification/fix-round6-printers.md) section 5 |
| (no id) the LAN printer search asks for the Bluetooth permission first | C, cause found, left | On Android 12 and later, choosing "Wi-Fi or LAN" and "Find printers" shows "Bluetooth permission is required to find printers… Open settings" although the search is not Bluetooth; the way out (the "Enter the IP address instead" link) exists. The cause is in two places. **Star:** the frozen `src/printing/usePrinterCommands.tsx`, `discoveryPrinterPort`, asks for the Bluetooth permission when `interfaceType == Bluetooth` **or** `settings.autoSwitchInterface == true`, and the Star library defaults that to `true`, so a LAN search asks too; the print path (`printTicket`) has the same condition, so a LAN Star printer may not print on Android 12+ without Nearby devices either (read in the code, not seen with a printer). The owner decided to leave the frozen print path, Star over LAN included, as it is ([decisions.md](decisions.md)). **Epson:** not in a frozen file but in the library (`react-native-esc-pos-printer` 4.6.0-rc.0, `PrintersDiscovery.start` calls `requestAndroidPermissions()` for every port type, Bluetooth permissions on API 31+); the only fix is a patch of the library (skip the call for `PORTTYPE_TCP` and USB). **That patch is proposed and not made:** fix round 5 was not to patch a library, and no printer was there to check it (whether Epson's own native LAN discovery needs the permission on API 31+ is not known). Bluetooth searches keep asking, as they should | [fix-round5.md](verification/fix-round5.md) section 2; [fix-round6-printers.md](verification/fix-round6-printers.md) section 4 |
| C-6 | closed: removed | **The app shows no number of orders since 2026-11-23** (the owner's decision: the exact totals needed a request per stage and, to stay true for orders outside the loaded pages, a re-read on every order event, "almost polling"). The tabs, the stage chips, the section titles, the board's columns and the Orders tab wear no count; `useOrderTotals` and its `page_size=1` requests are gone; the Messages unread count stays. Before: exact totals per stage (the owner's review, round 2) | [decisions.md](decisions.md); [owner-review2.md](verification/owner-review2.md) |
| C-10 (TAB-C9) | C (decided, left) | On an Android tablet a white band sits under the board and the rail: `MainActivity.kt` pads the content by the system bars' bottom inset (64 px over a stashed taskbar). The native change (pad by the tappable inset only; every screen must then keep room at its end) is the owner's to ask for; left. Fix round 4's phone report says the same file is right for a phone | [tablet-android-pass2.md](verification/tablet-android-pass2.md) "The native change asked for"; [decisions.md](decisions.md), the row "The band under the board" |
| (no id) the board's columns have no pull to refresh | C, new | On a landscape tablet the board's columns cannot be pulled to refresh, with a filter on or without one; the phone's list can. Limit written down by fix round 6 | [fix-round6-tablets.md](verification/fix-round6-tablets.md) "Limits to know" |
| (no id) a filter whose matches are all closed orders | C, new | On the landscape board, a filter or search whose matches are all closed orders shows three empty columns until History is opened; the phone opens its History tab by itself, the board has no tab to open. Left | [fix-round6-tablets.md](verification/fix-round6-tablets.md) "Limits to know" |
| (no id) the language sheet and a screen reader | C, new | The rows now carry each language's own name ("Español"); the sheet's rows are the shared select's (`OSelect`), which has no accessibility label of its own, so a screen reader says the native name only, not the English second part ("Spanish") that the login link's label has. Needs an `accessibilityLabel` on the shared select's option. Nobody has used a screen reader on the app | [fix-round6-ios.md](verification/fix-round6-ios.md) "Not done" |
| (no id) the language's regional qualifier | C, new | A variant keeps the server's English qualifier after the native base name, as the server writes it: "Español (Mexico)", "Español (La - Guatemala)". The list itself is the server's 25 rows in the server's order, where the mockup draws five | [fix-round6-ios.md](verification/fix-round6-ios.md); [ios-pass3.md](verification/ios-pass3.md) IOS-C8 |
| (no id) confirm dialogs' narrow buttons | C, not mine (proposal) | `shared/ConfirmDialogHost.tsx` puts Cancel and the accept button in one row of two equal buttons in a box of at most the `sm` modal width, so a label of about 14 characters has about 120 dp and wraps. Round 6 shortened the one that was seen ("Remove printer" to "Remove"); **other long accept labels in the app hit the same width**. Proposal: stack the buttons when a label does not fit | [fix-round6-printers.md](verification/fix-round6-printers.md) section 3 |
| (no id) Ticket settings: "Store details" is on | C | The mockup (`TicketSettings.dc.html`) draws "Store details" off; the app shows it on (the stored default, a sample). Not fixed | [fix-round5.md](verification/fix-round5.md) section 3 |
| C-4 | C, partly | The printers' empty hint is a text node 382 wide from x 10 on an iPhone, past the page gutter. The third iPhone pass saw the node unchanged, but the text is centered and starts at about x 25 pt, inside the gutter of 20: partly. The Android phone's empty Printers screen was seen without a remark on it | [fix-round2.md](verification/fix-round2.md), "New findings" (screenshot 33); [ios-pass3.md](verification/ios-pass3.md) check 2 |
| C-5 (TAB2-C4) | C | Turning a tablet to portrait with an order open in the board's panel drops the order (the board does not exist in portrait); it could open as the details screen. Not touched. (The filter, by contrast, is now kept across a rotation: section 3.3) | [tablet-android-pass2.md](verification/tablet-android-pass2.md) |
| C-8 | C | Amounts print in the server's currency format ("$ 33,93"); the mockup draws "$32.37" | [ios-pass2.md](verification/ios-pass2.md) C6 |
| C-9 (IPAD-C11) | C | The second "Save Password?" system sheet (over the Forgot page) was not rechecked after the first one was seen at the right moment | [ipad-pass2.md](verification/ipad-pass2.md) |
| (IOS-C1, ANDROID-C7) | C | The login's logo is a 44 x 44 store tile where the mockup draws a 180 x 44 placeholder box; unchanged in every pass, and no decision records it | [ios.md](verification/ios.md); [android-pass2.md](verification/android-pass2.md) |
| (T3-C2) | C, fixed in code, **not seen** | The pickup pair "Not picked up" / "Picked up" (and the reservation's pair) in the **grouped** order card is now as wide as its labels, as the single card's was fixed in round 4 (`d329aaf`). **Tests only: the local data has no cart group at the pickup step, so no device showed the grouped card.** Also in section 3.3 | [fix-round6-tablets.md](verification/fix-round6-tablets.md) section 3 |
| (IOS3-C1, the tail) | C, fixed in code, **partly seen** | The printer wizard's IP address field: fixed and seen on the Android phone (a number pad with a dot and a comma, "192.168.1.40" kept whole). **Not seen on iOS** (the layout name `numbers-and-punctuation` is the documented React Native value) and **not seen with a comma-locale Android keyboard** (the emulator's locale is English; the field turns every comma of a LAN address into a dot). Also in section 3.3 | [fix-round6-printers.md](verification/fix-round6-printers.md) section 6 |
| C-11 | C | The harmony record's items left on purpose or not reached: H11 (`ChoiceTile` and `FilterChip` still force one line), H12 ("Open in Maps", "Print test" / "Test print" wording), H20 (the hand-off card's name is `h4`), H21 (the driver initials disc is 40, the mockups disagree with 44), H22 (the lead text's size in the accept and reject blocks), H23 (the profile's save error is a toast), H24 (a title 1 to 2 pt left), H25 (the disabled tonal "Print test" on the muted card), H26 (`HoldToConfirm`, `OFab`, `OAlertOriginal` are exported and unused). H7 (the Orders tab pill) was on this list and is **done**: [harmony.md](harmony.md) | [harmony.md](harmony.md), "Round 1: what was done" |
| REL2-C1 (iOS status bar) | C, new, not looked into | The iPhone's final Release build logs `-[UIApplication statusBarStyle] API has been deprecated and is a no-op on 27.0 and later` about 240 times in 12 minutes, once per status-bar update of React Native's `StatusBar`. Nothing looked wrong on screen (dark icons on the light default theme). Not checked: whether a theme with a dark header still gets light status-bar icons on iOS 27 (`ThemedStatusBar` in `src/theme/`), and whether the calls can be fewer | [../deps/release-builds.md](../deps/release-builds.md), first section, "Device log" |

**Closed by the final Release builds (`e70aa4a`, 2026-11-20), so no longer in the table above.** Both rows had stayed open only because
no Release measurement existed. Measured on the Android phone emulator `emulator-5556` with the Release app, host at a load of 7 to 12
([../deps/release-builds.md](../deps/release-builds.md), first section, "Measurements, side by side"):

- **ANDROID2-B1 (Back from Sessions leaving the app): not reproduced.** Sessions (100+ rows) was drawn at most 3.5 s after the tap
  (3.5, 3.3, 3.6 s; Debug 11.7 to 13.0 s after the virtualized list, 102.6 s before it). Back pressed 1.1 to 1.4 s after the tap, three
  times: Profile every time, seen 2.8 to 3.1 s after the press (a 2.7 s screen dump is inside that figure), none left the app. On the
  iPhone's Release build the list was drawn in the first screenshot after the tap (0.3 to 0.8 s), three of three.
- **ANDROID2-B2 (taps dropped after a launch): not reproduced.** Five cold launches, a tap on Stores sent 0.4 to 0.8 s after the list
  was first seen: no tap lost, Stores drawn with its data 3.5 to 4.3 s after the tap (the stores request is inside that). Cold start to
  the orders list: 5.7, 4.2 and 6.7 s (Debug: 114 s).

The limit of both: an emulator on a host other sessions were loading, never a physical phone (section 4). The same round counted
96 to 98 % janky frames while scrolling the list, with every frame "slow issue draw commands" and the JavaScript thread at 16 %: that is
the emulated GPU of this AVD, and **the frame rate on a real phone is not known**.

Decided or not a defect, so not counted: the tab bar's tabs in the content's column over a full-width bar (decision); the count
badge overlapping the tab icon's corner (the mockup draws it at `top: 5; left: 55` in a 64 x 97.5 tab); the history cards' solid
status chips (the mockup and harmony H9); the Review comment box without a placeholder (the mockup draws it blank); "1 used by this
product" over two option groups with the same name (the local data); sessions without a device name (the API gives none: BACKEND B5;
this is also why a Sessions row reads "Started 19/11/2026 11:30 PM" where the mockup has a device name); the "Category on" switch not
drawn on menu category headings (capability rule OQ-10, decided); the chat's row of quick replies
absent (the quick-message keys keep an empty English; the chat shows only the messages a project has written); the detail panel
overlaying the board on a tablet (decided); the tabs of the orders list no longer being equal widths, so no label shrinks (a call of
fix round 2); the assign-driver list empty for a store that belongs to no driver group (the data,
[fix-round2.md](verification/fix-round2.md) item 7); #4468 missing from the board (another session had rejected it); "Show orders"
without a count (needs a request per filter change that the controller does not offer; by the owner's rule it is not drawn);
**the card's "Waiting" clock written in two forms** (IOS3-C3: "Waiting 00:12" under an hour, "Waiting 12h 32m" from an hour): the
iPhone's third pass reported it as a class C and [fix-round6-ios.md](verification/fix-round6-ios.md) calls it "a logged decision,
unchanged"; the decision is the row "An order's elapsed time" of [decisions.md](decisions.md) (`mm:ss` under an hour, "3h 12m" from
an hour, "2d 5h" from a day); **"Local network access is not permitted" in a Debug build on an Android 17 device** (below).

**"Local network access is not permitted" is a Debug-build message, and nothing is required at target SDK 36** (research of
[fix-round6-printers.md](verification/fix-round6-printers.md) section 2, which holds the documentation links). The text is the Star
library's: on Android 17 (API 37) its discovery throws it when `ACCESS_LOCAL_NETWORK` is denied. Why it is denied on a Debug build: React
Native's own debug manifest declares `ACCESS_LOCAL_NETWORK` (to reach the dev server), and a declared permission is no longer granted
implicitly; the app's own manifest and the Release variant do not declare it. This app's `targetSdkVersion` is 36, and Android's
documentation says an app targeting below 37 receives an implicit grant and should not declare or request the permission. Proved on
the Android phone by building Debug with the declaration removed: the same LAN search ended "No printers found" with nothing asked.
On a real device a Debug build shows the permission dialog at launch and "Allow" fixes it. **The day the target SDK becomes 37 the
permission must be declared and requested at runtime before a LAN search or a LAN print**: the release handover row 25 and
[../deps/android-native.md](../deps/android-native.md) section 4.

### 3.3 Fixed in code and tests, and not seen on a device after the change

Each row is a fix whose report says "not seen", "jest only" or "test only", or whose sighting was partial. No device has shown the
missing part after the change. Ordered by how likely a person is to meet it; the last column says on which device the missing part
would be seen.

| Id | What was fixed | Commit | What was seen, what was not, and where it would be seen |
|---|---|---|---|
| The Ticket settings' paper (fix round 5's class B) | On the phone the paper is a window onto the ticket that moves to the first line the last switch changed (with 3 lines of context), above the scrolling rows; the landscape tablet shows the whole paper beside the switches | `aec3395` | Seen on the Android phone: Payments off, Totals off and Product options off each moved the window. **Not seen on an iPhone; the landscape tablet is covered by the suite only.** To see it: any iPhone or tablet with a saved generic (ESC/POS) printer |
| The "Remove printer" dialog and the printer card's line break | The accept button says "Remove" (the title stays "Remove printer"); each separator dot is bound to the word before it, so no line starts with a dot | `0eea8be` | Seen on the Android phone. **Not seen on an iPhone after the change** (the third iPhone pass saw the buttons on one line before it). To see it: an iPhone with a saved printer |
| The printer wizard's IP address field keyboard (IOS3-C1) | The field's `type` is a number pad for a LAN address (`numbers-and-punctuation` on iOS, `decimal-pad` on Android) and `default` for a Bluetooth address; a comma is read as a dot; `e70aa4a` also makes the shared text field honour `keyboardType` | `e4c92e2`, `e70aa4a` | Seen on the Android phone (English locale). **Not seen on iOS, and not seen with a comma-locale keyboard.** To see it: an iPhone; an Android phone set to a comma-decimal locale |
| The language sheet in the languages' own names (IOS-C8) | A table of native names by code (about 55 languages), the server's qualifier kept for variants; used by the sheet, the profile row and the login link | `2b2805d` | Seen on the iPhone (Profile, Language). **Not seen on Android**; **no screen reader has read it** (section 3.2). To see it: an Android phone; VoiceOver or TalkBack |
| The Sessions row's height (IOS3-C2) | A Sessions-only row, 64 high (44 button plus 10 over and under) | `cbb17d2` | Seen on the iPhone (rows 65 apart, button 44). **Not seen on the Android phone or a tablet** |
| ANDROID-B6: the offline notice's second line | The notice's text is drawn (it was a 2 px high node on the Android phone) | none: the report names no commit and says nothing was edited for it | Seen on the Android phone in airplane mode ("Showing orders from 07:52 AM.", 53 px high). **The line "N changes will sync when you're back online" needs queued offline actions and was not seen** |
| The filter kept across a rotation | The Orders page holds the filter, its notice and its form in a box both layouts read | `ee96704` | Seen on the iPad (landscape with Pickup, to portrait and back). **Not seen on the Android tablet** |
| The landscape board with a filter on (T3-C5): the parts not seen | The board keeps its three columns holding the matches, with the notice, and its History lists the closed matches | `4c9e296` | Seen on both tablets (filter, text search, Mark ready moving a card, History with the filter, Clear). **Not seen:** a search with no match in any status ("no results"), an order accepted from New with the filter on (a test covers it), the `+` on a filtered count (the local data has one page), a History chip pressed with the filter on, Android portrait with a filter. To see them: either tablet, with data that has several pages and no match |
| T3-C2: the grouped order card's pickup pair | Each button is as wide as its label | `d329aaf` | **Tests only.** No device showed a grouped card at the pickup step. To see it: either tablet, or a phone, with a cart group at that step |
| The login's button over the keyboard: the field-first rule | With `keepEndInSight` the scroll goes toward the end as far as the focused field stays in sight; no dismiss on drag on the auth screens | `a6d94cb` | Seen on both tablets in landscape (the field and "Log in" over the open keyboard). **The case where the field and the button do not both fit was not seen** (a unit test only; the iPhone's third pass could not sign out to try). Profile → Password and the reject note were seen on the Android tablet, **not on the iPad** |
| The card's and the panel's clock | One rounding (`secondsOf`) and one ticker | `33b1b25` | Seen on the Android tablet (card and panel equal over four screenshots in a row). **The iPad's panel was not looked at**; the iPhone has no panel |
| A late order's clock is danger | `clockToneOf(section, timeStatus, late)`: past the promised time the tone is danger | `33b1b25` | Seen on the Android tablet's board (#4466 "Late" in red) and on the iPhone (cards of #4466 and #4465, and the details' "Late by 8h 15m" with its bar in red). **Not seen on the Android phone**, where ANDROID2-B3 was reported |
| The full map's refit when its size changes | `GoogleMap` frames the markers again on a size change | `b01cc64` | Seen on the iPad (driver disc and customer pin framed after a rotation). **The zoom could not be judged** (tiles blank without a key); not seen on the Android tablet; an iPhone does not rotate |
| The Messages tab's offline notice (ANDROID-B9) | `MessagesOption` draws `messages-offline` when the connection is down | `75f780c` | **Never seen offline** after the change: the Android phone's airplane mode was used on the Orders list only, and the iPhone simulator has no way to cut the network. To see it: an Android phone in airplane mode, on the Messages tab |
| The Active tab's count (the combined layout) | The Active tab reads the controller's total of open orders (`99+` capped) | `861752f` | **Not confirmed**: the third look saw the rail's badge at "99+" after scrolling and "59+" going to "58+" after an accept, and no report says which one is the total; the local project's layout has the tabs New / In progress / History, so the combined layout cannot be seen on it. To see it: a project with `combine_pending_and_progress_orders` on |
| Stores' empty second pane (TAB-C7 a) | `SelectStore` ("Select a store") | `888b951` | **Jest only**: with the stores loaded the first is selected at once, so the pane shows only while loading; the third look could not see it either, and the phone has one pane. To see it: a landscape tablet on a slow connection |

**Moved out of this table because a device has now seen them fixed:** on the iPhone, in its third pass ([ios-pass3.md](verification/ios-pass3.md)
check 1): the tab bar's height (98 pt: 34 of inset and 64 of bar), a card's action followed by the Messages tab, the Messages row's
status chip and unread count, the address note "Notes: 15" (IPAD2-C2, IOS-C14), the store filter sheet's "Search" placeholder
(TAB2-B2), the mini map's padding at a realistic distance (0.97 km: IOS2-B1), the details' "Waiting" color of a pending order, the Menu
"View" filter's skeleton frame (seen 0.4 s after the tap), Sessions' rows written once and the virtualized list, and the filtered
list's stale card after an action from the details (B-2, IOS2-B2: seen fixed **once**, on a fresh launch; the sequence of three was
not repeated). On the Android phone: the chat composer's bottom space (fix round 5: one space under the row, 10 dp, with the keyboard
closed and open, and nothing hidden), the tab bar's height (fix round 4). IOS3-B1 was fixed and seen in round 6.

### 3.4 What no report re-checked since the first pass

These are first-pass findings that a later report named "not opened" or "not seen". Their state is unknown, not good. **The iPhone
rows now have verdicts** ([ios-pass3.md](verification/ios-pass3.md) check 2):

- **Fixed:** IOS-C14 (the stray "15": "Notes: 15", and the stars announce "1 of 5 stars" to "5 of 5 stars"), IOS-C15 (the Remove-printer
  dialog's button on two lines: Cancel and Remove on one line each; the button's label was shortened afterwards, section 3.3), IOS-C16
  (an IP address typed quickly: `192.168.1.50` kept whole), IOS-C17 (the connection sheet's printer row with a printer: "Printer ·
  Kitchen" is there, with no value on the right because the printer was "Not tested yet": the code draws one only after a test result).
  **IOS-C8** (the language sheet) was **not fixed** in the third pass and is **fixed and seen** in round 6.
- **Still not seen:** IOS-C3 (Forgot says "Recover Password": the key was renamed to `RECOVER_PASSWORD_BUTTON` in the harmony round),
  IOS-C4 (the login code's boxes and an active "Resend code"), IOS-C5 and ANDROID-C5 (the notification explainer's "Not now" color).
  They need the signed-out screens (the third pass was not allowed to sign out) and a device whose notification permission is not yet
  granted (the iPhone's is).
- **Printers card wrapping (ANDROID-C9):** the card's summary now breaks after a dot and never before one (fix round 6, seen on the
  Android phone); the report does not name ANDROID-C9, and the symptom it fixed is the same one.
- Adjust-time dialog, login by code, forgot password, the end of the reject confirmation, an offline or error state of the board,
  Stores and Printers in portrait on a tablet, a printer in the list on a tablet (edit, test, remove) and Ticket settings on a tablet
  (the Android phone's Ticket settings were seen in fix rounds 5 and 6): [tablet-android-pass2.md](verification/tablet-android-pass2.md),
  "What I did not see".
- A review actually sent; the unsaved-changes dialog of the Password form on Android.

### 3.5 The Android phone: state of its first-pass findings

The first pass ([android.md](verification/android.md)) had 2 A, 14 B and 10 C. The second pass and fix rounds 4 to 6 gave verdicts for most:

| Finding of android.md | State |
|---|---|
| A1 the orders list freezes the app | Fixed, seen: `top -H` at rest 3.2 to 3.5 % for the UI thread and 3.4 % for `mqt_v_js` (Debug, host at load 20 to 60); taps answered within seconds. The cold start in Debug is slow: ANDROID2-B2 |
| A2 "invalid format" | Fixed, seen (accept sheet, adjust sheet, card, details, chat, history, messages, pause, ticket, Sessions) |
| B1, B2, B4, B5, B10, B12 | Fixed, seen in the second pass |
| B3 the details' status row overflows | Fixed, seen in fix round 4 (a completed order, #3113: the chips fit one row) |
| B6 the offline notice's second line | **Fixed, seen** in fix round 6 (airplane mode; section 3.3) |
| B7 the chat header | Partly: only "Customer" is selected by default and "No driver yet" is under the chips; the row of quick replies is absent by call |
| B8 the ended chat's notice clipped; a reject closed once | The ended chat's notice: **fixed, seen** in fix round 6 (two lines and a "View order" button). The reject closing once: **not reproduced** (section 3.2) |
| B9 Messages: the badge, the offline notice | The badge sits inside the chip (seen); the offline notice is in code and was not seen (section 3.3) |
| B11 the tab bar is 84 dp | Fixed in fix round 4 and seen: 64 dp, labels 10 dp above the bar's end |
| B13 pieces of mockups | The category switch is not drawn (decided, OQ-10); "Help center" is replaced by "About · Version 1.0"; Personal information was seen with Name and Last Name; the printer buttons were seen in fix rounds 5 and 6 (the card, the remove dialog, Ticket settings) |
| B14 Add printer | Seen in fix round 4: "Other (ESC/POS)" whole; the permission is explained with "Open settings" and the IP link. The wording says Bluetooth for a Wi-Fi or LAN search: **cause found** in fix round 5, left (section 3.2) |
| C1 to C4, C7 (language), C8 (the log-out and "Discard?" dialogs), C6 (Sessions' "Current" chip, soft) | Fixed, seen |
| C5 | Not seen again (section 3.4) |
| C9 the Printers card wrapping | Probably fixed and seen in fix round 6 (section 3.4) |
| C10 Back from Stores goes to the Orders tab | Unchanged, by decision |

## 4. Never verified

No report, on any device, shows these. They are the owner's or a person's with the hardware; the release handover
section 1 says how to test each.

- **Push notifications**, in any state: Firebase and OneSignal are not registered for `co.ordering.business`; the committed files
  hold placeholders (the Release builds log "API key not valid" on every start).
- **Real printers**, Star, Epson and generic ESC/POS over a LAN, over Bluetooth Low Energy and over USB, on both platforms;
  discovery, a test print, a printed ticket, cut and feed, auto-print. Seen: the wizard's steps, a scan that found nothing, a Star
  printer saved by a typed IP address and a generic printer by a typed address (neither is a real device). Whether Epson's native LAN
  discovery needs the Bluetooth permission on Android 12+ is not known.
- **The three alert sounds, by ear** (Bell, Chime, Kitchen alarm), and the push alarm sound and its channel; vibration. Only that a
  media player of the app was `started` was read from the audio service.
- **Physical devices of every kind:** an iPhone, an iPad, an Android phone and tablet. Every run was a simulator or an emulator;
  frame times of the emulator's GPU are not a measure of a device.
- **Store-signed builds:** Release is signed with the committed debug keystore, and the iOS Release is a simulator build; an archive
  for a device was not tried.
- **The schema publish and the CI workflows on GitHub:** nothing is published, `ci.yml`, `theme-publish.yml` and `i18n-sync.yml`
  were parsed and their commands run locally, never run on GitHub; the publish dry run needs a secret that does not exist.
- **A served theme:** no report records a theme other than the build's defaults reaching a device.
- **The 11 locales:** machine translation, no native speaker has read them; the device work was in English (round 6 looked at the
  language sheet's names, not at the app in another language), and right to left (Arabic) was never looked at.
- **A screen reader:** VoiceOver and TalkBack were never used on the app. What exists are the accessibility labels read from the
  accessibility tree (for example the stars' "1 of 5 stars"); the language sheet's rows carry the native name only (section 3.2).
- **A comma-decimal keyboard:** the printer wizard's IP field was typed with an English-locale number pad only; a locale whose number
  pad types a comma was never tried.
- **Socket events:** the local stack delivers none (the connection pill reads "Reconnecting" except right after a sign-in), so the
  real new-order alert with its Accept rows, "Live" updates and reconnect behavior were never seen.
- **A Release build started offline**, the offline order queue replayed ("Pending sync"), a real login by code or by SMS, a 320 pt
  phone and Android at the largest text, Android 14 and earlier, and a soak of hours.

## 5. The Release builds

[../deps/release-builds.md](../deps/release-builds.md), the first builds, at the commit `da4aebd` (2026-11-19, 22:14); nothing under `src/`,
`android/` or `ios/` was changed for them:

- **Android:** `./gradlew assembleRelease` built in 5 min 26 s, `app-release.apk` 172.5 MB (four ABIs, Hermes bundle 6.9 MB), the AAB 91.5 MB; **signed with the committed debug keystore** (`signingConfigs.debug`), `minifyEnabled` false. Installed and opened on the `OBizTablet` emulator.
- **iOS:** `xcodebuild -configuration Release -sdk iphonesimulator` built in 119 s, `OBusiness.app` 152 MB, Hermes bundle 8.5 MB; no signing used; opened on a new simulator `OBizRelease` (iPhone 17 Pro).
- **Seen:** the screens listed in section 2; no `FATAL EXCEPTION`, no ANR, no crash report, no `ReactNativeJS` error in either log.
- **Measured (emulator, simulator):** the numbers are in [../PERFORMANCE.md](../PERFORMANCE.md), "Measured".
- **Not seen:** push, the alarm, a printer, a physical device, a signed or store build, a start offline, any order action, the notification explainer on iOS.

**The first builds are older than the code.** Both were built before fix rounds 2 to 6 and before the second Android phone pass:
66 commits came after `da4aebd`, 102 files under `src/` changed (2 521 lines added, 480 removed, tests included; `git diff
--shortstat da4aebd..HEAD -- src`), and the i18n catalog gained keys. **Every change since is JavaScript, styles and the catalog; no
native file changed.** The command `git diff --stat da4aebd..HEAD -- android ios package.json pnpm-lock.yaml pnpm-workspace.yaml
patches src/printing` prints nothing at `e70aa4a`. So the native binaries of those builds would be rebuilt identically, but the
JavaScript bundle inside them is the old one: none of the fixes of rounds 2 to 6 is in the Release apps that were opened. Until the
final builds exist, no Release figure of this page speaks for the code of the last commit, and the Release question left over from
ANDROID2-B2 (the first minutes after a launch) and from ANDROID2-B1 (Sessions) has no answer for it.

**The final Release builds (2026-11-20, code of `e70aa4a`; the two commits after it are documentation only).** [../deps/release-builds.md](../deps/release-builds.md),
first section. They answer the paragraph above: the Release apps that were opened now hold the fixes of rounds 2 to 6.

- **Android** (`emulator-5556`, phone, API 37): `assembleRelease` 5 min 48 s, `bundleRelease` 10 s; APK 172,540,443 B, AAB 91,466,659 B,
  Hermes bundle 7,240,240 B; package `co.ordering.business`, target SDK 36, still **signed with the committed debug keystore**.
  Installed over the Debug app, signed in by typing, and seen: login, orders (and scrolled), details, the accept sheet (opened and
  closed, nothing accepted), Messages, Stores, a menu, Profile, the language sheet, Sessions, Printers and the wizard's two steps.
  Cold start to the list 4.2 to 6.7 s; the JavaScript thread at rest 1.0 to 1.2 % of a core (5.6 % in a refresh); tab bar 64.0 dp; no
  crash, no ANR, no JavaScript error in the log.
- **`ACCESS_LOCAL_NETWORK` is not declared in the Release APK** (`aapt2 dump permissions`) and the device reports it granted
  (the implicit grant below target 37). The LAN printer search in Release ends with "No printers found" and "Enter the IP address
  instead", **not** with "Local network access is not permitted": the Debug-only reading of section 3.2 holds. It still asks for
  the Bluetooth permission first (Star and Epson), and with Epson Google's own "Location Accuracy" dialog came up over the search.
- **iOS** (simulator `OBizRelease`, iPhone 17 Pro): the Release build took 1992 s on a host at a load of 41 to 77 (119 s on a quiet
  host in the first round); `OBusiness.app` 152 MB, Hermes bundle 8,916,513 B. Seen: orders, details, the accept sheet, Messages,
  Stores, a menu, Profile, the language sheet, Sessions. Cold start to the list 3.2 to 5.2 s under that load; CPU at rest 1.6 to 1.8 %
  of a core; footprint 198.7 MB; no crash. New in the log: the status-bar line of row REL2-C1.
- **Not done in this round:** a tablet or an iPad in Release, an offline start, anything the Release run deliberately did not touch
  (accept, reject, chat send, switches), a physical device, a store-signed build.
- **Incident:** the phone emulator hung under the host's load at 08:34 and its own hang detector killed it; it was restarted with the
  same flags and every phone figure is from the second boot.

## 6. The skill's definition of done (eight points)

| # | Point | State | Evidence |
|---|---|---|---|
| 1 | `product.schema.json` valid, compiled, checked in CI, publish dry run in CI and publish in a workflow | **met with a limit** | `pnpm theme:validate` and `theme:verify` (section 1); steps "Theme schema is valid" and "Compiled theme is up to date" in `.github/workflows/ci.yml`; "Theme schema publish (dry run)" as its last step; `theme-publish.yml` (jobs `production` and the builder-base sync). Limit: **no workflow has run on GitHub**, the dry run needs a secret that does not exist yet, and nothing is published |
| 2 | The app requests the version 2 theme with its product type and schema version, completes, converts, caches it, paints the build's defaults before it arrives and offline | **met with a limit** | `src/theme/remote.ts` (`theme_version=2&product_type=store_app&theme_schema_version=…`, a cache per project and schema version), `src/theme/engine.ts`, `src/theme/__tests__/`; [../THEMING.md](../THEMING.md) section 2. Limit: **no report records a served theme reaching a device**, and a Release start offline was not seen: the defaults and the cached theme are proved by tests, not by a screen |
| 3 | Everything read from the theme through helpers, the guard passing in CI with no baseline, every literal left a recorded exception | **met** | `pnpm theme:guard`: 0 literals at `e70aa4a`; `theme-exceptions.json` holds the 8 recorded exceptions; the guard step in `ci.yml`; the guard is given no baseline |
| 4 | Every key has a reader and a test, the readers check and the extreme themes in CI | **met with a limit** | `pnpm theme:keys` (every key has a reader, 19 recorded as read through a variable) and `pnpm theme:extremes` (ok), both CI steps. Limit: the check proves a reader exists; no script proves each key has a test of its own, the tests are the Jest suites |
| 5 | Every screen declares its sections, every hideable piece has its visibility key, the v1 map or the decision not to have one | **met with a limit** | `product.schema.json`: 7 pages with sections and 55 visibility keys counted in the file (the proposal's section 6 says 54); [pages-and-visibility.md](pages-and-visibility.md); `src/theme/sections.tsx`. The v1 decision: [../THEMING.md](../THEMING.md) says the submodule's version 1 request is not read, and [decisions.md](decisions.md) records "No legacy layout and no layout option" **as a working assumption taken from the driver app, not confirmed by the owner** |
| 6 | The defaults reproduce the approved look on iOS and Android; the same role looks the same on every screen | **met with a limit** | Seen on an iPhone and an iPad simulator and on an Android phone and tablet emulator against the mockups (section 2); the harmony record fixed what disagreed and the second and later passes verified it. Limits: **simulators and emulators only**, the open findings of section 3, section 3.3's fixes with no sighting, no served theme, no physical device, and the first Release builds predate the fixes (section 5; the final ones are in [../deps/release-builds.md](../deps/release-builds.md)) |
| 7 | `docs/THEMING.md` linked from `CLAUDE.md`, `docs/theme/` keeps the deliverables | **met** | `CLAUDE.md` section "Theming" links it; `docs/theme/` holds decisions, tokens, components, pages and visibility, editor labels, harmony, open questions, areas and this record |
| 8 | A build made by the build system from the merged code with the published schema version, installed and opened on both platforms | **not met** | What exists is a **local Release build per platform** (section 5), made by hand from the branch (the first ones at `da4aebd`; the final ones at the code of `e70aa4a`, installed and opened on the Android phone emulator and the iPhone simulator, [../deps/release-builds.md](../deps/release-builds.md)), not by the Builder, not from merged code; **the schema is not published**; no build-system build exists; the Builder's base and api-core's two lines do not exist (the release handover section 2) |

## 7. Where reports disagree, and what this page followed

- **Idle CPU on the iPhone simulator.** `decisions.md` says "about 1 %" after the first fix round; [ios-pass2.md](verification/ios-pass2.md) measured 2.2 to 2.7 % (three `top` samples) and Release 2.0 to 2.3 %. This page follows the measurements. The "36 %" before in `decisions.md` has no source in [ios.md](verification/ios.md).
- **The login in landscape on a tablet.** [tablet-android-pass2.md](verification/tablet-android-pass2.md) calls TAB-B1 "not a defect (by the keyboard rule)", [ipad-pass2.md](verification/ipad-pass2.md) calls IPAD2-B1 a class B; fix round 2 fixed it in code and `decisions.md` said so, but [tablets-pass3.md](verification/tablets-pass3.md) showed the button still under the keyboard (T3-B1). Fix round 4 found why the earlier test passed (its fake page ended at the button) and fixed it; seen on both tablets. Followed: fixed, seen.
- **The tabs with a filter on (OQ-02).** `decisions.md` first took OQ-02 (a): tabs hidden. [fix-round2.md](verification/fix-round2.md) item 2 kept them (a call of the round), [tablets-pass3.md](verification/tablets-pass3.md) saw them on both portrait tablets and a flat list on the landscape board, and the version of this page of 2026-11-20 00:51 listed it as a pending decision. **The owner answered on 2026-11-20: (b), the tabs stay, for a filter and for a text search alike, and the landscape board keeps its columns** ([decisions.md](decisions.md), [open-questions.md](open-questions.md)). Fix round 6 made the board do it (T3-C5, seen on both tablets). No decision is pending.
- **The Orders tab's size (H7).** [harmony.md](harmony.md) listed it as left; [ios-pass2.md](verification/ios-pass2.md) measured the pill at 36 pt in a 46 pt track and [android-pass2.md](verification/android-pass2.md) at 36 dp in 46 dp (its B4 "fixed"). The mockup draws exactly that (a 46 track with 5 of padding, tabs 36 high, 12 px, inactive at 400, active at 600) and the compiled schema now holds it (`tabs.sizes.sm.height` 46, inset 5, inactive weight 400). Followed: the devices, and H7's row in [harmony.md](harmony.md) is now marked done with that evidence. The iPhone's third pass writes "the 43 is the known H7 item" about the bottom tab bar's four tabs (100 x 43 pt); that element is not the pill, and no report measures the pill after the second passes.
- **Taps after a launch on the Android phone.** [android-pass2.md](verification/android-pass2.md) says taps were dropped for the first minute or two; [fix-round4-android.md](verification/fix-round4-android.md) measured a tap sent at the moment the list was drawn and saw it answered 7 s later, so it reads "dropped" as "answered 5 to 30 s late and then repeated". Followed: the later, measured one, for the Debug build on a loaded host only.
- **The idle CPU claim for the Android tablet in `decisions.md`** ("near 0 %") agrees with [tablet-android-pass2.md](verification/tablet-android-pass2.md) (`mqt_v_js` 0 % at rest in Debug); the Release builds measured 0.9 to 2.3 %.

- **The iPhone's third pass counts its first-pass rows.** [ios-pass3.md](verification/ios-pass3.md) check 2 says "3 fixed, 1 not fixed, 3 could not see"; its table gives four fixed (IOS-C14, C15, C16, C17), one not fixed (IOS-C8), three not seen (IOS-C3, C4, C5) and one partly (C-4). Followed: the table (four fixed).
- **What "ANDROID-B8" is.** [android.md](verification/android.md) B8 is two things: the ended chat's notice clipped, and a reject that closed the sheet without rejecting. [android-pass2.md](verification/android-pass2.md) and the earlier version of this page's section 3.2 carry only the second; [fix-round6-printers.md](verification/fix-round6-printers.md) gives a verdict on each (the first fixed and seen, the second not reproduced). Followed: both halves, separately.
- **Whether Android 17's local-network permission needs a native change.** [fix-round5.md](verification/fix-round5.md) section 2 ends on a side observation that the manifest declares no `ACCESS_LOCAL_NETWORK` and that the Builder base might need to look at it (not confirmed). [fix-round6-printers.md](verification/fix-round6-printers.md) section 2 then read the documentation and proved by experiment that the message is a Debug-only effect of React Native's own manifest, and that at target SDK 36 nothing is required. Followed: the later one; the permission becomes mandatory the day the target SDK is 37 (the release handover row 25).
- **"Remove" on one line.** The iPhone's third pass saw the Remove-printer dialog's buttons on one line; the Android phone's round 6 saw the same dialog wrap its "Remove printer" button before it shortened the label. Different devices and fonts, not necessarily a conflict; the new label was seen on the Android phone only.

## 8. Incidents and local data

### Incidents

1. **Input meant for the Android phone reached the tablet** ([android-pass2.md](verification/android-pass2.md), "What went wrong with the
   setup"). A shared helper script in the scratchpad had been repointed at the tablet emulator at 22:24. Between about 22:25 and
   22:46 the phone pass's commands went to the tablet: about 25 taps and swipes (the Stores switch, the tab bar, a swipe from the top
   edge), the HOME key, two BACK keys, **a force-stop of the app and a relaunch (about 22:44)** and **two taps on "Mark ready" (22:35)
   on whatever screen the tablet showed**; no text was typed there. The phone itself received none of them. The helper was disabled,
   and every agent now names the device in every command (`adb -s <serial>`, an explicit simulator id). **Orders in the local data
   may have changed state because of it**: [fix-round4.md](verification/fix-round4.md) could not say which changes on the tablet's board
   were its own.
2. **A mis-tap marked a third order ready** during fix round 2: #3344 (a delivery of store 41) on the details' footer, over the
   budget; it cannot be undone from the app.
3. **Hot reloads from other agents' edits** reloaded the apps many times in every pass after the first (skeleton screens, a blank
   frame, a return to the Orders tab); one pass saw a red screen (`Failed to compile`, an agent's edit in progress) and two saw a
   LogBox render error about hooks ([tablets-pass3.md](verification/tablets-pass3.md)). Fix round 4 read the code and found no hook
   called conditionally, and put the errors down to Fast Refresh (adding a `useRef` to a hook made the running app throw the same
   message until it was relaunched). A fresh launch is needed to judge a fix about stored state. **The iPhone's third pass saw the same kind of
   red screen once** ([ios-pass3.md](verification/ios-pass3.md), screenshot 21: "Rendered more hooks than during the previous render"
   in `MyOrders.tsx:19`), right after another agent's edit while the tester was scrolling Sessions; the app was terminated and launched
   again and the screen did not come back. It is an artifact of concurrent editing (a hot reload in the middle of an edit), not a
   finding, and the report did not file it as one. Twice before it, the Orders screen came back on its "New" tab after Back from a
   details screen (the History or In progress tab chosen was lost); the report reads it as the same reloads and did not see it again
   after the relaunch.
4. **The host was overloaded** in several passes (load average 20 to 60 in the Android phone's second pass, 19 with another emulator at
   340 % CPU in its fourth round, 16 to 17 in fix round 5): sheets took 2 to 5 s to open, screenshots lagged, a cold start took 60 to 120 s. One ANR was
   logged in a secondary process (OneSignal's `SyncJobService`), not the UI process. Eighty working screenshots of the second Android
   phone pass were discarded as not evidence.
5. **An element inspector and a developer menu** opened by stray key sequences in two passes; the apps were relaunched.

### What the rounds changed in the local data, on purpose or not

The orders and settings below belong to the local `development` project and cannot all be undone from the app. The test account
(its e-mail and password) is not written here: it was typed into the apps only; every pass added sessions to it (nothing deletes
them), so its Sessions list is long. The project's `assign_driver_enabled` was turned on by the owner's instruction (config 168).

| Round | Orders and settings changed |
|---|---|
| iPhone, first pass | #4471 accepted, ready, picked up; #4470 rejected; #4463 ready; store "Taste Wine" paused 15 min then resumed; product "Crown Extra" off then on; two printers added and deleted; the login language switched to English |
| Android phone, first pass | #4469 accepted (25 min) and ready; #4468 rejected (note `Android_pass_test`); store "Crops Grocery" paused 30 min then resumed; product "Green Peppers" off then on; a printer added and removed; the notification permission revoked and granted again |
| Android tablet, first pass | #4464 accepted and ready |
| iPhone, second pass | #2805 accepted, +10 min, ready, one chat message sent to its customer; #2807 accepted; #3287 rejected; the sound set to Chime and Kitchen alarm and back to Bell |
| Android phone, second pass | #3449 accepted (20 min), +10 min, ready, one chat message to its customer; #3448 accepted; #3450 rejected; "Twirly Laundry" paused 30 min and resumed; product "Blouse" off and on; assign driver opened and a driver picked, **not confirmed** |
| iPad, second pass | #3475 accepted, +10 min, ready |
| Android tablet, second pass | #4195 accepted and ready |
| Fix round 2 (iPhone) | #2988, #3113, #3114 accepted; #2988 and #3113 ready, and #3344 by the mis-tap (incident 2); #2988 completed; #3113 "Not picked up" (confirmed); #3114 +5 min; a generic printer added and removed |
| Third look (tablets) | #4466 accepted (20 min); the Android "nearby devices" dialog answered Allow |
| Fix round 3 (iPhone) | #3569, #3568, #3567 (pickup) accepted; #3567 and #3114 ready; #3114 completed ("Picked up"); #3568 +5 min |
| Fix round 4 (tablets) | #4465 (45 min) and #4196 (20 min) accepted; a reject sheet opened and closed without sending |
| Fix round 4 (Android phone) | Pickup orders **#3514 and #3513** accepted (20 min); #3513 marked ready and then "Not picked up" (confirmed, in History, cannot be undone); #3514 stays accepted; product "Blouse" off and on; a letter typed in Personal information and discarded |
| Fix round 5 (Android phone and iPhone) | Android phone: a Star printer (by IP) and a generic one (by address) added and both **removed**; `BLUETOOTH_CONNECT` granted with `adb pm grant` for one search and **revoked** (that kills the app: relaunched and signed in again, on the Orders tab at the end); one more app session on each device. No message sent, no order changed, no profile change ([fix-round5.md](verification/fix-round5.md)) |
| iPhone, third pass | **#4467** (a pending delivery) accepted from its card (20 min) and then marked ready from its details (now "Ready for pickup", no driver); product "Blouse" of Twirly Laundry off and on; a Star TSP100 "Kitchen" (LAN, a typed address, not a real device) added and removed. No session touched, no profile change, no sign-out, no chat message, no text size or notification permission change ([ios-pass3.md](verification/ios-pass3.md)) |
| Fix round 6 (tablets) | **#3569** (Demo Admin, pickup) marked ready from the Preparing column on the Android tablet with the filter on; nothing accepted, rejected or sent. Another session accepted #4467 meanwhile (its clock showed on the iPad). Both tablets left booted and signed in on Orders, no filter ([fix-round6-tablets.md](verification/fix-round6-tablets.md)) |
| Fix round 6 (iPhone) | Product "Blouse" of the first store off and on again; the language sheet opened and nothing picked ([fix-round6-ios.md](verification/fix-round6-ios.md)) |
| Fix round 6 (Android phone, printers) | The app **uninstalled and reinstalled once** (a fresh install to clear a stored permission state): its data was reset, it was signed in again by typing the test account in the app, and the `debug_http_host` preference restored; one more app session. A temporary manifest line was built into a Debug app installed on the phone only, then reverted and the unchanged repository's Debug app rebuilt and installed over it (`android/` is unchanged in git). Permissions: `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN` and `ACCESS_LOCAL_NETWORK` granted with `pm grant` for the searches and **revoked** at the end (each revoke kills the app, relaunched); React Native's launch dialog for nearby devices answered "Don't allow"; the final state is all three not granted. A generic printer (made-up Bluetooth address) added and **removed**; the ticket options toggled and put back to the defaults. Airplane mode on and off once (Wi-Fi was off after it and was re-enabled). **Order #4194 rejected** (reason "Other", note "Test_round6"), picked for the ANDROID-B8 attempt ([fix-round6-printers.md](verification/fix-round6-printers.md)) |
| The owner's review, round 1 (2026-11-20) | Driver group 1 of the local project: business 49 added (it had 3 and 41), so #4193 can be assigned. iPhone: **#4462** marked ready; **#4189** accepted with 37 minutes typed, then adjusted to 50 typed. The owner, on the Android phone: #4193 accepted (10 min) and marked ready ([owner-review1.md](verification/owner-review1.md)) |
| The owner's review, round 2 (2026-11-20) | iPhone: **#4466** and **#4465** (Limetray Test) marked ready, to see an order leave Preparing and head Ready ([owner-review2.md](verification/owner-review2.md)); a store chosen in the filter and set back to All stores |

Nothing was paused, rejected or assigned beyond this table, no message was sent beyond the two above, and no printer, store or
product remains changed. **Orders changed by rounds 5 and 6 (the ones that cannot be undone from the app):** #4467 accepted and marked
ready, #3569 marked ready, #4194 rejected.

## 9. What this page does not establish

The times of the first iPad, first Android tablet, second tablet, second iPad, third-look and fix round 6 (tablets and iPhone) passes
(the reports give none); the idle CPU of the first iPhone pass; the coverage figures at `e70aa4a`; whether CI's own Release-bundle step passes (it was not run; the final Release builds did build both bundles locally: [../deps/release-builds.md](../deps/release-builds.md));
the frame rate of the orders list on a real phone (the emulator's count is its GPU's);
the iOS timings of Sessions (the iPhone's list was seen drawn about 1 s after the tap, not measured); the Active tab's total on a
device; whether a real printer prints a ticket; anything about a physical device.
