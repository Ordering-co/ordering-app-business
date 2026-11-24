import { describeChange, isEmptyChangeValue } from '../changeEntries'

const t = (_key: string, fallback?: string) => fallback ?? _key
const entry = (change: any, extra: any = {}) => describeChange({ change, ...extra }, t)

describe('what a change of the order says in the thread', () => {
  it('words a status change with the name of the status it went to (the compact pill), not a sentence', () => {
    expect(entry({ attribute: 'status', old: 0, new: 7 })).toBe('Accepted by business')
    expect(entry({ attribute: 'status', old: '8', new: '18' })).toBe('Driver almost at the store')
    expect(entry({ attribute: 'status', old: undefined, new: 1 })).toBe('Order completed')
  })

  it('words the minutes of a preparation or a delivery, and a logistic status', () => {
    expect(entry({ attribute: 'delivered_in', old: 10, new: 20 })).toBe('Delivery time changed to 20 min')
    expect(entry({ attribute: 'prepared_in', old: null, new: 15 })).toBe('Preparation time changed to 15 min')
    expect(entry({ attribute: 'prepared_in', old: 20, new: 30 })).toBe('Preparation time changed to 30 min')
    expect(entry({ attribute: 'logistic_status', old: 0, new: 2 })).toBe('Logistic status changed to In queue')
    expect(entry({ attribute: 'delivery_datetime', old: '2026-11-19 10:00:00', new: '2026-11-19 10:30:00' })).toBe('Delivery time changed')
  })

  describe('the entries a device pass showed with raw placeholders', () => {
    it('"Changed from undefined to undefined" has nothing to say: no entry', () => {
      expect(entry({ attribute: 'status', old: undefined, new: undefined })).toBeUndefined()
      expect(entry({ attribute: 'reject_reason', old: undefined, new: undefined })).toBeUndefined()
    })

    it('says why an order was rejected in words, and says nothing when the reason is taken back', () => {
      expect(entry({ attribute: 'reject_reason', old: false, new: 'Out of stock' })).toBe('Rejected: Out of stock')
      expect(entry({ attribute: 'reject_reason', old: false, new: 'very_far_away' })).toBe('Rejected: Very far away')
      expect(entry({ attribute: 'reject_reason', old: 'a', new: 'cost $& more' })).toBe('Rejected: cost $& more')
      expect(entry({ attribute: 'reject_reason', old: 'Out of stock', new: undefined })).toBeUndefined()
      expect(entry({ attribute: 'reject_reason', old: false, new: undefined })).toBeUndefined()
    })

    it('leaves out the fields nobody at the counter needs: the driver group, the manual assignment, the position, the external id', () => {
      expect(entry({ attribute: 'driver_group_id', old: 1, new: 2 })).toBeUndefined()
      expect(entry({ attribute: 'driver_group_id', old: null, new: 1 })).toBeUndefined()
      expect(entry({ attribute: 'manual_driver_assignment_author_id', old: null, new: 1 })).toBeUndefined()
      expect(entry({ attribute: 'manual_driver_assignment_comment', old: null, new: 'Necesita ayuda' })).toBeUndefined()
      expect(entry({ attribute: 'delivery_position', old: false, new: 1 })).toBeUndefined()
      expect(entry({ attribute: 'external_id', old: null, new: 'EXT-9' })).toBeUndefined()
    })
  })

  it('never prints "undefined", "null" or "false" as a value, whatever the attribute', () => {
    for (const attribute of ['status', 'logistic_status', 'delivery_position', 'reject_reason', 'external_id', 'driver_group_id', 'delivered_in', 'prepared_in']) {
      for (const [old, next] of [[undefined, 7], [3, undefined], [false, 1], [null, 2], ['undefined', 4], [5, 'null']]) {
        const text = entry({ attribute, old, new: next })
        if (text) expect(text).not.toMatch(/undefined|null|false/i)
      }
    }
  })

  it('leaves out an attribute the app has no words for, instead of showing it raw', () => {
    expect(entry({ attribute: 'delivery_pin_status', old: undefined, new: undefined })).toBeUndefined()
    expect(entry({ attribute: 'delivery_pin_status', old: 'requested', new: 'validated' })).toBeUndefined()
    expect(entry({ attribute: 'distance', old: 'far', new: 'near' })).toBeUndefined()
    expect(entry({ attribute: 'summary.refunded', old: 0, new: 10.71 })).toBeUndefined()
    expect(entry({})).toBeUndefined()
    expect(describeChange({}, t)).toBeUndefined()
  })

  it('leaves out a status the app has no name for', () => {
    expect(entry({ attribute: 'status', old: 0, new: 99 })).toBeUndefined()
  })

  it('words the assignment of a driver and its end', () => {
    // The comment's length ("... driver 4") was a leftover of the old thread: it is not written.
    expect(entry({ attribute: 'driver_id', old: null, new: 7 }, { driver: { name: 'Ana', lastname: 'Pérez' }, comment: 'abcd' }))
      .toBe('Ana Pérez Was assigned as driver')
    expect(entry({ attribute: 'driver_id', old: 13217, new: null })).toBe('Driver unassigned')
    expect(entry({ attribute: 'driver_id', old: 13217, new: undefined })).toBe('Driver unassigned')
    expect(entry({ attribute: 'driver_id', old: null, new: 7 }, { driver: { name: 'Ana', lastname: null } })).toBe('Ana Was assigned as driver')
  })

  it('knows what no value is', () => {
    for (const none of [undefined, null, false, '', '  ', 'undefined', 'null', 'false', []]) expect(isEmptyChangeValue(none)).toBe(true)
    for (const some of [0, '0', 'x', true, 1]) expect(isEmptyChangeValue(some)).toBe(false)
  })
})
