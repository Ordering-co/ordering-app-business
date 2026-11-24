import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => {
  const { View, Text } = require('react-native')
  return {
    SafeAreaContainerLayout: ({ children }: any) => <View testID='safe-area-layout'>{children}</View>,
    AlertsAndSound: (props: any) => <Text testID='alerts-and-sound'>{typeof props.navigation?.goBack}</Text>
  }
})

import Notifications from '../Notifications'

describe('Notifications', () => {
  it('renders alerts and sound with the stack\'s navigation', () => {
    const { getByTestId } = renderPage(Notifications)
    expect(getByTestId('safe-area-layout')).toBeTruthy()
    expect(getByTestId('alerts-and-sound').props.children).toBe('function')
  })
})
