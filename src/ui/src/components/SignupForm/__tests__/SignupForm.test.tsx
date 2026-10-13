import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { useToast } from '@components'

jest.mock('react-native-loading-spinner-overlay', () => {
  const { View } = require('react-native')
  return (props: any) => <View testID="spinner-overlay" {...props} />
})

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react')
  const { Pressable, Text } = require('react-native')
  return (props: any) =>
    React.createElement(
      Pressable,
      { testID: `mci-${props.name}`, onPress: props.onPress },
      React.createElement(Text, null, props.name)
    )
})

jest.mock('@ui', () => {
  const { buildB2AuthUiMock } = require('../../../../../../jest/helpers/b2AuthUiMock')
  return buildB2AuthUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  const { signupFormDefaults } = require('../../../../../../jest/helpers/b2AuthDefaults')
  return {
    ...mockOrdering,
    SignupForm: renderUiController(signupFormDefaults)
  }
})

import { SignupForm } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('SignupForm', () => {
  it('renders signup fields', () => {
    const { getByPlaceholderText, getAllByText } = renderWithProviders(<SignupForm />)
    expect(getByPlaceholderText('Email')).toBeTruthy()
    expect(getByPlaceholderText('Name')).toBeTruthy()
    expect(getByPlaceholderText('Password')).toBeTruthy()
    expect(getAllByText('Sign Up').length).toBeGreaterThan(0)
  })

  it('shows loading spinner while submitting', () => {
    const { getByTestId } = renderWithProviders(
      <SignupForm formState={{ loading: true, result: { result: null, error: false } }} />
    )
    expect(getByTestId('spinner-overlay')).toBeTruthy()
  })

  it('renders verify code button for cellphone signup', () => {
    const { getByText } = renderWithProviders(<SignupForm useSignupByCellphone />)
    expect(getByText('Get Verify Code')).toBeTruthy()
  })

  it('renders phone field when cellphone validation is enabled', () => {
    const { getByTestId } = renderWithProviders(
      <SignupForm
        validationFields={{
          loading: false,
          fields: {
            checkout: {
              email: { code: 'email', enabled: true, required: true, name: 'Email' },
              name: { code: 'name', enabled: true, required: true, name: 'Name' },
              password: { code: 'password', enabled: true, required: true, name: 'Password' },
              cellphone: { code: 'cellphone', enabled: true, required: true, name: 'Phone' }
            }
          }
        }}
      />
    )
    expect(getByTestId('phone-input-stub')).toBeTruthy()
  })

  it('shows toast when verify phone returns an error', () => {
    const showToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
    renderWithProviders(
      <SignupForm
        verifyPhoneState={{
          loading: false,
          result: { error: true, result: ['Invalid phone'] }
        }}
      />
    )
    expect(showToast).toHaveBeenCalled()
  })

  it('opens verify phone modal after successful code send', () => {
    const { getByText } = renderWithProviders(
      <SignupForm
        verifyPhoneState={{
          loading: false,
          result: { error: false, result: 'OK' }
        }}
      />
    )
    expect(getByText('Verify Phone')).toBeTruthy()
  })

  it('toggles password visibility icon', () => {
    const { getByTestId } = renderWithProviders(<SignupForm />)
    fireEvent.press(getByTestId('mci-eye-outline'))
    expect(getByTestId('mci-eye-off-outline')).toBeTruthy()
  })

  it('shows toast when signup returns an error', () => {
    const showToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
    renderWithProviders(
      <SignupForm
        formState={{
          loading: false,
          result: { error: true, result: ['Email already exists'] }
        }}
      />
    )
    expect(showToast).toHaveBeenCalled()
  })
})
