# Backend requests (api-core and the shared logic)

Date: 2026-11-19, with section F added after the second device passes. What the rebuilt business app needs from the backend and does not get today, merged and deduplicated from
the "Backend" sections of `docs/theme/areas/requests/*.md` and from the area reports (`docs/theme/areas/1-…7-*.md`).

How the app behaves meanwhile follows the owner's decision of 2026-11-19 ([theme/decisions.md](theme/decisions.md), "What the
mockups draw and the API does not give"): **a piece of the mockups that needs a datum the API does not give is not drawn**, and
it is listed here. Nothing below blocks the release; each request says what the app would draw once the datum exists.

Order: first what the mockups draw and the app lacks today (by how many screens it touches), then what changes how right
something is without being drawn, then confirmations (a fact to check, no change expected), then requests that are not
api-core's. api-core files are the ones the reports cite (read at `112e229fc`; the lines were spot-checked at `35067e141` on
2026-11-19 and may have moved: search the symbol). The api-core checkout is `/Users/work/Ordering/api-core`; nothing was run
against a server.

## A. Drawn in the mockups, not drawn in the app

| # | Request | What the app draws once it exists | api-core | Priority |
|---|---|---|---|---|
| B1 | **`last_message` on each order of the dashboard list** (`{ comment, type, created_at, author: { id, name, level } }`), a "has messages" filter and an unread filter (`where=unread_direct_count>0`), unread counts past 100 orders, and an `unread_direct_count` that leaves out the system "order placed" row (type 0) | The Messages list's preview line ("You: …"), the role tag after the customer's name (the code already reads `order.last_message.author.level`: the tag appears with no app change), an `Unread` chip that counts and filters on the server instead of the 45 rows loaded, a tab count without "+" | `app/Http/Controllers/OrderController.php`: the dashboard list's unread aggregation (around `:811-845` — `$excessive_orders_count = 100` drops the counts above it) and its `last_*_message_at` sorting | **1** (the Messages list is a tab; the preview and the unread chip are drawn on it) |
| B2 | **The driver's real time to the customer** (a live ETA on the order, or a routing call) | "Omar H. · 6 min from the customer" on the In progress card, on the delivery details and on the map (OrdersInProgress, OrderDelivery, MapTracking). Today the card writes the driver's name and status only | `OrderController.php` `eta_*` (`eta_time`, `eta_drive_time`, `eta_preparation_time`: creation-time figures, around `:1554` and `:5589-5604`) | **2** (three screens) |
| B3 | **The payment card's last four digits and brand** on the order, or on `payment_events[].data` | "Card ending 4242" under the total (OrderPending, OrderPreparing, OrderReadyPickup, OrderDone). Today the line shows the payment method's name | `OrderController.php` order payload; `payment_events` | **3** (four screens) |
| B4 | **When a product (and option) was turned off**: `disabled_at` / `snoozed_at` in dashboard mode | "off since 11:40 AM" / "off since yesterday" in the unavailable view (MenuUnavailable). `updated_at` changes on any edit, so it would show wrong times | `app/Models/Product.php:73,210` (and the product/option dashboard-mode payload of `ProductController.php`) | **4** |
| B5 | **`UserSession.device` filled at login** (user agent, or a header the app sends) and returned by `GET /users/:id/sessions` | "iPad · Kitchen tablet" on the other devices' rows of Sessions. Today only the current device is labelled (built on the phone) and the others show dates; the iPad passes saw the same (IPAD-C10, [theme/verification/ipad-pass2.md](theme/verification/ipad-pass2.md): "not fixed, decided, the API gives none") | `app/Http/Controllers/UserSessionController.php` `findAll` (`:34-62`); model `app/Models/UserSession.php` (the `device` column exists and is never written) | **5** |
| B6 | **The store's name with the user** (the session user, or `GET /users/:id` with the business) | "Business owner · Luna Pizza" on the Profile card. Today the card shows the role only | `UserController.php` user payload | **6** |
| B7 | **Per-user push preferences** (new messages, order updates) | The two switches of "Alerts and sound" (Notifications). Today they are hidden: the local settings (ring until opened, vibrate, test alert, sound) are the app's own and work | none exists; a keyword search found no per-category push preference (`ProductPushController`, `PushOrderMessage` were only searched by name) | **7** |

## B. Not drawn as such; they change how right something is

| # | Request | Why and what the app does meanwhile | api-core | Priority |
|---|---|---|---|---|
| B8 | **UTC moments of the order's life** (`accepted_at`, `ready_at`, `picked_up_at`, `delivered_at`), and `history` kept on the list payload above 100 orders | "Waiting 00:42", "Ready in 08:12", "Took 28 min", the timeline and the adjust sheet's "now ready in" anchor on `order.history[].created_at`, which is **truncated to the minute and written in the business's time zone with no zone in it**; the page learns the zone's offset from `updated_at` and falls back to it. With no usable history there is no timeline and no countdown. Since fix round 2 (`8ae8ba1`) the details count the preparation from `reporting_data.at['status:7']`, as the card does, so the two clocks show one instant; the history stamp is the fallback ([theme/verification/fix-round2.md](theme/verification/fix-round2.md) item 11) | `OrderController.php` (`order_history` rows written at `:3733-3738` with `Y-m-d H:i:00`) | **8** |
| B9 | **Confirm the fields of the dashboard list**: `created_at`, `prepared_in`, `reporting_data.at['status:7']` and `['status:4']`, `payment_events`, `spot_number`, `reject_reason`, `time_status` (and whether `time_status` exists without `plan_enterprise`), `delivery_datetime_utc`; and the **time zone of `reporting_data.at`** (read as UTC) | Each piece of the card that needs one is left out when it is missing, with no placeholder; if the project's server time is not UTC the "Ready in" and "Waiting" figures are off by the offset. Also: is `prepared_in` returned for an accepted order, is `reject_reason` returned, and is a "Paid" flag available (today derived from a `payment` event, unverified for cash paid at the door) | `orders().asDashboard()` fields; `OrderController.php` | **9** |
| B10 | **A driver's `cellphone` on the order** (`order.driver`) | "Call driver" on the map: the button hides without it | order payload `driver` | **10** |
| B11 | **Per-project preparation-time rules** (presets, default, min, max) | The accept sheet's presets 10 / 15 / 20 / 30 / 45, step 5, min 5, max 180 and default 20 are app constants (`PREP_TIME` in `OrderActions/constants.ts`, OQ-18 (a)); the API validates `prepared_in` only as an integer up to 2147483647 (`OrderController.php:212`). Searched: no server key exists | `config` / project settings (new) | **11** |
| B12 | **A server list of rejection reasons** | The five reasons are an app list through i18n; the API stores any string up to 255 in `reject_reason` (`OrderController.php:218,1804-1806`); there is no reasons table | new | **12** |
| B13 | **`products_count` on the categories** of the dashboard business payload | The menu's category chips count from one full product fetch (`ceil(N/50)` calls); a store with hundreds of products would gain from a server count | `CategoryController` | **13** |
| B14 | **Pausing a store notifies open carts for `snooze_until` too** | `EmitUpdateCartByBusiness` is dispatched only when `schedule` or `enabled` is in the business update (`BusinessController.php:9622-9627`), not for `snooze_until`. To confirm with the API owner: that a level-2 user may set `snooze_until`, and that a customer with an existing cart cannot check out a paused store | `app/Http/Controllers/BusinessController.php` | **14** |
| B15 | **Expose the project's `forgot_password_rate_*`** (or an answer that says the account is limited) | "Send again in 0:45" is a client constant: `POST /users/forgot` answers `OK` to every request and applies its limit silently (`UserController.php:3818-3861`) | `UserController.php` | **15** (low) |
| B16 | **A server value for an order product's "done" state** (`order_product.status`) | The checklist on the order details is kept per device in AsyncStorage by order id (OQ-18 (a)); another phone or tablet does not see it | `order_product` | **16** (low) |

## F. From the second device passes (2026-11-19)

| # | Request | What the app draws once it exists | api-core / shared logic | Priority |
|---|---|---|---|---|
| B21 | **A total per group of the orders list**: New, In progress and History, each without its orders | New and In progress on the tabs, the Orders badge and the board's columns read an exact number ("544", capped "99+") instead of a lower bound that grows with the pages loaded ("21+" on a phone, "59+" on a tablet's rail). Today only the Active tab of the combined layout reads an exact total | **The route already answers it:** `orders?where=[…status…]` returns `pagination.total` (the local API says New is 544 for the status list `[0, 13]`). What is missing is the shared logic: `OrderListGroups.loadOrders` fetches only the selected tab's slot, so the totals of the slots `pending` and `inProgress` stay `null`, and the app reads the one `active` slot (`pagination.total`, the server's total of **all** open orders, kept +1 / -1 by its handlers) and splits it on the client. See [deps/ordering-components-additive.md](deps/ordering-components-additive.md) capability 5 | **17** (a visible lower bound, not wrong) |

The shape that would serve, as a proposal (nothing exists under these names): either **one extra request per group with
`page_size=1`**, its `pagination.total` stored in `ordersGroup[group].pagination.total` (no api-core change; the shared logic
asks it when the lists load and when a socket event moves an order), or, if api-core wants to save the requests, **one answer for
the `active` slot that carries a total per group** next to its `pagination.total`. The app needs only the number per group, not
the orders. A total that is +1 / -1 kept by the app's own handlers, as the `active` one is, is enough between refreshes.

Also named by the second passes and **already above, not repeated:** the device name on other sessions (B5; seen again as IPAD-C10),
the count behind "Show 12 orders" (S6), the UTC moments of an order's life and the time zone of `reporting_data.at` (B8, B9).
What the passes found that is **not** a request: the assign-driver list is empty for a store that belongs to no driver group
(`ControlsController::order` lists the drivers of the enabled driver groups linked to the business, `driver_group_business`: a
data setup, [theme/verification/fix-round2.md](theme/verification/fix-round2.md) item 7); a store saved with no address has
latitude and longitude 0 (`zipcode -1`) and the app now treats (0, 0) as no position.

## C. To confirm (a fact to check; no change expected)

| # | Question | Where it matters |
|---|---|---|
| B17 | Do the customer apps show `reject_reason` or the status message's `comment`? The reject sheet sends the label as `reject_reason` and the note as `reasons` | Reject sheet |
| B18 | Does the trailing `{ conector: 'OR', conditions }` group that `OrderListGroups` adds to a `where` array reach `ExtendedModel::graph`'s array branch, which reads `$condition->attribute` on it (most likely ignored, silently)? If so the "orders without items" exclusion it intends does not apply today | Orders list (`app/Models/ExtendedModel.php`, array branch `:355-392`) |
| B19 | `GET /business/{id}/products` with `where` of the `{ conditions, conector }` form, `>` on `snooze_until`, and `PUT /bulks/products`: read from the code, never called | The additive menu capability ([deps/ordering-components-additive.md](deps/ordering-components-additive.md) section 6) |
| B20 | `emptystringtonull` on JSON bodies, and the server's database time zone for `snooze_until` (treated as UTC) | Pausing a product |

## D. Not api-core's: the shared logic (ordering-components, additive, through the coordinator)

These are in the draft pull request of [deps/ordering-components-additive.md](deps/ordering-components-additive.md) or still
asked of it; the app detects each capability and hides the feature when the installed submodule lacks it.

| # | Request | What the app draws once it exists | Status |
|---|---|---|---|
| S1 | `OrderDetails`: `clearErrorOnAction` and `clearError` | The inline error of a failed status change with "Try again", cleared on the next action | On the branch |
| S2 | `OrderListGroups`: search by customer name and lastname (`supportsCustomerNameFilter`) | The orders search field's "Customer name" | On the branch |
| S3 | `StoreProductSearch` (new controller), `isProductUnavailable` | Menu search across categories, the Unavailable filter and its count, "Make all available" | On the branch |
| S4 | `StoreProductOptions.handleUpdateProduct` | The product's availability switch and pause on the options screen | On the branch |
| S5 | `UserFormDetails.handleRemovePhoto` (the driver app's `#426`) | "Remove photo" in the photo sheet | Open in the driver app's pull request; this app waits for it |
| S6 | A count of the filtered orders (`filteredTotal`, or `countOrders(filters)`) on `OrderListGroups`: one request per change of filter, without its orders (the controller counts only after the filter is applied) | "Show 12 orders" in the search sheet's footer; the button says "Show orders" until then ([theme/verification/fix-round2.md](theme/verification/fix-round2.md), class C of the iPhone pass). The same call would serve B21 | **Not made yet** |
| S7 | `BusinessList` keeps the caller's `orderBy` (for example a prop `keepOrderBy`): it spreads `{ version: 'v2', orderBy: 'distance' }` after it | The Stores list in name order; it keeps the server's order (open first, then id) | Not made yet |
| S8 | `BusinessController.updateBusiness` clears its last error after a later success and does not put the error text in `business` | A store card that tells success from failure without comparing shapes | Not made yet |
| S9 | `OrderListGroups.handleSelectCurrentTab` and `ordersGroup` closures (`setOrdersGroup({ ...ordersGroup })`): do not "tidy" without the app's `currentFilters` reload | Not a request: a warning kept in `docs/theme/areas/requests/orders.md` | Observation |

## E. Of the translation catalog (not a backend datum)

- `i18n/translations.json`: `WRITE_MESSAGE` should read "Write a message"; the `STORE_MESSAGE_N`, `ADMIN_MESSAGE_N`,
  `DRIVER_MESSAGE_N` entries carry machine-translated key text in the other languages (`tienda_message_1`): empty those values.
  The quick messages already ignore any `<prefix>_message_<n>` text, so nothing shows meanwhile.
- `pnpm i18n:sync:live` to the API was not run for the keys added by the redesign.
