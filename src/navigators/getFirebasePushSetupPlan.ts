export function isFirebasePushEnabled (configs: any) {
  return configs?.firebase_push_enabled?.value === '1'
}

export function getFirebasePushSetupPlan ({
  configsLoading,
  enabled,
  auth
}: {
  configsLoading?: unknown
  enabled?: unknown
  auth?: unknown
}) {
  if (configsLoading) {
    return { shouldSetup: false }
  }
  return { shouldSetup: !!enabled && !!auth }
}

export function getOpenedPushOrderId (data: any) {
  const orderId = data?.order_id
  if (orderId == null || orderId === '' || orderId === 'null') {
    return null
  }
  return orderId
}

/**
 * What a tapped push is about, from its data (Firebase's `data`, OneSignal's `additionalData`): the order and the
 * kind of push (`type`: `order_message` for a chat message). `null` when it names no order.
 */
export function getOpenedPush (data: any): { orderId: string | number, type: string | null } | null {
  const orderId = getOpenedPushOrderId(data)
  if (orderId == null) return null
  const type = data?.type
  return { orderId, type: typeof type === 'string' && type !== '' ? type : null }
}
