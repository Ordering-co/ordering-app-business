import { StyleSheet } from 'react-native'
import { nativeTextStyle, themeColor, themeSpace } from '@/theme/helpers'
import { closeButtonInset } from '../shared/styles'

/**
 * The new-order alert (`components.new_order_alert`, in the app's sheet `OBottomPopup`), as NewOrderAlert draws it: the
 * tile, the headline and the close button in one row; the orders, `sm` apart, each with its Accept at the end; the line
 * that says it rings and Mute; the button that opens the orders. A long headline or customer wraps inside its own
 * column, so it never pushes the tile, the close button or an Accept out.
 */
export const newOrderAlertStyles = (theme: any) => {
  const alert = theme.native.components.new_order_alert.base
  const card = theme.native.components.order_card.base
  const small = theme.native.tokens.typography.body_sm
  return StyleSheet.create({
    content: { gap: themeSpace(theme, 'md') },
    row: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    copy: { flex: 1, minWidth: 0 },
    title: { ...nativeTextStyle(alert.title), color: alert.title_color },
    text: { ...nativeTextStyle(alert.text), color: alert.text_color },
    // The close button's glyph (not its touch box) sits at the sheet's side padding.
    close: { alignSelf: 'flex-start', marginRight: -closeButtonInset(theme) },
    // The orders: each a row of its texts and its Accept, a line between two.
    lines: { gap: themeSpace(theme, 'sm') },
    line: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    lineTexts: { flex: 1, minWidth: 0 },
    // The order's lines read as the order card's: its name, its meta and its clock.
    lineTitle: { ...nativeTextStyle(card.name), color: card.name_color },
    lineDetail: { ...nativeTextStyle(card.meta), color: card.meta_color },
    clock: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs') },
    clockText: nativeTextStyle(card.time_text),
    clock_neutral: { color: card.meta_color },
    clock_success: { color: themeColor(theme, 'success_text') },
    clock_warning: { color: themeColor(theme, 'warning_text') },
    clock_danger: { color: themeColor(theme, 'danger_text') },
    accept: { width: alert.accept_width },
    more: { ...nativeTextStyle(small), color: themeColor(theme, 'text_muted') },
    // "Ringing until you open or accept them." and Mute.
    ringing: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    ringingText: { flex: 1, minWidth: 0, ...nativeTextStyle(small), color: themeColor(theme, 'text_muted') },
    mute: { justifyContent: 'center', paddingHorizontal: themeSpace(theme, 'sm') }
  })
}
