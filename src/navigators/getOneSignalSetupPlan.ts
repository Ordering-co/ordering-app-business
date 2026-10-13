export function getOneSignalSetupPlan ({
  configsLoading,
  onesignalAppId,
  auth
}: {
  configsLoading?: unknown
  onesignalAppId?: unknown
  auth?: unknown
}) {
  if (configsLoading) {
    return {
      shouldSetup: false,
      shouldClearPushLoading: false
    }
  }

  return {
    shouldSetup: !!onesignalAppId && !!auth,
    shouldClearPushLoading: !onesignalAppId || !auth
  }
}

export function shouldRegisterPushToken ({
  auth,
  notificationToken
}: {
  auth?: unknown
  notificationToken?: unknown
}) {
  if (!auth) return false
  if (notificationToken == null || notificationToken === '') return false
  return true
}
