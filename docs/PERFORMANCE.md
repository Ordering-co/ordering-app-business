# Performance

A review of the rebuilt app (2026-11-19) for the points the theming method names: styles memoized on the theme, virtualized
lists, memoized cells with stable props, components declared inside render, work on scroll events, timers, the theme set again
when it is equal, and images sized to their box. It follows the structure of the driver app's `docs/PERFORMANCE.md`.

**The review (the sections "Reviewed, and right" and "Findings") is a reading of the code**: a read-only pass over `src/`, with
`file:line` taken from the checkout on branch `feature/theming-native` on 2026-11-19 before any device pass; no profiler, no network
log. Where a finding says "costs", it means "does work proportional to ...", not a number of milliseconds. Its `file:line`
references are the ones of that reading and have moved. **Afterwards the app was measured** on simulators and emulators, Debug and
Release: the section "Measured" holds the numbers and the sources; each finding below carries its state (closed with the commit that
closed it, or open), checked on 2026-11-19 by reading the working tree, not by a new profile. Nothing was measured on a physical
device. Every number says whether it is **Debug** (the JavaScript served by Metro, React in development mode, far slower than the
shipped app, and measured on a host that other agents were loading) or **Release** (Hermes bytecode in the app); a Debug number on a
loaded host is not a claim about the shipped app. The Release numbers are from the first builds, made at `da4aebd`, **before** fix
rounds 2 to 6 ([theme/verification.md](theme/verification.md) section 5): they do not describe the code of the last commit. The final
Release builds (2026-11-20, code of `e70aa4a`) were measured on the Android phone emulator and the iPhone simulator, on a host other
sessions were loading: their numbers are in "Final Release builds" below and, in full, in [deps/release-builds.md](deps/release-builds.md), first section. "Still to
measure" at the end says what is left.

## Reviewed, and right

- **The theme object is stable.** `buildAppTheme` builds one core per envelope behind a `WeakMap` (`src/theme/engine.ts:166-178`)
  and `AppThemeProvider` memoizes the theme on `[envelope, platform, reduceMotion]` (`src/theme/AppThemeContext.tsx:46`). A served
  theme equal to the cached one keeps the current object and is not written again (`:80`). Rotation does not rebuild it:
  `usePlatform()` returns the string `phone` or `tablet`, and only a change of that string changes the theme
  (`src/theme/platform.ts`); `useLayout()` recomputes on a window change for what reads it.
- **Styles are built once per theme.** 60 components build their style objects inside `useMemo(() => xStyles(theme), [theme])`;
  the 21 styled-component definitions left (from 512) sit in 8 files and none is in a list row. There is no module-level themed
  `StyleSheet`: the few `StyleSheet.create` at module scope (`Home/index.tsx:18`, `Tabs.tsx:136`, `StableText.tsx:19`,
  `KeyboardScreen.tsx:49`, `HoldToConfirm.tsx:46`) hold layout only.
- **Lists that are lists are virtualized, with keys:** the menu (`BusinessProductList/index.tsx:406`), the stores
  (`StoresList/index.tsx:225`), the messages (`PreviousMessages/index.tsx:109`), the chat (`ChatThread.tsx:280`, inverted) and
  the select sheets (`shared/OSelect.tsx:169`) are `FlatList`s with `keyExtractor`. The chat's row, the conversation row and
  the menu row are `React.memo`.
- **The orders cards are memoized on what they draw.** `OrderCard` and `GroupedOrderCard` use `areListedOrderRowPropsEqual`
  (a field list, not the whole payload), and `PreviousOrders` hands them handlers that are stable through a "latest props" ref
  (`PreviousOrders/index.tsx:41-51`), so a card that did not change never calls the controller with an old render's state.
- **One shared ticker for the cards' clocks** (`PreviousOrders/useNow.ts`): one `setInterval` while any card is subscribed, none
  when no card counts (`useNow(false)` reads the time once). No timer per card.
- **No component is declared inside a render** (a search for nested component declarations in `src/ui`, `src/pages`,
  `src/navigators` finds only `withShellProps`, which is wrapped once per screen behind a `WeakMap` and is stable). The tab bar
  is declared once (`BottomNavigator.tsx:17`).
- **No work on scroll events** except the chat's: one `setState` of a boolean, throttled to 100 ms
  (`ChatThread.tsx:257-259, 289-290`); React bails out when the value is the same. No `Dimensions.get`; no `useWindowDimensions`
  in a row.
- **The offline copy of the orders is written after the lists have been still for 1.5 s** (`useOrdersCache.ts:12, 33-35`), not on
  every socket event.
- **The orders lists derive with `useMemo`** (`useOrdersSplit.ts:114-176`): flatten, split, group and sort run when the slot's
  orders change.
- **Bundled assets are small:** 44 KB of images (the wordmark and the store placeholder), 40 font files (2.3 MB), two sounds.
  A served picture is asked near the size it paints (`OAvatar.tsx:93`, `utils/imageUrl.ts`).

## Findings, by expected effect

Ordered by how much work they put on the JavaScript thread in the screens a store keeps open all day. Each fix is a change to
`src/`, which this review did not make.

### 1. Every counting card re-renders completely once a second

**State: closed, `75f780c`.** `PreviousOrders/OrderClock.tsx` is the only part of a card that subscribes to the ticker (`useNow(true)`); the card renders on a data change and the clock alone once a second. Effect on the device: "Measured", idle CPU.

`PreviousOrders/useNow.ts:15-19` notifies every subscribed card each second, and `OrderCard.tsx:81` (`useNow(counting)`) and
`:89` (the `clock` memo, which depends on `now`) make the **whole card** re-render, not only its clock text: `customerText`,
`itemsText`, `orderTotal`, `paymentText`, `driverText`, `reasonText`, `statuses.find(...)` (`:77`, then the lookup), the `labels`
record (`:145`), three `themePart` reads, the `look` memo and the JSX of the card and its buttons are all redone. Every card of the
New, Preparing and Ready sections counts (`COUNTS`, `OrderCard.tsx:52`), and the tablet board keeps its three columns of
them on screen all day (`OrdersBoard/index.tsx:91-98`). With 30 open orders that is about 30 full card renders every second,
forever, on a kitchen tablet.
**Fix:** keep the ticker, but subscribe only a small `OrderClock` leaf (the text and its color), and give the card the `clock`
state class (warning / danger) as a primitive from `time_status` it already has. The card then renders on a data change only.

### 2. The orders lists are a `ScrollView` with `map`, not a virtualized list

**State: closed, `75f780c`.** The phone list, each board column, the board's History and its search results are one `OrderRowsList`, a `FlatList` (`PreviousOrders/index.tsx`). Seen: with hundreds of orders the lists page on scroll (New from "22+" to "99+") and taps answer at once (iPhone and iPad passes 2).

`OrdersOption/index.tsx:196` is a `ScrollView` whose content is `split.sections.map(...)` (`:141`) and, for History,
`split.history.map(...)` (`:111`); `PreviousOrders/index.tsx:58` maps the rows. The board's columns are the same: one
`ScrollView` per column (`OrdersBoard/BoardColumn.tsx:37`), another for search results (`OrdersBoard/index.tsx:107`) and for
History (`BoardHistory.tsx:36`). Every loaded order is mounted at once: 50 per page, growing with "Load more", plus the
cached 100 open and 30 completed orders when offline. The memoized cards make a re-render cheap, but the **mount** (first paint,
tab switch back to a tab that unmounted, pull to refresh that replaces the lists) pays for all of them, and every mounted card
subscribes to the ticker (finding 1) and to `events` (finding 7).
**Fix:** a `SectionList` (or one `FlatList` with section headers as items) for the phone list, a `FlatList` per board column,
`keyExtractor={(row) => row.key}`, the same `RefreshControl`, `getItemType` not needed. The row component stays.

### 3. The chat rebuilds every message on every update, so its memoized row never holds

**State: closed, `75f780c`.** `Chat/index.tsx` keeps the formatted message per raw message (a `Map` by message) and hands the thread the same objects for the rest; it pushes instead of spreading. Not measured (no chat of 100 messages).

`Chat/index.tsx:238-306`: an effect that depends on `messages?.messages` rebuilds **every** message into a new object
(`newMessage = { ..., sentTo: recipientsOf(canSee), user: { _id } }` at `:268-281`, so `sentTo` and `user` are new references
too), appends with `newMessages = [...newMessages, newMessage]` (`:293`, quadratic in the number of messages) and parses
three dates per message (`written(...)` twice, `parseDate(...)` once). `ThreadRow` is `React.memo` (`ChatThread.tsx:180`) but its
`item` prop is a new object each time, so one new message re-renders every mounted bubble (the visible window of the inverted
`FlatList`, plus its buffer). Typing in the field does not re-run this effect (right).
**Fix:** cache the formatted message per raw message (a `WeakMap` or a `Map` by `message.id` and `created_at`), `push` instead of
spreading, and compare `item` by `_id` + `text` + `image` in a custom memo comparator.

### 4. The menu's rows are memoized and never hold

**State: closed for the rows, `75f780c`** (`MenuRow` takes the product and three functions that are the same every render). **Open, small:** `BusinessProductList` still reads `useNow()` (the minute ticker of `StoresList/useNow.ts`), so the screen re-renders once a minute; the rows skip it.

`BusinessProductList/index.tsx:281-309`: `renderRow` builds, for each row and each render, `availabilityOf(product, now)` (a new
object, `:291`), `reasonText(...)`, and **three new arrow functions** (`onOpen`, `onToggle`, `onReason`, `:304-306`) for
`MenuRow`, which is `memo` (`MenuRow.tsx:36`) with the default shallow comparison. So no row ever skips a render. And
`const now = useNow()` (`:103`, the minute ticker of `StoresList/useNow.ts`) re-renders the whole screen, therefore every row,
every minute; with the menu's search across categories (pages of 15 to 50, no limit on how many load) that grows with scrolling.
**Fix:** `onOpen`, `onToggle`, `onReason` take the product (`useCallback` once, `onOpen(product)`), pass `availability.kind` and the
two texts as primitives (or compare `availability.kind` and `until` in a comparator), keep `now` out of the rows that do not
depend on it (it only matters for products with a `snooze_until`).

### 5. The orders comparator stringifies on every compare

**State: closed, `75f780c`.** `areListedOrderRowPropsEqual` compares the two reported moments the card reads (`REPORTED_STATUSES`), no `JSON.stringify`.

`PreviousOrders/areListedOrderRowPropsEqual.ts:46`: when `reporting_data` is a different reference, it runs
`JSON.stringify` on both sides. The controller rebuilds the order objects on a socket update, so for every card of the list the
comparator serializes two objects (the order's `reporting_data` can hold every status change), on each render of the list.
**Fix:** compare the two entries the card reads (`reporting_data.at['status:7']`, `['status:4']`), as it does with the other
fields.

### 6. The stores list renders every card each minute and builds its header each render

**State: open.** `StoresList/index.tsx` still passes `useNow()` to every card, `renderItem` is still inline and `BusinessController` is not memoized. Light with a handful of stores.

`StoresList/index.tsx:80` (`useNow()`, a new `Date` every minute) is passed to every card (`:241`); `BusinessController` is not
memoized (`BusinessController/index.tsx:84`), so every store card re-renders each minute and on every list state change
(`renderItem` is an inline function, `:237-246`; the header is a fragment element rebuilt each render, `:236`). Light with a
handful of stores; it grows with the number of stores of a chain.
**Fix:** memoize the card on the business fields it draws and on a `now` rounded to the minute (a number), `useCallback` the
`renderItem`.

### 7. Each order card does list-wide work per instance

**State: open.** `OrderCard.tsx` still builds the status list in a `useMemo` per card and each card still adds its own `offline_order_updated` listener.

`OrderCard.tsx:77` builds the 27-entry status list (`orderStatusList(t)`, `OrdersOption/orderStatuses.ts:16`) once per mounted
card, and `:93-98` (the subscription is at `:95`) adds an `events.on('offline_order_updated')` listener per card (N listeners; each handler does a `setState`
with the same array for every card); `useStatusStep`, `useOrderActions` and `useConfirm` are called by each card (`:71-72, 100`).
**Fix:** a module cache of the status texts keyed by the translation function, and one context value for the "synced ids" fed by
a single listener.

### 8. `OText` allocates on every render and is not memoized

**State: open.** `shared/OText.tsx` has no per-theme set and no `React.memo`.

`shared/OText.tsx:54-57`: a `StyleSheet.flatten`, a destructuring copy, and `Object.values(theme.native.fonts[role].files)` plus
`.includes(...)` for the font check, per text, per render. It is the most rendered component (a card has six to ten). The driver
app has the same finding (its list item 2).
**Fix:** a per-theme `Set` of the themed font files (a `WeakMap` keyed by `theme`), and `React.memo` with a style-by-reference
comparison.

### 9. `OAvatar` builds a stylesheet per instance

**State: open.** `shared/OAvatar.tsx` still builds a `StyleSheet.create` in a `useMemo` per avatar.

`shared/OAvatar.tsx:73`: a `StyleSheet.create` in a `useMemo` per avatar, so one per message row, conversation row and product
row, rebuilt when the size or the theme changes. **Fix:** a cache by theme, size and muted state.

### 10. The conversation list does per-row work in `renderItem`

**State: open.** `PreviousMessages/index.tsx` still has the inline `renderOrder` and builds `roleLabels` per render; `75f780c` touched the file for another reason (7 lines).

`PreviousMessages/index.tsx:74-96`: an inline `renderOrder` that, per row, computes `lastIncomingRole`, the title, `timeOf(order)`
(two `parseDate` and a `dayjs()` of the day, `:61-67`), the status text and the meta string; `roleLabels` is rebuilt each render
(`:69`). `ConversationRow` is `memo` (`ConversationRow.tsx:41`) but compares `order` by reference and creates `onPress` and the
press style per render (`:53-54`); with `extraData={selectedOrderId}` the list re-renders on a selection. Also
`MessagesOption/index.tsx:159-162`: the `rows` memo omits `t` from its dependencies (a language change keeps the old search
texts: a correctness slip more than a performance one).
**Fix:** compute the row's strings in a memo keyed on `order.id` and `last_direct_message_at`, `React.memo` with a comparator on
the fields that are drawn, `useCallback` the `renderItem`.

### 11. The offline copy serializes full orders

**State: open.** `OrdersOption/useOrdersCache.ts` still writes `orders.slice(0, 100)` whole, 1.5 s after the lists settle. The size and the time of the write were not measured.

`useOrdersCache.ts:33`: after 1.5 s without a change it hands `active.orders.slice(0, 100)` to AsyncStorage, which serializes up to
100 whole orders (products, history, payments) on the JavaScript thread, for every settled change on a busy kitchen.
**Fix:** write the projection the card needs (the fields `areListedOrderRowPropsEqual` compares plus the texts), or write on
backgrounding and on connectivity loss only. To confirm by measuring the size of the payload first.

### 12. Reduce motion is read after the first frame

**State: open.** `theme/AppThemeContext.tsx` still reads `isReduceMotionEnabled()` asynchronously.

`AppThemeContext.tsx:29-37` reads `AccessibilityInfo.isReduceMotionEnabled()` asynchronously, so a user with it on gets a
second theme object (one full re-render) right after launch. **Fix:** read it with the cached theme in `BusinessApp`'s
`Promise.all` (`BusinessApp.tsx:51`), before the first frame.

### 13. Chat photos are downloaded at their upload size

**State: open.** `ChatThread.tsx` does not use `imageUrl`; whether the image server resizes message pictures was not checked.

`ChatThread.tsx:184` paints `item.image` (the message's picture) at the bubble's box (`thumb` wide, `:140-143`) with its own URL;
the composer's preview (`Chat/index.tsx:474`) and the viewer (`ImageViewer.tsx:128`) do the same. `OAvatar` asks the image server
for twice its box (`imageUrl`), the chat does not. **Fix:** `imageUrl(uri, { width })` for the bubble, the original in the viewer.
Not seen: whether the image server resizes message pictures (the avatar path was checked for logos only).

### 14. Small things

**State, item by item:** the `console.log('HDBG …')` of `HoldToConfirm` is gone (`f3e31ef`; `9b8870b` kept its cleanup effect) and the stray `Chat/quickMessages.ts-E` is deleted (`f3e31ef`): **closed**. **Open:** `HoldToConfirm` is still exported with no caller outside `shared/` and still animates with `useNativeDriver: false`; the three clocks (`OrderDetails/useNow.ts` has its own interval beside the cards' ticker and the stores' minute ticker); `BottomNavigator`'s `screenOptions` is still a new object per render; the cost of registering every font at launch on iOS was not measured.

- `shared/HoldToConfirm.tsx:136, 148, 170, 180, 200` still print `console.log('HDBG …')` on every press and mount, and no screen uses
  `hold` today (`OButton hold` has no caller outside `shared/`). Remove the logs; remove the primitive if the decisions keep
  accept as one direct tap and the dangerous steps as confirmations. When it is used, its fill animates `width` with the
  JavaScript driver (`useNativeDriver: false`, `:154`), which stutters when the thread is busy with the cards' clocks.
- Three clocks: the cards' shared ticker (1 s), `OrderDetails/useNow.ts` (an interval of its own in `StageCards.tsx:43` and
  `StatusRow.tsx:34`, so the tablet's detail panel adds two beside the selected card's own), and `StoresList/useNow.ts` (60 s).
  One ticker with a rate per subscriber would be enough.
- `BottomNavigator.tsx:38`: `screenOptions` is a new object on each render of the navigator (renders on a layout or theme change
  only).
- `Chat/quickMessages.ts-E` is a stray backup file, committed in `7a1b7cb`: delete it.
- iOS registers every font of `UIAppFonts` at launch (40 catalog fonts and 13 icon fonts, `docs/deps/ios-native.md`): the cost is
  small and was not measured; only the default family is needed to paint the first frame.

### 15. The Sessions screen renders every session at once

**State: closed, `3d5d40e`** (fix round 5, [fix-round5.md](theme/verification/fix-round5.md) section 1; found by fix round 4,
[fix-round4-android.md](theme/verification/fix-round4-android.md) section 2, not by the reading of 2026-11-19). `Sessions/index.tsx`
drew one native row per session of the account inside a `ScrollView` (the API lists sessions, not devices, and the test account has
100+): 150 sessions mounted 150 list rows, each with its button, in one render. Writing each row's dates once per change of the list
(`3ef2166`) only took the JavaScript thread's busy time from 34.0 s to 29.2 s of a 45 s **Debug** profile. The screen is now one
`FlatList` (`initialNumToRender` 10, `maxToRenderPerBatch` 10, `windowSize` 7, the values the orders list uses), "This device" and the
"Other devices" title as its header, the rows' strings still written once per change of the list. Before and after, measured:
"Measured", "Round 5: Sessions". **Not measured in a Release build** (see "Still to measure").

## Measured

Every number is from a report; none is from a physical device. Debug builds run the JavaScript from Metro and are far slower than
a Release build, so the two are never mixed in one cell. "Before" is the first device pass (2026-11-19, from 18:50);
"after" is the second pass (the iPhone's began at 21:53), once `75f780c` (virtualized lists, one clock per visible card, the list updated
by the app's own actions) and the later fix commits were in. The sections "Rounds 3 and 4" and "Round 5: Sessions" below hold what the
last three rounds measured on the Android phone (and, for Sessions, on the iPhone).

### Idle CPU at rest, before and after

| Device | Before | After (Debug) | After (Release) |
|---|---|---|---|
| iPhone 17 Pro simulator | `decisions.md` says 36 %; the first iOS report ([ios.md](theme/verification/ios.md)) has no CPU number, so that figure has no source here | 2.2 to 2.7 % of a core (`top`, three samples, [ios-pass2.md](theme/verification/ios-pass2.md)) | 2.3, 2.0 and 2.1 % (cumulative CPU time of the process in windows of 6, 6 and 20 s, [release-builds.md](deps/release-builds.md)) |
| iPad Pro 11-inch simulator | not measured | portrait list of 21 orders 3.1 % over 30 s; 4.8 % over 20 s after paging to 99+; the landscape board 5.7 % at launch and 8.9 % over 15 s right after scrolling three columns, **with the host at a load of 21 to 39** ([ipad-pass2.md](theme/verification/ipad-pass2.md)) | not built |
| Android phone emulator `OBizTest` | JS thread (`mqt_v_js`) at 90 to 100 %, 97 % janky frames, a tab switch took 1 to 1.5 minutes, opening an order 4 ([android.md](theme/verification/android.md) A1); the same with a minified bundle `top -H` at rest: UI thread 3.2 to 3.5 %, `mqt_v_js` 3.4 % (two samples, 21:55 and 22:00, **host at a load of 20 to 60**, [android-pass2.md](theme/verification/android-pass2.md) A1); a tap on Accept opened its sheet within a few seconds. The cold start is another matter: see "Rounds 3 and 4" | not built |
| Android tablet emulator `OBizTablet` | JS thread at 60 to 100 % of a core from the first minute, 41 CPU-minutes after 90, 90 % janky frames out of 2 475, taps answered 15 s to 6 min late, resident memory 0.8 to 1.6 GB ([tablet-android.md](theme/verification/tablet-android.md) TAB-A1) | `mqt_v_js` at 0 % at rest in `top -H`, every tap answered at once ([tablet-android-pass2.md](theme/verification/tablet-android-pass2.md)) | 0.9, 2.3 and 1.6 % of one core in three windows of 10 s; single `top -H` samples showed 0 % twice and once 52 % with the network threads (a refresh or a socket reconnect burst) |

`decisions.md` records "about 1 % on the iPhone simulator and near 0 % on the Android tablet"; this page follows the reports, which
say 2.2 to 2.7 % on the iPhone simulator. The iPad's 5.7 and 8.9 % are partly the loaded host; the passes say so.

### The Release builds

**Release**, built at `da4aebd` (before fix rounds 2 to 4). From [release-builds.md](deps/release-builds.md): the Android Release build on `OBizTablet` (software-emulated GPU, 2560 x 1600 at
320 dpi, load average 6.8) and the iOS Release build on a new iPhone 17 Pro simulator (load average 25 to 30 during its build).

- **Start, Android:** `am start -W` TotalTime to the first frame (the bootsplash) 496, 325, 290, 558, 283, 290, 260 and 456 ms; the login painted at most 1.7 to 1.9 s in three runs, the board with a saved session at most 1.7 to 1.9 s in seven runs (upper bounds: one screenshot takes 0.2 s and the first of a run 1.7 s); from the Enter key of the sign-in to the board, under 1.5 s.
- **Start, iOS:** the bootsplash is up when `simctl launch` returns (0.2 s); the login painted 3.3 to 4.0 s after the launch call (three runs; 6 to 7 s on the very first launch after install); the orders list with a session 2.3 to 3.8 s (two runs). Measured with a screenshot loop of about 0.5 s a frame.
- **JS thread at rest, Android:** see the table.
- **Janky frames, Android:** after 12 s of swipes on the New column (16 swipes), `dumpsys gfxinfo` counted 262 frames, **117 janky (44.66 %)**; p50 42 ms, p90 57, p95 61, p99 77; GPU p50 22 ms. **The emulator's GPU is emulated at 2560 x 1600, so the frame time is dominated by drawing, not by the JavaScript thread (0 to 2 % at rest). Read it as an upper bound for a real tablet, not as its measure.** The Debug figure for the same emulator was 90 % ([tablet-android.md](theme/verification/tablet-android.md)).
- **Memory, Android:** total PSS 193 MB right after a start and sign-in, 247 MB after the scrolling; RSS 344 to 399 MB; native heap 88 MB, Java heap 25 to 32 MB. **iOS:** physical footprint 178.1 MB (peak 183.1 MB); the resident size of 425 to 513 MB counts the simulator's shared frameworks.
- **Size:** APK 172.5 MB (four ABIs) and AAB 91.5 MB, Hermes bundle 6.9 MB; iOS app 152 MB, Hermes bundle 8.5 MB. The earlier native step had 192.9 MB, 183 MB and 9.7 MB, before the JavaScript clean-up.
- **Logs:** no `FATAL EXCEPTION`, no ANR, no process death and no `ReactNativeJS` error on Android; no crash, no exception and no crash report on iOS.

### Rounds 3 and 4: the Android phone (all **Debug**, on a loaded host)

From [fix-round4-android.md](theme/verification/fix-round4-android.md) (2026-11-19, 23:35, to 2026-11-20, 00:41): emulator `OBizTest`
(1080 x 2400, Android 17), a **Debug** build from Metro, the host at a load average of 19 with another phone emulator at 340 % CPU
for hours. Every action took 5 to 30 s to show on the device. **None of these numbers is a Release number, and none says how long
the shipped app takes**: the Release figure for a start is the older one of the section above (a board painted within 2 s on the
tablet, the JS thread at 1 to 2 %), and it was not re-measured at this commit. The third look at the tablets and fix round 4's
tablet work measured no CPU.

**Cold start (Debug), measured with `top -H` per thread and a frame dump every 5 to 10 s after `force-stop` and a launch:**

| Since the launch | What |
|---|---|
| +0 to +70 s | the process starts and Metro serves the bundle; the JS thread `mqt_v_js` does not exist yet (the main thread and the Firebase, OneSignal and JIT threads are busy) |
| +77 to +121 s | `mqt_v_js` at 65 to 97 % for about 40 s: running the bundle and the first render |
| +114 s | the Orders list is drawn (tabs, four cards, tab bar); **a tap on Stores sent at that moment was answered 7 s later** (the tool's polling interval), so no tap was dropped |
| +125 to +175 s | `mqt_v_js` falls from 75 % to 10 to 30 % |

**The Hermes sampling profile of a second cold start (Debug)**, started over the Chrome DevTools protocol (`Profiler.start`), 100 s
from +35 s: **the JS thread was in a call 25 s of the 100.** Nine of those seconds were in the first 10 s (executing the bundle, the
longest unbroken stretch 4.1 s at +44 s); then a steady 16 to 26 % until the end. By function the time is **React's development
mode**: `runWithFiberInDEV` and `flushSyncWorkAcrossRoots` (12 s of the steady part), `[Host Function] createTask` (5.4 s: React's
dev-only async stack tracing), `logComponentRender`, `reportMeasure` and `PerformanceMeasure` (1.7 s, dev profiling). The app's own
components are small: `OText` 1.3 s, `Icon` 1.1 s (inclusive), `OrderCardBase` 0.15 s, `OrdersOptionUI` 0.06 s. **No single piece of
the launch holds the thread for seconds:** no synchronous parse of a large cache (the offline copy is written online only, after
1.5 s of stillness, and read only when offline), no group fetched twice, no re-render storm beyond the one-second shared ticker, and
no overlay that eats taps (the global overlays draw nothing while they have nothing to say). The report's conclusion for ANDROID2-B2
(taps dropped for the first minute or two after a launch): the Debug bundle on a loaded host, not something a Release build shows;
that last part is not measured.

**Opening the Sessions screen (Debug), a 45 s Hermes profile:** the account has 100+ sessions (every sign-in adds one and nothing
deletes them; a real account has a few). The screen wrote the dates of each row on every render (two `dateTime` calls twice per
row). `3ef2166` writes the rows of the other devices once per change of the list: **JS busy 34.0 s before, 29.2 s after, of 45 s**;
`Intl.DateTimeFormat` construction (1.9 s of self time before) is gone from the top of the profile. What remains is React rendering
a hundred native rows at once in a development build (`createNode`, `completeRoot`, the dev-only `createTask`). While it runs the
Back key is answered 30 to 65 s late (ANDROID2-B1 of [theme/verification.md](theme/verification.md)). **The list is virtualized
since fix round 5** (finding 15, and the next section for the numbers after).

### Round 5: Sessions, before and after virtualizing (all **Debug**, on a loaded host)

From [fix-round5.md](theme/verification/fix-round5.md) (2026-11-20, emulator clock 00:44 to 01:15), the same method before and after, on
the Android phone `OBizTest` (Android 17, a **Debug** build from Metro, a host at a load average of 16 to 17) with the account's 100+
sessions. The method (a script of the round, not in the repository): a tap on "Sessions", a dump of the screen polled until the
current device or a session row is on it (the polling itself costs a few seconds a poll and slows both runs the same way), the CPU
time of the `mqt_v_js` thread read from `/proc` every 0.5 s, and the Back key pressed 2 s after the tap and polled until Profile is
on screen.

| | Before | After |
|---|---|---|
| Tap to the list drawn (wall time) | 102.6 s (a first run: 78.9 s) | 13.0 s and 11.7 s |
| JS thread CPU during the opening | 36.4 s over 105 s (about 4 s per 5 s window for the first 35 s) | 8.5 s over 16 s, and 7.0 s over 14 s |
| Back pressed 2 s after the tap, until Profile shows | 49.3 s | 4.6 s |
| `session-card` rows in the accessibility tree | all (100+) | 11 at the top, 14 after scrolling to the end |

The rest of the 7 to 8 s of JS time after the fix is the request and the Debug build's own rendering (the screen shows its skeleton
first). Scrolling to the end of the 100+ list works and shows the oldest sessions. The report's own reading: **the ratio (about 8 times
on the opening, about 10 times on Back) is the finding, not the seconds**, which come from a loaded host and a development build.

**iPhone** (17 Pro simulator, **Debug**): fix round 5 saw the list drawn and working but did **not** measure its time or count its
rows. The iPhone's third pass ([ios-pass3.md](theme/verification/ios-pass3.md) check 3), on the same screen after the fix: the header
was there 0.2 s after the tap returned and the rows (142 nodes in the accessibility tree) at 0.9 s, unchanged after 1.2 s (`idb`
polling; the tap itself takes about 0.2 s); the app's CPU at rest on the list 2.5 to 2.6 % (three samples); a sweep of 40 swipes to
the end showed dates going down without a repeat, a gap or a jump. Back, pressed 0.2, 0.5, 0.8 and 1.2 s after the tap, went to
Profile every time (4 of 4, within 1.5 s); pressed with no pause at all it did nothing in 2 of 3 tries (the Back button is not drawn
until the push has started).

Fix round 6 changed the row (a Sessions-only `SessionRow`, 64 high, `cbb17d2`) and kept the list; the 150-session test (at most 15
rows mounted) still passes. No timing was taken after that change.

### With hundreds of orders

The local account has hundreds of pending orders. All of this is **Debug**. iPhone pass 2: the New counter went from "22+" to "99+" while scrolling and the
list ended at the oldest order; In progress paged from "52+" to "72"; taps answered at once. iPad pass 2: the landscape board's
columns loaded further pages when scrolled (59+ to 99+, 32+ to 44+, 9+ to 13+). Counts are lower bounds while pages remain
([theme/verification.md](theme/verification.md), C-6).

## Final Release builds (code of `e70aa4a`, 2026-11-20)

From [deps/release-builds.md](deps/release-builds.md), first section. Android phone emulator `emulator-5556` (API 37, emulated GPU), host at a load of 7 to 12 with
longer averages near 30; iPhone 17 Pro simulator `OBizRelease`, host at a load of 25 to 70. No physical device.

| What | Android phone, Release | The same in Debug | iPhone, Release |
|---|---|---|---|
| Cold start to the orders list | 5.7, 4.2, 6.7 s (the bootsplash stays until about 4.3 s) | 114 s | 5.2, 4.5, 3.2 s |
| Tap on Stores right after the list appears, five launches | none lost; Stores with its data 3.5 to 4.3 s after the tap | answered 7 s later, none lost | not measured |
| Sessions (100+ rows), tap to the list | at most 3.5 s | 11.7 to 13.0 s (102.6 s before the virtualized list) | in the first screenshot, 0.3 to 0.8 s |
| Back pressed 1.1 to 1.4 s after that tap, three times | Profile every time, within 2.8 to 3.1 s | 4.6 s (49.3 s before) | Profile every time |
| JavaScript thread at rest on Orders | 1.2, 1.0, 5.6 % of a core | 3.4 % | process 1.6 to 1.8 % |
| JavaScript thread while scrolling the list | 15.7 % | 90 to 100 % before the list fixes | not measured |
| Janky frames after 16 swipes (`dumpsys gfxinfo`) | 95.7 % and 97.9 % (p50 113 to 150 ms) | 97 % | not measured |
| Memory | RES 331 to 343 MB | 0.8 to 1.6 GB (tablet) | footprint 198.7 MB |

The janky-frame count is not a figure of the code: every frame is counted "slow issue draw commands" while the JavaScript thread is at
16 %, so the time is the emulated GPU's. The first Release round's 44.7 % came from another AVD (the tablet). **The frame rate on a
real phone is not known.** The cold start is slower than the first round's 1.7 to 1.9 s, measured on the tablet AVD with a quiet host:
the two are not the same device or the same load.

## Still to measure

Not done, and wanted on a **physical** phone, tablet and a Release build: commits per second and `OrderCard` commit time with 10, 30
and 50 open orders; first paint of the orders tab and of History with 50 and 100 loaded orders; a chat of 100 messages (receive,
send, type 20 characters); the menu with 150 loaded products; comparator time on a socket update (finding 5 is closed, not
measured); the `GET theme` requests of one launch (a network log); the size and the time of the offline copy's write (finding 11);
chat photos' bytes (finding 13); cold start with and without a cached theme, and with reduce motion on (finding 12); the Android
phone's cold start and the Sessions screen in a Release build **on a physical phone or a quiet host** (the emulator's Release figures
are in "Final Release builds"); the orders list's frame rate on a real phone (the emulator counted 96 to 98 % janky frames, its GPU's);
the
Sessions screen's times on an iPhone (only a list drawn about 1 s after the tap and an idle CPU were seen); every Release number at
the code of the final commit (the first Release builds are from `da4aebd`); a soak of hours (each run was minutes).
