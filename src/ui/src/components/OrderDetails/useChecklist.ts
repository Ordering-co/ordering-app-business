import { useCallback, useEffect, useRef, useState } from 'react'

import { _retrieveStoreData, _setStoreData } from '../../providers/StoreUtil'

/**
 * The preparation checklist of an order: which product lines the kitchen has made. It lives on this device only
 * (the API has no field for it), in one AsyncStorage entry keyed by order id; an entry nobody touched for
 * `MAX_AGE` is dropped the next time one is written, so the store never grows.
 */
export const CHECKLIST_KEY = 'order_checklists'
export const MAX_AGE = 3 * 24 * 60 * 60 * 1000

type Entry = { done: Array<string | number>, at: number }
type Store = Record<string, Entry>

export const pruneChecklists = (store: Store, now: number): Store =>
  Object.fromEntries(Object.entries(store).filter(([, entry]) => now - (entry?.at ?? 0) < MAX_AGE))

export const useChecklist = (orderId: number | string | undefined, enabled = true) => {
  const [done, setDone] = useState<Array<string | number>>([])
  const doneRef = useRef(done)
  doneRef.current = done
  // A line checked before the saved list came is not lost to it; writes go one after the other.
  const touched = useRef(false)
  const writes = useRef<Promise<void>>(Promise.resolve())
  const key = orderId === undefined || orderId === null ? null : String(orderId)

  useEffect(() => {
    touched.current = false
    setDone([])
    if (!enabled || key === null) return
    let cancelled = false
    ;(async () => {
      const store: Store = (await _retrieveStoreData(CHECKLIST_KEY)) ?? {}
      if (cancelled || touched.current) return
      const saved = Array.isArray(store[key]?.done) ? store[key].done : []
      // Nothing saved: the list is already empty, there is nothing to say.
      if (saved.length > 0) setDone(saved)
    })()
    return () => { cancelled = true }
  }, [key, enabled])

  const toggle = useCallback(async (id: string | number) => {
    if (key === null) return
    touched.current = true
    const previous = doneRef.current
    const next = previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]
    doneRef.current = next
    setDone(next)
    writes.current = writes.current.then(async () => {
      const store: Store = pruneChecklists((await _retrieveStoreData(CHECKLIST_KEY)) ?? {}, Date.now())
      store[key] = { done: next, at: Date.now() }
      await _setStoreData(CHECKLIST_KEY, store)
    })
    await writes.current
  }, [key])

  return { done, toggle }
}
