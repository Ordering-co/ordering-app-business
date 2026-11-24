import { StyleSheet } from 'react-native'

import { nativeShadowStyle, themeColor, themeGutter, themeIconSize, themeRadius, themeSpace } from '@/theme/helpers'

/**
 * The order's map: the screen is the map and a card over its bottom (`components.sheet`'s look: the sheet's radius on top,
 * its padding, `md` between its pieces) and one floating back button over its top left. What the library paints (tiles,
 * labels) is not themed.
 */
export const mapStyles = (theme: any, top: number, bottom: number) => {
  const sheet = theme.native.components.sheet.base
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: themeColor(theme, 'surface_alt') },
    fill: { flex: 1 },
    // A round button over the tiles: its own floating shadow (the map's), the mockup's 44 white disc.
    backShadow: nativeShadowStyle(theme.native.components.map_marker.base.shadow),
    // The strip of the screen's left edge that hears the swipe back (over the map, under the back button).
    swipeEdge: { position: 'absolute', top: 0, bottom: 0, left: 0, width: themeSpace(theme, 'lg') },
    back: { position: 'absolute', top: top + themeSpace(theme, 'sm'), left: themeSpace(theme, 'sm') },
    // The card's bottom keeps the system space under its buttons.
    card: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      gap: themeSpace(theme, 'md'),
      padding: sheet.padding,
      paddingBottom: sheet.padding + bottom,
      backgroundColor: sheet.background,
      borderTopLeftRadius: sheet.radius,
      borderTopRightRadius: sheet.radius,
      ...nativeShadowStyle(sheet.shadow)
    },
    who: { gap: 0 },
    buttons: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
    grow: { flex: 1 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: themeGutter(theme) },
    // The sheet of maps apps.
    sheet: { gap: themeSpace(theme, 'sm') },
    spinner: { alignSelf: 'center' },
    appIcon: {
      width: themeIconSize(theme, 'lg'),
      height: themeIconSize(theme, 'lg'),
      borderRadius: themeRadius(theme, 'xs')
    }
  })
}
