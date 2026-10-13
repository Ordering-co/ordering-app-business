import React from 'react'
import { Keyboard, ScrollView } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

import { useApi } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

import { Home } from '..'

describe('Home', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useApi as jest.Mock).mockReturnValue([
      { project: 'demo' },
      { setOrdering: jest.fn() }
    ])
  })

  it('renders welcome copy and navigates to login', () => {
    const onNavigationRedirect = jest.fn()
    const { getByText } = renderWithProviders(
      <Home
        onNavigationRedirect={onNavigationRedirect}
        useRootPoint={false}
        title={{ key: 'FAST_AND_EASY', value: 'Fast and easy' }}
      />
    )
    expect(getByText('Manage your business')).toBeTruthy()
    expect(getByText('Fast and easy')).toBeTruthy()
    fireEvent.press(getByText('Login'))
    expect(onNavigationRedirect).toHaveBeenCalledWith('Login')
  })

  it('shows project input when useRootPoint is enabled', () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <Home
        useRootPoint
        onNavigationRedirect={jest.fn()}
        title={{ key: 'FAST_AND_EASY', value: 'Fast and easy' }}
      />
    )
    expect(getByPlaceholderText('Project Name')).toBeTruthy()
    expect(getByText('Set project')).toBeTruthy()
  })

  it('keeps the project field in view when the keyboard opens', () => {
    jest.useFakeTimers()
    const scrollToEnd = jest.spyOn(ScrollView.prototype, 'scrollToEnd')
    const showHandlers: Array<(event: { endCoordinates: { height: number } }) => void> = []
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, handler) => {
      if (event === 'keyboardWillShow' || event === 'keyboardDidShow') {
        showHandlers.push(handler as (event: { endCoordinates: { height: number } }) => void)
      }
      return { remove: jest.fn() }
    })

    try {
      const { getByPlaceholderText, getByText, UNSAFE_getByType } = renderWithProviders(
        <Home
          useRootPoint
          onNavigationRedirect={jest.fn()}
          title={{ key: 'FAST_AND_EASY', value: 'Fast and easy' }}
        />
      )

      fireEvent(getByPlaceholderText('Project Name'), 'focus')
      act(() => {
        showHandlers.forEach((handler) => handler({ endCoordinates: { height: 320 } }))
        jest.advanceTimersByTime(300)
      })

      const paddingBottom = UNSAFE_getByType(ScrollView).props.contentContainerStyle.paddingBottom
      expect(paddingBottom).toBeLessThan(100)
      expect(scrollToEnd).not.toHaveBeenCalled()
      expect(getByPlaceholderText('Project Name')).toBeTruthy()
      expect(getByText('Set project')).toBeTruthy()
    } finally {
      jest.useRealTimers()
      jest.restoreAllMocks()
    }
  })
})
