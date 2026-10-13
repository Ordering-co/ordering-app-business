import { getPushOpenOrderPlan } from '../getPushOpenOrderPlan'

describe('getPushOpenOrderPlan', () => {
  it('keeps a pending order id while logged out', () => {
    expect(getPushOpenOrderPlan({
      loaded: true,
      auth: false,
      orderId: 42
    })).toEqual({
      shouldOpen: false,
      pendingOrderId: 42
    })
  })

  it('opens Order Details after login when a push order id is pending', () => {
    expect(getPushOpenOrderPlan({
      loaded: true,
      auth: true,
      orderId: 42
    })).toEqual({
      shouldOpen: true,
      pendingOrderId: 42
    })
  })

  it('does not open when boot is not loaded yet', () => {
    expect(getPushOpenOrderPlan({
      loaded: false,
      auth: true,
      orderId: 42
    }).shouldOpen).toBe(false)
  })

  it('does not open when there is no pending order id', () => {
    expect(getPushOpenOrderPlan({
      loaded: true,
      auth: true,
      orderId: null
    })).toEqual({
      shouldOpen: false,
      pendingOrderId: null
    })

    expect(getPushOpenOrderPlan({
      loaded: true,
      auth: true,
      orderId: ''
    }).shouldOpen).toBe(false)
  })
})
