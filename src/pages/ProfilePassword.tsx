import React from 'react'
import { SafeAreaContainerLayout, UserFormDetails } from '@ui'

interface Props {
  navigation: any
  route: any
}

/**
 * The password, on a screen of its own (the profile's Password row opens it): the same form and controller as the
 * personal information, showing the current password, the new one and its confirmation.
 */
const ProfilePassword = ({ navigation }: Props) => (
  <SafeAreaContainerLayout>
    <UserFormDetails
      part='password'
      useSessionUser
      useValidationFields
      isEdit
      navigation={navigation}
    />
  </SafeAreaContainerLayout>
)

export default ProfilePassword
