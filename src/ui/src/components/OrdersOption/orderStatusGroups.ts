/**
 * The status numbers of the orders list, in one place: the controller's two slots (open orders and History), the
 * stage sections of the open orders and the history chips. The offline queue and the cards read the same lists.
 * A stage is decided by the status only (decision OQ-04 (a)): an order whose driver was assigned before the food is
 * ready is under "With driver".
 */

/** Pending and pre-order: what the business has not accepted yet (tab "New"). */
export const NEW_STATUSES = [0, 13]
/** Accepted by the business and not ready: "Preparing". */
export const PREPARING_STATUSES = [7, 14]
/** Ready for pickup; the customer almost arrived or arrived. */
export const READY_STATUSES = [4, 20, 21]
/** A driver is on the order. */
export const WITH_DRIVER_STATUSES = [3, 8, 9, 18, 19, 22, 23, 24, 25, 26]
/** Every open order: the controller's `active` slot (its own default). */
export const ACTIVE_STATUSES = [0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26]
export const COMPLETED_STATUSES = [1, 11, 15]
export const CANCELLED_STATUSES = [2, 5, 6, 10, 12, 16, 17]
/** Every closed order: the controller's `completed` slot is configured with all of them (the chips narrow it). */
export const HISTORY_STATUSES = [1, 2, 5, 6, 10, 11, 12, 15, 16, 17]

export type OrderSection = 'new' | 'preparing' | 'ready' | 'with_driver' | 'history'

/** The section of a status; null for one the app does not know. */
export const sectionOf = (status: number | string | null | undefined): OrderSection | null => {
  if (status === null || status === undefined || status === '') return null
  const code = Number(status)
  if (NEW_STATUSES.includes(code)) return 'new'
  if (PREPARING_STATUSES.includes(code)) return 'preparing'
  if (READY_STATUSES.includes(code)) return 'ready'
  if (WITH_DRIVER_STATUSES.includes(code)) return 'with_driver'
  if (HISTORY_STATUSES.includes(code)) return 'history'
  return null
}

/** The controller's `orderGroupStatusCustom` for the app's data model (see the `orders` contract). */
export const ORDER_GROUP_STATUS = {
  active: ACTIVE_STATUSES,
  pending: NEW_STATUSES,
  inProgress: ACTIVE_STATUSES.filter((status) => !NEW_STATUSES.includes(status)),
  completed: HISTORY_STATUSES,
  cancelled: [] as number[]
}

/** The storage key the offline cache keeps a slot under. */
export const CACHE_KEYS = { active: 'active_orders', completed: 'completed_orders', syncedAt: 'last_sync_at' } as const

/** The slot of the controller an order of this status belongs to. */
export const slotOf = (status: number | string | null | undefined): 'active' | 'completed' =>
  HISTORY_STATUSES.includes(Number(status)) ? 'completed' : 'active'
