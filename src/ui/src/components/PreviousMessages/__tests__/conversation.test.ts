import { customerNameOf, customerPhoneOf, ENDED_STATUSES, isEnded, lastIncomingRole, orderTypeLabel, unreadOf } from '../conversation'

const t = (_key: string, fallback: string) => fallback
const hidden = { hide_customer_contact_business_app: { value: '1' } }

describe('conversation helpers', () => {
  describe('unreadOf', () => {
    it('is the direct count, never the order\'s full one, when the API gave it', () => {
      expect(unreadOf({ unread_direct_count: 2, unread_count: 9 })).toBe(2)
      expect(unreadOf({ unread_direct_count: 0, unread_count: 9 })).toBe(0)
    })
    it('falls back to the full count, and counts nothing for what is not a number', () => {
      expect(unreadOf({ unread_count: 4 })).toBe(4)
      expect(unreadOf({ unread_direct_count: '3' })).toBe(3)
      expect(unreadOf({ unread_count: null })).toBe(0)
      expect(unreadOf({ unread_direct_count: -1 })).toBe(0)
      expect(unreadOf(undefined)).toBe(0)
    })
  })

  describe('isEnded', () => {
    it('is the statuses a chat can no longer be written in', () => {
      expect(ENDED_STATUSES).toEqual([1, 2, 5, 6, 10, 11, 12, 15, 16, 17])
      expect(isEnded({ status: 1 })).toBe(true)
      expect(isEnded({ status: '16' })).toBe(true)
      expect(isEnded({ status: 0 })).toBe(false)
      expect(isEnded({ status: 4 })).toBe(false)
      expect(isEnded(undefined)).toBe(false)
    })
  })

  describe('orderTypeLabel', () => {
    it('names the type, and a type it does not know is a delivery', () => {
      expect(orderTypeLabel(t, 1)).toBe('Delivery')
      expect(orderTypeLabel(t, 2)).toBe('Pickup')
      expect(orderTypeLabel(t, 3)).toBe('Eat in')
      expect(orderTypeLabel(t, 4)).toBe('Curbside')
      expect(orderTypeLabel(t, 5)).toBe('Driver thru')
      expect(orderTypeLabel(t, 99)).toBe('Delivery')
      expect(orderTypeLabel(t, undefined)).toBe('Delivery')
    })
  })

  describe('the customer', () => {
    const order = { customer: { name: 'James', lastname: 'Carter', cellphone: '555', phone: '777' } }
    it('is named by name and last name', () => {
      expect(customerNameOf(order, {}, t)).toBe('James Carter')
      expect(customerNameOf({ customer: { name: 'James' } }, {}, t)).toBe('James')
    })
    it('is the word "Customer" with no name, or when the project hides the contact', () => {
      expect(customerNameOf({ customer: {} }, {}, t)).toBe('Customer')
      expect(customerNameOf({}, {}, t)).toBe('Customer')
      expect(customerNameOf(order, hidden, t)).toBe('Customer')
    })
    it('is called on the cellphone, else the phone, and never when the contact is hidden', () => {
      expect(customerPhoneOf(order, {})).toBe('555')
      expect(customerPhoneOf({ customer: { phone: '777' } }, {})).toBe('777')
      expect(customerPhoneOf({ customer: {} }, {})).toBe('')
      expect(customerPhoneOf(order, hidden)).toBe('')
    })
  })

  describe('lastIncomingRole', () => {
    const wrote = (level: number, id = 5) => ({ last_message: { author: { id, level } } })
    it('is a driver or the store\'s side when they wrote last, never the customer', () => {
      expect(lastIncomingRole(wrote(4))).toBe('driver')
      expect(lastIncomingRole(wrote(0))).toBe('business')
      expect(lastIncomingRole(wrote(2))).toBe('business')
      expect(lastIncomingRole(wrote(3))).toBeNull()
    })
    it('is nothing for my own message, and for an order that says nothing of its last message', () => {
      expect(lastIncomingRole(wrote(4, 7), 7)).toBeNull()
      expect(lastIncomingRole({})).toBeNull()
      expect(lastIncomingRole({ last_message: {} })).toBeNull()
    })
    it('reads a flat level too', () => {
      expect(lastIncomingRole({ last_message: { author_level: 4 } })).toBe('driver')
    })
  })
})
