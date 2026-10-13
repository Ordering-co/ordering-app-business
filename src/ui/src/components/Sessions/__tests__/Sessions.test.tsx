import React from 'react'
import { Alert } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { useSession, useUtils } from '@components'

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
  const { sessionsDefaults } = require('../../../../../../jest/helpers/b2AuthDefaults')
  return {
    ...mockOrdering,
    Sessions: renderUiController(sessionsDefaults)
  }
})

import { Sessions } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('Sessions', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue([
      {
        auth: true,
        user: { id: 1, session_strategy: 'jwt_session' }
      },
      { logout: jest.fn() }
    ])
    ;(useUtils as jest.Mock).mockReturnValue([{ parseDate: (value: string) => value }])
  })

  it('renders session list for jwt users', () => {
    const { getByText } = renderWithProviders(<Sessions />)
    expect(getByText('Delete all sessions except current')).toBeTruthy()
  })

  it('opens delete-all confirmation dialog', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons: any) => {
      buttons?.[0]?.onPress?.()
    })
    const handleDeleteAllSessions = jest.fn()
    const { getByText } = renderWithProviders(
      <Sessions handleDeleteAllSessions={handleDeleteAllSessions} />
    )
    fireEvent.press(getByText('Delete all sessions except current'))
    expect(alertSpy).toHaveBeenCalled()
    expect(handleDeleteAllSessions).toHaveBeenCalledWith(false)
    alertSpy.mockRestore()
  })

  it('shows enable sessions prompt for non-jwt users', () => {
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: true, user: { id: 1, session_strategy: 'cookie' } },
      { logout: jest.fn() }
    ])
    const { getByText } = renderWithProviders(<Sessions />)
    expect(getByText('Active sessions')).toBeTruthy()
  })

  it('renders loading placeholders', () => {
    const { getAllByTestId } = renderWithProviders(
      <Sessions sessionsList={{ loading: true, sessions: [] }} />
    )
    expect(getAllByTestId('placeholder-line').length).toBeGreaterThan(0)
  })

  it('shows empty sessions message', () => {
    const { getByText } = renderWithProviders(
      <Sessions sessionsList={{ loading: false, sessions: [] }} />
    )
    expect(getByText("You don't have any sessions")).toBeTruthy()
  })
})
