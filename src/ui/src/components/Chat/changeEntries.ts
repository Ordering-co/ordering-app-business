import { capitalize } from '../../utils'
import { ORDER_STATUS_IDS, orderStatusName } from '../shared/orderStatusName'

/** The language function the entries are worded with. */
type Translate = (key: string, fallback: string) => string

/** The attributes that are times: minutes of preparation or delivery, and the delivery moment. */
const MINUTES_ATTRIBUTES = ['prepared_in', 'delivered_in', 'delivery_datetime']
/**
 * The attributes whose change someone at the counter needs: the status, the logistic state, who has the order, the reason it
 * was rejected and the times. Any other attribute of the API's logbook (the driver group's id, the manual assignment's author
 * and comment, the delivery position, the external id, "distance", "summary.refunded", the delivery PIN's state…) is not shown:
 * a thread of raw field names and ids is not a conversation.
 */
const WORDED_ATTRIBUTES = ['status', 'logistic_status', 'driver_id', 'reject_reason', ...MINUTES_ATTRIBUTES]

/** A reason the API stored as a code (`very_far_away`) read as the words it stands for; a reason typed as words is kept. */
const reasonText = (value: unknown): string => {
  const text = String(value).trim()
  return /^[a-z0-9]+(_[a-z0-9]+)+$/.test(text) ? capitalize(text.replace(/_/g, ' ')) : text
}

/** No value: nothing, `false` (the API's "no value" for a number), an empty text or the word of a missing one. */
export const isEmptyChangeValue = (value: unknown): boolean =>
  value === undefined || value === null || value === false || (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'string' && ['', 'undefined', 'null', 'false'].includes(value.trim()))

/**
 * Four keys of the old pill sentences that the shared logic writes with another English: they keep the English the catalog
 * has always held for them (a key's English never changes: the scanner reads this table), though no pill reads them now.
 */
export const KEPT_STATUS_KEYS: Array<[string, string]> = [
  ['ORDER_DRIVER_ALMOST_ARRIVED_BUSINESS', 'Order driver almost arrived to business'],
  ['ORDER_DRIVER_ALMOST_ARRIVED_CUSTOMER', 'Order driver almost arrived to customer'],
  ['ORDER_STATUS_CANCELLED_BY_CUSTOMER', 'Order status cancelled by customer'],
  ['ORDER_STATUS_IN_BUSINESS', 'Order status in business'],
]

/**
 * The names of the order's statuses, by id: the only values that are read as a status (the `status` attribute). The app's one
 * source (`orderStatusName`) writes them; the completed pill is the one the Chat mockup draws as an event ("Order completed").
 */
export const orderStatusNames = (t: Translate): Record<number, string> => {
  const names: Record<number, string> = {}
  ORDER_STATUS_IDS.forEach((id) => { names[id] = orderStatusName(id, t) as string })
  names[1] = t('ORDERS_COMPLETED', 'Order completed')
  return names
}

const logisticTag = (status: unknown, t: Translate): string | undefined => {
  const tags: Record<string, string> = {
    0: t('PENDING', 'Pending'),
    1: t('ORDERS_TAB_IN_PROGRESS', 'In progress'),
    2: t('IN_QUEUE', 'In queue'),
    3: t('EXPIRED', 'Expired'),
    4: t('RESOLVED', 'Resolved'),
  }
  return tags[String(status)]
}

/** The words of one side of a change, or undefined when it has none (no value, or a value the app cannot word). */
const wordedValue = (attribute: string, value: unknown, statuses: Record<number, string>, t: Translate): string | undefined => {
  if (isEmptyChangeValue(value)) return undefined
  // A status id is a status's name only for the status attribute; a position or a reason is shown as it is.
  if (attribute === 'status') return statuses[parseInt(String(value), 10)]
  if (attribute === 'logistic_status') return logisticTag(value, t)
  if (typeof value === 'object') return undefined
  return String(value)
}

/**
 * What a change of the order says in the thread (a status change: the name of the status it went to; the others a short
 * sentence of what they are now: "Preparation time changed to 30 min", "Rejected: Very far away"), or undefined when the
 * entry has nothing to say (an attribute nobody at the counter needs, a change with neither value, a value taken back): the
 * thread then leaves it out. "undefined", "null" and "false" are never printed as a value.
 */
export const describeChange = (message: any, t: Translate): string | undefined => {
  const change = message?.change
  const attribute: string | undefined = change?.attribute
  if (!attribute || !WORDED_ATTRIBUTES.includes(attribute)) return undefined

  if (attribute === 'driver_id') {
    return isEmptyChangeValue(change.new)
      ? t('DRIVER_UNASSIGNED', 'Driver unassigned')
      : `${message?.driver?.name ?? ''} ${message?.driver?.lastname ?? ''} ${t('WAS_ASSIGNED_AS_DRIVER', 'Was assigned as driver')}`.replace(/\s+/g, ' ').trim()
  }

  const statuses = orderStatusNames(t)
  const from = wordedValue(attribute, change.old, statuses, t)
  const to = wordedValue(attribute, change.new, statuses, t)

  if (from === undefined && to === undefined) return undefined
  // A value the app cannot word (a status it has no name for) leaves no entry: it is not an empty value.
  const unworded = (value: unknown, worded?: string) => !isEmptyChangeValue(value) && worded === undefined
  if (unworded(change.old, from) || unworded(change.new, to)) return undefined
  // Something taken back (a reason, a time, a state) leaves nothing to say.
  if (to === undefined) return undefined
  // A status change is the notice pill of the Chat mockup ("Order completed · 11:48 AM"): the status it went to, by name,
  // so the pill stays one line where it fits; the sentence "Order Status Changed from A to B" made the thread a wall of text.
  if (attribute === 'status') return to
  // The others are short phrases of what they are now, not the logbook's "Order Prepared in Changed from 20 to 30 Minutes".
  switch (attribute) {
    case 'reject_reason': return t('CHAT_REJECTED_REASON', 'Rejected: _reason_').replace('_reason_', () => reasonText(to))
    case 'prepared_in': return t('CHAT_PREPARATION_TIME_CHANGED', 'Preparation time changed to _minutes_ min').replace('_minutes_', () => to)
    case 'delivered_in': return t('CHAT_DELIVERY_TIME_CHANGED', 'Delivery time changed to _minutes_ min').replace('_minutes_', () => to)
    case 'delivery_datetime': return t('CHAT_DELIVERY_DATE_CHANGED', 'Delivery time changed')
    case 'logistic_status': return t('CHAT_LOGISTIC_STATUS_CHANGED', 'Logistic status changed to _status_').replace('_status_', () => to)
    default: return undefined
  }
}
