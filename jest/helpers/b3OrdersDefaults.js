/**
 * Controller defaults for B3 orders UI wired exports.
 */
/* eslint-env jest */

const tabs = [
  { key: 0, text: 'Pending', tags: [0, 13], title: 'pending' },
  { key: 1, text: 'In Progress', tags: [3, 4, 7, 8], title: 'inProgress' },
  { key: 2, text: 'Completed', tags: [1, 11], title: 'completed' },
  { key: 3, text: 'Cancelled', tags: [2, 5], title: 'cancelled' }
]

const sampleOrder = {
  id: 101,
  status: 0,
  total: 25.5,
  currency: 'USD',
  delivery_type: 1,
  delivery_datetime: '2099-01-01 12:00:00',
  delivery_datetime_utc: '2099-01-01 12:00:00',
  products: [
    {
      id: 1,
      name: 'Burger',
      quantity: 1,
      price: 10,
      options: [],
      ingredients: []
    }
  ],
  summary: { total: 25.5, subtotal: 20, tax: 2.5, delivery_price: 3, driver_tip: 2 },
  customer: { name: 'Jane', cellphone: '5551234' },
  business: { name: 'Store A', logo: 'https://example.com/logo.png' },
  payment_events: [{ event: 'payment', amount: 25.5 }]
}

const emptyOrdersGroupEntry = {
  orders: [],
  loading: false,
  defaultFilter: [0],
  currentFilter: [0],
  pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 }
}

const pendingOrdersGroupEntry = {
  orders: [sampleOrder],
  loading: false,
  defaultFilter: [0, 13],
  currentFilter: [0, 13],
  pagination: { currentPage: 1, pageSize: 10, totalPages: 3, total: 25 }
}

const ordersGroup = {
  pending: { ...pendingOrdersGroupEntry },
  inProgress: { ...emptyOrdersGroupEntry, defaultFilter: [3], currentFilter: [3] },
  completed: { ...emptyOrdersGroupEntry, defaultFilter: [1], currentFilter: [1] },
  cancelled: { ...emptyOrdersGroupEntry, defaultFilter: [2], currentFilter: [2] }
}

const orderStatus = [
  { key: 0, text: 'Pending' },
  { key: 1, text: 'Completed' },
  { key: 3, text: 'In Progress' },
  { key: 13, text: 'Preorder' }
]

module.exports = {
  sampleOrder,
  tabs,
  orderStatus,
  ordersGroup
}
