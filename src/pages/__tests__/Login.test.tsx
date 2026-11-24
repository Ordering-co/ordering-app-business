import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'
import RNRestart from 'react-native-restart'

import { useSession } from '@components'
import { renderPage } from '../../../jest/helpers/renderPage'

// The form, reduced to the props the page gives it.
const mockForm = jest.fn()
jest.mock('@ui', () => {
  const React = require('react')
  const { View, TouchableOpacity } = require('react-native')
  return {
    LoginForm: (props: any) => {
      mockForm(props)
      return (
        <View testID='login-form'>
          <TouchableOpacity testID='login-success' onPress={() => props.handleSuccessLogin?.({ id: 1, level: 2, session: { access_token: 'token' } })} />
          <TouchableOpacity testID='login-redirect' onPress={() => props.onNavigationRedirect?.('Forgot')} />
          <TouchableOpacity testID='login-redirect-empty' onPress={() => props.onNavigationRedirect?.('')} />
        </View>
      )
    }
  }
})

import Login, { ALLOWED_LEVELS } from '../Login'

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: false, user: null },
      { login: jest.fn() }
    ])
  })

  it('renders the form, which lays its own screen (the page wraps nothing around it)', () => {
    const { getByTestId, queryByTestId } = renderPage(Login)
    expect(getByTestId('login-form')).toBeTruthy()
    expect(queryByTestId('container')).toBeNull()
  })

  it('lets in the administrator and the business owner (0 and 2), never the driver', () => {
    renderPage(Login)
    expect(ALLOWED_LEVELS).toEqual([0, 2])
    expect(mockForm.mock.calls[0][0].allowedLevels).toEqual([0, 2])
    expect(mockForm.mock.calls[0][0].allowedLevels).not.toContain(4)
  })

  it('hands the push state of the route to the form', () => {
    renderPage(Login, { route: { params: { notification_state: { token: 'push-token' } } } })
    expect(mockForm.mock.calls[0][0].notificationState).toEqual({ token: 'push-token' })
  })

  it('goes to the screen the form asks for, and to none when it asks for none', () => {
    const { getByTestId, navigation } = renderPage(Login)
    fireEvent.press(getByTestId('login-redirect-empty'))
    expect(navigation.navigate).not.toHaveBeenCalled()
    fireEvent.press(getByTestId('login-redirect'))
    expect(navigation.navigate).toHaveBeenCalledWith('Forgot')
  })

  it('logs in and restarts when the project changed', async () => {
    const login = jest.fn()
    ;(useSession as jest.Mock).mockReturnValue([{ auth: false, user: null }, { login }])
    const { getByTestId } = renderPage(Login, { pageProps: { projectChanged: true } })
    await act(async () => {
      fireEvent.press(getByTestId('login-success'))
    })
    expect(login).toHaveBeenCalledWith({
      user: { id: 1, level: 2, session: { access_token: 'token' } },
      token: 'token'
    })
    expect(RNRestart.restart).toHaveBeenCalled()
  })

  it('does not restart when the project did not change', async () => {
    const login = jest.fn()
    ;(useSession as jest.Mock).mockReturnValue([{ auth: false, user: null }, { login }])
    const { getByTestId } = renderPage(Login)
    await act(async () => {
      fireEvent.press(getByTestId('login-success'))
    })
    expect(login).not.toHaveBeenCalled()
    expect(RNRestart.restart).not.toHaveBeenCalled()
  })
})
