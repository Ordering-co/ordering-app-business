import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useSession } from '@components'
import { useStoreFilter } from '../OrdersOption/ordersView'
import type { OrderListItem } from './index'

/**
 * Whether the account has more than one store, as the order cards need it (the store's logo and name are drawn only then: a
 * single-store account does not repeat its own name on every card).
 *
 * The session does not know the stores (an admin has no list, a business owner's `business_id` is one), and asking the Stores
 * list again for a count is a request per list. What every list already holds is the orders: the distinct `business_id` of the
 * rows. Once a second store has been seen it stays on for the session (the user's), whatever tab, filter or page is on screen,
 * so the line never flickers off while pages load or a tab holds the orders of one store only.
 */
let owner: string | number | null = null
let seenIds = new Set<string>()
let multiple = false
// How many stores the account has, once the store list (the store filter's source) has said: it settles the question at once.
let storeTotal: number | null = null
let totalOwner: string | number | null = null
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** The store an order belongs to (`business_id`, or the id inside `business`). */
export const storeIdOf = (order: any): string | undefined => {
  const id = order?.business_id ?? order?.business?.id
  return id === undefined || id === null || id === '' ? undefined : String(id)
}

/** The distinct stores of the rows of a list. */
const distinctStores = (items: OrderListItem[]): string[] => {
  const ids = new Set<string>()
  for (const item of items) {
    if (item.kind !== 'row') continue
    for (const order of item.row.orders) {
      const id = storeIdOf(order)
      if (id !== undefined) ids.add(id)
    }
  }
  return Array.from(ids)
}

const note = (user: string | number | null, ids: string[]) => {
  let changed = false
  if (owner !== user) {
    owner = user
    seenIds = new Set()
    multiple = false
    changed = true
  }
  for (const id of ids) seenIds.add(id)
  if (!multiple && seenIds.size > 1) {
    multiple = true
    changed = true
  }
  if (changed) listeners.forEach((listener) => listener())
}

/** The account's number of stores, as the store list's pagination says it. More than one: the cards name their store from the first row. */
export const noteStoreTotal = (user: string | number | null, count: number | null) => {
  // No store listed is not "no store": the orders say which stores there are (a list that came back empty tells nothing).
  const total = count !== null && count > 0 ? count : null
  if (totalOwner === user && storeTotal === total) return
  totalOwner = user
  storeTotal = total
  listeners.forEach((listener) => listener())
}

/** For tests: forgets the stores seen. */
export const resetStoresSeen = () => {
  owner = null
  seenIds = new Set()
  multiple = false
  storeTotal = null
  totalOwner = null
}

/**
 * Whether the cards name their store. With the account's number of stores known (the store filter's list) that decides: more than
 * one, yes from the first card; exactly one, no. Until it is known, more than one store has been seen in this session (by the rows
 * of `items` now, or by any list before). With a store chosen in the store filter every card is that store's: no line.
 */
export const useMultiStore = (items: OrderListItem[]): boolean => {
  const [session] = useSession() as any
  const user = session?.user?.id ?? null
  const { store } = useStoreFilter()
  const seen = useSyncExternalStore(subscribe, () => multiple && owner === user)
  const total = useSyncExternalStore(subscribe, () => (totalOwner === user ? storeTotal : null))
  const here = useMemo(() => distinctStores(items), [items])
  useEffect(() => { note(user, here) }, [user, here])
  if (store) return false
  if (total !== null) return total > 1
  return seen || here.length > 1
}
