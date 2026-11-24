import React from 'react'
import { SafeAreaContainerLayout, UserFormDetails } from '@ui'

interface Props {
  navigation: any
  route: any
}

/**
 * The profile's personal information, on a screen of its own. Its form has its own headless controller (`isEdit` on,
 * so a save that goes through takes the user back), which is gone with the screen: leaving it saves nothing. The
 * fields and their rules are the server's validation fields.
 */
const ProfileEdit = ({ navigation }: Props) => (
  <SafeAreaContainerLayout>
    <UserFormDetails
      part='information'
      useSessionUser
      useValidationFields
      isEdit
      navigation={navigation}
    />
  </SafeAreaContainerLayout>
)

export default ProfileEdit
