# Editor labels the store app schema needs in the Dashboard

Date: 2026-11-23 · Source: `product.schema.json` (`store_app` 1.2.0) compared by script with the Dashboard's own catalog
(`Finitless-com/ordering-dashboard`, `i18n/translations.json` of its `main` at `df2f464ca`):

    node scripts/theme/labels.mjs --catalog <ordering-dashboard>/i18n/translations.json --other <another product.schema.json> --markdown

The editor writes each label from the Dashboard's catalog by its key and falls back to the schema's English only for a key the
catalog does not have. The schema has 708 label keys (every `{ key, default }` of a `label` or an `info`): 500 are already in the
catalog with the same English, and **208 are to be added there** with their English text (then the Dashboard's other languages),
in a pull request of the Dashboard's repository, before the schema is published. 53 of them ("Shared: yes") are also keys of
the driver app's schema, which is not in the catalog yet either: whichever pull request merges first adds them.

**No key has two meanings.** The check fails when a key of this schema is in the catalog with another English text (the editor
would show the other product's words). On 2026-11-23 it found fifteen, all against the marketplace's texts, and they were settled
before any publish: ten took the catalog's text, being the same thing (`BUILDER_THEME_PAGE_SECTION_ACCOUNT` "My account",
`…_SECTION_FORM` "Form", `…_SECTION_STATUS` "Status", `BUILDER_THEME_PROP_THUMB_SIZE` "Handle size",
`BUILDER_THEME_VIS_ITEM_BUSINESS_CARD_LOGO` "Logo", `…_MENU_HELP` "Help", `…_MENU_LANGUAGE` "Language", `…_MENU_NOTIFICATIONS`
"Notifications", `…_PRODUCT_IMAGE` "Image", `…_PRODUCT_OPTIONS_PRICE` "Option prices"), and five, being another thing, got a key
of their own (`BUILDER_THEME_PAGE_SECTION_ORDER_ACTIONS` "Action buttons", `BUILDER_THEME_PROGRESS_TIME_BAR_HELP`,
`BUILDER_THEME_PROP_COLUMN_COUNT` "Columns", `BUILDER_THEME_PROP_PRICE_TEXT` "Price",
`BUILDER_THEME_VIS_ITEM_ORDERS_TOTAL_PAYMENT` "Total and payment"). No key has two English texts inside this schema, and every
value node of the schema has its editor metadata.

"Where" is the schema path of the first use.

## Components (10)

| Key | English | Where | Shared |
|---|---|---|---|
| `BUILDER_THEME_COMPONENT_BOARD` | Kitchen board | `components.board.label` |  |
| `BUILDER_THEME_COMPONENT_CHOICE_TILE` | Choice tile | `components.choice.label` |  |
| `BUILDER_THEME_COMPONENT_CONVERSATION_ROW` | Conversation row | `components.conversation_row.label` |  |
| `BUILDER_THEME_COMPONENT_ITEM_CARD` | Store and printer card | `components.item_card.label` |  |
| `BUILDER_THEME_COMPONENT_MAP_MARKER` | Map marker | `components.map_marker.label` | yes |
| `BUILDER_THEME_COMPONENT_MENU_ROW` | Product row | `components.menu_row.label` |  |
| `BUILDER_THEME_COMPONENT_NEW_ORDER_ALERT` | New order notice | `components.new_order_alert.label` | yes |
| `BUILDER_THEME_COMPONENT_SCREEN` | Screen content width | `components.screen.label` |  |
| `BUILDER_THEME_COMPONENT_TICKET_PAPER` | Ticket preview paper | `components.ticket_paper.label` |  |
| `BUILDER_THEME_COMPONENT_TIMELINE` | Order timeline | `components.timeline.label` |  |

## Properties (72)

| Key | English | Where | Shared |
|---|---|---|---|
| `BUILDER_THEME_PROP_ACCEPT_WIDTH` | Accept width | `editor.props.accept_width.label` |  |
| `BUILDER_THEME_PROP_ACTIVE` | Active | `editor.props.active.label` |  |
| `BUILDER_THEME_PROP_ACTIVE_LABEL` | Active label | `editor.props.active_label.label` |  |
| `BUILDER_THEME_PROP_BASELINE` | Baseline | `editor.props.baseline.label` |  |
| `BUILDER_THEME_PROP_BUTTON_SIDE_SPACE` | Button side space | `editor.props.button_padding_x.label` |  |
| `BUILDER_THEME_PROP_COLUMN_BACKGROUND` | Column background | `editor.props.column_background.label` |  |
| `BUILDER_THEME_PROP_COLUMN_COUNT` | Columns | `editor.props.columns.label` |  |
| `BUILDER_THEME_PROP_COLUMN_PADDING` | Column padding | `editor.props.column_padding.label` |  |
| `BUILDER_THEME_PROP_COLUMN_RADIUS` | Column radius | `editor.props.column_radius.label` |  |
| `BUILDER_THEME_PROP_CURRENT_COLOR` | Current color | `editor.props.current_color.label` |  |
| `BUILDER_THEME_PROP_DETAIL_PANE_WIDTH` | Detail pane width | `editor.props.detail_pane_width.label` |  |
| `BUILDER_THEME_PROP_DONE_COLOR` | Done color | `editor.props.done_color.label` |  |
| `BUILDER_THEME_PROP_DOT` | Dot | `editor.props.dot.label` | yes |
| `BUILDER_THEME_PROP_DOT_GAP` | Dot gap | `editor.props.dot_gap.label` | yes |
| `BUILDER_THEME_PROP_DOT_SIZE` | Dot size | `editor.props.dot_size.label` | yes |
| `BUILDER_THEME_PROP_ENDED_COLOR` | Ended color | `editor.props.ended_color.label` |  |
| `BUILDER_THEME_PROP_FAILURE_COLOR` | Failure color | `editor.props.failure_color.label` |  |
| `BUILDER_THEME_PROP_FIGURE` | Figure | `editor.props.figure.label` |  |
| `BUILDER_THEME_PROP_FILLED` | Filled | `editor.props.filled.label` |  |
| `BUILDER_THEME_PROP_FOLDED_MIN_HEIGHT` | Folded min height | `editor.props.folded_min_height.label` |  |
| `BUILDER_THEME_PROP_HANDLE_COLOR` | Handle color | `editor.props.handle_color.label` |  |
| `BUILDER_THEME_PROP_HANDLE_HEIGHT` | Handle height | `editor.props.handle_height.label` | yes |
| `BUILDER_THEME_PROP_HANDLE_WIDTH` | Handle width | `editor.props.handle_width.label` |  |
| `BUILDER_THEME_PROP_HIT_WIDTH` | Hit width | `editor.props.hit_width.label` |  |
| `BUILDER_THEME_PROP_INACTIVE` | Inactive | `editor.props.inactive.label` |  |
| `BUILDER_THEME_PROP_INDICATOR` | Indicator | `editor.props.indicator.label` |  |
| `BUILDER_THEME_PROP_INDICATOR_LENGTH` | Indicator length | `editor.props.indicator_length.label` |  |
| `BUILDER_THEME_PROP_INDICATOR_THICKNESS` | Indicator thickness | `editor.props.indicator_thickness.label` |  |
| `BUILDER_THEME_PROP_INK` | Ink | `editor.props.ink.label` |  |
| `BUILDER_THEME_PROP_INSET` | Inset | `editor.props.inset.label` |  |
| `BUILDER_THEME_PROP_ITEM_SIZE` | Item size | `editor.props.item_size.label` |  |
| `BUILDER_THEME_PROP_JOINED` | Joined | `editor.props.joined.label` |  |
| `BUILDER_THEME_PROP_LIST_PANE_WIDTH` | List pane width | `editor.props.list_pane_width.label` |  |
| `BUILDER_THEME_PROP_MAIN` | Main | `editor.props.main.label` |  |
| `BUILDER_THEME_PROP_MINI_MAP_HEIGHT` | Mini map height | `editor.props.mini_map_height.label` |  |
| `BUILDER_THEME_PROP_MUTED_BACKGROUND` | Muted background | `editor.props.muted_background.label` |  |
| `BUILDER_THEME_PROP_MUTED_COLOR` | Muted color | `editor.props.muted_color.label` |  |
| `BUILDER_THEME_PROP_NOTICE_BACKGROUND` | Notice background | `editor.props.notice_background.label` |  |
| `BUILDER_THEME_PROP_NOTICE_COLOR` | Notice color | `editor.props.notice_color.label` |  |
| `BUILDER_THEME_PROP_NOTICE_PADDING_X` | Notice padding x | `editor.props.notice_padding_x.label` |  |
| `BUILDER_THEME_PROP_NOTICE_PADDING_Y` | Notice padding y | `editor.props.notice_padding_y.label` |  |
| `BUILDER_THEME_PROP_NOTICE_RADIUS` | Notice radius | `editor.props.notice_radius.label` |  |
| `BUILDER_THEME_PROP_PAPER_BACKGROUND` | Paper background | `editor.props.paper_background.label` |  |
| `BUILDER_THEME_PROP_PAPER_BORDER` | Paper border | `editor.props.paper_border.label` |  |
| `BUILDER_THEME_PROP_PAPER_PADDING` | Paper padding | `editor.props.paper_padding.label` |  |
| `BUILDER_THEME_PROP_PRESENTATION` | Presentation | `editor.props.presentation.label` |  |
| `BUILDER_THEME_PROP_PRESSED` | Pressed | `editor.props.pressed.label` |  |
| `BUILDER_THEME_PROP_PRICE_TEXT` | Price | `editor.props.price.label` |  |
| `BUILDER_THEME_PROP_QUANTITY_COLOR` | Quantity color | `editor.props.quantity_color.label` |  |
| `BUILDER_THEME_PROP_RAIL_WIDTH` | Rail width | `editor.props.rail_width.label` |  |
| `BUILDER_THEME_PROP_RING_COLOR` | Ring color | `editor.props.ring_color.label` | yes |
| `BUILDER_THEME_PROP_RING_WIDTH` | Ring width | `editor.props.ring_width.label` | yes |
| `BUILDER_THEME_PROP_ROW` | Row | `editor.props.row.label` |  |
| `BUILDER_THEME_PROP_ROW_COLOR` | Row color | `editor.props.row_color.label` |  |
| `BUILDER_THEME_PROP_ROW_GAP` | Row gap | `editor.props.row_gap.label` |  |
| `BUILDER_THEME_PROP_SELECTED_BORDER` | Selected border | `editor.props.selected_border.label` |  |
| `BUILDER_THEME_PROP_SELECTED_LABEL` | Selected label | `editor.props.selected_label.label` |  |
| `BUILDER_THEME_PROP_SELECTED_TEXT` | Selected text | `editor.props.selected_text.label` |  |
| `BUILDER_THEME_PROP_STATUS_MAX_WIDTH` | Connection status maximum width | `editor.props.status_max_width.label` |  |
| `BUILDER_THEME_PROP_SUBTLE` | Subtle | `editor.props.subtle.label` |  |
| `BUILDER_THEME_PROP_TEXTAREA_HEIGHT` | Textarea height | `editor.props.textarea_height.label` |  |
| `BUILDER_THEME_PROP_TIME_COLOR` | Time color | `editor.props.time_color.label` | yes |
| `BUILDER_THEME_PROP_TIME_TEXT` | Time style | `editor.props.time_text.label` | yes |
| `BUILDER_THEME_PROP_TIMER_ICON_SIZE` | Timer icon size | `editor.props.timer_icon_size.label` |  |
| `BUILDER_THEME_PROP_TRACK_HEIGHT` | Track height | `editor.props.track_height.label` |  |
| `BUILDER_THEME_PROP_TRACK_WIDTH` | Track width | `editor.props.track_width.label` |  |
| `BUILDER_THEME_PROP_TRAILING_COLOR` | Trailing color | `editor.props.trailing_color.label` |  |
| `BUILDER_THEME_PROP_TRAILING_ICON_SIZE` | Arrow icon size | `editor.props.trailing_icon_size.label` | yes |
| `BUILDER_THEME_PROP_UNAVAILABLE_COLOR` | Unavailable color | `editor.props.unavailable_color.label` |  |
| `BUILDER_THEME_PROP_UNAVAILABLE_NAME_COLOR` | Unavailable name color | `editor.props.unavailable_name_color.label` |  |
| `BUILDER_THEME_PROP_VALUE_MIN_WIDTH` | Number minimum width | `editor.props.value_min_width.label` | yes |
| `BUILDER_THEME_PROP_VARIANT` | Variant | `editor.props.variant.label` |  |

## Slots (pieces) (17)

| Key | English | Where | Shared |
|---|---|---|---|
| `BUILDER_THEME_SLOT_ACCEPT` | Accept | `components.new_order_alert.slots.accept.label` | yes |
| `BUILDER_THEME_SLOT_ACTION_SECONDARY` | Secondary action | `components.item_card.slots.action_secondary.label` |  |
| `BUILDER_THEME_SLOT_ADVANCE` | Accept and next step | `components.order_card.slots.advance.label` | yes |
| `BUILDER_THEME_SLOT_AVATAR` | Avatar | `components.conversation_row.slots.avatar.label` |  |
| `BUILDER_THEME_SLOT_CALL` | Call button | `components.order_details.slots.call.label` |  |
| `BUILDER_THEME_SLOT_DECLINE` | Decline (secondary) | `components.order_card.slots.decline.label` | yes |
| `BUILDER_THEME_SLOT_DEVICE_TILE` | Printer icon | `components.item_card.slots.device_tile.label` |  |
| `BUILDER_THEME_SLOT_MESSAGES` | Messages | `components.order_details.slots.messages.label` | yes |
| `BUILDER_THEME_SLOT_MESSAGES_COUNT` | Unread messages counter | `components.bottom_nav.slots.messages_count.label` |  |
| `BUILDER_THEME_SLOT_MUTE` | Mute | `components.new_order_alert.slots.mute.label` |  |
| `BUILDER_THEME_SLOT_PRIMARY_BUTTON` | Main button | `components.bottom_bar.slots.button.label` |  |
| `BUILDER_THEME_SLOT_RECIPIENT` | Recipient chip | `components.chat_bubble.slots.recipient.label` |  |
| `BUILDER_THEME_SLOT_REJECT` | Reject | `components.bottom_bar.slots.reject.label` | yes |
| `BUILDER_THEME_SLOT_SECONDARY_BUTTON` | Secondary button | `components.auth_form.slots.secondary.label` |  |
| `BUILDER_THEME_SLOT_STATUS` | Status | `components.item_card.slots.status.label` |  |
| `BUILDER_THEME_SLOT_TILE` | Icon | `components.empty_state.slots.tile.label` |  |
| `BUILDER_THEME_SLOT_VIEW_ORDERS` | View orders | `components.new_order_alert.slots.open.label` |  |

## Variants (14)

| Key | English | Where | Shared |
|---|---|---|---|
| `BUILDER_THEME_VARIANT_BAR` | Bar | `components.progress.variants.bar.label` |  |
| `BUILDER_THEME_VARIANT_BRAND` | Brand | `components.icon_tile.variants.brand.label` |  |
| `BUILDER_THEME_VARIANT_CUSTOMER` | Customer | `components.map_marker.variants.customer.label` |  |
| `BUILDER_THEME_VARIANT_DANGER_SOFT` | Error, soft | `components.badge.variants.danger_soft.label` | yes |
| `BUILDER_THEME_VARIANT_DRIVER` | Driver | `components.map_marker.variants.driver.label` |  |
| `BUILDER_THEME_VARIANT_PRIMARY_SOFT` | Primary, soft | `components.badge.variants.primary_soft.label` | yes |
| `BUILDER_THEME_VARIANT_STEPS` | Steps | `components.progress.variants.steps.label` |  |
| `BUILDER_THEME_VARIANT_STORE` | Store | `components.map_marker.variants.store.label` |  |
| `BUILDER_THEME_VARIANT_SUCCESS_SOFT` | Success, soft | `components.badge.variants.success_soft.label` | yes |
| `BUILDER_THEME_VARIANT_TINT` | Tint | `components.card.variants.tint.label` |  |
| `BUILDER_THEME_VARIANT_TYPE_DELIVERY` | Order type: delivery, with a driver | `components.badge.variants.type_delivery.label` | yes |
| `BUILDER_THEME_VARIANT_TYPE_IN_STORE` | Order type: in the store | `components.badge.variants.type_in_store.label` | yes |
| `BUILDER_THEME_VARIANT_TYPE_PICKUP` | Order type: pickup, the customer collects | `components.badge.variants.type_pickup.label` | yes |
| `BUILDER_THEME_VARIANT_WARNING_SOFT` | Warning, soft | `components.badge.variants.warning_soft.label` | yes |

## Visibility (45)

| Key | English | Where | Shared |
|---|---|---|---|
| `BUILDER_THEME_VIS_ITEM_AUTH_VERSION` | App version | `visibility.auth.version.label` |  |
| `BUILDER_THEME_VIS_ITEM_BOTTOM_NAV_LABELS` | Labels under the icons | `visibility.bottom_nav.labels.label` | yes |
| `BUILDER_THEME_VIS_ITEM_BOTTOM_NAV_MESSAGES` | Messages tab | `visibility.bottom_nav.messages.label` | yes |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_ORDER_CHECKLIST` | Preparation checklist | `visibility.confirmation.order.checklist.label` |  |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_ORDER_COPY` | Copy button | `visibility.confirmation.order.copy.label` | yes |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_ORDER_COUNTDOWN` | Ready-in countdown | `visibility.confirmation.order.countdown.label` |  |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_ORDER_MESSAGES` | Messages button | `visibility.confirmation.order.messages.label` | yes |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_ORDER_PAYMENTS` | Payments | `visibility.confirmation.order.payments.label` | yes |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_ORDER_PRINT` | Print button | `visibility.confirmation.order.print.label` |  |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_ORDER_TYPE` | Order type and payment method | `visibility.confirmation.order.type.label` | yes |
| `BUILDER_THEME_VIS_ITEM_MAP_MINI_MAP` | Mini map of the delivery | `visibility.map.mini_map.label` |  |
| `BUILDER_THEME_VIS_ITEM_MAP_OTHER_MAPS` | Open in another maps app | `visibility.map.other_maps.label` | yes |
| `BUILDER_THEME_VIS_ITEM_MENU_ABOUT` | About row | `visibility.menu.about.label` |  |
| `BUILDER_THEME_VIS_ITEM_MENU_ORDERS_DISPLAY` | Orders display row | `visibility.menu.orders_display.label` |  |
| `BUILDER_THEME_VIS_ITEM_MENU_PRINTERS` | Printers row | `visibility.menu.printers.label` |  |
| `BUILDER_THEME_VIS_ITEM_MESSAGES_FILTER` | All and Unread filter | `visibility.messages.filter.label` |  |
| `BUILDER_THEME_VIS_ITEM_MESSAGES_SEARCH` | Search button | `visibility.messages.search.label` |  |
| `BUILDER_THEME_VIS_ITEM_MESSAGES_SENT_TO` | Sent to line | `visibility.messages.sent_to.label` |  |
| `BUILDER_THEME_VIS_ITEM_MESSAGES_SIGNATURE` | Send a signature | `visibility.messages.signature.label` | yes |
| `BUILDER_THEME_VIS_ITEM_MESSAGES_TITLE` | Title | `visibility.messages.title.label` | yes |
| `BUILDER_THEME_VIS_ITEM_MESSAGES_UNREAD_BADGE` | Unread counters | `visibility.messages.unread_badge.label` |  |
| `BUILDER_THEME_VIS_ITEM_ORDERS_ABSOLUTE_TIME` | Clock time on the order card | `visibility.orders.absolute_time.label` | yes |
| `BUILDER_THEME_VIS_ITEM_ORDERS_BOARD` | Kitchen board (tablets) | `visibility.orders.board.label` |  |
| `BUILDER_THEME_VIS_ITEM_ORDERS_ORDER_TYPE` | Order type | `visibility.orders.order_type.label` | yes |
| `BUILDER_THEME_VIS_ITEM_ORDERS_QUICK_ACTIONS` | Quick actions on the order card | `visibility.orders.quick_actions.label` | yes |
| `BUILDER_THEME_VIS_ITEM_ORDERS_REFRESH` | Refresh button | `visibility.orders.refresh.label` | yes |
| `BUILDER_THEME_VIS_ITEM_ORDERS_REVIEW_ORDER_BUTTON_DRIVER` | Review customer button | `visibility.orders.review_order_button.label` | yes |
| `BUILDER_THEME_VIS_ITEM_ORDERS_SEARCH` | Search button | `visibility.orders.search.label` | yes |
| `BUILDER_THEME_VIS_ITEM_ORDERS_STAGE_FILTER` | Stage chips of New and In progress | `visibility.orders.stage_filter.label` |  |
| `BUILDER_THEME_VIS_ITEM_ORDERS_STORE` | Store name and logo | `visibility.orders.store.label` |  |
| `BUILDER_THEME_VIS_ITEM_ORDERS_STORE_FILTER` | Store chip in the orders header | `visibility.orders.store_filter.label` |  |
| `BUILDER_THEME_VIS_ITEM_ORDERS_TITLE` | Title | `visibility.orders.title.label` | yes |
| `BUILDER_THEME_VIS_ITEM_ORDERS_TOTAL_PAYMENT` | Total and payment | `visibility.orders.total.label` |  |
| `BUILDER_THEME_VIS_ITEM_PRODUCTS_CATEGORY_COUNT` | Product counts | `visibility.products.category_count.label` |  |
| `BUILDER_THEME_VIS_ITEM_PRODUCTS_MAKE_ALL_AVAILABLE` | Make all available button | `visibility.products.make_all_available.label` |  |
| `BUILDER_THEME_VIS_ITEM_PRODUCTS_PRICE` | Price | `visibility.products.price.label` |  |
| `BUILDER_THEME_VIS_ITEM_PRODUCTS_SEARCH` | Search button | `visibility.products.search.label` |  |
| `BUILDER_THEME_VIS_ITEM_PRODUCTS_UNAVAILABLE_REASON` | Why it is unavailable | `visibility.products.unavailable_reason.label` |  |
| `BUILDER_THEME_VIS_ITEM_STORES_ADDRESS` | Address | `visibility.stores.address.label` |  |
| `BUILDER_THEME_VIS_ITEM_STORES_HOURS` | Opening hours text | `visibility.stores.hours.label` |  |
| `BUILDER_THEME_VIS_ITEM_STORES_SEARCH` | Search button | `visibility.stores.search.label` |  |
| `BUILDER_THEME_VIS_ITEM_TICKET_PDF` | Share as PDF | `visibility.ticket.pdf.label` |  |
| `BUILDER_THEME_VIS_MAP` | Map | `editor.sections.groups.label` | yes |
| `BUILDER_THEME_VIS_PRINTING` | Printing | `editor.sections.groups.label` |  |
| `BUILDER_THEME_VIS_PRODUCTS` | Menu | `editor.sections.groups.label` |  |

## Pages and sections (21)

| Key | English | Where | Shared |
|---|---|---|---|
| `BUILDER_THEME_PAGE_LOGIN` | Log in | `pages.login.label` |  |
| `BUILDER_THEME_PAGE_MENU` | Menu | `pages.menu.label` |  |
| `BUILDER_THEME_PAGE_PRODUCT_OPTIONS` | Product options | `pages.product_options.label` |  |
| `BUILDER_THEME_PAGE_SECTION_AVAILABILITY` | Availability | `pages.product_options.sections.options.label` | yes |
| `BUILDER_THEME_PAGE_SECTION_DASHBOARD_LINK` | Dashboard link | `pages.stores.sections.options.label` |  |
| `BUILDER_THEME_PAGE_SECTION_DELETE_ACCOUNT` | Delete account | `pages.profile.sections.options.label` | yes |
| `BUILDER_THEME_PAGE_SECTION_HANDOFF` | Hand-off note | `pages.order_details.sections.options.label` |  |
| `BUILDER_THEME_PAGE_SECTION_LOGO` | Logo | `pages.login.sections.options.label` | yes |
| `BUILDER_THEME_PAGE_SECTION_LOGOUT` | Log out | `pages.profile.sections.options.label` | yes |
| `BUILDER_THEME_PAGE_SECTION_MORE_DETAILS` | More details | `pages.order_details.sections.options.label` |  |
| `BUILDER_THEME_PAGE_SECTION_NOTE` | Order comment | `pages.order_details.sections.options.label` |  |
| `BUILDER_THEME_PAGE_SECTION_NOTICE` | Unavailable notice | `pages.menu.sections.options.label` |  |
| `BUILDER_THEME_PAGE_SECTION_ORDER_ACTIONS` | Action buttons | `pages.order_details.sections.options.label` |  |
| `BUILDER_THEME_PAGE_SECTION_PREP_TIME` | Preparation time | `pages.order_details.sections.options.label` |  |
| `BUILDER_THEME_PAGE_SECTION_REVIEW` | Review the customer | `pages.order_details.sections.options.label` | yes |
| `BUILDER_THEME_PAGE_SECTION_SEND` | Send button | `pages.review.sections.options.label` | yes |
| `BUILDER_THEME_PAGE_SECTION_SHARED_NOTICE` | Shared options note | `pages.product_options.sections.options.label` |  |
| `BUILDER_THEME_PAGE_SECTION_STORES` | Stores | `pages.stores.sections.options.label` |  |
| `BUILDER_THEME_PAGE_SECTION_SUPPORT` | Help and about | `pages.profile.sections.options.label` |  |
| `BUILDER_THEME_PAGE_SECTION_TIMELINE` | Order timeline | `pages.order_details.sections.options.label` |  |
| `BUILDER_THEME_PAGE_STORES` | Stores | `pages.stores.label` |  |

## Other (help texts, options, groups, shapes) (29)

| Key | English | Where | Shared |
|---|---|---|---|
| `BUILDER_THEME_ACCOUNT_PAGE_DRIVER_HELP` | The space below the profile, sessions, payouts and Stripe account screens, and how their fields carry their label. | `components.account_page.info` | yes |
| `BUILDER_THEME_BADGE_PLAIN_HELP` | Only the dot and the text, like the open or closed line of a store. | `components.badge.shapes.plain.info` |  |
| `BUILDER_THEME_BOARD_HELP` | The tablet orders board: one column per stage. | `components.board.info` |  |
| `BUILDER_THEME_CHOICE_TILE_HELP` | A tile you pick among a few, like the printer brand. A list of choices with a mark is a list row. | `components.choice.info` |  |
| `BUILDER_THEME_COMPONENTS_APP_PARTS` | App parts and screens | `editor.sections.groups.label` | yes |
| `BUILDER_THEME_CONVERSATION_ROW_HELP` | A row of the Messages list: who, the last message and how many are unread. | `components.conversation_row.info` |  |
| `BUILDER_THEME_HEADER_STATUS_MAX_WIDTH_HELP` | The connection status is as wide as its text, up to this width; a longer text ends in an ellipsis. | `components.header.base.status_max_width.info` |  |
| `BUILDER_THEME_ICON_TILE_HELP` | The tinted square with an icon at the start of a row, a sheet or an empty page. | `components.icon_tile.info` | yes |
| `BUILDER_THEME_ITEM_CARD_HELP` | A card for something the business owns: a store with its open state and switch, a printer with its status. | `components.item_card.info` |  |
| `BUILDER_THEME_MAP_MARKER_SHADOW_HELP` | What floats over the map keeps this shadow so it stands out from the tiles: the markers, the count, the buttons and the cards. Identity does not remove it. | `components.map_marker.base.shadow.info` | yes |
| `BUILDER_THEME_MENU_ROW_HELP` | A product of the menu with its availability switch. | `components.menu_row.info` |  |
| `BUILDER_THEME_OPTION_NAV_BOTTOM` | Bar at the bottom | `components.bottom_nav.base.placement.options.label` |  |
| `BUILDER_THEME_OPTION_NAV_RAIL` | Rail at the side | `components.bottom_nav.base.placement.options.label` |  |
| `BUILDER_THEME_OPTION_SHEET_BOTTOM` | Docked at the bottom | `components.sheet.base.presentation.options.label` |  |
| `BUILDER_THEME_OPTION_SHEET_CENTERED` | Centred card | `components.sheet.base.presentation.options.label` |  |
| `BUILDER_THEME_PAGES_STORES` | Stores and menu | `editor.sections.groups.label` |  |
| `BUILDER_THEME_PROGRESS_STEPS_HELP` | One segment per step, like the printer wizard. | `components.progress.variants.steps.info` |  |
| `BUILDER_THEME_PROGRESS_TIME_BAR_HELP` | The time bar of an order in preparation. | `components.progress.variants.bar.info` |  |
| `BUILDER_THEME_ROUND_BUTTONS_HELP` | Round buttons: a circle when there is only an icon, like the send button of the chat; fully round ends when there is a label, like the delivery position of an order. | `components.button.shapes.round.info` | yes |
| `BUILDER_THEME_SCREEN_HELP` | How wide the content of a screen grows. Tablets keep it in a centred column. | `components.screen.info` |  |
| `BUILDER_THEME_SCREEN_MAX_WIDTH_HELP` | 0 means the full width of the screen. | `components.screen.base.max_width.info` |  |
| `BUILDER_THEME_SHAPE_PLAIN` | Plain text | `components.badge.shapes.plain.label` |  |
| `BUILDER_THEME_SHAPE_ROUND` | Round | `components.button.shapes.round.label` | yes |
| `BUILDER_THEME_SHEET_MAX_WIDTH_HELP` | 0 means the full width. | `components.sheet.base.max_width.info` |  |
| `BUILDER_THEME_TICKET_PAPER_HELP` | The sheet drawn behind the ticket preview. The printed ticket itself is not themed, and its letters use the platform monospace font. | `components.ticket_paper.info` |  |
| `BUILDER_THEME_TIMELINE_HELP` | The steps an order went through: placed, accepted, ready, picked up. | `components.timeline.info` |  |
| `BUILDER_THEME_TITLES_ROW` | Row titles | `components.account_page.base.row_title.label` |  |
| `BUILDER_THEME_TYPE_BODY_LG_HEADLINE` | Card headline | `tokens.typography.body_lg.label` |  |
| `BUILDER_THEME_TYPE_OVERLINE` | Section label | `tokens.typography.overline.label` |  |

## Notes

- Property labels (`BUILDER_THEME_PROP_*`) sit in `editor.props` by property name, as the driver's: one label serves every component that has a property of that name (70 new names).
- Slot labels name what the piece is in the screen (`SLOT_ADVANCE`: "Accept and next step"), not the button's look.
- The driver's `BUILDER_THEME_VIS_ITEM_*` labels of the keys this app reuses are reused unchanged.
- Nothing here is published: the schema is not published by hand, and the Dashboard's catalog is another repository.

## Added after the iOS pass (2026-11-19)

| Key | English | Where |
|---|---|---|
| `BUILDER_THEME_VIS_ITEM_MAP_MINI_MAP` | Mini map of the delivery | `visibility.map.mini_map` (restored: the mini map is drawn) |
| `BUILDER_THEME_PROP_MINI_MAP_HEIGHT` | Mini map height | `editor.props.mini_map_height` (`order_details.base.mini_map_height`, 140) |
| `BUILDER_THEME_PROP_BUTTON_SIDE_SPACE` | Button side space | `editor.props.button_padding_x` (`bottom_bar.base.button_padding_x`, 5) |

Changed without a new key: `alert.slots.action` is a link slot (size, style: Default / Muted / Danger) in place of a button slot;
its label key `BUILDER_THEME_SLOT_ACTION` stays. `tabs.sizes.*.height` are the whole pill (sm 50 since schema 1.1.0, 46 before; md 50, lg 60) and
`tabs.variants.pill.inset` is 5; `tabs.base.text` weight is 400.

## Removed with the orders counters (2026-11-23)

The owner removed every number of orders (tabs, chips, section titles, board columns, the Orders tab's count), so five label keys
left the schema: `BUILDER_THEME_VIS_ITEM_ORDERS_COUNTERS`, `BUILDER_THEME_SLOT_ORDERS_COUNT`,
`BUILDER_THEME_PROP_COUNT_ACTIVE_BACKGROUND`, `BUILDER_THEME_PROP_COUNT_ACTIVE_COLOR` and `BUILDER_THEME_SLOT_COUNT` (the count slot
of the tabs and of the board's columns). The tables above are regenerated from the schema without them.

## Added with the connection status' width (2026-11-23)

`BUILDER_THEME_PROP_STATUS_MAX_WIDTH` "Connection status maximum width" and its help `BUILDER_THEME_HEADER_STATUS_MAX_WIDTH_HELP`
(`components.header.base.status_max_width`, 160, 80 to 320): the header's connection pill is as wide as its text up to it.

## A sixteenth key settled with the catalog (2026-11-23)

The catalog's `main` gained `BUILDER_THEME_PROP_PLACEMENT` as "Where it shows" after the first comparison; this schema said
"Placement" for the same thing (where the navigation shows: the bar at the bottom or the rail at the side), so it took the catalog's
text, as the ten of the same kind did.

## Schema 1.2.0 (2026-11-23): no new label

`components.toast.slots.action` (the button of a notice, "View order" after an accept) reuses `BUILDER_THEME_SLOT_ACTION` and the
size labels the catalog already has.
