import React from 'react'
import { act } from '@testing-library/react-native'

import { useSession } from '@components'
import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => {
  const React = require('react')
  const { View, Text } = require('react-native')
  return {
    SafeAreaContainerLayout: ({ children }: any) => <View testID='safe-area-layout'>{children}</View>,
    ScreenContainer: ({ children }: any) => <View testID='screen-container'>{children}</View>,
    UserProfileForm: (props: any) => <Text testID='user-profile-form'>{`${props.focusCount}|${props.useSessionUser}|${props.useValidationFields}`}</Text>
  }
})

import Profile from '../Profile'

describe('Profile', () => {
  const listeners: Array<() => void> = []
  const state = { index: 0, routes: [{ name: 'Profile' }] }

  beforeEach(() => {
    listeners.length = 0
  })

  it('renders the profile in the safe area and a centered column', () => {
    const { getByTestId } = renderPage(Profile)
    expect(getByTestId('safe-area-layout')).toBeTruthy()
    expect(getByTestId('screen-container')).toBeTruthy()
    expect(getByTestId('user-profile-form')).toBeTruthy()
  })

  it('reads the user again each time the Profile tab is focused', async () => {
    const refreshUserInfo = jest.fn()
    ;(useSession as jest.Mock).mockReturnValue([{ auth: true, user: { id: 7 } }, { refreshUserInfo }])
    const addListener = jest.fn((_name: string, listener: () => void) => { listeners.push(listener); return jest.fn() })
    const navigationModule = require('@react-navigation/native')
    const spy = jest.spyOn(navigationModule, 'useNavigation').mockReturnValue({ addListener, getState: () => state })
    const { getByTestId } = renderPage(Profile)
    expect(getByTestId('user-profile-form').props.children).toBe('0|true|true')
    await act(async () => { listeners.forEach((listener) => listener()) })
    expect(refreshUserInfo).toHaveBeenCalledTimes(1)
    expect(getByTestId('user-profile-form').props.children).toBe('1|true|true')
    spy.mockRestore()
  })

  it('does nothing when another tab is the focused one', async () => {
    const refreshUserInfo = jest.fn()
    ;(useSession as jest.Mock).mockReturnValue([{ auth: true, user: { id: 7 } }, { refreshUserInfo }])
    const addListener = jest.fn((_name: string, listener: () => void) => { listeners.push(listener); return jest.fn() })
    const spy = jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({ addListener, getState: () => ({ index: 1, routes: [{ name: 'Orders' }, { name: 'Stores' }] }) })
    renderPage(Profile)
    await act(async () => { listeners.forEach((listener) => listener()) })
    expect(refreshUserInfo).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
