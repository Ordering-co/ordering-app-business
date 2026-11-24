import { StyleSheet } from 'react-native'
import { themeControlHeight, themeGutter, themeOpacity, themeSpace } from '@/theme/helpers'

/** The product options screen's styles: the page gutter at the sides, `md` between the blocks. Built with the theme. */
export const optionsStyles = (theme: any) => {
  const gutter = themeGutter(theme)
  const list = theme.native.components.list_row.base
  const rowHeight = themeControlHeight(theme, 'lg')
  return StyleSheet.create({
    screen: { flex: 1 },
    scroll: { flex: 1 },
    content: { paddingHorizontal: gutter, paddingBottom: themeSpace(theme, 'lg'), gap: themeSpace(theme, 'md') },
    sheetContent: { gap: themeSpace(theme, 'md') },
    section: { gap: themeSpace(theme, 'sm') },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    sectionTitle: { flex: 1 },
    // Rows go edge to edge inside the card, so the card holds only its sides' padding.
    group: { paddingVertical: 0, gap: 0 },
    availability: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    availabilityTexts: { flex: 1, minWidth: 0 },
    row: {
      minHeight: rowHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: themeSpace(theme, 'sm'),
      paddingVertical: themeSpace(theme, 'xs'),
    },
    rowDivider: list.divider ? { borderBottomWidth: list.divider.borderWidth, borderBottomColor: list.divider.borderColor } : {},
    rowTexts: { flex: 1, minWidth: 0 },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    sheetBody: { flexShrink: 1 },
    skeleton: { gap: themeSpace(theme, 'sm') },
    skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm'), minHeight: rowHeight },
    skeletonGrow: { flex: 1 },
    groupsRow: { gap: 0 },
  })
}
