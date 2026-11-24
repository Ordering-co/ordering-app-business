# Requests of area `orders` (the orders list on the phone)

## Schema keys

None. The list reads keys that exist: `order_card` (`base`, `slots.advance`, `slots.decline`, `tint_warning`, `tint_danger`, `timer_icon_size`, `time_text`,
`number_text`, `total_text`), `badge`, `tabs` (slot `count`), `chip`, `alert`, `empty_state`, `section_header`, `skeleton`, `sheet`, `bottom_bar`, and the
visibility keys `connection_status`, `orders.title`, `orders.search`, `orders.order_type`, `orders.order_status`, `orders.date`, `orders.total`,
`orders.review_order_button`, `orders.counters`, `orders.board`. A few uses are worth a look when the schema is reviewed:

- `orders.date` hides the time of day on a History card; the clock of an open order (`Waiting 00:42`, `Ready in 03:40`) has no key (the operation needs it, as
  `pages-and-visibility.md` says).
- The selected card of the board (`OrderCard selected`) uses the card's border in `color.primary`; no `order_card` variant for it exists. If the editor should
  own it: `order_card.base.selected_border` = `{color.primary}`.

## Backend (api-core)

1. **"Omar H. . 6 min from the customer"** (OrdersInProgress, With driver): not drawn (owner, 2026-11-19; TQ-11). The card writes the driver's name only. Needs the
   driver's real travel time on the order (or a routing call) to be drawn.
2. **What the list payload carries** (`orders().asDashboard()`), not verified against a real answer: `created_at`, `prepared_in`, `reporting_data.at['status:7']`,
   `reporting_data.at['status:4']`, `payment_events`, `spot_number`, `reject_reason`, `time_status` (and whether `time_status` exists without `plan_enterprise`).
   Each piece of the card that needs one of them is left out when it is missing (no placeholder). Please confirm them or add them to the dashboard list's fields.
3. **Time zone of `reporting_data.at`** (server `Y-m-d H:i:s` strings): the clocks read them as UTC. If the project's server time is not UTC the "Ready in" and
   "Waiting" figures are off by the offset.

## ordering-components (additive, through the coordinator)

1. **"Show 12 orders"** (OrdersSearch footer): not drawn; the button says "Show orders". It needs the count of the filtered query (a request with `page_size 1`
   and the controller's `where`, reading `pagination.total`). The controller builds the `where`, so the count belongs there: an additive prop `filteredTotal`
   (or a `countOrders(filters)` function) on `OrderListGroups`.
2. `OrderListGroups.handleSelectCurrentTab` marks the target slot `loading: true` and loads only when the slot is not `fetched`; the app relies on the
   `currentFilters` effect that reloads on every slot switch (the two slots have different status lists). A switch that does not change the filters would leave
   the slot loading for ever. Worked around here (the slots always differ); noted so the controller is not "tidied" without it.
3. The controller keeps `ordersGroup` in closures (`setOrdersGroup({ ...ordersGroup })`): two writes in one tick overwrite each other (the History chip writes with the
   functional form on purpose).

## Other areas

- `ordersLive`: `OrdersBoard` (named export of `@ui`) and `NewOrderAlert`; the list no longer mounts `NewOrderNotification` (see the contract).
- `shell`: the Orders tab's initial route stays `Orders` (the list must be mounted for the alert and the counters).
