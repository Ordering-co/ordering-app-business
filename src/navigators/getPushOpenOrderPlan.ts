export function getPendingPushOrderId (orderId: unknown) {
  if (orderId == null || orderId === '') return null
  return orderId
}

export function getPushOpenOrderPlan ({
  loaded,
  auth,
  orderId
}: {
  loaded?: unknown
  auth?: unknown
  orderId?: unknown
}) {
  const pendingOrderId = getPendingPushOrderId(orderId)

  return {
    shouldOpen: !!loaded && !!auth && pendingOrderId != null,
    pendingOrderId
  }
}
