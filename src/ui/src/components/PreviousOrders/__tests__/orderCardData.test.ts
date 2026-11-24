import { customerText, groupPaymentState, itemsCount, itemsText, orderNumber, orderTotal, orderTypeText, paymentState, reasonText, storeOf, storesOf } from '../orderCardData'
import { makeOrder, identity as t } from '../../OrdersOption/__tests__/fixtures'

describe('orderCardData', () => {
  it('writes the number, or the external id when the project asks for it', () => {
    expect(orderNumber(makeOrder({ id: 1053, external_id: 'EXT-9' }), false)).toBe('#1053')
    expect(orderNumber(makeOrder({ id: 1053, external_id: 'EXT-9' }), true)).toBe('#EXT-9')
    expect(orderNumber(makeOrder({ id: 1053, external_id: null }), true)).toBe('#1053')
  })

  it('writes the order type of the eight the API knows and nothing for another', () => {
    expect([1, 2, 3, 4, 5, 7, 8, 9].map((type) => orderTypeText(type, t))).toEqual([
      'Delivery', 'Pickup', 'Eat in', 'Curbside', 'Drive thru', 'Catering delivery', 'Catering pickup', 'Reservation'
    ])
    expect(orderTypeText(42, t)).toBeUndefined()
  })

  it('writes the customer, "Customer" when the contact is hidden, nothing without a name', () => {
    expect(customerText(makeOrder(), false, t)).toBe('James Carter')
    expect(customerText(makeOrder(), true, t)).toBe('Customer')
    expect(customerText(makeOrder({ customer: {} }), false, t)).toBeUndefined()
    expect(customerText(makeOrder({ customer: undefined }), false, t)).toBeUndefined()
  })

  it('writes the number of items (the units), never the products', () => {
    expect(itemsText(makeOrder(), t)).toBe('2 items')
    const four = makeOrder({ products: [1, 2, 3, 4].map((n) => ({ name: `P${n}`, quantity: n })) })
    expect(itemsText(four, t)).toBe('10 items')
    expect(itemsText(makeOrder({ products: [{ name: 'Soup', quantity: 1 }] }), t)).toBe('1 item')
    expect(itemsCount(makeOrder({ products: [{ name: 'Soup' }] }))).toBe(1)
    expect(itemsText(makeOrder({ products: [] }), t)).toBeUndefined()
    expect(itemsText(makeOrder({ products: undefined }), t)).toBeUndefined()
  })

  it('writes the table and the items count of an eat-in order', () => {
    const order = makeOrder({ delivery_type: 3, spot_number: 7, products: [{ name: 'A', quantity: 3 }, { name: 'B', quantity: 1 }] })
    expect(itemsText(order, t)).toBe('Table 7 · 4 items')
  })

  it('reads the total from the summary, then the order, and nothing when it has neither', () => {
    expect(orderTotal(makeOrder())).toBe(32.37)
    expect(orderTotal(makeOrder({ summary: undefined, total: 10 }))).toBe(10)
    expect(orderTotal(makeOrder({ summary: undefined }))).toBeUndefined()
  })

  it('says paid for a payment event, unpaid without one, and nothing when the payload has no events', () => {
    expect(paymentState(makeOrder())).toBe('paid')
    expect(paymentState(makeOrder({ payment_events: [] }))).toBe('unpaid')
    expect(paymentState(makeOrder({ payment_events: undefined }))).toBeUndefined()
  })

  it('says cash and card on delivery are unpaid whatever the events say, the details\' one rule', () => {
    const cash = { gateway: 'cash', name: 'Cash' }
    expect(paymentState(makeOrder({ paymethod: cash, payment_events: [{ event: 'payment', paymethod: cash }] }))).toBe('unpaid')
    expect(paymentState(makeOrder({ paymethod: cash, payment_events: undefined }))).toBe('unpaid')
    const onDelivery = { gateway: 'card_delivery', name: 'Card on delivery' }
    expect(paymentState(makeOrder({ paymethod: onDelivery, payment_events: [{ event: 'payment', paymethod: onDelivery }] }))).toBe('unpaid')
    const card = { gateway: 'stripe', name: 'Card' }
    expect(paymentState(makeOrder({ paymethod: card, payment_events: [{ event: 'payment', paymethod: card }] }))).toBe('paid')
  })

  it('a group is paid only when every order is, and says nothing when one cannot say', () => {
    const paid = makeOrder()
    const unpaid = makeOrder({ payment_events: [] })
    expect(groupPaymentState([paid, paid])).toBe('paid')
    expect(groupPaymentState([paid, unpaid])).toBe('unpaid')
    expect(groupPaymentState([paid, makeOrder({ payment_events: undefined })])).toBeUndefined()
  })

  it('reads the store of an order and the stores of a group', () => {
    const mcb = { name: 'McBonalds', logo: 'https://example.com/mcb.png' }
    const wine = { name: 'Wine Co.', logo: 'https://example.com/wine.png' }
    expect(storeOf(makeOrder({ business: mcb }))).toEqual({ name: 'McBonalds', logo: mcb.logo })
    expect(storeOf(makeOrder({ business: { name: 'Limetray Test' } }))).toEqual({ name: 'Limetray Test', logo: undefined })
    expect(storeOf(makeOrder())).toBeUndefined()
    expect(storeOf(makeOrder({ business: { name: '  ' } }))).toBeUndefined()
    expect(storesOf([makeOrder({ business: mcb }), makeOrder({ business: mcb })])).toEqual({ name: 'McBonalds', logo: mcb.logo })
    expect(storesOf([makeOrder({ business: mcb }), makeOrder({ business: wine })])).toEqual({ name: 'McBonalds, Wine Co.', logo: mcb.logo })
  })

  it('writes the reason of a rejected order', () => {
    expect(reasonText(makeOrder({ reject_reason: 'Item out of stock' }), t)).toBe('Reason: Item out of stock')
    expect(reasonText(makeOrder({ reject_reason: ' ' }), t)).toBeUndefined()
  })
})
