import { StyleSheet } from 'react-native'
import { nativeTextStyle, themeColor, themeGutter, themeOpacity, themeSpace } from '@/theme/helpers'

/**
 * The Messages list: its rows (`components.conversation_row`: a flat row with the app's line under it, as every
 * list of rows of the app) and its content on the page gutter. A row is the customer's initials, their name and
 * the time of the last message over the order's type and its timer, and its status with the count of unread messages
 * at its end. The list's skeleton (`MessageListSkeleton`) is drawn with the same styles, so the rows
 * load at their size and pitch.
 */
export const messageListStyles = (theme: any) => {
  const row = theme.native.components.conversation_row.base
  const list = theme.native.components.list_row.base
  const card = theme.native.components.order_card.base
  return StyleSheet.create({
    fill: { flex: 1 },
    list: { flex: 1, backgroundColor: themeColor(theme, 'background') },
    content: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'lg') },
    contentEmpty: { flexGrow: 1 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: row.gap,
      paddingVertical: row.padding_y,
      backgroundColor: list.background,
    },
    // The open conversation of a tablet's two panes: the page's tint, to the page's edges.
    selected: {
      backgroundColor: themeColor(theme, 'primary_subtle'),
      marginHorizontal: -themeGutter(theme),
      paddingHorizontal: themeGutter(theme),
    },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    info: { flex: 1, minWidth: 0, gap: themeSpace(theme, 'xxs') },
    // The name (with the role of who wrote last) and the time of the last message.
    head: { flexDirection: 'row', alignItems: 'baseline', gap: themeSpace(theme, 'sm') },
    name: { flex: 1, minWidth: 0 },
    nameText: { ...nativeTextStyle(row.name), color: row.name_color },
    time: { ...nativeTextStyle(row.meta), color: row.meta_color },
    // The second line, the order's type and, at its end, its timer; the third, the order's status and, at its end, the count of
    // unread messages (under the timer). The type never gives way; the timer is one line that can only be cut when the type
    // and it together pass the row (an absurd sentence); the status wraps over lines rather than being cut (a badge
    // never truncates, the server's own words can be long) and the count never wraps.
    line: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    meta: { ...nativeTextStyle(row.meta), color: row.meta_color, flexShrink: 0 },
    // The card band's own sentence (`order_card.base.time_text`), in the state's text colour; digits of one width so a
    // ticking second does not move the line.
    timer: { ...nativeTextStyle(card.time_text), flexShrink: 1, minWidth: 0, textAlign: 'right', fontVariant: ['tabular-nums'] },
    timerQuiet: { color: themeColor(theme, 'text_muted') },
    timerSuccess: { color: themeColor(theme, 'success_text') },
    timerWarning: { color: themeColor(theme, 'warning_text') },
    timerDanger: { color: themeColor(theme, 'danger_text') },
    status: { flexShrink: 1, minWidth: 0 },
    spacer: { flex: 1 },
    count: { flexShrink: 0 },
    // An ended order's row: all of it in the quiet color.
    endedText: { color: row.ended_color },
  })
}
