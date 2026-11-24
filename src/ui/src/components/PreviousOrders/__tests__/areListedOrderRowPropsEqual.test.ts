import { areListedOrderRowPropsEqual, areListedOrdersEqual } from '../areListedOrderRowPropsEqual'
import { makeOrder } from '../../OrdersOption/__tests__/fixtures'

describe('areListedOrdersEqual', () => {
  it('does not serialize the report: it compares the two moments the card reads', () => {
    const stringify = jest.spyOn(JSON, 'stringify')
    const a = makeOrder({ reporting_data: { at: { 'status:7': '2026-11-19 12:00:00', 'status:1': 'x' } } })
    const sameMoments = makeOrder({ reporting_data: { at: { 'status:7': '2026-11-19 12:00:00', 'status:1': 'y' } } })
    const accepted = makeOrder({ reporting_data: { at: { 'status:7': '2026-11-19 12:05:00' } } })
    const ready = makeOrder({ reporting_data: { at: { 'status:7': '2026-11-19 12:00:00', 'status:4': '2026-11-19 12:10:00' } } })
    expect(areListedOrdersEqual(a, sameMoments)).toBe(true)
    expect(areListedOrdersEqual(a, accepted)).toBe(false)
    expect(areListedOrdersEqual(a, ready)).toBe(false)
    expect(stringify).not.toHaveBeenCalled()
    stringify.mockRestore()
  })

  it('treats a missing report as equal to a missing report', () => {
    expect(areListedOrdersEqual(makeOrder({ reporting_data: undefined }), makeOrder({ reporting_data: null }))).toBe(true)
  })
})

describe('areListedOrderRowPropsEqual', () => {
  it('is false when the status changes and true for a rebuilt, equal order', () => {
    const order = makeOrder({ id: 1, status: 0 })
    expect(areListedOrderRowPropsEqual({ order }, { order: { ...order } })).toBe(true)
    expect(areListedOrderRowPropsEqual({ order }, { order: { ...order, status: 7 } })).toBe(false)
  })

  it('is false when a driver is assigned (the card draws Assign driver by it)', () => {
    const order = makeOrder({ id: 1, status: 4 })
    expect(areListedOrderRowPropsEqual({ order }, { order: { ...order, driver_id: 5 } })).toBe(false)
  })
})
