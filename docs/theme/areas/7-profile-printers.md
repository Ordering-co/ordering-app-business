## Area 7 — Profile, account, printers and ticket

Phase 1 analysis, read-only. Nothing was run (no app, no simulator, no tests, no printer hardware): every statement below comes from reading code, the mockups (`design/redesign/screens/*.dc.html`, `SPECS.md`, `DESIGN-KIT.md`), the screenshot index, `inventory-rest.md`, the api-core source and the driver app (`ordering-app-driver-theming`, `ordering-app-driver-v26`).

Paths: pages are `src/pages/`; components are `src/ui/src/components/<Name>/` unless stated. "Driver-theming" = `/Users/work/Ordering/ordering-app-driver-theming`. "Driver original" = `/Users/work/Ordering/ordering-app-driver-v26`.

---

## 1. Today

### 1.1 What this app shares with the original driver app (diff)

| File | Business vs driver original | Consequence |
|---|---|---|
| `pages/Sessions.tsx`, `Sessions/index.tsx`, `UserFormDetails/index.tsx`, `LanguageSelector/index.tsx`, `NotificationSetting/index.tsx`, `ScheduleBlocked/index.tsx` | **Identical** (diff = 0 lines) | Port the driver-theming version wholesale, then add the business-only changes |
| `pages/Profile.tsx` | Business adds `isBusinessApp: true`; lacks the driver's `isShowDriverStatus`, `isFocused` and the `refreshUserInfo` listener | Port the driver-theming page (it adds the refresh on focus); keep `isBusinessApp` |
| `LogoutButton/index.tsx` | Business lacks the driver's `loading` guard, error toast (`formState.result.error`) and `isDriverApp` (the driver one blocks logout with assigned orders: not wanted here) | Port driver-theming `LogoutButton` without `isDriverApp` |
| `UserProfileForm/index.tsx` | Business: Printer Settings row (`:592`), no Stripe/Payouts, no `allow_delete_driver_account` gate, photo 150 (driver 123), remove account = one system confirm + `getRemoveAccountSessionPlan` (`:158-175`); driver: `RemoveAccountModal` (confirm + password step against `POST /users/check_password`) | Rewrite from the driver-theming profile; business keeps its own remove-account flow (question Q8) |
| `DriverSchedule/index.tsx` | Business is the older version (no `setOpenModal`, no navbar) | Dead here (1.12), delete |
| Printing (`PrinterSettings`, `PrinterEdition`, `PrintTicketSettings`, `TicketPreview`, adapters), `getRemoveAccountSessionPlan` | **Business only** | Rebuilt here; no driver code to port |

Driver-theming has no `src/pages/PrinterSetup`-like screens, no printing code, and its `NotificationSetting` is only the "Enable notifications" permission sheet (no "Alerts and sound" screen). Business is also the first app of the family with a `tablet` platform (driver and marketplace decided `phone` only).

### 1.2 Profile (`pages/Profile.tsx` + `UserProfileForm` + `UserFormDetails`)

- Page: `KeyboardAvoidingView` + `SafeAreaContainerLayout`; props `useSessionUser`, `isBusinessApp: true`, `useValidationFields` (`pages/Profile.tsx:18-25`). Registered as the Profile tab in `BottomNavigator` (`unmountOnBlur`).
- Order of blocks: title "Profile" (26/700, `UserProfileForm:~300`) → photo 150 → (level 4 availability row: never in business, `:443`) → data (view) or form (edit) → "Edit" button (`:564`) → thick divider → (Schedule row, only `!props.isBusinessApp`, `:579`: never) → **Printer Settings row** (`:592`) → **Sessions row** (`:598`) → divider → `LanguageSelector` + `LogoutButton` (`:605-608`) → "Remove account" (`:608-624`).
- **Fields**: not fixed. View mode lists `sortInputFields(validationFields.fields.checkout)` (name, middle_name, lastname, second_lastname, email … whatever the server enables), then a masked Password and Phone (`:482-560`). Edit mode (`UserFormDetails`) shows only the fields `showField` allows, so last/middle/second lastname appear in view and not in edit (screenshot 109, `INDEX.md`). A fix comes with the driver port (`showField` filter in both).
- **Edit mode**: Edit button (`:564-576`, `allowDriverUpdateData` = `level !== 4 || config` so always true for business) flips `isEdit` and renders `UserFormDetailsUI` in place with Cancel and Update (`UserFormDetails:460-490`). Password + "Confirm Password" (`MOBILE_CONFIRM_PASSWORD`) with eye toggles; only inline error is "passwords do not match"; other validation is one toast `- msg\n- msg` (`UserFormDetails:~180`); a failed Update with empty name only moves focus (screenshot 112). Phone: `PhoneInputNumber` (country picker modal) when `fields.checkout.cellphone.enabled`; "Your previous cellphone" note when the phone had no country code. Server rule: `password` min 8 (api-core `UserController.php:175`, update rules).
- **Photo**: tap opens `launchImageLibrary` (gallery only, 200x200, base64) and saves at once (`:119-144`, `:432`). **Bug**: it reads `didCancel` and `errorMessage` from `assets[0]` (`:128-131`) but the picker puts them at the response root, so cancelling the picker falls to the else branch and shows the toast "Image not found". No camera, no remove, no camera glyph on the avatar. Without a photo it shows `theme.images.logos.logo` (because `general.user` is not defined).
- **Skeleton / error**: skeleton while `formState.loading || sessionLoading` (`:358`, the whole screen swaps while saving a photo); `NotFoundSource` with "Refresh profile" when `validationFields.error` (`:344`).
- **Remove account**: see 1.5.

### 1.3 Language selector (`LanguageSelector/index.tsx`)

Shown only when `languagesState.languages.length > 1 && !loading` (`:52`). It paints a `react-native-country-picker-modal` full-screen list of flags (`lang_country.json`, 597 lines maps language code to country) with no title, no current-language mark, no close button (screenshot 107). Choosing calls `handleChangeLanguage` from the submodule controller (applies at once, persisted by the SDK as `language`).

### 1.4 Logout (`LogoutButton/index.tsx`) — what it clears

- Row "Logout" + PNG glyph, **no confirmation**, no loading state (screenshot 162).
- `handleClick` (`:12-20`): reads `notification_state` from AsyncStorage → `handleLogoutClick(data)` (submodule `LogoutAction`: sends the push token to `users().logout(body)` so the API unregisters it, then `session.logout()` which removes `token`, `user`, `device_code`) → on success `_clearStoreData({ excludedKeys: ['isTutorial', 'language'] })` (`:17`) → `setRootState?.()` (no page passes it).
- `_clearStoreData` (`providers/StoreUtil.tsx:33-45`) removes **every AsyncStorage key except the two excluded**, fire-and-forget (not awaited). **Yes: it wipes `printers`, `auto_print_after_accept_order` and `ticket_print_options`**, plus `notification_state`, `project_name`, the offline-orders caches (`<status>_orders`, `offline_actions_array`, `last_date_connection`, `combine_pending_and_progress_orders`, `allow_save_changes_offline`). Printers are device setup, not user data, so a logout today makes the kitchen re-enter them (inventory-rest §8 item 1).
- Paths that log out **without** this wipe (printers survive there): deleting the current session or "delete all" including current in `Sessions` (SDK `logout()` only, `@/components .../Sessions/index.js`), and the session sync decision in `SessionContext`. So the wipe is inconsistent across logout paths.
- The `LogoutDialog` mockup promises "Your printers and alert settings stay saved": this is a behaviour change (Q1).

### 1.5 Remove account

- Button always rendered; `disabled` only when `user.level === 0` (admin), drawn grey with no explanation (`:610-620`, screenshot 108). Level 2 (business owner) and 5 (driver manager) can use it. No server config gates it (the driver has `allow_delete_driver_account`).
- Flow (`:158-175`): system alert "Account alert" / "Are you sure that you want to remove your account?" (`ACCOUNT_ALERT`, `QUESTION_REMOVE_ACCOUNT`) → `handleRemoveAccount(user.id)` (`DELETE /users/:id`, returns `res.result`) → `getRemoveAccountSessionPlan(result)`: only if the result is `'OK'`, `logout()` then `_clearStoreData` (same wipe as 1.4, printers included). No password.

### 1.6 Notification setting (`NotificationSetting/index.tsx`)

A bottom popup "Enable notifications" shown only when `checkNotifications().status === 'blocked'` at mount; button opens system settings (`openSettings`). It is mounted by `OrdersOption:1275` (and `OrdersListManager`), **not by the profile**: the profile has no way to reach notification settings. Related behaviour that exists today and the mockup "Alerts and sound" would expose:

| Behaviour | Where | Configurable today? |
|---|---|---|
| Full-screen modal for a new order, over the orders screens only (mounted by `OrdersOption:810`, `OrdersListManager:635`), "ring until closed": `playUrl` repeated every 2.5 s | `NewOrderNotification/index.tsx:25-52` | No. Sound is a **remote URL** (`d33aymufw4jvwf.cloudfront.net/notification.mp3`), one sound; a bundled `assets/sounds/notification.mp3|ogg` exists in `theme.sounds` (`BusinessApp.tsx:108`) but is not what plays |
| Vibration on websocket `orders_register` | `navigators/subscribeOrdersRegisterVibration.ts` | No (always) |
| Push (OneSignal, or FCM + notifee when `isFirebasePushEnabled`) | `RootNavigator.tsx:60-230` | Permission only. Android channel `new_order_alarm` with sound `raw/order_sound_notification` is created natively (`MainApplication.kt:49`); a channel's sound cannot be changed after creation |
| Message / order-update push categories | server | No client setting; the only user `settings` the controller knows are marketing (`newsletter`, `promotions`) |

### 1.7 Sessions (`pages/Sessions.tsx` + `Sessions/index.tsx`)

- Page uses `Container` (ScrollView) with a nested ScrollView (`maxHeight 70%`); identical to the driver original.
- Strategy gate: `user.session_strategy === 'jwt_session'` (`:102`): list (skeleton x5) + two destructive buttons; otherwise text + "Active sessions" button (`handleDeleteAllSessions` path with the "enable all sessions" alert). System alerts titled "Ordering".
- Each card shows `created_at` (muted) and `valid_thru` with no labels, the "Current" tag, and a 26 pt "x" (deletes it; deleting the current one logs out). `sessionsList.sessions.reverse()` mutates the array every render (`:122`).
- **What the API returns per session** (`GET /users/:id/sessions`, api-core `UserSessionController::findAll`, `app/Http/Controllers/UserSessionController.php:34-62`; model `UserSession.php:19-43`): `id`, `user_id`, `valid`, `valid_thru`, `created_at`, `updated_at`, **`device`** (JSON object column) and the computed `current` (token is hidden). **`device` exists but is never written**: the session is created by `UserController::generateSession` (`UserController.php:4590-4600`) with only `user_id`, `token`, `valid`, `valid_thru`; `UserAgentHelper::getClient` returns `[]` (`return [];` before building the device array). So **no device name, no user agent, no IP** today. The app sends only `X-App-X`, `X-INTERNAL-PRODUCT-X`, `X-Socket-Id-X`.

### 1.8 The printers flow

**Entry**: Profile → "Printer Settings" → `PrinterSetup` (`pages/PrinterSetup.tsx` → `PrinterSettings`) → Add / tap row / pencil → `PrinterConfigure` (`PrinterEdition`); "Print settings" row → `PrintTicketSettings`. All four are `HomeNavigator` stack screens (`HomeNavigator.tsx:85-110`).

**Storage (AsyncStorage, device only, never the server)**:

| Key | Shape | Written by |
|---|---|---|
| `printers` | array of printers (below) | `PrinterEdition/savePrinter.ts:17-61` |
| `auto_print_after_accept_order` | boolean | `PrinterSettings:87-89` |
| `ticket_print_options` | 24 booleans, `TicketPrintOptions` (`TicketPreview/ticketPrintOptions.ts:5-31`, key `:3`) | `PrintTicketSettings` on every toggle |

A saved printer: `{ model, driver: 'star'|'epson'|'generic', printMode: 'append'|'appendBitmapText', emulation?, bt?, recommended?, nickname, paperWidthMm: 80|58, type: 1 (Bluetooth)|2 (LAN)|3 (USB), ip, portName, portName1, bt }`. `portName` is what printing uses (BT: identifier/MAC; LAN: IP; USB: `'USB'` or an ePOS target). `savePrinter` spreads `...item` so a stale transient `index` is persisted as well (`PrinterSettings` passes `{...item, index: i}`). `emulation` is stored but **never read**; `printMode` is read in one place (`useTicketPrintRun.ts:29`). Legacy printers without `driver` normalise to `star` (`printerList.tsx:84-92`).

**Brands and models** (`PrinterEdition/printerList.tsx`): Star 22 models (mPOP, FVP10, TSP100, TSP100IV, TSP65011, TSP7001, TSP80011, SP700, SM-S210i/S220i/S230i/T300i/T400i, SM-L200/L300, BSC10, the StarPRNT variants, mC-Print3); only `TSP100` is `appendBitmapText`, all others `append`. Epson 15 (TM-T20III, T20II, T82, T82II, T88V "recommended", TM-m30, m30II, m30II-NT, T20, T20X, T70II, T88IV, T82III, T82IIIL, T88VI). Generic 1 ("ESC/POS (Bluetooth)"). Connection offered: Bluetooth always; LAN for Star and Epson (hidden for generic, `PrinterEdition:557`); USB for Epson only, selectable but disabled for save on iOS (`:58`, `:283`; generic and Star never USB).

**Form** (`PrinterEdition/index.tsx`): brand tiles → model dropdown (`react-native-select-dropdown`) → nickname (`/^[a-zA-Z0-9\s]+$/`) → paper width dropdown (80 default, 58) → connection → IP (regex) or Bluetooth port field + search icon → Save (disabled until `model` and the field are set; `isSaveDisabled` `:279-285`). Known defects (screenshots 117, 124-125): the BT field starts in error; changing brand keeps the old model in the dropdown; Save is clipped by the screen bottom.

**Discovery per brand** (`usePrinterCommands.tsx:110-156`, `EpsonPrinterAdapter.ts`, `GenericBlePrinterAdapter.ts`): 
- Star: `StarDeviceDiscoveryManager`, interface Bluetooth (`type===1`) or LAN, `discoveryTime` 1000 ms + a 1 s wait (`:142-151`); returns `StarPrinter[]`. Auto-runs when a Star BT model is picked (`PrinterEdition:427-429`).
- Epson: `PrintersDiscovery.start({timeout: iOS 5000 / Android 10000, filterOption.portType})` per type; on **iOS Bluetooth it first opens the native pairing sheet** `pairBluetoothDevice()` (`EpsonPrinterAdapter.ts:~295-310`); identifier is `bdAddress || macAddress` for BT, `ipAddress` for LAN, `target` for USB (`pickEpsonDiscoveryIdentifier`).
- Generic: `react-native-ble-plx` scan 4 s, named devices only, strongest signal first; the one place that shows a **list** (`BleDeviceList`).
- **For Star and Epson the UI only uses `printers[0]`** (`PrinterEdition:188-214`): the SDK returns every printer found, the screen drops all but the first.

**Permissions asked**: Android >= 12 `BLUETOOTH_CONNECT` before Star discovery or print when `interfaceType === Bluetooth || settings.autoSwitchInterface === true` (`usePrinterCommands.tsx:127-135`, `:395-408`); `autoSwitchInterface` defaults to `true` (`react-native-star-io10 StarConnectionSettings.ts:10`), so **LAN also asks "Nearby devices"** (screenshots 122-123). Epson BT print: same permission (`:332`). Generic BLE: Android >= 12 `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT`, older `ACCESS_FINE_LOCATION` (`GenericBlePrinterAdapter.ts:97-111`), plus a Bluetooth-state check (off / unauthorized). iOS: `NSBluetoothAlwaysUsageDescription`, `NSLocalNetworkUsageDescription`, `UISupportedExternalAccessoryProtocols = jp.star-m.starpro` (`Info.plist`). USB: manifest intent filters (`device_filter.xml`, `accessory_filter.xml`). No native module of this app's own: everything is `react-native-star-io10` 1.12.1, `react-native-esc-pos-printer` 4.5.0, `react-native-ble-plx` 3.5.1.

**Edit / delete**: tap row or pencil → same form with `index`; Save with `edit` upserts at that index (`getStoredPrinterIndex.ts`). The trash icon deletes **at once, no confirmation, no undo** (`PrinterSettings:82-85`, `:203`, screenshot 133).

**Auto print**: toggle shown only when at least one printer exists (`PrinterSettings:107`). Fired only from `OrderDetails/Business.tsx:186-206`: after the accept modal of the order's own screen (`:800` passes `redirectTicket=true`) when the new status is 7 and the flag is on. Generic printers print **silently in the background** (`TicketAutoPrint`, banner "Printing ticket..."), Star/Epson open `TicketPreview` with `shouldPrintOnMount` (`getAcceptAutoPrintPlan.ts`, restored by commit 8bbf275). Accepting from other places (list cards, `AcceptOrRejectOrder` outside that modal) does **not** auto-print.

**Print settings per section** (`PrintTicketSettings`): 5 groups: Header (status, order type, payment method, delivery preference, delivery date), Customer details (section switch + name, email, phones, address, internal number, notes, zipcode), Business details (section switch + name, email, phones, address, special address), Products (order comment, ingredients, options, comments), Total (totals breakdown, payments). The row to reach them is shown only when `hasGenericPrinter(list)` (`PrinterSettings:128`), and the options are applied **only to generic printers** (`useTicketPrintRun.ts:25,31`; `TicketPreview/index.tsx:95-98`); the hint text says so (`PRINT_SETTINGS_HINT`). Star and Epson ignore them (commit 8bbf275). Order number, products and total always print.

### 1.9 Ticket preview and the print paths

- `TicketPreview` page is opened when `printerSettings` is truthy, else the **`OrderSummary`** page (`getTicketPreviewNavigationPlan.ts:19`). `printerSettings` is the normalised printers list or `''`.
- Preview: builds the text (`generateCommands`, or `generateGenericCommands` when **all** printers are generic) at `ticketWidthToShow` = 37 columns, rasterises it into a `react-native-canvas` canvas (a WebView-backed canvas), and shows that picture; title 24, "Print ticket" button, spinner (`index.tsx:82-111`, `:136`). Screenshots 138-140: ~25 s before anything shows. **The preview is not WYSIWYG**: it is always 37 columns, while print uses the printer's width (24 columns at 58 mm; ESC/POS 48 at 80 mm `escPosColumnsFor(576)`).
- Print (`useTicketPrintRun.ts:23-63`): for **every** printer of the list in sequence: text for its width; Star `printMode` `append` and all Epson/generic = text commands, Star `appendBitmapText` (TSP100) = bitmap from a second hidden canvas; `printButton(...)`; one success toast only if every printer succeeded (`getPrintRunFeedback`). Failures toast inside `printButton` per printer.
- Per brand (`usePrinterCommands.tsx:276-449`): **Star** `StarPrinter.open/print/close/dispose` with StarXpand (`actionPrintText` or `actionPrintImage`, partial cut), LAN or BT; **Epson** ePOS `Printer` (`addText`, feed 3, cut, `sendData` timeout 15 s) over `TCP:ip`, `BT:mac`, `USB:target` (USB auto-discovers when the target is the placeholder `USB`); errors mapped to keys (no paper, cover open, offline, timeout, unreachable, permission); **generic** BLE write of an ESC/POS buffer (`escPos.ts`: init, margin, text, feed, partial cut; ASCII only, diacritics stripped), writable characteristic picked from known printer services, MTU-sized chunks, only `type === 1`.
- **System print / PDF**: not in this area's printers. They live in `OrderSummary/index.tsx` (page `OrderSummary`, shown when there are no printers): an HTML summary, an alert "System printer / Export PDF" (`:~500`), `RNPrint.print({html})`, `RNHTMLtoPDF.convert` then iOS `Share.share` or Android `RNPrint.print({filePath})` (`:434-482`). `react-native-print` 0.11.0 and `react-native-html-to-pdf` 1.3.0 are the libraries. There is no "Share as PDF" of the thermal ticket itself.
- Guard rails already in the repo: golden test of the legacy ticket text (`jest/fixtures/legacyTicketGolden.json`, `TicketPreview/__tests__/legacyTicket.test.tsx`), adapter tests for Epson, BLE and ESC/POS, 743 lines of `usePrinterCommands.test.tsx`.

### 1.10 i18n keys used today (all `t('KEY', 'Fallback')`)

- Profile: `PROFILE`, `EDIT`, `PASSWORD`, `PHONE`, `NOT_PHONE`, `SESSIONS`, `PRINTER_SETTINGS`, `SCHEDULE` (dead), `REMOVE_ACCOUNT`, `ACCOUNT_ALERT`, `QUESTION_REMOVE_ACCOUNT`, `REFRESH_PROFILE`, `NETWORK_ERROR`, `IMAGE_NOT_FOUND`, `UPDATE_SUCCESSFULLY`, `AVAILABLE_STATE_IS_UPDATED` (driver only), `UPDATE`, `UPDATING`, `CANCEL`, `EMAIL`, `INVALID_ERROR_EMAIL`, `MOBILE_CONFIRM_PASSWORD`, `YOUR_PREVIOUS_CELLPHONE`, `LOGOUT`, `ENABLE_NOTIFICATIONS`, `ACTIVE_NOTIFICATION_TO_RECEIVE_INFORMATION`. `LanguageSelector` has no text keys.
- Sessions: `SESSIONS`, `CURRENT`, `DELETE_ALL_SESSIONS`, `DELETE_ALL_SESSIONS_EXCEPT_CURRENT`, `QUESTION_DELETE_SESSION`, `QUESTION_DELETE_ALL_SESSIONS`, `QUESTION_DELETE_ALL_SESSIONS_EXCEPT_CURRENT`, `QUESTION_ENABLE_ALL_SESSIONS`, `ACTIVE_SESSIONS`, `YOU_DONT_HAVE_ANY_SESSIONS`, `YOU_DONT_HAVE_ENABLED_THE_SESSIONS`, `WEB_APPNAME`.
- Printers: `ADD_PRINTER`, `AUTO_PRINT_AFTER_ACCEPTING_ORDER`, `NO_PRINTERS_CONFIGURED`, `PRINT_SETTINGS`, `PRINT_SETTINGS_HINT`, `PRINTER_CONFIGURE`, `PRINTER_BRAND(_STAR|_EPSON|_GENERIC)`, `PRINTER_NICKNAME`, `NICKNAME_EXAMPLE_TEXT`, `INVALID_ERROR_PRINTER_NICKNAME`, `PAPER_WIDTH`, `PAPER_WIDTH_80_DEFAULT`, `SELECT_PAPER_WIDTH`, `SELECT_PRINTER`, `CONNECTION_TYPE`, `CONNECTION_VIA_BLUETOOTH|LAN_WLAN|USB`, `IP_ADDRESS`, `BLUETOOTH_PORT`, `EXAMPLE_SHORT`, `SEARCH_AVAILABLE_PRINTER_MESSAGE`, `NO_PRINTERS_FOUND`, `SAVE_PRINTER`, `VALIDATION_ERROR_IP_ADDRESS_REQUIRED`, `VALIDATION_ERROR_BLUETOOTH_PORN_REQUIRED`, `INVALID_ERROR_IP_ADDRESS`, `INVALID_ERROR_BLUETOOTH_PORT_NAME`, `PRINTER_BLUETOOTH_CAVEAT`, `PRINTER_ETHERNET_SKU_WARNING`, `PRINTER_USB_CAVEAT`, `PRINTER_USB_IOS_UNAVAILABLE`, `PRINTER_USB_TARGET`.
- Print errors and ticket: `PRINTER_PERMISSION_DENIED`, `PRINTER_BLUETOOTH_OFF`, `PRINTER_BLUETOOTH_PAIR_CANCELLED`, `PRINTER_UNREACHABLE`, `PRINTER_NOT_WRITABLE`, `PRINTER_TIMEOUT`, `PRINTER_NO_PAPER`, `PRINTER_COVER_OPEN`, `PRINTER_OFFLINE` (a sentence, not a status word), `ORDER_PRINTED_FAILED`, `ORDER_PRINTED_SUCCESS`, `PRINTING_TICKET`, `TICKET_PREVIEW`, `PRINT_TICKET`, the print-option labels (`PRINT_GROUP_HEADER`, `PRINT_OPTION_BUSINESS_NAME`, `PRINT_OPTION_TOTALS_BREAKDOWN`, …) and the ticket's own lines (`ORDER_NO`, `CUSTOMER_DETAILS`, … those are printed content: not part of the screens).

### 1.11 Libraries that paint their own UI in this area

`react-native-country-picker-modal` (language list, phone prefix), `react-native-select-dropdown` (two dropdowns in `PrinterEdition`), `toggle-switch-react-native` (`PrinterSettings`, `PrintTicketSettings`, driver toggle in `UserProfileForm`), `rn-placeholder` (profile and sessions skeletons), `react-native-vector-icons` AntDesign/Feather/FontAwesome/MaterialCommunityIcons/SimpleLineIcons (rows, printer icons), system `Alert` through `OAlertOriginal` (sessions, remove account), `react-native-canvas` (WebView canvas; the ticket picture and the TSP100 bitmap), `react-native-image-picker` (system picker, stays), `react-native-permissions` and `PermissionsAndroid` (system dialogs, stay), Epson `pairBluetoothDevice` (native iOS sheet, stays), `react-native-print` / `html-to-pdf` (system dialogs, stay), `react-hook-form` (logic only).

### 1.12 Dead code

- `DriverSchedule`: only rendered at `UserProfileForm:631` under `!props.isBusinessApp`; `Profile.tsx` always passes `isBusinessApp: true` (so the Schedule row at `:579` is also dead). Exported from `ui/index.tsx:45,139`; no other consumer.
- `ScheduleBlocked`: exported (`ui/index.tsx:46,140`), **no consumer at all**; its `deliveryWaiting` image is not in the theme and "Thurday" is a typo.
- In `UserProfileForm`: the level-4 availability block (`:443`), `isShowDriverStatus`, `EnabledStatusDriver`, `ToggleSwitch`, `phoneUpdate`/`phoneInputData` state, the `useForm` errors effect (`errors` is always empty because the form is not registered), `_retrieveStoreData` import. `PrinterEdition/MessageAlert` is used but odd (a `setTimeout` without cleanup).
- Test files exist for both dead components (`DriverSchedule.test.tsx`, `ScheduleBlocked.test.tsx`).

---

## 2. Target

Shared primitives to port from driver-theming (`src/ui/src/components/shared/*`, `src/theme/*`): `OListRow` (leading/subtitle/trailing/chevron/danger, `tall`), `OCard`, `ODivider`, `OBadge`, `ONotice`, `OSwitch`, `ChoiceRow` (radio rows), `FilterChip`, `OStepper`, `OSelect` (bottom-sheet select), `OBottomPopup`, `OModal`, `OAvatar`, `OButton`, `OLink`, `ONavbar`, `OText`, `OInput` + `FieldError` + `PasswordToggle`, `KeyboardScreen`, `FloatingButton` (the 50-high bottom bar), `SectionTitle`, `SkeletonBone`, `OSpinner`, `useConfirm` + `ConfirmDialogHost` (themed dialog, not a system alert), `NotFoundSource`. Row = `OListRow` with `leading` (the 40 icon tile), `subtitle`, chevron.

### 2.1 Per mockup

| Mockup | Component tree to build | File rewritten | Driver-theming port | Primitives | New / notes |
|---|---|---|---|---|---|
| `Profile` | `ONavbar` (root, no arrow) → `ScrollView` → user card (`OAvatar` initials + name + role · store + email, chevron → ProfileEdit) → `SectionTitle ACCOUNT` + `RowsCard` (Personal information / Password / Sessions) → `THIS DEVICE` (Printers / Alerts and sound / Language) → `SUPPORT` (Help center / About) → outline `OButton` "Log out" with glyph | `UserProfileForm/index.tsx` (+ `ProfileRow`, `RowsCard`, `ProfileSkeleton`) | driver `UserProfileForm/{index,ProfileRow,RowsCard,ProfileSkeleton}`, `pages/Profile.tsx` | `OListRow`, `OCard`, `OAvatar`, `SectionTitle`, `OButton`, `usePageSections('profile')` | Rows with a 2-line value (title + value below) = `OListRow subtitle`; driver puts the value at the row's end, here it is the subtitle. Role label from level (reuse `Chat` map: 0 Administrator, 2 Business owner, 5 Driver manager). Avatar **initials** are new (`OAvatar` has glyph only; schema `profile_photo.text` / `text_color` already exist for it) |
| `ProfileEdit` | `ONavbar` → avatar 88 + soft button "Change photo" (opens the photo sheet) → server-driven fields (`OInput`+`field`) + phone → red text button "Delete account" + hint → bottom bar "Save changes" | `UserFormDetails/index.tsx`, new `pages/ProfileEdit.tsx` | driver `UserFormDetails` (`part='information'`), `ProfilePhotoSheet`, `useProfilePhoto`, `pages/ProfileEdit.tsx`, discard-changes confirm | `KeyboardScreen`, `FloatingButton`, `OInput`, `PhoneInputNumber` (re-skinned), `OBottomPopup`+`OListRow` | Photo moves here from the root (mockup). Delete account here, not on the root. Fields stay the server's (mockup shows 4 as a sample) |
| `ProfilePassword` | `ONavbar` → Current password (new) / New password (eye) with "At least 8 characters." / Confirm (error inline) → bottom bar "Update password" (disabled until valid) | `UserFormDetails` (`part='password'`), new `pages/ProfilePassword.tsx` | driver `pages/ProfilePassword.tsx` | `OInput`, `PasswordToggle`, `FieldError`, `FloatingButton` | "Current password" is not in the driver nor in today's code (Q9). `min 8` is the server rule |
| `Notifications` | `ONavbar` "Alerts and sound" → `ONotice success` ("Notifications are on...") or blocked notice + "Open settings" → rows with `OSwitch` → `SOUND` radio rows (`ChoiceRow`) → soft button "Send a test alert" | new `NotificationSetting` screen (keep the old popup logic for the orders-screen prompt), new `pages/Notifications.tsx` | driver `NotificationSetting` (permission sheet only) | `OListRow`+`OSwitch`, `ChoiceRow`, `ONotice`, `OButton` | Mostly new; see 2.2 |
| `LanguageSheet` | `OSelect` sheet "Language" with check rows; applies on tap | `LanguageSelector/index.tsx` | driver `LanguageSelector` (row variant) | `OSelect`, `ProfileRow` | Replaces `react-native-country-picker-modal` (drop `lang_country.json`). Row hidden unless `languages.length > 1` |
| `Sessions` | `ONavbar` → "This device" card (tile, label, "Signed in today at ...", `OBadge success` Current) → `OTHER DEVICES` rows (min 64, "Signed in Nov 12 · expires Dec 12", outline-danger "Sign out" 44) → bottom bar outline-danger "Sign out of all other devices" | `Sessions/index.tsx`, `pages/Sessions.tsx` | driver `Sessions/index.tsx`, `pages/Sessions.tsx` | `OCard`, `OListRow`, `OBadge`, `OButton`, `FloatingButton`, `NotFoundSource`, `useConfirm` | See 2.2: no device label from the API. Today's "delete all including current" and the "x" on the current session disappear (logout covers them) |
| `LogoutDialog` | `useConfirm({ title 'Log out?', message, acceptText 'Log out', destructive: false })` over the dimmed profile | `LogoutButton/index.tsx` | driver `LogoutButton` (confirm + loading + error toast) | `useConfirm`, `OButton` outline with glyph | Mockup's confirm is primary-blue "Log out" (not danger red). Driver's D7 drew logout as a danger row; the business mockup draws an outline button, mockup wins. Needs the keep-printers change (Q1) |
| `Printers` | `ONavbar` "Printers" + 44 plus button → auto-print card (`OSwitch`) → one card per printer (tile, name, `Star TSP100 · LAN 192.168.1.40 · 80 mm`, status `OBadge`, [last failure line], buttons Test print / Reconnect + Edit) → "Ticket" row | `PrinterSettings/index.tsx`, `pages/PrinterSetup.tsx` | none (business-only) | `OCard`, `OBadge`, `OButton`, `OSwitch`, `OListRow`, `useConfirm` (delete) | Delete printer needs a confirmation (not drawn: put it in Edit). Status and Test print: 2.2 |
| `PrintersEmpty` | `ONavbar` → `NotFoundSource`-style empty state (disc, title, text, soft "Add printer") + PDF hint | `PrinterSettings/index.tsx` (empty branch) | driver `empty_state` | `NotFoundSource` / `empty_state` | `theme.images.general.noPrinters` PNG goes; icon disc as the mockup |
| `PrinterAdd` (step 1) | `ONavbar` title+subtitle "Step 1 of 2" → two-segment progress bar → Brand tiles (Star / Epson / Other (ESC/POS)) → Connection radio rows (Wi-Fi or LAN, Bluetooth, USB-Android only) → Paper width chips (80/58) → `ONotice info` → bottom bar "Find printers" | `PrinterEdition/index.tsx` split into `PrinterAdd.tsx` + `PrinterFound.tsx`; `pages/PrinterConfigure.tsx` → two routes | none | `ChoiceRow`, `FilterChip`, `ONotice`, `FloatingButton` | New pieces: progress bar, brand tile (Section 5). Generic hides LAN/USB; Star hides USB; Epson all three (as today) |
| `PrinterFound` (step 2) | Header "Step 2 of 2" → "Found on your network" + refresh → found printers as radio rows (model / address) → "Enter the IP address instead" link → Name field → test card ("Test print" + "Print test") + success notice → bottom bar "Save printer" | as above | none | `ChoiceRow`, `OLink`, `OInput`, `OCard`, `ONotice` | Needs the **whole** discovery list (today only `[0]` is used, 1.8). Model not asked when it can be derived from discovery; manual entry keeps a model picker (an `OSelect` sheet over the existing catalog) |
| `TicketSettings` | `ONavbar` "Ticket / What the ticket prints" → paper preview (240) → switch rows → "Copies per order" `OStepper` → hint | `PrintTicketSettings/index.tsx` | none | `OListRow`+`OSwitch`, `OStepper`, `ticket_paper` | 6 mockup rows vs 24 stored booleans (Q2); copies is new |
| `TicketPreview` | `ONavbar` "Print ticket / Order #1053" → printer chips (selected / `· offline`) → grey box with paper (monospace text) → "Copies" `OStepper` → bottom bar "Share PDF" (outline) + "Print on Kitchen" | `TicketPreview/index.tsx` (UI only), `pages/TicketPreview.tsx` | none | `FilterChip`, `OStepper`, `ticket_paper`, `FloatingButton` | Chips = choose printers (Q3); PDF = new (2.2) |

### 2.2 What the mockups add, and what each needs

- **Account rows with values** — personal information ("Name, email and phone": static), password ("Change your password": static), sessions ("3 devices signed in": a count needs one `GET /users/:id/sessions`; only when `session_strategy === 'jwt_session'`), printers ("Kitchen and 1 more": from the local `printers` list, no request), alerts ("Ring until opened": from the local alert settings), language (current language name), About ("Version 1.0": `DeviceInfo.getVersion()`, the library is already a dependency, `utils/sentry.ts:11`). **Help center** has no URL anywhere in the app or config (`src/config.json` keys: app_id, api, socket, project, ...): it needs a config value (Q10).
- **"Alerts and sound"**: *works today* as behaviour but not as settings. App-only new logic: local switches stored in AsyncStorage (new keys, preserved on logout) read by `NewOrderNotification` (play the loop or only once, `Vibration` in `subscribeOrdersRegisterVibration`), notification permission state from `react-native-permissions` (`checkNotifications`, `openSettings`; already used). A local "Send a test alert" = show the real alert UI with a fake order and play the sound: app-only. **Sound choice** (Bell / Chime / Kitchen alarm): needs 3 bundled audio files (today one bundled + one remote URL) and only changes the in-app alert; the push sound is fixed by the Android channel `new_order_alarm` (`MainApplication.kt:49`) and by the push payload on iOS: **needs backend/OneSignal** to follow. **New messages / Order updates** switches: no client or server preference exists: **needs backend**. "New order alert" on/off: it is the ordering-critical alert; switching it off is a product risk (Q6).
- **Sessions with a device label**: "Android · this phone" for the **current** session can be built locally (`Platform.OS` + `DeviceInfo.isTablet()`/`getModel()`; `current` flag is returned today). Other sessions: **needs backend** (populate `UserSession.device` at login from the User-Agent or a header the app sends, and return it; the column and the API field already exist). Without it the other rows show "Signed in <created_at> · expires <valid_thru>" (works today).
- **Logout that keeps the printers**: app-only change of the exclusion list (1.4); see Section 4.
- **Printers with a connection status**: no SDK reports it for free. Star `StarPrinter.getStatus()` and Epson `Printer.getStatus()` exist (`react-native-star-io10 StarPrinter.ts:348`, `react-native-esc-pos-printer Printer.ts:111`) but both need an open/connected session (1-5 s each, a Bluetooth connection per printer, and a printer serves one connection at a time, so it can collide with a running print). Generic BLE has no status beyond "connected" (`connectToDevice`). **Recommended**: not a live poll; a status derived from the last print result recorded per printer (additive write after `printButton` returns) plus an on-demand check on "Reconnect" / "Test print" / opening the screen for one printer. The mockup's own copy ("The last ticket failed at 12:14 PM.") is exactly the last-result model.
- **Test print**: app-only new logic over existing code: `printButton({ portName, type, driver, deviceName, ip, commandsText: <short text>, ticketWidth })` is what a ticket uses; no new SDK call. Needs a test-ticket text (new i18n) and, for a Star TSP100, the bitmap path (or print the test as text).
- **Two-step add wizard**: brand and connection (step 1) are today's brand tiles and connection list; step 2 is discovery + name + test. All of it runs on existing discovery functions; the new work is returning the full list (Star/Epson already return arrays) and mapping a discovered Star/Epson model to the catalog entry (`TSP100*` family to `TSP100`, `mC_Print3` to `mC-Print3`, Epson `deviceName` to the model string passed to `new Printer({ deviceName })`). Keep a manual model picker for failures. App-only.
- **Ticket settings**: mockup toggles map to groups of the stored booleans; "Copies per order" is a new stored number (app-only). Applies to generic only today (Q2).
- **Ticket preview with "Print" and "Share as PDF"**: "Print" = existing `printTicket`. "Share as PDF" = new app-only logic: `RNHTMLtoPDF.convert({ html: '<pre>' + ticketText + '</pre>' })` + `Share.share({ url })` (iOS) / `RNPrint.print({ filePath })` (Android), the same libraries and the same share code as `OrderSummary:434-482`. It also makes the ticket reachable **without printers** ("Without a printer you can still share any ticket as a PDF"), which changes `getTicketPreviewNavigationPlan` (today no printers = `OrderSummary`): coordinate with the orders-area agent that owns `OrderSummary` / `Business.tsx`.

---

## 3. Behaviour kept / changed

| Behaviour | Status | Evidence / requirement |
|---|---|---|
| Profile fields are the server's validation fields, sorted; phone only if enabled | Kept | `UserProfileForm:482`, `UserFormDetails:61`; mockup shows a sample of 4 |
| Last/middle/second lastname missing in edit mode | Fixed by the port | driver `showField` filter in both modes |
| Photo from gallery, 200x200 base64, saved at once | Kept; camera + remove added | driver `ProfilePhotoSheet`. Camera: works today with `launchCamera` (iOS `NSCameraUsageDescription` present; no `CAMERA` in the Android manifest, intent-based). Remove: **needs the submodule commit `ede30be` "handleRemovePhoto"** (business pin `5af6bea` is its ancestor; the API clears with `photo: ''`); owner already allowed that additive change for the driver |
| Cancelling the picker shows "Image not found" | Fixed | read `didCancel` at the response root (driver `useProfilePhoto`) |
| Edit mode in place | Changed (mockup) | own screens `ProfileEdit`, `ProfilePassword`; discard-changes confirm (driver) |
| Current password field | Added (mockup) | app-only: `POST /users/check_password` exists (`UserController.php:758`), the save does not need it (Q9) |
| Remove account: confirm, then `DELETE /users/:id`, logout + clear only on `'OK'`, disabled for level 0 | Kept (confirmation moves to the themed dialog; location moves to `ProfileEdit`) | `getRemoveAccountSessionPlan.ts`; Q8 |
| Printer Settings row | Changed | now "Printers" row in THIS DEVICE |
| Sessions: strategy gate, enable-sessions flow, delete one / all | Kept (themed `NotFoundSource`, `useConfirm`) | driver Sessions |
| Delete all including current; "x" on the current session | Removed by the mockup | logout covers it; also removes the one logout path that skipped the store wipe |
| Sessions list order flips between renders | Fixed | `[...sessions].reverse()` |
| Session device label | Current device: app-only; others: **needs backend** | 1.7 |
| Language picker (full-screen modal) | Changed to a sheet | `OSelect` |
| Logout: no confirmation, wipes all storage but 2 keys | Changed | confirmation (guarded action rule); keep printers, auto-print, ticket options, alert settings (Q1) |
| Notification permission prompt on the orders screen | Kept | `NotificationSetting` popup stays (reskinned); the new screen is an addition |
| Alert loop 2.5 s, vibration, one remote sound | Kept as defaults | settings added: app-only; sound choice and message/update switches: needs backend for push |
| Printer storage shape and keys | Kept exactly | Section 4 |
| Discovery per brand, permissions, USB Android-only, generic hides LAN/USB | Kept | Section 4 |
| Discovery list: only first result used | Changed (list shown) | the SDKs already return all |
| Delete printer without confirmation | Changed | confirmation (guarded) |
| Add printer: one long form | Changed | 2-step wizard |
| Auto-print only after the accept modal of the order screen; generic = background, others = preview | Kept (Q4) | `Business.tsx:186-206` |
| Print settings apply to generic printers only; row shown only with a generic printer | Kept (Q2) | commit 8bbf275 |
| Test print | Added | app-only, over `printButton` |
| Printer status chip | Added | last result + on-demand check (not live) |
| Ticket preview = 37-column canvas bitmap | Changed | monospace text at the chosen printer's width (WYSIWYG); canvas only for TSP100 printing |
| Print goes to all printers | Kept as default (chips pre-select all) | Q3 |
| Copies | Added | app-only loop |
| Share as PDF | Added | app-only (html-to-pdf already in) |
| System print / PDF of the order summary | Out of area (`OrderSummary`) | note only |
| Remove-account / logout wipe `project_name` | Open | Q1 |
| Help center, About / version | Added | Help URL needs config; version works today |

---

## 4. The printing code as a module

### 4.1 Public surface today

| Unit | What it exports | UI or logic | Used by |
|---|---|---|---|
| `PrinterEdition/printerList.tsx` | `PRINTERS` catalog, `getPrintersByDriver`, `normalizePrinterDriver`, `normalizePrintersList` | logic (data) | `PrinterEdition`, `PrinterSettings`, `useTicketPrintRun`, `OrderDetails/getOrderDetailsPrinterSettings` |
| `PrinterEdition/paperWidth.ts` | `PAPER_WIDTH_OPTIONS`, `resolvePaperWidth` | logic | form, `utils.tsx`, `useTicketPrintRun` |
| `PrinterEdition/savePrinter.ts`, `getStoredPrinterIndex.ts` | `savePrinter` (upsert/delete on `printers`) | logic (storage) | `PrinterEdition`, `PrinterSettings` |
| `TicketPreview/ticketPrintOptions.ts` | key, defaults, load/save, **`getTicketPrintOptionGroups(t)` (builds UI labels)** | logic + UI strings mixed | `PrintTicketSettings`, preview, print run |
| `TicketPreview/genericPrinters.ts` | `isGenericPrinter`, `hasGenericPrinter`, `hasOnlyGenericPrinters` | logic | settings, preview, accept plan |
| `TicketPreview/usePrinterCommands.tsx` (490 lines) | hook returning `generateCommands` (Star/Epson ticket text, ~100 lines), `generateGenericCommands`, `printButton` (all three brand branches + Star inline + toasts + permission), `createBitmapFromText` (canvas), `discoveryPrinterPort` | **logic with i18n and `showToast` inside** | `PrinterEdition` (discovery only), `useTicketPrintRun`, `TicketPreview` |
| `TicketPreview/useTicketPrintRun.ts` | `printTicket({ order, printerSettings, canvas, ctx })` | logic | `TicketPreview`, `TicketAutoPrint` |
| `TicketPreview/{Epson,GenericBle}PrinterAdapter.ts`, `escPos.ts`, `useGenericTicketCommands.ts`, `utils.tsx`, `getPrintRunFeedback.ts`, `getTicketOffersByTarget.ts` | brand adapters and text builders | logic | above |
| `TicketPreview/index.tsx`, `TicketAutoPrint.tsx` | screens / background banner + hidden canvas | UI (with canvas refs handed to the logic) | `pages/TicketPreview`, `OrderDetails/Business.tsx:893` |
| `OrderDetails/{getOrderDetailsPrinterSettings,getTicketPreviewNavigationPlan,getAcceptAutoPrintPlan}.ts` + `Business.tsx:500-506` | read `printers` / `auto_print_after_accept_order` directly, plan navigation | logic outside the folder | order details |
| `OrderSummary/index.tsx` | its own HTML print / PDF | separate path | no-printer case |

### 4.2 Proposal: one interface, logic untouched

1. **Freeze first.** Before any file move, run the existing printing tests (`usePrinterCommands.test.tsx`, adapter tests, `legacyTicket.test.tsx` with `jest/fixtures/legacyTicketGolden.json`, `savePrinter`, `TicketAutoPrint`, `getAcceptAutoPrintPlan`) and keep them green at every step. Commit 8bbf275 (restore Star/Epson) is the reason: any edit inside the Star/Epson branches of `printButton`, `createReceipt`, `generateCommands` or `useTicketPrintRun` is **out of scope of the redesign**.
2. **Move, do not edit.** `git mv` the non-UI files into one folder (suggested `src/printing/`: catalog, storage, adapters, `usePrinterCommands`, `useTicketPrintRun`, text builders, options) behind one barrel `src/printing/index.ts`. Screens import only the barrel. Only import paths change.
3. **The interface the screens use** (a thin facade written *over* the existing functions, additive):
   - `listPrinters()`, `savePrinter(...)` (existing), `removePrinter(printer)`, `getAutoPrint()/setAutoPrint(bool)`, `getTicketOptions()/saveTicketOptions()`, `getCopies()/setCopies(n)` (new key);
   - `discover({ brand, connection })` returning **all** devices as `{ id, name, model?, address }` or `{ errorKey }` (wraps `discoveryPrinterPort`, which already returns lists; the model-mapping function is new and pure);
   - `ticketText({ order, printer })` (pure: the right generator at the printer's own width; used for the preview and the PDF);
   - `print({ order, printers, copies })` returning per printer `{ ok, errorKey? }` (wraps `printTicket`; records `lastResult { ok, at, errorKey }` per printer in the stored list, additive);
   - `testPrint(printer)` (wraps `printButton` with a short text);
   - `exportPdf(text)` (html-to-pdf + share).
   Toasts stay inside the legacy functions; the new screens read the returned results for inline messages and may ignore the toast.
4. **UI/logic split.** UI (rebuilt): `PrinterSettings`, `PrinterEdition` (two screens), `PrintTicketSettings`, `TicketPreview/index.tsx`, `TicketAutoPrint` banner, `BleDeviceList`, `MessageAlert`. The labels in `getTicketPrintOptionGroups(t)` move to the settings screen (the logic keeps only keys and defaults). `TicketPreview` and `TicketAutoPrint` today pass canvas refs into the logic: keep that contract, but mount the (hidden) canvas **only** when some target printer is Star `appendBitmapText` (TSP100); the on-screen preview becomes a monospace `Text` fed by `ticketText`.
5. **Logout and storage.** Define the list of preserved keys once, in the printing barrel (`printers`, `auto_print_after_accept_order`, `ticket_print_options`, the new copies key and the new alert-setting keys) and have `LogoutButton` (and, if Q1 says so, `getRemoveAccountSessionPlan`'s clear) exclude them next to `isTutorial` and `language`. `OrderDetails` keeps reading the same keys.
6. **Device matrix before merge** (cannot be done here): Star TSP100IV LAN, mC-Print3 Bluetooth on iOS and Android 12+, TSP100 bitmap path, Epson TM-T20III LAN, Epson Bluetooth iOS pairing sheet, Epson USB Android, generic BLE 58 mm and 80 mm; auto-print after accept (generic background and Star preview).
7. **Dependency note for the upgrade agent**: `react-native-canvas` (0.1.40) draws through a WebView and is the cause of the 25 s preview; `react-native-select-dropdown` and `toggle-switch-react-native` go away with the redesign. The Star bitmap needs a base64 PNG: any replacement of the canvas must keep `StarXpandCommand.Printer.ImageParameter(base64, width)` input.

---

## 5. Proposed theme pieces

**Page `profile`** (sections, in the mockup's order): `user_card` (hideable) · `account` (Personal information, Password, Sessions) · `device` (Printers, Alerts and sound, Language) · `support` (Help center, About; empty and hidden when neither has content) · `logout` (fixed, not hideable). Group `main` for `user_card` … `support`. Delete account is inside `ProfileEdit` (not hideable: store rules, as the driver's `delete_account`). Other screens (`ProfileEdit`, `ProfilePassword`, `Sessions`, `Notifications`, `Printers`, wizard, ticket screens) have one block: visibility keys only, no page (driver rule).

**Visibility keys** (all boolean, default true; "M" = same name in the marketplace app / driver):

| Key | Hides | Notes |
|---|---|---|
| `menu.sessions` (M, driver) | Sessions row | same name and meaning |
| `profile.password` (M, driver) | Password row and the `ProfilePassword` screen's entry | same name |
| `menu.printers` | Printers row | a store without a printer; the ticket still shareable from the order |
| `menu.notifications` | Alerts and sound row | the permission prompt on the orders screen stays |
| `menu.language` | Language row | the server's single-language rule also hides it |
| `menu.help_center` | Help center row | also hidden when no URL is configured |
| `menu.about` | About row | |
| `printers.test_print` | Test print / Reconnect buttons | |
| `ticket.pdf` | "Share PDF" on the ticket | |

Not keys, and why: photo remove and camera (an app capability), delete account (store rules), the auto-print switch (it is the printer feature itself), copies (a setting), the fields of the profile (server validation fields), the alert switches (behaviour).

**Schema components beyond the driver's `product.schema.json`** (driver already has `list_row`, `card`, `badge`, `chip`, `choice`, `stepper`, `switch`, `sheet`, `modal`, `alert`, `profile_photo`, `account_page`, `bottom_bar`, `header`, `field`, `input`, `empty_state`, `avatar`, `divider`):

| New key | Content | Why |
|---|---|---|
| `list_row` extension: `leading_tile` (size 40, radius, background `primary_subtle`, icon color) | the icon tile of every settings row | the driver's rows draw a bare glyph; the mockup rows have a 40 tile |
| `printer_card` | card + tile + name/summary typography + status `OBadge` variants (`ready` success, `offline` danger, `unknown` neutral) + failure-line color + action-button slots (soft, outline) | printers list |
| `choice` variant `tile` | brand tile: height 64, radius 10, selected = tint + `primary_text` without border | brand step; today's `choice` has only a row variant |
| `progress_steps` | segment height 5, gap 5, radius full, active / inactive colors | wizard bar |
| `ticket_paper` | outer box (`surface_alt`, radius, padding), paper (white, border, padding, width for 58/80 mm), monospace typography (the font is the paper's, not the theme's text font: say so in the editor), separator style | preview and ticket settings |
| `profile_photo` | reuse; `text` / `text_color` serve the initials; `slots.edit` stays | user card and edit screen |

The printed ticket's content (its lines, widths, ESC/POS) is **not themed**; only the on-screen paper container is.

**Images**: `placeholder.customer` (driver key) is replaced by initials in this app; `general.noPrinters` PNG is dropped in favor of an icon disc (`empty_state`), as the driver did for `empty.not_found`.

---

## 6. New i18n keys

Reuse as they are: `PROFILE`, `PASSWORD`, `SESSIONS`, `CURRENT`, `LOGOUT`, `EDIT`, `CANCEL`, `REMOVE_ACCOUNT`, `REMOVE`, `ADD_PRINTER`, `SAVE_PRINTER`, `AUTO_PRINT_AFTER_ACCEPTING_ORDER`, `PRINTER_NICKNAME` (for "Name"), `PAPER_WIDTH`, `PAPER_WIDTH_80_DEFAULT`, `CONNECTION_VIA_BLUETOOTH|LAN_WLAN|USB`, `PRINTER_BRAND_STAR|EPSON|GENERIC`, `NO_PRINTERS_FOUND`, `PRINT_TICKET`, `TICKET_PREVIEW`, `CUSTOMER_DETAILS`, `BUSINESS_DETAILS`, `ORDER_COMMENT`, `PRINT_OPTION_TOTALS_BREAKDOWN`, `PAYMENTS`, `BUSINESS_OWNER`, `ADMINISTRATOR`, `MOBILE_PHONE`, `EMAIL`, `ENABLE_NOTIFICATIONS`, the `PRINTER_*` error keys and `ORDER_PRINTED_*`.

Ported from the driver catalog (exist there, missing in this repo's `i18n/translations.json`): `INFORMATION` Information · `ACCOUNT` Account · `LANGUAGE` Language · `QUESTION_LOGOUT` "Are you sure that you want to log out?" (replaced by the new text below) · `PROFILE_PHOTO` Profile photo · `TAKE_PHOTO` Take a photo · `CHOOSE_FROM_GALLERY` Choose from the gallery · `REMOVE_PHOTO` Remove photo · `QUESTION_REMOVE_PHOTO` Are you sure that you want to remove your photo? · `CHANGE_PHOTO` Change photo · `STARTED` Started · `VALID_UNTIL` Valid until · `DELETE` Delete · `CONTINUE` Continue · `KEEP_EDITING` Keep editing · `DISCARD` Discard · `QUESTION_DISCARD_CHANGES` You have changes that are not saved. Do you want to discard them? · `ERROR_INVALID_PASSWORD` Invalid password · `REMOVE_ACCOUNT_ENTER_PASSWORD` (only if Q8 = two steps).

New (this app):

| Key | English fallback |
|---|---|
| `THIS_DEVICE` | This device |
| `SUPPORT` | Support |
| `HELP_CENTER` | Help center |
| `ABOUT` | About |
| `APP_VERSION` | Version :version: |
| `PERSONAL_INFORMATION` | Personal information |
| `PERSONAL_INFORMATION_HINT` | Name, email and phone |
| `CHANGE_YOUR_PASSWORD` | Change your password |
| `DEVICES_SIGNED_IN` | :count: devices signed in |
| `LOG_OUT_QUESTION_TITLE` | Log out? |
| `LOG_OUT_KEEPS_DEVICE_SETTINGS` | You'll stop getting order alerts on this device. Your printers and alert settings stay saved. |
| `SAVE_CHANGES` | Save changes |
| `DELETE_ACCOUNT_HINT` | This permanently removes your user. Stores are not deleted. |
| `ADMIN_CANT_REMOVE_ACCOUNT` | Administrator accounts can't be removed here. |
| `CURRENT_PASSWORD` | Current password |
| `NEW_PASSWORD` | New password |
| `CONFIRM_NEW_PASSWORD` | Confirm new password |
| `PASSWORD_MIN_HINT` | At least :min: characters. |
| `ERROR_CURRENT_PASSWORD_WRONG` | The current password is not right. |
| `UPDATE_PASSWORD` | Update password |
| `ALERTS_AND_SOUND` | Alerts and sound |
| `NOTIFICATIONS_ARE_ON` | Notifications are on for this device. |
| `NOTIFICATIONS_ARE_OFF` | Notifications are off for this device. |
| `OPEN_SETTINGS` | Open settings |
| `NEW_ORDER_ALERT` / `NEW_ORDER_ALERT_HINT` | New order alert / Opens over any screen with Accept |
| `RING_UNTIL_OPENED` / `RING_UNTIL_OPENED_HINT` | Ring until opened / Repeats every few seconds |
| `VIBRATE` | Vibrate |
| `NEW_MESSAGES` | New messages |
| `ORDER_UPDATES` / `ORDER_UPDATES_HINT` | Order updates / Driver assigned, picked up, delivered |
| `SOUND` , `SOUND_BELL`, `SOUND_CHIME`, `SOUND_KITCHEN_ALARM` | Sound, Bell, Chime, Kitchen alarm (loud) |
| `SEND_TEST_ALERT` | Send a test alert |
| `OTHER_DEVICES` | Other devices |
| `SIGNED_IN_ON` | Signed in :date: |
| `SIGNED_IN_EXPIRES` | Signed in :date: · expires :expires: |
| `DEVICE_THIS_PHONE` / `DEVICE_THIS_TABLET` | :os: · this phone / :os: · this tablet |
| `SIGN_OUT` | Sign out |
| `SIGN_OUT_OF_OTHER_DEVICES` | Sign out of all other devices |
| `PRINTERS` | Printers |
| `PRINTER_AND_MORE` | :name: and :count: more |
| `AUTO_PRINT_HINT` | One ticket on every printer that is ready |
| `PRINTER_READY` | Ready |
| `PRINTER_STATUS_OFFLINE` | Offline |
| `PRINTER_LAST_FAILED` | The last ticket failed at :time:. |
| `RECONNECT` | Reconnect |
| `TEST_PRINT` / `PRINT_TEST` | Test print / Print test |
| `TEST_PRINT_HINT` | Prints a short ticket to check the connection. |
| `TEST_TICKET_SENT` | Test ticket sent at :time:. |
| `TEST_TICKET_TEXT` | Test ticket |
| `REMOVE_PRINTER` / `QUESTION_REMOVE_PRINTER` | Remove printer / Remove this printer? |
| `TICKET` / `TICKET_SETTINGS_HINT` | Ticket / What the ticket prints |
| `NO_PRINTERS_YET` / `NO_PRINTERS_YET_HINT` | No printers yet / Add one to print a ticket as soon as you accept an order. |
| `PRINTERS_EMPTY_PDF_HINT` | Without a printer you can still share any ticket as a PDF. |
| `STEP_OF` | Step :step: of :total: |
| `BRAND` , `CONNECTION` | Brand, Connection |
| `PRINTER_BRAND_OTHER` | Other (ESC/POS) |
| `CONNECTION_HINT_RELIABLE` / `_SHORT_RANGE` / `_ANDROID_ONLY` | Most reliable / Short range, can drop / Android only |
| `PRINTER_NETWORK_HINT` | Turn the printer on and connect it to the same network as this device. |
| `FIND_PRINTERS` | Find printers |
| `FOUND_ON_YOUR_NETWORK` / `FOUND_NEARBY` | Found on your network / Found near you |
| `ENTER_IP_INSTEAD` / `ENTER_ADDRESS_INSTEAD` | Enter the IP address instead / Enter the address instead |
| `CHOOSE_PRINTER_MODEL` | Choose the printer model |
| `PRINTER_NAME_HINT` | Shown on the print button. |
| `COPIES` / `COPIES_PER_ORDER` | Copies / Copies per order |
| `SHARE_PDF` | Share PDF |
| `PRINT_ON_PRINTER` | Print on :printer: |
| `PRINT_ON_N_PRINTERS` | Print on :count: printers |
| `PRODUCT_OPTIONS_AND_NOTES` | Product options and notes |
| `TICKET_ALWAYS_PRINTS` | The order number, products and total always print. |
| `TICKET_SETTINGS_GENERIC_ONLY` | These options apply to generic (ESC/POS) printers. |

(Placeholders follow the app's `:name:` pattern, as `CASH_CHANGE_OF`.) Run `yarn i18n:generate|verify` and `/translate-keys` after the implementation.

---

## 7. Tablet

**Today**: nothing in this area is tablet-aware. `Container` and `SafeAreaContainer` track portrait/landscape only for padding (`layouts/Container.tsx:19-33`); the only tablet branch of the app is `MyOrders` (`DeviceInfo.isTablet()`, `Platform.isPad`, landscape or width >= 950, `pages/MyOrders.tsx:26-68`). The Profile tab, Sessions and the printers screens stretch the phone layout over the full width.

**Proposal** (breakpoint = the same rule `MyOrders` uses, in one shared hook):
- Single-column screens (Profile, ProfileEdit, ProfilePassword, Sessions, Notifications, Printers, PrinterAdd/Found, LanguageSheet): content in a centered column with a max width (a layout token, around 560), the header and bottom bar stay full width, sheets and dialogs keep the modal `sm` width and center instead of docking full width.
- Landscape tablet: `Printers` (list) with the wizard opened in the right pane; `TicketSettings` with the settings list on one side and the paper preview live on the other (the preview already depends only on the stored options); `TicketPreview` with chips + copies left, paper right. Profile root stays a column (a settings list does not need two panes); its destinations push as stack screens, as on the phone.
- The bottom tab bar becomes the rail of `TabletBoard` (navigator-level, another area's work); this area only asks that its screens do not assume a bottom tab bar's height (`account_page.padding_bottom` over the system inset).
- Printing is unaffected (same SDKs); iPad Bluetooth pairing sheet and Android tablet USB are in the device matrix.

---

## 8. Open questions for the owner

**Q1. What does logout keep on the device?** (recommended first)
- A. Keep printers, auto-print flag, ticket options, copies and alert settings; still clear everything else (the keys of 1.4). `project_name` stays cleared as today. *Recommended: the dialog already promises it.*
- B. Also keep `project_name` (multi-project builds skip re-choosing the project).
- C. Wipe everything as today (the mockup text would then be false).
- Sub-question: does **Remove account** keep the printers too? Recommended: no, wipe as today (the account is gone; a shared device can re-add printers).

**Q2. Which printers do the ticket options apply to?** Today generic only (the restored Star/Epson text ignores them).
- A. Keep generic-only; show the `Ticket` row only when a generic printer exists (as today) and say so in the screen. *Recommended: no printing regression.*
- B. Apply to every brand: changes the Star/Epson ticket the last commit restored; needs the golden fixture and a device pass.
- C. Show the row always, disabled with an explanation when no generic printer.
- Also: the mockup's 6 toggles vs today's 24. Recommended: keep the 24 stored keys, the 6 rows drive their groups, with the granular rows behind a "Details" expand.

**Q3. Printer chips on the ticket preview.**
- A. Chips choose which printers print; all ready printers pre-selected (today's behaviour = all); the button names the target ("Print on Kitchen", "Print on 2 printers"). *Recommended.*
- B. One printer at a time (changes the multi-printer run).

**Q4. Auto-print scope.** Today only after the accept modal of the order's own screen (`Business.tsx:800`). The setting text "Print when I accept an order" reads as every accept.
- A. Extend to every accept entry of the new design (list card, accept sheet); coordinate with the orders agents. *Recommended.*
- B. Keep as is and word the setting accordingly.

**Q5. Printer status.**
- A. Last print result stored per printer + on-demand check ("Reconnect", "Test print"). *Recommended (cheap, matches the mockup copy).*
- B. Live check when the screen opens (one connection per printer, 1-5 s each, may disturb a running print).
- C. No status chip.

**Q6. "Alerts and sound" scope.**
- A. Ship the local settings now (Ring until opened, Vibrate, test alert, permission notice, sound choice if the owner supplies the 3 audio files); hide New messages / Order updates until the backend has preferences. *Recommended.*
- B. Show all rows, the two server ones disabled with "Coming soon".
- C. Ask for the backend first.
- Sub-question: may "New order alert" be switched off? Recommended: no switch (keep the row informative) or require the permission notice; it is the app's core alert.

**Q7. Session device label.**
- A. Label the current device locally; other rows show dates only; ask backend to fill `UserSession.device` (column exists, never written). *Recommended.*
- B. Wait for backend before shipping the redesigned Sessions rows.

**Q8. Remove account confirmation.**
- A. One themed confirmation, as today, then `DELETE /users/:id` and the existing `getRemoveAccountSessionPlan`. *Recommended (behaviour kept).*
- B. Port the driver's two steps (confirm, then password checked with `POST /users/check_password`).
- Level 0: keep it disabled but add the explanation line (`ADMIN_CANT_REMOVE_ACCOUNT`) instead of a silent grey button.

**Q9. "Current password" on the password screen.** Mockup has it, today's flow and the driver do not, and the API does not require it.
- A. Add it and verify with `POST /users/check_password` before the save. *Recommended.*
- B. Drop it from the mockup's build (as today).

**Q10. Help center and About.** No help URL exists. A. A new project config value (`help_url` in `src/config.json`-style settings or a server config) and hide the row when empty. *Recommended.* B. Drop Help center, keep About/version only.

**Q11. Wizard edit and model.**
- A. "Edit" reopens step 1 with the stored brand/connection/paper, then step 2 with the stored printer selected; model derived from discovery, manual model picker as fallback. *Recommended.*
- B. Edit is a single screen with the old model dropdown (keeps all 37 models visible but is the form the redesign removes).

**Q12. Preview without printers / PDF.** Allow `TicketPreview` when there are no printers (PDF only) and retire the no-printer `OrderSummary` branch? Needs the orders-area owner. Recommended: yes, one ticket screen.

---

## 9. Work breakdown

Files an implementation agent owns (all under `src/` unless noted):

| Work item | Files |
|---|---|
| Shared primitives port (coordinate with the global-primitives agent; do not duplicate) | `ui/src/components/shared/{OListRow,OSwitch,OSelect,OStepper,ChoiceRow,FilterChip,ONotice,OBadge,OAvatar,OBottomPopup,confirmAction,ConfirmDialogHost,FieldError,PasswordToggle,KeyboardScreen,SectionTitle}` |
| Profile root + photo sheet + skeleton | `UserProfileForm/{index,ProfileRow,RowsCard,ProfileSkeleton,ProfilePhotoSheet,useProfilePhoto,styles}`, `pages/Profile.tsx`; delete `getRemoveAccountSessionPlan.ts` only if its logic is moved (keep it, tested) |
| Edit / password screens | `UserFormDetails/index.tsx`, `pages/ProfileEdit.tsx`, `pages/ProfilePassword.tsx`, `navigators/HomeNavigator.tsx` (3 routes), `PhoneInputNumber` re-skin (shared with Login: coordinate) |
| Language, logout, notification | `LanguageSelector`, `LogoutButton`, `NotificationSetting` (+ new `AlertSettings` store and `pages/Notifications.tsx`), `NewOrderNotification/index.tsx` (read the settings: a small additive change; owner of orders area to agree), `navigators/subscribeOrdersRegisterVibration.ts` |
| Sessions | `Sessions/index.tsx`, `pages/Sessions.tsx` |
| Printing module move + facade | new `printing/` (moved files + `index.ts` facade), import fixes in `OrderDetails/*`, `PrinterSettings`, `PrinterEdition`, `PrintTicketSettings`, `TicketPreview` |
| Printer screens | `PrinterSettings/index.tsx`, `PrinterEdition/*` split into `PrinterAdd.tsx` + `PrinterFound.tsx`, `pages/PrinterSetup.tsx`, `pages/PrinterConfigure.tsx` (+ second route), `PrintTicketSettings/index.tsx`, `pages/PrintTicketSettings.tsx`, `TicketPreview/{index,TicketAutoPrint,styles}.tsx`, `pages/TicketPreview.tsx` |
| Dead code | delete `DriverSchedule/`, `ScheduleBlocked/` and their exports in `ui/index.tsx:45-46,139-140`, the `isBusinessApp`-gated Schedule code |
| Theme | `src/theme/*`, `product.schema.json` entries of Section 5, `src/theme.json` removal of `noPrinters`, `menulogout`, `arrow_left` |
| i18n | `i18n/translations.json` (Section 6) |

Not in the owner's files, report instead: `OrderDetails/Business.tsx` (auto-print entries, Q4; navigation plan, Q12), `OrderSummary`, `NewOrderNotification` mounting "over any screen" (the mockup's claim; today only inside the orders screens), the submodule bump for `handleRemovePhoto`, the api-core change for session `device`, the `react-native-canvas` replacement (upgrade agent).

**Today's tests of the area** (to port or rewrite; `jest`):
- Pages: `src/pages/__tests__/{Profile,Sessions,PrinterSetup,PrinterConfigure,PrintTicketSettings,TicketPreview}.test.tsx`.
- `UserProfileForm/__tests__/{UserProfileForm.test.tsx,getRemoveAccountSessionPlan.test.ts}`, `UserFormDetails/__tests__/UserFormDetails.test.tsx`, `LanguageSelector/__tests__/LanguageSelector.test.tsx`, `LogoutButton/__tests__/LogoutButton.test.tsx`, `NotificationSetting/__tests__/NotificationSetting.test.tsx`, `Sessions/__tests__/Sessions.test.tsx`, `DriverSchedule/__tests__/DriverSchedule.test.tsx` and `ScheduleBlocked/__tests__/ScheduleBlocked.test.tsx` (delete with the code).
- `PrinterSettings/__tests__/PrinterSettings.test.tsx`, `PrinterEdition/__tests__/{PrinterEdition,savePrinter,getStoredPrinterIndex,normalizePrintersList,paperWidth,deviceFilter}.test.ts(x)`, `PrintTicketSettings/__tests__/PrintTicketSettings.test.tsx`.
- `TicketPreview/__tests__/{TicketPreview,TicketAutoPrint,usePrinterCommands,EpsonPrinterAdapter,GenericBlePrinterAdapter,escPos,ticketPrintOptions,getPrintRunFeedback,getTicketOffersByTarget,legacyTicket}.test.ts(x)` with `jest/fixtures/legacyTicketGolden.json`, `jest/fixtures/legacyTicketOrders.js`, `jest/helpers/{b6PrinterDefaults,b6PrinterUiMock,registerB6PrinterMocks}.js`.
- `OrderDetails/__tests__/{Business.printerSettings,getAcceptAutoPrintPlan,getOrderDetailsPrinterSettings,getTicketPreviewNavigationPlan}.test.ts`.
- To add: logout preserves the printing keys; discovery list and model mapping; `lastResult` recording; test print; copies loop; PDF export; the picker cancel path.

---

## 10. What I did not see / did not verify

- Nothing was run: no app, simulator, device, jest, tsc or lint. No printer hardware; the claims about Star, Epson and BLE behaviour, discovery timing and the permission prompts come from code and the earlier screenshots (`INDEX.md` 114-140), not from a run.
- I did not open the screenshots themselves; I used `INDEX.md` and `inventory-rest.md`, and re-checked each claim against the code (the picker `didCancel` bug, the `autoSwitchInterface` permission, the `printers[0]` use, the wipe in `_clearStoreData`).
- Whether `StarPrinter.getStatus()` / Epson `getStatus()` are quick enough in practice was not measured; the library signatures were read only.
- The mapping of Star `StarPrinterModel` values to the 22-entry catalog (and Epson `deviceName` to the supported model strings) was not tested; the enum was read from `node_modules/react-native-star-io10`.
- I did not read the whole submodule `LogoutAction` / `SessionContext` (only the logout paths and the session list/delete controllers) and did not search api-core for every place a `UserSession` is created (`SessionCodeController`, `ActionController`, `IntegrationInternalController` were not opened; only `UserController::generateSession` and the one in `UserSessionController`/`UserController:2789` were read), so "`device` is never written" is established for the login path used by this app, not for all.
- The `OrderSummary` print and PDF code was read only for the print/PDF handlers (`:395-482`); its HTML and the page's role in the orders area were not analysed.
- The mockup HTML files were read as extracted text plus `SPECS.md`/`DESIGN-KIT.md`; exact inline values were not compared pixel by pixel.
- I did not check driver-theming's `docs/theme/components.md` and `tokens.md` in full, nor its test files; the primitives list comes from its `shared/` folder and `product.schema.json`.
- Marketplace app was not read for profile or printing; "M" marks on visibility keys follow the driver's document, not a fresh check of the marketplace schema.
- `ProductPushController` and push preferences in api-core were only searched by name; "no per-category push preference exists" is the result of a keyword search, not a full audit.
