import type { AlertItem, AlertKind } from './alertQueue'
import { customerText, orderNumber, orderTotal, orderTypeText } from '../PreviousOrders/orderCardData'
import { NEW_STATUSES } from '../OrdersOption/orderStatusGroups'

/** How many orders the alert lists before it says "and N more". */
export const MAX_LISTED = 3

type Translate = (key: string, fallback?: string) => string

/** What a button of the alert does. */
export type AlertAction =
  /** The details of the one order. */
  | { type: 'details', orderId: number | string }
  /** The Orders tab on one of its lists. */
  | { type: 'orders', tab: 'new' | 'progress' | 'history', stage?: 'pending' | 'preorder' }
  /** The Messages tab. */
  | { type: 'messages' }

/** One order, or the orders of one cart group, of the new-order alert. */
export interface AlertLine {
  key: string
  /** The order, or the orders of the group (the Accept speaks for all of them). */
  orders: any[]
  /** "#1053 · Delivery", or "Group No. 12 · Delivery". */
  title: string
  /** "James Carter · 3 products · $32.37": what the payload carries. */
  detail?: string
  /** The order the line's clock counts from. */
  clockOrder: any
  clockStartedAt: number
  /** Only a pending order is answered from the alert (a pre-order is not: it waits for its day). */
  canAccept: boolean
  test: boolean
}

export interface AlertContent {
  kind: AlertKind
  title: string
  /** Under the title: what an updated order or a message says (the new orders speak through their lines). */
  message?: string
  /** The numbers of what an update or a message gathered, at most `MAX_LISTED`, then "and N more". */
  numbers?: string
  /** The new orders, newest first, at most `MAX_LISTED`. */
  lines: AlertLine[]
  /** "and 2 more" after the listed lines. */
  more?: string
  button: { text: string, action: AlertAction }
}

/** What the writing of a line needs from the app. */
export interface ContentContext {
  t: Translate
  parsePrice: (value: number) => string
  /** `hide_customer_contact_business_app`. */
  hideContact: boolean
  /** `change_order_id`: the external id is the order's number. */
  showExternalId: boolean
  /** The theme's visibility of the pieces of a line. */
  visible: (key: string) => boolean
}

const fill = (text: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((out, [name, value]) => out.replace(`_${name}_`, String(value)), text)

/** A pending order (or a pre-order) is the business's to answer. */
export const isPendingOrder = (status: number | string | undefined | null): boolean =>
  status !== undefined && status !== null && NEW_STATUSES.includes(Number(status))

/** "3 products": the order's lines (a product ordered twice is one product), written only when the payload has them. */
const productsText = (order: any, t: Translate): string | undefined => {
  const lines = (Array.isArray(order?.products) ? order.products : []).filter((product: any) => product && typeof product.name === 'string' && product.name)
  if (!lines.length) return undefined
  return (lines.length === 1 ? t('ORDER_PRODUCTS_COUNT_ONE', '_count_ product') : t('ORDER_PRODUCTS_COUNT', '_count_ products')).replace('_count_', String(lines.length))
}

/** The new orders of an alert as its lines: the orders of one cart group are one line, newest first. */
export const alertLines = (items: AlertItem[], context: ContentContext): AlertLine[] => {
  const { t, parsePrice, hideContact, showExternalId, visible } = context
  const lines: AlertLine[] = []
  const groups = new Map<string, AlertItem[]>()
  const order: Array<AlertItem | string> = []

  for (const item of items) {
    const groupId = item.order?.cart_group_id
    if (groupId === undefined || groupId === null || groupId === '') { order.push(item); continue }
    const key = String(groupId)
    const group = groups.get(key)
    if (group) group.push(item)
    else { groups.set(key, [item]); order.push(key) }
  }

  const write = (members: AlertItem[], groupId?: string): AlertLine => {
    const first = members[0]
    const orders = members.map((member) => member.order ?? { id: member.orderId, status: member.status })
    const head = orders[0]
    const type = visible('orders.order_type') ? orderTypeText(head?.delivery_type, t) : undefined
    const number = first.test
      ? t('TEST_ORDER', 'Test order')
      : groupId !== undefined && members.length > 1
        ? `${t('GROUP_NRO', 'Group No.')}${groupId}`
        : orderNumber(head, showExternalId)
    const totals = orders.map(orderTotal)
    const total = visible('orders.total') && totals.every((value) => value !== undefined)
      ? parsePrice((totals as number[]).reduce((sum, value) => sum + value, 0))
      : undefined
    const count = members.length > 1
      ? t('ORDERS_IN_GROUP_COUNT', '_count_ orders').replace('_count_', String(members.length))
      : productsText(head, t)
    // The customer's name is not a visibility key (the operation needs it): the project's `hide_customer_contact` setting decides.
    const customer = customerText(head, hideContact, t)
    const detail = [customer, count, total].filter(Boolean).join(' · ')
    return {
      key: groupId !== undefined && members.length > 1 ? `g:${groupId}` : first.key,
      orders,
      title: [number, type].filter(Boolean).join(' · '),
      detail: detail || undefined,
      clockOrder: head,
      clockStartedAt: Math.min(...members.map((member) => member.receivedAt)),
      canAccept: !first.test && members.every((member) => Number(member.order?.status ?? member.status) === 0),
      test: !!first.test
    }
  }

  for (const entry of order) {
    if (typeof entry === 'string') lines.push(write(groups.get(entry) as AlertItem[], entry))
    else lines.push(write([entry]))
  }
  // Newest first, as the mockup lists them.
  return lines.reverse()
}

/** A pre-order: status 13, the second chip of New. */
const PREORDER_STATUS = 13

/**
 * The chip of New the alert's button opens: Preorder only when every order of the alert is a preorder (one pending order
 * among them, and the business has something to answer now: Pending); no orders, or one with no status, is Pending.
 */
export const newStageOf = (items: AlertItem[]): 'pending' | 'preorder' =>
  items.length > 0 && items.every((item) => Number(item.status) === PREORDER_STATUS) ? 'preorder' : 'pending'

/** The Orders tab's list an order's status is in. */
const tabOf = (status?: number): 'new' | 'progress' | 'history' =>
  status === undefined ? 'new' : isPendingOrder(status) ? 'new' : [1, 2, 5, 6, 10, 11, 12, 15, 16, 17].includes(Number(status)) ? 'history' : 'progress'

/**
 * The alert's texts and button for what it gathered. New orders say how many and list up to three of them (customer,
 * products, total, with an Accept each) and "and N more"; an updated order or a message says it as the driver's
 * does ("Order #3504 has been updated.", the numbers when there are several). The button opens the order when there
 * is one, else the list they are in. Every text is a whole phrase of the catalog, so each language words it as it needs.
 */
export const alertContent = (kind: AlertKind, items: AlertItem[], context: ContentContext): AlertContent => {
  const { t } = context
  const count = items.length
  const first = items[0]
  const mask = (item?: AlertItem) => orderNumber(item?.order ?? { id: item?.orderId }, context.showExternalId).replace('#', '')

  let numbers: string | undefined
  if (count > 1) {
    const listed = items.slice(0, MAX_LISTED).map((item) => `#${mask(item)}`).join(', ')
    numbers = count > MAX_LISTED
      ? fill(t('LIST_AND_N_MORE', '_list_ and _count_ more'), { list: listed, count: count - MAX_LISTED })
      : listed
  }

  const viewOrder = t('VIEW_ORDER', 'View order')
  const viewOrders = t('VIEW_ORDERS', 'View orders')
  const details: AlertAction = { type: 'details', orderId: first?.orderId as number | string }
  const lastStatus = items[items.length - 1]?.status
  // The Orders tab on a list; New also says its chip (the orders that rang: `newStageOf`).
  const ordersAction = (tab: 'new' | 'progress' | 'history'): AlertAction =>
    tab === 'new' ? { type: 'orders', tab, stage: newStageOf(items) } : { type: 'orders', tab }

  switch (kind) {
    case 'message':
      return count === 1
        ? {
          kind,
          title: t('NEW_MESSAGES_RECEIVED', 'New messages have been received!'),
          message: fill(t('ORDER_N_UNREAD_MESSAGES', 'Order #_order_id_ has unread messages.'), { order_id: mask(first) }),
          lines: [],
          button: { text: viewOrder, action: details }
        }
        : {
          kind,
          title: t('NEW_MESSAGES_RECEIVED', 'New messages have been received!'),
          message: fill(t('ORDERS_UNREAD_MESSAGES_COUNT', '_count_ orders have unread messages.'), { count }),
          numbers,
          lines: [],
          button: { text: t('VIEW_MESSAGES', 'View messages'), action: { type: 'messages' } }
        }
    case 'order_update':
      return count === 1
        ? {
          kind,
          title: t('NEW_ORDERS_UPDATED', 'New orders have been updated!'),
          message: fill(t('ORDER_N_UPDATED', 'Order #_order_id_ has been updated.'), { order_id: mask(first) }),
          lines: [],
          button: { text: viewOrder, action: details }
        }
        : {
          kind,
          title: t('NEW_ORDERS_UPDATED', 'New orders have been updated!'),
          message: fill(t('ORDERS_UPDATED_COUNT', '_count_ orders have been updated.'), { count }),
          numbers,
          lines: [],
          button: { text: viewOrders, action: ordersAction(tabOf(lastStatus)) }
        }
    default: {
      const lines = alertLines(items, context)
      const hidden = lines.length - MAX_LISTED
      const total = items.length
      const title = (total === 1 ? t('NEW_ORDERS_COUNT_ONE', '_count_ new order') : t('NEW_ORDERS_COUNT', '_count_ new orders')).replace('_count_', String(total))
      return {
        kind,
        title,
        lines: lines.slice(0, MAX_LISTED),
        more: hidden > 0 ? t('ORDER_ITEMS_AND_MORE', 'and _count_ more').replace('_count_', String(hidden)) : undefined,
        // One order opens its details; several open the New list.
        button: lines.length === 1 && lines[0].orders.length === 1
          ? { text: viewOrder, action: details }
          : { text: viewOrders, action: ordersAction('new') }
      }
    }
  }
}
