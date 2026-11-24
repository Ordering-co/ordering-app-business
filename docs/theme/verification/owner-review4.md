# The owner's review, round 4 (2026-11-20 and 2026-11-23): the store chip and the status band

Two requests after round 3. The decisions are the rows "The store chip of the orders header" (2026-11-20) and "The order card,
again" (2026-11-23) of [../decisions.md](../decisions.md). The checks ran once at the end of each: for the card, types 0 errors,
lint 0 errors (77 warnings), Jest 231 suites and 2707 tests passing, the five `theme:*` checks and both `i18n` checks ok.

| # | What | What was built | Seen on a device |
|---|---|---|---|
| 1 | "Take the store filter off the screen, it is already in the filters" | `orders.store_filter` is off by default (it only draws the header's chip now); the store is chosen in the search and filter sheet's Store row and applies with Apply; a store alone keeps the tabs, the stage chips and the exact totals, the search button is painted and a notice "Showing _store_ only." with Clear says it is on | iPhone: a store applied from the sheet, the notice, the totals of that store. Android phone (Release): the header without the chip. **Not seen:** a long store name in the notice; the chip turned on together with the sheet's row |
| 2 | "Change the design to this one": the exported board "D3 · status band" | `OrderBand` across the top of `OrderCard` and `GroupedOrderCard`: the status (never cut, as many lines as it needs; a preorder with its calendar glyph) and the time as one sentence (`bandTime`: "Waiting 02:14", "Ready in 03:40", "Late 04:10", "Preparing 03:40", a preorder "Tomorrow · 1:30 PM", History "Today · 11:42 AM"; with the clock time on, "Late 04:10 · due 12:30 PM"); the band's colour is the badge's soft variant of the status, or of the time's state when the order is at risk or late (`orderBandVariant`). Under it the header with the total at its end, the facts and the quick actions. The card has no padding of its own (`flushLook`); the skeleton has the same shape. The mockup is redrawn with the app's real texts (`design/redesign/screens/OrderCard.dc.html`) | iPhone (Debug): New (yellow bands, "Waiting 82d 17h"), Preparing (blue; a late order red, "Late 3d 9h"), With driver (blue, no time), History (green "Delivered by driver", red "Not picked up by customer", with the date and the time). iPad portrait: New. Android phone (Release): New. **Not seen:** a status of two lines, a preorder, the clock time on, a group's card, the tablet board in landscape, a long locale, 320 pt, an at-risk (yellow) band on an order in progress |

What changed that the owner did not ask for, and was told: the whole-card tint of an at-risk or delayed order is gone (the band
carries the state, as the board draws it), so `order_card.base.tint_warning` and `tint_danger` left the schema (192 editor labels to
add in the Dashboard, not 194); the solid status chip is no longer on a card (a row of a group keeps it); a card with the driver
shows no time, though the board draws "18 min" (the payload carries no estimate); the type chips keep their three colours, which
the board (drawn before them) shows grey; a History card writes its day in the band although the list's day title already says
it. `order_card.base.total_text` still paints nothing on the card (the total is `h4`, the mockup's 18).

`CARD_TIME_WAITING`, `CARD_TIME_UNTIL_READY`, `CARD_TIME_PREPARING`, `CARD_TIME_READY` and `CARD_TIME_LATE` have no reader left
(orphans of the catalog, with `PAYMENT_PAID`, `PAYMENT_UNPAID` and `PAYMENT_TO_COLLECT`): the band writes the sentences the
alert and the details already had (`ORDER_WAITING`, `ORDER_READY_IN`, `ORDER_LATE_BY`, `ORDER_PREPARING_FOR`). The hint of the
"Clock time" setting still gives the old example ("waiting · 12:04 PM"); its English is not changed (an existing key).

## The chips of New and of In progress (2026-11-23)

"Add an All in In progress, leave Preparing preselected; in New add the filters Pending and Preorder, Pending preselected" (the
row "The chips of New and of In progress" of the decisions). Built by one agent, read and checked by the coordinator: types 0
errors, lint 0 errors (77 warnings), Jest 232 suites and 2739 tests passing, the five `theme:*` checks and both `i18n` checks ok.

| What | What was built | Seen on a device |
|---|---|---|
| In progress: `All · Preparing · Ready for pickup · With driver` | `Stage` gains `all` (`ordersView.ts`); `LIST_STATUSES` (`orderQuery.ts`); `useStageOrders` holds one paged list per chip and files an order under every list that holds its status, so one that changes stage stays in All and one that closes leaves it; All's number is the three exact totals together; one flat list, no section titles | iPhone (Debug): the row opens on Preparing, "All 88 · Preparing 63 · Ready for pickup 16 · With driver 9"; All selected, one list of mixed statuses, newest first |
| New: `Pending · Preorder` | `NewStage` and `useNewStage` (Pending by default, kept while the app lives); two totals requests in place of New's one (`OrderTotals.pending`, `.preorder`; `new` is their sum, the badge's `newAll` unchanged); each chip its own paged list; "No preorders" (`NO_PREORDERS`, translated for the eleven locales); a request from the shell for the New tab selects Pending | iPhone (Debug): "Pending 527 · Preorder 2" with the tab's "99+"; Preorder listing its two orders with their bands |

**Not seen on a device:** an order moving between chips after an action (tests only), the second page of Pending or All, offline, a
320 pt phone, the long locales in the chip rows, the Android phone before the Release install, the tablet board (unchanged:
its New column is pending and preorders together). A preorder that rings opens New on Pending: the user sees it under the
Preorder chip, whose number counts it. Both rows follow the one key `orders.stage_filter` (label "Stage chips of New and In
progress"); off, the two tabs are the lists of before.
