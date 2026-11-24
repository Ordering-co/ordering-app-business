import React from 'react'
import { uiPiece } from './uiPiece'
import { useNotificationPermissionPrompt } from './useNotificationPermissionPrompt'

/**
 * What the sheet of area `profile` (`NotificationsPermissionSheet`, "Turn on order alerts", contract `profile.md`)
 * is given. The shell decides when it shows and what "Turn on notifications" does (the system's prompt through the
 * push provider, or the settings when the permission is blocked); the sheet draws, and calls `onClose` after
 * `onAllow` and for "Not now" and the scrim.
 */
export interface NotificationsPermissionSheetProps {
  open: boolean
  onClose: () => void
  onAllow?: () => void | Promise<void>
}

/**
 * Mounted once inside the signed-in app (`HomeNavigator`). Draws nothing until `@ui` exports the sheet; the
 * system's prompt is never fired without it.
 */
export const NotificationPermissionPrompt = ({ auth, loaded }: { auth: boolean, loaded: boolean }) => {
  const Sheet = uiPiece('NotificationsPermissionSheet') as React.ComponentType<NotificationsPermissionSheetProps> | null
  const { visible, accept, later } = useNotificationPermissionPrompt({ auth, loaded, enabled: !!Sheet })
  if (!Sheet) return null
  return <Sheet open={visible} onClose={later} onAllow={accept} />
}

export default NotificationPermissionPrompt
