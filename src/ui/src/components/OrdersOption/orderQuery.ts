import { ACTIVE_STATUSES, PREPARING_STATUSES, READY_STATUSES, WITH_DRIVER_STATUSES } from './orderStatusGroups'
import type { ListKey } from './ordersView'

/**
 * The orders request the app makes itself (the lists of a stage), written as the controller writes its own
 * (`OrderListGroups`, `getOrders`): the same endpoint (`orders` as the dashboard), the same newest-first order, and the same
 * fixed clause of the business app (an order with a product of type item, a cloned order, or delivery type 9: gift cards and the
 * like stay out).
 */
export const BUSINESS_APP_CLAUSE = {
  conector: 'OR',
  conditions: [
    { attribute: 'products', conditions: [{ attribute: 'type', value: { condition: '=', value: 'item' } }] },
    { attribute: 'cloned_order_id', value: { condition: '!=', value: null } },
    { attribute: 'delivery_type', value: { condition: '=', value: 9 } }
  ]
}

/**
 * The statuses of each list the chips open: a stage of In progress (`all` is the three stages together), or Pending and Preorder
 * (the two halves of New).
 */
export const LIST_STATUSES: Record<ListKey, number[]> = {
  all: [...PREPARING_STATUSES, ...READY_STATUSES, ...WITH_DRIVER_STATUSES],
  preparing: PREPARING_STATUSES,
  ready: READY_STATUSES,
  with_driver: WITH_DRIVER_STATUSES,
  pending: [0],
  preorder: [13]
}

export { ACTIVE_STATUSES }

export interface OrdersQuery {
  statuses: number[]
  /** One store's orders (`business_id`); empty: every store. */
  business?: string
  /** Only the orders older than this id: the next page of a list, however many orders left it meanwhile. */
  beforeId?: number
  pageSize: number
}

export const ordersWhere = ({ statuses, business, beforeId }: Pick<OrdersQuery, 'statuses' | 'business' | 'beforeId'>) => {
  const where: any[] = [{ attribute: 'status', value: statuses }]
  if (beforeId !== undefined) where.push({ attribute: 'id', value: { condition: '<', value: beforeId } })
  if (business) where.push({ attribute: 'business_id', value: business })
  where.push(BUSINESS_APP_CLAUSE)
  return where
}

export interface OrdersAnswer {
  orders: any[]
  /** The server's number of orders that match (all pages). */
  total: number | null
}

/**
 * One page of orders, newest first. Throws when the API says no or the network fails, so a caller never takes a failed answer for
 * an empty list (nor a count of zero). `source` is the SDK's cancel token holder.
 */
export const askOrders = async (ordering: any, token: string, query: OrdersQuery, source: Record<string, any> = {}): Promise<OrdersAnswer> => {
  const request = ordering.setAccessToken(token).orders().asDashboard()
  const { content } = await request.get({
    query: { orderBy: '-id', page: 1, page_size: query.pageSize, where: ordersWhere(query) },
    cancelToken: source
  })
  if (content?.error) {
    const reason = Array.isArray(content.result) ? content.result[0] : content.result
    throw new Error(typeof reason === 'string' ? reason : 'ERROR')
  }
  const total = content?.pagination?.total
  return { orders: Array.isArray(content?.result) ? content.result : [], total: typeof total === 'number' && Number.isFinite(total) ? total : null }
}
