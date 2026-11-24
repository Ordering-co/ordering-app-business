# Requests of area `orderDetails` (order details page)

## Schema keys

None. Every piece reads a key that exists (`order_details.base` and its `call` / `messages` / `action` slots, `card` variants
`muted` and `tint`, `timeline`, `progress`, `alert`, `badge`, `avatar`, `bottom_bar`, `header`, `checkbox`, `skeleton`).
Two looks are built from tokens because no component key names them (listed so the coordinator can decide to give them keys):

| Look | Built from | Where | Mockup |
|---|---|---|---|
| The customer's note on a product line (a small warning-tinted box under the line) | `color.warning_subtle`, `color.warning_text`, `radius.sm`, `space.xs/sm` | `OrderDetails/styles.ts` (`productNote`) | OrderPending |
| The white box under a call / message button on the hand-off card (tinted card) | `color.background`, `button.shapes.icon.radius` over a ghost primary button | `OrderDetails/SlotButton.tsx` (`onTint`) | OrderReadyPickup. A slot `order_details.slots.call_on_tint` / `messages_on_tint` (white solid, primary glyph) would replace it |
| The mini map's height (140) | `size.xl` x 2 + `space.lg` | `OrderDetails/MiniMap.tsx` (`THEME-KEY-PENDING: order_details.base.mini_map_height = 140`) | OrderDelivery |

## Backend (api-core): pieces of the mockups not drawn, or drawn with what exists

| Piece | Mockup | What is needed | What the page does meanwhile |
|---|---|---|---|
| "Card ending 4242" under the total | OrderPending, OrderPreparing, OrderReadyPickup, OrderDone | the card's last four digits (and brand) on the order or on `payment_events[].data` | not drawn; the line shows the payment method names (cash with the change to give, wallet, gateway) |
| "Driver . about 6 min from the customer" | OrderDelivery, MapTracking | a live ETA of the driver to the customer (the `eta_*` fields are creation-time figures) | not drawn |
| Mini map of the driver card | OrderDelivery | none | DRAWN now (`OrderDetails/MiniMap.tsx`, read by the key `map.mini_map`: the key must exist in the schema) |
| UTC moments of the order's life (`accepted_at`, `ready_at`, `picked_up_at`, `delivered_at`) | Waiting 00:42, Ready in 08:12, Took 28 min, the timeline, the subtitle | `order.history[].created_at` is minute-truncated and in the **business's time zone with no zone in it**; the page learns the zone's offset from `updated_at` (see `OrderDetails/orderTimes.ts`) and falls back to `updated_at` / `created_at` when it cannot. Also `history` is dropped from the list payload above 100 orders and the details controller does not refetch | works to the minute; with no usable history there is no timeline and no countdown (only the minutes given) |
| `prepared_in` in the order payload | Ready in / Promised for / Adjust time | confirm the order JSON returns `prepared_in` for an accepted order (read from api-core's validation, not seen in a response) | the preparation card is drawn only when it is a number above 0 |
| `reject_reason` in the order payload | closed orders (no mockup) | confirm it is returned | the reason note shows only when present |
| A "paid" flag | the `Paid` chip | the chip is derived from a `payment_events` entry with `event: 'payment'` (not verified for cash orders paid at the door) | derived |

## Asked of other areas

| Area | Request |
|---|---|
| orderActions | none open: `openReview(order, { qualification })` is used by the review card's stars; `MoreHandlers.prepTime / assignDriver / driverLocation` are passed |
| printers | the print button, the header icon and the More rows all navigate `TicketPreview { order, orderStatus }` (no `printerSettings`, no `OrderSummary`); the page no longer loads printers or auto-prints (the accept sheet does) |
| orders | `jest/coverage-include.js` still lists `FloatingButton/index.tsx` (deleted); the board mounts `OrderDetailsPage` (see the contract) |
