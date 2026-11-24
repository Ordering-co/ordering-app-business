# Area 4 - Order details and its actions (business app)

Analyst report, read-only. Nothing was run (no app, no simulator, no tests, no tsc). Every statement comes from reading code, the mockups, the driver-theming repo and api-core; "not verified" says where reading could not decide. Date of the code read: branch `feature/theming-native`, 2026-11-19.

Path abbreviations: `B/` = `src/ui/src/components/OrderDetails/Business.tsx`; `OH/` = `.../OrderDetails/OrderHeaderComponent.tsx`; `OC/` = `.../OrderDetails/OrderContentComponent.tsx`; `AR/` = `.../AcceptOrRejectOrder/index.tsx`; `CTL/` = submodule `src/@/components/src/components/OrderDetails/index.js` (read only); `D/` = `/Users/work/Ordering/ordering-app-driver-theming/src/ui/src/components/`; `DO/` = original driver app `/Users/work/Ordering/ordering-app-driver-v26/src/ui/src/components/`; `M/` = `design/redesign/screens/`.

---------------------------------------------------------------------------

## 1. Today

### 1.1 Reachability, variants and what is dead

| Piece | Live? | Evidence |
|---|---|---|
| `pages/OrderDetails.tsx` -> `OrderDetailsBusiness` (`B/:911-917`) | Live. Stack screen `OrderDetails` (`HomeNavigator`), reached from list cards, push notification (`isFromRoot`) and, on a tablet, embedded in `OrdersListManager` (`OrdersListManager/index.tsx:630`, `isCustomView`) | |
| `OrderDetails/` folder variants | The folder holds **one** variant, `Business.tsx` (the driver's `Delivery.tsx` is gone). Dead inside it: styled `Logo` (`styles.tsx:25`, no importer), `Pickup` (`:8`, no use by `Business.tsx`), commented-out `Chat` `OModal` (`B/:776-792`), unused `StyleSheet` keys `driverOff`(used), `btnPickUp`, `headerText`, `secondaryHeaderContainer`, `btnBackArrow` (`B/:525-561`), `console.log('order', order, locations)` on every render (`B/:471`), unused imports `OModal`-chat bits, `Chat`, `USER_TYPE`, `OIcon`, `useCallback` ok | `grep` |
| `OrderDetailsLogistic` (UI folder, 198 lines) | **Dead.** Exported from `src/ui/index.tsx` only; not a route in `HomeNavigator`; the only caller is `PreviousOrders/index.tsx:93`, which navigates to a route that does not exist and only for `isLogisticOrder`, a state that `isBusinessApp:true` never reaches. Its test keeps it alive | `OrderDetailsLogistic/__tests__` |
| `DriverMap` (580 lines), `MapView` (`MapViewUI`, 357) | **Dead** (driver heritage). Exported only; `DriverMap` is not rendered anywhere, `MapView` only re-exported (`ui/index.tsx:42-43`) | `grep "<DriverMap"` = 0 |
| `GoogleMap` (+ `LocationIndicator`, `RenderMarker`) | **Live**: the map modal of the details (`B/:819`) and of a group in the list (`PreviousOrders/index.tsx:520`) | |
| `AcceptOrRejectOrder` UI | Live in three containers: `OModal` inside the details (`B/:794-812`), `OModal` inside `PreviousOrders` (`:483`, group accept/reject/forceStatus) and the page `pages/AcceptOrRejectOrder.tsx` (group "Accept all / Reject all", `ids` and a **function** in `route.params`, `:21-26`: not serializable) | |
| `ReviewCustomer` | Live: details (`OC/:769-791`) and groups (`PreviousOrders/index.tsx:502`) | |
| `FloatingButton` | Live in details (`B/:842,857,868`), `ReviewCustomer` (`:310`), `OrderSummary`, `DriverMap`(dead) | |
| `ProductItemAccordion` | Live from `OC/:473` and `OrderSummary/index.tsx:773`. Cart branches (`isCartProduct`, `onEditProduct`, `onDeleteProduct`, `getProductMax`, `ProductItemAccordion/index.tsx:29-64`) dead | |
| `OrderSummary` page + UI (994 lines, `react-native-html-to-pdf`, `react-native-print`) | **Live only as a fallback**: the print icon goes to `OrderSummary` when no printer is saved (`getTicketPreviewNavigationPlan.ts:17`, `B/:397-406`). Printing belongs to area 7 | |
| Logistics branches (`order.isLogistic`, `order_group`, `logisticOrderStatus`) in `B/:613`, `OH/:144,180,253`, `OC/:219` and `isOrderGroup` in `OC/:150` | Dead for this app (`logisticOrderStatus` is never passed; `isLogistic` only on the logistic tab that `isBusinessApp` never shows) | |

Business-only versus the original driver app (diff of `DO/` against this repo): `B/` is its own file (assign driver, print/auto-print plan, reservation alert, copy text, "Ready for pickup" and customer pick-up buttons); `OH/` adds `isReservationPreorder`, the delivery-type map for 5 and 9, the wallet shape (`wallet_event.wallet.type`), the `isCustomView` row, no delivery-position pill, no `useSecureOrderId`; `OC/` adds `isCustomerContactHidden` (`hide_customer_contact_business_app`) over customer name, e-mail and phones (`:317,348,359,370`), `hideOrderPrices` when the total is 0 (`:54,483`), the product-block guard (`:448`); `ProductItemAccordion` adds `half_price` for left/right suboptions (`:287-289`) and the translated position; `ReviewCustomer` hides the customer name under the same flag (`:168-172`); `FloatingButton` has no `useFloatingButtonInset` and pads 30 (`FloatingButton/index.tsx:59`); `AcceptOrRejectOrder` is the *old* single-file version without any of the driver's sheet system (595 lines against the driver's 892 + 9 files). Everything the driver redesign added is **absent** here.

### 1.2 What the screen shows, by order status

Conditions: `B/:97-102` (`statusForComplete=[4,20,21]`, `orderToComplete` adds 7 for a reservation (`delivery_type 9`), `pendingStatus=[0]`, `orderToReady=[7,14]`, `deliveryTypes=[1,7]`). The body of the page is the same for every status (header card, optional assign-driver block, custom fields, business, customer, products, bill, payments, spot, vehicle, review button); only the header title colour, the Assign-driver block, the review button and the bottom bar change.

| Status id | Title status text (`OH/:150-156`, colour map `B/:104-135` passed as `colors`) | Assign driver block (`B/:690-772`) | Bottom bar (file:line) | "Review customer" (`OC/:769`) |
|---|---|---|---|---|
| 0 Pending | "is Pending", blue | no | **Reject** (red, first/lower) + **Accept** (green, upper), stacked, `disabled={loading}` (`B/:839-855`) -> `handleViewActionOrder('reject'|'accept')` opens the Accept/Reject `OModal` | no |
| 13 PreOrder (a reservation `delivery_type 9` reads "Reservation") | blue | no | none | no |
| 7 Accepted by business, 14 Order not ready | blue | yes if delivery 1/7 and manual assignment enabled | non-reservation: **Ready for pickup** (green) -> `handleChangeOrderStatus(4)` direct, no confirmation (`B/:856-866`). Reservation (type 9) in status 7: **Customer not arrived** (red -> 17) over **Customer arrived** (green -> 15) (`B/:867-890`) | no |
| 4 Preparation completed / Ready | blue (list says "Ready for pickup"; here `PREPARATION_COMPLETED`, `utils/index.tsx:466-469`) | yes if delivery 1/7 and enabled | delivery 1/7: **none** (driver's turn). Other types: **Order not picked up by customer** (red -> 17) over **Pickup completed by customer** (green -> 15) | no |
| 20 Customer almost arrived, 21 Customer arrived (business) | blue | no | non-delivery types: same pick-up pair; delivery: none | no |
| 3, 8, 9, 18, 19, 22, 23, 24, 25, 26 (driver stages), 13 | blue | no | none | no |
| 1 Completed, 11 Delivery completed by driver | green | no | none | yes if `!order.user_review && order.customer_id` |
| 15 Picked up by customer | green | no | none | **no** (list `[1,2,5,6,10,11,12,16,17]` leaves 15 out: a completed pickup cannot be reviewed - defect, `OC/:74`) |
| 2, 5, 6, 10, 12, 16, 17 (rejected / failed / cancelled) | red | no | none | yes (same condition) |

Other conditions of the page:

| Condition | Effect | file:line |
|---|---|---|
| `getOrderStatus(status).slug === 'PENDING'` | copy and print icons hidden (a Pending order cannot be copied or printed) | `B/:615`; the tablet row compares the *translated text* instead of the slug (`OH/:253-`) |
| `configs.change_order_id.value === '1'` | title and external id show `external_id` | `OH/:56,143`; the external-id line only when the flag is off (`OH/:197-206`) |
| `hide_customer_contact_business_app = '1'` (`isCustomerContactHidden`) | hides customer name, e-mail, cellphone, phone in the card, in the clipboard text, in the Reject modal's call button, the map callout ("Customer"), the review's name | `OC/:317,348-370`, `B/:248-263,459`, `AR/:44,388`, `ReviewCustomer/index.tsx:168` |
| bill total = 0 | the whole bill block hidden (`hideOrderPrices`) | `OC/:54,483` |
| `order.metafields.length` | "Custom fields" accordion, collapsed | `OC/:155-190` |
| Business details / Customer details | accordions, **collapsed by default** (`OC/:64`); business e-mail/phones, address, `DISTANCE_TO_THE_BUSINESS` (unit `configs.distance_unit`), address notes with "Read more"; customer rating star (`user_review.qualification`), internal number, address notes, zipcode, `on_behalf_of`, delivery option (delivery 1/7) | `OC/:192-445` |
| `delivery_type`: 3 table, 5 drive-thru lane, other spot number; 9 reservation date + guests; 7/8 "Created at"; `!= 9` "Placed to" | secondary lines under the card; catering pickup (8) is labelled "Delivery" (`OH/:99-113` has no 8 case) | `OH/:174-241` |
| `ordering.project` includes `delosi` | order comment in primary bold | `OC/:458-462` |
| `order.spot_number`, `order.vehicle` | Spot and Vehicle blocks | `OC/:713-767` |
| `order.payment_events` | header "Payment method(s)" lists them (wallets, cash change); "Payments" card with `-$amount` | `OH/:134-170`, `OC/:664-709` |
| `hasFloatingButton` (status 0, or [7,14] non-reservation, or [4,20,21]+7-if-reservation and non-delivery) | scroll `max-height: 85%` instead of 100%: a hand-made reserve | `B/:670-674`, `styles.tsx:3-6` |
| `showReservationAlert` (controller sets it when a reservation reaches 7 and `isBusinessApp`) | system `Alert` "Reservation / Scheduled for: <date>" | `CTL/:347-349`, `B/:514-523` |
| `regressionRequest` (`order_status_regression_validation_enabled = '1'` and the API's regression error code) | reopens the Accept/Reject modal with `action='forceStatus'` and the pending body | `CTL/:364-366`, `B/:482-488` |
| `autoPrintEnabled` (AsyncStorage `auto_print_after_accept_order`) and saved printers | after an accept (`redirectTicket=true`, status 7) generic printers print in the background through `TicketAutoPrint`, other printers open `TicketPreview` with `shouldPrintOnMount`; area 7 owns the printing, this area only calls it at `B/:186-208,893-898` and `handleViewSummaryOrder` `B/:397-406` | |
| Tablet panel (`isCustomView`) | no top bar (`B/:604`), the header row with copy/print/map/messages is inside `OH/:243-307`; panel props lack `isBusinessApp`, `orderId`, `notificationApp` (`MyOrders.tsx:41-55`), so the reservation alert never shows on a tablet (`CTL/:347` needs `isBusinessApp`) | |

`reject_orders_enabled` does **not** change the details (it only hides "Reject all" of a group on a tablet). No config hides Accept/Reject on the details page.

### 1.3 Header icons

`B/:604-666`, a custom bar (back arrow 24 px with no padding; icons 20 px in 40 px boxes, below the 44 touch rule):
- Copy (`B/:618-625`, `handleCopyClipboard` `:221-374`: text with status, payment-type, business, customer (flag-aware), products with options and comments, subtotal, driver tip, "Delivery fee" (it prints `service_fee`), total; toast "Copy to clipboard." 1 s). Hidden in Pending.
- Print (`:626-635`) -> `handleViewSummaryOrder`: with saved printers `TicketPreview {printerSettings, order, orderStatus}`, without `OrderSummary` (area 7). Hidden in Pending.
- Map (`:638-648`) -> `OModal` with `GoogleMap` (`:814-835`).
- Messages (`:649-662`) + 8 px red `Dot` when `messages` has an unread item from another author (`filteredMessages`, `:83-84,650`) -> `navigation.navigate('OrderMessage', {orderId})`, `readMessages()`, `loadMessages()`.

### 1.4 Accept flow (preparation time) - what actually happens

1. Pending detail: bottom bar Accept -> `handleViewActionOrder('accept')` (`B/:384-395`; `getViewActionOrderPlan` only ignores while `loading`) -> `OModal entireModal customClose` with `AcceptOrRejectOrder action='accept'` (`B/:794-812`). The modal's button text is **"Change preparation time"** on the phone (`pages/OrderDetails.tsx:30`, even for the first accept) and "Accept" in the tablet panel and in group pages (`MyOrders.tsx:42`, `pages/AcceptOrRejectOrder.tsx:21-26`).
2. UI: a 245 px circle (`Timer`) showing `HH : MM` at 55 px; the real input is an invisible 0x0 `TextInput` (`TimeField`) focused after 200 ms and re-focused on every blur (`AR/:332-341,482-496`); digits fill right to left (`handleTime`, `:158-174`). **No presets, no stepper, no default above 00:00, no minimum**: `prepared_in: 0` is sendable.
3. Defect (read from code, not run): `AR/:227-231` compares strings. `min = '7'` -> `'7' > '60'` is true -> **59 minutes are sent instead of 7** (digits 6-9 alone); `'60'` is not `> '60'`, so 60 is sent as 60; `handleFixTime` (`:186-195`) updates *state* but the local `min` of the same call is not updated.
4. Send: `acceptByBusiness` = `{status: 7, prepared_in: <minutes>, id}` through `handleUpdateOrder` (`B/:800`, `handleChangeOrderStatus(status, body, true)`), controller `CTL/:285-379` -> `PUT /orders/:id`. Success: `Object.assign(order, result)`, `notifyEstimatedTimeMessage` posts a chat message to the customer (`type 2`, `can_see '3'`, text `ESTIMATED_PREPARATION_TIME` with `_min_`, `CTL/:236-280,351`), reservation alert, auto-print.
5. The modal closes through `useEffect([loading])` (`B/:472-480`), which fires on **every** change of `loading`, including the start of the request: the modal disappears as soon as the request begins, so a failure is seen on the page behind it (see 1.7). No success toast.
6. Offline (`!isNetConnected && canSaveChangesOffline !== false`, `AR/:310-326`): `applyOffAction('evt_off_change_order_status')`, `handleUpdateOrder(..., {dataToSave: {...body, unsync: true}})` updates the order in memory, `registerOffOrder`, modal closes. The details page has no "pending sync" notice (the driver's has one).
7. No UI to change the time after accepting. `pages/OrderDetails.tsx:30` defines `CHANGE_PREPARATION_TIME` but the accepted state offers only "Ready for pickup".

### 1.5 Reject flow

`reject` = same `OModal`, title "Reject Order" (`REJECT_ORDER`, key not in the i18n catalog because it is read through an `orderTitle` object, see 5), shows (unless the contact flag hides it) "Call your customer to resolve the issue as politely as possible" + a `tel:` button with `(abc) rest` formatting (3-char prefix assumed, `AR/:146-152`) or a disabled "There's not phonenumber."; "Mark the order as rejected"; a required textarea (button disabled while `comments.trim()` is empty, `AR/:584`); note "Your customer will receive a notification about this actions". No predefined reasons: the reasons dropdown (`orderCommentList`, `utils/index.tsx:775-832`, `REJECT_REASON_*`) is only rendered for `appTitle.key === 'DELIVERY_APP'` (`AR/:62,498`), never in business. Body `rejectByBusiness` = `{status: 5, reject_reason: <free text>, id}` (`AR/:239-242`). No confirmation beyond the button. `forceStatus` (regression) = textarea + body `{...pendingStatusBody, reasons}` (`AR/:267-270`), red "Confirm". Not-ready, pickup-failed, delivery-failed actions exist in `AR/` but `actions`/`orderTitle` have no entries for them in this app, so a group "Order not ready" tap leaves `bodyToSend` undefined (`AR/:308` would throw) - broken path (list, area 3).

### 1.6 Driver assignment

Block shown when status is 7 or 4, `delivery_type` in [1,7] and `isManualDriverAssignmentEnabled(configs, user.level)` (`B/:690-691`; `isManualDriverAssignmentEnabled.ts`: needs `configs.assign_driver_enabled.value === '1'`, `store_app_manual_driver_assignment_enabled !== '0'`, and for level 5 `delivery_manager_manual_driver_assignment_enabled !== '0'`; level 5 cannot log into this app, allowed levels are [0,2]). Drivers come from `ordering.controls(orderId).get()` (`CTL/:536-557`, only when `isFetchDrivers`, which the page sets with the same function). The UI reuses `react-native-country-picker-modal` as a dropdown (`B/:703-769`), items: each driver (not available -> grey and disabled, current one disabled, "(Selected)"), plus "Unassign Driver" when the order has one; the sort comparator only returns -1 (`B/:179-183`). Selection calls `handleAssignDriver(driverId|null)` -> `PUT /orders/:id {driver_id}` (`CTL/:398-420`); no confirmation, no toast; an error replaces the whole screen (1.7). The controls endpoint returns, per driver, `id, photo, name, lastname, cellphone, busy, available, location, last_location_at, assigned_orders_count` (`api-core ControlsController.php:433-448`), but this UI uses only `name`, `available`, `id`.

### 1.7 Loading, error, empty

- Loading (no order, no error): six `rn-placeholder` groups on `backgroundPage` (`B/:569-589`).
- Error: `NotFoundSource` full screen with the API message and "Go to my orders" (`B/:591-601`), and the whole detail is hidden while `error` is set (`B/:602`). **Any** failed status change, assign-driver or even a socket-less network error writes `orderState.error` in the controller (`CTL/:371,376,411-418`) and **the order disappears**; the controller keeps the loaded `order` next to the error, so the UI could show both. After a success the error is **not cleared** (`CTL/:342-346` spreads the previous state), so an inline error would stay on screen after a retry succeeds unless the controller clears it (see 2.9). `handleAssignDriver` also does `Object.assign(order, result)` with the error array when it fails (`CTL/:410`).
- No offline state of its own: the three bar buttons do a direct fetch and fail into the error screen.
- The controller uses the `order` passed from the list as is and **does not refetch** (`CTL/:634-643`), so `history`, `payment_events` etc. are whatever the list had (the list endpoint drops `history` above 100 orders, `OrderController.php:813-822`).

### 1.8 Actions and their calls

| UI action | Handler | Body / call |
|---|---|---|
| Accept | `acceptByBusiness` (`AR/:235-238`) | `PUT orders/:id {status:7, prepared_in}` |
| Reject | `rejectByBusiness` | `{status:5, reject_reason:<text>}` |
| Force status | `forceStatus` | `{...body, status, reasons}` |
| Ready for pickup | `handleChangeOrderStatus(4)` | `{status:4}` |
| Customer arrived / Pickup completed | `(15)` | `{status:15}` |
| Not picked up / Customer not arrived | `(17)` | `{status:17}` |
| Assign / unassign driver | `handleAssignDriver(id|null)` | `{driver_id}` |
| Review customer | `ReviewCustomer` controller | `POST /users/:customer_id/user_reviews {qualification, comment, order_id, user_id}`, toast, `events.emit('customer_reviewed')` (`ReviewCustomer/index.js:31-57`) |

Business app reports no "driver" actions (pickup failed, delivery failed, arrived) except through groups.

### 1.9 Map modal

`GoogleMap` (`GoogleMap/index.tsx`, 377 lines + `RenderMarker` with `react-native-fast-image`, `LocationIndicator`): header "Order No. X is <status>" and the store/customer indicator, `react-native-maps` (Google) with markers (driver level 4, store 2, customer 3) and callouts with a "Go to this location" button that opens `Alert`-style "Show in other maps"; X button; when `showAcceptOrReject` (status 0 only, `B/:490-492`) a lone green **Accept** bar that closes the map and opens the Accept modal. Risk: `markerPosition` reads `locations[locations.length - 1].lat` (`:44-52`); with no coordinates `locationsToSend` is empty and it throws (by reading). Markers fall back to hard-coded Cloudinary URLs (`B/:441-466`). Live driver position: `driverLocation` from the controller's `tracking_driver` socket handler (`CTL/:706-726`).

### 1.10 Review customer

`ReviewCustomer/index.tsx` (334 lines): `ONavbar` title, "Rate the experience" + question (name hidden by the flag), photo, `LinearGradient` rating bar with 5 labels (Terrible..Great), quick-comment chips by level (`reviewCommentList`, `utils`), comment textarea, `FloatingButton` "Send Review" (label "Loading" while sending), error via system alert. Success: toast, `onClose`. State shared with the list.

### 1.11 i18n keys used (literal `t()` in the area files; fallbacks are the code's)

`ACCEPT, ASSIGN_DRIVER, ASAP_ABBREVIATION, BUSINESS_DETAILS, CAR_REGISTRATION, CASH_CHANGE_OF, CASH_WALLET, CATERING_DELIVERY, CATERING_PICKUP, COLOR, COMMENT, COPY_TO_CLIPBOARD, CREATED_AT, CREDITS_POINTS_WALLET, CURBSIDE, CURBSIDE_SPOT_NUMBER, CUSTOM_FIELDS, CUSTOMER, CUSTOMER_ARRIVED, CUSTOMER_DETAILS, CUSTOMER_NOT_ARRIVED, DELIVERY, DELIVERY_FEE, DISCOUNT, DISTANCE_TO_THE_BUSINESS, DRIVE_THRU_SPOT_NUMBER, DRIVER, DRIVERS, DRIVER_THRU, DRIVER_TIP, EAT_IN, EATIN_SPOT_NUMBER, EXTERNAL_ID, GO_TO_MY_ORDERS, GUESTS, HOURS, INGREDIENTS, INHERIT_FROM_BUSINESS, INVOICE_ORDER_NO, IS, MINUTES, MODEL, NETWORK_ERROR, NO, NOT_AVAILABLE, NOT_NUMBER, NOTE, ON_BEHALF_OF, ORDER, ORDER_COMMENT, ORDER_DETAILS, ORDER_NOT_PICKEDUP_BY_CUSTOMER, ORDER_PICKUP_COMPLETED_BY_CUSTOMER, ORDER_STATUS_REGRESSION_DESCRIPTION, ORDER_TYPE, PAY_WITH_CASH_WALLET, PAY_WITH_CREDITS_POINTS_WALLET, PAYMENTS, PENDING, PICKUP, PLACED_TO, READ_MORE, READY_FOR_PICKUP, REJECT, REJECT_REASONS_OPTIONS, RESERVATION, RESERVATIONS, RESERVATION_SCHEDULED_TO, REVIEW_CUSTOMER, SCHEDULED_FOR, SELECTED, SERVICE_FEE, SHOW_LESS, SPOT_NUMBER, SUBTOTAL, SUBTOTAL_WITH_DISCOUNT, TAX, TOTAL, TYPE, UNASSIGN_DRIVER, VEHICLE, WITHOUT_DRIVERS` (details); `BAD, COMMENTS, ERROR, GOOD, GREAT, HOW_WAS_YOUR_EXPERIENCE_WITH, LOADING, OKAY, RATE_THE_EXPERIENCE, REVIEW_COMMENT_QUESTION, SEND_REVIEW, TERRIBLE` (review); `GO_TO_THIS_LOCATION, SHOW_IN_OTHER_MAPS, WHAT_APP_WOULD_YOU_USE, CANCEL, YOUR_LOCATION` (map). Keys read through objects (`orderTitle[action].key/btnKey`, `pages/OrderDetails.tsx:28-32`) are not seen by `i18n:generate`: `PREPARATION_TIME`, `CHANGE_PREPARATION_TIME`, `REJECT_ORDER`, `REASON_REQUIRED`, `CONFIRM` are **not in `i18n/translations.json`** (checked), so only their English fallbacks exist.

### 1.12 Libraries that paint their own UI in this area

`rn-placeholder` (skeleton, `B/:4,576`); `react-native-country-picker-modal` (driver picker, `B/:7,703`); `react-native-select-dropdown` (driver-only reasons, `AR/:5`); `react-native-linear-gradient` (review bar); `react-native-maps` + `react-native-geocoding` + `react-native-fast-image` (`GoogleMap`, `RenderMarker`); `react-native-vector-icons` (MaterialCommunityIcons, SimpleLineIcons, AntDesign, Feather), PNG icons through `OIconButton`; system `Alert.alert` via `OAlertOriginal` (reservation, map error, review error); RN `Modal` via `OModal`; `react-native-html-to-pdf` / `react-native-print` (`OrderSummary`, area 7). Also hidden-input hack (`TimeField`) and hard-coded literals (`#FFF`, `#748194`, `#444`, 55 px dial, `rgba`) across `AR/`, `B/`, `OC/`.

### 1.13 Screenshots of today

`40-47` (pending/pre-order, copy, print, map), `52-58` (accept modal 00:00 and result), `59-63` (ready, not picked up without confirmation, review button), `64-65` review, `66-67` delivery accepted, `70` driver in business, `71-74` pending delivery + reject modal without reasons, `75-80` completed/cancelled/rejected, `160` accepted by driver (from `INDEX.md`; I read the index, not the images).

---------------------------------------------------------------------------

## 2. Target

Mockups read as text (inline styles carry the values): `OrderPending` (the exemplar), `SheetAccept`, and the specs of the others in `SPECS.md:60-155`. All sizes below are the mockups' (header 56, bar button 50, in-card button 44, chips 24/36, radii 8/10/15, spacing 5/10/15/20).

### 2.0 One rule for the whole page: the stage decides, the theme only hides

A new `orderStages.ts` (business version of the driver's `OrderDetails/orderStages.ts`, which is driver-trip based and cannot be copied) maps `{status, delivery_type}` to a **stage**: `new` (0), `scheduled` (13), `preparing` (7, 14; type 9 reservation too), `ready_handoff` (4/20/21 with a non-delivery type), `with_driver` (delivery types 1/7 with 3, 4, 8, 9, 18, 19, 22-26), `done` (1, 11, 15), `closed` (2, 5, 6, 10, 12, 16, 17; **not in the mockups**, drawn as `done` with a red chip and, when present, the `reject_reason` as a note). The stage chooses which sections exist **and their order** (OrderPreparing puts the time card first, OrderDone the review card first, OrderDelivery the driver card first), as the driver's decision of 2026-11-18 did ("the order's stage orders the stops, not the theme"). The theme can hide hideable sections; it cannot reorder them (see 4).

### 2.1 Shell: top bar, chips row, bottom bar (all stages)

| Piece | Mockup | New / ported |
|---|---|---|
| Top bar | back arrow 44, title `Order #1053` 20/700, subtitle `Luna Pizza . placed 12:29 PM` 12 grey, **print** icon (44) and **more** (three dots, 44). Copy, map and messages leave the bar | Port `D/shared/ONavbar` + header slots. Title keeps the `change_order_id` rule (external id) and `t('ORDER')`. Subtitle: store name + the stage's timestamp ("placed", "accepted", "ready", "picked up", "delivered") from `order.history` (see 3) with `created_at` as fallback. Print hidden in Pending today; the mockup shows it in Pending (explicit change, 3) |
| Chips row | status chip (24, fill by group: Pending `#FFC700`/black, in progress blue, completed green, cancelled red per `DESIGN-KIT.md`) + delivery-type chip (grey) + right slot: `Waiting 00:42` (Pending, clock icon, `#6B5300`), `Waiting 04:10` (Ready), `Took 28 min` (Done) | `OBadge` ported from `D/shared/OBadge.tsx` + `order_status` mapping shared with area 3. The status label of 4 becomes "Ready for pickup" everywhere (list says it already; detail/copy/ticket say "Preparation Completed") |
| Bottom bar | `border-top` line, padding `10 20 20`, **side by side**: Pending `Reject` (outline, danger, flex 1) + `Accept` (success, flex 2); Preparing one `Mark ready for pickup` (success, 50); Ready (non-delivery) `Not picked up` (outline danger, flex 1) + `Picked up` (success, flex 2); Done `Print ticket` (outline, printer icon); Delivery none | Rewrite `FloatingButton` from `D/FloatingButton/index.tsx` (driver's bar is a *stack*, first button reject over accept; the business bar is a *row* with weights 1:2 and an outline reject). New theme keys `bottom_bar.base.layout` (`row`) and `bottom_bar.slots.reject.appearance = outline`, `bottom_bar.base.weights` (see 4). Keep `useReportBottomBar`, `inline`, `blocked`, `loading` props, and port `useFloatingButtonInset` (the business `FloatingButton` lacks it) |

### 2.2 OrderPending (stage `new`, status 0)

Tree: `Header` -> `ChipsRow` -> **section list**: `customer` card (initials avatar 44, name 14/600, phone 12, **call** and **message** icon buttons 44 `tel:` / `OrderMessage`, line, address with pin icon + "3.4 km from the store . Deliver ASAP") -> `note` (alert `warning`: "Order note" + `order.comment`) -> `products` card (`3 products . 4 items`, lines `1 x` accent + name 14/600 + options line 12 + note chip + price, divider between) -> `payment` card (rows Subtotal / Delivery fee / Tax / Driver tip / Discount 12 grey, line, Total 14/600 + "Card ending ####" + `Paid` chip + amount 18/600) -> `more_details` folded row (56, chevron) -> bottom bar. Rewritten: `Business.tsx`, `OrderHeaderComponent.tsx`, `OrderContentComponent.tsx`; **ported** from driver-theming: `OrderBill.tsx` (13 bill rows, compact variant), `partyContact.ts` (+ add the business flag `hide_customer_contact_business_app`), `CollapsibleTitle.tsx`, `OrderPair.tsx`, `ProductLines.tsx`, `OrderDetailsSkeleton`, `sections.tsx` (`withDividers`), `useOpenContact`, `useUnreadMessagesOfOrder`. Primitives (from `D/shared`): `OCard, OBadge, OAvatar, OListRow, OText, OButton, ONotice, ODivider, Icon, OLink, SkeletonBone`.
Conditions that must keep: contact flag hides name/phone/message-with-name; bill hidden when total 0; `change_order_id`; `delosi` comment colour (project hard-code; recommend dropping, see 7); products block only when products or comment exist (`OC/:448`).

### 2.3 Accept sheet (SheetAccept)

`OBottomPopup keyboardAware` (port `D/shared/OBottomPopup.tsx`, `title`+close X 44) with `Accept order #1053`; label "Preparation time" 14/600 + "The customer and the driver see this estimate." 12; **five preset chips** `10 15 20 30 45` (36 high, pill, selected tint; one selected, `aria-pressed`); a surface box with a **`-5` / `+5` stepper** (44 buttons) and the figure `20 min` 28/700 over `Ready by 12:50 PM` 12 grey; an info line with a printer icon "The ticket prints on Kitchen when you accept." (only when `autoPrintEnabled` and a printer is saved; the printer name comes from the printers list, area 7); primary-success button 50 `Accept . 20 min`.

- **Which field carries the time:** `prepared_in`, integer minutes (`AR/:237`, api-core validation `integer|max:2147483647`, `OrderController.php:212`). The sheet sends exactly `{status: 7, prepared_in: minutes, id}` as today (`acceptByBusiness`). "Ready by HH:MM" is **computed on the client** = now + minutes (a label, not stored).
- **Default / allowed values: no server config exists.** Searched api-core (`config`, `app`, migrations) for preparation/default-ETA keys: nothing for the business app (only logistic's `delivery_datetime+preparation_time`, `LogisticHelper.php:115`). So presets, default (the mockup preselects 20) and the 5-minute step are **app constants** (or theme/app config). Candidate source for the default: the store's own `business.pickup_time` / `business.delivery_time` strings (order payload carries them, `OrderController.php:1196-1198`; format "HH:MM", not verified) - recommended as a *hint only*, because the format is not verified. Minimum: today 0 is accepted; recommend min 5 and max 180 (new rule, owner decides, 7).
- "Accepting is never held or confirmed": one tap on the green button. The tablet/group path gets the same sheet (title with the group, see 2.10).
- Port: `D/hooks/useAcceptSheet.tsx`, `useGroupStatusUpdate.tsx`, `AcceptOrRejectOrder/{groupOrders.ts,driverActions.ts,BlockLabel.tsx,presentation.ts,isAcceptOrRejectInFlight.ts}`; `OStepper` (ported) needs a new `step` prop (driver's steps by 1: `OStepper.tsx:15-60`) and a `label` ("20 min") which it already has. The driver's dial (`sheetDial`, `useRevealField`) is **not** used; the `TimeField` hidden-input hack and the 1-digit bug disappear with it.
- Offline: keep `applyOffAction/registerOffOrder` branch (`AR/:310-326`) inside the new sheet; copy `useAcceptSheet`'s `onClosed`/`reset` behaviour; the sheet stays open on failure with an inline error (the driver's `useGroupStatusUpdate`).

### 2.4 Reject sheet (SheetReject)

Title `Reject order #1053`; label "Why are you rejecting it?" + "The customer gets a notification with this reason."; wrapped filter chips (36): `Item out of stock` (preselected), `Too busy right now`, `Closing soon`, `Can't deliver to this address`, `Other`; textarea 90 "Add a note (optional)"; soft button 44 with phone icon `Call James first` (hidden when the contact flag is on or no phone); "This can't be undone."; destructive 50 `Reject order`.

- **Does the API or a config give reasons? No.** `reject_reason` is a free `string` column (`min:1|max:255`, `OrderController.php:218,1804-1806`); there is no reasons table or config in api-core (grep `reject_reasons|rejection_reasons` = 0). The driver app's list is a client list in `utils/orderCommentList` keyed `REJECT_REASON_*` (`utils/index.tsx:775-832`). So the preset list is **app-only** and goes through i18n.
- **What the API accepts and what the customer sees:** `reject_reason` (stored on the order) and `reasons` / `comment` (copied into the status-change order message as `change.comment` for statuses [2,4,5,6,10,12,14], `OrderController.php:3762-3764`; those messages are visible to levels 0,2,3,4, `:3800`). Today the app sends only `reject_reason`, so no comment is attached to the status-5 message. Proposed body: `{status: 5, reject_reason: <preset label, or the note for Other>, reasons: <note>, id}`. Both fields were not exercised; `reject_reason` must be non-empty (send a label). Whether the customer apps show `reject_reason` or the message comment was not verified.
- Guard: the sheet is its own confirmation (driver decision "nothing on top of a step that already has its own submit"). Required: one chip; for `Other` the note is required (today the free text is required; recommend keeping that for `Other`).
- Ported: the driver's reason form (`AR` `showTextArea` branch in `D/`), `FilterChip`, `OTextarea`, `ChoiceRow`, `FieldError`. Customer call: `useOpenContact`, formatting through the same function instead of the `(abc) rest` hack.

### 2.5 OrderPreparing (stage `preparing`)

Order: chips (`Accepted by business` + `Delivery`) -> **time card** (surface `#F8F9FA`, no border, radius 10, padding 15: `Ready in` 12 / `08:12` 28/700 / `Promised for 12:38 PM` 12; soft button 44 `Adjust time`; under it a 5 px track `#E9ECEF` with a `#00884F` fill at 60 %) -> **driver card** (tile 40, `Driver` 12 / `Not assigned yet` 14/600, soft button `Assign`; only delivery 1/7 and assignment enabled; for delivery 1/7 without manual assignment show the assigned driver read-only when there is one, hide otherwise) -> `customer` card -> **products with checklist** (`2 products . 2 items`, `1 of 2 done`; a 44 x 44 checkbox with a 24 square in front of each line, checked = success fill + white check + strikethrough grey text) -> folded total row (56: `Total` / `Card ending 1881` + `Paid` + `$24.80`) -> folded `More details` -> bar `Mark ready for pickup` (success 50, status 4, one tap, no confirmation as today).
For a reservation in status 7 the bar keeps today's pair `Customer not arrived` / `Customer arrived` (no mockup): outline-danger + success, same row layout; status 14 (Order not ready) uses the same screen with chip "Order not ready" and the same bar.
Data: `ready in` = `accepted_at + prepared_in - now` (3); the progress fill = elapsed / `prepared_in`; both app-only (no field gives them).
New pieces: `PrepTimeCard`, `ProgressBar` (track/fill, theme keys), `ProductCheckLine` (extends `ProductLines`), `OCheckbox` ported from `D/shared/OCheckbox.tsx`.

### 2.6 Adjust-time sheet (SheetPrepTime)

Title `Adjust preparation time`; line `Now: ready in 08:12 . promised for 12:38 PM`; four equal chips `-5 min`, `+5 min` (selected), `+10 min`, `+15 min`; centred surface box `12:43 PM` 28/700 + `New promised time`; info line "The customer and the driver will be notified."; primary 50 `Update time`.

- **Is there an endpoint that changes the preparation time of an accepted order? Yes, the same `PUT /orders/:id` with `{prepared_in}` and no status.** `OrderController.php:1760-1762`: `prepared_in` is applied for `$is_administrator || $is_business_manager` whenever it differs from the stored value, regardless of status; the generic field diff (`$order->getFieldsChanges($order_update)`, `:2570`) records a history change and a system order message to levels 0,2,3,4 (`:3790-3806`); the shared controller already expects it ("editing the time on an already-accepted order", `CTL/:238-242,244-249`) and sends the courtesy chat message with the new minutes. The business chat already filters a `prepared_in` change (`Chat/index.tsx:51`). **So "adjust time" works today without backend.** The UI should send **the new total minutes** (`prepared_in = old prepared_in + delta`), since `prepared_in` is "minutes from acceptance" (an assumption: its anchor is the accept time; `LogisticHelper` uses it with `delivery_datetime`, not verified).
- Caveats: the mockup's "customer and driver will be notified" is true as an order message; a push for it was not checked. The `-5` chip must be disabled when the result would be less than the minutes already elapsed (no rule exists server side). `handleChangeOrderStatus(undefined, {prepared_in, id})` is awkward (the body `{prepared_in}` has no status): call `handleChangeOrderStatus(order.status, {prepared_in, id})`, which sends the body as is (`CTL/:297`) - note `bodyToSend` with keys is sent unmodified, so the status is not needed. Not offline-queued (`evt_off_change_order_status` queues status bodies; whether it accepts a body with no status was not checked).

### 2.7 Assign-driver sheet (SheetDriver)

Title `Assign driver`; radio rows of 56 (initials disc 40, name, `Available . 0.8 km away` / `Available . 2.1 km away . 1 active order` / `Not available` greyed without radio), a last row `No driver / Leave it unassigned`; primary 50 `Assign Omar H.`.

- Entry conditions today kept: status 7 or 4, delivery 1/7, `isManualDriverAssignmentEnabled` (2.5 shows the card; the sheet is opened from it). `isFetchDrivers` unchanged.
- Endpoint today: `GET /controls/orders/:id` -> `drivers[]` (`ControlsController.php:352-448`), assignment `PUT /orders/:id {driver_id}` (null to unassign), with server checks (driver level 4, in an enabled driver group of the store, not `busy`: `OrderController.php:1707-1738`). **Works today.** Data for the mockup rows: `available`, `busy`, `location`, `last_location_at`, `assigned_orders_count` all come in the controls response; "0.8 km away" = client-side distance from `driver.location` to the store (`order.business.location`), a new computation; "active order" count = `assigned_orders_count` (counts orders in progress statuses, `:441-446`). Drivers of a driver *company* are returned in `driver_companies` and ignored by the UI today.
- Port: `ChoiceRow listed` (radio rows), `OAvatar`, `OBottomPopup`; replace `react-native-country-picker-modal`. Sort available first, then by distance (the current comparator is incomplete).
- Error: inline in the sheet (needs the 2.9 controller change; today an assignment failure also replaces the screen).

### 2.8 OrderReadyPickup (stage `ready_handoff`: 4/20/21, non-delivery)

Chips (`Ready for pickup` + `Pickup` + `Waiting 04:10`) -> **hand-off card** (tint `#E9F2FE`, no border: `Hand off to` 12 `#1862C5`/600, customer name 18/600, `Ask for order #1046` 12, call and message buttons 44 white) -> info alert "We told the customer the order is ready at 12:21 PM." (the courtesy message the customer gets; today the customer gets a status-change message from the API; the time is the ready timestamp) -> products (read-only, no checklist) -> payment card -> folded More details -> bar `Not picked up` (outline destructive, -> 17) + `Picked up` (success, -> 15). Delivery types in status 4 show the `with_driver` screen (below) with the Assign card, since today status 4 + delivery has the assignment block and no bar.
Name hidden when the contact flag is on: show `Customer` as today.

### 2.9 Inline error with "Try again" instead of replacing the screen (OrderError)

Mockup: same page, after the chips an `ONotice danger` with icon: `Couldn't mark the order as ready` 14/600 + `Check your connection and try again. Nothing was changed.` 12 + an outline 44 `Try again` inside the notice; the page and the bar stay.
- **Today's blocker:** the UI hides the page while `error` is set (`B/:602`) and the controller never clears it (1.7). Recommended fix, in this order: (a) **additive** change in the submodule controller: set `error: null` (and `errorCodes: null`) when a status change/assignment starts or succeeds (`CTL/:309, 342-346, 401, 407`). It does not alter other apps' contract (they only read `error` after a failure) but the submodule is shared, so it is a coordinated PR (the driver app allowed a similar additive change in `UserFormDetails`, decision of 2026-11-18). (b) If (a) is not allowed: app-only workaround in `Business.tsx`: remember the error array identity before each attempt and treat an error as current only if it is a new array reference (the controller creates a new array on each failure: `CTL/:371`); keep `order` rendered whenever `order.id` exists.
- The notice names the *attempted action* (needs the UI to remember it: `lastAction`), "Try again" repeats the same call. A failure on first load (no order) keeps the full-screen `empty_state` but with the bar's back arrow and a "Try again" that calls `getOrder` (also exposed by the controller, `CTL/:818`).
- Sheets (accept, reject, adjust, assign) show the error **inside the sheet** (driver's `FieldError`/`orderError` props) and stay open: remove the `useEffect([loading])` that closes them on every `loading` flip (`B/:472-480`); close on success (`shouldCloseAcceptModalOnStatusChange` style from `D/OrderDetails/getOrderDetailsAcceptModalPlan.ts`).
- "Nothing was changed" is accurate for status changes (the controller only merges the order on success, `CTL/:342-346`) and for assignment (`Object.assign(order, result)` runs even on error, harmless but should be guarded).

### 2.10 Groups (accept/reject all) - not in the mockups

Today: the page `AcceptOrRejectOrder` with a function in `route.params` and group buttons on list cards (area 3). Target: remove the page and its route; the list opens the **same sheets** over the list with `useAcceptSheet` + `useGroupStatusUpdate` and the group title, as the driver did (decision 2026-11-19 "A group's actions speak for the group"). Fix the broken `notReady` path by giving `actions` entries (`orderNotReady`, `pickupFailed`...) the way `D/AcceptOrRejectOrder/driverActions.ts` does. Coordinate with area 3 (it owns `PreviousOrders`).

### 2.11 Preparation checklist

`2 products . 2 items` + `1 of 2 done`; a checkbox before each product line. **Local state only today**: there is no field for it in the UI and no use of order-product state; component state vanishes on navigation. Option space: (a) in-memory state (lost on leaving the screen), (b) AsyncStorage keyed by order id with cleanup (survives restarts, per device), (c) server: `PUT /orders/:order_id/products/:product_id {status: int}` exists (`OrderProductController.php:22,42`, route `api.php:1143-1145`, `auth:0,2`, broadcasts `EmitUpdateOrder`), but the integer's meaning is undocumented in what I read, so using it as "prepared" would need the backend owner's decision (and the shared socket event would update other devices). Recommended: (b) now, (c) later if the backend defines a value. Count figures ("1 of 2 done", product/item counts) are computed client-side.

### 2.12 OrderDelivery (stage `with_driver`)

Chips (`Driver on way` + `Delivery`) -> **driver card** (initials disc, `Omar H.`, `Driver . about 6 min from the customer`, call + message buttons; mini map block 140 high radius 10 with the route; soft button 44 full width `Track on map`) -> **vertical timeline card** (4 steps with dot and time: Accepted / Ready / Picked up by driver / On the way to the customer = accent dot, 600, no time) -> `customer` card -> folded products (56) -> folded total (56) -> info alert "The driver completes this order. We'll let you know when it's delivered." No bar.
- Driver data: `order.driver` (name, cellphone, photo) and the controller's `driverLocation` (socket `tracking_driver`). Status 22 (looking for driver), 24, 25 (driver company) and 4 without a driver: the driver card shows `Not assigned yet` and the `Assign` button when allowed.
- Timeline: **from `order.history`** (status changes with minute-truncated timestamps, `OrderController.php:3733-3738`; per-status times are not otherwise exposed). The steps map status 7 -> Accepted, 4 -> Ready, 9 -> Picked up by driver, 23/19/26 -> current. Timezone of the stamps was not verified (3).
- "about 6 min from the customer": **no ETA field is live** (`eta_drive_time`, `eta_time`, `eta_preparation_time` are order-creation figures, `OrderController.php:1554,5589-5604`). Compute client-side from the straight line driver -> customer at a nominal speed, label "about"; precise ETA needs backend (3).
- Mini map: the mockup draws a decorative svg; the real equivalent is a non-interactive `react-native-maps` view with three disc markers, or no map at all (7).

### 2.13 OrderDone (stage `done`: 1, 11, 15; plus `closed`)

Chips (`Completed` green + `Delivery` + `Took 28 min`) -> **review card** (`How was this customer?` + `Your review helps other stores.` + five 44 star buttons + soft `Write a review` -> Review) shown when `!order.user_review && order.customer_id` and the status is in the review list (today `[1,2,5,6,10,11,12,16,17]`; the mockup is a status 1, keep the rule and add 15 - decision for the owner, 7) -> `customer` card without message button (chat is closed for ended orders) -> products card open -> full bill card (Subtotal, Delivery fee, Tax, Driver tip, Discount, Total, `Card ending`, `Paid`) -> folded `Order timeline` row (`Accepted 11:22 AM . Ready 11:35 AM . Delivered 11:48 AM`) -> bar outline `Print ticket` -> TicketPreview.
For `closed` (rejected/cancelled/failed) not in the mockups: same cards with a red chip and a note with `order.reject_reason` when present (data exists on the order; to confirm it is returned, 9).

### 2.14 Customer card contacts (all stages)

Call (`tel:` with `+country_phone_code` as today, `OC/:359-380`) and message (`OrderMessage`, with an unread count badge from `useUnreadMessagesOfOrder`) become 44 icon buttons of the card (they replace the chat icon of the old bar and the underlined links). Chat closed for ended statuses [1,2,5,6,10,11,12,15,16,17] (the chat's rule, `Chat`) -> hide the message button there as the mockup does. The contact flag hides both. Address line opens maps (`useOpenContact`).

### 2.15 "More actions" sheet (SheetOrderMore)

Title `Order #1053`; list rows 56 with a 40 tile icon, no chevron: `Print ticket` (`Kitchen . Star TSP100` -> TicketPreview, area 7), `Copy order details` (today's text from `handleCopyClipboard`, same toast), `View on map` (-> MapTracking), `Message customer` (-> OrderMessage), `Share as PDF` (area 7: `OrderSummary` has the PDF/print code; TicketPreview has "Share PDF").
Which rows exist per state: Print and Share only where today's print rule allows (the mockup shows Print for Pending; see 3); Message hidden for ended orders and with the contact flag; View on map when any coordinate exists (also a guard against the empty-locations crash). Port `OListRow`, `OBottomPopup`.

### 2.16 MapTracking (full-screen map) and where the map is opened

Layout: full-screen map, top-left round white 44 back button, disc markers (store white + store icon, driver `#1E72E3`, customer white + pin `#DA3453`, 44 with white ring and `0 1px 4px` shadow), route line 4 px accent, bottom white card (radius 15 top, padding 20, gap 15): `Order #1044` 12 grey / `Omar H. is about 6 min from the customer` 16/600 / two 44 buttons `Call driver` (soft, icon) and `Open in Maps` (outline).
Rewrite `GoogleMap` (keep the controller wiring, `locations`, `driverLocation`, geocoder only for `readOnly={false}` paths that no longer exist: the map here is read-only, so drop `react-native-geocoding`, `Region`, `maxLimitLocation` etc.). Port from driver-theming: `MapView/MapMarker`, `DriverMap/DestinationCard` (pattern; its own call/maps buttons), `OFab` zoom buttons if `map.zoom_controls`, the maps chooser as a sheet (`D/` "Show in other maps" sheet) replacing `RenderMarker`'s callout and `FastImage`. Delete `DriverMap`, `MapView` (dead).
Behaviour change: the in-map **Accept** bar for status 0 (`B/:490-492,827-829`) is not in the mockup (map has no bar); `handleViewActionOrder` from the map goes away. Callers: `B/:814-835` (details) and `PreviousOrders/index.tsx:520` (group, area 3).
The map is reached from `More -> View on map`, from `Track on map` (with-driver stage) and from the list group's "Track real time position" (area 3).

### 2.17 Review (Review.dc)

Header `Review customer` / `Order #1041 . Nora Ali`; label `How was your experience?`; a row of 5 equal buttons (44, radius 8, 1 px `#E9ECEF`, text 12: Terrible, Bad, Okay, Good, Great; selected tint `#E9F2FE`/`#1862C5`/600); label `What went well?` + wrapped chips; `Anything to add? (optional)` textarea 90; bar `Send review`. Port `D/ReviewCustomer` (283 lines: `usePageSections`, `FilterChip`, `OTextarea`, `OAvatar`, `KeyboardScreen`, the driver's bar) and re-skin the rating from the driver's *five segments* to *five labelled buttons* (new `rating_scale` appearance `buttons`; driver's scale is a track with labels). Business-only: customer name hidden by the flag, and "Rate with the stars in OrderDone" (stars tap -> opens Review with that level preselected: app-only, works with the controller's `handleChangeQualification`/`reviewState`).
Controller contract: `POST /users/:customer_id/user_reviews {qualification, comment, order_id, user_id}`, `qualification` 1-5 (`handleChangeQualification` ignores 0, `ReviewCustomer/index.js:62-64`), quick-comment strings from `reviewCommentList`. The mockup's chip set "Good communication / Followed instructions / Friendly / On time" differs from `reviewCommentList` level 4 ("... Didn't follow instructions / Rude / Not on-time" listed under "Tell us more"); keep the list per level, change only the look (7).
Success today: toast "Orders successfully reviewed"/"Thank you, Customer review successfully submitted!" (controller) then `onClose`; keep.

---------------------------------------------------------------------------

## 3. Behaviour kept / changed

"Works today" = no new logic. "App-only new logic" = client code, no server change. "Needs backend" = the server must provide or confirm something. Evidence in the right column.

| # | Behaviour | Status | Evidence / note |
|---|---|---|---|
| 1 | Accept = one tap, `{status:7, prepared_in}`, courtesy ETA message to the customer, offline queue, reservation alert, auto-print | **kept** | `AR/:235-238,310-326`, `CTL/:236-280,347-351` |
| 2 | Presets 10/15/20/30/45 and +/-5 stepper, "Ready by HH:MM", min/max | **App-only new logic** (replaces the keypad dial and its 1-digit bug) | no server config for presets/default/limits (api-core search); `prepared_in` integer `max:2147483647` (`OrderController.php:212`) |
| 3 | Accept button name "Change preparation time" on first accept | **changed**: "Accept . N min" | mockup; inventory `pages/OrderDetails.tsx:30` |
| 4 | Adjust time after accepting (SheetPrepTime) | **Works today** (API) + app-only UI | `PUT orders/:id {prepared_in}` allowed to admin/business manager at any status, `OrderController.php:1760-1762`; message to customer by the controller `CTL/:238-249`; generic change record `:2570`, `:3790-3806` |
| 5 | Reject with free text required | **changed**: preset reason chip required + optional note; `Other` needs a note (recommended) | mockup; `reject_reason` free string (`OrderController.php:218`) |
| 6 | Predefined reject reasons | **App-only new logic** (list + i18n); the API takes any string up to 255; no list or config on the server | api-core grep 0 results |
| 7 | Reason shown to the customer | send `reasons` along with `reject_reason` so the status-5 message carries it | `OrderController.php:3762-3764`; **needs verification** that customer apps display it; today only `reject_reason` is sent |
| 8 | Reject guarded | **kept** (the sheet is the confirmation); `Not picked up` / `Customer not arrived` (-> 17, cancel-type) become guarded | brief "dangerous actions are guarded"; today they fire on one tap (screenshot 62); dialog or hold = open question 7.4 |
| 9 | Ready for pickup, Picked up, Customer arrived | **kept** one tap; owner decides if "Picked up" is held | 7.4 |
| 10 | Assign driver (conditions: 7/4, delivery 1/7, config + level) | **Works today**; new sheet UI | `isManualDriverAssignmentEnabled.ts`, `CTL/:398-420`, `ControlsController.php:433-448` |
| 11 | Driver distance, availability and active-order count in the sheet | distance **app-only** (client haversine from `driver.location`); availability and count **work today** (`available`, `busy`, `assigned_orders_count`) | controls payload |
| 12 | Preparation checklist | **App-only** (local state, or AsyncStorage per order); server per-line `status` exists but is undefined | `OrderProductController.php:22,42`; 2.11 |
| 13 | "Ready in mm:ss", "Promised for", progress bar | **App-only new logic**, minute precision: base = the time the order reached status 7 from `order.history` (`created_at` truncated to the minute, `OrderController.php:3733-3738`); `history` is absent for lists above 100 orders (`:813-822`) and the controller does not refetch (`CTL/:634`) -> fall back to `updated_at`/`created_at`; timezone of the stamp unverified. Better with backend: a UTC `accepted_at` or `ready_at` | |
| 14 | "Waiting 00:42", "Took 28 min", subtitle "placed/accepted/ready/delivered HH:MM", order timeline | **App-only** from `history` + `created_at`; same caveats | |
| 15 | Driver ETA "about 6 min from the customer" | **App-only approximation** (distance / nominal speed) or **needs backend** for a real ETA; no live ETA field | `eta_*` fields are creation-time (`OrderController.php:5589-5604`) |
| 16 | Card ending #### and `Paid` chip | **Needs backend / verification**: no card field was found; `payment_events[].data` (object) may hold gateway data; `Paid` can be derived from a `payment` event (`OH/:55`), not verified for cash orders | `OrderPaymentEvent.php:28,44` |
| 17 | Inline error + Try again; order stays visible | **App-only** with workaround (b) or **additive submodule change** (a) | `CTL/:309,342-346,371,376` |
| 18 | Copy and print hidden in Pending | **changed**: the mockup shows Print in Pending and Copy in "More" for Pending (explicit) | `B/:615` vs `OrderPending.dc` |
| 19 | Copy / print / map / messages as header icons | **changed**: print + More in the header; copy, map, message in the More sheet and the customer card | mockup |
| 20 | Unread dot on the chat icon | **changed**: count badge on the card's message button (and optionally on More) | driver `useUnreadMessagesOfOrder`; mockup shows none (7.5) |
| 21 | Accept inside the map (Pending) | **removed** (map has no bar) | `B/:490-492` |
| 22 | Business / Customer details collapsed accordions | **changed**: customer always visible in a card; store + custom fields + external id inside "More details" (folded) | mockups |
| 23 | Order types of header: catering pickup shown as "Delivery" | **fixed** (type 8 label) | `OH/:99-113` |
| 24 | Review button for [1,2,5,6,10,11,12,16,17] | **kept**; 15 left out today | `OC/:74`; 7.7 |
| 25 | Group accept/reject as a route page | **changed**: sheet over the list (area 3 owns the caller) | 2.10 |
| 26 | `OrderSummary` fallback when no printer is saved | **open** (area 7) | 7.6 |
| 27 | Status label for 4: "Preparation Completed" in the detail | **changed** to "Ready for pickup" | mockup chip; `utils/index.tsx:466` |
| 28 | Tablet detail panel | **changed** (2.18/6) | |
| 29 | `hide_customer_contact_business_app`, `change_order_id`, `distance_unit`, `reject_orders_enabled` (groups), `order_status_regression_validation_enabled`, `allow_save_changes_offline`, `assign_driver_enabled`, `store_app_manual_driver_assignment_enabled`, pre-orders (13: no bar), reservations (type 9), catering 7/8, custom fields, spot/vehicle | **kept** exactly | |

---------------------------------------------------------------------------

## 4. Proposed theme pieces

### 4.1 Page `order_details` (store app)

Same page name as the driver (`order_details`), different section set. Order is **chosen by the stage** (2.0); the theme **hides** only. Sections (`fixed` = not hideable):

| Section | Stage(s) | Hideable | Note |
|---|---|---|---|
| `header` | all | fixed | title, subtitle, print/more |
| `status` (chips row) | all | fixed | status, type, waiting/took figure |
| `error` | state | state | the notice, never a theme piece |
| `prep_time` | preparing | yes | the time card and its progress |
| `handoff` | ready_handoff | yes | tint card |
| `driver` | preparing, ready (delivery), with_driver | yes (assignment rules unchanged: config and level decide the *button*) | |
| `customer` | all | fixed (contact flag hides pieces) | |
| `note` | all (when `order.comment`) | yes | |
| `products` | all | fixed | checklist inside it in `preparing` only |
| `bill` (payment card / folded total) | all | yes | hidden by total 0 as today |
| `timeline` | with_driver (card), done (folded) | yes | |
| `review` | done/closed | yes | |
| `more_details` | all | yes | store, external id, custom fields, spot, vehicle, reservation, created at |
| `actions` | all | fixed | bottom bar |

The `review` page (Review.dc): `customer`, `rating` (fixed), `quick_comments`, `comment`, `send` (fixed), same names as the driver's.

### 4.2 Visibility keys

Reused from the driver (same names and meaning): `confirmation.order.copy`, `confirmation.order.directions` (M) (now: "View on map" row and "Track on map"), `confirmation.order.messages` (the message buttons and row), `confirmation.order.type`, `confirmation.order.date`, `confirmation.order.eta` ("Deliver ASAP / placed" line), `confirmation.order.total`, `confirmation.order.payments`, `confirmation.business.email`, `confirmation.business.phone`, `confirmation.customer.email`, `confirmation.customer.phone` (M), `confirmation.products.options`, `map.zoom_controls`, `map.other_maps`, `map.distance_bar`.
New for the store app (proposed names): `confirmation.order.print` (header print + More row), `confirmation.order.checklist` (preparation checkboxes), `confirmation.order.timeline` (card and folded row), `confirmation.order.countdown` (Ready-in figure and progress), `confirmation.order.share_pdf` (More row), `map.mini_map` (the mini map of the driver card), `review.quick_rating` (star row of OrderDone).
Not theme keys (server/config or flow decide): accept/reject/ready buttons, assign driver (config + level), reject reasons list, inline notices.

### 4.3 Schema components beyond the driver's `product.schema.json`

(Driver already has: `order_details` (slots `copy`, `messages`, `review`, `stop_map`...), `bottom_bar`, `sheet`, `checkbox`, `stepper`, `alert`, `badge`, `chip`, `rating_scale`, `review_form`, `bill`, `card`, `list_row`, `map_marker`, `header`, `avatar`, `skeleton`, `empty_state`, `timer`, `order_request`.)
- `bottom_bar.base.layout` (`stack` | `row`), `bottom_bar.base.weights` (e.g. `[1,2]`), `bottom_bar.slots.reject.appearance` default `outline` (store app) - the driver's stack default stays for the driver product (same schema family; this app's own schema has `row`).
- `card.variants.tint` (hand-off card, time card surface) - `card` has `background` only; add `variants` `surface` (grey, no border) and `tint` (`#E9F2FE`).
- `progress` (new component): `track`, `fill`, `height` (5), `radius` (full).
- `timeline` (new component): `dot_size`, `line_color`, `done_color`, `current_color`, `time_text`.
- `rating_scale.appearances.buttons` (5 labelled buttons, selected tint) beside the driver's `segments`.
- `map_marker.variants.store | driver | customer` (disc fill and glyph colour per role) - driver has a single `base.color`.
- `order_details.slots.call` (call button look) beside `messages`.
- `chip` size 36 filter exists; add nothing. `badge.variants` per order group (Pending `#FFC700` black, in-progress blue, completed green, cancelled red) - area 3 defines them for the list; reuse.
- `alert.variants.warning` (`#FFF4CC`/`#6B5300`) exists; add an `action` slot (button inside, "Try again") to `ONotice`.
Also needed in primitives (not schema): `OStepper.step`, `OBottomPopup` ported, `OCheckbox` ported.

---------------------------------------------------------------------------

## 5. New i18n keys (key + English fallback); reuse = existing in `i18n/translations.json`

Existing and reused: `ACCEPT`, `REJECT`, `TRY_AGAIN` ("Try Again"), `CLOSE`, `PRINT_TICKET` ("Print ticket"), `NOT_AVAILABLE`, `SEND_REVIEW`, `REVIEW_CUSTOMER`, `ORDER`, `PRODUCTS`, `CUSTOMER`, `ACCEPTED_BY_BUSINESS`, `ASSIGN_DRIVER`, `UNASSIGN_DRIVER`, `HOURS`, `MINUTES`, `SHOW_IN_OTHER_MAPS`, `GO_BACK`, `COMMENTS`, `ORDER_DETAILS`, `NETWORK_ERROR`, `REJECT_REASON_OTHER`, `TERRIBLE/BAD/OKAY/GOOD/GREAT`, `ORDER_STATUS_REGRESSION_DESCRIPTION`. **Present in the driver catalog, not here, port as they are:** `CONFIRM`, `REASON_REQUIRED`, `REJECT_ORDER` ("Reject order"), `ACCEPT_ORDER` ("Accept order"), `ORDER_NO_SHORT` ("No."), `MORE_DETAILS`, `THE_CHANGE_WAS_NOT_SAVED` ("The change was not saved. Try again."), `HOLD_TO_CONFIRM`, `ORDERS_NOT_CHANGED`, `DELIVERY_NUMBER`, `VIEW_ORDERS`, `MAP`, `CALL`.

New (proposed key -> fallback):
`ORDER_NUMBER_HASH` -> `Order #_NUMBER_`; `ORDER_SUBTITLE_PLACED` -> `_STORE_ . placed _TIME_`; `ORDER_SUBTITLE_ACCEPTED` -> `_STORE_ . accepted _TIME_`; `ORDER_SUBTITLE_READY` -> `_STORE_ . ready _TIME_`; `ORDER_SUBTITLE_PICKED_UP` -> `_STORE_ . picked up _TIME_`; `ORDER_SUBTITLE_DELIVERED` -> `_STORE_ . delivered _TIME_`; `WAITING_TIME` -> `Waiting _TIME_`; `TOOK_MINUTES` -> `Took _MIN_ min`;
Accept: `PREPARATION_TIME` (label) -> `Preparation time`; `PREPARATION_TIME_DESCRIPTION` -> `The customer and the driver see this estimate.`; `PREPARATION_TIME_PRESETS` (aria) -> `Preparation time presets`; `MINUTES_LESS` -> `5 minutes less`; `MINUTES_MORE` -> `5 minutes more`; `MINUTES_SHORT` -> `_MIN_ min`; `READY_BY_TIME` -> `Ready by _TIME_`; `TICKET_PRINTS_ON_ACCEPT` -> `The ticket prints on _PRINTER_ when you accept.`; `ACCEPT_WITH_TIME` -> `Accept . _MIN_ min`;
Reject: `WHY_ARE_YOU_REJECTING` -> `Why are you rejecting it?`; `REJECT_CUSTOMER_NOTIFIED` -> `The customer gets a notification with this reason.`; `REJECT_REASON_OUT_OF_STOCK` -> `Item out of stock`; `REJECT_REASON_TOO_BUSY` -> `Too busy right now`; `REJECT_REASON_CLOSING_SOON` -> `Closing soon`; `REJECT_REASON_CANNOT_DELIVER` -> `Can't deliver to this address`; `ADD_A_NOTE_OPTIONAL` -> `Add a note (optional)`; `TELL_THE_CUSTOMER_WHAT_HAPPENED` -> `Tell the customer what happened`; `CALL_CUSTOMER_FIRST` -> `Call _NAME_ first`; `CANT_BE_UNDONE` -> `This can't be undone.`; `REJECT_ORDER_NUMBER` -> `Reject order #_NUMBER_`; `ACCEPT_ORDER_NUMBER` -> `Accept order #_NUMBER_`;
Preparing/time: `READY_IN` -> `Ready in`; `PROMISED_FOR` -> `Promised for _TIME_`; `ADJUST_TIME` -> `Adjust time`; `ADJUST_PREPARATION_TIME` -> `Adjust preparation time`; `NOW_READY_IN` -> `Now: ready in _TIME_ . promised for _PROMISED_`; `NEW_PROMISED_TIME` -> `New promised time`; `CUSTOMER_AND_DRIVER_WILL_BE_NOTIFIED` -> `The customer and the driver will be notified.`; `UPDATE_TIME` -> `Update time`; `PLUS_MINUTES`/`MINUS_MINUTES` -> `+_MIN_ min` / `-_MIN_ min`; `MARK_READY_FOR_PICKUP` -> `Mark ready for pickup`;
Products: `PRODUCTS_AND_ITEMS` -> `_PRODUCTS_ products . _ITEMS_ items` (plural forms: `1 product`, `1 item`); `DONE_OF` -> `_DONE_ of _TOTAL_ done`; `ORDER_NOTE` -> `Order note`; `NOTE_PREFIX` -> `Note: _TEXT_`;
Driver: `DRIVER_NOT_ASSIGNED_YET` -> `Not assigned yet`; `ASSIGN` -> `Assign`; `ASSIGN_DRIVER_NAME` -> `Assign _NAME_`; `NO_DRIVER` -> `No driver`; `LEAVE_UNASSIGNED` -> `Leave it unassigned`; `DRIVER_AVAILABLE_AWAY` -> `Available . _DISTANCE_ away`; `DRIVER_ACTIVE_ORDERS` -> `_COUNT_ active order(s)`; `DRIVER_ABOUT_MIN_FROM_CUSTOMER` -> `_NAME_ is about _MIN_ min from the customer`; `DRIVER_COMPLETES_ORDER` -> `The driver completes this order. We'll let you know when it's delivered.`;
Ready/handoff: `HAND_OFF_TO` -> `Hand off to`; `ASK_FOR_ORDER` -> `Ask for order #_NUMBER_`; `CUSTOMER_TOLD_READY_AT` -> `We told the customer the order is ready at _TIME_.`; `NOT_PICKED_UP` -> `Not picked up`; `PICKED_UP` -> `Picked up`; `READY_FOR_PICKUP` exists;
Done/timeline: `HOW_WAS_THIS_CUSTOMER` -> `How was this customer?`; `YOUR_REVIEW_HELPS_OTHER_STORES` -> `Your review helps other stores.`; `WRITE_A_REVIEW` -> `Write a review`; `ORDER_TIMELINE` -> `Order timeline`; `TIMELINE_ACCEPTED` -> `Accepted`; `TIMELINE_READY` -> `Ready`; `TIMELINE_PICKED_UP_BY_DRIVER` -> `Picked up by driver`; `TIMELINE_ON_THE_WAY` -> `On the way to the customer`; `TIMELINE_DELIVERED` -> `Delivered`;
Customer card: `DISTANCE_FROM_STORE` -> `_DISTANCE_ from the store`; `DELIVER_ASAP` -> `Deliver ASAP`; `CALL_CUSTOMER` -> `Call customer`; `MESSAGE_CUSTOMER` -> `Message customer`; `CALL_DRIVER` -> `Call driver`; `MORE_ACTIONS` -> `More actions`; `MORE_DETAILS_HINT` -> `Store, external ID, custom fields`; `PAID` -> `Paid`; `CARD_ENDING` -> `Card ending _LAST4_`; 
More sheet: `COPY_ORDER_DETAILS` -> `Copy order details`; `VIEW_ON_MAP` -> `View on map`; `SHARE_AS_PDF` -> `Share as PDF`; `PRINT_TICKET_ON_PRINTER` -> `_PRINTER_`(subtitle); 
Map: `TRACK_ON_MAP` -> `Track on map`; `OPEN_IN_MAPS` -> `Open in Maps`;
Errors: `COULDNT_MARK_READY` -> `Couldn't mark the order as ready`; `COULDNT_ACCEPT_ORDER`, `COULDNT_REJECT_ORDER`, `COULDNT_UPDATE_TIME`, `COULDNT_ASSIGN_DRIVER` -> `Couldn't <action>`; `CHECK_CONNECTION_NOTHING_CHANGED` -> `Check your connection and try again. Nothing was changed.`;
Review: `HOW_WAS_YOUR_EXPERIENCE` -> `How was your experience?`; `WHAT_WENT_WELL` -> `What went well?`; `ANYTHING_TO_ADD_OPTIONAL` -> `Anything to add? (optional)`; `SEND_REVIEW_SHORT` -> `Send review` (mockup is lowercase 'review'; `SEND_REVIEW` exists: reuse).
Fix typos while touching: `PLACED_TO` ("Placed to" labels a delivery time), `DRIVER_THRU` vs `DRIVE_THRU`, `YOUR_CUSTOMER_WILL_RECEIVE_A_NOTIFICATION_ABOUT_THIS_ACTIONS`, `NOT_NUMBER` ("There's not phonenumber.").
Keys that go away: `CHANGE_PREPARATION_TIME`, `HOURS` (keep if used elsewhere), the dial strings, `CALL_YOUR_CUSTOMER_TO_RESOLVE_THE_ISSUE_AS_POLITELY_AS_POSSIBLE`, `MARK_THE_ORDER_AS_REJECTED`, `PLEASE_TYPE_YOUR_COMMENTS_IN_HERE` (verify use elsewhere before deleting).

---------------------------------------------------------------------------

## 6. Tablet

Today: `MyOrders.tsx:68` renders `OrdersListManager` when `(isPad || isTablet) && (landscape || width >= 950)`. Its right 70 % panel mounts `OrderDetailsBusiness isCustomView` for the selected order (`OrdersListManager/index.tsx:624-632`, `paddingBottom: 110`, `paddingHorizontal: 20`) with no top bar, a header row of icons, the absolute bottom bar (anchored where is unconfirmed), and props that differ from the stack page (no `isBusinessApp`, `orderId`, `notificationApp`). Portrait tablets get the phone layout stretched to full width. `OModal` has `centerOnLargeScreen`/`CARD_MAX_WIDTH 620` for the SLA modal only. The driver app has no tablet support (its decision: phone only), so there is nothing to port.

Proposal (the mockup `TabletBoard` is a 3-column board with no detail):
- **Landscape: the board stays, the detail opens as a right-hand panel** over it: width 440 (a token, `order_details.tablet.panel_width`), full height, left line, content = the same `order_details` page tree as the phone, bar pinned at the panel's bottom (`FloatingButton inline`/panel-relative), a back/close arrow at the panel's top-left instead of the stack arrow, scrim behind or no scrim (open question). The cards' own actions (Accept / Reject / Mark ready on a board card) stay one tap without opening the panel; a card tap opens the panel. Sheets (accept, reject...) open as centred dialogs max 480 wide (not full-width bottom sheets) inside the panel's window.
- **Portrait tablet:** the stack screen as on the phone, content and bar capped at 600 and centred (`max_width`), sheets capped at 480; no panel.
- One component for both: `OrderDetailsPage` takes `presentation: 'screen' | 'panel'`; the controller props the panel lacks (`isBusinessApp`, `notificationApp`, `orderId`) come from the same builder as the page (move the props object of `pages/OrderDetails.tsx:11-36` and `MyOrders.tsx:41-55` to one shared factory, in `src/pages`).
- The reservation alert, the unread count and `OrderMessage` navigation must work in the panel (today `navigation` is passed, so they do; `isBusinessApp` is the gap).
- Tablet sections that the phone keeps in sheets (More actions) can be a popover; recommended: same sheet as dialog.

---------------------------------------------------------------------------

## 7. Open questions for the owner (recommended first)

1. **Preparation-time rules.** Options: (a) presets 10/15/20/30/45, step 5, min 5, max 180, default 20, all app constants; (b) same but default from the store's `pickup_time`/`delivery_time` when readable; (c) let the project configure them (needs backend config). Recommended (a); (b) later.
2. **Reject reasons.** (a) client list of 5 reasons through i18n, `reject_reason` = label, `reasons` = note; (b) free text only as today; (c) server-defined reasons (needs backend). Recommended (a). Also: is `Other` allowed without a note? Recommended: no.
3. **Checklist persistence.** (a) per-device AsyncStorage keyed by order id; (b) in-memory; (c) server (`order_product.status`, backend must define the value). Recommended (a).
4. **Which steps are guarded** (the brief says dangerous ones are): (a) `Not picked up` / `Customer not arrived` (-> 17) ask a confirmation dialog; `Mark ready` and `Picked up` stay one tap; (b) hold the cancel-type ones, as the driver's irreversible steps; (c) everything but accept confirmed. Recommended (a).
5. **Unread messages.** (a) a count badge on the card's message button and on the "More" icon; (b) only on the card's message button; (c) none (mockups show none, but today's red dot would disappear). Recommended (b).
6. **`OrderSummary` page (print fallback without printers) and "Share as PDF".** (a) remove `OrderSummary`; the print entry always opens `TicketPreview` (works without printers, with "Share PDF") - area 7 must agree; (b) keep as is. Recommended (a); it also removes `react-native-html-to-pdf` and `react-native-print` from this area.
7. **Review rule for status 15** (completed pickup cannot be reviewed today). (a) add 15 to the list; (b) keep. Recommended (a). Chips of Review: keep per-level `reviewCommentList` (recommended) or take the mockup's single set.
8. **Mini map in "OrderDelivery".** (a) a real non-interactive map block with the 3 markers; (b) no map, just the card with `Track on map`. Recommended (a) if the map key is available, with (b) as fallback when no coordinates.
9. **Closed orders (2, 5, 6, 10, 12, 16, 17) and preorders (13)** have no mockup. Recommended: same screen as `done` (red chip, reason note) and for 13 the `new` layout without the bar plus the scheduled date; confirm or send a mockup.
10. **Inline error mechanism.** (a) additive fix in the shared controller (clear `error` on start/success); (b) app-only workaround; Recommended (a), a one-line additive PR to ordering-components; (b) if the owner does not want to touch it.
11. **Customer-facing text of the preparation time on adjust.** The app already sends a courtesy chat message; confirm it is wanted on every adjust, or send only the API change.
12. **Project hard-code `delosi`** (order comment in primary bold, `OC/:458-462`). Recommended: drop it (the theme can style the comment); or keep as a project rule.
13. **Does accepting a reservation keep the system alert** ("Reservation / Scheduled for") or become a notice in the page. Recommended: a notice in the preparing screen; the system alert can't be themed.

---------------------------------------------------------------------------

## 8. Work breakdown

Files an implementation agent would own (all under `src/ui/src/components/` unless stated):

| Slice | Files | Port from driver-theming | Depends on |
|---|---|---|---|
| A. Page shell + stages | `OrderDetails/Business.tsx` (rewrite, split), new `OrderDetails/orderStages.ts`, `sections.tsx`, `OrderDetailsSkeleton.tsx`, `OrderHeaderComponent.tsx`, `styles.tsx` (delete) | `OrderDetails/sections.tsx`, `CollapsibleTitle.tsx`, `OrderPair.tsx`, `orderData.tsx`, `OrderDetailsSkeleton.tsx` (not `orderStages.ts`, driver-trip based) | area 1 primitives |
| B. Cards | `OrderContentComponent.tsx` -> `CustomerCard`, `ProductsCard`, `PaymentCard`, `MoreDetails`; `OrderBill.tsx`, `partyContact.ts`, `ProductLines.tsx`, `OrderVehicle.tsx` | same-named files of `D/OrderDetails/` + `ProductItemAccordion/` (rewritten as a product line with `half_price`) | slice A |
| C. Accept / reject / adjust / assign sheets | `AcceptOrRejectOrder/*` (rewrite), new `PrepTimeSheet`, `AssignDriverSheet`, `RejectSheet`; `src/hooks/useAcceptSheet.tsx`, `useGroupStatusUpdate.tsx`; delete `pages/AcceptOrRejectOrder.tsx` + route (coordinate area 3) | `D/AcceptOrRejectOrder/*`, `D/hooks/useAcceptSheet.tsx`, `useGroupStatusUpdate.tsx`; `OStepper` step prop | primitives `OBottomPopup`, `OStepper`, `ChoiceRow`, `FilterChip`, `OTextarea`, `FieldError` |
| D. Bottom bar | `FloatingButton/index.tsx`, `styles.tsx` (delete), hooks `useFloatingButtonInset`, `BottomBarContext` | `D/FloatingButton`, row layout is new | schema `bottom_bar` keys |
| E. Map | `GoogleMap/index.tsx` (rewrite), delete `DriverMap`, `MapView`, `GoogleMap/RenderMarker.tsx`, `LocationIndicator.tsx` | `D/MapView/MapMarker`, `DriverMap/DestinationCard` pattern, maps sheet | |
| F. Review | `ReviewCustomer/index.tsx`, `styles.tsx` | `D/ReviewCustomer/*` + `rating_scale` buttons appearance | |
| G. Pages | `pages/OrderDetails.tsx` (props factory shared with `MyOrders.tsx`), `pages/OrderSummary.tsx` (delete if 7.6a), `navigators/HomeNavigator.tsx` (routes) | | |
| H. i18n | `i18n/translations.json` via `yarn i18n:generate` + `/translate-keys`; `utils/index.tsx` (`getOrderStatus` label 4, `orderCommentList` business list) | | |
| I. Dead code | delete `OrderDetailsLogistic/`, `DriverMap/`, `MapView/`, `OrderSummary/` (if 7.6a), `OrderDetails/getViewActionOrderPlan.ts` (becomes trivial), their tests and exports in `src/ui/index.tsx` | | |
| Submodule (not ours): additive error clearing (7.10), maybe `accepted_at` exposure | upstream PR | | |

Shared with other areas: `PreviousOrders/index.tsx` (calls `AcceptOrRejectOrder`, `ReviewCustomer`, `GoogleMap`, area 3); `OrdersListManager` (tablet panel, area 3/this); `TicketPreview`, `TicketAutoPrint`, printers (area 7); primitives (area 1).

Today's tests of the area (to rewrite or delete, none read):
`OrderDetails/__tests__/{Business.assignDriver.test.ts, Business.clipboard.test.tsx, Business.printerSettings.test.ts, getAcceptAutoPrintPlan.test.ts, getOrderDetailsPrinterSettings.test.ts, getTicketPreviewNavigationPlan.test.ts, getViewActionOrderPlan.test.ts, isManualDriverAssignmentEnabled.test.ts}`; `AcceptOrRejectOrder/__tests__/{AcceptOrRejectOrder.test.tsx, isAcceptOrRejectInFlight.test.ts}`; `FloatingButton/__tests__/FloatingButton.test.tsx`; `ProductItemAccordion/__tests__/{ProductItemAccordion.test.tsx, parseProductOptions.test.ts}`; `ReviewCustomer/__tests__/ReviewCustomer.test.tsx`; `DriverMap/__tests__/DriverMap.test.tsx`, `GoogleMap/__tests__/GoogleMap.test.tsx`, `MapView/__tests__/MapView.test.tsx`, `OrderSummary/__tests__/OrderSummary.test.tsx`, `OrderDetailsLogistic/__tests__/OrderDetailsLogistic.test.tsx`; pages `src/pages/__tests__/{OrderDetails.test.tsx, AcceptOrRejectOrder.test.tsx, OrderSummary.test.tsx}`. Reusable from driver-theming (adapt): `OrderDetails/__tests__/{OrderBill, OrderContentComponent, OrderHeaderComponent, partyContact, sections-related}`, `FloatingButton`, `ReviewCustomer`, `AcceptOrRejectOrder` tests. New tests: stage mapping (every status x delivery type -> stage, bar buttons, review rule), the prepared-in maths (presets, step, bounds, labels), reject body (reason + note), adjust-time body, inline error (shown, cleared on retry), checklist persistence, countdown from history with and without `history`, assign sheet conditions and sort, contact flag in every piece, `change_order_id`.

---------------------------------------------------------------------------

## 9. What I did not see / did not verify

- Nothing was run: no app, simulator, device, tsc, lint or test. Behaviour (the 1-digit minute bug, the modal closing on `loading`, the empty-locations crash, bar anchoring in the tablet panel) is from code reading.
- I read `Business.tsx`, `OrderHeaderComponent.tsx` (structure and diff against the original driver), `AcceptOrRejectOrder/index.tsx`, `FloatingButton`, the submodule `OrderDetails` and `ReviewCustomer` controllers, `pages/{OrderDetails,AcceptOrRejectOrder,OrderSummary}.tsx`, `MyOrders.tsx`. I did not read in full: `OrderContentComponent.tsx` bodies (read through diff against the driver original + greps), `GoogleMap/*` beyond its first 120 lines and imports, `ProductItemAccordion`, `ReviewCustomer/index.tsx` UI, `OrderSummary`, `OrderDetailsLogistic`, `DriverMap`, `MapView`, `OrdersListManager` beyond the panel, and any test file.
- Mockups: I read `OrderPending`, `SheetAccept` as HTML and the others through `SPECS.md`/`DESIGN-KIT.md` (the files were not opened one by one); `MapTracking`, `Review`, `TabletBoard` from the spec text. The Pending states `scheduled (13)` and `closed` have no mockup.
- The driver-theming files (`useAcceptSheet`, `useGroupStatusUpdate`, `FloatingButton`, `DriverMap` header, `ReviewCustomer` head, schema key lists, `pages-and-visibility.md`) were read in part; the decision rows of 2026-11-17/18/19 from `decisions.md` by grep, not in full. I did not check that every driver primitive named above (`OBadge`, `OAvatar`, `OListRow`, `OBottomPopup`, `OStepper`, `OCheckbox`, `ChoiceRow`) has no dependency on the driver's other modules.
- api-core (read-only, not run): `prepared_in` standalone update, `reject_reason`/`reasons` handling, controls drivers payload, `history` loading, order-product update endpoint were read in code. **Not verified**: that the order JSON actually returns `prepared_in`; the format and timezone of `history[].created_at`; whether customer apps show `reject_reason` or the message comment; whether a push is sent for a `prepared_in`-only change; the meaning of `order_product.status`; the anchor of `prepared_in` (accept time, as assumed); whether `business.pickup_time/delivery_time` come as "HH:MM"; whether `payment_events[].data` carries card brand/last4; whether `reject_reason` empty strings fail validation; `Order` serialization of `reject_reason`.
- Screenshots: only `INDEX.md` was read, not the PNGs.
- Not examined: tablet behaviour on a device (anchor of the absolute bar in the panel, `useIsLargeScreen`), RTL, accessibility of the new sheets, font scaling.
