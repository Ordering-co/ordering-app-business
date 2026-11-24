# Tokens: unified scales and colors (phase 3, store app)

Date: 2026-11-19 · Status: **proposal for the gate** (nothing here is approved by the owner yet; the working
assumption of [decisions.md](decisions.md) is that the scales are the driver app's).

Source of the values: the driver app's `product.schema.json` (`ordering-app-driver-theming`, `driver_app` 1.0.0) and its
`docs/theme/tokens.md`. This app is the same product family and its canvas was drawn with the same kit, so the scales are
the same: spacing 5 / 10 / 15 / 20, radii 8 / 10 / 15, header 56, tab bar 64, bottom-bar button 50, in-card button 44,
icons 16 / 20 / 24, Poppins, `#1E72E3`, flat surfaces drawn with 1 px lines. Token names are the engine's fixed catalog:
**no token was added**; `overline` is a catalog name the driver schema did not use.

What this document adds to the driver's: the check of every scale against the 47 mockups (section 1), the list of values
that are not on a scale with a proposal for each (section 2), the five token values that change from the driver's and why
(section 3), the text roles (section 4) and the colors (section 5).

## 1. The check, by script

`design/redesign/screens/*.dc.html` (47 files) were read with a script that takes every `style="..."` declaration (the
`<helmet>` block left out) and the `width`, `height` and `stroke-width` of every `<svg>`. Backdrop sketches (the grey blocks
`aria-hidden` behind every sheet, heights 46 / 60 / 70 / 96 / 110 / 120 / 135 / 141 / 145 / 150 / 191 / 200 / 220) and the
artboard itself (390 × 844 … 1180 × 820) are not UI and are left out of the readings below.

| Scale | Uses | Distinct values | On the scale | Off the scale |
|---|---|---|---|---|
| Color | 1 857 | 24 | 1 843 (20 distinct colors, all on the schema's colors) | 14 uses, 4 values (section 2.1) |
| Font size | 911 | 8 (10, 12, 14, 16, 18, 20, 24, 28) | 911 | 0 |
| Font weight | 501 written | 3 (400, 600, 700) | 501 | 0. The rest inherit (400). 500 is never drawn |
| Line height | 681 | 6 | 602 are the ratios 1.2 / 1.3 / 1.4 / 1.5 | 79 are `24px` (47) and `20px` (32): the line box of a 24 and a 20 high pill, a property of the badge, not a ratio |
| Radius | 676 | 5 (0, 8, 10, 15, 9999) | 676 | 0 |
| Spacing: padding, margin, gap | 1 801 | 15 | 1 776 (0, 2, 5, 10, 15, 20) | 25 uses, 5 values (section 2.2) |
| Border width | 315 | 3 (1, 2, 3) | 312 (`thin`, `thick`) | 3 (the map marker's ring, 3) |
| Icon size (svg) | 248 | 3 (16, 20, 24) | 248 | 0 |
| Stroke width of icons | 246 | 2 (2, 3) | the 3 is the "more" glyph | none |
| Letter spacing | 14 | 1 (0.04em) | the `overline` style | none |
| Shadow | 4 | 2 (map only) | 0 | 4 (section 2.3) |
| Opacity | 21 | 1 (0) | hidden fields | none |
| Control and row heights | 943 | about 25 | 295 are `size` levels (32 / 44 / 50 / 60) | the rest are role heights (section 2.4) |

Reading: **every color, font size, weight, radius and icon of the mockups is on the scale**. The scales are verified. The
only values off a scale are the five groups below.

## 2. Values not on a scale, and what to do

### 2.1 Colors (14 uses)

| Value | Uses / screens | Where | Proposal |
|---|---|---|---|
| `#4A4A4A` | 8 uses, 3 screens: Main, OrdersInProgress, TabletBoard | the 12 px secondary line of an order card (items summary, payment line); SPECS says "text secondary becomes `#4A4A4A` on the at-risk tint" | **Snap to `text_muted` `#616161`**: contrast on the at-risk tint `#FFF4CC` is 5.62 (the 4.5 minimum is met). Key: `order_card.base.meta_color`. Visible change: slightly lighter secondary line |
| `rgba(0,0,0,0.25)` | 3 uses, 1 screen: MapTracking | shadow of the floating map buttons | **Snap to `shadow.sm`** (0 / 1 / 4, opacity 0.10) through `map_marker.base.shadow`. Visible change: a softer shadow (kit says 0.15; the two mockup values differ among themselves) |
| `rgba(0,0,0,0.15)` | 1 use: MapTracking | shadow of the markers | same |
| `#EEF1F4` | 2 uses, 2 screens: MapTracking, OrderDelivery | the **drawn map** (land color of the mockup) | **Not a theme value**: the map is the map library's. Recorded exception for the mini map placeholder when no tiles are available (`theme-exceptions.json`, reason: a map's own colors) |

### 2.2 Spacing (25 uses)

| Value | Uses / screens | Where | Proposal |
|---|---|---|---|
| `-10px` margin | 15 uses, 13 screens (the 9 sheets, OrderError, OrderPreparing, LanguageSheet, Menu, NewOrderAlert, PrinterFound) | the sheet's close button: a 44 box with a 24 glyph pulled into the gutter | **Layout rule, not a token**: `(button 44 − icon 24) / 2 = 10`, computed from `size.md` and `icon.lg` (the driver's `closeButtonInset` is the same rule: half the button less the glyph) |
| `-5px` margin | 4 uses, 3 screens (Stores, Menu, MenuUnavailable) | a 44 high text button pulled so its text sits on the gutter | same rule |
| `4px` margin-top | 4 uses, 1 screen (OrderDelivery) | the timeline dot's drop to the first line's middle | **Snap to `xs` (5)**: it is `(line box 20 − dot 12) / 2`, a layout offset the timeline primitive computes. Key: `timeline.base.dot_size` |
| `45px` padding-left | 1 use (OrdersSearch) | the search field's text, after a 20 icon | **Not a token**: `padding_x` 15 + `icon_size` 20 + `icon_gap` 10 of `input` (the schema's `input.base.icon_gap` is `sm`, 10) |
| `1px` padding | 1 use (TabletBoard) | rail item | **Snap to 0**; the rail item is 64 × 64 |

### 2.3 Shadows

The mockups draw no shadow except what floats over a map (two values, 2.1). The driver's Identity applies: `shadow_style.size`
`none`, `border_style.width` `thin`. The levels `sm` to `xl` remain for a theme that sets them.

### 2.4 Heights and widths that are not `size` levels

`size` has four levels (32 / 44 / 50 / 60). The mockups use 44 (234 uses) and 50 (58) heavily and **never 32 or 60 as a
control height**. The other heights are roles, and the driver app already keeps each as a component key (a number, or a
dimension with a custom value), not as a token:

| Height | Uses | Role | Key of the schema |
|---|---|---|---|
| 56 | 108 | header; settings row `min-height`; the code cell; the folded "Total / More details" row | `header.base.height` (56, existing), `list_row.base.min_height`, `input.sizes.code.height` (56, existing), `order_details.base.folded_min_height` |
| 36 | 69 | filter chip and segmented tab | `chip.sizes.sm.height` = 36, the tab inside the pill (`tabs.sizes.sm.height` is the whole pill, 46 = 36 + 2 x the 5 inset: a custom value on the `size` scale, as the driver's `list_row.trailing_icon_size` 18 on `icon`) |
| 24 | 101 | status badge, connection pill, checkbox box, switch track | `badge.sizes.md.height` (24, existing), `switch.base.track_height` 24, `checkbox.base.size` = `icon.lg` (24) |
| 20 | 93 | counter, switch thumb, radio | `badge.sizes.sm.height` (20, existing), `switch.base.thumb_size` 20, `radio.base.size` = `icon.md` (20) |
| 40 / 44 | 28 / 20 | icon tile | `icon_tile.sizes.md` 40, `icon_tile.sizes.lg` 44 |
| 64 | 28 | tab bar, rail item, brand tile, menu row | `bottom_nav.base.height` 64 (existing) and `item_size`, `choice.base.height`, `menu_row.base.min_height` |
| 88 | 3 | empty-state disc, profile avatar | `icon_tile.sizes.xl`, `avatar.sizes.xl.size` |
| 90 | 2 | multi-line field | `input.base.textarea_height` |
| 12 / 8 / 5 / 4 / 1 | 4 / 11 / 8 / 10 / 27 | timeline dot, status dot, progress track, sheet handle, line | `timeline.base.dot_size`, `badge.base.dot_size` and `chip.base.dot_size`, `progress.base.height`, `sheet.base.handle_height` (4, existing), `border.thin` |
| widths 44 / 52 / 80 / 50 / 330 | | button, switch hit area, side rail, code cell, dialog | `size.md`, `switch.base.hit_width`, `bottom_nav.base.rail_width`, `input.sizes.code.width` (`size.lg`, existing), `modal.sizes.sm.width` |

**Proposal T2 (alternative, not applied):** moving `size.sm` 32 → 36 and `size.xl` 60 → 56 would put 177 more height uses on the
scale (chips and tabs on `sm`, header and rows on `xl`) and leave no unused level. It would make this app's `size` differ from the
driver's, so one theme means two things in the two apps; it needs the owner (open-questions.md, T2). The schema keeps the
driver's levels.

### 2.5 Fonts

| Value | Where | Proposal |
|---|---|---|
| `ui-monospace, Menlo, monospace` (2 screens: TicketPreview, TicketSettings) | the ticket paper, to look like a thermal ticket | **Recorded exception**, not a font token: the catalog's 10 fonts are proportional and the ticket drawn on screen imitates the printer's fixed pitch. `ticket_paper` themes the paper's colors, border and size; its letters use the platform monospace (an exception of category `font_family`, file `shared/TicketPaper`) |

## 3. Token values that differ from the driver's

| Token | Driver | This app | Why | Visible change against the driver |
|---|---|---|---|---|
| `color.text_disabled` | `#B1BCCC` | `#909090` | the mockups draw disabled and "muted for placeholder" text in `#909090` (24 uses, 9 screens; the kit: "atenuado/placeholder, only at ≥ 14 px or icons"). `#B1BCCC` has contrast 1.92 on white; `#909090` has 3.19 | none for this app (the driver's own mockups are not re-drawn) |
| `color.success_text` / `warning_text` / `danger_text` | `#00884F` / `#8F6F00` / `#DA3453` | `#00713F` / `#6B5300` / `#C42543` | the mockups draw text **on a tint** (`#D6FFF7`, `#FFF4CC`, `#FEEDF0`) in these darker tones (27 + 17 + 21 uses). On the tint the driver's tones are 4.21 / 4.29 / 4.04, below 4.5; the mockups' are 5.68 / 6.66 / 5.03. The `legible` rule now reads **over the matching `_subtle` color** with contrast 5.5 / 6.5 / 5.0, so a theme that changes the brand color still gets readable text on its tints | text in notices, soft badges and status lines is darker |
| `typography.body_lg` | 16 / 1.4 / 400 | 16 / 1.4 / **600** | the mockups draw 16 px only at 600 (42 uses) or 700 (2): order numbers, totals, empty-state titles, the stepper value. No mockup draws 16 / 400. The role "card headline" gets one place of the theme | none for this app |
| `typography.overline` | not used | 12 / 1.5 / 600, capitals, letter spacing 0.5 | the section label (14 uses, 7 screens: `PREPARING · 2`, `TODAY`, `SOUND`, `DATE`) is a catalog style; the driver used `h4` (18 / 600) for its section titles | section labels are small capitals |
| `typography.caption` and the rest | | unchanged | | |

Not changed: every other color (40), `radius`, `size`, `icon`, `space`, `layout.page_gutter` 20, `motion` 120 / 200 / 300, `border`,
`shadow` (none / sm / md / lg / xl), `opacity` (disabled 0.5, pressed 0.85), Identity (`shadow_style.size` `none`, `border_style.width`
`thin`, radius `md`), the font roles (`heading` = `body` = Poppins). The editor's range of `typography.overline.size` is 10 to 16.

**Proposal T1 (open):** `body_lg` at 600 reproduces the mockups with one place of the theme. The alternative is to keep it at 400
and give each reading component a custom 16 / 600 style (five places, as the driver's `order_card.total_text`). Recommended: as
applied.

## 4. Text roles: one place of the theme per role

Every text of the 47 mockups is one of these. "Key" is the property that reads it; a role never has two places.

| Role | Style (size / line / weight) | Uses | Token or key |
|---|---|---|---|
| Screen title | 20 / 1.3 / 700 | 51 (45 screens) | `typography.h3` through `header.base.title` |
| Header subtitle (order number, store) | 12 / 1.5 / 400 muted | | `header.base.subtitle` (`body_sm`) |
| Sheet, dialog and alert title | 18 / 1.3 / 600 | 19 + 2 | `typography.h4` through `sheet.base.title`, `modal.base.title`, `new_order_alert.base.title`, `bill.base.total` |
| Section label | 12 / 1.5 / 600, capitals | 14 | `typography.overline` through `section_header.base.title` |
| Card title, field label, row title, button | 14 / 1.4 / 600 | 175 + 108 | `typography.label` (`card.base.title`, `field.base.label`, `list_row.base.title`, `item_card.base.title`, `menu_row.base.name`, `conversation_row.base.name`, `order_card.base.name`); `typography.button` for buttons |
| Card headline (order number, price, total, empty title, stepper value) | 16 / 1.4 / 600 | 42 | `typography.body_lg` through `order_card.base.number_text` and `total_text`, `empty_state.base.title`, `stepper.base.value` |
| Body | 14 / 1.4 / 400 | 59 + 56 | `typography.body` |
| Secondary line, metadata | 12 / 1.5 / 400, `text_muted` | 213 | `typography.body_sm` (`order_card.base.meta`, `list_row.base.subtitle`, …) |
| Strong small text (timer, time, tab label, unread preview, subtitle in More details) | 12 / 1.5 / 600 | 22 + 13 | custom style on `order_card.base.time_text`, `tabs.base.text`, `conversation_row.base.preview_unread`, `order_details.base.subtitle`, `chip`/`choice` selected texts at 14 / 600. **No catalog style: five keys with the same value** (the driver does the same with `order_card.time_text` and `order_details.subtitle`); open question T3 |
| Tab-bar label, counter | 10 / 1.3 / 400, counter 600 | 68 | `typography.caption` through `bottom_nav.base.label_text`; `badge.sizes.sm.text` |
| Big figure (clock, "20 min") | 28 / 1.2 / 700 | 4 | `typography.h1` through `order_details.base.figure`, `stepper.sizes.lg.value` |
| Login title | 24 / 1.3 / 700 | 1 | `typography.h2` |
| Ticket paper | 12 and 16 / 700, monospace | 2 | `ticket_paper.base.text` and `title` (family: exception, 2.5) |

Font scaling: on, capped at 1.3 in the text primitive (the driver's rule). Weights bundled: the driver's decision is 400 / 500 /
600 / 700 for each of the 10 families; the mockups draw only 400 / 600 / 700. Dropping 500 would save 10 font files per
platform; it is the driver family's decision, listed as T5.

## 5. Colors

20 colors are drawn (plus the 4 off-scale ones of 2.1). All of them are schema colors; the table says which.

| Mockup value | Uses | Role (token) | What reads it |
|---|---|---|---|
| `#FFFFFF` | 338 | `background`, `surface`, `on_primary`, `on_success`… | pages, cards, sheets; text on solid fills |
| `#E9ECEF` | 312 | `border` (231 as a line), `badge` neutral, progress track, disabled button fill | every 1 px line; neutral badge; `progress.base.track` |
| `#000000` | 308 | `text`, `on_secondary`, `on_warning` | |
| `#616161` | 266 | `text_muted` | secondary lines |
| `#1862C5` | 103 | `primary_pressed` (text on `primary_subtle`) | soft buttons, selected chips, tile glyphs, quantity "1 ×" |
| `#E9F2FE` | 95 | `primary_subtle` | soft button, selected chip, tile, "mine" bubble |
| `#909090` | 86 | `border_strong` (62: field and outline border) and `text_disabled` (24) | inputs, outline buttons, disabled text |
| `#1E72E3` | 69 | `primary` | |
| `#00884F` | 65 | `success` | accept and advance buttons, switch on, dots, progress fill |
| `#F8F9FA` | 52 | `surface_alt` | muted card, board column, tile, ticket box |
| `#00713F` | 27 | `success_text` | text on `#D6FFF7` |
| `#DA3453` | 24 | `danger` | reject, counter of new orders, error borders |
| `#C42543` | 21 | `danger_text` | text on `#FEEDF0` and on white |
| `#D6FFF7` | 17 | `success_subtle` | |
| `#6B5300` | 17 | `warning_text` | text on `#FFF4CC` |
| `#FFF4CC` | 15 | `warning_subtle` | at-risk card tint, warning notice |
| `rgba(0,0,0,0.4)` | 11 | `overlay` | scrim of sheets and dialogs |
| `#CBCBCB` | 9 | `disabled` | switch track when off |
| `#FEEDF0` | 4 | `danger_subtle` | |
| `#FFC700` | 4 | `warning` | the "new / pending" status chip |

`info` is the brand color, as in the driver. `secondary` stays the neutral gray button color (`#EFEFEF`).

**Difference with the kit, not solved by a value (T4).** The kit and the mockups draw the **neutral outline button** (Cancel,
Share PDF, Clear, Load more, Edit, Open in Maps: 11 screens) with a `#909090` border and black text. The engine paints an outline
with one color, `ink`, for text and line, so the neutral outline paints a black line (the driver app has the same result).
Options: accept a black line (applied), or give `neutral.ink` `#909090` and lose the black text. Needs the owner; low risk.

## 6. Spacing, radius, border, motion, opacity

As the driver's `tokens.md` sections 1, 2, 3 and 8, with the verification of section 1 above:

- Space: none 0, xxs 2, xs 5, sm 10, md 15, lg 20, xl 30, xxl 40, xxxl 50; `layout.page_gutter` 20. The mockups use 0 / 2 / 5 / 10 /
  15 / 20 only: 15 between cards, 10 inside a card, 5 between a label and its field, 20 the gutter.
- Radius: sm 8 (buttons, fields, tiles, chips of rating), md 10 (cards, badges, notices: Identity), lg 15 (sheets, dialogs), full (pills,
  discs, counters, tabs). `xs`, `xl`, `xxl` are unused by the mockups and stay for a theme.
- Border: `thin` 1 everywhere; `thick` 2 for the focused code cell, the selected radio ring and the focus ring; the marker ring is the
  `map_marker` key 3.
- Motion: fast 120, base 200, slow 300, `ease_out`. Opacity: disabled 0.5, pressed 0.85. Reduced motion is respected.

## 7. Round 2 (2026-11-19, after the screens were built)

No token changed. Component values moved to match the mockups: `link.sizes.md.text` is `typography.label` (every text link is
14 / 600), `link.sizes.sm.text` is `body_sm`, `avatar.sizes.lg.size` is 64 (the user card), `chat_bubble.base.meta` and
`conversation_row.base.meta` are `body_sm`, `conversation_row.base.ended_color` is `text_muted`, `bill.base.row_color` is `text_muted`
and `row_gap` `xs`. The strong small text of T3 (12 / 1.5 / 600) also lives in `badge.shapes.plain.text`: six keys now carry that value.

## 8. What I did not verify

- The mockups were read from their inline styles by script, not rendered: a value set by a `<style>` rule is not counted (the
  `<helmet>` block holds only the font link, `a:hover` and `button` rules).
- Contrast ratios were computed from the hex values (WCAG relative luminance), not measured on a device.
- "Uses" count style declarations, not rendered elements: an element repeated by a list counts once per copy in the mockup.
- That `#4A4A4A` → `#616161` and the shadow snap are acceptable to the designer is not checked.
