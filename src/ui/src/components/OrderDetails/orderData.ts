import { parseProductOptions } from '../ProductItemAccordion/parseProductOptions'
import { orderTypeLabel } from './orderStages'

type T = (key: string, fallback: string) => string

/** The order's comment as the kitchen should read it: without the blank lines it begins or ends with. */
export const orderCommentText = (order: any): string =>
  typeof order?.comment === 'string' ? order.comment.trim() : ''

/** The order number as the store writes it: the external id when the project asks for it (`change_order_id`). */
export const orderNumber = (order: any, configs?: Record<string, any> | null): string => {
  const external = configs?.change_order_id?.value === '1'
  return String((external ? order?.external_id || order?.id : order?.id) ?? '')
}

/**
 * The app's one way to write an order's number: `Order #1053` (`ORDER_NUMBER_HASH`, the mockups' phrase), with the number
 * the project shows (the external id when `change_order_id` is on). A screen with no room for the word (a card, a row)
 * writes `#` + `orderNumber(order, configs)`. Inside a component use `useOrderNumberText()`.
 */
export const orderNumberText = (order: any, t: T, configs?: Record<string, any> | null): string =>
  t('ORDER_NUMBER_HASH', 'Order #_number_').replace('_number_', orderNumber(order, configs))

/** A product's line total, with the half price of a half-and-half option. */
export const productTotal = (product: any): number => {
  let extra = 0
  if (Array.isArray(product?.options)) {
    for (const option of product.options) {
      for (const suboption of option?.suboptions ?? []) {
        const half = ['left', 'right'].includes(suboption?.position)
        extra += (suboption?.quantity ?? 1) * (half ? (suboption?.half_price ?? suboption?.price ?? 0) : (suboption?.price ?? 0))
      }
    }
  }
  const total = (product?.quantity ?? 1) * ((product?.price ?? 0) + extra)
  return parseFloat(total.toFixed(2))
}

/** What the kitchen reads under a product's name: its options, then the ingredients taken out, as "Size: Large · No onions". */
export const productDetailLines = (product: any, t: T): string[] => {
  const lines: string[] = []
  for (const option of parseProductOptions(product?.options) as any[]) {
    const optionName = option?.name ? t(String(option.name).toUpperCase().replace(/ /g, '_'), option.name) : ''
    const subs = (option?.suboptions ?? [])
      .map((suboption: any) => {
        if (!suboption?.name) return ''
        if (suboption.name === 'No') return t('NO', 'No')
        const position = suboption.position && suboption.position !== 'whole'
          ? ` (${t(String(suboption.position).toUpperCase(), suboption.position)})`
          : ''
        const quantity = suboption.quantity > 1 ? `${suboption.quantity} x ` : ''
        return `${quantity}${suboption.name}${position}`
      })
      .filter(Boolean)
    if (!optionName && !subs.length) continue
    lines.push(subs.length ? (optionName ? `${optionName}: ${subs.join(', ')}` : subs.join(', ')) : optionName)
  }
  const ingredients = Object.values(product?.ingredients ?? {}) as any[]
  for (const ingredient of ingredients) {
    if (ingredient && ingredient.selected === false && ingredient.name) lines.push(`${t('NO', 'No')} ${ingredient.name}`)
  }
  return lines
}

/** How many products and how many items (units) the order has. */
export const productCounts = (order: any): { products: number, items: number } => {
  const products: any[] = Array.isArray(order?.products) ? order.products : []
  return {
    products: products.length,
    items: products.reduce((total, product) => total + (Number(product?.quantity) || 0), 0)
  }
}

/** The products line of the card: "3 products · 4 items" (each text has its own key). */
export const productCountText = (order: any, t: T): string => {
  const { products, items } = productCounts(order)
  const productsText = products === 1
    ? t('ORDER_PRODUCTS_COUNT_ONE', '_count_ product')
    : t('ORDER_PRODUCTS_COUNT', '_count_ products')
  const itemsText = items === 1
    ? t('ORDER_ITEMS_COUNT_ONE', '_count_ item')
    : t('ORDER_ITEMS_COUNT', '_count_ items')
  return [productsText.replace('_count_', String(products)), itemsText.replace('_count_', String(items))].join(' · ')
}

/** The gateways of the money collected at the door: cash and the card machine the driver or the store carries. */
const PAY_ON_DELIVERY_GATEWAYS = ['cash', 'card_delivery']

/** Is this gateway money collected on delivery (cash, card on delivery)? */
export const isPayOnDelivery = (gateway?: string | null): boolean =>
  PAY_ON_DELIVERY_GATEWAYS.includes(String(gateway ?? '').toLowerCase())

/**
 * The app's one rule of "paid" (the details' chip and the order card's line). The owner's decision of 2026-11-20, "for now":
 * an order whose payment method is cash or card on delivery is UNPAID, even when the API wrote a `payment` event for it (the
 * local API writes one for cash when the order is created). Any other method is paid when a `payment` event exists.
 * With several payment events the order is paid only if none of the money is cash or card on delivery: a mixed payment
 * (wallet + cash) is unpaid, because the part collected at the door is still to collect. Wallet events are never cash on delivery.
 */
export const isPaid = (order: any): boolean => {
  if (isPayOnDelivery(order?.paymethod?.gateway)) return false
  const payments: any[] = Array.isArray(order?.payment_events) ? order.payment_events.filter((event: any) => event?.event === 'payment') : []
  if (!payments.length) return false
  return !payments.some((event) => !event?.wallet_event && isPayOnDelivery(event?.paymethod?.gateway))
}

/** The names of what the order was paid with: wallets, gateways (cash with the change to give), else the order's own method. */
export const paymentMethodNames = (order: any, t: T, parsePrice: (value: number) => string): string[] => {
  const wallets: Record<string, string> = {
    cash: t('CASH_WALLET', 'Cash Wallet'),
    credit_point: t('CREDITS_POINTS_WALLET', 'Credit Points Wallet')
  }
  const own = order?.paymethod?.gateway ? t(String(order.paymethod.gateway).toUpperCase(), order.paymethod.name) : order?.paymethod?.name
  const events: any[] = (order?.payment_events ?? []).filter((event: any) => event?.event === 'payment')
  if (!events.length) return own ? [own] : []
  return events.map((event: any) => {
    if (event?.wallet_event) return wallets[event.wallet_event?.wallet?.type]
    const gateway = event?.paymethod?.gateway
    if (gateway === 'cash' && order?.cash > 0) {
      return `${t('CASH', event.paymethod?.name ?? 'Cash')} (${t('CASH_CHANGE_OF', 'Change of :amount:').replace(':amount:', parsePrice(order.cash))})`
    }
    return gateway ? t(String(gateway).toUpperCase(), event.paymethod?.name) : own
  }).filter(Boolean)
}

export interface DataLine {
  key: string
  label: string
  value: string
}

interface DataContext {
  t: T
  /** `useFormats().dateTime`: the date and the time in the project's format (the app's one writer). */
  dateTime: (value: any, options?: { utc?: boolean }) => string
  configs?: Record<string, any> | null
  /** `confirmation.order.date` and `confirmation.order.type` of the theme. */
  showDate?: boolean
  showType?: boolean
  parsePrice: (value: number) => string
}

/** When the order is for: "ASAP(date)" when it is already due, else the date. */
export const deliveryDateText = (order: any, { t, dateTime }: Pick<DataContext, 't' | 'dateTime'>): string => {
  const dateString = order?.delivery_datetime_utc ?? order?.delivery_datetime
  const options = { utc: !!order?.delivery_datetime_utc }
  const due = new Date(order?.delivery_datetime) <= new Date()
  return due ? `${t('ASAP_ABBREVIATION', 'ASAP')} (${dateTime(dateString, options)})` : dateTime(dateString, options)
}

/** The spot and the reservation the order carries, as the customer's card writes them (never hidden by the contact flag). */
export const placeLines = (order: any, { t, dateTime }: Pick<DataContext, 't' | 'dateTime'>): DataLine[] => {
  const lines: DataLine[] = []
  if (order?.delivery_type && order?.spot_number) {
    lines.push({
      key: 'spot',
      label: order.delivery_type === 3
        ? t('EATIN_SPOT_NUMBER', 'Table number')
        : order.delivery_type === 5
          ? t('DRIVE_THRU_SPOT_NUMBER', 'Drive thru lane')
          : t('CURBSIDE_SPOT_NUMBER', 'Spot number'),
      value: String(order.spot_number)
    })
  }
  if (order?.delivery_type === 9 && order?.reservation) {
    lines.push({
      key: 'reservation',
      label: t('RESERVATION_SCHEDULED_TO', 'Reservation scheduled to'),
      value: `${dateTime(order.reservation.reserve_date, { utc: false })} · ${order.reservation.guests_reservation} ${t('GUESTS', 'Guests')}`
    })
  }
  return lines
}

/** The order's data of "More details": its type, how it is paid, when it is for, its external id, when it was created. */
export const orderDataLines = (order: any, context: DataContext): DataLine[] => {
  const { t, dateTime, configs, showDate = true, showType = true, parsePrice } = context
  const lines: DataLine[] = []
  if (showType) {
    lines.push({ key: 'type', label: t('ORDER_TYPE', 'Order Type'), value: orderTypeLabel(t, order?.delivery_type) })
    const methods = paymentMethodNames(order, t, parsePrice)
    if (methods.length) {
      lines.push({
        key: 'payment',
        label: methods.length > 1 ? t('PAYMENT_METHODS', 'Payment methods') : t('PAYMENT_METHOD', 'Payment method'),
        value: methods.join(', ')
      })
    }
  }
  if (order?.delivery_type !== 9 && order?.delivery_datetime) {
    lines.push({ key: 'placed', label: t('PLACED_TO', 'Placed to'), value: deliveryDateText(order, context) })
  }
  if (order?.external_id && configs?.change_order_id?.value !== '1') {
    lines.push({ key: 'external_id', label: t('EXTERNAL_ID', 'External id'), value: String(order.external_id) })
  }
  if ([7, 8].includes(order?.delivery_type) && showDate) {
    lines.push({ key: 'created_at', label: t('CREATED_AT', 'Created at'), value: dateTime(order?.created_at) })
  }
  return lines
}

/** The custom fields (`metafields`) of the order. */
export const orderCustomFields = (order: any): Array<{ id: string | number, key: string, value: string }> =>
  Array.isArray(order?.metafields)
    ? order.metafields.filter((field: any) => field?.key).map((field: any) => ({ id: field.id ?? field.key, key: field.key, value: String(field.value ?? '') }))
    : []

/** The vehicle of a curbside order. */
export const vehicleLines = (order: any, t: T): DataLine[] => {
  const vehicle = order?.vehicle
  if (!vehicle) return []
  return [
    ['car_registration', t('CAR_REGISTRATION', 'Car registration'), vehicle.car_registration],
    ['color', t('COLOR', 'Color'), vehicle.color],
    ['model', t('MODEL', 'Model'), vehicle.model],
    ['type', t('TYPE', 'Type'), vehicle.type]
  ]
    .filter(([, , value]) => !!value)
    .map(([key, label, value]) => ({ key: key as string, label: label as string, value: String(value) }))
}
