import React from 'react'

import { useLanguage } from '@components'
import { NotFoundSource } from '../NotFoundSource'

/** The chat pane of a landscape tablet before a conversation is chosen: the app's one empty state, centred in the pane. */
export const SelectConversation = () => {
  const [, t] = useLanguage()
  return (
    <NotFoundSource
      fill
      icon='chatbubbles-outline'
      content={t('SELECT_A_CONVERSATION', 'Select a conversation')}
      testID='select-conversation'
    />
  )
}
