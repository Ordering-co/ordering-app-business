import { getTraduction as baseTraduction } from './index'

/** The entities an API message carries, by name (the API words some of its texts with HTML entities). */
const HTML_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  iexcl: '¡', iquest: '¿', ntilde: 'ñ', Ntilde: 'Ñ', ccedil: 'ç', Ccedil: 'Ç', szlig: 'ß', euro: '€',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò', ugrave: 'ù', Agrave: 'À', Egrave: 'È', Igrave: 'Ì', Ograve: 'Ò', Ugrave: 'Ù',
  acirc: 'â', ecirc: 'ê', icirc: 'î', ocirc: 'ô', ucirc: 'û', Acirc: 'Â', Ecirc: 'Ê', Icirc: 'Î', Ocirc: 'Ô', Ucirc: 'Û',
  auml: 'ä', euml: 'ë', iuml: 'ï', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Euml: 'Ë', Iuml: 'Ï', Ouml: 'Ö', Uuml: 'Ü',
  atilde: 'ã', otilde: 'õ', Atilde: 'Ã', Otilde: 'Õ', aring: 'å', Aring: 'Å', aelig: 'æ', AElig: 'Æ', oslash: 'ø', Oslash: 'Ø',
  ordf: 'ª', ordm: 'º', deg: '°', copy: '©', reg: '®', laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
}

/**
 * A text with its HTML entities decoded, named ("&ntilde;", "&amp;") and numeric ("&#243;", "&#xF3;"): API
 * messages can carry them and the app draws plain text. An entity it does not know stays as it came and a
 * text with none is returned as it is. One pass, so "&amp;ntilde;" is "&ntilde;", never "ñ".
 * @param {string} text the message
 */
export const decodeHtmlEntities = (text: string): string => {
  if (typeof text !== 'string' || !text.includes('&')) return text
  return text.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,8}));/g, (whole, dec, hex, name) => {
    if (name) return HTML_ENTITIES[name] ?? whole
    const code = dec ? parseInt(dec, 10) : parseInt(hex, 16)
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
  })
}

/**
 * The text of an API message or a translation key, decoded of its HTML entities (the API words some of its
 * texts with them and the app draws plain text). Every message the app shows goes through this
 * (the toast, the dialogs, `apiErrorText`).
 * @param {string} key for traduction
 */
export const getTraduction = (key: string, t: any) => {
  const text = baseTraduction(key, t)
  return typeof text === 'string' ? decodeHtmlEntities(text) : text
}

/**
 * The first message of what an API answer or a controller's state holds: a text, `{ message }`, or a list of them.
 * Empty when there is none; "undefined" and "null" are not messages.
 * @param {any} source the message, a list of them or nothing
 */
export const messageText = (source: any): string => {
  const first = Array.isArray(source) ? source[0] : source
  const message = typeof first === 'string' ? first : first?.message
  if (typeof message !== 'string') return ''
  const text = message.trim()
  return text === 'undefined' || text === 'null' ? '' : text
}

/**
 * The text of an API error to show the business: the first message of an error list (a string, or
 * `{ message }`), written by `getTraduction` and never as a raw code ("ERROR_ORDER_FIND"); the
 * network error when there is none.
 * @param {any} error the error of a controller's state: a message, a list of them, or nothing
 * @param {function} t the language function
 */
export const apiErrorText = (error: any, t: any): string => {
  const message = messageText(error)
  if (!message) return t('NETWORK_ERROR', 'Network Error')
  // Codes the app words itself (the project's own translations have no entry for them).
  const worded: Record<string, string> = {
    ERROR_ORDER_FIND: t('ERROR_ORDER_FIND', 'Order not found'),
  }
  return worded[message] ?? getTraduction(message, t)
}
