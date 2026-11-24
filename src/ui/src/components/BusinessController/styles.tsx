import { StyleSheet } from 'react-native'
import { nativeTextStyle, themeOpacity, themeRadius, themeSpace } from '@/theme/helpers'

/**
 * The store card's styles (`StoreCard`): a `components.card` (its own padding, border and radius come from the
 * card), a row that opens the menu, a line, and the status row. Built with the theme, never at module level.
 */
export const storeCardStyles = (theme: any) => {
  const dot = theme.native.components.badge.base
  return StyleSheet.create({
    // The card's own gap (card padding, `md`; gap between its three parts, `sm`).
    card: { gap: themeSpace(theme, 'sm') },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    top: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    texts: { flex: 1, minWidth: 0 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    statusSide: { flex: 1, minWidth: 0 },
    statusLine: { flexDirection: 'row', alignItems: 'center', gap: dot.dot_gap },
    // The store's state line is the badge's plain shape (`badge.shapes.plain.text`).
    statusText: { flexShrink: 1, ...nativeTextStyle(theme.native.components.badge.shapes.plain.text) },
    dot: { width: dot.dot_size, height: dot.dot_size, borderRadius: themeRadius(theme, 'full', { fixed: true }) },
    label: { flexShrink: 0 },
    // The switch's touch box reaches `xs` into the card's gap, so the glyph, not the box, sits at the card's end.
    switchBox: { marginLeft: -themeSpace(theme, 'xs') },
  })
}
