import React, { useMemo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { Icon, OButton, OListRow, ONavbar, OSwitch, OText, ScreenContainer, SectionTitle } from '../shared'
import { resetOrdersDisplay, setOrdersDisplay, useOrdersDisplay } from '@/context/ordersDisplay'
import { themeGutter, themePart, themeSpace } from '@/theme/helpers'
import { useLanguage } from '@components'

type Key = 'quickActions' | 'absoluteTime'

/**
 * Orders display (Profile → This device): how the order cards look on this device. Two switches, written to the device
 * at once (the orders list shows a change without a restart): the cards' quick actions and the clock time beside the
 * elapsed time. The theme sets the default of each; the device's choice wins over it in either direction. A row the device
 * changed says what the default is, and "Use the app's defaults" gives both back to the theme.
 */
export const OrdersDisplaySettings = ({ navigation }: { navigation?: any }) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const display = useOrdersDisplay()
  const styles = useMemo(() => {
    const page = themePart(theme, 'account_page', 'base')
    return StyleSheet.create({
      screen: { flex: 1 },
      content: { paddingHorizontal: themeGutter(theme), paddingBottom: page.padding_bottom, gap: themeSpace(theme, 'md') },
      section: { gap: themeSpace(theme, 'xs') },
      title: { marginBottom: 0 },
      notes: { gap: themeSpace(theme, 'xxs'), paddingBottom: themeSpace(theme, 'xs') }
    })
  }, [theme])

  const changed = (key: Key) => display.device[key] !== undefined
  const anyChanged = changed('quickActions') || changed('absoluteTime')
  const defaultText = (key: Key) => (display.themeDefault[key]
    ? t('ORDERS_DISPLAY_DEFAULT_ON', 'Default: on')
    : t('ORDERS_DISPLAY_DEFAULT_OFF', 'Default: off'))

  const setting = (key: Key, testID: string, title: string, hint: string) => (
    <View testID={testID}>
      <OListRow
        last
        title={title}
        trailing={(
          <OSwitch
            testID={`${testID}-switch`}
            accessibilityLabel={title}
            value={display[key]}
            onChange={(value) => { setOrdersDisplay({ [key]: value }) }}
          />
        )}
      />
      <View style={styles.notes}>
        <OText preset='body_sm' color='text_muted' testID={`${testID}-hint`}>{hint}</OText>
        {changed(key) && <OText preset='label' color='text_muted' testID={`${testID}-default`}>{defaultText(key)}</OText>}
      </View>
    </View>
  )

  return (
    <ScreenContainer>
      <View style={styles.screen}>
        <ONavbar title={t('ORDERS_DISPLAY', 'Orders display')} onBack={() => navigation?.canGoBack?.() && navigation.goBack()} />
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <SectionTitle style={styles.title}>{t('ORDERS_DISPLAY_CARD', 'Order card')}</SectionTitle>
            {setting(
              'quickActions',
              'orders-display-quick-actions',
              t('QUICK_ACTIONS', 'Quick actions'),
              t('QUICK_ACTIONS_HINT', 'Show Accept, Reject and the other buttons on each order card. Off, a card only opens the order.')
            )}
            {setting(
              'absoluteTime',
              'orders-display-clock-time',
              t('CLOCK_TIME', 'Clock time'),
              t('CLOCK_TIME_HINT', 'Show the clock time beside the elapsed time, for example "waiting · 12:04 PM". A preorder always shows the time it is for.')
            )}
          </View>
          {anyChanged && (
            <OButton
              testID='orders-display-reset'
              appearance='tonal'
              color='primary'
              size='md'
              icon={<Icon name='refresh-outline' />}
              text={t('ORDERS_DISPLAY_RESET', 'Use the app\'s defaults')}
              onClick={() => { resetOrdersDisplay() }}
            />
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  )
}

export default OrdersDisplaySettings
