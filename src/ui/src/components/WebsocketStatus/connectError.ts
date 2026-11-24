import { useEffect, useState } from 'react'

import { useWebsocket } from '@components'

/**
 * Why the socket could not connect, as the app can tell it. The socket's `connect_error` carries the server's own
 * message: a rejected session says so (`invalid signature`, `jwt malformed`, `Token expired.`, `Project ... not valid`...), a network or a server
 * that is down says something else (`xhr poll error`, `websocket error`, `timeout`...). The sheet tells the two apart.
 */
const AUTH_ERROR = /jwt|token|signature|\binvalid\b|not valid|unauthori[sz]ed|forbidden|not authori[sz]ed|authenticat|credential|invalid session|session expired/i

/** True when the message of a `connect_error` is the server refusing the session (not a network that fails). */
export const isAuthConnectError = (message: string | null | undefined): boolean => !!message && AUTH_ERROR.test(message)

/**
 * The message of the last `connect_error` of the socket, `null` before one and after the next `connect`. It listens through
 * the socket manager (`on` / `off`), which holds the subscription until the underlying socket exists and passes it to it,
 * and stops listening when the manager changes (a new session) or the screen leaves.
 */
export const useLastConnectError = (skip: boolean = false): string | null => {
  const socket: any = useWebsocket()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (skip || typeof socket?.on !== 'function') return
    const handleError = (error: any) => setMessage(String(error?.message ?? error ?? 'error'))
    const handleConnect = () => setMessage(null)
    socket.on('connect_error', handleError)
    socket.on('connect', handleConnect)
    return () => {
      setMessage(null)
      socket.off?.('connect_error', handleError)
      socket.off?.('connect', handleConnect)
    }
  }, [socket, skip])

  return skip ? null : message
}

/**
 * What the sheet knows of the last connect error, in two layers. A controller that reports it (the `connectError` prop, `null`
 * when there is none, and `connectErrorIsAuth`) is the one read, and the app does not listen to the socket itself; a controller
 * that does not (the prop is `undefined`) leaves the app's own subscription and its own reading of the message.
 */
export const useConnectFailure = ({ connectError, connectErrorIsAuth }: { connectError?: string | null, connectErrorIsAuth?: boolean }): { message: string | null, rejected: boolean } => {
  const reported = connectError !== undefined
  const own = useLastConnectError(reported)
  if (reported) {
    // The controller's flag is the socket's own narrow rule (the one rejection it stops retrying on); a message the app reads as a
    // rejection (a project or a token the server does not accept) is one too, whether or not the socket keeps retrying.
    return { message: connectError, rejected: connectErrorIsAuth === true || isAuthConnectError(connectError) }
  }
  return { message: own, rejected: isAuthConnectError(own) }
}
