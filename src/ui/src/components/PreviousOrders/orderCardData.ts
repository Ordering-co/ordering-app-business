/**
 * What an order card writes, read from the order of the list payload. Every function answers `undefined` when the
 * payload does not carry what it needs: the card then leaves the piece out (never a placeholder).
 */
import { isPayOnDelivery, isPaid, orderNumber as detailsOrderNumber } from '../OrderDetails/orderData'

type Translate = (key: string, fallback?: string) => string

const EXTERNAL_ID_ON = { change_order_id: { value: '1' } }

/** The order's number as the card shows it (`#1053`, no room for the word): the details' one mask, `orderNumber` of `OrderDetails/orderData`. */
export const orderNumber = (order: any, showExternalId: boolean): string => `#${detailsOrderNumber(order, showExternalId ? EXTERNAL_ID_ON : null)}`

/** The order type, written (the API's `delivery_type`). An unknown one is not written. */
export const orderTypeText = (deliveryType: number | string | null | undefined, t: Translate): string | undefined => {
  switch (Number(deliveryType)) {
    case 1: return t('DELIVERY', 'Delivery')
    case 2: return t('PICKUP', 'Pickup')
    case 3: return t('EAT_IN', 'Eat in')
    case 4: return t('CURBSIDE', 'Curbside')
    case 5: return t('DRIVE_THRU', 'Drive thru')
    case 7: return t('CATERING_DELIVERY', 'Catering delivery')
    case 8: return t('CATERING_PICKUP', 'Catering pickup')
    case 9: return t('RESERVATION', 'Reservation')
    default: return undefined
  }
}

/** "James Carter"; "Customer" when the project hides the customer's contact data in the business app. */
export const customerText = (order: any, hideContact: boolean, t: Translate): string | undefined => {
  if (hideContact) return t('CUSTOMER', 'Customer')
  const name = [order?.customer?.name, order?.customer?.lastname].filter((part) => typeof part === 'string' && part.trim()).join(' ').trim()
  return name || undefined
}

/** How many units the order has (the sum of its products' quantities); undefined when the payload has no products. */
export const itemsCount = (order: any): number | undefined => {
  const products: any[] = Array.isArray(order?.products) ? order.products.filter((product: any) => product && typeof product.name === 'string' && product.name) : []
  if (!products.length) return undefined
  return products.reduce((total, product) => total + (Number(product.quantity) > 0 ? Number(product.quantity) : 1), 0)
}

/**
 * The number of items, the small muted text of the card's facts ("3 items"); for an eat-in order with a table "Table 7 · 4 items".
 * The products themselves are not on the card.
 */
export const itemsText = (order: any, t: Translate): string | undefined => {
  const items = itemsCount(order)
  if (items === undefined) return undefined
  const count = (items === 1 ? t('ORDER_ITEMS_COUNT_ONE', '_count_ item') : t('ORDER_ITEMS_COUNT', '_count_ items')).replace('_count_', String(items))
  const spot = order?.spot_number
  if (Number(order?.delivery_type) === 3 && spot !== undefined && spot !== null && spot !== '') {
    return `${t('TABLE_NUMBER_SHORT', 'Table _number_').replace('_number_', String(spot))} · ${count}`
  }
  return count
}

/** The order's total as a number, or undefined when the payload has none. */
export const orderTotal = (order: any): number | undefined => {
  const total = order?.summary?.total ?? order?.total
  const value = typeof total === 'string' ? Number(total) : total
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * Whether the card writes "Paid" or "Unpaid", by the details' one rule (`isPaid`: cash and card on delivery are unpaid even with a
 * `payment` event). Where the payload carries no payment events the card cannot say a card order is not paid, so it says nothing,
 * except for cash or card on delivery, which is unpaid whatever the events say.
 */
export const paymentState = (order: any): 'paid' | 'unpaid' | undefined => {
  if (!Array.isArray(order?.payment_events) && !isPayOnDelivery(order?.paymethod?.gateway)) return undefined
  return isPaid(order) ? 'paid' : 'unpaid'
}

/** The paid state of a group: paid when every order is, unpaid when any is; nothing when any cannot say. */
export const groupPaymentState = (orders: any[]): 'paid' | 'unpaid' | undefined => {
  const states = orders.map(paymentState)
  if (!states.length || states.some((state) => state === undefined)) return undefined
  return states.every((state) => state === 'paid') ? 'paid' : 'unpaid'
}

/** "Reason: Item out of stock" on a rejected order of History. */
export const reasonText = (order: any, t: Translate): string | undefined => {
  const reason = order?.reject_reason
  return typeof reason === 'string' && reason.trim() ? t('REASON_PREFIX', 'Reason: _reason_').replace('_reason_', reason.trim()) : undefined
}

/** The store of an order as the list payload carries it (`business.name`, `business.logo`); undefined without a name. */
export const storeOf = (order: any): { name: string, logo?: string } | undefined => {
  const name = typeof order?.business?.name === 'string' ? order.business.name.trim() : ''
  if (!name) return undefined
  const logo = order.business.logo
  return { name, logo: typeof logo === 'string' && logo ? logo : undefined }
}

/**
 * The store line of a card of one or several orders (a group's): the first store's logo and the distinct names, in order
 * ("McBonalds", or "McBonalds, Wine.." for a group of two stores).
 */
export const storesOf = (orders: any[]): { name: string, logo?: string } | undefined => {
  const stores = orders.map(storeOf).filter(Boolean) as Array<{ name: string, logo?: string }>
  if (!stores.length) return undefined
  const names = stores.map((store) => store.name).filter((name, index, all) => all.indexOf(name) === index)
  return { name: names.join(', '), logo: stores[0].logo }
}
