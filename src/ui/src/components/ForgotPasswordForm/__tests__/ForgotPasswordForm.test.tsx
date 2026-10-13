import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'

import { useToast } from '@components'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  const { forgotPasswordDefaults } = require('../../../../../../jest/helpers/b2AuthDefaults')
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
    ForgotPasswordForm: renderUiController(forgotPasswordDefaults)
  }
})

import { ForgotPasswordForm } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders email recovery form', () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(<ForgotPasswordForm />)
    expect(getByPlaceholderText('Email')).toBeTruthy()
    expect(getByText('Recover Password')).toBeTruthy()
    expect(getByText("Enter your email address and we'll sent a link to reset your password.")).toBeTruthy()
  })

  it('submits recovery email', async () => {
    const handleButtonForgotPasswordClick = jest.fn()
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <ForgotPasswordForm
        formState={{ loading: false, result: {} }}
        handleButtonForgotPasswordClick={handleButtonForgotPasswordClick}
      />
    )
    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com')
    fireEvent.press(getByText('Recover Password'))
    await waitFor(() => {
      expect(handleButtonForgotPasswordClick).toHaveBeenCalled()
    })
  })

  it('shows success toast after send', async () => {
    const showToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
    const handleButtonForgotPasswordClick = jest.fn()
    const { getByPlaceholderText, getByText, rerender } = renderWithProviders(
      <ForgotPasswordForm
        formState={{ loading: false, result: {} }}
        handleButtonForgotPasswordClick={handleButtonForgotPasswordClick}
      />
    )
    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com')
    fireEvent.press(getByText('Recover Password'))
    await waitFor(() => expect(handleButtonForgotPasswordClick).toHaveBeenCalled())
    rerender(
      <ForgotPasswordForm
        formState={{ loading: false, result: { error: false, result: 'OK' } }}
        handleButtonForgotPasswordClick={handleButtonForgotPasswordClick}
      />
    )
    await waitFor(() => expect(showToast).toHaveBeenCalled())
  })

  it('shows error toast when send fails', async () => {
    const showToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
    const handleButtonForgotPasswordClick = jest.fn()
    const { getByPlaceholderText, getByText, rerender } = renderWithProviders(
      <ForgotPasswordForm
        formState={{ loading: false, result: {} }}
        handleButtonForgotPasswordClick={handleButtonForgotPasswordClick}
      />
    )
    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.com')
    fireEvent.press(getByText('Recover Password'))
    await waitFor(() => expect(handleButtonForgotPasswordClick).toHaveBeenCalled())
    rerender(
      <ForgotPasswordForm
        formState={{ loading: false, result: { error: true, result: ['Nope'] } }}
        handleButtonForgotPasswordClick={handleButtonForgotPasswordClick}
      />
    )
    await waitFor(() => expect(showToast).toHaveBeenCalled())
  })
})
