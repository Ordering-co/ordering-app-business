import {
  OneSignal,
  LogLevel,
  type NotificationClickEvent,
  type PushSubscriptionChangedState
} from 'react-native-onesignal'

export type OneSignalIdentity = {
  appId: string
  externalId?: string | null
  email?: string | null
  /** The phone in the shape the API stores it (`+<code> <number>`). */
  cellphone?: string | null
}

type OneSignalPushOptions = {
  /** The push subscription id (v4's player id) arrived or changed. */
  onToken: (token: string) => void
  /** A notification was tapped: `additionalData` is what the server sent (`order_id`). */
  onNotificationClick: (notification: any) => void
}

/**
 * OneSignal 5 for one mount of the root navigator (the calls that were inline in
 * `RootNavigator` with OneSignal 4). v4's `setAppId`, `setExternalUserId`, `setEmail`,
 * `setSMSNumber`, `setNotificationOpenedHandler`, `addSubscriptionObserver`,
 * `promptForPushNotificationsWithUserResponse` and `getDeviceState` are, in order,
 * `initialize`, `login`, `User.addEmail`, `User.addSms`, the `click` listener, the
 * subscription's `change` listener, `Notifications.requestPermission` and
 * `User.pushSubscription.getIdAsync`.
 *
 * v5's listeners add up and its `addEmail` / `addSms` queue an operation on every call, so
 * `setup` does nothing when the identity is the one already set up, and `dispose` removes
 * the listeners when the navigator unmounts. `setup` never asks for the notification permission:
 * `requestPermission` does, when the explainer sheet asks it to.
 */
export function createOneSignalPush ({ onToken, onNotificationClick }: OneSignalPushOptions) {
  let initializedAppId: string | null = null
  let identity: OneSignalIdentity | null = null
  let disposed = false
  let listeners: {
    click: (event: NotificationClickEvent) => void
    change: (event: PushSubscriptionChangedState) => void
  } | null = null

  const addListeners = () => {
    if (listeners) return
    listeners = {
      click: ({ notification }) => {
        onNotificationClick(notification)
      },
      change: ({ current }) => {
        if (current?.id) {
          onToken(current.id)
        }
        if (!current?.optedIn) {
          OneSignal.InAppMessages.addTrigger('prompt_ios', 'true')
        }
      }
    }
    OneSignal.Notifications.addEventListener('click', listeners.click)
    OneSignal.User.pushSubscription.addEventListener('change', listeners.change)
  }

  const removeListeners = () => {
    if (!listeners) return
    OneSignal.Notifications.removeEventListener('click', listeners.click)
    OneSignal.User.pushSubscription.removeEventListener('change', listeners.change)
    listeners = null
  }

  const setup = async (next: OneSignalIdentity) => {
    if (disposed || !next.appId) return
    if (
      identity &&
      identity.appId === next.appId &&
      (identity.externalId || '') === (next.externalId || '') &&
      (identity.email || '') === (next.email || '') &&
      (identity.cellphone || '') === (next.cellphone || '')
    ) {
      return
    }

    if (initializedAppId !== next.appId) {
      // Verbose in development only: at that level the native SDK writes its requests (the
      // user's email, phone and external id) to the device's log.
      OneSignal.Debug.setLogLevel(__DEV__ ? LogLevel.Verbose : LogLevel.Warn)
      OneSignal.initialize(next.appId)
      initializedAppId = next.appId
    }
    addListeners()

    // The user first, then the email and SMS: v5 adds them to the current user.
    try {
      if (next.externalId) {
        OneSignal.login(next.externalId)
      }
      if (next.email) {
        OneSignal.User.addEmail(next.email)
      }
      if (next.cellphone) {
        OneSignal.User.addSms(next.cellphone)
      }
    } catch (error) {
      console.log('OneSignal setup error:', error)
    }
    identity = next

    // The system's prompt is not fired here: it is asked by the explainer sheet after the first sign-in
    // (`requestPermission`, decision OQ-20).

    // The subscription id is null until OneSignal creates the subscription: then it
    // arrives through the `change` listener.
    try {
      const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync()
      if (!disposed && subscriptionId) {
        onToken(subscriptionId)
      }
    } catch (error) {
      console.log('OneSignal subscription id error:', error)
    }
  }

  /**
   * Asks the system for the notification permission (the iOS dialog, Android 13's `POST_NOTIFICATIONS`) through
   * OneSignal, which also opts the subscription in when it is granted. Never opens the settings (the sheet does
   * for a blocked permission). Answers whether it was granted.
   */
  const requestPermission = async (): Promise<boolean> => {
    try {
      return !!(await OneSignal.Notifications.requestPermission(false))
    } catch (error) {
      console.log('OneSignal permission prompt error:', error)
      return false
    }
  }

  const dispose = () => {
    disposed = true
    removeListeners()
  }

  return { setup, requestPermission, dispose }
}

export type OneSignalPush = ReturnType<typeof createOneSignalPush>
