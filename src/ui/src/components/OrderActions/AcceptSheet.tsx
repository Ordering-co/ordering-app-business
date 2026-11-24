import React, { useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'
import dayjs from 'dayjs'
import { useFormats } from '@/hooks/useFormats'

import { useLanguage } from '@components'
import { FilterChip, Icon, OButton, OCard, SheetFooter } from '../shared'
import { PREP_TIME } from './constants'
import { clampMinutes, readyBy, stepMinutes } from './prepTime'
import { PrepTimeValue, PrepTimeValueHandle } from './PrepTimeValue'
import { SheetError, SheetLabel, SheetNote } from './SheetParts'
import { sheetStyles } from './styles'
import { sendEstimatedTimeMessage, useCourtesyMessage } from './courtesyMessage'
import { useStatusRequest } from './useStatusRequest'
import { useAcceptedNotice } from './useAcceptedNotice'
import type { ActionRequest } from './types'

interface Props {
  request: ActionRequest
  /** The sheet is done (every order changed or queued): the host closes it. */
  onFinish: (orders: any[]) => void
  /** The printer(s) that print the ticket when the order is accepted, when auto-print is on. */
  printerNames?: string | null
  /** Fires the ticket after an accepted order (every entry: card, sheet, details). */
  onAccepted?: (order: any) => void
}

/**
 * A moment in the app's time of day (`useFormats().time`: the project's format, `12:38 PM`), or null when it cannot be
 * written: a time that cannot be computed is not drawn. It is NOT written through the logic's `parseTime`: that reads a
 * bare "HH:mm" with dayjs's `customParseFormat`, which this app does not load (`src/utils/dayjs.ts`), so it answered
 * "invalid format" for every time.
 */
export const useTimeLabel = () => {
  const { time } = useFormats()
  return (moment: dayjs.Dayjs | null | undefined): string | null =>
    moment && moment.isValid() ? time(moment.toDate()) || null : null
}

/**
 * The accept sheet (SheetAccept): the preparation time as five presets and a ±5 stepper, "Ready by" the project's
 * time, the printer that will print, and the one button "Accept · N min" that sends `{ status: 7, prepared_in: N }`
 * (the `acceptByBusiness` body) for the order or for every order of the group. Accepting is always one tap: the
 * sheet stays open on a failure, with the API's message, and closes only when every order changed.
 */
export const AcceptSheet = ({ request, onFinish, printerNames, onAccepted }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const timeLabel = useTimeLabel()
  const courtesy = useCourtesyMessage()
  const styles = useMemo(() => sheetStyles(theme), [theme])
  const { send, submitting, error, orders } = useStatusRequest(request)
  const announceAccepted = useAcceptedNotice()
  const [minutes, setMinutes] = useState(clampMinutes(request.opts?.defaultMinutes ?? PREP_TIME.default))

  // The number being typed, while it is inside the rule: the presets and the main button say it before the field settles.
  const [typing, setTyping] = useState<number | null>(null)
  const shown = typing ?? minutes

  const minutesText = (value: number) => t('MINUTES_SHORT', '_min_ min').replace('_min_', String(value))
  const readyByLabel = timeLabel(readyBy(minutes))

  const field = useRef<PrepTimeValueHandle>(null)
  // A number being typed ends where the tap lands: the buttons start from what the field settles on.
  const settled = () => field.current?.flush().value ?? minutes

  const accept = async () => {
    const typed = field.current?.flush()
    // A typed number outside the rule is brought to its limit and shown: the next tap sends it.
    if (typed?.corrected) return
    const prepared = clampMinutes(typed?.value ?? minutes)
    const outcome = await send(7, { status: 7, prepared_in: prepared })
    if (!outcome.done) return
    // The list's request does not tell the customer the time (the details' controller does): the sheet does.
    if (request.opts?.handleChangeOrderStatus && !outcome.queued) {
      orders.forEach((order) => sendEstimatedTimeMessage(courtesy, order.id, 'prepared_in', prepared))
    }
    const accepted = orders.map((order) => ({ ...order, ...(orders.length === 1 ? outcome.updated : {}), status: 7, prepared_in: prepared }))
    accepted.forEach((order) => onAccepted?.(order))
    // Said once the change was sent, never for one only queued offline, and only where the owner is not already on the order.
    if (request.opts?.from === 'list' && !outcome.queued) announceAccepted(accepted, request.opts?.viewOrder)
    onFinish(orders)
  }

  return (
    <View style={styles.body} testID='order-sheet-accept'>
      <SheetLabel description={t('PREPARATION_TIME_DESCRIPTION', 'The customer and the driver see this estimate.')}>
        {t('PREPARATION_TIME', 'Preparation time')}
      </SheetLabel>

      <View style={styles.chips} accessibilityLabel={t('PREPARATION_TIME_PRESETS', 'Preparation time presets')}>
        {PREP_TIME.presets.map((preset) => (
          <View key={preset} style={styles.chipCell}>
            <FilterChip
              size='sm'
              text={String(preset)}
              selected={shown === preset}
              onPress={() => { field.current?.flush(); setMinutes(preset) }}
              testID={`prep-preset-${preset}`}
              accessibilityLabel={minutesText(preset)}
            />
          </View>
        ))}
      </View>

      <OCard variant='muted'>
        <View style={styles.stepper}>
          <View style={styles.stepperSide}>
            <OButton
              iconOnly
              color='neutral'
              appearance='outline'
              size='md'
              icon={<Icon name='remove' size='md' />}
              disabled={submitting || minutes <= PREP_TIME.min}
              onClick={() => setMinutes(stepMinutes(settled(), -1))}
              accessibilityLabel={t('MINUTES_LESS', '5 minutes less')}
              testID='prep-minus'
            />
          </View>
          <View style={styles.stepperValue}>
            <PrepTimeValue
              ref={field}
              minutes={minutes}
              text={minutesText(minutes)}
              caption={readyByLabel !== null ? t('READY_BY_TIME', 'Ready by _time_').replace('_time_', readyByLabel) : null}
              captionTestID='prep-ready-by'
              min={PREP_TIME.min}
              max={PREP_TIME.max}
              disabled={submitting}
              onCommit={setMinutes}
              onTyping={setTyping}
              testID='prep-minutes'
            />
          </View>
          <View style={styles.stepperSide}>
            <OButton
              iconOnly
              color='neutral'
              appearance='outline'
              size='md'
              icon={<Icon name='add' size='md' />}
              disabled={submitting || minutes >= PREP_TIME.max}
              onClick={() => setMinutes(stepMinutes(settled(), 1))}
              accessibilityLabel={t('MINUTES_MORE', '5 minutes more')}
              testID='prep-plus'
            />
          </View>
        </View>
      </OCard>

      {!!printerNames && (
        <SheetNote icon='print-outline' noteStyle={styles.note} textStyle={styles.noteText} testID='prep-printer-note'>
          {t('TICKET_PRINTS_ON_ACCEPT', 'The ticket prints on _printer_ when you accept.').replace('_printer_', printerNames)}
        </SheetNote>
      )}

      <SheetFooter>
        <View style={styles.footer}>
          <SheetError>{error}</SheetError>
          <OButton
            color='success'
            size='lg'
            text={t('ACCEPT_WITH_TIME', 'Accept · _min_ min').replace('_min_', String(shown))}
            loading={submitting}
            disabled={submitting}
            onClick={accept}
            testID='order-action'
          />
        </View>
      </SheetFooter>
    </View>
  )
}

export default AcceptSheet
