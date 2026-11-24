import { alertContent, alertLines, MAX_LISTED, type ContentContext } from '../alertContent'
import type { AlertItem } from '../alertQueue'

const t = (_key: string, fallback?: string) => fallback ?? _key
const context: ContentContext = { t, parsePrice: (value) => `$${value.toFixed(2)}`, hideContact: false, showExternalId: false, visible: () => true }

const order = (id: number, extra: Record<string, any> = {}) => ({
  id,
  status: 0,
  delivery_type: 1,
  customer: { name: 'James', lastname: 'Carter' },
  products: [{ name: 'Pizza', quantity: 1 }, { name: 'Knots', quantity: 2 }, { name: 'Lemonade', quantity: 2 }],
  summary: { total: 32.37 },
  ...extra
})
const item = (id: number, extra: Record<string, any> = {}): AlertItem => ({ key: `o:${id}`, orderId: id, status: extra.status ?? 0, order: order(id, extra), receivedAt: 1000 + id })

describe('alertContent', () => {
  it('writes an order as its number and type, then customer, products and total', () => {
    const [line] = alertLines([item(1053)], context)
    expect(line.title).toBe('#1053 · Delivery')
    expect(line.detail).toBe('James Carter · 3 products · $32.37')
    expect(line.canAccept).toBe(true)
  })

  it('leaves out what the payload does not carry, and hides the customer when the project asks', () => {
    const bare: AlertItem = { key: 'o:7', orderId: 7, status: 0, order: { id: 7, status: 0 }, receivedAt: 1 }
    expect(alertLines([bare], context)[0].detail).toBeUndefined()
    expect(alertLines([item(1)], { ...context, hideContact: true })[0].detail).toBe('Customer · 3 products · $32.37')
    expect(alertLines([item(1)], { ...context, visible: (key) => key !== 'orders.total' })[0].detail).toBe('James Carter · 3 products')
  })

  it('uses the external id when the project does', () => {
    const [line] = alertLines([item(1, { external_id: 'A-77' })], { ...context, showExternalId: true })
    expect(line.title).toBe('#A-77 · Delivery')
  })

  it('answers only a pending order: a pre-order and an accepted one have no Accept', () => {
    const lines = alertLines([item(1), item(2, { status: 13 }), item(3, { status: 7 })], context)
    expect(Object.fromEntries(lines.map((line) => [line.key, line.canAccept]))).toEqual({ 'o:1': true, 'o:2': false, 'o:3': false })
  })

  it('lists the newest first, and the orders of one cart group as one line', () => {
    const lines = alertLines([item(1, { cart_group_id: 9 }), item(2), item(3, { cart_group_id: 9 })], context)
    expect(lines.map((line) => line.key)).toEqual(['o:2', 'g:9'])
    expect(lines[1].orders.map((entry: any) => entry.id)).toEqual([1, 3])
    expect(lines[1].title).toBe('Group No.9 · Delivery')
    expect(lines[1].detail).toBe('James Carter · 2 orders · $64.74')
  })

  it('says the count of the new orders, lists up to three and says "and N more"', () => {
    const items = [1, 2, 3, 4, 5].map((id) => item(id))
    const content = alertContent('order', items, context)
    expect(content.title).toBe('5 new orders')
    expect(content.lines).toHaveLength(MAX_LISTED)
    expect(content.more).toBe('and 2 more')
    expect(alertContent('order', [item(1), item(2)], context).more).toBeUndefined()
  })

  it('opens the order when there is one and the New list when there are several', () => {
    expect(alertContent('order', [item(8)], context).button).toEqual({ text: 'View order', action: { type: 'details', orderId: 8 } })
    expect(alertContent('order', [item(1), item(2)], context).button).toEqual({ text: 'View orders', action: { type: 'orders', tab: 'new', stage: 'pending' } })
    // Two orders of one group are one line, but still two orders: the New list.
    expect(alertContent('order', [item(1, { cart_group_id: 4 }), item(2, { cart_group_id: 4 })], context).button.action).toEqual({ type: 'orders', tab: 'new', stage: 'pending' })
  })

  it('opens New on the chip of the orders that rang: Preorder only when all of them are preorders, else Pending', () => {
    const action = (items: AlertItem[], kind: 'order' | 'order_update' = 'order') => alertContent(kind, items, context).button.action
    expect(action([item(1, { status: 13 }), item(2, { status: 13 })])).toEqual({ type: 'orders', tab: 'new', stage: 'preorder' })
    expect(action([item(1, { status: 13, cart_group_id: 4 }), item(2, { status: 13, cart_group_id: 4 })])).toEqual({ type: 'orders', tab: 'new', stage: 'preorder' })
    expect(action([item(1, { status: 13 }), item(2, { status: 0 })])).toEqual({ type: 'orders', tab: 'new', stage: 'pending' })
    expect(action([item(1, { status: 0 }), item(2, { status: 0 })])).toEqual({ type: 'orders', tab: 'new', stage: 'pending' })
    // An order with no status in its payload is Pending.
    expect(action([item(1, { status: 13 }), { key: 'o:2', orderId: 2, receivedAt: 1 }])).toEqual({ type: 'orders', tab: 'new', stage: 'pending' })
    // One order opens its details, whatever it is.
    expect(action([item(1, { status: 13 })])).toEqual({ type: 'details', orderId: 1 })
    // Updated orders: the same rule when they are in New; the other lists have no chip.
    expect(action([item(1, { status: 13 }), item(2, { status: 13 })], 'order_update')).toEqual({ type: 'orders', tab: 'new', stage: 'preorder' })
    expect(action([item(1, { status: 7 }), item(2, { status: 7 })], 'order_update')).toEqual({ type: 'orders', tab: 'progress' })
  })

  it('writes an updated order and a message as the driver does, without Accept lines', () => {
    const updated = alertContent('order_update', [item(5, { status: 7 })], context)
    expect(updated).toMatchObject({ title: 'New orders have been updated!', message: 'Order #5 has been updated.', lines: [] })
    const several = alertContent('order_update', [item(5, { status: 7 }), item(6, { status: 2 })], context)
    expect(several.message).toBe('2 orders have been updated.')
    expect(several.numbers).toBe('#5, #6')
    expect(several.button.action).toEqual({ type: 'orders', tab: 'history' })
    const message = alertContent('message', [{ key: 'o:9', orderId: 9, receivedAt: 1 }], context)
    expect(message.message).toBe('Order #9 has unread messages.')
    expect(message.button.action).toEqual({ type: 'details', orderId: 9 })
    expect(alertContent('message', [{ key: 'o:9', orderId: 9, receivedAt: 1 }, { key: 'o:8', orderId: 8, receivedAt: 1 }], context).button.action).toEqual({ type: 'messages' })
  })

  it('writes "and N more" after the numbers of an update', () => {
    const items = [1, 2, 3, 4].map((id) => ({ key: `o:${id}`, orderId: id, status: 7, receivedAt: 1 }))
    expect(alertContent('order_update', items, context).numbers).toBe('#1, #2, #3 and 1 more')
  })

  it('marks the sample order of the test alert and gives it no Accept', () => {
    const [line] = alertLines([{ ...item(1), test: true }], context)
    expect(line.title).toBe('Test order · Delivery')
    expect(line.canAccept).toBe(false)
    expect(line.test).toBe(true)
  })
})
