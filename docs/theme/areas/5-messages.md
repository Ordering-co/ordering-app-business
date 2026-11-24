# Area 5 - messages and chat (business app)

Phase 1 analysis, read-only. Nothing was run (no app, no simulator, no tests, no type check): every row is from reading code, the mockups, api-core and the driver-theming repository. Written 2026-11-19.

**File legend** (business repo, all under `src/`; `XX:n` is `file:line`):

| Short | File |
|---|---|
| `pMsg` / `pChat` | `pages/Messages.tsx` / `pages/OrderMessage.tsx` |
| `MO` / `MOs` | `ui/src/components/MessagesOption/index.tsx` / `styles.tsx` |
| `PM` / `PMf` / `PMs` | `ui/src/components/PreviousMessages/index.tsx` / `FooterMessageComponent.tsx` / `styles.tsx` |
| `OM` / `OMs` | `ui/src/components/OrderMessage/index.tsx` / `styles.tsx` |
| `CH` / `CHs` | `ui/src/components/Chat/index.tsx` / `styles.tsx` |
| `CT` | `ui/src/components/Contacts/index.tsx` (dead UI; not the controller) |
| `ctl:Contacts`, `ctl:Messages`, `ctl:OrderDetails` | `src/@/components/src/components/{Contacts,Messages,OrderDetails}/index.js` (submodule, read only) |
| `api:Order`, `api:Msg`, `api:Read` | api-core `app/Http/Controllers/OrderController.php`, `OrderMessageController.php`, `OrderMessageReadController.php` |
| `D:x` | the same path under `/Users/work/Ordering/ordering-app-driver-theming/src/ui/src/components/` |

Mockups (Spanish spec in `design/redesign/SPECS.md:158-176`, pixels in `design/redesign/screens/{Messages,Chat,ChatEnded}.dc.html`). Screenshots of today: `48`-`51`, `81`-`85`, `157`.

---

## 1. Today

### 1.1 Provenance (diff against the original driver app)

The business files come from the same template as the driver app but from an **older state**: against `/Users/work/Ordering/ordering-app-driver-v26` the business `pMsg`, `MOs` and `CHs` are byte-identical; `MO` differs by 32 diff lines, `PM` by 104, `OM` by 343, `CH` by 854, `pChat` by 29. The differences are:

- Driver-v26 has moved on (skeleton list instead of `Placeholder`, `useSecureOrderId`, `ORDER_DRIVER_ALMOST_ARRIVED_*` keys, the chat reading from `route.params.order`, `goToBack`). The business files lack all of that.
- Business-only in `CH`: `hide_customer_contact_business_app` (`CH:127`, `CH:730`; util `ui/src/utils/contactVisibility.ts`), `reject_reason` as a plain-text change (`CH:44`), the `react-native-parsed-text` link renderer (`CH:1055-1141`), the `chatLayoutReady` mount gate for gifted-chat (`CH:1314`) and the order of the `previousStatus` ended list (identical).
- Business-only in `OM`: header with three avatars (business, customer, driver) and the title "Order No. N" (`OM:256-308`), `rn-placeholder` skeleton (`OM:163-252`).
- Business-only in `PM`: nothing but `theme.colors.orderTypeColor` for the status pill (`PM:278`) and the `'#e9f2fe'` badge literal (`PMs` (Badge)).

Everything else (the roles, the quick-message levels, the recipient logic, the `order_message_read` flow) is the driver app's code unchanged, with the driver branches (`level === 4`, `type === USER_TYPE.DRIVER`) now unreachable (this app logs in with levels `[0, 2]`, `CLAUDE.md`).

### 1.2 Conversations list (tab "Messages")

Entry: `BottomNavigator.tsx:108-121` (tab `Messages`, label `MESSAGES`, PNG `images.general.messages`, label 12 px, no badge) -> `pMsg` -> `MO` -> controller `ctl:Contacts` -> `MO:21 MessagesOptionUI` -> `PM`.

**What is listed.** `pMsg:11-24` asks the controller for `firstFetch: 'orders'`, sort `last_direct_message_at` / `asc`, `paginationSettings {page 1, pageSize 45, controlType 'infinity'}`. `ctl:Contacts:44-91` calls `ordering.orders().parameters({orderBy}).asDashboard().get({query:{page, page_size}})`: **every order the user can see** (admin: all; business owner: orders of the businesses they own, `api:Order:1264-1280`), **not only orders that have messages**. No status filter and no `where`. API side (`api:Order:795-803`): `orderBy=last_direct_message_at` is special-cased as `last_direct_message_at DESC NULLS LAST, id DESC`, so the `'asc'` in `pMsg:14` is ignored (direction is only honoured by the `-` prefix, `ctl:Contacts:51-53`); orders with no direct message come last, ordered by id.

**What a row shows** (`PM:316-395`; one `TouchableOpacity` card, `height 100`, `marginBottom 30`, `borderWidth 1 gray100`, `PM:237-247`):

| Piece | Source | file:line |
|---|---|---|
| Logo 75x75 (cover; `https` -> FastImage `uri` with priority, else `dummies.businessLogo`) | `order.business.logo` | `PM:329-339` |
| Title (16/700, 1 line) | `order.business.name` (NOT the customer) | `PM:341-344` |
| Unread badge 22x22 round, `secondary` bg, `primary` 12 px text | `order.unread_count > 0` | `PM:346-352`, `PMs:29-38` |
| Meta line: "Order No." + `order.id` + " · " + date | `delivery_datetime_utc` else `delivery_datetime` through `parseDate` | `PM:355-364` |
| Timer (12 px; literals `#00D27A` / `#FFC700` / `#E63757` by `order.time_status`) | only statuses `[0,3,4,7,8,9,13,14,18..26]` (`PM:14`); `displayDelayedTime` from `delivery_datetime_utc` + `eta_time`, with a hard-coded 300-minute offset when there is no UTC date (`PM:286-314`) | `PM:365-381` |
| Status pill (12 px, `orderTypeColor` on `secondary`) | `getOrderStatus(order.status).value`, a local 27-entry table (`PM:43-234`) | `PM:382-388` |
| No last message, no sender, no customer name, no message time | - | - |

**Sort chips** (`MO:201-224`, only rendered inside a horizontal `ScrollView`): `Newest` (`last_direct_message_at`, `MO:44-47`) and `Order number` (`id`, `desc`, `MO:48-52`). Pressing one calls `setSortBy` of the controller and sets `reload` (`MO:86-97`), which refetches page 1 (`ctl:Contacts:187-191`). Chip look: `Tag` (`MOs:19-27`) `min-height 34`, `border-radius 50`, selected `primary`/white, unselected `tabBar`/black.

**Unread count.** Per row: `order.unread_count`, computed by the API for every order of the page (`api:Order:825-910`, only when the page has <= 100 orders; `$excessive_orders_count = 100`) as `COALESCE(SUM(CASE WHEN order_message.id IS NOT NULL AND order_message_read.id IS NULL THEN 1 ELSE 0 END),0)`. That counts **every message row with no read row for this user, of any type and any `can_see`** (system "order changed" rows, type 0 "order placed", and the user's own messages included). The API also returns `unread_direct_count` (`type != 1`) and `unread_general_count` (`type = 1`) in the same payload (`api:Order:831-845,907-910`); the app reads neither. Total: `MO:63-72,114-120` sums `unread_count` into `unreadMessages`, but it is only printed inside the dead tab strip (`MO:192`); **the tab bar shows no number today** and the Messages tab is built lazily (React Navigation default; no `lazy: false` in `BottomNavigator.tsx`), so the list does not even exist until the tab is first opened.

**Live updates.** `ctl:Contacts:285-328` joins `messages_orders` (level 0) or `messages_orders_{user.id}` and `orders` / `orders_{id}` (`:259-271`); on socket `message` it refetches that order (`orders(id).asDashboard().get()`) and moves it to the top, on `orders_register` / `update_order` it merges. `HomeNavigator.tsx:39-41` also joins the messages room for the whole authenticated session.

**Pagination.** `FooterComponent` (`PMf` end of file): while loading, 5 `rn-placeholder` rows; at the end, when `pagination.currentPage < totalPages`, a primary button "Load more orders" (`LOAD_MORE_ORDERS`, hard-coded `fontFamily 'Poppins'`, `PMf` styles block) calling `loadMore` (`ctl:Contacts:193-205`: next page, deduplicated by id). Pull to refresh `getOrders` (`PM:405-408`). There is no infinite-scroll `onEndReached`.

**Empty / error.** `NotFoundSource` (image `images.general.notFound`) with `NO_RESULTS_FOUND` or the API's error / `NETWORK_ERROR` (`MO:226-238`). Screenshot `157` (airplane mode) shows cached rows with no offline notice (`INDEX.md`).

**Row press.** `PM:36-41` -> `onNavigationRedirect('OrderMessage', {orderId, setOrders})` (`pMsg:9-13` -> `navigation.navigate`). `setOrders` is a function inside route params (non-serializable; React Navigation warns).

### 1.3 The chat (stack screen `OrderMessage`)

`HomeNavigator.tsx:67-71` -> `pChat` (`KeyboardAvoidingView behavior="padding"`, `SafeAreaContainer edges top/left/right`, `pChat:15-27`) -> `OM` (controller `ctl:OrderDetails` with `driverAndBusinessId: true`, `isDisabledOrdersRoom: true`) -> `CH` (controller `ctl:Messages`) -> `GiftedChat`.

**Loads.** The order: `GET orders/{id}?mode=dashboard` (`ctl:OrderDetails:445-452`). The messages: `GET orders/{id}/messages?mode=dashboard` (`ctl:OrderDetails:146-175`); API returns only messages whose `can_see` contains the user's level (`api:Msg:111`, `string_to_array(can_see, ',')`), plus a per-message `read` flag (`api:Msg:75-79`).

**Header** (`OM:256-308`): back arrow (PNG), title `Order No. N` (20/700, `adjustsFontSizeToFit`), then 28x28 round avatars: business logo (or `dummies.businessLogo`), customer photo (remote demo URL fallback), driver photo only when `order.driver`. 5 px band under it (`borderBottomWidth 5 tabBar`, `OM:111-120`). Loading state: `rn-placeholder` bones (`OM:163-252`).

**Message kinds** (`CH:540-595`, built into gifted-chat messages; reversed so newest is last):

| Kind | API `type` | Rendering today | file:line |
|---|---|---|---|
| Order placed | 0 | one synthetic first message: "Order placed for <date> Via <app>" pill + "Sent to:" and 16x16 avatars of business / customer / driver | `CH:513-545`, `CH:576-578` |
| Order change (system / console) | 1 | pill (`inputChat` bg, radius 30, fixed width 320, 3 lines max) with the composed sentence + 10 px time `#aaa`; wording by attribute (`status`, `logistic_status`, `driver_id`, `driver_group_id`, `prepared_in` / `delivered_in` / `delivery_datetime` as minutes, `manual_driver_assignment_*`, `reject_reason`, anything else printed as a raw `Order <attr> Changed from ...`) | `CH:417-462`, `CH:44-46` |
| Text | 2 | bubble (others: `inputDisabled` bg, radii 30/30/30/0; mine: `secondary` bg, `textGray` text) | `CH:1009-1044` |
| Image | 3 (also 4, 5 exist in the API) | `message.source` as gifted `MessageImage` (150x100, lightbox) | `CH:566`, `CH:1111-1114` |
| Visibility of a message to this user | `can_see` | shown if (`messagesToShow` given - never passed) or `can_see` includes `0` or `2` (string or number), or `4` and (`type === DRIVER` or level 4) | `CH:550-560` |

Other per-message pieces: sender "Name (Role)" over others' bubbles (`CH:1201-1215`, roles table `CH:816-823`); time `hh:mm A` fixed 12 h format (`CH:1004-1007`); "Sent to:" + avatars under each message (business avatar hidden for level 2) (`CH:1143-1199`); links, phones and e-mails underlined, URL -> `Linking`, phone -> sheet Call / Text, e-mail -> `mailto:` (`CH:1055-1141`); long press on a text -> sheet "Copy Text" (`CH:1046-1053`, sheet `CH:1366-1445`); scroll-to-bottom chevron (colour key `textNormal` is undefined, `CH:1121`). `order_logbook_enabled === '0'` hides messages of type 0 and 1, **only for level 4** (`CH:589-591`): never for this app's levels.

**Who can be written to** (`CH:652-815` accessory; `CH:387-415` `handleFilter`; `CH:598-605`; `ctl:Messages:13,35-43`): `canRead` starts `{administrator, business, customer, driver}` all true, and `can_see` of the sent message is built from it (`0,2,3,4`, `ctl:Messages:35-43`).

| User level | Toggles shown | Rule |
|---|---|---|
| 2 business owner | Customer always; Driver only if `order.driver` (`CH:773`); **no Business** (`user?.level !== 2`, `CH:661`) | `minReaders = driver ? 3 : 4` (`CH:392`): with no driver nothing can be toggled (`return` at `CH:394`); with a driver at least one of Customer / Driver stays on |
| 0 administrator | Business, Customer, Driver (if `order.driver`) | `minReaders = 2` (`CH:392`): at least one besides the always-on administrator |
| 4 / others | not reachable here | - |

`canRead.driver` is forced `false` when the order has no driver and `true` when it has one (`CH:598-605`). The customer's name on its toggle is hidden when `hide_customer_contact_business_app === '1'` (`CH:730`); the label "Customer" stays. **None of the statuses changes who can be written to**: the only status rule is the "ended" one below.

**Order ended** (`CH:129-130`, `previousStatus = [1,2,5,6,10,11,12,15,16,17]`): `chatDisabled` removes the recipients and quick-message accessory (`CH:652-655`), the Send button (`CH:960-963`) and replaces the composer with an octagon-X icon plus `NOT_SEND_MESSAGES` "You can't send messages because the order has ended" (`CH:839-857`). The existing thread stays readable.

**Quick messages** (`CH:173-194`, `CH:504-509`, chips `CH:790-812`): level 0 -> `ADMIN_MESSAGE_1..4` (internal keys `message_1..4`), level 2 -> `STORE_MESSAGE_1..4`, level 4 -> `DRIVER_MESSAGE_1..4`. Fallback is the key itself (`'admin_message_1'`), so **a project without texts shows the raw keys** (screenshots `48`, `85`: "admin_message_1/2/3"). Pressing a chip appends the text to the field (`CH:194-196`, with a leading space when the field has text, `CH:811`). The local catalog `i18n/translations.json` has `STORE_MESSAGE_1` = `store_message_1` in English and junk machine translations in the other locales (`tienda_message_1`, `magasin_message_1`...): in those locales the key-looking text would not be recognised as a key by the driver's `isKey` regex (see 3 and 5).

**Attach.** Image: `react-native-image-picker` (`launchImageLibrary`, photo, 2048 max, base64) -> `data:` URL in `image` -> `ctl:Messages` sends `type: 3, file: dataURL` (`ctl:Messages:48-52`) (`CH:358-385`, button `CH:880-928`, preview 32x32 with remove, `CH:898-925`). Signature: toggles a `react-native-signature-canvas` pad (WebView) in the chat footer (`CH:1257-1297`, button `CH:868-878`); the drawn PNG is sent as the same image kind. **File attach is dead**: `handleDocumentPicker` (`CH:340-357`), `RenderActionsAttach` (`CH:607-650`, never passed to `GiftedChat`), `attachIcons`, `file` state, `@react-native-documents/picker`. The API would accept types 4 and 5 with a file (`api:Msg:41`) but the app never sends them.

**Send** (`ctl:Messages:23-77`): `POST {root}/orders/{id}/messages` with `{comment, type: 2|3, can_see: "0,2,3,4"-subset, file?}` and headers incl. `appType` from `notificationApp`; the response is appended to the local list; the socket `message` event also appends (`ctl:Messages:80-95`, deduplicated by id). Send disabled when loading, no text and no image, or messages loading (`CH:960-990`). Enter on the keyboard submits (`CH:881`).

**Read state.** `readMessages` (`ctl:OrderDetails:515-533`) calls `GET /orders/{id}/messages/{lastMessageId}/read`, which inserts a read row for **every** unread message of the order with `id <= lastMessageId` (`api:Read:62-80`), then emits `order_message_read`. In the chat it is called **only when leaving**: `OM:61-89` (back arrow and Android hardware back) zeroes the list row's `unread_count` through `setOrders` and calls `readMessages`. The iOS swipe-back gesture bypasses both, so that exit leaves the messages unread. From the order details the chat button calls `readMessages` immediately, before opening (`OrderDetails/Business.tsx:376-382`). Nobody listens to `order_message_read` in this repo (`grep`: only the controller emits it).

**Entry points.**

| Entry | Where | Behaviour |
|---|---|---|
| Messages tab row | `PM:36-41` | opens `OrderMessage {orderId, setOrders}` |
| Order details header | `OrderDetails/Business.tsx:376-382`, button `:650-662` (PNG `messages`, 20x20) with an 8 px red `Dot` when any message of someone else is unread (`:84,651`) | `navigate('OrderMessage', {orderId})`, marks read, reloads messages |
| Push | `RootNavigator.tsx:96-127,143-147,173` -> `getOpenedPushOrderId` (`getFirebasePushSetupPlan.ts:20-26`) -> `getPushOpenOrderPlan` -> `OrderDetails {isFromRoot:true}` | **A message push opens the order details, not the chat.** api-core sends chat pushes with `data.type = 'order_message'` and `order_id` (`app/Helpers/Notifications.php:285-289`; staff apps only, `:298`), and the app ignores `type`. |

**Libraries that paint their own UI** (`package.json`): `react-native-gifted-chat` 2.1.0 (the whole thread, composer, send, avatars, day separators in English `ll`, library greys `#b2b2b2`, 12/300 system text), `react-native-lightbox-v2` (image viewer, inside gifted), `react-native-parsed-text` (used directly by `CH:23,1055`, **not declared in `package.json`**: it arrives only through gifted-chat), `react-native-signature-canvas` (WebView with a `webStyle` CSS string, `red` / `#FFF` literals, `CH:1219-1246`), `react-native-image-picker` ^4.0.6 (system picker), `@react-native-documents/picker` (dead), `rn-placeholder` (skeletons `OM`, `PMf`), `react-native-fast-image` (`PM:3,330`), `@react-native-clipboard/clipboard`.

### 1.4 i18n keys used today

`MESSAGES`, `NEWEST`, `ORDER_NUMBER`, `ORDERS`, `BUSINESSES`, `CUSTOMERS`, `DRIVERS` (the last four only in dead code), `NO_RESULTS_FOUND`, `NETWORK_ERROR`, `LOAD_MORE_ORDERS`, `INVOICE_ORDER_NO`, `DAY`, the 27 status keys of `PM:43-234` (`PENDING`, `COMPLETED`, `REJECTED`, `DRIVER_IN_BUSINESS`, ..., `ORDER_DRIVER_ARRIVED_CUSTOMER`) and the 27 of `CH:132-160` (`ORDER_STATUS_PENDING`, `ORDERS_COMPLETED`, ... a different set of keys for the same statuses), `PENDING` / `IN_PROGRESS` / `IN_QUEUE` / `EXPIRED` / `RESOLVED` / `UNKNOWN` (logistic tags), `ORDER_ATTRIBUTE_CHANGED_FROM_TO`, `ORDER_ATTRIBUTE_CHANGED_TO`, `ORDER`, `CHANGED`, `CHANGED_FROM`, `TO`, `MINUTES`, `WAS_ASSIGNED_AS_DRIVER`, `DRIVER_UNASSIGNED`, `ORDER_PLACED_FOR`, `VIA`, `OTHER`, `SENT_TO`, `BUSINESS`, `CUSTOMER`, `DRIVER`, `ADMINISTRATOR`, `CITY_MANAGER`, `BUSINESS_OWNER`, `DRIVER_MANAGER`, `ADMIN_MESSAGE_1..4`, `STORE_MESSAGE_1..4`, `DRIVER_MESSAGE_1..4`, `WRITE_MESSAGE`, `NOT_SEND_MESSAGES`, `COPY_TEXT`, `CALL`, `TEXT`, `CANCEL`, `IMAGE_NOT_FOUND`, `YOU_HAVE_BEEN_REMOVED_FROM_THE_ORDER`, `ERROR`. Any attribute the sentence builder does not know goes through `t(ATTRIBUTE.toUpperCase(), capitalize(...))`.

### 1.5 Conditions (status / config / level) summary

| Condition | Effect | file:line |
|---|---|---|
| order status in `[1,2,5,6,10,11,12,15,16,17]` | chat disabled (no recipients, quick messages, send; notice) | `CH:129-130,652,839,960` |
| status in `[0,3,4,7,8,9,13,14,18..26]` | list row shows the timer | `PM:14,365` |
| `user.level` 0 / 2 | quick-message set (`ADMIN_` / `STORE_`); Business toggle hidden for 2; `minReaders` | `CH:504-509,661,392` |
| `order.driver` present | Driver toggle, driver avatar in header and "Sent to"; `canRead.driver` true | `CH:773,598-605`, `OM:296` |
| `configs.hide_customer_contact_business_app === '1'` | customer name hidden on the recipient toggle (nothing else in the chat) | `CH:127,730` |
| `configs.order_logbook_enabled === '0'` | hides logbook messages only for level 4 (never here) | `CH:589` |
| `order.unread_count > 0` | row badge | `PM:346` |
| `order.time_status` | timer colour | `PM:367-377` |
| `message.can_see` | who sees a message, who appears in "Sent to" | `CH:550-560,1143-1199` |
| phone / URL / e-mail in text | link; phone opens Call/Text sheet | `CH:1055-1141` |

### 1.6 Dead code

| What | Evidence |
|---|---|
| `Contacts` UI (`CT` + `ui/src/components/Contacts/styles.tsx` + its test) | Not exported by `ui/index.tsx`; `grep "components/Contacts\|from '../Contacts'"` finds only its own test. `MO:12` imports the controller from `@components`. |
| Tab strip, `handleChangeTab`, tags `BUSINESSES` / `CUSTOMERS` / `DRIVERS` (keys 2-4), commented `Contacts` block, `FiltersTab`, `TabsContainer` | `tabs` has one entry (`MO:38-41`) so `tabs.length > 1` is false (`MO:167`); `MO:253-267` commented |
| `unreadMessages` state, `dimensions`, `WebsocketStatus` import, unused style keys `icons`, `tab`, `pressable`, `loadButton*` | read of `MO` |
| In `OM`: `unreadAlert`, `openModalForBusiness` (constant `true`, `OM:33`), the `messagesReadList` effect, `OrderMessageContainer`, the `user.level === 4` "removed from the order" alert (`OM:46-59`) | levels are `[0,2]`; `type` is always `BUSINESS` |
| In `CH`: file-attach flow (see 1.3), `orientation` state with a `Dimensions` listener whose state is never read (`CH:207-228`), `getTimeAgo`, `readMessages`, `driverMessageList`, every `user.level === 4` / `type === DRIVER` branch (`CH:505-508,549-560,589,1184`), `containerActions`, `bubbleText`, `editButton` (`#E9ECEF` overridden by `bgColor`), `messagesToShow` (never passed), `Actions` icon branch | read of `CH`; `OM:311-317` passes none of these |
| `shared/OChatBubble.tsx` (+ test) | only its own test imports it |
| `theme.colors.textNormal` (undefined) in the scroll-to-bottom icon | `CH:1121` |

---

## 2. Target

### 2.1 What can be ported from driver-theming as it is, and what is business-only

**Port as is** (already themed, tested, same controllers and props; business differs from the original driver only in the points of 1.1):

| Business file | Driver-theming source | Notes |
|---|---|---|
| `Chat/ChatThread.tsx`, `Chat/ImageViewer.tsx`, `Chat/linkify.ts` | `D:Chat/ChatThread.tsx`, `ImageViewer.tsx`, `linkify.ts` | replaces `react-native-gifted-chat`, `react-native-lightbox-v2`, `react-native-parsed-text` |
| `Chat/changeEntries.ts` | `D:Chat/changeEntries.ts` | already words `reject_reason` and the manual-assignment attributes; it **drops** unknown attributes and prints no raw codes (behaviour change vs `CH:417-462`, an improvement; see 3) |
| `Chat/quickMessages.ts` | `D:Chat/quickMessages.ts` | levels 0 / 2 / 4, keys shown only when the project has text (decision 2026-11-14 of the driver log); widen the `isKey` regex (see 5.3) |
| `Chat/styles.ts`, `Chat/index.tsx` | `D:Chat/styles.ts`, `D:Chat/index.tsx` | `FilterChip` recipients, quick messages, `OBottomPopup` sheet of `OListRow`s, `ONotice` for the ended state, `OInput`, `OButton iconOnly`; the layout changes in 2.3 |
| `OrderMessage/index.tsx` | `D:OrderMessage/index.tsx` | reads on open and when a message arrives, `useOnReconnect`, `ChatMessageSkeleton`; header changes in 2.3 |
| `shared/ChatMessageSkeleton.tsx`, `shared/MessageListSkeleton.tsx` | `D:shared/ChatMessageSkeleton.tsx`, `MessageListSkeleton.tsx` | the list skeleton changes to the new row (2.2) |
| `MessagesOption/index.tsx` (session gate, `restart`, `useOnReconnect`, open-chat count, `order_message_read` listener) | `D:MessagesOption/index.tsx` | needs `UnreadMessagesContext`, `SocketReconnectContext`, `NavigationRef.openChatOrderId` (see 8) |
| `PreviousMessages/FooterMessageComponent.tsx` | `D:PreviousMessages/FooterMessageComponent.tsx` | |
| `pages/Messages.tsx`, `pages/OrderMessage.tsx` | `D:pages/Messages.tsx`, `D:pages/OrderMessage.tsx` | `KeyboardScreen` wrapper, `goToBack`; drop the page's own `padding: 20` and `StyleSheet` |
| `context/UnreadMessagesContext.tsx`, `context/SocketReconnectContext.tsx`, `navigators/NavigationRef.tsx` (`openChatOrderId`) | the same names in `src/context`, `src/navigators` | cross-area: the tab-bar and shell agents own the provider tree; I name the dependency |

**Business-only (written here, not in driver-theming):**

1. The conversation row of the Messages tab (customer / driver as the title, initials avatar, last message, `You:` prefix, time, unread count). The driver's `MessageRow` is a business-logo order card.
2. `All` / `Unread` chips (+ search) in place of `Newest` / `Order number`.
3. Header of the chat: customer name, `Order #N · Delivery`, call and "view order" buttons.
4. Recipients: `Business` (levels 0 only), `Customer`, `Driver` (disabled with the "No driver yet" note instead of hidden), the `hide_customer_contact_business_app` rule.
5. Ended state: the notice + outline "View order" button (the driver port draws only the notice).
6. Quick messages `ADMIN_MESSAGE_N` / `STORE_MESSAGE_N` are already in `quickMessagesOf`; nothing to write, only translations.
7. Image attach: same as the driver port. **File attach has no UI to port** (dead code both here and in the driver app; not in the mockups).
8. Tablet two-pane layout (section 6).

### 2.2 Messages.dc.html (390 x 844, root tab)

Component tree (phone):

```
pages/Messages.tsx
  SafeAreaContainerLayout                      (existing layout; no page-level padding)
    MessagesOption                             (controller Contacts, keyed by user, session gate - ported)
      ONavbar title=t('MESSAGES')              [visibility messages.title]
        right: OButton iconOnly ghost 'search-outline' 44  [visibility messages.search]
      Chip row (ScrollView horizontal, gutter 20, gap 10)  [visibility messages.filter]
        FilterChip 'All' (selected state)  ·  FilterChip 'Unread' + OBadge count 'sm'
      (search field: OInput row under the bar when the search button is on)
      NotFoundSource / empty_state             (kept; see 5 for the new texts)
      PreviousMessages
        FlatList<ConversationRow>  (ItemSeparatorComponent ODivider, pull to refresh with spinner colours)
        MessageListSkeleton (new row shape) while loading; FooterComponent "Load more orders"
```

`ConversationRow` (new, `PreviousMessages/ConversationRow.tsx`, memoised like `D:PreviousMessages` `MessageRow`):

| Mockup piece (`Messages.dc.html`) | Primitive / token | Data |
|---|---|---|
| Disc 44, initials 14/600, bg `#E9F2FE`, text `#1862C5`; ended: bg `#E9ECEF`, text `#616161` | `OAvatar size md` (44 = `components.avatar.sizes.md`) **plus a new initials mode** (4.3) | initials of `order.customer.name + lastname` (or the driver when the title is the driver, see Q3) |
| Name 14/600; `(Driver)` 12/400 muted next to it | `OText preset label`, `OText preset caption color text_muted` | `order.customer.name` / `order.driver.name`; with `hide_customer_contact_business_app` the title falls back to `t('CUSTOMER')` as `OrderDetails/Business.tsx:459` does |
| Time right, 12 muted | `OText caption` | `order.last_direct_message_at` (in the payload, `api:Order` model `Order.php:195-196,289-290`), formatted with the project's time format (`parseDate(..., {outputFormat: timeFormat})`) |
| `#1053 · Delivery` 12 muted | `OText body_sm text_muted` | `order.id`, delivery type label (reuse the orders area's label for `delivery_type`; today a 9-branch ternary in `PreviousOrders/OrderItem.tsx:269-283`) |
| Last line 12, black / 600 when unread, `#616161` when read, ellipsis, `You: ` prefix when mine | `OText` | **last message text + author: not in the orders payload** (3) |
| Count 20, accent circle | `OBadge count`, `chat_bubble.slots.unread` (`size sm`, `variant primary`, the driver's slot, same 20 px) | `order.unread_count` (or `unread_direct_count`, Q4) |
| Ended order (statuses `previousStatus`): whole row `#616161`, line = `Order completed` | `OText color text_muted` | line = `orderStatusName(t, order.status)` (app-only; the mockup shows the status text, not a message) |
| Row padding 15 0, bottom line 1 `#E9ECEF`, gap 15 | new `components.conversation_row` (4.3) + `ODivider` | - |
| Tab bar: Messages accent counter 2 (Orders keeps its red 3) | `BottomNavigator` badge (the driver's `tabBarIcon(..., unreadBadge)`) | total unread, see 3 |

Rewritten files: `MessagesOption/index.tsx` (ported + chips), `PreviousMessages/index.tsx` (new row), `PreviousMessages/styles.ts` (replaces `styles.tsx`), `PreviousMessages/FooterMessageComponent.tsx`, `pages/Messages.tsx`; deleted: `MessagesOption/styles.tsx`. Ported from: `D:MessagesOption/index.tsx`, `D:PreviousMessages/{index,FooterMessageComponent,styles}`, `D:shared/MessageListSkeleton.tsx` (re-shaped to the new row: 44 disc, 3 lines).

### 2.3 Chat.dc.html (open conversation, order #1053) and ChatEnded.dc.html (order #1041)

Component tree:

```
pages/OrderMessage.tsx
  KeyboardScreen behavior=padding > SafeAreaContainer edges top/left/right
    OrderMessage (ctl:OrderDetails, ported)
      ChatMessageSkeleton while loading
      ONavbar onBack title=<customer name> subtitle='Order #1053 · Delivery'
        right (rightButtons): OButton iconOnly ghost 'call-outline' [visibility messages.call]  +  OButton iconOnly ghost 'bag-outline' (aria 'View order')
      Chat (ctl:Messages)
        Recipients row (under the header, outside the keyboard-covered footer):  OText 'Send to' + FilterChip Customer / Driver (disabled) + OText 'No driver yet'   [not hideable: it decides can_see]
        ChatThread  (ported; inverted FlatList)
          notice pill ×N    (type 0 / 1: "Order placed · 12:29 PM", "Order completed · 11:48 AM")
          bubble theirs (surface_alt, radius 10, 10/15 padding) + time below, 12 muted
          bubble mine   (primary_subtle) + "12:32 PM · Sent to customer" below
        Quick replies row (FilterChip md, horizontal ScrollView)   [messages.quick_messages]
        Footer: ODivider + composer row = OButton iconOnly outline 44 (image) + OInput + OButton iconOnly primary 44 (send)
        -or, order ended-  ONotice info + OButton outline 44 'View order'
        OBottomPopup (message options: OListRow Copy / Call / Text + Cancel)    (ported)
```

What differs from the driver port (so cannot be copied blindly):

| Mockup | Driver-theming today | Change to make |
|---|---|---|
| Recipients row under the header, before the thread | recipients are the first row of the composer (`D:Chat/index.tsx:renderRecipients`) | move the row above the thread; `Driver` chip rendered **disabled** with `No driver yet` instead of hidden (`!!order?.driver` only decides `disabled`); chips without the checkmark icon (the selected look is `primary_subtle` + `primary_pressed` text, the unselected 1 px `border`; `FilterChip` reserves the border so the size does not change) |
| Quick replies above the composer's top line | inside the composer, under the divider | order: thread, quick replies, `ODivider`, composer row |
| Composer: image button, input (50), send (44); **no signature button** | signature + image + field + send | signature is not drawn: see Q5 |
| Bubbles: radius 10, no tail, mine = `#E9F2FE` with black text, theirs = `#F8F9FA`; time **outside** the bubble | `chat_bubble.base`: tail true, mine = primary with white text, time inside the bubble | business defaults for `chat_bubble` (4.3); `ChatThread` moves the time and the "Sent to" line under the bubble: `time · Sent to: Customer` for mine, `time` for theirs |
| Notice: pill, radius full, padding 5/15, 12 muted, text + time in one line | `notice` box with `bubble.radius`, `paddingVertical sm`, `body_sm` | new `chat_bubble.base.notice_*` keys (4.3) |
| Header: customer name (20/700) + `Order #N · Delivery`, no logo, call + view-order buttons | business name + order number + status, store logo at the end | business `OrderMessage` header; `Delivery` / `Pickup` from the order's delivery type |
| Ended chat: header without call; notice + "View order" outline button (no recipients, no quick messages, no composer) | notice only | add the button (`navigate('OrderDetails', {orderId})`; with navigation 7 a second details screen is pushed on top of the chat, which is fine, back returns to the chat) |

Files rewritten: `pages/OrderMessage.tsx`, `OrderMessage/index.tsx`, `Chat/index.tsx`, `Chat/ChatThread.tsx` (time / sent-to placement, notice shape), `Chat/styles.ts`. Deleted: `OrderMessage/styles.tsx`, `Chat/styles.tsx`. Ported from: `D:Chat/*`, `D:OrderMessage/index.tsx`, `D:shared/ChatMessageSkeleton.tsx`, `D:pages/OrderMessage.tsx`.

Primitives used (all exist in driver-theming `shared/`, to be ported by the shell/shared agent before this area can compile): `ONavbar`, `OAvatar`, `OBadge`, `FilterChip`, `ODivider`, `OListRow`, `ONotice`, `OText` (presets `label`, `body`, `body_sm`, `caption`), `OButton` (`iconOnly`, `round`, `color`, `appearance`), `OInput`, `OFab`, `OSpinner`, `Icon`, `ModalCloseButton`, `OBottomPopup` (`padded`), `KeyboardScreen`, `SkeletonBone`, `ChatMessageSkeleton`, `MessageListSkeleton`, `NotFoundSource` (empty state), plus `utils/{orderStatusName, formatDelay, apiErrorText}` (absent in this repo today: `ui/src/utils/index.tsx` only has `capitalize`) and `@/theme/helpers`. The mockups add: initials avatar, conversation row, call / view-order header buttons, `Unread` chip with a count.

### 2.4 What the mockups add, and the data each needs

| Addition | Data | See |
|---|---|---|
| Last message preview and sender on the list item | text, author id / name / level, type of the last direct message of each order | 3 |
| Unread counter on the tab | sum of `unread_count` of the loaded orders (the driver's approach) | 3 |
| `Unread` filter chip with a count | `unread_count` of the loaded orders | 3 |
| Search button | no search in the controller; local filter on loaded rows | 3, Q2 |
| Recipients as chips | already `canRead` in `ctl:Messages` | 3 |
| Ended-order chat state with "View order" | order status (already) | 3 |
| Call button in the chat header | `order.customer.cellphone` / `phone` | 3 |

---

## 3. Behaviour kept / changed

Legend for "Source": **works today** (data and logic exist, only the UI is new), **app-only new logic** (written in `src/`, no submodule or backend change), **needs backend** (api-core or the `Contacts` controller must change; the submodule is not edited by this project).

| # | Behaviour | Kept / changed | Source | Evidence |
|---|---|---|---|---|
| 1 | List = every order of the user, sorted by last direct message desc (nulls last), 45 per page, "Load more orders" button, pull to refresh | **Kept** | works today | `pMsg:11-24`, `ctl:Contacts:44-91`, `api:Order:795-803` |
| 2 | Row title is the business name today; mockup: customer (or driver) | **Changed** (mockup) | works today for the customer name (`order.customer` is in the payload: `OrderController.php:709`, not run); driver title needs the last author | `PM:341`; Q3 |
| 3 | Row shows time left / delay timer and status pill today; mockup: time of last message and `#id · type` | **Changed** (mockup). Timer and status pill leave the list; the status survives only as the text of an ended row | works today (`last_direct_message_at`, `delivery_type`, `status` in the payload) | `Order.php:195-196,289-290` |
| 4 | Last message text and sender (`You:`) on the row | **Added** | **needs backend** to be cheap: the orders payload has dates and counts, not the text (`api:Order:831-845,907-910` returns only `unread_*` counts; `last_message_at` / `last_direct_message_at` are dates). **App-only** fallback: one `GET orders/{id}/messages?mode=dashboard&limit=1&orderBy=-id` per visible row (the endpoint accepts `limit`, `offset`, `orderBy`, `where`, `api:Msg:68`; the `-id` ordering and `limit=1` were not run), cached by order id and refreshed from the socket `message` payload (it carries `comment`, `author`, `created_at`, `can_see`, as sent at `api:Msg:231-237`). Up to 45 extra requests per page | Q1 |
| 5 | Unread count per row | **Kept**, source decision | works today | `unread_count` counts type 0 and 1 rows and the user's own sent messages until the next `/read` (`api:Order:831`, `api:Read:62-80`); `unread_direct_count` (`type != 1`) is already in the payload; Q4 |
| 6 | Tab unread counter | **Added** | app-only (driver precedent `D:context/UnreadMessagesContext.tsx`: sum over loaded orders, "+" when more pages) | no endpoint for a total (`api:Order` only per order); today's tab is lazy so the Messages tab must be built at launch (`lazy: false`), one more orders call at launch as the driver accepted (decision 2026-11-18 of the driver log) |
| 7 | Sort `Newest` / `Order number` | **Changed** (the mockup draws `All` / `Unread`) | works today if kept | Q2 |
| 8 | `Unread` chip filter | **Added** | app-only, **partial**: filters the loaded pages (45 per page), the count can be a lower bound | no server filter for unread in `ctl:Contacts` (no `where`, `ctl:Contacts:57-63`); a server filter needs the controller or api-core |
| 9 | Search | **Added** (button drawn, no field drawn) | app-only over loaded rows (customer name, order id, last message); server search **needs the submodule** | `ctl:Contacts` has no search parameter |
| 10 | Chat recipients as chips, with disabled Driver + "No driver yet" | **Changed** UI, rules **kept** | works today | `CH:387-415,598-605,652-815`; the driver port keeps the same `handleFilter` (`D:Chat/index.tsx`, identical to `CH:387-415`) |
| 11 | Business toggle only for level 0, not for 2 | **Kept** | works today | `CH:661` |
| 12 | `hide_customer_contact_business_app` hides the customer name | **Kept**, extended to the list title, the header title and the call button | app-only | `contactVisibility.ts`; `CH:730`; `OrderDetails/Business.tsx:459` |
| 13 | Ended order: no recipients, quick messages or send | **Kept**; adds the "View order" button | works today (+ navigation) | `CH:129-130,652,839,960` |
| 14 | Quick messages by level, only with project text | **Changed** (driver decision 2026-11-14): no raw keys | works today | `D:Chat/quickMessages.ts`; screenshots `48`, `85` showed the keys; the local catalog has junk locale values (1.3, 5.3) |
| 15 | Image attach and signature | Image **kept**; signature **not drawn** | works today | Q5 |
| 16 | File attach | **Not kept** (dead since the template; no mockup) | - | `CH:340-357,607-650` |
| 17 | System / console messages | **Kept**; unknown attributes are no longer printed raw; one line `text · time` | works today | `D:Chat/changeEntries.ts` vs `CH:417-462` |
| 18 | "Order placed" first message | **Kept** (date + app `Via`), restyled as the mockup's pill | works today | `CH:513-545`; Q6 |
| 19 | Read state: read when leaving the chat | **Changed**: read when it opens and whenever a message of someone else arrives while it is open (driver port), so the iOS swipe-back and Android back no longer leave messages unread | works today (`readMessages`) | `OM:61-96` vs `D:OrderMessage/index.tsx` (read effect); `api:Read:62-80` |
| 20 | Chat reconnection catch-up, open-chat count never kept | **Added** (driver port) | app-only, needs `SocketReconnectContext` | `D:context/SocketReconnectContext.tsx` |
| 21 | Day separators and bubble times in the project's formats (today fixed `hh:mm A`, English `ll`) | **Changed** (driver port) | works today | `CH:1004-1007`; `D:Chat/index.tsx` uses `dateFormat` / `timeFormat` |
| 22 | Links, phones, e-mails in messages: URL opens, phone asks Call / Text, e-mail `mailto:` | **Kept** | works today | `CH:1055-1141`; `D:Chat/linkify.ts` |
| 23 | Long press -> Copy text (+ Call / Text for a detected phone), toast "Text copied" | **Kept**, as one sheet of list rows | works today | `CH:1046-1053,1366-1440` |
| 24 | Call button in the chat header | **Added** | app-only | phone from `order.customer.cellphone \|\| phone` (the fields `OrderDetails/Business.tsx:257-263` already reads); hidden when contact is hidden, the number is empty or the chat has ended (the ended mockup has no button) |
| 25 | "View order" button in the header (bag) | **Added** | works today (navigation) | `navigate('OrderDetails', {orderId})` |
| 26 | A message push opens the chat | **Not in the mockups**; today opens the order details | would be app-only (`data.type === 'order_message'`, `api: Notifications.php:285-289`) | Q7 |
| 27 | Header: three avatars (business, customer, driver) | **Not kept** (the mockup has none; "Sent to" is text) | - | `OM:270-307` |
| 28 | Order-details chat button red dot for unread | **Kept** (another area) | works today | `OrderDetails/Business.tsx:84,651` |

---

## 4. Proposed theme pieces

### 4.1 Pages and sections

| Page | Sections (fixed order unless noted) |
|---|---|
| `messages` (tab) | `header` (title + search) -> `filters` -> `list` (conversation rows) -> `empty` |
| `chat` (stack) | `header` (back, title, subtitle, actions) -> `recipients` -> `thread` -> `quick_replies` -> `composer` (or `ended`) |

(The driver app has no `pages.*` for messages: it hides pieces through `visibility.messages.*` only. Keep that model; sections are for the editor's grouping.)

### 4.2 `visibility` keys

| Key | Where | Same as driver / marketplace? | Default |
|---|---|---|---|
| `bottom_nav.messages` | the Messages tab | driver `bottom_nav.messages` | `true` |
| `messages.title` | list title | driver | `true` |
| `messages.sort` | **if the sort chips are kept** (Q2) | driver | `true` if kept |
| `messages.filter` | `All` / `Unread` chips | **new** | `true` |
| `messages.search` | search button (and field) | **new** | `true` |
| `messages.preview` | last-message line on a row | **new** (only if Q1 chooses the per-row fetch, so a project can drop its cost) | `true` |
| `messages.unread_badge` | row and tab counters | **new**; the driver always shows them | `true` |
| `messages.call` | call button in the chat header | **new** | `true` |
| `messages.quick_messages` | quick-replies row | driver / marketplace (driver default `true`) | `true` |
| `messages.image_upload` | image button | driver | `true` |
| `messages.signature` | signature button and pad | driver | `false` (Q5) |
| `messages.order_console` | order's own messages in the thread | driver | `true`; still obeys `order_logbook_enabled` only for level 4 (never here: the clause can be dropped) |
| `messages.time` | the time under a bubble | driver | `true` |
| `messages.sent_to` | the "Sent to" line under a message | **new**; today always shown | `true` |

Never hideable: recipients (they decide `can_see`), the composer, the thread.

### 4.3 Schema component keys beyond the driver's `product.schema.json`

| Component | Key | Value | Why |
|---|---|---|---|
| `chat_bubble.base` | `mine_background` / `mine_color` (defaults) | `{color.primary_subtle}` / `{color.text}` (driver: `primary` / `on_primary`) | the mockup's outgoing bubble is `#E9F2FE` with black text, as today's business bubble (`secondary` tint, `textGray`, `CH:1012`) |
| `chat_bubble.base` | `tail` (default) | `false` (driver: `true`) | mockup bubbles are 10 px on all corners |
| `chat_bubble.base` | `notice_radius`, `notice_padding_x`, `notice_padding_y`, `notice_background`, `notice_color` | `{radius.full}`, `{space.md}`, `{space.xs}`, `{color.surface_alt}`, `{color.text_muted}` | the order's own messages are a centred pill in the mockup, a box in the driver port |
| `chat_bubble.base` | `meta` | `{typography.caption}` | time / "Sent to" line outside the bubble |
| `chat_bubble.slots` | `recipient` | `{component: chip, size: md}` | the recipients are chips (same as the driver's use of `FilterChip`) |
| `avatar` | `initials_background`, `initials_color`, `initials_muted_background`, `initials_muted_color` | `{color.primary_subtle}`, `{color.primary_pressed}` (`#1862C5`), `{color.border}`, `{color.text_muted}` | the initials disc of the list (muted for ended orders) |
| `conversation_row` (new component) | `padding_y` `{space.md}`, `gap` `{space.md}`, `divider` (as `list_row`), `name` `{typography.label}`, `meta` `{typography.caption}`, `preview` `{typography.caption}`, `preview_unread_weight` 600, `preview_color` / `preview_muted_color`, `ended_color` | the row of the mockup (15 / 15 gap, 14/600 name, 12 lines); `list_row` has `padding_y sm`, `gap sm`, `tall_min_height 76` and is meant for settings rows |
| `chip.variants.default.states` | `disabled` | border `{color.border}`, text `{color.text_disabled}` (`#909090`) | the disabled Driver chip |
| `badge` | reuse `sizes.sm` | - | row and tab counters (20 px, 10/600) are the driver's `count` badge |
| `bottom_nav` | `badge` slot per tab (`primary` for Messages, `danger` for Orders) | - | the mockup colours the two tab counters differently (shell area) |

Everything else (`ONavbar`, `OInput`, `OButton`, `ONotice`, `OListRow`, `OBottomPopup`, `OFab`, `OSpinner`, skeleton bones, motion) is the driver's, unchanged.

---

## 5. New i18n keys (key + English fallback)

Reused as they exist in `i18n/translations.json`: `MESSAGES` "Messages", `ALL` "All", `SEARCH` "Search", `SENT_TO` "Sent to", `CUSTOMER`, `DRIVER`, `BUSINESS`, `VIEW_ORDER` "View order", `CALL` "Call", `TEXT` "Text", `COPY_TEXT` "Copy Text", `CANCEL`, `REMOVE`, `CLOSE`, `NO_RESULTS_FOUND`, `NETWORK_ERROR`, `LOAD_MORE_ORDERS`, `DELIVERY`, `PICKUP`, `ORDERS_COMPLETED`, `IMAGE_NOT_FOUND`, the role names, `ADMIN_MESSAGE_N` / `STORE_MESSAGE_N`.

| Key | English fallback | Notes |
|---|---|---|
| `UNREAD` | Unread | chip (missing today) |
| `SEARCH_MESSAGES` | Search messages | button's accessibility label and field placeholder |
| `NO_UNREAD_MESSAGES` | No unread messages | empty state of the `Unread` chip |
| `NO_MESSAGES_YET` | No messages yet | empty state of the list, if rows are limited to orders with messages (Q1) |
| `YOU_PREFIX` | You: | prefix of the row's preview, `"{YOU_PREFIX} {text}"` |
| `UNREAD_MESSAGES_COUNT` | :count: unread messages | driver key, port as is (accessibility of badges and tab) |
| `UNREAD_MESSAGES_COUNT_ONE` | :count: unread message | driver key |
| `ORDER_NO_SHORT` | No. | the driver's two-line "Order / No. 123"; only if the header keeps that form (the mockup writes `Order #1053`: use `INVOICE_ORDER_NO` + id) |
| `SEND_TO` | Send to | label of the recipients row (missing today) |
| `NO_DRIVER_YET` | No driver yet | note next to the disabled Driver chip |
| `CALL_CUSTOMER` | Call customer | call button accessibility label |
| `ATTACH_PHOTO` | Attach photo | image button label (driver uses `UPLOAD_IMAGE` "Upload image": reuse that if the owner prefers the driver's wording) |
| `WRITE_MESSAGE` | Write a message | **existing key, new English** (today "Write message"; the mockup has "Write a message") |
| `SEND_MESSAGE` | Send message | send button accessibility label (driver: `SEND`) |
| `ORDER_PLACED_AT` | Order placed | the pill: `"Order placed · 12:29 PM"` (Q6); today `ORDER_PLACED_FOR` "Order placed for" + date + `VIA` |
| `ORDER_ENDED_NO_MESSAGES` | This order has ended, so you can't send new messages. | ended notice; today `NOT_SEND_MESSAGES` "You can't send messages because the order has ended": same meaning, mockup wording; keep the key and change the English, or add this key |
| `TEXT_COPIED` | Text copied | toast after Copy (driver key, missing here) |
| `MESSAGE_OPTIONS` | Message options | sheet title (driver key) |
| `CLEAR` | Clear | only if the signature pad stays |
| `SIGNATURE` | Signature | only if the signature stays |
| `SCROLL_TO_BOTTOM` | Scroll to the last message | accessibility label of the FAB (driver key) |
| `SELECT_A_CONVERSATION` | Select a conversation | tablet right pane when no chat is chosen (section 6) |
| `ORDER_ATTRIBUTE_REMOVED` / `ORDER_ATTRIBUTE_SET_TO` | Order _attribute_ removed / Order _attribute_ set to _to_ | `changeEntries.ts` (driver keys, missing here) |

### 5.3 Catalog problem to fix with the keys

`i18n/translations.json` contains `STORE_MESSAGE_N`, `ADMIN_MESSAGE_N`, `DRIVER_MESSAGE_N` with an English value equal to the key and machine-translated key text in the other locales (`'es': 'tienda_message_1'`, `'fr': 'magasin_message_1'`, ...). With the driver's `quickMessagesOf` those other-locale values do not match `^(store|driver|admin)_message_\d+$` and would be shown as chips. Fix: widen the regex to `_message_\d+$` (any prefix) **and** empty those locale values in the catalog so the project's own texts win. The mockup's quick replies (`On it`, `Ready in 10 min`, ...) are samples: real texts come from the project's dictionary.

---

## 6. Tablet

**Today.** There is no tablet code in this area: `pMsg`, `MO`, `PM`, `OM`, `CH` have no `Platform` / `DeviceInfo` / orientation branch that changes the layout (the only orientation state is `CH:207-228`, never read; `PMf` has a `Portrait` / `Landscape` width for skeleton bars that no longer exist after the rewrite). The one tablet branch of the app is `pages/MyOrders.tsx:28,68` (`DeviceInfo.isTablet()` and landscape or width >= 950 -> `OrdersListManager`). On a tablet the Messages tab is the phone list stretched to full width, and the chat is a full-screen stack screen.

**Mockup.** `TabletBoard.dc.html` (`SPECS.md:310-320`) draws a left rail of 80 with Orders, Messages, Stores, Profile, and the Orders board; **no tablet Messages screen is drawn**.

**Proposal (not drawn, owner to approve, Q8).** Landscape tablet (same predicate as `MyOrders`: `DeviceInfo.isTablet()` and landscape or width >= 950): `pages/Messages.tsx` renders two panes next to each other inside the rail's content area:

```
[ rail 80 ] [ list pane 360-400 (the phone list: header, chips, rows, own scroll) ] | 1 px border | [ chat pane flex 1 ]
```

- List pane = the phone `MessagesOption` unchanged, with the selected row marked (`primary_subtle` row background, the unread count cleared by the chat's read-on-open).
- Chat pane = the phone `OrderMessage` content for the selected order, keyed by order id (`key={orderId}`, the `ctl:OrderDetails` controller refetches on key change), **without the back arrow** in its header; before any selection it shows the empty state `SELECT_A_CONVERSATION`.
- Selecting a row sets local state in `pMsg` instead of `navigation.navigate('OrderMessage')` (still `onNavigationRedirect` on the phone).
- Portrait tablet below 950: the phone layout, full width, with the list and chat content capped to a readable width (a layout max-width token, not a literal).
- The bubble max width is a share of the pane (`ChatThread` uses `paddingLeft/Right xxxl`), so it adapts.
- `ChatMessageSkeleton` and `MessageListSkeleton` need a pane-sized variant only if their width is fixed (the driver ones are `%`-based).

Schema: `platforms.tablet.components.conversation_row` may override `padding_y`; `layout` gets a `messages_split` width for the list pane (new, 360 default). Cost: `pMsg` becomes the one place that knows both layouts, and `OrderMessage` must accept `onBack` optional.

---

## 7. Open questions for the owner

**Q1. Which orders appear in the list, and where does the last-message line come from?**
Options: (a) **recommended**: keep every order but hide the preview line until it is fetched, fetch `limit=1` messages lazily for the rows on screen (app-only, at most 45 extra GETs per page, cached), and ask api-core for a `last_message` object (text, author id, name, level, type) and a "has messages" filter on the orders list as the real fix; rows with no direct message show only `#id · type` (and `last_direct_message_at` is null, so they sort last). (b) Wait for the backend before showing a preview (the line is hidden for now). (c) Hide orders with no direct message on the client (partial: pages are 45 orders, so a page can come back nearly empty).

**Q2. The mockup replaces the sort chips (`Newest`, `Order number`) with `All` / `Unread`. Drop `Order number`?**
Options: (a) **recommended**: drop it; default sort stays "last message, newest first" (the API always returns that direction). A user who needs an order looks for it with search. (b) Keep it as a third chip. (c) Keep it as a sort button next to search.

**Q3. Who is the title of a row?**
The sample shows the customer for most rows and `Omar H. (Driver)` for the one whose last message came from the driver. Options: (a) **recommended**: the customer, always, with a `(Driver)` / `(Business)` tag only when the last incoming message was written by another role and the preview says so (needs Q1's author). (b) The author of the last incoming message (name changes with each message). (c) Always the customer, no tag.

**Q4. What counts as unread: `unread_count` or `unread_direct_count`?**
`unread_count` includes the system "order changed" rows and the user's own sends until `/read` runs; the badge today can read 48 (screenshot `82`) mostly from system rows. Options: (a) **recommended**: `unread_direct_count` (already in the payload; type 0 "order placed" still counts, one per order) for rows, the chip and the tab; (b) keep `unread_count` (today's number, noisy); (c) `unread_direct_count` and ask api-core to exclude type 0. Also: does the tab show the sum of messages (driver's choice, today's `MO:114` sum) or the number of conversations? The sample (2 and 2) cannot tell. Recommended: messages, with "+" when more pages exist.

**Q5. Signature pad.** The mockup's composer has no signature button, but today's chat has one. Options: (a) **recommended**: remove it from the default layout, keep the code behind `visibility.messages.signature` default `false` (it exists in the driver port); (b) show it by default (44 ghost button before the image button); (c) delete the feature (and `react-native-signature-canvas` with it).

**Q6. The "order placed" pill text.** Mockup: `Order placed · 12:29 PM`. Today: `Order placed for <date> Via <app>` (the `Via` is how a business learns the channel: web, app...). Options: (a) **recommended**: `Order placed · 12:29 PM` and, when `order.app_id` exists, ` · Via <app>`; (b) exactly the mockup (drop `Via`); (c) keep today's text.

**Q7. Should a message push open the chat?** Today any push opens the order details; api-core marks chat pushes with `data.type = 'order_message'`. Options: (a) **recommended**: open the chat for `order_message`, the details for everything else; (b) keep (details); (c) open the Messages tab. Touches `RootNavigator.tsx` / `getPushOpenOrderPlan.ts`, another area's files; I only ask.

**Q8. Tablet Messages.** Options: (a) **recommended**: list + chat side by side in landscape (section 6); (b) phone layout stretched, with a max width; (c) chat opens as a modal sheet over the list.

**Q9. Search scope.** The button is drawn, the behaviour is not. Options: (a) **recommended**: search the loaded rows by customer name, order number and last message, with a "Load more" hint; (b) hold the button until api-core / the controller offers a server search; (c) remove the button.

---

## 8. Work breakdown

**Files an implementation agent owns** (business repo, `src/`):

- `pages/Messages.tsx`, `pages/OrderMessage.tsx`
- `ui/src/components/MessagesOption/index.tsx` (rewrite from `D:MessagesOption`); delete `MessagesOption/styles.tsx`
- `ui/src/components/PreviousMessages/index.tsx`, `ConversationRow.tsx` (new), `FooterMessageComponent.tsx`, `styles.ts` (replaces `styles.tsx`)
- `ui/src/components/OrderMessage/index.tsx`; delete `OrderMessage/styles.tsx`
- `ui/src/components/Chat/index.tsx`, `ChatThread.tsx`, `ImageViewer.tsx`, `linkify.ts`, `changeEntries.ts`, `quickMessages.ts`, `styles.ts` (all new except `index`); delete `Chat/styles.tsx`
- `ui/src/components/shared/ChatMessageSkeleton.tsx`, `MessageListSkeleton.tsx` (new, ported, re-shaped); delete `shared/OChatBubble.tsx` and its test (shared folder: coordinate with the shared-primitives agent)
- Delete `ui/src/components/Contacts/` (UI, styles, test)
- `ui/src/types/index.tsx` entries `MessagesOptionParams` (`:263`), `PreviousMessagesParams` (`:371`), `MessagesParams` (`:460`)
- `i18n/translations.json` (section 5), keys through the repo's `i18n:*` scripts
- `jest/helpers/b4MessagesDefaults.js`, `b4MessagesUiMock.js` (area helpers)
- Dependencies removed once nothing imports them: `react-native-gifted-chat`, `react-native-lightbox-v2`, `rn-placeholder` (if no other area uses it), `@react-native-documents/picker` (dead), `react-native-fast-image` (if unused elsewhere); `react-native-parsed-text` is undeclared and goes with gifted-chat; `react-native-image-picker` ^4.0.6 -> the driver's ^8.3.0.

**Cross-area dependencies to hand to other agents** (not mine to write): `context/UnreadMessagesContext.tsx`, `context/SocketReconnectContext.tsx` (and their providers in the tree), `navigators/NavigationRef.tsx` `openChatOrderId`, `BottomNavigator.tsx` (`lazy: false` for Messages, tab badge slot), `ui/src/utils` (`orderStatusName`, `formatDelay`, `apiErrorText`), the shared primitives of 2.3, the order's delivery-type label, `OrderDetails/Business.tsx` entry (already navigates `OrderMessage`), `RootNavigator.tsx` / `getPushOpenOrderPlan.ts` (Q7), the new schema keys of 4.3.

**Today's test files of the area** (all must be rewritten or removed with their components):

| File | Lines | Becomes |
|---|---|---|
| `pages/__tests__/Messages.test.tsx` | 24 | port `D:pages/__tests__/Messages.test.tsx` |
| `pages/__tests__/OrderMessage.test.tsx` | 93 | port `D:pages/__tests__/OrderMessage.test.tsx` |
| `ui/src/components/MessagesOption/__tests__/MessagesOption.test.tsx` | 74 | port + `MessagesOption.live.test.tsx` from the driver |
| `ui/src/components/PreviousMessages/__tests__/PreviousMessages.test.tsx` | 94 | rewrite for the new row |
| `ui/src/components/OrderMessage/__tests__/OrderMessage.test.tsx` | 93 | port |
| `ui/src/components/Chat/__tests__/Chat.test.tsx` | 426 | port `D:Chat/__tests__/Chat.test.tsx` and add the business cases (recipients per level, disabled Driver, ended state, `hide_customer_contact`) |
| `ui/src/components/Contacts/__tests__/Contacts.test.tsx` | 88 | delete (dead UI) |
| `ui/src/components/shared/__tests__/OChatBubble.test.tsx` | - | delete |
| new, from the driver | - | `Chat/__tests__/{changeEntries,ChatThread,linkify}.test.*`, `context/__tests__/{UnreadMessagesContext,SocketReconnectContext}.test.tsx` |

Order of work: (1) shared primitives and utils landed by others; (2) `Chat` + `OrderMessage` (largest, independent of the list); (3) `MessagesOption` + `PreviousMessages` + `ConversationRow`; (4) i18n; (5) tablet pane; (6) tests; (7) device pass on both platforms (keyboard, long press, swipe-back read state, ended order).

---

## 9. What I did not see / did not verify

- **Nothing was run**: no app, simulator, device, jest, `tsc` or lint. Every claim is from reading code.
- **Mockup-to-code**: I read the three mockups and `SPECS.md` text; I did not render them. The spec is in Spanish; I translated by reading. Sample texts (`On it`, `Ready in 10 min`, names, `#1053`) are English samples.
- **api-core**: I read `OrderController.php` (dashboard list, `unread_*`, `last_*_message_at` sorting), `OrderMessageController.php`, `OrderMessageReadController.php`, `Notifications.php` (`message()`), `PushOrderMessage.php` and the `LastDirectMessageAtTest` / migrations by name. I did **not** run any request, so these are unconfirmed: that `orders` dashboard rows include `customer` and `driver` objects with names and phones when no `params` are sent (read at `OrderController.php:709`, not exercised); that `GET orders/{id}/messages?limit=1&orderBy=-id` honours `limit` and `-id` (the controller passes `limit`, `offset`, `orderBy` to the graph, `api:Msg:68`); that `where` on `last_direct_message_at` is allowed for dashboard orders; whether `unread_*` still returns for more than 100 orders (it does not, `api:Order:827`).
- **Submodule**: I read `ctl:Contacts`, `ctl:Messages` and the message-related parts of `ctl:OrderDetails`; I did not read their tests or `OrderDetails` beyond the lines cited.
- **Driver-theming**: I read its area doc, `MessagesOption`, `PreviousMessages` (+ styles, footer), `OrderMessage`, `Chat` (`index`, `ChatThread`, `quickMessages`, `changeEntries`, `styles`), `MessageListSkeleton`, `UnreadMessagesContext`, `SocketReconnectContext` (top), `NavigationRef.openChatOrderId`, pages `Messages` / `OrderMessage`, and the schema's `chat_bubble`, `avatar`, `list_row`, `chip`, `bottom_nav`, `visibility`. I did **not** read `ChatMessageSkeleton`, `ImageViewer`, `linkify`, `FilterChip` / `OBadge` / `ONavbar` beyond their headers, `KeyboardScreen`, the driver's tests, or its theme helpers. I did not diff the business `shared/` primitives against the driver's (the business ones are the old set: `OButton`, `OText`, `OIcon`, `OIconButton`, `OBottomPopup`, ... none of the themed ones exist here yet).
- **Not seen on a device**: the three-state read behaviour (iOS swipe-back leaving messages unread is deduced from `OM:61-96` only), the keyboard over the composer with the recipients moved to the top, the 320 pt fixed system pill on small phones, Android back, the quick-message chips in other locales, the effect of `Tab.Navigator` lazy mounting on the unread count.
- **Local catalog**: I read `i18n/translations.json` for the keys of section 5; I did not check how the app loads it at runtime versus the server dictionary (the quick messages' real texts come from the project's dictionary, which I cannot see).
- **Screenshots**: I looked at `82` and `85` (reduced copies) and the `INDEX.md` notes for `48`-`51`, `81`, `83`, `84`, `157`; I did not open the others. The empty Messages state was never captured (`INDEX.md`), so its look today is from code only.
- **Counting rule** of the tab counter (messages vs conversations) cannot be told from the mockup (both numbers are 2): Q4.
- **Tablet**: the proposal is mine; no mockup exists for it.
