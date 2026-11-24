# Requests of area `orderActions` (accept, reject, adjust time, assign driver, more, map, review)

## Theme keys

None pending. The sheets read `sheet`, `chip`, `stepper` (the `lg` figure), `card.variants.muted`, `icon_tile`, `list_row`,
`field`, `input`, `alert`; the map reads `map_marker` (base and the `store` / `customer` / `driver` variants) and
`visibility.map.other_maps`; the review reads `review_form`, `rating_scale` (its base is the labelled-buttons look) and the
page `review`. Visibility keys read by the More sheet: `confirmation.order.print`, `.copy`, `.directions`, `.messages`,
`ticket.pdf`.

## Backend

| Request | Why | Today |
|---|---|---|
| A UTC `accepted_at` (or `ready_by`) on the order | "Now: ready in" and "promised for" in the adjust sheet anchor `prepared_in` to the accept time. The sheet reads the last status-to-7 change of `order.history` (stamped in the store's own minute, timezone unverified, absent for lists above 100 orders) or the `acceptedAt` the caller passes | approximated; without it the sheet shows "N min" instead of a time |
| Per-project preparation-time rules (presets, default, min, max) | the sheet's presets 10 / 15 / 20 / 30 / 45, step 5, min 5, max 180 and default 20 are app constants (OQ-18 (a)) | `PREP_TIME` in `OrderActions/constants.ts` |
| A server list of rejection reasons | the five reasons are an app list through i18n; the API stores any string up to 255 in `reject_reason` | `useRejectReasons` |
| Confirmation that the customer apps show `reject_reason` or the status message's `comment` | the sheet sends the label as `reject_reason` and the note as `reasons` | not verified |
| A driver's distance / ETA to the store and to the customer | not drawn (owner: "not drawn yet"): the assign sheet shows availability and active orders only, the map card says who and the status; no live ETA or distance field exists (`eta_*` are creation-time) | not drawn |
| `cellphone` of `order.driver` | "Call driver" on the map needs it; the card hides the button without it | read from `order.driver.cellphone` |
