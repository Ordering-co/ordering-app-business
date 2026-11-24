import dayjs from 'dayjs'

import { isManualDriverAssignmentEnabled } from '../OrderDetails/isManualDriverAssignmentEnabled'
import { isCustomerContactHidden } from '../../utils/contactVisibility'
import { statusMoments } from '../OrderDetails/orderTimes'
import { orderNumber } from '../OrderDetails/orderData'
import {
  ADJUSTABLE_STATUSES,
  ASSIGNABLE_DELIVERY_TYPES,
  ASSIGNABLE_STATUSES,
  ENDED_STATUSES,
  REVIEWABLE_STATUSES
} from './constants'

/** A driver can be assigned by hand: status 7 or 4, a delivery order, and the project's and the user's rule. */
export const canAssignDriver = (order: any, configs?: Record<string, any> | null, level?: number | null): boolean =>
  !!order &&
  ASSIGNABLE_STATUSES.includes(Number(order.status)) &&
  ASSIGNABLE_DELIVERY_TYPES.includes(Number(order.delivery_type)) &&
  isManualDriverAssignmentEnabled(configs, level)

/** The customer can be reviewed: an ended order whose customer has not been reviewed yet. */
export const canReviewCustomer = (order: any): boolean =>
  !!order && REVIEWABLE_STATUSES.includes(Number(order.status)) && !order.user_review && !!order.customer_id

/** The preparation time can still be adjusted. */
export const canAdjustTime = (order: any): boolean =>
  !!order && ADJUSTABLE_STATUSES.includes(Number(order.status))

/** A message to the customer makes sense: the chat is open and the contact is not hidden. */
export const canMessageCustomer = (order: any, configs?: Record<string, any> | null): boolean =>
  !!order && !ENDED_STATUSES.includes(Number(order.status)) && !isCustomerContactHidden(configs)

const onlyDigits = (value: unknown) => typeof value === 'string' && /^[0-9]+$/.test(value)

/** The `tel:` of the customer's cellphone as the order's details wrote it (`+code` and the number); null when it cannot be dialed. */
export const customerCallUrl = (order: any, configs?: Record<string, any> | null): string | null => {
  const customer = order?.customer
  if (!customer?.cellphone || isCustomerContactHidden(configs) || !onlyDigits(String(customer.cellphone))) return null
  const code = customer.country_phone_code ? `+${customer.country_phone_code}` : ''
  return `tel:${code}${customer.cellphone}`
}

/** The order number as the store shows it: the app's one mask, `orderNumber` of `OrderDetails/orderData`. */
export const orderNumberOf = (order: any, configs?: Record<string, any> | null): string => orderNumber(order, configs)

/** The two orders' coordinates the map can draw: any of the store, the customer and the driver. */
export const hasMapCoordinates = (order: any): boolean =>
  [order?.business?.location, order?.customer?.location, order?.driver?.location].some((place) =>
    place && place.lat !== undefined && place.lat !== null && place.lat !== '' && place.lng !== undefined && place.lng !== null && place.lng !== '')

/** What the API said, worded for the sheet: a text, the first of a list, or a `{ message }`. */
export const apiErrorText = (error: any, t: (key: string, text: string) => string): string => {
  const first = Array.isArray(error) ? error[0] : error
  const text = typeof first === 'string' ? first : first?.message
  return text ? String(text) : t('THE_CHANGE_WAS_NOT_SAVED', 'The change was not saved. Try again.')
}

/**
 * When the order was accepted, as a valid moment or null. A moment the caller gave is used when it is a date; otherwise
 * it is the details' own reading (`statusMoments`): the history's stamp of the last change to 7 moved by the business's
 * time zone (the history is written in that zone, with no zone in the text, so reading it as the device's time put the
 * accept hours away), or the order's `updated_at` (UTC) when the history cannot say. Null when the order carries nothing.
 */
export const acceptedAtOf = (order: any, given?: Date | string | number | null): dayjs.Dayjs | null => {
  if (given) {
    const moment = dayjs(given)
    if (moment.isValid()) return moment
  }
  const at = statusMoments(order).at(7)
  if (at === null || !Number.isFinite(at)) return null
  const moment = dayjs(at)
  return moment.isValid() ? moment : null
}
