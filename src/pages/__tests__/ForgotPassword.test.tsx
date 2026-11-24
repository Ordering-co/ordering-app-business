import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => {
  const React = require('react')
  const { View, TouchableOpacity } = require('react-native')
  return {
    ForgotPasswordForm: (props: any) => (
      <View testID='forgot-password-form'>
        <TouchableOpacity testID='forgot-back' onPress={() => props.navigation?.goBack?.()} />
      </View>
    )
  }
})

import ForgotPassword from '../ForgotPassword'

describe('ForgotPassword', () => {
  it('renders the form, which lays its own screen (the page wraps nothing around it)', () => {
    const { getByTestId, queryByTestId } = renderPage(ForgotPassword)
    expect(getByTestId('forgot-password-form')).toBeTruthy()
    expect(queryByTestId('container')).toBeNull()
  })

  it('gives the form the navigation, so it goes back', () => {
    const { getByTestId, navigation } = renderPage(ForgotPassword)
    fireEvent.press(getByTestId('forgot-back'))
    expect(navigation.goBack).toHaveBeenCalled()
  })
})
