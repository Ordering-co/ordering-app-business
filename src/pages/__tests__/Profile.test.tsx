import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import Profile from '../Profile'

describe('Profile', () => {
  it('renders business user profile form', () => {
    const { getByTestId } = renderPage(Profile)
    expect(getByTestId('user-profile-form')).toBeTruthy()
    expect(getByTestId('user-profile-business').props.children).toBe('business')
    expect(getByTestId('safe-area-layout')).toBeTruthy()
  })

  it('goes back when navigation allows', () => {
    const { getByTestId, navigation } = renderPage(Profile)
    fireEvent.press(getByTestId('user-profile-go-back'))
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it('navigates via onNavigationRedirect', () => {
    const { getByTestId, navigation } = renderPage(Profile)
    fireEvent.press(getByTestId('user-profile-nav'))
    expect(navigation.navigate).toHaveBeenCalledWith('Sessions', {})
  })

  it('skips goBack when navigation cannot go back', () => {
    const { getByTestId, navigation } = renderPage(Profile, {
      navigation: { canGoBack: jest.fn(() => false) }
    })
    fireEvent.press(getByTestId('user-profile-go-back'))
    expect(navigation.goBack).not.toHaveBeenCalled()
  })
})
