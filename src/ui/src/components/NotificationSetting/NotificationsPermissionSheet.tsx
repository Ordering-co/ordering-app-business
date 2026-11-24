import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { openSettings, requestNotifications } from 'react-native-permissions'

import { IconTile, OBottomPopup, OButton, OText } from '../shared'
import { themeSpace } from '@/theme/helpers'
import { useLanguage } from '@components'

interface Props {
  open: boolean
  onClose: () => void
  /**
   * What "Turn on notifications" does, when the shell has its own way (the push provider's prompt). Without it the
   * sheet asks the system and, when the system will not ask again (blocked), opens the app's settings.
   */
  onAllow?: () => void | Promise<void>
}

/**
 * The explainer before the system's prompt (NotificationsPermission mockup): a sheet that says why the app wants
 * notifications (new orders while the app is closed), "Turn on notifications" and "Not now". The same sheet is the
 * orders screens' prompt when notifications are blocked.
 */
export const NotificationsPermissionSheet = ({ open, onClose, onAllow }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = useMemo(() => StyleSheet.create({
    body: { gap: themeSpace(theme, 'md'), alignItems: 'stretch' },
    tile: { alignSelf: 'flex-start' },
    texts: { gap: themeSpace(theme, 'xs') }
  }), [theme])

  const turnOn = async () => {
    try {
      if (onAllow) {
        await onAllow()
      } else {
        const { status } = await requestNotifications(['alert', 'badge', 'sound'])
        if (status === 'blocked') await openSettings()
      }
    } catch {
      // The system said no or could not open its settings: the sheet closes either way.
    }
    onClose()
  }

  return (
    <OBottomPopup open={open} onClose={onClose} padded showHandleBar transparent animationType='slide' testID='notifications-permission-sheet'>
      <View style={styles.body}>
        <IconTile icon='notifications-outline' size='lg' style={styles.tile} />
        <View style={styles.texts}>
          <OText preset='h4'>{t('TURN_ON_ORDER_ALERTS', 'Turn on order alerts')}</OText>
          <OText color='text_muted'>{t('NOTIFICATIONS_PERMISSION_TEXT', 'Without notifications you won\'t hear new orders when the app is closed.')}</OText>
        </View>
        <OButton testID='notifications-allow' size='lg' text={t('TURN_ON_NOTIFICATIONS', 'Turn on notifications')} onClick={turnOn} />
        <OButton testID='notifications-later' appearance='ghost' color='neutral' size='md' text={t('NOT_NOW', 'Not now')} onClick={onClose} />
      </View>
    </OBottomPopup>
  )
}
