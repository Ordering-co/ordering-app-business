import { useApi, useLanguage, useSession, useWebsocket } from '@components'

/**
 * The courtesy chat message with the estimated preparation time. The order's details controller sends it itself after a
 * save whose body sets `prepared_in`; a request the list owns does not, so the sheets send it for that one (OQ-18 (a):
 * on every accept and every adjust). It never blocks or fails the change.
 */
export const useCourtesyMessage = () => {
  const [ordering] = useApi() as any
  const [{ token }] = useSession() as any
  const socket = useWebsocket() as any
  const [, t] = useLanguage()
  return { ordering, token, socket, t }
}

export type CourtesyContext = ReturnType<typeof useCourtesyMessage>

export const sendEstimatedTimeMessage = async (
  context: CourtesyContext,
  orderId: number,
  _field: 'prepared_in',
  minutes: number
) => {
  // An order accepted with no preparation time (0) has no estimate to tell the customer.
  if (!(Number(minutes) > 0)) return
  try {
    const { ordering, token, socket, t } = context
    const template = t('ESTIMATED_PREPARATION_TIME')
    if (!template || template === 'ESTIMATED_PREPARATION_TIME') return
    const comment = String(template).replace('_min_', String(minutes)).replace('_order_', String(orderId))
    await fetch(`${ordering.root}/orders/${orderId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-App-X': ordering?.appId,
        'X-INTERNAL-PRODUCT-X': ordering?.appInternalName,
        'X-Socket-Id-X': socket?.getId?.()
      },
      body: JSON.stringify({ comment, type: 2, can_see: '3', order_id: orderId })
    })
  } catch {
    // A courtesy message: never fails the change.
  }
}
