# The owner's review, round 1 (2026-11-20)

The owner opened the final Release build on the Android phone emulator and wrote eight points. Two agents fixed the code (one in
`OrderDetails/`, one in `OrderActions/`), the coordinator checked the result on the iPhone 17 Pro simulator (Debug, Metro) and ran
the checks once at the end. Commits `e05577c`, `ca3380a`, `7c22581`, `ee5d035`, `eb6e082` and the one that holds this file.

| # | The owner's point | What was done | Seen on a device |
|---|---|---|---|
| 1 | "Paid" is not centred with the total; how is paid decided? Cash or card on delivery is unpaid for now | The chip took `OBadge`'s own `alignSelf: flex-start`, so it sat on the row's top edge: it is centred on the amount now. The rule is the owner's (decisions, 2026-11-20): `isPaid` in `OrderDetails/orderData.ts`, read by the details and the order card. Chip "Unpaid" (warning soft) or "Paid"; the card reads "Cash · unpaid" | iPhone: chip centre 662 pt, amount centre 662.5 pt (655 before); "Unpaid" on a cash order's details and "Cash · unpaid" on the cards. **Not seen:** a paid card order, card on delivery, a mixed payment (tests only) |
| 2 | "Business information" in "More details" is glued to the top of its container; general to the folding rows | The folding rows' body had side and bottom padding and none on top: it has the card's padding on its four sides, once, in the shared style (the total, the products, the timeline, "More details") | iPhone: 1 pt before, about 15 pt after, in "More details" and a done order's timeline |
| 3 | Tapping the customer's address offers the maps app, the More sheet opens the app's map: both must open the app's map | The addresses of the page (the customer's card, the store's in "More details") call the same map action as "View on map". Without coordinates the address is plain text. The map already has "Open in Maps" | iPhone: both addresses open the map. **Not seen:** an order without coordinates |
| 4 | Show that the preparation time can be tapped, to set a custom number of minutes | Typing was not possible. The figure is a button with the kit's pencil; tapped, it is a numbers field (5 to 180; in the adjust sheet from the minutes already gone), in both sheets. The main button and the selected preset or adjustment follow the number while it is typed | iPad (portrait and landscape dialog): the accept sheet. iPhone: #4189 accepted with 37 typed (the API holds `prepared_in` 37) and adjusted to 50 typed (`prepared_in` 50), the sheet riding the keyboard. **Not seen:** Android |
| 5 | What does marking products as done do? | Answered, no change: a kitchen aid kept on the device per order (`useChecklist`, AsyncStorage, dropped after three days untouched); never sent to the API, never required to mark the order ready | n/a |
| 6 | After "Mark ready", the card with "Accepted" and "Ready" has more space under than over | Every step of the timeline card carried the gap to the next one, the last one too: only the steps followed by another carry it | iPhone, #4462: 25 pt under against 16 pt over before; 15.6 pt each after |
| 7 | Is "The driver completes this order…" new? Could the old app complete an order? | Answered, no change: the text is new, the rule is the old app's (a delivery that is ready had no button for the business; only pickups had "Picked up" / "Not picked up") | n/a |
| 8 | #4193 cannot be assigned | Local data: its store belonged to no driver group, so the list was empty. Business 49 was added to the local driver group 1; the API now returns two drivers for the order | The API's answer; **not seen in the app by the coordinator** (the owner's device) |

Also found while checking: an order marked ready leaves the "Preparing" section for "Ready for pickup", which sits under every
preparing order of the In progress tab (29+ old ones in the local data), so it looks gone; the search finds it. Offered to the
owner as a decision (fold the sections, or put the ready ones first); nothing changed.

`PAYMENT_TO_COLLECT` has no reader left (the card writes `PAYMENT_UNPAID`); it stays in the catalog as an orphan. Ten new keys
were written in the code and filled for the eleven locales by machine translation.

Two red screens were seen during the round ("Rendered more hooks…", "Should have a queue…"): both right after a hook was added
to a sheet that was mounted, by Fast Refresh in the Debug build; neither came back after a relaunch, and the accept and adjust
flows were then run to the end.
