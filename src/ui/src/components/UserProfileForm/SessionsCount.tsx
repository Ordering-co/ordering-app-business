import React, { useEffect } from 'react'

import { Sessions as SessionsController } from '@components'

/** Hands the number of signed-in devices to the profile once the list is read (nothing while it loads or fails). */
const Reporter = ({ sessionsList, onCount }: { sessionsList?: any, onCount: (count: number) => void }) => {
  const ready = sessionsList && !sessionsList.loading && !sessionsList.error && Array.isArray(sessionsList.sessions)
  const count = ready ? sessionsList.sessions.length : null
  useEffect(() => {
    if (count !== null) onCount(count)
  }, [count])
  return null
}

/**
 * Reads the user's sessions once (the sessions controller, the same request the Sessions screen makes) for the
 * Profile's "3 devices signed in". It draws nothing; mount it only for the `jwt_session` strategy.
 */
export const SessionsCount = ({ onCount }: { onCount: (count: number) => void }) => (
  <SessionsController onCount={onCount} UIComponent={Reporter} />
)

/**
 * The most sessions the Profile's row words as "devices signed in". The API lists sessions (one per sign-in, expired or
 * forgotten ones included), not devices, so a count far beyond what a business owns ("822 devices") would mislead:
 * above this the row says nothing and the Sessions screen has the list.
 */
export const MAX_SESSIONS_SHOWN = 20

/** "3 devices signed in" (as the Profile mockup words it), "1 device signed in", or nothing for no count or an absurd one. */
export const sessionsSummary = (count: number | null, t: (key: string, fallback: string) => string): string | undefined => {
  if (count === null || count < 1 || count > MAX_SESSIONS_SHOWN) return undefined
  if (count === 1) return t('DEVICE_SIGNED_IN', '1 device signed in')
  return t('DEVICES_SIGNED_IN', '_count_ devices signed in').replace('_count_', `${count}`)
}
