# Android native step: Gradle 9, AGP 9, the new architecture, bootsplash, OneSignal 5, `co.ordering.business`

Branch `upgrade/native`, worktree `ordering-app-business-theming-native`. Date 2026-11-19. Everything is under `android/`
plus `builder.json` (`android_package`). Model: the driver app (`docs/deps/core-upgrade.md`, `push-phase.md`,
`shell-phase.md`, `docs/SPLASH.md`), file by file against `ordering-app-driver-v26/android`.
The JavaScript side is [js-step.md](js-step.md); the iOS side is [ios-native.md](ios-native.md).

## 1. Commits

| Hash | What |
|---|---|
| `c041fb6` | Core: Gradle 9.4.1 wrapper, `build.gradle`, `settings.gradle`, `gradle.properties`, `app/build.gradle`, `MainApplication.kt` |
| `be999af` | Libraries: bootsplash, OneSignal 5 extension, manifest, styles, `react-native-print` under AGP 9 |
| `2748a30` | Identifiers: `co.ordering.business`, Kotlin sources moved, `app_name` `OBusiness`, `google-services.json`, `_BUCK`, `builder.json` |
| `04315bc` | Keeps `res/mipmap-xxxhdpi/splash.png` (JavaScript still requires it, section 6) |

## 2. Core (what changed against the 0.81 project)

- Gradle 9.4.1 (wrapper jar and scripts copied from the driver); AGP 9 comes with `@react-native/gradle-plugin`; Kotlin
  2.2.0; `compileSdk` 37, build tools 37.0.0, `targetSdk` 36, `minSdk` 29 (unchanged), NDK 27.1.12297006 (unchanged).
- `gradle.properties`: `newArchEnabled=true`; `android.builtInKotlin=false` and `android.newDsl=false` (the 0.88 template's
  opt-outs; the driver found `newDsl=true` breaks the Kotlin plugin). Hermes on. `edgeToEdgeEnabled=false` as the driver's.
  `reactNativeArchitectures` stayed at four ABIs during the upgrade and is two (ARM) since 2026-11-23 (decision 3 below).
- `build.gradle`: Firebase plugins `google-services` 4.4.4 and `firebase-crashlytics-gradle` 3.0.8; `playServicesLocationVersion`
  and `googlePlayServicesLocationVersion` 21.3.0 (the community geolocation and maps libraries read one each); the
  notifee maven line is gone; the Star `flatDir` stays (it is how `stario10.aar` is found); the `subprojects` block that
  turns `buildConfig` on for libraries (AGP 9 turns it off, several libraries read their `BuildConfig`).
- `app/build.gradle`: `proguard-android-optimize.txt`; removed `implementation project(':react-native-vector-icons')`,
  `apply from: .../react-native-vector-icons/fonts.gradle`, `play-services-maps:18.0.0` (maps 1.29.11 brings its own),
  `androidx.core:core-splashscreen`. `settings.gradle` lost the manual `:react-native-vector-icons` include.
- `MainApplication.kt`: no `ReactNativeHost` any more (the 0.88 `ReactApplication` throws on it): `reactHost by lazy {
  getDefaultReactHost(context, packageList = PackageList(this).packages) }`. The app has no package of its own, so
  nothing is added. `loadReactNative(this)` stays first after `super.onCreate()`. The order channel code is unchanged.
- `MainActivity.kt`: `super.onCreate(savedInstanceState)` with `RNScreensFragmentFactory` (screens 4.30) and
  `RNBootSplash.init(this, R.style.BootTheme)` before it, as the driver's. The manual `systemBars` padding listener of
  the old file stays (decision 6).
- Manifest: `android:usesCleartextTraffic="${usesCleartextTraffic}"` (the RN plugin sets it per build type) and
  `android/app/src/debug/AndroidManifest.xml` deleted, as the driver.

## 3. Libraries

| Library | Android |
|---|---|
| `react-native-bootsplash` 7 | `BootTheme` (parent `Theme.BootSplash`, `postBootSplashTheme` `AppTheme`), `bootsplash_background` `#FFFFFF`, `drawable-{m,h,xh,xxh,xxxh}dpi/bootsplash_logo.png`; `MainActivity`'s manifest theme is `BootTheme`. `res/layout/launch_screen.xml` and the `splash_land.png` / `splash.png` mipmaps (except one, section 6) are gone |
| `react-native-splash-screen`, notifee, old vector-icons | removed from the Gradle files (autolinking has no entry for them) |
| OneSignal 5.5.17 | `NotificationServiceExtension.kt` rewritten as `INotificationServiceExtension`, `@Keep`; the manifest meta-data `com.onesignal.NotificationServiceExtension` = `${applicationId}.NotificationServiceExtension` did not change in v5 (the driver confirmed it in the SDK) |
| `react-native-notify-kit` 9.7.0 | autolinked; the existing pnpm patch (any JDK from 17 on) is what lets its Gradle script run on Android Studio's JDK 25 |
| Firebase 26.4.1 | the two plugins above; no `app` Gradle change |
| `react-native-maps` 1.29.11 | autolinked, brings its own Play Services; the manifest key stays the marker `_GOOGLE_MAPS_API_KEY_` |
| `react-native-star-io10` 1.14.0, `react-native-esc-pos-printer` 4.6.0-rc.0, `react-native-ble-plx` 3.5.1 | build and package with no Gradle change besides the `flatDir` (the esc-pos `libepos2.so` and the Star `.aar` are in the APK for the four ABIs) |
| `react-native-print` 0.11.0 | blocked the build (`checkDebugAarMetadata`: it hard-codes `compileSdkVersion = 31` and build tools 31.0.0). Fixed in the root `android/build.gradle` (section 4) |
| `react-native-html-to-pdf` | **not in the Android build since 2026-11-23** (`react-native.config.js`, `platforms.android: null`): "Share PDF" hands the ticket's HTML to the system print dialog, whose "Save as PDF" writes the file; the library stays for iOS (`docs/deps/release-builds.md`, "The size of the APK") |
| `react-native-sound-player`, and the rest | build as they are |

### The new-order alarm (OneSignal 4 class against the v5 one)

The OneSignal 4 class (`OSRemoteNotificationReceivedHandler`) did one thing: `mutableCopy()` + `setExtender` forcing channel
`new_order_alarm`, `PRIORITY_HIGH`, `VISIBILITY_PUBLIC`, then `event.complete(mutated)`; on any failure `event.complete(original)`.
The v5 class does the same with `event.notification.setExtender { ... }` and no call at the end (v5 shows the notification
when `onNotificationReceived` returns, and we never call `preventDefault()`); the `try/catch` stays (on a failure OneSignal shows
the original). The channel itself is still created by `MainApplication.createOrderNotificationChannel()`: `new_order_alarm`,
importance high, the app's own `raw/order_sound_notification.mp3`, vibration 1000/500/1000/500/1000, `USAGE_NOTIFICATION`,
and it still deletes the old `orders` channel. On the emulator `dumpsys notification` shows the channel with importance 4, that
sound and that vibration.

## 4. Decisions

1. **Alarm: this app's behaviour, not the driver's.** The driver's channel and extender are an alarm (`USAGE_ALARM`,
   `PRIORITY_MAX`, `CATEGORY_ALARM`, alarm-stream volume raised to maximum, bypass Do Not Disturb, masked order ids for two
   projects) because the driver has to be woken. The business app's code before this step was `USAGE_NOTIFICATION`,
   `PRIORITY_HIGH`, no volume change, no DND bypass, and has no `AlarmSound` native module (its JavaScript plays the
   in-app sound with `react-native-sound-player`). The brief said "with the new-order alarm channel and sound as the
   driver's"; I read that as the same *pattern* (the channel `new_order_alarm`, the extender, the app's own sound file) and
   kept this app's existing behaviour, so a push does not get louder or more intrusive than today's build. If the owner
   wants the driver's alarm (a restaurant kitchen is the same case), it is the driver's two files: `USAGE_ALARM` in the
   channel and the five extender setters.
2. **`react-native-print` without a package patch.** Its iOS side already has a pnpm patch (the iOS agent's, commit
   `8ab6c95`, `reads UIApplication delegate window`). Rather than add Android hunks to the same patch, the Android fix is a
   `subprojects` block in the root `android/build.gradle` that, for that one project, sets `compileSdkVersion` and
   `buildToolsVersion` from the root `ext` in `afterEvaluate`. No library file is changed, no `package.json`, lock file or
   `pnpm-workspace.yaml` was touched by this step. If the patch is preferred, the same two lines go into the package's
   `android/build.gradle` and the block can go.
3. **ABIs.** `reactNativeArchitectures` is `armeabi-v7a,arm64-v8a` since 2026-11-23 (the owner's decision; it kept the four
   ABIs of the original app until then, and every measurement in this document was taken with four). Every phone, tablet and
   the Play Store are ARM and an emulator on Apple Silicon is arm64; x86 and x86_64 served only an emulator on an Intel
   machine, which now needs `-PreactNativeArchitectures=x86_64`. The marketplace did the same (its commit `a6fc422`).
4. **No `WindowBackground` / `ContentInsets` / `AppStrings` / location module.** Those are the driver's JavaScript-facing
   Kotlin files; this app's JavaScript has no `NativeModules` use at all, so there is nothing to port. `MainActivity` keeps
   the old fixed `systemBars` padding.
   **Since 2026-11-23 the launch logo is a square mark**, `assets/bootsplash/logo-source.png` (1024 x 1024, transparent), as the
   marketplace app: 120 dp inside the 288 dp box on Android, 120 pt on iOS. Android's launch theme masks its box to a circle, which
   left little of a wide logotype. What follows is how the first images were made, from the logotype.
5. **Bootsplash assets from `src/assets/images/logotype.png`** (798 x 180, the Ordering wordmark): it is byte for byte the
   driver's `launch-logo.png`, so the five generated `bootsplash_logo.png` files are identical to the driver's (180 dp on a 288 dp
   canvas, white). The generator was run for Android only (`--platforms=android --background=FFFFFF --logo-width=180`), and
   its rewrite of `AndroidManifest.xml`, `colors.xml`, `styles.xml` was thrown away in favour of hand-written files (the
   Builder expects the fixed names). The look is the old one: white background, the wordmark, now centred and 180 dp wide
   (the old Android splash was a 2732 px full-screen image with the wordmark about 297 dp wide; Android 12+ masks the icon
   to 192 dp, so wider is not possible).
6. **Edge to edge.** As the driver's: `edgeToEdgeEnabled=false`, `windowOptOutEdgeToEdgeEnforcement` and
   `windowTranslucentStatus=false` in `AppTheme` (honoured on 15, ignored on 16+), `windowBackground` white, and the
   `MainActivity` listener pads the content by the system bars' insets, so on 16+ the window background is what shows behind
   the bars. The driver's `WindowBackground` module that paints that colour from the theme is not ported (decision 4): the bars
   stay white behind a dark theme until someone ports it.
7. **Identifiers.** `namespace` and `applicationId` `co.ordering.business`; sources in `co/ordering/business`; `app_name`
   `OBusiness`; `getMainComponentName()` stays `businessApp`; `rootProject.name` stays `businessApp`; `builder.json`
   `android_package` is `co.ordering.business`; `_BUCK` follows. **Google Maps:** the manifest already carried the marker
   `_GOOGLE_MAPS_API_KEY_` (no key was written there), so nothing was replaced and no key was copied anywhere.
   `google-services.json`: only the `package_name` line changed. That is enough for Gradle; it is **not** a Firebase
   registration (section 8).
8. **Tablet.** Nothing in the manifest locks an orientation (the old manifest had none and none was added) and the activity
   declares `android:resizeableActivity="true"` (also the default at targetSdk 36), with `configChanges`
   `keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode` so a rotation or a window resize does
   not restart the activity, and `windowSoftInputMode="adjustResize"`. No `uses-feature` forbids a tablet (the two Bluetooth
   features are `required="false"`). Android 16 ignores orientation and resizability restrictions on large screens anyway.
   Not seen on a tablet.
9. **Permissions kept as they were:** `INTERNET`, `POST_NOTIFICATIONS`, `ACCESS_COARSE/FINE_LOCATION`, `BLUETOOTH`/`BLUETOOTH_ADMIN`
   (max SDK 30), `BLUETOOTH_ADVERTISE/CONNECT/SCAN` (`neverForLocation`), the two Bluetooth `uses-feature`s, and the USB
   `device_filter` / `accessory_filter` meta-data for the Star and Epson printers. The merged manifest also carries
   `ACCESS_LOCAL_NETWORK` (coming from a dependency, not written by the app): on Android 17 the first launch asks "Allow
   OBusiness to find, connect to, and determine the relative position of nearby devices?" (seen on the emulator). It is the
   permission LAN printers (Star, Epson) will need, so it was left to be asked; whether the app should ask for it at a better
   moment than the first frame is a UX decision for the redesign.

   **Correction, 2026-11-20 (fix round 6, [../theme/verification/fix-round6-printers.md](../theme/verification/fix-round6-printers.md)
   section 2):** at `targetSdkVersion` 36, as today, **nothing is needed**: Android gives an app that targets below 37 an implicit
   grant of `ACCESS_LOCAL_NETWORK` with `INTERNET`, and its documentation says not to declare or request the permission before
   targeting 37 ([developer.android.com/privacy-and-security/local-network-permission](https://developer.android.com/privacy-and-security/local-network-permission)).
   The declaration that the merged manifest carries comes from React Native's own **debug** manifest (to reach the dev server); the
   app's manifest and the Release variant do not declare it. So on an Android 17 device a **Debug** build shows the launch dialog,
   and if the dialog is dismissed or refused (an emulator may dismiss it at once) the Star library throws "Local network access is
   not permitted." from a LAN search. **At target 37** the permission must be declared in `android/app/src/main/AndroidManifest.xml`
   and requested at runtime before a LAN search or a LAN print (the request belongs in the printer wizard's search step and the
   print run, not in the frozen `src/printing` files): the release handover row 25.

## 5. Checks (this machine, Android Studio JBR 25, Gradle 9.4.1, 4 ABIs)

The machine was shared with other agents' builds: load average 60 to 130 during the long ones, so **the times are far above
what a quiet machine gives** (the first, warm debug build took 4 minutes).

| Build | Result | Time | Output |
|---|---|---|---|
| `assembleDebug`, first, incremental after the libraries step | success | 4 m | |
| `assembleDebug`, "from clean" (`gradlew clean`, `app/.cxx`, `app/build`, `android/build` removed) | success | 17 m 30 s | `app-debug.apk` 282,868,242 bytes (270 MB) |
| `assembleRelease`, same state | success | 26 m 6 s | `app-release.apk` 192,922,942 bytes (184 MB) |

- Release signs with the committed `debug.keystore` (`signingConfig signingConfigs.debug`, as before): no real keystore is
  needed to build, and none was used. Minify is off (`enableProguardInReleaseBuilds = false`; still off, see `release-builds.md`, "The size of the APK"). The JavaScript bundle step of
  release (`createBundleReleaseJsAndAssets`, Hermes) ran and passed.
- A first "clean" attempt failed with `package com.businessapp does not exist` in a generated file: `android/build/generated/
  autolinking/autolinking.json` (git-ignored, outside `app/build`, not removed by `gradlew clean`) still held the old package.
  A fresh checkout has no such file; delete `android/build` after changing the identifier.
- A first release attempt failed at bundling because `BusinessApp.tsx` requires `android/app/.../mipmap-xxxhdpi/splash.png`,
  which this step had deleted (section 6). The file was put back.
- Warnings only: compile warnings of libraries, "Deprecated Gradle features were used in this build, making it incompatible
  with Gradle 10".

## 5b. Fonts, orientation (2026-11-19)

- **Fonts**: `npx react-native-asset` against `src/assets/fonts` (`react-native.config.js`): `android/app/src/main/assets/fonts` holds
  exactly the 40 catalog files and `android/link-assets-manifest.json` lists them (the old `Inter_*pt`, `Lato-*` and
  `Poppins-Light/Thin` files are gone). The debug APK has 53 TTFs under `assets/fonts` (40 + the 13 icon fonts of the vector-icons
  packages). `fontsLinked.test.ts` passes. Run on `OBizTest`: Poppins draws, no font error in logcat.
- **Orientation, phones portrait / tablets free**: no manifest attribute tells a phone from a tablet (and since Android 16,
  an app targeting API 36 cannot lock the orientation on screens of 600 dp and wider anyway), so the lock is a resource:
  `res/values/bools.xml` `lock_portrait` = `true`, overridden to `false` in `res/values-sw600dp/bools.xml`. `MainActivity`
  reads it in `onCreate` before `super.onCreate` (so before the first frame) and sets `requestedOrientation` to `PORTRAIT`
  (phones) or `UNSPECIFIED` (tablets); it re-applies it in `onConfigurationChanged`, because the manifest handles
  `screenSize|smallestScreenSize` and a fold/unfold does not recreate the activity (a foldable is a phone folded and a
  tablet unfolded). The manifest has no `screenOrientation`. Seen on the phone emulator (`wm size` 1080x2400, Android 17): with
  `cmd window user-rotation lock 1` the display stayed in `ROTATION_0` and `dumpsys activity` showed
  `requestedOrientation=SCREEN_ORIENTATION_PORTRAIT`. The tablet side (`sw600dp`) and a foldable were **not seen** (no tablet
  AVD was run).
- Running a Debug build on an emulator: the app asks Metro at `10.0.2.2:8081` unless the app's `debug_http_host` preference says
  otherwise, and `localhost:8099` stays in that preference from an earlier run (`adb install -r` keeps it): use `pm clear`, then
  `adb reverse tcp:8081 tcp:<metro port>` and write `localhost:8081` to `debug_http_host`; the first launch also asks for the
  "nearby devices" (Bluetooth) permission, so the first screen appears after "Don't allow".

## 6. For the JavaScript agents

- `src/BusinessApp.tsx` (`theme.images.loadingSplash`, Android branch) requires
  `../android/app/src/main/res/mipmap-xxxhdpi/splash.png`. That file is kept (13 KB). When the loading page moves to a file
  under `src/assets/images` (the driver's `launch-logo.png`; `logotype.png` is the same picture), the mipmap can go.
- The rest of the Android project has no JavaScript dependency.

## 7. What a Builder base must replace (the driver's HANDOVER section 2, for this app)

| What | Where | How |
|---|---|---|
| Google Maps key | `android/app/src/main/AndroidManifest.xml` | replace the text `_GOOGLE_MAPS_API_KEY_` with `google_maps_api_key` (the marker was already there; the iOS side has its own) |
| Launch splash logo | `android/app/src/main/res/drawable-{m,h,xh,xxh,xxxh}dpi/bootsplash_logo.png` (and `src/assets/images/logotype.png`) | replace the files (sizes: 180 dp wide on a 288 dp transparent canvas, 288/432/576/864/1152 px) |
| Launch splash color | `android/app/src/main/res/values/colors.xml` `bootsplash_background` | replace the element |
| App name | `res/values/strings.xml` `app_name` (`OBusiness`) | the app name variable |
| Package, version | `android/app/build.gradle` (`namespace`, `applicationId`, `versionName`, `versionCode`), the Kotlin package line of the three sources and the directory `co/ordering/business` if the package differs per brand | as every base; the manifest's extension meta-data follows `${applicationId}` but the class's own package must match `namespace` |
| Firebase file, icons | `android/app/google-services.json`, `res/mipmap-*/ic_launcher*.png`, `res/drawable-*/ic_stat_onesignal_default.png`, `ic_onesignal_large_icon_default.png` | as the current base |
| Runtime configuration | `src/config.json` | as today |
| Push sound | `res/raw/order_sound_notification.mp3` | replace the file |

Not to copy from the current base: the old `mipmap-*/splash*.png`, `res/layout/launch_screen.xml`, `AppTheme.Splash`,
`splashscreen_bg`, `app/src/debug/AndroidManifest.xml`, and anything that names `com.businessapp`.
The Jenkins pipeline must build Android with a JDK from 17 on (Android Studio's JBR 25 worked) and Gradle 9.4.1 (the wrapper
downloads it), and needs the network once for Gradle and Maven dependencies.

## 8. Needed outside the repository

- **Firebase:** an Android app registered for `co.ordering.business` and its fresh `google-services.json` (only `package_name`
  was changed in the committed file: it still carries the old app's project, app id and keys, and push will not work with it).
- **OneSignal:** the app's configuration for the new package (and FCM credentials for it); **Google Maps:** the Builder's key
  restricted by package name and SHA-1.
- **A real signing keystore** for Release (the committed one is the debug keystore).
- Installed apps of `com.businessapp` do not update: the new package is a new app with new push tokens.

## 9. What I did not see / did not verify

- **Printing on a real printer** (Star LAN/Bluetooth/USB, Epson, generic BLE, PDF/system print): only that the libraries
  compile, link and package (`libepos2.so` is in the APK for the four ABIs). The print gate of the plan is the owner's.
- **Push**: no real FCM/OneSignal delivery; the extender ran on no push. The channel was seen with `dumpsys notification`.
- **A Release build on a device or emulator**: Release was built and its APK inspected (`aapt2 dump badging`: package,
  launcher activity label `OBusiness`, four ABIs), never installed.
- **A tablet**, **Android 14 and earlier**, **Android 15 with the opt-out**: not seen; one emulator, Android 17 (API 37),
  phone, arm64 (`OBizTest`, a fresh AVD from the installed `google_apis_playstore` image on port 5556, headless,
  `-no-snapshot`). The AVD was made by writing its two `.ini` files (the SDK has no `avdmanager`); one boot, which worked
  after about 6 minutes on the loaded machine.
- **The run**: the Debug APK was installed, Metro for this worktree ran on port 8099, and the app reached its **welcome
  screen** (`Running "businessApp" with {"fabric":true}`, i.e. the new architecture), with no crash of `co.ordering.business` in
  `adb logcat`. The dev server host had to be set to `localhost:8099` in the app's debug preferences
  (`run-as ... shared_prefs/co.ordering.business_preferences.xml`, `debug_http_host`) because the APK was built with the default
  port 8081 and the emulator reaches the host as `10.0.2.2:8081`; rebuilding with `-PreactNativeDevServerPort=8099` is the
  alternative. Nothing was typed or logged in. The screenshot is
  `/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad/native/android-first-screen.png`
  (the welcome screen still draws the old design: that is the redesign's, not this step's). The native bootsplash itself was
  not captured (the machine was too loaded to catch it between launch and the first frame), only its resources were checked.
- The `new_order_alarm` channel's DND bypass was never set by this app, so it was not looked at.
- Whether `react-native-esc-pos-printer` 4.6.0-rc.0 / `react-native-star-io10` 1.14.0 initialise at run time: the app starts
  with them linked, no printer discovery was run.
- `react-native-print`'s Android print dialog (the only reason the library is still there): compiled, not opened.

## 10. After the JavaScript cleanup (2026-11-19, main checkout `feature/theming-native`)

- `android/build` deleted before the build (stale autolinking). A search found no leftover of the removed libraries in `app/build.gradle`, `build.gradle`,
  `settings.gradle`, `proguard-rules.pro` (it has no rules), the manifest or `MainApplication.kt`: autolinking drops the packages by itself, so there
  was nothing to remove by hand.
- `res/mipmap-xxxhdpi/splash.png` (the last old splash file, section 6) deleted: nothing in `src/` requires it any more (the loading page is
  `src/pages/Splash.tsx` with `src/assets/images/logotype.png`). Section 6 no longer applies.
- `./gradlew assembleDebug` from this checkout (no Gradle outputs before, four ABIs): BUILD SUCCESSFUL in 8 m 3 s, `app-debug.apk` 269,918,803 bytes
  (the build ran next to the iOS build and a loaded machine).
- Run on `OBizTest` (port 5556, started with `-no-snapshot -no-audio`): `adb reverse tcp:8097 tcp:8097`, `tcp:8080`, `debug_http_host` = `localhost:8097` written to
  `shared_prefs/co.ordering.business_preferences.xml` after `pm clear`. The first launch asks for "nearby devices": tap "Don't allow" (y about 1536 on 1080x2400). The
  display of this AVD had been left in `ROTATION_270` by an earlier run: `adb shell cmd window user-rotation lock 0` restores portrait.
  One launch ended with an ANR and "Force finishing activity" while the machine was at load 150+ (the emulator's system server also restarted once); the relaunch worked.
- The app then shows the same JavaScript error as iOS (`Couldn't find a screen named 'Login' to use as 'initialRouteName'`, `RootNavigator.tsx`), see
  [ios-native.md](ios-native.md) section 9. `ReactNativeJS: Running "businessApp" with {"fabric":true}` was logged: the native side starts.
