import { apiErrorText, decodeHtmlEntities, getTraduction, messageText } from '../errorText'

const t = (key: string, fallback: string) => fallback

describe('messageText', () => {
  it('is the first message of a text, an error object or a list of them', () => {
    expect(messageText('Invalid code')).toBe('Invalid code')
    expect(messageText({ message: 'Nope' })).toBe('Nope')
    expect(messageText([{ message: 'First' }, 'Second'])).toBe('First')
  })

  it('is empty when there is none, and "undefined" and "null" are not messages', () => {
    for (const source of [undefined, null, '', [], {}, 'undefined', ' null ', 42]) expect(messageText(source)).toBe('')
  })
})

describe('decodeHtmlEntities', () => {
  it('decodes named and numeric entities, once, and leaves what it does not know', () => {
    expect(decodeHtmlEntities('contrase&ntilde;a &amp; usuario')).toBe('contraseña & usuario')
    expect(decodeHtmlEntities('&#243; &#xF3;')).toBe('ó ó')
    expect(decodeHtmlEntities('&amp;ntilde;')).toBe('&ntilde;')
    expect(decodeHtmlEntities('&unknownthing;')).toBe('&unknownthing;')
    expect(decodeHtmlEntities('plain')).toBe('plain')
  })
})

describe('apiErrorText', () => {
  it('words a known error code, never as a raw code', () => {
    expect(apiErrorText(['ERROR_ORDER_FIND'], t)).toBe('Order not found')
    expect(apiErrorText(['YOU_DO_NOT_HAVE_PERMISSION'], t)).toBe('You do not have permission')
  })

  it('is the network error when there is no message', () => {
    expect(apiErrorText(undefined, t)).toBe('Network Error')
    expect(apiErrorText([], t)).toBe('Network Error')
  })

  it('decodes the entities of a message', () => {
    expect(getTraduction('Correo o contrase&ntilde;a incorrectos.', t)).toBe('Correo o contraseña incorrectos.')
  })
})
