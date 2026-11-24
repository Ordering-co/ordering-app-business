import { isCustomerContactHidden } from '../contactVisibility'

describe('contactVisibility', () => {
  it('hides customer contact only when the business app switch is 1', () => {
    expect(isCustomerContactHidden(undefined)).toBe(false)
    expect(isCustomerContactHidden({})).toBe(false)
    expect(isCustomerContactHidden({ hide_customer_contact_business_app: { value: '0' } })).toBe(false)
    expect(isCustomerContactHidden({ hide_customer_contact_business_app: { value: '1' } })).toBe(true)
    expect(isCustomerContactHidden({ hide_business_contact_customer_app: { value: '1' } })).toBe(false)
  })
})
