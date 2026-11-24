import { useLanguage } from '@components'

/**
 * What the orders list says when it has no row (OrdersEmpty mockup), as the props of the app's one empty state
 * (`NotFoundSource`, `components.empty_state`). Each tab says its own (the owner's request, 2026-11-23: "no new orders, no orders in progress, no past orders" instead of one
 * general text): `new`: no new orders; `preorder`: no preorders; `progress`: nothing in progress (the tab, or its All chip);
 * `preparing` / `ready` / `with_driver`: nothing in that stage chip; `active`: no open order (the combined layout's tab);
 * `history`: no past orders; `completed` / `cancelled`: none under that History chip; `tab`: a list the app cannot name; `preorder`: nothing in the Preorder chip of New; `results`: the search found
 * nothing; `offline`: no network and no copy of the lists; `error`: the API said no (its message is the title).
 *
 *   const emptyOf = useOrdersEmpty()
 *   <NotFoundSource fill {...emptyOf('new')} />
 */
export type EmptyKind = 'new' | 'tab' | 'results' | 'offline' | 'error' | 'preparing' | 'ready' | 'with_driver' | 'preorder' | 'progress' | 'active' | 'history' | 'completed' | 'cancelled'

export const useOrdersEmpty = () => {
  const [, t] = useLanguage()
  return (kind: EmptyKind, message?: string | null) => {
    const content: Record<EmptyKind, { icon: string, content: string, text?: string }> = {
      new: { icon: 'bag-handle-outline', content: t('NO_NEW_ORDERS', 'No new orders'), text: t('NO_NEW_ORDERS_TEXT', 'New orders show up here and ring until you open them.') },
      tab: { icon: 'receipt-outline', content: t('NO_ORDERS_IN_TAB', 'No orders here') },
      progress: { icon: 'receipt-outline', content: t('NO_ORDERS_IN_PROGRESS', 'No orders in progress') },
      active: { icon: 'receipt-outline', content: t('NO_ACTIVE_ORDERS', 'No active orders') },
      history: { icon: 'receipt-outline', content: t('NO_PAST_ORDERS', 'No past orders') },
      completed: { icon: 'receipt-outline', content: t('NO_COMPLETED_ORDERS', 'No completed orders') },
      cancelled: { icon: 'receipt-outline', content: t('NO_CANCELLED_ORDERS', 'No cancelled orders') },
      // A stage chip of In progress with nothing in it.
      preparing: { icon: 'receipt-outline', content: t('NO_ORDERS_PREPARING', 'No orders being prepared') },
      ready: { icon: 'receipt-outline', content: t('NO_ORDERS_READY', 'No orders ready for pickup') },
      with_driver: { icon: 'receipt-outline', content: t('NO_ORDERS_WITH_DRIVER', 'No orders with a driver') },
      preorder: { icon: 'bag-handle-outline', content: t('NO_PREORDERS', 'No preorders') },
      results: { icon: 'search-outline', content: t('NO_RESULTS_FOUND', 'Sorry, no results found') },
      offline: { icon: 'cloud-offline-outline', content: t('NETWORK_ERROR', 'Network Error'), text: t('OFFLINE_NOTICE_NO_COPY', 'Orders will update when you\'re back online.') },
      error: { icon: 'alert-circle-outline', content: message ?? t('NETWORK_ERROR', 'Network Error') }
    }
    return { ...content[kind], conditioned: false, testID: `orders-empty-${kind}` }
  }
}
