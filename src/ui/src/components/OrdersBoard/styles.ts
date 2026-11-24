import { StyleSheet } from 'react-native'
import { nativeTextStyle, themeBorderWidth, themeColor, themeGutter, themeSpace } from '@/theme/helpers'

/**
 * The tablet board (`components.board`, TabletBoard): the header, the columns, `gap` apart, each a scrolling list of
 * cards on `column_background`, and the order's details as a panel on the right, over the columns. Every size is the
 * theme's: the board's own (columns, gap, padding, radius, title) and the screen's (`detail_pane_width`).
 */
export const boardStyles = (theme: any, detailWidth: number) => {
  const board = theme.native.components.board.base
  const header = theme.native.components.header.base
  return StyleSheet.create({
    page: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      height: header.height,
      paddingHorizontal: themeGutter(theme),
      gap: header.gap,
      marginBottom: themeSpace(theme, 'xs')
    },
    title: { ...nativeTextStyle(header.title), color: header.color },
    spacer: { flex: 1 },
    // The store filter's chip sits on the header's middle line, as the title and the buttons do.
    store: { alignSelf: 'center' },
    // The last button's glyph (not its touch box) sits on the page gutter, as in every header.
    actions: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs') },
    notices: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'sm') },
    body: { flex: 1 },
    // The columns fill the page under the header; the page's gutter is their outer space.
    columns: {
      flex: 1,
      flexDirection: 'row',
      gap: board.gap,
      paddingHorizontal: themeGutter(theme),
      paddingBottom: themeGutter(theme)
    },
    column: {
      flex: 1,
      minWidth: 0,
      borderRadius: board.column_radius,
      backgroundColor: board.column_background,
      padding: board.column_padding,
      gap: board.gap
    },
    columnHead: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs') },
    // The stage's name is the group heading of the phone's list: the same `SectionTitle` (the overline), no space under it here.
    columnTitle: { marginBottom: 0, flexShrink: 1 },
    columnScroll: { flex: 1 },
    columnContent: { flexGrow: 1 },
    columnEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: themeSpace(theme, 'md') },
    // The order's details: a panel at the right of the body, over the columns, with a line on its left.
    panel: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: detailWidth,
      backgroundColor: themeColor(theme, 'background'),
      borderLeftWidth: themeBorderWidth(theme, 'thin'),
      borderLeftColor: themeColor(theme, 'border')
    },
    // A single list (the search results, History) in the content column of a screen.
    results: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'lg'), flexGrow: 1 },
    chips: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
    listHeader: { paddingBottom: themeSpace(theme, 'lg') },
    footer: { paddingTop: themeSpace(theme, 'lg') }
  })
}
