import { shouldPostDriverLocationOnNotification } from '../shouldPostDriverLocationOnNotification'

describe('shouldPostDriverLocationOnNotification', () => {
  it('does not post merchant GPS when the business app sees a driver on the order', () => {
    expect(shouldPostDriverLocationOnNotification({
      isBusinessApp: true,
      driver: { id: 5 }
    })).toBe(false)
  })

  it('posts location in the driver app when the order has a driver', () => {
    expect(shouldPostDriverLocationOnNotification({
      isBusinessApp: false,
      driver: { id: 5 }
    })).toBe(true)
  })

  it('does not post location when the payload has no driver', () => {
    expect(shouldPostDriverLocationOnNotification({
      isBusinessApp: false,
      driver: null
    })).toBe(false)
  })
})
