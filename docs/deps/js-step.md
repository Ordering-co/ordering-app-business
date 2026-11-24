# JavaScript step: pnpm 12, React Native 0.88.1 and the libraries, on the JavaScript side

Branch `upgrade/native`, worktree `ordering-app-business-theming-native`. Date 2026-11-19. Model: the driver app
(`ordering-app-driver-theming`: `docs/DEPENDENCIES_PLAN.md`, `docs/deps/core-upgrade.md`, `push-phase.md`,
`shell-phase.md`) and this repository's own plan, [../DEPENDENCIES_PLAN.md](../DEPENDENCIES_PLAN.md) (phase (a)).

This step touches **no** native project (`android/`, `ios/`) and ran no `pod install`, Gradle or Xcode. The native
projects still describe the old libraries: the native agents start from section 6.

## 1. What changed

### Package manager (commit `145af34`)

- pnpm 12.18.0 (`packageManager`, corepack), `engines.node >= 22.13.0`, `NODE_VERSION.txt` stays 22.
- `pnpm-workspace.yaml`: `nodeLinker: hoisted` (autolinking, CocoaPods and Gradle read `node_modules/<name>`),
  `autoInstallPeers: false`, `overrides: react-native: 0.88.1`, `patchedDependencies`, `allowBuilds`.
- `allowBuilds` differs from the driver's: `react-native-esc-pos-printer: true` (its postinstall copies the Epson SDK
  into the library's own `ios/` and `android/libs`, `jniLibs`: the native builds need it; Yarn ran it) and
  `react-native-calendar-picker: false` (installs git hooks of its own repository).
- `BUILD_CRA.txt` replaced by `BUILD_PNPM.txt` (the driver's text), `yarn.lock` deleted, `pnpm-lock.yaml` new
  (first from `pnpm import` so the pm commit changed no version, then regenerated at the target versions).
- CI (`.github/workflows/ci.yml`): `pnpm/action-setup`, `cache: pnpm`, `pnpm install --frozen-lockfile` with the lock and
  marker check, and a release-bundle step for both platforms (as the driver's). `i18n-sync.yml` has no install step.
- Docs and scripts say pnpm (`README.md`, `CLAUDE.md`, `docs/*`, `scripts/coverage-summary.js`, `i18n/*`, both
  translate-keys skills).
- `patch-package` and `postinstall-postinstall` removed. `package.json` never had a `postinstall` script, so nothing ran
  patch-package; the two files in `patches/` targeted react-native-screens 3.x (installed 4.14) and never applied: deleted.

### Versions (commits `9137488`, `7d303bf`)

| Group | Now |
|---|---|
| Core | react-native 0.88.1, react and react-test-renderer 19.3.0 (exact: RN 0.88.1's renderer reports 19.3.0), `@react-native/{babel-preset,eslint-config,metro-config,typescript-config,jest-preset}` 0.88.1, community CLI 20.2.0, `@types/react` ^19.2.0 |
| Shared with the driver at its pin | navigation (native ^7.5.1, stack ^7.12.1, bottom-tabs ^7.21.0), react-hook-form ^7.91.0, gesture-handler 2.33.1, screens 4.30.1, safe-area-context 5.11.1, maps 1.29.11, webview ^14.0.1, permissions 5.6.3, device-info ^15.0.2, image-picker ^8.3.0, restart ^0.0.29, Sentry 8.35.0, map-link ^3.15.0 |
| Replacements | react-native-onesignal 5.5.17, `@react-native-firebase/*` ^26.4.1, react-native-notify-kit ^9.7.0 (+ the driver's JDK patch, same file) for notifee, react-native-bootsplash ^7.3.5 for splash-screen, `@react-native-vector-icons/*` 14.0.0 for react-native-vector-icons, react-native-sound-player 0.14.5, `@react-native-community/geolocation` 3.4.0 for react-native-geolocation-service |
| Printing and this app's own | react-native-esc-pos-printer **4.6.0-rc.0** (exact), react-native-star-io10 **1.14.0**, react-native-ble-plx 3.5.1, react-native-print ^0.11.0, react-native-html-to-pdf 1.3.0, react-native-canvas ^0.1.40, documents picker ^11, signature-canvas ^4.3.0, fast-image ^10.11.0, country-picker-modal 3.0.0 |
| Added | `uuid` 3.4.0 (the submodule's `AddressForm` imports it; it only arrived through gifted-chat), `react-native-webview` ^14.0.1 declared (canvas, signature, recaptcha and others need it), devDependencies `@orderingco/ordering-theme-engine` 0.14.0 (nothing uses it yet), `@react-native/jest-preset`, `eslint-plugin-jest` |

Not touched (kept at today's version until the screens that import them are rebuilt): gifted-chat, rn-placeholder,
select-dropdown, calendar-picker, phone-number-input, otp-input, react-native-paper, linear-gradient, toggle-switch,
loading-spinner-overlay, app-intro-slider, the two recaptcha libraries (`@fatnlazycat/react-native-recaptcha-v3`,
`react-native-recaptcha-that-works`), react-native-print, documents picker, signature canvas, sound-player (owner has not
decided, plan O2, O4, O5). All of them installed and bundle.

### Removed (nothing imports them; verified by search in `src/`, `index.js`, `App.tsx`, `jest/`, `__tests__/` and in the
submodule's import closure)

`@react-native-picker/picker`, `@react-navigation/drawer` (only a Jest mock), `react-native-elements`,
`react-native-lightbox-v2`, `react-native-picker-select`, `react-native-swipe-gestures`, `styled-system`,
`toggle-react-native`, `react-native-awesome-loading`, `react-native-background-timer` (only a type stub),
`@types/styled-components`, `@types/react-native-loading-spinner-overlay`, `@types/react-native-html-to-pdf`,
`patch-package`, `postinstall-postinstall`, the five ESLint `standard` packages. With one call site each:
`react-native-geocoding`, `react-native-intersection-observer`, `react-native-geolocation-service`,
`react-native-splash-screen`, `@notifee/react-native`, `react-native-vector-icons`.

`@react-native-firebase/app` and `/crashlytics`, `react-native-screens` have no JavaScript importer: kept (native init,
navigation peer). `moment` stays (two submodule files import it); `decimal.js`, `libphonenumber-js`, `prop-types`,
`socket.io-client`, `dayjs` are the submodule's too. The submodule's import closure (`native/index.js`) reaches only
these external packages: react, prop-types, dayjs, moment, decimal.js, libphonenumber-js, socket.io-client, uuid,
`@react-native-async-storage/async-storage`; all are direct dependencies (the other imports under
`src/@/components/src` are web-only files nothing reaches).

### Patches kept / dropped (`patches/`, applied by pnpm)

| Patch | State |
|---|---|
| `react-native-notify-kit@9.7.0.patch` | kept; byte-identical to the driver's (Gradle script builds with any JDK >= 17, Android Studio's JBR 25 included) |
| `react-native-star-io10@1.14.0.patch` | new, **types only**: `new Promise(resolve => setTimeout(resolve, ms))` in `Lock.ts` and `StarIO10Logger.ts` became `new Promise<void>`. The library ships `.ts` sources and `index.d.ts` re-exports them, so `tsc` checks them; with RN 0.88's `setTimeout` typing it failed (also in 1.14.0). No runtime change. Drop when the library fixes it |
| `react-native-screens+3.29.0`, `+3.37.0` (patch-package) | dropped (never applied, wrong major) |

## 2. Call sites adapted (smallest change that keeps behaviour)

- **React Native 0.88**: `StatusBar` loses `backgroundColor`/`translucent` (removed in 0.87) in `Container`, `Home`,
  `IntroductoryTutorial` (`SafeAreaContainer` still spreads `backgroundColor` for the offline bar: ignored at run time, left
  because it type-checks and the redesign rewrites it); `StyleSheet.absoluteFillObject` -> `absoluteFill`; refs typed
  `ScrollViewInstance` / `TextInputInstance`; `Dimensions` change handlers typed `ScaledSize`; `PlatformIOSStatic` is gone
  (`Platform.OS === 'ios' && Platform.isPad`); `StyleSheet.flatten(...) ?? undefined` in `UserProfileForm`; `Promise<void>` for
  `wait()` in the BLE adapter.
- **tsconfig** now extends `@react-native/typescript-config` (RN 0.88's generated types need `moduleResolution: bundler`),
  with the driver's paths (`@`, `@/*`, `@components`, `@ui`, the three theme-engine entry points). `jest.config.js`:
  `@react-native/jest-preset` and the theme engine in `transformIgnorePatterns`.
- **Navigation 7**: nothing used in this app was removed from the API (no `unmountOnBlur`, no custom theme). Behaviour change:
  `navigate()` no longer reaches into a child navigator nor goes back, so the two "Go to my orders" buttons
  (`OrderDetails/Business`, `OrderDetailsLogistic`) are `popTo('BottomTab', { screen: 'Orders' })`. Not changed: functions in
  params (`setOrders`, `handleClickLogisticOrder`, `handleChangeOrderStatus`, `setTutorial`) still work, they log a
  non-serializable warning in development (the driver kept them too; plain-data params are the redesign's job). `navigate` to
  a screen already in the stack now pushes instead of going back: `RootNavigation.navigate('OrderDetails', ...)` from a push
  while another order's detail is focused updates that screen's params instead of stacking another one.
- **react-hook-form 7**: `errors` from `formState`, `Controller` `render` receives `{ field }`, `.message` rendered through
  `String(...)`, `onSubmitEditing={() => handleSubmit(onSubmit)()}` in the forgot-password form, a safe `?.length` on the
  profile form's `watch`. The `declare module 'react-hook-form'` stubs (which made everything `any`) are deleted, so `tsc`
  now checks the forms. `PrinterEdition` needed no change (`setValue` on a Controller-less name still sets the value).
- **OneSignal 5**: `src/navigators/oneSignalPush.ts` holds the calls (`createOneSignalPush({ onToken, onNotificationClick })`
  with `setup(identity)` and `dispose()`); `RootNavigator` keeps the existing plans (`getOneSignalSetupPlan`,
  `getFirebasePushSetupPlan`, `getPushOpenOrderPlan`) and `configs.onesignal_businessapp_id`. Mapping: `setAppId` ->
  `initialize` (once per app id), `setExternalUserId` -> `login`, `setEmail`/`setSMSNumber` -> `User.addEmail`/`addSms`,
  `setNotificationOpenedHandler` -> `click` listener (`additionalData.order_id`), `addSubscriptionObserver` ->
  subscription `change` listener (token = `current.id`; the `prompt_ios` in-app trigger when not opted in),
  `promptForPushNotificationsWithUserResponse` -> `requestPermission(false)` (not awaited, once per launch: v4 asked each
  time), `getDeviceState().userId` -> `pushSubscription.getIdAsync()`. A setup with the same identity does nothing and the
  navigator's unmount removes the listeners (v5 listeners add up). Simpler than the driver's file on purpose: this app has no
  teardown, no Firebase/OneSignal switch and no `notification_tokens` unregister; **it still never calls `OneSignal.logout()`**
  (v4 never removed the external id either; the owner may want it on logout). Firebase calls were already the modular API:
  unchanged. `notifee` -> `react-native-notify-kit`: the import only.
- **Bootsplash**: `src/utils/splash.ts` (`hideSplash()`, the driver's file) replaces `SplashScreen.hide()` in `BusinessApp`
  (iOS first render, as before) and the `Splash` page (image drawn / failed / 5 s). The Splash page still draws its image over
  the old launch image's frame (393x852 constants, Android `measureInWindow` offset): with the bootsplash assets the native
  agent chooses, that page will not line up; the redesign's splash work should do what the driver did (centre the logo,
  hide once, drop the arithmetic; `docs/SPLASH.md` of the driver).
- **Icons**: every import is `@react-native-vector-icons/<family>/static`. **Families still imported (11)**: ant-design,
  entypo, feather, fontawesome (FA 4), fontawesome5, fontisto, foundation, ionicons, material-design-icons (was
  MaterialCommunityIcons), material-icons, simple-line-icons, all 14.0.0. Instead of one `Icon` wrapper (35 importers, the
  redesign rewrites them) imports were rewritten in place, with the new packages' strict `name` types: AntDesign
  `arrowright` -> `arrow-right`, `exclamationcircle` -> `exclamation-circle`; FontAwesome5 `map-marker` needs
  `iconStyle="solid"` (4 places); dynamic names in `OFab` and `OInput` are cast. A script checked every `<Icon name='x'>`
  literal against the glyph maps (all present); names that arrive through props with type `any` (the `BottomNavigator` tab
  icon `list-alt` is regular FA5: present) were read by hand, not generated.
- **image-picker 8 / device-info 15**: no change needed. `launchImageLibrary(options, callback)` is still supported and the
  asset fields read (`uri`, `type`, `base64`) are unchanged (the existing code reads `didCancel`/`errorMessage` from the
  asset, where they never were: on cancel `UserProfileForm` shows "image not found"; a v4-era bug, not touched). The device
  calls are `isTablet`, `getVersion`, `getBuildNumber`, `getBundleId`, `getSystemVersion`: all still exist.
- **map-link 3**: `Popup` takes `setIsVisible` (required) and `modalProps` is React Native's `ModalProps`
  (`onBackButtonPressed` and `animationIn` went with react-native-modal). `showLocation` unchanged.
- **geolocation**: `useLocation` uses `@react-native-community/geolocation` (one file, three calls: `getCurrentPosition`,
  `watchPosition`, `clearWatch`, same option names). It has no `mocked` flag; that only fed a debug string in
  `NewOrderNotification`. The library requests the permission itself unless told not to: the app's
  `PermissionsContext` is unchanged.
- **geocoding**: `src/utils/reverseGeocode.ts` (fetch to Google's Geocoding API; same success/rejection rule as the removed
  library) for `GoogleMap`.
- **PDF**: `OrderSummary` called `RNHTMLtoPDF.convert`, which react-native-html-to-pdf 1.3 does not export (it exports
  `generatePDF`). The export always threw and fell back to the system print dialog. Fixed to `generatePDF`; the Jest mocks
  hid it. **Behaviour changes as a result**: the PDF export now really runs.
- **fast-image 10**: `resizeMode` prop is ignored; `objectFit='cover'` (5 places). **country-picker-modal 3**: `onSelect`
  required by the types, a no-op (the rows' own `renderItem` selects).
- **moment -> dayjs** in `PreviousMessages`, `OrderItem`, `Chat`, `NewOrderNotification` (utc plugin). The ETA math compares
  instants, so `moment().utc()` became `dayjs()`.
- **ESLint**: `.eslintrc.js`/`.eslintignore` are the driver's (`@react-native`), `standard` and its four plugins removed.
  Result: 0 errors, **955 warnings** (566 `react-native/no-inline-styles`, 111 `exhaustive-deps`, 104 unused vars, ...).
  The old config reported nothing; the warnings are what the redesign deletes screen by screen. If the coordinator wants
  `lint:check` silent now, either restore `standard` or add `--max-warnings` later.

## 3. Jest (`jest/`)

`setup.js`: scoped icon mocks; React Navigation 7 mocks spread `jest.requireActual` (its packages import each other's
internals) and add `useIsFocused`; the drawer mock is gone; OneSignal 5 mock (`jest/helpers/mockOneSignal.js`, the driver's:
records calls, keeps listeners); notify-kit and bootsplash mocks replace notifee and splash-screen; the geolocation mock is
for the community module (`registerB5NativeMocks.js`); the geocoding and intersection-observer mocks are replaced by a mock of
`@/utils/reverseGeocode`; `registerB3OrdersMocks.js` mocks `generatePDF`.

Tests changed (none deleted): `BusinessApp.splash.test.ts` (matches `hideSplash()`), `Splash.test.tsx` (asserts
`BootSplash.hide`), `storefrontLaunch.test.tsx` (OneSignal 5 and notify-kit mocks), `OrderSummary.test.tsx` (`generatePDF`),
`NewOrderNotification.test.tsx` (mocks dayjs instead of moment), `PrinterEdition.test.tsx` (the generic-discovery `waitFor` gets
5 s: 0.6 s alone, over the 1 s default in a full parallel run), the icon `jest.mock` specifiers in six test files. New:
`src/utils/__tests__/splash.test.ts`. Not touched although they test removed behaviour of their own: none.

## 4. Checks (all from the worktree, after a clean `rm -rf node_modules && pnpm install --frozen-lockfile`)

- `npx tsc --noEmit`: 0 errors.
- `pnpm lint:check`: 0 errors, 955 warnings (above).
- `pnpm test`: 139 suites, 715 tests, all passing (baseline: 138 / 713; the difference is the new `splash.test.ts`: 1 suite, 2 tests). Console noise: gesture-handler's Jest setup warns that `DrawerLayoutAndroid` is deprecated in RN 0.88 (the driver has
  the same).
- Release bundles `npx react-native bundle --platform android|ios --dev false --entry-file index.js`: both succeed (7.2 MB
  each). One Metro warning: `react-native-esc-pos-printer` 4.6.0-rc.0 imports `p-queue/dist`, not in p-queue's `exports`;
  Metro falls back to the file. `pnpm peers check` reports peers of libraries that leave with the redesign (react 16 for
  rn-placeholder, `react-dom` for the country picker...) and `@typescript-eslint/parser` for the plugin (ESLint works: the
  `@react-native` config brings its own).

## 5. Decisions taken, and why

1. **Lean `oneSignalPush.ts`, not the driver's**: the driver's carries a Firebase switch, a teardown with unregister and a
   permission-asked storage flag, none of which exist here; porting them would add behaviour to a flow the redesign does not
   touch.
2. **Icons imported per family in place, not one `Icon` wrapper**: 35 files import 11 families; the wrapper only pays when
   the redesign collapses them to two. Reducing families is the redesign's job.
3. **Left the screens' UI libraries and functions-in-params** as written.
4. **`react-native-country-picker-modal` 3.0.0** (plan phase (a) item 5) rather than 2.0.0, which uses `defaultProps` on
   function components (React 19).
5. **A type-only patch for star-io10** instead of `// @ts-nocheck`, a `declare module` (which would make the printer API `any`) or
   excluding the library from the type check (not possible: `exclude` does not apply to imported sources).
6. **ESLint on `@react-native`** as the plan says, accepting the warnings (see 2).
7. **`SafeAreaContainer`'s `StatusBar backgroundColor` spread kept** (type-checks, ignored by RN 0.88).

## 6. What the native agents must do next

Everything below is read from the native projects as they are (`com.businessapp`, `ios/businessApp`); the driver's
documents (`docs/deps/core-upgrade.md` sections 2.2 to 2.8, `push-phase.md` sections 3 and 4, `shell-phase.md` sections 2, 5, 6,
`docs/SPLASH.md`) and this repository's plan, section 6 (b) and (c), have the file-by-file detail.

**Both platforms**
- Run the new library list through autolinking: new native modules `react-native-bootsplash`, `react-native-notify-kit`,
  `@react-native-community/geolocation`, the 11 `@react-native-vector-icons/*` packages, OneSignal 5, Firebase 26; gone:
  `@notifee/react-native`, `react-native-splash-screen`, `react-native-vector-icons`, `react-native-geolocation-service`,
  `@react-native-picker/picker`, `react-native-background-timer`, `react-native-lightbox-v2`, `react-native-elements`...
- React Native 0.88 template diff (Gradle, Podfile, AppDelegate/SceneDelegate, Info.plist, `MainApplication.kt`), new
  architecture on Android (`newArchEnabled=true`).

**Android**
- `android/build.gradle`: drop the notifee local-maven line (the library is gone); versions of the driver's file (Gradle 9.4.1,
  Kotlin 2.2.0, compile SDK 37, google-services 4.4.4, crashlytics-gradle 3.0.8); keep the Star `flatDir` and check
  `react-native-esc-pos-printer` 4.6.0-rc.0 and `react-native-html-to-pdf` / `react-native-print` Gradle files under AGP 9
  (the plan warns they declare AGP 8.7.2 and SDK 31).
- `android/settings.gradle` and `android/app/build.gradle`: remove the manual `:react-native-vector-icons` project, its
  `implementation project(...)` line and `apply from: .../react-native-vector-icons/fonts.gradle` (the scoped packages copy
  fonts through autolinking); remove `androidx.core:core-splashscreen`, the `installSplashScreen()`/`SplashScreen.show(this)`
  and `org.devio.rn.splashscreen` imports of `MainActivity.kt` and add bootsplash (`RNBootSplash.init(this, R.style.BootTheme)`
  before `super.onCreate`; keep `super.onCreate(null)` with screens 4.x), its `BootTheme` style and logo drawables; the
  manifest `android:theme="@style/AppTheme.Splash"` becomes the boot theme.
- `NotificationServiceExtension.kt` is still the OneSignal 4 class (`OSRemoteNotificationReceivedHandler`,
  `OSNotificationReceivedEvent`): rewrite as v5's `INotificationServiceExtension` (driver `push-phase.md` section 3 has the
  line-by-line table; this is the new-order alarm, it must not regress). The manifest meta-data name does not change.
- `play-services-maps`/`playServicesLocationVersion` lines: community geolocation reads the Play Services location version
  from the root `ext` as the driver's; maps 1.29.11 declares its own Play Services versions (plan section 6 (b)).
- `proguard-android-optimize.txt` for libraries that still ask for the removed `proguard-android.txt` (the driver patched
  OneSignal 4 and splash-screen; both are gone here, check the remaining ones).
- Permissions/manifest of the printing libraries unchanged by this step; esc-pos 4.6.0-rc.0 ships `libepos2.so`.

**iOS**
- `Podfile`: `OneSignalXCFramework` 3.12.6 -> 5.8.1 for the notification service extension target; `$RNFirebaseDisableSPM = true`
  before `prepare_react_native_project!`; `react-native-maps/Google` without the GoogleMaps pin; `pod install` needs
  `--repo-update` (Firebase 12.19+). `NotificationService.swift`: `import OneSignalExtension`, `OneSignalExtension.*` calls.
- UIScene lifecycle (`SceneDelegate.swift`, `UIApplicationSceneManifest`), bootsplash storyboard + `RNBootSplash` in the
  `AppDelegate`/delegate (driver `docs/SPLASH.md`), `Info.plist` `UIAppFonts`: `MaterialDesignIcons.ttf` in place of
  `MaterialCommunityIcons.ttf` (and the fonts of the other scoped packages are pod resources; check the list against the
  families above). `LSApplicationQueriesSchemes` for map-link 3's list of installed apps.
- `react-native-ble-plx` 3.5.1: the plan (section 4.3) found an iOS new-architecture release crash on `createClient(null)`
  (the app does exactly that); a one-line patch is the native agents' job (plan decision), and `react-native-print` reads
  `[[UIApplication delegate] window]`, which the scene template does not have (plan 4.4, decision O2).

**Gate before the identifiers change**: a debug and a release build per platform, then a ticket from each of the four print
paths (Star, Epson, generic BLE, PDF/system print) on devices.

## 7. What I did not verify

- Nothing ran on a device or simulator; no native build. The JavaScript is proven only by `tsc`, lint, Jest (every
  native module mocked) and two release bundles (Metro resolved everything, including the submodule's closure).
- OneSignal 5 against a real OneSignal app: token registration (`notification_tokens`), tap-to-open order, the permission
  prompt once per launch, the `prompt_ios` trigger. Same for notify-kit's foreground display with a Firebase push.
- Navigation 7 at run time: tab and stack transitions, the `popTo` buttons, push-open when another order is open, the
  non-serializable-params warnings.
- react-hook-form 7 in the real login, sign-up, forgot-password and profile screens (validation messages, toasts, password
  match); `PrinterEdition`'s `setValue` on a field whose Controller is not mounted.
- Glyphs: names that reach an icon through a prop typed `any` or a variable (only literals and `tsc`-typed names were
  checked against the v14 glyph maps).
- The PDF export (`generatePDF`) on a device: the call was wrong before, so it has never produced a file in this app's
  history that I can see.
- Reverse geocoding through the Google API (the mock replaces `reverseGeocode`); community geolocation on both platforms.
- The Android and iOS behaviour of fast-image 10 (`objectFit`) and country-picker-modal 3 on the language selector.
- `pnpm install` on the Builder's Jenkins (only the marker and the frozen-lockfile install were checked here, and CI's YAML was
  not run).
