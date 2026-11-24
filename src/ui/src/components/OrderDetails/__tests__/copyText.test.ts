import { buildOrderCopyText } from '../copyText'

const t = (_key: string, fallback: string) => fallback
const parsePrice = (value: number) => `$${Number(value ?? 0).toFixed(2)}`

const order = {
  id: 123,
  status: 4,
  delivery_type: 1,
  subtotal: 20,
  total: 25,
  summary: { total: 25, delivery_price: 3, service_fee: 2, driver_tip: 1 },
  paymethod: { name: 'Cash' },
  business: { name: 'Luna Pizza', phone: '5550001', address: '1 Main St' },
  customer: { name: 'Jane', lastname: 'Roe', email: 'jane@example.test', cellphone: '5550100', address: '9 Oak St' },
  products: [{ quantity: 2, name: 'Pizza', price: 10, options: [{ name: 'Size', suboptions: [{ quantity: 1, name: 'Large', price: 0 }] }], comment: 'No cheese' }]
}

describe('buildOrderCopyText', () => {
  it('writes the order, its store, its customer, its products and its amounts', () => {
    const text = buildOrderCopyText({ order, t, parsePrice, hideCustomerContact: false })
    expect(text).toContain('Order #123 is Ready for pickup')
    expect(text).toContain('Cash - Delivery')
    expect(text).toContain('Luna Pizza')
    expect(text).toContain('Jane  Roe')
    expect(text).toContain('jane@example.test')
    expect(text).toContain('5550100')
    expect(text).toContain('9 Oak St')
    expect(text).toContain('2 X Pizza $20.00')
    expect(text).toContain('Large')
    expect(text).toContain('No cheese')
    expect(text).toContain('Subtotal: $20.00')
    expect(text).toContain('Driver tip $1.00')
    expect(text).toContain('Total $25.00')
  })

  it('writes the delivery fee as the delivery price and the service fee on its own line', () => {
    const text = buildOrderCopyText({ order, t, parsePrice, hideCustomerContact: false })
    expect(text).toContain('Delivery fee $3.00')
    expect(text).toContain('Service fee $2.00')
  })

  it('leaves the customer name, e-mail and phones out when the business hides them (the address stays)', () => {
    const text = buildOrderCopyText({ order, t, parsePrice, hideCustomerContact: true })
    expect(text).not.toContain('Jane')
    expect(text).not.toContain('jane@example.test')
    expect(text).not.toContain('5550100')
    expect(text).toContain('9 Oak St')
  })
})
