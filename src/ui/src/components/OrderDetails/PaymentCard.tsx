import React, { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { detailsStyles } from './styles'
import { FoldedRow } from './FoldedRow'
import { OrderBill, OrderPayments, useBillRows } from './OrderBill'
import { isPaid, paymentMethodNames } from './orderData'
import { themeVisible } from '@/theme/helpers'
import { OBadge, OCard, ODivider, OText } from '../shared'

import { useLanguage, useUtils } from '@components'

interface Props {
  order: any
  /** The total is a row that folds (an order that is being made or is on its way), the bill under it. */
  folded?: boolean
}

/**
 * The money of the order: the total over how it was paid with the "Paid" chip (the app's rule of paid, `isPaid`: cash and
 * card on delivery are "Unpaid") and the amount, the chip and the amount on one centre line; opened (the new order, the done one) the bill's rows come over it, and the payments when it was
 * paid in more than one. `confirmation.order.total` hides the total.
 */
export const PaymentCard = ({ order, folded = false }: Props) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const [{ parsePrice }] = useUtils()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  const [open, setOpen] = useState(false)
  const showTotal = themeVisible(theme, 'confirmation.order.total')
  const paid = isPaid(order)
  const methods = paymentMethodNames(order, t, parsePrice).join(', ')
  const amount = parsePrice(order?.summary?.total ?? order?.total)
  // A bill with no row of its own (only the total) has no line over the total either.
  const hasRows = useBillRows(order).length > 0

  const totalRow = showTotal && (
    <View style={styles.totalRow} testID='payment-total'>
      <View style={styles.grow}>
        <OText preset='label'>{t('TOTAL', 'Total')}</OText>
        {!!methods && <OText preset='body_sm' color='text_muted' numberOfLines={1} testID='payment-methods'>{methods}</OText>}
      </View>
      {paid
        ? <OBadge variant='success_soft' style={styles.totalChip} testID='payment-paid'>{t('PAID', 'Paid')}</OBadge>
        : <OBadge variant='warning_soft' style={styles.totalChip} testID='payment-unpaid'>{t('UNPAID', 'Unpaid')}</OBadge>}
      <OText preset='h4' style={styles.totalAmount} testID='payment-amount'>{amount}</OText>
    </View>
  )

  // A total with no row under it has nothing to fold open.
  if (folded && hasRows) {
    return (
      <FoldedRow
        open={open}
        onToggle={() => setOpen(!open)}
        label={t('TOTAL', 'Total')}
        header={showTotal ? totalRow : <OText preset='label'>{t('PAYMENTS', 'Payments')}</OText>}
        body={(
          <>
            <OrderBill order={order} />
            <OrderPayments order={order} />
          </>
        )}
        testID='payment-folded'
      />
    )
  }

  return (
    <OCard testID='payment-card'>
      <OrderBill order={order} />
      {showTotal && hasRows && <ODivider />}
      {totalRow}
      <OrderPayments order={order} />
    </OCard>
  )
}
