import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { checkNotifications, openSettings } from 'react-native-permissions'

import { StoreMethods } from '@ui'
import { useShell } from '../context/ShellContext'
import {
  getNotificationPermissionPlan,
  NOTIFICATIONS_SHEET_DISMISSED_KEY,
  toNotificationPermission,
  type NotificationStatus
} from './getNotificationPermissionPlan'

const { _retrieveStoreData, _setStoreData } = StoreMethods

/**
 * The explainer sheet of the notification permission: whether it is up, and what its two buttons do (a blocked
 * permission makes the main button open the settings). The rule of when it shows is
 * `getNotificationPermissionPlan`; the system's prompt is asked here and nowhere else (`requestNotificationPermission`
 * of the shell context).
 *
 * It looks once per signed-in launch (`auth && loaded`), and again when the app comes back from the settings.
 */
export const useNotificationPermissionPrompt = ({ auth, loaded, enabled = true }: { auth: boolean, loaded: boolean, enabled?: boolean }) => {
  const { requestNotificationPermission } = useShell()
  const [plan, setPlan] = useState({ show: false, blocked: false })
  const looked = useRef(false)
  const inSettings = useRef(false)
  // The sheet closes itself after "Turn on notifications": that close is not a "Not now".
  const accepted = useRef(false)

  const look = useCallback(async () => {
    let status: NotificationStatus | null = null
    let dismissedAt: number | null = null
    try {
      status = (await checkNotifications()).status as NotificationStatus
    } catch (error) {
      console.log('Notification permission check error:', error)
    }
    try {
      const stored = await _retrieveStoreData(NOTIFICATIONS_SHEET_DISMISSED_KEY)
      dismissedAt = typeof stored === 'number' ? stored : Number(stored) || null
    } catch (error) {
      dismissedAt = null
    }
    setPlan(getNotificationPermissionPlan({ auth, loaded, status, dismissedAt, now: Date.now() }))
  }, [auth, loaded])

  useEffect(() => {
    if (!enabled || !auth || !loaded) {
      looked.current = false
      setPlan({ show: false, blocked: false })
      return
    }
    if (looked.current) return
    looked.current = true
    look()
  }, [enabled, auth, loaded, look])

  // Back from the settings: the permission may be on now.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && inSettings.current) {
        inSettings.current = false
        look()
      }
    })
    return () => subscription.remove()
  }, [look])

  const later = useCallback(() => {
    setPlan({ show: false, blocked: false })
    if (accepted.current) {
      accepted.current = false
      return
    }
    _setStoreData(NOTIFICATIONS_SHEET_DISMISSED_KEY, Date.now())
  }, [])

  const accept = useCallback(async () => {
    accepted.current = true
    if (plan.blocked) {
      // Off to the settings: if nothing comes of it the sheet is back in a week.
      _setStoreData(NOTIFICATIONS_SHEET_DISMISSED_KEY, Date.now())
      inSettings.current = true
      setPlan({ show: false, blocked: false })
      try {
        await openSettings()
      } catch (error) {
        console.log('Open settings error:', error)
      }
      return
    }
    setPlan({ show: false, blocked: false })
    const answer = await requestNotificationPermission()
    // Not granted (denied, or blocked from now on): the sheet comes back in a week, with the settings.
    if (answer !== 'granted') _setStoreData(NOTIFICATIONS_SHEET_DISMISSED_KEY, Date.now())
  }, [plan.blocked, requestNotificationPermission])

  return { visible: plan.show, blocked: plan.blocked, accept, later }
}

export { toNotificationPermission }
