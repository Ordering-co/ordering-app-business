import React, { useMemo } from 'react'
import { useShell } from '../context/ShellContext'

const wrapped = new WeakMap<React.ComponentType<any>, React.ComponentType<any>>()

/**
 * A signed-out screen given what the root navigator knows (`ShellContext`): `projectChanged` as a prop and the
 * device's push state as `route.params.notification_state` (what `Login` of area `access` reads to send the push
 * token with the login). Wrapped once per screen component, so the screen's type is stable and never remounts.
 */
export const withShellProps = (Screen: React.ComponentType<any>): React.ComponentType<any> => {
  const known = wrapped.get(Screen)
  if (known) return known
  const WithShellProps = (props: any) => {
    const { projectChanged, notificationState } = useShell()
    const route = useMemo(
      () => ({ ...props.route, params: { ...props.route?.params, notification_state: notificationState } }),
      [props.route, notificationState]
    )
    return <Screen {...props} route={route} projectChanged={projectChanged} />
  }
  WithShellProps.displayName = `WithShellProps(${(Screen as any).displayName || Screen.name || 'Screen'})`
  wrapped.set(Screen, WithShellProps)
  return WithShellProps
}
