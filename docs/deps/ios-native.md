# iOS native step: React Native 0.88.1, the app's own identifiers, printing

Written 2026-11-19 on branch `upgrade/native`, from the model `ordering-app-driver-theming` (its
`docs/deps/core-upgrade.md`, `push-phase.md`, `shell-phase.md`, `docs/SPLASH.md`). Everything here is
`ios/**`, `builder.json` (iOS fields), `app.json` (`displayName`) and two pnpm patches. Android is another agent's step.

## 1. What changed

| Commit | What |
|---|---|
| `a47231b` | Core: scene lifecycle (`AppDelegate.swift` holds `AppDelegate`, `SceneDelegate`, `ReactNativeDelegate`, ported from the driver's without its User-Agent / device-id / location parts), `UIApplicationSceneManifest`, pod targets never below React Native's minimum (15.1), bridging header without `RNSplashScreen` |
| `8ab6c95` | Patches: `react-native-ble-plx@3.5.1` and `react-native-print@0.11.0` (section 3) |
| `32dfa43` | Libraries: bootsplash, OneSignal 5 and the service extension, Firebase 26 from CocoaPods, scoped icon fonts, maps, permission texts, `Podfile.lock` |
| `4bc5608` | Identifiers and name (section 4) |
| `26a3ef4` | iPad orientations (section 5) |

**Core.** New architecture and Hermes are what React Native 0.88 gives: `RCTNewArchEnabled` true in both `Info.plist`s, Hermes
from the prebuilt `hermes-engine` (260318099.0.5), React from the prebuilt `React-Core-prebuilt` 0.88.1. Deployment target
stays 15.1 (the project's, the extension's, and every pod's through the `post_install` hook, as the driver). The fmt
`consteval` header patch (Xcode 26+) and the `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES` hook are kept; the
`ENABLE_BITCODE` line is gone (Apple removed bitcode). The iPad family hook (`TARGETED_DEVICE_FAMILY = 1,2` in the
aggregate xcconfigs) is kept. `pod install` is Homebrew's `pod` (CocoaPods 1.17.0), as the driver runs it: `bundle exec` does not
work with the macOS system Ruby 2.6 and the Gemfile (`~> 1.13` is satisfied by the Homebrew pod; `Gemfile` is unchanged).
`pod install` first failed on the old lock (Firebase 12.10 against RNFB 26's 12.19), so the Firebase pods, Google pods, nanopb,
Promises and OneSignal were `pod update`d once; `Podfile.lock` is committed.

**Libraries.**
- `react-native-bootsplash` 7.3.5: `BootSplash.storyboard` (white sRGB background, the Ordering wordmark 250 x 56 pt centred) and
  `Images.xcassets/BootSplashLogo.imageset`, from the app's current launch logo (`SplashImage` @3x, 798 x 180, the same bytes as
  the driver's `launch-logo.png`; the bootsplash CLI was run from it and its output equals the driver's imageset byte for byte, which
  I then copied under the fixed names the Builder expects). `SplashScreen.storyboard` and the `SplashImage` imageset are removed.
  `UILaunchStoryboardName` is `BootSplash`; `ReactNativeDelegate.customize(_:)` calls `RNBootSplash.initWithStoryboard`.
  The splash is hidden by JavaScript (`hideSplash()`, the JS step's job).
- OneSignalXCFramework 5.8.1 for the extension target (the version `react-native-onesignal` 5.5.17's podspec asks for);
  `NotificationService.swift` imports `OneSignalExtension`, calls `OneSignalExtension.didReceiveNotificationExtensionRequest(_:with:withContentHandler:)`
  with a wrapping handler that applies the order alarm (`order_sound_notification.caf`, `.timeSensitive`, `relevanceScore 1`) to the
  content OneSignal hands back, and the same on `serviceExtensionTimeWillExpire`. The driver's secure-order masking is not in this app
  and was not added.
- `$RNFirebaseDisableSPM = true` (pods are static; Firebase 12.19.3 comes from CocoaPods), RNFB 26.4.2.
- notify-kit (pod `RNNotifee` 9.7.0), `react-native-geolocation` 3.4.0, `RNSoundPlayer` 0.14.5: autolinked, nothing to configure.
- Icon fonts: the 11 scoped `@react-native-vector-icons/*` packages ship their TTFs as pod resources; `UIAppFonts` lists the 13
  files (`AntDesign`, `Entypo`, `Feather`, `FontAwesome`, `FontAwesome5_Brands/Regular/Solid`, `Fontisto`, `Foundation`,
  `Ionicons`, `MaterialDesignIcons`, `MaterialIcons`, `SimpleLineIcons`). Gone: `EvilIcons`, `Octicons`, `Zocial`, and
  `MaterialCommunityIcons` (now `MaterialDesignIcons`). All 13 are in the built app bundle. The app's own fonts are the 40 catalog files of
  `src/assets/fonts` (`<Family>-{Regular,Medium,SemiBold,Bold}.ttf` for Archivo, Inter, Lato, Montserrat, Nunito, OpenSans,
  PlayfairDisplay, Poppins, Raleway, Roboto), linked on 2026-11-19 with `npx react-native-asset` (config: `assets` in
  `react-native.config.js`): the Xcode project holds exactly those 40 as resources of the `OBusiness` target, `UIAppFonts` lists
  the 40 plus the 13 icon fonts, and `ios/link-assets-manifest.json` has the 40 (the 72 old files, `Inter_18pt/24pt/28pt-*`,
  `Lato-*` cuts, `Poppins-Light/Thin`, are unlinked). The tool also registers the fonts in the notification extension
  (its `Info.plist` and a Resources phase); that was reverted by hand (the extension paints nothing), as the driver did: **after
  running `react-native-asset` again, undo the extension's `UIAppFonts` and its font entries in the project file.** The built app
  bundle holds 53 TTFs (40 + 13). `src/theme/__tests__/fontsLinked.test.ts` passes (11 tests).
- `LSApplicationQueriesSchemes` for react-native-map-link 3: the 19 schemes already in `Info.plist` are kept as they were (the
  driver's list is the same shape); not compared against map-link 3's own list (section 7).
- Maps: `pod 'react-native-maps/Google'` (GoogleMaps 9.4.0 and Google-Maps-iOS-Utils come with it; the `GoogleMaps 7.4.0` pin is
  gone). The key in `AppDelegate.swift` was already the marker `_GOOGLE_MAPS_API_KEY_`: nothing to replace, no key exists in any
  source file of this project.

## 2. Printing: what builds, and the keys

All four paths compile and link in Debug and Release for the simulator: `react-native-star-io10` 1.14.0 (its vendor
xcframework), `react-native-esc-pos-printer` 4.6.0-rc.0 (with its `libepos2` xcframework: the pnpm `allowBuilds` entry copies it),
`react-native-ble-plx` 3.5.1 (patched), `react-native-print` 0.11.0 (patched). **Nothing was printed**: a simulator has no
Bluetooth and no printer.

`Info.plist` keys the printers need, as they are: `NSBluetoothAlwaysUsageDescription`, `NSBluetoothPeripheralUsageDescription`,
`NSLocalNetworkUsageDescription`, `UISupportedExternalAccessoryProtocols` (`jp.star-m.starpro`, Star's Bluetooth / USB protocol).
**There is no Bonjour key (`NSBonjourServices`) and none was added**: I searched the strings of both vendor binaries for service
types (`_xxx._tcp`) and found none (Star and Epson discover on the LAN by their own broadcast, not by Bonjour). **`com.epson.escpos` is
not in `UISupportedExternalAccessoryProtocols`** (it was not before either; the binary names it for MFi Bluetooth / USB): adding an
accessory protocol has App Store review consequences (the MFi program), so it is the owner's decision if an Epson model that needs
MFi is used on iOS.

## 3. The two pnpm patches (`patches/`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`)

- `react-native-ble-plx@3.5.1`: `ios/BlePlx.m` `createClient:` takes `id` and treats a non-string as "no restore identifier". The JS
  side calls `createClient(null)` on every `new BleManager()` (the app does this in `GenericBlePrinterAdapter.ts`); with the new
  architecture a null for an `NSString *` argument crashed Release builds (upstream issue 1278, the plan section 4.3). Not run on a
  device: whether 0.88's interop would have crashed without it is not known, the patch makes it irrelevant.
- `react-native-print@0.11.0`: `ios/RNPrint/RNPrint.m` read `[[[UIApplication sharedApplication] delegate] window]` (an
  `AppDelegate` window the scene lifecycle does not provide by itself) and the deprecated `keyWindow`; a helper returns the key
  window of the foreground active scene and all three sites use it. Android is not touched by this patch.

## 4. Identifiers and name

| Before | Now |
|---|---|
| `ios/businessApp`, `.xcodeproj`, `.xcworkspace`, scheme, target, product, `Pods-businessApp`, Podfile target | `OBusiness` (history kept with `git mv`) |
| `com.ordering.app1` | `co.ordering.business` |
| `com.ordering.app1.OneSignalNotificationServiceExtension` | `co.ordering.business.OneSignalNotificationServiceExtension` |
| `group.com.ordering.app1.onesignal` (both entitlements files) | `group.co.ordering.business.onesignal` |
| `CFBundleDisplayName` `businessApp` | `OBusiness` (`InfoPlist.xcstrings` has no display-name entry to change) |
| `GoogleService-Info.plist` `BUNDLE_ID` (it was `com.ordering.app1.onesignal`, itself a mismatch) | `co.ordering.business`: **only that line; the other keys still belong to the old Firebase app. It is not a registration.** |
| `builder.json` `ios_project`, `ios_bundle` | `OBusiness`, `co.ordering.business` |
| `app.json` `displayName` | `OBusiness`; `name` stays `businessApp` (the JavaScript module name, `AppDelegate.swift` `withModuleName`, `MainActivity`) |

Left as they were, outside this step: `src/ui/src/components/DriverMap/index.tsx` passes `naverCallerName: 'com.businessApp'` to
map-link (a caller name for the Naver app, not an identifier of the build); `src/utils/__tests__/sentry.test.ts` mocks
`com.ordering.app1` (a test of the release-name format); `CLAUDE.md` still describes `businessApp` / `com.ordering.app1`.
Sentry's release names start with `co.ordering.business@` now.

## 5. Tablet

The project already had `TARGETED_DEVICE_FAMILY = 1,2` (app and extension). `Info.plist` declares: `UIRequiresFullScreen` true
(kept: the app opts out of Split View / Slide Over; Apple has deprecated the key for iPadOS 26 windowing, re-check it when the tablet
board is tried in a resizable window), `UISupportedInterfaceOrientations` portrait + both landscapes (iPhone, as today; it has no
upside-down), and **added** `UISupportedInterfaceOrientations~ipad` with all four. `UIUserInterfaceStyle` Light stays. No
`UIRequiredDeviceCapabilities` change (`armv7` was there before and is still satisfied).

## 6. What the Builder base must replace (as the driver's HANDOVER section 2)

| What | Where | How |
|---|---|---|
| Google Maps key | `ios/OBusiness/AppDelegate.swift` | replace the text `_GOOGLE_MAPS_API_KEY_` |
| Launch splash logo | `ios/OBusiness/Images.xcassets/BootSplashLogo.imageset/logo{,@2x,@3x}.png` (250 x 56 pt) | replace the files |
| Launch splash color | `ios/OBusiness/BootSplash.storyboard` | the white `<color>` (sRGB) |
| App name | `ios/OBusiness/Info.plist` `CFBundleDisplayName` | `OBusiness` today |
| Bundle id, version, team | `ios/OBusiness.xcodeproj/project.pbxproj` | `co.ordering.business` and `.OneSignalNotificationServiceExtension`; the team id in the file is the old one |
| App group | both `.entitlements` | `group.co.ordering.business.onesignal` |
| Firebase file, app icons | `ios/GoogleService-Info.plist`, `ios/OBusiness/Images.xcassets/AppIcon.appiconset` | as the current base |
| Runtime configuration | `src/config.json` | as every base |

`builder.json` is kept up to date, but the owner said the Builder does not read it. The pipelines must keep `ios/Podfile.lock`,
run Homebrew-style `pod install` (not `bundle exec` with the system Ruby), use Xcode 26 or later and honor `BUILD_PNPM.txt`.
The iOS project, scheme and bundle names a base action refers to change: `ios/businessApp/...` paths become `ios/OBusiness/...`.

**The pods' spec source is the git repository** (`source 'https://github.com/CocoaPods/Specs.git'` at the top of `ios/Podfile`, and
`SPEC REPOS` in `ios/Podfile.lock` naming it), since 2026-11-23. The Builder's iOS pipeline resolves pods from that repository (it
adds the line to a Podfile that lacks it) and keeps this app's lock; a lock whose `SPEC REPOS` says `trunk` (the CDN) sends the
locked versions there, and the first Builder build stopped in `pod install` on the locked Firebase version for that reason. After any
`pod install` check that `SPEC REPOS` still names the git repository before committing the lock.

## 7. Checks (all from clean DerivedData inside `ios/build`, which is git-ignored)

Xcode 27.2, iOS 27.2 SDK, Homebrew CocoaPods 1.17.0, workspace `ios/OBusiness.xcworkspace`, scheme `OBusiness`.

| Build | Result | Time | Size of `OBusiness.app` |
|---|---|---|---|
| Debug, iPhone 17 Pro simulator (`-derivedDataPath ios/build/dd-debug`) | BUILD SUCCEEDED | 363 s (6 min 3 s) | 170 MB (with the extension in `PlugIns/`) |
| Release, generic iOS Simulator (`-derivedDataPath ios/build/dd-release`) | BUILD SUCCEEDED | 743 s (12 min 23 s) | 183 MB (the executable 86 MB, `main.jsbundle` 9.7 MB) |

The built `Info.plist` reads `co.ordering.business`, display name `OBusiness`, `MinimumOSVersion` 15.1, launch storyboard `BootSplash`; the
extension is `co.ordering.business.OneSignalNotificationServiceExtension`; the 13 icon fonts and the localized permission strings
(`en`, `de`, `es`, `fr`) are in the bundle.

**Run (iPhone 17 Pro, Debug, Metro on 8098, no login):** the app launched, Metro bundled `index.js`, and the welcome screen of today's
app (the former home: the shop photo, "Manage your business", the Login button) was on screen; the device log showed no crash,
and the process was still alive; no crash report was written. A first launch without the `RCT_jsLocation` default showed React
Native's red "No script URL provided" screen (Metro was on 8098, the build looks at 8081): that is the setup, not a defect.

**iPad: not run.** The iPad Air 11-inch (M4) the task names (`AC413722-...`) is an iOS 27.0 device; its installer (`installd`) loops
on `Info.plist missing` in a runtime mount that is no longer there, and `simctl install` never returns (tried after a shutdown, boot
and an erase). The other iPad Air of this machine runs iOS 27.2, but it is not among the simulators this work may use, so it was not
touched. The iPad family, the four orientations and the scene lifecycle on an iPad are read from the project, not seen.

Not verified, in one list: printing on real printers (Star LAN / Bluetooth, Epson, a generic BLE printer, PDF / system print), push in
any state, the extension running, Release on a phone, signing and archive, Bluetooth, the camera and photo flows, the system permission
prompts, `LSApplicationQueriesSchemes` against map-link 3's own list, the iPad and landscape on both devices, and the Builder.

Debug runs resolve JavaScript from Metro on 8081 by default (React Native's prebuilt core fixes the port): for another port,
`xcrun simctl spawn <device> defaults write co.ordering.business RCT_jsLocation localhost:<port>` before launching.

## 7b. Orientation and the iPad (2026-11-19)

Decision: phones are portrait only, tablets rotate freely. `Info.plist`: `UISupportedInterfaceOrientations` (iPhone) is
`Portrait` only; `UISupportedInterfaceOrientations~ipad` keeps the four. `UIRequiresFullScreen` stays `true` (no Split View /
Slide Over), as before. Run on iPhone 17 Pro (Debug, Metro 8098): the welcome screen of today's app drew in Poppins, the log had
no font warning. Run on **iPad Pro 11-inch (M5), iOS 27.2** (`8078BDBA-...`; the iOS 27.0 iPad Air `AC413722-...` still cannot
install): the install worked and the app launched at 1668x2420 (portrait) and drew the same welcome screen. **Rotation was not
exercised on either simulator**: no tool of this machine rotates a simulator (`simctl` has no rotate command, and `osascript` is
not allowed to send keystrokes to Simulator), so portrait-only on the iPhone and free rotation on the iPad are read from the
plist, not seen.

## 8. Needed outside the repository

The owner must register: an App ID `co.ordering.business` and an App ID for the extension, the app group
`group.co.ordering.business.onesignal` on both, the push key (APNs) and profiles, the OneSignal app's configuration for the new
bundle, a **Firebase iOS app for `co.ordering.business` with a fresh `GoogleService-Info.plist`** (and the Android one), and a Google
Maps key restricted to the bundle. `DEVELOPMENT_TEAM` in the project is still the old team's; no signing was tried (the
simulator builds need none). A build over an installed old app installs as a new app and registers new push tokens.

## 9. After the JavaScript cleanup (2026-11-19, main checkout `feature/theming-native`)

The JavaScript side removed 24 packages (documents picker, fast-image, linear-gradient, gifted-chat, calendar-picker, country-picker, paper,
nine vector-icon families, and others). The native side followed:

- `pod install` (Homebrew `pod` 1.17.0, 23 s): `Podfile.lock` lost 141 lines (`BVLinearGradient`, `libwebp` through fast-image, `react-native-document-picker`, and
  the pods of the other removed packages). The `OBusiness.xcodeproj` diff is CocoaPods rewriting the property order of the 40 font entries (no font added or removed).
- `UIAppFonts` now lists the 40 catalog fonts plus `Ionicons.ttf` and `MaterialDesignIcons.ttf` (42). The 11 other icon fonts (`AntDesign`, `Entypo`, `Feather`,
  `FontAwesome`, `FontAwesome5_Brands/Regular/Solid`, `Fontisto`, `Foundation`, `MaterialIcons`, `SimpleLineIcons`) are gone from the plist. The built
  `OBusiness.app` holds 42 TTFs.
- The old `SplashImage` image set and `SplashScreen.storyboard` were already gone (section 1); nothing references `SplashImage`.
- Debug build from this checkout (first build here, no Pods before): `xcodebuild -workspace OBusiness.xcworkspace -scheme OBusiness -configuration Debug
  -sdk iphonesimulator -destination 'platform=iOS Simulator,id=<udid>' -derivedDataPath build/dd-debug build`: BUILD SUCCEEDED in 328 s.
- Installed and launched on iPhone 17 Pro and iPad Pro 11-inch (M5) with Metro on 8097 (`RCT_jsLocation localhost:8097`).
  Both show a JavaScript red screen, not a native fault: `Couldn't find a screen named 'Login' to use as 'initialRouteName'`
  (`src/navigators/RootNavigator.tsx` line 109-113: while `launched` is false only the `Splash` screen is registered, but `initialRouteName` is already `Login`).
