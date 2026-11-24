import { isLocalSimulatorMode } from '../onboarding/ios-local-mode'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import {
  getMessaging,
  getToken,
  getInitialNotification,
  onNotificationOpenedApp,
  onMessage,
  onTokenRefresh
} from '@react-native-firebase/messaging'
import notifee, { AndroidImportance, EventType } from 'react-native-notify-kit'
import { checkNotifications, requestNotifications } from 'react-native-permissions'

import { useApi, useConfig, useSession } from '@components'
import { StoreMethods } from '@ui'

import settings from '../config.json'
import type { NotificationPermission } from '../context/ShellContext'
import { getOneSignalSetupPlan, shouldRegisterPushToken } from './getOneSignalSetupPlan'
import { getFirebasePushSetupPlan, getOpenedPush, isFirebasePushEnabled } from './getFirebasePushSetupPlan'
import { toNotificationPermission } from './getNotificationPermissionPlan'
import { createOneSignalPush, type OneSignalPush } from './oneSignalPush'

const { _setStoreData } = StoreMethods

/** What a tapped push is about, kept until the app is ready to open it (`getPushOpenOrderPlan`). */
export type OpenedPush = { orderId: string | number, type: string | null }

/**
 * The push setup of the signed-in app, out of the root navigator: the server decides which provider runs,
 * OneSignal (`onesignal_businessapp_id`) or Firebase (`firebase_push_enabled`).
 *
 * - sets the provider up when the configs are in and someone is signed in, and registers the device token with the
 *   API (`notification_tokens`);
 * - keeps the push the business tapped (`openedPush`), from either provider, until the root opens it;
 * - never fires the system's notification prompt: `requestNotificationPermission` does, when the explainer sheet
 *   asks (decision OQ-20);
 * - `isPushLoading` is what the launch waits for.
 */
export const usePushSetup = () => {
  const localSimulator = isLocalSimulatorMode()
  const [{ auth, token, user }] = useSession()
  const [ordering] = useApi()
  const [{ configs, loading: configsLoading }] = useConfig()
  const [isPushLoading, setIsPushLoading] = useState({ loading: !localSimulator })
  const [oneSignalState, setOneSignalState] = useState<any>({
    notification_app: settings.notification_app
  })
  const [openedPush, setOpenedPush] = useState<OpenedPush | null>(null)
  const firebaseUnsubscribersRef = useRef<Array<() => void>>([])
  const oneSignalPushRef = useRef<OneSignalPush | null>(null)

  const firebaseEnabled = isFirebasePushEnabled(configs)
  const firebaseEnabledRef = useRef(firebaseEnabled)
  firebaseEnabledRef.current = firebaseEnabled

  const open = (data: any) => {
    const opened = getOpenedPush(data)
    if (opened) setOpenedPush(opened)
  }

  const firebasePushSetup = async () => {
    setIsPushLoading({ loading: true })
    const messaging = getMessaging()

    let fcmToken: string | null = null
    try {
      fcmToken = await getToken(messaging)
    } catch (error) {
      console.log('Firebase push token error:', error)
    }

    const nextState = {
      ...oneSignalState,
      notification_token: fcmToken,
      notification_provider: 'fcm'
    }
    setOneSignalState(nextState)

    if (fcmToken) {
      _setStoreData('notification_state', nextState)
    }

    firebaseUnsubscribersRef.current.forEach(unsubscribe => {
      try {
        unsubscribe()
      } catch (error) {
        console.log('Firebase push unsubscribe error:', error)
      }
    })
    firebaseUnsubscribersRef.current = [
      onNotificationOpenedApp(messaging, (remoteMessage: any) => open(remoteMessage?.data)),
      onMessage(messaging, async (remoteMessage: any) => {
        if (Platform.OS !== 'android' || !remoteMessage?.notification) {
          return
        }
        try {
          await notifee.displayNotification({
            title: remoteMessage.notification.title,
            body: remoteMessage.notification.body,
            data: remoteMessage.data || {},
            android: {
              channelId: 'new_order_alarm',
              smallIcon: 'ic_launcher',
              pressAction: { id: 'default' },
              importance: AndroidImportance.HIGH
            }
          })
        } catch (error) {
          console.log('Firebase foreground display error:', error)
        }
      }),
      notifee.onForegroundEvent(({ type, detail }: any) => {
        if (type === EventType.PRESS) open(detail?.notification?.data)
      }),
      onTokenRefresh(messaging, (newToken: string) => {
        const refreshedState = {
          ...oneSignalState,
          notification_token: newToken,
          notification_provider: 'fcm'
        }
        setOneSignalState(refreshedState)
        _setStoreData('notification_state', refreshedState)
      })
    ]

    getInitialNotification(messaging)
      .then((remoteMessage: any) => open(remoteMessage?.data))
      .catch((error: any) => {
        console.log('Firebase initial notification error:', error)
      })

    setIsPushLoading({ loading: false })
  }

  // OneSignal for this mount of the navigator: its listeners leave with it. The calls live in oneSignalPush.ts.
  useEffect(() => {
    if (localSimulator) return
    const oneSignalPush = createOneSignalPush({
      onToken: (notificationToken: string) => {
        const nextState = {
          ...oneSignalState,
          notification_token: notificationToken
        }
        setOneSignalState(nextState)
        _setStoreData('notification_state', nextState)
      },
      onNotificationClick: (notification: any) => open(notification?.additionalData)
    })
    oneSignalPushRef.current = oneSignalPush
    return () => {
      oneSignalPush.dispose()
      oneSignalPushRef.current = null
    }
  }, [])

  const oneSignalSetup = async () => {
    setIsPushLoading({ loading: true })
    try {
      await oneSignalPushRef.current?.setup({
        appId: configs?.onesignal_businessapp_id?.value,
        externalId: `${ordering?.project}-${user?.id}`,
        email: user?.email,
        cellphone: user?.cellphone
          ? user?.country_phone_code
            ? `+${user?.country_phone_code} ${user?.cellphone}`
            : user?.cellphone
          : ''
      })
    } finally {
      setIsPushLoading({ loading: false })
    }
  }

  useEffect(() => {
    if (localSimulator) return
    const plan = getOneSignalSetupPlan({
      configsLoading,
      onesignalAppId: firebaseEnabled ? null : configs?.onesignal_businessapp_id?.value,
      auth
    })
    if (plan.shouldSetup) {
      oneSignalSetup()
    }
    if (plan.shouldClearPushLoading && !firebaseEnabled) {
      setIsPushLoading({ loading: false })
    }
  }, [configsLoading, configs?.onesignal_businessapp_id?.value, auth])

  useEffect(() => {
    if (localSimulator) return
    const plan = getFirebasePushSetupPlan({
      configsLoading,
      enabled: firebaseEnabled,
      auth
    })
    if (plan.shouldSetup) {
      firebasePushSetup()
    }
    if (!plan.shouldSetup && !configsLoading && firebaseEnabled) {
      setIsPushLoading({ loading: false })
    }
  }, [configsLoading, configs?.firebase_push_enabled?.value, auth])

  const subscribePushNotifications = async () => {
    if (!shouldRegisterPushToken({
      auth,
      notificationToken: oneSignalState.notification_token
    })) return

    setIsPushLoading({ loading: true })
    try {
      const url = `${ordering.root}/users/${user.id}/notification_tokens`
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          token: oneSignalState.notification_token,
          user_id: user.id,
          app: oneSignalState.notification_app,
          ...(oneSignalState.notification_provider
            ? { provider: oneSignalState.notification_provider }
            : {})
        })
      })
      setIsPushLoading({ loading: false })
    } catch (err) {
      setIsPushLoading({ loading: false })
    }
  }

  useEffect(() => {
    if (localSimulator) return
    if (shouldRegisterPushToken({
      auth,
      notificationToken: oneSignalState.notification_token
    })) {
      subscribePushNotifications()
    }
  }, [oneSignalState.notification_token, auth])

  /**
   * Asks the system for the notification permission through the provider that runs, and answers what it ended as.
   * The one place that fires the system's prompt.
   */
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (localSimulator) return 'denied'
    try {
      if (firebaseEnabledRef.current) {
        await requestNotifications(['alert', 'sound', 'badge'])
      } else {
        await oneSignalPushRef.current?.requestPermission()
      }
    } catch (error) {
      console.log('Notification permission error:', error)
    }
    try {
      return toNotificationPermission((await checkNotifications()).status)
    } catch (error) {
      return 'denied'
    }
  }, [])

  const clearOpenedPush = useCallback(() => setOpenedPush(null), [])

  return { isPushLoading, oneSignalState, openedPush, clearOpenedPush, requestNotificationPermission }
}
