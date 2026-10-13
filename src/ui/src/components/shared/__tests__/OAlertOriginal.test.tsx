import React from 'react'
import { Alert } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/businessSharedTestSetup')
import OAlertOriginal from '../OAlertOriginal'

setupSharedComponentHooks()

describe('OAlertOriginal', () => {
  it('shows alert when open', () => {
    renderWithProviders(
      <OAlertOriginal
        open
        title="Confirm"
        content={['INTERNAL_ERROR']}
        onClose={jest.fn()}
        onAccept={jest.fn()}
      />
    )
    expect(Alert.alert).toHaveBeenCalled()
  })
})
