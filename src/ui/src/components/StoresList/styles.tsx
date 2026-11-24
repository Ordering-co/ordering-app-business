import { StyleSheet } from 'react-native'
import { themeControlHeight, themeGutter, themeSpace } from '@/theme/helpers'

/** The stores list's styles: the gutter of the page on the list's sides, `md` between the cards. Built with the theme. */
export const storesListStyles = (theme: any) => {
  const gutter = themeGutter(theme)
  return StyleSheet.create({
    screen: { flex: 1 },
    list: { flex: 1 },
    content: {
      flexGrow: 1,
      paddingHorizontal: gutter,
      paddingBottom: themeSpace(theme, 'lg'),
      gap: themeSpace(theme, 'md'),
    },
    search: { paddingHorizontal: gutter, paddingBottom: themeSpace(theme, 'sm') },
    notice: { paddingBottom: themeSpace(theme, 'xs') },
    link: { alignSelf: 'center', minHeight: themeControlHeight(theme, 'md'), justifyContent: 'center' },
    more: { paddingVertical: themeSpace(theme, 'md'), alignItems: 'center' },
    skeletons: { gap: themeSpace(theme, 'md') },
    skeletonCard: { gap: themeSpace(theme, 'sm') },
    skeletonTop: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    skeletonTexts: { flex: 1, gap: themeSpace(theme, 'xs') },
    skeletonGrow: { flex: 1 },
  })
}
