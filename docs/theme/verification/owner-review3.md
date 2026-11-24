# The owner's review, round 3 (2026-11-20): the order card

The owner chose the order card on a design canvas (ten variants; the chosen one is `design/redesign/screens/OrderCard.dc.html`,
"D1b") and asked for two settings of it and for the order types' colours. Two agents built it; the coordinator wrote the theme
keys, the device's store of the two settings and the type colours, read the screenshots and ran the checks once at the end: types
0 errors, lint 0 errors (78 warnings), Jest 231 suites and 2656 tests passing, the five `theme:*` checks and both `i18n` checks
ok. The decisions are the rows of 2026-11-20 in [../decisions.md](../decisions.md).

| # | What | What was built | Seen on a device |
|---|---|---|---|
| 1 | The card "D1b" | Header: the store's logo (the `OAvatar` of 44, the mockup draws 40), its name and "#number · customer", with the time at the right as a figure over a label ("02:14" / "waiting", "+04:12" / "late", time left / "until ready", "ready"; History: the time over today, yesterday or the date; a preorder: the time it is for over tomorrow, today or the date). Then the status chip, which takes two lines and is never cut, beside the order's total; then the type chip, Paid / Unpaid and the number of items; then the quick actions across the width. No product list. `PreviousOrders/OrderCardParts.tsx`, `OrderTime.tsx`; the grouped card and the board's columns use the same parts | iPhone: New, the three stages of In progress, History, a search. iPad: the landscape board with a selected card. **Not seen:** a status of two lines and a preorder (the local data has neither: tests only), the grouped card, Android, a long locale, 320 pt |
| 2 | Quick actions shown or not; the clock time beside the elapsed time, for an order that is not a preorder | Theme keys `orders.quick_actions` (default on) and `orders.absolute_time` (default off); the device can change both from **Profile → Orders display** (`src/context/ordersDisplay.ts`, `OrdersDisplaySettings`, the row's key `menu.orders_display`), and its choice wins over the theme in either direction. The lists read the two once and pass them down. With the clock time on the label reads "waiting · 12:04 PM", "late · due 12:30 PM", "due 12:30 PM", "ready · 12:26 PM"; a preorder ignores it. With the actions off the History card's "Review customer" goes too | Android tablet: the Profile row, the screen, a changed switch with "Default: on" and the reset, and the board without its buttons after the switch. **Not seen:** the choice surviving a restart (a test only), the screen at phone size, the clock time after the date was dropped from it |
| 3 | The order types' colours | Three badge variants of a medium tint (the owner's choice among six strengths) by how the order leaves the store: with a driver violet, collected by the customer teal, in the store orange (`shared/orderTypeVariant.ts`); on the card, the board and the order's details | iPhone: "Delivery" and "Pickup" in their colours on the cards, while they were still solid. **Not seen:** the medium tint on a simulator (the Release build on the Android phone has it), the in-store colour, the details' chip |

What changed that the owner did not ask for, and was told: the driver's name line of a card that is with a driver is gone (the
chosen drawing has none; the card with a driver shows no time either); a status chip is drawn on New cards too ("Pending");
Paid / Unpaid is drawn on History cards, so a cash order that was delivered reads "Unpaid" (the rule of 2026-11-20 does not look
at the status); `order_card.base.total_text` (16) no longer paints the card's total, which is the mockup's 18 (`h4`): the key is
read by the skeleton only and should follow or go.

`PAYMENT_PAID`, `PAYMENT_UNPAID` and `PAYMENT_TO_COLLECT` have no reader left (orphans of the catalog). Nineteen texts were
added and machine-translated for the eleven locales. The schema has 194 editor labels to add in the Dashboard.
