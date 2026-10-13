export function shouldPostDriverLocationOnNotification ({
  isBusinessApp,
  driver
}: {
  isBusinessApp?: unknown
  driver?: unknown
}) {
  if (isBusinessApp) return false
  if (!driver) return false
  return true
}
