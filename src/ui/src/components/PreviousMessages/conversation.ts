import { isCustomerContactHidden } from '../../utils/contactVisibility'

/** The language function. */
type Translate = (key: string, fallback: string) => string

/** The statuses of an order that has ended (completed, rejected, cancelled, failed): its chat can be read, not written. */
export const ENDED_STATUSES = [1, 2, 5, 6, 10, 11, 12, 15, 16, 17]

export const isEnded = (order: any): boolean => ENDED_STATUSES.includes(Number(order?.status))

/**
 * The name of an order's type (`order.delivery_type`), the same on every screen; any type the app does not
 * know is a delivery.
 */
export const orderTypeLabel = (t: Translate, type: number | string | null | undefined): string => {
  switch (Number(type)) {
    case 2: return t('PICKUP', 'Pickup')
    case 3: return t('EAT_IN', 'Eat in')
    case 4: return t('CURBSIDE', 'Curbside')
    case 5: return t('DRIVER_THRU', 'Driver thru')
    case 6: return t('SEAT_DELIVERY', 'Seat delivery')
    case 7: return t('CATERING_DELIVERY', 'Catering delivery')
    case 8: return t('CATERING_PICKUP', 'Catering pickup')
    case 9: return t('RESERVATION', 'Reservation')
    default: return t('DELIVERY', 'Delivery')
  }
}

/**
 * The messages of an order the user has not read. The direct count (`unread_direct_count`: what people wrote, not
 * the order's own system rows) when the API gave it, else the full one.
 */
export const unreadOf = (order: any): number => {
  const count = Number(order?.unread_direct_count ?? order?.unread_count)
  return count > 0 ? count : 0
}

/** The customer's full name, or the word "Customer" when the project hides the customer's contact data. */
export const customerNameOf = (order: any, configs: any, t: Translate): string => {
  if (isCustomerContactHidden(configs)) return t('CUSTOMER', 'Customer')
  const name = [order?.customer?.name, order?.customer?.lastname].filter(Boolean).join(' ').trim()
  return name || t('CUSTOMER', 'Customer')
}

/** The phone to call the customer on: the cellphone, else the phone; empty when the project hides the contact. */
export const customerPhoneOf = (order: any, configs: any): string => {
  if (isCustomerContactHidden(configs)) return ''
  return String(order?.customer?.cellphone || order?.customer?.phone || '').trim()
}

/** The user levels of the store's side: administrator, city manager, business owner, driver manager. */
const STORE_SIDE = [0, 1, 2, 5]

/**
 * The role that wrote the last message of an order when it is not the customer (the title carries "(Driver)" /
 * "(Business)" then), or null. It needs the last message of the order (`order.last_message.author`), which the
 * orders payload does not carry yet (a backend request): without it no row is tagged.
 */
export const lastIncomingRole = (order: any, userId?: number | string | null): 'driver' | 'business' | null => {
  const author = order?.last_message?.author
  const level = Number(author?.level ?? order?.last_message?.author_level)
  if (!Number.isFinite(level)) return null
  if (author?.id !== undefined && userId !== undefined && Number(author.id) === Number(userId)) return null
  if (level === 4) return 'driver'
  if (STORE_SIDE.includes(level)) return 'business'
  return null
}
