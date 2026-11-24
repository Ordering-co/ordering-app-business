# Requests of area `ordersLive` (the global alert, the connection, the tablet board)

## Schema keys

None blocking. Everything reads keys that exist: `new_order_alert` (`base.title`, `title_color`, `text`, `text_color`, `accept_width`; slots `tile`, `accept`, `open`), `board` (`column_*`, `gap`, slot `count`),
`badge` (`success_soft` / `warning_soft` / `danger_soft`, `dot`), `icon_tile`, `list_row`, `sheet`, `order_card` (`name`, `meta`, `time_text`, `timer_icon_size`), `screen.detail_pane_width`, and the visibility keys
`connection_status`, `orders.title`, `orders.search`, `orders.counters`, `orders.board`, `orders.customer_name`, `orders.order_type`, `orders.total`, `orders.timer`. Worth a look when the schema is reviewed:

- The connection sheet's state tile is a tinted square in the state's color (`success_subtle` / `warning_subtle` / `danger_subtle`, glyph in `*_text`), built from the `icon_tile` `lg` size and radius. `icon_tile` has only the variants `brand` and `neutral`:
  if the editor should own it, `icon_tile.variants.success | warning | danger`.
- `new_order_alert.slots.mute` (a `link`) is read through `OLink`, which takes the link's default look; the slot's `size` / `variant` are not read separately.
- `board.base.columns` (3) is not read: the board is always the three stages (New, Preparing, Ready). `board.base.max_card_width` does not exist and the cards fill their column.
- The sheet reads `sheet.base.title` for the state's name (18/600), as the mockup draws it.

## Backend (api-core)

None new. "Last update" is the time of the last socket connection or order event the app heard (client clock); it is not a server timestamp.

## ordering-components (additive, through the coordinator)

None. The alert needs the list controller's events (`order_added_notification`, `order_updated_notification`, `message_added_notification`, `order_updated`), which exist. One observation: `order_added_notification` is
also emitted for the socket's `order_assigned` event, so with an empty `notification_business_states` an order that gets a driver can raise a "new order" alert; a project that does not want it sets the states.
