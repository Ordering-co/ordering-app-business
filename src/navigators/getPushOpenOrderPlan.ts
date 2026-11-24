/** What a push says it is about: `data.type` of api-core's notifications (`order_message` for a chat message). */
export const ORDER_MESSAGE_PUSH_TYPE = 'order_message'

export type PushOpenScreen = 'OrderMessage' | 'OrderDetails'

export function getPendingPushOrderId (orderId: unknown) {
  if (orderId == null || orderId === '' || orderId === 'null') return null
  return orderId
}

/** The screen a push opens (decision OQ-21): the chat for a message, the order's details for everything else. */
export function getPushOpenScreen (type?: unknown): PushOpenScreen {
  return type === ORDER_MESSAGE_PUSH_TYPE ? 'OrderMessage' : 'OrderDetails'
}

/**
 * What to do with a push the business tapped: once the app has loaded and someone is signed in, open the screen
 * the push is about (`pendingOrderId` and `type` are what the push carried, kept while the app is not ready).
 */
export function getPushOpenOrderPlan ({
  loaded,
  auth,
  orderId,
  type
}: {
  loaded?: unknown
  auth?: unknown
  orderId?: unknown
  type?: unknown
}) {
  const pendingOrderId = getPendingPushOrderId(orderId)

  return {
    shouldOpen: !!loaded && !!auth && pendingOrderId != null,
    pendingOrderId,
    screen: getPushOpenScreen(type)
  }
}
