## Area 3 - Orders list, new-order alert, connection status, tablet board (business app)

Analyst report, read-only. Nothing was run (no app, no simulator, no tests); every row is from reading code, the mockups and the earlier inventory. Date 2026-11-19. Branch `feature/theming-native`.

Path shorthand: `C/` = `src/ui/src/components/`, `S/` = `src/ui/src/components/shared/`, `SUB/` = `src/@/components/src/` (the logic submodule, read only), `DT/` = `/Users/work/Ordering/ordering-app-driver-theming/src/`, `DV/` = `/Users/work/Ordering/ordering-app-driver-v26/src/`.

Read in full: `src/pages/MyOrders.tsx`, `C/OrdersOption/index.tsx`, `C/PreviousOrders/{index,OrderItem}.tsx`, `C/NewOrderNotification/*`, `C/WebsocketStatus/index.tsx`, `src/ui/src/context/OfflineActions/*`, `src/navigators/subscribeOrdersRegisterVibration.ts`, `SUB/components/OrderListGroups/index.js`, `SUB/components/NewOrderNotification/index.js`, `SUB/components/WebsocketStatus/index.js`, `SUB/contexts/WebsocketContext/{index,socket}.js`; the mockups' text (`Main`, `OrdersInProgress`, `OrdersHistory`, `OrdersSearch`, `OrdersOffline`, `OrdersEmpty`, `NewOrderAlert`, `SheetConnection`, `TabletBoard`, `SheetAccept`) and `design/redesign/SPECS.md`; the driver-theming `NewOrderNotification/*`, `WebsocketStatus`, `context/SocketReconnectContext.tsx`, `OrdersOption/{index (greps),OrdersSearchForm,searchText}`, its `product.schema.json` entries and decisions. Only skimmed (grep + sizes, not read line by line): `C/OrdersListManager/index.tsx` (916 lines), `C/PreviousOrders/{OrderList,OrdersGroupedItem,styles}.tsx`, `C/OrdersOption{Business,City,Date,Delivery,Driver,Paymethod,Status}`, `C/OrderSummary` (994 lines, outside the list).

---

## 1. Today

### 1.1 Who renders what

| Piece | Rendered by | Notes |
|---|---|---|
| `MyOrders` page | `BottomNavigator` tab `Orders` (initial) | `src/pages/MyOrders.tsx` |
| `OrdersOption` | `MyOrders.tsx:68-72` unless tablet | hybrid: `OrdersOption` (`C/OrdersOption/index.tsx:1089`) wraps controller `OrderListGroups` with `UIComponent: OrdersOptionUI` (`:1127`); also mounts `NotificationSetting` (`:1274`) |
| `OrdersListManager` | `MyOrders.tsx:68` when `(Platform.isPad \|\| DeviceInfo.isTablet()) && (!isPortrait \|\| width >= 950)` | its own copy of the orders UI, master (30%) / detail (70%) |
| `PreviousOrders` -> `OrdersList` -> `OrderItem`, `OrdersGroupedItem` | `OrdersOption` (`:703`), `OrdersListManager` (`:531`, `:546`) | `PreviousOrders` also hosts 3 modals: accept/reject for groups (`AcceptOrRejectOrder`), `ReviewCustomer`, `GoogleMap` |
| `NewOrderNotification` | **inside** `OrdersOption` (`:810`) and `OrdersListManager` (`:635`) | so it exists only while the Orders screen is mounted |
| `WebsocketStatus` | `OrdersOption:503` (header), `OrdersListManager:327` (only with `plan_enterprise`), `MessagesOption` (area 5) | |
| `OfflineActionsProvider` | app provider tree | `useOfflineActions` read by `OrdersOption`, `PreviousOrders`, `AcceptOrRejectOrder` |
| Vibration | `RootNavigator.tsx:336` -> `subscribeOrdersRegisterVibration(socket)` | global, only when a `token` exists |
| `OrderSummary` (ticket on screen) | **not the list**: `pages/OrderSummary`, reached from `getTicketPreviewNavigationPlan.ts:19` when no printer is saved | belongs to the printing/order-details areas; the mockups replace it with `TicketPreview` |
| `OrdersOptionStatus`, `SearchBar` (for orders), `DriverMap`, `MapView`, `OrderDetailsLogistic` | nobody in this domain | dead for this area (see 1.14) |

### 1.2 Tabs, status groups, chips (exact ids)

Source of truth for the groups: `SUB/components/OrderListGroups/index.js:46-52` (defaults) and the UI copies at `C/OrdersOption/index.tsx:1224-1269` (tabs) and `C/OrdersListManager/index.tsx:881-905`. `orderGroupStatusCustom` (prop, keys `active|pending|inProgress|completed|cancelled`) can override the ids; `MyOrders` does not pass it, so the defaults apply.

| Group (slot / `title`) | Text (key / fallback) | Status ids |
|---|---|---|
| `pending` | `PENDING` / Pending | 0, 13 |
| `inProgress` | `IN_PROGRESS` / In Progress | 3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26 |
| `completed` | `COMPLETED` / Completed | 1, 11, 15 |
| `cancelled` | `CANCELLED` / Cancelled | 2, 5, 6, 10, 12, 16, 17 |
| `active` (only when combined) | `ACTIVE` / Active | 0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26 |

- Status labels used by the chips: `OrdersOption.orderStatus` (`:1132-1223`), 27 entries (`PENDING`, `READY_FOR_PICKUP` for 4, `PREORDER`, ...). The full status table with the label differences (4 is "Ready for pickup" in the list and "Preparation Completed" in the details) is in `inventory-orders.md` section 3.
- **`combine_pending_and_progress_orders`**: three readers. (a) The controller: `props.combineTabs ?? configs.combine_pending_and_progress_orders.value === '1'` (`SUB/.../OrderListGroups/index.js:38`) picks `ordersStatusArray` (`:42`) and the initial tab (`:99`, `:1317`). (b) `OrdersOption` (`:1097-1123`): reads the config value, else AsyncStorage key `combine_pending_and_progress_orders`, and writes `isCombinedTabs` into the offline context. (c) Offline: `manageStoragedOrders` (`:422-437`) restores the flag from AsyncStorage. `OrdersListManager` (tablet) ignores it: always 4 tabs.
- **Chips** (`OrdersOption:595-661`): "All" (only when the tab has more than 1 status) + one chip per status of the tab, multi-select, selected ones get the text suffix ` X`; reset on tab change (`:401-406`); taps ignored while `currentOrdersGroup.loading`. Chip selection writes `currentFilter` into the controller's slot and `setCurrentFilters` (`:326-353`), which re-fetches the slot (`SUB:1037-1041`). Hidden when search filters are on.
- Only the **selected** tab is fetched, lazily, when `ordersGroup[tab].fetched` is false (`SUB:1028-1035`). Totals per tab (`pagination.total`) therefore exist only for tabs already opened; there are no counters in the UI today.

### 1.3 Pagination, refresh, sort

- `MyOrders.tsx:36-40`: `paginationSettings {initialPage: 1, pageSize: 50, controlType: 'infinity'}`; `orderBy '-id'` (`SUB:1362`); the controller sorts by id desc (`:686`). "Load more orders" button (`OrdersOption:768-780`, `LOAD_MORE_ORDERS`) shown when online and `currentPage < totalPages`; no automatic loading. Page 2+ queries exclude the ids already loaded (`SUB:168-183`).
- Refresh: header icon `refresh-cw` (`:505-515`, only when connected) and pull-to-refresh (`:691-696`, online only) both call `loadOrders({newFetch: true}, {allStatusses: hasSearchFilters})`, which resets **every** tab (`SUB:388-399`). No loading indicator on the icon.
- The controller drops gift cards (`:1062`, `:1146`) and orders with no `item` product unless cloned or reservation (`:315-341`), and for level 2 users ignores events of businesses outside `getBusinessesIDs()` (`:1024-1026`, `:1064`).
- `NewOrderNotification` and toasts also react to the socket (1.9).

### 1.4 Search filters (each field and its source)

Modal `OModal entireModal` (`OrdersOption:812+`), state `search` (`:87-102`), applied by `applyFilters` (`:320-324`) to the controller's `filtered`, which `getOrders` turns into `where` clauses (`SUB:185-313`) with the endpoint `orders().asDashboard()` (`SUB:347-350`).

| Field (UI) | `search.*` | Controller `where` | Data source of the options | Condition |
|---|---|---|---|---|
| SLA (`SelectDropdown`) | `timeStatus` | `time_status` = in_time/at_risk/delayed (`:308`) | static list (`:150-155`) | `configs.plan_enterprise` (`:148`) |
| Order number | `id` | `id ilike %v%` (`:185`) | text | always |
| External id | `external_id` | `external_id ilike` (`:195`) | text | always (phone only; tablet modal lacks it) |
| Date | `date{type,from,to}` | `delivery_datetime >= from`, `<= to` (`:289-306`), `MM/DD/YYYY 00:00:00` / `23:59:59` built in `calculateDate` (`:355-383`) | Today/Yesterday/Last 7 days/Last 30 days (`calculateDate`), custom range with `CalendarPicker` | always |
| City | `city` | `business.city_id` (`:219`) | controller `MainSearch` (cities of all countries) | always |
| Business | `business` | `business_id` (`:229`) | controller `BusinessList` (`id,name`) | `isBusinessApp` |
| Delivery type | `delivery_type` | `delivery_type` (`:282`) | only Delivery(1) / Pickup(2) | `isBusinessApp` |
| Driver | `driver` | `driver_id` (`:247`) | controller `DriverList` (`id,name,lastname`) | `isBusinessApp` |
| Paymethod | `paymethod` | `paymethod_id` (`:236`) | controller `PaymethodList` | `isBusinessApp` |
| (none) | `state` | `status` (`:205`) | `OrdersOptionStatus` exists but is **not rendered** | - |
| (none) | `customer.email/phone` | `customer` relation `email`/`cellphone` ilike (`:255-280`) | the controller supports it, **no UI sends it** | - |

- With any filter (`hasSearchFilters`, `:116`): `filtered` effect (`SUB:1043-1046`) fetches **all statuses** with `loadOrders({newFetch:true},{allStatusses:true})`, the list uses `ordersFiltered`, tabs and chips are hidden, and a yellow "Filters applied. You may miss new orders." banner (`:483-498`, `WARNING_FILTER_APPLIED`, `CLEAR_FILTERS`) is drawn on top of the header.
- Defect: closing the modal with the back arrow runs `handleClose` (`:389-393`), which resets the local `search` while the controller keeps `filtered`.
- No search by customer name, no free text. api-core supports `name` on the customer relation (`User::$whereable` has `name`, `lastname`, `email`, `cellphone`), but the controller only builds `email` and `cellphone`.

### 1.5 Order card and groups

Detailed in `inventory-orders.md` section 4.3-4.4. What matters for the redesign:

- Card (`PreviousOrders/OrderItem.tsx`): fixed height 100 (`:62`), business logo, **business name** (the app's own store), "Order No.<id> - date", order-type chip, status chip, SLA bar and tinted background only with `plan_enterprise` (`:46-57`, `:155-161`), blue dot for `order.showNotification`, `cloud-sync` icon for `order.unsync`. **It shows no customer name, no total, no item count, no payment, no driver, no action.**
- Group card (`OrdersGroupedItem`, 115 lines, identical to the driver's original) + group buttons in `PreviousOrders/index.tsx:236-455`: status 0 "Reject all"/"Accept all" (navigate to the page `AcceptOrRejectOrder`, passing `handleChangeOrderStatus` as a navigation param), 7 "Ready for pickup" (-> 4), 8 or 18 + delivery "Arrived to bussiness" (-> 3), 3 + delivery + `order_not_ready_enabled` "Order not ready" (broken path, inventory 16.2), 4 + non-delivery "Order not picked up..."(-> 17)/"Pickup completed..."(-> 15), past statuses `[1,2,5,6,10,11,12,16,17]` (`:75`) without `user_review` "Review customer". Buttons for pickup/delivery failed/complete are gated by `appTitle.text.includes('Delivery')` and "Track real time position" by `includes('Business')` (`:78-79`, `:325`): for the business app the first set never shows and the second shows only where `appTitle` is passed (phone, not tablet).
- `isHideRejectButtons` (`:80`) = `reject_orders_enabled` set and != '1' and `!isBusinessApp`: never true on the phone; true on the tablet (which does not pass `isBusinessApp`).
- Anti double tap: `isGroupedOrderStatusInFlight` + `submittingRef` (`:50-72`, `:116-125`).

### 1.6 SLA colors and timers (what the countdown means)

Only with `configs.plan_enterprise` (card: `OrderItem.tsx:41-48`, `:155`, `:241-261`; search dropdown; tablet websocket chip and SLA settings button).
- Colors per `order.time_status` (computed by the API): `in_time` green `#00D27A`, `at_risk` yellow `#FFC700` (card background `warning100`), `delayed` red `#E63757` (card `danger100`), all literals in the component.
- The text `[-]HH:MM` (with `N day` prefix) is `getDelayMinutes` (`OrderItem.tsx:107-116`): minutes from now to **(delivery time + `order.eta_time`)**. `delivery time` = `delivery_datetime_utc`, or, when missing, `delivery_datetime` + a **hard-coded 300 min** (CDT to UTC). Positive = time left before the promised time, "- " prefix = minutes late. Shown only in the tabs `pending`, `inProgress`, `active` (`:241`).
- It does **not tick**: the row is memoized with `areListedOrderRowPropsEqual` and the interval that refreshed it is commented out in `PreviousOrders/index.tsx:174-181`; it updates only when the row re-renders (socket event, refresh).
- The SLA settings modal (`OrdersListManager` only, the phone has dead code at `OrdersOption:385`) is a read-only explanation of the three colors and shows `configs.order_deadlines_delayed_time`.

### 1.7 Offline: queue, cache, banner, `allow_save_changes_offline`

- Provider `OfflineActionsProvider` (`context/OfflineActions/index.tsx`): `isNetConnected` from `useNetInfo` (`:243`), `actions` (queue per order id, AsyncStorage key `offline_actions_array`), `orders` (offline cache), `canSaveChangesOffline`.
- **Only one action is queueable today**: `evt_off_change_order_status` from `AcceptOrRejectOrder` (accept with prep time, reject, forceStatus): `AcceptOrRejectOrder/index.tsx:310-325` calls `applyOffAction` + `registerOffOrder`. "Ready for pickup", "Picked up", "Not picked up" and group buttons are plain calls and fail offline (buttons are hidden when `!isNetConnected && canSaveChangesOffline === false`, `PreviousOrders:83`).
- `canSaveChangesOffline` is set **only when `OrdersOption` mounts** (`:1107-1115`) from `configs.allow_save_changes_offline` (`'1'`), else the AsyncStorage key `allow_save_changes_offline`, which nothing ever writes (only `_removeStoreData` at `:474`). `applyOffAction` refuses when it is `false` (`:80`); the default is `false` (`:25`, `:50`). The replay effect is skipped while it is `false` (`:191`).
- Replay (`syncChanges`, `:136-170`): per order, if more than one action is queued the earlier ones are posted as an **order chat message** (`type 2`, `can_see "0,2,3,4"`, text `status: '7', prepared_in: '15'`, visible to the customer), then the last action is `PUT orders/:id`; orders that succeed are removed and `events.emit('offline_order_updated')` clears the `cloud-sync` icon; failures stay silently.
- `getStatusById` of the context (`:55-77`) lists the active ids only up to 21 (22-26 are missing), so orders in 22-26 are filed as `cancelled` in the offline cache.
- **The list's offline UI is dead today**: `OrdersOptionUI` reads `isNetConnected` from its props (`:64`), `OrdersOption.defaultProps.isNetConnected = true` (`:1281-1283`) and `MyOrders.tsx` does not pass it (the driver's `MyOrders` passes `useNetInfo().isConnected`, `DT/pages/MyOrders.tsx:27`). So the red "Last Update / N changes pending sync" banner (`:662-685`), the cached tabs (`manageStoragedOrders`, `:415-479`), the "Network Error + Refresh" empty state and the hidden refresh are unreachable, which matches screenshots 153-156 (no banner, skeleton forever). Only `PreviousOrders` and `AcceptOrRejectOrder` use the real value, through the context.
- Cache semantics when it works: online -> all `<tab>_orders` keys are set to null and `last_date_connection` removed (`:471-475`); the moment the connection drops, the orders already in memory are written to the keys, `lastDateConnection` = now. So "Showing orders from 12:31 PM" in the mockup = the time the drop was noticed, and nothing survives an app restart made offline.

### 1.8 Connection chip and dialog (`WebsocketStatus`)

- Controller `SUB/components/WebsocketStatus/index.js`: `socketStatus` (1 connected, 2 disconnected, 0 on `reconnect_attempt`), `connectedDate` (**the time of the last `connect` event**, not of the last order event), `reconnectAttemptCount`.
- UI (`C/WebsocketStatus/index.tsx`): a 100 px chip with the fixed text "Status" (`CONNECTION_STATUS_SHORT`), colored per state (the text never says which); on tap an `OModal` transparent: "Connection status", "Last update: <date>", the three legend rows (`WEBSOCKET_OK`, `WEBSOCKET_CONNECTING`, `WEBSOCKET_DISCONNECTED`), and **"Update" = `RNRestart.restart()`** (restarts the whole app).
- Nothing in the UI reads the device's network state; `RootNavigator.connectionState` is unused (inventory 1.3).

### 1.9 New-order alert (what triggers, sound, vibration, what closes it)

- **Triggers** (`SUB/components/OrderListGroups/index.js:1048-1169`): the controller listens to the socket events `orders_register` and `order_assigned` (-> `order_added_notification`, kind 2), `update_order` (-> `order_updated_notification`, kind 3, only for orders the list knows or can add: `:1082-1101`), `message` (-> `message_added_notification`, kind 1), and, with `logistic_module`, `request_register`/`request_update` (not for the business). It re-emits them on the `useEvent` bus. `events.emit('order_added')` / `'order_updated'` are emitted unfiltered (`:1066`, `:1147`).
- UI (`C/NewOrderNotification/index.tsx`): `handleEventNotification` (`:78-118`) drops the event when `value.author_id === user.id` or, for non-message events, when `notification_business_states` (`"0|13"` style, parsed in `SUB/components/NewOrderNotification/index.js:11`) is non-empty and does not contain `value.status`. It keeps **one** `currentEvent` `{evt, orderId}`: a second arrival replaces the first (no count, no queue). Messages: ignored only if authored by the user; an alert is shown even if that order's chat is open.
- Look: `Modal` transparent, slide, rgba(0,0,0,0.4) overlay, white card (radius 8, `maxWidth: screen - 60`), 22 px title, X (30 px), the picture `theme.images.general.newOrder` 250x200, subtitle in primary. Titles `NEW_MESSAGES_RECEIVED`, `NEW_ORDERS_RECEIVED`, `NEW_ORDERS_UPDATED`; subtitles `ORDER_N_UNREAD_MESSAGES`, `ORDER_N_ORDERED`, `ORDER_N_UPDATED`. **No button** except the X. Not shown over other tabs or stack screens on iOS (it is a `Modal` inside a tab screen; the driver app hit and fixed exactly this).
- **Sound**: `SoundPlayer.playUrl('https://d33aymufw4jvwf.cloudfront.net/notification.mp3')` every 2.5 s while open (`:28-48`), no stop between plays, not tied to `AppState`. A bundled copy exists (`src/assets/sounds/notification.mp3`, `theme.sounds.notification`, `BusinessApp.tsx:108`) and is unused here.
- **Vibration**: one `Vibration.vibrate()` per `orders_register` event, global (`subscribeOrdersRegisterVibration.ts`, 17 lines); not tied to the alert, not repeated, fires also when the alert is filtered by `notification_business_states`.
- **Closes**: only the X (`handleCloseEvents` -> `setCurrentEvent(null)`) or the unmount of `OrdersOption`; accepting the order elsewhere does not close it.
- Push (OneSignal/FCM, `RootNavigator`) is the background path (Android channel `new_order_alarm` through notifee); tapping it opens `OrderDetails`.
- Differences from the driver original (`DV/.../NewOrderNotification/index.tsx`, 298 vs 242 lines): the business copy lacks `AppState` handling, the repeating vibration pattern and the Android `AlarmSound` native module (`DV/android/.../MainApplication.kt` has it; the business `android/` does not).

### 1.10 Tablet layout (`OrdersListManager`)

- Chosen by `MyOrders.tsx:68` (above). 30% left list + 70% right `OrderDetailsBusiness isCustomView` (`:630`) of the selected order (first of the tab is auto-selected); `handleClickEvent={setCurrentOrderSelected}` makes a tap select instead of navigate.
- Header "My orders" 26 px with hard-coded `Poppins`, refresh and magnifier icons; enterprise-only bar with `WebsocketStatus` + "SLA's Settings" + SLA dropdown; 4 underline tabs (`COMPLETED`... never combined); chips as the phone; skeleton 8 rows; search modal without External id and without "Clear search".
- Missing vs the phone and the consequences are in `inventory-orders.md` section 5 (no offline banner, no filters banner, no `handleSendCustomerReview`, `isBusinessApp` not passed to `PreviousOrders`, the tab color uses the undefined `theme.colors.textGra`).
- It mounts its own `OrderListGroups`, `NotificationSetting` and `NewOrderNotification` (so on a tablet in portrait under 950 px the phone UI is used instead).

### 1.11 Actions and what they call

| Action | UI | Call |
|---|---|---|
| Open an order | card tap | `onNavigationRedirect('OrderDetails', {order})` (`PreviousOrders:101-113`) |
| Group accept / reject all | group buttons | navigate to page `AcceptOrRejectOrder` with `handleChangeOrderStatus` in params; the page calls it with `(status, ids, body)` and `goBack()` |
| Group ready / arrived / pickup done / not picked | group buttons | `runGroupedStatusChange(status, ids)` -> controller `handleChangeOrderStatus` (`SUB:916-952`): `orders(id).save({status,...})` for each id, Promise.all, toast on error, `regressionRequest` when `order_status_regression_validation_enabled` and the API says regression |
| Review customer (group) | group button | `ReviewCustomer` modal -> `handleSendCustomerReview` (POST `users/:id/user_reviews`) |
| Single order accept / reject / ready | **not in the list**; only in details | `AcceptOrRejectOrder` / details bar (area 4) |

### 1.12 i18n keys of the area (today)

List/search: `MY_ORDERS`, `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `ACTIVE`, `All`, the 27 status keys, `WARNING_FILTER_APPLIED`, `CLEAR_FILTERS`, `LAST_UPDATE`, `NUMBER_CHANGES_PENDING_SYNC`, `LOAD_MORE_ORDERS`, `NO_RESULTS_FOUND`, `NETWORK_ERROR`, `REFRESH`, `SEARCH_ORDERS`, `ORDER_NUMBER`, `EXTERNAL_ID`, `SELECT_DATE`, `SELECT_CITY`, `SELECT_BUSINESS`, `SELECT_DELIVERY_TYPE`, `SELECT_DRIVER`, `SELECT_PAYMETHOD`, `SLA`, `OK`, `AT_RISK`, `DELAYED`, `SEARCH`, `CLEAR_SEARCh` (typo), `INVOICE_GROUP_NO`, `NO`, `DAY`, `DELIVERY`, `PICKUP`, `EAT_IN`, `CURBSIDE`, `DRIVER_THRU` (card) / `DRIVE_THRU` (filters), `CATERING_DELIVERY`, `CATERING_PICKUP`, `RESERVATION`, `NO_EXTERNAL_ID`, `REJECT_ALL`, `ACCEPT_ALL`, `READY_FOR_PICKUP`, `ARRIVED_TO_BUSINESS` ("bussiness"), `ORDER_NOT_READY`, `ORDER_NOT_PICKEDUP_BY_CUSTOMER`, `PICKUP_COMPLETED_BY_CUSTOMER`, `REVIEW_CUSTOMER`, `TRACK_REAL_TIME_POSITION`, SLA texts (`DELIVERY_OK_STATUS_DESC`...). Alert: `NEW_MESSAGES_RECEIVED`, `NEW_ORDERS_RECEIVED`, `NEW_ORDERS_UPDATED`, `ORDER_N_UNREAD_MESSAGES`, `ORDER_N_ORDERED`, `ORDER_N_UPDATED`, `ERROR_UPDATING_COORDS`. Connection: `CONNECTION_STATUS`, `CONNECTION_STATUS_SHORT`, `WEBSOCKET_OK`, `WEBSOCKET_CONNECTING`, `WEBSOCKET_DISCONNECTED`, `CONNECTING`, `DISCONNECTED`, `UPDATE`, `LAST_UPDATE`. Notifications popup: `ENABLE_NOTIFICATIONS`-style keys of `NotificationSetting`.

### 1.13 Libraries that paint their own UI here

`react-native-select-dropdown` (SLA, `OrdersOption:3`), `ODropDown`/`ODropDownCalendar` modals and `react-native-calendar-picker` (filters), `rn-placeholder` skeletons (`OrdersOption:4`, `OrdersListManager`), `react-native-vector-icons` Feather/Fontisto/AntDesign/Entypo/MaterialCommunityIcons directly in the list, `react-native-fast-image` (card logo), `react-native-sound-player` (alert), `react-native-restart` (Refresh and Update), `RefreshControl` (native), `Modal` (alert), `react-native-country-picker-modal` as a driver picker (area 4). All of these are replaced by app primitives (ported from driver-theming) in the target.

### 1.14 Dead code and defects (of this area)

Dead: `OrdersOptionStatus` (exported in `ui/index.tsx:20,115`, no screen), `SearchBar` for orders, phone SLA settings modal (`OrdersOption:385`), the logistic tab branches (`isLogisticActivated && !isBusinessApp`), `showTagsList`'s `isDriverApp`, group buttons gated by `appTitle` for the business app (`deliveryPickupBtn`, `deliveryStatusCompleteBtn`), `RootNavigator.connectionState`, `OrderDetailsLogistic` navigation in `PreviousOrders:105`, `slaSettingTime`, `Dimensions` listener leaks. Defects found: offline UI dead (1.7), the filter state reset on modal close (1.4), "Order not ready" group path (inventory 16.2), `onClose: setOpenReviewModal(...)` called during render (`PreviousOrders:512`), `OfflineActions.getStatusById` ids 22-26, tablet `textGra`, `CLEAR_SEARCh`, `Arrived to bussiness`, one `console.log` per render in `Business.tsx:471` (area 4).

---

## 2. Target

### 2.1 Cross-cutting design decisions (one data model for phone and tablet)

**The controller gives no per-tab totals for tabs not yet opened** (`SUB:1028-1035` fetches only the current tab; `actionOrderToTab` adds `+1` to `pagination.total` even when it is `null`, `SUB:786-789`). It also has no notion of "stage". So:

1. **One fetch of all active orders, split on the client.** `OrdersOption` and the board tell the controller to use the combined slot: `combineTabs = true` always, `orderGroupStatusCustom.active` = the 17 active ids. All of New, In progress, the three stage sections, the board's columns and the counters are derived from that one list (live through the existing socket handlers, which already add, move and remove orders per slot: `SUB:1059-1142`). A background effect calls `loadMoreOrders()` until `currentPage === totalPages` (cap, e.g. 6 pages) so the counters are exact; new/preorders with old ids are not lost behind page 1.
2. **History = the slot `completed` configured with all ten closed ids**: `orderGroupStatusCustom: { active: [...17], completed: [1,11,15,2,5,6,10,12,16,17], cancelled: [] }` passed from `MyOrders` (the controller already reads the prop, `SUB:46-52`). History chips "All / Completed / Cancelled" write `currentFilter` of that slot to all ten, to `[1,11,15]` or to `[2,5,6,10,12,16,17]`, the same mechanism as today's `handleAllSelect` (`OrdersOption:343-353`). No submodule edit.
3. `combine_pending_and_progress_orders = '1'` keeps working as a **layout** flag only: the tabs become "Active" (sections New, Preparing, Ready, With driver in one list) + "History". Data flow is the same. (Open question Q2.)
4. A thin app-only hook, `useOrdersSplit(orders)`, lives in `C/OrdersOption` and returns `{ newOrders, preparing, ready, withDriver, counts }`; the **same hook** feeds the phone's In progress tab and the board's three columns (board "Ready" column = ready + with driver, as `TabletBoard` draws #1044 there).
5. The Orders tab-bar counter (red `3` in `Main`) needs the list outside the Orders screen only if the tab bar must read it while another screen is in front. The Orders tab stays mounted once visited (bottom tabs do not unmount), so a small context `OrdersSummaryContext` (counts of New and of messages unread is area 5) filled by `OrdersOption` is enough; **open question Q7** if the tab bar must show it before the tab is first opened (then the controller must be hoisted to `HomeNavigator`).

### 2.2 Status id -> tab -> section map (proposed)

| Tab | Section | Status ids | Card actions (kept from today's detail/group rules) |
|---|---|---|---|
| New | (no section; sorted by id desc) | 0 Pending | Reject (confirm/sheet), Accept (opens the prep-time sheet, `SheetAccept`) |
| New | (same list, preorder row with scheduled time instead of "Waiting") | 13 Preorder | none (today: no Accept on 13) |
| In progress | Preparing | 7 Accepted by business, 14 Order not ready | "Mark ready" -> `handleChangeOrderStatus(4, [id])`; a reservation (`delivery_type 9`) at 7 goes to Ready with "Customer arrived/not arrived" (15/17), as the details do |
| In progress | Ready for pickup | 4 Ready, 20 Customer almost arrived, 21 Customer arrived | `delivery_type` not 1/7: "Not picked up" (17) + "Picked up" (15); delivery types 1/7 at 4: no buttons (the driver takes it, today's rule) |
| In progress | With driver | 3, 8, 9, 18, 19, 22, 23, 24, 25, 26 | none (driver flow); status chip as the mockup (`Driver on way`) |
| History | by day ("Today", "Yesterday", date) | 1, 11, 15 | none; "Review customer" for the past ids of today (`[1,2,5,6,10,11,12,16,17]`, `!user_review`) |
| History | | 2, 5, 6, 10, 12, 16, 17 | none; line "Reason: <order.reject_reason>" when present |

Notes: (a) statuses 22, 25, 8, 23, 18, 3, 24 can happen **before** the kitchen is done: api-core says automatic driver assignment starts at 7 or at 4 depending on the project (`OrderHelper.php` `$status_lifecycle` comment: "0 -> 7 -> 8" or "0 -> 4 -> 8 -> 7"). A status-only split therefore can put a still-cooking order under "With driver" (Q4). (b) Group cards (`cart_group_id`, controller arrays) are placed by their first order's status; the group buttons of today keep their rules but take the driver-theming visual (see 2.3). (c) `Reject` of a pending order is always shown in the business app (today `reject_orders_enabled` does not hide it on the phone nor in details); keep that.

### 2.3 Per mockup: component tree, file rewritten, driver file ported, primitives

Primitives come from area 1 (ported from `DT/ui/src/components/shared/`): `Tabs`, `FilterChip`, `OBadge`, `OCard`, `OButton`, `OText`, `Icon`, `ONotice`, `OBottomPopup`, `ModalCloseButton`, `OModal`, `OrderListSkeleton`, `SectionTitle`, `ChoiceRow`, `ConfirmDialogHost`/`confirmAction`, `shared/orderStates.ts`, `KeyboardScreen`, `OListRow`. If a primitive is missing in area 1's list, report it there.

**`Main` (Orders, New) and `OrdersInProgress`** - rewrite `C/OrdersOption/index.tsx` (1283 lines -> about 450; the driver's `DT/.../OrdersOption/index.tsx` is the base: 727 lines, same header/tabs/notice skeleton, minus the summary table, delivery position, logistic ETA, which the business never had), `C/OrdersOption/styles.tsx` (the 166-line styled-components file is replaced by the driver's themed `styles.tsx` pattern, `newOrderAlertStyles`-like functions).

```
MyOrders (page: SafeAreaContainerLayout + isNetConnected from useNetInfo - the missing prop)
 OrdersOption (controller wrapper: combineTabs forced, orderGroupStatusCustom, tabs array)
  OrdersOptionUI
   header 56: title "Orders" (visibility orders.title) | ConnectionPill (connection_status) | search button (orders.search)
   Tabs (3: New <count>, In progress <count>, History) - counter = OBadge shape count; or 2 when combined
   [ONotice danger  "You're offline" + last update + N changes pending sync]   (isNetConnected === false)
   [ONotice warning "Filters on: <summary>. You may miss new orders." + Clear]  (hasSearchFilters)
   list (ScrollView + RefreshControl, pull-to-refresh only; the header refresh icon is not in the mockup):
     New: OrderCard[]                                  (groups: GroupedOrderCard)
     In progress: SectionTitle("PREPARING . n") + OrderCard[] ; "READY FOR PICKUP . n" ; "WITH DRIVER . n"
     History: FilterChip row (All / Completed / Cancelled), SectionTitle(day), OrderCard compact[], Load more (OButton outline)
   empty state per tab (OrdersEmpty: "No new orders" + the store card with "Pause orders" - Q8)
   OrderListSkeleton while loading
  NotificationSetting (OBottomPopup; the mockup `NotificationsPermission` sheet)
```

- New files in `C/OrdersOption/`: `useOrdersSplit.ts` (the section/counter rules of 2.2), `orderTimes.ts` (waiting / ready-in countdown, 2.6), `OrdersSearchForm.tsx` (ported from `DT`), `searchText.ts` (ported), `ChipRow.tsx` (ported), `filterSummary.ts` (the "Delivery . Today" text; the driver original has `buildFilterSummary`, `DV/OrdersOption/index.tsx:128-154`).
- `OrderCard` is **business-only** (no driver counterpart: the driver's `OrderItem` is built around the next stop, the delivery position stepper and the assign request): rewrite `C/PreviousOrders/OrderItem.tsx` (301 -> about 300) with the tree below. Port from the driver only the memo (`areListedOrderRowPropsEqual`), the `OCard look={themePart(theme,'order_card','base')}` pattern, the `OBadge`/`orders.*` visibility keys and the `useConfirm` guards for rejection.

```
OrderCard (OCard look order_card.base; tinted by time state when plan_enterprise)
 OrderCardHeader: "#<id|external_id>" (change_order_id) | type OBadge | [Preorder OBadge] | spacer | clock Icon + time text (color by state) | [cloud-sync / "Pending sync" OBadge warning] | [unread dot]
 Pressable body (opens OrderDetails): left: customer name (or "Customer" when hide_customer_contact_business_app), items line (qty name, ..., "and N more"); right: total (bold), payment line "<paymethod> . paid | to collect"
 [driver line: person Icon + driver name . status]   (With driver)
 [reason line]                                         (History rejected)
 OrderCardActions (slots order_card.slots.accept/reject/...): per 2.2
```

- **Group card**: port `DT/.../PreviousOrders/OrdersGroupedItem.tsx` and the driver decision "A group's actions speak for the group" (title "Accept 2 orders", "Reject 2 orders", sheet over the list, confirmation naming the group) and its `confirmAction`/hold rules: business has no hold for accept (owner rule), reject of a group asks a sheet/confirmation, the other group status steps ("Ready for pickup" for all) ask the driver's group confirmation (`status changes that hit every order of a group at once`). This replaces the navigation-with-function-param page. The business-only group buttons stay as today (7 -> ready, 4 non-delivery -> picked up / not picked up, past -> review) but not the driver-only ones (`Arrived to bussiness`, pickup/delivery complete/failed): Q9.

**`OrdersHistory`**: same `OrdersOption`; compact `OrderCard` variant (`order_card` `compact`), `FilterChip` row, day `SectionTitle`s from `delivery_datetime_utc ?? delivery_datetime ?? created_at` in the device's day; "Load more" = `loadMoreOrders` (keep today's manual button); "Review customer" soft button on the card -> navigates to the Review screen (area 4); "Took 28 min" is shown on the details (`OrderDone`), not on the list.

**`OrdersSearch`** (stacked screen, not a modal): rewrite `C/OrdersOption/OrdersSearchForm.tsx` (port from `DT`, same keyboard/bottom-bar rules) and move the search to a route in the stack (`OrdersSearch`) or keep the `OModal` host; sections `DATE` chips (Today/Yesterday/Last 7 days/Custom dates -> `OrdersOptionDate` becomes chips + the app's calendar, ported `DT/shared/OCalendar`), `ORDER TYPE` chips (the five types of `defaultOrderTypes`, `OrdersOption:157-163`; today only Delivery/Pickup are offered, the mockup adds Eat in/Curbside/Drive thru: the controller's `delivery_type` takes an array, so multi-select works without changes), `STATUS` chips (Pending, In progress, Completed, Cancelled -> `filtered.state` = the group's ids; this finally wires what `OrdersOptionStatus` was for), rows with chevron `Store` (-> `OrdersOptionBusiness` as bottom sheet), `Driver`, `Payment method`, `City` (the controllers `BusinessList`, `DriverList`, `PaymethodList`, `MainSearch` stay; their UIs become `OSelect` bottom sheets, ported), bar `Clear` + `Show N orders`. The search field "Order number, customer or phone": see Q6; External id stays as an extra field under "More" (config `change_order_id` customers use it) - Q6. `Show N orders` needs a count of the filtered query: app-only call of the same endpoint with `page_size 1` and the same `where`, reading `pagination.total` (`SUB:430` shows the response shape), debounced 400 ms; if it fails the button reads "Show orders" (`SHOW_ORDERS` exists).

**`OrdersOffline`**: no new screen; the two `ONotice`s of the tree above, "Pending sync" `OBadge` on cards with `order.unsync` (today `cloud-sync` icon, `OrderItem.tsx:196-201`), the pill says "Offline". Requires the missing `isNetConnected` prop (1.7). "Mark ready" while offline needs the queue (3.x).

**`OrdersEmpty`**: `ONotice`-less empty state (`empty_state` component: icon box 88, title, text) + a store card. The store card ("Luna Pizza, Open . closes 10:00 PM" + `Pause orders` -> `SheetPause`) uses the business's schedule and pause state: that is area 7 (Stores) data; the list only hosts the slot. Q8.

**`NewOrderAlert`** (global): port `DT/.../NewOrderNotification/{alertQueue,alertContent,styles}.ts*` and rewrite `index.tsx` for the business:

```
HomeNavigator: <SocketReconnectProvider> ... Stack ... {!loading && <NewOrderAlert />}   (mounted once, like DT HomeNavigator.tsx:125)
NewOrderAlert (OBottomPopup padded, testID new-order-alert)
 row: tile (Icon bell, new_order_alert.base.icon_box_size) | title "N new orders" | ModalCloseButton
 per gathered order (key o:<id>): "#<id> . <type>" / "<customer> . <n> products . <total>" / "Waiting mm:ss" (ticks) | OButton "Accept" (width 90, success) -> opens the prep-time sheet for that order
 footer: bell Icon + "Ringing until you open or accept them." | text button "Mute"
 OButton "View orders" (size lg) -> navigate to the Orders tab, New
```

- Data: the driver queue keeps only `{key, orderId, status}`; the business needs the **order object** (customer, products, summary.total, delivery_type, created_at, paymethod): `order_added_notification` already carries the full socket payload (`SUB:1147-1148`). Items leave the alert when the order stops being pending: listen to `events.on('order_updated', ...)` (unfiltered, `SUB:1066`) and drop items whose `status` is not 0/13; when the list empties the alert closes (it must not keep ringing for an order accepted on another device).
- `Mute` stops the sound and the vibration of the open alert only; it is not stored. The alert stays open. The "Alerts and sound" settings (Notifications screen, area 6) decide: alert on/off, ring until opened (loop) or once, vibrate, which sound (Bell/Chime/Kitchen alarm). They are local settings (AsyncStorage) with defaults on / loop / on / Bell; this area reads them through one helper `getAlertSettings()`.
- Sound/vibration: port the driver's `SoundPlayerComponent` (`AppState` gate, repeating `Vibration.vibrate([0,800,400,800,400,800], true)`, `AlarmSound` on Android) and **drop the global single vibration** (`subscribeOrdersRegisterVibration`) in favor of the alert's own vibration, or keep it only as the fallback when the alert is switched off (decision below, Q10). `AlarmSound` is a native Kotlin module in `DV/android/.../MainApplication.kt` that the business Android project lacks: a native-agent task (the report must say it).
- Kinds: today the business alert handles messages (1), new orders (2), updated orders (3). Keep the driver's gathering rule per kind (open kind gathers, others wait, one close per kind). The mockup draws only the order kind; the message and updated kinds use the driver's texts in the same sheet without Accept buttons.
- It must exist while the Orders tab is not in front: mount in `HomeNavigator` (driver pattern). The events keep flowing because the Orders tab's `OrderListGroups` stays mounted (bottom tabs keep visited screens). **Risk**: if the Orders tab has never been opened (e.g. the app opened on another tab via a push), nobody emits the events: the first screen is Orders today, so it is always mounted first. Keep Orders as `initialRouteName`.

**`SheetConnection`** (sheet over the list): rewrite `C/WebsocketStatus/index.tsx` (174 -> about 150) as `ConnectionPill` + `ConnectionSheet`:

```
ConnectionPill (OBadge, dot + text) states: Live (success) | Connecting (warning) | Offline (danger)   [text = LIVE / CONNECTING / OFFLINE]
ConnectionSheet (OBottomPopup): handle; tile 44 icon + state title + "Orders update in real time. Last update <time>."
 rows: Server -> Connected/Connecting/Disconnected ; Notifications -> On/Off ; Printer . <name> -> Ready/Offline/None
 OButton soft "Reconnect now" ; muted text "If orders stop arriving, check your Wi-Fi or mobile data."
```

- State = `socketStatus` of the controller (1 live, 0 connecting, 2 disconnected) combined with `useOfflineActions().isNetConnected === false` -> Offline. "Last update" = `connectedDate`. `Server` row = same state. `Notifications` = `checkNotifications().status` (the call `NotificationSetting` already makes, plus OneSignal's permission) - app-only. `Printer . Kitchen: Ready` = the saved printers (area 7/6) and whether the last test/print worked: app-only, but there is no "ready" signal in the printer settings today (Q11).
- **Reconnect without restarting is possible**: `useWebsocket()` returns the submodule's `Socket` wrapper (`SUB/contexts/WebsocketContext/socket.js`); its `connect()` (`:31-50`) clears `closed` and calls `this.socket.connect()` when not connected; on `connect` it re-emits `join` for every room it tracks (`:73-82`), and the rooms the app joined (`HomeNavigator` and `OrderListGroups`) are tracked in `this.rooms`. For a socket that thinks it is connected but is stale: `socket.socket.disconnect(); socket.connect()`. The button also resets the backoff only through `connect()` (the wrapper has `clearReconnectTimeout()` internal). No submodule edit. After it connects the lists must **catch up** (events during the gap are lost): port `DT/context/SocketReconnectContext.tsx` (provider + `useOnReconnect`) and call `loadOrders({newFetch:true})` from `OrdersOption` (as `DT OrdersOption:368-376`); the same provider covers the app returning from the background after 30 s. This replaces `RNRestart` in `WebsocketStatus`, in the "Network Error" empty state and removes the `react-native-restart` dependency from this area (still used by project switching).

**`TabletBoard`** (kitchen board): see section 6. Component tree: `OrdersBoard` (new, `C/OrdersListManager/index.tsx` rewritten as the board, ~350 lines vs 916) = left rail (done by the navigator, area "navigation"), header 56 (title, store filter chip -> `Store` sheet, `ConnectionPill`, search button), `BoardColumn` x3 (`New`, `Preparing`, `Ready`) each a scrolling list of the **same `OrderCard`** with a count `OBadge`; tapping a card opens the details.

### 2.4 Data each new piece needs (and where it comes from)

| Piece | Field | Source today | Notes |
|---|---|---|---|
| Customer name | `order.customer.name`, `lastname` | list payload (the map code reads `_order.customer.name`, `PreviousOrders:150`) | hidden when `configs.hide_customer_contact_business_app = '1'` (`isCustomerContactHidden(configs)` in `src/utils/contactVisibility`): show "Customer" |
| Items line / count | `order.products[].quantity, name` | list payload (controller filters on `products`) | "N products" = lines, "N items" = sum of `quantity` (Q5); "and N more" after 2-3 lines |
| Total | `order.summary.total` (the controller deletes `order.total` on socket merges, `SUB:1093`, `:1112`) | list payload | format with `useUtils().parsePrice` |
| Payment line | `order.paymethod.name` / `gateway`, `payment_events[].event === 'payment'`, `order.cash` | details use it (`OrderHeaderComponent.tsx:55,115`) | "paid" = a `payment` event exists; "to collect" = cash/offline gateway with none. **Whether the list payload carries `payment_events` was not verified** |
| Type | `order.delivery_type` | list | keep the 8-way label map (fix `DRIVER_THRU`) |
| Eat in | `order.spot_number` | list | "Table 7" (`TABLE_NUMBER`-style key) for type 3; "Spot"/"Lane" for 4/5 |
| Created | `order.created_at` | `Order::$fillable` (api-core `Order.php:170`) | start of "Waiting" in New |
| Preparation promise | `order.prepared_in` (minutes) + accepted time | `prepared_in` in `Order.php:173`; accepted time = `reporting_data.at['status:7']` (written by `OrderController.php:3401`, `reporting_data` is not hidden: `Order.php:234`) | "Ready in mm:ss" = `status:7 time + prepared_in - now`; if `prepared_in` is null or `reporting_data` missing, show "Preparing mm:ss" elapsed |
| Ready since | `reporting_data.at['status:4']` | same | "Waiting mm:ss" in Ready; fallback `updated_at` |
| Time zone | `reporting_data.at` values are `Y-m-d H:i:s` strings written with `Carbon::now()` (server time) | | parse as UTC unless the project says otherwise (the card today hard-codes a 300 min offset: this is a known bug source) - **not verified** |
| Driver line | `order.driver.name`, `lastname` | list | "Omar H." |
| "6 min from the customer" | none | - | **needs backend or a routing call** (Q12); not available from the order payload |
| Reject reason | `order.reject_reason` | `Order.php:194`; body of `rejectByBusiness` | shown on History |
| Offline | `order.unsync` | `OfflineActions` | "Pending sync" |
| Review | `order.user_review` | list | as today |
| Counts | derived (2.1) | controller list | live through the socket handlers |
| Day groups | `delivery_datetime_utc ?? delivery_datetime` | list | device-local day |
| Business filter chip (board) | `filtered.business` | `BusinessList` controller | only users with more than one store (level 2 with several businesses) |

### 2.5 Which file is rewritten, ported or kept

| File | Action | From driver-theming? |
|---|---|---|
| `src/pages/MyOrders.tsx` | rewrite: pass `isNetConnected`, `combineTabs`, `orderGroupStatusCustom`, the board/phone branch (6) | base `DT/pages/MyOrders.tsx` |
| `C/OrdersOption/index.tsx`, `styles.tsx` | rewrite | `DT/.../OrdersOption/index.tsx` (structure), business content |
| `C/OrdersOption/OrdersSearchForm.tsx`, `searchText.ts`, `ChipRow.tsx` | new, ported | yes (`DT`) |
| `C/OrdersOption/OrderSummaryTable.tsx`, `orderSummaryUtils.tsx` | **not ported** | driver-only (`SUMMARY_ENABLED_PROJECTS`, 2 projects by name) |
| `C/OrdersOption{Business,City,Driver,Paymethod}/*` | rewrite UIs as bottom-sheet selects (controllers unchanged) | `OSelect` pattern of `DT` |
| `C/OrdersOptionDate`, `OrdersOptionDelivery` | replace with chip groups; delete the two folders and their tests | `DT OrdersOptionDate` |
| `C/OrdersOptionStatus` | delete (replaced by the status chips of the form) | - |
| `C/PreviousOrders/*` | `index.tsx` rewrite (groups, no function-in-params page), `OrderItem.tsx` rewrite (business card), `OrderList.tsx`/`OrdersGroupedItem.tsx` port, `styles.tsx` rewrite | `OrdersGroupedItem`, `areListedOrderRowPropsEqual`, `isGroupedOrderStatusInFlight` shared; the card is business-only |
| `C/NewOrderNotification/*` | rewrite `index.tsx`; port `alertQueue.ts`, `alertContent.ts`, `styles.tsx`; delete `shouldPostDriverLocationOnNotification.ts` (driver logic) | yes (3 files), `index.tsx` adapted |
| `C/WebsocketStatus/*` | rewrite | structure of `DT` pill + sheet; copy and Reconnect are business-new |
| `src/context/SocketReconnectContext.tsx` | new | yes |
| `C/OrdersListManager/*` | rewrite as `OrdersBoard`; delete the SLA settings modal | no counterpart in driver |
| `src/ui/src/context/OfflineActions/*` | keep; fix `getStatusById` (22-26), take ids from one shared module; add queue kinds (3.x) | n/a |
| `src/navigators/subscribeOrdersRegisterVibration.ts` | keep only if Q10 says so; otherwise delete with its tests | n/a |
| `HomeNavigator.tsx` | mount `SocketReconnectProvider` and the global alert | `DT HomeNavigator.tsx:125` |
| Android `MainApplication.kt` | add the `AlarmSound` module | `DV android/.../MainApplication.kt` (native agent) |

### 2.6 Timer semantics for the cards (proposal, replaces today's 1.6 on the card)

| Where | Text | Formula | State color |
|---|---|---|---|
| New (0) | "Waiting 00:42" | `now - created_at` | muted until the SLA rule says otherwise (Q3) |
| New (13) | scheduled time "6:30 PM" | `delivery_datetime(_utc)` | neutral |
| Preparing | "Ready in 03:40" (or "Late 02:10" past due) | `accepted_at + prepared_in - now` | success if > 5 min, warning if within, danger late (mockup: `#00713F` / `#6B5300`) |
| Ready | "Waiting 04:10" | `now - status:4 time` | muted |
| With driver | none (status chip) | - | - |
| History | time of day | order time | - |

A single 1 s ticker (`useNow(1000)`, only for mounted visible cards, rendered in a child `<OrderClock>` so the memoized card does not re-render) replaces the frozen `HH:MM` of today. `plan_enterprise` keeps the **API's** `time_status` tint/dot where it exists; without the enterprise plan the timer is shown with the neutral/derived color rule (Q3). The 300 min offset is dropped.

---

## 3. Behaviour kept / changed

Legend: **works today** = the controller/API already supports it; **app-only new logic** = new code in this repo, no submodule or backend change; **needs submodule** = additive change in ordering-components; **needs backend** = api-core.

| Behaviour | Kept / changed | Status | Evidence |
|---|---|---|---|
| Groups ids per tab, defaults overridable | kept (re-mapped through `orderGroupStatusCustom`) | works today | `SUB/.../OrderListGroups/index.js:46-52` |
| `combine_pending_and_progress_orders` | kept as layout flag (Active + History) | app-only | `OrdersOption:1097-1123`, Q2 |
| Pending and In progress as separate fetches | **changed**: one active fetch, split on the client | app-only | `SUB:1028-1035` fetches per slot |
| History = completed + cancelled | **changed** (two tabs -> one with 3 chips) | works today (custom ids) | `SUB:46-52,99` |
| Per-status chips in Pending / In progress | **removed** (stage sections replace them) | app-only | mockups |
| Tab counters | **new** | app-only (exact after loading all pages; `pagination.total` for the combined slot) | `SUB:560-567` |
| Orders tab-bar counter | **new** | app-only | `Main` mockup; Q7 |
| Pagination 50, "Load more" | kept for History; active list auto-loads all pages | app-only | `MyOrders.tsx:36-40`, `SUB:503-582` |
| Pull to refresh; header refresh icon | refresh icon **removed** (not drawn), pull kept | works today | `OrdersOption:505-515,691` |
| Search fields (order number, external id, date, city, business, delivery type, driver, paymethod, SLA) | kept | works today | 1.4 |
| Search by customer name | **new** | needs submodule (`customer.name` branch next to email/phone, `SUB:255-280`); api-core allows `name` (`User::$whereable`) | Q6 |
| Search by phone / email in the same field | **new** | works today (`filtered.customer.*`) once a UI sends it | `SUB:255-280` |
| Order type filter: 5 types | **changed** (was 2) | works today | `delivery_type` accepts an array (`SUB:282-287`) |
| Status filter | **new UI** | works today (`filtered.state`) | `SUB:205` |
| "Show 12 orders" live count | **new** | app-only (second request, `page_size 1`) | endpoint as `SUB:347-350` |
| Filters on -> all statuses, tabs hidden | kept (Q1) | works today | `SUB:1043-1046` |
| Filters notice (yellow) with a summary | changed look + summary text | app-only | `OrdersOption:483` |
| SLA tint/bar/timer only with `plan_enterprise` | kept (tint and dot); timer text for everyone | app-only | `OrderItem.tsx:41-48` |
| Timer ticks | **changed** (was frozen) | app-only | `PreviousOrders:174-181` |
| Timer meaning | **changed** (delivery-time countdown -> waiting / ready-in) | app-only (needs `created_at`, `prepared_in`, `reporting_data.at`) | `Order.php:170,173,193`, `OrderController.php:3401` |
| Customer name, total, items, payment on the card | **new** | works today (fields in the list payload; payment_events unverified) | 2.4 |
| Hide customer data with `hide_customer_contact_business_app` | **extended** to the card, the alert and the board | app-only | `contactVisibility` util |
| Accept / Reject on the card | **new** (before only in details and groups) | app-only wiring: Reject = existing `rejectByBusiness` flow; Accept = the prep-time sheet then `acceptByBusiness`, `prepared_in` | `pages/MyOrders.tsx:46-53`, `AcceptOrRejectOrder/index.tsx:236-242` |
| Accept is one direct tap, never held | kept: the card's Accept opens the sheet that already has a default (20 min) and its own "Accept - 20 min" button | app-only, Q13 | brief rule |
| "Mark ready" on the card | **new** | works today (`handleChangeOrderStatus(4,[id])`) | `SUB:916-952` |
| "Picked up" / "Not picked up" on the card | **new** | works today (15 / 17) | details rules, inventory 6.3 |
| Group buttons | changed (title with count, sheet over the list, confirmation) | app-only | driver decision 2026-11-19 |
| Offline cached list + banner | **to be re-enabled** (was dead) | app-only (pass `isNetConnected`) | 1.7 |
| Offline queue of status changes | kept for accept/reject/forceStatus; **extended** to "Mark ready" / picked up / not picked up (the mockup shows "Mark ready" + "Pending sync" offline) | app-only | `OfflineActions/index.tsx:79-92`; Q14 |
| `allow_save_changes_offline` | kept; also read when the list is not mounted (provider reads the config itself, not `OrdersOption`) | app-only | `OrdersOption:1107-1115` |
| Offline replay posting raw `status: '7'` messages to the customer | should be **removed**: send only the last action | app-only, but changes a visible behaviour | `OfflineActions/index.tsx:143-149`, Q14 |
| Connection text Live / Connecting / Offline | **new** | works today (`socketStatus`, NetInfo) | `SUB/components/WebsocketStatus/index.js` |
| Server / Notifications / Printer rows | **new** | app-only (printer "ready" unverified) | Q11 |
| "Reconnect now" without restart | **new** (replaces `RNRestart`) | works today (`Socket.connect()` re-joins rooms) | `socket.js:31-50,73-82` |
| Catch-up after reconnect / foreground | **new** | app-only (port) | `DT context/SocketReconnectContext.tsx` |
| New-order alert global (any tab / screen) | **changed** (was in the Orders screen only) | app-only | `OrdersOption:810` vs `DT HomeNavigator.tsx:125` |
| Alert lists orders with Accept, "Mute", "View orders" | **new** | app-only (needs the order payload from the event; events carry it) | `SUB:1147-1148` |
| Alert gathers several orders; same order twice counts once | **new** (driver decision 2026-11-19) | app-only | `DT alertQueue.ts` |
| Alert closes when the order is accepted elsewhere | **new** | app-only (`order_updated` event) | `SUB:1066` |
| Alert settings (on / loop / vibrate / sound) | **new** | app-only (local storage; screen is area 6) | `Notifications` mockup |
| Sound loop every 2.5 s, vibration | kept as loop; vibration becomes a repeating pattern tied to the alert; sound stops when the app is in the background | app-only (+ native `AlarmSound` on Android) | `DV NewOrderNotification` |
| `notification_business_states` filter | kept | works today | `SUB/components/NewOrderNotification/index.js:11` |
| Level 2 business filter of events | kept | works today | `SUB:1024-1026,1064` |
| Board (3 columns, live) | **new** | app-only (same data as the phone) | `TabletBoard` |
| Driver "6 min from the customer" | **new** | needs backend or a routing call | Q12 |
| Reject reason on History cards | **new** | works today (`reject_reason` on the order) | `Order.php:194` |
| Review customer on History cards | **new** (before only on groups and details) | works today | `PreviousOrders:75` |
| "Pause orders" on the empty state | **new** | needs area 7 data; API exists in Stores | Q8 |
| Tablet SLA settings modal | **removed** | n/a | not in the mockups |

---

## 4. Proposed theme pieces

### 4.1 Page `orders` (driver `orders` page: `tabs` fixed / `summary` hideable / `list` fixed)

Sections: `tabs` (fixed) - `list` (fixed). No `summary` (the driver's summary is its two named projects). The stage sections are **not** theme sections: they follow the order flow (statuses), like the driver's order tabs (`pages-and-visibility.md` "Not sections, and why"). The board has its own page `orders_board` (tablet only, via the platform override of `orders`): sections `new`, `preparing`, `ready` are columns of the same kind (fixed, not hideable).

### 4.2 Visibility keys

Same names as the driver where the piece is the same (marked D) and the marketplace (M):

| Key | Hides | Default | Note |
|---|---|---|---|
| `connection_status` (D, M) | the connection pill in the header and the board | true | the sheet and the offline notice are state, never hidden |
| `orders.title` (D) | the "Orders" title | true | |
| `orders.search` (D) | the search button and screen | true | |
| `orders.refresh` (D) | a header refresh icon | **false** | not in the mockups; kept only to avoid dropping a key the driver has; pull to refresh stays |
| `orders.order_number` (D, M), `orders.order_type` (D), `orders.order_status` (D, M) | the pieces of the card header/status chip | true | |
| `orders.date` (D, M) | the time/date on history cards | true | |
| `orders.customer_name` | the customer's name on the card | true | the config `hide_customer_contact_business_app` still wins |
| `orders.items` | the items line | true | |
| `orders.total` | the total and payment line | true | |
| `orders.timer` | the clock text | true | |
| `orders.business_name` (D), `orders.business_logo` (D, M) | **not used by the business card** (the app belongs to one store; the mockup does not draw the store on the card) | false | keep only if the project has several stores and the board filter is off; otherwise drop the keys |
| `orders.review_order_button` (D, M) | "Review customer" on a history card | true | |
| `orders.card_actions` | Accept/Reject/Mark ready/Picked up buttons on the card | true | the details keep their own bar; never hides the details' actions |
| ~~`orders.counters`~~ | removed on 2026-11-23 with every number of orders (the owner's decision) | | |
| `orders.stage_sections` | the "Preparing / Ready / With driver" section titles (the cards remain, in one list) | true | |
| `orders.sound_mute` | the "Mute" button in the alert | true | |
| `orders.board` (tablet platform) | the kitchen board (falls back to the phone layout) | true on `tablet` | |

### 4.3 Theme images

- `empty.new_order` (D): the alert's illustration, default none (an icon in a tinted tile, as driver decision 2026-11-17). The business's `theme.images.general.newOrder` (250x200) is dropped from the default. `empty.not_found` (D) for the no-results state. `empty.no_orders` (new, optional): the `OrdersEmpty` disc has an icon, not a picture; no image key unless the owner wants one. `placeholder.business_logo` (D): no longer used by the card. No sound key in the schema (sounds are not theme images); the bundled `notification.mp3` stays in the binary.

### 4.4 Components (beyond the driver's `product.schema.json`)

Already in the driver's schema and enough for this area, with business defaults: `tabs` (variant `pill`, 3 tabs fill the row), `chip` (filter chips), `badge` (+ `shapes.count` for the counters, the driver already has it), `order_card`, `new_order_alert`, `empty_state`, `alert` (the two notices), `sheet`/`modal`, `bottom_bar`, `list_row`, `section_header`, `timer`, `skeleton`.

New or extended (mark `[new]`):

| Key | Purpose | Notes |
|---|---|---|
| `order_card.slots.accept`, `.reject` (exist) | the card's Accept / Reject | business default: `accept` filled `success`, size `md` (44), flex 2; `reject` outline `danger`, flex 1 (driver default is tonal) |
| `order_card.slots.ready` `[new]` | "Mark ready" | filled success, full width |
| `order_card.slots.picked_up`, `.not_picked_up` `[new]` | pickup pair | filled success flex 2 / outline danger flex 1 |
| `order_card.base.tint_warning`, `tint_danger` `[new]` | card background when `time_status` is at risk / delayed (today `warning100`, `danger100`) | colors from tokens `warning_subtle`, `danger_subtle` |
| `order_card.base.items_text`, `customer_text`, `payment_text` `[new]` | the three text roles of the body (14/600, 12 muted, 12 muted) | |
| `order_card.base.clock_icon_size` (exists as `timer_icon_size` 14) | reuse | |
| `order_card` variant `compact` | History row (driver has `compact` for message rows) | reuse |
| `stage_section` `[new]` (or `section_header` variant `stage`) | `PREPARING . 2` title with a count | uppercase 12/600 muted per the kit's section title; prefer the existing `section_header` with `variants.stage` |
| `board` `[new]` | `columns` (3), `column_gap` 15, `column_padding` 15, `column_radius` 10, `column_background` (`surface_alt`), `column_title_text`, `count_badge`, `max_card_width` | only on the `tablet` platform; defaults from `TabletBoard` |
| `connection_pill` `[new]` | the Live / Connecting / Offline pill: variants `live` (`success_subtle` bg, `success_text`, dot `success`), `connecting` (warning), `offline` (danger), height 24, dot 8 | could reuse `badge` variants with a `leading dot`: prefer extending `badge` with `dot` instead of a new component |
| `new_order_alert.base.order_row_gap`, `accept_width` (90) `[new]` | row layout of the gathered orders | the rest exists (`title`, `text`, `icon_size`, `icon_box_size`, `image_size`) |
| `alert.variants.warning/danger` | the two notices | exist |

Roles of timer colors: Waiting/Ready in/Late use the same `success`/`warning`/`danger` text tokens as the badges (`#00713F`, `#6B5300`, `#C42543` in the mockups); no literals in code.

### 4.5 What the `tablet` platform changes (`platforms.tablet`; overrides only `base`, visibility and pages)

- Page `orders`: sections replaced by the board (`orders.board` true); phone layout kept when `orders.board` is false.
- `orders.card_actions` stays true; `order_card.base` on the board: `max_card_width` none (cards fill the column), body text sizes as the phone.
- `board` component: 3 columns, 15 gap, column padding 15, radius 10 (the mockup); header 56 with the title 20/700.
- `header.base` height stays 56; `tabs` hidden in the board (the three columns replace them); `bottom_nav` replaced by a left rail 80 wide (navigation area).
- `new_order_alert`: the sheet becomes a centered dialog with a max width on large screens (the driver's `OBottomPopup` rule for large screens; area 1 decides one rule for all sheets).

---

## 5. New i18n keys (key + English fallback; reuse existing ones)

Reused as they are: `ACCEPT`, `REJECT`, `IN_PROGRESS` ("In Progress" -> the mockup's "In progress" is a copy edit of the English fallback, as the existing translations are per key), `COMPLETED`, `CANCELLED`, `ACTIVE`, `PREORDER`, `READY_FOR_PICKUP`, `ALL`, `TODAY`, `YESTERDAY`, `LAST_7_DAYS`, `LOAD_MORE`, `LOAD_MORE_ORDERS`, `SEARCH_ORDERS`, `SHOW_ORDERS`, `ORDER_TYPE`, `STATUS`, `DRIVER`, `PAYMENT_METHOD`, `VIEW_ORDER`, `REVIEW_CUSTOMER`, `CONNECTION_STATUS`, `CONNECTING`, `DISCONNECTED`, `LAST_UPDATE`, `CLEAR_FILTERS`, `WARNING_FILTER_APPLIED`, `NETWORK_ERROR`, `EAT_IN`, `DELIVERY`, `PICKUP`, `CURBSIDE`, `DRIVE_THRU`, `ORDER_NOT_PICKEDUP_BY_CUSTOMER`, `PICKUP_COMPLETED_BY_CUSTOMER`. Already in the **driver** catalog and to be copied with their translations: `NEW_ORDER` ("New order!!"), `NEW_ORDERS_COUNT` ("_count_ new orders"), `LIST_AND_N_MORE`, `VIEW_ORDERS` ("View orders"), `VIEW_MESSAGES`, `NEW_MESSAGES_RECEIVED`, `ORDER_N_ORDERED`, `ORDER_N_UPDATED`, `NEW_ORDERS_UPDATED`, `ORDERS_UPDATED_COUNT`, `ORDERS_UNREAD_MESSAGES_COUNT`, `GROUP_NUMBER`, `CLEAR`, `CLEAR_SEARCH`, `CITY`.

| Key | English fallback |
|---|---|
| `NEW` | New |
| `HISTORY` | History |
| `ORDERS` (exists? the tab's title; check) | Orders |
| `STAGE_PREPARING` | Preparing |
| `STAGE_READY` | Ready for pickup |
| `STAGE_WITH_DRIVER` | With driver |
| `LIVE` | Live |
| `OFFLINE` | Offline |
| `RECONNECT_NOW` | Reconnect now |
| `CONNECTION_LIVE_DESCRIPTION` | Orders update in real time. Last update _time_. |
| `CONNECTION_CHECK_NETWORK` | If orders stop arriving, check your Wi-Fi or mobile data. |
| `CONNECTION_SERVER` | Server |
| `CONNECTED` | Connected |
| `NOTIFICATIONS` | Notifications |
| `ON` / `OFF` | On / Off |
| `CONNECTION_PRINTER` | Printer . _name_ (area 7 may own it) |
| `PRINTER_READY` | Ready |
| `ORDER_WAITING` | Waiting _time_ |
| `ORDER_READY_IN` | Ready in _time_ |
| `ORDER_LATE_BY` | Late _time_ |
| `MARK_READY` | Mark ready |
| `PICKED_UP` | Picked up |
| `NOT_PICKED_UP` | Not picked up |
| `CUSTOMER_ARRIVED` / `CUSTOMER_NOT_ARRIVED` | Customer arrived / Customer not arrived (reservation; if absent in the detail's area) |
| `ORDER_ITEMS_COUNT` | _count_ items |
| `ORDER_PRODUCTS_COUNT` | _count_ products |
| `ORDER_ITEMS_AND_MORE` | and _count_ more |
| `PAYMENT_PAID` | _method_ . paid |
| `PAYMENT_TO_COLLECT` | _method_ . to collect |
| `TABLE_NUMBER_SHORT` | Table _number_ |
| `PENDING_SYNC` | Pending sync |
| `OFFLINE_NOTICE_TITLE` | You're offline |
| `OFFLINE_NOTICE_TEXT` | Showing orders from _time_. _count_ changes will sync when you're back online. |
| `FILTERS_ON_NOTICE` | Filters on: _filters_. You may miss new orders. |
| `NO_NEW_ORDERS` | No new orders |
| `NO_NEW_ORDERS_TEXT` | New orders show up here and ring until you open them. |
| `NO_ORDERS_IN_TAB` | No orders here |
| `STORE_OPEN_CLOSES` | Open . closes _time_ (area 7 may own it) |
| `PAUSE_ORDERS` | Pause orders (area 7) |
| `SEARCH_ORDERS_PLACEHOLDER` | Order number, customer or phone |
| `CUSTOM_DATES` | Custom dates |
| `DATE_SECTION` / `ORDER_TYPE_SECTION` | Date / Order type (uppercase titles are drawn by the role) |
| `ANY` | Any |
| `ALL_STORES` | All stores |
| `STORE` | Store |
| `SHOW_N_ORDERS` | Show _count_ orders |
| `REASON_PREFIX` | Reason: _reason_ |
| `NEW_ORDERS_ALERT_TITLE_COUNT` | = driver's `NEW_ORDERS_COUNT`; the mockup headline "2 new orders" |
| `ALERT_RINGING_UNTIL` | Ringing until you open or accept them. |
| `MUTE` | Mute |
| `ACCEPT_ORDER_ARIA` | Accept order _id_ (accessibility label) |
| `TIME_TODAY_GROUP` | uses `TODAY`/`YESTERDAY`, a date format for older days |

Typos to fix while touching (catalog keys, keep key, fix English): `CLEAR_SEARCh` -> use `CLEAR_SEARCH` (exists in the driver catalog), `ARRIVED_TO_BUSINESS` "bussiness", `DRIVER_THRU` "Driver thru" -> "Drive thru" (the filter and the card should share one key), `LAST_UPDATE` "Last Update" -> "Last update".

---

## 6. Tablet

### 6.1 Today's branch conditions

- `MyOrders.tsx:68`: `(Platform.isPad || DeviceInfo.isTablet()) && (!isPortrait || width >= 950)` -> `OrdersListManager`, else `OrdersOption` (the phone UI, uncapped: on a tablet in portrait the phone cards stretch to the full width).
- `OrdersListManager` details and gaps: 1.10.
- Navigation: `BottomNavigator` keeps the bottom bar on tablets (the mockup has a left rail: navigation area).

### 6.2 Proposal (recommended)

1. **Board** when `tablet && width >= 900` (landscape tablets, and iPad Pro portrait): the three columns of `TabletBoard`, fed by the same list and counters as the phone (2.1). Condition: one hook `useIsBoardLayout()` in `MyOrders` using `DeviceInfo.isTablet()` / `Platform.isPad` and the window width from `useWindowDimensions` (not `Dimensions.get` once, as `OrderItem.tsx` does), plus the theme platform `tablet` for the styling.
2. **Tablet in portrait under 900** (768-834 pt): the **phone layout** (tabs New / In progress / History) with a max content width (about 600) centered, and the list's cards capped. Three columns of 230 pt would not fit the card (name, items, total, two buttons).
3. **Details on tablet**: a tap on a board card opens the order's details as a stack screen (the mockups link to `OrderPending`/`OrderPreparing`..., full width screens), not the 30/70 split of today. If the owner wants the split kept (Q15), it is an option for area 4, not for the board.
4. No SLA settings modal, no separate tablet search modal (the same `OrdersSearch` screen, centered with a max width on large screens, one rule from area 1).
5. The alert and the sheets use the large-screen rule (centered dialog) decided in area 1.
6. The board lists every active order (no tabs). History on a tablet: a "History" entry in the board header (button that opens the History list as a stack screen) - not drawn in `TabletBoard`, Q15.

### 6.3 Tablet-specific data points

- Board counters = counts of the three columns (New, Preparing, Ready + With driver), computed by `useOrdersSplit`; the rail's Orders badge = New count.
- The store filter chip (`Luna Pizza`) is `filtered.business`; with one store it is hidden. A filter on the board is "filters on": the same notice and rule as the phone (Q1).

---

## 7. Open questions for the owner

Each with options, recommended first.

**Q1. With a search filter on, do the tabs stay?** `OrdersOffline` draws tabs + a filter notice, while today and the "Status" chips of `OrdersSearch` imply results across statuses.
(a) Keep today: filter results span all statuses, tabs hidden, the notice with "Clear" on top; the Status chips are the way to narrow. (recommended: nothing changes in behaviour, the controller does it already)
(b) Tabs stay and each tab filters inside its group (tabs and the Status chips then overlap).
(c) Tabs stay, the filter ignores the tab.

**Q2. What does `combine_pending_and_progress_orders` do in the new design?**
(a) Layout flag: tabs "Active" (New + the stage sections in one list) and "History". (recommended: keeps the server config meaningful)
(b) Ignore the flag (always New / In progress / History).
(c) Hide the flag's effect on tablets only (the board is combined by nature).

**Q3. Timer colors and the enterprise plan.** In the mockups a white "New" card has a warning-colored wait while the card next to it is tinted; without `plan_enterprise` there is no `time_status`.
(a) Text always shown; its color and the card tint come from `time_status` when the plan has it, neutral muted otherwise. (recommended)
(b) Derive the colors from fixed minute thresholds in code (e.g. waiting > 2 min warning).
(c) Show the timer only with `plan_enterprise`, as today.

**Q4. Sections for statuses 22, 25, 8, 23, 18, 3, 24 (driver assigned before the food is ready).** api-core starts automatic assignment at 7 or at 4 by project.
(a) Section by status only: all these go to "With driver". (recommended: simple, matches the mockup's example; says so in the section title "With driver")
(b) Keep an order in "Preparing" until the business marks it ready (needs `reporting_data.at['status:4']`; orders that went 0 -> 4 -> 8 -> 7 would be misplaced).
(c) A fourth section "Driver assigned" for 22/25.

**Q5. "products" versus "items" in the copy.** Alert: "3 products"; cards: "4 items". (a) products = number of lines, items = sum of quantities, used as the mockup does (recommended). (b) One word everywhere (sum of quantities as "items").

**Q6. Search field "Order number, customer or phone".**
(a) One field, classified by what is typed: digits only and up to 8 -> order number; `+` or 7+ digits -> phone (`customer.cellphone`); contains `@` -> email; letters -> customer name, which needs one additive branch in the submodule's `getOrders` (`customer.name`/`lastname` next to email/phone, `SUB:255-280`). The app ships first without names (placeholder "Order number or phone") if the submodule change is not ready. (recommended)
(b) Two fields (order number, customer) as today plus phone.
(c) Order number and phone only (no name search, no submodule change).

**Q7. Does the tab-bar counter show before the Orders tab is first opened?** (a) No; the Orders tab is the first screen so it is mounted at launch (recommended). (b) Hoist the `OrderListGroups` controller to `HomeNavigator` (large change to the data flow).

**Q8. The empty state's store card with "Pause orders".** (a) Keep it, wired to the stores' pause state of area 7 (needs that area's hook). (b) Leave out of this area's first pass (recommended if area 7's data is not ready).

**Q9. Group actions that exist today only for groups.** "Arrived to bussiness" (8/18 -> 3) is a driver step and has no single-order counterpart in the business app. (a) Drop it (recommended). (b) Keep for groups.

**Q10. Vibration.** (a) The alert vibrates in a repeating pattern while it is open (driver behaviour), the single global buzz of `subscribeOrdersRegisterVibration` is removed; when the alert is switched off in "Alerts and sound" a single buzz stays. (recommended) (b) Keep the global buzz as today and add nothing. (c) Both.

**Q11. "Printer . Kitchen - Ready" in the connection sheet.** There is no readiness signal for a printer. (a) Show "Saved" / "None" from the saved printers (honest, app-only). (recommended) (b) Probe the printer on sheet open (network/bluetooth round trip). (c) Drop the row.

**Q12. "Omar H. - 6 min from the customer".** (a) Name and status only. (recommended) (b) A routing/distance call from the driver's `location` to the customer's address (Google Distance Matrix; cost and key). (c) Straight-line distance without time.

**Q13. Accept on the card.** (a) Card "Accept" opens the prep-time sheet with a default (20 min) and its own "Accept . 20 min" button (the mockup; two taps total). (recommended) (b) Accept directly with a default time from a store setting (one tap, no sheet; `prepared_in` could be omitted: today the API takes 0).

**Q14. Offline queue scope and the replayed chat messages.** (a) Queue also "Mark ready" / picked up / not picked up (the mockup shows a queued "Mark ready" with "Pending sync") and, on replay, send only the last status per order, never the raw `status: '7'` message to the customer. (recommended) (b) Keep today's two-step behaviour (messages to the customer) and queue only accept/reject.

**Q15. Tablet details and history.** (a) Board + full-screen details + History as a screen from the board header. (recommended) (b) Board plus a side detail panel (more code in area 4). (c) Keep today's 30/70 master-detail (no board).

**Q16 (small).** Keep the "Review customer" button on the History cards only for statuses where today's list shows it (`[1,2,5,6,10,11,12,16,17]`, not 15)? (a) Yes. (b) Also 15.

---

## 8. Work breakdown

Files an implementation agent would own (all under this repo; none in the submodule):

1. `src/pages/MyOrders.tsx` (+ `src/pages/__tests__/MyOrders.test.tsx`).
2. `src/ui/src/components/OrdersOption/{index,styles}.tsx`, new `useOrdersSplit.ts`, `orderTimes.ts`, `OrdersSearchForm.tsx`, `searchText.ts`, `ChipRow.tsx`, `filterSummary.ts`.
3. `src/ui/src/components/OrdersOption{Business,City,Driver,Paymethod}/*` (selects), `OrdersOptionDate/*`, `OrdersOptionDelivery/*` (chips), delete `OrdersOptionStatus/*`.
4. `src/ui/src/components/PreviousOrders/*` (card, groups, list, styles, helpers).
5. `src/ui/src/components/NewOrderNotification/*`, `src/navigators/subscribeOrdersRegisterVibration.ts` (keep/delete per Q10), `HomeNavigator.tsx` (mount point; also the stack screen of `OrdersSearch`).
6. `src/ui/src/components/WebsocketStatus/*`, new `src/context/SocketReconnectContext.tsx`.
7. `src/ui/src/components/OrdersListManager/*` -> `OrdersBoard`.
8. `src/ui/src/context/OfflineActions/*` (statuses, shared ids, queue kinds, provider reads the config itself).
9. Theme: schema entries for the pieces in 4, visibility keys, tablet platform entries; i18n keys of section 5 in `i18n/translations.json` (+ `/translate-keys`).
10. Native (not this analyst's scope): the Android `AlarmSound` module (port from `DV`), `react-native-sound-player` replacement decision (driver plan `DEPENDENCIES_PLAN.md`), notification channel.

Dependencies on other areas: area 1 primitives (`Tabs`, `FilterChip`, `OBadge`, `OCard`, `ONotice`, `OBottomPopup`, `OSelect`, `OCalendar`, `SectionTitle`); area 4 (the prep-time/reject/pause sheets, the details route, the Review screen); area 5 (Messages counter in the tab bar); area 6/7 (Notifications settings, printers, stores/pause); the navigation owner (rail on tablet, tab-bar counters).

Today's test files of the area (all would be rewritten or removed with their component):
- `src/pages/__tests__/MyOrders.test.tsx`
- `src/ui/src/components/OrdersOption/__tests__/OrdersOption.test.tsx`
- `src/ui/src/components/PreviousOrders/__tests__/{PreviousOrders.test.tsx, areListedOrderRowPropsEqual.test.ts, isGroupedOrderStatusInFlight.test.ts}`
- `src/ui/src/components/NewOrderNotification/__tests__/{NewOrderNotification.test.tsx, shouldPostDriverLocationOnNotification.test.ts}`
- `src/ui/src/components/WebsocketStatus/__tests__/WebsocketStatus.test.tsx`
- `src/ui/src/components/OrdersListManager/__tests__/{OrdersListManager.test.tsx, Timer.test.tsx}`
- `src/ui/src/components/OrdersOption{Business,City,Date,Delivery,Driver,Paymethod,Status}/__tests__/*.test.tsx`
- `src/ui/src/components/OrderSummary/__tests__/OrderSummary.test.tsx` and `src/pages/__tests__/OrderSummary.test.tsx` (outside the list)
- `src/ui/src/context/OfflineActions/__tests__/offlineActionsQueue.test.ts`
- `src/navigators/__tests__/{subscribeOrdersRegisterVibration.test.ts, RootNavigator.vibration.test.ts}`
New tests to write (driver-theming has the models): `useOrdersSplit` (status -> section map, counters), `orderTimes`, `alertQueue`/`alertContent` with orders, the alert's close-on-update rule, `SocketReconnectContext`, the Reconnect button (calls `connect`, no restart), the search classifier, the offline queue kinds.

---

## 9. What I did not see / did not verify

- Nothing was run: no app, simulator, jest, tsc or lint. All behaviour claims come from reading code; the offline-dead finding (1.7) is by reading (`defaultProps.isNetConnected = true`, `MyOrders` not passing it) and matches screenshots 153-156, but I did not reproduce it.
- I did **not** look at the screenshots themselves, only the text of `INDEX.md`.
- I did not read `C/OrdersListManager/index.tsx` line by line (grep and the existing inventory), nor `OrdersGroupedItem`, `OrderList`, the `OrdersOption*` UIs, `NotificationSetting`, `OrderSummary`.
- I did not see a real orders-list payload from the API: whether the list (`orders().asDashboard()`) returns `payment_events`, `reporting_data`, `prepared_in`, `created_at`, `delivery_datetime_utc`, `eta_time`, `time_status` per order was inferred from api-core's `Order` model (`$fillable`, `$hidden`) and from fields the existing UI already reads; the `reporting_data.at['status:N']` keys come from `OrderController.php:3401` and are only set after a status change made through that code path; their time zone was not checked.
- `time_status` is computed server side; I did not check whether it exists without `plan_enterprise`.
- The business project's `notification_business_states`, `plan_enterprise`, `combine_pending_and_progress_orders` and `allow_save_changes_offline` values at runtime were not checked.
- I did not verify that `Socket.connect()` on a socket that is "connected but stale" recovers (I read the code; the `disconnect()` then `connect()` sequence is a proposal); not verified on a device that `useWebsocket()` returns the wrapper in the business app's provider tree as in the driver's.
- I did not verify that the bottom tabs keep the Orders screen mounted while other tabs are focused (React Navigation default; `unmountOnBlur` was not searched for), which the global alert and the counters depend on.
- Driver-theming claims (alert queue, `SocketReconnectContext`, `OrdersOption`) were read in its current tree; I did not check its tests or its device verification notes beyond the grep of `verification.md`.
- The count of tests per file and the list of existing translations for the new keys were not verified in all 12 locales (only the English entries of the driver and business catalogs were compared).
