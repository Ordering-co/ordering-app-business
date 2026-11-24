# Dead code removed (business app, 2026-11-19)

Rule (driver app decision D1): dead code is deleted whole: files, their tests, their barrel exports, their
bundled assets, their types. Dead branches inside live files are NOT touched here (the area agents rewrite
those files). Nothing in `src/@/components`, `android/`, `ios/`, `src/theme/`, `shared/`, `BusinessApp.tsx`,
`package.json` was edited. Deletions are staged with `git rm`; nothing is committed.

## Method

1. A static import graph from `index.js` (relative, `@/`, `@ui`, `@components`, `require()`, `import()`,
   `jest.mock`) over the app source (script kept outside the repo). The `@ui` barrel re-exports everything, so
   the graph first lists barrel-only candidates; each was then checked by hand.
2. `grep -w` of the component name, of its route name string (`'Signup'`, `'NotFound'`, ...), of
   `theme.images.*` keys and of the file names of assets, over `src`, `jest`, `index.js`, root configs and the
   native projects (assets only).
3. No navigator registers `IntroductoryTutorial`, `Signup`, `NotFound` or `NetworkError`
   (`RootNavigator`, `HomeNavigator`, `BottomNavigator` import only Home, Login, ForgotPassword, Splash,
   OrderDetails, AcceptOrRejectOrder, OrderSummary, OrderMessage, BusinessProductListing, ProductOptions,
   Sessions, PrinterSetup, PrintTicketSettings, PrinterConfigure, TicketPreview, Profile, MyOrders, Stores,
   Messages). There are no navigation param-list types in the repo to remove.

## Deleted (37 files, 7,655 text lines, 0.27 MB of assets)

| Deleted | Evidence nothing reaches it |
|---|---|
| `src/pages/IntroductoryTutorial.tsx` + test | no navigator imports it (removed from RootNavigator in `84dc6df`); `grep -w` finds only itself and its test |
| `src/pages/Signup.tsx` + test | no navigator; only importer of `SignupForm`. `'Signup'` appears only in `Login.test.tsx` (an assertion on a mocked navigate; the test still passes) |
| `src/pages/NotFound.tsx` + test | no navigator, no importer (`NotFound` elsewhere is a styled component of `NotFoundSource`) |
| `src/pages/NetworkError.tsx` + test | no navigator; only importer of the UI `NetworkError` |
| `src/ui/src/components/SignupForm/` (index, styles, test) | importer: the `Signup` page (deleted) and the barrel |
| `src/ui/src/components/NetworkError/` (index, styles, test) | importer: the `NetworkError` page (deleted) and the barrel |
| `src/ui/src/components/Contacts/` (index, styles, test) | not exported by the barrel; `MessagesOption` imports the **controller** `Contacts` from `@components`, not this folder |
| `src/ui/src/components/OrderDetailsLogistic/` (index, styles, test) | barrel only; no route of that name exists, the only mention is the route string in `PreviousOrders` (dead branch, kept) |
| `src/ui/src/components/DriverMap/` (index, test) | barrel only; `grep "<DriverMap"` = 0 |
| `src/ui/src/components/MapView/` (index, test) | barrel only (`MapViewUI as MapView`); the `MapView` seen in `GoogleMap` is `react-native-maps`' own |
| `src/ui/src/components/ScheduleBlocked/` (index, test) | barrel only |
| `src/ui/src/components/OrdersOptionStatus/` (index, styles, test) | barrel only |
| `src/ui/src/components/StoresList/styles.tsx` | `StoresList/index.tsx` and its test do not import `./styles` |
| `src/ui/src/providers/AlertProvider.tsx` | no importer |
| `src/types/index.tsx` | no importer (`@/types` is not used; the live one is `src/ui/src/types/index.tsx`) |
| `src/types/react-native-app-intro-slider/index.d.ts` | declares the module only the deleted tutorial imported |
| `src/assets/images/loading-splash.png` (151,147 B) | never `require`d: `loadingSplash` points to the Android mipmap / iOS `SplashImage`; the only mention is a test asserting its absence |
| `src/assets/sounds/notification.ogg` (6,131 B) | `theme.sounds` requires only the `.mp3`; no reference in `src`, `android/app/src`, `ios` project |
| `src/assets/json/order.json` (6,186 B), `orders.json` (118,634 B) | no `require`/import/path mention anywhere (src, jest, root) |

Edited (dead references only):

- `src/ui/index.tsx`: removed the 7 imports and 7 exports of `NetworkError`, `OrdersOptionStatus`, `SignupForm`,
  `DriverMap`, `MapView`, `ScheduleBlocked`, `OrderDetailsLogistic` (re-read before the edit; 14 lines).
- `src/ui/src/types/index.tsx`: removed the interfaces of the deleted components: `SignupParams`, `MapViewParams`,
  `NoNetworkParams`, `OrderDetailsLogisticParams`, `ContactParams` (60 lines). 19 other interfaces in that file
  have no reader at all (marketplace heritage: `AddressListParams`, `BusinessTypeFilterParams`, ...); not tied to a
  deleted file, so left for the area that owns the file.
- `jest/coverage-include.js`: 12 entries of deleted files. `jest/helpers/mockUi.js`: the `SignupForm` and
  `NetworkError` mocks (29 lines).

Size freed: bundled assets 0.27 MB (282,098 B). The 7.5 MB of tutorial slides are still pending (below).

## Dependency only the deleted files imported

Computed by comparing the external packages imported by the deleted files (read from `HEAD`) with those imported by
everything that remains in the app (`src`, `index.js`, `App.tsx`, `jest/`): exactly one.

- `react-native-app-intro-slider` (`package.json` dependency; the coordinator removes it). No other library lost
  its last importer with these deletions (the submodule was not scanned for this one, it does not import it).

## Kept, with the reason

| Candidate | Why it stays |
|---|---|
| `src/assets/images/slide1-4.png` (7.5 MB) and the `tutorials` block (`src/BusinessApp.tsx:101-106`, `src/theme.json:107-111`) | The page that paints them is gone, but `BusinessApp.tsx` still `require()`s them and that file belongs to the other agent. To finish: delete lines 101-106 of `BusinessApp.tsx` (and the trailing comma of the previous key), the `tutorials` object of `src/theme.json`, then `git rm` the four PNGs. Deleting the PNGs alone breaks the bundle. |
| `src/ui/src/providers/Responsive.tsx` | Unreachable from the app, but `shared/OSegment.tsx` (the other agent's, dead) imports `normalize` from it; deleting it adds a `tsc` error. Delete it in the same change as `OSegment.tsx`. |
| `shared/OSegment.tsx`, `shared/OChatBubble.tsx` (+ their tests) | The other agent's files (task instruction). Confirmed: no importer outside their own tests. |
| `src/ui/src/components/DriverSchedule/` (+ test, `registerB7NativeMocks`/`b7Legacy*` helpers it shares with `PhoneInputNumber`'s test) | Still imported by the live `UserProfileForm` (`import ... from '@ui'`, line 44; rendered at line 632 under `!isBusinessApp`, never true here). Deleting it leaves an undefined import in a live file. Remove it when `UserProfileForm` is rewritten. |
| `onNavigationRedirect('OrderDetailsLogistic', ...)` in `PreviousOrders` (`:93`); `show_tutorials` in `src/config.json` | Dead branches inside live files (and `config.json` is off-limits). The route does not exist; the area agents delete the branches. |
| `src/types/*/index.d.ts` and `src/ui/src/types/*/index.d.ts` for other libraries (calendar-picker, canvas, recaptcha, select-dropdown, credit-card-input, fbsdk, loading-spinner-overlay, rn-placeholder, styled-components, toggle-switch, netinfo, material-bottom-tabs) | Not tied to a file I deleted; they go with their libraries when the other agents remove those. 20 `.d.ts` are not reached by the import graph (ambient declarations, not imports). |
| `theme.images.*` / `theme.sounds` keys in `src/theme.json` | No key pointed at an asset I deleted (`loading-splash.png`, `.ogg`, `*.json` were never in the manifest) except `tutorials` (above). Other unread keys (`logos.background`, `orderCreating`, ...) are the theme agent's. |
| `OrderSummary` | Print fallback, per instruction. Printing code untouched. |
| `SearchBar`, `OrdersOption{Business,City,Date,Delivery,Driver,Paymethod}`, `NotificationSetting`, `LanguageSelector`, `PhoneInputNumber`, `VerifyPhone`, `LogoutButton`, `UserFormDetails`, `GoogleMap` | Checked: each has a live importer. |

## Checks

- `npx tsc --noEmit`: 0 errors before, 0 errors after. (A first run after deleting `Responsive.tsx` gave 1 error in
  `OSegment.tsx`; the file was restored, see Kept.)
- `pnpm test`: 127 suites, 672 tests, all pass (the 12 test files of deleted code are gone).
- Release bundle: `npx react-native bundle --platform android --dev false --entry-file index.js` completed
  (`/tmp/business-cleanup.jsbundle`, 7,286,921 B, 107 assets copied). Run once after the deletions; no
  baseline bundle was built, so no JS-size delta is claimed.
- `pnpm lint` not run (the script is the other agent's area). iOS bundle, device run not done.
