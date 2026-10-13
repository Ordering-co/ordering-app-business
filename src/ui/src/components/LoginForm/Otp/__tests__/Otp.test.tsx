import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'

jest.mock('@twotalltotems/react-native-otp-input', () => {
  const React = require('react')
  const { View, TouchableOpacity } = require('react-native')
  return (props: any) =>
    React.createElement(
      View,
      { testID: 'otp-input-view' },
      React.createElement(TouchableOpacity, {
        testID: 'otp-fill-code',
        onPress: () => props.onCodeFilled?.('123456')
      })
    )
})

jest.mock('@ui', () => {
  const { buildB2AuthUiMock } = require('../../../../../../../jest/helpers/b2AuthUiMock')
  return buildB2AuthUiMock()
})

import { Otp } from '..'
import { renderWithProviders } from '../../../../../../../jest/helpers/renderWithProviders'

describe('Otp', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('submits code and supports cancel', () => {
    const handleLoginOtp = jest.fn()
    const setWillVerifyOtpState = jest.fn()
    const setAlertState = jest.fn()
    const { getByTestId, getByText } = renderWithProviders(
      <Otp
        pinCount={6}
        willVerifyOtpState
        setWillVerifyOtpState={setWillVerifyOtpState}
        handleLoginOtp={handleLoginOtp}
        onSubmit={jest.fn()}
        setAlertState={setAlertState}
        formState={{ loading: false }}
      />
    )
    fireEvent.press(getByTestId('otp-fill-code'))
    expect(handleLoginOtp).toHaveBeenCalledWith('123456')
    fireEvent.press(getByText('Cancel'))
    expect(setWillVerifyOtpState).toHaveBeenCalledWith(false)
  })

  it('shows time expired alert when countdown reaches zero', () => {
    const setAlertState = jest.fn()
    renderWithProviders(
      <Otp
        pinCount={6}
        willVerifyOtpState
        setWillVerifyOtpState={jest.fn()}
        handleLoginOtp={jest.fn()}
        onSubmit={jest.fn()}
        setAlertState={setAlertState}
        formState={{ loading: false }}
      />
    )

    act(() => {
      jest.advanceTimersByTime(600000)
    })

    expect(setAlertState).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Time is up' })
    )
  })

  it('calls onSubmit when resend is pressed after cooldown', () => {
    const onSubmit = jest.fn()
    const setAlertState = jest.fn()
    const { getByText } = renderWithProviders(
      <Otp
        pinCount={6}
        willVerifyOtpState
        setWillVerifyOtpState={jest.fn()}
        handleLoginOtp={jest.fn()}
        onSubmit={onSubmit}
        setAlertState={setAlertState}
        formState={{ loading: false }}
      />
    )

    act(() => {
      jest.advanceTimersByTime(81000)
    })

    fireEvent.press(getByText('Resend code'))
    expect(onSubmit).toHaveBeenCalled()
    expect(setAlertState).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'The code has been sent' })
    )
  })
})
