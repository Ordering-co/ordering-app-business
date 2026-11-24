import { slotOf } from './orderStatusGroups'

/**
 * A status change the app itself made is applied to the lists from the server's answer, so the list never waits for a
 * socket event for its own action (the event still reaches the controller for changes made elsewhere, and it is
 * idempotent with what is applied here). A screen that changes an order outside the list (the details, the new-order
 * alert) tells the list through `ORDER_CHANGED_EVENT` with the order the server answered.
 */
export const ORDER_CHANGED_EVENT = 'order_changed_by_app'

/** The orders a `handleChangeOrderStatus` answer holds: one per id, `null` for the one that failed. */
export const changedOrdersFromAnswer = (answer: any, ids: Array<number | string>, status?: number): any[] => {
  if (!Array.isArray(answer)) return []
  const changed: any[] = []
  answer.forEach((item: any, index: number) => {
    if (!item || typeof item !== 'object' || item.error) return
    // `withDetails`: `{ id, result, error }`; otherwise the answer is the order itself.
    const hasDetails = 'result' in item && ('id' in item) && !('status' in item)
    const order = hasDetails ? item.result : item
    if (!order || typeof order !== 'object' || Array.isArray(order)) return
    const id = order.id ?? (hasDetails ? item.id : undefined) ?? ids[index]
    if (id === undefined || id === null) return
    const next: any = { ...order, id }
    if (next.status === undefined && status !== undefined) next.status = status
    if (next.status === undefined) return
    changed.push(next)
  })
  return changed
}

type Slots = Record<string, any>

/** The order as the lists hold it with the server's answer on top (the answer does not carry the list's own `summary` amounts). */
export const mergeOrderChange = (existing: any, change: any): any => {
  const merged: any = { ...existing, ...change, showNotification: false }
  // The list payload carries the amounts as `summary`: the API's flat ones would shadow them.
  if (existing?.summary) { delete merged.total; delete merged.subtotal }
  return merged
}

/**
 * The search results with the app's own changes on top. The controller never hands the UI a way to write its filtered list
 * (and its socket handlers keep only the three slots of `ordersGroup`), so what the app changed is kept apart, by order id,
 * and laid over the controller's results until the search is made again.
 */
export const overlayChanges = (orders: any[], changes: Record<string, any>): any[] =>
  orders.map((order) => (order && changes[order.id] ? mergeOrderChange(order, changes[order.id]) : order))

/** The same order, whether an id came as a number or as text (a socket row, a route's param, the server's answer). */
export const sameOrder = (a: any, b: any): boolean => a !== undefined && a !== null && b !== undefined && b !== null && Number(a) === Number(b)

const holds = (list: any, id: number | string) => Array.isArray(list) && list.some((item: any) => !Array.isArray(item) && sameOrder(item?.id, id))

/**
 * `ordersGroup` with the order's new state in it: updated where it is when its list still is the one its status belongs to,
 * otherwise moved to the list of its status (at its place by number, newest first) with the lists corrected. An order
 * the lists do not hold is left alone (its list loads it), and History only takes the statuses its filter keeps.
 */
export const applyOrderChange = (group: Slots, change: any): Slots => {
  if (!group || !change || change.id === undefined || change.id === null || change.status === undefined) return group
  const from = (['active', 'completed'] as const).find((key) => holds(group[key]?.orders, change.id))
  if (!from) return group
  const existing = group[from].orders.find((item: any) => !Array.isArray(item) && sameOrder(item?.id, change.id))
  const merged = mergeOrderChange(existing, change)
  const to = slotOf(merged.status)

  if (to === from) {
    const filter: number[] | undefined = group[from].currentFilter
    const kept = !filter || filter.includes(Number(merged.status))
    const orders = kept
      ? group[from].orders.map((item: any) => (!Array.isArray(item) && sameOrder(item?.id, merged.id) ? merged : item))
      : group[from].orders.filter((item: any) => Array.isArray(item) || !sameOrder(item?.id, merged.id))
    return { ...group, [from]: { ...group[from], orders, ...(kept ? {} : { pagination: shifted(group[from].pagination, -1) }) } }
  }

  const source = group[from]
  const target = group[to]
  const out = { ...group, [from]: { ...source, orders: source.orders.filter((item: any) => Array.isArray(item) || !sameOrder(item?.id, merged.id)), pagination: shifted(source.pagination, -1) } }
  const filter: number[] | undefined = target?.currentFilter
  // A list that has not loaded yet gets the order when it loads; one that filters the status out does not show it.
  if (!target?.fetched || !Array.isArray(target.orders) || (filter && !filter.includes(Number(merged.status)))) return out
  const orders = [...target.orders.filter((item: any) => Array.isArray(item) || !sameOrder(item?.id, merged.id)), merged]
  orders.sort((a: any, b: any) => (Array.isArray(a) || Array.isArray(b) ? 0 : b.id - a.id))
  out[to] = { ...target, orders, pagination: shifted(target.pagination, 1) }
  return out
}

/**
 * A list of conversations (the Messages tab) with the app's own change on top: the row of that order takes the new status, and
 * nothing else of the answer (the row's unread counts and last message are the conversation's, not the order's). The same
 * list is returned when no row is that order, so a list that does not hold it is left alone.
 */
export const applyStatusToRows = (rows: any[] | undefined, change: any): any[] | undefined => {
  if (!Array.isArray(rows) || change?.status === undefined || change?.status === null) return rows
  if (!rows.some((row) => sameOrder(row?.id, change.id) && Number(row?.status) !== Number(change.status))) return rows
  return rows.map((row) => (sameOrder(row?.id, change.id) ? { ...row, status: change.status } : row))
}

const shifted = (pagination: any, by: number) =>
  pagination && typeof pagination.total === 'number' ? { ...pagination, total: Math.max(0, pagination.total + by) } : pagination
