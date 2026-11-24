# Pages, sections, visibility, images and the tablet platform (phase 4, store app)

Date: 2026-11-19 · Status: **applied in `product.schema.json` 1.0.0** (written as a proposal for the gate; the counts of section 6 are from then, and the schema file holds 55 visibility keys today). The schema is `product.schema.json` (`store_app` 1.0.0, platforms `phone` and
`tablet`); counts at the end of section 6.

Inputs: the "Proposed theme pieces" of the seven area reports ([areas/](areas/)), the driver app's
`docs/theme/pages-and-visibility.md` and schema, and the marketplace app's schema (a piece both draw keeps the marketplace's
key, checked name by name against `ordering-app-marketplace-theming/product.schema.json` and
`ordering-app-driver-theming/product.schema.json`).

Rules applied (the skill's, `references/pages-and-visibility.md`, plus the owner's):

- A **block** of a screen is a section of a page (ordered, hidden) **only where the theme may order or hide it**. A screen with
  one block, or whose blocks the operation fixes, has no page.
- A **piece** inside a block is one flat `visibility` key, default `true`. An element has **one switch**: a section and a key
  never hide the same thing.
- **No key for what a server config decides** (`hide_customer_contact_business_app`, `order_logbook_enabled`,
  `allow_save_changes_offline`, `reject_orders_enabled`, `combine_pending_and_progress_orders`, the login methods) **or for what
  the operation needs**: accept, reject, mark ready, picked up, not picked up, assign driver, adjust time, the order's number, the
  customer's name and address, the products, the order comment and the status steps are never hideable, and no theme key moves
  them. The bottom bar of the details and the order card's buttons have no key at all.
- A key never cuts the navigation: Orders and Profile are not hideable; Messages is (the chat stays reachable from an order's
  message buttons and `confirmation.order.messages`); Stores is not (store pause is operational).
- `footer` is `false` on every page and hidden in the editor (the app has no footer).

## 1. Pages and their sections

`fixed` = `hideable: false`, stays in place. No section is movable except the profile's `main` group: **the stage of an order
decides what the details show and in which order**, the theme only hides (area 4, 2.0).

| Page | Screens (mockups) | Sections in render order | Hideable | Group |
|---|---|---|---|---|
| `login` | Login, LoginCode, Forgot | `logo` · `title` · `form` | `logo`, `title`; `form` fixed | — |
| `order_details` | OrderPending, OrderPreparing, OrderReadyPickup, OrderDelivery, OrderDone, OrderError, MapTracking (full-screen, no page of its own) | `header` · `status` · `prep_time` · `handoff` · `driver` · `customer` · `note` · `products` · `bill` · `timeline` · `review` · `more_details` · `actions` | `handoff`, `bill`, `timeline`, `review`, `more_details`; the rest fixed | — |
| `review` | Review | `customer` · `rating` · `quick_comments` · `comment` · `send` | `customer`, `quick_comments`, `comment`; `rating`, `send` fixed | — |
| `stores` | Stores | `stores` · `dashboard_link` | `dashboard_link`; `stores` fixed | — |
| `menu` | Menu, MenuUnavailable | `notice` · `categories` · `products` | `notice`, `categories`; `products` fixed | — |
| `product_options` | ProductOptions | `availability` · `options` · `shared_notice` | `shared_notice`; the rest fixed | — |
| `profile` | Profile (the driver's structure since 2026-11-23) | `profile_photo` · `information` · `account` · `support` · `logout` · `delete_account` | hideable: `profile_photo`, `information`; fixed: `account`, `support`, `logout`, `delete_account` | `main` = `information`, `account`, `support` |

Why each fixed section is fixed:

- `order_details`: `header` (number, store, print and more), `status` (status chip, type chip, waiting or took figure),
  `prep_time` (the promised time and **Adjust time**: operational), `driver` (assign; config and level decide the button),
  `customer` (name, address, contact: pieces hide by server config), `note` (the order comment: the kitchen needs it),
  `products` (what to cook; the checklist inside is `confirmation.order.checklist`), `actions` (the bottom bar). `bill` is
  hideable as in the driver app and the marketplace app (`confirmation.order.total` and `.payments` hide pieces of it).
- `login`: `form` carries the login methods, which are server configs.
- `profile`: `account` holds Personal information, which leads to **Delete account** (store rules: it cannot be hidden), and
  Password and Sessions (each with its own key); `logout` is the way out.
- `stores` (the stores), `products`, `availability`, `options`: the operation.

The order of `order_details` is one union order. The mockups agree on it where they overlap (header, status, time or driver card,
customer, products, bill, more details, actions); **two places to check when the screen is built**: the timeline is a card in
OrderDelivery and a folded row in OrderDone, and the hand-off card sits before the customer in OrderReadyPickup. A section renders
its own stage variant or nothing; an order that disagrees between stages is a reason to split a section, not to add a key.

### Screens without a page, and why

| Screen | Why no page |
|---|---|
| Orders tabs (Main, OrdersInProgress, OrdersHistory, OrdersEmpty, OrdersOffline, TabletBoard) | `tabs` and `list` are one flow decided by statuses and the controller (`combine_pending_and_progress_orders`); a page of two fixed sections adds nothing. Pieces are keys (`orders.*`) |
| OrdersSearch | one form; filters come from the controller |
| Messages, Chat, ChatEnded | the area report's `header → filters → list → empty` and `header → recipients → thread → quick_replies → composer` are fixed; pieces are keys (`messages.*`). The recipients decide who can see a message, so they are never a section |
| NewOrderAlert, NotificationsPermission, SheetConnection, every Sheet*, LogoutDialog, LanguageSheet | sheets and dialogs: state, not pages |
| Notifications, Sessions, ProfileEdit, ProfilePassword | one block each |
| Printers, PrintersEmpty, PrinterAdd, PrinterFound, TicketSettings, TicketPreview | one block each; `menu.printers` and `ticket.pdf` are keys; the wizard's steps are the flow |
| Splash, Home (only if `use_root_point` stays), NotFound, NetworkError, IntroductoryTutorial, Signup | no mockup; Splash is a build asset. The last four are dead code to delete (area 1 Q2, area 2 Q3) |

## 2. Visibility keys

54 keys in 10 editor groups, all `boolean`. "D" = the driver's key, "M" = the marketplace's: the name exists in that schema file
(checked by script). A key reused keeps the driver's label key, so the Dashboard's translation is reused.

| Group | Key | Hides | Name from | Default |
|---|---|---|---|---|
| `bottom_nav` | `bottom_nav.messages` | the Messages tab | D | true |
| | `bottom_nav.labels` | the labels under the tab icons | D | true |
| `orders` | `connection_status` | the Live / Reconnecting / Offline pill of the header and the board (the sheet and the offline notice are state: never hidden) | D, M | true |
| | `orders.title` | the "Orders" title | D | true |
| | `orders.search` | the search button | D | true |
| | `orders.refresh` | the refresh button beside the connection pill (the owner's review, 2026-11-20); pull to refresh is never hidden | new | true |
| | `orders.order_type` | the type chip (Delivery, Pickup, Eat in…) | D | true |
| | `orders.order_status` | the status chip | D, M | true |
| | `orders.date` | the time on history cards | D, M | true |
| | `orders.total` | the total and payment line of a card | M | true |
| | `orders.store` | the store's logo and name on an order card, drawn when the account has more than one store (the owner's review, 2026-11-20) | new | true |
| | `orders.quick_actions` | the action buttons of an order card (Reject / Accept, Mark ready, Picked up…); off, the card only opens the order (the owner's review, 2026-11-20) | new | true |
| | `orders.absolute_time` | the clock time beside the card's elapsed time ("waiting · 12:04 PM"), for an order that is not a preorder; a preorder always shows its scheduled time | new | **false** |
| | `orders.review_order_button` | "Review customer" on a history card | D, M | true |
| | `orders.stage_filter` | the chips under the tabs: of In progress ("All 600 · Preparing 412 · Ready 31 · With driver 157", Preparing selected by default) and of New ("Pending 13 · Preorder 2", Pending by default), each its own list; off, In progress is one list in sections and New one list (the owner's decisions, 2026-11-20 and 2026-11-23) | new | true |
| | `orders.store_filter` | the store chip of the orders header (the list's and the board's); **off by default** (the owner, 2026-11-20: the store is already in the filters): the store is then chosen in the search and filter sheet's Store row, which is always there for an account with more than one store | new | **false** |
| | `orders.board` | the kitchen board; off, a tablet uses the phone layout | new | **false** on phone, **true** on `tablet` |
| `confirmation` | `confirmation.order.copy` | the copy row of "More actions" | D | true |
| | `confirmation.order.directions` | "View on map" and "Track on map" | D, M | true |
| | `confirmation.order.messages` | the message buttons of the customer card | D | true |
| | `confirmation.order.type` | the order type and payment method line | D | true |
| | `confirmation.order.date` | the "created at" line of More details | D, M | true |
| | `confirmation.order.total` | the bill's total | D, M | true |
| | `confirmation.order.payments` | the payment card under the bill | D | true |
| | `confirmation.order.print` | the print icon and the print row | new | true |
| | `confirmation.order.checklist` | the preparation checkboxes | new | true |
| | `confirmation.order.countdown` | the "Ready in" figure and its bar (the promised time and Adjust time stay) | new | true |
| `messages` | `messages.title` | the Messages title | D | true |
| | `messages.filter` | the All / Unread chips | new | true |
| | `messages.search` | the search button | new | true |
| | `messages.unread_badge` | the unread counters (rows, chip, tab) | new | true |
| | `messages.quick_messages` | the quick replies row | D, M | true |
| | `messages.image_upload` | the image button | D, M | true |
| | `messages.signature` | the signature button and pad | D | **false** (the mockup's composer has none) |
| | `messages.order_console` | the order's own status messages in the thread | D, M | true |
| | `messages.time` | the time under a message | D, M | true |
| | `messages.sent_to` | the "Sent to" line under a message | new | true |
| `map` | `map.other_maps` | "Open in Maps" | D | true |
| `map` | `map.mini_map` | the mini map of the delivery card (read by `OrderDetails/OrderDetailsPage.tsx`) | D | true |
| `auth` | `auth.forgot_password_link` | "Forgot your password?" | D, M | true |
| | `auth.version` | the app version line | new | true |
| `stores` | `business_card.logo` | the store's logo on a row (a glyph tile otherwise) | M | true |
| | `stores.address` | the address line | new | true |
| | `stores.hours` | "Open · closes 10:00 PM" (the dot and the switch stay) | new | true |
| | `stores.search` | the search button | new | true |
| `products` | `products.search` | the Menu's search button | new | true |
| | `products.category_count` | the counts in the chips and under a category | new | true |
| | `products.price` | the price of a row | new | true |
| | `products.unavailable_reason` | "Unavailable · …" and "back …" lines (the switch shows the state) | new | true |
| | `products.make_all_available` | the footer button | new | true |
| | `product.image` | the product photo (a glyph tile otherwise) | M | true |
| | `product.options.price` | an option's price | M | true |
| `profile` | `menu.sessions` | the Sessions row | D, M | true |
| | `profile.password` | the Password row | D, M | true |
| | `menu.notifications` | the Alerts and sound row | M | true |
| | `menu.orders_display` | the "Orders display" row of Profile: the device's own switches for the card's quick actions and clock time (the theme's `orders.quick_actions` and `orders.absolute_time` are their defaults) | new | true |
| | `menu.language` | the Language row (the server's single-language rule also hides it) | M | true |
| | `menu.help` | the Help center row (also hidden when no URL is configured) | M | true |
| | `menu.about` | the About row | new | true |
| `printing` | `menu.printers` | the Printers row | new | true |
| | `ticket.pdf` | "Share as PDF" on the ticket and in More actions | new | true |

The driver's `menu.*` keys are the user menu's rows; the catalog (stores' products) takes `products.*` so a name never means two
things. 26 keys are the driver's (14 of them also the marketplace's) and 7 more are the marketplace's only: 33 of 54 reuse a name that exists.

### Keys the area reports asked for and were **not** added

| Key asked | By | Why not |
|---|---|---|
| `orders.card_actions` (hides Accept, Reject, Mark ready, Picked up on a card) | area 3 | accept, reject and the status steps are never hideable |
| `orders.sound_mute`, `orders.timer`, `orders.items`, `orders.customer_name`, `orders.order_number` | area 3 | the operation needs them; `hide_customer_contact_business_app` already decides the name |
| `orders.stage_sections` | area 3 | the stage titles carry the counts and the meaning of the groups; decoration is not the point |
| `orders.refresh`, `orders.business_name`, `orders.business_logo` | driver | not in the business mockups (pull to refresh stays; the app belongs to a store); no reader |
| `confirmation.order.eta`, `confirmation.business.email`, `.phone`, `confirmation.customer.email`, `.phone`, `confirmation.products.options` | driver, area 4 | "Promised for" is the operation's; contact data is decided by `hide_customer_contact_business_app`; the product options are what the kitchen cooks |
| `confirmation.order.timeline`, `confirmation.order.share_pdf`, `review.quick_rating` | area 4 | the timeline is a section; the PDF is `ticket.pdf`; the quick stars live inside the `review` section |
| `stores.dashboard_link`, `menu.unavailable_notice`, `product_options.shared_notice` | area 6 | each is a section of its page (one switch per element) |
| `business.categories.all` | area 6 | "All" must stay usable |
| `printers.test_print` | area 7 | a diagnostic the operation needs when a printer fails |
| `messages.preview` | area 5 | the owner's call on OQ-09: no last-message line until api-core gives one, so no reader; add it back with the line |
| `messages.sort`, `messages.call` | driver, area 5 | the sort chips are replaced by All / Unread (mockup); the call button's number is decided by `hide_customer_contact_business_app` |
| `bottom_nav.map`, `map.zoom_controls`, `map.distance_bar`, `business_map.recenter`, `menu.schedule`, `onboarding.skip` | driver | driver-only screens; the business map is one static screen |

## 3. Images

One theme image. Theme images are `https` URLs or `''` (then the bundled asset paints); `jpg`, `png`, `webp` only (`png` / `webp`
when transparent); ideal size = 3 × the largest box a phone paints.

| Key | Paints | Bundled today | Size · ratio | Notes |
|---|---|---|---|---|
| `logotype` (D, M) | the login screen's logo (the mockup's `[YOUR LOGO]` box, 180 × 44) | `logotype.png` (dark logo on a white page). **Two former-brand logos coexist** (`logotype.png` "Ordering", `logotype-invert.png` "OrderingPlus"): the owner chooses the bundled one (open question) | 540 × 132 · 4:1 · alpha · 100 KB | the project's own logo wins when set |

Images the driver's schema has and this one does not, and why: `home_hero` and `onboarding.slide_1..5` (the mockups have a plain
white login and no tutorial: the photo and the 7.5 MB of slides go), `empty.not_found`, `empty.new_order`,
`empty.schedule_blocked` (every empty state and the new-order alert are an icon in a tinted tile, `icon_tile`, not a picture),
`placeholder.business_logo` (the glyph tile is the default, `business_card.logo` shows the logo when the store has one),
`placeholder.customer` (initials in an `avatar` replace it).

Not theme images: the native splash and the app icon (build assets), the printed ticket's logo, the tinted PNG icons
(`theme.images.general.*`, 41 keys, 6 undefined) which become glyphs of Ionicons and MaterialCommunityIcons, and
`dummies/store.png` (removed when nothing paints it). Bundled files nothing paints are deleted with their manifest entries:
`slide1..4.png`, `background.png`, `not-found.png`, `no-network.png`, `loading-splash.png`, `logotype-invert.png` (if the first
logo stays), `logo.png`, `new-order.png`, `order-creating.png`, `order-success.png`, `no-printers.png`, the 40 PNG icons.

## 4. Site settings

None: the app's name, API and project come from `src/config.json` and the Builder, and its feature flags from the server's
`configs` (as the driver app).

## 5. What the `tablet` platform overrides

`tablet` is the first platform of an Ordering app besides `phone` (the driver and marketplace apps are phone only). A platform
overrides component `base` properties and visibility defaults and pages, **never tokens**. The owner's calls on the tablet
questions (decisions.md, "The coordinator's calls": OQ-07 = (b), OQ-08 = free rotation and two panes) are in this table.

| What | Phone | Tablet | Read by |
|---|---|---|---|
| `components.bottom_nav.base.placement` | `bottom` (bar, height 64) | `rail` (80 wide, 64 x 64 items: the TabletBoard's left rail) | the navigator's tab bar |
| `components.screen.base.max_width` | 0 (full width) | 600 (a centred column for stack screens, forms and lists in portrait; the board and the panes are full width) | the screen wrapper |
| `components.sheet.base.presentation` | `bottom` (docked, radius 15 on top) | `centered` (a card: the sheets become dialogs, also inside the detail panel) | `OBottomPopup` and the dialogs it hosts |
| `components.sheet.base.max_width` | 0 | 480 | same |
| `visibility.orders.board` | false | true | `MyOrders` |
| Pages | - | no override: every page is the same on both; the board is a layout of the Orders screen, not a section list |

Values that exist on both and are read only on a tablet (no override: the number is the same, a phone never reads it):

| Key | Value | Used for |
|---|---|---|
| `components.screen.base.list_pane_width` | 380 | the list pane of the two panes in landscape: Messages (conversations), Stores (stores), Printers (printers) |
| `components.screen.base.detail_pane_width` | 440 | the right-hand panel of the board that shows an order's details (OQ-07 b), and the second pane of Messages (chat), Stores (menu) and Printers (wizard, ticket preview) when it is a panel; the panes beside the list otherwise take the rest of the width |

Counts: **4 component properties and 1 visibility key** differ; 0 pages; 2 more keys are tablet-only readings. The `phone` /
`tablet` choice is made once by `usePlatform()` (the device, not the window); tablets rotate and phones are locked to portrait
(a native setting, not the theme's). The rail and the board's columns, gaps and padding are component values (`bottom_nav`,
`board`), the same on both.

## 6. Counts

| | Count |
|---|---|
| Components | 48 (28 controls, 20 app parts); 9 new against the driver's 44, 5 of the driver's removed |
| Component keys (properties) | 544, plus 38 slots |
| Visibility keys | 54 in 10 groups |
| Pages | 7 (login, order_details, review, stores, menu, product_options, profile): 35 sections, 16 hideable |
| Images | 1 |
| Platform overrides | 4 component properties, 1 visibility key, 0 pages |
| Editor labels | 184 new keys against the driver's schema, listed in [editor-labels.md](editor-labels.md) |

## 7. What I did not verify

- That each key has a reader: the code of the redesign does not exist yet. The keys come from the mockups and the area reports'
  "Proposed theme pieces"; the readers are listed with their screens in components.md, and `scripts/theme/keys.mjs` will say which
  are missing when the screens are built.
- The order of `order_details` sections across the six stages (above).
- That the Dashboard's editor accepts the new platforms `phone` and `tablet` and `store_app`: `ordering-theme validate` passes, but
  api-core has not been asked.
- The marketplace and driver key names were checked against their `product.schema.json` files, not against what their code reads.
