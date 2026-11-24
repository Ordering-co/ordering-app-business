import { quickMessagesOf } from '../quickMessages'

const keys = (key: string, fallback: string) => fallback
const dictionary = (words: Record<string, string>) => (key: string, fallback: string) => words[key] ?? fallback

describe('quickMessagesOf', () => {
  it('has none when the project has no text for any: a key is not a message', () => {
    expect(quickMessagesOf(2, keys)).toEqual([])
    expect(quickMessagesOf(0, keys)).toEqual([])
    expect(quickMessagesOf(4, keys)).toEqual([])
  })

  it('has none for a level with no set', () => {
    expect(quickMessagesOf(3, dictionary({ STORE_MESSAGE_1: 'On it' }))).toEqual([])
    expect(quickMessagesOf(undefined, dictionary({ STORE_MESSAGE_1: 'On it' }))).toEqual([])
  })

  it('has the store\'s texts for level 2 and the administrator\'s for level 0', () => {
    const words = dictionary({ STORE_MESSAGE_2: 'Ready in 10 min', ADMIN_MESSAGE_1: 'We are checking' })
    expect(quickMessagesOf(2, words)).toEqual([{ key: 'store_message_2', text: 'Ready in 10 min' }])
    expect(quickMessagesOf(0, words)).toEqual([{ key: 'message_1', text: 'We are checking' }])
  })

  it('drops a key of any prefix and any language, as the catalog\'s machine translations are', () => {
    const words = dictionary({
      STORE_MESSAGE_1: 'tienda_message_1',
      STORE_MESSAGE_2: 'magasin_message_2',
      STORE_MESSAGE_3: 'STORE_MESSAGE_3',
      STORE_MESSAGE_4: '   ',
    })
    expect(quickMessagesOf(2, words)).toEqual([])
  })

  it('keeps a real text that merely mentions a message', () => {
    expect(quickMessagesOf(2, dictionary({ STORE_MESSAGE_1: 'We got your message' }))).toEqual([{ key: 'store_message_1', text: 'We got your message' }])
  })
})
