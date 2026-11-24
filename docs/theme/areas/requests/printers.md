# Requests of the `printers` area

## Schema keys

None: `item_card`, `ticket_paper`, `progress`, `choice`, `icon_tile`, `list_row`, `empty_state`, `switch`, `stepper`, `chip` and `bottom_bar` carry everything the screens draw.

One thing the area report asked for that the schema does not have, and the build works without:

| Key | Value | Why | Mockup |
|---|---|---|---|
| `printers.test_print` (visibility) | true | Not in the schema ("a diagnostic the operation needs"): the Test print / Reconnect buttons are always drawn. | Printers |

## Guard exceptions (`theme-exceptions.json`, not mine to edit)

`pnpm theme:guard` reports 23 findings in this area's files, none a screen's look. Each needs an entry:

| File (regex) | Category | Value | Reason |
|---|---|---|---|
| `src/printing/(usePrinterCommands\.tsx\|useGenericTicketCommands\.ts\|utils\.tsx)$` | `font_size` | all (21 lines) | The printed ticket's own font sizes for the Star and Epson commands (printer units, per platform). These files are the original app's print path moved without a change (commit `8bbf275` restored it); the sizes are the ticket's, not the screen's |
| `TicketPreview/TicketPaper\.tsx$` | `font_family` | `Platform.select(` | The paper's letters are the platform's fixed-pitch font (`docs/theme/tokens.md` 2.5: recorded exception; the file is `TicketPreview/TicketPaper.tsx`, not `shared/TicketPaper`) |
| `TicketPreview/PrintingHost\.tsx$` | `opacity` | `0` | The canvas that draws a Star TSP100's ticket picture is a web view that must exist but not show: invisible by function, not a design opacity (as the OTP field's) |

## Backend

| Need | Why |
|---|---|
| Nothing new | Printing is local to the device (AsyncStorage), as before. The mockup's "Offline" state is the last print result, not a live check: no service is asked. |

## Libraries no longer imported by this area (for the dependency owner)

`react-native-select-dropdown` (the two dropdowns of the old printer form), `toggle-switch-react-native` (the old settings), `react-native-vector-icons` AntDesign / Feather / FontAwesome / SimpleLineIcons in this area (all through `Icon` now). `react-native-html-to-pdf` and `react-native-print` stay (`src/printing/document.ts`); `react-native-canvas` stays (the TSP100 picture, mounted only when a TSP100 is saved).
