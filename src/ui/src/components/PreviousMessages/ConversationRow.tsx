import React from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { OAvatar, OBadge, OText } from '../shared'
import type { BadgeVariant } from '../shared/OBadge'
import { sectionOf } from '../OrdersOption/orderStatusGroups'
import { bandTime, cardTimeTicks } from '../PreviousOrders/orderTimes'
import { useNow } from '../PreviousOrders/useNow'
import { useFormats } from '@/hooks/useFormats'
import { unreadMessagesText } from '../../../../context/UnreadMessagesContext'
import type { messageListStyles } from './styles'

/**
 * A conversation of the Messages list (`components.conversation_row`, its look of a list row, laid out as the driver's):
 * the customer's initials in a disc (a quiet one once the order has ended); the order's number before their name,
 * "#1053 · James Carter" (the owner's choice, 2026-11-23: the number is the reference; with "(Driver)" or "(Business)"
 * when the last message came from another role), in bold while the conversation has unread messages, and the time of the
 * last message at the end of that line. The second line is the order's type and, at its end, the order's timer, the very
 * sentence and state the order card's band writes ("Waiting 02:14", "Late 04:12", in the state's colour; it ticks while
 * the order waits and an ended order has none). The third line is the order's status (a badge that wraps rather than
 * being cut) and, at its end, the count of unread messages (`conversation_row.slots.unread`), under the timer. The
 * whole row opens the chat. An ended order's row is all in the quiet color.
 */
export type ConversationRowProps = {
  order: any
  /** The customer's name (or the word "Customer" when the project hides the contact). */
  title: string
  /** The order's number as the app writes it short, `#1053`: it goes before the name, the reference of the conversation. */
  number?: string
  /** The role of who wrote last when it is not the customer: "Driver". */
  tag?: string
  /** The order's type, `Delivery`. */
  meta: string
  /** The time (or the day) of the last message. */
  time?: string
  /** The order's status as the app names it, and its badge variant. */
  status?: string
  statusVariant?: BadgeVariant
  unread: number
  ended: boolean
  /** The conversation open in a tablet's second pane. */
  selected?: boolean
  /** `visibility.messages.unread_badge`. */
  showUnread: boolean
  onPress: (order: any) => void
  styles: ReturnType<typeof messageListStyles>
}

/** The row's style of a timer in each state of the order's time (the card band's states). */
const TIMER_STATE = { success: 'timerSuccess', warning: 'timerWarning', danger: 'timerDanger' } as const

type RowTimerProps = Pick<ConversationRowProps, 'order' | 'ended' | 'styles'>

/**
 * The order's timer at the row's end, as the order card's band writes it (`bandTime`). It is the only part of the row that
 * follows the one-second ticker, and only while its sentence counts seconds. An ended order has none (History's band writes
 * the day, which the row's own time already says).
 */
const RowTimer = ({ order, ended, styles }: RowTimerProps) => {
  const [, t] = useLanguage()
  const formats = useFormats()
  const section = sectionOf(order?.status)
  const now = useNow(!ended && cardTimeTicks(order, section))
  const time = ended || section === 'history' ? null : bandTime(order, section, now, t, formats)
  if (!time) return null
  return (
    <OText
      style={[styles.timer, time.state ? styles[TIMER_STATE[time.state]] : styles.timerQuiet]}
      numberOfLines={1}
      testID='message-timer'
    >
      {time.text}
    </OText>
  )
}

export const ConversationRow = React.memo(({
  order, title, number, tag, meta, time, status, statusVariant, unread, ended, selected, showUnread, onPress, styles
}: ConversationRowProps) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const slots = theme.native.components.conversation_row.slots
  const quiet = ended ? styles.endedText : undefined
  return (
    <Pressable
      testID='message-row'
      accessibilityRole='button'
      accessibilityState={{ selected: !!selected }}
      onPress={() => onPress(order)}
      style={({ pressed }) => [styles.row, selected && styles.selected, pressed && styles.pressed]}
    >
      <OAvatar size={slots.avatar.size} name={title} muted={ended} testID='message-avatar' />
      <View style={styles.info}>
        <View style={styles.head} testID='message-head'>
          <View style={styles.name}>
            <OText
              style={[styles.nameText, quiet]}
              weight={showUnread && unread > 0 ? 'bold' : undefined}
              numberOfLines={1}
              testID='message-title'
            >
              {number ? `${number} · ${title}` : title}
              {!!tag && <OText preset='body_sm' color={ended ? undefined : 'text_muted'} style={quiet}>{` (${tag})`}</OText>}
            </OText>
          </View>
          {!!time && <OText style={[styles.time, quiet]} testID='message-time'>{time}</OText>}
        </View>
        <View style={styles.line} testID='message-type-line'>
          <OText style={[styles.meta, quiet]} numberOfLines={1} testID='message-meta'>{meta}</OText>
          <View style={styles.spacer} />
          <RowTimer order={order} ended={ended} styles={styles} />
        </View>
        {(!!status || (showUnread && unread > 0)) && (
          <View style={styles.line} testID='message-status-line'>
            {!!status && (
              <OBadge variant={statusVariant} wrap style={styles.status} testID='message-status'>
                {status}
              </OBadge>
            )}
            <View style={styles.spacer} />
            {showUnread && unread > 0 && (
              <View accessible accessibilityLabel={unreadMessagesText(t, unread)} style={styles.count}>
                <OBadge count variant={slots.unread.variant} size={slots.unread.size} testID='message-unread'>
                  {unread}
                </OBadge>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  )
})
