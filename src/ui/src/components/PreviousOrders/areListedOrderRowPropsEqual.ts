const LISTED_ORDER_FIELDS = [
  'id',
  'status',
  'locked',
  'unsync',
  'showNotification',
  'time_status',
  'delivery_type',
  'delivery_datetime',
  'delivery_datetime_utc',
  'eta_time',
  'external_id',
  'business_id',
  'order_group_id',
  'cart_group_id',
  'updated_at',
  'status_at',
  'created_at',
  'prepared_in',
  'spot_number',
  'driver_id',
  'reject_reason',
  'action'
] as const

/** The units an order holds (the card's "3 items"); products without a quantity count as one. */
const unitsOf = (order: any): number => {
  const products = order?.products
  if (!Array.isArray(products)) return -1
  let units = 0
  for (const product of products) units += Number(product?.quantity) > 0 ? Number(product.quantity) : 1
  return units
}

/** The statuses whose moment the card's clock reads from `reporting_data.at` (accepted, ready). */
const REPORTED_STATUSES = [7, 4] as const

/**
 * Whether two versions of an order draw the same card: what the card writes (the number, the store, the customer, the items,
 * the total, the payment, the driver, the clocks' sources and the state) is compared, not the whole payload.
 */
export function areListedOrdersEqual (prev?: any, next?: any) {
  if (prev === next) return true
  if (!prev || !next) return prev === next

  for (const field of LISTED_ORDER_FIELDS) {
    if (prev[field] !== next[field]) return false
  }

  for (const part of ['name', 'lastname'] as const) {
    if (prev.customer?.[part] !== next.customer?.[part]) return false
    if (prev.driver?.[part] !== next.driver?.[part]) return false
  }
  if (prev.driver?.id !== next.driver?.id) return false
  // The store line: its name and its logo.
  if (prev.business?.name !== next.business?.name || prev.business?.logo !== next.business?.logo) return false
  if ((prev.summary?.total ?? prev.total) !== (next.summary?.total ?? next.total)) return false
  // The Paid / Unpaid chip: the method (cash is unpaid whatever the events say) and the payment events.
  if (prev.paymethod?.gateway !== next.paymethod?.gateway) return false
  if (prev.payment_events?.length !== next.payment_events?.length) return false
  // The items: the number of units, not the products' names (the card does not list them).
  if (unitsOf(prev) !== unitsOf(next)) return false
  if (prev.user_review?.id !== next.user_review?.id) return false
  // The card reads two moments of the API's report (accepted, ready), not the whole log.
  if (prev.reporting_data !== next.reporting_data) {
    for (const status of REPORTED_STATUSES) {
      if (prev.reporting_data?.at?.[`status:${status}`] !== next.reporting_data?.at?.[`status:${status}`]) return false
    }
  }
  if (prev.order_group?.orders?.length !== next.order_group?.orders?.length) return false

  return true
}

/** The memo of a card or a group's row: the orders it draws and the state that changes what it can do. */
export function areListedOrderRowPropsEqual (prevProps: any, nextProps: any) {
  if (
    prevProps.section !== nextProps.section ||
    prevProps.compact !== nextProps.compact ||
    prevProps.inGroup !== nextProps.inGroup ||
    prevProps.selected !== nextProps.selected ||
    prevProps.showStatus !== nextProps.showStatus ||
    prevProps.showStore !== nextProps.showStore ||
    prevProps.quickActions !== nextProps.quickActions ||
    prevProps.absoluteTime !== nextProps.absoluteTime ||
    prevProps.loadingChangeOrder !== nextProps.loadingChangeOrder
  ) return false

  if (Array.isArray(prevProps.orders) || Array.isArray(nextProps.orders)) {
    const prev = prevProps.orders ?? []
    const next = nextProps.orders ?? []
    return prev.length === next.length && prev.every((order: any, index: number) => areListedOrdersEqual(order, next[index]))
  }
  return areListedOrdersEqual(prevProps.order, nextProps.order)
}
