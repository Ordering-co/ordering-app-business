import React from 'react'
import { Keyboard, ScrollView, StyleSheet } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../../src/theme/engine'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  const { forgotPasswordDefaults } = require('../../../../../../jest/helpers/b2AuthDefaults')
  return {
    ...mockOrdering,
    ForgotPasswordForm: renderUiController(forgotPasswordDefaults)
  }
})

import { ForgotPasswordForm } from '..'

const idle = { loading: false, result: {} }
const sent = { loading: false, result: { error: false, result: 'OK' } }
const insideScroll = (node: any) => {
  for (let up = node.parent; up; up = up.parent) if (up.type === ScrollView) return true
  return false
}

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  it('draws the lead (without the old typo), the labelled e-mail field and the inline button', () => {
    const screen = renderWithProviders(<ForgotPasswordForm />)
    expect(screen.getByText('Forgot your password?')).toBeTruthy()
    expect(screen.getByText("Enter your email and we'll send you a link to reset your password.")).toBeTruthy()
    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.getByPlaceholderText('name@store.com')).toBeTruthy()
    // The button is in the scroll (not pinned), and "Back to log in" is under it.
    expect(insideScroll(screen.getByRole('button', { name: 'Recover password' }))).toBe(true)
    expect(screen.getByRole('link', { name: 'Back to log in' })).toBeTruthy()
  })

  it('goes back with the arrow and with "Back to log in"', () => {
    const goBack = jest.fn()
    const screen = renderWithProviders(<ForgotPasswordForm navigation={{ goBack, canGoBack: () => true, navigate: jest.fn() }} />)
    fireEvent.press(screen.getByLabelText('Go back'))
    fireEvent.press(screen.getByRole('link', { name: 'Back to log in' }))
    expect(goBack).toHaveBeenCalledTimes(2)
  })

  it('goes to the login when there is nothing to go back to', () => {
    const navigate = jest.fn()
    const screen = renderWithProviders(<ForgotPasswordForm navigation={{ goBack: jest.fn(), canGoBack: () => false, navigate }} />)
    fireEvent.press(screen.getByRole('link', { name: 'Back to log in' }))
    expect(navigate).toHaveBeenCalledWith('Login')
  })

  it('writes the missing or malformed e-mail under its field, with no toast, and sends nothing', async () => {
    const showToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
    const handleButtonForgotPasswordClick = jest.fn()
    const screen = renderWithProviders(<ForgotPasswordForm formState={idle} handleButtonForgotPasswordClick={handleButtonForgotPasswordClick} />)
    fireEvent.press(screen.getByRole('button', { name: 'Recover password' }))
    expect((await screen.findByTestId('error-email')).props.children).toBe('The field Email is required')
    fireEvent.changeText(screen.getByLabelText('Email'), 'nope')
    fireEvent.press(screen.getByRole('button', { name: 'Recover password' }))
    await waitFor(() => expect(screen.getByTestId('error-email').props.children).toBe('Invalid email address'))
    expect(handleButtonForgotPasswordClick).not.toHaveBeenCalled()
    expect(showToast).not.toHaveBeenCalled()
  })

  it('sends the address in lower case, with the keyboard closed', async () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {})
    const handleButtonForgotPasswordClick = jest.fn()
    const screen = renderWithProviders(<ForgotPasswordForm formState={idle} handleButtonForgotPasswordClick={handleButtonForgotPasswordClick} />)
    fireEvent.changeText(screen.getByLabelText('Email'), 'Ana@Store.com')
    fireEvent.press(screen.getByRole('button', { name: 'Recover password' }))
    await waitFor(() => expect(handleButtonForgotPasswordClick).toHaveBeenCalledWith({ email: 'ana@store.com' }))
    expect(dismiss).toHaveBeenCalled()
    dismiss.mockRestore()
  })

  describe('after the link was sent', () => {
    const props = { handleButtonForgotPasswordClick: jest.fn() }
    const sentScreen = async () => {
      jest.useFakeTimers()
      const screen = renderWithProviders(<ForgotPasswordForm {...props} formState={idle} />)
      fireEvent.changeText(screen.getByLabelText('Email'), 'ana@store.com')
      fireEvent.press(screen.getByRole('button', { name: 'Recover password' }))
      await waitFor(() => expect(props.handleButtonForgotPasswordClick).toHaveBeenCalled())
      screen.rerender(<ForgotPasswordForm {...props} formState={sent} />)
      return screen
    }

    it('says where it went, in a success notice, and the button waits 45 s to send again', async () => {
      const screen = await sentScreen()
      expect(screen.getByText('Link sent.')).toBeTruthy()
      expect(screen.getByText(/Check the inbox of ana@store\.com\./)).toBeTruthy()
      expect(StyleSheet.flatten(screen.getByTestId('forgot-notice').props.style).backgroundColor)
        .toBe(defaultAppTheme().native.components.alert.variants.success.background)
      const button = screen.getByRole('button', { name: 'Send again in 0:45' })
      expect(button.props.accessibilityState.disabled).toBe(true)
    })

    it('counts down, and sends again at zero', async () => {
      const screen = await sentScreen()
      act(() => { jest.advanceTimersByTime(30 * 1000) })
      expect(screen.getByRole('button', { name: 'Send again in 0:15' })).toBeTruthy()
      act(() => { jest.advanceTimersByTime(15 * 1000) })
      const again = screen.getByRole('button', { name: 'Send again' })
      expect(again.props.accessibilityState.disabled).toBeFalsy()
      props.handleButtonForgotPasswordClick.mockClear()
      fireEvent.press(again)
      await waitFor(() => expect(props.handleButtonForgotPasswordClick).toHaveBeenCalledWith({ email: 'ana@store.com' }))
    })

    it('goes back to "Recover password" when the address is edited', async () => {
      const screen = await sentScreen()
      fireEvent.changeText(screen.getByLabelText('Email'), 'other@store.com')
      expect(screen.queryByText('Link sent.')).toBeNull()
      expect(screen.getByRole('button', { name: 'Recover password' })).toBeTruthy()
    })
  })

  it('shows the answer of a failure whole, in a danger notice, and lets the user try again', async () => {
    const props = { handleButtonForgotPasswordClick: jest.fn() }
    const screen = renderWithProviders(<ForgotPasswordForm {...props} formState={idle} />)
    fireEvent.changeText(screen.getByLabelText('Email'), 'ana@store.com')
    fireEvent.press(screen.getByRole('button', { name: 'Recover password' }))
    await waitFor(() => expect(props.handleButtonForgotPasswordClick).toHaveBeenCalled())
    const message = 'We could not send the e-mail right now because the mail service is down, try again in a few minutes'
    screen.rerender(<ForgotPasswordForm {...props} formState={{ loading: false, result: { error: true, result: [message] } }} />)
    expect(screen.getByText(message)).toBeTruthy()
    expect(StyleSheet.flatten(screen.getByTestId('forgot-notice').props.style).backgroundColor)
      .toBe(defaultAppTheme().native.components.alert.variants.danger.background)
    expect(screen.getByRole('button', { name: 'Recover password' }).props.accessibilityState.disabled).toBeFalsy()
  })
})
