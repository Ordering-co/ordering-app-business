import { createContext, useContext } from 'react'

/** What the notification permission is, as the shell reads it: the system's answer, simplified. */
export type NotificationPermission = 'granted' | 'denied' | 'blocked' | 'unavailable'

/**
 * What the root navigator knows and the screens below it need. The root owns the push setup and the project
 * switch (they need the session and the configs), so the screens reach them here instead of through route params:
 *
 * - `projectChanged`: the project was changed from the project step in this launch (`change_project`): the login
 *   then saves the session and restarts the app (`Login` of area `access` reads it as its `projectChanged` prop);
 * - `notificationState`: the push token and provider of this device (`{ notification_app, notification_token,
 *   notification_provider? }`), sent with the login;
 * - `requestNotificationPermission()`: asks the system for the notification permission through the active push
 *   provider (OneSignal's prompt, or the system's for Firebase) and answers what it ended as. It is the only caller
 *   of the system prompt: nothing asks at launch or at login (the explainer sheet does, after the first sign-in).
 *
 * Without a provider (a component on its own, a test) nothing changed and every request is denied.
 */
export interface ShellState {
  projectChanged: boolean
  notificationState: Record<string, any>
  requestNotificationPermission: () => Promise<NotificationPermission>
}

export const SHELL_DEFAULTS: ShellState = {
  projectChanged: false,
  notificationState: {},
  requestNotificationPermission: async () => 'denied'
}

export const ShellContext = createContext<ShellState>(SHELL_DEFAULTS)

export const useShell = (): ShellState => useContext(ShellContext)
