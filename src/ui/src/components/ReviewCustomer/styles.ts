import { StyleSheet } from 'react-native'

import { nativeBoxStyle, nativeTextStyle, reservedBorder, themeGutter, themeOpacity, themeSpace } from '@/theme/helpers'

/**
 * The customer review: the page (`components.review_form`: the space between its blocks, the blocks' titles) and its
 * five labelled buttons (`components.rating_scale`: height, corner, border, label, and the selected tint). `top` is
 * the safe-area inset over the top bar.
 */
export const reviewStyles = (theme: any, top: number) => {
  const form = theme.native.components.review_form.base
  const scale = theme.native.components.rating_scale.base
  // A level selected has no border (the tint is its mark): its room is kept so the row does not move.
  const selectedLook = { background: scale.selected_background, border: null }
  const ring = reservedBorder([scale, selectedLook])
  return StyleSheet.create({
    page: { flex: 1, paddingTop: top },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: themeGutter(theme),
      paddingBottom: themeSpace(theme, 'lg'),
      gap: form.gap
    },
    block: { gap: themeSpace(theme, 'sm') },
    // A group heading is the app's overline (`SectionTitle`); the block's own gap sits under it.
    heading: { marginBottom: 0 },
    // Five levels side by side, `gap` apart.
    scale: { flexDirection: 'row', gap: scale.gap },
    level: {
      flex: 1,
      height: scale.height,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: scale.radius,
      ...nativeBoxStyle(scale),
      ...ring(scale)
    },
    levelSelected: { ...nativeBoxStyle(selectedLook), ...ring(selectedLook, scale) },
    levelPressed: { opacity: themeOpacity(theme, 'pressed') },
    // The label has the whole button to itself: it never shares a width with the heaviest copy that holds its room.
    labelBox: { alignSelf: 'stretch' },
    label: { ...nativeTextStyle(scale.label), color: scale.label_color, textAlign: 'center' },
    labelSelected: { ...nativeTextStyle(scale.selected_label), color: scale.selected_color },
    // The quick comments wrap over several lines, `sm` apart both ways.
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: themeSpace(theme, 'sm') }
  })
}
