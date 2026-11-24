import { sectionOf, type OrderSection } from './orderStatusGroups'

/** A row of a list: one order, or a group (two or more orders of the same cart group and section). */
export interface OrderRow {
  key: string
  orders: any[]
  groupId?: string
}

/**
 * The controller's lists hold orders and, for a cart group, a nested `[[groupId, orders]]` entry
 * (`formatOrdersGrouped`): one flat list of orders, each once, in the order the controller sorted them.
 */
export const flattenOrders = (list: any): any[] => {
  if (!Array.isArray(list)) return []
  const seen = new Set<any>()
  const flat: any[] = []
  const push = (order: any) => {
    if (!order || order.id === undefined || order.id === null || seen.has(order.id)) return
    seen.add(order.id)
    flat.push(order)
  }
  for (const item of list) {
    if (!Array.isArray(item)) { push(item); continue }
    for (const pair of item) {
      const members = Array.isArray(pair) ? pair[1] : null
      if (Array.isArray(members)) members.forEach(push)
    }
  }
  return flat
}

/**
 * Rows of a flat list: the orders of one cart group that share a section are one row, anything else is its own row.
 * The row stands where its first order stood, so the controller's order (newest first) is kept.
 */
export const buildRows = (orders: any[]): OrderRow[] => {
  const rows: OrderRow[] = []
  const groups = new Map<string, OrderRow>()
  for (const order of orders) {
    const groupId = order?.cart_group_id
    if (groupId === undefined || groupId === null || groupId === '') {
      rows.push({ key: `o:${order.id}`, orders: [order] })
      continue
    }
    const key = `g:${groupId}:${sectionOf(order.status) ?? order.status}`
    const row = groups.get(key)
    if (row) row.orders.push(order)
    else {
      const created: OrderRow = { key, orders: [order], groupId: String(groupId) }
      groups.set(key, created)
      rows.push(created)
    }
  }
  // A "group" of one order is a plain order.
  return rows.map((row) => row.groupId !== undefined && row.orders.length === 1 ? { key: `o:${row.orders[0].id}`, orders: row.orders } : row)
}

export interface OrdersSplitLists {
  newOrders: OrderRow[]
  preparing: OrderRow[]
  ready: OrderRow[]
  withDriver: OrderRow[]
  /** Orders (not rows) per list, and all the open ones: what the auto-load of pages reads (never drawn). */
  counts: { new: number, preparing: number, ready: number, withDriver: number, active: number }
}

/** The open orders in the three stages (and New): by status only. An order of a status the app does not know is left out. */
export const splitOrders = (orders: any[]): OrdersSplitLists => {
  const bySection: Record<OrderSection, any[]> = { new: [], preparing: [], ready: [], with_driver: [], history: [] }
  for (const order of orders) {
    const section = sectionOf(order?.status)
    if (section && section !== 'history') bySection[section].push(order)
  }
  const count = (section: OrderSection) => bySection[section].length
  return {
    newOrders: buildRows(bySection.new),
    preparing: buildRows(bySection.preparing),
    ready: buildRows(bySection.ready),
    withDriver: buildRows(bySection.with_driver),
    counts: {
      new: count('new'),
      preparing: count('preparing'),
      ready: count('ready'),
      withDriver: count('with_driver'),
      active: count('new') + count('preparing') + count('ready') + count('with_driver')
    }
  }
}

/** The moment an order of History is filed under: the delivery time, else the creation time (UTC strings of the API). */
export const historyMoment = (order: any): string | undefined =>
  order?.delivery_datetime_utc ?? order?.delivery_datetime ?? order?.created_at ?? undefined

export interface DayGroup {
  day: string
  label: string
  orders: OrderRow[]
}

/**
 * History by day (the device's), newest first as the list is: "Today", "Yesterday" and the date for older days.
 * `dayOf(order)` gives the order's day key (`YYYY-MM-DD`, device time) and `labelOf(day)` its title.
 */
export const groupByDay = (
  orders: any[],
  dayOf: (order: any) => string,
  labelOf: (day: string) => string
): DayGroup[] => {
  const days: DayGroup[] = []
  const buckets = new Map<string, any[]>()
  const order: string[] = []
  for (const item of orders) {
    const day = dayOf(item)
    if (!buckets.has(day)) { buckets.set(day, []); order.push(day) }
    buckets.get(day)!.push(item)
  }
  for (const day of order) days.push({ day, label: labelOf(day), orders: buildRows(buckets.get(day)!) })
  return days
}
