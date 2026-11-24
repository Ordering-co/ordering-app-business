import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { AppState } from 'react-native'

import { useWebsocket } from '@components'

/**
 * The one place that decides "the app has to catch up".
 *
 * The lists the driver looks at are kept fresh by the socket's events, and an event that came while the
 * socket was down is gone: after a drop the screens still show what they last knew. This provider watches
 * the socket the same way the connection chip does (`connect` after a `disconnect`: the chip going from red
 * to green) and tells whoever subscribed (`useOnReconnect`) to load again what it shows, once per reconnect:
 *
 * - the first connect of a socket is not a reconnect (the screens load themselves), unless it comes after a failed
 *   attempt (`connect_error`) or so late (`FIRST_CONNECT_LATE_MS`) that the lists loaded by HTTP long before and the
 *   events of the wait are lost: that one asks once, as a reconnect does;
 * - a connection that drops again before it settles is not told (the next connect is);
 * - the app coming back to the foreground after a while in the background (the system may have frozen the
 *   socket without a `disconnect` the app saw) asks the same, and shares the one wait with a reconnect that
 *   comes with it.
 *
 * Without a provider (a screen on its own, a test) nobody is told anything.
 */

/** How long a restored connection must hold before the screens are told, so a flapping one asks once. */
export const RECONNECT_SETTLE_MS = 1000
/** The shortest stay in the background that makes the screens load again when the app comes back. */
export const BACKGROUND_REFETCH_MS = 30000
/** A first connect later than this after the socket was set up (a server down, a slow network) has to catch up; a normal one does not. */
export const FIRST_CONNECT_LATE_MS = 5000
/** How long the network's return waits for the socket's own catch-up before it loads the lists itself (see `useCatchUp`). */
export const NETWORK_RETURN_WAIT_MS = 2500

type Listener = () => void
type Subscribe = (listener: Listener) => () => void

const ReconnectContext = createContext<Subscribe>(() => () => {})

export const SocketReconnectProvider = ({ children }: { children: React.ReactNode }) => {
  const socket: any = useWebsocket()
  const listeners = useRef(new Set<Listener>())

  const subscribe = useCallback<Subscribe>((listener) => {
    listeners.current.add(listener)
    return () => { listeners.current.delete(listener) }
  }, [])

  useEffect(() => {
    let dropped = false
    let connectedOnce = false
    const startedAt = Date.now()
    let backgroundAt: number | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    const cancel = () => {
      if (timer) clearTimeout(timer)
      timer = null
    }
    // Trailing: told once the connection has held for `RECONNECT_SETTLE_MS`; asking again inside the wait is the same ask.
    const ask = () => {
      cancel()
      timer = setTimeout(() => {
        timer = null
        listeners.current.forEach((listener) => listener())
      }, RECONNECT_SETTLE_MS)
    }
    const handleDisconnect = () => {
      dropped = true
      cancel()
    }
    // An attempt that failed (the server down or rejecting): the lists loaded without the socket, so the connect that
    // follows is a catch-up, even if it is the first one.
    const handleConnectError = () => {
      dropped = true
      cancel()
    }
    const handleConnect = () => {
      const late = !connectedOnce && Date.now() - startedAt >= FIRST_CONNECT_LATE_MS
      connectedOnce = true
      if (!dropped && !late) return
      dropped = false
      ask()
    }
    socket?.on?.('connect', handleConnect)
    socket?.on?.('disconnect', handleDisconnect)
    socket?.on?.('connect_error', handleConnectError)

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundAt = Date.now()
      } else if (state === 'active') {
        const since = backgroundAt
        backgroundAt = null
        if (since !== null && Date.now() - since >= BACKGROUND_REFETCH_MS) ask()
      }
    })

    return () => {
      cancel()
      socket?.off?.('connect', handleConnect)
      socket?.off?.('disconnect', handleDisconnect)
      socket?.off?.('connect_error', handleConnectError)
      appState.remove()
    }
  }, [socket])

  const value = useMemo(() => subscribe, [subscribe])
  return <ReconnectContext.Provider value={value}>{children}</ReconnectContext.Provider>
}

/**
 * Runs `handler` when the app has to catch up (see the provider). The latest handler is the one called, so
 * a screen passes its reload function as it is and never has to memoize it.
 */
export const useOnReconnect = (handler: () => void) => {
  const subscribe = useContext(ReconnectContext)
  const latest = useRef(handler)
  latest.current = handler
  useEffect(() => subscribe(() => latest.current()), [subscribe])
}

/**
 * The catch-up of a screen that loads its lists: the socket's reconnect (`useOnReconnect`) and the network's return
 * (`online` going from false to true) both mean the events of a gap are lost, and they usually come together. They are
 * one refresh:
 *
 * - the socket's reconnect loads at once (when `online`) and answers for a network return that comes right after it;
 * - the network's return waits `NETWORK_RETURN_WAIT_MS` for the socket's reconnect and loads by itself only if none came
 *   (the network was down and the socket never dropped), so a socket that connects some seconds later still catches up
 *   what the early load could not see.
 */
export const useCatchUp = ({ online, refresh }: { online: boolean, refresh: () => void }) => {
  const latest = useRef(refresh)
  latest.current = refresh
  const wasOnline = useRef(online)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const socketAskedAt = useRef<number | null>(null)

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  useOnReconnect(() => {
    if (!online) return
    cancel()
    socketAskedAt.current = Date.now()
    latest.current()
  })

  useEffect(() => {
    if (!online) cancel()
    else if (!wasOnline.current) {
      const answered = socketAskedAt.current !== null && Date.now() - socketAskedAt.current < NETWORK_RETURN_WAIT_MS
      if (!answered) {
        cancel()
        timer.current = setTimeout(() => {
          timer.current = null
          latest.current()
        }, NETWORK_RETURN_WAIT_MS)
      }
    }
    wasOnline.current = online
  }, [online])

  useEffect(() => cancel, [])
}
