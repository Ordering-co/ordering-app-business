import React from 'react'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import Splash from '../Splash'

describe('Splash', () => {
  it('renders splash inside safe area container', () => {
    const { getByTestId } = renderWithProviders(<Splash />)
    expect(getByTestId('safe-area-container')).toBeTruthy()
  })
})
