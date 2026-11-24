import { useCallback } from 'react'

import { ToastType, useConfig, useLanguage } from '@components'
import { useShowActionToast } from '../shared/toastAction'
import { ACCEPTED_NOTICE_MS } from './constants'
import { orderNumberOf } from './rules'

/**
 * The notice after an order (or a group of them) was accepted from a list: "Order #4190 accepted" with the action
 * "View order", or "3 orders accepted" with none (a group is not one order to go to). It replaces any notice on screen,
 * and shows at the top, under the header: at the bottom it stood over the buttons of the next order to accept.
 * `viewOrder` is what the caller gave to show the order; without it the notice has no action.
 */
export const useAcceptedNotice = () => {
  const [, t] = useLanguage()
  const [{ configs }] = useConfig() as any
  const show = useShowActionToast()
  return useCallback((accepted: any[], viewOrder?: (order: any) => void) => {
    if (!accepted.length) return
    if (accepted.length > 1) {
      show(ToastType.Success, t('ORDERS_COUNT_ACCEPTED', '_count_ orders accepted').replace('_count_', String(accepted.length)), undefined, ACCEPTED_NOTICE_MS, 'top')
      return
    }
    const [order] = accepted
    show(
      ToastType.Success,
      t('ORDER_NUMBER_ACCEPTED', 'Order #_number_ accepted').replace('_number_', orderNumberOf(order, configs)),
      viewOrder ? { text: t('VIEW_ORDER', 'View order'), onPress: () => viewOrder(order), testID: 'accepted-notice-view' } : undefined,
      ACCEPTED_NOTICE_MS,
      'top'
    )
  }, [show, t, configs])
}
