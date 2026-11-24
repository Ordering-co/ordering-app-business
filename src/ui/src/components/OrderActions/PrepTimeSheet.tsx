import React, { useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'
import dayjs from 'dayjs'

import { useLanguage } from '@components'
import { FilterChip, OButton, OCard, OText, SheetFooter } from '../shared'
import { PREP_TIME } from './constants'
import { adjustedTotal, canAdjust } from './prepTime'
import { acceptedAtOf } from './rules'
import { PrepTimeValue, PrepTimeValueHandle } from './PrepTimeValue'
import { SheetError, SheetNote } from './SheetParts'
import { sheetStyles } from './styles'
import { sendEstimatedTimeMessage, useCourtesyMessage } from './courtesyMessage'
import { useStatusRequest } from './useStatusRequest'
import { useTimeLabel } from './AcceptSheet'
import type { ActionRequest } from './types'

interface Props {
  request: ActionRequest
  onFinish: (orders: any[]) => void
}

/**
 * The adjust-time sheet (SheetPrepTime) of an accepted order: four adjustments (-5, +5, +10, +15 min) of the time
 * promised, the new promised time, and "Update time", which sends `{ prepared_in: <new total> }` and no status
 * (`PUT /orders/:id`, allowed to the store at any status). The new total is `prepared_in` plus the change (the
 * API's field is the minutes from the accept). The courtesy message with the new time goes to the customer.
 * It is not queued offline: the sheet needs the connection and says so when the request fails.
 */
export const PrepTimeSheet = ({ request, onFinish }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const timeLabel = useTimeLabel()
  const courtesy = useCourtesyMessage()
  const styles = useMemo(() => sheetStyles(theme), [theme])
  const { send, submitting, error, orders } = useStatusRequest(request)
  const order = request.order
  // What is chosen: one of the adjustments (`delta`), or a number of minutes typed over the figure (`typed`, the new
  // preparation time itself). The last one given wins; a typed number that an adjustment gives is that adjustment.
  const [delta, setDelta] = useState<number | null>(PREP_TIME.adjustments[1])
  const [typed, setTyped] = useState<number | null>(null)
  // The number being typed, while it is inside the rule: the adjustments show the one it equals before the field settles.
  const [live, setLive] = useState<number | null>(null)
  const field = useRef<PrepTimeValueHandle>(null)

  const current = Number(order?.prepared_in) > 0 ? Number(order.prepared_in) : PREP_TIME.default
  const acceptedAt = useMemo(() => acceptedAtOf(order, request.opts?.acceptedAt), [order, request.opts?.acceptedAt])
  const now = dayjs()
  const elapsed = acceptedAt ? Math.max(0, now.diff(acceptedAt, 'minute')) : null
  // An order that is late is adjusted from now: "+5 min" is five minutes more than the later of the promised time and now.
  const base = elapsed === null ? current : Math.max(current, elapsed)
  const next = typed ?? adjustedTotal(base, delta ?? 0)
  // The new time cannot end before now: what can be typed starts after the minutes that have passed.
  const lowest = Math.max(PREP_TIME.min, elapsed === null ? 0 : elapsed + 1)
  const valid = typed !== null || (delta !== null && canAdjust(base, delta, elapsed))

  const choose = (value: number) => { field.current?.flush(); setDelta(value); setTyped(null) }
  const typeMinutes = (minutes: number) => {
    const match = PREP_TIME.adjustments.find((value) => canAdjust(base, value, elapsed) && adjustedTotal(base, value) === minutes)
    setDelta(match ?? null)
    setTyped(match === undefined ? minutes : null)
  }

  const minutesText = (value: number) => t('MINUTES_SHORT', '_min_ min').replace('_min_', String(value))
  const deltaText = (value: number) => (value < 0 ? t('MINUS_MINUTES', '-_min_ min') : t('PLUS_MINUTES', '+_min_ min')).replace('_min_', String(Math.abs(value)))

  const promisedNow = acceptedAt ? acceptedAt.add(current, 'minute') : null
  const promisedNext = acceptedAt ? acceptedAt.add(next, 'minute') : null
  const remaining = promisedNow ? Math.max(0, promisedNow.diff(now, 'minute')) : null
  // A time that cannot be written is not drawn: the line and the big figure fall back to minutes.
  const promisedNowLabel = timeLabel(promisedNow)
  const promisedNextLabel = timeLabel(promisedNext)

  const update = async () => {
    const settled = field.current?.flush()
    // A typed number outside the rule is brought to its limit and shown: the next tap sends it.
    if (settled?.corrected) return
    const total = settled?.value ?? next
    if (settled?.value == null && !valid) return
    const outcome = await send(order?.status, { prepared_in: total }, { queueOffline: false })
    if (!outcome.done) return
    if (request.opts?.handleChangeOrderStatus) {
      orders.forEach((item) => sendEstimatedTimeMessage(courtesy, item.id, 'prepared_in', total))
    }
    onFinish(orders)
  }

  return (
    <View style={styles.body} testID='order-sheet-prep-time'>
      {promisedNowLabel !== null && remaining !== null && (
        <OText preset='body_sm' color='text_muted' testID='prep-now'>
          {t('NOW_READY_IN', 'Now: ready in _time_ · promised for _promised_')
            .replace('_time_', minutesText(remaining))
            .replace('_promised_', promisedNowLabel)}
        </OText>
      )}

      <View style={styles.chips} accessibilityLabel={t('TIME_ADJUSTMENT', 'Time adjustment')}>
        {PREP_TIME.adjustments.map((value) => (
          <View key={value} style={styles.chipCell}>
            <FilterChip
              size='sm'
              text={deltaText(value)}
              selected={live === null
                ? typed === null && delta === value
                : canAdjust(base, value, elapsed) && adjustedTotal(base, value) === live}
              disabled={!canAdjust(base, value, elapsed)}
              onPress={() => choose(value)}
              testID={`prep-adjust-${value}`}
            />
          </View>
        ))}
      </View>

      <OCard variant='muted'>
        <View style={styles.centered}>
          <PrepTimeValue
            ref={field}
            minutes={next}
            text={promisedNextLabel ?? minutesText(next)}
            caption={promisedNextLabel !== null ? t('NEW_PROMISED_TIME', 'New promised time') : t('NEW_PREPARATION_TIME', 'New preparation time')}
            min={lowest}
            max={PREP_TIME.max}
            disabled={submitting}
            hint={t('PREP_TIME_TOTAL_HINT', 'Minutes since accepting, from _min_ to _max_')}
            spoken={t('PREP_TIME_NEW_TAP_TO_TYPE', 'New preparation time, _min_ minutes. Tap to type a value')}
            onCommit={typeMinutes}
            onTyping={setLive}
            testID='prep-new-time'
          />
        </View>
      </OCard>

      <SheetNote icon='information-circle-outline' noteStyle={styles.note} textStyle={styles.noteText}>
        {t('CUSTOMER_AND_DRIVER_WILL_BE_NOTIFIED', 'The customer and the driver will be notified.')}
      </SheetNote>

      <SheetFooter>
        <View style={styles.footer}>
          <SheetError>{error}</SheetError>
          <OButton
            size='lg'
            text={t('UPDATE_TIME', 'Update time')}
            loading={submitting}
            disabled={submitting || !valid}
            onClick={update}
            testID='order-action'
          />
        </View>
      </SheetFooter>
    </View>
  )
}

export default PrepTimeSheet
