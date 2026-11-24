/**
 * An invented order for the ticket settings' live preview: the stored options are applied to it by the real ticket text,
 * so what the preview shows is what a generic printer prints. Nothing here is a real person or store.
 */
export const SAMPLE_ORDER = {
  id: 1053,
  status: 7,
  orderStatus: 'ACCEPTED',
  delivery_type: 1,
  delivery_datetime: '2026-01-01T12:29:00Z',
  delivery_datetime_utc: '2026-01-01T12:29:00Z',
  comment: 'Ring the bell twice',
  currency: 'USD',
  tax_type: 1,
  tax: 0,
  discount: 0,
  offer_type: null,
  offer_rate: 0,
  cash: 0,
  driver_tip: 0,
  totalDriverTip: 0,
  taxes: [],
  fees: [],
  offers: [],
  payment_events: [
    { event: 'payment', amount: 28.5, paymethod: { gateway: 'cash', name: 'Cash' } }
  ],
  summary: {
    subtotal: 24,
    tax: 0,
    discount: 0,
    service_fee: 0,
    delivery_price: 3.5,
    driver_tip: 1,
    total: 28.5
  },
  customer: {
    name: 'Alex',
    middle_name: '',
    lastname: 'Sample',
    second_lastname: '',
    email: 'customer@example.com',
    cellphone: '5551112222',
    phone: null,
    address: '12 Example Street, Apt 4',
    internal_number: '4',
    address_notes: 'Second door',
    zipcode: '10001'
  },
  business: {
    name: 'Sample Store',
    email: 'store@example.com',
    cellphone: '5550001111',
    phone: null,
    address: '1 Main Street',
    address_notes: ''
  },
  products: [
    {
      quantity: 1,
      name: 'Margherita pizza',
      total: 18,
      ingredients: [],
      options: [
        { name: 'Size', suboptions: [{ quantity: 1, name: 'Large', position: 'whole', price: 3 }] }
      ],
      comment: 'Well done'
    },
    { quantity: 2, name: 'Lemonade', total: 6, ingredients: [], options: [], comment: null }
  ],
  delivery_option: null,
  paymethod: { gateway: 'cash', name: 'Cash' }
}
