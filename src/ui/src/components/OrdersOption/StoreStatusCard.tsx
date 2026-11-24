import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { useFormats } from '@/hooks/useFormats'
import { usePauseOrders } from '@ui'
import dayjs from '@/utils/dayjs'
import { nativeTextStyle, themePart, themeSpace } from '@/theme/helpers'
import { IconTile, OButton, OCard, OText } from '../shared'

/**
 * The store's state and "Pause orders" under the empty New list (OrdersEmpty mockup): the store, whether it is
 * open (and until when), paused or off, and the button that opens the pause sheet of the Stores tab. It reads the
 * stores' own hook (`usePauseOrders`, area `stores`); with no stores, an error or while they load it draws nothing.
 * With several stores it says how many accept orders and the button asks which to pause.
 */
export const StoreStatusCard = () => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const { time, dateTime } = useFormats()
  const pause = usePauseOrders()
  const card = themePart(theme, 'card', 'base')
  const slot = themePart(theme, 'empty_state', 'slots.action')
  const tile = themePart(theme, 'list_row', 'slots.tile')
  const styles = useMemo(() => StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    info: { flex: 1, minWidth: 0 },
    name: { ...nativeTextStyle(theme.native.tokens.typography.label), color: theme.native.tokens.color.text },
    status: nativeTextStyle(theme.native.tokens.typography.body_sm)
  }), [theme])

  if (pause.loading || pause.error || !pause.stores.length) return <>{pause.sheet}</>

  const clock = (date: Date) => time(date)
  /** A day-less time for today, the date and the time for another day. */
  const when = (date: Date) => dayjs(date).isSame(dayjs(), 'day') ? clock(date) : dateTime(date)

  const single = pause.stores.length === 1 ? pause.stores[0] : null
  const kind = single?.status.kind
  const name = single ? single.name : t('STORES', 'Stores')
  let text: string
  let color = 'text_muted'
  if (single) {
    const status: any = single.status
    if (status.kind === 'open') {
      color = 'success_text'
      text = status.closesAt ? t('STORE_OPEN_CLOSES_AT', 'Open · closes _time_').replace('_time_', clock(status.closesAt)) : t('STORE_OPEN', 'Open')
    } else if (status.kind === 'closed') {
      text = status.opensAt ? t('STORE_CLOSED_OPENS_AT', 'Closed · opens _when_').replace('_when_', when(status.opensAt)) : t('STORE_CLOSED', 'Closed')
    } else if (status.kind === 'paused') {
      color = 'warning_text'
      text = t('STORE_PAUSED_UNTIL', 'Paused · until _when_').replace('_when_', when(status.until))
    } else {
      color = 'danger_text'
      text = t('STORE_TURNED_OFF', 'Orders turned off')
    }
  } else {
    color = pause.openCount > 0 ? 'success_text' : 'warning_text'
    text = t('STORES_ACCEPTING_COUNT', '_count_ of _total_ stores accepting orders').replace('_count_', String(pause.openCount)).replace('_total_', String(pause.stores.length))
  }

  const canPauseNow = pause.openCount > 0 && !pause.isOffline
  const resumable = single && kind === 'paused' && !pause.isOffline

  return (
    <>
      <OCard look={card} testID='orders-store-status'>
        <View style={styles.row}>
          <IconTile icon='storefront-outline' size={tile.size} variant={tile.variant} />
          <View style={styles.info}>
            <OText style={styles.name} numberOfLines={1}>{name}</OText>
            <OText style={[styles.status, { color: theme.native.tokens.color[color] }]} numberOfLines={1}>{text}</OText>
          </View>
          {canPauseNow && (
            <OButton
              size={slot.size}
              appearance={slot.appearance}
              color={slot.color}
              text={t('PAUSE_ORDERS', 'Pause orders')}
              onClick={() => pause.openPauseSheet(single?.id)}
              testID='orders-pause'
            />
          )}
          {!canPauseNow && resumable && (
            <OButton
              size={slot.size}
              appearance={slot.appearance}
              color={slot.color}
              text={t('RESUME_NOW', 'Resume now')}
              onClick={() => pause.resume(single!.id)}
              testID='orders-resume'
            />
          )}
        </View>
      </OCard>
      {pause.sheet}
    </>
  )
}
