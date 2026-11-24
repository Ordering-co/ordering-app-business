# Requests of area `stores` (stores and menu)

## Schema keys (`THEME-KEY-PENDING`)

Nothing was edited in the schema. The screens use the closest existing keys (`card`, `icon_tile`, `badge`, `menu_row`, `list_row`, `switch`, `chip`, `alert`, `sheet`, `bottom_bar`); the one pending value is marked in code.

| Key | Value | Why | Mockup | Where |
|---|---|---|---|---|
| `store_status.text` (a text look: 12 / 1.5 / 600) | `{typography.body_sm}` at weight 600 | The status line of a store card ("Open · closes 10:00 PM") is 12 / 600 in the mockup; no catalog preset is 12 / 600 (decision T3), so the line reuses `tabs.base.text`, which has the same value | Stores | `BusinessController/styles.tsx` (`statusText`) |
| `store_status.dot_size` / `dot_gap` | 8 / 5 | Read from `badge.base.dot_size` / `dot_gap` (the same values) until the key exists | Stores | `BusinessController/styles.tsx` |
| `store_card` (inherits `card`: `padding` 15, `gap` 10, `tile_size` 44) | as the card | The card is `components.card` with the tile of `icon_tile.sizes.lg` (44) and a `gap` of `space.sm`; `store_card` would let a theme restyle the store row alone | Stores | `BusinessController/index.tsx` |
| `menu_row.base.min_height` for the options screen's rows | 50 | The rows of ProductOptions are 50 high, the menu's 64; the options rows use `size.lg` (50) | ProductOptions | `StoreProductOptions/styles.tsx` |
| `link.sizes` at 12 | `body_sm` | The dashboard link is 12; `link.sizes.sm` is the 10 `caption` and `md` the 14 `body`, so it uses `md` | Stores | `StoresList/index.tsx` |

## Backend (not drawn, per the owner's decision of 2026-11-19)

- **"off since 11:40 AM" / "off since yesterday"** in the unavailable view: nothing records when a product was turned off (`updated_at` changes on any edit). The line shows the category and when the product is back only. Ask for `disabled_at` / `snoozed_at` on products (and options) in dashboard mode.
- **Counts on the categories** (`products_count` on the categories of the dashboard business payload): the chips count from one full product fetch (`ceil(N/50)` calls, TQ-08); a store with hundreds of products would gain from a server count.
- **Pausing notifies open carts**: `EmitUpdateCartByBusiness` is dispatched only when `schedule` or `enabled` is in the business update (`BusinessController.php:9622-9627`), not for `snooze_until`; to confirm with the API owner. Also to confirm: that level 2 users may set `snooze_until`, and that a customer with an existing cart cannot check out a paused store.

## Shared logic (ordering-components)

- `BusinessList` spreads `{ version: 'v2', orderBy: 'distance' }` after the caller's `orderBy`, so the stores' name order cannot be asked for with the controller's props. The page no longer sends the overwritten `initialFilterKey: 'orderBy'`; the list keeps the server's order (open first, then id). An additive prop (for example `keepOrderBy`) would give the name order back.
- `BusinessController.updateBusiness` keeps the last error in its state after a later success (it spreads the old `businessState`), and on failure puts the error text in `business`. The store card tells success from failure by the shape of `business` and by the error changing, and keeps its last good business; a clean result from the controller would remove that.
