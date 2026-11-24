import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { detailsStyles } from './styles'
import { orderStage, orderTypeLabel, statusLabel, type OrderStage } from './orderStages'
import { clockText, minutesBetween, statusMoments } from './orderTimes'
import { useNow } from './useNow'
import { themeVisible } from '@/theme/helpers'
import { Icon, OBadge, OText } from '../shared'
import { orderStatusVariant } from '../shared/orderStates'
import { orderTypeVariant } from '../shared/orderTypeVariant'
import type { OrderSection } from '../OrdersOption/orderStatusGroups'
import { clockToneOf, formatClock } from '../PreviousOrders/orderTimes'

import { useLanguage } from '@components'
import { useFormats } from '@/hooks/useFormats'

type ClockTone = 'success_text' | 'warning_text' | 'danger_text' | 'text_muted'

interface Props {
  order: any
  stage?: OrderStage
}

/** Does the status row count time (so the screen needs a ticking clock)? */
export const countsTime = (stage: OrderStage): boolean => stage === 'new' || stage === 'ready_handoff'

/**
 * The chips row: the status (its color is its meaning), the order's type and, at the end, the time that matters at
 * this stage: how long a new order has waited, how long a ready one has waited for its customer, how long a
 * finished one took, or when a pre-order is for. The row wraps (a long status name, a long time) and the clock stays at
 * its end; a status longer than the row is cut with an ellipsis. Waiting is colored by the order's `time_status`.
 */
export const StatusRow = ({ order, stage = orderStage(order) }: Props) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const { dateTime } = useFormats()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  // Only this row ticks: the cards of the page do not render again every second.
  const now = useNow(countsTime(stage))
  const moments = useMemo(() => statusMoments(order), [order])

  // A waiting clock is colored by the one rule of the orders list's card (`clockToneOf`, harmony H10): a new order is amber
  // unless it is late (red), a ready one waits muted unless it is at risk or late.
  const toneOf = (section: OrderSection): ClockTone => {
    const state = clockToneOf(section, order?.time_status)
    return state ? `${state}_text` : 'text_muted'
  }
  let clock: { text: string, tone: ClockTone, icon: string } | null = null
  if (stage === 'new' && moments.createdAt !== null) {
    clock = { text: t('ORDER_WAITING', 'Waiting _time_').replace('_time_', clockText(now - moments.createdAt, t)), tone: toneOf('new'), icon: 'time-outline' }
  } else if (stage === 'ready_handoff') {
    const readyAt = moments.at(4)
    if (readyAt !== null) clock = { text: t('ORDER_WAITING', 'Waiting _time_').replace('_time_', clockText(now - readyAt, t)), tone: toneOf('ready'), icon: 'time-outline' }
  } else if (stage === 'done') {
    const took = minutesBetween(moments.createdAt, moments.firstOf([1, 11, 15]))
    // Under an hour in minutes (the mockup's "Took 28 min"); longer as the orders list writes a duration ("Took 1d 6h").
    if (took !== null) {
      clock = {
        text: took < 60
          ? t('TOOK_MINUTES', 'Took _min_ min').replace('_min_', String(took))
          : t('TOOK_DURATION', 'Took _time_').replace('_time_', formatClock(took * 60, t)),
        tone: 'text_muted',
        icon: ''
      }
    }
  } else if (stage === 'scheduled' && (order?.delivery_datetime_utc ?? order?.delivery_datetime)) {
    const date = order?.delivery_datetime_utc ?? order?.delivery_datetime
    clock = { text: dateTime(date, { utc: !!order?.delivery_datetime_utc }), tone: 'text_muted', icon: 'calendar-outline' }
  }

  return (
    <View style={styles.chips} testID='status-row'>
      <View style={styles.chipShrink}>
        <OBadge variant={orderStatusVariant(order?.status)} testID='status-chip'>{statusLabel(order?.status, t, order)}</OBadge>
      </View>
      {themeVisible(theme, 'confirmation.order.type') && (
        <OBadge variant={orderTypeVariant(order?.delivery_type)} testID='type-chip'>{orderTypeLabel(t, order?.delivery_type)}</OBadge>
      )}
      {!!clock && (
        <View style={[styles.clock, styles.clockEnd]} testID='status-clock'>
          {!!clock.icon && <Icon name={clock.icon} size='sm' color={clock.tone} />}
          <OText style={styles.clockText} color={clock.tone}>{clock.text}</OText>
        </View>
      )}
    </View>
  )
}
