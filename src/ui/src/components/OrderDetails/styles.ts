import { StyleSheet } from 'react-native'
import {
  nativeTextStyle,
  themeColor,
  themeControlHeight,
  themeGutter,
  themeOpacity,
  themePart,
  themeRadius,
  themeSpace
} from '@/theme/helpers'

/**
 * The look of the order details' pieces, all of it from the theme (`tokens` through the helpers and
 * `components.order_details`). Built inside the components (`useMemo(() => detailsStyles(theme), [theme])`).
 */
export const detailsStyles = (theme: any) => {
  const details = themePart(theme, 'order_details', 'base')
  const bill = themePart(theme, 'bill', 'base')
  const target = themeControlHeight(theme, 'md')
  const labelLine = nativeTextStyle(theme.native.tokens.typography.label).lineHeight
  // How far the checkbox's touch box reaches over and under the product's first line.
  const checkReach = Math.min(0, (labelLine - target) / 2)
  const sm = themeSpace(theme, 'sm')
  const xs = themeSpace(theme, 'xs')
  const md = themeSpace(theme, 'md')
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: themeColor(theme, 'background') },
    scroll: { flex: 1 },
    // The page: the gutter at the sides, `md` between the blocks (the mockups' 15); the space under the bar is the bar's own.
    content: { paddingHorizontal: themeGutter(theme), paddingTop: themeSpace(theme, 'none'), paddingBottom: themeSpace(theme, 'lg'), gap: md },
    centered: { flex: 1, justifyContent: 'center', paddingHorizontal: themeGutter(theme), gap: md },
    spacer: { flex: 1 },

    // Chips row.
    chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: xs, rowGap: xs },
    chipShrink: { flexShrink: 1, maxWidth: '100%' },
    clock: { flexDirection: 'row', alignItems: 'center', gap: xs },
    clockEnd: { marginLeft: 'auto' },
    clockText: { ...nativeTextStyle(details.subtitle) },
    handoffLabel: { ...nativeTextStyle(details.subtitle), color: themeColor(theme, 'primary_pressed') },

    // A row with a start, a growing middle and an end.
    row: { flexDirection: 'row', alignItems: 'center', gap: sm },
    rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: sm },
    grow: { flex: 1, minWidth: 0 },
    pressed: { opacity: themeOpacity(theme, 'pressed') },

    // The customer's card.
    cardBody: { gap: sm },
    ratingBox: { flexDirection: 'row', alignItems: 'center', gap: xs },
    facts: { gap: xs },
    notes: { gap: xs },

    // Products.
    productsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: sm },
    product: { flexDirection: 'row', alignItems: 'flex-start', gap: sm },
    productQty: { minWidth: themeSpace(theme, 'xl'), color: details.quantity_color },
    productTexts: { flex: 1, minWidth: 0, gap: xs },
    productNote: {
      alignSelf: 'flex-start',
      borderRadius: themeRadius(theme, 'sm'),
      backgroundColor: themeColor(theme, 'warning_subtle'),
      paddingHorizontal: sm,
      paddingVertical: xs
    },
    productNoteText: { color: themeColor(theme, 'warning_text') },
    // The 44 target's own padding hangs over the card's: the box itself stands at the card's edge (OrderPreparing).
    // The 44 touch box is centered on the product's first line (its text is `label`, `labelLine` tall), not on the row: the box
    // reaches over and under the line, and takes no room of its own.
    checkTarget: { minWidth: target, minHeight: target, alignItems: 'center', justifyContent: 'center', marginLeft: -sm, marginVertical: checkReach },
    done: { color: themeColor(theme, 'text_muted'), textDecorationLine: 'line-through' },
    lineGap: { gap: sm },

    // Money.
    totalRow: { flexDirection: 'row', alignItems: 'center', gap: sm },
    // The badge's own box is `alignSelf: flex-start`: in the total row it must stand on the amount's centre line.
    totalChip: { alignSelf: 'center' },
    billRows: { gap: bill.row_gap },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', gap: sm },
    billRowLabel: { flex: 1, ...nativeTextStyle(bill.row), color: bill.row_color },
    billRowAmount: { ...nativeTextStyle(bill.row), color: bill.row_color },
    totalAmount: { ...nativeTextStyle(bill.total), color: bill.total_color },
    totalLine: { marginVertical: xs },
    paymentLabel: { flex: 1, color: themeColor(theme, 'text_muted') },

    // A folded row.
    fold: { minHeight: details.folded_min_height, flexDirection: 'row', alignItems: 'center', gap: sm, paddingHorizontal: md, paddingVertical: xs },
    foldCard: { gap: themeSpace(theme, 'none') },
    // The body under the header's line carries the card's inner padding on all sides (`md`), the top one too.
    foldBody: { gap: sm, padding: md },
    detailLine: { flexDirection: 'row', justifyContent: 'space-between', gap: sm },
    detailLabel: { flex: 1, color: themeColor(theme, 'text_muted') },
    detailValue: { flex: 1, textAlign: 'right' },
    subtitle: { ...nativeTextStyle(details.subtitle), color: themeColor(theme, 'text') },
    link: { color: themeColor(theme, 'primary_text') },

    // The time card and the progress under it.
    figure: { ...nativeTextStyle(details.figure) },
    lateFigure: { color: themeColor(theme, 'danger_text') },
    promised: { color: themeColor(theme, 'text_muted') },

    // The timeline.
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: sm, minHeight: target },
    stepTexts: { flex: 1 },

    // The review card's stars.
    stars: { flexDirection: 'row', alignItems: 'center' },
    star: { width: target, height: target, alignItems: 'center', justifyContent: 'center' },

    // The skeleton.
    skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: sm },
    skeletonColumn: { flex: 1, gap: xs }
  })
}
