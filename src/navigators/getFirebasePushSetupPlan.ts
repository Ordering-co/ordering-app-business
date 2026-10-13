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
