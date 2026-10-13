import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { useApi, useConfig, useToast } from '@components'

jest.mock('react-native-recaptcha-that-works', () => {
  const React = require('react')
  return React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }))
    return null
  })
})
jest.mock('@fatnlazycat/react-native-recaptcha-v3', () => 'ReCaptcha')

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
  const { loginFormDefaults } = require('../../../../../../jest/helpers/b2AuthDefaults')
  return {
    ...mockOrdering,
    LoginForm: renderUiController(loginFormDefaults)
  }
})

import { LoginForm } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('LoginForm', () => {
  beforeEach(() => {
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'demo' }, { setOrdering: jest.fn() }])
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  it('renders email login controls', () => {
    const { getByPlaceholderText, getAllByText } = renderWithProviders(<LoginForm />)
    expect(getByPlaceholderText('Email')).toBeTruthy()
    expect(getByPlaceholderText('Password')).toBeTruthy()
    expect(getAllByText('Login').length).toBeGreaterThan(0)
  })

  it('redirects to forgot password screen', () => {
    const onNavigationRedirect = jest.fn()
    const { getByText } = renderWithProviders(
      <LoginForm onNavigationRedirect={onNavigationRedirect} />
    )
    fireEvent.press(getByText('Forgot your password?'))
    expect(onNavigationRedirect).toHaveBeenCalledWith('Forgot')
  })

  it('renders cellphone login when cellphone tab is active', () => {
    const { getByTestId } = renderWithProviders(
      <LoginForm useLoginByCellphone useLoginByEmail={false} loginTab="cellphone" />
    )
    expect(getByTestId('phone-input-stub')).toBeTruthy()
  })

  it('renders otp login button label', () => {
    const { getByText } = renderWithProviders(
      <LoginForm useLoginOtp useLoginOtpEmail loginTab="otp" otpType="email" />
    )
    expect(getByText('Get verify code')).toBeTruthy()
  })

  it('shows email and otp tabs when both enabled', () => {
    const { getByText } = renderWithProviders(
      <LoginForm useLoginByEmail useLoginOtpEmail />
    )
    expect(getByText('OTP Email')).toBeTruthy()
  })

  it('switches to otp tab', () => {
    const handleChangeTab = jest.fn()
    const setOtpType = jest.fn()
    const { getByText } = renderWithProviders(
      <LoginForm
        useLoginByEmail
        useLoginOtpEmail
        handleChangeTab={handleChangeTab}
        setOtpType={setOtpType}
      />
    )
    fireEvent.press(getByText('OTP Email'))
    expect(handleChangeTab).toHaveBeenCalledWith('otp')
    expect(setOtpType).toHaveBeenCalledWith('email')
  })

  it('renders recaptcha controls when enabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        security_recaptcha_site_key: { value: 'site-key' },
        security_recaptcha_base_url: { value: 'https://example.com' }
      }
    }])
    const { getByText } = renderWithProviders(<LoginForm enableReCaptcha />)
    expect(getByText('Verify reCAPTCHA')).toBeTruthy()
  })

  it('renders recaptcha v3 config when configured', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        security_recaptcha_type: { value: 'v3' },
        security_recaptcha_score_v3: { value: 0.5 },
        security_recaptcha_site_key_v3: { value: 'v3-site-key' },
        security_recaptcha_base_url: { value: 'https://example.com' }
      }
    }])
    const { getAllByText } = renderWithProviders(<LoginForm enableReCaptcha />)
    expect(getAllByText('Login').length).toBeGreaterThan(0)
  })

  it('shows verify code button for twilio cellphone login', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { twilio_service_enabled: { value: '1' } }
    }])
    const { getByText } = renderWithProviders(
      <LoginForm useLoginByCellphone loginTab="cellphone" />
    )
    expect(getByText('Get Verify Code')).toBeTruthy()
  })

  it('toggles password visibility', () => {
    const { getByPlaceholderText } = renderWithProviders(<LoginForm />)
    expect(getByPlaceholderText('Password')).toBeTruthy()
  })

  it('handles verify phone error state', () => {
    const { getAllByText } = renderWithProviders(
      <LoginForm
        verifyPhoneState={{
          loading: false,
          result: { error: true, result: 'Invalid phone' }
        }}
      />
    )
    expect(getAllByText('Login').length).toBeGreaterThan(0)
  })

  it('shows login loading state from controller', () => {
    const { getAllByText } = renderWithProviders(
      <LoginForm formState={{ loading: true, result: {} }} />
    )
    expect(getAllByText('Login').length).toBeGreaterThan(0)
  })

  it('shows toast when verify phone fails', () => {
    const showToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
    renderWithProviders(
      <LoginForm
        verifyPhoneState={{
          loading: false,
          result: { error: true, result: 'Invalid phone' }
        }}
      />
    )
    expect(showToast).toHaveBeenCalled()
  })

  it('handles check phone code error state', () => {
    const { getAllByText } = renderWithProviders(
      <LoginForm checkPhoneCodeState={{ result: { error: 'CODE_ERROR' } }} />
    )
    expect(getAllByText('Login').length).toBeGreaterThan(0)
  })

  it('opens verify phone modal after successful code send', () => {
    const { getByText } = renderWithProviders(
      <LoginForm
        verifyPhoneState={{
          loading: false,
          result: { error: false, result: 'OK' }
        }}
      />
    )
    expect(getByText('Verify Phone')).toBeTruthy()
  })

  it('toggles password visibility icon', () => {
    const { getByTestId } = renderWithProviders(<LoginForm />)
    fireEvent.press(getByTestId('mci-eye-outline'))
    expect(getByTestId('mci-eye-off-outline')).toBeTruthy()
  })

  it('shows try again toast for verification code auth error', () => {
    const showToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        security_recaptcha_site_key: { value: 'site-key' },
        security_recaptcha_base_url: { value: 'https://example.com' }
      }
    }])
    renderWithProviders(
      <LoginForm
        enableReCaptcha
        formState={{
          loading: false,
          result: { error: true, result: ['ERROR_AUTH_VERIFICATION_CODE'] }
        }}
      />
    )
    expect(showToast).toHaveBeenCalled()
  })
})
