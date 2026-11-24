/**
 * When the explainer sheet of the notification permission shows (decision OQ-20, option a). The system's own
 * prompt is never fired at launch or at login: after the first sign-in, when the permission is denied or was not
 * asked yet, the sheet explains what the alerts are for and asks. "Not now" asks again after a week; a blocked
 * permission (the system will not prompt any more) offers the settings instead.
 */

/** How long "Not now" holds the sheet back. */
export const REOFFER_AFTER_MS = 7 * 24 * 60 * 60 * 1000

/** The storage key of the moment the business last said "Not now" (a timestamp in ms). */
export const NOTIFICATIONS_SHEET_DISMISSED_KEY = 'notifications_sheet_dismissed_at'

/** What `react-native-permissions` says of the notifications. */
export type NotificationStatus = 'granted' | 'denied' | 'blocked' | 'unavailable' | 'limited'

export function getNotificationPermissionPlan ({
  auth,
  loaded,
  status,
  dismissedAt,
  now
}: {
  auth?: unknown
  loaded?: unknown
  /** `null` while the system has not been asked what it knows. */
  status?: NotificationStatus | null
  dismissedAt?: number | null
  now: number
}) {
  const hidden = { show: false, blocked: false }
  if (!auth || !loaded || !status) return hidden
  // Granted, or nothing to ask (no notifications on this device, or the OS grants them as provisional/limited).
  if (status !== 'denied' && status !== 'blocked') return hidden
  if (typeof dismissedAt === 'number' && dismissedAt <= now && now - dismissedAt < REOFFER_AFTER_MS) return hidden
  return { show: true, blocked: status === 'blocked' }
}

/** The system's answer, simplified to what the sheet needs. */
export function toNotificationPermission (status?: string | null): 'granted' | 'denied' | 'blocked' | 'unavailable' {
  if (status === 'granted' || status === 'limited') return 'granted'
  if (status === 'blocked') return 'blocked'
  if (status === 'unavailable') return 'unavailable'
  return 'denied'
}
