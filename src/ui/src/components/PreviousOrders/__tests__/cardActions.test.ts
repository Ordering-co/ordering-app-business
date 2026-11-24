import { cardActionsFor, STATUS_OF_STEP, stepNeedsConfirmation } from '../cardActions'
import { makeOrder } from '../../OrdersOption/__tests__/fixtures'

const actions = (status: number, deliveryType = 1) => cardActionsFor(makeOrder({ status, delivery_type: deliveryType }))

describe('cardActionsFor', () => {
  it('a pending order is rejected or accepted', () => {
    expect(actions(0)).toEqual({ decline: 'reject', advance: 'accept' })
  })

  it('a pre-order has no button', () => {
    expect(actions(13)).toEqual({})
  })

  it('an accepted or not-ready order is marked ready', () => {
    expect(actions(7)).toEqual({ advance: 'ready' })
    expect(actions(14, 2)).toEqual({ advance: 'ready' })
  })

  it('a ready order of a pickup type is picked up or not picked up', () => {
    for (const status of [4, 20, 21]) expect(actions(status, 2)).toEqual({ decline: 'not_picked_up', advance: 'picked_up' })
  })

  it('a ready order of a delivery type waits for the driver: no button', () => {
    expect(actions(4, 1)).toEqual({})
    expect(actions(21, 7)).toEqual({})
  })

  it('a reservation is marked arrived or not arrived from accepted on, and never marked ready', () => {
    expect(actions(7, 9)).toEqual({ decline: 'not_arrived', advance: 'arrived' })
    expect(actions(4, 9)).toEqual({ decline: 'not_arrived', advance: 'arrived' })
    expect(actions(14, 9)).toEqual({})
  })

  it('an order with a driver or a closed one has no button', () => {
    for (const status of [3, 8, 9, 22, 23, 1, 2, 17]) expect(actions(status, 2)).toEqual({})
  })

  describe('Assign driver', () => {
    const on = { configs: { assign_driver_enabled: { value: '1' } } }
    const withRule = (overrides: Record<string, any>, assign: any = on) => cardActionsFor(makeOrder(overrides), assign)

    it('a ready delivery order with no driver has Assign driver as its one button', () => {
      expect(withRule({ status: 4, delivery_type: 1 })).toEqual({ advance: 'assign_driver' })
      expect(withRule({ status: 4, delivery_type: 7 })).toEqual({ advance: 'assign_driver' })
    })

    it('an accepted delivery order with no driver keeps Mark ready and adds Assign driver as the secondary one', () => {
      expect(withRule({ status: 7, delivery_type: 1 })).toEqual({ advance: 'ready', secondary: 'assign_driver' })
    })

    it('goes with a driver, either as the id or as the embedded driver', () => {
      expect(withRule({ status: 4, driver_id: 12 })).toEqual({})
      expect(withRule({ status: 4, driver: { id: 12, name: 'Omar' } })).toEqual({})
      expect(withRule({ status: 7, driver_id: 12 })).toEqual({ advance: 'ready' })
      expect(withRule({ status: 7, driver_id: null, driver: null })).toEqual({ advance: 'ready', secondary: 'assign_driver' })
    })

    it('is not offered to another type or another status', () => {
      expect(withRule({ status: 4, delivery_type: 2 })).toEqual({ decline: 'not_picked_up', advance: 'picked_up' })
      expect(withRule({ status: 7, delivery_type: 2 })).toEqual({ advance: 'ready' })
      expect(withRule({ status: 7, delivery_type: 9 })).toEqual({ decline: 'not_arrived', advance: 'arrived' })
      expect(withRule({ status: 14, delivery_type: 1 })).toEqual({ advance: 'ready' })
      expect(withRule({ status: 0, delivery_type: 1 })).toEqual({ decline: 'reject', advance: 'accept' })
      expect(withRule({ status: 21, delivery_type: 1 })).toEqual({})
      expect(withRule({ status: 23, delivery_type: 1 })).toEqual({})
    })

    it('follows the details\' rule of the project and the user, and is never asked without it', () => {
      const ready = makeOrder({ status: 4, delivery_type: 1 })
      expect(cardActionsFor(ready)).toEqual({})
      expect(cardActionsFor(ready, { configs: {} })).toEqual({})
      expect(cardActionsFor(ready, { configs: { assign_driver_enabled: { value: '0' } } })).toEqual({})
      expect(cardActionsFor(ready, { configs: { assign_driver_enabled: { value: '1' }, store_app_manual_driver_assignment_enabled: { value: '0' } } })).toEqual({})
      expect(cardActionsFor(ready, { configs: { assign_driver_enabled: { value: '1' }, delivery_manager_manual_driver_assignment_enabled: { value: '0' } }, level: 5 })).toEqual({})
      expect(cardActionsFor(ready, { configs: { assign_driver_enabled: { value: '1' } }, level: 2 })).toEqual({ advance: 'assign_driver' })
    })
  })

  it('the steps set the statuses the details set and only the cancel-type ones ask first', () => {
    expect(STATUS_OF_STEP).toMatchObject({ ready: 4, picked_up: 15, arrived: 15, not_picked_up: 17, not_arrived: 17 })
    expect(stepNeedsConfirmation('not_picked_up')).toBe(true)
    expect(stepNeedsConfirmation('not_arrived')).toBe(true)
    expect(stepNeedsConfirmation('ready')).toBe(false)
    expect(stepNeedsConfirmation('picked_up')).toBe(false)
  })
})
