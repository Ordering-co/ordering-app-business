import React from 'react'
import { Alert } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

import { useSession, useConfig, useValidationFields } from '@components'

jest.mock('react-native-loading-spinner-overlay', () => {
  const { View } = require('react-native')
  return (props: any) => <View testID="spinner-overlay" {...props} />
})

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn()
}))

jest.mock('rn-placeholder', () => {
  const { View } = require('react-native')
  return {
    Placeholder: ({ children }: any) => <View testID="placeholder">{children}</View>,
    PlaceholderLine: () => <View testID="placeholder-line" />,
    Fade: {}
  }
})

jest.mock('@ui', () => {
  const { buildB2AuthUiMock } = require('../../../../../../jest/helpers/b2AuthUiMock')
  return buildB2AuthUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  const { userProfileDefaults } = require('../../../../../../jest/helpers/b2AuthDefaults')
  return {
    ...mockOrdering,
    UserFormDetails: renderUiController(userProfileDefaults)
  }
})

jest.mock('../../../providers/StoreUtil', () => ({
  _retrieveStoreData: jest.fn().mockResolvedValue(undefined),
  _clearStoreData: jest.fn().mockResolvedValue(undefined)
}))

import { UserProfileForm } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { _clearStoreData } from '../../../providers/StoreUtil'

describe('UserProfileForm', () => {
  const logout = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue([
      {
        auth: true,
        sessionLoading: false,
        user: {
          id: 1,
          level: 2,
          email: 'user@test.com',
          name: 'Test User',
          cellphone: '5551234567',
          country_phone_code: 1
        }
      },
      { logout }
    ])
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
    ;(useValidationFields as jest.Mock).mockReturnValue([
      { loading: false },
      { loadOriginalValidationFields: jest.fn() }
    ])
  })

  it('renders profile fields and actions', () => {
    const { getByText, getByTestId } = renderWithProviders(<UserProfileForm />)
    expect(getByText('Profile')).toBeTruthy()
    expect(getByText('Edit')).toBeTruthy()
    expect(getByTestId('language-selector-stub')).toBeTruthy()
  })

  it('shows language selector and logout stubs', () => {
    const { getByTestId } = renderWithProviders(<UserProfileForm />)
    expect(getByTestId('language-selector-stub')).toBeTruthy()
    expect(getByTestId('logout-button-stub')).toBeTruthy()
  })

  it('enters edit mode from profile actions', () => {
    const toggleIsEdit = jest.fn()
    const { getByText } = renderWithProviders(<UserProfileForm toggleIsEdit={toggleIsEdit} />)
    fireEvent.press(getByText('Edit'))
    expect(toggleIsEdit).toHaveBeenCalled()
  })

  it('navigates to sessions screen', () => {
    const navigate = jest.fn()
    const { getByText } = renderWithProviders(
      <UserProfileForm navigation={{ navigate }} />
    )
    fireEvent.press(getByText('Sessions'))
    expect(navigate).toHaveBeenCalledWith('Sessions')
  })

  it('navigates to printer setup', () => {
    const navigate = jest.fn()
    const { getByText } = renderWithProviders(
      <UserProfileForm navigation={{ navigate }} />
    )
    fireEvent.press(getByText('Printer Settings'))
    expect(navigate).toHaveBeenCalledWith('PrinterSetup')
  })

  it('confirms account removal', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons: any) => {
      buttons?.[0]?.onPress?.()
    })
    const handleRemoveAccount = jest.fn()
    const { getByText } = renderWithProviders(
      <UserProfileForm handleRemoveAccount={handleRemoveAccount} />
    )
    await act(async () => {
      fireEvent.press(getByText('Remove account'))
    })
    expect(alertSpy).toHaveBeenCalled()
    expect(handleRemoveAccount).toHaveBeenCalledWith(1)
    alertSpy.mockRestore()
  })

  it('logs out and clears local store after a successful account removal', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons: any) => {
      buttons?.[0]?.onPress?.()
    })
    const handleRemoveAccount = jest.fn().mockResolvedValue('OK')
    const { getByText } = renderWithProviders(
      <UserProfileForm handleRemoveAccount={handleRemoveAccount} />
    )
    await act(async () => {
      fireEvent.press(getByText('Remove account'))
    })
    expect(logout).toHaveBeenCalled()
    expect(_clearStoreData).toHaveBeenCalledWith({
      excludedKeys: ['isTutorial', 'language']
    })
    alertSpy.mockRestore()
  })

  it('does not log out when account removal fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons: any) => {
      buttons?.[0]?.onPress?.()
    })
    const handleRemoveAccount = jest.fn().mockResolvedValue('ERROR_USER_DELETE')
    const { getByText } = renderWithProviders(
      <UserProfileForm handleRemoveAccount={handleRemoveAccount} />
    )
    await act(async () => {
      fireEvent.press(getByText('Remove account'))
    })
    expect(logout).not.toHaveBeenCalled()
    expect(_clearStoreData).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('shows validation error state with refresh action', () => {
    const loadOriginalValidationFields = jest.fn()
    ;(useValidationFields as jest.Mock).mockReturnValue([
      { loading: false },
      { loadOriginalValidationFields }
    ])
    const { getByText } = renderWithProviders(
      <UserProfileForm validationFields={{ loading: false, error: ['Profile unavailable'] }} />
    )
    expect(getByText('Refresh profile')).toBeTruthy()
    fireEvent.press(getByText('Refresh profile'))
    expect(loadOriginalValidationFields).toHaveBeenCalledWith({ forceLoading: true })
  })

  it('shows loading placeholder while session loads', () => {
    ;(useSession as jest.Mock).mockReturnValue([
      {
        auth: true,
        sessionLoading: true,
        user: { id: 1, level: 2, email: 'user@test.com', name: 'Test User' }
      },
      { logout: jest.fn() }
    ])
    const { getAllByTestId } = renderWithProviders(<UserProfileForm />)
    expect(getAllByTestId('placeholder-line').length).toBeGreaterThan(0)
  })
})
