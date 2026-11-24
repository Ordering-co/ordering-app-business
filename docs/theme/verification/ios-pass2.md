# Second device pass: iOS phone

- Date: 2026-11-19 (about 21:53 to 22:08 local time of the simulator, clock 9:53 to 10:07 PM)
- Device: simulator "iPhone 17 Pro" (`558440F2-0071-4F0F-9F05-E9BB95AFE1AD`), iOS 27.2, 402 x 874 pt.
- Build: Debug (`co.ordering.business`), JavaScript from Metro on port 8097 (branch `feature/theming-native`, the first-pass fixes merged), local API `http://localhost:8080`, project `development`. The test account was typed into the app only (masked here).
- Screenshots: `<scratchpad>/pass2/ios/NN-*.png` (63 files, full size 1206 x 2622), every one opened and looked at. `<scratchpad>` = `/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad`.
- Method: `idb ui describe-all` (frames in points) plus `simctl io screenshot`; text size toggled with `simctl ui content_size` and restored to `large`.
- Known limit of the local stack (unchanged): no socket events. The connection pill read "Reconnecting" the whole pass and "Live" right after the sign-in at the end. The app's CPU at rest measured 2.2 to 2.7 % (`top`, three samples), under the 5 % limit.
- Other agents edited code while I tested: the list reloaded itself once (counters went from "In progress 74" to "55+", then "29+"), which does not change any verdict.

## Data I changed (local API / device)

| What | Detail |
|---|---|
| Order #2805 (Delivery, oldest pending) | accepted from its card (20 min), time adjusted +10 (promised 10:16 PM to 10:26 PM) from its details, then "Mark ready for pickup" (now Ready for pickup, no driver). |
| Order #2807 (Delivery, oldest pending) | accepted from its card (20 min). It stays Accepted. |
| Order #3287 (Pickup, old pending) | rejected from its card, reason "Item out of stock", note "Second device pass test". |
| Chat on #2805 | one message "Test message from the second device pass", sent to Customer. |
| Alert sound | switched to Chime, then Kitchen alarm, "Send a test alert" rang with Kitchen alarm, set back to Bell. |
| Password form | typed throw-away text, left with "Discard" (nothing saved). |
| Session | signed out and in once at the end (a new session exists now; none deleted). |
| Not done | "Not picked up" / "Picked up": no pickup order of mine was ready (see checks). An attempt to mark an old in-progress pickup order (#2878, not one of mine) ready was blocked by the permission classifier; I did not retry. No printer added. Text size set to `extra-extra-large` and back to `large`. |

## First-pass finding to verdict to screenshot

Counts for the 20 findings of classes A and B: **10 fixed, 4 partly, 0 not fixed, 6 could not see.**

| First-pass id | Verdict | Screenshot / what I saw |
|---|---|---|
| IOS-A1 adjust time unusable | **fixed** | 13, 14: "Now: ready in 17 min · promised for 10:16 PM", chips enabled, new time "10:26 PM", "Update time" works, details then read "Ready in 27:40 · Promised for 10:26 PM". |
| IOS-A2 "Ready by invalid format" | **fixed** | 04: "Ready by 10:15 PM" (clock 9:55 + 20 min). Also "10:16 PM" for #2807. |
| IOS-A3 no tab bar after sign-in | **fixed** | 62, 63: signed in with the keyboard open on the form and tapped "Log in": the tab bar is there at once (once only; not a statistic). |
| IOS-B1 reject sheet under status bar with keyboard | **fixed** | 30: the sheet stops at the top safe area (title and X below the status bar), content scrolls, "Reject order" rides about 10 pt above the keyboard. |
| IOS-B2 keyboard avoidance | **fixed** where seen | Search (10), Password (53), chat composer (19), reject sheet (30), login (61): the action bar rides about 10 pt on the keyboard, closing it restores the layout (21, 25). The Review "Anything to add?" field and printer wizard step 2 were not re-opened (not seen). |
| IOS-B3 History "Review customer" overflows | **fixed** | 32: chip on its own line, button 162 pt wide, inside the card. |
| IOS-B4 history chips solid, no "Reason:" | **partly** | 32: "Reason: Item out of stock" line now shown on rejected cards. Chips are still solid green / red with white text. "Review customer" on rejected orders is the owner's decision (not reopened). |
| IOS-B5 list not updated after own action | **fixed** | 05, 31: after "Accept" the card left New and In progress went 72 to 73 with no pull to refresh; after the reject the card left at once. |
| IOS-B6 segmented tabs small | **fixed** | 00: tabs 36 pt high in a 46 pt pill, 5 pt above the pill. |
| IOS-B7 swipe back on map screen | **could not see** | the map screen is not reachable without a driver ("Track on map" absent); the mini map in the details is not tappable. |
| IOS-B8 map screen layout | **could not see** | same. |
| IOS-B9 ended-chat notice cut | **could not see** | I did not open a chat of an ended order. |
| IOS-B10 ticket paper too narrow | **partly** | 41: separators no longer wrap, "Subtotal $ 5,00" amounts stay on one line, paper is centred. Lines longer than 37 columns still hard-wrap ("ASAP(18/11/2026 / 12:44PM / )", "Full Address: ... N / ueva York"), and the product name touches the price ("COFFEE$ 5,00"): that is the printed text (exceptions), same as a printer would do. The printer chip row of the preview with a printer was not seen (no printer added). |
| IOS-B11 Review "Goo..." and heading | **could not see** | Review screen not opened. |
| IOS-B12 no "Assign" | **fixed** | 12: "Driver · Not assigned yet · Assign" on an accepted delivery; 15: sheet opens (see checks). |
| IOS-B13 "Not picked up" wraps | **could not see** | needs a Ready pickup order. |
| IOS-B14 Ready header "Waiting mm:ss" and plain call buttons | **could not see** | needs a Ready pickup order (the Ready delivery #2805 has chips only and the call / message buttons are tinted blue, 17). |
| IOS-B15 printer wizard third tile cut | **fixed** | 39: "Other (ESC/POS)" fully visible in a 169 pt tile. |
| IOS-B16 filters on: tabs vanish, Clear grey | **partly** | 11, 22, 26: "Clear" is now the amber underlined text button. The New / In progress / History tabs are still not drawn while a filter is on. |
| IOS-B17 menu "View" button, category switch | **partly** | 50: still no "Category on" switch on category headings (capability rule OQ-10, decided). The notice with "View" needs an unavailable product: not seen (Unavailable 0). |

Class C ones I passed by:

| Id | Verdict |
|---|---|
| C1 login language "Spanish" | language button now reads "English" (59): fixed. The logo placeholder is still a 44 x 44 store tile: unchanged. |
| C3 Forgot "Recover Password" | not opened. |
| C4, C5, C8, C16, C17 | not opened / not seen. |
| C6 elapsed times and formats | partly fixed: "Waiting 9d 2h", "Waiting 33d 13h" (amber for pending), "12:41 PM", "ASAP (18/11/2026 12:44 PM)" with the space. Amounts are still "$ 33,93" (server currency format). |
| C7 search | partly: the keyboard no longer opens on entry (09); still "SLA'S" section, "In Progress" capital P in the filter banner (26), "Show orders" without a count. |
| C9 tab bar badges | partly: "99+" / "21+" now consistent, but the badge still overlaps the icon's top right corner (33, 48). |
| C10 Messages chips | partly: the unread count is now inside the "Unread" chip (48); status chips still truncate ("Order picked up completed by…", "#4471 · Pi…"). |
| C11 chat recipients | fixed: only "Customer" selected (18). The attach button keeps a grey outline. |
| C12 menu | fixed: lower-case keyboard (51), empty state "All products are available" (52). |
| C13 personal information | fixed: Name, Last Name, E-mail, phone with country (55); "Remove account" is disabled for administrators with an explanation (not reopened). |
| C14 | stars announce "1 of 5 stars" (40): fixed. A stray "15" line under the address of #2805 remains (12). |
| C15 dialogs | "Discard?" (54) and "Log out?" (58) titles: fixed. Remove-printer dialog not seen. |

## Screens seen for the first time

- Assign driver sheet (15), empty state only (the local project has no drivers).
- Order details of a Ready delivery with the mini map (16, 17), the timeline card, the "The driver completes this order" notice.
- Adjust time sheet on an accepted order (13), orders list "In progress" grouped with overline headings (07, 08), live connection pill "Live" (62), Save-password system sheet after sign-in (62).
- Alerts and sound with the sound picker (34, 35, 36).

## Checks of point 3

| Check | Result |
|---|---|
| No time or date reads "invalid format" | **ok**: cards ("Ready in 18:17", "12:41 PM"), details, accept sheet, adjust sheet, chat pills and day separators ("10/10/2023", "19/11/2026"), history, sessions ("Started 19/11/2026 06:57 PM") all read as dates. |
| Adjust time usable on an order in preparation | **ok** (13, 14): +10 applied, "Promised for 10:26 PM". |
| Assign driver sheet from an accepted delivery | **ok, partly seen**: opens (15) with "Without drivers" and a disabled "Unassign driver" button; no driver exists in the local project so no list and no pick. |
| "Not picked up" asks for confirmation | **not seen**: no Ready pickup order available; see What I did not see. |
| Orders list with hundreds of orders | **ok**: New first page, then scrolling to the end loaded the next pages (counter "22+" to "99+", list ends at #2805 at the bottom), taps answered at once, In progress also paged ("52+" to "72"), CPU at rest 2.2 to 2.7 %. |
| Card moves after own action | **ok** (05, 31; Ready: the "PREPARING" group went 61 to 60). One gap: see IOS2-B2. |
| Keyboard rule on every screen and sheet with a field | **ok where seen**: search, chat, reject sheet, password, login, menu search. Not seen: Review, printer wizard, TicketSettings. |
| Tab bar right after signing in | **ok** (62, 63). |
| Ticket preview: paper width and text | **partly ok**: see IOS-B10 above. |
| Mini map in a delivery order's details | **partly**: it appears in the driver card of a Ready delivery (16); tiles are blank (no key / network in the simulator) and the markers are clipped (IOS2-B1). |
| Notifications and sound picker | **ok on screen**: Bell, Chime and "Kitchen alarm (loud)" listed (34); each selection changed the radio (35); "Send a test alert" with Kitchen alarm selected opened the alert sheet "1 new order · Ringing until you open or accept them · Mute" (36). **I cannot hear audio in this setup**, so the previews and the ring are not confirmed by ear. |
| Group headings small uppercase | **ok**: "ACCOUNT", "THIS DEVICE", "SUPPORT" (33), "PREPARING · 61", "WITH DRIVER · 7" (08), "DATE", "ORDER TYPE", "STATUS", "BRAND", "CONNECTION", "PAPER WIDTH", "SOUND", "YESTERDAY". |
| Text scaling two steps larger | **ok** (45, 46, 47): list, details and Profile grow, nothing clipped, buttons stay 44 pt high, tab bar grows. Small flaw IOS2-C3. Restored to `large`. |

## New findings

### Class A
None.

### Class B

**IOS2-B1. Mini map markers are clipped at the map's edges.** Screens 16, 17, 42. In the driver card of a Ready delivery the customer pin (top left) is cut by the top edge of the map box and the store marker (bottom) by its bottom edge, so the two markers sit half outside the 140 pt map; the order's coordinates are 8 665 km apart so the fit puts both on the border. A fit with padding is missing. Tiles are blank (simulator, no key or network). File: `src/ui/src/components/OrderDetails/MiniMap.tsx`.

**IOS2-B2. A filtered (search) list is not updated after an action taken from the details.** Screen 22: after "Mark ready for pickup" on #2805 from its details, the search result list (filter "2805") still shows the card as "Accepted by business · Ready in 26:21 · Mark ready". The unfiltered list was updated (the PREPARING group lost it). Back from the filter it is right again. Files: `src/ui/src/components/OrdersOption/` (search result state).

### Class C

- **IOS2-C1.** Assign-driver sheet with no drivers: the text "Without drivers" and a disabled "Unassign driver" button (15); nothing assigned, so "Unassign" makes no sense; an empty-state message would. `src/ui/src/components/OrderActions/AssignDriverSheet.tsx`.
- **IOS2-C2.** Chat system pills are still long raw server texts: "Order Prepared in Changed from 20 to 30 Minutes · 09:58 PM", "Order Logistic status Changed from Pending to In queue" (18); the decision says one short pill with the new status and its time (status pills do follow it: "Order ready · 09:58 PM"). `src/ui/src/components/Chat/`.
- **IOS2-C3.** The "In progress" label in the segmented control is drawn in a smaller font than "New" and "History", at normal size (03, 06) and more at larger text (45). `src/ui/src/components/OrdersOption/` (tabs).
- **IOS2-C4.** The order details header subtitle is cut: "Domino's Pizza (66666) · ready 09:58 P…" (16); "Wine.. · placed 07:13 PM" (46).
- **IOS2-C5.** "Waiting 9d 2h" is amber on the card (00) and green in the order's details (46).
- **IOS2-C6.** Menu search: tapping the "Unavailable" chip keeps the keyboard open over an empty state (52).

## What I did not see

- "Not picked up" and its confirmation, "Picked up", the Ready-for-pickup header ("Waiting mm:ss"), the "hand off" card (IOS-B13, B14): no Ready pickup order existed and the allowed actions were used; making one needs accept plus mark ready of a pickup order beyond the budget (the one try on an existing preparing pickup was denied).
- MapTracking screen, swipe back on it, "Track on map", driver minutes (needs a driver; the local project has none).
- A list of drivers and picking one in the assign sheet.
- Review customer screen and its keyboard (IOS-B2 Review part, B11), ended-chat notice (B9), printer wizard steps 2 and the found-printer rows, Ticket settings, the preview with a printer chip row, Remove-printer dialog, "Add printer" keyboard.
- Forgot, Login code, Language sheet (25 languages), notifications explainer: not reopened.
- Menu notice "View" and an unavailable product; OrdersEmpty, OrdersOffline, OrderError (no way to produce them).
- Audio: the sound previews and the ring cannot be heard; only the radio selection and the alert sheet were seen.
- Portrait only: not testable here (no rotation tool), as said.
- Pull-to-refresh indicator not captured.
