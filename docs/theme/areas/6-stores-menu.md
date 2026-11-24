## Area 6 — Stores and menu

Date: 2026-11-19 · Analyst: area 6 · Status: **analysis, nothing built**.

Scope: pages `Stores`, `BusinessProductListing`, `ProductOptions`; UI `StoresList`, `BusinessController`, `BusinessProductList` (`index`, `IterateCategories`, `AccordionDropdown`, `ProductList`), `StoreProductOptions`, `SearchBar`; submodule controllers read only: `BusinessList`, `BusinessController`, `StoreProductList`, `StoreProductOptions`. Mockups: `Stores`, `SheetPause`, `Menu`, `MenuUnavailable`, `ProductOptions` (`design/redesign/screens/*.dc.html`, `SPECS.md` D). api-core checked at commit `112e229fc`.

This area exists only in the business app (the driver app deleted it), so nothing is ported for the screens. The primitives to build with are the driver-theming `src/ui/src/components/shared/*` (`OListRow`, `OSwitch`, `OInput`, `OBottomPopup`, `FilterChip`, `Tabs`, `SkeletonBone`, `ONotice`, `OAvatar`, `OBadge`, `OCard`, `ChoiceRow`, `SectionTitle`, `ONavbar` with `subtitle` and `right`, `Icon`).

Path legend: `UI/` = `src/ui/src/components/`; `SUB/` = `src/@/components/src/components/`; `API/` = `/Users/work/Ordering/api-core/`.

---

### 1. Today

#### 1.1 Reachability

`BottomNavigator.tsx:122-136` tab `Stores` (label `BUSINESSES` "Businesses", glyph `general.stores`) → `pages/Stores`. Tapping a card → `navigate('BusinessProductListing', {slug})` (`UI/BusinessController/index.tsx:103`) → `navigate('ProductOptions', {businessId, categoryId, productId, productName})` (`UI/BusinessProductList/index.tsx:184-189`). Both stack screens are in `HomeNavigator.tsx:74-83` (`headerShown: false`). No level or config condition decides whether they are reachable. The server decides which stores a user sees (not verified per level).

#### 1.2 Stores list (`pages/Stores.tsx` + `UI/StoresList` + `UI/BusinessController`)

- **Page** (`Stores.tsx:10-37`): `SafeAreaContainerLayout` (padding 20) wrapping `StoresList` with `isSearchByName`, `isSearchByDescription`, `propsToFetch ['id','name','logo','address','zipcode','enabled','slug']` (`:14`), infinite pagination `pageSize 10` (`:15-19`), `asDashboard: true`, `initialFilterKey 'orderBy'` / `'name'` (`:21-22`), `isForceSearch: Platform.OS === 'ios'` (`:23`). Styles are an inline `StyleSheet.create` in the page.
- **Header** (`StoresList/index.tsx:130-146`): title "Stores" (`STORES`, 26/700, `fonts.special`) and `SearchBar` 210x40, shown only when `isConnected`. `isConnected` comes from `NetInfo.fetch()` called **in render** (`:39-41`, not in an effect; initial `false`).
- **Note with the dashboard link** (`:152-174`): a gray box (`gray100`, radius 10) with italic "**Note:** For more settings go to <link>" (`NOTE`, `MORE_SETTINGS_GO_TO`, `LINK_MORE_SETTINGS_GO_TO`). The link is `t('LINK_MORE_SETTINGS_GO_TO', 'https://dashboard.orderingplus.com')` passed to `Linking.openURL`: the **URL lives in a translation key** (a translator can change it; a white-label project cannot point it to its own dashboard). The box has `maxHeight: 400`, `flex: 1` and sits inside the scroll, above the list.
- **Store card** (`UI/BusinessController/index.tsx`, `styles.tsx`): border 1 `gray100`, radius 10, padding 10, min-height 64. Left, one `TouchableOpacity`: logo 56x56 (`FastImage`, immutable cache, shadow `#000`/elevation 7 when it has a logo, `:69-80`; fallback `theme.images.dummies.businessLogo`, `:112`), name (16/700, 1 line), address (12), zipcode (12; hidden when empty or `-1`, `:24-25,127`). Right: `ToggleSwitch` small (`toggle-switch-react-native`), replaced by an `ActivityIndicator` while `loading && isUpdateStore` (`:139-151`).
- **What the switch updates**: `updateBusiness(business.id, { enabled: !business.enabled })` (`:34-40`) → submodule `SUB/BusinessController/index.js:274-287` → `ordering.businesses(id).save(params)` → `POST /business/{id}` (`API/routes/api.php:658`). It is the business field **`enabled`**, not the schedule, and there is no "open/closed" or pause action. On success the effect (`:42-61`) shows an **Info** toast "Enabled business" / "Disabled business" (`ENABLED_BUSINESS` / `DISABLED_BUSINESS`); on error an **Error** toast "Error updating business" (`ERROR_UPDATING_BUSINESS`). No confirmation. The effect also runs on first render (`business` changes) and calls `setIsUpdateStore(false)`.
- **Not shown although fetched/passed**: `isBusinessOpen={business.open}` and `orderType` are passed (`StoresList:188-197`) but `open` is not in `propsToFetch` and nothing reads them; `handleCustomClick` is passed but the card navigates on its own.
- **Search and why the first list is partial**: `SearchBar` debounces 1 s (`lazyLoad`) and calls `handleChangeSearch` → server-side `where` with `name ilike %term%` OR `description ilike %term%` (`SUB/BusinessList/index.js:212-241`); with the server config `advanced_business_search_enabled === '1'` and 3+ characters it uses the `term` advanced search instead (`:73,124-136,265`). The first list is partial because the page size is **10** (`Stores.tsx:18`) and more pages load only from the scroll handler. Search runs on the whole server list, so "Wine" finds 3 more stores (`93-stores-busqueda-wine`) than the first 10. Things I read that can make the list look "closed" after 10 (cause not proven on a device): (a) the next page is requested from `ScrollView.onScroll` without `scrollEventThrottle` (`StoresList:148-151`; on iOS that sends one event per gesture) and compares `y + window height > content height` (`:66`) with the window, not the viewport; (b) no `onEndReached`, no pull to refresh. Shots `88` shows 10 stores at the end of the first scroll.
- **Order of the list**: `getBusinesses` builds `orderBy: 'name'` (`BusinessList:118-123`) but the pagination block spreads `{ version: 'v2', orderBy: 'distance' }` afterwards (`:138-144`), so the name order is overwritten. In dashboard mode the server then sorts `open DESC`, `featured DESC`, and falls back to `business.id asc` when there is no location (`API/app/Http/Controllers/BusinessController.php:1178-1179`, `:1208`; I read the code, did not call it). It matches the unsorted list in the screenshots. Closed stores go last, disabled stores are not separated.
- **Pagination**: infinite; `handleScroll` (`:59-74`) calls `getBusinesses()` and shows an Info toast "Loading more businesses" per page (`LOADING_MORE_BUSINESSES`).
- **States**: skeleton 6 rows of `rn-placeholder` while `loading || loadBusinesses` and connected (`:200-224`, image width depends on `orientation`); empty → `NotFoundSource` ("Sorry, no results found" `NO_RESULTS_FOUND`, or "Network Error" `NETWORK_ERROR` when offline, `:175-185`); `error` → Error toast (`:75-81`) and the list is not drawn (`!error` at `:186`). Offline: search hidden, no queue for toggles (`OfflineActions` does not cover stores).
- **Dead code**: `StoresList/styles.tsx` (`OptionTitle`, `FiltersTab`, `OTabs`, `TagsContainer`, `Tag`) is imported by nobody; unused imports `OIcon`, `handleChangeBusinessType`, `handleBusinessClick`, `orderState`, `windowsHeight`/`orientation` only for the skeleton; `styles.icons`, `styles.borderStyle` (passed to `SearchBar`, which ignores `borderStyle`); `BusinessController`'s `optimizeImage` and `useUtils`.

#### 1.3 Categories (`pages/BusinessProductListing.tsx` + `UI/BusinessProductList/index.tsx`, `IterateCategories.tsx`, `AccordionDropdown.tsx`)

- Page (`BusinessProductListing.tsx:15-21`): `StoreProductList` props `slug`, `businessProps ['id','categories']`, `asDashboard`. The title does **not** name the store (`businessProps` has no `name`).
- Controller `SUB/StoreProductList/index.js`: `getBusiness` (`:126-148`) = `ordering.businesses(slug).asDashboard().select(['id','categories']).get()` → business with its categories (with `subcategories`, `enabled`, `parent_category_id`). The category search is **client-side** over that tree, names only, recursive (`:213-246`).
- **Header** (`index.tsx:96-119`): back arrow (`general.arrow_left` 24 in a 32 button), title "Categories" (`CATEGORIES`, 26/700), `SearchBar` 140x40. Back = `navigation.goBack()`.
- **Rows** (`IterateCategories.tsx`): a bordered card per category (radius 10, padding 10): name (16/700, 1 line, tappable → opens products) + `ToggleSwitch` small = `updateStoreCategory(categoryId, {enabled})` → `POST /business/{b}/categories/{c}` (`SUB/StoreProductList:194-211`) → Success toast "Enabled/Disabled category" (`ENABLED_CATEGORY` / `DISABLED_CATEGORY`) or Error toast with the backend result. The switch's `disabled={loading}` is commented out (`:60,83,107`). Subcategories: an `AntDesign` chevron (`AccordionDropdown.tsx:25-30`, **inverted**: `up` when closed, `down` when open, color `theme.colors.textNormal` = not defined in the theme) expands them recursively, indented 10 (`styles.tsx`).
- Skeleton 6 rows (`:139-162`); empty `NotFoundSource` (`:123-129`).
- **Products level is an overlay, not a route**: `showModal` (`:41-46,164-192`) paints an absolute `View` with `Dimensions.get('window')` (static: stale after a rotation) over the categories. The Android back button / iOS gesture leaves the whole screen instead of closing the overlay.
- Dead/odd: `IterateCategories.tsx:91-112` renders `currentCat` when a list is empty and `isSub`; `isIos` is passed to the controller (`index.tsx:201`) only to skip `encodeURI` in the product search.

#### 1.4 Products (`UI/BusinessProductList/ProductList.tsx`)

- Header: back (closes the overlay) + "Products" (`PRODUCTS`) + `SearchBar` 140x40.
- Data (`SUB/StoreProductList:52-124`): `GET /business/{b}/categories/{c}/products` with `page`, `page_size` (15) and, if searching, `where` = `name ilike` OR `description ilike` (`encodeURI` on Android, plain on iOS). Search exists **only inside one category**. There is no "unavailable" filter.
- Row (`:141-181`): border `gray100`, radius 10; thumbnail 35x35 (`OIcon` with `optimizeImage(product.images, 'h_300,c_limit')` or `dummies.businessLogo`, shadow style `styles.logo` unused), name (16/700, 2 lines), chevron `AntDesign right` 14 when `onOpenProduct`, `ToggleSwitch` small. Row tap → `ProductOptions`. Switch = `updateStoreProduct(categoryId, productId, {enabled})` → `POST /business/{b}/categories/{c}/products/{p}` → Success toast "Enabled/Disabled product" (`ENABLED_PRODUCT` / `DISABLED_PRODUCT`; `SUB/StoreProductList:168-192`). `disabled={loading}` is the list's, not the row's: no row spinner.
- Infinite scroll via `IOScrollView` (`react-native-intersection-observer`, used only here) with a 2000 px margin; an Info toast per page "Loading more products" (`LOADING_MORE_PRODUCTS`). Skeleton 6 rows. Empty "Sorry, no results found".
- The price is not shown. The toggle shows `enabled` only: a product with a future `snooze_until` (paused from the dashboard) looks **on**.

#### 1.5 Product options and suboptions (`pages/ProductOptions.tsx` + `UI/StoreProductOptions`)

- Page passes `businessId, categoryId, productId, productName` (`ProductOptions.tsx:13-19`). No page test.
- Controller `SUB/StoreProductOptions/index.js`: on mount two calls in parallel: product `GET /business/{b}/categories/{c}/products/{p}?version=v2` and business extras `GET /business/{b}/extras` (`mode: 'dashboard'`) (`:86-97`); groups = all of the business's extras merged with the product's (`mergeGroups`, `:33-37`); `productExtraIds` = groups attached to the product. Options of a group load **on demand** when it is expanded: `GET /business/{b}/extras/{e}/options` (`:120-143`).
- UI (`StoreProductOptions/index.tsx`): header back + product name (22/700) + "Product options"; skeleton 5 rows; error → `NotFoundSource` + Retry; empty "This product has no options"; per group a card with **checkbox** (24 px `MaterialCommunityIcons`, `:167-183`) = attach/detach the group to the product, a name + "Disabled" caption when `extra.enabled === false`, a chevron (`right`/`down`); expanded: spinner, error + Retry, "This group has no options", option rows (15/600, "Disabled" caption) with `AvailabilityToggle` (a `ToggleSwitch` + spinner, `:34-54`) and indented suboption rows (14) with their toggle.
- **API field each control updates**:

| Control | Call | Field | Toast (Success) |
|---|---|---|---|
| group checkbox | `POST /business/{b}/categories/{c}/products/{p}` (`SUB/StoreProductOptions:189-193`) | `extras` = JSON array of the attached group ids | "Option group added to the product" / "...removed from the product" (`OPTION_GROUP_ADDED` / `OPTION_GROUP_REMOVED`) |
| option toggle | `POST /business/{b}/extras/{e}/options/{o}` (`:213-225`) | `enabled` | "Enabled option" / "Disabled option" (`ENABLED_OPTION` / `DISABLED_OPTION`) |
| suboption toggle | `POST /business/{b}/extras/{e}/options/{o}/suboptions/{s}` (`:227-244`) | `enabled` | "Enabled suboption" / "Disabled suboption" |

  Errors → Error toast with the backend text or "Error" (`ERROR`). The group, option and suboption are **shared** by every product that uses the group: the UI never says so. There is no group-level availability toggle (the group's `enabled` is only a caption). No product-level availability switch on this screen.
- The controller already returns `extraSearch`, `filteredExtras`, `handleChangeExtraSearch` (`:246-249,268-271`); the UI does not use them. The UI does not read option `min` / `max` or suboption `price`.

#### 1.6 Toasts, skeletons, libraries, dead code

- **Toasts**: Info for stores ("Enabled/Disabled business", "Loading more …"), Success for categories, products, options, groups. The color inconsistency noted in the inventory (blue vs green) comes from this mix of types.
- **Skeletons**: `rn-placeholder` `Placeholder/PlaceholderLine/Fade` in four places (stores 6, categories 6, products 6, options 5), each with its own inline look.
- **Libraries that paint their own UI**: `toggle-switch-react-native` (every switch in the area: 5 files), `rn-placeholder`, `react-native-fast-image` (store logo only), `react-native-vector-icons` `AntDesign` / `Feather` / `MaterialCommunityIcons` (chevrons, checkbox, clear), `react-native-intersection-observer` (`IOScrollView`, `ProductList` only). `toggle-react-native` is in `package.json` and imported by nothing. The driver replaced the equivalents with `OSwitch`, `SkeletonBone`, `OAvatar`, `Icon` (Ionicons/MCI).
- **Styling**: the area breaks the "no inline styles" rule in every file (about 40 inline `style={{…}}`), hard-codes `210/140/40` widths, `26/22/16` font sizes, `7.6` radii, and shadow `#000` (`BusinessController/index.tsx:72`, `ProductList.tsx:61`).
- **Conditions by config or level**: none in the area's own code. In `BusinessList`: `configs.advanced_business_search_enabled` (`:73`); `Platform.OS === 'ios'` → `isForceSearch` (page) and `isIos` (product search encoding). Types `BusinessControllerParams` and `SearchBarParams` are declared twice (`src/types/index.tsx:143,218` and `src/ui/src/types/index.tsx:169,245`).
- **`SearchBar`** (`UI/SearchBar`): used only by this area; ignores `borderStyle` and `noBorderShow`; `isCancelButtonShow` (an `OButton`) is never used by callers; the debounce timeout is a `let` re-created per render; the clear icon is a Feather `x-circle`.

---

### 2. Target

Mockup widths are 390; every value below comes from the mockup's inline styles and goes to theme tokens, not literals.

#### 2.1 Stores (`Stores.dc.html`) and the pause sheet (`SheetPause.dc.html`)

What the mockup shows: header "Stores" (20/700) with one 44 search button (no search screen is drawn); cards (border 1 `#E9ECEF`, radius 10, padding 15, gap 10) with a tappable row (44 tile with a store glyph, name 14/600, address 12 gray, chevron 20) → `Menu`; a divider; a status row: green dot + "Open · closes 10:00 PM" (12/600 `#00713F`), "Accepting orders" (12 gray) and a switch (44x24 track, 52x44 hit area, on = `#00884F`); the third card shows a yellow chip (`#FFF4CC`/`#6B5300`) "Paused · back at 3:30 PM" and a soft button 44 "Resume now" instead of the switch; a 44 high link "More store settings in the dashboard"; the tab bar (label "Stores"). Tapping the **on** switch opens the sheet: title "Pause orders · Luna Pizza", a 12 gray explanation, four radio rows (min 56, radio at the end): "30 minutes / Until 1:05 PM", "1 hour / Until 1:35 PM", "Rest of today / Reopens tomorrow at 11:00 AM", "Until I turn it back on"; primary button 50 "Pause orders". The mockup draws no state for "store disabled (`enabled=false`)", no skeleton, no empty state, no offline state.

Component tree (rewrites `UI/StoresList/index.tsx` + `styles.tsx`, `UI/BusinessController/index.tsx` + `styles.tsx`; `pages/Stores.tsx` becomes a thin wrapper without inline styles):

```
Stores (page)  SafeAreaContainerLayout → StoresList
 StoresListUI
  ONavbar-like header (title Stores, no back)  right: search button 44 (Icon search)
  [searching] OInput (search variant, 50, search icon, clear) under the header; debounce hook
  FlatList  (onEndReached → getBusinesses; RefreshControl; footer = dashboard link)
    StoreCard  (OCard look store_card)             ← BusinessControllerUI
      Pressable row → BusinessProductListing: OAvatar kind='business' size 44 (placeholder.business_logo) · title · address · Icon chevron-right
      ODivider
      StoreStatusRow: StoreStatus (dot + text | OBadge variant warning) · label "Accepting orders" · OSwitch | OButton soft "Resume now"
  states: SkeletonBone rows · empty_state (not_found) · ONotice (offline / error)
  PauseOrdersSheet (new file in the StoresList folder): OBottomPopup + ChoiceRow listed radios + OButton primary
```

Files: `StoresList/index.tsx` and `BusinessController/index.tsx` rewritten (the UI wrapper names `StoresList`, `BusinessController` stay, the controller wrapper too); new `StoresList/PauseOrdersSheet.tsx`, `StoresList/storeStatus.ts` (pure function: state from `enabled`, `open`, `schedule`, `timezone`, `snooze_until` and the clock; unit-tested), `StoresList/pauseOptions.ts` (the four options and their end times from `schedule`/`timezone`). `SearchBar` is deleted (only this area used it).

Primitives: `OCard`, `OAvatar`, `OListRow` is **not** used for the card (its whole row is the touch target; here only the top row is), `OSwitch`, `OButton` (soft variant), `OBadge`, `OBottomPopup`, `ChoiceRow listed`, `OInput`, `SkeletonBone`, `ONotice`, `OLink`, `Icon`.

What the mockup adds and what each needs:
- **Labeled open / closed / paused state per store.** Four states for the status row: *Open* (enabled, not snoozed, `open` true), *Closed by schedule* (enabled, `open` false: "Closed · opens 11:00 AM"), *Paused* (`snooze_until` in the future), *Turned off* (`enabled` false; not drawn in the mockup, see question Q2). Data: `open`, `today`/`schedule`, `timezone`, `snooze_until`, `enabled` must be added to `propsToFetch` (`schedule` and `timezone` come with `open` automatically: `BusinessController.php:1075-1079`). `open` is computed from the schedule only and ignores `enabled` and `snooze_until` (`:1139-1141`; `:3497-3507`), so the app combines the three. "closes 10:00 PM" = the end of the lapse that contains now (same math as `SUB/BusinessController:210-224`, with `createDayjsWithTimezone`).
- **Timed pause with automatic reopening: the API has it.** `snooze_until` exists on `business` (`API/app/Models/Business.php:96,218,283`) and on categories, products, menus, extras, options, suboptions, delivery zones (`Category.php:39`, `Product.php:78`, `ExtraOption.php:38`, `ExtraOptionSuboption.php:38`, `Extra.php:31`; migrations `API/database/migrations/patches/2024_08_15_32534_add_menu_snooze_until.php`, `2024_08_16_32432_add_extra_snooze_until.php`). `POST /business/{id}` accepts `snooze_until` as `Y-m-d H:i:s`, must be after now (`BusinessController.php:144,216`); the PHP timezone is UTC (`API/config/app.php:55`), so the app sends **UTC**. Saving schedules a Redis timer (`EventHelper::removeSnoozeDate`, `API/app/Helpers/EventHelper.php:195-250`; called from `BusinessController.php:9633-9637`) whose expiry runs `remove_snooze_date` and sets the column to `null` (`API/app/Http/Controllers/EventRuleController.php:585-612`). Even without that cleanup, every read treats a past `snooze_until` as not snoozed (`< NOW()`). While snoozed, the business **disappears from every non-dashboard business read** — list (`BusinessController.php:659-662`, `:1101`), single store (`:3519-3522`), eligibility (`API/app/Helpers/BusinessEligibilityHelper.php:137`), Google feed (`FeedBuilder::isPaused`) — which is what "Customers see the store as temporarily closed" means. The dashboard read (the app's) still returns it. `emptystringtonull` middleware is on the route (`routes/api.php:658`), so `snooze_until: ''` clears it ("Resume now"). The current controller's `updateBusiness(id, params)` takes any params, so **no submodule change** is needed to pause or resume. Not found: any check of the business snooze when a cart already exists or an order is placed (`CartController`, `OrderController` only test menus, products, zones); and `EmitUpdateCartByBusiness` is dispatched only when `schedule` or `enabled` is in the request (`BusinessController.php:9622-9627`), so a pause does not notify customers' open carts. To confirm with the API owner.
- **Sheet options** (app-only logic): 30 min and 1 hour = now + N; "Rest of today / Reopens tomorrow at 11:00 AM" = the next opening found in `schedule` after today's last lapse (walk up to 7 days; hide or disable the row when the schedule has no next lapse); "Until I turn it back on" = `enabled: false` (today's switch), no `snooze_until`. "Until 1:05 PM" is the device clock in the **store's** timezone (`business.timezone`).
- **Resume now** = `snooze_until: ''` (and `enabled: true` if it was off).
- **Search stores:** the mockup has only the icon. Reuse the same server search (`name`/`description ilike`); the field opens under the header. Debounce moves to a hook; no 1 s fixed wait (use ~400 ms).
- **Dashboard link:** a text link at the foot. Today's URL is a translation key; see Q4.

#### 2.2 Menu (`Menu.dc.html`, `MenuUnavailable.dc.html`)

What the mockups show. **Menu**: header back + "Menu" (20/700) + store name (12 gray) + a search button; a yellow `role="note"` "3 products are unavailable" + underlined "View"; a horizontal chip row "All", "Pizzas 7" (selected, `#E9F2FE`/`#1862C5`), "Sides 5", "Drinks 6", "Desserts 3" (36 high, clipped, scrolls); the selected category's row: "Pizzas" (16/600), "7 products" (12 gray), "Category on" (12 gray) and its switch; product rows (min 64, line under): a 44 tile with an image glyph, name 14/600 + price 12 gray (+ a red 12 line "Unavailable · back tomorrow" / "Unavailable · until you turn it on" and a gray name when off) and a switch; the row's left part opens `ProductOptions`. **MenuUnavailable**: same header without the search button; a 50 search field "Search all products"; chips "All" and "Unavailable 3" (selected); the same rows with the category as the second line and the off-state text "Pizzas · off since 11:40 AM · back tomorrow"; a footer bar with a soft 50 button "Make all available". The two boards are one screen in two modes (the Menu's search button and the notice's "View" both lead to the second); I treat it as **one route with a `mode` state**, so the system back closes the search first and the overlay-that-is-not-a-route defect disappears.

Component tree (rewrites `UI/BusinessProductList/index.tsx`, deletes `IterateCategories.tsx`, `AccordionDropdown.tsx`, `ProductList.tsx`):

```
BusinessProductListing (page)  SafeAreaContainerLayout → BusinessProductList (StoreProductList controller, or the menu hook, see Q1)
 BusinessProductListUI
  ONavbar title Menu · subtitle store name · right: search button    (mode 'browse')
  ONavbar title Menu · subtitle store name (back closes search)       (mode 'search')
  [search] OInput "Search all products" + Tabs/FilterChip All | Unavailable N
  [browse] ONotice warning "N products are unavailable" + OLink View     (visibility menu.unavailable_notice)
  [browse] horizontal chip row (FilterChip, one per top-level category, count)  + All
  CategoryHeader (SectionTitle-like: name, "N products", "Category on" + OSwitch)
  FlatList of MenuRow (new, in this folder)
     MenuRow: Pressable(left: tile 44 (OAvatar/glyph) · name · price · state line) → ProductOptions;  OSwitch (own touch target 52x44)
  footer (search+Unavailable only): OButton soft 50 "Make all available" (bar with top line, as bottom_bar)
  states: SkeletonBone rows · empty_state · ONotice error + Retry
```

Primitives: `ONavbar` (has `subtitle`, `right`), `OInput`, `FilterChip`/`Tabs` (pill), `ONotice`, `OLink`, `OSwitch`, `OAvatar`, `SkeletonBone`, `OButton`, `SectionTitle`. `MenuRow` is new because `OListRow`'s `onPress` makes the full row one touch target and its trailing switch would be swallowed: build it from the `list_row` tokens (see 4.3).

What the mockups add and what each needs:
- **Menu as one screen with categories and products.** Data exists: categories come from `getBusiness` (`businessProps` must add `name`, and `timezone` if used); products per category from `GET .../categories/{c}/products` (today's call). Chip counts ("Pizzas 7") are **not returned** with the categories (no `products_count` on `Category` or in `CategoryController`); options: derive from a full product fetch (below) or one `pagination.total` call per category, or ask for `products_count` (Q5).
- **Search across categories: the API can, the current controller cannot.** `GET /business/{b}/products` with `version=v2` and `mode=dashboard` lists **all products of the business** (not per category) with `where`, `orderBy`, `limit`/`offset` or `page`/`page_size`, `params` (`API/routes/api.php:701`; `ProductController::findAllBusiness` `:2349` → `findAllBusiness_v2` `:2709`, dashboard branch joins `categories.business_id`, `:2943-2944`; `where` goes through `graph($query, …)`, `:2868`; pagination `getPagination`, `:3085`). The v1 branch (no `version`) forces `enabled = true` (`:2618`) and is not usable. Max page size is 50 (`API/config/ordering.php:597`). The SDK already has `ordering.businesses(id).products()` (`SUB/sdk/src/classes/ApiBusiness.ts:88`). `StoreProductList` has no such call, so a **new controller capability** is needed (Q1). The `name ilike` / `description ilike` condition is the one used today; the iOS/Android `encodeURI` difference must be kept.
- **"Unavailable" filter and the banner count.** Same endpoint with `where`: `enabled = false` OR `snooze_until > now` (fields are in `Product::$types`/fillable, `Product.php:35-43,78,222`); the banner's "3" and the chip's "Unavailable 3" = `pagination.total` of that query (ask with `page_size=1`). That the `where` grammar accepts a `>` on a timestamp is **not verified** (`BusinessList` uses `<=` on `delivery_time`, `BusinessList/index.js:181-200`); the fallback is `enabled=false` on the server and `snooze_until` filtered in the app.
- **"Unavailable · back tomorrow / until you turn it on / back in 2 h":** product `snooze_until` is writable (`ProductController.php:99,142`; timer `:2015,2274`; `update` route `routes/api.php:719-720`). "Until you turn it on" = `enabled=false` without `snooze_until`. A product is unavailable when `enabled === false` OR `snooze_until > now`. Turning on = `{enabled: true, snooze_until: ''}`.
- **"off since 11:40 AM / yesterday": needs backend.** No field records when a product was turned off. `updated_at` exists (`Product.php:73,210`) but changes on any edit (price, name), so it is only an approximation. Without a backend field the mockup text cannot be exact (Q6).
- **"Make all available"**: no per-store bulk in the SDK. `PUT .../bulks/products` exists (`API/routes/api.php:548-552`, `ProductBulkController::update`: up to 500 products, 5 businesses, `enabled` validated, fillable includes `snooze_until`; its full path prefix and `ordering.put` in the SDK are not verified). Fallback: N sequential product updates with a progress state. The button sits in the search-mode footer, so it acts on the **filtered** list (Unavailable, N items); a confirmation is advisable (it re-opens dishes for customers).
- **Subcategories:** the mockup shows only top-level chips. Today's tree is recursive. Q7.
- **Product photo/price:** the mockup draws a glyph tile, not the product photo. Q8.
- **Category switch:** `updateStoreCategory` as today; "Category on" text flips to "Category off"; the products stay as they are.

#### 2.3 Product options (`ProductOptions.dc.html`)

The mockup: header with the product name and "Options and extras"; a card "Product available / Shown in the menu" + switch; then **sections named by the option** ("SIZE · CHOOSE 1", "EXTRAS · UP TO 3": 12/600 uppercase gray) each a bordered card (padding 0 15) of rows min 50: name 14/600, price "+$2.00" 14 gray, switch; an unavailable row has a gray name, a red "Unavailable" line and an off switch; at the end an info note "Turning off an option hides it in every product that uses this group."

Component tree (rewrites `UI/StoreProductOptions/index.tsx` + `styles.tsx`; `pages/ProductOptions.tsx` loses its inline `StyleSheet`):

```
ProductOptions (page) → StoreProductOptions (StoreProductOptions controller)
  ONavbar title product name · subtitle "Options and extras"
  OCard row "Product available" + OSwitch                    ← needs a product update handler (see below)
  per option section: SectionTitle (name · rule) + OCard(list) of OptionRow  (OListRow-like: name, price, OSwitch, "Unavailable" line)
  ONotice info (shared group notice)
  states: SkeletonBone · empty_state · ONotice error + Retry
```

Mapping to the data: the mockup flattens the API's three levels **group (`Extra`) → option (`ExtraOption`: `min`, `max`) → suboption (`ExtraOptionSuboption`: `price`)** into *section = option* and *row = suboption* (`API/app/Models/ExtraOption.php:36-47`, `ExtraOptionSuboption.php:34-40`). So: "CHOOSE 1" = `min=max=1`; "UP TO 3" = `min=0`, `max=3`; other = "Choose min–max" (app-only text logic); `+$2.00` = suboption `price` through `parsePrice`. The group level disappears from the screen (shown only as the shared notice). The option's own switch (today an option toggle) has no place in the mockup (only suboption rows have switches); an option with no suboptions needs a row (Q9). The options of every attached group must load on mount: the controller loads on expand, so the UI calls `handleLoadExtraOptions(extra.id)` for each attached group (works today; N small requests). Not verified: that the options endpoint returns `min`, `max` and `price` (they are fillable and the endpoint returns the models; the UI never read them).
- **Product available switch:** `StoreProductOptions` has **no handler** for it (`SUB/StoreProductOptions/index.js:213-244` handle options, suboptions, attach only). The API call is the same as the menu's (`POST /business/{b}/categories/{c}/products/{p}` with `enabled`/`snooze_until`). Needs a controller addition (Q1) or an app-local hook.
- **Attach/detach of groups (today's checkbox) has no place in the mockup** (Q10).
- **Option-level snooze:** `ExtraOption.snooze_until` exists; the mockup shows only an off state, so I only read `enabled`.

---

### 3. Behaviour kept / changed

| # | Behaviour | Today | Target | Status | Evidence |
|---|---|---|---|---|---|
| 1 | Store switch updates | `enabled` | "Accepting orders": on → opens the pause sheet; sheet "Until I turn it back on" = `enabled:false`; off → on = `enabled:true` | changed (UI); API works today | `BusinessController/index.tsx:34-40`; `SUB/BusinessController:274-287` |
| 2 | Toast on store change | Info "Enabled/Disabled business" | keep texts; type Success (consistent); add "Orders paused until …" / "Orders resumed" | changed | `index.tsx:42-61` |
| 3 | Open / closed / paused label | none (`open` unused) | per store, 4 states | app-only new logic (fields exist) | `BusinessController.php:1139,3497`; `Business.php:96` |
| 4 | Timed pause with automatic reopening | none | `snooze_until` UTC | **works today** in the API, no controller change | `BusinessController.php:144,9633`; `EventHelper.php:195`; `EventRuleController.php:585` |
| 5 | Pause hides the store from customers | n/a | yes, for every non-dashboard read | works today | `BusinessController.php:659,1101,3519` |
| 6 | Pause notifies open carts | n/a | not done on `snooze_until` | gap, API owner to confirm | `BusinessController.php:9622-9627` |
| 7 | Stores order | server: open first, then id; `orderBy=name` overwritten by `distance` | open first (keep); name within | app-only: pass no `orderBy` override, or accept the server order | `BusinessList/index.js:118-144`; `BusinessController.php:1178` |
| 8 | Stores search | server `ilike` on name/description, 1 s debounce, hidden offline | same, ~400 ms, hidden offline | kept | `BusinessList/index.js:212-241` |
| 9 | Pagination | page 10, scroll handler, Info toast per page | `FlatList.onEndReached`, page 10 or 20, **no toast per page** (footer spinner) | changed (UI) | `StoresList/index.tsx:59-74` |
| 10 | Note with dashboard link | box above the list; URL in a translation key | link at the foot | changed; URL source Q4 | `StoresList/index.tsx:152-174` |
| 11 | Category switch | `enabled`, Success toast | same; toast text kept | kept | `SUB/StoreProductList:194-211` |
| 12 | Categories + products | 2 levels, 2nd one an overlay | one screen, chips + list, search mode | changed (UI) | `BusinessProductList/index.tsx:164-192` |
| 13 | Category search | client-side, names, recursive | search over **products** across categories | changed; replaces the category search | `StoreProductList:213-246` |
| 14 | Search products across categories | only inside one category | whole store | API works (v2 dashboard); controller needs a new call | `ProductController.php:2709,2867`; Q1 |
| 15 | "Unavailable" filter and count | none | filter + banner | API works (to verify the `where` operator on dates) | `Product.php:35-43` |
| 16 | Chip counts per category | none | "Pizzas 7" | app-only (derive) or backend (`products_count`) | no count in `CategoryController` |
| 17 | Product price in the list | not shown | shown | `price` is in `Product`; add `price` to the product `params` | `Product.php:35` |
| 18 | Product unavailable shown as off when snoozed | shows `enabled` only | `enabled && !snoozed` | app-only; fixes today's mismatch | `Product.php:78` |
| 19 | "off since …" | none | text in the Unavailable view | **needs backend** (or `updated_at` approximation) | `Product.php:73` |
| 20 | "back tomorrow / in 2 h" | none | text | works today (`snooze_until`); how it gets set: Q3 | `ProductController.php:99,2015` |
| 21 | Make all available | none | footer button | bulk exists (unverified path); else N calls | `routes/api.php:548-552` |
| 22 | Product switch toast | Success "Enabled/Disabled product" | same | kept | `StoreProductList:183-185` |
| 23 | Product availability on the options screen | none | switch | needs a controller handler | `StoreProductOptions/index.js:213-244` |
| 24 | Option / suboption toggles | `enabled`, Success toast, per-row spinner, lock while saving | same, one switch per suboption row | kept | `index.js:152-176` |
| 25 | Option rules and price | not shown | "CHOOSE 1", "+$2.00" | app-only (data in models) | `ExtraOption.php:36`, `ExtraOptionSuboption.php:34` |
| 26 | Shared-group notice | none | static note | app-only | mockup |
| 27 | Attach/detach groups to the product | checkbox + Success toasts | not drawn | **open** (Q10); logic stays in the controller | `index.js:178-211` |
| 28 | Lazy loading of options per group | on expand | on mount for attached groups | changed (UI), controller as is | `index.js:120-143` |
| 29 | Group-level search (`extraSearch`) | not used by the UI | not drawn | kept unused | `index.js:246-249` |
| 30 | Errors | Error toast with backend text; Retry on screen | same; error as `ONotice` + Retry | kept | `StoreProductOptions/index.tsx:134-144` |
| 31 | Offline | search hidden, `NotFoundSource` "Network Error", switches still try | `ONotice` offline, **switches disabled** (no queue exists for stores) | changed; Q11 | `StoresList/index.tsx:133,178` |
| 32 | Back behaviour | Android back leaves the screen from the products overlay | back closes search mode, then leaves | changed (fixed) | `index.tsx:164` |
| 33 | iOS/Android search encoding (`isForceSearch`, `isIos`) | kept | kept | kept | `Stores.tsx:23`; `index.tsx:201` |
| 34 | Config `advanced_business_search_enabled` | in `BusinessList` | unchanged | kept | `BusinessList/index.js:73` |
| 35 | Tab label | "Businesses" vs title "Stores" | "Stores" both | changed (area 1: `BottomNavigator.tsx:132`) | `BottomNavigator.tsx:132` |

---

### 4. Proposed theme pieces

#### 4.1 Pages and sections

| Page | Screen | Sections | Group |
|---|---|---|---|
| `stores` | Stores | `list` (fixed) · `dashboard_link` (hideable) | — |
| `menu` | BusinessProductListing (browse and search) | `notice` (unavailable notice, hideable) · `categories` (chips, hideable; "All" and the single-category case stay usable) · `list` (fixed) | — |
| `product_options` | ProductOptions | `availability` (the product switch, fixed) · `options` (fixed) · `shared_notice` (hideable) | — |

No section is movable: every screen is a single flow, and the sheet is not a page.

#### 4.2 Visibility keys (flat, default `true`)

Reused names (the marketplace app draws the same piece): `business_card.logo`, `product.image`, `product.dummy_image`, `product.options.price`, `business.categories.all`. New names:

| Key | Hides | Notes |
|---|---|---|
| `stores.address` | the address line of a store row | |
| `stores.hours` | the "Open · closes 10:00 PM" text of the status row (the status dot and the switch stay) | not the pause: pausing is operational, no key |
| `stores.search` | the search button | |
| `stores.dashboard_link` | the dashboard link | |
| `menu.search` | the Menu's search button | the unavailable view stays reachable through the notice |
| `menu.unavailable_notice` | the yellow notice | the Unavailable chip stays in search mode |
| `menu.category_count` | the counts in the chips and under the category name | |
| `menu.product_price` | the price of a row | |
| `menu.unavailable_reason` | the red/gray "Unavailable · …" and "off since …" lines | the switch shows the state |
| `menu.make_all_available` | the footer button | acts on the filtered list |
| `product_options.price` → use `product.options.price` | the option's price | marketplace name |
| `product_options.shared_notice` | the info note | |

Not keys: the pause options and the switches (operations, not decoration); the store's open/closed text can be hidden only as a whole by `stores.hours`.

#### 4.3 Components in the schema beyond the driver's `product.schema.json`

The driver's schema has `list_row`, `chip`, `switch`, `alert`, `badge`, `sheet`, `choice`, `skeleton`, `avatar`, `card`, `header`, `bottom_bar`, `empty_state`, `section_header` (44 components). Reuse all of them. Add:

- `store_card` (inherits `card`): `padding` (15), `gap` (10), `divider` color, `tile_size` (44), `tile_radius` (8), `tile_background`, `status_min_height` (44).
- `store_status`: `dot_size` (8), variants `open` (`color.success_text`, dot `color.success`), `closed` (muted), `paused` (the `badge` `warning` variant), `off` (muted); text 12/600.
- `menu_row` (inherits `list_row`): `min_height` (64), `tile_size` (44), `gap` (15), `divider`, `name_color_unavailable`, `state_color_unavailable` (danger text), `switch_hit_width` (52).
- `switch`: the board draws a custom pill **44x24, thumb 20, on = `{color.success}` (`#00884F`)**. The driver's `OSwitch` is the platform `Switch` with `on = {color.primary}`. Two decisions belong to area 1 (global primitives): the on color (Q12) and whether `OSwitch` becomes a drawn 44x24 pill with a 52x44 touch area. Until then this area uses `OSwitch` as it is.
- `chip`: the Menu's chips are 36 high with a count; `FilterChip size='sm'` covers it (verify the `sm` height in the business theme).

#### 4.4 Theme images

- `placeholder.business_logo` (exists in the driver's schema; bundled `dummies/store.png` today): a store without a logo. The mockup draws a store glyph on a `#F8F9FA` tile for **every** store; keep the glyph tile as the default and paint the logo when the store has one (Q8). No new image key.
- `empty.not_found` (exists): empty and no-results states.
- No product placeholder image: the tile glyph is an icon in the theme's muted color.

---

### 5. New i18n keys

Reused as they are: `STORES`, `SEARCH`, `ALL`, `CATEGORIES`, `PRODUCTS`, `PRODUCT_OPTIONS`, `DISABLED`, `RETRY`, `CLOSE`, `CANCEL`, `VIEW`, `NO_RESULTS_FOUND`, `NETWORK_ERROR`, `ERROR`, `ENABLED_BUSINESS`, `DISABLED_BUSINESS`, `ERROR_UPDATING_BUSINESS`, `ENABLED_CATEGORY`, `DISABLED_CATEGORY`, `ENABLED_PRODUCT`, `DISABLED_PRODUCT`, `ENABLED_OPTION`, `DISABLED_OPTION`, `ENABLED_SUBOPTION`, `DISABLED_SUBOPTION`, `OPTION_GROUP_ADDED`, `OPTION_GROUP_REMOVED`, `ERROR_LOADING_PRODUCT_OPTIONS`, `NO_OPTIONS_IN_GROUP`, `PRODUCT_WITHOUT_OPTIONS`, `LOADING_MORE_BUSINESSES` and `LOADING_MORE_PRODUCTS` (only if the toasts stay; I propose to drop them), `MORE_SETTINGS_GO_TO`, `LINK_MORE_SETTINGS_GO_TO` (see Q4), `TODAY`. Placeholders in the catalog use `:name:` (`CASH_CHANGE_OF`: "Change of :amount:"); follow it.

| Key | English fallback |
|---|---|
| `SEARCH_STORES` | Search stores |
| `ACCEPTING_ORDERS` | Accepting orders |
| `STORE_OPEN_CLOSES_AT` | Open · closes :time: |
| `STORE_OPEN` | Open |
| `STORE_CLOSED_OPENS_AT` | Closed · opens :time: |
| `STORE_CLOSED` | Closed |
| `STORE_PAUSED_BACK_AT` | Paused · back at :time: |
| `STORE_TURNED_OFF` | Orders turned off |
| `RESUME_NOW` | Resume now |
| `MORE_STORE_SETTINGS_IN_DASHBOARD` | More store settings in the dashboard |
| `PAUSE_ORDERS` | Pause orders |
| `PAUSE_ORDERS_STORE` | Pause orders · :name: |
| `PAUSE_ORDERS_HINT` | Customers see the store as temporarily closed. Orders you already accepted are not affected. |
| `PAUSE_DURATION` | Pause duration |
| `PAUSE_30_MINUTES` | 30 minutes |
| `PAUSE_1_HOUR` | 1 hour |
| `PAUSE_REST_OF_TODAY` | Rest of today |
| `PAUSE_UNTIL_TURNED_ON` | Until I turn it back on |
| `PAUSE_UNTIL_TIME` | Until :time: |
| `PAUSE_REOPENS_AT` | Reopens :day: at :time: |
| `ORDERS_PAUSED_UNTIL` | Orders paused until :time: |
| `ORDERS_RESUMED` | Orders resumed |
| `ERROR_PAUSING_ORDERS` | Could not pause orders |
| `MENU` | Menu |
| `SEARCH_PRODUCTS` | Search products |
| `SEARCH_ALL_PRODUCTS` | Search all products |
| `PRODUCTS_UNAVAILABLE_COUNT` | :count: products are unavailable |
| `PRODUCT_UNAVAILABLE_COUNT` | 1 product is unavailable |
| `UNAVAILABLE` | Unavailable |
| `UNAVAILABLE_COUNT` | Unavailable :count: |
| `UNAVAILABLE_BACK_AT` | Unavailable · back :when: |
| `UNAVAILABLE_UNTIL_TURNED_ON` | Unavailable · until you turn it on |
| `UNAVAILABLE_OFF_SINCE` | :category: · off since :when: |
| `CATEGORY_COUNT_PRODUCTS` | :count: products |
| `CATEGORY_ON` | Category on |
| `CATEGORY_OFF` | Category off |
| `MAKE_ALL_AVAILABLE` | Make all available |
| `MAKE_ALL_AVAILABLE_CONFIRM` | Make :count: products available? |
| `PRODUCTS_MADE_AVAILABLE` | Products made available |
| `PRODUCT_AVAILABLE` | Product available |
| `PRODUCT_SHOWN_IN_MENU` | Shown in the menu |
| `OPTIONS_AND_EXTRAS` | Options and extras |
| `OPTION_CHOOSE_ONE` | Choose 1 |
| `OPTION_CHOOSE_UP_TO` | Up to :max: |
| `OPTION_CHOOSE_RANGE` | Choose :min:–:max: |
| `OPTION_GROUP_SHARED_NOTICE` | Turning off an option hides it in every product that uses this group. |
| `TOMORROW` | Tomorrow |
| `YESTERDAY` | yesterday |

Accessibility labels reuse the same keys with the name (e.g. "Pepperoni pizza available"): `AVAILABLE_NAME` = ":name: available". `BUSINESSES` stays only if another place uses it; the tab and title both become `STORES`.

---

### 6. Tablet

Today: nothing in this area is tablet-aware. `StoresList` tracks `orientation` and window height only to size the skeleton (`index.tsx:50-57,89-98`); the products overlay uses a static `Dimensions.get('window')` (`BusinessProductList/index.tsx:170-171`); cards are full width at any size. The rule for orders is in `pages/MyOrders.tsx:27-28,68`: `isIpad || DeviceInfo.isTablet()` and (landscape or width ≥ 950) → `OrdersListManager`.

Proposal (the mockups have no Stores tablet board; `TabletBoard` gives the 80 px left rail with Stores as an entry):
- **Landscape tablet** (the same predicate as `MyOrders`, extracted to one hook shared with area 3): the Stores page is a **two-pane** layout: left pane `StoresList` (width 380, fixed, own header and search), right pane the `Menu` of the selected store (full `BusinessProductList`, its header without the back arrow). Selecting a store sets state in the page instead of `navigate`; nothing is selected at first → the first store is selected, or an `empty_state` "Select a store". `ProductOptions` opens as a **right-side sheet** (`OBottomPopup` presented as a `pageSheet`/`formSheet`, 480 wide) over the menu, so the list stays visible.
- **Portrait tablet** and any width ≥ 600 that is not landscape: the phone flow (list → menu → options), content centered with `maxWidth` 560 (a theme layout token, not a literal), the header spanning the width.
- `BusinessController`/`StoreCard` takes `onSelect` and `selected` props (a `selected` card gets the `chip` selected look: `#E9F2FE` ring); on phone `onSelect` navigates.
- The pause sheet stays a bottom sheet capped at 480 wide and centered on tablet (shared `sheet` token of area 1).
- Hook for the phone/tablet switch lives with area 1; this area only reads it.

---

### 7. Open questions for the owner

**Q1. Where does the new menu logic live (search across categories, unavailable filter, counts, make all available, the product switch on the options screen)?** The submodule controllers do not have it, the API does (§2.2).
- (a) A new controller/extension in the upstream `ordering-components` repo (`StoreProductList` and `StoreProductOptions`), then a submodule bump. Cleanest, shared with other apps, slower, needs coordination. 
- (b) An app-local hook in `src/` (not in a page, not in the submodule) that uses `useApi()` and the same calls; no cross-repo wait; the logic is duplicated until it is upstreamed.
- **Recommended: (b) now, (a) as a follow-up PR**, because the schedule is the app's and the submodule is shared.

**Q2. What is a store that is turned off (`enabled=false`) in the new design?** The mockup draws open and paused only.
- (a) A third state "Orders turned off" with the switch off; the switch on turns it on directly (no sheet). 
- (b) Fold it into "paused until I turn it back on" so there are two states only (the sheet's last option sets `enabled=false`).
- **Recommended (a)**: it is today's behaviour; the label tells the manager why the store is silent.

**Q3. How does a product get a return time ("back tomorrow", "back in 2 h")?** The mockup shows the result, not the flow.
- (a) The switch turns the product off at once (indefinite); a tap on the red "Unavailable" line opens a duration sheet (same pattern as the store's).
- (b) Every switch-off asks for a duration first (extra tap for the common case).
- (c) No timed pause for products: show a "back at" text only for products paused from the dashboard.
- **Recommended (a)** (fast "86 an item", timed return one tap away), and it needs a design for that sheet.

**Q4. Where does the dashboard link come from?** Today the URL is a translation key.
- (a) A `dashboard_url` field in the app config (project-specific), fallback to the current string.
- (b) A theme setting.
- (c) Keep the translation key.
- **Recommended (a)**: a white-label project must be able to point to its own dashboard, and a translation should not hold a URL.

**Q5. Category counts ("Pizzas 7", "7 products").**
- (a) Derive them from one full product fetch (about `ceil(N/50)` calls) that the menu also needs for search and the Unavailable filter.
- (b) One `pagination.total` request per category.
- (c) Ask the backend for `products_count` on the categories of the dashboard business payload.
- **Recommended (a) now, (c) as a request to the API team** for stores with hundreds of products.

**Q6. "off since 11:40 AM / yesterday".** No field stores when a product was turned off.
- (a) Backend adds `disabled_at` (or `snoozed_at`) to products (and options) in dashboard mode.
- (b) Approximate with `updated_at` (wrong after any edit).
- (c) Drop "off since" and show only "back …" or "until you turn it on".
- **Recommended (c) for the first release, (a) as a backend ticket**; (b) would show wrong times.

**Q7. Subcategories** (today a recursive accordion; the mockup has chips only).
- (a) Chips for top-level categories; a category with subcategories shows its subcategories as a second, smaller chip row under it.
- (b) Flatten: every category (parent or child) is a chip, a child labeled "Parent · Child".
- (c) Parent row groups its children as headers inside "All".
- **Recommended (a)**, no data change.

**Q8. Store logo and product photo.** The mockup draws a glyph tile for stores and products (and today shows a 56 logo and a 35 photo).
- (a) Show the logo/photo when it exists, glyph tile when not (the tile stays 44); `store_card.logo` / `product.image` visibility keys.
- (b) Glyph only, as drawn.
- **Recommended (a)**: a store manager recognizes the dish and the store by its picture; the keys let a project hide it.

**Q9. An option with no suboptions, and the option's own switch.** The mockup has switches only on suboption rows.
- (a) Keep a section header switch for the option when it has no suboptions or when the manager wants to hide the whole option ("Off" state on the header).
- (b) Only suboption switches; an option with no suboptions is drawn as a row.
- **Recommended (b)**, with an option header switch only if the owner wants "hide the whole size option" (today's behaviour).

**Q10. Attach/detach option groups to the product (today's checkbox).**
- (a) Keep it behind an "Option groups" row under the availability card that opens a sheet of `ChoiceRow` check rows (needs a small design).
- (b) Drop it from the app (manage groups in the dashboard) and show only attached groups.
- **Recommended (a)**: "every rule of behaviour is kept unless the mockups change it", and nothing in the mockups removes it. It is an extra row only.

**Q11. Store switches and pause while offline.**
- (a) Disable them and show the offline notice.
- (b) Queue them like the order actions (`OfflineActions`), with a conflict risk for a pause with a time.
- **Recommended (a)**: a queued pause that applies minutes later is worse than no pause.

**Q12. Switch color and shape (area 1).** The board's switch is green `#00884F` and a drawn 44x24 pill; the driver's `OSwitch` is the platform switch in the primary color.
- (a) One green drawn switch across the whole app (the kit's), changing every switch.
- (b) Primary-color platform switch everywhere; the board's green is not used.
- **Recommended (a)** (it is the approved design and the green reads as "available"), decided and built in area 1.

**Q13. Is a pause allowed for every user who can open Stores** (levels 0 and 2)? The API validates `snooze_until` for the business update; I did not check any permission rule that differs by level. Owner/API team to confirm.

---

### 8. Work breakdown

Files an implementation agent would own:

- `src/pages/Stores.tsx`, `src/pages/BusinessProductListing.tsx`, `src/pages/ProductOptions.tsx` (thin wrappers, no `StyleSheet`; tablet pane switch on `Stores`).
- `src/ui/src/components/StoresList/index.tsx`, `styles.tsx` (rewrite; delete the unused styles), new `PauseOrdersSheet.tsx`, `storeStatus.ts`, `pauseOptions.ts`.
- `src/ui/src/components/BusinessController/index.tsx`, `styles.tsx` (rewrite as `StoreCard`; keep the exported names `BusinessController`, `BusinessControllerUI`).
- `src/ui/src/components/BusinessProductList/index.tsx` (rewrite), new `MenuRow.tsx`, `CategoryHeader.tsx`, `UnavailableNotice.tsx`, `styles.tsx`; delete `IterateCategories.tsx`, `AccordionDropdown.tsx`, `ProductList.tsx`.
- `src/ui/src/components/StoreProductOptions/index.tsx`, `styles.tsx` (rewrite), new `optionRules.ts` (min/max text).
- Delete `src/ui/src/components/SearchBar` and its export (`src/ui/index.tsx:35,131`), the two `SearchBarParams` and the `BusinessControllerParams` duplicates only if nothing else uses them (`src/types/index.tsx`, `src/ui/src/types/index.tsx`); the menu hook (Q1-b), e.g. `src/hooks/useStoreMenu.ts`.
- Shared with other areas (report, do not edit): `OSwitch` and the switch tokens (area 1), the phone/tablet predicate (area 1/3), `BottomNavigator.tsx:132` label (area 1), schema keys of §4 (theme area), i18n catalog.
- Dependencies that go with this area: `toggle-switch-react-native`, `toggle-react-native` (unused), `rn-placeholder` (13 files in the app: remove only when the last one is converted), `react-native-fast-image` (check other users), `react-native-intersection-observer` (this area only).

Today's tests of the area (all must be rewritten or replaced):
- `src/pages/__tests__/Stores.test.tsx` (2: iOS dashboard props, Android force search off), `src/pages/__tests__/BusinessProductListing.test.tsx` (1). No test for `ProductOptions` page.
- `src/ui/src/components/StoresList/__tests__/StoresList.test.tsx` (5), `BusinessController/__tests__/BusinessController.test.tsx` (6 + zipcode block), `BusinessProductList/__tests__/BusinessProductList.test.tsx` (5), `StoreProductOptions/__tests__/StoreProductOptions.test.tsx` (17), `SearchBar/__tests__/SearchBar.test.tsx` (3).
- Submodule tests (read only, not ours): `SUB/BusinessController|BusinessList|StoreProductList|StoreProductOptions/__tests__/*.test.jsx`.
- New tests to write: `storeStatus` (open, closed with next opening, paused, off, timezone, midnight crossing, no schedule), `pauseOptions` (rest of today with a schedule that has no next day, UTC conversion), pause sheet (sends UTC `snooze_until`, "Resume now" sends `''`), unavailable derivation (`enabled=false` or future `snooze_until`), option rule text, switch disabled while offline, tablet two-pane selection.

Suggested order: (1) `storeStatus`/`pauseOptions` + sheet with `updateBusiness`; (2) StoreCard + list; (3) menu hook and Menu/search mode; (4) options screen; (5) tablet panes; (6) delete the old files and dependencies.

---

### 9. What I did not see / did not verify

- I read the screenshot **index** (`INDEX.md`, shots 86-103 descriptions) and the inventory, not the PNG images themselves; I did not run the app, a device, or the API. Every API statement is from reading api-core at `112e229fc`; nothing was called.
- Not verified: that `where` accepts a date comparison on `snooze_until` for products; the full URL prefix and the SDK method for `PUT /bulks/products`; that `GET /business/{b}/extras/{e}/options` returns `min`, `max`, `price` (the models have them); which branch of `BusinessController` serves the dashboard list with `version=v2` (I matched the sort code at `:1178` by reading the pagination parameters; confirm with one call); why the first list stops at 10 on a device (the scroll handler is a suspect, not proven); that level 2 users can set `snooze_until`; that a customer with an existing cart can still check out a paused store (I found no check); that `EmitUpdateCartByBusiness` is the only realtime path.
- `product.schema.json` of the driver was read for component names; I did not diff its `alert`/`chip`/`badge` values against the board's yellow `#FFF4CC`/`#6B5300` or the chip `sm` height.
- The marketplace app's `docs/theme/pages-and-visibility.md` was read for key names only; I did not check that the proposed reused keys exist in its schema file.
- Mockup behaviour not drawn and therefore not designed here: the stores search field, the "turned off" state, the empty and offline states, the product duration sheet (Q3), the option-groups sheet (Q10), the tablet Stores/Menu layout (§6 is a proposal).
- Translations: the keys in §5 are English fallbacks only; the other 11 locales are not filled.
