/**
 * What the orders search sends for a text the business typed.
 *
 * The orders controller (`OrderListGroups`, read-only) wraps the text in `%…%` for an `ilike` and, when the
 * app says it is not iOS, passes it through `encodeURI`, which turns each `%` into `%25` and encodes spaces
 * and accents: that is the path the app asks for (`SEARCH_ENCODES_PERCENT`), because the SDK writes the
 * `where` into the query string as it is, and on iOS a raw `%34` of "%3460%" is read by the server as the
 * character "4" ("460%" was what the API searched).
 *
 * `encodeURI` leaves `&`, `#` and `+` as they are, and in a query string they end the value (`&`, `#`) or
 * become a space (`+`). The text goes through the single character wildcard of `ilike` instead, so "a&b"
 * finds "a&b" and the request is whole.
 */
export const SEARCH_ENCODES_PERCENT = true

/** The typed text as the search sends it: trimmed, and with the characters a query string would cut as the one-character wildcard. */
export const searchTerm = (text: unknown): string =>
  typeof text === 'string' ? text.trim().replace(/[&#+]/g, '_') : ''

/** What the one search field means: which filter of the controller the text is sent as. */
export type SearchKind = 'id' | 'phone' | 'email' | 'name' | 'external_id'

export interface SearchField {
  kind: SearchKind
  /** The value for `kind`; for a `name`, the first names and the last name. */
  value: string
  name?: string
  lastname?: string
}

/**
 * The digits of a phone as the customer's `cellphone` holds them: the national number, no country code and no signs.
 * A longer typed number keeps its last ten digits (the country code is not in the field).
 */
const phoneDigits = (digits: string) => (digits.length > 10 ? digits.slice(-10) : digits)

const NAME_PATTERN = /^[\p{L}][\p{L}'’.\- ]*$/u

/**
 * Classifies the text of the one search field ("Order number, customer or phone"):
 * - an `@` is an e-mail;
 * - only digits, up to 8, an order number;
 * - a `+` or seven or more digits (with the spaces, dashes and brackets of a number) a phone, searched by its digits
 *   (the last ten when more are typed: the customer's `cellphone` has no country code);
 * - only letters (and the marks of a name) a customer's name, but only when the logic can search names
 *   (`supportsName`, the additive capability `supportsCustomerNameFilter`); otherwise it is an external id;
 * - anything else (letters and digits: "EXT-101") an external id.
 * An empty text is nothing.
 */
export const classifySearch = (text: string, supportsName: boolean): SearchField | null => {
  const typed = text.trim()
  if (!typed) return null
  if (typed.includes('@')) return { kind: 'email', value: typed }
  const digits = typed.replace(/\D/g, '')
  if (/^\d+$/.test(typed)) {
    return typed.length <= 8 ? { kind: 'id', value: typed } : { kind: 'phone', value: phoneDigits(digits) }
  }
  if (/^[+\d\s().-]+$/.test(typed) && (typed.startsWith('+') || digits.length >= 7)) {
    return { kind: 'phone', value: phoneDigits(digits) }
  }
  if (NAME_PATTERN.test(typed) && supportsName) {
    // "Ana Maria Lopez": the first names and the last one; a single word can only be a first name.
    const words = typed.split(/\s+/)
    return words.length > 1
      ? { kind: 'name', value: typed, name: words.slice(0, -1).join(' '), lastname: words[words.length - 1] }
      : { kind: 'name', value: typed, name: typed }
  }
  return { kind: 'external_id', value: typed }
}
