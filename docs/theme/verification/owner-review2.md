# The owner's review, round 2 (2026-11-20)

The owner kept reviewing the Release build on the Android phone emulator and wrote more points; each was a decision of his
(`docs/theme/decisions.md`, the rows of 2026-11-20). Four agents built them, one after the other where the files overlapped; the
coordinator read the screenshots and ran the checks once at the end: types 0 errors, lint 0 errors (77 warnings), Jest 228 suites
and 2600 tests passing, the five `theme:*` checks and both `i18n` checks ok.

| # | The owner's point | What was done | Seen on a device |
|---|---|---|---|
| 1 | An account can hold many stores and 600 open orders; an order marked ready seemed gone (it was under every preparing order) | **Stage chips under the tabs of In progress** ("Preparing 63", "Ready for pickup 18", "With driver 7"), one selected, each **its own paged list** loaded by the app with the SDK (`useStageOrders.ts`; next pages by "id below the last one read", so an order leaving the stage does not make a page skip one). The lists hear the socket's order events and the app's own changes; an order the app moves into a stage heads it until the next refresh. Key `orders.stage_filter`; off, In progress is the old single list in sections | iPhone: chips 65 / 16 / 7 under "In progress 88"; #4466 marked ready left Preparing (65 → 64) and Ready went 16 → 17; #4465 headed Ready. **Not seen:** accept moving New → Preparing (test only), the 320 pt width, Android |
| 2 | The counts with "+" | **Exact totals** per stage from the API (`useOrderTotals.ts`, `orderQuery.ts`: four `page_size=1` requests with the controller's own clause and the chosen store, a fifth for the shell's badge over all stores), +1 / -1 on the app's changes and the socket's events, a reconcile round 2.5 s after the last change, re-read on pull, the header's button, reconnect and foreground. Offline or failed: the old lower bound with "+". Tabs and tab bar cap at "99+"; chips, section titles and board columns write the number | iPhone: the four totals add up to the controller's own total of open orders (529 + 65 + 16 + 7 = 617). The local project has 529 new orders: the old "12+" was the loaded page |
| 3 | The card says nothing of the store | **The store's logo and name are the card's first line** (`OrderStoreLine.tsx`, the `OAvatar` primitive, a quiet storefront tile without a logo), when the account has more than one store (the store list's own total) and no store is chosen in the filter. Key `orders.store` | iPad and iPhone: lines with logos, one store without a logo. **Not seen:** a long name, a group card of several stores |
| 4 | A store filter (the chosen option with the chips) | **One store chip** for the phone header (a row under the title), the board's header and the search form's Store row: logo, name, a sheet over the whole list of stores (`asDashboard`, 20 a page, load more, a search field past ten stores). The choice applies to New, every stage, History, the totals and the board, and is kept while the app lives. The two defects found by reading are fixed (a store filter that asked for every status; a store list cut at ten). Key `orders.store_filter` | iPhone: Twirly Laundry chosen (New 15, no store line, an empty Preparing with its text), back to All stores. iPad: the chip in portrait and on the board. **Not seen:** paging past 20 stores (test only) |
| 5 | The "+" makes the tabs jump when going from History to In progress | Two causes: the counter's text was part of each tab's width, and the "+" dropped for a moment while the open orders reloaded (a defect in `useOrdersSplit.ts`). Each counter now has the room of the widest one, and the "+" keeps its last answer during a reload | iPhone: 42 samples across switches, the three tabs at the same x and width every time |
| 6 | A refresh button beside the connection status | An icon button between the pill and the search (phone header and board header), doing what the pull does, busy while it runs, disabled offline. Key `orders.refresh`. The pill's text gives way first in a narrow bar | iPhone, iPad board. **Not seen:** the 320 pt width and the long locales (estimated) |

Limits the owner was told: a change made on another device reaches a stage's list through the socket's events (the local stack
delivers none, so this was not seen); the board's columns still list the `active` slot under exact totals; the store chip's row
appears when the stores' total arrives, moving the list down one row at launch; choosing a store makes the controller fire one
unused request of its own.

Four keys were added to the schema (`orders.store`, `orders.refresh`, `orders.stage_filter`, `orders.store_filter`: 188 editor
labels now) and four texts to the catalog, machine-translated for the eleven locales.

The order card itself is being redesigned with the owner on a design canvas (nine variants so far); nothing of that is in the code.
