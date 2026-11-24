# Area 1: global shell and primitives (business app)

Phase 1 inventory, read-only. Nothing was run on a device or simulator and no repository file was changed except this report. Every statement comes from reading code, from `diff` against the two driver repositories, and from scripts over the source (scripts live in the session scratchpad, not in the repo).

Shorthands: `shared/` = `src/ui/src/components/shared/`; `~/` = `src/ui/src/components/`; `D-T` = `/Users/work/Ordering/ordering-app-driver-theming`; `D-O` = `/Users/work/Ordering/ordering-app-driver-v26` (original driver); `submodule` = `src/@/components`.

How the counts were made: source = `src` without `src/@/`, `__tests__`, `*.test.*`, `*.d.ts` and `src/assets` (213 files). Reachability = import graph from `index.js` and `App.tsx` following relative, `@ui` and `@/` imports (201 reachable, 12 not). Because `@ui` is a barrel, "reachable" does not mean "used": usage was counted separately by name (`grep -w`). Theme keys: regex `theme(?.)colors|images|fonts.X` over reachable files; no computed access (`theme.colors[...]`) exists in the app (grep).

---

## 1. The theme today

### 1.1 What `src/theme.json` holds and what the code reads

`src/theme.json` (170 lines) holds `fonts` (2 roles), `colors` (72 keys), `images` (57 keys in 5 groups, all `""`), `sounds` (1 key, `""`). The images and sounds are filled at runtime by `require()` in `src/BusinessApp.tsx:21-110` (the 57 runtime keys equal the 57 JSON keys exactly). Nothing else is in the theme: no `utils`, no spacing, no radius, no sizes.

Colors (script over reachable files):

| Measure | Count |
|---|---|
| defined | 72 |
| read (distinct keys) | 64 |
| read but undefined | 5 |
| defined but never read | 13 |

- **Read but undefined** (these paint `undefined`, i.e. the prop's own default):
  - `textNormal`: 10 files, mostly icon colors (`shared/ODropDown.tsx:140`, `shared/ODropDownCalendar.tsx:200`, `ProductItemAccordion/index.tsx:170`, `Chat/index.tsx:1121`, `NewOrderNotification/index.tsx:77`, `OrderContentComponent.tsx:666`, `OrderSummary/index.tsx:933`, `PrinterSettings/index.tsx:197`, `BusinessProductList/AccordionDropdown.tsx:28`, `PreviousOrders/OrdersGroupedItem.tsx:97`).
  - `textGra` (typo of `textGray`): `OrdersListManager/index.tsx:423`.
  - `blueLight`: `PreviousOrders/OrderList.tsx:51-52`.
  - `border`: `shared/ODropDownCalendar.tsx:344`.
  - `toastError`: `shared/OToast.tsx:59` (falls back to the literal `'#D83520'`).
  - Also `theme.ecolors.red` (typo, whole key missing): `ProductItemAccordion/index.tsx:205` (this would throw at render if reached) and `theme.defaultLanguages?.DISCOUNT`: `OrderContentComponent.tsx:494,498` (optional chain, harmless).
- **Defined but never read** (13): `primaryOG`, `quantityProduct`, `addres`, `secundary`, `secundaryContrast`, `colorPage`, `skyBlue`, `whiteGray`, `paleGray`, `backgroundGray`, `btnFont`, `editColor`, `cancelColor`.
- The palette is the old template's (primary `#0056B3`, `statusOrderBlue` `#04449c`): none of it is the redesign's. The redesign palette (primary `#1E72E3`, etc.) shares only a few names with it, so the legacy keys are replaced, not mapped one by one.

Images (reachable files): 57 defined, 41 distinct keys read.
- **Read but undefined (6)**: `general.driverImage`, `general.arrow_distance` (`~/DriverMap`, dead), `general.chronometer` (`OrdersListManager/index.tsx:396`, `OrdersOption/index.tsx:550`: both then pass `undefined` as `src`), `general.user` (`ReviewCustomer:222`, `UserFormDetails:283`, `UserProfileForm:435,504`), `general.email` (`UserFormDetails:282`, `UserProfileForm:503`), `general.deliveryWaiting` (`~/ScheduleBlocked`, dead).
- **Defined but unread (22)**: `logos.background`, `logos.logotype`, `general.dropDown`, `arrow_down`, `message`, `telephone`, `location`, `arrowReturnLeft`, `reload`, `camera`, `profilephoto`, `orders`, `project`, `information`, `orderCreating`, `orderSuccess`, `copy`, `print`, and `tutorials.slide1-4` (read only by the dead `IntroductoryTutorial`).
- Remote URLs in the theme (not bundled): `dummies.driverPhoto` (a cloudinary fetch of a third-party icon site) and `dummies.customerPhoto` (cloudinary with `non_existing_id.png`), read by `Chat`, `OrderMessage`, `shared/OModal.tsx:257-269`. These are runtime dependencies on third-party hosts.

Fonts: `theme.fonts.primary.name` = `Lato-Black` and `special.name` = `Inter_18pt-Black`, with a `weights` array nobody reads. The `name` is a **file name of the Black weight**, used as `font-family`, with `font-weight` set on top (`shared/OText.tsx:7,15,19`). Read counts: `primary.name` in 6 files, `special.name` in 7. Defects found:
- `shared/ONavbar.tsx:33` builds `${theme.fonts.special.name}_18pt-Black` = `Inter_18pt-Black_18pt-Black`, a font that does not exist (system font fallback).
- Hardcoded families: `'Poppins'` in `OrdersListManager/index.tsx:105,115,134,151` and `OrdersListManager/styles.tsx:42`, `'Poppins-Regular'` in `shared/ODropDownCalendar.tsx:82` and `shared/OSegment.tsx:26`, plus the dead `Contacts` and `PreviousMessages/FooterMessageComponent.tsx:46`.
- Whether text really renders in Lato Black on a device was not verified; by the code, every `OText` asks for family `Lato-Black`, which is the Black file's name on both platforms.

### 1.2 How the theme reaches components

- **One provider**, from `@ui` (`src/ui/src/context/Theme/index.tsx`): `ThemeProvider` keeps `props.theme` in `useState` and wraps `ThemeProvider` imported from **`styled-components`** (the web entry, not `/native`; both work in v6 here but the engine skill requires `/native`). Mounted once at the top of `BusinessApp.tsx:147`.
- Components read it with `useTheme` from `styled-components/native` (the common case) and, in styled templates, `props.theme`. `@ui` also exports its own `useTheme` (the context pair `[theme, setTheme]`); I did not count its importers.
- `setTheme` of the provider is never called: the theme is static, never replaced.
- No `ThemeProvider` exists in the submodule's native entry; the submodule has its own `OrderingThemeProvider` (see 1.3), which is unrelated to styled-components.
- Most components build `StyleSheet.create({...})` inside the component body from `theme.*` (for example `BottomNavigator.tsx:25-52`), so the styles are re-created on every render.

### 1.3 Does the app request or merge a served theme today?

**The app itself: NO. The submodule: YES, but nothing reads it.**

- App: no `fetch` of `/theme` anywhere in `src` outside the submodule (grep `theme_version|/theme|useOrderingTheme|createMergedTheme|OrderingTheme` over the app: no match). `BusinessApp.tsx:21-110` mutates the imported JSON and passes it to the provider; no merge.
- Submodule: `native/src/contexts/OrderingContext/index.js:15,50` mounts `OrderingThemeProvider`, which does `fetch(\`${ordering.root}/theme\`)` with header `X-App-X` (`src/@/components/src/contexts/OrderingThemeContext/index.js:88-100`; no `theme_version`, so it is the version 1 theme) unless `useOptimizeLoad` is set (`src/config.json` has no such key, so the direct request runs; the `first_load` alternative is `OptimizationLoadContext/index.js:42`).
- The result is kept in `OrderingThemeContext` (`:100-126`) and read by: `BusinessList` controller `index.js:62,74` (the flag `business_listing_view.components.cities.hidden` decides `showCities`, which the app's `StoresList` never reads: `grep showCities src/ui src/pages` empty) and `BusinessSearchList` (not used by the app). `createMergedTheme` (`native/index.js:116`, `src/utils/themeUtils.js`) is exported but the app never imports it.
- So the app today pays one useless `GET /theme` per launch, and follows the driver precedent: the driver-theming app also leaves the submodule request in place and asks its own v2 theme (`D-T/src/theme/remote.ts:1-15`). The business app should do the same; the submodule is not edited.

### 1.4 Fonts bundled and used

`src/assets/fonts` = 72 files, 19.4 MB total (`react-native.config.js` links the folder: `assets: ['./src/assets/fonts']`; `ios/businessApp/Info.plist` `UIAppFonts` lists them; Android copies them to `android/app/src/main/assets/fonts`, `ios/link-assets-manifest.json` records them).
- Inter: 3 optical sizes (18pt, 24pt, 28pt) x 18 styles = 54 files. Only `Inter_18pt-Black` is ever asked for (by name) and the other 53 are never referenced.
- Lato: 10 files (Thin, Light, Regular, Bold, Black, and italics). Only `Lato-Black` is asked for.
- Poppins: 6 files (Thin, Light, Regular, Medium, SemiBold, Bold). Used by hardcoded `'Poppins'` / `'Poppins-Regular'` literals (OrdersListManager, two shared components, dead code).
- The redesign is Poppins 400/600/700 only (`DESIGN-KIT.md` section 1). The engine skill wants the catalog's 10 families as static files, one per weight used (`runtime-native.md` section 4); D-T did that. **The whole `src/assets/fonts` folder will be replaced by the driver's** (take `D-T/src/assets/fonts` and its Info.plist / Android wiring); the Inter and Lato italics and optical sizes disappear.

### 1.5 Icon sets (importers per set, app source, dead included)

`react-native-vector-icons` v10 (`package.json:92`): MaterialCommunityIcons 16 files, AntDesign 11 (1 dead), Feather 10, FontAwesome5 4, SimpleLineIcons 3, FontAwesome 2, Fontisto 2, MaterialIcons 2 (1 dead), Ionicons 1, Entypo 1 = 10 sets, 52 import lines. Plus 41 bundled PNG icons read through `theme.images.general.*` and `OIcon` (`shared/OIcon.tsx`, 32 importers, 47 JSX uses), and `react-native-paper` `Text` in two dropdowns (`shared/ODropDown.tsx:8`, `shared/ODropDownCalendar.tsx:8`). D-T replaced all of it with one `shared/Icon.tsx` (Ionicons `ion` or MaterialDesignIcons `mci`, packages `@react-native-vector-icons/*` 14.0.0, `DESIGN-KIT.md` section 3 lists the 60 glyphs the mockups use; that every one exists in Ionicons or MDI was not checked here).

### 1.6 Platform branches and window-size / tablet branches

`Platform.OS` appears 82 times in 41 files app-wide; inside this area's scope:

| file:line | Branch |
|---|---|
| `src/BusinessApp.tsx:45` | `loadingSplash`: iOS `{ uri: 'SplashImage' }`, Android `require('../android/app/src/main/res/mipmap-xxxhdpi/splash.png')` |
| `src/BusinessApp.tsx:141` | iOS-only `SplashScreen.hide()` once `use_root_point` loading ends (Android hides it elsewhere: `Splash.tsx`) |
| `src/pages/Splash.tsx:51` | iOS draws the launch-screen image at a computed frame (393x852 storyboard maths, `:6-8`, `:52-57`), Android draws a full-screen image offset by `measureInWindow` (`:40-44,73-88`) |
| `src/navigators/BottomNavigator.tsx:22,38-40` | tab bar padding/height by platform and `windowHeight < 845` |
| `src/navigators/RootNavigator.tsx:104` | foreground FCM message shown through notifee on Android only |
| `src/context/PermissionsContext.tsx:24` | Bluetooth permissions only on Android >= 12 |
| `src/ui/src/layouts/Container.tsx:11` | iOS portrait padding |
| `src/ui/src/layouts/SafeAreaContainer.tsx:95` | `StatusBar` `barStyle` iOS `dark-content`, Android `default` |
| `src/ui/src/providers/Responsive.tsx:10` | `normalize` (dead file) |

Tablet / window / orientation uses, **every one** (app source, excluding tests and submodule):

| file:line | Use |
|---|---|
| `src/pages/MyOrders.tsx:27-28,68` | `Platform.isPad` and `DeviceInfo.isTablet()`: `(isIpad \|\| isTablet) && (!isPortrait \|\| WIDTH_SCREEN >= 950)` selects `OrdersListManager` (tablet board) else `OrdersOption`. **The only place the app decides "tablet".** |
| `src/ui/src/components/PreviousOrders/OrderItem.tsx:50-59` | `isIpad`, `DeviceInfo.isTablet()`: padding 20 vs 15; `IS_PORTRAIT` margin |
| `src/ui/src/hooks/DeviceOrientation.tsx:6,42-46` | `LARGE_SCREEN_MIN_WIDTH = 768`, `useIsLargeScreen()` |
| `~/OrdersListManager/index.tsx:84,647` | `isLargeScreen` hides the base modal while the SLA modal is a card |
| `shared/OModal.tsx:8,63-65,286` | `centerOnLargeScreen` (`entireModal` shown as a 620 px centred card when width >= 768); callers: `OrdersOption/index.tsx:817`, `OrdersListManager/index.tsx:641`; `supportedOrientations={['portrait','landscape']}` |
| `shared/OBottomPopup.tsx:3,27` | `Dimensions.get('window').height` at import time; `supportedOrientations` portrait + landscape |
| `~/NewOrderNotification/index.tsx:6,29,59` | `Dimensions.get('screen').width` at import time; `supportedOrientations` |
| `useDeviceOrientation()` users | `MyOrders`, `OrdersOption:110,145-146`, `OrdersListManager:83,93-94`, `PreviousOrders/OrderItem:40`, `OrderContentComponent:58-61`, `MessagesOption:37`, `ProductItemAccordion:39-40`, `IntroductoryTutorial` (dead) |
| Own `Dimensions.addEventListener('change')` copies (never removed, registered in render) | `layouts/Container.tsx:21-33`, `layouts/SafeAreaContainer.tsx:56-67` (the `orientation` state is never read), `~/Chat/index.tsx:201-227`, `~/StoresList/index.tsx:50-93`, `~/PreviousMessages/FooterMessageComponent.tsx:22-28`, `~/Contacts/index.tsx:43-71` (dead) |
| `Dimensions.get(...)` at module load or render | `BottomNavigator.tsx:23`, `~/ScheduleBlocked:13`, `~/DriverMap:39`, `~/GoogleMap:50`, `~/MapView:36`, `~/NetworkError:18`, `~/WebsocketStatus:19`, `~/Sessions:19`, `~/PrinterEdition:54`, `~/PrinterSettings:31`, `~/BusinessProductList:170-171`, `~/LoginForm:7`, `shared/ODropDownCalendar.tsx:112` (`useWindowDimensions`), `Splash.tsx:35-36` |
| `src/ui/src/providers/Responsive.tsx` | `normalize()` from window width (dead file) |

No orientation lock exists in code (no `react-native-orientation-locker`, no `ScreenOrientation`). Three different tablet thresholds coexist: `isTablet` plus landscape (MyOrders), width >= 950 (MyOrders), width >= 768 (`useIsLargeScreen`).

---

## 2. Primitives port map

`shared/` of this app has 19 files (18 components plus `index.tsx`, 2,239 lines). D-T's `shared/` has 49 files (4,577 lines), every component rewritten on the theme. D-O's `shared/` has 23 files. **Business shared files vs D-O**: 9 identical, 8 differ by a few lines, 1 differs a lot (OModal), and `index.tsx` differs; every business file exists in D-O.

Verdict legend: **T** = take D-T's version as is; **T+X** = take D-T's and re-apply X; **R** = rewrite on the theme (no D-T equivalent); **delete** = dead.

| Business file (lines) | vs D-O | D-T counterpart (lines) | Importers / JSX uses here | Verdict |
|---|---|---|---|---|
| `OText.tsx` (64) | identical | `OText.tsx` (92) | 61 / 386 | **T**. Callers pass `mBottom`, `mRight`, `mLeft`, `hasBottom`, `isWrap`, `weight`, `lineHeight` (the API D-T's `OText` keeps); check `isWrap` semantics (business: `flex: weight ? 1 : 0` quirk) |
| `OButton.tsx` (149) | 1 line (family `primary` vs `special`) | `OButton.tsx` (226) | 30 / 61 | **T** (family difference is moot) |
| `OInput.tsx` (151) | 1 line (`vectorIconColor` default) | `OInput.tsx` (211) | 11 / 19 | **T** |
| `OTextarea.tsx` (46) | identical | `OTextarea.tsx` (68) | 1 / 1 (`AcceptOrRejectOrder`) | **T** |
| `OIcon.tsx` (67) | identical | `OIcon.tsx` (75) + `Icon.tsx` (40) | 32 / 47 | **T**; every PNG icon call site becomes `Icon` (41 `theme.images.general` keys, 6 undefined) |
| `OIconButton.tsx` (129) | identical | none (D-T dropped it) | 17 / 19 | **R as call-site change**: 17 files switch to `OButton` icon-only / `Icon` with a 44 target (there is no D-T twin) |
| `OLink.tsx` (96) | identical | `OLink.tsx` (119) | 1 / 9 (`OrderContentComponent`) | **T** |
| `OFab.tsx` (54) | identical | `OFab.tsx` (40) | 2 / 4 (`DriverMap` dead, `MapView`) | **T** (map FAB on the tracking screen) |
| `OModal.tsx` (345) | 68 added / 133 removed | `OModal.tsx` (236) | 9 / 14 | **T+X**. Business adds: `centerOnLargeScreen` 620 px card (`:34,63-65`), `supportedOrientations` (`:286`), an order header with avatars (`:248-269` uses 3 dummy images), `entireModal` with title section. Re-apply: landscape support and a tablet centred-card (see 6) |
| `OBottomPopup.tsx` (75) | 1 line (`supportedOrientations`) | `OBottomPopup.tsx` (202) | 2 / 2 (`Chat`, `NotificationSetting`) | **T+X**: `supportedOrientations={['portrait','landscape']}` (D-T has none; an iOS `Modal` without it is portrait-only) |
| `OAlertOriginal.tsx` (43) | 11 / 4 lines (D-O adds an empty-message guard) | `OAlertOriginal.tsx` (61) | 11 / 2 (passed as `Alert` to `OrderingProvider`) | **T** (D-T has the guard) |
| `OAlert.tsx` (52) | identical | none | 3 importers (`ProductItemAccordion:195`, `Sessions`, barrel) | **Replace** by `ONotice`/`useConfirm`; no twin |
| `ONavbar.tsx` (64) | 3 / 7 lines (padding 32, `backWrapper`, testIDs) | `ONavbar.tsx` (99) | 8 / 8 | **T** (re-add nothing; business changes were layout fixes) |
| `OToast.tsx` (93) | 4 / 4 lines (`bottomOffset`) | `OToast.tsx` (119) + `BottomBarContext` | 1 (mounted in `BusinessApp.tsx:152`) | **T**; needs `BottomBarProvider` (D-T `src/context/BottomBarContext.tsx`) |
| `ODropDown.tsx` (230) | import order only | `OSelect.tsx` (201) | 6 / 6 (the 6 `OrdersOption*` filters) | **Replace by `OSelect`** (every select opens as a sheet, decided) |
| `ODropDownCalendar.tsx` (361) | 3 / 3 lines (`MM/DD/YY` vs `MM/DD/YYYY`, range toggle) | `OCalendar.tsx` (158) | 1 / 1 (`OrdersOptionDate:45`) | **T+X**: D-T's `OCalendar` picks one day; the orders date filter has a **range** (`rangeDate.from/to`, `Custom dates` in `SPECS.md:35`). Add range mode (business-only extension), format `MM/DD/YY` is today's filter contract (check what `OrdersOptionDate` sends to the controller before choosing) |
| `OSegment.tsx` (86) | identical | none | **0** | **delete** (dead: no importer, not in `shared/index.tsx`) |
| `OChatBubble.tsx` (99) | identical | none (`ChatMessageSkeleton`, `chat_bubble` component) | **0** | **delete** (dead; the chat has its own bubbles) |
| `index.tsx` (35) | differs | `index.tsx` (96) | n/a | **T** then trim to what this app uses |

Counts, over the 18 components: **12 take D-T's file** (OText, OButton, OInput, OTextarea, OIcon, OLink, OFab, OAlertOriginal, ONavbar, OToast, and OModal, OBottomPopup with a business behaviour to re-apply each), **1 is replaced by D-T's `OSelect` (ODropDown) and 1 by `OCalendar` plus a range extension (ODropDownCalendar)**, **1 by `ONotice` / `useConfirm` (OAlert)**, **1 has no twin and its 17 call sites change (OIconButton)**, **2 are dead and deleted (OSegment, OChatBubble)**. Nothing has to be written from nothing except the range mode of the calendar and the business status mapping.

Other shell files in `src/ui` (outside `shared/`), for the same decision:

| File | vs D-O / D-T | Verdict |
|---|---|---|
| `src/ui/src/layouts/Container.tsx` (67) | differs from both | **T** from D-T then re-check the iOS landscape padding rule (`Container.tsx:11`) |
| `src/ui/src/layouts/SafeAreaContainer.tsx` (102) | differs from both | **T** from D-T. Business-only behaviour in it: `SafeAreaContainerLayout` tints the status bar `danger500` while offline and `success500` for 2 s on reconnect (`:67-77`), and takes `paddingHorizontal` 20. The mockup's "Live / Reconnecting / Offline" pill replaces the tint: confirm (question Q6) |
| `src/ui/src/hooks/DeviceOrientation.tsx` (51) | business is **newer** than D-T (adds `useIsLargeScreen`, unsubscribes) | **Keep business's** as the base of the tablet hook |
| `src/ui/src/providers/StoreUtil.tsx`, `src/ui/src/hooks/useCountdownTimer.tsx` | identical to D-T / D-O | **T** (no change) |
| `src/ui/src/context/OfflineActions/` | 0 lines of diff vs D-O, 9 vs D-T | **T** from D-T, then re-check the business action list |
| `src/ui/src/context/Theme/index.tsx` | business only (D-T replaced it by `src/theme/AppThemeContext.tsx`) | **delete**, replaced by the engine provider |
| `src/ui/src/providers/AlertProvider.tsx`, `Responsive.tsx` | unreachable | **delete** |
| `src/ui/src/utils/index.tsx` (1,031), `contactVisibility.ts` | 260 diff lines vs D-O | **R**: 7 color literals (`utils/index.tsx`) and status-to-color maps move to `orderStates.ts` (D-T) adapted for business statuses |
| `src/ui/src/config/currency.tsx` (1,010), `constants.tsx` | data | keep |
| `src/ui/src/types/**`, `src/types/**` | 14 `.d.ts` duplicated between `src/types` and `src/ui/src/types`; `src/types/index.tsx` unreachable | **delete** the duplicate set when the libraries go |

### 2.1 D-T primitives this app lacks, and the mockups that need them

The 33 files below do not exist here. "Needs" were found by markers in `design/redesign/screens/*.dc.html` (`role="switch"`, `type="radio"`, `role="tab"`, `role="dialog"`, `role="checkbox"`, `role="alert"/"status"`, `type="password"`, numeric one-digit inputs, `<textarea`, 330 px dialog, bottom-sheet radius) and by `SPECS.md`.

| D-T primitive | Mockups that need it |
|---|---|
| `Tabs` (pill, `StableText`) | Main, OrdersInProgress, OrdersHistory, OrdersEmpty, OrdersOffline (New / In progress / History with counts in a pill). **Needs a count slot** (check `Tabs.tsx`: D-T's tab bar shows counts through `OBadge` in `BottomNavigator.tsx:33-42`, not in `Tabs`) |
| `OBadge` | order status chips and order-type chips on every order screen; tab bar counters; the Orders and Messages counters |
| `FilterChip` | OrdersSearch (filters), Stores / Menu (`All`, `Unavailable 3`), TabletBoard store filter |
| `OCard` | order cards on Main and the tablet columns, printer cards, detail cards |
| `OListRow` | Profile, Printers, TicketSettings, Sessions rows (56 px) |
| `OSwitch` | Menu, MenuUnavailable, Notifications, Printers, ProductOptions, TicketSettings |
| `ChoiceRow`, `ChoiceMark`, `OCheckbox` | radios: LanguageSheet, SheetPause, SheetDriver, PrinterAdd, PrinterFound, Notifications (sound); checkboxes: OrderPreparing (preparation checklist), OrderError |
| `OSelect` | the six order filters; any list of choices as a sheet |
| `OCalendar` | OrdersSearch `Custom dates` (needs range, see above) |
| `OStepper` | TicketSettings and TicketPreview `Copies` |
| `OOtpInput` | LoginCode (six boxes 50 x 56) |
| `PasswordToggle`, `FieldError`, `KeyboardScreen` | Login, ProfilePassword, Forgot, ProfileEdit, Review, SheetReject (field with inline error, never a toast) |
| `ONotice` | inline notices (Forgot success, OrdersOffline, OrderError, Notifications, PrinterFound) |
| `ConfirmDialogHost`, `confirmAction` (`useConfirm`, `useNotice`) | LogoutDialog (330 px dialog), destructive confirmations |
| `HoldToConfirm` | not drawn in any mockup; only if the owner wants a hold for a dangerous action (Q4) |
| `SectionTitle`, `ODivider` | Profile, Notifications (`SOUND`), TicketSettings |
| `OAvatar` | Profile (`AT`), Messages, Chat, OrderDelivery (initials `OH`), SheetDriver |
| `LoadingOverlay`, `OSpinner` | blocking actions and button loading |
| `SkeletonBone`, `OrderListItemSkeleton`, `OrderListSkeleton`, `MessageListSkeleton`, `ChatMessageSkeleton` | loading of the orders, messages and chat lists (no mockup draws a loading state: the principle "a failure never wipes the screen", `DESIGN-KIT.md` section 5, needs them) |
| `StableText` | tabs and chips whose label turns bold when selected |
| `Pager`, `pagerStyles` | **no mockup** (no tutorial or onboarding screen): do not port |
| `orderStates.ts` | status to badge variant. **Business differs**: the kit paints Pending/new yellow (`#FFC700`, warning), in progress blue, completed green, cancelled red (`DESIGN-KIT.md` section 2, Chips); D-T's `orderStatusVariant` makes pending `primary`. Port with a `warning` for pending |
| `singleLineInput.ts`, `styles.tsx` (`BackButton`, `ModalCloseButton`), `Icon` | needed by the above |

Also not in `shared/` but needed by the shell: D-T `src/context/BottomBarContext.tsx` (toast above the bars, mockup's bottom bar heights 64 / 50), `src/context/UnreadMessagesContext.tsx` (Messages counter; here `MessagesOption/index.tsx:63-65,107` already sums `unread_count`, so the same "list reports a total" pattern fits), and a new **new-orders counter context** for the Orders tab (no equivalent in D-T; the source is the orders list controller's `pending` group, Q3).

---

## 3. Runtime port map

Business has none of the runtime. Package pins to adopt (from `D-T/package.json:78`): `@orderingco/ordering-theme-engine` 0.14.0 (not installed here: `node_modules/@orderingco` absent), `product.schema.json` + `src/theme.compiled.json`, pnpm 12.18 (`packageManager`), Node >= 22.13.

| Piece | Copy as is | Adapt for the business app |
|---|---|---|
| `src/theme/engine.ts` (78) | yes | `THEME_PRODUCT_TYPE` comes from the compiled file, so it follows the schema |
| `src/theme/remote.ts` (58) | yes | none: the cache key already carries product type, schema version and project |
| `src/theme/AppThemeContext.tsx` (86) | yes | none; mount `AppThemeProvider` above everything (replaces `@ui` `ThemeProvider`) and `RemoteThemeLoader` inside `OrderingProvider` as `D-T/src/DeliveryApp.tsx:77-88` does |
| `src/theme/helpers.ts` (285) | mostly | **has no platform layer** (`Platform` only for the bottom space, `:14,149`). Add a `platform` resolution (`phone` / `tablet`) so `themePart`, `themeValue`, `themeVisible`, `usePageSections` apply `native.platforms.tablet.components.<c>.base` over the base and `values.platforms.tablet.visibility/pages` over the page (the engine already returns them: `ordering-theme-engine/src/native.ts:119,446-453`) |
| `src/theme/sections.tsx` (37), `bundledImages.ts` (47) | sections yes | `bundledImages.ts` is content: business's own images and `IMAGE_FALLBACKS` (section 5) |
| `src/theme/__tests__/*` (4 files, 624 lines) | `theme.test.ts`, `boxAndClearance.test.ts` yes | `AppThemeContext.test.tsx` yes; `designDefaults.test.ts` encodes the driver's defaults: rewrite with the business's |
| `product.schema.json` (20,388 lines), `src/theme.compiled.json` | no | new file for `store_app`; D-T's is `driver_app` 1.0.0 with 44 components, 6 pages, 44 visibility keys, **no `platforms`** (`THEMING.md:57` "phone only"). Declare `"platforms": ["tablet"]` (the engine's rule: free names `^[a-z0-9_]+$`; a platform overrides component `base` properties, visibility keys and pages, **never tokens**: `schema-format.md` sections 5.2, 6; `schema.md` section 2 of the skill). Marketplace-theming also declares none (`docs/theme/decisions.md:11`: "phone only"). **Business is the first app with a `tablet` platform, so no existing app is a model for it** |
| `scripts/theme/guard.mjs` (65), `keys.mjs` (96), `extremes.mjs` (54), `inventory.mjs` (379) | yes | `theme-exceptions.json` and `theme-readers.json` are per-app: start from D-T's 7 and 9 entries (most are D-T primitives that come with the port: `StableText`, `OOtpInput`, `OSelect`, `Splash.tsx`) and drop the ones with no counterpart (`AcceptOrRejectOrder/styles` hidden field is driver-specific, `Chat` 2048 is shared) |
| `package.json` scripts `theme:*` (lines 22-30) | yes | none |
| `.github/workflows/ci.yml` (340 vs business 288) | the added steps (pnpm install, theme validate / verify / guard / keys / extremes, release bundles for iOS and Android, schema dry run) | the dry run's `github.repository == 'Finitless-com/ordering-app-X-theming'` and `X_app` become `ordering-app-business-theming` and `store_app`; `BUILD_CRA.txt` (empty, business) must become `BUILD_PNPM.txt` (Builder marker; content in `D-T/BUILD_PNPM.txt`); the coverage comment title `ordering-app-business-v26` |
| `.github/workflows/theme-publish.yml` (94) | yes | repository name and product type in the `if:`; **do not enable the publish job** until the owner decides (brief: never publish a schema) |
| `.github/workflows/i18n-sync.yml` | business lacks `with: submodules: recursive` (`diff` against D-T, one hunk) | add it |
| `jest.config.js` | preset `@react-native/jest-preset`, add `@orderingco/ordering-theme-engine` to `transformIgnorePatterns`, `testMatch` of `jest/**` | business uses preset `react-native`, `testMatch` `<rootDir>/__tests__/**` (the single `__tests__/harness.test.tsx`) |
| `jest/setup.js` (131 vs 155), `setupAfterEnv.js` (identical) | mocks for the libraries that change: `@react-native-vector-icons/*/static`, `react-native-webview`, `react-native-bootsplash`, `react-native-sound-player` (playAsset, stop), `react-native-onesignal` (via `jest/helpers/mockOneSignal.js`), `react-native-notify-kit`, `react-native-permissions` | business still mocks `react-native-vector-icons/*`, `react-native-fast-image`, `toggle-switch-react-native`, `react-native-splash-screen`, `@twotalltotems/react-native-otp-input`, `@react-navigation/drawer`: each goes with its library. Add `jest/helpers` `themeWithValues` (render with a built theme: skill `runtime-native.md` section 8) and rename the `b1..b7` helpers or keep them |
| `babel.config.js` | identical in business and D-T (module-resolver aliases `@`, `@ui`, `@components`) | none |
| `metro.config.js` | D-T uses plain `mergeConfig(getDefaultConfig(__dirname), {})`: same as business | none. `rn-cli.config.js` (business; `react-native-typescript-transformer`) is legacy and can go |
| `react-native.config.js` | identical (`assets: ['./src/assets/fonts']`) | none |
| `tsconfig.json` | add `extends: @react-native/typescript-config` and the three `paths` to the engine's `.d.ts` (`D-T/tsconfig.json:9-11`); business has its own full config with `moduleResolution: "node"` and `lib: ["es2017"]` | decide whether to keep the 80-line commented config; `moduleResolution: node` makes the `paths` mandatory |

---

## 4. Navigation and shell

### 4.1 Provider tree and launch

`index.js` (`initSentry()`, background FCM handler `setBackgroundMessageHandler(getMessaging(), async () => {})`, registers `App`) → `App.tsx` (`SafeAreaProvider`; four `SoundPlayer.addEventListener` calls that only `console.log`, never removed, `:6-21`) → `src/BusinessApp.tsx`:

`ThemeProvider` (`@ui`) > `OrderingProvider` (`Alert=OAlertOriginal`, `isDisableToast`) > `OfflineActionsProvider` > `PermissionsProvider` (Bluetooth only) > `AppContainer` (`NavigationContainer` with `navigationRef`) + `OToast`.

Launch logic in `BusinessApp.tsx:112-143`: `use_root_point` reads the stored `project_name` from AsyncStorage (else clears it) and sets `project`; **iOS only** hides `react-native-splash-screen` when loading ends. Nothing is painted from a cached theme (there is none). `LogBox.ignoreLogs` of 17 messages (`:13-31`).

D-T's `DeliveryApp.tsx` is the model: it renders nothing until the cached theme is read, mounts `AppThemeProvider` and `RemoteThemeLoader`, `BottomBarProvider`, and hides the splash through `hideSplash()` (`src/utils/splash.ts`, `react-native-bootsplash` 7; business still has `react-native-splash-screen` ^3.3.0).

### 4.2 Every route

**RootNavigator** (`src/navigators/RootNavigator.tsx:358-401`, a stack, all `headerShown: false`):

| Route | Page | Condition |
|---|---|---|
| `Splash` | `pages/Splash.tsx` | `!loaded`. `loaded` becomes true when orders state is not loading and push setup is not loading (`:229-233`), or when the session finished loading, push is not loading and there is no auth (`:247-251`) |
| `Home` | `pages/Home.tsx` (`@ui` `Home`) | `loaded && !auth`; first screen. Photo, `FAST_AND_EASY` title and the Login button; when `use_root_point` it shows a **project name field** and the button becomes `Set project` (`~/Home/index.tsx:143-201`): saves `project_name`, emits `change_project` (`:79-86`) |
| `Login` | `pages/Login.tsx` | `loaded && !auth`. Initial param `notification_state`; prop `projectChanged` (from the `change_project` event, `:349-356`): after a successful login with a changed project it calls `login()` and `RNRestart.restart()` (`Login.tsx:27-33`). `allowedLevels: [0, 2]`, email and cellphone login, OTP tab |
| `Forgot` | `pages/ForgotPassword.tsx` | `loaded && !auth` |
| `MyAccount` | `HomeNavigator` | `loaded && auth` |

**HomeNavigator** (`src/navigators/HomeNavigator.tsx`, stack inside `MyAccount`): while `useSession().loading` it shows `Splash` (`:110-116`); otherwise 12 screens: `BottomTab` (`BottomNavigator`), `OrderDetails`, `AcceptOrRejectOrder`, `OrderSummary`, `OrderMessage`, `BusinessProductListing`, `ProductOptions`, `Sessions`, `PrinterSetup`, `PrintTicketSettings`, `PrinterConfigure`, `TicketPreview`. Side effect at `:29-43`: with a user and `netInfo.isConnected`, the socket joins the room `orders` (`role: 'manager'`) and `messages_orders` (level 0) or `messages_orders_<id>`.

**BottomNavigator** (`src/navigators/BottomNavigator.tsx`): `Orders` (`MyOrders`), `Messages` (`pages/Messages.tsx`), `Stores` (`pages/Stores.tsx`), `Profile` (`pages/Profile.tsx`). `initialRouteName="BusinessList"` (`:82`) is **not a route** (React Navigation falls back to the first tab). Labels hidden in `screenOptions` (`tabBarShowLabel: false`); the label is drawn inside `tabBarIcon` through `TabIcon` (`:54-78`). The orders tab uses FontAwesome5 `list-alt`, the others PNGs. Tab bar: height `90/80` (iOS by `windowHeight < 845`) or `60 + insets.bottom` (Android), shadow (elevation 11), `tabBarHideOnKeyboard`. **No badge or counter.**

**Never routed (pages that exist but no navigator registers)**: `IntroductoryTutorial` (removed from `RootNavigator` in commit `84dc6df`; `settings.show_tutorials` is read by no code, only `config.json:16`; `isTutorial` storage key is only excluded from `_clearStoreData` in `LogoutButton:17` and `UserProfileForm:171`), `Signup` (`SignupForm` component exists, no route), `NotFound` (navigates to a non-existing `BusinessList`: `NotFound.tsx:12`), `NetworkError` (page and `@ui` component dead; the component is also drawn inline by `OrdersOption` and `WebsocketStatus` with `RNRestart`). `CLAUDE.md` lists `Home → Login / Forgot` (true) but says nothing of these four.

**Connectivity**: `RootNavigator.tsx:320-331` subscribes to `NetInfo` and stores `connectionState`, which **nothing reads** (dead state). Actual connectivity UI: `SafeAreaContainerLayout` status-bar tint (`layouts/SafeAreaContainer.tsx:67-77`), `~/WebsocketStatus` (mounted in `OrdersOption:503` and `OrdersListManager:327`), `OfflineActionsProvider` (queue of order status changes when `allow_save_changes_offline`), and `HomeNavigator`'s room join condition.

**`use_root_point`**: `config.json` has it `false` (committed and local), so today's builds skip the project field; the flow (Home field, `change_project`, restart after login) exists only for the multi-project builds.

### 4.3 What the mockups change

- **Login without Home** (`Login.dc.html`, `SPECS.md:289-294`): the first unauthenticated screen is Login (language button `English` top right, logo placeholder, email and password, `Forgot your password?`, `Log in`, `or`, `Email me a login code`, `Version 1.0`). `Home` (photo and `Login` button) and its `use_root_point` project field disappear. **The mockups draw no place for the project name** (Q1).
- **`LoginCode.dc.html`** replaces the OTP tab (six boxes, `Code expires in 09:42`, `Resend code in 0:38`): a separate route.
- **Tab bar with counters** (`Main.dc.html`, 64 px bar): Orders (red `#DA3453` count of new orders, 3), Messages (blue count of unread, 2), Stores, Profile (no count). Counters are drawn as 20 px pills 5 px from the top. This needs a source for each (section 2.1) and the labels visible (today `tabBarShowLabel: false`).
- **`NotificationsPermission.dc.html`**: a pre-permission sheet ("Turn on order alerts" / `Turn on notifications` / `Not now`) over the orders list. Today the OS dialog appears right after login with no explanation (shots index item 14) and is requested inside `RootNavigator` (`requestNotifications` in the FCM path `:67`; OneSignal prompt `:209`; `NotificationSetting` in `OrdersOption:1275` and `OrdersListManager:912` for `checkNotification`). The sheet needs a place that decides when to show it (not in a screen's body).
- **`NewOrderAlert.dc.html`**: the new-order alert is "global" (shown on any tab). **Today it is mounted inside `OrdersOption:810` and `OrdersListManager:635`, i.e. only on the Orders tab**; D-T mounts its alert once in `HomeNavigator` (`THEMING.md:136`). The business app must move the mount to `HomeNavigator`, with the "Ringing until you open or accept them" behaviour (sound loop, `Mute`).
- **`TabletBoard.dc.html`**: side rail instead of tab bar (section 6).
- Mockups with stack screens not in `HomeNavigator` today: `Notifications` (alerts and sound), `ProfileEdit`, `ProfilePassword`, `Review`, `MapTracking`, `Menu` / `MenuUnavailable`, `SheetConnection`, `LanguageSheet`, `LogoutDialog`: other areas decide their routes; the shell must register them.

### 4.4 Push, vibration and sound wiring that lives in the navigators

All of it is in `RootNavigator.tsx` (404 lines), tangled with launch gating:

| Concern | Where | Notes |
|---|---|---|
| OneSignal 4.5.2 setup | `:156-227` (`oneSignalSetup`), planned by `getOneSignalSetupPlan.ts` | v4 API (`setAppId`, `setNotificationOpenedHandler`, `addSubscriptionObserver`, `setExternalUserId`, `setEmail`, `setSMSNumber`, `promptForPushNotificationsWithUserResponse`, `getDeviceState`): **removed in OneSignal 5** (D-T pins 5.5.17). SMS number is built from `country_phone_code` and `cellphone` with a space (`:162-166`); D-T's `oneSignalSms.ts` documents that OneSignal answers 400 unless E.164 |
| Firebase push (FCM) | `:63-154` (`firebasePushSetup`), gated by `configs.firebase_push_enabled === '1'` (`getFirebasePushSetupPlan.ts`) | foreground messages displayed through notifee on Android (`:103-122`, channel `new_order_alarm`); `onNotificationOpenedApp`, `getInitialNotification`, `onTokenRefresh` |
| Token registration | `:281-318` raw `fetch POST /users/:id/notification_tokens` with `provider: 'fcm'` for FCM | no unregistering on logout in this file (D-T `notificationTokens.ts`, `LogoutButton` reads `NOTIFICATION_STATE_KEY`) |
| Push opens an order | `:235-245` through `getPushOpenOrderPlan.ts`, then `RootNavigation.navigate('OrderDetails', { orderId, isFromRoot: true })` (`NavigationRef.tsx`) | |
| New-order vibration | `:333-337` `subscribeOrdersRegisterVibration(socket)` (websocket `orders_register`, `Vibration.vibrate()`) | already its own file |
| New-order sound | **not in the navigator**: `~/NewOrderNotification/index.tsx:31-48` plays a **remote URL** `https://d33aymufw4jvwf.cloudfront.net/notification.mp3` through `react-native-sound-player` `playUrl`; `theme.sounds.notification` (`BusinessApp.tsx:108`) is never read | `App.tsx:6-21` only logs events |
| Project change | `:339-356` `change_project` through `DeviceEventEmitter`, `removeAllListeners` on cleanup (this removes **every** listener for that event) | |
| Native handling (not in scope but related) | `android/.../NotificationServiceExtension.kt`, `MainApplication.kt` (notifee channel); `ios/OneSignalNotificationServiceExtension`; `ios/businessApp/order_sound_notification.caf` (2.2 MB); `android/.../res/raw/order_sound_notification.mp3` (397 KB) | |

**To move out before the push-library upgrade** (what D-T did with `src/navigators/oneSignalPush.ts` (355 lines), `oneSignalGate.ts`, `oneSignalSms.ts`, `firebasePushConsent.ts`, `pushProviderSwitch.ts`, `notificationTokens.ts`): `oneSignalSetup`, `firebasePushSetup`, token registration and the three listeners into one `src/navigators/oneSignalPush.ts` (+ a provider switch because the business app runs **either** OneSignal **or** FCM depending on the server config, which the driver app also does), keeping the existing pure plan files and tests as they are. `notifee` → `react-native-notify-kit` is D-T's replacement (`jest/setup.js`). Vibration stays as is. Project switch can follow D-T's `getProjectSwitchPlan.ts`. The launch-time limit (`useLaunchTimeLimit.ts`, 15 s) has no business equivalent: today a stalled API keeps `Splash` up as long as it hangs (the submodule has no client timeout).

---

## 5. Assets

### 5.1 Images (`src/assets/images`, 8.5 MB)

| File | Size | Painted by | Verdict |
|---|---|---|---|
| `slide1.png` ... `slide4.png` | 1.90, 2.31, 1.62, 1.67 MB (7.5 MB total) | `theme.images.tutorials.*`, read only by `IntroductoryTutorial` (not routed, dead) | **delete** (no mockup has an onboarding) |
| `background.png` | 755 KB | `theme.images.backgroundsImages.login` in `~/Home/index.tsx:105` (the login photo); also required a second time as `logos.background` (unread) | **delete with Home** (the mockup has a plain white login) |
| `not-found.png` | 245 KB | `theme.images.general.notFound`: 9 readers (empty states of orders, messages, stores, products, profile, `NotFoundSource`) | replace by the mockups' empty state (88 px tinted disc with a 24 px glyph, `DESIGN-KIT.md` Estado vacío) |
| `no-network.png` | 114 KB | `~/NetworkError` | replace (offline is an inline notice, `OrdersOffline`) |
| `loading-splash.png` | 151 KB (2700x1800 "LOADING... Please Wait" illustration) | **nothing** (no `require` of this file: the `loadingSplash` key points at `android/.../mipmap-xxxhdpi/splash.png` on Android and the `SplashImage` xcasset on iOS; the file is named only in `src/__tests__/BusinessApp.splash.test.ts`) | **delete** |
| `logotype.png` | 30 KB ("Ordering" wordmark with the four-colour ring, former brand) | `logos.logotype` unread | **delete** |
| `logotype-invert.png` | 4 KB ("OrderingPlus" in white: **former brand, a different name from the other logo**) | `~/Home/index.tsx:129` | **delete with Home** (login mockup has a logo placeholder, `[YOUR LOGO]`, driven by the project's logo) |
| `logo.png` | 6 KB (the four-colour ring) | `shared/OIcon.tsx:44` default when no source | **delete** (the default image of `OIcon` goes with the PNG icons; I did not check D-T's `OIcon` for one) |
| `new-order.png` | 16.5 KB | `~/NewOrderNotification` | replace (mockup: bell tile) |
| `order-creating.png`, `order-success.png` | 17.7, 20.5 KB | **unread keys** | **delete** |
| `no-printers.png` | 16 KB | `~/PrinterSettings` | replace (`PrintersEmpty`) |
| `dummies/store.png` | 11 KB | 7 readers (store logo placeholder) | keep as the fallback `placeholder.business_logo` (D-T keeps `dummies/store.png` the same way) |

`src/assets/icons` (176 KB, 40 PNGs): 22 of the 57 image keys are unread (section 1.1); once `Icon` replaces them all 40 go. Of them `arrow_right.png`, `chevron-down.png` ... are referenced only through `theme.images`. Native splash assets: Android `mipmap-xxxhdpi/splash.png` (13.5 KB) and `splash_land.png`, iOS `Images.xcassets/SplashImage.imageset` (3 x 29.8 KB: the "Ordering" wordmark), `SplashScreen.storyboard`; D-T replaced these with `react-native-bootsplash` (`docs/SPLASH.md`). Two former-brand logos coexist today ("Ordering" in the splash and `logotype.png`, "OrderingPlus" in Home); the screenshots index (`INDEX.md` item 00) already records the mismatch.

### 5.2 Sounds

| File | Size | Played by |
|---|---|---|
| `src/assets/sounds/notification.mp3` | 4.5 KB | nothing (`theme.sounds.notification` has no reader) |
| `src/assets/sounds/notification.ogg` | 6.1 KB | nothing (no reference) |
| `android/app/src/main/res/raw/order_sound_notification.mp3` | 397 KB | the Android notification channel (`order_sound_notification`) |
| `ios/businessApp/order_sound_notification.caf` | 2.2 MB | the iOS push payload |
| remote `https://d33aymufw4jvwf.cloudfront.net/notification.mp3` | n/a | `NewOrderNotification` `playUrl` (needs network; a kitchen tablet offline plays nothing) |

The mockup `Notifications.dc.html` wants **three selectable sounds** (`Bell`, `Chime`, `Kitchen alarm (loud)`), a `Send a test alert` button and `Ring until opened`: the app has one sound, no setting and no loop. Bundled sounds with `SoundPlayer.playAsset` (D-T pins `react-native-sound-player` 0.14.5 with `playAsset` in its jest mock) are the route; the three files and their native variants (a push sound is a native file name) are new assets (Q7).

### 5.3 Fonts

See 1.4: 72 files, 19.4 MB, of which Poppins 6 files are the only ones the redesign uses.

---

## 6. Tablet

**How the app decides tablet today**: one decision, in `pages/MyOrders.tsx:27-28,68`: `Platform.isPad || DeviceInfo.isTablet()` and (landscape or width >= 950) → `OrdersListManager` (the tablet orders manager, 1,258 lines across 3 files), otherwise `OrdersOption`. Everything else in the app uses the phone layout stretched, with `useIsLargeScreen` (>= 768) only for the SLA modal card, and `OrderItem` padding.

**Native projects**:
- iOS `TARGETED_DEVICE_FAMILY = "1,2"` (iPhone and iPad; `project.pbxproj:817,910,1083`). `Info.plist:173-184`: `UIRequiresFullScreen` true (no iPad multitasking), `UISupportedInterfaceOrientations` = Portrait, Landscape Left, Landscape Right; **no `UISupportedInterfaceOrientations~ipad`**; `UIUserInterfaceStyle` Light.
- Android `AndroidManifest.xml:31-35`: `MainActivity` has **no `screenOrientation`** (follows the sensor) and `configChanges` including `orientation|screenLayout|screenSize|smallestScreenSize`, so a rotation does not restart; no `resizeableActivity`/`supportsScreens` declared.
- So both platforms already rotate freely on phones and tablets; **no orientation lock exists anywhere**. The mockups' tablet board is landscape only (1180 x 820), phones are portrait only; nothing says to lock phones to portrait (Q8).

**What the shell needs for a `tablet` platform**:
1. One hook, `usePlatform()` (`'phone' | 'tablet'`), the only reader of `DeviceInfo.isTablet()` (and, as a fallback on foldables and Android desktop windows, the window's shorter side), consumed by the theme helpers (section 3) and by the navigator. It replaces the three thresholds above and `MyOrders`' condition. Whether the width threshold follows the window (split screen) or the device must be decided (Q8).
2. **Tab bar → side rail** (`TabletBoard.dc.html`): an 80 px left rail (right border 1 px, 64 x 64 items, icon 24 + 10 px label, counters), instead of the 64 px bottom bar; the React Navigation bottom-tabs v7 `tabBarPosition: 'left'` can do it with a custom `tabBar`. The same four tabs and the same counters.
3. **Max content width**: the mockups draw no max width for stack screens, forms or dialogs on a tablet (only the board). A `maxContentWidth` (and centring) for stack screens, forms, sheets and dialogs is needed; today `OModal` caps a card at 620 (`CARD_MAX_WIDTH`, `OModal.tsx:12`) and nothing else caps anything. Sheets on a tablet (`OBottomPopup`) are full width (Q9).
4. **Orientation**: every `Modal` the shell renders must set `supportedOrientations` (3 do today, D-T's primitives have none: section 2). The `Dimensions.get` calls at module load (BottomNavigator, OBottomPopup, NewOrderNotification, WebsocketStatus, Sessions, NetworkError, ScheduleBlocked) do not follow rotation and must be hooks (`useWindowDimensions`).
5. The board itself: three equal columns (`New`, `Preparing`, `Ready`), cards identical to the phone's; `OrdersListManager` (today's tablet manager: a different UI and different behaviour) is replaced by it (Q10 asks whether the phone's three tabs `New / In progress / History` map to the board's columns and where `History` goes).

---

## 7. Tests

Area totals: **39 test files** (of 138 in the repo, 713 tests, last green baseline `.theme-audit/baseline.txt`: `tsc` 0 errors, 138 suites, 713 tests).

| Where | Files | Kind |
|---|---|---|
| `shared/__tests__` | 18 (710 lines) | one render test per primitive, with a mocked theme object (the legacy `theme.colors` shape) |
| `src/navigators/__tests__` | 8: `BottomNavigator.test.tsx` (render), `getFirebasePushSetupPlan`, `getOneSignalSetupPlan`, `getPushOpenOrderPlan`, `subscribeOrdersRegisterVibration` (5 pure-function tests, **keep as they are**), `RootNavigator.oneSignal`, `RootNavigator.pushOpen`, `RootNavigator.vibration` (3 effect tests of the navigator with mocked libraries) | |
| `src/__tests__` | 3: `BusinessApp.offlineActions`, `BusinessApp.splash` (asserts the iOS-only hide and **names `loading-splash.png`**), `storefrontLaunch` | |
| `src/ui/src/context`, `utils`, `hooks`, `src/utils` | 5: `offlineActionsQueue`, `utils/index`, `contactVisibility`, `DeviceOrientation`, `sentry` | pure logic |
| `src/pages/__tests__` for Splash, NotFound, NetworkError, Home | 4 | render |
| `__tests__/harness.test.tsx` | 1 | jest harness |
| `jest/helpers` | 17 helper modules (`b1ShellDefaults` ... `b7LegacyUiMock`, `renderPage`, `renderWithProviders`, `mockUi`, `mockOrdering`) | |

What must be rewritten: the 18 primitive tests (D-T has 31 test files in `shared/__tests__`, including `themedPrimitives`, `harmonyPrimitives`, `mockupSizes`, `sizesRound`: take them with the primitives), `BottomNavigator`, `BusinessApp.splash`, the 4 page tests, and every helper that builds a legacy theme. What survives: the 5 plan tests, `offlineActionsQueue`, `utils`, `contactVisibility`, `sentry`. New tests needed (from the skill `runtime-native.md` section 8): the theme runtime (4 D-T files), fonts' files in assets / Android / `Info.plist`, the compiled-file check (`theme:verify`), the platform resolution and the tablet overrides, the counters context, the push module, the new-order alert mount. `jest/coverage-include.js` lists the primitives, `utils`, `Splash`, ... by name and must follow the renames.

---

## 8. Open questions for the owner

**Q1. Where does the project name (`use_root_point`) go once the login has no Home?** Today the field lives in `Home` only; `use_root_point` is `false` in the committed config, but the multi-project builds use it.
- (a, recommended) A small `Project` row or link on the Login screen shown only when `use_root_point` is true, opening the existing field in a sheet; everything else follows the mockup.
- (b) Keep a separate `Project` route before Login only for `use_root_point` builds.
- (c) Drop `use_root_point` from the business app (breaks the multi-project builds).

**Q2. What about the pages that nothing routes (`IntroductoryTutorial`, `Signup`, `NotFound`, `NetworkError`, `show_tutorials`)?**
- (a, recommended) Delete them (the mockups draw none, no code reaches them) and drop `show_tutorials` from the config reading; keep `NotFound`'s button target out of scope.
- (b) Keep `Signup` only (the component exists, no route).
- (c) Keep everything as is.

**Q3. Source of the Orders tab counter** (new orders): the orders list controller's pending group (the list reports a total into a context, as D-T does for unread messages) vs a separate request. Recommended: the list reports it (no extra request); the counter is then unknown until the list loads, as in D-T. Does a count of "New" include preorders?

**Q4. Dangerous actions: confirmation or hold?** The brief says "confirmation or a hold". The mockups draw dialogs and sheets only (reject is a sheet with reasons, logout a dialog). Recommended: no `HoldToConfirm` in the business app (do not port it) unless a screen asks.

**Q5. Push libraries** (Option A, recommended): follow D-T: OneSignal 5.5.x and `react-native-notify-kit`, and move push into `oneSignalPush.ts` before the bump. Option B: keep OneSignal 4 and notifee until the redesign ships (not possible with RN 0.88: the brief upgrades the platform). Also decide whether to keep both providers (OneSignal or FCM by server config), which the code does today.

**Q6. The offline signal**: today a status-bar tint (`SafeAreaContainerLayout`), the `WebsocketStatus` component and the offline queue; the mockups use the `Live / Reconnecting / Offline` pill and `SheetConnection`. Recommended: drop the status-bar tint, keep the pill.

**Q7. Notification sounds**: the mockup has `Bell`, `Chime`, `Kitchen alarm`, `Ring until opened` and a test button. Today: one remote URL and no setting. Needs three audio files (and native push variants of each) and a stored setting. Who supplies the audio? Recommended: derive three from the current sound and ship them as bundled assets; make the remote URL go away.

**Q8. Tablet rotation and thresholds**: (a, recommended) rotate freely on tablets, lock phones to portrait (the mockups are portrait only for phones), decide `tablet` by `DeviceInfo.isTablet()` once at launch; (b) decide by window width (follows split screen, a phone in landscape could pick the tablet layout); (c) keep today's free rotation on both.

**Q9. Max content width on tablets for stack screens, forms and sheets** (the mockups only draw the board): (a, recommended) one `maxContentWidth` token (about 600) centred for stack screens and dialogs, sheets centred as a card above the same width; (b) full width everywhere except the board.

**Q10. Phone Orders tabs vs the board's columns**: the board has `New / Preparing / Ready`, the phone has `New / In progress / History`. Is `History` reachable on a tablet (a rail destination, a filter, a button)? The mockup does not say.

**Q11. The submodule's own `GET /theme`**: leave it (recommended, as D-T), costs one request per launch, is read only by `BusinessList`'s `showCities` that no screen uses.

**Q12. Schema versions and `store_app`**: the `tablet` platform declares `platforms: ["tablet"]`; the version string and when to register `store_app` in api-core are the owner's (publishing is out of scope).

---

## 9. Files the implementation would own (area 1)

New: `product.schema.json`, `src/theme.compiled.json`, `theme-exceptions.json`, `theme-readers.json`, `scripts/theme/{guard,keys,extremes,inventory}.mjs`, `src/theme/{engine,remote,AppThemeContext,helpers,sections,bundledImages}.ts(x)` and its tests, a platform hook (`src/theme/platform.ts`), `src/context/{BottomBarContext,UnreadMessagesContext,NewOrdersContext}.tsx`, `src/navigators/{oneSignalPush,pushProviderSwitch,notificationTokens,...}.ts` and their tests, `src/utils/splash.ts`, `docs/THEMING.md`, `BUILD_PNPM.txt`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.github/workflows/{ci,theme-publish}.yml`.

Rewritten or replaced: `index.js` (unchanged except Sentry/push), `App.tsx` (drop the four logging listeners), `src/BusinessApp.tsx` (provider tree, cached theme, splash), `src/AppContainer.tsx`, `src/navigators/{RootNavigator,HomeNavigator,BottomNavigator}.tsx` (+ rail), `src/context/PermissionsContext.tsx`, `src/pages/{Splash,NotFound,NetworkError}.tsx` (NotFound / NetworkError likely deleted), `src/ui/index.tsx` (barrel), `src/ui/src/components/shared/*` (all, section 2), `src/ui/src/layouts/*`, `src/ui/src/hooks/DeviceOrientation.tsx`, `src/ui/src/context/Theme/` (deleted), `src/ui/src/utils/index.tsx`, `src/ui/src/types/**` and `src/types/**` (dedupe), `src/theme.json` (deleted), `src/assets/{fonts,images,icons,sounds,json}` (replaced / pruned; `json/order.json` and `orders.json` are read by nothing: 124 KB), `jest.config.js`, `jest/setup.js`, `jest/helpers/*`, `jest/coverage-include.js`, `tsconfig.json`, `package.json`, `rn-cli.config.js` (delete), `babel.config.js` and `metro.config.js` and `react-native.config.js` (unchanged).

Native files the shell depends on, owned by the native worktree: `ios/businessApp/Info.plist` (fonts, orientations), `AndroidManifest.xml`, the bootsplash assets, the push extensions, the sounds.

---

## 10. What I did not see / did not verify

- Nothing was run: no `tsc`, lint, jest, bundle, simulator or device. The jest baseline numbers come from `.theme-audit/baseline.txt`, not from a run now.
- The 12 unreachable files and the usage counts are from a static import graph and `grep -w`; a component used only through a dynamic path or a string would be missed (none found). `DriverMap`, `ScheduleBlocked` and `OrdersOptionStatus` have no importer outside the barrel (dead candidates for the areas that own them; not checked beyond grep).
- That text renders in Lato Black on a device (section 1.1) is an inference from the font names, not a screenshot check.
- I did not verify that every mockup glyph exists in Ionicons or Material Design Icons; nor the two driver libraries' (`@react-native-vector-icons/*`) coverage.
- I did not read D-T's `Tabs.tsx`, `OCalendar.tsx`, `OSelect.tsx` or `helpers.ts` line by line: whether `Tabs` takes a count, whether `OCalendar` can be extended with a range, and the exact platform seams in `helpers.ts` are inferences from signatures and comments.
- Android and iOS native projects were read only for orientation, fonts and splash (`AndroidManifest.xml`, `Info.plist`, `project.pbxproj` `TARGETED_DEVICE_FAMILY`); not the Gradle, Podfile, MainActivity, AppDelegate or the push extensions.
- Push behaviour was read, not exercised: I did not check what the API does for `provider: 'fcm'`, nor whether `firebase_push_enabled` is set on any project.
- `src/config.json` was read for key names and the two flags only (no values were copied); it is locally modified (not read for secrets, not edited).
- I did not check api-core for the `GET theme` parameters (`theme_version`, `product_type`, `theme_schema_version`) or whether `store_app` is registered there; I relied on D-T's `remote.ts` and the engine docs.
- `DESIGN-KIT.md` and `SPECS.md` were read, plus the full text of `Main`, `Login`, `NotificationsPermission` and the first part of `TabletBoard`; other mockups only through the marker greps in section 2.1.
