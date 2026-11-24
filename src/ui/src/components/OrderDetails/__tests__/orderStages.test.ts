import { barSteps, isEndedOrder, orderStage, orderTypeLabel, statusLabel, type OrderStage } from '../orderStages'

const t = (_key: string, fallback: string) => fallback

describe('orderStage', () => {
  const stageOf = (status: number, type = 2) => orderStage({ status, delivery_type: type })

  it.each<[number, number, OrderStage]>([
    [0, 1, 'new'],
    [0, 2, 'new'],
    [13, 2, 'scheduled'],
    [13, 9, 'scheduled'],
    [7, 1, 'preparing'],
    [14, 2, 'preparing'],
    [7, 9, 'preparing'],
    [4, 2, 'ready_handoff'],
    [20, 3, 'ready_handoff'],
    [21, 9, 'ready_handoff'],
    [4, 1, 'with_driver'],
    [4, 7, 'with_driver'],
    [21, 1, 'with_driver'],
    [3, 1, 'with_driver'],
    [8, 1, 'with_driver'],
    [9, 1, 'with_driver'],
    [18, 1, 'with_driver'],
    [19, 1, 'with_driver'],
    [22, 1, 'with_driver'],
    [26, 1, 'with_driver'],
    [1, 1, 'done'],
    [11, 1, 'done'],
    [15, 2, 'done'],
    [2, 1, 'closed'],
    [5, 1, 'closed'],
    [6, 1, 'closed'],
    [10, 1, 'closed'],
    [12, 1, 'closed'],
    [16, 2, 'closed'],
    [17, 2, 'closed']
  ])('status %i of type %i is the %s stage', (status, type, stage) => {
    expect(stageOf(status, type)).toBe(stage)
  })

  it('treats an unknown status as read-only (a driver stage)', () => {
    expect(stageOf(99)).toBe('with_driver')
  })
})

describe('barSteps', () => {
  it('a new order is rejected or accepted', () => {
    expect(barSteps({ status: 0, delivery_type: 1 })).toEqual(['reject', 'accept'])
  })
  it('a pre-order has no bar', () => {
    expect(barSteps({ status: 13, delivery_type: 2 })).toEqual([])
  })
  it('an order being made is marked ready (accepted or not ready)', () => {
    expect(barSteps({ status: 7, delivery_type: 1 })).toEqual(['ready'])
    expect(barSteps({ status: 14, delivery_type: 2 })).toEqual(['ready'])
  })
  it('a reservation being made answers arrived or not; one not ready has no bar', () => {
    expect(barSteps({ status: 7, delivery_type: 9 })).toEqual(['not_arrived', 'arrived'])
    expect(barSteps({ status: 14, delivery_type: 9 })).toEqual([])
  })
  it.each([4, 20, 21])('a pickup in status %i is picked up or not', (status) => {
    expect(barSteps({ status, delivery_type: 2 })).toEqual(['not_picked_up', 'picked_up'])
  })
  it('a reservation that is ready reads arrived / not arrived', () => {
    expect(barSteps({ status: 4, delivery_type: 9 })).toEqual(['not_arrived', 'arrived'])
  })
  it('a delivery with its driver has no bar', () => {
    expect(barSteps({ status: 4, delivery_type: 1 })).toEqual([])
    expect(barSteps({ status: 9, delivery_type: 1 })).toEqual([])
  })
  it('a finished or closed order prints, unless the theme hides print', () => {
    expect(barSteps({ status: 1, delivery_type: 1 })).toEqual(['print'])
    expect(barSteps({ status: 5, delivery_type: 1 })).toEqual(['print'])
    expect(barSteps({ status: 1, delivery_type: 1 }, { canPrint: false })).toEqual([])
  })
})

describe('labels', () => {
  it('status 4 reads Ready for pickup', () => {
    expect(statusLabel(4, t)).toBe('Ready for pickup')
  })
  it('a pre-order reservation reads Reservation, a pre-order does not', () => {
    expect(statusLabel(13, t, { delivery_type: 9 })).toBe('Reservation')
    expect(statusLabel(13, t, { delivery_type: 2 })).not.toBe('Reservation')
  })
  it('catering pickup has its own text (it used to read Delivery)', () => {
    expect(orderTypeLabel(t, 8)).toBe('Catering pickup')
    expect(orderTypeLabel(t, 7)).toBe('Catering delivery')
    expect(orderTypeLabel(t, 5)).toBe('Drive thru')
  })
  it('the ended statuses have no chat', () => {
    expect([1, 2, 5, 6, 10, 11, 12, 15, 16, 17].every((status) => isEndedOrder({ status }))).toBe(true)
    expect([0, 4, 7, 9].some((status) => isEndedOrder({ status }))).toBe(false)
  })
})
