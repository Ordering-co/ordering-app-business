import { orderNumberText, productTotal } from './orderData'
import { statusLabel } from './orderStages'

type T = (key: string, fallback: string) => string

interface Context {
  order: any
  t: T
  parsePrice: (value: number) => string
  /** The server's `hide_customer_contact_business_app`: the customer's name, e-mail and phones are left out. */
  hideCustomerContact: boolean
  /** The project's config: the number written is the one the project shows (`change_order_id`). */
  configs?: Record<string, any> | null
}

const line = (value: unknown, suffix = ' \n') => (value ? `${value}${suffix}` : '')

const subOptionText = ({ quantity, name, position, price }: any, t: T, parsePrice: (value: number) => string) => {
  if (name === 'No') return 'No\n'
  const where = position && position !== 'whole' ? ` (${t(String(position).toUpperCase(), position)})` : ''
  return `${quantity} x ${name}${where} +${parsePrice(price)}\n`
}

const optionsText = (options: any[], comment: string, t: T, parsePrice: (value: number) => string) => {
  const parts: string[] = []
  options?.forEach((option: any) => {
    parts.push(`  ${option.name}\n    ${(option.suboptions ?? []).map((sub: any) => subOptionText(sub, t, parsePrice)).join('')}`)
  })
  if (comment) parts.push(`  ${t('COMMENT', 'Comment')}\n    ${comment}\n`)
  return parts.join('')
}

/**
 * The text "Copy order details" puts on the clipboard: the order's status and payment, the store, the customer
 * (unless the business hides the customer's contact), the products with their options and comments, and the
 * amounts. The delivery fee line is the order's delivery price (it used to print the service fee under that name);
 * a service fee, when the order has one, has its own line.
 */
export const buildOrderCopyText = ({ order, t, parsePrice, hideCustomerContact, configs }: Context): string => {
  const business = order?.business
  const customer = order?.customer
  const hidden = hideCustomerContact

  const customerName = hidden || !customer?.name
    ? ''
    : `${customer.name} ${customer.middle_name || ''} ${customer.lastname || ''} ${customer.second_lastname || ''} \n`

  const payment = order?.paymethod?.name
    ? `${order.paymethod.name} - ${(() => {
      switch (order.delivery_type) {
        case 2: return t('PICKUP', 'Pickup')
        case 3: return t('EAT_IN', 'Eat in')
        case 4: return t('CURBSIDE', 'Curbside')
        case 5: return t('DRIVE_THRU', 'Drive thru')
        case 7: return t('CATERING_DELIVERY', 'Catering delivery')
        case 8: return t('CATERING_PICKUP', 'Catering pickup')
        case 9: return t('RESERVATIONS', 'Reservations')
        default: return t('DELIVERY', 'Delivery')
      }
    })()}\n`
    : ''

  const products = (order?.products ?? []).map((product: any, index: number) => {
    const text = `${product?.quantity} X ${product?.name} ${parsePrice(product.total ?? productTotal(product))}\n${optionsText(product.options, product.comment, t, parsePrice)}`
    return index === 0 ? ` ${text}` : text
  }).join(' ')

  const summary = order?.summary
  const subtotal = `${t('SUBTOTAL', 'Subtotal')}: ${parsePrice(order?.subtotal)}\n`
  const driverTip = `${t('DRIVER_TIP', 'Driver tip')} ${parsePrice(summary?.driver_tip || order?.totalDriverTip)}\n`
  const deliveryFee = typeof summary?.delivery_price === 'number'
    ? `${t('COPY_DELIVERY_FEE', 'Delivery fee')} ${parsePrice(summary.delivery_price)}\n`
    : ''
  const serviceFee = summary?.service_fee > 0 ? `${t('SERVICE_FEE', 'Service fee')} ${parsePrice(summary.service_fee)}\n` : ''
  const total = `${t('TOTAL', 'Total')} ${parsePrice(summary?.total || order?.total)}\n`

  const status = `${orderNumberText(order, t, configs)} ${t('IS', 'is')} ${statusLabel(order?.status, t, order)}\n`

  return `${status} ${payment} ${t('BUSINESS_DETAILS', 'Business details')}\n `
    + `${line(business?.name)} ${line(business?.email)} ${line(business?.cellphone)} ${line(business?.phone)} ${line(business?.address)} ${line(business?.address_notes, ' \n \n')}`
    + `${t('CUSTOMER_DETAILS', 'Customer details')}\n `
    + `${customerName} ${hidden ? '' : line(customer?.email)} ${hidden ? '' : line(customer?.cellphone)} ${hidden ? '' : line(customer?.phone)} ${line(customer?.address)} ${line(customer?.address_notes)}\n`
    + `${t('ORDER_DETAILS', 'Order Details')}:\n${products}\n ${subtotal} ${driverTip} ${deliveryFee} ${serviceFee} ${total}`
}
