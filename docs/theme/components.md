# Components: grouping by function (phase 2, store app)

Date: 2026-11-19 · Status: **proposal for the gate** (nothing here is approved by the owner yet).

Inputs: the seven area reports ([areas/](areas/)), the 47 mockups (`design/redesign/screens/*.dc.html`, `DESIGN-KIT.md`,
`SPECS.md`), and the driver app's phase 2 (`ordering-app-driver-theming/docs/theme/components.md`) and schema. This app is the
same product family; its redesign is the only design (no legacy layout, no layout option). **The driver app's themed primitives
(`src/ui/src/components/shared`, `src/theme`) are the code to port, not to rewrite**; the area 1 report (section 2) has the file
by file verdict. What follows says what each *function* is called in the theme, how it varies, which mockups draw it and what
it replaces.

Rules applied: one function → one theme component → one code primitive; a variant stays only when it changes structure or
differs in two properties or more and is used in more than one place; everything else merges. The schema is
`product.schema.json` (48 components: 28 controls, 20 app parts). "Mockups" lists the screens that draw the piece (found by the
markers of each piece in the files, not by hand: a short list is a fact, not a limit).

## 1. Overlaps of the area reports, resolved

| Proposed by | As | Resolved as | Why |
|---|---|---|---|
| Area 3 `connection_pill`; area 3 `badge` with a dot; area 6 `store_status`; area 7 printer status badges; area 4 order status chips | five pieces of "a word with a state color" | **`badge`** (`variants` solid and `*_soft`, `base.dot_size`, `shapes.count` and `shapes.plain`) | the connection pill (Live / Reconnecting / Offline), the printer status (Ready / Offline), "Pending sync", "Paid", the store's open line and the order status are the same piece: a label with a state color, with or without a dot |
| Area 2 `sheet` tile; area 3 bell tile; area 6 `store_card.tile_*`, `menu_row.tile_*`; area 7 `list_row.leading_tile`; area 1 empty-state disc | six tinted squares and discs | **`icon_tile`** (sizes 40 / 44 / 88, variants `brand` and `neutral`, shape `round`) used through a `tile` slot by `list_row`, `item_card`, `menu_row`, `sheet`, `new_order_alert`, `empty_state` | one glyph on a tinted base is one function |
| Area 6 `store_card`; area 7 `printer_card` | two cards with tile, title, subtitle, status and actions | **`item_card`** (`inherits: card`; slots `tile`, `device_tile`, `status`, `action`, `action_secondary`) | a card for something the business owns |
| Area 4 `progress`; area 7 `progress_steps` | a time bar and the wizard's segments | **`progress`** (`variants` `bar`, `steps`) | one progress piece, two shapes |
| Area 3 `stage_section`; area 1 `SectionTitle` | the capitals title with a count | **`section_header`**, title style `typography.overline` | one section label |
| Area 3 `board`; area 3 `BoardColumn` count `OBadge` | | **`board`** (+ a `count` slot that is a `badge`) | |
| Area 3 `order_card` slots `accept`, `ready`, `picked_up`, `reject`, `not_picked_up`; area 4 `bottom_bar` slots | five buttons per surface | **two slots: `advance`** (solid success: Accept, Mark ready, Picked up) **and `decline`** (outline danger: Reject, Not picked up) on `order_card` and `bottom_bar`; `bottom_bar` also has `button`, `secondary` and `reject` (solid danger, the destructive confirmation) | the kit draws two looks: "accept / advance stage" and "secondary destructive" |
| Area 2 `auth_form.base.max_width` 480; area 1 `maxContentWidth` ~600; area 4 600; area 6 and 7 560; area 5 "readable width" | six widths | **`screen.base.max_width`** (0 on phone, 600 on tablet); sheets 480 (`sheet.base.max_width`); dialogs 330 (`modal.sizes.sm.width`) | one column width for every stack screen |
| Area 6 `switch` 44 × 24 drawn pill; area 7 `ONotice`/switch | platform `Switch` vs drawn | **`switch`** drawn, 44 × 24, thumb 20, hit 52 × 44, green when on | what the approved mockups draw (area 6 Q12 answered) |
| Area 4 `card.variants.tint`; area 4 time card surface | | **`card.variants`** `tint` and `muted` | |
| Area 4 `rating_scale.appearances.buttons` | | **`rating_scale`** is the five labelled buttons (the driver's segments are not drawn here) | one look, no appearance |
| Area 4 `map_marker.variants` store / driver / customer | | **`map_marker`** variants, three discs | |
| Area 2 `timer` caption; area 3 time texts | | **`timer`** is a plain caption; order times are `order_card.time_text` | |
| Area 5 `conversation_row`; area 6 `menu_row` | two rows | **two components, both `inherits: list_row`**: they differ in structure (avatar + preview + counter vs tile + price + switch) | kept apart on purpose |
| Area 7 `choice` variant `tile`; driver `choice` rows | | **`choice` is the tile only**; a list of choices with a mark is a `list_row` with a `radio`/`checkbox` | rows are list rows in every mockup (LanguageSheet, PrinterAdd, Notifications) |

## 2. Primitives (owned by the main agent, converted first; ported from the driver app)

| Group today | Theme component | Code primitive | Axes kept | Mockups | Replaced or removed |
|---|---|---|---|---|---|
| `OText` (386 JSX uses), raw `Text`, `styled.Text` | `typography.*` (preset + role color) | `OText` | presets of [tokens.md](tokens.md) | all | `size`, `weight`, `color` at the call |
| `OButton`, `OIconButton` (17 files), `FloatingButton`, `OFab`, `LogoutButton`, styled touchables | `button` | `OButton`, `OIconButton` as `OButton shape=icon` | colors primary, secondary, danger, success, neutral, inverse · appearances solid, outline, tonal, ghost · sizes sm, md, lg · shapes icon, round · states pressed, disabled (solid = grey fill and `#909090` text, the kit's) | all | 5 radii, 7 heights |
| Text links | `link` | `OLink` | variants default, muted, danger · sizes sm, md, lg | Login, Forgot, LoginCode, NewOrderAlert ("Mute") | |
| Vector icons (10 families), 40 tinted PNG icons | `icon.*` sizes 16 / 20 / 24 | `Icon` (Ionicons and MaterialCommunityIcons) | | all | `react-native-vector-icons` families; the PNG manifest; see D5 of the driver |
| `OInput`, raw `TextInput`, `OTextarea`, the search field | `input` | `OInput`, `OTextarea` | sizes md (50), code (50 × 56) · states focus, error, disabled · `textarea_height` 90 | Login, Forgot, ProfileEdit, ProfilePassword, OrdersSearch, MenuUnavailable, Chat, OrderDone, Review, SheetReject, PrinterFound, TicketPreview | five looks |
| Field label and error | `field` | `OField` | label above (always) | the forms above | |
| Code entry (`@twotalltotems/react-native-otp-input` 45 × 60) | `input` size `code` | `OOtpInput` (6 cells 50 × 56) | | LoginCode | the library; `Alert.alert` for a wrong code (inline error instead) |
| `ODropDown` (6 filters), `react-native-select-dropdown` (SLA, printers), `ODropDownCalendar`, `react-native-calendar-picker`, `react-native-country-picker-modal` (language list), the phone prefix modal | `sheet` + `menu` rows + `radio` | `OSelect`, `OCalendar` (range mode added: the filter is a range) | | OrdersSearch (Store, Driver, Payment, City rows), LanguageSheet, Notifications, SheetPause, SheetDriver, PrinterFound | 4 implementations; the iOS z-index ladder |
| Marks drawn per screen | `checkbox`, `radio` | `OCheckbox`, `ChoiceMark` | checkbox 24, radius 8, green when checked | OrderPreparing, OrderError (checkbox); LanguageSheet, PrinterAdd, PrinterFound, Notifications, SheetPause, SheetDriver (radio) | |
| Selectable tile (printer brand) | `choice` | `ChoiceTile` | state selected, disabled · height 64 | PrinterAdd | |
| Quantity of copies, preparation time | `stepper` | `OStepper` (`step` prop) | sizes sm, md, lg (lg has the 28 / 700 figure) | TicketPreview, TicketSettings, SheetAccept, SheetPrepTime | |
| Order tabs, message filter | `tabs` | `Tabs` | variants pill, underline, plain · sizes sm (50: a pill holding 40 tabs, 5 inside; 46 / 36 until schema 1.1.0), md (50), lg (60) · label 14 (12 until schema 1.1.0), active 600 and the others 400 · no count (removed with the numbers of orders) | Main, OrdersInProgress, OrdersHistory, OrdersEmpty, OrdersOffline | tab strips with 30 to 40 px targets |
| Filter chips, reason chips, quick replies, recipients, time presets | `chip` | `FilterChip` | sizes sm (36), md, lg · states pressed, selected, disabled · status dot | Main, OrdersHistory, OrdersSearch, Menu, MenuUnavailable, Messages, Chat, Review, SheetAccept, SheetPrepTime, SheetReject, TicketPreview | |
| Status chips, type chips, counters, the connection pill, "Paid", "Pending sync" | `badge` | `OBadge` | variants primary, neutral, inverse, warning, danger, success (solid) and primary / success / warning / danger `_soft` · sizes sm (20), md (24) · shapes count, plain · dot | Main, OrdersInProgress, OrdersHistory, OrdersOffline, OrderPending, OrderPreparing, OrderReadyPickup, OrderDelivery, OrderDone, OrderError, Printers, Sessions, Stores, NotificationsPermission, TabletBoard | four chip sets |
| Initials discs, photos | `avatar` | `OAvatar` | sizes xs, sm, md (44), lg, xl (88) · tint colors, muted tint for ended conversations | Messages, Chat, OrderPreparing (customer), Profile, ProfileEdit, SheetDriver | `dummies/*` placeholders; the demo URLs |
| The tinted tile with a glyph | `icon_tile` | `IconTile` | sizes md (40), lg (44), xl (88) · variants brand, neutral · shape round | Profile, Printers, PrinterAdd, PrinterFound, OrdersEmpty, PrintersEmpty, Sessions, Stores, Menu, NewOrderAlert, NotificationsPermission | |
| Review scale | `rating_scale` | `RatingScale` | five labelled buttons, 44 high, selected tint | Review | the gradient bar |
| Countdown and "expires in" | `timer` | `OTimer` | caption, `expired_color` | LoginCode, Forgot | |
| Time bar, wizard steps | `progress` | `OProgress` | variants bar, steps | OrderPreparing, PrinterAdd, PrinterFound | |
| `OToast` | `toast` | `OToast` (+ `BottomBarProvider`) | variants info, success, error · slot `action` (a link in the variant's own ink: the one button a notice can carry, `shared/toastAction.ts`; schema 1.2.0) | transient confirmations only: form errors are inline, never toasts | |
| Notices (`ONotice`) | `alert` | `ONotice` | variants info, success, warning, danger · slot `action` | Forgot, Notifications, OrderError, OrdersOffline, PrinterFound | `OAlert` (3 importers); warning banners |
| `OModal`, raw `Modal`, `OAlertOriginal` for confirmations | `modal` | `OModal`, `ConfirmDialogHost`, `confirmAction` | size sm = 330 · slot close | LogoutDialog | `centerOnLargeScreen` 620 card |
| `OBottomPopup`, `NotificationSetting` popup | `sheet` | `OBottomPopup` | `presentation` bottom / centred, `max_width`, slots close and tile | all `Sheet*`, LanguageSheet, NotificationsPermission, NewOrderAlert, SheetConnection | `supportedOrientations` is behaviour: kept in the port |
| `ActivityIndicator`, spinner overlay | `spinner` | `OSpinner`, `LoadingOverlay` | sizes | blocking actions | `react-native-loading-spinner-overlay` |
| `rn-placeholder` (4 places), skeletons | `skeleton` | `SkeletonBone`, `OrderListSkeleton`, `MessageListSkeleton`, `ChatMessageSkeleton` | | every list while loading | `rn-placeholder` |
| Dividers 1 / 2 / 5 / 10 | `divider` | `ODivider` | variants item, section, band | OrdersSearch ("or" line), Login | |
| Boxes written per screen | `card` | `OCard` | variants default, `tint` (hand-off), `muted` (time card) · title | OrderPending … OrderDone, Printers, Stores, TicketPreview | |
| Rows with a tile, a chevron or a mark | `list_row` | `OListRow` | slot `tile` · min height 56, divider | Profile, Printers, TicketSettings, Sessions, Notifications, LanguageSheet, PrinterAdd, SheetConnection | `toggle-switch-react-native` rows |
| `toggle-switch-react-native`, the platform `Switch` | `switch` | `OSwitch` (drawn pill) | on success, off `#CBCBCB` | Menu, MenuUnavailable, Notifications, ProductOptions, Printers, TicketSettings, Stores | the library |
| `NotFoundSource` | `empty_state` | `NotFoundSource` | slots tile (88 round), action | OrdersEmpty, PrintersEmpty, Messages (empty) | the `not-found.png` image |

## 3. App shell and features (`inherits: card` or `list_row` where they are boxes or rows)

| Group today | Theme component | Code primitive | Variants, slots, states | Mockups | Replaced or removed |
|---|---|---|---|---|---|
| `ONavbar`, tab titles, chat header, the details' top bar | `header` | `NavBar` + `BackButton` (44 target) | title h3, subtitle, height 56 | every stack screen | three title sizes, `ios ? 0 : 15` padding |
| Bottom tab bar (`tabBarShowLabel: false`, label inside the icon, `90/80` heights) and the tablet side rail | `bottom_nav` | `BottomNavigator` bar and `Rail` | `placement` bottom / rail (tablet) · 64 · 4 tabs · slot `messages_count` (blue; the Orders count was removed on 2026-11-23) | Main, Messages, Stores, Profile, TabletBoard | guessed iOS inset |
| Content width on tablets | `screen` | `ScreenContainer`, `PaneLayout` | `max_width` (0 phone, 600 tablet), `list_pane_width` 380, `detail_pane_width` 440 | every stack screen on a tablet; the board's detail panel; the two panes of Messages, Stores and Printers | `Container` and `SafeAreaContainer` orientation listeners |
| Fixed action bar | `bottom_bar` | `OBottomBar` + `bottomBarClearance` | slots button, secondary, advance, decline, reject · padding 20, gap 10 | OrderPending, OrderPreparing, OrderReadyPickup, OrderDone, OrderError, Review, Chat, Login, LoginCode, OrdersSearch, ProfileEdit, ProfilePassword, TicketPreview, PrinterAdd, PrinterFound, Sessions | `FloatingButton`, hand-made reserves (`100 + inset`) |
| Section titles in lists and settings | `section_header` | `SectionTitle` | overline, optional description | OrdersInProgress, OrdersHistory, OrdersSearch, Notifications, Profile, Sessions, ProductOptions | six looks |
| Login, forgot, code | `auth_form` | `LoginForm`, `ForgotForm`, `CodeForm` | slots submit, secondary, resend · scope input, field, timer | Login, Forgot, LoginCode | method tabs (not drawn), `Home` photo screen |
| Profile sub-screens | `account_page` | `AccountPage` | | ProfileEdit, ProfilePassword, Sessions | `profile_photo` of the driver (the avatar at 88 replaces it) |
| **Order card**, grouped orders, compact history card | `order_card` (`inherits: card`) | `OrderCard`, `OrderCardActions`, `GroupedOrderCard` | slots `advance`, `decline` · tints `warning`, `danger` by time state · number, name, meta, time, total styles | Main, OrdersInProgress, OrdersHistory, OrdersOffline, TabletBoard | `OrderItem` (fixed 105 height), `OrderItem` tablet branch |
| Order details | `order_details` | `OrderDetailsPage` (screen and panel are an open question) | slots `action`, `call`, `messages` · `figure`, folded row, quantity color | OrderPending … OrderDone, OrderError | `Business.tsx` icons row, `OrderContentComponent`, `OrderHeaderComponent` |
| Order timeline | `timeline` | `OrderTimeline` | dot, line, done / current / pending colors | OrderDelivery, OrderDone | |
| Printer card (the store row is a `card` + `icon_tile`, see section 10) | `item_card` (`inherits: card`) | `PrinterCard` | slots device_tile, status, action, action_secondary | Stores, Printers, PrintersEmpty, PrinterFound | `StoreCard` (`BusinessController`), `PrinterSettings` cards |
| Menu product row | `menu_row` (`inherits: list_row`) | `MenuRow` | slot tile · unavailable colors | Menu, MenuUnavailable | `ProductList` row, accordions |
| Messages list row | `conversation_row` (`inherits: list_row`) | `ConversationRow` | slots avatar, unread · preview unread style | Messages | `MessagesOption` rows |
| Chat thread, composer, recipients | `chat_bubble` | `ChatThread`, `Composer` | slots send, unread, recipient · notice pill · tail off | Chat, ChatEnded | `react-native-gifted-chat` (if used), `OChatBubble` (dead) |
| Bill rows | `bill` | `OrderBill` | | OrderPending … OrderDone | |
| Review customer | `review_form` + `rating_scale` | `ReviewCustomer` | slot chip (sm) | Review | |
| New-order alert (a sheet, global) | `new_order_alert` | `NewOrderAlert` | slots tile, accept, open, mute · `accept_width` 90 | NewOrderAlert | image `new-order.png`, mount in `OrdersOption` (moves to `HomeNavigator`) |
| Kitchen board | `board` | `OrdersBoard` | columns 3, gap, column look, slot count | TabletBoard | `OrdersListManager` (1 258 lines), the 30 / 70 split |
| Map markers | `map_marker` | `MapMarker` | variants store, driver, customer | MapTracking, OrderDelivery (mini map) | `GoogleMap` callouts' own look is the library's |
| Ticket preview paper | `ticket_paper` | `TicketPaper` | | TicketPreview, TicketSettings | `react-native-canvas` stays (the Star bitmap), not the screen |
| Connection state | `badge` (pill) + `sheet` + `list_row` | `ConnectionPill`, `ConnectionSheet` | | Main, OrdersOffline, SheetConnection | `WebsocketStatus` inline `NetworkError`, status-bar tint |

## 4. Component by component: what differs from the driver's

Only what differs from `ordering-app-driver-theming/product.schema.json`. Everything else is the driver's.

| Component | Change | Why (mockups / area) |
|---|---|---|
| `input` | `sizes.md.height` `size.lg` (50); `icon_gap` `sm`; `textarea_height` 90 | kit "campo 50"; search icon at 45; textarea 90 (Review, SheetReject) |
| `field` | `label_position` `above` | the mockups never put the label inside |
| `button` | solid disabled: fill `border`, text `text_disabled` | kit "Deshabilitado" |
| `checkbox` | size `icon.lg` 24, radius `sm` (follows Identity but `md` is not an option, so it stays 8), checked `success` | OrderPreparing checklist |
| `choice` | rewritten: the selectable tile (height 64) | PrinterAdd; rows are list rows |
| `stepper` | value `body_lg`; `lg` size with the `h1` figure | TicketPreview, SheetAccept |
| `tabs` | text 14 / 400 (the active one 600); `sm` height 50 (40 tabs, inset 5); the mockups' 12 and 46 until schema 1.1.0 | Main |
| `chip` | `sm` 36; plain `border` line; selected without line, 14 / 600; disabled state; dot | 69 uses |
| `badge` | `*_soft` variants, `dot`, shape `plain`, size texts, paddings 5 / 10 | pills of the mockups |
| `alert` | tint without a line, padding 10 / 15, text on tint colors, title, slot `action` | OrdersOffline, OrderError |
| `modal` | `sizes.sm.width` 330 | LogoutDialog |
| `empty_state` | the disc is an `icon_tile`; no image keys | OrdersEmpty |
| `timer` | caption, no pill | LoginCode |
| `switch` | on `success`, off `disabled`, drawn 44 × 24 | 7 screens |
| `card` | title, variants `tint`, `muted` | OrderPreparing, OrderReadyPickup |
| `sheet` | `presentation`, `max_width`, `padding_top`, `handle_width` 40, slots close and tile | tablet; kit |
| `list_row` | min height 56, padding 5, gap 15, title `label`, slot tile; no icon keys | kit |
| `avatar` | tint colors, muted pair, `xl` 88 | initials discs |
| `rating_scale` | rewritten as buttons; radius `sm` follows Identity without `md` in its options (8, not 10) | Review |
| `review_form`, `bill` | chip `sm`; total `h4` | Review, order details |
| `header` | subtitle | every stack screen |
| `section_header` | title `overline`, muted | lists |
| `bottom_nav` | icon 24; `min_bottom_space` 20 (the least space under a bar's buttons; kit footer 10 / 20 / 20); `placement`, `rail_width`, `item_size`, `active_label`; counters; tablet override | Main, TabletBoard |
| `bottom_bar` | `padding_x`, `gap`, `button_padding_x` (5: a label fits its share of a 1 : 2 pair); slots button, secondary, advance, decline, reject | kit |
| `auth_form` | no method tabs; slots secondary, language | Login |
| `chat_bubble` | mine = `primary_subtle` with black text, no tail, notice pill, `meta`, slot recipient | Chat |
| `order_card` | slots `advance`, `decline` (no `position`); `number_text`, `time_text` (the status band's text; the band's colours are the badge's soft variants, no tint keys since 2026-11-23), `timer_icon_size` 16, meta muted | Main |
| `order_details` | slots `action`, `call`, `messages`; `figure`, `quantity_color`, `folded_min_height`, `mini_map_height` (140) | OrderPreparing, OrderDelivery |
| `new_order_alert` | a sheet: slots tile, accept, open, mute; no image | NewOrderAlert |
| `map_marker` | three variants; no "me", no selected state | MapTracking |
| **new** | `icon_tile`, `progress`, `timeline`, `screen`, `item_card`, `menu_row`, `conversation_row`, `board`, `ticket_paper` | section 1 |
| **removed** | `date_strip`, `home_hero`, `tutorial`, `profile_photo`, `order_request` | the driver's schedule, welcome, tutorial, photo and time dial |

**Images the mockups do not paint (the schema has none):** `placeholder.business_logo` and `placeholder.customer` are not in the schema.
No mockup paints a picture there: a store and a product show a glyph on an `icon_tile` (Stores, Menu, MenuUnavailable), a customer or
driver shows initials on an `avatar` (Messages, Chat, OrderPreparing, SheetDriver, Profile), and `business_card.logo` and `product.image`
paint the real picture when the store or product has one. A bundled placeholder file is not painted anywhere, so there is no theme image
to replace. Add the key only if a mockup is redrawn with a picture.

**Messages preview (owner's call OQ-09):** the mockup draws the last-message line;
until api-core gives it, the app draws no line, so the `preview*` keys and the visibility key `messages.preview` were removed (round 2); they come back with the line.

## 5. Where tiles, buttons and badges are plugged in (slots)

A slot is a pointer to another component with its axes; the code reads the pointer, never copies the look.

| Component | Slot | Points to |
|---|---|---|
| `list_row` | `tile` | `icon_tile` md, brand |
| `item_card` | `device_tile` / `status` / `action` / `action_secondary` | `icon_tile` md brand / `badge` md `success_soft` / `button` md tonal primary / `button` md outline neutral |
| `menu_row` | `tile` | `icon_tile` lg neutral |
| `conversation_row` | `avatar`, `unread` | `avatar` md, `badge` sm primary count |
| `sheet` | `close`, `tile` | `button` icon ghost, `icon_tile` lg brand |
| `new_order_alert` | `tile`, `accept`, `open`, `mute` | `icon_tile` lg, `button` md solid success, `button` lg solid primary, `link` md |
| `empty_state` | `tile`, `action` | `icon_tile` xl round, `button` md tonal primary |
| `order_card` | `advance`, `decline` | `button` md solid success, `button` md outline danger |
| `bottom_bar` | `button`, `secondary`, `advance`, `decline`, `reject` | `button` lg: solid primary, outline neutral, solid success, outline danger, solid danger |
| `order_details` | `action`, `call`, `messages` | `button` md tonal primary; icon shape for call and messages |
| `tabs` | `count` | `badge` sm neutral |
| `bottom_nav` | `messages_count` (the Orders tab has no count since 2026-11-23) | `badge` sm primary, shape count |
| `board` | `count` | `badge` sm neutral count |
| `chat_bubble` | `send`, `recipient` | `button` icon primary (corner 8), `chip` sm |
| `auth_form` | `submit`, `secondary`, `resend` | `button` lg, `button` lg outline, `link` |
| `review_form` | `chip` | `chip` sm |
| `alert` | `action` | `link` md default (a text link in the notice's ink, underlined: Menu, MenuUnavailable, OrdersOffline draw it so) |

## 6. Libraries replaced by the app's primitives

Each is its own commit, with the dependency removed (the coordination with the dependency plan is in
`docs/DEPENDENCIES_PLAN.md`).

| Library | Where | Replaced by |
|---|---|---|
| `react-native-select-dropdown` | SLA, printers' brand and model | `OSelect` (sheet) |
| `ODropDown`, `ODropDownCalendar`, `react-native-calendar-picker` | the six order filters | `OSelect`, `OCalendar` with range |
| `react-native-country-picker-modal`, `react-native-phone-number-input` | language list, phone prefix, profile phone | `OSelect` + `PhoneInputNumber` as an input with a country select |
| `@twotalltotems/react-native-otp-input` | `Otp` | `OOtpInput` |
| `toggle-switch-react-native`, the platform `Switch` | 5 + 3 files | `OSwitch` |
| `rn-placeholder` | stores 6, categories 6, products 6, options 5, profile, sessions | `SkeletonBone` family |
| `react-native-app-intro-slider` | the dead tutorial | deleted |
| `react-native-vector-icons` (AntDesign, Feather, Fontisto, Entypo, FontAwesome, SimpleLineIcons) | rows, printers, chevrons | `Icon` over Ionicons and MaterialCommunityIcons |
| `react-native-splash-screen` | launch | `react-native-bootsplash` (driver) |
| `react-native-loading-spinner-overlay` (if present), `react-native-intersection-observer` | menu list | `LoadingOverlay`; the scroll's own `onEndReached` |
| `react-native-fast-image` | store logo, avatars | keep until measured (dependency plan O3) |

Stays because they paint Google's, the system's or the printer's content: `react-native-recaptcha-that-works`, the image picker, the
permissions, the system print dialog (O2), `react-native-canvas` (the Star ticket bitmap), `react-hook-form` (logic only).

## 7. Dead code to delete (gathered from the area reports)

Delete with their tests, bundled assets and manifest entries; confirm each import graph again before deleting.

| From | What |
|---|---|
| Area 1 | `OSegment`, `OChatBubble`, `OAlert` (replaced by `ONotice`), `ODropDown`, `ODropDownCalendar`, `src/context/Theme`, `src/ui/src/providers/AlertProvider`, `Responsive`, the duplicate `src/types/**` set, `rn-cli.config.js`, `RootNavigator.connectionState`, the four `SoundPlayer` log listeners in `App.tsx`, `src/assets/json/order.json` and `orders.json` (124 KB, unread), 22 of 57 image keys, the sounds `notification.mp3` / `.ogg` |
| Area 1, 2 | pages and components never routed: `IntroductoryTutorial` and `isTutorial`, `Signup` + `SignupForm`, `NotFound` (navigates to a non-route), `NetworkError` (page and UI), `Home` (the photo screen, unless `use_root_point` stays) and `show_tutorials`; `background.png`, `slide1..4.png` (7.5 MB), `logotype-invert.png`, `logo.png` |
| Area 3 | `OrdersOptionStatus` and the five `OrdersOption*` filters nothing renders, `SearchBar` for orders, the phone SLA settings modal and `slaSettingTime`, logistic tab branches (`isLogisticActivated && !isBusinessApp`), `showTagsList`'s `isDriverApp`, group buttons gated by `appTitle`, `OrderDetailsLogistic` navigation in `PreviousOrders`, `Dimensions` listener leaks, `OrdersListManager` (replaced by `OrdersBoard`) |
| Area 4 | `OrderDetailsLogistic` (198 lines + its test), `DriverMap` (580), `MapView` (`MapViewUI`, 357), styled `Logo` and `Pickup`, the commented-out chat `OModal`, the cart branches of `ProductItemAccordion`, logistic branches (`order.isLogistic`, `order_group`), `OrderSummary` page + UI (994 lines) if the print entry always opens `TicketPreview` (area 4 Q6, area 7 Q12), the `console.log` per render in `Business.tsx:471`, `react-native-html-to-pdf` and `react-native-print` with it (dependency plan O2) |
| Area 5 | `Contacts` UI, the tab strip and tags of `MessagesOption` (`BUSINESSES` / `CUSTOMERS` / `DRIVERS`), `unreadMessages` state, `openModalForBusiness`, the `user.level === 4` branches of `Chat` and `OrderMessage`, the file-attach flow (dependency plan O4), `orientation` state of `CH`, `getTimeAgo`, `driverMessageList`, `shared/OChatBubble`, `theme.colors.textNormal` |
| Area 6 | `StoresList`, `BusinessController`, `BusinessProductList`, `AccordionDropdown`, `IterateCategories` (rewritten), `SearchBar` (`UI/SearchBar`), `toggle-react-native` (in `package.json`, imported by nothing), duplicate `BusinessControllerParams` and `SearchBarParams` types |
| Area 7 | `DriverSchedule`, `ScheduleBlocked` (no consumer), the level-4 availability block of `UserProfileForm`, `EnabledStatusDriver`, `phoneUpdate` state, the unused `useForm` errors effect, `_retrieveStoreData` import |
| Driver heritage | 13 unread color keys, 12 unread bundled images (as the driver's D1), `OrderDetails/Delivery` references |

## 8. Keys whose reader the key search will not see

For `theme-readers.json`, as the driver's: `button.colors.*` (the engine builds `variants` from them),
`input.variants.default.states.focus|error.border`, `chip.variants.default.states.*` (whole looks painted through the box helper),
`alert.variants.*.icon_color`, `switch.base.thumb`, `list_row.base.trailing_color`, `icon_tile.variants.*.color`,
`badge.variants.*_soft.dot`. The 9 entries of the driver's file carry over where the reader's name is the same.

## 9. Round 2: key requests of the screens' agents, and the readers

The area agents filed their requests in `docs/theme/areas/requests/`. Decided by the skill's rules (no new token where a level exists,
one control per goal, a key only when a real piece reads it):

| Request | Area | Decision |
|---|---|---|
| `link` text weight 600 | access | **accepted**: `link.sizes.md.text` is `typography.label` (14 / 600, every text link of the mockups); `sizes.sm.text` is `body_sm` (12, the Stores dashboard link) instead of the 10 `caption` nothing draws |
| `chat_bubble.base.meta`, `conversation_row.base.meta` = 12 / 1.5 | messages | **accepted** (`body_sm`) |
| `conversation_row.base.ended_color` = `#616161` | messages | **accepted** (`text_muted`) |
| `chat_bubble.slots.send.shape` = `icon` | messages | **accepted** (corner 8 as the image button) |
| `order_card.base.selected_border` | orders | **accepted**: a `border` key, thin in `primary` (the board's selected card); `OrderCard` reads it instead of recolouring `border` |
| `store_status.text` 12 / 1.5 / 600, `dot_size`, `dot_gap` | stores | **accepted as part of the badge, no new component**: `badge.shapes.plain.text` (custom 12 / 1.5 / 600) is the store state line; the dot comes from `badge.base.dot_size` and `dot_gap` (`BusinessController/styles.tsx` reads them) |
| `profile_photo.sizes.card` 64 | profile | **accepted in the avatar, not as a component**: `avatar.sizes.lg.size` 64 (the mockups draw avatars of 44, 64 and 88, never 56); the profile card uses `lg` |
| `store_card` (inherits `card`) | stores | **refused**: the store row is `card` + `icon_tile` + `badge` + `switch`; `item_card` stays the printer card. A theme restyles it through `card`, `icon_tile` and `badge`. No key reads a `store_card` |
| `menu_row.base.min_height` 50 for the options screen | stores | **refused**: the options rows are list rows built from `size.lg`; a second min height on `menu_row` would have no reader |
| `list_row.base.min_height` 64 for Sessions rows | profile | **refused**: the 44 button plus the padding already make 64; a larger minimum would change every settings row |
| the customer's note under a product line (warning tint), the dot on the header's "More" | orderDetails | **refused as keys**: built from `warning_subtle`, `warning_text`, `radius.sm` and `danger`, which a theme already sets; the dot is not in the mockups |
| `printers.test_print` (visibility) | printers | **refused** again: "Test print" and "Reconnect" are the operation's |
| `bill` typography and colors | (found by the check) | **wired**: `OrderDetails/styles.ts` and `PaymentCard.tsx` read `bill.row`, `row_color`, `row_gap`, `total`, `total_color`; defaults reproduce the mockups (rows 12 muted, gap 5, total 18 / 600) |
| `header.base.subtitle`, `subtitle_color` | (found by the check) | **wired** in `ONavbar` |

Keys removed because nothing of the redesign reads them: `conversation_row.base.preview`, `preview_color`, `preview_unread`,
`preview_unread_color`; `account_page.base.title` and `title_min_height`;
`order_details.base.info_text` and `detail_icon_size`; `timeline.base.pending_color`; `item_card.base.divider`, `status_min_height` and
`slots.tile`; `review_form.base.title` and `title_color`; `ticket_paper.base.paper_width`, `separator` and `title`;
`auth_form.slots.cancel` and `language`; `chat_bubble.slots.unread`. `THEME-KEY-PENDING` markers: none left in `src/`.

Readers: `pnpm theme:keys` reports none missing. The tool is lenient (a name under `base.` counts when any file builds a
`` `base.${x}` `` path), so the same check was also run by name inside the files that name each component: every other key is read.
25 keys the search cannot see are recorded in `theme-readers.json` (the button's matrix, the whole-look states, the icon colors).
Keys of the `ordersLive` components (`new_order_alert`, `board`, `connection_status`) were not removed: their code was still
being built.

Guard exceptions recorded in `theme-exceptions.json` (3 new, round 2): the printed ticket's font sizes in
`src/printing/(usePrinterCommands|useGenericTicketCommands|utils)` (category `font_size`, property `font-size`), the paper's
monospace family in `TicketPreview/TicketPaper.tsx` (`font_family`, `Platform.select(`) and `opacity: 0` of the Star canvas in
`TicketPreview/PrintingHost.tsx`.

## 10. What I did not verify

- That each key is *drawn*: the check is by property name inside the files that name the component, so a generic name (`background`, `color`, `title`) read for another piece could hide an unread key; the `ordersLive` components (`new_order_alert`, `board`) were not finished when I checked.
- That the markers found each mockup that draws a piece: the "Mockups" columns come from regular expressions over the inline
  styles; a piece drawn in a different way is missing from its list, a coincidence of styles would add one.
- That the libraries in section 6 are the only ones that paint their own UI: the list is the area reports' (area 1 section 2,
  area 3 1.13, area 6 1.6, area 7 1.11, area 2 1.6); I did not read `package.json` against it.
- The editor's cards: components I changed have no `groups` (cards) yet; their rows list in order. Cards are the editor pass.

## Round 1 of the one-look pass (2026-11-19)

- `board.base.column_title` and `board.base.column_title_color` are **removed** from the schema (and their editor labels): the tablet board's
  column name is a `SectionTitle` (`section_header`), the same overline as the phone's stage titles (owner's decision, harmony H14).
- The three alert sounds are bundled files (`src/assets/sounds`, `docs/SOUNDS.md`); no schema key (sounds are not theme images).
- The tab bar's four tabs sit in the content column (`screen.base.max_width`) over a full-width bar; the key is read by `AppShell/TabBar.tsx` too.
- One empty state: `NotFoundSource` (`empty_state`) draws the orders', stores', messages' and printers' empty states (a `footnote` line under the action).
- A count is written by one function (`shared/countText`, `99+`); a count badge keeps its size's side padding (`badge.sizes.sm.padding_x`).
