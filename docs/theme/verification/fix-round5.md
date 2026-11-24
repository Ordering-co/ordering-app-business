# Fix round 5 (Android phone and iPhone): Sessions list, the LAN search's permission, what round 4 fixed unseen

Date: 2026-11-20 (emulator clock 00:44 to 01:15). Branch `feature/theming-native`, local commits only. Devices: Android phone `emulator-5556` (AVD `OBizTest`, Android 17 / API 37, 2.625 px per dp, Debug build from Metro 8097, local API) and iPhone 17 Pro simulator `558440F2-...` (Debug, Metro 8097). Screenshots: `<scratchpad>/pass6/<android|ios>/NN-*.png` (scratchpad = `/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad`), every one opened. Every adb call named the device. The host was loaded (load average 16 to 17), so every number below is a wall time on a slow host, taken with the same method before and after.

Verdicts: **fixed and seen** / **not fixed, not mine (proposal written)** / **seen, nothing to fix** / **not seen**.

## 1. Sessions opens slowly with 100+ sessions: fixed and seen (Android), seen (iPhone)

**Cause.** `Sessions/index.tsx` drew the rows of the other devices inside a `ScrollView`, so an account with 150 sessions mounted 150 `OListRow`s (each with its `OButton`) in one render. In a Debug build that kept the JS thread busy for most of the opening and queued the Back key behind it (round 4, section 2).

**Fix.** The screen is one `FlatList` (the primitive `PreviousOrders`, `PreviousMessages` and `StoresList` already use; `initialNumToRender` 10, `maxToRenderPerBatch` 10, `windowSize` 7, the values `OrderRowsList` uses). "This device" and the "Other devices" title are its `ListHeaderComponent`; the off, loading (skeleton) and "no sessions" states are the header with no rows, so they look as before. The rows are the memoized `otherRows` of round 4 (dates written once per change of the list), a stable `keyExtractor`, a `renderItem` that follows the controller's handler and `busy` (`extraData`). The content container lost its `gap` (a list would put it between the rows, which carry their own divider); the header carries the `md` between the two sections and the title has its own `xs` under it, so the layout is the same to the pixel (`01-sessions-before.png` and `02-sessions-after.png` side by side on the phone). The bar "Sign out of all other devices", the Back arrow, the confirmations and the tablet layout (`ScreenContainer`) are untouched. **No pull to refresh exists on this screen and the controller (`Sessions` in the submodule) exposes no reload function, so there was none to keep** (not added: it would need an upstream additive change).

Files: `src/ui/src/components/Sessions/index.tsx`, `src/ui/src/components/Sessions/__tests__/Sessions.test.tsx`. Commit `3d5d40e`.

**Test.** New: "mounts only the rows near the top for a list of 150 sessions": 150 sessions with the current one in the middle, at most 15 `session-card-*` rows mounted (it was 149), the first is the newest, the middle and oldest are not mounted, the header's "This device" and the bar are present, and the list's `data` holds the 149 rows. The "newest first" test reads the rows from the list (they are no longer inside the `session-others` view, which is now the title). The old code fails the new test (149 rows). 15 tests in the suite pass.

**Measured on `emulator-5556`** (`<scratchpad>/pass6/bin/measure.py`: tap on "Sessions", `uiautomator dump` polled until `session-current` or a `session-card-*` is on screen; CPU time of the `mqt_v_js` thread from `/proc/<pid>/task/<tid>/stat` sampled every 0.5 s; Back pressed 2 s after the tap and polled until Profile is on screen). The dump polling itself costs a few seconds per poll and slows both runs the same way.

| | before | after |
|---|---|---|
| tap to the list drawn (wall) | 102.6 s (a first run: 78.9 s) | 13.0 s and 11.7 s |
| JS thread CPU during the opening | 36.4 s over 105 s (about 4 s per 5 s window for the first 35 s) | 8.5 s over 16 s and 7.0 s over 14 s |
| Back pressed 2 s after the tap, until Profile shows | 49.3 s | 4.6 s |
| `session-card` rows in the accessibility tree | all (100+) | 11 at the top, 14 after scrolling to the end |

After the fix the rest of the 7 to 8 s of JS time is the request and the Debug build's own rendering (same screen shows the skeleton first). Scrolling to the end of the 100+ list works and shows the oldest sessions (`03-sessions-scrolled.png`).

**iPhone** (`ios/01-sessions-after.png`): "This device" card (iPhone · this phone), the title, the rows, "Sign out" buttons, the bar; same layout as Android; the Back arrow went to Profile at once. **I did not measure iOS times** (no JS-thread counter driven there) and the accessibility tree of the simulator did not list the row ids, so the number of rows mounted there was not counted: the iPhone is "seen drawn and working", not measured.

## 2. Printers, Add printer, Wi-Fi / LAN search shows "Bluetooth permission is required...": cause found, in code I may not edit; nothing changed

Seen on the phone with the permission state on the device (`BLUETOOTH_CONNECT` and `BLUETOOTH_SCAN` not granted; the system's grant dialog is dismissed with result 2 at once on this emulator, `logcat`: `GrantPermissionsViewModel ... result=2`). There are **two causes, one per brand**:

**Star + Wi-Fi/LAN** (the wizard's default). Cause in a frozen file: `src/printing/usePrinterCommands.tsx`, `discoveryPrinterPort`, the block `if (Platform.OS == 'android' && 31 <= Platform.Version) { if (interfaceType == InterfaceType.Bluetooth || settings.autoSwitchInterface == true) { const hasPermission = await confirmBluetoothPermission() ...` (about line 117 to 125). `settings` is a fresh `new StarConnectionSettings()` and `autoSwitchInterface` defaults to `true` in `react-native-star-io10` (`StarConnectionSettings.ts`, `autoSwitchInterface: boolean = true`), so the condition is true for LAN too and the Bluetooth permission is asked (`logcat`: a request for `BLUETOOTH_CONNECT` only) and its refusal returns `PRINTER_PERMISSION_DENIED`. The same condition is in the print path (`printTicket`, the Star block about line 366 to 376): a LAN Star printer cannot print on Android 12+ without the Nearby devices permission either.
- Confirmed by cause and effect: with `BLUETOOTH_CONNECT` granted by `adb pm grant` the same LAN search ran and ended with the Star SDK's own text "Local network access is not permitted." (`07-star-lan-granted.png`); I revoked the permission afterwards.
- **Proposed change (frozen file, not edited):** in the discovery block, ask only for the interface being searched: `if (interfaceType == InterfaceType.Bluetooth) {`, and in the print block the same plus `settings.autoSwitchInterface = false` for a LAN identifier (or leave the auto switch and ask only when `interfaceType == InterfaceType.Bluetooth`). To be done with a device and a real printer, as the freeze says.

**Epson + Wi-Fi/LAN.** Cause in the library, not in a frozen file: `react-native-esc-pos-printer@4.6.0-rc.0`, `src/discovery/PrintersDiscovery.tsx` line 39 (`start` calls `requestAndroidPermissions()` for every port type) and `src/core/utils/permissions.ts` (it requests `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` on API 31+, for LAN and USB too; `logcat` shows both requested during an Epson LAN search). `src/printing/EpsonPrinterAdapter.ts` (not frozen) maps the resulting error to `PRINTER_PERMISSION_DENIED`. The library offers no way to skip the check, and the only fix is a patch of the library (`patches/` + `patchedDependencies` in `pnpm-workspace.yaml` + the lockfile), which this round may not do. **Proposed patch:** in `PrintersDiscovery.start`, skip `requestAndroidPermissions()` when `filterOption.portType` is `PORTTYPE_TCP` (and `PORTTYPE_USB`), and keep it for Bluetooth and `PORTTYPE_ALL`. I could not check whether Epson's native LAN discovery itself needs the permission on API 31+.

**Not done and why:** a LAN-search path in the non-frozen `usePrinting.discover` that bypasses `discoveryPrinterPort` would work around the Star cause, but it would duplicate the frozen discovery for a path nobody can test here (no printer on the LAN), so I left it for the owner's decision.

**Bluetooth search keeps asking** (generic brand, Bluetooth only): seen, the notice and "Open settings" appear after the refusal, "Enter the address instead" works.

**Side observation (API 37 only, not verified):** after the grant the Star LAN search ended with "Local network access is not permitted." Android 17 protects local-network access behind a runtime permission; `android/app/src/main/AndroidManifest.xml` declares none (only `INTERNET`). A native change for the Builder base to look at (`ACCESS_LOCAL_NETWORK`), not made here (`android/` is out of scope) and not confirmed (no real LAN printer).

## 3. Seen on the Android phone what round 4 fixed unseen

**Chat composer after `98ef5e1`: fixed and seen** (order #3514, `08`, `09`, `10`; `uiautomator` frames, 2.625 px per dp):
- Keyboard closed: `chat-composer` 2153 to 2337 (the window's bottom, the system navigation bar below it), `chat-input` 2181 to 2307, row ends 2310: **one** space under the row (27 px = 10 dp, the bar's own padding), not two.
- Keyboard open (`mInputShown=true`): composer 1333 to 1517 sits on the keyboard, input 1361 to 1487 (the same 27 px under the row), the list ends at 1331 and the last message ("Accepted by business") is at 1243 to 1291, visible.
- Keyboard closed again (system Back): the same frames as the first state. No message was sent.

**Ticket settings: seen.** It is only offered when a **generic (ESC/POS)** printer is saved (`PrinterSettings`, `hasGenericPrinter`), so a Star printer is not enough. I saved a Star TSP100IV by IP `192.168.1.50` (wizard "Enter the IP address instead", model sheet, saved; `11`, `12`, `13`) and a generic one through "Enter the address instead" (a made-up Bluetooth address; the permission-refused search leaves that way out), then opened Ticket (`15`, `16`, `17`). Compared with `TicketSettings.dc.html` and `SPECS.md`: header "Ticket / What the ticket prints", the paper preview, six switch rows with their sub-lines, "Details" (collapsed), "Copies per order" with the stepper, the two 12-pt lines (`16`, `17`: they scroll into view; nothing is cut). The footers and gutters match. Differences, none fixed (outside the folders I touched):
- **B (not mine, `src/ui/src/components/PrintTicketSettings/index.tsx`, `PREVIEW_LINES = 14`)**: the preview is the first 14 lines of the real ticket, so it ends at "Internal Number: 4" in the customer block; the toggles "Product options", "Totals breakdown" and "Payments" act below that cut and **never change the preview** (the mockup's paper is a short ticket that reaches the TOTAL). Proposal: choose the lines to show from the end too, or a short sample ticket that reaches the total, or no limit with the paper scrolling.
- C: the mockup shows "Store details" off; the app shows it on (the stored default; a sample).

**Ticket preview with printers** (`18-ticket-preview.png`, from the order's "Print ticket"): chips with a status dot for each saved printer, the paper at 37 columns (wraps "07:13P / M / )" as decided before), "Share PDF" and "Print on 2 printers". Matches `TicketPreview.dc.html`. It is not reachable from Ticket settings (no link there), only from an order.

**Delete** (`19-delete-confirm.png`): "Remove printer" dialog, both printers removed; the list is empty again.

**C, not mine:** the confirm dialog's red button label "Remove printer" wraps to two lines at 44 high (`ConfirmDialogHost` / shared dialog, `19`); on the Printers card the line "Generic ESC/POS · Bluetooth · 80 mm" breaks before "· 80 mm" so a line starts with a dot (`15`, `PrinterCard`: the text column is narrowed by the status chip).

## 4. Class A and B in the folders I touched

None met in `Sessions`. (The row count and the Back delay were the defect, section 1.)

## What I changed in the local data

On the Android phone: two printers added (a Star by IP, a generic by address) and both **removed**; `BLUETOOTH_CONNECT` granted with `adb pm grant` for one search and **revoked** (that kills the app process; it was relaunched and logged in again, on the Orders tab at the end). One more app session on each device (relaunches; no session deleted). Nothing else: no message sent, no order changed, no profile change.

## What I did not see / verify

- iOS timings of Sessions (not measured) and the number of rows mounted there (not counted).
- The Epson LAN search without the Bluetooth permission on the native side (the library asks first; whether the native ePOS discovery needs it is not known), a real LAN or Bluetooth printer, a real print, the Android 17 local-network permission (observed message only).
- A tablet (the layout code did not change; the tablet test of the suite passes).
- The numbers are from a loaded host with a Debug build: the ratio (about 8x on the opening, about 10x on Back) is the finding, not the seconds.
