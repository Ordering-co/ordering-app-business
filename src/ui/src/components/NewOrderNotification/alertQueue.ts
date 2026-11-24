/**
 * What the new-order alert holds while it is open (ported from the driver app, with the business's differences).
 *
 * An alert is one per kind of thing that happened. While one is open, the same kind arriving again is added to it
 * (a count, not a second alert), and a different kind waits behind it: when the business closes the open one the next
 * kind's alert opens with everything it gathered meanwhile. Nothing is dropped and each kind needs one close.
 *
 * Unlike the driver's, an item carries the order itself (the alert lists the customer, the products and the total of
 * each order), and an order can leave the alert (`removeOrders`) when it stops waiting for the business.
 */

/** A new order, an updated one, a message of an order's chat. */
export type AlertKind = 'order' | 'order_update' | 'message'

export interface AlertItem {
  /** `o:<order>`: what makes two arrivals the same thing. */
  key: string
  orderId?: number | string
  /** The order's status when it arrived: only a pending one has an Accept. */
  status?: number
  /** The order as the event carried it: the alert writes the customer, the products and the total from it. */
  order?: any
  /** When the alert first heard of it (ms): the clock of an order whose payload has no `created_at`. */
  receivedAt: number
  /** The sample order of the settings' test alert: it calls no API. */
  test?: boolean
}

export interface AlertQueue {
  /** The kinds that have something to say, in the order they first arrived: the first is the open alert. */
  kinds: AlertKind[]
  items: Partial<Record<AlertKind, AlertItem[]>>
}

export const emptyQueue: AlertQueue = { kinds: [], items: {} }

const without = (items: AlertQueue['items'], kind: AlertKind): AlertQueue['items'] =>
  Object.fromEntries(Object.entries(items).filter(([key]) => key !== kind))

/** Adds an arrival: to its kind's alert when there is one (the same thing twice counts once), or as a new one. */
export const addAlert = (queue: AlertQueue, kind: AlertKind, item: AlertItem): AlertQueue => {
  const current = queue.items[kind] ?? []
  const known = current.some((other) => other.key === item.key)
  const items = known
    // The same order again: its newest data, from where it first arrived.
    ? current.map((other) => (other.key === item.key ? { ...other, ...item, receivedAt: other.receivedAt } : other))
    : [...current, item]
  return {
    kinds: queue.kinds.includes(kind) ? queue.kinds : [...queue.kinds, kind],
    items: { ...queue.items, [kind]: items }
  }
}

/** The open alert's kind and what it gathered; `null` when nothing is open. */
export const openAlert = (queue: AlertQueue): { kind: AlertKind, items: AlertItem[] } | null => {
  const kind = queue.kinds[0]
  return kind ? { kind, items: queue.items[kind] ?? [] } : null
}

/** Closes the open alert: the next kind's one (if any) is the open one now. */
export const closeAlert = (queue: AlertQueue): AlertQueue => {
  const [closed, ...kinds] = queue.kinds
  if (!closed) return queue
  return { kinds, items: without(queue.items, closed) }
}

/** Whether an order is in an alert of a kind. */
export const hasOrder = (queue: AlertQueue, kind: AlertKind, orderId: number | string | undefined): boolean =>
  orderId !== undefined && (queue.items[kind] ?? []).some((item) => String(item.orderId) === String(orderId))

/**
 * Takes orders out of a kind's alert (they were accepted, rejected or cancelled): a kind left with nothing is gone,
 * so when the open alert has no order left it closes by itself.
 */
export const removeOrders = (queue: AlertQueue, kind: AlertKind, orderIds: Array<number | string | undefined>): AlertQueue => {
  const ids = orderIds.filter((id) => id !== undefined).map(String)
  const current = queue.items[kind]
  if (!current || !ids.length) return queue
  const left = current.filter((item) => !ids.includes(String(item.orderId)))
  if (left.length === current.length) return queue
  if (left.length) return { ...queue, items: { ...queue.items, [kind]: left } }
  return { kinds: queue.kinds.filter((other) => other !== kind), items: without(queue.items, kind) }
}
