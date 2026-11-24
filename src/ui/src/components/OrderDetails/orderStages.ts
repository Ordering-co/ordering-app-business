import { orderStatusName } from '../shared/orderStatusName'

/**
 * The stage of an order decides what the details show, in which order and which action bar they carry (the
 * theme only hides sections: it never reorders them). The stage is a function of the order's status and of its
 * type, the same map the orders list files its cards by.
 */
export type OrderStage = 'new' | 'scheduled' | 'preparing' | 'ready_handoff' | 'with_driver' | 'done' | 'closed'

/** Delivery and catering delivery: the order leaves with a driver. */
export const DELIVERY_TYPES = [1, 7]
export const RESERVATION_TYPE = 9

const PREPARING_STATUSES = [7, 14]
const HANDOFF_STATUSES = [4, 20, 21]
const DONE_STATUSES = [1, 11, 15]
const CLOSED_STATUSES = [2, 5, 6, 10, 12, 16, 17]
/** The chat is closed for an ended order (the chat's own rule). */
export const ENDED_STATUSES = [...DONE_STATUSES, ...CLOSED_STATUSES].sort((a, b) => a - b)

const asNumber = (value: unknown) => Number(value)

export const isReservationOrder = (order: any) => asNumber(order?.delivery_type) === RESERVATION_TYPE
export const isDeliveryOrder = (order: any) => DELIVERY_TYPES.includes(asNumber(order?.delivery_type))

export const orderStage = (order: any): OrderStage => {
  const status = asNumber(order?.status)
  if (status === 0) return 'new'
  if (status === 13) return 'scheduled'
  if (PREPARING_STATUSES.includes(status)) return 'preparing'
  if (HANDOFF_STATUSES.includes(status)) return isDeliveryOrder(order) ? 'with_driver' : 'ready_handoff'
  if (DONE_STATUSES.includes(status)) return 'done'
  if (CLOSED_STATUSES.includes(status)) return 'closed'
  return 'with_driver'
}

/** The order is over (completed, rejected, cancelled, failed): no chat, no time to adjust. */
export const isEndedOrder = (order: any) => ENDED_STATUSES.includes(asNumber(order?.status))

/** A step of the action bar. */
export type BarStepKey = 'reject' | 'accept' | 'ready' | 'not_picked_up' | 'picked_up' | 'not_arrived' | 'arrived' | 'print'

/** What each step does to the order (a status), and whether it needs a question first (it ends the order badly). */
export const STEP_STATUS: Partial<Record<BarStepKey, number>> = {
  ready: 4,
  not_picked_up: 17,
  picked_up: 15,
  not_arrived: 17,
  arrived: 15
}
/** The steps that cancel the order: they ask first. Accept is never guarded. */
export const GUARDED_STEPS: BarStepKey[] = ['not_picked_up', 'not_arrived']

/**
 * The buttons of the bar in the order they are drawn (the first is the left one): the status the stage allows.
 * A reservation (type 9) answers "Customer not arrived / arrived" instead of "Not picked up / Picked up".
 */
export const barSteps = (order: any, { canPrint = true }: { canPrint?: boolean } = {}): BarStepKey[] => {
  const stage = orderStage(order)
  const status = asNumber(order?.status)
  const reservation = isReservationOrder(order)
  switch (stage) {
    case 'new':
      return ['reject', 'accept']
    case 'preparing':
      if (reservation) return status === 7 ? ['not_arrived', 'arrived'] : []
      return ['ready']
    case 'ready_handoff':
      return reservation ? ['not_arrived', 'arrived'] : ['not_picked_up', 'picked_up']
    case 'done':
    case 'closed':
      return canPrint ? ['print'] : []
    default:
      return []
  }
}

/**
 * The status as every screen writes it, the one source of the app's status names (`orderStatusName`, the mockups' short
 * words): status 4 reads "Ready for pickup" and a reservation that is still a pre-order reads "Reservation". Never the
 * server's long name ("Order picked up completed by customer").
 */
export const statusLabel = (status: number | string, t: (key: string, fallback: string) => string, order?: any): string => {
  const code = asNumber(status)
  if (code === 13 && order && isReservationOrder(order)) return t('RESERVATION', 'Reservation')
  if (code === 4) return t('READY_FOR_PICKUP', 'Ready for pickup')
  return orderStatusName(status, t) ?? String(status)
}

/**
 * The words of the "order is ready" action, one per kind of order, the same on the card, the group and the details'
 * footer: the orders the customer comes for (pickup, curbside, drive thru, catering pickup) are "Mark ready for pickup",
 * the others (delivery, eat in, catering delivery) "Mark ready".
 */
export const markReadyText = (t: (key: string, fallback: string) => string, type: number | string | undefined): string =>
  [2, 4, 5, 8].includes(asNumber(type as any))
    ? t('MARK_READY_FOR_PICKUP', 'Mark ready for pickup')
    : t('MARK_READY', 'Mark ready')

/** The order's type, written. Catering pickup (8) has its own text (it used to read "Delivery"). */
export const orderTypeLabel = (t: (key: string, fallback: string) => string, type: number | string): string => {
  switch (asNumber(type)) {
    case 2: return t('PICKUP', 'Pickup')
    case 3: return t('EAT_IN', 'Eat in')
    case 4: return t('CURBSIDE', 'Curbside')
    case 5: return t('DRIVE_THRU', 'Drive thru')
    case 7: return t('CATERING_DELIVERY', 'Catering delivery')
    case 8: return t('CATERING_PICKUP', 'Catering pickup')
    case 9: return t('RESERVATION', 'Reservation')
    default: return t('DELIVERY', 'Delivery')
  }
}
