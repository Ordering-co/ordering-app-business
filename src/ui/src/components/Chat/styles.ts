import { StyleSheet } from 'react-native'
import {
  barBottomSpace,
  themeColor,
  themeGutter,
  themeOpacity,
  themePart,
  themeRadius,
  themeSpace,
} from '@/theme/helpers'

/** The signature pad's drawing area (pt): the canvas is the library's own (out of scope). */
export const SIGNATURE_PAD_HEIGHT = 120

/**
 * The chat's styles, the driver's arrangement: the composer holds who receives the message (a row of chips), the quick
 * messages and the buttons, the field and its send button; the ended order's notice and the sheet of a message's options. The chat's skeleton (`ChatMessageSkeleton`) is drawn with the same ones, so the chat
 * loads at its size.
 */
export const chatStyles = (theme: any, bottom: number) => {
  const bubble = theme.native.components.chat_bubble.base
  const preview = themePart(theme, 'button', 'sizes.sm.icon_size')
  const gutter = themeGutter(theme)
  return StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: themeColor(theme, 'background') },
    // A row of the composer that scrolls sideways (who receives the message, the quick messages): it reaches the screen's edges
    // (the toolbar's page gutter is taken back) and its content starts on the gutter again.
    row: { flexGrow: 0, marginHorizontal: -gutter },
    // "Send to" and its chips, in one row inside the composer, as the driver's.
    recipients: { alignItems: 'center', gap: themeSpace(theme, 'sm'), paddingHorizontal: gutter },
    quickMessages: { alignItems: 'center', gap: themeSpace(theme, 'sm'), paddingHorizontal: gutter },
    // The composer under the line: the page sides, `sm` over it, the system's navigation area once under it (`barBottomSpace`).
    toolbar: {
      paddingHorizontal: gutter,
      paddingTop: themeSpace(theme, 'sm'),
      gap: themeSpace(theme, 'sm'),
      backgroundColor: bubble.composer_background,
    },
    // Never less than a bar's own padding, so on Android (where the activity pads the screens and the inset reads 0) the
    // composer keeps the gap the keyboard-up one has.
    toolbarInset: { paddingBottom: Math.max(barBottomSpace(theme, bottom), theme.native.components.bottom_bar.base.padding) },
    // With the keyboard up the composer ends over it as a pinned bar does (`bottom_bar.base.padding`, the same
    // gap on every screen with a field: the bar, the sheets, the search); down, it clears the system's inset.
    toolbarKeyboard: { paddingBottom: theme.native.components.bottom_bar.base.padding },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    // The signature and image buttons, the field and the send button, in one row (the driver's `xs` apart).
    primary: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs') },
    field: { flex: 1 },
    preview: { width: preview, height: preview, borderRadius: themeRadius(theme, 'xs') },
    removeImage: {
      position: 'absolute',
      top: -themeSpace(theme, 'xs'),
      right: -themeSpace(theme, 'xs'),
      backgroundColor: themeColor(theme, 'surface'),
      borderRadius: themeRadius(theme, 'full', { fixed: true }),
    },
    signature: { height: SIGNATURE_PAD_HEIGHT, paddingVertical: themeSpace(theme, 'xs') },
    clearSignature: { position: 'absolute', top: themeSpace(theme, 'xs'), right: 0 },
    // The sheet owns its sides and bottom (`OBottomPopup padded`): only the space between its pieces is here.
    sheet: { gap: themeSpace(theme, 'sm') },
  })
}
