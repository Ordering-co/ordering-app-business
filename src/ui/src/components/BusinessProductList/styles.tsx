import { StyleSheet } from 'react-native'
import { themeGutter, themeOpacity, themeSpace } from '@/theme/helpers'

/** The menu's styles. Built with the theme; the row's look is `components.menu_row` (its height, name and price). */
export const menuStyles = (theme: any, bleed = 0) => {
  const gutter = themeGutter(theme)
  const row = theme.native.components.menu_row
  const list = theme.native.components.list_row.base
  return StyleSheet.create({
    screen: { flex: 1 },
    body: { flex: 1, paddingHorizontal: gutter, gap: themeSpace(theme, 'md') },
    flex: { flex: 1 },
    chipsBlock: { gap: themeSpace(theme, 'sm') },
    // The chips run to the window's edge on a tablet held upright (`bleed`), not to the 600 column's: no mid-word clip.
    chips: { flexDirection: 'row', gap: themeSpace(theme, 'sm'), paddingRight: gutter + bleed },
    chipsScroll: { flexGrow: 0, marginHorizontal: -(gutter + bleed), paddingHorizontal: gutter + bleed },
    children: { flexDirection: 'row', gap: themeSpace(theme, 'sm'), paddingRight: gutter + bleed },
    categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    categoryTexts: { flex: 1, minWidth: 0 },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: themeSpace(theme, 'sm'),
      paddingTop: themeSpace(theme, 'md'),
      paddingBottom: themeSpace(theme, 'xs'),
    },
    listContent: { paddingBottom: themeSpace(theme, 'lg') },
    row: {
      minHeight: row.base.min_height,
      flexDirection: 'row',
      alignItems: 'center',
      gap: themeSpace(theme, 'sm'),
      paddingVertical: themeSpace(theme, 'sm'),
      ...(list.divider && { borderBottomWidth: list.divider.borderWidth, borderBottomColor: list.divider.borderColor }),
    },
    rowOpen: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'md') },
    rowTexts: { flex: 1, minWidth: 0 },
    slop: { top: themeSpace(theme, 'xs'), bottom: themeSpace(theme, 'xs') } as any,
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    footer: { alignItems: 'center', paddingVertical: themeSpace(theme, 'md') },
    search: { gap: themeSpace(theme, 'md') },
    skeletonRow: {
      minHeight: row.base.min_height,
      flexDirection: 'row',
      alignItems: 'center',
      gap: themeSpace(theme, 'md'),
      paddingVertical: themeSpace(theme, 'sm'),
    },
    skeletonTexts: { flex: 1, gap: themeSpace(theme, 'xs') },
  })
}
