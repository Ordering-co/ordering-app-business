import { useEffect, useRef, useState } from 'react'

/**
 * How long the launch may wait for the API before the app goes on with what it has cached. An API that accepts
 * the connection and never answers (a proxy that stalls, a captive network) would otherwise keep the loading page
 * up for as long as it hangs: the shared logic's requests have no client timeout. Same rule as the driver app.
 */
export const LAUNCH_TIME_LIMIT_MS = 15000

/** How long the notice of the limit stays up (the toast's own default is 3 s: too short to read as a launch's). */
export const LAUNCH_NOTICE_MS = 8000

/**
 * The launch's fail-safe, held in one place for `RootNavigator`: says when the loading page may leave.
 *
 * - Normally: once the launch is `loaded` (what only the network answers: the order options, the push setup, or no
 *   session and its configs).
 * - At the limit, counted from the mount of the navigator, and only while the launch has not opened: as soon as the
 *   session is read from the device (storage, never the network): the gates that wait for an answer open, whatever
 *   the API does. Nothing is skipped for good: the gates stay what they are, so every effect that waits for `loaded`
 *   (the push order) or for the answers (the push setup) runs when the answer comes, as in a normal launch.
 *
 * The timer is one shot: it starts at the mount, a launch that opens before the limit cancels it for good, and
 * `onLimit` runs once when it fires, told whether the launch had `loaded` (the API answered) so the notice can be
 * only for the API.
 */
export const useLaunchTimeLimit = ({
  loaded,
  sessionLoading,
  onLimit
}: {
  loaded: boolean
  sessionLoading?: boolean
  onLimit?: (state: { loaded: boolean }) => void
}): boolean => {
  const [timedOut, setTimedOut] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onLimitRef = useRef(onLimit)
  onLimitRef.current = onLimit
  // What the timer reads when it fires (its closure is the mount's).
  const loadedRef = useRef(loaded)
  loadedRef.current = loaded

  useEffect(() => {
    timer.current = setTimeout(() => {
      timer.current = null
      setTimedOut(true)
      onLimitRef.current?.({ loaded: loadedRef.current })
    }, LAUNCH_TIME_LIMIT_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  // The launch has opened on its own: the limit has nothing left to do.
  useEffect(() => {
    if (loaded && timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [loaded])

  return loaded || (timedOut && !sessionLoading)
}
