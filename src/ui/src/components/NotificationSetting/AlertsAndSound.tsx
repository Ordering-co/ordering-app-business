import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, ScrollView, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { checkNotifications, openSettings } from 'react-native-permissions'

import {
  ChoiceRow,
  Icon,
  OBadge,
  OButton,
  OListRow,
  ONavbar,
  ONotice,
  OSwitch,
  OText,
  ScreenContainer,
  SectionTitle
} from '../shared'
import { offeredAlertSounds, useAlertSettings, type AlertSoundId } from '../AlertSettings'
import { playAlertSound } from '../NewOrderNotification/alertRing'
import { themeGutter, themePart, themeSpace } from '@/theme/helpers'
import { useLanguage } from '@components'

type PermissionState = 'granted' | 'off' | 'unknown'

/** What the system says of this app's notifications, read again each time the app comes back (from its settings). */
const useNotificationsPermission = (): PermissionState => {
  const [state, setState] = useState<PermissionState>('unknown')
  const read = useCallback(() => {
    checkNotifications()
      .then(({ status }) => setState(status === 'granted' || status === 'limited' ? 'granted' : status === 'unavailable' ? 'unknown' : 'off'))
      .catch(() => setState('unknown'))
  }, [])
  useEffect(() => {
    read()
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') read() })
    return () => subscription.remove()
  }, [read])
  return state
}

/**
 * Alerts and sound (Notifications mockup): the permission notice (with "Open settings" when notifications are off),
 * the new-order alert (always on: it is the app's core alert, so it has no switch), the local switches (ring until
 * opened, vibrate), the sound of the alert (the bundled sounds, `BUNDLED_ALERT_SOUNDS`; choosing one plays it once) and "Send a test alert". Every change is the alert's next ring.
 * The server-side switches (new messages, order updates) wait for the backend's preferences.
 */
export const AlertsAndSound = ({ navigation }: { navigation?: any }) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const alerts = useAlertSettings()
  const sounds = offeredAlertSounds()
  const permission = useNotificationsPermission()
  // Choosing a sound plays it once, so it can be heard before it is kept; the next choice (or leaving) stops the last one.
  const preview = useRef<(() => void) | null>(null)
  const choose = (id: AlertSoundId) => {
    alerts.update({ sound: id })
    preview.current?.()
    preview.current = playAlertSound(id)
  }
  useEffect(() => () => { preview.current?.() }, [])
  const styles = useMemo(() => {
    const page = themePart(theme, 'account_page', 'base')
    return StyleSheet.create({
      screen: { flex: 1 },
      content: { paddingHorizontal: themeGutter(theme), paddingBottom: page.padding_bottom, gap: themeSpace(theme, 'md') },
      section: { gap: themeSpace(theme, 'xs') },
      title: { marginBottom: 0 }
    })
  }, [theme])

  return (
    <ScreenContainer>
      <View style={styles.screen}>
        <ONavbar title={t('ALERTS_AND_SOUND', 'Alerts and sound')} onBack={() => navigation?.canGoBack?.() && navigation.goBack()} />
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {permission === 'granted' && (
            <ONotice variant='success' testID='notifications-on'>{t('NOTIFICATIONS_ARE_ON', 'Notifications are on for this device.')}</ONotice>
          )}
          {permission === 'off' && (
            <ONotice
              variant='warning'
              testID='notifications-off'
              action={{ text: t('OPEN_SETTINGS', 'Open settings'), onPress: () => { openSettings().catch(() => {}) }, testID: 'notifications-open-settings' }}
            >
              {t('NOTIFICATIONS_ARE_OFF', 'Notifications are off for this device.')}
            </ONotice>
          )}

          <View>
            <OListRow
              testID='alert-new-order'
              title={t('NEW_ORDER_ALERT', 'New order alert')}
              subtitle={t('NEW_ORDER_ALERT_HINT', 'Opens over any screen with Accept')}
              trailing={<OBadge variant='success_soft'>{t('ALWAYS_ON', 'Always on')}</OBadge>}
            />
            <OListRow
              testID='alert-ring'
              title={t('RING_UNTIL_OPENED', 'Ring until opened')}
              subtitle={t('RING_UNTIL_OPENED_HINT', 'Repeats every few seconds')}
              trailing={(
                <OSwitch
                  testID='alert-ring-switch'
                  accessibilityLabel={t('RING_UNTIL_OPENED', 'Ring until opened')}
                  value={alerts.ringUntilOpened}
                  onChange={(value) => alerts.update({ ringUntilOpened: value })}
                />
              )}
            />
            <OListRow
              testID='alert-vibrate'
              title={t('VIBRATE', 'Vibrate')}
              trailing={(
                <OSwitch
                  testID='alert-vibrate-switch'
                  accessibilityLabel={t('VIBRATE', 'Vibrate')}
                  value={alerts.vibrate}
                  onChange={(value) => alerts.update({ vibrate: value })}
                />
              )}
            />
          </View>

          {sounds.length > 1 && (
            <View style={styles.section} testID='alert-sounds'>
              <SectionTitle style={styles.title}>{t('SOUND', 'Sound')}</SectionTitle>
              <View>
                {sounds.map((sound) => {
                  const selected = alerts.sound === sound.id
                  return (
                    <ChoiceRow
                      key={sound.id}
                      testID={`alert-sound-${sound.id}`}
                      selected={selected}
                      onPress={() => choose(sound.id)}
                    >
                      <OText weight={selected ? 600 : undefined}>{t(sound.labelKey, sound.fallback)}</OText>
                    </ChoiceRow>
                  )
                })}
              </View>
              <OText preset='body_sm' color='text_muted' testID='alert-sound-note'>
                {t('SOUND_BACKGROUND_NOTE', 'A notification that arrives while the app is in the background plays the Bell.')}
              </OText>
            </View>
          )}

          <OButton
            testID='alert-test'
            appearance='tonal'
            color='primary'
            size='md'
            icon={<Icon name='notifications-outline' />}
            text={t('SEND_TEST_ALERT', 'Send a test alert')}
            onClick={() => alerts.requestTestAlert()}
          />
        </ScrollView>
      </View>
    </ScreenContainer>
  )
}
