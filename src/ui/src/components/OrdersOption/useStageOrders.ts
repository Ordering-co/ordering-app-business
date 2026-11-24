import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useApi, useEvent, useSession } from '@components'
import { askOrders, LIST_STATUSES } from './orderQuery'
import { mergeOrderChange, ORDER_CHANGED_EVENT, sameOrder } from './orderChanges'
import { buildRows, type OrderRow } from './splitOrders'
import type { ListKey } from './ordersView'

/**
 * The lists the chips open, each its own paged list: the stages of In progress (All, Preparing, Ready for pickup, With driver) and
 * the two halves of New (Pending, Preorder): the first page of 50 when the chip is opened, the next ones when its end is reached,
 * the pull to refresh. "All" is every in-progress status in one list (an order that changes stage stays in it, with its new status).
 * They are the app's own requests
 * (the controller's `active` slot is one list of every open order, and holds only the newest pages of it).
 *
 * Why not the controller's filtered request: that one is the search's (its "searching" state, its notices and its result tabs
 * would show, and a search and a stage could not be open together), it is one slot for any stage, and the controller gives its
 * list no socket events. These lists hear them (`order_updated`, `order_added`) and the app's own changes
 * (`ORDER_CHANGED_EVENT`), which move an order out of one stage and into another.
 *
 * The next page is asked as "older than the last order of the page before" (`beforeId`), not as page N + 1: orders leave a stage
 * while it is read (marked ready, accepted by a driver), and an offset would skip the ones that moved up.
 */
export const STAGE_PAGE_SIZE = 50
const STAGES: ListKey[] = ['all', 'preparing', 'ready', 'with_driver', 'pending', 'preorder']

interface StageList {
  orders: any[]
  /** The orders the app itself just moved here (marked ready…): they head the list until it is read again. */
  pinned: Array<number | string>
  /** The oldest order of what the server sent: where the next page starts. */
  cursor?: number
  fetched: boolean
  loading: boolean
  loadingMore: boolean
  refreshing: boolean
  hasMore: boolean
  error: any[] | null
  /** Read again when it is opened (something changed that this list did not see). */
  stale: boolean
  /** The store it was read for. */
  business: string
}

type Lists = Record<ListKey, StageList>

const fresh = (business: string): StageList => ({
  orders: [], pinned: [], fetched: false, loading: false, loadingMore: false, refreshing: false, hasMore: false, error: null, stale: false, business
})
const freshLists = (business: string): Lists => ({
  all: fresh(business), preparing: fresh(business), ready: fresh(business), with_driver: fresh(business), pending: fresh(business), preorder: fresh(business)
})
const zeros = (): Record<ListKey, number> => ({ all: 0, preparing: 0, ready: 0, with_driver: 0, pending: 0, preorder: 0 })

/** The lists that hold an order of this status: its own, and "All" for an order in progress. */
const listsOfStatus = (status: number): ListKey[] => STAGES.filter((key) => LIST_STATUSES[key].includes(status))

const holds = (list: StageList, id: any) => list.orders.some((order) => sameOrder(order.id, id))
const without = (list: StageList, id: any): StageList => ({
  ...list,
  orders: list.orders.filter((order) => !sameOrder(order.id, id)),
  pinned: list.pinned.filter((pin) => !sameOrder(pin, id))
})

/** The list as it is drawn: what the app just moved first (the latest first), then newest by number. */
export const orderedStage = (list: StageList): any[] => {
  const byId = (a: any, b: any) => Number(b.id) - Number(a.id)
  if (!list.pinned.length) return [...list.orders].sort(byId)
  const pinned = list.pinned.map((id) => list.orders.find((order) => sameOrder(order.id, id))).filter(Boolean)
  const rest = list.orders.filter((order) => !list.pinned.some((id) => sameOrder(id, order.id))).sort(byId)
  return [...pinned, ...rest]
}

interface Options {
  /** The stage lists are the ones drawn (the theme's `orders.stage_filter`, the In progress tab, no search). */
  enabled: boolean
  /** The list in view: a stage of In progress, or a chip of New. */
  stage: ListKey
  business: string
  online: boolean
  /** An order as another list holds it (the controller's `active` slot): what an order accepted in New is moved from. */
  lookup: (id: number | string) => any
}

export const useStageOrders = ({ enabled, stage, business, online, lookup }: Options) => {
  const [ordering] = useApi() as any
  const [{ token }] = useSession() as any
  const [events] = useEvent() as any
  const [lists, setLists] = useState<Lists>(() => freshLists(business))
  const listsRef = useRef(lists)
  listsRef.current = lists
  const latest = useRef({ ordering, token, business, lookup })
  latest.current = { ordering, token, business, lookup }
  const alive = useRef(true)
  const requests = useRef<Record<ListKey, number>>(zeros())
  // The request of each stage that is on its way (its number, 0 when none): a second ask in the same moment, before a render, sees it.
  const flying = useRef<Record<ListKey, number>>(zeros())

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const load = useCallback(async (key: ListKey, mode: 'first' | 'refresh' | 'more') => {
    const { ordering: api, token: access, business: store } = latest.current
    if (!access || typeof api?.setAccessToken !== 'function') return
    const mine = ++requests.current[key]
    flying.current[key] = mine
    const beforeId = mode === 'more' ? listsRef.current[key].cursor : undefined
    setLists((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        loading: mode === 'first',
        refreshing: mode === 'refresh',
        loadingMore: mode === 'more',
        error: mode === 'more' ? previous[key].error : null
      }
    }))
    const stillWanted = () => alive.current && mine === requests.current[key] && store === latest.current.business
    const done = () => { if (flying.current[key] === mine) flying.current[key] = 0 }
    try {
      const { orders, total } = await askOrders(api, access, { statuses: LIST_STATUSES[key], business: store, beforeId, pageSize: STAGE_PAGE_SIZE })
      done()
      if (!stillWanted()) return
      const hasMore = total !== null ? total > orders.length : orders.length >= STAGE_PAGE_SIZE
      setLists((previous) => {
        const current = previous[key]
        const known = new Set(current.orders.map((order) => String(order.id)))
        const oldest = orders.length ? Math.min(...orders.map((order) => Number(order.id))) : current.cursor
        return {
          ...previous,
          [key]: {
            ...current,
            orders: mode === 'more' ? [...current.orders, ...orders.filter((order) => !known.has(String(order.id)))] : orders,
            // A refresh is the server's order; the first read keeps what the app moved here before it (a stage not opened yet).
            pinned: mode === 'refresh' ? [] : current.pinned,
            cursor: oldest,
            fetched: true,
            loading: false,
            refreshing: false,
            loadingMore: false,
            hasMore,
            error: null,
            stale: false,
            business: store
          }
        }
      })
    } catch (error: any) {
      done()
      if (!stillWanted() || error?.constructor?.name === 'Cancel') return
      setLists((previous) => ({
        ...previous,
        [key]: { ...previous[key], loading: false, refreshing: false, loadingMore: false, error: [error?.message ?? 'ERROR'] }
      }))
    }
  }, [])

  // Another store: every list is read again for it.
  const lastBusiness = useRef(business)
  useEffect(() => {
    if (lastBusiness.current === business) return
    lastBusiness.current = business
    STAGES.forEach((key) => { requests.current[key] += 1 })
    setLists(freshLists(business))
  }, [business])

  // The stage in view is read when it is opened, and again when it was marked stale.
  const view = lists[stage]
  useEffect(() => {
    if (!enabled || !online || view.business !== business) return
    if (view.loading || view.refreshing) return
    if (!view.fetched) load(stage, 'first')
    else if (view.stale) load(stage, 'refresh')
  }, [enabled, online, stage, business, view.business, view.fetched, view.stale, load]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Reads the stage in view again (the pull, the refresh button, a reconnect); the others are read again when they are opened. With
   * no stage in view (the New tab) every list is only marked, to be read when its chip is opened.
   */
  const refresh = useCallback(() => {
    setLists((previous) => {
      const next = { ...previous }
      STAGES.forEach((key) => { if ((!enabled || key !== stage) && previous[key].fetched) next[key] = { ...previous[key], stale: true } })
      return next
    })
    if (enabled && online) load(stage, listsRef.current[stage].fetched ? 'refresh' : 'first')
  }, [enabled, online, stage, load])

  const loadMore = useCallback(() => {
    const list = listsRef.current[stage]
    if (!enabled || !online || !list.hasMore || list.loading || list.loadingMore || list.refreshing || list.cursor === undefined || flying.current[stage]) return
    load(stage, 'more')
  }, [enabled, online, stage, load])

  // An order changed: out of the stage it left, into the one it entered. The app's own change heads the list it entered.
  const place = useCallback((incoming: any, own: boolean) => {
    const id = incoming?.id
    if (id === undefined || id === null) return
    const hasStatus = incoming.status !== undefined && incoming.status !== null && incoming.status !== ''
    const targets = hasStatus ? listsOfStatus(Number(incoming.status)) : []
    setLists((previous) => {
      let source: any = null
      for (const key of STAGES) {
        const found = previous[key].orders.find((order) => sameOrder(order.id, id))
        if (found) { source = found; break }
      }
      source = source ?? latest.current.lookup(id)
      let next = previous
      const set = (key: ListKey, list: StageList) => { next = { ...next, [key]: list } }
      for (const key of STAGES) {
        const list = next[key]
        const has = holds(list, id)
        if (!hasStatus) {
          // A change of something else (the driver, a message count): the order stays where it is.
          if (has) set(key, { ...list, orders: list.orders.map((order) => (sameOrder(order.id, id) ? mergeOrderChange(order, incoming) : order)) })
        } else if (!targets.includes(key)) {
          if (has) set(key, without(list, id))
        } else if (has) {
          set(key, { ...list, orders: list.orders.map((order) => (sameOrder(order.id, id) ? mergeOrderChange(order, incoming) : order)) })
        } else if (list.fetched) {
          // Newer than the oldest order read: it belongs in what is loaded. Older, with more pages to come: its page will bring it.
          const inRange = !list.hasMore || list.cursor === undefined || Number(id) >= list.cursor
          const base = source ?? (incoming.products ? incoming : null)
          if (!base) set(key, { ...list, stale: true })
          else if (own || inRange) {
            const merged = mergeOrderChange(base, incoming)
            set(key, { ...list, orders: [...list.orders, merged], pinned: own ? [id, ...list.pinned] : list.pinned })
          }
        } else if (own) {
          // A stage that is not read yet: the order the app moved into it heads it when it is.
          set(key, { ...list, pinned: [id, ...list.pinned] })
        }
      }
      return next
    })
  }, [])

  useEffect(() => {
    const changed = (order: any) => place(order, true)
    const heard = (order: any) => place(order, false)
    events.on(ORDER_CHANGED_EVENT, changed)
    events.on('order_updated', heard)
    events.on('order_added', heard)
    return () => {
      events.off(ORDER_CHANGED_EVENT, changed)
      events.off('order_updated', heard)
      events.off('order_added', heard)
    }
  }, [events, place])

  const rows = useMemo<OrderRow[]>(() => buildRows(orderedStage(view)), [view])
  const everyOrder = useMemo(() => STAGES.flatMap((key) => lists[key].orders), [lists])

  return {
    rows,
    /** Nothing to show yet: the first page of the stage is on its way. */
    loading: enabled && online && view.business === business && !view.fetched && !view.error,
    loadingMore: view.loadingMore,
    hasMore: view.hasMore,
    error: view.error,
    /** The stage was read (a list that is not read has no rows to show, whatever it holds). */
    fetched: view.fetched,
    /** A request of any stage is on its way: the pull's spinner stays until all are done. */
    busy: STAGES.some((key) => lists[key].loading || lists[key].refreshing || lists[key].loadingMore),
    orders: everyOrder,
    loadMore,
    refresh
  }
}
