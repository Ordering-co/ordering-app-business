import React from 'react'
import { View } from 'react-native'

import { Icon, OText } from '../shared'
import { orderBandVariant } from '../shared/orderStates'
import type { OrderSection } from '../OrdersOption/orderStatusGroups'
import { bandTime, cardTimeTicks, clockToneOf, type CardFormats } from './orderTimes'
import { useNow } from './useNow'

interface Props {
  order: any
  section: OrderSection
  t: (key: string, fallback?: string) => string
  formats: CardFormats
  /** The status written at the band's start; none leaves the time alone. */
  status?: string
  /** Whether the band writes its time (History can hide it, `orders.date`). */
  showTime?: boolean
  /** The clock time beside the elapsed time (the device's choice or the theme's); a preorder ignores it. */
  absolute: boolean
  /** The card's styles: `band`, `bandStatus`, `bandTime`, and the paint of each soft variant (`band_*`, `bandInk_*`). */
  styles: Record<string, any>
  /** Prefix of the band's test ids: `-band`, `-status`, `-clock`. */
  testID: string
}

/** The sections whose orders wait for something: only there the time's state can recolour the band. */
const COUNTS: OrderSection[] = ['new', 'preparing', 'ready']

/**
 * The band across the top of an order card: the status at its start (as many lines as its words need, never cut) and the time
 * at its end ("Waiting 02:14"), on the soft colour of the status, or of the time's state when the order is at risk or late.
 * The only part of the card that subscribes to the one-second ticker, and only while its time counts seconds: the card itself
 * renders when its data changes and this alone once a second. With neither a status nor a time there is no band.
 */
export const OrderBand = React.memo(({ order, section, t, formats, status, showTime = true, absolute, styles, testID }: Props) => {
  const now = useNow(showTime && cardTimeTicks(order, section))
  const time = showTime ? bandTime(order, section, now, t, formats, absolute) : null
  if (!status && !time) return null
  // An order the API says is at risk or delayed is painted so even when its time cannot be written.
  const tone = COUNTS.includes(section) ? (time?.state ?? clockToneOf(section, order?.time_status)) : null
  const variant = orderBandVariant(order?.status, tone)
  const ink = styles[`bandInk_${variant}`]
  return (
    <View style={[styles.band, styles[`band_${variant}`]]} testID={`${testID}-band`}>
      {!!status && (
        <View style={styles.bandStart}>
          {Number(order?.status) === 13 && <Icon name='calendar-outline' size='sm' color={ink.color} />}
          <OText style={[styles.bandStatus, ink]} testID={`${testID}-status`}>{status}</OText>
        </View>
      )}
      {!!time && <OText style={[status ? styles.bandTime : styles.bandTimeAlone, ink]} testID={`${testID}-clock`}>{time.text}</OText>}
    </View>
  )
})
