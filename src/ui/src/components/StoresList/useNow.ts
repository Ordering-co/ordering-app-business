import { useEffect, useState } from 'react'

/**
 * The current time, refreshed every `everyMs` (a minute by default): a pause ends and a store opens by the clock,
 * so the list's states follow it without a request.
 */
export const useNow = (everyMs = 60000): Date => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), everyMs)
    return () => clearInterval(id)
  }, [everyMs])
  return now
}
