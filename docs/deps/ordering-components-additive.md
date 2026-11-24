# ordering-components: additive changes for the business app

Date: 2026-11-19. Decision: `docs/theme/decisions.md`, "Changes in the shared logic" (additive only, a branch of `Finitless-com/ordering-components` and a draft pull request that the coordinator opens).

- Repository: `Finitless-com/ordering-components` (the submodule `src/@/components`).
- Branch: `feat/business-app-additive`, made from `5af6bea` (the commit this app records) and, on 2026-11-23, **rebased on `main` (`24e6566`) without a conflict and pushed as pull request [#430](https://github.com/Finitless-com/ordering-components/pull/430), which the owner merged the same day: `44c9ff1` of `main`. This app's submodule pointer is that commit** (its content is the branch tip's, byte for byte, so what was checked on the branch holds). The tip before the rebase is kept in the submodule as the local branch `backup/business-app-additive-before-main` (`6112af5`).
- Base for the pull request: `main` (same as `#426`, the driver app's `handleRemovePhoto`). The branch sits on `24e6566` (0 behind when it was pushed). On it: `eslint .` clean and `vitest --run` 204 files, 1306 tests passing (a throwaway worktree); this app with the submodule on it: types clean, Jest 232 suites and 2739 tests passing.
- Commits (the repository's style: `feat(Area): what it does`):

| Commit | What |
|---|---|
| `07594be` (was `41f44b9`) | `feat(OrderDetails)`: opt-in `clearErrorOnAction` and `clearError` |
| `67c6408` (was `a89dca7`) | `feat(OrderListGroups)`: filter orders by customer name and lastname |
| `0dd2eac` (was `055a8d7`) | `feat(StoreProductSearch)`: new controller (menu across categories, unavailable filter, make all available) + both barrels |
| `5dd6a31` (was `6112af5`) | `feat(StoreProductOptions)`: `handleUpdateProduct`; pass-through tests for `snooze_until` |

The app's recorded submodule commit is unchanged (the app's `git status` shows `M src/@/components` only because the submodule is checked out on the new branch; nothing was staged in the app).

Capability 5 of the table below (a total per group of the orders list) is **not on the branch and not written**: the draft pull request has the four commits above, and the app does not depend on the fifth.

## 1. Capabilities, API, and how the app detects them

The app must hide a feature when the capability is absent (an older submodule). Detect on the **UI component's props** (controller output) or on the **barrel export**, never on a version number.

| # | Capability | Where | API | Detection in the app |
|---|---|---|---|---|
| 1 | A failed order action does not leave `error` set | `OrderDetails` | New prop `clearErrorOnAction` (bool, default `false`). When `true`: `order.error`, `order.errorCodes`, `order.retryAfter` are reset to `null` when `handleChangeOrderStatus` / `handleAssignDriver` start and when they end without a failure (also when the end is a force-update or regression request); a failed `handleAssignDriver` no longer merges the error list into `order.order`, and its `catch` stores `[message]`. New prop to the UI: `clearError()` (always passed; resets only the three error fields). | `typeof props.clearError === 'function'` (UI props of `OrderDetails`); the app passes `clearErrorOnAction: true` to the controller and, with an older submodule, keeps its own workaround (b) of area 4, 2.9. |
| 2 | Orders search by customer name | `OrderListGroups` | `onFiltered({ customer: { name, lastname } })`. Pushes `{ attribute: 'customer', conditions: [name ilike %x%, lastname ilike %y%] }` (each present one; blank ones ignored; `isIos` false: `encodeURI`, like email/phone). It is a separate `customer` entry, the email/phone one is untouched. New prop to the UI: `supportsCustomerNameFilter` (`true`). | `props.supportsCustomerNameFilter === true`. Without it the app ships the placeholder "Order number or phone" (Q6 (a), first version). |
| 3a | Products of a business across categories, search, unavailable filter, paging, totals, make all available | **new controller** `StoreProductSearch` | Props: `businessId` (required), `UIComponent`, `isIos`, `pageSize` (default 15, clamped 1-50), `orderBy`, `attributes` (default `id,name,price,images,enabled,snooze_until,category_id,category`), `isSearchByName`/`isSearchByDescription` (true), `searchDelay` (300 ms, 0 = none), `useBulkUpdate` (true), `initialSearch`, `initialUnavailableOnly`. UI props: `productsState {products, loading, loadingMore, error, pagination {currentPage, pageSize, totalItems, totalPages}}`, `search`, `handleChangeSearch(text)`, `unavailableOnly`, `handleChangeUnavailableOnly(bool)`, `unavailableState {total, loading, error}` (banner and chip count, always for the whole business, no text), `loadMoreProducts()`, `reloadProducts()`, `updatingProductIds`, `handleUpdateProduct(product, changes)` (resolves the updated product or `null`; reason in `actionError`; `clearActionError()`), `handleMakeAllAvailable()` (resolves `{total, done, failed}`; progress in `makeAvailableState {loading, total, done, failed, error}`; acts on the unavailable products matching the **current search**, all pages), `isProductUnavailable(product, now?)`. | `import * as components from '@components'`; `typeof components.StoreProductSearch === 'function'`. (A missing named export is `undefined`, not an import error, under Babel/Metro interop; not run here.) |
| 3b | Product on/off and pause from the options screen | `StoreProductOptions` | New UI prop `handleUpdateProduct(changes)`: `{enabled}`, `{snooze_until: 'Y-m-d H:i:s'}` (UTC, in the future) or `{enabled: true, snooze_until: ''}`; resolves the saved fields or `null`; one at a time; toasts `ENABLED_PRODUCT`/`DISABLED_PRODUCT` (error toast on failure); `productState.product` takes the values. `updatingState.products` (array of product ids) added next to `extras/options/suboptions`. | `typeof props.handleUpdateProduct === 'function'`. |
| 3c | `snooze_until` for a product and for a business | `StoreProductList.updateStoreProduct(categoryId, productId, params)`, `BusinessController.updateBusiness(id, params)` | **No change needed**: both pass `params` to the SDK untouched, and the SDK (`ApiBase.makeRequest`, `ApiProduct.save`, `ApiBusiness.save`) neither filters fields nor drops unknown ones from the response (`Product`/`Business` models copy every key). Two tests added to document it. | Always present. |
| 4 | Exports | `native/index.js` and `src/index.js` | `StoreProductSearch`, `isProductUnavailable` added to both (import and `export {}` list, next to `StoreProductList`). Web deep import: `~components/components/StoreProductSearch`. | See 3a. |
| 5 | **Optional, not written; the app does not depend on it.** A total per group of the orders list (New, In progress, History) | `OrderListGroups` | Proposed, nothing exists under these names. The controller holds a slot per group (`pending`, `inProgress`, `completed`, beside `active`) with its own `pagination.total`, but `loadOrders` fetches only the selected tab's slot, so those totals stay `null`. The capability asks each group's total without its orders (`page_size=1` per group, the same `where` as the group's list) when the lists load and after a socket event that moves an order, and stores it in `ordersGroup[group].pagination.total`; new UI prop `supportsGroupTotals` (`true`). The route already answers it (`pagination.total` of `orders?where=[…status…]`; the local API says New is 544 for the statuses `[0, 13]`), so there is no api-core change. The same one-call count without orders would also serve `countOrders(filters)` ("Show 12 orders", [../BACKEND_REQUESTS.md](../BACKEND_REQUESTS.md) S6) | `props.supportsGroupTotals === true`. Without it the app does what it does today: it reads the `active` slot's total (the server's total of all open orders, kept +1 / -1 by the controller's handlers), splits it on the client, and shows New, In progress, the Orders badge and the board's columns as lower bounds ("21+", "59+"); only the combined layout's Active tab is exact. Origin: [../theme/verification/fix-round2.md](../theme/verification/fix-round2.md) item 13; [../BACKEND_REQUESTS.md](../BACKEND_REQUESTS.md) B21 |

Helpers in `src/components/StoreProductSearch/utils.js` (not in the barrels except `isProductUnavailable`): `buildProductsWhere`, `formatApiDateTime` (UTC `Y-m-d H:i:s`), `parseApiDateTime`, `MAX_PAGE_SIZE = 50`, `BULK_UPDATE_LIMIT = 500`.

Notes for the app:
- Name search (2): conditions are ANDed and flat. Classify "two or more words" as `name` = every word but the last, `lastname` = the last word; one word can only be sent as `name` (a first name). A surname alone cannot be expressed (see section 2, item 2).
- `snooze_until` values the app writes are **UTC** `YYYY-MM-DD HH:mm:ss` and must be after now; `''` clears it.
- "Unavailable" = `enabled === false` or `snooze_until` in the future (`isProductUnavailable` is the same rule, evaluated client side).
- The unavailable count is always asked without the text search; "Make all available" uses the text search too (footer of the search view acts on the filtered list).

## 2. api-core evidence (read-only, `/Users/work/Ordering/api-core` at `112e229fc`)

1. **Order details**: no API fact needed; the change is in the controller's state.
2. **Customer name on the orders list**
   - The orders list `where` is read by `ExtendedModel::graph` (`app/Models/ExtendedModel.php:277`); the `where` we send is a JSON **array**, which takes the array branch (`:355-392`): for a condition with `conditions` whose `attribute` is in `Order::$relations_map` (`app/Models/Order.php:392`, `'customer' => 'OrderCustomer'`) it runs `whereHas` and applies each `{attribute, value}` of the relation's `getWhereable()` with `filterWhere` (`:132`, `ilike` allowed, `:102`).
   - `OrderCustomer::$whereable` contains `name`, `middle_name`, `lastname`, `second_lastname`, `email`, `cellphone` (`app/Models/OrderCustomer.php:64-76`). Two `customer` entries are two `whereHas`, ANDed.
   - **Why no OR**: inside a relation the array branch reads only flat `{attribute, value}` items (`:372-390`); a nested `{conector: 'OR', conditions}` group is skipped (`!isset($sub_condition->attribute)`). OR groups work only in the recursive form (`buildSearch`, `:204-275`), i.e. when the whole `where` is an object `{conditions, conector}`. The controller keeps the array form so the rest of the orders query does not change.
   - The customer entry is pushed before the trailing `conector: 'OR'` group the list adds for non-driver apps (a test fixes the order), because that group has no `attribute` and the array branch reads `$condition->attribute` on it.
3. **Menu across categories**
   - `GET /{lang}/{project}/business/{business_id}/products` -> `ProductController::findAllBusiness` (`routes/api.php:701`); `version=v2` -> `findAllBusiness_v2` (`app/Http/Controllers/ProductController.php:2349-2353`, `:2709`). `mode=dashboard` needs a level 0 or a business owner (`:2711-2714`); an owner only sees the businesses he owns (`:2775-2779`). Dashboard mode lists all products of the business through `categories.business_id` (`:2943-2944`), `where`/`orderBy`/`params` go through `graph` (`:2863`), paging through `getPagination` (`:3085`; `page`, `page_size`; max 50: `config/ordering.php:597`; response `pagination {current_page, page_size, total_pages, total, from, to}`).
   - `where` grammar: `Product::$whereable` has `name`, `description`, `enabled`, `snooze_until`, `category_id`... (`app/Models/Product.php:186-228`). The root `{conditions, conector}` form is `buildSearch` (`ExtendedModel.php:204`), OR groups `:229-250`. **`>` on `snooze_until` (the report's unverified point)**: `filterWhere` (`:132-179`) lets comparison operators `= < > <= >= <> !=` through (`:89`), and `PostgresValue::isChecked` (`app/Helpers/PostgresValue.php`) only validates integers, numeric, bool, uuid, jsonb, so a timestamp column takes the string as it is. `enabled = false` goes through the boolean path (`ExtendedModel.php:79-80`).
   - Product update: `POST /business/{b}/categories/{c}/products/{p}` with `emptystringtonull` (`routes/api.php:719`), `auth:0,2` (`ProductController.php:162`), `enabled` boolean and `snooze_until` `nullable|date|date_format:Y-m-d H:i:s|after:now` (`:99`, `:142`); the owner check is in `update` (`whereHas('owners')`). With `snooze_until` present the API also re-registers the expiry event (`EventHelper::removeSnoozeDate`, `app/Helpers/EventHelper.php:195`, called at `ProductController.php:2015` and `:2274`).
   - Business update: `POST /business/{b}` with `emptystringtonull` (`routes/api.php:658`), `snooze_until` same rule (`BusinessController.php:144`, `:216`), `auth:0,2` (`:258`), owner restriction (`:9381+`, `whereHas('owners')`).
   - **Bulk (the report's unverified route)**: `PUT /{lang}/{project}/bulks/products` (`routes/api.php:548-552`, inside the `{lang}/{project}` group opened at `:338-339`) -> `ProductBulkController::update` (`app/Http/Controllers/ProductBulkController.php:95`), `auth:0,2` (`:60-63`). Body: `products` = **a JSON string** of an array (`required|json`, `:19`); each item needs `id`, `category_id`, `business_id` (`$update_product_rules`, `:37-48`) plus the fields to change (`enabled` boolean; any fillable, `snooze_until` is fillable: `Product.php:78`; `''` becomes `null`, `ProductBulkController.php:114-118`). Limits: 500 products (`:103`), 5 businesses (`:140`); a business owner must own every business (`:146-153`); each category must belong to the business and each product to its category (`:155-170`); an invalid item rejects the whole request before anything is saved. Answer: `success('OK')`. The SDK's generic `ordering.put(path, data, {json: true, accessToken})` exists (`src/sdk/src/classes/Ordering.ts:339`) and JSON-encodes object values, so `products` can be passed as an array.
   - The bulk update does **not** call `EventHelper::removeSnoozeDate`; harmless for "make all available" (it writes `snooze_until = null`, and the queries treat a past/null snooze as available: `ProductController.php:397-405`).

## 3. Tests and checks

Submodule (own setup: Vitest + jsdom; installed in a throwaway worktree because the submodule has no `node_modules` and installing one inside it would shadow the app's React):
- New/extended tests: `OrderDetails` 7 (default keeps the error, clears on start and success, replaces on a second failure, thrown request retried, assign-driver clearing and not merging, old assign behaviour without the prop, `clearError`); `OrderListGroups` 6 (flag, name+lastname with `encodeURI`, iOS plain, email/phone untouched and separate, blank ignored, position before the OR group); `StoreProductSearch` 23 + 8 utils; `StoreProductOptions` 6; pass-through tests in `StoreProductList` and `BusinessController`.
- `eslint .` (whole repo, no `--fix`): clean. `vitest --run` (full suite): 199 files, 1115 tests, all pass.
- `vitest.config.js`: `StoreProductSearch` added to the coverage `include` (repository convention); coverage thresholds not run.

App (`/Users/work/Ordering/ordering-app-business-theming`, other agents were editing at the same time, so before/after compared; "before" with the submodule on `5af6bea`, "after" on the branch):
- `npx tsc --noEmit`: 299 errors before and 299 after, the normalised error lists (file + code + message, no line numbers) are identical. They are not from this change (the app is mid-redesign).
- `npx jest` on `OrderDetails`, `OrdersOption*`, `BusinessProductList`, `StoreProductOptions` (17 suites, 89 tests): before 16 pass / 1 fail, after the same. The one failure exists before the change: `OrdersOption › opens search modal from filter icon`.

## 4. Draft of the pull request

Base: `main`. Draft.

**Title**: `feat: additive capabilities for the business app (order error reset, customer name filter, store menu search)`

**Body**:

```
## What

Four additive changes for the business app's redesign (consumer: Finitless-com/ordering-app-business-theming, draft). Nothing that exists changes for the other apps and the website: new behaviour is behind a new prop, a new UI prop, a new controller or a new export.

1. OrderDetails: new prop `clearErrorOnAction` (default false) and a new UI prop `clearError()`. With the prop, `order.error`/`errorCodes`/`retryAfter` are cleared when a status change or a driver assignment starts and when it ends without a failure, and a failed assignment no longer merges its error list into the order. Without the prop the controller behaves as before (a test pins it). Used by: the business app (inline error with "Try again").
2. OrderListGroups: `onFiltered({ customer: { name, lastname } })` adds a `customer` condition (`name`/`lastname` ilike) next to the existing email/phone one, and the UI gets `supportsCustomerNameFilter`. Not set by anyone today. Used by: the business app (search by customer).
3. StoreProductSearch (new controller, exported from both barrels with `isProductUnavailable`): lists a business's products across categories through `GET /business/{id}/products?version=v2&mode=dashboard` with text search, an "unavailable" filter (`enabled = false` or `snooze_until > now`), paging, the unavailable total, a per-product update and "make all available" (`PUT /bulks/products`, chunks of 500, one request per product when a chunk is refused). Used by: the business app (Menu). Other apps do not import it.
4. StoreProductOptions: new UI prop `handleUpdateProduct(changes)` (enabled / `snooze_until` of the product) and `updatingState.products`. Used by: the business app (product switch on the options screen). `snooze_until` already passes through `StoreProductList.updateStoreProduct` and `BusinessController.updateBusiness`; two tests now document it.

## Why

The redesigned business app needs them and the controllers had no way to do them (area reports 3, 4 and 6 of the app's `docs/theme/areas/`).

## Tests

`OrderDetails`, `OrderListGroups`, `StoreProductSearch` (new), `StoreProductOptions`, `StoreProductList`, `BusinessController`. `yarn lint:check` clean; full `vitest --run`: 199 files / 1115 tests pass.

## API facts (read in api-core, not run against a server)

- `where` with `>` on `products.snooze_until` and `enabled = false` inside an OR group: `ExtendedModel::buildSearch` / `filterWhere`.
- Customer name: `OrderCustomer::$whereable` has `name` and `lastname`; inside a relation the array `where` is flat (no OR), so name and lastname are ANDed; a single word can only filter the first name.
- Bulk: `PUT /{lang}/{project}/bulks/products`, `products` as a JSON string of `{id, category_id, business_id, ...fields}`, max 500 items and 5 businesses, levels 0 and 2 (owners only for their businesses).

## Not verified

- Nothing was run against a real API (only the unit tests with mocked SDK calls).
- The `{ conditions, conector }` form on `/business/{id}/products` is read from `buildSearch`, not called; `GET .../products` with `page` and `page_size` max 50.
- The branch was rebased on `main` (`24e6566`) on 2026-11-23 with no conflict; the pull request's Quality Gate (coverage) had not finished when this was written.

Consumer: Finitless-com/ordering-app-business-theming. Its submodule pointer moved to the merge (`44c9ff1`) on 2026-11-23.
```

(Then the coordinator adds the attribution line the repository convention asks for.)

## 5. Seen and not changed (do not fix here)

1. `OrderDetails.handleAssignDriver` (without the opt-in): the `catch` stores `drivers.error?.push(message)` (a number or `undefined`) in `order.error`, and an API error array is merged into the order with `Object.assign`. Only fixed behind `clearErrorOnAction`.
2. `OrderDetails` handlers rebuild state from the closure (`setOrderState({ ...orderState, ... })`) instead of a functional update, so two quick actions can overwrite each other.
3. `BusinessController.updateBusiness` on an API error sets `business: result[0]` (an error string replaces the business) and does the same closure spread.
4. The orders list adds a trailing `{ conector: 'OR', conditions: [...] }` group (non-driver apps) to a `where` **array**; `ExtendedModel::graph`'s array branch reads `$condition->attribute` on it, so it is most likely ignored (silently, inside a `try/catch`). Not run: if confirmed, the "orders without items" exclusion it intends does not apply today.
5. The SDK builds the query string without encoding (`Ordering.ts` `makeRequest`: `${key}=${value}`); the `encodeURI` of the search text on non-iOS platforms (producing `%25`) depends on that. Every list copies it; `StoreProductSearch` and the new name filter do too.
6. `StoreProductList.updateStoreProduct` shows its toast from `result.enabled`, so a `snooze_until`-only update says "Disabled product" when `enabled` is absent from the answer.
7. Bulk and single product updates differ on the server: only the single one re-registers the snooze expiry event.
8. `isProductUnavailable` ignores menu-level overrides (`business_menu_products.enabled/snooze_until`); the dashboard list (`mode=dashboard`) reads `products.*` only.

## 6. What I did not verify

- No request was made to any API; the endpoints, the `where` forms, the bulk body and the permissions are read from api-core's code (`112e229fc`) and mocked in tests.
- That the API really skips an OR group inside a relation in the array form (reason for the flat name/lastname design) and that it applies `snooze_until > '<UTC now>'` as expected: read, not run.
- Time zone: `snooze_until` is treated as UTC because `config/app.php` sets `'timezone' => 'UTC'`; the server's database session zone was not checked.
- `emptystringtonull` for JSON bodies (`$request->input()`): read, not run; the SDK sends JSON for these calls (the existing `updateStoreProduct` does the same).
- That a missing named export from the native barrel is `undefined` (not an error) in this app's Metro build: not built or run.
- Order of magnitude of "make all available" on a large menu (pages of 50 then chunks of 500): not measured.
- Release/merge state of `main`: a trial merge was clean, the full suite on the merged result was not run.
