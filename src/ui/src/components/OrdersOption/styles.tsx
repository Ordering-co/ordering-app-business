import { StyleSheet } from 'react-native'
import { themeGutter, themeSpace } from '@/theme/helpers'

/** The orders tab: the page's body, its tabs, the list and the History filter row. */
export const ordersOptionStyles = (theme: any) => StyleSheet.create({
  // The state rows (offline, filters on), the tabs and the list, `md` apart, under the header's own `md`.
  body: { flex: 1, gap: themeSpace(theme, 'md') },
  // What sits on the page gutter outside the scroll (the notices, the tabs); the list carries it on its content.
  gutter: { paddingHorizontal: themeGutter(theme) },
  list: { flex: 1 },
  // The rows (titles and cards) space themselves; what is around them (the chips, the empty state, Load more) is `lg` apart.
  listContent: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'lg'), flexGrow: 1 },
  footer: { paddingTop: themeSpace(theme, 'lg') },
  empty: { gap: themeSpace(theme, 'lg'), flexGrow: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: themeSpace(theme, 'xs') }
})
