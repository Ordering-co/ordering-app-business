/** Orders as the list payload carries them, for the tests of the orders area. */
export const makeOrder = (overrides: Record<string, any> = {}) => ({
  id: 1001,
  status: 0,
  delivery_type: 1,
  created_at: '2026-11-19 12:00:00',
  customer: { name: 'James', lastname: 'Carter' },
  products: [{ name: 'Margherita pizza', quantity: 1 }, { name: 'Garlic knots', quantity: 1 }],
  summary: { total: 32.37 },
  paymethod: { name: 'Card' },
  payment_events: [{ event: 'payment' }],
  ...overrides
})

/** One order per status of the open orders and History. */
export const orderForStatus = (status: number, id = 2000 + status) => makeOrder({ id, status })

/** The controller's slot as it holds a loaded list. */
export const slot = (orders: any[], extra: Record<string, any> = {}) => ({
  orders,
  loading: false,
  error: null,
  fetched: true,
  pagination: { currentPage: 1, pageSize: 50, total: orders.length, totalPages: 1 },
  ...extra
})

export const identity = (_key: string, fallback?: string) => fallback ?? _key
