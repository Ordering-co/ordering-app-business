import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { _setStoreData } from '@ui'
import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

jest.mock('react-native-app-intro-slider', () =>
  require('../../../jest/mocks/appIntroSlider')
)

import IntroductoryTutorial from '../IntroductoryTutorial'

describe('IntroductoryTutorial', () => {
  it('renders slides and completes tutorial', () => {
    const setTutorial = jest.fn()
    const { getByTestId, getByText } = renderPage(IntroductoryTutorial, {
      route: { params: { setTutorial } }
    })
    expect(getByTestId('intro-slider')).toBeTruthy()
    expect(getByText('Receive orders')).toBeTruthy()
    fireEvent.press(getByTestId('intro-done'))
    expect(_setStoreData).toHaveBeenCalledWith('isTutorial', false)
    expect(setTutorial).toHaveBeenCalledWith(false)
  })

  it('handles slide change', () => {
    const { getByTestId } = renderPage(IntroductoryTutorial, {
      route: { params: { setTutorial: jest.fn() } }
    })
    fireEvent.press(getByTestId('intro-slide-change'))
    expect(getByTestId('intro-slider')).toBeTruthy()
  })
})
