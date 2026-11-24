import * as React from 'react'
import { useSession } from '@components'
import { UserProfileForm, SafeAreaContainerLayout, ScreenContainer } from '@ui'
import { useNavigation } from '@react-navigation/native'

interface Props {
  navigation: any
  route: any
}

/**
 * The Profile tab: the photo and who the user is, the personal information, the account's rows, support, log out and
 * remove account, in a centered column on a tablet. The profile has the user form's headless controller (the session's
 * user and the server's validation fields: it saves the photo and removes the account). It reads the session user again
 * each time the tab is focused (the rows that show a count read the device again too).
 */
const Profile = (props: Props) => {
  const [{ user }, { refreshUserInfo }] = useSession()
  const navigation: any = useNavigation()
  const [focusCount, setFocusCount] = React.useState(0)

  /** The name of the tab the tabs navigator has focused. */
  const focusedTab = () => {
    const state = navigation.getState?.()
    return state?.routes?.[state.index]?.name
  }

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      if (focusedTab() === 'Profile') {
        setFocusCount((count) => count + 1)
        user?.id && refreshUserInfo?.()
      }
    })

    return unsubscribe
  }, [user?.id])

  return (
    <SafeAreaContainerLayout>
      <ScreenContainer>
        <UserProfileForm
          navigation={props.navigation}
          useSessionUser
          useValidationFields
          focusCount={focusCount}
        />
      </ScreenContainer>
    </SafeAreaContainerLayout>
  )
}

export default Profile
