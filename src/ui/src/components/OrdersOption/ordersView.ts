import { useCallback, useContext, useSyncExternalStore } from 'react'
import { ThemeContext } from 'styled-components/native'

import { useSession } from '@components'
import { themeVisible } from '@/theme/helpers'

/**
 * What the orders screens remember while the app lives, for the signed-in user: the store the lists are narrowed to (the
 * "store view": chosen in the search and filter sheet, or in the header's chip when the theme draws one) and the stage chip of
 * In progress that is open, and the chip of New (Pending or Preorder). It is outside the
 * screens, so a tab left and returned to, or a tablet turned round (another screen with its own controller), starts where the
 * user left it. Another user starts clean (the same rule as `storesSeen`).
 */
export type Stage = 'all' | 'preparing' | 'ready' | 'with_driver'
/** The two chips of New: Pending (status 0) and Preorder (status 13). */
export type NewStage = 'pending' | 'preorder'
/** Any list the chips open: a stage of In progress or a chip of New. */
export type ListKey = Stage | NewStage

export interface StoreChoice {
  id: string
  name: string
  logo?: string
}

interface View {
  store: StoreChoice | null
  stage: Stage
  newStage: NewStage
}

const FRESH: View = { store: null, stage: 'preparing', newStage: 'pending' }

let owner: string | number | null = null
let view: View = FRESH
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

const update = (user: string | number | null, patch: Partial<View>) => {
  if (owner !== user) {
    owner = user
    view = FRESH
  }
  // The same store again changes nothing (no render, no new request).
  if ('store' in patch && Object.keys(patch).length === 1 && storeKey(patch.store?.id) === storeKey(view.store?.id)) return
  view = { ...view, ...patch }
  listeners.forEach((listener) => listener())
}

/** For tests: forgets the choices. */
export const resetOrdersView = () => {
  owner = null
  view = FRESH
  listeners.forEach((listener) => listener())
}

/** The store ids are text everywhere the app compares them (an order's `business_id` is a number, a filter's value may be either). */
export const storeKey = (id: unknown): string => (id === undefined || id === null ? '' : String(id))

/** The chosen stage chip of In progress, and how to change it. */
export const useStage = (): [Stage, (stage: Stage) => void] => {
  const [session] = useSession() as any
  const user = session?.user?.id ?? null
  const current = useSyncExternalStore(subscribe, () => (owner === user ? view : FRESH))
  const setStage = useCallback((stage: Stage) => update(user, { stage }), [user])
  return [current.stage, setStage]
}

/** The chosen chip of New (Pending by default), and how to change it. */
export const useNewStage = (): [NewStage, (stage: NewStage) => void] => {
  const [session] = useSession() as any
  const user = session?.user?.id ?? null
  const current = useSyncExternalStore(subscribe, () => (owner === user ? view : FRESH))
  const setNewStage = useCallback((newStage: NewStage) => update(user, { newStage }), [user])
  return [current.newStage, setNewStage]
}

/**
 * The store view: the store the lists, the stage lists and the board are narrowed to (`null`: all of them), and how
 * to change it. It does not depend on the theme: a store is chosen in the search and filter sheet, which has its Store row for
 * an account of more than one store. `chip` is the theme's `orders.store_filter`: only whether the headers draw the store chip
 * (which applies a choice at once); with it off the store is named by the search button and the notice instead.
 * `getStore` reads the store now, for a handler that runs in the same tick as the change.
 */
export const useStoreFilter = () => {
  // Read without throwing: a hook of the lists mounted on its own (a test) has no theme.
  const theme: any = useContext(ThemeContext)
  const [session] = useSession() as any
  const user = session?.user?.id ?? null
  const current = useSyncExternalStore(subscribe, () => (owner === user ? view : FRESH))
  const chip = !!theme?.values && themeVisible(theme, 'orders.store_filter')
  const setStore = useCallback((store: StoreChoice | null) => update(user, { store }), [user])
  const getStore = useCallback((): StoreChoice | null => (owner === user ? view : FRESH).store, [user])
  return { chip, store: current.store, setStore, getStore }
}

/** Whether a set of controller filters asks for nothing besides the store (the controller reads any non-null set as "filters on"). */
const asksNothingBesidesStore = (filters: any): boolean =>
  !filters.id && !filters.external_id && !filters.customer && !filters.state && !filters.date?.from && !filters.delivery_type &&
  !filters.driver && !filters.paymethod && !filters.city && !filters.timeStatus

/**
 * The search the screens see: the controller's filters without the store view's part. A set that holds only the store is the
 * store view, not a search (no result tabs): the screens see `null` for it.
 */
export const searchPart = (filters: any): any => {
  if (!filters) return null
  return asksNothingBesidesStore(filters) ? null : filters
}

/** The controller's filters for a search (or none) and the chosen store: the store is always a part of what the controller asks. */
export const withStore = (filters: any, business: string): any => {
  const rest = filters ? { ...filters, business } : null
  if (rest) return rest
  return business ? { business } : null
}
