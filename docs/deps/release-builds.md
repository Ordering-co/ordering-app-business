# Release builds: Android and iOS, built, installed, opened

Two rounds, newest first: "Final Release builds" (2026-11-20, the code of `e70aa4a`) and "First Release builds" (2026-11-19, `da4aebd`, kept whole below).

## Final Release builds (commit `e70aa4a`, 2026-11-20)

Branch `feature/theming-native` in the main checkout. The code built is that of `e70aa4a` (the tip when I started); while I worked the tip moved to `b9d476e`, a
commit that changes only `docs/` (`git diff --stat e70aa4a b9d476e`: six `.md` files), so the binaries hold the same code. Nothing under `src/`, `android/`,
`ios/` or `package.json` was changed, no `pnpm install`, no `pod install` (`ios/Pods` was already there), no test or lint run, `src/config.json` left as the
developer's local copy (not staged). `<scratchpad>` = `/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad`;
screenshots in `<scratchpad>/release2/android/` and `<scratchpad>/release2/ios/`, every one opened. **Screenshots whose file name ends `SHOWS-EMAIL` show the
test account's e-mail (Login, Profile, Language sheet) and must never be committed.** The account was typed into the app only.

### Machine, and what went wrong with it

Same machine as the first round (Apple M5 Pro, 24 GB, Xcode 27.2, Android Studio's JBR 25, Gradle 9.4.1, pnpm, Homebrew `pod`), **shared and heavily loaded this
time**: other sessions ran vitest workers and two other emulators. Load averages (1 / 5 / 15 min) are given with each timing. Two consequences:

- **The phone emulator hung and killed itself.** At 08:34, with the host at a load of 55 to 77, `OBizTest` (`emulator-5556`) stopped answering `adb shell` (a binder call
  in its system server took 72 s, `screencap` and `uiautomator dump` hung); at 09:15 the emulator's own hang detector aborted the process (crash report
  `~/Library/Logs/DiagnosticReports/qemu-system-aarch64-2026-11-20-091628.ips`, `HangDetector` in the stack). It was not the app: the app was idle on Orders, the
  logcat of that window has no error of the app. I started the same AVD again with the flags of its `emu-launch-params.txt`
  (`emulator -avd OBizTest -port 5556 -no-snapshot -no-audio -no-boot-anim`, boot 18 s at a load of 29), put `reverse tcp:8080` back, and the Release app was still
  installed **and still signed in** (the data is on the disk image). Everything measured on the phone after that point is from the second boot, at a load of 7 to 12.
- The iOS build (33 minutes) ran at a load of 41 to 77, so its duration is not comparable with the first round's 119 s.

### What I had to supply by hand

The same as in "What I had to supply by hand" of the first round below, and nothing more: the untracked `ios/.xcode.env.local` (Node), `JAVA_HOME` and `ANDROID_HOME`, `DEVELOPER_DIR`, Homebrew `pod` (not run: `ios/Pods` was current), the developer's own
`src/config.json` (local API) and the submodule pointer as they stand in the working tree (both show as modified in `git status` and are not part of any commit of mine).

## Android

### Build

```
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ANDROID_HOME=$HOME/Library/Android/sdk
rm -rf build app/build app/.cxx
./gradlew assembleRelease     # BUILD SUCCESSFUL in 5 m 48 s (349 s), 1264 tasks: 1186 executed, 78 up-to-date. Load 5.3 / 11.5 / 16.2 at the start, 31 / 47 / 34 at the end
./gradlew bundleRelease       # BUILD SUCCESSFUL in 10 s (1182 tasks: 42 executed)
```

(`rm -rf app/build` also removed the Debug APK that was in `app/build/outputs/apk/debug`: see "End state".)

| | now | first round (`da4aebd`) |
|---|---|---|
| assemble | 5 m 48 s, 1186 of 1264 tasks executed (a full build of every module) | 5 m 26 s, 237 executed (library outputs were kept) |
| bundle | 10 s | 10 s |
| `app-release.apk` | **172,540,443 bytes (164.5 MB)** | 172,527,011 |
| `app-release.aab` | 91,466,659 bytes | 91,458,660 |
| `assets/index.android.bundle` in the APK | **7,240,240 bytes (6.9 MB), Hermes bytecode** (magic `c61fbc03c103191f`) | 7,226,808 |
| native libraries | 104 `.so` entries (four ABIs) | four ABIs |

Signed with `signingConfigs.debug` (the committed debug keystore), as `android/app/build.gradle` says; no production keystore touched. Warnings that name the app's own code:
**one**, `MainActivity.kt:62:7` `DefaultReactActivityDelegate(activity, mainComponentName, fabricEnabled)` is deprecated (the same as the first round). The rest are libraries
(`react-native-permissions`, `react-native-bootsplash` `TurboReactPackage`, `react-native-html-to-pdf`, `react-native-notify-kit`, `netinfo` `onCatalystInstanceDestroy`).

### Manifest of the Release APK (`aapt2 dump badging` and `dump permissions`, build tools 37.0.0)

- package `co.ordering.business`, versionCode 1, versionName 1.0, `minSdk` 29, **targetSdk 36**, compileSdk 37, label `OBusiness`, launcher `co.ordering.business.MainActivity`.
- Permissions: `INTERNET`, `POST_NOTIFICATIONS`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `BLUETOOTH` and `BLUETOOTH_ADMIN` (max SDK 30), `BLUETOOTH_ADVERTISE`,
  `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN` (`neverForLocation`), `WAKE_LOCK`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `RECEIVE_BOOT_COMPLETED`, `VIBRATE`,
  `FOREGROUND_SERVICE`, `SCHEDULE_EXACT_ALARM`, `ACCESS_NOTIFICATION_POLICY`, `BROADCAST_CLOSE_SYSTEM_DIALOGS` (max SDK 30), the push and the launcher-badge ones (`c2dm`, Samsung, HTC,
  Sony, Huawei, OPPO...). **No `SYSTEM_ALERT_WINDOW`.**
- **`android.permission.ACCESS_LOCAL_NETWORK` is NOT declared by the Release APK** (`aapt2 dump permissions` lists 18 `android.permission.*` entries and it is not one of them; the
  app's own manifest does not have it). This **confirms** the earlier round's conclusion: it comes only from React Native's debug manifest
  (`ReactAndroid/src/debug/AndroidManifest.xml`, to reach Metro).
- What the device says when the Release APK is installed (`dumpsys package co.ordering.business` on API 37): the package's *requested permissions* list does carry
  `ACCESS_LOCAL_NETWORK` and the runtime list shows it **`granted=true`** with no dialog. That is the platform's implicit grant for an app that targets below 37 and holds `INTERNET`, as
  the correction in [android-native.md](android-native.md) section 9 describes; nothing in the app asks for it. Android 17's "nearby devices" dialog at the first launch did **not**
  appear in the Release app (as in the first round).

### Install and first run

`adb -s emulator-5556 install -r app-release.apk` over the Debug app: **Success, no uninstall needed** (same debug-keystore signature). `pm clear co.ordering.business`, `reverse --remove tcp:8097`
(only `tcp:8080` stayed: **the Release app ran every test below with no Metro reverse**, also after the emulator's restart, which has no reverse at all but 8080), launch, sign in by typing the account.
Login screen `android/01-first.png`: Poppins, store logo tile, "Manage your business", fields, blue "Log in", "Email me a login code", language pill, "Version 1.0", no red or yellow box. After the sign-in
the "Turn on order alerts" sheet came up (`not now` tapped), then the list.

### Measurements, side by side

Release = this round on `emulator-5556` (phone, 1080 x 2400, 420 dpi = 2.625 px/dp, API 37, the AVD's `hw.gpu.mode=auto`, `ro.hardware.egl=emulation`). "First round" = `release-builds.md` below
(**a different AVD**, the tablet `emulator-5558`, headless). "Debug" = [fix-round4-android.md](../theme/verification/fix-round4-android.md), [fix-round5.md](../theme/verification/fix-round5.md), [android.md](../theme/verification/android.md) (this phone, Metro).

| What | Release now (phone) | First Release round (tablet) | Debug (phone) |
|---|---|---|---|
| Cold start to the orders list drawn (saved session; `force-stop`, `am start`, then `screencap` polled from the host) | **5.7, 4.2, 6.7 s** (load 10 / 15.7 / 29.5, 12 / 16 / 29, 12 / 15.9 / 29). A frame timeline of one more start (`android/15-cold-start-timeline.png`): the bootsplash is on screen until about +4.3 s, the list at +5.0 s. In the five start-and-tap runs the list was first seen at 5.3 to 8.7 s | at most 1.7 to 1.9 s (screencap loop, seven runs) | +114 s, host at load 19 |
| Resolution of that figure | one capture takes 0.4 to 1.2 s here, so each value is the first capture that showed the list, an upper bound within about 0.8 s | one capture 0.2 s | polled every 5 to 10 s |
| **Tap on Stores right after the list appears** (ANDROID2-B2), five launches | tap sent 0.4 to 0.8 s after the list was first seen; **Stores drawn 3.8, 3.5, 4.1, 3.5, 4.3 s after the tap; no tap lost in five** (the 3.5 s include the stores request: the cards show their toggles only with data, and a capture polls at 0.5 to 0.8 s) | not measured | answered 7 s later, none lost (one run, load 19) |
| Profile to Sessions (100+ rows), tap to the list drawn | **at most 3.5 s** (3.5, 3.3, 3.6 s, load 7 / 18 / 32); the figure is one `uiautomator dump` (2.7 s each on this device) after the tap, so the list was already drawn at the first look | not opened | 11.7 to 13.0 s after the FlatList fix (102.6 s before it) |
| **Back pressed 1.1 to 1.4 s after the tap on Sessions** (ANDROID2-B1), three times | **returned to Profile every time, none left the app: Profile seen 3.1, 2.8, 3.1 s after the press** (one dump, 2.7 s, is inside that, so the real delay is under that) | not tried | 4.6 s (Back at 2 s); 49.3 s before the fix |
| JS thread `mqt_v_js` at rest on Orders (`/proc/<pid>/task/<tid>/stat`, three windows of 10 s) | **1.2 %, 1.0 %, 5.6 %** of one core (the 5.6 is a refresh burst); the whole process 2.7 %, 2.1 %, 9.9 %. `top -H` samples: 3.2, 0.9, 0.0 % | 0.9, 2.3, 1.6 % | 3.4 % at rest after the A1 fix; 90 to 100 % before it |
| JS thread while swiping the list (12 s, 12 swipes) | 15.7 % of a core (188 ticks of 1200); process about 70 % | not measured | not measured |
| `dumpsys gfxinfo` after the swipes, two runs (16 swipes each) | **116 frames, 111 janky (95.7 %)**, p50 150 ms, p90 200, p95 300, p99 350, 89 slow UI thread, 111 slow "issue draw commands"; second run **142 frames, 139 janky (97.9 %)**, p50 113 ms, p90 150, p99 200 | 262 frames, 117 janky (44.7 %), p50 42 ms | 97 % janky ([android.md](../theme/verification/android.md), JS thread at 90 to 100 %) |
| Tab bar height (`uiautomator dump`) | **2169 to 2337 px = 168 px = 64.0 dp** (labels end 26 px = 10 dp above the bar's bottom) | n/a (tablet rail) | 83.8 dp before fix round 4, 64 dp after |
| Memory, `top` | RES 331 to 343 MB | PSS 193 to 247 MB | 0.8 to 1.6 GB (tablet) |

**How to read the janky frames.** On this phone AVD the Release app is **not** better than Debug by this counter (96 to 98 % against 97 %), although the JS thread is 1 to 6 % at rest and 16 % while scrolling,
where Debug had it at 90 to 100 %. Every frame is counted "slow issue draw commands" (111 of 116, 139 of 142): the time goes to the draw / GPU side of an emulated GPU (`ro.hardware.egl=emulation`, "Guest Angle is still
unstable for API > 35" in the emulator's own log) rendering 1080 x 2400, with taps injected by `input swipe` (a new process each). The first round's 44.7 % came from a different AVD, so the two figures are not a regression
or a gain of the code: **the frame rate of a real phone is not known from any of these numbers.**

### What each screen showed (Release, phone, portrait)

| Screen | Screenshot | What it showed |
|---|---|---|
| Login | `01-first.png`; `02-login-filled-SHOWS-EMAIL.png` | as above. Typing the account with `input text`: the first attempt put the password into the e-mail field (the second tap landed before the layout moved), the form said "Invalid email address" and "The field Password is required" in red: validation works, the typing was mine |
| After sign-in | `03-after-login-SHOWS-EMAIL.png` | the "Turn on order alerts" sheet (Turn on notifications / Not now) over the list |
| Orders, New | `04-orders-list.png`, `11-after-restart.png`, `23-final-state.png` | header, pill "Live" (after a fresh sign-in) or "Reconnecting" (after a cold start, the socket of this local setup), search, tabs New 14+ / In progress 36+ / History, cards with Reject / Accept, tab bar with badges 14+ and 53+ |
| Orders, scrolled | `16-orders-after-scroll.png` | the list scrolled under the sticky header and tabs, every card complete |
| An order's details | `05-order-details.png` | #4193: back, print, more, Pending and Delivery chips, the clock, customer card with call and message buttons (1 unread), address, two products, totals, Paid, "More details", Reject / Accept bar |
| Accept sheet, opened and closed | `06-accept-sheet.png`, `07-after-sheet-closed.png` | "Accept order #4193": preparation time presets 10 to 45, 20 min with minus / plus, "Ready by", "Accept · 20 min". Closed with its X, **nothing accepted**; the details were still there |
| Messages | `08-messages.png` | All / Unread 34+, rows with status chips and counters |
| Stores | `09-stores.png`, `old/tapfail-1795185723.png` (a second view) | store cards with open / accepting toggles |
| A store's menu | `10-store-menu.png`, `10b-store-menu-loaded.png` | the skeleton for about 8 s (a first request), then Twirly Laundry: category chips (All, Laundry 17, Wash & Fold 3, Repair...), sections with products, images, switches |
| Profile | `11-profile-SHOWS-EMAIL.png` | account card, Personal information, Password, Sessions, Printers, Alerts and sound, Language (English), About (version 1.0), Log out |
| Language sheet | `12-language-sheet-SHOWS-EMAIL.png` | English (checked), Deutsch, Español, Español (Mexico), Español (La - Guatemala), Dansk, Nederlands, Português, Català, Français, Türkçe: **native names**, the sheet reaches the bottom edge |
| Sessions | `13-sessions-check.png`, `14-sessions.png` | "This device" card (Android · this phone, Started 20/11/2026 08:23 AM, Current), "Other devices" rows with outlined "Sign out", the bar "Sign out of all other devices"; dates readable |
| Printers (none) | `17-printers.png` | "No printers yet", Add printer, "Without a printer you can still share any ticket as a PDF." |
| Add printer, step 1 | `18-printer-step1.png` | Star / Epson / Other (ESC/POS), Wi-Fi or LAN selected, paper 80 / 58 mm, the notice, "Find printers" |
| Add printer, step 2 | `19-find-1-dialog.png`, `20-find-2-after-grant.png`, `21-find-epson.png`, `22-find-epson-after.png` | see the next section |
| Cold start | `15-cold-start-timeline.png` | one row of frames from the launch: the Ordering bootsplash, then the list |

### The LAN printer search in Release (the point of the round)

Star + Wi-Fi or LAN, "Find printers", permissions at the start: `BLUETOOTH_CONNECT` and `BLUETOOTH_SCAN` not granted, `ACCESS_LOCAL_NETWORK` implicitly granted.

1. It asks for **the Bluetooth permission first**, as known: the system's grant activity opened for `BLUETOOTH_CONNECT` and closed after 0.25 s (`GrantPermissionsViewModel: Permission grant result ... BLUETOOTH_CONNECT ... result=5`); I did not tap
   it, the emulator closed it by itself, and `dumpsys` afterwards shows `BLUETOOTH_CONNECT granted=true` (`USER_SET`). (The earlier round saw `result=2`, a refusal, with the same dialog.) So the grant was "given" without me.
2. Step 2 shows "Looking for printers..." and ends with **"No printers found"** and the link "Enter the IP address instead" (`19`, `20`; a second search with "Search again", watched for 20 s: the same). **The Release build does not end with
   "Local network access is not permitted."**, the text the Debug build ended with after the grant. That fits the table above: Debug declares the permission (React Native's debug manifest) so it is not implicitly granted and a dismissed dialog
   leaves it refused; Release does not declare it and holds it implicitly. (Not proven by a Debug run in this round; no printer exists on this LAN either, so "No printers found" is also the right answer.)
3. Epson + Wi-Fi or LAN: the library also requested `BLUETOOTH_SCAN` (granted the same way), and **Google's own "Location Accuracy" dialog ("For a better experience, your device will need to use Location Accuracy", No thanks / Turn on) came up
   over the "Looking for printers..." step** (`21-find-epson.png`); dismissed with Back, the step ended with "No printers found" (`22`). That dialog is the Play services' location prompt for a nearby-devices scan, not the app's; new in this report.
4. Afterwards I ran `pm revoke` for `BLUETOOTH_CONNECT` and `BLUETOOTH_SCAN` (both `granted=false`; the `USER_SET` flag of the two stays on the package) and **no printer was saved**.

### Logcat (two files: `<scratchpad>/release2/logcat-all.txt`, 08:20 to 08:34, and `logcat-all2.txt`, from 09:29)

- **No `FATAL EXCEPTION` of the app, no ANR of the app, no process death other than my own `force-stop`s, no `ReactNativeJS` error or warning** (one `Running "businessApp"` line per start). The second file holds 115 `FATAL EXCEPTION` lines: **every one is the `uiautomator`
  process** (`IllegalStateException: UiAutomationService ... already registered!`, pids 4051 and the like) from two of my dump calls overlapping; none is `co.ordering.business`.
- Errors of the app's own surroundings, the same as the first round: `FirebaseSessions: Error failed to fetch the remote configs: Bad response code: 404` and `FirebaseMessaging: FCM Registration failed!` (the Firebase file is a placeholder), `OneSignal: Cannot add invalid sms number as subscription: +57 ...`
  (the test user's phone has a space).
- `Choreographer: Skipped 35 / 66 / 84 frames` and `HWUI Davey! duration=861 / 1241 ms` came from pids 905 and 1037 (the launcher and the system UI), not from the app.

## iOS

### Build

```
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
cd ios
xcodebuild -workspace OBusiness.xcworkspace -scheme OBusiness -configuration Release -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,id=E1068CF1-C4DA-4EF9-BDDE-1ECC77A89107' \
  -derivedDataPath <scratchpad>/release2/ios-dd build
```

| | now | first round |
|---|---|---|
| result | **BUILD SUCCEEDED in 1992 s (33 m 12 s)**; load 58 / 68 / 61 at the start, 41 to 77 during (other sessions' test runs) | 119 s on a quiet machine |
| `OBusiness.app` | **152 MB** (`du -sh`), executable 87,325,248 bytes (`x86_64 arm64`) | 152 MB, 87,330,336 |
| `main.jsbundle` | **8,916,513 bytes (8.5 MB), Hermes bytecode** (same magic as Android) | 8,896,332 |
| notification extension | `PlugIns/OneSignalNotificationServiceExtension.appex`, 144 KB | 144 KB |
| warnings | 2,511 in all; the one that names the app's code: `ios/OBusiness/AppDelegate.swift:126:39` `'RCTRootView' is deprecated: This API will be removed along with the legacy architecture` | the same |

Bundle id `co.ordering.business`, display name `OBusiness`. Simulator build, no signing. Installed on `OBizRelease` (`E1068CF1-...`, booted by me, shut down at the end): `simctl install`, `simctl launch`. **The simulator was still signed in** (its data
from the first round), so I did not sign in again. Driving: `idb` (its companion for this simulator lost its HID connection once and I restarted that one companion, pid of this UDID only) and `simctl io screenshot`.

### Measurements

| What | iOS Release now | First round | Debug |
|---|---|---|---|
| Cold start to the orders list (`simctl terminate`, `launch`, screenshot polled, about 0.5 s each) | **5.2, 4.5, 3.2 s** (load 70 / 29 / 26 at the first, 51 / 28 / 25 at the end) | 3.3 to 4.0 s login, 2.3 to 3.8 s list | not measured |
| Sessions, tap to the list | **drawn in the first screenshot after the tap (0.3 to 0.8 s) all three times**; Back returned to Profile each time | not opened | seen, not measured ([fix-round5.md](../theme/verification/fix-round5.md)) |
| CPU at rest on Orders (`ps -o time=`, three windows of 20 s) | **1.6, 1.8, 1.6 % of one core** (0.31, 0.37, 0.31 CPU-seconds) | 2.3, 2.0, 2.1 % | not measured |
| Memory | physical footprint **198.7 MB** (peak 199.3 MB), RSS 387 MB | 178.1 MB (peak 183.1) | n/a |
| Tab bar | seen: the bar's top at about y = 778 pt of 874 (64 pt of bar plus the home-indicator inset); not measured to the point | n/a | n/a |

### What each screen showed (iPhone 17 Pro, portrait)

| Screen | Screenshot | What it showed |
|---|---|---|
| Orders | `01-first-launch.png`, `02-orders-list.png`, `12-orders-final.png` | the list at once, pill "Reconnecting", tabs, cards, tab bar with the home-indicator space under it |
| Order's details | `03-order-details.png` | #4193 as on Android; Reject / Accept bar |
| Accept sheet | `04-accept-sheet.png`, `05-after-sheet-closed.png` | the same sheet ("Ready by 10:11 AM"), closed with X, nothing accepted |
| Messages | `06-messages.png` | All / Unread 34+, rows with chips, counters |
| Stores, a menu | `07-stores.png`, `08-store-menu.png` | store cards; Twirly Laundry with chips and products (loaded within 9 s) |
| Profile | `09-profile-SHOWS-EMAIL.png` | the rows as on Android; Log out is below the tab bar, one scroll away |
| Language sheet | `10-language-sheet-SHOWS-EMAIL.png` | native names, English checked |
| Sessions | `11-sessions.png` | "This device" (iPhone · this phone, Current) and 100+ "Other devices" rows with "Sign out", the bar "Sign out of all other devices" |

### Device log (`simctl spawn ... log show --last 12m --predicate 'process == "OBusiness"'`, 14,586 lines)

- **No crash, no exception, no crash report** in `~/Library/Logs/DiagnosticReports` for `OBusiness`, no JS error line.
- Errors (all noise or configuration): `-[UIApplication statusBarStyle] API has been deprecated and is a no-op on 27.0 and later` (**about 240 times in 12 minutes**, every status-bar update: a React Native `StatusBar` call, not seen in the first round's list),
  `coreanimation cannot add handler to 0 from 0 - dropping` (about 215), `RCTScrollViewComponentView implements focusItemsInRect`, `nw_connection ... has no local endpoint`, CoreTelephony XPC, and the placeholder Firebase file
  (`FirebaseInstallations ... registration failed`, `FirebaseCrashlytics ... Failed to download settings`, `FirebaseSessions ... JSONParseError`).

## End state

- **Android phone `emulator-5556`: the Release app is installed and signed in, open on Orders. The Debug app is no longer on this phone** (the Release APK replaced it with `install -r`, and `pm clear` removed its data and its `debug_http_host`
  preference). `reverse tcp:8097 tcp:8097` and `tcp:8080` are in place. `BLUETOOTH_CONNECT` and `BLUETOOTH_SCAN` revoked. No printer saved. The emulator was restarted once (see above), with the same flags.
- iOS `OBizRelease`: shut down. Its derived data is `<scratchpad>/release2/ios-dd` (the Debug build's folder `ios/build/dd-debug` was not touched).
- **To put the Debug app back on the phone** (my `rm -rf android/app/build` removed the old Debug APK, so it has to be built again; never `installDebug`, it installs on every attached device):
  ```
  cd android && export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ANDROID_HOME=$HOME/Library/Android/sdk
  ./gradlew assembleDebug
  A="$HOME/Library/Android/sdk/platform-tools/adb -s emulator-5556"
  $A install -r app/build/outputs/apk/debug/app-debug.apk        # same signature: no uninstall
  $A shell pm clear co.ordering.business
  $A reverse tcp:8097 tcp:8097 ; $A reverse tcp:8080 tcp:8080
  $A shell "run-as co.ordering.business ..."   # then write localhost:8097 as debug_http_host (android-native.md sections 5 and 10)
  ```
  (the `debug_http_host` step is the one of [android-native.md](android-native.md) section 10: launch once, then set the preference to `localhost:8097` in `shared_prefs/co.ordering.business_preferences.xml`, and launch again).

## What I did not see

- A real phone: all the frame-rate, start-up and tap figures are from emulators on a loaded host; the janky-frame count is dominated by an emulated GPU and says nothing about a real device. A Release build **on the quiet host** of the first round was not repeated for the phone.
- A Debug LAN search on this phone for the same step (the Debug result is the earlier report's, not re-run), and any real printer (Star, Epson, generic), Bluetooth discovery, a printer saved, a test print.
- Push, the order alarm sound, the iOS extension, the notification explainer on iOS, iPad, landscape, tablets, Android 14 and earlier, a store-signed build (archive, profile, Play pre-launch report), the `.aab` installed.
- Accept, reject, adjust time, assign driver, chat send, product or store switches, Sign out (deliberately not touched); History, search, Personal information, Password, Alerts and sound, Ticket settings.
- The tap-after-launch test measures the Stores screen's data appearing (cards with toggles), not the first frame of the tab change; the tab label turning blue earlier was not timed.
- The hang of the phone emulator at 08:34 is explained by the host (its own hang detector), not reproduced; I did not look for an app cause beyond its idle state and an empty error log in that window.
- Nothing of iOS Sessions' number of mounted rows (the accessibility tree does not list the row ids).

---

## First Release builds (`da4aebd`, 2026-11-19)

### Release builds: Android and iOS, built, installed, opened (2026-11-19)

Branch `upgrade/native`, worktree `ordering-app-business-theming-native`, at the commit of the main branch (`da4aebd`). Nothing under `android/`,
`ios/`, `package.json` or `src/` was changed. The only local-only changes are listed in "What I had to supply by hand". Screenshots are in
`<scratchpad>/release/android/` and `<scratchpad>/release/ios/` (`<scratchpad>` =
`/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad`), every one opened and looked at.
The test account was typed into the app only and is not written here.

### Machine and tools

Apple M5 Pro, 24 GB, macOS 27.2.1 (26B131), shared with other agents (load average 6.8 at the start of the Android build, 25 to 30 during the
iOS one). Xcode 27.2 (27B52), iOS 27.2 simulator runtime, CocoaPods 1.17.0 (Homebrew), Node v24.20.0 (`NODE_BINARY` in the untracked
`ios/.xcode.env.local` points at Homebrew's `node@24` 24.20.0), pnpm 12.18.0. JDK: Android Studio's JBR, OpenJDK 25.0.3; Gradle 9.4.1 (wrapper);
Android build tools 37.0.0, NDK 27.1.12297006; `ANDROID_HOME=$HOME/Library/Android/sdk`. React Native 0.88.1, React 19.3.0, Hermes. Android
target: AVD `OBizTablet` (`emulator-5558`, Android 17 / API 37, arm64, 2560 x 1600 px at 320 dpi = 1280 x 800 dp, software-emulated GPU,
`ro.hardware.egl=emulation`). iOS target: a new simulator `OBizRelease` (iPhone 17 Pro, iOS 27.2, `E1068CF1-C4DA-4EF9-BDDE-1ECC77A89107`),
shut down at the end, not deleted.

### Android

#### Build

```
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ANDROID_HOME=$HOME/Library/Android/sdk
rm -rf build app/build app/.cxx          # a clean start of the app module (see the note on what stayed)
./gradlew assembleRelease                # BUILD SUCCESSFUL in 5 m 26 s (1264 tasks: 237 executed, 1027 up-to-date)
./gradlew bundleRelease                  # BUILD SUCCESSFUL in 10 s (incremental, straight after)
```

- **Duration: 5 m 26 s**, against 26 m 6 s in [android-native.md](android-native.md) section 5. Two reasons: the machine was quiet (that note was
  taken at load 60 to 130), and `rm -rf` of `android/build`, `app/build`, `app/.cxx` does not clear the library modules' own outputs under
  `node_modules/*/android/build` (that is the 1027 up-to-date tasks). The app's own four-ABI CMake build did run (`configureCMakeRelWithDebInfo`
  for the four ABIs). It is therefore not a full from-clean number.
- **Outputs.** `android/app/build/outputs/apk/release/app-release.apk` **172,527,011 bytes (164.5 MB)** (the earlier note: 192,922,942, before the
  JavaScript cleanup removed libraries). `app/build/outputs/bundle/release/app-release.aab` 91,458,660 bytes. Four ABIs in the APK
  (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`; native libraries 29.7, 20.9, 31.0 and 30.8 MB uncompressed), five `classes*.dex`, 42 TTFs under
  `assets/fonts` (40 catalog fonts + `Ionicons`, `MaterialDesignIcons`).
- **JavaScript bundle inside the APK: `assets/index.android.bundle`, 7,226,808 bytes (6.9 MB), Hermes bytecode** (magic `c61fbc03c103191f`).
- **Signed with** `signingConfigs.debug` (the committed `android/app/debug.keystore`, `CN=Android Debug`, SHA-256 `fac61745…3b9c`): the
  `release` build type in `android/app/build.gradle` says `signingConfig signingConfigs.debug`. `minifyEnabled` false
  (`enableProguardInReleaseBuilds = false`). The AAB is the same configuration. No production keystore was read, created or moved.
- `aapt2 dump badging`: package `co.ordering.business`, versionName 1.0 (code 1), `targetSdk` 36, compileSdk 37, label `OBusiness`, launcher activity
  `co.ordering.business.MainActivity`.
- **Warnings that name the app's own code (one):** `android/app/src/main/java/co/ordering/business/MainActivity.kt:62:7` `'constructor(activity:
  ReactActivity, mainComponentName: String, fabricEnabled: Boolean): DefaultReactActivityDelegate' is deprecated. Creating
  DefaultReactActivityDelegate with flags is deprecated.` The rest are libraries (`react-native-notify-kit` Kotlin deprecations, the
  `package=` attribute in the manifests of `react-native-print` and `react-native-star-io10`, an unchecked-operations note in
  `react-native-ble-plx`) and "Deprecated Gradle features were used in this build, making it incompatible with Gradle 10".

#### Install and run

`adb -s emulator-5558 install -r app-release.apk` worked over the Debug app: the signatures are **the same** (both use the debug keystore), so no
uninstall was needed. I then ran `pm clear co.ordering.business` so that the Release app started from nothing (nothing from the Debug app was
kept), `reverse tcp:8080 tcp:8080` (and removed `tcp:8097`, put back at the end). Rotation: `accelerometer_rotation 0`, `user_rotation 1` / `0`.

#### What I saw, screen by screen (landscape 1280 x 800 dp unless said)

| Screen | Screenshot | What it showed |
|---|---|---|
| Bootsplash | `01-splash-or-first.png` | white, the Ordering wordmark centred, no red or yellow box |
| Login | `03-after8s.png`, `04-login-filled.png` | Poppins everywhere, the store logo tile, "Manage your business", fields 48, blue "Log in" 50, "Email me a login code", language pill top right, "Version 1.0". No red or yellow box. With the soft keyboard open the Log in button is **covered** (the keyboard's check key, or Enter, submits): the same as TAB-B1 of the Debug report |
| Order alerts explainer | `05-after-enter-1.png`, `18-first-signin-explainer.png` | "Turn on order alerts" dialog, 440 dp wide, centred, over the board; "Not now" worked (`19-after-not-now.png`) |
| Orders board | `06-cold-start-board.png`, `07-board.png`, `17-back-landscape-board.png` | side rail 80 dp (Orders, Messages, Stores, Profile with badges), header, "All stores", live pill, History, search; three columns NEW 59+, PREPARING 32+, READY 9+ with cards, Reject / Accept / Mark ready. Pill "Live" after a fresh sign-in, "Reconnecting" after a cold start with a session |
| One order's panel | `08-order-panel.png` | order #4467 as a right-hand panel of about 437 dp over the board: status, customer, address, product, totals, "More details", Reject / Accept footer. I did not accept anything |
| "More" sheet as a centred dialog | `09-order-more-sheet.png` | 480 dp dialog: Print ticket, Copy order details, View on map, Message customer, Call customer, Share as PDF. Android's back key closed it and left the panel open (`09b-after-back.png`) |
| Messages | `10-messages.png` | two panes: list 360 dp (All / Unread 32+, rows with status chips and counts), right pane "Select a conversation" |
| Stores | `11-stores.png` | left pane the store cards with the open / accepting toggles, **right pane the menu of the first store (Twirly Laundry)** with category chips, products, images, toggles. Loaded within 4 s |
| Profile | `12-profile.png` | centred column: account card, Personal information, Password, Sessions, Printers, Alerts and sound, Language (English), About (version 1.0), Log out |
| Portrait | `13` to `16` | `user_rotation 1` gave the phone layout in a centred column (tab bar at the bottom: Orders, Messages, Stores, Profile; New / In progress / History tabs); the activity was not restarted; back to landscape the board was painted 1.2 s after `user_rotation 0` (`17`) |

Not opened on Android in this run: Notifications / Alerts and sound, Printers, Sessions, History, search, the Accept / Reject / adjust-time sheets
(nothing was accepted or changed), a chat thread.

#### Measures (Release, `emulator-5558`)

- **Cold start**, `adb shell am start -W`, TotalTime to the first frame (the bootsplash): 496, 325, 290, 558, 283, 290, 260, 456 ms (first start after
  install and later ones). To the login screen painted (a screenshot loop on the "Log in" button, then the 1.7 s first frame of the loop): **at most
  1.7 to 1.9 s** in three runs. To the orders board with a saved session, the same loop: **at most 1.7 to 1.9 s** in seven runs (the board is painted from the
  offline copy; the live pill says "Reconnecting" for a while). From the Enter key of the sign-in form to the board with the explainer on top: under
  1.5 s. These are upper bounds: one `screencap` takes 0.2 s here and the first one of each run 1.7 s while the app starts. `ReactNativeJS: Running
  "businessApp"` was logged about 0.23 s after the intent.
- **JS thread at rest on the board** (thread `mqt_v_js`, `/proc/<pid>/task/<tid>/stat`, three windows of 10 s): 0.9 %, 2.3 % and 1.6 % of one core.
  `top -H` single samples showed it at 0 % (twice) and once at 52 % together with OkHttp / IPC threads (a burst of network work: the periodic
  refresh or the socket reconnect), 28 % in the heap daemon at the same moment.
- **`dumpsys gfxinfo` after about 12 s of swipes on the NEW column** (16 swipes up and down): 262 frames, **117 janky (44.66 %)**, legacy janky
  82.8 %, p50 42 ms, p90 57 ms, p95 61 ms, p99 77 ms, 51 slow UI thread, 116 slow "issue draw commands", GPU p50 22 ms. The numbers come from
  an emulator with an emulated GPU at 2560 x 1600: the frame time is dominated by the draw and GPU side, not by the JS thread (0 to 2 % at rest).
  Read them as an upper bound for a real tablet, not as a measure of one.
- **Memory** (`dumpsys meminfo`): total PSS 193 MB right after a fresh start and sign-in, **247 MB after the scrolling**; RSS 344 to 399 MB; native heap
  88 MB, Java heap 25 to 32 MB.
- **`adb logcat`**: **no `FATAL EXCEPTION`, no ANR, no process death, no `ReactNativeJS` error or warning** in the whole run (the only
  `ReactNativeJS` line per start is `Running "businessApp"`). Errors in the log, all of them configuration or data, none a crash: see "Errors and
  warnings of the app's own code".

### iOS

#### Build

```
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer      # xcode-select points at the Command Line Tools on this machine
cd ios && pod install                                                  # Homebrew pod 1.17.0; Pods/ was stale; Podfile.lock unchanged; 53 s
xcrun simctl create OBizRelease "iPhone 17 Pro" com.apple.CoreSimulator.SimRuntime.iOS-27-2
xcodebuild -workspace OBusiness.xcworkspace -scheme OBusiness -configuration Release -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,id=E1068CF1-C4DA-4EF9-BDDE-1ECC77A89107' \
  -derivedDataPath <scratchpad>/release/ios-dd build
```

- **Result: BUILD SUCCEEDED in 119 s** (against 743 s in [ios-native.md](ios-native.md) section 7: a quieter machine, and a fresh derived-data folder
  that still had Xcode's module cache). The Release configuration builds both simulator architectures (`x86_64 arm64`).
- `OBusiness.app`: **152 MB** on disk (`du -sh`), executable `OBusiness` 87,330,336 bytes (universal), **`main.jsbundle` 8,896,332 bytes (8.5 MB),
  Hermes bytecode** (same magic as Android), the notification service extension 144 KB in `PlugIns/`. The earlier note: 183 MB, bundle 9.7 MB.
- Simulator build: no signing was asked for or used. (Not tried: an archive for a device.)
- **Warnings that name the app's own code (one):** `ios/OBusiness/AppDelegate.swift:126:39: warning: 'RCTRootView' is deprecated: This API
  will be removed along with the legacy architecture.` Besides it: 42 linker warnings of the `OBusiness` target, `ld: warning: search path
  '<derived data>/Build/Products/Release-iphonesimulator/<Pod>' not found` (pods that produce no product folder: harmless), a "Run script build phase … will
  be run during every build because it does not specify any outputs" for `react-native-maps`, and about 2,500 warnings of libraries (maps, firebase,
  webview, sentry, gesture-handler, esc-pos-printer, …).

#### Install and run

`xcrun simctl boot`, `simctl install`, `simctl launch`; driven with `idb` (the accessibility tree and taps in points) and `simctl io screenshot`.

#### What I saw, screen by screen (iPhone 17 Pro, portrait)

| Screen | Screenshot | What it showed |
|---|---|---|
| Bootsplash | `01-launch-00-t1.34.png`, `01-launch-03-t4.59.png` | white, the Ordering wordmark centred |
| Login | `01-launch-11-t12.18.png` | same as Android: Poppins, "Manage your business", fields, blue Log in, "Version 1.0" |
| Login with the keyboard | `02-login-filled-keyboard.png`, `02c-state.png` | the keyboard stops just under the Log in button (it is visible); a first attempt typed by `idb` lost the end of the e-mail and the form said "Invalid email address" in red (`03-signin-4.png`): the validation works; the typing tool dropped characters, not the app |
| System "Save Password?" sheet | `03-signin-5.png` | iOS's own sheet after the sign-in ("Not Now" tapped), the board behind already painted with the "Live" pill |
| Orders list | `04-orders-list.png` | header "Orders", live pill, search, tabs New 21+ / In progress 29+ / History, cards with Reject / Accept, tab bar with badges |
| Order's details | `05-order-details.png` | back arrow, print, ⋮, status chips, customer with call and message buttons, address, product, totals, "More details", Reject / Accept footer |
| Action sheet | `06-order-more-sheet.png` | bottom sheet "Order #4467" with the six actions (not used) |
| Messages | `07-messages.png` | All / Unread 33+, conversations with status chips and counters |
| Stores | `08-stores.png` | store cards with toggles |
| A store's menu | `09-store-menu.png` | Twirly Laundry: category chips, products with images and switches |
| Profile | `10-profile.png` | account card and the rows as on Android |
| Alerts and sound | `11-alerts-and-sound.png` | amber banner "Notifications are off for this device." + "Open settings", New order alert "Always on", Ring until opened, Vibrate, sound Bell / Chime / Kitchen alarm (loud), "Send a test alert" |
| Test alert | `12-test-alert.png` | bottom sheet "1 new order", "Test order · Delivery", "Ringing until you open or accept them.", Mute, Close (no Accept button on the test order) |
| Printers (empty) | `13-printers.png` | "No printers yet", Add printer, PDF note |
| Add printer, step 1 | `14-printer-setup.png` | brand Star / Epson / Other, Wi-Fi or LAN / Bluetooth, paper 80 / 58 mm, Find printers |
| Add printer, step 2 | `15-printer-find.png` | after "Find printers" with Star + LAN: "No printers found" after the scan, "Enter the IP address instead", name field, disabled Test print and Save printer. The native Star module ran in Release with no crash (nothing to find on a simulator) |
| Cold start with a session | `16-after-cold-starts.png` | the orders list, pill "Reconnecting" |

Not seen on iOS: the notification explainer ("Turn on order alerts") never appeared after the sign-in in this run (Android showed it), although the
Alerts screen says notifications are off; not investigated. The sound itself, a real push, the iPad and landscape were not tried.

#### Measures (Release, simulator)

- **Cold start:** the bootsplash is up when `simctl launch` returns (0.2 s). Login screen painted: 3.3 to 4.0 s after the launch call (three runs, a
  screenshot loop of about 0.5 s per frame; 6 to 7 s on the very first launch after install). Orders list painted with a session: 2.3 to 3.8 s
  (two runs; a third was missed by my pixel test, the list was there at the end).
- **CPU at rest on the orders list** (cumulative CPU time of the process, `ps -o time=`, three windows, 6 s, 6 s and 20 s): 2.3 %, 2.0 % and 2.1 % of one
  core. (`ps -o pcpu=` printed 1.1, 2.2, 2.4: it is a lifetime average.)
- **Memory:** physical footprint 178.1 MB (peak 183.1 MB, `vmmap -summary`); resident size 425 to 513 MB (a simulator counts shared frameworks).
- **Simulator log** (`simctl spawn … log show --last 15m`, process `OBusiness`): no crash, no exception, no crash report in
  `~/Library/Logs/DiagnosticReports`. Errors are all noise or configuration: 63 `CHHapticPattern` / `hapticpatternlibrary.plist` errors (a simulator has
  no haptics), CoreTelephony XPC, StoreKit and `com.apple.linguisticdata` asset errors (simulator), `FirebaseCrashlytics … Failed to download
  settings` at every launch, and `OneSignalCore ERROR` once each for the property update (HTTP 404) and the subscription create (HTTP 400).

### Errors and warnings of the app's own code (runtime)

1. **Firebase config is a placeholder (Android and iOS).** Android: `Firebase-Installations … 400 … API key not valid` on every launch, then
   `FirebaseMessaging: Failed to get FIS auth token`; iOS: `Crashlytics … Failed to download settings`. Expected: only `package_name` / `BUNDLE_ID`
   were changed in the committed Firebase files ([android-native.md](android-native.md) section 8, [ios-native.md](ios-native.md) section 8).
2. **OneSignal.** Android before the sign-in: `suspendInitInternal: no appId provided or found in local storage` (the id comes from the server
   configs); after it, on every start, `E OneSignal: Cannot add invalid sms number as subscription: +57 …` (the test user's phone has a space in
   it; the app hands it to OneSignal as it is). iOS: HTTP 404 / 400 from OneSignal for the property update and the subscription (the app id is not
   registered for this bundle id).
3. **Deprecations in our own sources:** `MainActivity.kt:62` and `AppDelegate.swift:126` (above).
4. **The explainer sheet closed itself once.** On the first Android sign-in the "Turn on order alerts" dialog was up for about 3 s and was gone in the
   next screenshots with no touch (`05-after-enter-1.png` shows it, `05-after-enter-3.png` onward do not). On the second sign-in (after
   `pm clear`) it stayed for the 12 s I watched. `useNotificationPermissionPrompt` resets its state when `auth` or `loaded` flips; not
   proven that this is the cause.
5. **Sockets go to a non-local host.** `src/config.json` (the sibling's copy that I was told to use) keeps `socket.url` =
   `https://sockets.orderingplus.com`; only `api.url` is local. The app connected to it (pill "Live" after the sign-in, thread
   `rderingplus.com` in `top`). Please read it as a fact about the config, not as something I did on purpose: I only signed in to the local API.
   The Debug testers do the same.

### Differences between these Release runs and what the Debug reports describe

- **Responsiveness.** [tablet-android.md](../theme/verification/tablet-android.md) describes the JS thread at 60 to 100 % of a core, 90 % janky frames and
  taps answered 15 s to 6 min late on this AVD. In Release: JS thread 1 to 2 % at rest, every tab and every sheet answered in under 3 s, rotation
  followed in 1.2 s. Janky frames 44.7 % in a scroll test on the same emulated GPU (Debug: 90 %).
- **Memory.** Debug RSS 0.8 to 1.6 GB; Release 344 to 399 MB (PSS 193 to 247 MB).
- **Screens the Debug pass could not reach now load:** the Stores menu pane (Debug: "never loaded"), the Profile Language row (Debug: arrived late and
  pushed Log out under the edge; Release shows all rows and Log out), the Printers screen (iOS here).
- **Nearby-devices permission.** [android-native.md](android-native.md) section 9 and 10 say the first launch asks "Allow OBusiness to find, connect to,
  and determine the relative position of nearby devices?". The Release app did **not** ask on its first launch after `pm clear`; the Debug app asked
  again when I restored it. Not investigated (the merged manifest of the two builds may differ).
- **Soft keyboard over the Log in button** (TAB-B1): the same in Release.
- **Bundle and size** are 7.2 MB (Android) and 8.9 MB (iOS) of Hermes bytecode; APK 172.5 MB, iOS `.app` 152 MB (both universal builds).
- `RCTRootView` and `DefaultReactActivityDelegate` deprecation warnings exist in Debug as well (not mentioned in the Debug notes).

### What I had to supply by hand (a build pipeline needs these)

- `src/config.json`: copied from the sibling checkout (`api.url` `http://localhost:8080`, `project` `development`), uncommitted.
- The submodule: `git -C src/@/components fetch <sibling>/src/@/components feat/business-app-additive && git -C src/@/components checkout FETCH_HEAD`
  (commit `6112af5`), pointer not committed.
- Untracked files of the sibling: **none copied.** `ios/.xcode.env.local` already existed in this checkout (same one line, `NODE_BINARY=…node@24…`);
  there is no `android/local.properties` (the SDK comes from `ANDROID_HOME`); push-provider files are tracked (`google-services.json`,
  `GoogleService-Info.plist`, placeholders). `ios/Pods/` was regenerated with `pod install`.
- Environment: `JAVA_HOME` (JDK 17+, the JBR 25 works), `ANDROID_HOME` (no `local.properties`), `DEVELOPER_DIR` (the machine's
  `xcode-select` points at the Command Line Tools: `xcodebuild` and `simctl` fail without it), Homebrew `pod` (not `bundle exec`), a Node on
  `PATH` / `NODE_BINARY`.
- For the Android build: `rm -rf android/build` after any identifier change (stale autolinking, see android-native.md section 5); I removed
  `android/build`, `android/app/build` and `android/app/.cxx` before building.
- Not supplied, and needed for a store build: a real Android keystore (Release uses the debug one), the iOS team, provisioning profile and push key,
  a real Firebase / OneSignal registration for `co.ordering.business`, the Google Maps key (the marker `_GOOGLE_MAPS_API_KEY_` stays).

### Proposals (nothing was changed)

1. Register `co.ordering.business` in Firebase and OneSignal and replace the two Firebase files; until then the two Firebase errors above appear on
   every start and push cannot work.
2. Give OneSignal the phone in E.164 (strip spaces) or do not set the SMS subscription when the number is not valid: one `E OneSignal` line per
   start.
3. If the explainer sheet should survive a `loaded` flicker, keep `plan` in `useNotificationPermissionPrompt` when `loaded` goes false and back
   to true, instead of resetting it; check why it did not show on iOS.
4. Decide whether `socket.url` should follow `api.url` for local runs (it points at the production socket host in the config used here).
5. The build is ARM only since 2026-11-23 (`armeabi-v7a,arm64-v8a`; the sizes and times above are the four-ABI ones). Measured
   that day: `app-release.apk` **110.4 MB** (110,400,639 bytes; it was 172.7 MB with four ABIs), native libraries 19.9 MB
   (`armeabi-v7a`) and 28.3 MB (`arm64-v8a`), installed and opened on the arm64 emulator. The build time from clean was not
   measured (the incremental build took 46 s). To
   shorten a local debug cycle further build the emulator's ABI alone (`-PreactNativeArchitectures=arm64-v8a`); an emulator
   on an Intel machine needs `-PreactNativeArchitectures=x86_64`.

### The size of the APK (2026-11-23)

Measured on Release builds of the same day, ARM only, signed with the debug keystore, on an arm64 tablet emulator. "Download"
is a rough figure (gzip of the dex, the arm64 libraries, the bundle and the resources), not what a store delivers.

| Build | `app-release.apk` | dex | Download, arm64 (rough) | State |
|---|---|---|---|---|
| Before | 110.4 MB (110,399,063 bytes) | 5 files, 41.4 MB, 37,165 classes | 37 MB | |
| Android without `react-native-html-to-pdf` | 97.8 MB (97,809,261 bytes) | 4 files, 34.5 MB, 30,813 classes | 29 MB | **in the repository** |
| The same with R8 (`enableProguardInReleaseBuilds = true`) | 73.0 MB (72,972,000 bytes) | 1 file, 9.5 MB, 10,394 classes | 21 MB | measured, **off** |

The APK is large because the dex files and the `.so` libraries are stored uncompressed; the two ABIs are 19.9 MB and 28.3 MB.

**The PDF library is out of the Android build.** `react-native-html-to-pdf` brought pdfbox-android and, through it,
BouncyCastle (14.6 % of the classes and 8.2 MB of tables), which pdfbox uses only for PDFs encrypted with a public key. On
Android the library only made a file that went straight to the system print dialog. Now `sharePdf` (`src/printing/document.ts`)
gives that dialog the ticket's HTML (`RNPrint.print({ html, jobName })`) and its "Save as PDF" writes the file;
`react-native.config.js` leaves the library out of Android's autolinking, and `document.ts` requires it inside the iOS branch
(its JavaScript asks for the native module on load). iOS is unchanged: a generated file and the share sheet.

- Seen on the emulator, before and after: the same dialog, preview, "Letter", "1/1" and suggested name; the saved files have
  the same size in bytes (two orders, several runs). Seen on the iPhone simulator after the change: the share sheet with
  `order_<id>.pdf`.
- The one difference: when the person changes the paper size in the dialog, the text now flows again at its own size; before,
  the whole page was scaled.

**R8 is measured and off.** With the default rules alone the app closed when an Epson search started (`libepos2.so` finds its
classes by name). With the rules now in `android/app/proguard-rules.pro` (Epson, Star, the install referrer, the names
notify-kit pre-loads) a checklist of 16 items gave the same result as without R8: launch, the connection sheet, the order's
details and sheets, messages, stores and menu, profile, the test alert sound, language, sessions, the Star / Epson / BLE
searches and an Epson test print without a printer, Share PDF, the image picker, the push and crash SDKs' start lines,
background and return, rotation, and a relaunch still signed in. `NotificationServiceExtension` keeps its name in R8's map.

Before turning it on (`enableProguardInReleaseBuilds = true`):

1. Print on a real Star printer: Star's native code never ran in any of these builds, and its rule was written from reading the
   library.
2. Print on a real Epson and a generic BLE printer, receive a real push with the alarm sound, and open the signed-out login
   (its WebView was not reached).
3. Make one build in the Builder: the marketplace and driver apps build with R8 off, so this would be its first.
4. Know that with R8 every Release build runs `uploadCrashlyticsMappingFileRelease` (the mapping goes to the Firebase project
   of `google-services.json`; a local trial can skip it with `-x uploadCrashlyticsMappingFileRelease`), and that crash traces
   are obfuscated without that mapping (`app/build/outputs/mapping/release/mapping.txt`).

### What I did not see

- Push in any state, the new-order alarm sound, the order alarm extension (iOS) and the `new_order_alarm` channel in a real push.
- Any real printer (Star, Epson, generic BLE, PDF share) and Bluetooth: only the screens, and a LAN discovery that found nothing.
- A physical device, a phone-sized Android screen, a real tablet GPU, an iPad, iOS landscape, Android 14 and earlier.
- A store-signed build (Android release keystore; iOS archive, profile, signing), `bundleRelease` signature and `.aab` install, the App Store and
  Play checks (privacy manifest, Play pre-launch report, target-SDK rules), a Release build offline (first start offline, cached theme).
- Accept, reject, adjust time, assign driver, chat send, store pause and product switches (deliberately not touched), History, search, Sessions,
  Personal information, Password, Language sheet, Log out, the notification explainer on iOS, text scaling and dark mode.
- A longer soak: each run was minutes, not hours.
