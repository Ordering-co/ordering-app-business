const baseOrder = {
  id: 42,
  orderStatus: 'ACCEPTED',
  delivery_type: 1,
  delivery_datetime: '2026-01-01T12:00:00Z',
  delivery_datetime_utc: '2026-01-01T12:00:00Z',
  comment: null,
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
    { event: 'payment', amount: 15.5, paymethod: { gateway: 'cash', name: 'Cash' } }
  ],
  summary: {
    subtotal: 12,
    tax: 0,
    discount: 0,
    service_fee: 0,
    delivery_price: 2.5,
    driver_tip: 1,
    total: 15.5
  },
  customer: {
    name: 'Jane',
    middle_name: '',
    lastname: 'Doe',
    second_lastname: '',
    email: 'jane@example.com',
    cellphone: '5551112222',
    phone: null,
    address: '456 Customer Ave',
    internal_number: '2B',
    address_notes: '',
    zipcode: '10002'
  },
  business: {
    name: 'Store A',
    email: 'store@example.com',
    cellphone: '5550001111',
    phone: null,
    address: '123 Main St',
    address_notes: ''
  },
  products: [
    { quantity: 1, name: 'Cheeseburger', total: 12, ingredients: [], options: [], comment: null }
  ],
  delivery_option: null,
  paymethod: { gateway: 'cash', name: 'Cash' }
}

const legacyTicketOrders = [
  { name: 'sample', order: baseOrder },
  {
    name: 'empty values and long text',
    order: {
      ...baseOrder,
      id: 536,
      orderStatus: null,
      comment: 'Please ring the bell twice and leave the bag next to the green door on the left side',
      delivery_option: { id: 3, name: 'Leave at the door' },
      offer_type: 1,
      offer_rate: 10,
      discount: 4.5,
      summary: { ...baseOrder.summary, subtotal: 45, discount: 4.5, total: 70 },
      customer: {
        ...baseOrder.customer,
        name: 'Marion',
        lastname: 'Du Plessis',
        email: null,
        cellphone: '',
        phone: '0831234567',
        address: '7 Republic Street, Bredasdorp, Western Cape, South Africa',
        internal_number: null,
        address_notes: 'Gate code 4455, blue house after the church',
        zipcode: null
      },
      business: {
        ...baseOrder.business,
        name: 'Soetmuisberg Kitchen and Coffee Roasters',
        email: null,
        phone: '0280000000',
        address: '12 Long Street, Bredasdorp, Western Cape',
        address_notes: 'Entrance through the courtyard'
      },
      products: [
        {
          quantity: 2,
          name: 'Double smoked brisket sandwich with pickled onions',
          total: 45,
          ingredients: [{ name: 'Mustard' }, { name: 'Onion' }],
          options: [
            {
              name: 'Choose your bread and the side dish for this sandwich',
              suboptions: [
                { quantity: 1, name: 'Sourdough', position: 'whole', price: 0 },
                { quantity: 1, name: 'Extra cheese', position: 'left', price: 1.5 },
                { quantity: 1, name: 'No', position: null, price: 0 }
              ]
            }
          ],
          comment: 'No sauce at all please, the customer is allergic to several ingredients'
        },
        { quantity: 1, name: 'Flat white', total: 25, ingredients: [], options: [], comment: '' }
      ]
    }
  },
  {
    name: 'pickup with offers taxes and several payments',
    order: {
      ...baseOrder,
      id: 463,
      delivery_type: 2,
      cash: 100,
      taxes: [
        { type: 1, target: 'product', summary: { tax: 1.2 } },
        { type: 2, target: 'product', name: 'VAT', rate: 15, summary: { tax: 3 } }
      ],
      offers: [
        { name: 'Happy hour', rate_type: 1, rate: 10, target: 1, summary: { discount: 2 } },
        { name: 'Free delivery', rate_type: 2, rate: 2.5, target: 2, summary: { discount: 2.5 } }
      ],
      summary: { subtotal: 20, tax: 4.2, discount: 2, service_fee: 1.5, delivery_price: 0, driver_tip: 2, total: 25.7 },
      payment_events: [
        { event: 'payment', amount: 10, paymethod: { gateway: 'cash', name: 'Cash' } },
        { event: 'payment', amount: 15.7, paymethod: { gateway: 'card_delivery', name: 'Card on delivery' } }
      ],
      customer: { ...baseOrder.customer, phone: '5559998888', address_notes: 'Back door' },
      products: [
        { quantity: 3, name: 'Taco', total: 20, ingredients: [], options: [], comment: 'Extra spicy' }
      ]
    }
  }
]

const legacyTicketWidths = [undefined, 24, 37]

module.exports = { legacyTicketOrders, legacyTicketWidths }
