import { useEffect, useState } from 'react'

import { useFormats } from '@/hooks/useFormats'
import { _retrieveStoreData, _setStoreData } from '../../providers/StoreUtil'
import { useOfflineActions } from '../../context/OfflineActions'
import { CACHE_KEYS } from './orderStatusGroups'

/** How many orders of each list are kept for an offline start (the storage is small; the newest are the ones that matter). */
const KEPT = { active: 100, completed: 30 }
/** The lists are written after they have been still for this long (ms), not on every socket event. */
const WRITE_AFTER = 1500

/**
 * The offline copy of the orders lists. Online, the open orders and History are written to storage after each change
 * (with the time of the write); the moment the network is lost, what the screen has stays, and an app that starts
 * offline reads the copy back. A change queued offline (`registerOffOrder`) hands its updated lists to the screen.
 * `keep` is false while the lists were read for one store (the store filter): that copy is not the account's. Returns when the copy was last written ("12:31 PM"), for the offline notice.
 */
export const useOrdersCache = ({ ordersGroup, setOrdersGroup, isNetConnected, keep = true }: { ordersGroup: any, setOrdersGroup: (update: any) => void, isNetConnected: boolean | null | undefined, keep?: boolean }): string | null => {
  const { time } = useFormats()
  const [offlineState] = useOfflineActions() as any
  const [syncedAt, setSyncedAt] = useState<string | null>(null)
  const offline = isNetConnected === false

  const active = ordersGroup?.active
  const completed = ordersGroup?.completed

  // Online: keep the copy.
  useEffect(() => {
    if (offline || !keep || !active?.fetched || active?.loading || !Array.isArray(active?.orders)) return
    const timer = setTimeout(() => {
      _setStoreData(CACHE_KEYS.active, active.orders.slice(0, KEPT.active))
      _setStoreData(CACHE_KEYS.syncedAt, new Date().toISOString())
    }, WRITE_AFTER)
    return () => clearTimeout(timer)
  }, [offline, keep, active?.orders, active?.fetched, active?.loading])
  useEffect(() => {
    if (offline || !keep || !completed?.fetched || completed?.loading || !Array.isArray(completed?.orders)) return
    const timer = setTimeout(() => _setStoreData(CACHE_KEYS.completed, completed.orders.slice(0, KEPT.completed)), WRITE_AFTER)
    return () => clearTimeout(timer)
  }, [offline, keep, completed?.orders, completed?.fetched, completed?.loading])

  // Offline: read the copy back into whatever list is empty, and say when it was written.
  useEffect(() => {
    if (!offline) { setSyncedAt(null); return }
    let alive = true
    const restore = async () => {
      const [cachedActive, cachedCompleted, at] = await Promise.all([
        _retrieveStoreData(CACHE_KEYS.active),
        _retrieveStoreData(CACHE_KEYS.completed),
        _retrieveStoreData(CACHE_KEYS.syncedAt)
      ])
      if (!alive) return
      setSyncedAt(typeof at === 'string' ? at : null)
      setOrdersGroup((previous: any) => {
        const fill = (slot: any, cached: any) => !slot?.orders?.length && Array.isArray(cached) && cached.length
          ? { ...slot, orders: cached, error: null, loading: false, fetched: true }
          : slot
        return { ...previous, active: fill(previous.active, cachedActive), completed: fill(previous.completed, cachedCompleted) }
      })
    }
    restore()
    return () => { alive = false }
  }, [offline])

  // A change made offline moves its order between the cached lists: the screen shows them.
  useEffect(() => {
    if (!offline || !offlineState?.orders) return
    setOrdersGroup((previous: any) => ({
      ...previous,
      ...(offlineState.orders.active && { active: { ...previous.active, orders: offlineState.orders.active, loading: false, fetched: true } }),
      ...(offlineState.orders.completed && { completed: { ...previous.completed, orders: offlineState.orders.completed, loading: false, fetched: true } })
    }))
  }, [offline, offlineState?.orders])

  return syncedAt ? time(syncedAt) || null : null
}
