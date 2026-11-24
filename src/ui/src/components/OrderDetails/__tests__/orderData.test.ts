import {
  deliveryDateText, isPaid, isPayOnDelivery, orderCommentText, orderCustomFields, orderDataLines, orderNumber, paymentMethodNames, productCountText,
  productDetailLines, productTotal, vehicleLines
} from '../orderData'

const t = (_key: string, fallback: string) => fallback
const parsePrice = (value: number) => `$${Number(value).toFixed(2)}`
const dateTime = (value: string) => `<${value}>`

describe('the words of the ready action', () => {
  it('is one wording by kind of order, the same on the card, the group and the footer', () => {
    const { markReadyText } = require('../orderStages')
    for (const type of [2, 4, 5, 8, '2']) expect(markReadyText(t, type)).toBe('Mark ready for pickup')
    for (const type of [1, 3, 7, undefined]) expect(markReadyText(t, type)).toBe('Mark ready')
  })
})

describe('products', () => {
  it('adds the options to the price, with the half price of a half option', () => {
    const product = {
      quantity: 2,
      price: 10,
      options: [{ suboptions: [{ quantity: 1, price: 2 }, { quantity: 1, price: 4, half_price: 2.5, position: 'left' }, { quantity: 1, price: 4, position: 'right' }] }]
    }
    expect(productTotal(product)).toBe(2 * (10 + 2 + 2.5 + 4))
  })

  it('writes the options and the ingredients taken out as the kitchen reads them', () => {
    const product = {
      options: [
        { name: 'Size', suboptions: [{ name: 'Large', quantity: 1 }] },
        { name: 'Extra', suboptions: [{ name: 'Basil', quantity: 2 }, { name: 'Cheese', quantity: 1, position: 'left' }] },
        { name: 'Sauce', suboptions: [{ name: 'No', quantity: 1 }] }
      ],
      ingredients: { 1: { name: 'olives', selected: false }, 2: { name: 'ham', selected: true } }
    }
    expect(productDetailLines(product, t)).toEqual(['Size: Large', 'Extra: 2 x Basil, Cheese (left)', 'Sauce: No', 'No olives'])
  })

  it('reads options sent as text', () => {
    expect(productDetailLines({ options: JSON.stringify([{ name: 'Size', suboptions: [{ name: 'Small', quantity: 1 }] }]) }, t)).toEqual(['Size: Small'])
  })

  it('counts products and items, in singular and plural', () => {
    expect(productCountText({ products: [{ quantity: 1 }, { quantity: 2 }, { quantity: 1 }] }, t)).toBe('3 products · 4 items')
    expect(productCountText({ products: [{ quantity: 1 }] }, t)).toBe('1 product · 1 item')
  })
})

describe('order', () => {
  it('numbers by the external id only when the project asks', () => {
    const order = { id: 5, external_id: 'EXT-9' }
    expect(orderNumber(order, { change_order_id: { value: '1' } })).toBe('EXT-9')
    expect(orderNumber(order, { change_order_id: { value: '0' } })).toBe('5')
    expect(orderNumber({ id: 5 }, { change_order_id: { value: '1' } })).toBe('5')
  })

  it('trims the comment', () => {
    expect(orderCommentText({ comment: '\n  Ring the bell \n\n' })).toBe('Ring the bell')
    expect(orderCommentText({ comment: '   ' })).toBe('')
  })

  it('is paid when a payment event is on it', () => {
    expect(isPaid({ payment_events: [{ event: 'payment' }] })).toBe(true)
    expect(isPaid({ payment_events: [{ event: 'refund' }] })).toBe(false)
    expect(isPaid({})).toBe(false)
  })

  it('is unpaid when it is cash or card on delivery, even with a payment event', () => {
    const payment = (gateway: string) => ({ event: 'payment', paymethod: { gateway } })
    expect(isPaid({ paymethod: { gateway: 'cash' }, payment_events: [payment('cash')] })).toBe(false)
    expect(isPaid({ paymethod: { gateway: 'card_delivery' }, payment_events: [payment('card_delivery')] })).toBe(false)
    expect(isPaid({ paymethod: { gateway: 'cash' } })).toBe(false)
    expect(isPaid({ paymethod: { gateway: 'stripe' }, payment_events: [payment('stripe')] })).toBe(true)
    expect(isPayOnDelivery('cash')).toBe(true)
    expect(isPayOnDelivery('card_delivery')).toBe(true)
    expect(isPayOnDelivery('stripe')).toBe(false)
    expect(isPayOnDelivery(undefined)).toBe(false)
  })

  it('is unpaid when any of the money of several payments is cash (a wallet and cash), paid when none is', () => {
    const wallet = { event: 'payment', wallet_event: { wallet: { type: 'credit_point' } } }
    const cash = { event: 'payment', paymethod: { gateway: 'cash' } }
    const card = { event: 'payment', paymethod: { gateway: 'stripe' } }
    expect(isPaid({ paymethod: { gateway: 'stripe' }, payment_events: [wallet, cash] })).toBe(false)
    expect(isPaid({ paymethod: { gateway: 'stripe' }, payment_events: [wallet, card] })).toBe(true)
  })

  it('names the payment: the gateway, the cash change, the wallet', () => {
    const order = {
      cash: 50,
      paymethod: { gateway: 'cash', name: 'Cash' },
      payment_events: [
        { event: 'payment', paymethod: { gateway: 'cash', name: 'Cash' } },
        { event: 'payment', wallet_event: { wallet: { type: 'credit_point' } } }
      ]
    }
    expect(paymentMethodNames(order, t, parsePrice)).toEqual(['Cash (Change of $50.00)', 'Credit Points Wallet'])
    expect(paymentMethodNames({ paymethod: { gateway: 'stripe', name: 'Card' } }, t, parsePrice)).toEqual(['Card'])
  })

  it('lists the data of More details: type, payment, when, external id', () => {
    const order = { delivery_type: 8, delivery_datetime: '2099-01-01 10:00:00', external_id: 'X1', created_at: '2026-01-01 09:00:00', paymethod: { name: 'Cash' } }
    const lines = orderDataLines(order, { t, dateTime, parsePrice, configs: { change_order_id: { value: '0' } } })
    expect(lines.map((line) => line.key)).toEqual(['type', 'payment', 'placed', 'external_id', 'created_at'])
    expect(lines[0].value).toBe('Catering pickup')
  })

  it('writes "ASAP (date)" with a space before the parenthesis when the order is already due, the date alone otherwise', () => {
    expect(deliveryDateText({ delivery_datetime: '2020-01-01 10:00:00' }, { t, dateTime })).toBe('ASAP (<2020-01-01 10:00:00>)')
    expect(deliveryDateText({ delivery_datetime: '2099-01-01 10:00:00' }, { t, dateTime })).toBe('<2099-01-01 10:00:00>')
  })

  it('leaves the external id out when it already is the order number, and the theme hides type and date', () => {
    const order = { delivery_type: 7, external_id: 'X1', created_at: '2026-01-01 09:00:00' }
    const lines = orderDataLines(order, { t, dateTime, parsePrice, configs: { change_order_id: { value: '1' } }, showDate: false, showType: false })
    expect(lines).toEqual([])
  })

  it('has custom fields and vehicle lines', () => {
    expect(orderCustomFields({ metafields: [{ id: 1, key: 'Table', value: 4 }, { id: 2, value: 'x' }] })).toEqual([{ id: 1, key: 'Table', value: '4' }])
    expect(vehicleLines({ vehicle: { color: 'red', model: 'Golf', car_registration: 'AB-12' } }, t).map((line) => line.key)).toEqual(['car_registration', 'color', 'model'])
    expect(vehicleLines({}, t)).toEqual([])
  })
})
