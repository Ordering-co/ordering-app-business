import React from 'react'
import { act, render } from '@testing-library/react-native'

// The suite's default mock of `@components` has no providers: the real ones are the point here.
const { ApiContext, LanguageProvider, useLanguage } = jest.requireActual('@components')
import { quickMessagesOf } from '../quickMessages'

/**
 * The quick replies of the chat are the project's dictionary texts (`STORE_MESSAGE_1..4`), read through the app's own
 * language context (the real `LanguageProvider`, with the dictionary the API would answer). A project with none draws no
 * row (the owner's decision: a key is not a message), and a real text, under either spelling of its key, is never hidden.
 */
const apiWith = (dictionary: Record<string, string>) => {
  const ordering: any = {
    language: 'en',
    project: 'development',
    translations: () => ordering,
    parameters: () => ordering,
    where: () => ordering,
    asDictionary: () => ordering,
    get: async () => ({ content: { error: false, result: dictionary } })
  }
  return [ordering, { setLanguage: jest.fn() }]
}

const strategy = { getItem: jest.fn(async () => ({ id: 1, code: 'en', rtl: false })), setItem: jest.fn() }

const quickRepliesOf = async (dictionary: Record<string, string>, level = 2) => {
  let replies: ReturnType<typeof quickMessagesOf> = []
  const Probe = () => {
    const [, t] = useLanguage()
    replies = quickMessagesOf(level, t)
    return null
  }
  render(
    <ApiContext.Provider value={apiWith(dictionary) as any}>
      <LanguageProvider settings={{}} strategy={strategy} restOfProps={{ app_internal_name: 'business_app' }}>
        <Probe />
      </LanguageProvider>
    </ApiContext.Provider>
  )
  await act(async () => {})
  return replies
}

describe('the quick replies, read through the language context', () => {
  it('has none when the project\'s dictionary has no text for them', async () => {
    expect(await quickRepliesOf({ LOG_IN: 'Log in' })).toEqual([])
  })

  it('has none when the dictionary only holds the keys themselves (what the project shipped: a key is not a message)', async () => {
    expect(await quickRepliesOf({ STORE_MESSAGE_1: 'store_message_1', STORE_MESSAGE_2: 'tienda_message_2', STORE_MESSAGE_3: '' })).toEqual([])
  })

  it('shows the real texts, under the plain key and under the app\'s prefixed key', async () => {
    const replies = await quickRepliesOf({ STORE_MESSAGE_1: 'On it', BUSINESS_APP_STORE_MESSAGE_2: 'Ready in 10 min', STORE_MESSAGE_3: 'store_message_3' })
    expect(replies).toEqual([
      { key: 'store_message_1', text: 'On it' },
      { key: 'store_message_2', text: 'Ready in 10 min' }
    ])
  })

  it('has the administrator\'s set for level 0', async () => {
    expect(await quickRepliesOf({ ADMIN_MESSAGE_1: 'We are checking', STORE_MESSAGE_1: 'On it' }, 0)).toEqual([{ key: 'message_1', text: 'We are checking' }])
  })
})
