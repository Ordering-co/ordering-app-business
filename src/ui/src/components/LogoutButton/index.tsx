import React, { useEffect, useState } from 'react'

import { ProfileRow } from '../UserProfileForm/ProfileRow'
import { RowsCard } from '../UserProfileForm/RowsCard'
import { useConfirm } from '../shared'
import { _retrieveStoreData, _clearStoreDataOnLogout } from '../../providers/StoreUtil'
import { LogoutAction, useLanguage, ToastType, useToast } from '@components'

/**
 * Log out, a row of its own under the profile's lists: the app's list row in its danger look, with the logout glyph, in a
 * card of its own. It opens nothing, so it ends without a chevron. It ends the session, so it asks first in the themed
 * dialog, with its accept button named "Logout". Logging out unregisters the push token, ends the session and clears what
 * belongs to the person (the push state, the project, the offline caches); what belongs to the device (the printers
 * and their settings, the alert settings, the language) stays.
 */
const LogoutButtonUI = (props: any) => {
  const { handleLogoutClick, setRootState, formState } = props
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const confirm = useConfirm()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    const data = await _retrieveStoreData('notification_state')
    const res = await handleLogoutClick(data)
    setLoading(false)
    if (res) {
      _clearStoreDataOnLogout()
      setRootState && setRootState({ isAuth: false, token: null })
    }
  }

  useEffect(() => {
    if (formState?.result?.error) {
      showToast(ToastType.Error, formState?.result?.result)
    }
  }, [formState?.result])

  return (
    <RowsCard>
      <ProfileRow
        testID='logout'
        title={t('LOGOUT', 'Logout')}
        icon='log-out-outline'
        danger
        chevron={false}
        disabled={loading}
        onPress={() => confirm({
          message: t('QUESTION_LOGOUT', 'Are you sure that you want to log out?'),
          acceptText: t('LOGOUT', 'Logout'),
          destructive: true,
          onAccept: handleClick
        })}
      />
    </RowsCard>
  )
}

export const LogoutButton = (props: any) => {
  const logoutProps = {
    ...props,
    isNative: true,
    UIComponent: LogoutButtonUI
  }

  return <LogoutAction {...logoutProps} />
}
