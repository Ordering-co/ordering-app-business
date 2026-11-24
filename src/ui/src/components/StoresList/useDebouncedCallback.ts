import { useCallback, useEffect, useRef } from 'react'

/**
 * A function that waits `delayMs` after its last call (the search boxes: one request when the typing stops). The
 * pending call is dropped when the component goes. `flush` runs it at once; `cancel` drops it.
 */
export const useDebouncedCallback = <T extends (...args: any[]) => void>(callback: T, delayMs: number) => {
  const latest = useRef(callback)
  latest.current = callback
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])
  useEffect(() => cancel, [cancel])
  const call = useCallback((...args: Parameters<T>) => {
    cancel()
    timer.current = setTimeout(() => {
      timer.current = null
      latest.current(...args)
    }, delayMs)
  }, [cancel, delayMs])
  return { call, cancel }
}
