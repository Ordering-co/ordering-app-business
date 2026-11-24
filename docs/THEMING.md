# Theming rules

How UI code in this app gets its look from the theme, and how a screen is designed for the people
who use it: design for the owner at the counter, stay inside the theme's tokens, reuse what
exists, and know when (and where) to add something new. Read this before touching any style
(styled components, `StyleSheet`, inline styles, style props), any primitive in
`src/ui/src/components/shared` or `product.schema.json`.

The schema format itself (nodes, types, aliases, `follows`, `derive`, `inherits`, editor
metadata) and its versioning rules are documented by the theme engine
(`@orderingco/ordering-theme-engine`, the version pinned in `package.json`), in
`node_modules/@orderingco/ordering-theme-engine/docs/` (`schema-format.md`,
`creating-a-schema.md`). This page is about how this app uses it. The decisions behind the
design are in `docs/theme/` (`decisions.md`, `tokens.md`, `components.md`,
`pages-and-visibility.md`, `editor-labels.md`, one report per area in `areas/`; the keys read
through a variable are recorded in `theme-readers.json`).

This app is the business app (`product_type: store_app`). It declares two platforms, `phone` and
`tablet` (section 4). The driver and marketplace apps follow the same rules; where a shared piece
is not written here, their code is the model.

## 1. Design rules of this app

**Who uses it.** The owner or the staff of a restaurant or a store, at a counter or in a kitchen,
during service: hands busy or wet, a phone in one hand or a tablet on a stand, glancing rather
than reading, with orders arriving while they do something else. They are not technical users.
Every rule below follows from that. A rule here is checked against the code and the owner's
decisions; a design that breaks one needs the owner's word.

### What comes first

- **Usability first.** When a nicer look and an easier use disagree, the use wins. A screen is
  judged by one question: can the owner do the next thing in one glance and one tap?
- **The theme rules every style.** Nothing visual is written in a component: color, space,
  radius, border, size, font, opacity, motion, image, and what is shown or hidden come from the
  theme (`product.schema.json` compiles to `src/theme.compiled.json`; the helpers and primitives
  read it, sections 2 and 5). A brand changes the look from the editor without a new build. A
  design that needs a value the theme does not have adds a key to the schema, with its editor
  label and its reader (section 8), never a literal. What a person may tune on their own device
  (the order card's quick actions and clock time, Profile, Orders display) is an app setting that
  wins over the theme's default in either direction; everything else is the theme's.
- **A decision stays decided.** `docs/theme/decisions.md` is the owner's log. A later round, a
  ported fix or an agent does not undo a row of it. When something collides with one, ask the
  owner, with the options and the recommended one first.

### The work of the app: orders

- **The step taken most is one tap; what cannot be undone asks.** The card's step buttons (Mark
  ready, Mark ready for pickup) act at once. Accept opens the sheet with the preparation time
  already chosen and one tap on "Accept · N min" sends it; nothing is asked on top of it (the
  sheet is the whole step, decision 2026-11-19). What cannot be undone is guarded: the reject
  sheet states why and ends in a red button (it is its own confirmation), "Customer not
  arrived", "Not picked up", log out, ending a session, removing a printer and removing the account
  ask first (`useConfirm()`, or a hold through `OButton hold`).
- **A new order is never missed.** The alert, its ring and its queue come before whatever is on
  screen: `NewOrderAlert` is mounted once, over every tab and screen (`GlobalOverlays`), and can
  ring until it is opened (Profile, Alerts and sound).
- **The connection is always visible, and says what to do.** The header's status (`Live`,
  `Reconnecting`, `Offline`) opens a sheet that says what the state means, offers "Reconnect now"
  and tells the owner to check Wi-Fi or mobile data when orders stop arriving.
- **Works with a poor network.** The lists paint the offline copy, an action the project allows
  offline is queued and replayed when the network returns, and only an explicit "no connection"
  queues (the first instant after launch sends). The first page of orders answers at once and the
  rest comes on scroll; the app never makes the owner wait for what they did not ask for.

### Reading at a glance

- **A state is written, never only colored.** An order's status is words: the card's band holds
  the status at its start and one sentence of time at its end ("Waiting 02:14", "Ready in
  03:40", "Late 04:10"); an at-risk or late order changes the band's color and its words. Paid and
  Unpaid, the order type and a store's state are words in a chip, or a glyph or dot beside the
  color. The three colors of the order types and the status colors are the theme's (`badge`
  variants); a color alone never carries a meaning.
- **Design with the real, longest texts.** Use the longest status ("Driver almost at the
  customer", "Accepted by business"), the longest order type ("Catering delivery"), a long store
  name and a large amount, in the longest locale (German, Greek) and at a large text size, not
  the mockup's short words. A status gets a line of its own and is never cut; a name or a
  number from the server ends in an ellipsis rather than push something off the screen
  (section 7, "Long text").
- **No number the app cannot keep true.** The app shows no count of orders (owner's decision
  2026-11-23: an exact count needed a request per stage and a re-read on every order event); the
  count of unread messages stays because the messages list gives it. Prefer no information to
  information that can be wrong.
- **What ticks or changes does not move the layout.** The card's band is the only part of a card
  that ticks. A timer, a status or a connection state that changes never makes its neighbours
  jump: the header's buttons stay at its end and the connection's pill grows towards the title, up
  to `components.header.base.status_max_width`; a state never moves or resizes its control
  (section 7, "Layout rules").

### Hands, thumbs and glances

- **Touch targets of at least 44 pt, and the main action within the thumb's reach.** The
  buttons of a card and of a bar are large (`OButton`: a card's are `md`, a bar's `lg`), and a
  sheet's action is pinned under its scroll (`SheetFooter`). A control smaller than 44 pt grows its
  touch area, not its look.
- **Only what can be tapped gives press feedback**, from the theme's pressed state
  (`opacity.pressed`, a state's look); everything else stays still.
- **The keyboard never hides what the owner is typing or the button that sends it** (section 7,
  "The keyboard").
- **Text follows the system's text size**, up to the limit of `OText` (`TEXT_SCALE_LIMIT`), and the
  layout holds at that size: a button wraps or shrinks to its line, a tab or a tile shrinks, a
  server's text ends in an ellipsis.
- **Motion answers a touch or a change and nothing else**: durations and easing are the theme's
  (`themeMotion`), and none when the theme or the system's reduce-motion setting turns it off.

### One app

- **One function, one component; the same thing looks the same everywhere.** Build with the
  primitives of `src/ui/src/components/shared` (section 6). Every select is a bottom sheet (a
  centred dialog on a landscape tablet), one empty state, one glyph per function, one writer of a
  time. No library that paints its own UI.
- **Phone and tablet are the same app.** A phone is portrait; a landscape tablet has the side
  rail, the orders board by columns with the order's details as a panel, and two panes in
  Messages, Stores and Printers; a portrait tablet is the phone layout in a centred column.
  Ask only `usePlatform()` and `useLayout()` (section 4).
- **Plain words.** Every text goes through `t('KEY', 'English fallback')`, short, with the
  action's verb on the button ("Accept", "Reject", "Mark ready"). An empty list says what is empty
  for that tab ("No new orders", "No orders in progress", "No past orders"), and a failed load
  offers "Retry" in the same place. Times and dates are written only by `useFormats`.

### Before you hand in a screen

1. Every value comes from the theme: `pnpm theme:guard` passes, no `theme.native` or
   `theme.values` read inline where a helper exists.
2. A new key has its reader, its test, its editor label and its entry in
   `docs/theme/editor-labels.md` (`pnpm theme:keys`, `pnpm theme:reads`).
3. Tried with the longest real texts (status, type, store name, amount) in German or Greek, and on
   a narrow phone (360 pt): nothing is cut that should be read whole, nothing is pushed off the
   screen.
4. Tried at a large text size.
5. Tried on a phone and on a tablet in both orientations (a test renders with
   `renderWithProviders(ui, { platform: 'tablet' })`; a device or a simulator shows the look).
6. The most frequent action is one tap and the dangerous one is guarded.
7. Nothing jumps when a timer, a status or the connection changes; a state never resizes its
   control.
8. Every tappable thing has its press feedback and a touch area of 44 pt; nothing else has either.
9. A state is in words, not only in a color.
10. No decision of `docs/theme/decisions.md` is undone; the page is updated if the change touches
    what it describes (section 12).

## 2. The theme decides

- Every visual value comes from the theme: colors, spacing, radii, borders, shadows, typography,
  icon and control sizes, opacity, motion, images and what is shown. Nothing is hard-coded: no
  hex, `rgb()` / `rgba()`, no number for a length, font size, line height, shadow or duration, no
  `fontFamily` or `fontWeight`, in a styled component, a `StyleSheet`, an inline style or a prop
  like `size={14}`.
- The theme always arrives complete and valid: `theme.values` is the served theme (or the cached
  one, or none) completed by the engine's runtime (`complete` of
  `@orderingco/ordering-theme-engine/runtime`, in `src/theme/engine.ts`) with
  `src/theme.compiled.json`, the schema compiled by `pnpm theme:compile` (its defaults with the
  rule of each value), checked by api-core's own rules:
  - every key of the schema is there; one the theme leaves out is the default;
  - a value the app does not understand is the default, never empty: another kind than the
    default's, an option the schema does not list, an invalid color (a hex, `rgb()` / `rgba()` or
    `transparent`; an alias such as `{color.primary}` is not one), or null where the default is
    not null (borders and shadows may be null: none);
  - a number is clamped to the editor's `min` / `max` of its node, else to the format's range;
  - a text style, a border and a shadow are checked field by field: an invalid or missing field is
    the default's;
  - a key the schema lacks is dropped; a page's `sections` keep the theme's order with only that
    page's sections; an image is an `http(s)` URL or `''` (none: the app then paints the binary's
    own image, or draws nothing, as `themeImage` says).

  Readers rely on it: do not re-check options or ranges, do not write fallbacks that repeat a
  default and do not use optional chains on the theme; only what the schema lets be null (a border,
  a shadow, an empty image) needs handling.
- The theme also arrives as React Native values: `theme.native` is its view (`toNative` of
  `@orderingco/ordering-theme-engine/native`, built once per theme), every value converted by its
  type in the schema (lengths in pt, a border as `borderWidth` / `borderStyle` / `borderColor`, a
  shadow as iOS `shadow*` and Android `elevation`, a text style as the font file of its weight with
  `lineHeight = size x line`, the tokens with Identity applied). Paint from the view through the
  helpers; read `theme.values` only to compute (comparisons, nulls, options, visibility).
- The theme is `{ values, native, meta }` and nothing else (section 10). Never build one by
  spreading values (`{ ...theme, values: ... }`): its view keeps the old values. Build it with
  `buildAppTheme(envelope, { platform })` (tests: `themeWithValues` in `jest/helpers`), and never
  change the result: its objects are shared.
- One provider, `AppThemeProvider` (`src/theme/AppThemeContext.tsx`, from
  `styled-components/native`), mounted once at the top of `src/BusinessApp.tsx`; everything that
  paints is inside it (the toast, the status bar and the dialogs included).
- Where the theme comes from:
  - the binary paints `complete(compiled, null)` (the defaults of the schema version it was built
    with) until a served theme arrives, and the cached one on later launches (`src/theme/remote.ts`:
    one cache per project and schema version, read before the first frame while the native splash
    is up);
  - the app asks for it itself (`GET <root>/theme?theme_version=2&product_type=store_app&theme_schema_version=<compiled version>`,
    `RemoteThemeLoader`, inside `OrderingProvider`); a served theme equal to the cached one is kept
    as it is;
  - the logic submodule's own request (version 1) is not read.
- What the theme sets is not overridden in the app. If something looks wrong with the defaults,
  fix the default in the schema, not the style.
- If no token or component property fits a spot, do not invent a value: say so (an exception, with
  its effect) and ask. A value off the scale is a design decision, not a coding one. An approved
  one goes in `theme-exceptions.json` with its reason.

## 3. Where values live

| Layer | What it is | Example |
|---|---|---|
| `tokens.<group>.<name>` | The shared vocabulary: literal values, same names in every product; numbers in pt | `color.surface`, `space.md`, `radius.lg`, `typography.h3` |
| Identity (`tokens.shadow_style`, `border_style`) | Theme-wide choices that move every property that `follows` them | one radius level for every box |
| `tokens.motion_style` | The theme's easing, and whether anything moves | `motion_style.enabled` |
| `components.<c>.base` | A component's properties; defaults alias tokens | `card.base.background = {color.surface}` |
| `variants` / `appearances` / `sizes` / `shapes` / `colors` | Axes of a component; states (`pressed`, `disabled`...) only in `variants` and `appearances` | `button` sizes |
| `slots` | Another component a component contains, with its axes | `order_card.slots.advance` is a button |
| `scope` | What changes in other components inside a group | the `input` and `field` of `auth_form` |
| `inherits` | A component that takes what the theme sets on its parent | `order_card` and `item_card` inherit `card`; `menu_row` and `conversation_row` inherit `list_row` |
| `visibility`, `images`, `pages` | What is shown, the theme's images, screen sections | `orders.board`, `logotype`, `pages.order_details` |
| `platforms.<p>` | `tablet`: other defaults for component properties, visibility keys and pages; never tokens | `sheet.presentation` |

The app has no `site` settings and does not read `modes`.

Token groups and levels (the engine's catalog; the schema sets the defaults):

| Group | Levels |
|---|---|
| `color` | brand (`primary` and `secondary`, each with `on_*`, `*_subtle`, `*_pressed`; `primary_text`), surfaces (`background`, `surface`, `surface_alt`, `overlay`, `on_overlay`, `inverse_surface`, `on_inverse`), text and lines (`text`, `text_muted`, `text_disabled`, `border`, `border_strong`), states (`success`, `warning`, `danger`, `info`, each with `on_*` and `*_subtle`, and `*_text` but for `info`), `disabled` |
| `font` | `heading`, `body`: the families of the two roles |
| `typography` | `h1` to `h4` (heading font); `body_lg`, `body`, `body_sm`, `label`, `caption`, `button`, `overline` (body font) |
| `space` | `none`, `xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `xxl`, `xxxl` |
| `radius` | `none`, `xs`, `sm`, `md`, `lg`, `xl`, `xxl`, `full` |
| `size` (control height) | `sm`, `md`, `lg`, `xl` |
| `icon` | `sm`, `md`, `lg` |
| `border` | `thin`, `thick` |
| `shadow` | `none`, `sm`, `md`, `lg`, `xl` |
| `opacity` | `disabled`, `pressed` |
| `motion` | `fast`, `base`, `slow` |
| `layout`, `focus_ring` | the page gutter (`layout.mode` is in the catalog and this app does not read it); the focus ring |

Their values are the schema's defaults (`src/theme.compiled.json`) and a theme can change them:
code refers to the level, never to its number.

The defaults draw the approved mockups: flat surfaces with a 1 pt line (Identity: shadow size
`none`, border width `thin`, radius `md`), Poppins, primary `#1E72E3`, buttons and fields with a
corner of 8, cards and badges 10, sheets and dialogs 15. A property that `follows` Identity takes
its level; one whose `options` leave Identity's level out keeps its own (buttons and inputs
`radius.sm`, dialogs and sheets `radius.lg`).

## 4. Platforms: phone and tablet

The schema's `platforms` are `phone` (the base) and `tablet`. A tablet's own values
(`platforms.tablet` in the served theme, `components.<c>.platforms.tablet.<prop>` in the schema)
change a component's `base` properties, visibility keys and pages, never tokens.

- **The theme is resolved for the platform once**, in `src/theme/engine.ts`: `buildAppTheme` lays
  the platform's values over the base ones in `values` and in `native`, and the helpers never ask
  which platform it is. `theme.meta.platform` says which one it is for.
- **Which platform** (`src/theme/platform.ts`): `usePlatform()` is `tablet` when the device is one
  (`DeviceInfo.isTablet()`, read once, never at import) or the window's shorter side reaches 600 dp
  (a foldable, an Android desktop window); rotation never changes it, the window does. The one
  `AppThemeProvider` calls it, so every reader sees the right theme. Do not read `Dimensions.get`
  or `DeviceInfo.isTablet()` anywhere else.
- **The layout** (`useLayout()`): `landscapeTablet` (the side rail, the board and the two panes),
  `rail` and `railWidth` (`bottom_nav.placement` and `rail_width`), `maxContentWidth` and
  `contentWidth` (`screen.max_width`), `sheetMaxWidth` and `sheetCentered` (`sheet`), `panes`
  (`screen.list_pane_width`, `screen.detail_pane_width`). A stack screen is a `ScreenContainer`
  (the column), two panes are a `PaneLayout`.
- A tablet in portrait is the phone layout in a centered column of `screen.max_width`; sheets are
  centered cards of `sheet.max_width` (`sheet.presentation`). Every `Modal` (`OModal`,
  `OBottomPopup`, `ConfirmDialogHost`, `LoadingOverlay` and the chat's `ImageViewer`) takes its
  orientations from `useModalOrientations` (`shared/modalOrientations.ts`: all five on a tablet,
  portrait on a phone), so a full page does not flip upside down on an iPad, and on Android every
  `Modal` covers the whole window (`statusBarTranslucent` and `navigationBarTranslucent`; the
  `SafeAreaProvider` inside each one pads by the insets, and a full-screen modal page pads its end
  by the window's bottom inset).
- A new value for the tablet goes in the component's `platforms.tablet` in the schema, with the
  same editor metadata as its base; never a second token and never an `if (tablet)` in a style.
- Tests: `renderWithProviders(ui, { platform: 'tablet' })`, `themeWithValues(mutate, { platform })`.

## 5. Reading the theme in code

Always through the helpers (`src/theme/helpers.ts`, `src/theme/sections.tsx`); never read
`product.schema.json` from app code, and never copy a default value into the code. The helpers
return React Native values (numbers in pt, style objects). A styled-components template needs CSS
text: `spaceCss`, `radiusCss`, `borderCss`, `shadowCss` and `textCss` are the twins of the object
helpers, and a component never writes a unit after an interpolation. A value with no twin
(a gutter, an icon or a control size, a component's own number) is written as an object style.

| Need | Object styles | Styled templates |
|---|---|---|
| A component's properties | `themePart(theme, 'button', 'sizes.md.height')` (its view); `themeValue(theme, 'tokens.layout.page_gutter')` for a completed value to compute with | none |
| Color | `themeColor` | `themeColor` |
| Spacing, page sides | `themeSpace`, `themeGutter` | `spaceCss` |
| Radius, shadow, border (Identity applied; `{ fixed: true }` for a state or a round shape) | `themeRadius`, `themeShadow`, `themeBorder`, `themeBorderWidth` | `radiusCss`, `shadowCss`, `borderCss` |
| Text (family by weight, `lineHeight = size x line`, no `fontWeight`); a role's file | `themeText(theme, 'body', { weight })`; `themeFontFamily(theme, role, weight)` | `textCss` |
| A component's text look (`toNative`'s) as a Text style; its shadow | `nativeTextStyle(look)`, `nativeShadowStyle(look.shadow)` | none |
| A component's box (background, border, shadow: the shadow only on an opaque background) | `nativeBoxStyle(look)`, `isOpaque(color)` | none |
| A control whose states have different borders: the widest border's room in every state | `reservedBorder(looks)` | none |
| Icon and control sizes | `themeIconSize`, `themeControlHeight` | none |
| Opacity (pressed, disabled) | `themeOpacity` | none |
| Motion (durations, easing; none when the theme or the system turns it off) | `themeMotion` | none |
| Shown or hidden; screen sections | `themeVisible(theme, 'orders.board')`; `usePageSections('order_details')` (`render`, `isVisible`, `indexOf`) | none |
| Images (`{ uri }`, the binary's own image from `bundledImages.ts`, or nothing) | `themeImage(theme, 'logotype')` | none |
| How titles align (`section_header.align`) | `themeTitleAlign(theme)` | none |
| A section's title (text, color, alignment, the space under it) | `<SectionTitle>` (`shared/SectionTitle`; a component with its own title look passes `text` / `color`) | none |
| The space under a bottom bar; the room a scroll leaves for it | `themeBottomSpace`, `barBottomSpace`, `bottomBarBox` (a bar that sets its own height), `bottomBarClearance` | none |
| A component as a group's `scope` sees it | `themeScoped(theme, 'auth_form', 'input')` | none |
| Loading placeholders in the skeleton color | `SkeletonBone` (`shared/SkeletonBone`) | none |
| The platform and the layout | `usePlatform()`, `useLayout()` | none |
| A time of day, a date, both (the project's format; a store's zone with `{ zone }`) | `useFormats()` (`src/hooks/useFormats.ts`: `time`, `date`, `dateTime`, `orderTime`) | none |
| A glyph for a function (search, message, driver, refresh) | `GLYPH` (`shared/glyphs.ts`) | none |
| A color that does not come from the theme (an API color) | `@orderingco/ordering-theme-engine/colors` (`onColor`, `legible`, `isLight`) | none |

If a helper is missing for a token group, add it next to its siblings in `src/theme/helpers.ts`
(with its template twin where the group has twins) rather than reading `theme.native` or
`theme.values` inline.

Object styles are built inside the component, memoized on the theme, never at module level and
never in the render body as a prop:

```tsx
const theme: any = useTheme()
const styles = useMemo(() => StyleSheet.create({
  box: { backgroundColor: themeColor(theme, 'surface'), padding: themeSpace(theme, 'md') },
  title: themeText(theme, 'label', { weight: 600 })
}), [theme])
```

A template reads the theme from its props:

```tsx
export const Form = styled.View`
  gap: ${({ theme }: any) => spaceCss(theme, 'md')};
`
```

Rules the helpers do not enforce:

- **A shadow needs an opaque box under it.** Never put a shadow on an image or on a view without a
  background (a transparent PNG shows it through as a grey box on Android; iOS logs "cannot
  calculate shadow efficiently"): carry it on a box with a background and put the picture inside.
- **An icon inside a button takes the button's size and ink** when it does not set its own
  (`<OButton icon={<Icon name='...' />} />`): pass `<Icon name=... />` without `size` / `color`
  unless the design asks otherwise.
- **Press feedback only on what can be tapped**, from `opacity.pressed` through the primitive;
  touch targets of at least 44 pt (a smaller control grows its `hitSlop`, not its look).

## 6. Reuse or create: the order to follow

Go down this list and stop at the first step that fits.

1. **The component already has the property.** The spot belongs to a component of the schema and
   that component has a property for it: read it (`themePart`, or the component's `look` through
   `nativeBoxStyle`). Example: an order card's total is the `order_card` component's
   `total_text`, not `themeText(theme, 'body_lg')` picked by the screen.
2. **A shared primitive already does it.** One purpose, one theme element
   (`src/ui/src/components/shared`, exported from `@ui`):

   | Purpose | Primitive | Theme |
   |---|---|---|
   | Text | `OText` (`preset`, `color` role, `weight`) | `tokens.typography`, `tokens.color` |
   | Button, icon button | `OButton` (`color`, `appearance`, `size`, `iconOnly`, `round`, `icon`, `loading`, `disabled`, `hold` for a dangerous step) | `components.button` |
   | The bar pinned to the bottom | `OBottomBar` (`actions`: slots `button`, `secondary`, `advance`, `decline`, `reject`; two buttons share the row 1 : 2) | `components.bottom_bar` |
   | Icon, tile with a glyph | `Icon` (`ion` or `mci`, `size` level, `color` role), `IconTile` (`size`, `variant`, `round`) | `tokens.icon`, `components.icon_tile` |
   | Text link (a line of text grows its touch area to 44 pt), a round button over a map | `OLink` (`variant`, `size`), `OFab` | `components.link`, `components.map_marker` |
   | Text field, text area | `OInput` (`label`, `hasError`, `scope`), `OTextarea` (`label`, `lines`), `FieldError`, `PasswordToggle`, `OOtpInput` | `components.input`, `components.field` |
   | Select (always a sheet), calendar (a day or a range) | `OSelect`, `OCalendar` (`mode='range'`) | `sheet`, `menu`, `input` |
   | A list of choices, its mark, a check, a selectable tile | `ChoiceRow`, `ChoiceMark`, `OCheckbox`, `ChoiceTile` | `list_row`, `radio`, `checkbox`, `choice` |
   | A switch | `OSwitch` (drawn, 44 x 24; `label`) | `components.switch` |
   | A quantity or a time with plus and minus | `OStepper` | `components.stepper` |
   | Tabs, chips | `Tabs` (`pill`, `underline` or `plain`; no count: the app shows no number of orders), `FilterChip` (`dot`) | `components.tabs`, `components.chip` |
   | Status, a word with a state colour, count, dot | `OBadge` (`variant`, `count`, `plain`, `dot`; `md` by default, `sm` for a count); `orderTypeVariant` gives an order type's variant | `components.badge` |
   | Avatar with initials | `OAvatar` (`name`, `muted`, `size`) | `components.avatar` |
   | A box, a row of a list | `OCard` (`variant`, `title`), `OListRow` (the `tile` slot, `trailing`), `ODivider`, `SectionTitle` | `card`, `list_row`, `divider`, `section_header` |
   | Progress | `OProgress` (`variant` steps or bar) | `components.progress` |
   | Full-screen modal page, dialog | `OModal` (`entireModal`, `box`, `closable`) | `components.modal`, `components.header` |
   | Bottom sheet, its top, its pinned action | `OBottomPopup` (`padded`, `keyboardAware`, `scroll`; its body scrolls inside the room under the top safe area), `SheetFooter` (the action that stays pinned under the scroll), `SheetHeader` (handle, title, tile, close) | `components.sheet` |
   | A screen's top bar, back and close | `ONavbar`, `BackButton`, `ModalCloseButton` | `components.header` |
   | A stack screen's column; two panes | `ScreenContainer`, `PaneLayout` | `components.screen`, `bottom_nav.rail_width` |
   | Toast, notice | `OToast`, `ONotice` (`title`; `action` is a text link in the notice's ink) | `components.toast`, `components.alert` |
   | Ask before a dangerous action | `useConfirm()` with `ConfirmDialogHost` (its title is the question: `acceptText` + "?" unless the call gives one, never the app's name), or `OAlertOriginal`; `HoldToConfirm` through `OButton hold` | none |
   | Loading | `OSpinner`, `LoadingOverlay`, `SkeletonBone` | `components.spinner`, `components.skeleton` |
   | Keyboard (section 7, "The keyboard") | `KeyboardScreen` (the only keyboard-avoiding view of a screen), `KeyboardScrollView` (its scroll: the focused field is brought into view), `OBottomBar` (no system inset under it while the keyboard is up) | none |
   | A label that turns bold when selected | `StableText` (keeps its bold width) | none |
   | Nothing to show (a list, a screen, a failed load) | `NotFoundSource` (`content` title, `text`, `icon`, an action, `fill`): the app's one empty state | `components.empty_state` |

   Do not build a second version with its own styles, and do not add a library that paints its
   own UI.
3. **A token used directly.** Layout glue that should always move with the global scale and that
   nobody needs to change on its own: the gap between blocks of a screen, the rhythm between form
   fields, the screen's sides (`themeGutter`), the color of a plain heading (`color.text`).
4. **A new property on an existing component.** The spot is a distinct visual part of a component
   and a theme author could reasonably want it different from the token. Add the property to
   that component in the schema, with a default that aliases a token (`{space.sm}`,
   `{color.surface}`), never a literal unless the value is truly its own (a size with its `min` /
   `max`).
5. **A new component.** A reusable UI piece with its own look that no component covers. A
   card-like component `inherits` `card`; the components it contains go in `slots`; a group that
   changes its children uses `scope`.

Never create a new **token**. Token names are a fixed catalog shared by every product and
api-core rejects names outside it. A missing level (another space step, another icon size) is a
change to the engine and the editor: raise it and ask, do not work around it.

### Reuse across components

- Prefer a slot to restyling a contained component: a button inside a card is a slot pointing to
  `button` with its size, appearance and color (`order_card.slots.advance`, `decline`,
  `secondary`), not a custom button.
- Prefer `inherits` to copying a parent's properties: the child declares only what it uses, and
  what the theme sets on the parent applies to it.
- Prefer `scope` to per-place overrides: a group that wants its fields or buttons different says
  so in its `scope` (`auth_form`, `account_page`).
- Two components that should look alike alias the same token in their defaults; they do not read
  each other's properties.

## 7. Picking the right token

Use the token that names the purpose, not the one with the right value today.

**Surfaces**
- `background` is only the screen canvas.
- Cards and anything that floats (modals, sheets, dialogs, toasts) are `surface`.
- Bands and quiet fills (a board column, a tile, a muted card) are `surface_alt`.

**Text and lines**
- Plain text is `text`; secondary text and placeholders are `text_muted`.
- `text_disabled` is for disabled text; `disabled` is the fill of a control that is off (the
  switch's track).
- Separators and card borders are `border`.
- `border_strong` is for form-control borders (input, select, checkbox, radio, switch off) and the
  neutral outline button.
- Loading placeholders use `SkeletonBone`; a component does not color its skeletons.

**Color on color**
- `on_*` is text on that color's fill (button, badge, toast).
- `*_text` is that color used as text on the screen and over its `*_subtle` fill (errors, amounts,
  state words); it is the legible one.
- `*_subtle` is the soft fill of a state (a notice, a soft badge, the order card's band).
- `primary` is the brand, selection and progress; `primary_subtle` its soft fill and
  `primary_pressed` the ink over it.
- `overlay` is the scrim behind modals and sheets.
- Icons, borders and fills keep the plain color.
- The meaning of an order's colors is the theme's, through the badge variants and the band: the
  band is the soft color of the status (new `warning`, in progress `primary`, completed `success`,
  rejected or cancelled `danger`) and of the time's state when the order is at risk or late; the
  order type is one of three variants by how the order leaves the store (`type_delivery`,
  `type_pickup`, `type_in_store`); a state word (Paid, Current, Always on) is a `*_soft` badge.
  A screen picks the variant through `orderBandVariant` and `orderTypeVariant`, never a color.

**Translucency:** a color is opaque unless its node says `alpha: true` in its editor metadata
(`overlay`). Only then can its default be translucent, and a translucent box drops its shadow
(`nativeBoxStyle`).

**Typography**
- Headings use `h1` to `h4`; body copy uses `body_lg`, `body`, `body_sm`, `label`, `caption`,
  `button`; a group's label is `overline`.
- The style follows the theme, not the place: a screen's title can carry an `h3` style today and
  another tomorrow.
- `line` is a ratio of the size, not pt.
- Texts of the same role look the same on every screen; each role reads one place of the theme,
  never a preset picked by the screen (the full table of roles is `docs/theme/tokens.md` section 4):

  | Role | Reads |
  |---|---|
  | Screen title | `header.title` (`ONavbar`), its line `header.subtitle` |
  | Sheet and dialog title | `sheet.title`, `modal.title` |
  | Group label | `section_header.title` through `SectionTitle` |
  | Card title, field label, row title | `label` through `card.title`, `field.label`, `list_row.title` |
  | A card's headline (order number, total, empty title, stepper value) | `body_lg` through `order_card.number_text`, `order_card.total_text`, `empty_state.title`, `stepper.value` |
  | Body copy | `body` |
  | Metadata (a card's line, a row's subtitle) | `body_sm` in `text_muted` (`order_card.meta`, `list_row.subtitle`) |
  | A time that ticks, a tab's label | `order_card.time_text`, `tabs.text` |
  | Tab bar labels, counters | `bottom_nav.label_text`, `badge` sizes |
  | A big figure (the clock, the minutes) | `order_details.figure` |

- A label that turns bold when selected (tabs, choice tiles) keeps its bold width: `StableText`.
  Selecting changes the look, never the layout.

**Sizes**
- Icons use `icon` levels; control heights use `size` levels (`themeControlHeight`).
- Touch targets are at least 44 pt.
- Radii and shadows use their levels; Identity may replace the level, which the helpers handle:
  - a state (pressed, focus) or a round shape passes `{ fixed: true }` to keep its own level;
  - `none` and `full` radii never change.

**Interaction**
- Only what can be tapped has press feedback (`opacity.pressed`, a state's look from the theme).
- Everything else stays still.
- A state (pressed, selected) never moves or resizes its control: its border room is reserved in
  every state (`reservedBorder`, see-through where a state has none) and a bolder label keeps its
  bold width (`StableText`).

**Motion:** durations and easing come from `motion` / `motion_style` and the component's own
motion properties, through `themeMotion`.

**Layout rules**

- Every screen's content, its header's included, sits on the page gutter (`layout.page_gutter`).
- A row of chips is one row that scrolls sideways, never wrapped.
- A bar pinned to the bottom keeps the system inset under its content or at least the theme's
  minimum (`bottom_nav.min_bottom_space`), whichever is larger (the inset is 0 on Android with
  gestures), **and none while the keyboard is up** (the keyboard covers it: see "The keyboard").
- **The space under the header is the header's** (`ONavbar`): `sm`, or `xs` for a screen that
  opens with a strip (the orders' tabs, the messages' filters, the printer wizard's steps:
  `<ONavbar tight />`). A screen adds no `paddingTop` of its own under its bar.
- **Long text, one rule per kind of piece.** A fixed word of the app (a button, a tab, a rating
  level, a brand tile) is always read whole: a button wraps to two lines, or shrinks to its line in a
  bar (`OBottomBar`'s buttons: `fitText`, `button_padding_x` at their sides), and a tab, a rating
  level or a choice tile is one line that shrinks down to 75 % of its size (`StableText`,
  `numberOfLines`) before anything is cut. A text that comes from the server or the user (a store
  name, a note) is one line that ends in an ellipsis (`OBadge`, a row's title); **an order's status
  is the exception: it is written whole and takes as many lines as it needs** (the card's band, the
  messages' rows: `OBadge` with `wrap`). A row never gives its title's room to a button: the button goes under it or
  becomes a link. A notice's text wraps (`ONotice`). The header's connection status is as wide as
  its text, up to `header.status_max_width`, then ends in an ellipsis.
- **A neutral outline** (the Cancel, Load more, Log out buttons) draws the field's line
  (`color.border_strong`) with the text in black, as every field and the mockups do (`OButton`: the
  engine's outline has one `ink` role for both).
- **One writer of a time, a date, a count and a number.** A time of day or a date on screen is
  `useFormats()` (`time`, `date`, `dateTime`, `orderTime`, `{ zone }` for a store's clock): the
  project's format with a space before AM/PM, never a `dayjs().format(timeFormat)` of a screen. A
  count on a badge is `countText(n, more)` (`shared/`, `99+`; only the unread-messages counts
  remain, the app shows no number of orders). An order's number is
  `orderNumberText(order, t, configs)` (`Order #1053`, `OrderDetails/orderData.ts`) or `#` +
  `orderNumber(order, configs)` where a card has no room.
- **A heading of a group is the overline** (`SectionTitle`), in lists, settings, sheets, the review
  and the board's columns (the Profile's own titles are the exception recorded in `decisions.md`).
- **One empty state:** `NotFoundSource`; the alert sounds are bundled files (`docs/SOUNDS.md`).
- **One glyph per function** (`GLYPH`), and a state word (Paid, Current, Always on, Disabled) is a
  `*_soft` `OBadge` of the same `md` size as an order status's pill (see `OBadge`); `sm` is for
  counts.
- **Orientation:** a phone never rotates (iPhone: portrait only in `Info.plist`; Android:
  `lock_portrait` below `sw600dp`), a tablet turns every way (`usePlatform` is `tablet` in either
  shape of a 1180 x 820 window, and the layout changes with it:
  `src/theme/__tests__/platform.test.tsx`).
- A card that opens something is pressable as a whole; a row holds on a 360 pt phone.
- Accepting an order is one tap on the sheet's button with its time already chosen; dangerous
  actions (reject, cancel-type statuses, log out, delete) are guarded by a confirmation, a hold or
  a sheet that states the consequence.

### The keyboard

One rule for the whole app, made by four primitives; a screen that follows them has nothing of its
own to write.

1. **A sheet never passes the top safe area.** `OBottomPopup` keeps `insets.top` over its container
   and caps the sheet at what is left (`maxHeight: '100%'` of the room the keyboard's avoiding view
   leaves); a `padded` or `keyboardAware` sheet scrolls its body inside it (`scroll`, on by default
   for those; off for a body that is its own list, as the select's). The sheet's action stays
   pinned: write it as `<SheetFooter>` anywhere in the body, and the sheet draws it under the scroll
   (the Reject sheet: the reasons and the note scroll, "Reject order" does not).
2. **A pinned bar sits its own padding over the keyboard.** `KeyboardScreen` lifts what is inside
   it by the room the keyboard takes, and `OBottomBar` (and a sheet's footer) drops the system inset
   while the keyboard is up (it covers it), so the gap is `components.bottom_bar.base.padding` on
   every screen, and the same for a sheet's last control.
3. **`KeyboardScreen` knows where its screen is.** A `KeyboardAvoidingView` takes its parent's top
   for the window's, so it falls short of the keyboard by the distance of its screen from the
   window's top: the safe area (under the island on iOS; Android: the bars the activity pads by) and
   anything else above it (a `ScreenContainer`'s column hides the safe area from it). Both platforms
   measure the wrapper in the window (`useWindowTop`, `measureInWindow`) and give that as
   `keyboardVerticalOffset`; a modal, a window of its own, measures 0. A keyboard that takes no room
   (Android's floating Gboard) lifts nothing (`useKeyboardVisible`, `keyboardTakesRoom`).
4. **The focused field is brought into view.** `KeyboardScrollView` is the scroll to use inside a
   `KeyboardScreen` or a sheet: it asks the system which input has the focus (`TextInput.State`),
   measures it against its own content, and scrolls so its end is in sight with `md` of air under
   it, each time the room settles (the keyboard's show and frame events, its own layout, its
   content's size as a field grows, a touch on a field while the keyboard is up). It also closes the
   keyboard on drag and lets a tap on a button through (`keyboardShouldPersistTaps='handled'`).
   With `keepEndInSight` (set by `AuthScreen` when the form has no pinned footer) the scroll goes on
   toward the end of the content, as far as the focused field's top stays in sight: the field comes
   first and the main button under it is over the keyboard with it (a tablet held sideways: the
   login). On such a screen a drag does not close the keyboard (`keyboardDismissMode='none'`) and a
   drag of the user is not pulled back to the field: if the strip cannot hold the field and the
   button, the user scrolls to the button with the keyboard still up.

Rules around it. A screen uses `KeyboardScreen`, never a raw `KeyboardAvoidingView` (a test fails
on one; the two inside `OBottomPopup` and `OModal` are inside a `Modal` and are the exceptions).
**Whether the keyboard is up** is `useKeyboardVisible` (`src/hooks`): iOS announces a keyboard with
`will` and `did` events and `Keyboard.isVisible()` follows only the `did` pair, so the hook listens
to all four on iOS and reads the keyboard again once it has subscribed. The tab bar leaves for the
keyboard on Android only (its window shrinks); iOS leaves it where it is.

## 8. Adding to the schema

When step 4 or 5 of section 6 applies, in the same pull request:

1. Add the node to `product.schema.json` with its `$type` and its default:
   - the default aliases a token (`{color.x}`, `{space.x}`, `{radius.x}`, `{shadow.x}`,
     `{typography.x}`, `{icon.x}`);
   - a dimension says its `scale`;
   - a shadow, radius or border that should follow Identity says `follows` (and `options` when
     Identity's level does not fit it);
   - a translucent color says `alpha: true`;
   - a value only the tablet changes goes in the component's `platforms.tablet`; a hideable piece
     is a `visibility` key; a screen section is in its `pages.<page>.sections`.
2. Add its editor metadata (`$extensions["co.ordering.editor"]`): `control`, `order`, and `min` /
   `max` / `step` / `unit` for numbers (`info` for a help line). The label of a property is
   `editor.props.<name>.label` (shared by every component with a property of that name: reuse a
   name only for the same meaning), and a component, a visibility key, a page and a page section
   carry their own label. The editor's rules are checked by `pnpm theme:validate`.
   - The Dashboard translates the editor from its own catalog. A new label key
     (`BUILDER_THEME_PROP_...`, `BUILDER_THEME_VIS_ITEM_...`, `BUILDER_THEME_COMPONENT_...`) shows
     its default English text until the Dashboard adds it in every language: list each new key
     with its default text in `docs/theme/editor-labels.md` and open the Dashboard's pull request in
     the same round. A key never has two meanings: with a checkout of the Dashboard,
     `pnpm theme:labels --catalog <ordering-dashboard>/i18n/translations.json` fails when a key of
     this schema is already in its catalog with another English text, and lists the keys to add
     there.
3. A published version is immutable: from the first publish on, bump `version` before changing the
   schema. Which number to bump, and how saved themes follow, is in the engine's docs (see the top
   of this page): `creating-a-schema.md` section 6 and `schema-format.md` sections 13 to 15.
   - Installed apps keep asking for the schema version they were built with: the new version must
     be published before the build that ships it, and a theme of the new version must cut down
     cleanly to the old one.
   - Publishing is the pipeline's job (`.github/workflows/theme-publish.yml`, on every push to
     `main`, then the Builder clones the base again), never `pnpm theme:publish` by hand. A push
     that changes the schema without a new `version` fails there.
   - Locally nothing is published: either the app paints the local schema's defaults
     (`pnpm theme:compile`; without a served theme it paints `complete(compiled, null)`), or the
     schema is registered in a local API with api-core's
     `php artisan ordering:theme-schema <path to product.schema.json>` to edit a theme of it from
     the local Dashboard.
4. Run `pnpm theme:compile` (it writes `src/theme.compiled.json`: the defaults, the rules the app
   completes the theme with, `product_type` and `version`; never edit that file by hand), then:
   - `pnpm theme:validate`: the schema and its editor metadata are valid;
   - `pnpm theme:verify`: the compiled file is the one the schema compiles to;
   - `pnpm theme:guard`: no design literal in `src` (a literal that is not a design value, such as
     `0`, `'100%'` or a flex ratio, passes; a recorded exception passes with its reason);
   - `pnpm theme:keys`: every key of the schema has a reader in the code;
   - `pnpm theme:reads`: the other direction of `theme:keys`: a read of a key the schema does not
     have (`themeVisible(theme, 'orders.timer')`, a mistyped `themePart` path) is always "shown" or
     undefined, silently; it fails there;
   - `pnpm theme:extremes`: extreme themes still reach what the app paints (Identity, every
     catalog font with its files, the tablet's values).
5. Read it through a helper and cover it in a test. A key read through a variable or as a whole
   look goes in `theme-readers.json` with its reader.
6. Update this page if the change touches anything it describes (section 12).

## 9. Fonts

The catalog's ten fonts (Archivo, Inter, Lato, Montserrat, Nunito, Open Sans, Playfair Display,
Poppins, Raleway, Roboto) are bundled as static files at weights 400, 500, 600 and 700, one file
per weight: 40 files in `src/assets/fonts/`, linked by `react-native.config.js` (`assets`) into
`Info.plist` (`UIAppFonts`) and the Xcode project on iOS and into
`android/app/src/main/assets/fonts/` on Android. A file's name and its PostScript name are
`<FamilyWithoutSpaces>-<Weight>` (`OpenSans-SemiBold`), the names the engine's `toNative` paints
with. A family without a weight ships its nearest file under that name. A weight is painted by its
file (`themeText` with `weight`, `themeFontFamily`), never by `fontWeight`.
`src/theme/__tests__/theme.test.ts` checks every catalog font has its four files;
`fontsLinked.test.ts` checks both platforms have them.

## 10. What the theme is, and what is gone

The theme is `{ values, native, meta }` and nothing else. The legacy bridge (`theme.colors.*`,
`theme.fonts.*`, `theme.images.*`, derived from `values` while the screens were rebuilt) is gone,
with its file and its test, and so are the four old primitives that kept it alive: `OIconButton` is
`OButton` with `iconOnly`, `OAlert` is `useConfirm` (a question) or `ONotice` (a line on the
page), `ODropDown` is `OSelect` (always a sheet), `ODropDownCalendar` is `OCalendar`. A screen that
reads `theme.colors` or imports one of them is a mistake (the guard and the type check say so).
Images come from `themeImage(theme, key)`, fonts from the text helpers, colors from the roles of
`tokens.color` and the component keys. The guard has no exclusions for old code:
`theme-exceptions.json` lists only the few allowed literals, each with its reason.

## 11. Don'ts

- No literals in styles or style props: no hex, `rgb()` / `rgba()`, number for a length, font size,
  line height, shadow, opacity or duration, no font name. A literal is only acceptable when it is
  not a design value (`0`, `'100%'`, flex ratios) or when it is a recorded, approved exception in
  `theme-exceptions.json`, each with its reason. `pnpm theme:guard` fails on the rest.
- No module-level `StyleSheet.create` with theme values: it never sees a theme change.
- No `fontFamily` or `fontWeight` in a component: the text helper picks the file.
- No `defaultProps` on function components: defaults go in the destructuring.
- No colors computed from other colors in a component (`darken`, `lighten`, `mix`): derived colors
  are declared in the schema (`derive`) and served ready. A color that does not come from the theme
  goes through the engine's color functions (`@orderingco/ordering-theme-engine/colors`).
- No reading `theme.native...` or `theme.values...` inline when a helper exists; no converting a
  theme value in a component (a shadow or a text built from its fields): the view has it.
- No per-component copy of a token's value "to be safe"; no second theme provider; no optional
  chains on the theme.
- No `Dimensions.get` at module load and no own `Dimensions` listener: use `useLayout()`.
- No second implementation of a primitive (section 6, step 2); no picker library and no list that
  opens in place.
- No press feedback on what cannot be tapped; touch targets of at least 44 pt.
- No shadow on a see-through box; no state that moves its control.
- No new token names; no schema key without its default, editor metadata and the rest of
  section 8.
- No design that breaks a rule of section 1 without the owner's word.

## 12. Keeping this page true

This page describes the rules and the theme **as they are now**. It must match
`product.schema.json`, the helpers and the owner's decisions at all times.

- **Same pull request:** a change that touches what this page describes updates it in that pull
  request. That covers:
  - the schema: token groups or levels, a component's parts, `follows`, `inherits`, `slots`,
    `scope`;
  - a helper, or a shared primitive in `src/ui/src/components/shared/`;
  - a rule about which token fits which purpose;
  - a design rule of section 1.
- **Rewrite in place:**
  - edit the sentence that changed, so the page reads as if it had always said the new thing;
  - delete what no longer exists (a helper, a primitive, a prop).
- **Not a changelog:**
  - no dates of changes, versions or "was / now / previously / new" notes;
  - no lists of past changes.

  History lives in git and in the commits; decisions in `docs/theme/decisions.md` (a rule here may
  point at its row).
- **Specific rules only:** add a rule only if it applies across the codebase. A decision about one
  screen goes in that screen's code or in `docs/theme/`, not here.
- **Point, don't copy:** prefer pointing to the source over copying values:
  - level names, not their numbers (a number written here is a default or a rule of a primitive,
    and says so);
  - the helper's file, not its body.

  What is not copied cannot go stale.
