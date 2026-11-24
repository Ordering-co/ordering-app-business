# Fix round 6: the tablets (T3-C5, T3-C2)

Date 2026-11-20. Debug builds with Metro on 8097; the Android tablet (`emulator-5558`, 1280 x 800 dp) and the iPad Pro 11-inch (M5) simulator. Screenshots in the session's scratchpad (`pass7/tablets/r6/`, `a01` to `a09` Android, `i01` to `i14` iPad); the apps were relaunched after the edits (Fast Refresh keeps state).

## 1. T3-C5: a filter on the landscape board keeps the columns (owner's decision, OQ-02)

**Cause.** `OrdersBoard` drew the columns from the controller's open orders (`useOrdersSplit`: `newOrders`, `preparing`, `ready`, `withDriver`, `counts`, all from the `active` slot, which a filter never touches). With a filter on it threw the columns away and drew `split.results` (the controller's `ordersFiltered`, every status) as one flat list. The phone had already been fixed in `482e673` by splitting the results per tab (`tabResults`); the board had no equivalent, and its History button read the controller's unfiltered `completed` slot.

**Fix.** `useOrdersSplit` returns `resultLists`: the results (the controller's filtered list with the app's own changes laid over it, `overlayChanges`) split by the same `splitOrders` as the open orders (New, Preparing, Ready, With driver, with their counters), the closed ones grouped by day through the same day helpers as History (now shared, narrowed by the History chip), and `more` (a lower bound while more pages of results remain). The board reads `resultLists` instead of the controller's lists when `searching`: three columns holding only what matches, each with its count (`31`, `7`, `1` and `8+` style lower bounds), the "Filters on: ... Clear" notice as the phone draws it, an empty column drawn as an empty column ("No new orders" / "No orders here"), the details panel unchanged, a column's end asking for the next page of results. `BoardHistory` lists `resultLists.history` with the chips when a filter is on (the closed orders that match, by day). A search that matches nothing in any status draws the phone's "no results" instead of three empty columns. The same `ORDER_CHANGED_EVENT` that moves a card without a filter moves it with one (the overlay feeds `resultLists`). The tab-opening effect of the phone ("a search opens on a tab that holds a result") is off on the board: it has no tabs, and it would have left the hook on the History tab after Clear.

**Files.** `OrdersBoard/index.tsx`, `OrdersBoard/BoardHistory.tsx`, `OrdersOption/useOrdersSplit.ts`.

**Tests (fail on the old code, 11 of them):** `OrdersBoard.test.tsx` ("with a filter or a text search on": three columns with only the matches and their counts and the notice, an empty column, no results and the skeleton, the panel, History with chips, a lower-bound count, a card moving column after the app's own action, Clear bringing back the controller's columns), `useOrdersSplit.test.tsx` (`resultLists` by stage and by day, none without a filter, the History chip, a card moving with `ORDER_CHANGED_EVENT`, the board keeping its tab).

**Seen.**
- Android tablet, landscape: filter Pickup (`a03-pickup`: New 31, Preparing 7, Ready 1, the notice "Filters on: Pickup"); Clear; text search "3569" (`a05-3569`: New 0 and Ready 0 as empty columns, Preparing 1); **Mark ready on #3569** with the filter on: the card moved from Preparing to Ready at once, counts 0 / 0 / 1 (`a06-after-tap`); its panel opened from the card (`a07-panel`, "Ready for pickup", Not picked up / Picked up); History with the Pickup filter listed only the closed pickup orders by day with the chips (`a08-history-filtered`: #4472, #4471, #3566, #3513...).
- iPad, landscape: filter Pickup (`i04-pickup`, `i09-land-filter`: 31 / 6 / 2), text search "3567" (`i06-3567`: one card in Ready), History with the filter (`i12-history-filtered`), Clear (`i13-cleared-land`).
- Not seen: the "no results at all" state, an order accepted from New with the filter on (the card-to-column move was seen with Mark ready, and in the tests for Accept), the lower-bound `+` on a filtered count (the local data has one page), a History chip pressed with the filter on, Android portrait with a filter.

**Limits to know.** With a filter on, the board's columns have no pull-to-refresh (without a filter they do not either; the phone list has it). A search whose matches are all closed orders shows three empty columns until History is opened (the phone opens its History tab by itself; the board has no tab to open).

## 2. The filter is lost when the tablet turns (found on the iPad portrait step)

**Cause.** The landscape board and the portrait list are two screens, each mounting its own `OrdersSource` (the controller, which holds `filtered` in its state), and `useOrdersSearch` holds the form and what was applied in the UI. Rotating mounts the other one: the iPad in landscape with Pickup on, turned to portrait, showed the unfiltered list with no notice (`i07-portrait-filtered`, before the fix). The task asked for "the filter is kept".

**Fix.** The Orders page (it stays mounted across the rotation) holds a box and gives it through `KeptSearchContext` (`OrdersOption/keptSearch.ts`). `OrdersSource` wraps the UI: it records the controller's `filtered` in the box and, when a controller starts with none, gives the kept one back through `onFiltered`. `useOrdersSearch` starts its form and its `applied` (the notice's text) from the box and records them. Clear empties the box. Without a provider nothing is kept (every other use of `OrdersSource` is unchanged).

**Files.** `pages/MyOrders.tsx`, `OrdersOption/keptSearch.ts` (new), `OrdersOption/OrdersSource.tsx`, `OrdersOption/useOrdersSearch.ts`.

**Tests:** `OrdersOption/__tests__/keptSearch.test.tsx` (the filter, the notice text and the form reach the other layout and back; Clear clears for good; nothing without a search and without the page's box). The first fails on the old code.

**Seen.** iPad: landscape with Pickup, rotated to portrait: the notice "Filters on: Pickup", tabs New 31+ / In progress 8+ and Pickup cards (`i10-portrait-filter`), rotated back to landscape: the same three columns and notice (`i11-back-land`). The rotation reloads the lists (a fresh controller), so the counters show for an instant before the filtered ones. Not seen on the Android tablet.

## 3. T3-C2: the grouped card's pickup pair

The single order's card was fixed in round 4 (`declineLong` / `advanceLong` and `fitText`: each cell as wide as its label). `GroupedOrderCard` still drew the pair in the 1 : 2 shares of the whole row (`card.decline` / `card.advance`), the same defect that wrapped "Picked up" in a narrow board column. It is in this round's folders and a real defect: fixed the same way (also for the reservation's "Customer not arrived" / "Customer arrived"). Reject / Accept stay 1 : 2.

**Files.** `PreviousOrders/GroupedOrderCard.tsx`. **Tests:** `GroupedOrderCard.test.tsx` (the cells' shares for the pickup pair, the reservation pair, and Reject / Accept; two fail on the old code), `OrderCard.test.tsx` (the same shares for the single card, which had no test).

**Seen.** The single card's pair on one line in the Ready column on both tablets (`a06-after-tap`, `i04-pickup`, `i11-back-land`). **The grouped card itself was not seen on a device**: the local data has no cart group at the pickup step. Covered by the tests only.

## Local data and devices

- Order **#3569** (Demo Admin, pickup): marked ready from the Preparing column on the Android tablet with the filter on. Nothing accepted, rejected or sent. (#4467 was accepted by another session meanwhile; its "Ready in" clock showed on the iPad.)
- Both tablets left booted with the app open and logged in on Orders: Android in landscape, iPad in portrait, no filter on either. Metro 8097 untouched.

## Checks

`npx tsc --noEmit` 0 errors; `pnpm test` 220 suites, 2480 tests passing; `pnpm theme:guard` 0 literals; `pnpm theme:keys` ok; `pnpm lint:check` 0 errors; `pnpm i18n:verify` and `pnpm i18n:check-generated` ok (no new key).
