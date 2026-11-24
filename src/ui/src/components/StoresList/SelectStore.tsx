import React from 'react'

import { useLanguage } from '@components'
import { NotFoundSource } from '../NotFoundSource'

/** The menu pane of a landscape tablet before a store is chosen: the app's one empty state, as the chat pane's. */
export const SelectStore = () => {
  const [, t] = useLanguage()
  return (
    <NotFoundSource
      fill
      icon='storefront-outline'
      content={t('SELECT_A_STORE', 'Select a store')}
      testID='select-a-store'
    />
  )
}
