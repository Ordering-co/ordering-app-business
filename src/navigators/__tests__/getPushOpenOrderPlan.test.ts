import { getPendingPushOrderId, getPushOpenOrderPlan, getPushOpenScreen } from '../getPushOpenOrderPlan'

describe('getPushOpenOrderPlan', () => {
  it('keeps a pending order id while logged out', () => {
    expect(getPushOpenOrderPlan({ loaded: true, auth: false, orderId: 42 })).toEqual({
      shouldOpen: false,
      pendingOrderId: 42,
      screen: 'OrderDetails'
    })
  })

  it('opens the order\'s details after login when a push order id is pending', () => {
    expect(getPushOpenOrderPlan({ loaded: true, auth: true, orderId: 42 })).toEqual({
      shouldOpen: true,
      pendingOrderId: 42,
      screen: 'OrderDetails'
    })
  })

  it('opens the chat for a message push (data.type order_message), the details for any other type', () => {
    expect(getPushOpenOrderPlan({ loaded: true, auth: true, orderId: 42, type: 'order_message' }).screen).toBe('OrderMessage')
    expect(getPushOpenOrderPlan({ loaded: true, auth: true, orderId: 42, type: 'order_status' }).screen).toBe('OrderDetails')
    expect(getPushOpenOrderPlan({ loaded: true, auth: true, orderId: 42, type: null }).screen).toBe('OrderDetails')
    expect(getPushOpenScreen('order_message')).toBe('OrderMessage')
    expect(getPushOpenScreen(undefined)).toBe('OrderDetails')
  })

  it('waits for the app to load and for a session before opening a message push too', () => {
    expect(getPushOpenOrderPlan({ loaded: false, auth: true, orderId: 42, type: 'order_message' }).shouldOpen).toBe(false)
    expect(getPushOpenOrderPlan({ loaded: true, auth: false, orderId: 42, type: 'order_message' }).shouldOpen).toBe(false)
  })

  it('does not open when boot is not loaded yet', () => {
    expect(getPushOpenOrderPlan({ loaded: false, auth: true, orderId: 42 }).shouldOpen).toBe(false)
  })

  it('does not open when there is no pending order id', () => {
    expect(getPushOpenOrderPlan({ loaded: true, auth: true, orderId: null })).toEqual({
      shouldOpen: false,
      pendingOrderId: null,
      screen: 'OrderDetails'
    })
    expect(getPushOpenOrderPlan({ loaded: true, auth: true, orderId: '' }).shouldOpen).toBe(false)
    expect(getPushOpenOrderPlan({ loaded: true, auth: true, orderId: 'null' }).shouldOpen).toBe(false)
  })

  it('reads an order id the push carried, whatever its type', () => {
    expect(getPendingPushOrderId(7)).toBe(7)
    expect(getPendingPushOrderId('7')).toBe('7')
    expect(getPendingPushOrderId(undefined)).toBeNull()
  })
})
