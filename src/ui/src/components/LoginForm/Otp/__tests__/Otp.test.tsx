import React from 'react'
import { StyleSheet } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../../../src/theme/engine'

jest.mock('@components', () => require('../../../../../../../jest/helpers/mockOrdering'))

import { Otp } from '..'

const idle = { loading: false, result: { error: false } }
const baseProps = () => ({
  email: 'ana@store.com',
  willVerifyOtpState: true,
  onBack: jest.fn(),
  onResend: jest.fn(),
  handleLoginOtp: jest.fn(),
  formState: idle,
  checkPhoneCodeState: idle
})

describe('Otp (the login code screen)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('has the title, the lead with the address, six cells, the expiry caption and the resend wait', () => {
    const { getByText, getAllByText } = renderWithProviders(<Otp {...baseProps()} />)
    expect(getByText('Enter the code')).toBeTruthy()
    expect(getByText('ana@store.com')).toBeTruthy()
    expect(getAllByText(/We sent a 6-digit code to/)).toHaveLength(1)
    expect(getByText('Code expires in 10:00')).toBeTruthy()
    expect(getByText('Resend code in 1:20')).toBeTruthy()
  })

  it('has a back arrow and no Cancel', () => {
    const props = baseProps()
    const { getByLabelText, queryByText } = renderWithProviders(<Otp {...props} />)
    expect(queryByText('Cancel')).toBeNull()
    fireEvent.press(getByLabelText('Go back'))
    expect(props.onBack).toHaveBeenCalledTimes(1)
  })

  it('draws six cells of the theme\'s code size', () => {
    const view = renderWithProviders(<Otp {...baseProps()} />)
    expect(view.getByTestId('otp-code-field').props.maxLength).toBe(6)
    const code = defaultAppTheme().native.components.input.sizes.code
    const find = (node: any): any => node?.props?.testID === 'otp-code' ? node : (node?.children ?? []).map((child: any) => typeof child === 'object' ? find(child) : null).find(Boolean)
    const row = find(view.toJSON()).children[0]
    expect(row.children).toHaveLength(6)
    expect(StyleSheet.flatten(row.children[0].props.style).height).toBe(code.height)
  })

  it('submits on the sixth digit, and "Verify" is pinned in the bottom bar, disabled until there are six', () => {
    const props = baseProps()
    const { getByTestId, getByRole } = renderWithProviders(<Otp {...props} />)
    const verify = () => getByRole('button', { name: 'Verify' })
    expect(verify().props.accessibilityState.disabled).toBe(true)
    fireEvent.changeText(getByTestId('otp-code-field'), '12345')
    expect(props.handleLoginOtp).not.toHaveBeenCalled()
    expect(verify().props.accessibilityState.disabled).toBe(true)
    fireEvent.changeText(getByTestId('otp-code-field'), '123456')
    expect(props.handleLoginOtp).toHaveBeenCalledWith('123456')
    expect(verify().props.accessibilityState.disabled).toBeFalsy()
    props.handleLoginOtp.mockClear()
    fireEvent.press(verify())
    expect(props.handleLoginOtp).toHaveBeenCalledWith('123456')
  })

  it('counts the expiry and the resend wait down, and enables the resend at zero wait', () => {
    const props = baseProps()
    const { getByText, queryByText } = renderWithProviders(<Otp {...props} />)
    act(() => { jest.advanceTimersByTime(38 * 1000) })
    expect(getByText('Resend code in 0:42')).toBeTruthy()
    expect(getByText('Code expires in 09:22')).toBeTruthy()
    fireEvent.press(getByText('Resend code in 0:42'))
    expect(props.onResend).not.toHaveBeenCalled()
    act(() => { jest.advanceTimersByTime(42 * 1000) })
    expect(queryByText(/Resend code in/)).toBeNull()
    fireEvent.press(getByText('Resend code'))
    expect(props.onResend).toHaveBeenCalledTimes(1)
  })

  it('restarts the countdowns on a resend and says the code was sent', () => {
    const props = baseProps()
    const { getByText, queryByTestId } = renderWithProviders(<Otp {...props} />)
    act(() => { jest.advanceTimersByTime(85 * 1000) })
    fireEvent.press(getByText('Resend code'))
    expect(getByText('Resend code in 1:20')).toBeTruthy()
    expect(getByText('Code expires in 10:00')).toBeTruthy()
    expect(queryByTestId('otp-resent')).toBeTruthy()
  })

  it('paints the caption in its expired color at zero', () => {
    const { getByText } = renderWithProviders(<Otp {...baseProps()} />)
    act(() => { jest.advanceTimersByTime(600 * 1000) })
    const timer = getByText('Code expires in 00:00')
    expect(StyleSheet.flatten(timer.props.style).color).toBe(defaultAppTheme().native.components.timer.base.expired_color)
  })

  it('shows a refused code under the cells, whole, with the cells in the error state, and not for an old answer', () => {
    const props = baseProps()
    const message = 'The code you typed is not valid or it has expired, ask for a new one'
    const old = { loading: false, result: { error: true, result: ['Old answer'] } }
    const view = renderWithProviders(<Otp {...props} formState={old} />)
    expect(view.queryByTestId('otp-error')).toBeNull()
    view.rerender(<Otp {...props} formState={old} />)
    view.rerender(<Otp {...props} formState={{ loading: false, result: { error: true, result: [message] } }} />)
    expect(view.getByTestId('otp-error').props.children).toBe(message)
    // Typing takes it away.
    fireEvent.changeText(view.getByTestId('otp-code-field'), '1')
    expect(view.queryByTestId('otp-error')).toBeNull()
  })

  it('shows what the request of a new code answers (the wait it asks for) under the cells', () => {
    const props = baseProps()
    const view = renderWithProviders(<Otp {...props} />)
    view.rerender(<Otp {...props} checkPhoneCodeState={{ loading: false, result: { error: true, result: ['ERROR_VERIFICATION_CODE_GENERATE_PLEASE_WAIT_RETRY'] } }} />)
    expect(view.getByTestId('otp-error')).toBeTruthy()
    expect(view.queryByText('ERROR_VERIFICATION_CODE_GENERATE_PLEASE_WAIT_RETRY')).toBeNull()
  })

  it('keeps the code typed after a refusal so "Verify" can try it again, and shows Verify as loading while it runs', () => {
    const props = baseProps()
    const view = renderWithProviders(<Otp {...props} />)
    fireEvent.changeText(view.getByTestId('otp-code-field'), '123456')
    view.rerender(<Otp {...props} formState={{ loading: false, result: { error: true, result: ['Wrong'] } }} />)
    expect(view.getByTestId('otp-code-field').props.value).toBe('123456')
    view.rerender(<Otp {...props} formState={{ loading: true, result: { error: false } }} />)
    expect(view.getByRole('button', { name: 'Verify' }).props.accessibilityState.busy).toBe(true)
  })
})
