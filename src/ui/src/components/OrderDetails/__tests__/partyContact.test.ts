import { businessContacts, customerCard, customerFullName, deliveryOptionName, distanceText, driverCall, storeToCustomerKilometers } from '../partyContact'

const t = (_key: string, fallback: string) => fallback
const order = {
  delivery_type: 1,
  customer: { name: 'Jane', middle_name: 'Q', lastname: 'Roe', cellphone: '5550100', phone: '5550101', email: 'jane@example.test', country_phone_code: '1', location: { lat: 4.7, lng: -74 } },
  business: { name: 'Luna', cellphone: '5550002', email: 'store@example.test', country_phone_code: '1', location: { lat: 4.6, lng: -74.1 } },
  delivery_option: { name: 'Leave at door' }
}

describe('the customer', () => {
  it('has a call link on the cellphone with its country code and keeps the other phone and the e-mail for More details', () => {
    const { call, links } = customerCard(order, false)
    expect(call?.url).toBe('tel:+15550100')
    expect(links.map((link) => link.url)).toEqual(['tel: +15550101'.replace(': ', ':').replace('+1', '+1 '), 'mailto:jane@example.test'].map((x) => x))
  })

  it('has nothing to call or write when the business hides the contact', () => {
    expect(customerCard(order, true)).toEqual({ call: undefined, links: [] })
    expect(customerFullName(order, true)).toBe('')
    expect(customerFullName(order)).toBe('Jane Q Roe')
  })

  it('dials "invalid" for a number that is not only digits', () => {
    expect(customerCard({ customer: { cellphone: '555-0100' } }, false).call?.url).toBe('tel:invalid')
  })

  it('names the delivery option of a delivery order only', () => {
    expect(deliveryOptionName(order, t)).toBe('Leave at door')
    expect(deliveryOptionName({ ...order, delivery_type: 2 }, t)).toBeNull()
  })
})

describe('the store and the driver', () => {
  it('has its e-mail and phones with the country code', () => {
    const contacts = businessContacts(order)
    expect(contacts.email?.url).toBe('mailto:store@example.test')
    expect(contacts.phones[0].text).toBe('+15550002')
  })
  it('has the driver call link (the contact flag is the customer\'s)', () => {
    expect(driverCall({ cellphone: '5550300', country_phone_code: '1' })?.url).toBe('tel:+15550300')
    expect(driverCall({})).toBeNull()
  })
  it('measures the distance between the store and the customer in the project unit', () => {
    const km = storeToCustomerKilometers(order)
    expect(km).toBeGreaterThan(10)
    expect(distanceText(10, 'mi', t)).toBe('6.22 mi')
    expect(distanceText(10, undefined, t)).toBe('10.00 km')
    expect(storeToCustomerKilometers({ business: {}, customer: {} })).toBeNull()
  })
})
