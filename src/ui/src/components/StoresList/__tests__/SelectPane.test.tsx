import React from 'react'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/businessSharedTestSetup')
import { SelectStore } from '../SelectStore'
import { SelectConversation } from '../../OrderMessage/SelectConversation'

setupSharedComponentHooks()

/** The second pane of a landscape tablet before something is chosen is the app's one empty state (TAB-C7), never a blank pane. */
describe('the second pane with nothing chosen', () => {
  it('Stores: the empty state with its icon and "Select a store"', () => {
    const { getByTestId, getByText } = renderWithProviders(<SelectStore />, { platform: 'tablet' })
    expect(getByTestId('select-a-store')).toBeTruthy()
    expect(getByTestId('not-found-icon', { includeHiddenElements: true })).toBeTruthy()
    expect(getByText('Select a store')).toBeTruthy()
  })

  it('Messages: the same empty state with "Select a conversation"', () => {
    const { getByTestId, getByText } = renderWithProviders(<SelectConversation />, { platform: 'tablet' })
    expect(getByTestId('select-conversation')).toBeTruthy()
    expect(getByTestId('not-found-icon', { includeHiddenElements: true })).toBeTruthy()
    expect(getByText('Select a conversation')).toBeTruthy()
  })
})
