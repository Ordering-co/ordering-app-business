# CLAUDE.md

Guidance for AI assistants working in **Ordering Business App** — the **bare React Native** mobile app for restaurant / store operators on Ordering.co / OrderingPlus.

**Repository:** [Ordering-co/ordering-app-business](https://github.com/Ordering-co/ordering-app-business)

**Stack:** React Native 0.88.1 (new architecture, Hermes), React 19.3.0, TypeScript, styled-components/native, themed with `@orderingco/ordering-theme-engine` 0.14.0. **Not Expo.** Business users accept / reject orders, follow the kitchen, message customers, manage stores and menus, print tickets, and receive push notifications. Phones and tablets.

**Identifiers:** Android package and iOS bundle `co.ordering.business`; iOS project and scheme `OBusiness`; visible name `OBusiness`; the JavaScript module name stays `businessApp`; product type `store_app`.

**Related repos:** [ordering-components](https://github.com/Finitless-com/ordering-components) (the submodule at `src/@/components`), [Driver App](https://github.com/Ordering-co/ordering-app-driver) and [Customer App](https://github.com/Ordering-co/ordering-app-customer) (the same conversion; their code is the model for shared pieces), [Ordering Website](https://github.com/Ordering-co/ordering-website-customer) (web, same submodule).

## Theming

**Read [docs/THEMING.md](docs/THEMING.md) before styling anything.** Every visual value (color, space, radius, border, size, font, opacity, motion, image, what is shown) comes from the theme: `product.schema.json` compiles to `src/theme.compiled.json`; the app paints that file's defaults until a served theme arrives, then the cached one (`src/theme/`). Read it through the helpers of `src/theme/helpers.ts` and the primitives of `src/ui/src/components/shared`; never `theme.colors.*` or `theme.json` (both are gone). The owner's decisions are in [docs/theme/decisions.md](docs/theme/decisions.md) and are not reopened. A schema change needs its editor labels in `docs/theme/editor-labels.md` and, once a version is published, a version bump.

## Onboarding

Use [docs/onboarding.md](docs/onboarding.md) for the Quickstart helper, project configuration and the local simulator. The development project gate prepares session and offline queue storage before the SDK provider mounts.

## Commands

Package manager is **pnpm** (version pinned in `package.json` `packageManager`, through `corepack enable`; settings in `pnpm-workspace.yaml`). Node **>= 22.13**. Android needs JDK 17 or newer and Gradle 9.4.1 (the wrapper); iOS needs Xcode 26+.

```bash
pnpm install               # dependencies (patches apply from pnpm-workspace.yaml)
pnpm start                 # Metro   |   pnpm start:reset (cache reset)
pnpm ios | pnpm android    # run on a simulator / emulator
pnpm test                  # jest (one file: pnpm test path/to/file)   |   pnpm test:coverage (the CI gate)
pnpm lint:check            # eslint (pnpm lint = with --fix)
npx tsc --noEmit           # typecheck (there is NO `npm run build`)
pnpm theme:validate | theme:verify | theme:guard | theme:keys | theme:reads | theme:extremes   # the schema and its readers
pnpm i18n:verify | i18n:check-generated | i18n:generate | i18n:missing | i18n:apply-batch
```

iOS native deps (first clone or after a native change): `bundle install`, then `pod install` from `ios/` (Homebrew's `pod`; `bundle exec` fails with the system Ruby). The Podfile's spec source is the git repository and `Podfile.lock` must name it under `SPEC REPOS` (never `trunk`): the Builder's pipeline resolves pods from it (`docs/deps/ios-native.md`).

**Verify a change in this order:** `npx tsc --noEmit` → `pnpm lint:check` → `pnpm test` → the six `theme:*` checks → `pnpm i18n:verify` → for UI or native changes, run on a simulator and a device. Build both React Native bundles when changing dependencies or native configuration.

## Architecture: three layers

```
@components (submodule)     →  controllers + hooks, NO visual markup
@ui (src/ui)                →  presentational components wired through the UIComponent prop
pages + navigators (src/)   →  thin screen wrappers, navigation, i18n strings
```

1. **`@components` → `src/@/components`** (GIT SUBMODULE, headless logic from [ordering-components](https://github.com/Finitless-com/ordering-components)). `@components` resolves to `src/@/components/native/index.js` — **not** `src/@/components/src/index.js`. Logic changes belong upstream (additive only, a branch and a draft pull request; this app's pointer moves after the merge: `docs/deps/ordering-components-additive.md`). Controllers take a `UIComponent` and render only it. See `src/@/components/CLAUDE.md`.
2. **`@ui` → `src/ui`** (app source): `src/ui/src/components/*` re-exported from `src/ui/index.tsx`. Wiring: `export const X = (props) => <XController {...props} UIComponent={XUI} />`. The primitives live in `src/ui/src/components/shared` (`OText`, `OButton`, `OInput`, `OSelect`, `OBottomPopup`, `OCard`, `OBadge`, `Tabs`, `ScreenContainer`, `PaneLayout`, `Icon`, `useConfirm`…): read one before using it and build with them. Styles live in a sibling `styles.ts(x)` or are built inside the component with `useMemo(() => …(theme), [theme])`; never a module-level themed `StyleSheet`, never a literal.
3. **`src/pages` + `src/navigators`**: each page is a thin wrapper (`useLanguage`, `useTheme`, props, layout). Logic is not here.

## Folder map

| Path | What |
|---|---|
| `src/BusinessApp.tsx` | provider tree: `AppThemeProvider` (+ `ThemedStatusBar`) → `OrderingProvider` (+ `RemoteThemeLoader`) → `OfflineActionsProvider` → `PermissionsProvider` → `BottomBarProvider` → `AppContainer` + `OToast` + `ConfirmDialogHost` |
| `src/theme/` | the theme runtime: `engine.ts` (builds the theme, once per envelope and platform), `AppThemeContext.tsx`, `remote.ts` (request + per-project cache), `helpers.ts`, `sections.tsx` (page sections, visibility), `platform.ts` (`usePlatform`, `useLayout`), `navigation.tsx`, `bundledImages.ts` |
| `product.schema.json`, `src/theme.compiled.json`, `theme-exceptions.json`, `theme-readers.json`, `scripts/theme/` | the schema, its compiled form (`pnpm theme:compile`), the recorded literals, the recorded readers, and the checks |
| `src/ui/src/components/*` | one folder per feature (orders list `OrdersOption`, `OrdersBoard`, `PreviousOrders`, `OrderDetails`, `OrderActions` sheets, `Chat`, `PreviousMessages`, `StoresList`, `BusinessProductList`, `StoreProductOptions`, `NewOrderNotification`, `WebsocketStatus`, `Printer*`, `TicketPreview`, `LoginForm`, `UserProfileForm`, `Sessions`…) |
| `src/ui/src/context/OfflineActions/` | the offline order-action queue (replays when the network returns) |
| `src/printing/` | printing without UI: Star, Epson, generic BLE adapters, ESC/POS, ticket text, the print run, discovery |
| `src/pages/` | screen wrappers; `src/navigators/` the root, home and tab navigators, push and launch plans; `src/navigators/routes/<area>.tsx` each area's stack screens (`index.ts` collects them; `shellRoutes.ts` the names the shell reserves) |
| `src/context/` | app-only contexts: permissions, shell, bottom bar, socket reconnect, unread messages |
| `src/hooks/` | app-wide hooks: `useFormats` (the one writer of a time or a date on screen), `useKeyboardVisible`, `useRevealFocused`, `useWindowTop` |
| `docs/` | `THEMING.md`, `theme/` (decisions, tokens, components, pages and visibility, areas, harmony, open questions, `verification.md` = the checks, the device rounds and every open finding), `deps/` (the upgrade, native steps, the Release builds), `BACKEND_REQUESTS.md`, `PERFORMANCE.md`, `SOUNDS.md` |
| `i18n/` | the translation catalog (`translations.json`), its scripts, `pending/` inputs |

## Entry flow and navigation

`index.js` → `App.tsx` → `src/BusinessApp.tsx` → `src/AppContainer.tsx` (`NavigationContainer`) → `RootNavigator` (auth gating, splash, push, connectivity, project change, the 15 s launch limit).

```
RootNavigator
├─ Signed out: [Home (project step, only with use_root_point)] → Login / Forgot
└─ Signed in: HomeNavigator (socket rooms, global overlays `OrderActionsHost`, `NewOrderAlert`, `ConnectionHost`, and the notification explainer)
   ├─ BottomTab → tabs Orders, Messages, Stores, Profile (a side rail on a landscape tablet)
   └─ Stack screens (from routes/*.tsx): OrderDetails, OrderMessage, BusinessProductListing, ProductOptions, ProfileEdit,
      ProfilePassword, Notifications, Sessions, Printers, PrinterSetup, PrinterConfigure, PrintTicketSettings, TicketPreview, OrderSummary
```

Accept / reject / adjust time / assign driver / more are sheets opened through `useOrderActions()` (`OrderActionsHost`), not routes. `NavigationRef.tsx` enables navigation from outside React (push handlers).

**Page conventions:** `const [, t] = useLanguage()` and `t('KEY', 'English fallback')`; `onNavigationRedirect: (page, params) => navigation.navigate(page, params)`; business login uses `allowedLevels: [0, 2]` (admin / business owner, not the driver's `4`); order actions use the business keys (`acceptByBusiness`, `rejectByBusiness`); pass `isBusinessApp: true` from the pages that drive orders, details and profile and keep it consistent (`MyOrders`, `OrderDetails`, `Profile`). **Accepting an order is always one direct tap; dangerous actions (reject, cancel-type statuses, log out, delete) are guarded by a confirmation.**

## Tablet layout rule

`usePlatform()` / `useLayout()` (`src/theme/platform.ts`) are the only way to ask: never `Dimensions.get`, `DeviceInfo.isTablet()` or `Platform.isPad` in a component. A phone is portrait only; a tablet rotates freely. **Landscape tablet:** a side rail instead of the tab bar, the orders board by columns with the order's details as a right-hand panel (`OrdersBoard`, when `orders.board` is on), two panes in Messages, Stores and Printers (`PaneLayout`), sheets as centred dialogs. **Portrait tablet:** the phone layout inside `ScreenContainer`, centred, with a maximum width. Tests: `renderWithProviders(ui, { platform: 'tablet' })`.

## Configuration

- **`src/config.json`** — runtime config: `app_id` (the site's code the app asks its theme with), `app_internal_name` (`business_app`), `notification_app` (`businessapp`), `app_name`, `project`, `api.url` / `version` / `language`, `socket.url`, `use_root_point`, `show_tutorials`. Passed to `OrderingProvider` as `settings`. **Local only: never commit a change to it** (a developer's copy points at a local API and project); the Builder writes the brand's values.
- Server `configs` (`useConfig()`) override local flags (`onesignal_businessapp_id`, `combine_pending_and_progress_orders`, `allow_save_changes_offline`, `reject_orders_enabled`…).
- No env vars.

## i18n

`t('KEY', 'English fallback')` always with a fallback (the 11 locales are machine translation, no native speaker has read them). Source of truth: `i18n/translations.json` (locales from `i18n/config.json`), regenerated from the code by `pnpm i18n:generate`; `pnpm i18n:verify` and `i18n:check-generated` gate CI. New keys: write them in the code with their English text (`i18n/pending/` holds inputs only); fill locales with `.claude/skills/translate-keys` (`/translate-keys`).

## Business-specific behavior (do not confuse with driver / marketplace)

| Concern | Where it lives |
|---------|----------------|
| Push (OneSignal 5, key `configs.onesignal_businessapp_id`; Firebase mode) | `RootNavigator` + `src/navigators/oneSignalPush.ts`, `usePushSetup.ts`; Android `NotificationServiceExtension.kt`, iOS `OneSignalNotificationServiceExtension` (the order alarm sound) |
| New-order alert, queue, ring | `NewOrderAlert` (the `NewOrderNotification` folder; mounted once by `GlobalOverlays`); the three alert sounds are bundled files (`docs/SOUNDS.md`) |
| New order vibration | `subscribeOrdersRegisterVibration` (websocket `orders_register`) while no alert is open |
| Offline order actions | `OfflineActions` in `@ui`; the orders' offline copy `OrdersOption/useOrdersCache.ts` |
| Tablet vs phone orders | `MyOrders` page: landscape tablet with `orders.board` → `OrdersBoard`; else `OrdersOption` in `ScreenContainer` |
| Stores and menu | `Stores` page → `StoresList` + `BusinessController`; `BusinessProductListing` → `BusinessProductList`; the menu search needs the additive `StoreProductSearch` (detected, hidden without it) |
| Printing | `src/printing/`, `PrinterSettings`, `PrinterEdition`, `PrintTicketSettings`, `TicketPreview`; the printed ticket's text and units are not themed (`theme-exceptions.json`) |
| Manager websocket rooms | `HomeNavigator` — joins `orders` with `role: 'manager'` |

## Where to edit what

| Task | Edit here | Do NOT edit |
|------|-----------|-------------|
| Look, layout, components | `src/ui/src/components/*`, the primitives in `shared/` | submodule controllers |
| Colors, spacing, sizes, fonts, visibility, platform values | `product.schema.json`, then `pnpm theme:compile` | hardcoded values in components |
| Screen wiring, page props | `src/pages/*`, `src/navigators/*` | `@ui` unless reusable |
| Business logic, API calls, order state | the submodule, upstream (additive) | pages |
| Runtime config | `src/config.json` (local only) | env vars |
| OneSignal, permissions | `src/navigators/*`, `src/context/PermissionsContext.tsx` | submodule |
| Offline queue | `src/ui/src/context/OfflineActions/` | submodule |

## Common mistakes — avoid these

1. **Markup or styled-components in submodule controllers** — belongs in `src/ui`.
2. **Importing `src/@/components/src/index.js`** — use the `@components` alias (native barrel).
3. **Business logic in `src/pages/*`**.
4. **A literal in a style** (hex, number for a length, font size, `fontFamily`, `fontWeight`, shadow) or a read of `theme.native` inline — use the helpers; `pnpm theme:guard` fails on a literal.
5. **A module-level themed `StyleSheet`** — it never sees a theme change.
6. **A library that paints its own UI** (pickers, dropdowns, chat kits) — build on the primitives; every select is a bottom sheet.
7. **Editing the submodule casually** — it is shared with web, marketplace and driver.
8. **Forgetting the `t()` fallback**, or a new key without its English text in the code.
9. **Driver or customer login levels** — business is `[0, 2]`.
10. **`OrderDetails/Delivery` or the driver's keys** — this app uses `OrderDetailsPage` and the `…ByBusiness` actions.
11. **`yarn` / `npm install`** — pnpm only; commit `pnpm-lock.yaml` with `package.json` (CI fails otherwise).
12. **Publishing a schema by hand**, or a schema change without a version bump after the first publish.
13. **A new class in the Android package outside `co.ordering.business`**'s three sources without telling the Builder base (it renames the package only in the files it lists).

## Gotchas

- **Submodule**: fresh clones need `git clone --recursive https://github.com/Ordering-co/ordering-app-business.git` or `git submodule update --init`.
- **Patches** (`patches/`, `patchedDependencies` in `pnpm-workspace.yaml`; `pnpm install` fails if one does not apply): `react-native-ble-plx`, `react-native-print`, `react-native-star-io10`, `react-native-notify-kit` (JDK 17+). Do not drop one without checking why it exists. There is no patch-package.
- **Builder builds (Jenkins)**: `BUILD_PNPM.txt` tells the Builder's pipelines to install with pnpm and keep `ios/Podfile.lock`; `NODE_VERSION.txt` is the Node major; `builder.json` is kept current but not read. Replaceable markers: `_GOOGLE_MAPS_API_KEY_` in `AndroidManifest.xml` and `ios/OBusiness/AppDelegate.swift` (never write it in a comment); the splash files have fixed names.
- **A published schema version is immutable** and binaries ask for it: bump `version` before changing `product.schema.json`.
- **Fonts**: the catalog's ten families, 40 static files linked by `react-native.config.js`; after `npx react-native-asset` undo the notification extension's font entries (`docs/deps/ios-native.md`).
- **Hermes** does not compile a destructuring with a shorthand `get`/`set` and a default.
- ESLint extends `@react-native` (`.eslintrc.js`): 0 errors; hook-dependency and shadowing warnings are legacy and stay until touched.
- `use_root_point: true` enables multi-project selection (stored in AsyncStorage `project_name`); changing project may `RNRestart`.
- **Local only, not in the repository's history:** `.theme-audit/` (agents' working notes and contracts, excluded through `.git/info/exclude`), a developer's edits to `src/config.json`, `ios/Pods/`, `ios/build/`, `coverage/`. The test API account is never written anywhere in the repository.
- Test printers and push on physical devices. Verify signed builds on the supported devices.
