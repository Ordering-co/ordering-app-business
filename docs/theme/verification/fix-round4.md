# Fix round 4: the login's button over the keyboard on a tablet, and the small tablet findings

Date: 2026-11-19. Branch `feature/theming-native`, local commits only. Devices: the Android tablet `emulator-5558` (1280 x 800 dp, 2 px per dp) and the iPad Pro 11" simulator `8078BDBA-...` (iOS 27.2, 1210 x 834 pt landscape, 834 x 1210 portrait). Debug builds, JavaScript from Metro 8097, local API. Screenshots (all opened and looked at): `<scratchpad>/pass5/tablet-android/` and `<scratchpad>/pass5/ipad/` (`<scratchpad>` = `/private/tmp/claude-502/-Users-work-Ordering-ordering-app-business-theming/3f70efc6-0154-439f-b577-4c786cf37ae6/scratchpad`). The test account was typed into the apps only.

## 1. T3-B1: Login in landscape, "Log in" under the keyboard

### Measures (Android tablet, landscape, password focused, Gboard with its number row)

Read from `uiautomator dump`, `dumpsys window` and a temporary log in `useRevealFocused` (removed).

| What | Value |
|---|---|
| Window | 2560 x 1600 px (1280 x 800 dp); `windowSoftInputMode=adjustResize`, edge to edge |
| Keyboard | 824 px = 412 dp (`ime` inset); the window shrinks to 388 dp |
| The scroll's room (what `KeyboardScrollView` shows over the keyboard) | 298 dp |
| Password field in the content | y 255 dp, 48 tall (top with its `md` air 240, bottom 318) |
| "Log in" ends at | 409 dp in the content |
| Content size | 585 dp with the keyboard up (678 at rest: its `minHeight` fills the window and keeps "Version 1.0" at the foot) |
| What the old code did | scroll offset 0 to 20 dp (40 px): only the field's end cleared the keyboard |

The form (field top 240 to button end 409+15) is 199 dp and the strip is 298 dp: **both fit on the Android tablet** (the offset range that shows the field and the button is 126 to 240 dp).

iPad (landscape, 1210 x 834 pt): keyboard top at y 407 pt (keyboard 427 pt), the scroll's room about 327 pt (top safe area 24 + bar 56 = 80), password field 354 to 404 pt at rest, "Log in" 459 to 509 pt, "Email me a login code" ends 608; with the keyboard up the old page moved 12 pt (pass 3). **Both fit on the iPad too** (field top to button end 150 pt, strip 327 pt). No tablet is in the "cannot fit" case; that case is handled anyway (below) and covered by a test, but was not seen on a device.

### Cause: why the earlier test passed while the screen was wrong

`revealOffset` scrolled "to the end of the content" only when the field's top was still in sight there (`top >= end - room`). The content's end is not the button's end: after "Log in" come the "or" divider, "Email me a login code" and the "Version 1.0" line with its padding. On the Android tablet the end (585) minus the strip (298) is 287 dp, further than the field's top (240), so the condition failed and the scroll stayed at the 20 dp that clears the field. The earlier tests (`keyboardRule` and `LoginKeyboardLandscape`) faked a page whose content ended at the button (520, button at 520), so the end was always reachable with the field in sight and the test passed. The device's page has 176 dp more under the button. The tests did not see it because the fake had no divider, no second button and no version line. Also `keyboardDismissMode='on-drag'` closed the keyboard on the first drag, so the button could only be reached by closing the keyboard.

### Fix (primitive: `src/hooks/useRevealFocused.ts`, `KeyboardScrollView.tsx`)

- With `keepEndInSight` the scroll goes on toward the content's end **as far as the focused field's top stays in sight** (`min(end - room, field top)`), so the field is first and as much of what follows it as the strip holds. If the end can be reached with the field in sight (a short form), it ends at the end, as before.
- A screen with `keepEndInSight` (the auth screens without a pinned footer) has `keyboardDismissMode='none'` (`keyboardShouldPersistTaps='handled'` as always): a drag no longer closes the keyboard, so if the field and the button do not both fit, the field wins and the user scrolls by hand to the button with the keyboard up.
- A touch that dragged the scroll (`onScrollBeginDrag`) no longer triggers the "reveal after a touch" (it used to pull a hand scroll back to the field).
- Other screens (`KeyboardScrollView` without `keepEndInSight`: the reject sheet's note, Profile -> Password) keep `on-drag` and the old behaviour.

### Tests

`LoginForm/__tests__/LoginKeyboardLandscape.test.tsx` now uses the device's numbers (room 298, field 255 + 48, button end 409, content 585) and asserts the field and the button's end are both inside the strip; a test for no dismiss on drag and no pull-back; a test for the page too tall for the strip (the field wins). `shared/__tests__/keyboardRule.test.tsx` has the new `revealOffset` cases. Run against the old code, the login test fails for the device's reason (`y + room` = 318, expected at least 409) and for `keyboardDismissMode` ("on-drag"). All pass after.

### Seen on the devices

| Device, orientation | What | Screenshot |
|---|---|---|
| Android, landscape | Before (the old code): password field just over the keyboard, "Log in" under it | `tablet-android/a04-kbd.png` |
| Android, landscape | **After: password focused, keyboard open: the field and "Log in" (and "Email me a login code") over the keyboard** | `tablet-android/a05-fix1.png`, `a11-password-typed.png` |
| Android, landscape | Email focused: "Log in" over the keyboard too | `tablet-android/a10-email-focused.png` |
| Android, landscape | A drag down on the form with the keyboard open: the page scrolls to the top, the keyboard stays, no pull-back; "Log in" tapped over the open keyboard signed in | `tablet-android/a09-dragged-down.png` |
| Android, portrait | Login with the password focused: nothing scrolls, everything shows | `tablet-android/a21-login-portrait-kbd.png` |
| iPad, landscape | Before (pass 3): page up 12 pt, "Log in" at y 447 under the keyboard (top 407) | pass 3 `ipad/20-ipad-login-land-kbd` |
| iPad, landscape | **After: password focused, keyboard open: the field (112 to 162 pt) and "Log in" (217 to 267 pt) over the keyboard (top 407)** | `ipad/i04-kbd.png`, `i07-password-typed.png` |
| iPad, landscape | Email focused: field at 112, "Log in" at 308 to 358, over the keyboard | `ipad/i06-email-focused.png` |
| iPad, landscape | A drag down with the keyboard open: the page moves, the keyboard stays | `ipad/i05-dragged-down.png` |
| iPad, portrait | Login with the password focused: unchanged | `ipad/i09-login-portrait-kbd.png` |

Two other screens that use the primitive, checked on the Android tablet: Profile -> Password in landscape (`a14-pw-land-kbd.png`) and portrait (`a15-pw-portrait.png`): the focused field and the pinned "Update password" show over the keyboard; the reject sheet's note in portrait (`a18-reject-note-portrait.png`, a bottom sheet) and landscape (`a19-reject-note-land.png`, a centred dialog): the note and "Reject order" over the keyboard (nothing was rejected). Not checked on the iPad (the primitive's default path did not change; its unit tests pass).

Signed out and in again on both tablets (the Android one twice, once in portrait to check the portrait login). The iPad's first email typing lost "co" again (the known tool glitch) and was fixed before the sign-in.

## 2. The small ones

| # | Verdict | Cause, fix, test | Seen |
|---|---|---|---|
| T3-C1 clocks one second apart | **fixed, seen on Android** | Two causes: the card rounded the seconds left (`Math.round`) and the panel floored them (`formatClock(ms / 1000)`), and the two read two different tickers (the list's shared interval and the panel's own `setInterval`, started apart). Now `secondsOf` (`PreviousOrders/orderTimes.ts`) is the one rounding (symmetric around 0), used by the card, the alert and the details (`OrderDetails/orderTimes.ts` `clockText`, `late`), and `OrderDetails/useNow` is the list's ticker. Tests: `OrderDetails/__tests__/orderTimes.test.ts` (card text equals "Ready in " + panel figure at every instant before and after the promised time; fails on the old code) | `tablet-android/a28-clock-strip.png` (four shots in a row: card 43:00 / 42:59 / 42:58 / 42:57 and panel the same), `a27-panel-4465.png` (43:26 and 43:26). The iPad's board panel was not looked at for this |
| T3-C2 "Picked up" wraps | **fixed, seen on iPad** | The decline cell of the pickup pair was `flexShrink: 0` (its label's width) and the advance cell `flex: 2` of what was left, so the shorter label got the narrower share of the Ready column. Now both cells are as wide as their label and the room left over goes 1:2 (`declineLong`, `advanceLong`), and both buttons have `fitText` (they shrink to 80% before they could wrap). The Reject / Accept 1:2 bar is unchanged. Not done for the grouped card (its pickup pair was not reported) | `ipad/i12-board.png`: #3567 "Not picked up" and "Picked up" each on one line |
| T3-C3 map not refit on rotation | **fixed, seen on iPad** | `GoogleMap` framed the markers on ready / driver moved only. The map's own layout size and the card's height are now part of the framing, so a rotation (or a resize) refits (`GoogleMap/index.tsx`). Test in `GoogleMap.test.tsx` (a size change refits once; the same size does not; fails on the old code) | `ipad/i14-map-landscape.png` (driver disc top, customer pin bottom), `i15-map-after-rotate-portrait.png` (rotated with the map open: both pins still framed, centred), `i16-map-back-landscape.png`. The map tiles are blank on the simulator and the emulator (no key), so the zoom level could not be judged |
| T3-C4 "Open · closes / 11:59 PM" | **fixed, seen on both** | The status text broke after "closes". `storeStatusText` now binds "closes" to its time and the meridiem to its digits with no-break spaces (`BusinessController/index.tsx`), so a narrow card breaks only after the dot: "Open ·" then "closes 11:59 PM" (never inside the time). Tests in `BusinessController.test.tsx` (the only breakable space is the one after the dot). The same treatment for "opens" and "until" times | `tablet-android/a30-stores.png`, `ipad/i18-stores.png`: "Open ·" / "closes 11:59 PM" in each card |
| T3-C5 flat list with a filter on the landscape board | **not changed (a question for the owner)** | Seen again: `tablet-android/a32-filtered.png` shows the filtered list as one column with no tabs | |
| ANDROID2-B3 late clock drawn green (from the coordinator) | **fixed, seen on Android** | `clockToneOf(section, timeStatus, late)`: past the promised time the tone is danger whatever the API's `time_status` says; the card passes `left < 0`. The details' prep figure was already `danger_text` when late. Tests in `PreviousOrders/__tests__/orderTimes.test.ts` (`clockToneOf` and `orderClock`) | `tablet-android/a26-board.png`, `a27-panel-4465.png`: #4466 "Late 13:07" in red (before this change it was "Late 11:28" green in `a23-relaunch.png`); #4465 "Ready in" stays green |

## The hooks errors of pass 3

Read `PreviousOrders/index.tsx` (`OrderRowView`: no hook at all; it returns `GroupedOrderCard` or `OrderCard`, two components), `PreviousOrders/OrderCard.tsx` (every hook, up to `clockStyles`, is before the first `return`) and `OrderDetails/OrderDetailsPage.tsx` (`OrderDetailsUI`: every hook before the single `return` at line 414, no early return; `OrderDetailsPage`: three hooks and one return). `PrepTimeCard` and `StatusRow` also call their hooks before any condition. **No hook is called conditionally or after an early return.** The errors came from Fast Refresh: this round, adding a `useRef` to `useRevealFocused` made the running app throw "Rendered more hooks than during the previous render" until it was relaunched, the same kind of message. After a fresh launch (`force-stop` and start), on the Android tablet: a search for "Demo" (the filtered landscape list), Accept on #4196 (20 min), the card changed at once ("Accepted by business", "Ready in 19:57", "Mark ready"), then its panel opened (`a34-after-accept-filtered.png`, `a35-panel-filtered.png`): **no error showed**, neither on the card nor in the panel.

## What I changed in the local data and on the devices

- Orders accepted from the Android tablet: **#4465** (45 min) from the New column and **#4196** (20 min) from the filtered list. Not marked ready. A reject sheet (#4467) was opened for the keyboard check and closed without sending (nothing rejected). A chat was not opened.
- Signed out and in again on both tablets (3 more sessions of the test account); the iPad's "Save Password?" answered "Not Now"; the Android notification explainer answered "Not now".
- Between two checks a blind chain of taps (my mistake, with the keyboard-dismiss and dialog state not yet known) landed on the Android landscape board: the order counts did not change afterwards (New 54+ before and after; the Preparing and Ready lists were the same), and the coordinator reported separate stray taps from another session between 22:25 and 22:46, so I cannot say which changes on that board, if any, were mine.
- Android tablet left in **landscape** (`user_rotation 0`, `accelerometer_rotation 0`), on the Orders board with the panel of #4196 open, logged in. iPad left in **portrait** on the Orders tab, logged in. Metro 8097 untouched.

## What I did not see

- The "cannot fit" case of the login (the field and the button not both over the keyboard) on a device: neither tablet is in it; only the unit test shows the field-first rule and the hand scroll with the keyboard up.
- The iPad's card against the panel clock (T3-C1 was seen on Android only), the grouped card's pickup bar, the map's zoom (blank tiles), the reject sheet and Profile -> Password on the iPad, and the login on a phone.
- A hardware keyboard (the iPad simulator showed the software keyboard; a hardware one leaves no strip to fit).

## Checks

`npx tsc --noEmit` 0 errors; `npx jest --silent` 218 suites, 2451 tests passing; `pnpm theme:guard` 0 literals; `pnpm theme:keys` ok (19 keys read through a variable, every key has a reader); `pnpm lint:check` 0 errors (76 legacy warnings); `pnpm i18n:verify` and `pnpm i18n:check-generated` ok; `git status --short -- src/printing` nothing.
