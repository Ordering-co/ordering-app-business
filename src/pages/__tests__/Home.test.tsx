import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import Home from '../Home'

describe('Home (the project step)', () => {
  it('renders the step and goes to the screen the step names', () => {
    const { getByTestId, navigation } = renderPage(Home)
    expect(getByTestId('home-page')).toBeTruthy()
    fireEvent.press(getByTestId('home-nav'))
    expect(navigation.navigate).toHaveBeenCalledWith('Login', undefined)
  })

  it('ignores an empty navigation redirect', () => {
    const { getByTestId, navigation } = renderPage(Home)
    fireEvent.press(getByTestId('home-nav-empty'))
    expect(navigation.navigate).not.toHaveBeenCalled()
  })
})
