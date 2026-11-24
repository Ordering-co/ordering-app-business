import React, { useEffect } from 'react'
import { checkNotifications, openSettings } from 'react-native-permissions'

import { NotificationsPermissionSheet } from './NotificationsPermissionSheet'

export { NotificationsPermissionSheet } from './NotificationsPermissionSheet'
export { AlertsAndSound } from './AlertsAndSound'

interface NotificationSettingPropsParams {
  checkNotificationStatus: { open: boolean, checked: boolean }
  setCheckNotificationStatus: (notificationStatus: any) => void
}

/**
 * The orders screens' prompt: when the system has blocked notifications (it will not ask again) the explainer opens
 * once, and "Turn on notifications" takes the user to the app's settings. It decides on mount; the screens that
 * mount it own the `{ open, checked }` state.
 */
export const NotificationSetting = (props: NotificationSettingPropsParams) => {
  const { checkNotificationStatus, setCheckNotificationStatus } = props

  const requestLocationPermission = async () => {
    const notificationStatus = await checkNotifications()
    if (notificationStatus?.status === 'blocked') {
      setCheckNotificationStatus({ open: true, checked: false })
      return
    }
    setCheckNotificationStatus({ open: false, checked: true })
  }

  const callOpenSettings = async () => {
    await openSettings().catch(() => console.warn('cannot open settings'))
    setCheckNotificationStatus({ open: false, checked: true })
  }

  useEffect(() => {
    requestLocationPermission()
  }, [])

  return (
    <NotificationsPermissionSheet
      open={!!checkNotificationStatus?.open}
      onClose={() => setCheckNotificationStatus({ open: false, checked: true })}
      onAllow={callOpenSettings}
    />
  )
}
