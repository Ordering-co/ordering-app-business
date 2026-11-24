import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => {
  const { View, Text } = require('react-native')
  return {
    SafeAreaContainerLayout: ({ children }: any) => <View testID='safe-area-layout'>{children}</View>,
    UserFormDetails: (props: any) => (
      <Text testID='user-form'>{[props.part, props.useSessionUser, props.useValidationFields, props.isEdit].join('|')}</Text>
    )
  }
})

import ProfileEdit from '../ProfileEdit'
import ProfilePassword from '../ProfilePassword'

describe('ProfileEdit and ProfilePassword', () => {
  it('the information is the form\'s own screen, with its own controller in edit mode and the server\'s fields', () => {
    const { getByTestId } = renderPage(ProfileEdit)
    expect(getByTestId('safe-area-layout')).toBeTruthy()
    expect(getByTestId('user-form').props.children).toBe('information|true|true|true')
  })

  it('the password is the same form showing the password part', () => {
    const { getByTestId } = renderPage(ProfilePassword)
    expect(getByTestId('user-form').props.children).toBe('password|true|true|true')
  })
})
