import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => {
  const { View, Text } = require('react-native')
  return {
    SafeAreaContainerLayout: ({ children }: any) => <View testID='safe-area-layout'>{children}</View>,
    Sessions: (props: any) => <Text testID='sessions-controller'>{typeof props.navigation?.navigate}</Text>
  }
})

import Sessions from '../Sessions'

describe('Sessions', () => {
  it('renders the sessions screen with the stack\'s navigation, in the safe area', () => {
    const { getByTestId } = renderPage(Sessions)
    expect(getByTestId('safe-area-layout')).toBeTruthy()
    expect(getByTestId('sessions-controller').props.children).toBe('function')
  })
})
