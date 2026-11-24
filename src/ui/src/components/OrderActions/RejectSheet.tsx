import React, { useMemo, useState } from 'react'
import { Linking, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useConfig, useLanguage } from '@components'
import { FilterChip, Icon, OButton, OTextarea, OText, SheetFooter } from '../shared'
import { customerCallUrl } from './rules'
import { hasSingleCustomer, isOrderGroup } from './statusAnswer'
import { SheetError, SheetLabel } from './SheetParts'
import { sheetStyles } from './styles'
import { useStatusRequest } from './useStatusRequest'
import type { ActionRequest } from './types'

interface Props {
  request: ActionRequest
  onFinish: (orders: any[]) => void
}

/** The five reasons the sheet offers (OQ-18 (a)): the label is what the API stores in `reject_reason`. */
export const useRejectReasons = () => {
  const [, t] = useLanguage()
  return [
    { key: 'out_of_stock', text: t('REJECT_REASON_OUT_OF_STOCK', 'Item out of stock'), other: false },
    { key: 'too_busy', text: t('REJECT_REASON_TOO_BUSY', 'Too busy right now'), other: false },
    { key: 'closing_soon', text: t('REJECT_REASON_CLOSING_SOON', 'Closing soon'), other: false },
    { key: 'cannot_deliver', text: t('REJECT_REASON_CANNOT_DELIVER', "Can't deliver to this address"), other: false },
    { key: 'other', text: t('REJECT_REASON_OTHER', 'Other'), other: true }
  ]
}

/** The first name of the customer the sheet's "Call" button names. */
const firstName = (order: any) => String(order?.customer?.name ?? '').trim().split(/\s+/)[0] ?? ''

/**
 * The reject sheet (SheetReject): why the order is rejected as chips (one is chosen; "Other" needs a note), an
 * optional note, the call to the customer as today's rules allow, and the destructive button. It sends
 * `{ status: 5, reject_reason: <label, or the note for Other>, reasons: <note> }` (the `rejectByBusiness` body) for the
 * order or for the group. The sheet is its own confirmation: nothing is asked on top of it.
 */
export const RejectSheet = ({ request, onFinish }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig() as any
  const reasons = useRejectReasons()
  const styles = useMemo(() => sheetStyles(theme), [theme])
  const { send, submitting, error, orders, isGroup } = useStatusRequest(request)
  const [reason, setReason] = useState(reasons[0].key)
  const [note, setNote] = useState('')

  const chosen = reasons.find((item) => item.key === reason) ?? reasons[0]
  const trimmed = note.trim()
  const missingNote = chosen.other && !trimmed
  // A call makes sense for one customer: a group of orders of several customers has no single phone.
  const callUrl = !isOrderGroup(orders) || hasSingleCustomer(orders) ? customerCallUrl(orders[0], configs) : null

  const reject = async () => {
    if (missingNote) return
    const body: any = { status: 5, reject_reason: chosen.other ? trimmed : chosen.text }
    if (trimmed) body.reasons = trimmed
    const outcome = await send(5, body)
    if (outcome.done) onFinish(orders)
  }

  const name = firstName(orders[0])

  return (
    <View style={styles.body} testID='order-sheet-reject'>
      <SheetLabel description={t('REJECT_CUSTOMER_NOTIFIED', 'The customer gets a notification with this reason.')}>
        {t('WHY_ARE_YOU_REJECTING', 'Why are you rejecting it?')}
      </SheetLabel>

      <View style={styles.reasons} accessibilityLabel={t('REJECTION_REASONS', 'Rejection reasons')}>
        {reasons.map((item) => (
          <FilterChip
            key={item.key}
            size='sm'
            text={item.text}
            selected={reason === item.key}
            onPress={() => setReason(item.key)}
            testID={`reject-reason-${item.key}`}
          />
        ))}
      </View>

      <OTextarea
        label={chosen.other ? t('ADD_A_NOTE', 'Add a note') : t('ADD_A_NOTE_OPTIONAL', 'Add a note (optional)')}
        placeholder={t('TELL_THE_CUSTOMER_WHAT_HAPPENED', 'Tell the customer what happened')}
        value={note}
        onChange={setNote}
        testID='reject-note'
      />

      {!!callUrl && (
        <OButton
          appearance='tonal'
          size='md'
          icon={<Icon name='call-outline' />}
          text={name
            ? t('CALL_CUSTOMER_FIRST', 'Call _name_ first').replace('_name_', name)
            : t('CALL_CUSTOMER', 'Call customer')}
          onClick={() => Linking.openURL(callUrl)}
          testID='reject-call'
        />
      )}
      <SheetFooter>
        <View style={styles.footer}>
          <OText preset='body_sm' color='text_muted'>{t('CANT_BE_UNDONE', "This can't be undone.")}</OText>
          <SheetError>{error}</SheetError>
          <OButton
            color='danger'
            size='lg'
            text={isGroup
              ? t('REJECT_ORDERS_COUNT', 'Reject _count_ orders').replace('_count_', String(orders.length))
              : t('REJECT_ORDER', 'Reject order')}
            loading={submitting}
            disabled={submitting || missingNote}
            onClick={reject}
            testID='order-action'
          />
        </View>
      </SheetFooter>
    </View>
  )
}

export default RejectSheet
