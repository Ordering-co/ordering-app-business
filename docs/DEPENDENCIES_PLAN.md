# Dependency upgrade plan: React Native and libraries (business app)

Date: 2026-11-19 · Status: **proposed** (research only; nothing was installed, built or run) · Branch `feature/theming-native`
(native/deps work happens in the worktree `ordering-app-business-theming-native`, branch `upgrade/native`).

Model: `ordering-app-driver-theming/docs/DEPENDENCIES_PLAN.md` and `docs/deps/*.md` (the same plan made and executed for the
driver app, which started from the same dependency list). Target versions are what **driver-theming** and
**marketplace-theming** pin in their `package.json`; only the libraries this app alone has go to their own latest stable.
Findings already settled there (OneSignal 5, Firebase 26, notify-kit, bootsplash, reCAPTCHA on a WebView, scoped vector icons,
the app's primitives, Gradle 9 / AGP 9) are reused, not re-researched; section 4 is the new research.

Sources: this repo's `package.json`, `node_modules`, `android/`, `ios/`, `patches/` at HEAD `d055960`; importers counted by
script (app = `src/` without `src/@/`, plus `index.js`, `App.tsx`, `jest/`, `__tests__/`; submodule = the import closure of
`src/@/components/native/index.js`, 198 files); the npm registry (`npm view`, registry JSON, tarballs unpacked and read) and the
GitHub repositories of each library (`gh api`), all read on 2026-11-19.

## 1. Summary

102 declared dependencies (76 runtime + 26 dev). By class (the table of section 3 has each one):

| Class | Runtime | Dev | Total |
|---|---|---|---|
| remove (nothing needs it) | 18 | 5 | **23** |
| replace with the app's own primitive (the redesign paints it) | 12 | 0 | **12** |
| replace: unmaintained / slower | 6 | 0 | **6** |
| upgrade | 25 | 9 | **34** |
| keep as is | 15 | 12 | **27** |

Plus 10 packages to **add**: `react-native-bootsplash`, `react-native-notify-kit`, `@react-native-vector-icons/ionicons`,
`@react-native-vector-icons/material-design-icons`, `@react-native-community/geolocation`, `uuid` (3.4.0, the submodule imports
it), `react-native-webview` (used by four libraries but **not declared today**), `@react-native/jest-preset`,
`eslint-plugin-jest`, `@orderingco/ordering-theme-engine`.

What is different from the driver app, in order of risk (details in section 4):

1. **Printing is the app's riskiest area on this upgrade**, and three of its libraries have a concrete 0.88 problem found by reading
   their sources: `react-native-esc-pos-printer` 4.5.x does not compile on iOS with RN 0.88 (its shipped codegen lacks `ResultT`;
   `4.6.0-rc.0` is the same source regenerated and fixes it), `react-native-ble-plx` 3.5.1 crashes on iOS new-architecture release
   builds when `createClient(null)` is called (the app does exactly that), `react-native-print` calls `[[UIApplication delegate] window]`
   which the RN 0.88 scene-based template does not have.
2. **`react-native-html-to-pdf` is already broken at runtime today**: the installed 1.3.0 exports `generatePDF`, no default export and
   no `.convert`; the app calls `RNHTMLtoPDF.convert(...)` (its jest mock hides it). The error is caught and the app silently falls
   back to the system print dialog.
3. `react-native-canvas` (a WebView canvas, last publish 2024-06) is what turns the ticket into the image the Star printers print.
4. `react-native-sound-player` plays the new-order alarm in the foreground and its author says it is no longer maintained.

Unlike the driver app, this one has no background-location SDK, no config reader and no native location module to build, so the
driver plan's phases 5 and most of 7 do not apply.

## 2. Platform facts: today and target

"Today" is read from this repo; "target" is what driver-theming runs on RN 0.88.1 (read from its files).

| | Today (business) | Target | Where |
|---|---|---|---|
| React Native | 0.81.1 | **0.88.1** | `package.json`, `pnpm-workspace.yaml` `overrides` |
| React / test renderer | 19.1.0 | **19.3.0** exact (RN 0.88.1's renderer reports 19.3.0; do not take 19.3.1) | |
| `@react-native-community/cli` | 20.0.0 | 20.2.0 | |
| Metro | 0.83.x | 0.87.x (comes with `@react-native/metro-config` 0.88.1) | |
| Hermes | classic `hermes-engine` 0.81.1 (Podfile.lock) | Hermes V1 (default, nothing to set) | `hermesEnabled=true` stays |
| Architecture, Android | **old** (`newArchEnabled=false`) | **new** (`true`; mandatory from 0.82, and libraries read the property to pick sources) | `android/gradle.properties` |
| Architecture, iOS | new (`RCTNewArchEnabled` true in Info.plist) | new | `ios/businessApp/Info.plist`, Podfile |
| Gradle wrapper | 8.14.3 | **9.4.1** | `android/gradle/wrapper/gradle-wrapper.properties` |
| Android Gradle Plugin | 8.x (from RN 0.81's gradle plugin) | 9.2.1, with `android.builtInKotlin=false` and `android.newDsl=false` in `gradle.properties` | |
| Kotlin | 2.1.20 | 2.2.0 | `android/build.gradle` |
| compileSdk / buildTools / targetSdk / minSdk | 36 / 36.0.0 / 36 / 29 | **37 / 37.0.0** / 36 / 29 (SDK platform `android-37.0` is installed on this machine) | |
| NDK | 27.1.12297006 | same | |
| `reactNativeArchitectures` | 4 ABIs | `armeabi-v7a,arm64-v8a` (done 2026-11-23, the owner's decision; the marketplace halved its APK that way; Star and Epson ship all four ABIs, so x86 was only needed for an Intel emulator) | done |
| JDK to build Android | none on the PATH here; `~/.gradle/jdks` has Temurin 17; Android Studio JBR **25.0.3** present | 17 minimum; 25 works with Gradle 9.4.1 (marketplace/driver). notify-kit needs its JDK patch (driver's) | |
| Node | `engines >=20`, `NODE_VERSION.txt` 22; this machine 24.20.0 | `>= 22.13.0` (RN 0.88.1 needs `^22.13 \|\| ^24.3 \|\| >=26`) | `package.json`, `NODE_VERSION.txt`, CI |
| Package manager | **Yarn 1** (`yarn.lock`, marker `BUILD_CRA.txt`, CI `cache: yarn`) | **pnpm 12.18.0** (`packageManager`, `pnpm-workspace.yaml` with `nodeLinker: hoisted`, `autoInstallPeers: false`, marker `BUILD_PNPM.txt`); pnpm 12.18.0 is already installed here | |
| iOS deployment target | 15.1 (4 build configs) | 15.1 (`min_ios_version_supported`) | |
| iOS lifecycle | AppDelegate owns `window` (`var window: UIWindow?`), no scene manifest | UIScene lifecycle: `SceneDelegate.swift` + `UIApplicationSceneManifest` (RN 0.88 template; mandatory with the iOS 27 SDK) | `AppDelegate.swift`, `Info.plist`, pbxproj |
| Xcode / CocoaPods | `xcode-select` points at CommandLineTools on this machine; Podfile.lock CocoaPods 1.16.2 | Xcode >= 16.1 (26+ in practice), CocoaPods 1.17.0, Ruby 3.3.10 (`.ruby-version`) | |
| iOS pods of note | OneSignalXCFramework 3.12.6, GoogleMaps 7.4.0 pinned, Firebase 12.10.0 | OneSignalXCFramework 5.8.1; `react-native-maps/Google` pod without pins; Firebase from CocoaPods (`$RNFirebaseDisableSPM = true`) | `ios/Podfile` |
| iPad | `TARGETED_DEVICE_FAMILY 1,2` forced in the Podfile | keep (tablet is in scope) | `ios/Podfile` |
| `Info.plist` `UIRequiredDeviceCapabilities` | `armv7` | the driver still has `armv7`; not blocking | |

## 3. Every dependency, by what happens to it

How to read it: **App / tests** = number of files in the app (non-test / test-and-mock) that import it (script count). **Submodule**
= files in the logic submodule's import closure as this app uses it (`native/index.js` and what it reaches in `src/`; it imports no
React Native library, only the nine listed with a number). **Class**: `remove` · `primitive` (replaced by the app's own component,
ported from driver-theming; each select opens as a bottom sheet) · `replace` (unmaintained or slower, a named replacement) ·
`upgrade` · `keep`. Counts of `react`, `react-native` and `styled-components` are file counts too.

#### dependencies

| Package | Today | App / tests | Submodule | Class | Target | Native-only use | Note |
|---|---|---|---|---|---|---|---|
| `@fatnlazycat/react-native-recaptcha-v3` | ^1.0.3 | 1 / 1 | 0 | replace | removed; the app's `RecaptchaV3` (WebView) | - | 2022, last publish; driver and marketplace did the same |
| `@notifee/react-native` | ^9.1.8 | 1 / 1 | 0 | replace | `react-native-notify-kit` ^9.7.0 | Gradle `maven { url node_modules/@notifee/... }` (android/build.gradle) | archived; driver-proven |
| `@react-native-async-storage/async-storage` | ^2.2.0 | 1 / 3 | 1 | keep | ^2.2.0 | - | submodule NativeStrategy uses it; 3.x later |
| `@react-native-clipboard/clipboard` | ^1.16.0 | 2 / 2 | 0 | keep | ^1.16.0 | - | - |
| `@react-native-community/netinfo` | ^11.3.3 | 5 / 2 | 0 | keep | ^11.3.3 | - | 12 later |
| `@react-native-documents/picker` | ^11.0.0 | 1 / 1 | 0 | remove | (decision O4) else ^12.1.0 | - | only Chat file attach; mockup composer has a photo button only |
| `@react-native-firebase/app` | ^23.3.0 | 0 / 0 | 0 | upgrade | ^26.4.1 | Gradle plugins google-services 4.4.4, crashlytics-gradle 3.0.8; Podfile `$RNFirebaseDisableSPM = true`; `google-services.json`, `GoogleService-Info.plist` | no JS importer (native init) |
| `@react-native-firebase/crashlytics` | ^23.3.0 | 0 / 0 | 0 | upgrade | ^26.4.1 | same as app | no JS importer |
| `@react-native-firebase/messaging` | ^23.3.0 | 2 / 1 | 0 | upgrade | ^26.4.1 | manifest | `index.js` + RootNavigator; already modular API |
| `@react-native-picker/picker` | ^2.11.2 | 0 / 0 | 0 | remove | removed | - | 0 importers (declared, never imported) |
| `@react-navigation/bottom-tabs` | ^6.5.20 | 1 / 2 | 0 | upgrade | ^7.21.0 | - | plain-data params |
| `@react-navigation/drawer` | ^5.10.2 | 0 / 1 | 0 | remove | removed | - | 5.x beside navigation 6; 0 importers (1 jest mock) |
| `@react-navigation/native` | ^6.1.17 | 4 / 3 | 0 | upgrade | ^7.5.1 | - | - |
| `@react-navigation/stack` | ^6.3.29 | 2 / 2 | 0 | upgrade | ^7.12.1 | - | - |
| `@sentry/react-native` | 8.30.0 | 1 / 1 | 0 | upgrade | 8.35.0 | Gradle/Xcode build phases of the Sentry plugin if any | driver pin |
| `@twotalltotems/react-native-otp-input` | ^1.3.11 | 1 / 2 | 0 | primitive | `OOtpInput` (no library) | - | 2022 |
| `@types/react-native-html-to-pdf` | 0.8.3 | 0 / 0 | 0 | remove | removed | - | the library ships its own types since 1.x; `src/ui/src/types/react-native-html-to-pdf` stub also goes |
| `@types/react-native-loading-spinner-overlay` | ^0.5.2 | 0 / 0 | 0 | remove | removed | - | deprecated stub |
| `@types/styled-components` | ^5.1.3 | 0 / 0 | 0 | remove | removed | - | v5 types beside styled-components 6, which ships its own |
| `dayjs` | ^1.11.10 | 1 / 0 | 19 | keep | ^1.11.10 | - | submodule 19 files |
| `decimal.js` | ^10.4.3 | 0 / 0 | 2 | keep | ^10.4.3 | - | submodule only |
| `libphonenumber-js` | 1.11.19 | 0 / 0 | 3 | keep | 1.11.19 | - | submodule only |
| `moment` | ^2.29.1 | 4 / 1 | 2 | keep | ^2.29.1 | - | submodule imports it (2 files); the 4 app files move to dayjs |
| `patch-package` | ^6.4.7 | 0 / 0 | 0 | remove | removed (pnpm `patchedDependencies`) | `patches/` | the package.json has no `postinstall` script: today no patch is applied; see section 6 |
| `postinstall-postinstall` | ^2.1.0 | 0 / 0 | 0 | remove | removed | - | - |
| `prop-types` | ^15.7.2 | 0 / 0 | 86 | keep | ^15.7.2 | - | submodule 86 files |
| `react` | 19.1.0 | 127 / 113 | 119 | upgrade | 19.3.0 (exact) | - | must equal the renderer of RN 0.88.1 |
| `react-hook-form` | ^6.15.1 | 7 / 0 | 0 | upgrade | ^7.91.0 | - | 7 app files; `Controller` and `register` change |
| `react-native` | 0.81.1 | 114 / 66 | 0 | upgrade | 0.88.1 | everything native | 7 minors |
| `react-native-app-intro-slider` | ^4.0.4 | 1 / 1 | 0 | primitive | `Pager` | - | 2022 |
| `react-native-awesome-loading` | ^1.0.15 | 0 / 0 | 0 | remove | removed | - | 0 importers |
| `react-native-background-timer` | ^2.4.1 | 0 / 0 | 0 | remove | removed | - | 0 importers; only a type stub `src/types/react-native-bckground-timer` (delete) |
| `react-native-calendar-picker` | ^7.1.2 | 1 / 1 | 0 | primitive | `OCalendar` in a sheet | - | last publish 2024-07; moment peer goes with it |
| `react-native-ble-plx` | 3.5.1 | 1 / 2 | 0 | keep | 3.5.1 (latest) + a one-line patch | manifest BLUETOOTH*; Info.plist NSBluetooth* | see section 4.3: iOS new-arch release crash on `createClient(null)` |
| `react-native-canvas` | ^0.1.40 | 2 / 1 | 0 | keep | 0.1.40 (latest) + declare `react-native-webview` | needs the WebView | rasterises the ticket for Star; see 4.5 (highest risk) |
| `react-native-country-picker-modal` | ^2.0.0 | 2 / 2 | 0 | primitive | `countries.ts` (static data) | - | LanguageSelector + the phone code; language becomes a sheet |
| `react-native-device-info` | ^10.4.0 | 4 / 3 | 0 | upgrade | ^15.0.2 | - | 4 importers |
| `react-native-elements` | ^3.0.0-alpha.1 | 0 / 0 | 0 | remove | removed | - | 0 importers |
| `react-native-esc-pos-printer` | ^4.5.0 | 1 / 2 | 0 | upgrade | 4.6.0-rc.0 or 4.5.1 + patch (decision O1) | manifest BLUETOOTH*, USB `device_filter.xml`; ships libepos2.so (16 KB aligned) | 4.5.x does not compile on iOS with RN 0.88: see 4.2 |
| `react-native-fast-image` | ^8.5.11 | 5 / 1 | 0 | upgrade | ^10.11.0 (decision O3) or `Image` | Glide/SDWebImage | 5 importers; 10.x is Fabric-native and active again |
| `react-native-geocoding` | ^0.5.0 | 1 / 1 | 0 | remove | removed (a `fetch` wrapper if the map keeps reverse geocoding) | - | REST client of 2020; 1 importer (GoogleMap) |
| `react-native-geolocation-service` | ^5.2.0 | 1 / 1 | 0 | replace | `@react-native-community/geolocation` 3.4.0 | Gradle `playServicesLocationVersion` | 2022; marketplace-proven; 1 importer (`useLocation`) |
| `react-native-gesture-handler` | 2.28.0 | 2 / 1 | 0 | upgrade | 2.33.1 | - | 2.28 needs a file removed in RN 0.88 |
| `react-native-gifted-chat` | 2.1.0 | 1 / 1 | 0 | primitive | the app's chat thread (driver port) | - | 1 importer (Chat); `react-native-parsed-text` (undeclared) goes with it |
| `react-native-html-to-pdf` | 1.3.0 | 1 / 2 | 0 | keep | 1.3.0 (latest) but fix the call: `generatePDF` | - | see 4.4: the code calls `.convert` on a default export that does not exist in 1.x |
| `react-native-image-picker` | ^4.0.6 | 2 / 2 | 0 | upgrade | ^8.3.0 | - | 2 importers |
| `react-native-intersection-observer` | ^0.0.9 | 1 / 1 | 0 | remove | removed (the menu list is rebuilt on a virtualised list) | - | 1 importer (`IOScrollView` in BusinessProductList) |
| `react-native-lightbox-v2` | ^0.9.0 | 0 / 0 | 0 | remove | removed | - | 0 importers |
| `react-native-linear-gradient` | 2.7.3 | 1 / 1 | 0 | primitive | removed (the review has five segments) | - | 1 importer (ReviewCustomer) |
| `react-native-loading-spinner-overlay` | ^2.0.0 | 2 / 3 | 0 | primitive | `LoadingOverlay` | - | 2 importers |
| `react-native-map-link` | ^2.8.2 | 2 / 2 | 0 | upgrade | ^3.15.0 + the app's sheet | - | 2 importers; the `Popup` modal paints its own UI |
| `react-native-maps` | 1.13.2 | 4 / 1 | 0 | upgrade | 1.29.11 | Podfile (`react-native-maps/Google`), Gradle play-services-maps | 3 screens |
| `react-native-onesignal` | 4.5.2 | 1 / 2 | 0 | upgrade | 5.5.17 | Podfile pod, Android+iOS notification extensions, manifest meta-data | rewrite of calls in RootNavigator |
| `react-native-paper` | ^4.9.2 | 2 / 0 | 0 | primitive | `OText` | - | used only for `Text` (2 files) |
| `react-native-permissions` | 5.4.2 | 3 / 2 | 0 | upgrade | 5.6.3 | Podfile `setup_permissions` | - |
| `react-native-phone-number-input` | ^2.0.0 | 1 / 1 | 0 | primitive | the app's phone field | - | 2022 |
| `react-native-picker-select` | ^8.0.4 | 0 / 0 | 0 | remove | removed | - | 0 importers |
| `react-native-print` | ^0.11.0 | 1 / 2 | 0 | replace | patch (O2 a) or `react-native-share` (O2 b) | - | 2023; its iOS code needs `AppDelegate.window`: see 4.4 |
| `react-native-recaptcha-that-works` | ^1.2.0 | 1 / 1 | 0 | keep | ^1.2.0 | - | needs the WebView; v2 checkbox |
| `react-native-restart` | ^0.0.27 | 4 / 4 | 0 | upgrade | ^0.0.29 | - | - |
| `react-native-safe-area-context` | 5.8.0 | 14 / 5 | 0 | upgrade | 5.11.1 | - | - |
| `react-native-screens` | 4.14.0 | 0 / 0 | 0 | upgrade | 4.30.1 | `patches/react-native-screens+*` (stale) | not imported by JS (navigation peer) |
| `react-native-select-dropdown` | ^1.7.0 | 4 / 5 | 0 | primitive | `OSelect` (bottom sheet) | - | 4 importers incl. PrinterEdition |
| `react-native-signature-canvas` | ^4.3.0 | 1 / 1 | 0 | keep | ^4.3.0 (driver) (decision O4) | needs the WebView | 1 importer (Chat signature pad) |
| `react-native-sound-player` | ^0.13.2 | 2 / 2 | 0 | upgrade | 0.14.5 (unmaintained: spike, decision O5) | raw sound files | plays the new-order alarm in the app (2 importers) |
| `react-native-splash-screen` | ^3.3.0 | 2 / 2 | 0 | replace | `react-native-bootsplash` ^7.3.5 | MainActivity.kt, AppDelegate.swift, `SplashScreen.storyboard`, `launch_screen.xml`, styles.xml | 2022; `androidx.core:core-splashscreen` also goes |
| `react-native-star-io10` | 1.12.1 | 1 / 2 | 0 | upgrade | 1.14.0 | Gradle `flatDir` to `stario10.aar`; manifest BLUETOOTH*, USB `device_filter.xml`/`accessory_filter.xml`; podspec xcframework | vendor SDK wrapper; 1 importer |
| `react-native-swipe-gestures` | ^1.0.5 | 0 / 0 | 0 | remove | removed | - | 0 importers |
| `react-native-vector-icons` | ^10.0.2 | 35 / 9 | 0 | replace | `@react-native-vector-icons/ionicons` + `/material-design-icons` 14.0.0 | settings.gradle `include :react-native-vector-icons`, `fonts.gradle`, Info.plist `UIAppFonts` | deprecated; 35 importers (one `Icon` after the redesign) |
| `react-native-webview` | ^11.22.7 | 0 / 0 | 0 | upgrade | ^14.0.1 (declare it) | pbxproj search path | not declared today (arrives as a transitive); 0 JS importers |
| `rn-placeholder` | ^3.0.3 | 13 / 11 | 0 | primitive | `Skeleton` | - | 13 importers |
| `socket.io-client` | ^4.8.1 | 0 / 0 | 1 | keep | ^4.8.1 | - | submodule only |
| `styled-components` | ^6.1.0 | 151 / 3 | 0 | keep | ^6.1.0 | - | 151 importers |
| `styled-system` | ^5.1.5 | 0 / 0 | 0 | remove | removed | - | 0 importers |
| `toggle-react-native` | ^1.1.2 | 0 / 0 | 0 | remove | removed | - | 0 importers |
| `toggle-switch-react-native` | ^3.2.0 | 8 / 4 | 0 | primitive | `OSwitch` | - | 8 importers |

#### devDependencies

| Package | Today | App / tests | Submodule | Class | Target | Native-only use | Note |
|---|---|---|---|---|---|---|---|
| `@babel/core` | ^7.25.2 | 0 / 0 | 0 | keep | ^7.25.2 | - | - |
| `@babel/preset-env` | ^7.25.3 | 0 / 0 | 0 | keep | ^7.25.3 | - | - |
| `@babel/runtime` | ^7.25.0 | 0 / 0 | 0 | keep | ^7.25.0 | - | - |
| `@react-native-community/cli` | 20.0.0 | 0 / 0 | 0 | upgrade | 20.2.0 | - | - |
| `@react-native-community/cli-platform-android` | 20.0.0 | 0 / 0 | 0 | upgrade | 20.2.0 | - | - |
| `@react-native-community/cli-platform-ios` | 20.0.0 | 0 / 0 | 0 | upgrade | 20.2.0 | - | - |
| `@react-native/babel-preset` | 0.81.1 | 0 / 0 | 0 | upgrade | 0.88.1 | - | - |
| `@react-native/eslint-config` | 0.81.1 | 0 / 0 | 0 | upgrade | 0.88.1 | - | becomes the ESLint base (replaces `standard`) |
| `@react-native/metro-config` | 0.81.1 | 0 / 1 | 0 | upgrade | 0.88.1 | - | - |
| `@react-native/typescript-config` | 0.81.1 | 0 / 0 | 0 | upgrade | 0.88.1 | - | - |
| `@testing-library/react-native` | ^13.2.0 | 0 / 87 | 0 | keep | ^13.2.0 | - | 87 test files |
| `@types/jest` | ^29.5.13 | 0 / 0 | 0 | keep | ^29.5.13 | - | - |
| `@types/react` | ^19.1.0 | 0 / 0 | 0 | upgrade | ^19.2.0 | - | - |
| `@types/react-test-renderer` | ^19.1.0 | 0 / 0 | 0 | keep | ^19.1.0 | - | - |
| `@typescript-eslint/eslint-plugin` | ^6.4.0 | 0 / 0 | 0 | keep | ^6.4.0 | - | - |
| `babel-plugin-module-resolver` | ^5.0.2 | 0 / 0 | 0 | keep | ^5.0.2 | - | - |
| `eslint` | ^8.19.0 | 0 / 0 | 0 | keep | ^8.19.0 | - | - |
| `eslint-config-standard` | ^17.1.0 | 0 / 0 | 0 | remove | removed (`@react-native` config, as the driver) | - | with its four plugins |
| `eslint-plugin-import` | ^2.32.0 | 0 / 0 | 0 | remove | removed | - | standard's |
| `eslint-plugin-n` | ^18.2.2 | 0 / 0 | 0 | remove | removed | - | standard's |
| `eslint-plugin-promise` | ^7.3.0 | 0 / 0 | 0 | remove | removed | - | standard's |
| `eslint-plugin-react` | ^7.37.5 | 0 / 0 | 0 | remove | removed (comes with `@react-native/eslint-config`) | - | - |
| `jest` | ^29.6.3 | 0 / 0 | 0 | keep | ^29.6.3 | - | - |
| `prettier` | 2.8.8 | 0 / 0 | 0 | keep | 2.8.8 | - | - |
| `react-test-renderer` | 19.1.0 | 0 / 0 | 0 | upgrade | 19.3.0 | - | - |
| `typescript` | ^5.8.3 | 0 / 0 | 0 | keep | ^5.8.3 | - | - |


Imported or needed but not declared today: `react-native-parsed-text` (1 app file, the chat; arrives with gifted-chat and goes with
it), `uuid` (the submodule imports it) and `react-native-webview` (no JS import, but a peer of `react-native-canvas`,
`react-native-signature-canvas`, `react-native-recaptcha-that-works` and the `RecaptchaV3` component). Under pnpm with
`nodeLinker: hoisted` an undeclared package may still resolve, but **declare `react-native-webview` ^14.0.1 and `uuid` 3.4.0**
(the driver did).

### Native-only use (no JS importer), and what the other `patches/` files are

- `react-native-screens`, `@react-native-firebase/app`, `@react-native-firebase/crashlytics`, `react-native-webview`: no JS import; they
  are native peers or auto-initialised. Keep.
- `settings.gradle` includes `:react-native-vector-icons` by hand and `app/build.gradle` applies its `fonts.gradle`; both go with the
  library (the scoped packages autolink and copy fonts through `UIAppFonts` / their own Gradle).
- `android/app/build.gradle` has `play-services-maps:18.0.0` and `androidx.core:core-splashscreen:1.0.1`: the first goes (maps 1.29.11
  brings its own), the second goes with bootsplash.
- `android/build.gradle` has a `maven { url node_modules/@notifee/... }` repo (goes with notifee) and a `flatDir` to
  `node_modules/react-native-star-io10/android/src/lib` (**keep**: it is how the Star `.aar` is found).
- `AndroidManifest.xml`: BLUETOOTH, BLUETOOTH_ADMIN (max SDK 30), BLUETOOTH_ADVERTISE/CONNECT/SCAN, the two `uses-feature`, and the USB
  `device_filter` / `accessory_filter` meta-data are the printers' (Star, Epson). Keep all.
- `react-native.config.js` has only `assets: ['./src/assets/fonts']`; nothing about libraries.
- `ios/Podfile`: `setup_permissions(['LocationWhenInUse','Notifications'])`; the Bluetooth prompt comes from `NSBluetooth*` strings.

### `patches/` (read in full)

| File | What it is | Verdict |
|---|---|---|
| `patches/react-native-screens+3.37.0.patch` | 1,272 lines, a **diff of Gradle build outputs** (`android/build/intermediates/...`, `BuildConfig.java`, `.flat` resources) of `react-native-screens` 3.37, committed by mistake | The installed version is 4.14.0 and will be 4.30.1: it cannot apply. **Delete.** |
| `patches/react-native-screens+3.29.0/fix-basereactpackage.patch` | a replacement `RNScreensPackage.kt` (`TurboReactPackage`, `ScreenDummyLayoutHelper`) for screens 3.29 | Same: obsolete. **Delete.** |
| (none applied) | `package.json` has `patch-package` but **no `postinstall` script**, so these two files have never been applied by `yarn` | CLAUDE.md says "`yarn` / postinstall applies them": it is wrong today. |

Patches the new plan needs (all as pnpm `patchedDependencies`, format `diff --git a/<path inside the package> b/...`):
`react-native-notify-kit@9.7.0` (copy of the driver's JDK patch), `react-native-ble-plx@3.5.1` (4.3), optionally
`react-native-esc-pos-printer` (4.2, only if the stable 4.5.1 is chosen) and `react-native-print@0.11.0` (4.4, only if O2 option a).

## 4. The libraries only this app has

Method per library: `npm view` / registry JSON (version, publish date), the unpacked tarball (codegen config, native sources,
Gradle/podspec), the repository's recent commits and open issues (`gh`), and the app's own call sites. "New architecture" is read
from the package: a `codegenConfig` means a TurboModule or Fabric component; none means a legacy bridge module that runs through
React Native's **interop layer** (still present in 0.88; the RN 0.82 post says it stays "for the foreseeable future", as the
driver plan cites).

### 4.1 `react-native-star-io10` 1.12.1 → **1.14.0** (Star printers: LAN and Bluetooth)

- Last publish 2026-09-15 (1.14.0), 2026-07-21 (1.13.0), 2026-05-22 (1.12.1). Maintained by the vendor (`star-micronics`); 1 open issue.
  1.14.0 removes only the Windows UWP support and fixes a `verbatimModuleSyntax` type error: nothing the app uses changes
  (`StarXpandCommand`, `StarPrinter`, `StarDeviceDiscoveryManager`, `InterfaceType`, `StarConnectionSettings`).
- New architecture: **legacy bridge module through the interop layer** (no `codegenConfig`; podspec uses `install_modules_dependencies`
  with a `React-Core` fallback; peer `react: *, react-native: *`). The vendor closed the question "does it support the new
  architecture" with "this library supports the new architecture" (issue 153; the reporter's own problem was another library). The
  app already runs it on iOS under the new architecture on RN 0.81. No issue about RN 0.8x, Fabric or TurboModules is open.
- Android: Gradle uses `compileSdkVersion`/`buildToolsVersion` from the root project, no `jcenter`, applies `kotlin-android`; changelog
  line "Android: support for 16 KB page size native library"; I read the `.so` files inside `stario10.aar`: arm64 `LOAD` alignment
  is 16384 (Play's 16 KB requirement is met). The `flatDir` repository stays.
- The one open issue (158, 2026-09-15) is the iOS 27 / Xcode 27 `SceneDelegate` launch crash, which the vendor says originates in React
  Native, not in the SDK (work in progress). It is the same scene-lifecycle migration this plan does in phase (b).
- Risk: **medium** (legacy module under the new architecture, vendor binary). Replacement: none needed; **no alternative exists**
  (it is the vendor's own SDK). Behaviour to keep: `actionPrintImage` (the canvas image, 4.5) and `actionPrintText`.

### 4.2 `react-native-esc-pos-printer` 4.5.0 → **4.6.0-rc.0** (Epson printers: LAN, Bluetooth, USB)

- Last publish: `4.5.1` 2026-10-28 (`latest`), `4.6.0-rc.0` 2026-10-28 (`rc` tag, message "chore: upgrade to React Native 0.88"). Active
  (commits the same day; 332 commits; 27 open issues). README: "Compatible with the new architecture"; RN < 0.76 needs 4.3.3.
- It is a **TurboModule** (`codegenConfig` `RNEscPosPrinterSpec`, `includesGeneratedCode: true`): the generated C++/ObjC is shipped in
  the package.
- **Concrete finding, verified in the driver's `node_modules/react-native` 0.88.1:** `Libraries/TypeSafety/RCTTypedModuleConstants.h`
  requires every codegen `Constants::Builder` to define `using ResultT = Constants;`. The shipped `ios/generated` of **4.5.1 has no
  `ResultT`**; `4.6.0-rc.0`'s has it (lines 41 and 413 of `RNEscPosPrinterSpec.h`). Issue 249 (open) reports exactly this build error
  on RN 0.85 and later ("no type named 'ResultT' in 'JS::NativeEscPosPrinter::Constants::Builder'"), with a user patch and a fork.
  So **4.5.x will not compile on iOS with RN 0.88.**
- I diffed the unpacked tarballs: outside the `generated/` folders, **`ios/`, `android/` and `src/` of 4.5.1 and 4.6.0-rc.0 are
  byte-identical**; the only difference is the regenerated codegen. The release candidate is therefore 4.5.1 plus the codegen RN 0.88
  needs, not new behaviour.
- Other open issues that bear on printing: 243 (`printer.connect()` takes 6 to 8 s since 4.4.4, on new architecture, both platforms;
  open, no fix; **the app is on 4.5.0 so it has this today**), 248 (iOS `EXC_BAD_ACCESS` during LAN discovery; a fix for printer
  callbacks off the main thread landed in 4.5.1, #255), 245 (CMake `target_compile_reactnative_options` on RN 0.79: that function exists
  from RN 0.80, so not a 0.88 problem; not verified).
- Android: Epson's `libepos2.so` (arm64) has 16 KB `LOAD` alignment (read from the tarball): fine for Play.
- Risk: **high until built on both platforms and printed**. Options: see O1. Recommendation: pin `4.6.0-rc.0` exactly.

### 4.3 `react-native-ble-plx` 3.5.1 (generic Bluetooth ESC/POS printers, added in implementation notes )

- Last publish 2026-02-18 (3.5.1; previous 2025-02-11). Maintained by dotintent, slowly (last commit 2026-03-09; 34 open issues).
- Legacy bridge module (no `codegenConfig`; Gradle has a `newArchEnabled` branch; it works through the interop layer).
- **Concrete finding:** issue 1278 (open, confirmed by many users): on iOS, **new architecture, release build**, `new BleManager()`
  crashes the app, because JS calls `createClient(null)` (`BleManager.js` line 111: `options.restoreStateIdentifier || null`) and
  the native method is declared `createClient:(NSString*)`; the reporter's patch makes the parameter `id` and null-checks it. Reported on
  RN 0.77.1 to 0.79.6; not fixed in 3.5.1 (I read `ios/BlePlx.m` of the tarball: `RCT_EXPORT_METHOD(createClient:(NSString*)...)`
  unchanged). Whether RN 0.88's interop handles the null is **not known**. The app's `GenericBlePrinterAdapter.ts:73` does
  `new BleManager()` with no options.
- Also open: 1346 (Android: connections leak on a JS reload, 2026-11-19).
- Plan: keep 3.5.1 (it is the latest), apply the issue's one-method patch as a pnpm patch, and test on a **real iPhone with a Release
  build** (a simulator has no Bluetooth). Alternative (no patch): pass a non-null `restoreStateIdentifier`, which also turns on iOS
  state restoration; I do not recommend it without a device test. Alternatives to the library: `react-native-ble-manager` (not
  researched here).
- Risk: **medium-high on iOS release**, medium on Android.

### 4.4 Printing a page and exporting a PDF: `react-native-print` 0.11.0 and `react-native-html-to-pdf` 1.3.0

Used only in `OrderSummary/index.tsx` ("Print order": system printer or PDF). The mockups keep **"Share as PDF"** in the order sheet
and on the ticket preview; they do not show a system-printer entry.

- `react-native-print`: last publish **2023-01-22**, no release since 0.11.0; legacy module; `android/build.gradle` hard-codes
  `compileSdkVersion = 31` and depends on `com.facebook.react:react-native:+`. **iOS:** `RNPrint.m:173` reads
  `[[[UIApplication sharedApplication] delegate] window]`. The RN 0.88 template (and Apple's rule for apps built with the iOS 27 SDK)
  uses the scene lifecycle, where `AppDelegate` has no `window`: an open PR (237, 2026-10-15) says `RNPrint.print()` then throws
  `-[AppDelegate window]: unrecognized selector`. Note also that it uses `keyWindow` (deprecated) at lines 66 and 155. It is
  unmaintained **and** breaks on the scene lifecycle this plan adopts in phase (b).
- `react-native-html-to-pdf` 1.3.0 (2025-09-04, rewritten as a TurboModule in 1.x, `HtmlToPdf.mm`, no window use, so scene-safe). Its
  **public API changed**: `import { generatePDF } from 'react-native-html-to-pdf'`; there is no default export and no `convert`.
  The app does `import RNHTMLtoPDF from ...; RNHTMLtoPDF.convert(...)`, which throws `undefined is not an object`; the `try/catch`
  falls back to `handleStandardPrint()`. The test mock (`convert: jest.fn()`) matches the old 0.x API, not the installed one. So **today's
  "export PDF" has never produced a file with this version.** Fix: call `generatePDF`; result `{filePath, base64?, numberOfPages?}`.
- iOS shares the PDF with `Share.share({url})` (works). On Android the file is handed to `RNPrint.print({filePath})` (which opens the
  print UI where "Save as PDF" is offered): that is the only reason `react-native-print` is still needed.
- Options (O2): (a) keep the library with a 3-line pnpm patch from PR 237 (use the key window of the connected scene); Android
  unchanged; (b) drop `react-native-print`, share the PDF with `react-native-share` 12.3.1 (active, 2026-05-04; adds a library and a
  FileProvider), and drop the system-printer option; (c) iOS `Share` only and no Android PDF. Recommendation: (a) now, because it keeps
  every behaviour and the patch is small; (b) if the owner agrees the system printer is gone with the redesign.
- Risk: medium (PDF) / medium-high (print on iOS if unpatched).

### 4.5 `react-native-canvas` 0.1.40 (Star ticket image and the ticket preview)

- Last publish **2024-06-02**, repository untouched since; 32 open issues, none newer than 2024-12; peer `react-native-webview >= 5.10`.
  It is plain JS over a WebView (`Canvas.js` requires `react-native-webview` and posts messages), so it does not touch the
  architecture; it needs the WebView at 14.x and **declared** (today it is only transitive).
- The app uses it in `TicketPreview/index.tsx` (two hidden/visible canvases) and `TicketAutoPrint.tsx`: `createBitmapFromText` draws the
  monospace ticket text and `toDataURL('image/png')`, which Star prints through `actionPrintImage`. **The Star printing path depends on
  it.** Epson prints text natively and the generic BLE path builds ESC/POS bytes, so they do not.
- Known weakness (not a regression): a WebView per print, issue 340 (`toDataURL` insecure operation) on some WebView versions.
- Replacement if it must go: `@shopify/react-native-skia` offscreen surface (heavy: ~6 MB per ABI), or Star's own text commands
  (`actionPrintText` with a code page; loses the free choice of font and non-Latin scripts the image path gives). Neither is cheap;
  neither is needed to ship the upgrade. Recommendation: **keep**, declare `react-native-webview`, and verify a Star ticket prints on
  both platforms with webview 14 (phase b gate). Risk: medium (unmaintained, WebView-dependent), no known 0.88 failure.

### 4.6 `react-native-sound-player` 0.13.2 → 0.14.5 (new-order alarm in the app)

- Last publish 2025-02-11; its README (changed 2025-10-26) says "**This package is no longer actively maintained**" and points to
  `react-native-track-player`. 62 open issues. Legacy bridge module (interop). 0.14.5 reads the root `compileSdk`, so no patch
  (0.13.4 hard-coded 31 and failed its AAR metadata check in the driver).
- Used in `NewOrderNotification` (`SoundPlayer.playUrl(URL_SOUND)` every 2.5 s while the alert shows) and four log-only listeners in
  `App.tsx`. The mockups keep "ring until opened" and add a sound choice (Bell / Chime / Kitchen alarm): that needs bundled sound files,
  which `playSoundFile` supports (the sound is a CloudFront URL today, so the alarm needs network).
- The driver upgraded to 0.14.5 with no call change and **did not see it play on iOS** (device list item 14). Candidates if it fails:
  `react-native-audio-api` 1.0.1 (Software Mansion, published 2026-11-16, active), `react-native-nitro-sound` 0.2.x (published
  2026-11-19, needs `react-native-nitro-modules`), `react-native-track-player` 4.1.2 (2025-08, 5.0 only alpha). Not evaluated beyond that.
- Recommendation: upgrade to 0.14.5, and test it on an iPhone and an Android device as part of the push test list (O5).
  Risk: medium (the alert is the product).

### 4.7 `react-native-geolocation-service` 5.3.1 → `@react-native-community/geolocation` 3.4.0

- Last publish **2022-09-23**; legacy module; Gradle defaults to compileSdk 29. One importer (`src/ui/src/hooks/useLocation.tsx`:
  `getCurrentPosition`, `watchPosition`, `clearWatch`), used by MapView, DriverMap, GoogleMap and NewOrderNotification.
- Replacement: the marketplace already runs `@react-native-community/geolocation` 3.4.0 on 0.88.1 (TurboModule plus legacy); same call
  signature and response shape. The driver plan lists the traps: `setRNConfiguration({ skipPermissionRequests: true, locationProvider:
  'playServices' })` at start, and `watchPosition` ids collide when several watchers open and close, so keep one shared watcher. If
  the redesigned map (`MapTracking`) needs no live position, the whole hook can shrink further. Risk: low.

### 4.8 `react-native-fast-image` 8.5.11 (installed 8.6.41)

- **Maintained again:** 10.x published 2026-11-01/02 (10.11.0 latest, last commit 2026-11-03, 12 open issues), a Fabric component
  (`codegenConfig` type `all`, `FastImageView`), Glide 5; the marketplace pins `^10.11.0`; the driver removed it for `Image`.
- 5 importers here: the order lists' logos (`PreviousOrders/OrderItem`, `OrdersGroupedItem`), `PreviousMessages`, `BusinessController`,
  `GoogleMap/RenderMarker`. The orders list is this app's hottest screen and its items carry the business logo, which is where an
  immutable disk cache matters most (the driver's PERFORMANCE.md item 9 says it did not measure what it lost on iOS).
- Options (O3): (a) remove it and draw pictures with `Image` behind the `OAvatar` primitive (as the driver; the mockups mostly show
  initial discs); (b) keep `^10.11.0`, as the marketplace. Recommendation: (b) while store logos are in the list, revisit when the
  screens are rebuilt and pictures measured. The 10.x line is days old: its stability is **not verified**.

### 4.9 Chat extras: `@react-native-documents/picker`, `react-native-signature-canvas`, `react-native-image-picker`

- `@react-native-documents/picker` 11.0.4 → latest 12.1.0 (2026-11-16, very active, TurboModule, AGP 9 aware). One importer: the chat's
  "attach a file" button. The mockup composer has only an **image** button. The driver deleted its picker as dead code; here it is live
  code. If the redesign drops file attachments: remove. Otherwise upgrade to ^12.1.0 (the `pick()` API is unchanged; the 11 to 12
  notes were not found: not verified).
- `react-native-signature-canvas` (installed 4.7.4, latest 5.1.1, 2026-08): a WebView; the chat's pen button opens a signature pad that
  is sent as an image. Not in the mockup. Driver keeps `^4.3.0`. Keep with the driver's range unless O4 removes the feature.
- `react-native-image-picker` → ^8.3.0 (the photo button stays).

### 4.10 The rest of the "only this app" list

| Library | Last publish | Importers | Verdict |
|---|---|---|---|
| `@react-native-picker/picker` 2.11.4 | active (2.11.5, 2026-11-18) | **0** | remove; the app has no native picker, every select is a sheet |
| `react-native-lightbox-v2` 0.9.2 | 2024-09 | **0** | remove |
| `react-native-background-timer` 2.4.1 | 2020-10 | **0** (a type stub only) | remove, and delete `src/types/react-native-bckground-timer` |
| `react-native-geocoding` 0.5.0 | **2020-12** | 1 (`GoogleMap`: reverse geocode when a marker moves) | remove; if the map still reverse-geocodes, a 20-line `fetch` to the Geocoding API (the key is already in config) |
| `react-native-intersection-observer` 0.0.9 | 0.3.1 exists (2026-03) | 1 (`IOScrollView` in `BusinessProductList/ProductList`) | remove: the redesigned menu is a virtualised list (`Menu.dc.html`), which makes the observer unnecessary |
| `react-native-calendar-picker` 7.1.4 | 8.0.5 is 2024-07 | 1 (`ODropDownCalendar`) | primitive: `OCalendar` in a sheet (driver D2); its `moment` peer then only matters to the submodule |
| `react-native-linear-gradient` 2.7.3 | 2.8.3 is 2023; 3.0 beta | 1 (`ReviewCustomer` gradient) | primitive: the review is five segments (Review.dc.html, driver D2); gradient gone |
| `moment` 2.31.0 | 2026-09 (maintenance mode) | 4 app files + 2 in the submodule | keep as a dependency; move the 4 app files to `dayjs` (the same as the driver's 6) |
| `react-native-paper` 4.9, `react-native-select-dropdown` 1.x, `rn-placeholder`, `toggle-switch-react-native`, `react-native-loading-spinner-overlay`, `react-native-app-intro-slider`, `react-native-phone-number-input`, `@twotalltotems/react-native-otp-input`, `react-native-gifted-chat` 2.1.0, `react-native-country-picker-modal` | 2022 to 2025 | 1 to 13 each | primitives of driver D2 (12 libraries); each goes when its area is rebuilt |

## 5. Printing must not regress: what is and is not known

| Path | Library | Known | Unknown | Confidence that it prints after the upgrade (before a device test) |
|---|---|---|---|---|
| Star LAN / Bluetooth / USB | `react-native-star-io10` 1.14.0 + `react-native-canvas` + webview 14 | the vendor library runs through interop; code in 1.14.0 is the same API; the `.aar` and the manifest USB filters are unchanged; 16 KB OK | Star image path through webview 14 and a hidden WebView; the iOS scene delegate | medium (70%) |
| Epson LAN / Bluetooth / USB | `react-native-esc-pos-printer` 4.6.0-rc.0 | source identical to 4.5.1 which works today on RN 0.81; the codegen fix is the only change | the first iOS build on 0.88 with the rc; the connect latency (issue 243) exists today | medium-high (80%) with the rc; **0% with 4.5.1 unpatched on iOS** (does not compile) |
| Generic Bluetooth ESC/POS | `react-native-ble-plx` 3.5.1 | Android: fine in practice; iOS release: `createClient(null)` crash reported on 0.77 to 0.79 | whether RN 0.88's interop still crashes | medium on Android, **low-medium on iOS release until patched and tried** |
| System print / PDF | `react-native-print`, `react-native-html-to-pdf` | the PDF call is broken today; print breaks on the scene lifecycle | | PDF: high after the one-line fix; print on iOS: low unpatched |

These percentages are my judgement from reading sources and issues, not measurements. Nothing was built or run for this plan.
The gate for phase (b) is a **printed ticket from each of the four paths on a real device of each platform** (Star, Epson,
a generic BLE printer, and a PDF), compared to a ticket printed by today's `main` build.

## 6. Phases

Each phase is its own branch/commit series on top of the previous one in the worktree `upgrade/native`, ends with `npx tsc --noEmit`,
`pnpm lint:check`, `pnpm test` and (from (b)) a release bundle per platform, and says what it did not see. The redesign rebuilds
every screen, so the 12 `primitive` libraries are **not** upgraded: they stay at today's version, unused by new screens, until the
area using them is rebuilt (phase d). Libraries that cannot run on 0.88 at all are replaced at once (marked below).

### (a) Package manager and JavaScript dependencies

Files: `package.json`, `pnpm-workspace.yaml` (new; copy the driver's: `nodeLinker: hoisted`, `autoInstallPeers: false`, `overrides:
react-native: 0.88.1`, `patchedDependencies`, `allowBuilds` for `@sentry/cli`, `@firebase/util`, `protobufjs`), `pnpm-lock.yaml`
(new), `yarn.lock` (delete), `BUILD_CRA.txt` -> `BUILD_PNPM.txt` (driver's text), `NODE_VERSION.txt` (22), `.github/workflows/ci.yml` and
`i18n-sync.yml` (`pnpm/action-setup`, `cache: pnpm`, `pnpm install --frozen-lockfile`), `CLAUDE.md` / `README.md` (commands, remove
"patch-package" and "yarn"), `patches/` (delete the two screens patches).

1. **Remove everything nothing imports** (the 23 `remove` rows; 15 runtime ones have 0 importers: `@react-native-picker/picker`,
   `react-native-lightbox-v2`, `react-native-background-timer`, `react-native-awesome-loading`, `react-native-elements`,
   `react-native-picker-select`, `react-native-swipe-gestures`, `toggle-react-native`, `styled-system`, `@react-navigation/drawer`,
   `postinstall-postinstall`, `patch-package`, the three `@types/*` stubs; plus the five ESLint `standard` packages) and the type stubs under `src/types/` and `src/ui/src/types/` of the removed
   ones. Then `react-native-geocoding`, `react-native-intersection-observer`, `@react-native-documents/picker` (O4) with their one
   call site each.
2. Move to pnpm 12.18.0; `pnpm import` is not used (new lock). Declare `react-native-webview` and `uuid` 3.4.0.
3. Core versions: `react-native` 0.88.1, `react` / `react-test-renderer` 19.3.0, the five `@react-native/*` at 0.88.1 (add
   `@react-native/jest-preset`), CLI 20.2.0, `@types/react` ^19.2.0. `jest.config.js`: `preset: '@react-native/jest-preset'`;
   `.eslintrc.js` to `@react-native` (as the driver) and drop `eslint-config-standard` with its four plugins (add
   `eslint-plugin-jest` ^27.9.0); `tsconfig.json` may extend `@react-native/typescript-config`.
4. Libraries to the pins of section 3 (`upgrade` rows). **JavaScript call sites that change here:** React Navigation 7 (importers: `@react-navigation/native` 4 files, `stack` 2, `bottom-tabs` 1, plus the pages' `navigation` props) and
   `react-hook-form` 7 (7 files: `ForgotPasswordForm`, `Home`, `LoginForm` and four more), both driver-proven; `useLocation`
   to the community geolocation module; `OrderSummary` to `generatePDF`; the four `moment` files to `dayjs`. Navigation 6's stack needs
   a patch for the removed `InteractionManager` on 0.88 (driver finding), which is why navigation 7 moves in this phase.
5. `react-native-country-picker-modal` 2.0.0 uses `defaultProps` on function components (React 19): until the language and phone
   screens are rebuilt, take 3.0.0 as the interim. Other primitives' libraries are pure JavaScript and expected to run; any one that
   does not is replaced at once by its primitive.
6. Jest: `jest/setup.js` and `jest/helpers/*` mocks follow the library list (OneSignal v5 shape, notify-kit, bootsplash, geolocation).

### (b) Native builds on both platforms (printing gate)

Files: Android: `android/gradle.properties` (`newArchEnabled=true`, `android.builtInKotlin=false`, `android.newDsl=false`),
`android/build.gradle` (versions of section 2, google-services 4.4.4, crashlytics-gradle 3.0.8, drop the notifee `maven`, keep the Star
`flatDir`), `android/app/build.gradle` (drop play-services-maps 18.0.0 and core-splashscreen, drop the `fonts.gradle` line and the
`:react-native-vector-icons` project; `proguard-android-optimize.txt`), `android/settings.gradle`, `gradle-wrapper.properties` (9.4.1),
`MainApplication.kt`, `MainActivity.kt` (keep `super.onCreate(null)` with screens 4.x), `AndroidManifest.xml`. iOS: `ios/Podfile`
(`$RNFirebaseDisableSPM = true`, `pod 'react-native-maps/Google'`, drop the GoogleMaps pin, keep the iPad family hook and the fmt
header patch), `ios/businessApp/AppDelegate.swift` (scene-based; template of RN 0.88.1), new `SceneDelegate.swift`, `Info.plist`
(`UIApplicationSceneManifest`), `project.pbxproj`, `Podfile.lock`. Patches: notify-kit (not until (c)), `react-native-ble-plx`,
`react-native-print` (if O2 a). Printers: `react-native-star-io10` 1.14.0, `react-native-esc-pos-printer` per O1.

Gate (the owner's devices): a debug and a release build on each platform; a ticket from Star, Epson, generic BLE and a PDF; the app
opens, logs in, lists orders, plays the alert sound. The Android Gradle build is the long pole (AGP 9 with libraries whose Gradle
files are old: `react-native-print` hard-codes SDK 31, `react-native-esc-pos-printer` and `-html-to-pdf` declare AGP 8.7.2 in their
own buildscript block; the driver and marketplace build such libraries, but those two were not in either).

### (c) Identifiers, splash, push stack

Identifiers (owner, 2026-11-19): Android package and iOS bundle `co.ordering.business`; iOS project, target and scheme `OBusiness`.
Files (the driver's commit `cf97f31` is the template): `android/app/build.gradle` (`namespace`, `applicationId`),
`android/app/src/main/java/com/businessapp/*` -> `.../co/ordering/business/*` (`MainActivity`, `MainApplication`,
`NotificationServiceExtension`), `AndroidManifest.xml` (extension meta-data), `android/app/_BUCK`, `google-services.json`;
`ios/businessApp` -> `ios/OBusiness` (folder, `OBusiness.entitlements`, bridging header, `Info.plist`),
`ios/businessApp.xcodeproj` -> `OBusiness.xcodeproj` (targets, scheme, `PRODUCT_BUNDLE_IDENTIFIER`, the extension
`co.ordering.business.OneSignalNotificationServiceExtension`), `ios/businessApp.xcworkspace`, `ios/Podfile` (target names),
the app group `group.co.ordering.business.onesignal` in both entitlements files, `ios/GoogleService-Info.plist`, `builder.json`
(`ios_project`, `ios_bundle`, `android_package`), `app.json` (decision for the coordinator: the driver kept the JavaScript module
name and changed only `displayName`; `MainActivity.getMainComponentName` and `AppDelegate.startReactNative(withModuleName:)` must
match whichever is chosen), Sentry release names. **Needed outside the repository** (driver HANDOVER section "Needed outside the
repository"): Firebase apps registered for the new identifier with fresh `google-services.json` and `GoogleService-Info.plist`, the Apple
App IDs, app group, push key and profiles, OneSignal's app configuration, Google Maps keys restricted by package and bundle.

Splash: `react-native-bootsplash` ^7.3.5 (driver `docs/SPLASH.md`): `BootSplash.storyboard` (replaces `SplashScreen.storyboard`),
`Images.xcassets/BootSplashLogo.imageset`, `res/values/styles.xml` `BootTheme`, `colors.xml`, `drawable-*dpi/bootsplash_logo.png`,
`MainActivity.kt` (`RNBootSplash.init`), `AppDelegate.swift` (`RNBootSplash.initWithStoryboard`), `src/pages/Splash.tsx`,
`src/BusinessApp.tsx` (one `hideSplash()`), remove `RNSplashScreen.show()` and `res/layout/launch_screen.xml`.

Push: `src/navigators/RootNavigator.tsx` (404 lines: the OneSignal v4 calls at lines 168 to 213 and notifee at 108 and 123) -> port
the marketplace's `oneSignalPush.ts` and `pushProviderSwitch.ts` (the driver plan section "Push" has the call table); OneSignal 5.5.17;
Firebase 26.4.1 (JS calls already modular); `react-native-notify-kit` 9.7.0 with the JDK patch; the Android
`NotificationServiceExtension.kt` (28 lines, v4 classes `OSNotificationReceivedEvent`) rewritten for `INotificationServiceExtension`;
the iOS `NotificationService.swift` (`import OneSignalExtension`); `Podfile` pod `OneSignalXCFramework` 5.8.1; the
`new_order_alarm` channel in `MainApplication.kt` stays. reCAPTCHA: the app's `RecaptchaV3` component replaces
`@fatnlazycat/react-native-recaptcha-v3` in `LoginForm`.

Gate: push in the three app states on both platforms (owner's phones), cold start with the new splash, login with reCAPTCHA off.

### (d) Cleanup after the screens are rebuilt

As each area is rebuilt, delete its library and its mocks: gifted-chat and parsed-text (Chat), intro-slider (IntroductoryTutorial),
phone-number-input and country-picker-modal (PhoneInputNumber, LanguageSelector, OrderDetails), otp-input (LoginForm/Otp),
select-dropdown (4 files), calendar-picker + paper + gesture-handler's `ScrollView` (the two `ODropDown*` files), rn-placeholder
(13), toggle-switch (8), loading-spinner-overlay (2), linear-gradient, vector-icons (35 files -> the one `Icon`, then remove the
Gradle and `UIAppFonts` lines), map-link `Popup` -> the app's sheet, `fast-image` per O3. Then: `moment` out of the app's 4 files,
the `src/types/*` and `src/ui/src/types/*` stubs, the jest mocks of removed libraries, a `pnpm why` pass for anything left unused,
the CLAUDE.md "Common mistakes" list, and the "not now" list as issues (`typescript` 6/7, `eslint` 9+, `jest` 30, `prettier` 3,
async-storage 3, gesture-handler 3, Firebase 27, Babel 8: the sister apps stay on today's majors).

## 7. Decisions for the owner

Only where a real choice exists. Recommended option first.

| # | Topic | Options | Recommendation |
|---|---|---|---|
| O1 | Epson library on RN 0.88 (iOS does not compile with 4.5.1) | (a) `react-native-esc-pos-printer` **4.6.0-rc.0** pinned exactly: same source as 4.5.1, regenerated codegen, from the author, a pre-release tag · (b) 4.5.1 plus a pnpm patch that adds the missing `ResultT` aliases (issue 249 has a patch) · (c) another Epson integration (none researched) | (a); fall back to (b). Either way, an Epson ticket on iOS before merging |
| O2 | System printing and PDF export | (a) keep `react-native-print` with a small iOS patch, keep Android's print-to-PDF path, fix the `generatePDF` call · (b) drop `react-native-print`, share the PDF with `react-native-share` (new dependency), no system-printer entry (the mockups show only "Share as PDF") · (c) iOS share only | (a) now; (b) if the system printer is dropped on purpose |
| O3 | Image cache | (a) remove `react-native-fast-image`, `Image` behind `OAvatar` (driver) · (b) keep, upgrade to ^10.11.0 (marketplace) | (b) while logos are in the orders list; measure before (a) |
| O4 | Chat extras the mockup does not show (file attach, signature pad) | (a) keep them (document picker ^12.1.0, signature canvas ^4.3.0) · (b) remove both libraries and features · (c) remove one | the mockup is the design: ask whether (b) is intended; if no answer, (a) |
| O5 | Alert sound library | (a) keep `react-native-sound-player` 0.14.5 (unmaintained) and test · (b) move to `react-native-audio-api` or `react-native-nitro-sound` now | (a); re-decide after the device test |
| O6 | Generic BLE printers on iOS | (a) keep `react-native-ble-plx` 3.5.1 with the issue's patch, test on a real iPhone Release build · (b) ship generic BLE on Android only until tested | (a) |
| O7 | JavaScript module name (`app.json`) | (a) keep `businessApp` (as the driver kept `deliveryApp`) · (b) rename with the project to `OBusiness` | (a): fewer files; native entry points name it |

## 8. Not verified

- Nothing was installed, built or run for this document; every "works on 0.88" statement is read from package contents, issues and the
  two sister apps' pins, not from a build. That RN 0.88 still routes legacy modules (Star, ble-plx, sound-player, print) through
  the interop layer is taken from the driver plan's citation of the RN 0.82 post, not re-read.
- Whether the interop layer in 0.88 still crashes on `createClient(null)` (ble-plx), and the exact effect of the missing `ResultT` on
  the Epson iOS build (read from RN's header and the package, not compiled).
- Behaviour of `react-native-canvas` with webview 14 and of Star's image print with it; of fast-image 10.x (a week old); of
  `react-native-print` after the PR 237 change (the PR is open, I did not apply it).
- That `react-native-html-to-pdf` 1.3.0's `generatePDF` produces a file at `result.filePath` on both platforms (the type says so).
- The 11-to-12 changes of `@react-native-documents/picker` (no release notes found) and whether its AGP 9 handling is complete.
- `react-native-star-io10`: "supports the new architecture" is a vendor reply on a closed issue, not a documented guarantee.
- What the Builder reads from `builder.json` for the new identifiers (the driver plan could not confirm either).
- "Last publish" is the registry's publish date of the latest version, not a judgement of each project's health; stars/issue counts
  are from the GitHub API on 2026-11-19.
- Android Studio's JBR 25 works with Gradle 9.4.1 per the driver/marketplace, not checked here (no `java` on this machine's PATH).
