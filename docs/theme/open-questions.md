# Open questions of the redesign and the conversion (merged, deduplicated)

Date: 2026-11-19 · Source: the "Open questions" of the seven area reports ([areas/](areas/): A1 to A7, each question as `A<area>Q<n>`),
the decisions of `docs/DEPENDENCIES_PLAN.md` section 7 (`O1` to `O7`), and the proposals of this round
([tokens.md](tokens.md), [components.md](components.md), [pages-and-visibility.md](pages-and-visibility.md): `T1` to `T9`).
**Every question appears once**, with every area that asked it. The area reports keep their own text and reasoning; this file is
what to ask.

How to read: **Ask** = needs the owner. **Mockups answer** = the approved mockups already decide it: do not ask (the answer is
written). **Technical** = an engineering call with no product effect: the recommended option is taken unless someone objects.
**Settled on 2026-11-19 by the coordinator's calls** (`decisions.md`): every question takes its option (a) except OQ-07 (b: the board with a right-hand detail panel), OQ-08 (tablets rotate freely, phones locked to portrait, two panes in Messages, Stores and Printers), OQ-09 (no message preview line), OQ-10, OQ-11, OQ-23, OQ-24, TQ-06 and TQ-11 as written there. The tables below keep the options for review.

Within "Ask", questions are ordered by how much work they block, most first. Options are written recommended first, as in the area
reports.

## 0. Where each question stands (brought up to date after the second device rounds)

**Every question below is answered.** The tables that follow keep the options as they were asked, for review; this table says what
was taken, from [decisions.md](decisions.md). "Rule" = the coordinator's call of 2026-11-19 (option (a), the recommended one, unless
a row says otherwise); "owner" = the owner's own decision in the first table of `decisions.md`. Nothing is left to ask except what the
owner wants to change.

| Question | Answered | By | Note |
|---|---|---|---|
| OQ-01 project name on Login | (a) | rule | A light first screen only when `use_root_point` is on (`Home`, then Login) |
| OQ-02 tabs with a search filter on | **(b) the tabs stay, for a filter and for a text search alike; the landscape tablet's board keeps its columns holding the matching orders** | **the owner, 2026-11-20** (first (a) by the rule on 2026-11-19, then (b) in the code by a call of fix round 2, then asked to the owner and answered) | The mockup `OrdersOffline.dc.html` draws the tabs. The answer is in [decisions.md](decisions.md), "Pending decisions for the owner" (none is left open). The code does it on phones and portrait tablets since `482e673`, and on the landscape board since fix round 6 (`4c9e296`, T3-C5: [verification/fix-round6-tablets.md](verification/fix-round6-tablets.md)) |
| OQ-03, 04, 05, 06 | (a) | rule | |
| OQ-07 tablet details and history | (b) the board with a right-hand detail panel | rule, and the owner's tablet-layout decision | |
| OQ-08 tablet decision, rotation, panes | tablets rotate freely, phones portrait only, two panes in Messages, Stores and Printers | rule, and the owner's tablet-layout decision | Seen on an iPad simulator and an Android tablet emulator |
| OQ-09 Messages list | (a) with no last-message line | rule, and the owner's "not drawn yet" | A request for api-core: [../BACKEND_REQUESTS.md](../BACKEND_REQUESTS.md) B1 |
| OQ-10 where the menu logic lives | the shared logic, additive, a draft pull request | rule, and the owner's decision on the shared logic | [../deps/ordering-components-additive.md](../deps/ordering-components-additive.md) |
| OQ-11 store and product states | (a), "off since" not drawn | rule, and the owner's "not drawn yet" | |
| OQ-12, 14, 16 to 21, 25 to 28 | (a) | rule | OQ-21 (a): a message push opens the chat. Separately, the owner left the Star printers' LAN and "Nearby devices" permission path as it is (decisions row of 2026-11-19) |
| OQ-13 printing scope | (a) | rule | Plus the call "Auto-print on accept prints in the background on every saved printer" |
| OQ-15 alerts and sound | (a) three sounds derived from today's, bundled | the owner chose to generate them | A first call hid the picker while one file existed; the three sounds are bundled now (`bbf4d4a`, [../SOUNDS.md](../SOUNDS.md)). **Never listened to by anyone** |
| OQ-22 review rule | today's rule kept: completed, rejected and cancelled orders, and the completed pickup (15) | owner | |
| OQ-23 project-specific values | (a); the device label only on the current session | rule, and the owner's "not drawn yet" | Other sessions' device name: BACKEND B5 |
| OQ-24 search by customer name | (a) with the additive branch | rule, and the owner's decision on the shared logic | |
| Section 2 (the mockups answer) | answered by the mockups, never asked | | |
| TQ-01 to TQ-11 | (a); TQ-06 the additive one-line fix; TQ-11 name and status only | rule | TQ-01 was also answered by the dependency decision |
| T1 to T9 | (a), except **T4** | rule | T4: the neutral outline button is a grey line (`color.border_strong`) with black text, neither (a) nor (b): decisions row "Neutral outline buttons" |

## 1. Ask the owner (by how much they block)

| # | Question | Options (recommended first) | Asked by | Blocks |
|---|---|---|---|---|
| OQ-01 | **Where does the project name (`use_root_point`) go now that Login is the first screen?** The login methods are the project's, so the project must be known before the form is drawn | (a) a light first screen only when `use_root_point` is true (project field, "Set project", same look as Login, no photo); other builds start at Login · (b) a `Project` row or link on Login that opens the field in a sheet · (c) a field at the top of Login applied on "Log in" · (d) drop `use_root_point` (breaks the multi-project builds) | A1Q1, A2Q2 | the unauthenticated navigator, `RootNavigator` auth gating, Login, project change and `RNRestart`; Home's fate |
| OQ-02 | **With a search filter on, do the tabs stay?** **Answered by the owner on 2026-11-20: (b), the tabs stay, for a filter and a text search alike, and the landscape board keeps its columns.** The options below are as they were asked (the "(a)" first taken was changed) | (a) tabs hidden, results across statuses, a notice with Clear on top, the Status chips narrow (today's behaviour, the controller already does it) · (b) tabs stay and each filters inside its group · (c) tabs stay, the filter ignores the tab | A3Q1 | the Orders list (the largest screen), `OrdersSearch`, `OrdersOffline` |
| OQ-03 | **What does `combine_pending_and_progress_orders` do in the new design?** | (a) a layout flag: tabs "Active" (New plus the stage sections in one list) and "History" · (b) ignore it (always New / In progress / History) · (c) apply it on tablets only | A3Q2 | the tabs, counters and the board's columns |
| OQ-04 | **Which section holds an order whose driver is assigned before the food is ready** (statuses 22, 25, 8, 23, 18, 3, 24)? | (a) by status only: all go to "With driver" · (b) keep it in "Preparing" until the business marks it ready (needs `reporting_data.at['status:4']`) · (c) a fourth section "Driver assigned" | A3Q4 | the In progress tab's grouping, the board's columns, `useOrdersSplit` |
| OQ-05 | **Timer colors and the card tint without `plan_enterprise`** (no `time_status` then) | (a) the text is always shown; its color and the tint come from `time_status` when the plan has it, muted otherwise · (b) derive them from fixed thresholds in code · (c) show the timer only with the plan, as today | A3Q3 | the order card's look |
| OQ-06 | **Offline queue scope and what replay sends** | (a) queue also Mark ready / Picked up / Not picked up, and on replay send only the last status per order, never the raw `status: '7'` chat message to the customer · (b) today's two-step behaviour (chat messages to the customer), queue only accept and reject | A3Q14 | `OfflineActions`, every card action while offline, `OrdersOffline` |
| OQ-07 | **Tablet: how do details and history work?** The board (TabletBoard) is the only tablet screen drawn | (a) board + full-screen details as stack screens + History as a screen from the board header; the phone's three tabs map to the board's columns plus History · (b) board plus a right-hand detail panel 440 wide (sheets become 480 dialogs; `OrderDetailsPage` takes `presentation`) · (c) keep today's 30 / 70 master-detail (no board) | A3Q15, A1Q10, A4 section 6 | `MyOrders`, `OrderDetails`, navigation on tablets, the History entry |
| OQ-08 | **Tablet: how is "tablet" decided, may phones rotate, and do the list screens get two panes?** | (a) `DeviceInfo.isTablet()` once at launch, phones locked to portrait, tablets rotate freely; one `usePlatform()` hook; no two-pane layouts for Messages, Stores or Printers (not drawn): the phone flow in a 600 column · (b) decide by window width (follows split screen) · (c) free rotation on both. If panes are wanted: Messages 360-400 list + chat; Stores 380 list + menu; Printers and TicketSettings with a live preview | A1Q8, A5Q8, A6 section 6, A7 section 7 | the `tablet` platform wiring, rotation locks (native), Messages, Stores and Printers on tablets |
| OQ-09 | **What does the Messages list show, and where does the last message come from?** | (a) every order, preview line fetched lazily for the rows on screen (`limit=1`, cached), and ask api-core for a `last_message` object and a "has messages" filter; the title is the customer with a role tag only when the last incoming message came from another role; unread = `unread_direct_count`; the tab sums messages, "+" when more pages exist; search filters the loaded rows · (b) wait for the backend before showing a preview · (c) hide orders with no direct message on the client | A5Q1, A5Q3, A5Q4, A5Q9 | the Messages list, the tab counter, `messages.preview` and `messages.unread_badge` |
| OQ-10 | **Where does the new menu logic live** (search across categories, Unavailable filter, counts, "make all available", the product switch)? | (a) now an app-local hook in `src/` using `useApi()` (no cross-repo wait), then an upstream PR · (b) a new controller in `ordering-components`, then a submodule bump | A6Q1 | Menu, MenuUnavailable, ProductOptions; the submodule rule |
| OQ-11 | **Store and product states the mockups do not draw**: a store turned off (`enabled=false`), a product's return time, "off since", the pause permission | (a) a third store state "Orders turned off" with the switch off; the product switch turns it off at once and a tap on the red line opens a duration sheet; no "off since" at first (backend ticket for `disabled_at`); the pause for levels 0 and 2 until the API team says otherwise · (b) fold the off state into "paused until I turn it back on" · (c) no timed pause for products | A6Q2, A6Q3, A6Q6, A6Q13 | Stores, SheetPause, Menu rows; a design for the duration sheet |
| OQ-12 | **Menu details**: subcategories, an option with no suboptions, attaching option groups, store logo and product photo | (a) top-level chips and a smaller second row for children; only suboption switches (an option's header switch only if wanted); keep attach/detach behind an "Option groups" row (needs a small design); show the logo or photo when it exists (`business_card.logo`, `product.image`) · (b) flatten children as "Parent · Child"; drop attach/detach; glyph tiles only | A6Q7, A6Q8, A6Q9, A6Q10 | Menu, ProductOptions |
| OQ-13 | **Printing scope**: do the ticket options apply to every brand, what does auto-print cover, how is a printer's status known? | (a) generic printers only (the last commit restored Star and Epson, no regression), the Ticket row shown only when a generic printer exists, the 24 stored options driven by the 6 rows with a "Details" expand; auto-print on every accept entry (card, sheet, details); status = last print result stored per printer plus "Reconnect" and "Test print" on demand · (b) apply options to every brand (needs a golden fixture and a device pass) and live checks on open (1 to 5 s each) · (c) no status chip | A7Q2, A7Q4, A7Q5 | Printers, TicketSettings, TicketPreview, the orders-area accept sheet |
| OQ-14 | **System printing and the native printer stack**: `react-native-print` and PDF export, Epson on RN 0.88 iOS, generic BLE on iOS | (a) keep `react-native-print` with a small iOS patch and fix `generatePDF` now; `react-native-esc-pos-printer` 4.6.0-rc.0 pinned (fallback: 4.5.1 + patch); `react-native-ble-plx` 3.5.1 with the patch and a real iPhone test · (b) drop `react-native-print`, share the PDF (`react-native-share`), and retire `OrderSummary` so print always opens `TicketPreview` · (c) iOS share only; BLE on Android only until tested. The mockups show only "Share PDF" | O1, O2, O6, A4Q6, A7Q12 | the native builds (device gate with a ticket from Star, Epson, generic BLE and a PDF), `OrderSummary`, `TicketPreview` |
| OQ-15 | **Alerts and sound**: who supplies the audio, what the screen controls, vibration | (a) derive Bell, Chime and Kitchen alarm from today's sound and bundle them (a push sound is a native file name: iOS `.caf`, Android `res/raw`); ship the local settings now (Ring until opened, Vibrate, test alert, the permission notice) and hide "New messages / Order updates" until the backend has preferences; the alert vibrates in a repeating pattern while open, the global buzz stays only if the alert is off; the new-order alert has no off switch · (b) show all rows, the server ones disabled "Coming soon" · (c) backend first | A1Q7, A7Q6, A3Q10 | Notifications, NewOrderAlert, native assets, `subscribeOrdersRegisterVibration` |
| OQ-16 | **What does logout keep on the device, and does Remove account keep the printers?** | (a) keep printers, auto-print flag, ticket options, copies and alert settings; clear the rest; `project_name` stays cleared; Remove account wipes all · (b) also keep `project_name` · (c) wipe everything as today (the dialog text would then be false) | A7Q1, A7Q8 | LogoutDialog, `LogoutButton`, `UserProfileForm`, the printers' persistence |
| OQ-17 | **Order details with no mockup**: closed statuses (2, 5, 6, 10, 12, 16, 17), preorder (13), "Accept all / Reject all" for a group | (a) closed: the `done` screen with a red chip and the reason as a note; preorder: the `new` layout without the bar plus the scheduled date; groups: a sheet over the list with a confirmation naming the group (the driver's rule) · (b) send mockups first | A4Q9, A3 group card | `OrderDetails` completeness, `PreviousOrders` groups, the tests of every status |
| OQ-18 | **Preparation and rejection rules**: the time presets, the "Other" reason, the checklist's persistence, the courtesy chat message | (a) presets 10 / 15 / 20 / 30 / 45 (as drawn), step 5, min 5, max 180, default 20, app constants; reasons are the 5 drawn through i18n, "Other" needs a note; the checklist per device in AsyncStorage keyed by order id; send the chat message on every adjust · (b) default from the store's `pickup_time` / `delivery_time` · (c) project-defined (backend) · server checklist | A4Q1, A4Q2 (rest), A4Q3, A4Q11 | SheetAccept, SheetPrepTime, SheetReject, `confirmation.order.checklist` |
| OQ-19 | **Which steps are guarded** (confirmation or hold)? Accept is always one tap | (a) `Not picked up` / `Customer not arrived` (-> 17) ask a confirmation dialog; `Mark ready`, `Picked up` and reject-through-its-sheet stay as drawn; no `HoldToConfirm` · (b) hold the cancel-type steps as the driver's irreversible ones · (c) confirm everything but accept | A1Q4, A4Q4 | the order card and details buttons; `confirmAction` use |
| OQ-20 | **Login ways and the notification sheet**: phone password, phone code, WhatsApp code; when the sheet shows | (a) keep today's reach: the mockup as drawn, phone password only when e-mail login is off, Twilio verify kept; the sheet shows once after the first sign-in when permission is denied or not asked, "Not now" re-offers it after 7 days, `blocked` shows "open settings" · (b) port the driver's way tabs · (c) drop the phone ways; the sheet every time the orders tab opens, or only from Profile | A2Q1, A2Q4 | Login, `auth_form`, the permission flow in `RootNavigator` |
| OQ-21 | **Should a message push open the chat?** | (a) open the chat for `data.type = 'order_message'`, the details for everything else · (b) keep (details) · (c) the Messages tab | A5Q7 | `RootNavigator.tsx` and `getPushOpenOrderPlan.ts` (another area's files) |
| OQ-22 | **Review rule for status 15** (completed pickup cannot be reviewed today) and the chips of Review | (a) add 15; keep the per-level `reviewCommentList` · (b) keep; take the mockup's single chip set | A3Q16, A4Q7 | the "Review customer" button on cards and details |
| OQ-23 | **Where do project-specific values come from**: the dashboard link, the help URL, the session device label, the "Current password" field | (a) a `dashboard_url` and a `help_url` in the app config with a fallback (the Help row hides when empty); label the current device locally and ask the backend to fill `UserSession.device`; add Current password and verify with `POST /users/check_password` (the mockup draws it) · (b) a theme setting · (c) keep the translation key | A6Q4, A7Q10, A7Q7, A7Q9 | Stores' link, Profile rows, Sessions, ProfilePassword |
| OQ-24 | **The search field "Order number, customer or phone"** | (a) one field, classified by what is typed; names need one additive branch in the submodule's `getOrders` (the app ships without names first) · (b) two fields · (c) number and phone only | A3Q6 | `OrdersSearch`, the submodule |
| OQ-25 | **Dead features the mockups do not draw**: tutorial, Sign up, `show_tutorials`, `NotFound`, `NetworkError`, the chat's file attach and signature pad, the `delosi` hard-code, group "Arrived to bussiness" | (a) delete all (the mockups draw none); keep the signature code only behind `messages.signature` default false; drop `delosi` (the theme can style the comment); drop "Arrived to bussiness" · (b) keep Sign up (needs a design) · (c) keep the chat extras (document picker, signature canvas) | A1Q2, A2Q3, A4Q12, A3Q9, A5Q5, O4 | the delete batch, three dependencies |
| OQ-26 | **The logo and the former brands**: the bundled login logo | (a) the project's logo when set; the bundled `logotype.png` otherwise · (b) a project-uploaded logo only (empty if none); two former-brand logos coexist ("Ordering" and "OrderingPlus") and the splash shows one of them | A2Q7, A1 5.1 | `images.logotype`, the splash |
| OQ-27 | **Small library choices**: image cache, alert sound library, JavaScript module name | (a) keep `react-native-fast-image` ^10.11.0 and measure; keep `react-native-sound-player` 0.14.5 and re-decide after the device test; keep the module name `businessApp` · (b) remove fast-image behind `OAvatar`; move to `react-native-audio-api` or `react-native-nitro-sound`; rename to `OBusiness` | O3, O5, O7 | package.json, the native entry points |
| OQ-28 | **Details of the accept flow**: the reservation alert and the wizard's Edit | (a) a notice in the preparing screen for the reservation; Edit reopens step 1 with the stored brand, connection and paper, then step 2 with the stored printer, the model derived from discovery with a manual picker as fallback · (b) keep the system alert; Edit as one screen with the old model dropdown | A4Q13, A7Q11 | OrderPreparing, PrinterAdd |

## 2. The mockups already answer these (do not ask)

| Question | Asked by | The answer in the mockups |
|---|---|---|
| Hold or confirm for dangerous actions: is a hold drawn? | A1Q4 | no: the mockups draw dialogs and sheets only (reject is a sheet with reasons, logout a dialog). No `HoldToConfirm` in this app. The steps to guard are OQ-19 |
| Does the status-bar tint stay as the offline signal? | A1Q6 | no: the `Live / Reconnecting / Offline` pill and `SheetConnection` are the signal; drop the tint |
| Where does the Accept on a card lead? | A3Q13 | `SheetAccept`: a preset (10 to 45) and a stepper, then "Accept · 20 min": two taps; accepting is never held |
| "products" or "items" | A3Q5 | both, as drawn ("3 products · 4 items" in the alert and "4 items" on cards) |
| The empty state's store card with "Pause orders" | A3Q8 | drawn in `OrdersEmpty`; it reads the stores' pause state (area 7) |
| Printer row in the connection sheet | A3Q11 | drawn ("Printer · Kitchen · Ready"); the signal is OQ-13 |
| Switch color and shape | A6Q12 | one green drawn 44 × 24 pill everywhere |
| Which printers print from the preview | A7Q3 | chips choose them; the button names the target ("Print on Kitchen") |
| The sort chips of Messages | A5Q2 | replaced by `All` / `Unread`; drop `Order number` (default sort "last message, newest first") |
| The signature button in the chat | A5Q5 | not drawn: hidden by default (`messages.signature` false) |
| The sounds | A7Q6 (the list) | `Bell`, `Chime`, `Kitchen alarm (loud)`, `Ring until opened`, `Send a test alert`; who supplies the audio is OQ-15 |
| Current password | A7Q9 | drawn in `ProfilePassword` |
| The "Verify" button of the code screen | A2Q5 | drawn: the 6th digit submits and "Verify" is the manual submit and the retry |
| Copy "Log in" and "or" | A2Q6 | the mockups' words; reuse `LOGIN` and `OR` unless the owner wants exact copy (12 locales each) |
| Reasons of rejection | A4Q2 (the list) | the five drawn (Item out of stock, Too busy right now, Closing soon, Can't deliver to this address, Other); chips, not a list |
| A mini map in OrderDelivery | A4Q8 | drawn: a real non-interactive map with three markers when there are coordinates; none otherwise |

## 3. Purely technical (taken as recommended unless someone objects)

| # | Question | Recommended | Asked by | Blocks |
|---|---|---|---|---|
| TQ-01 | Push libraries: OneSignal 5.5.x and `react-native-notify-kit`, push moved to `oneSignalPush.ts` before the bump; keep both providers (OneSignal or FCM by server config) | the driver's | A1Q5 (answered by the dependency decision of 2026-11-19) | `RootNavigator`, the native push extensions |
| TQ-02 | The submodule's own `GET /theme` | leave it (one request per launch, read only by `showCities`) | A1Q11 | nothing |
| TQ-03 | Registering `store_app` in api-core and when to publish `1.0.0` | outside this task: publishing is the workflow's, never by hand | A1Q12 | publishing |
| TQ-04 | Forgot-password cooldown | 45 s constant in the app (the server's `forgot_password_rate_*` is not exposed) | A2Q8 | Forgot |
| TQ-05 | Source of the tab counters (new orders, unread messages) and the first value before the list loads | the lists report their totals into contexts (no extra request); the Orders tab is the first screen so it is mounted at launch | A1Q3, A3Q7 | the tab bar |
| TQ-06 | Inline error that never wipes the screen | an additive one-line fix in the shared controller (clear `error` on start and success), as a PR to `ordering-components`; else an app-only workaround | A4Q10 | OrderError, every failing status change |
| TQ-07 | The order-details section order across stages | one union order (pages-and-visibility.md section 1); check the timeline and hand-off when built | this round | OrderDelivery, OrderDone, OrderReadyPickup |
| TQ-08 | Category counts (`ceil(N/50)` calls from one full product fetch) | now; ask the API team for `products_count` later | A6Q5 | Menu chips |
| TQ-09 | Store switches and pause while offline | disabled with the offline notice (a queued pause that lands minutes later is worse) | A6Q11 | Stores |
| TQ-10 | The tablet max width and sheet width | 600 and 480, as component values (`screen`, `sheet`); a token cannot be added | A1Q9 (decided in this round) | tablet screens |
| TQ-11 | The model of the Distance line "Omar H. · 6 min from the customer" | name and status only; a routing call (Google Distance Matrix: cost and key) is a product decision, with the straight-line distance as a third option | A3Q12 | the order card's driver line |

## 4. Proposals of this round that need the owner at the gate (tokens and schema)

| # | Proposal | Options (recommended first) | Blocks |
|---|---|---|---|
| T1 | `typography.body_lg` at 16 / 1.4 / **600** (the mockups draw 16 only at 600) | (a) as applied · (b) keep 400 and five custom keys | text of cards and totals |
| T2 | Heights not on `size`: 36 (chips, tabs), 56 (header, rows) | (a) component keys, as the driver (applied) · (b) `size.sm` 36 and `size.xl` 56 for this app (differs from the driver's `size`) | chips, tabs, header, rows |
| T3 | 12 / 1.5 / 600 has no catalog style (22 + 13 uses): five keys with the same value | (a) as applied (the driver does the same) · (b) a catalog change | tabs, timers, unread preview |
| T4 | Neutral outline button: black line (applied) vs the kit's `#909090` line with black text | (a) black line · (b) `neutral.ink` `#909090` and lose the black text | 11 screens' secondary buttons |
| T5 | Font weights bundled: 400 / 500 / 600 / 700 (the driver family's) while the mockups draw 400 / 600 / 700 | (a) keep 500 (a theme may use it) · (b) drop 500 (10 fewer files per platform) | native font files |
| T6 | `text_disabled` `#909090` and the darker `*_text` tones on tints | (a) as applied (mockups) · (b) the driver's tones | text on tints, placeholders |
| T7 | `orders.board`: off on phone, on on tablet, a theme can turn the board off | (a) as applied · (b) no key: the board is the tablet's only layout | tablet Orders |
| T8 | One bundled login logo | see OQ-26 | Login |
| T9 | The shadow of the map's floating buttons snapped to `shadow.sm` (0.10 against the 0.15 / 0.25 drawn) | (a) snap · (b) a map-only shadow key | MapTracking |

## 5. What I did not verify

- The area reports' questions were merged from their text, not re-derived from the code; where two areas ask almost the same
  thing (A1Q10 / A3Q15, A5Q5 / O4), I kept the wider options of both.
- "The mockups answer" is a reading of the 47 screens: a screen I summarised from the area reports and `SPECS.md` (not opened file by
  file) may say less than I wrote.
- I did not ask anyone: the recommended options are the area reports' and the dependency plan's, not decisions.
