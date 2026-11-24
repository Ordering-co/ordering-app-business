import { calculateDistance, transformDistance } from '../../utils'

/**
 * What the details say of the two parties of an order, the store and the customer, and the rules for it: which
 * contact links exist, how a number is written into a `tel:` link, the
 * customer's name and the distance between them. The customer's contact (name, e-mail, phones) is hidden when the
 * server's `hide_customer_contact_business_app` is on: that rule is the `hidden` argument, never a theme key.
 */

export interface ContactLink {
  key: string
  /** `mailto:` or `tel:` (a number that is not only digits dials `invalid`: opening it says so). */
  url: string
  /** What the link says. */
  text: string
}

export const containsOnlyNumbers = (value?: string) => /^\d+$/.test(String(value ?? '').replace('+', ''))

export interface PartyContacts {
  email: ContactLink | null
  /** The cellphone, then the phone: each only when the party has it. */
  phones: ContactLink[]
}

const NO_CONTACTS: PartyContacts = { email: null, phones: [] }

/** The store's contacts. */
export const businessContacts = (order: any): PartyContacts => {
  const business = order?.business
  const phone = (key: 'cellphone' | 'phone'): ContactLink | null => {
    const number = business?.[key]
    if (!number) return null
    return {
      key,
      url: `tel:${containsOnlyNumbers(number) ? number : 'invalid'}`,
      text: `${(!!business?.country_phone_code && !number.includes('+')) ? '+' + business.country_phone_code : ''}${number}`
    }
  }
  return {
    email: business?.email ? { key: 'email', url: `mailto:${business.email}`, text: business.email } : null,
    phones: [phone('cellphone'), phone('phone')].filter((link): link is ContactLink => !!link)
  }
}

/** The customer's contacts; none when the business hides them. */
export const customerContacts = (order: any, hidden: boolean): PartyContacts => {
  if (hidden) return NO_CONTACTS
  const customer = order?.customer
  const code = customer?.country_phone_code ? '+' + customer.country_phone_code : ''
  const phone = (key: 'cellphone' | 'phone'): ContactLink | null => {
    const number = customer?.[key]
    if (!number) return null
    return {
      key,
      // The phone's link keeps the space after the country code it has always had.
      url: `tel:${code}${key === 'phone' ? ' ' : ''}${containsOnlyNumbers(number) ? number : 'invalid'}`,
      text: `${code}${number}`
    }
  }
  return {
    email: customer?.email ? { key: 'email', url: `mailto:${customer.email}`, text: customer.email } : null,
    phones: [phone('cellphone'), phone('phone')].filter((link): link is ContactLink => !!link)
  }
}

/**
 * What the customer's card does with the customer's contacts: the first phone is the Call button's, and the other
 * phone and the e-mail are links "More details" keeps, so no contact is lost.
 */
export const customerCard = (order: any, hidden: boolean): { call?: ContactLink, links: ContactLink[] } => {
  const contacts = customerContacts(order, hidden)
  const [call, ...otherPhones] = contacts.phones
  return { call, links: [...otherPhones, ...(contacts.email ? [contacts.email] : [])] }
}

/** The driver's phone (the driver is not the customer: the flag does not hide it). */
export const driverCall = (driver: any): ContactLink | null => {
  const number = driver?.cellphone
  if (!number) return null
  const code = driver?.country_phone_code && !String(number).includes('+') ? '+' + driver.country_phone_code : ''
  return { key: 'cellphone', url: `tel:${containsOnlyNumbers(number) ? `${code}${number}` : 'invalid'}`, text: `${code}${number}` }
}

/**
 * The customer's name as the details have always written it: name, middle name, last name, second last name
 * (each after the first one with a space before it, so an order with no name starts with a space: trim it where it
 * matters). Empty when the business hides the customer's contact.
 */
export const customerFullName = (order: any, hidden = false): string => {
  if (hidden) return ''
  const customer = order?.customer
  return `${customer?.name ? customer.name : ''}`
    + `${customer?.middle_name ? ' ' + customer.middle_name : ''}`
    + `${customer?.lastname ? ' ' + customer.lastname : ''}`
    + `${customer?.second_lastname ? ' ' + customer.second_lastname : ''}`
}

/** The delivery option of a delivery order (leave at the door…), translated; null for any other order. */
export const deliveryOptionName = (order: any, t: (key: string, fallback?: string) => string): string | null =>
  order?.delivery_option && [1, 7].includes(order?.delivery_type)
    ? t(order.delivery_option?.name?.toUpperCase?.()?.replace(/ /g, '_'), order.delivery_option?.name)
    : null

/** A distance in kilometers as the project writes it: its unit's number and name ("3.40 km", "2.11 mi"). */
export const distanceText = (kilometers: number, distanceUnit: string | undefined, t: (key: string, fallback?: string) => string) => {
  const unit = distanceUnit || 'km'
  return `${transformDistance(kilometers, unit)} ${t(unit.toUpperCase(), unit)}`
}

/** The distance between the store and the customer, in kilometers; null when either has no location. */
export const storeToCustomerKilometers = (order: any): number | null =>
  order?.business?.location?.lat != null && order?.customer?.location?.lat != null
    ? calculateDistance(order.business.location, { latitude: order.customer.location.lat, longitude: order.customer.location.lng })
    : null
