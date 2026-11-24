import dayjs from 'dayjs'

import {
  acceptedAtOf, apiErrorText, canAdjustTime, canAssignDriver, canMessageCustomer, canReviewCustomer, customerCallUrl,
  hasMapCoordinates, orderNumberOf
} from '../rules'

const enabled = { assign_driver_enabled: { value: '1' } }

describe('canAssignDriver', () => {
  it.each([[7], [4]])('is on for status %s of a delivery order when the project allows it', (status) => {
    expect(canAssignDriver({ status, delivery_type: 1 }, enabled, 0)).toBe(true)
    expect(canAssignDriver({ status, delivery_type: 7 }, enabled, 2)).toBe(true)
  })

  it.each([[0], [3], [9], [14], [20]])('is off for status %s', (status) => {
    expect(canAssignDriver({ status, delivery_type: 1 }, enabled, 0)).toBe(false)
  })

  it('is off for a pickup, an eat-in or a reservation', () => {
    expect(canAssignDriver({ status: 7, delivery_type: 2 }, enabled, 0)).toBe(false)
    expect(canAssignDriver({ status: 7, delivery_type: 9 }, enabled, 0)).toBe(false)
  })

  it('follows the configs', () => {
    expect(canAssignDriver({ status: 7, delivery_type: 1 }, {}, 0)).toBe(false)
    expect(canAssignDriver({ status: 7, delivery_type: 1 }, { ...enabled, store_app_manual_driver_assignment_enabled: { value: '0' } }, 0)).toBe(false)
  })
})

describe('canReviewCustomer', () => {
  it.each([[1], [2], [5], [6], [10], [11], [12], [15], [16], [17]])('is on for the ended status %s', (status) => {
    expect(canReviewCustomer({ status, customer_id: 1 })).toBe(true)
  })

  it.each([[0], [4], [7], [9], [13]])('is off while the order is open (%s)', (status) => {
    expect(canReviewCustomer({ status, customer_id: 1 })).toBe(false)
  })

  it('is off when the customer was reviewed or the order has none', () => {
    expect(canReviewCustomer({ status: 1, customer_id: 1, user_review: { id: 3 } })).toBe(false)
    expect(canReviewCustomer({ status: 1 })).toBe(false)
  })
})

describe('the other rules', () => {
  it('adjusts the time of an accepted order only', () => {
    expect(canAdjustTime({ status: 7 })).toBe(true)
    expect(canAdjustTime({ status: 14 })).toBe(true)
    expect(canAdjustTime({ status: 0 })).toBe(false)
    expect(canAdjustTime({ status: 4 })).toBe(false)
  })

  it('messages the customer while the chat is open and the contact is not hidden', () => {
    expect(canMessageCustomer({ status: 7 }, {})).toBe(true)
    expect(canMessageCustomer({ status: 1 }, {})).toBe(false)
    expect(canMessageCustomer({ status: 7 }, { hide_customer_contact_business_app: { value: '1' } })).toBe(false)
  })

  it('dials the customer as the order details did, and not when the contact is hidden', () => {
    const order = { customer: { cellphone: '4155550199', country_phone_code: '1' } }
    expect(customerCallUrl(order, {})).toBe('tel:+14155550199')
    expect(customerCallUrl({ customer: { cellphone: '4155550199' } }, {})).toBe('tel:4155550199')
    expect(customerCallUrl({ customer: { cellphone: 'abc' } }, {})).toBeNull()
    expect(customerCallUrl({ customer: {} }, {})).toBeNull()
    expect(customerCallUrl(order, { hide_customer_contact_business_app: { value: '1' } })).toBeNull()
  })

  it('writes the order number, the external id when change_order_id is on', () => {
    expect(orderNumberOf({ id: 5, external_id: 'X9' }, {})).toBe('5')
    expect(orderNumberOf({ id: 5, external_id: 'X9' }, { change_order_id: { value: '1' } })).toBe('X9')
    // The one source: the details' mask (harmony H5).
    for (const configs of [{}, { change_order_id: { value: '1' } }] as any[]) {
      for (const order of [{ id: 5, external_id: 'X9' }, { id: 6 }, {}]) expect(orderNumberOf(order, configs)).toBe(require('../../OrderDetails/orderData').orderNumber(order, configs))
    }
    expect(orderNumberOf({ id: 5 }, { change_order_id: { value: '1' } })).toBe('5')
  })

  it('knows whether the map has anything to draw', () => {
    expect(hasMapCoordinates({})).toBe(false)
    expect(hasMapCoordinates({ business: { location: { lat: 0, lng: 0 } } })).toBe(true)
    expect(hasMapCoordinates({ customer: { location: { lat: '', lng: '' } } })).toBe(false)
  })

  it('words an API error: a text, the first of a list, a message, or the plain one', () => {
    const t = (_key: string, text: string) => text
    expect(apiErrorText('Nope', t)).toBe('Nope')
    expect(apiErrorText(['First', 'Second'], t)).toBe('First')
    expect(apiErrorText({ message: 'Boom' }, t)).toBe('Boom')
    expect(apiErrorText(undefined, t)).toBe('The change was not saved. Try again.')
  })

  it('reads when the order was accepted from its history, the last change to 7, in the business time zone', () => {
    const history = [
      { created_at: '2026-11-19 12:00:00', data: [{ attribute: 'status', old: 0, new: 7 }] },
      { created_at: '2026-11-19 12:10:00', data: [{ attribute: 'status', old: 7, new: 14 }] },
      { created_at: '2026-11-19 12:20:00', data: [{ attribute: 'status', old: 14, new: 7 }] }
    ]
    // The business is UTC-5: its 12:20 is 17:20 UTC, and the order's `updated_at` (UTC) says so.
    const moment = acceptedAtOf({ status: 7, history, updated_at: '2026-11-19 17:20:40' })
    expect(moment?.valueOf()).toBe(Date.UTC(2026, 10, 19, 17, 20))
    expect(dayjs.isDayjs(moment)).toBe(true)
    expect(moment?.isValid()).toBe(true)
  })

  it('answers null, never an invalid date, when nothing says when', () => {
    expect(acceptedAtOf({})).toBeNull()
    expect(acceptedAtOf({ history: 'garbage', updated_at: 'nope' })).toBeNull()
    expect(acceptedAtOf({ status: 7, history: [{ created_at: 'x', data: [] }] })).toBeNull()
    expect(acceptedAtOf({}, 'not a date')).toBeNull()
  })

  it('takes the moment the caller gave when it is a date', () => {
    expect(acceptedAtOf({}, '2026-11-19T09:05:00')?.format('HH:mm')).toBe('09:05')
  })
})
