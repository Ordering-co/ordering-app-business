import React, { useCallback, useMemo } from 'react'
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CommonActions, useIsFocused } from '@react-navigation/native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { barBottomSpace, bottomBarBox, nativeBoxStyle, themePart, themeVisible } from '@/theme/helpers'
import { useLayout } from '@/theme/platform'
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible'
import { useReportBottomBar } from '../../../../context/BottomBarContext'
import { unreadMessagesText, useUnreadMessages } from '../../../../context/UnreadMessagesContext'
import { countLabel } from '../../../../context/reportedCount'
import { SHELL_TABS, type ShellTab } from './tabs'
import { TabBarItem } from './TabBarItem'

/** The text cap of the app's texts (`OText`): the bar grows with its label up to it. */
const FONT_SCALE_CAP = 1.3

/**
 * The signed-in app's navigation, drawn from `components.bottom_nav`: a bar under the screens (phone, and a tablet
 * held upright) or a rail at the side (a tablet held sideways, `placement: rail`: read from the theme, never from
 * a platform check). The same four tabs in both. It is the navigator's `tabBar`:
 *
 *   <Tab.Navigator tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ tabBarPosition: useTabBarPosition() }}>
 *
 * - the Messages tab leaves when the theme hides it (`bottom_nav.messages`); its screen stays registered for redirects;
 * - the labels leave with `bottom_nav.labels`;
 * - the Messages tab wears the unread messages the Messages list reported (`useReportUnreadMessages`); nothing is drawn before
 *   the list has reported, nor for zero. The Orders tab wears no number (the app shows no count of orders);
 * - the toast rides above the bar (`useReportBottomBar`), but only while the tabs are what is on screen;
 * - on Android the bar goes while the keyboard is up (a search field of a tab), as the library's own did.
 */
export const AppTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const insets = useSafeAreaInsets()
  const { fontScale } = useWindowDimensions()
  const { rail, railWidth } = useLayout()
  // Only Android's window shrinks with the keyboard, which is when the bar would ride up over the page: iOS leaves the
  // bar where it is (the keyboard covers it), so a keyboard state that is stale (the sign-in's, dismissed by the
  // navigation change) can never take the bar away there.
  const keyboardUp = useKeyboardVisible() && Platform.OS === 'android'
  const isOnScreen = useIsFocused()
  const unread = useUnreadMessages()

  const nav = theme.native.components.bottom_nav.base
  const columnWidth: number = themePart(theme, 'screen', 'base.max_width')
  const slots = theme.native.components.bottom_nav.slots
  const showLabels = themeVisible(theme, 'bottom_nav.labels')
  const labelGrowth = showLabels ? Math.ceil(nav.label_text.lineHeight * (Math.min(fontScale, FONT_SCALE_CAP) - 1)) : 0

  // The bar is its height (64) above the space under the labels, which is the system's navigation area once: on iOS the
  // home indicator's inset, never less than the theme's minimum; on Android nothing of its own, because the activity
  // already pads the screens over the navigation bar (the inset reads 0), so a minimum there is a second space.
  const barBox = useMemo(
    () => bottomBarBox({ height: nav.height, padding: nav.padding_y, space: barBottomSpace(theme, insets.bottom), growth: labelGrowth }),
    [theme, nav, insets.bottom, labelGrowth]
  )

  const styles = useMemo(() => {
    const box = nativeBoxStyle({ background: nav.background, shadow: nav.shadow })
    const line = nav.border_top
    return StyleSheet.create({
      bar: {
        ...box,
        flexDirection: 'row',
        // The background and the line run edge to edge; the tabs sit in the content's column (below).
        justifyContent: 'center',
        ...barBox,
        paddingTop: nav.padding_y,
        borderTopWidth: line.borderWidth,
        ...(line.borderColor && { borderTopColor: line.borderColor })
      },
      // The four tabs in the same centered column as the screens' content (`components.screen.max_width`, 0 on a phone).
      tabs: { flex: 1, flexDirection: 'row', ...(columnWidth > 0 && { maxWidth: columnWidth }) },
      rail: {
        ...box,
        width: railWidth + insets.left,
        paddingLeft: insets.left,
        paddingTop: insets.top + nav.padding_y,
        paddingBottom: insets.bottom + nav.padding_y,
        alignItems: 'center',
        gap: theme.native.tokens.space.xs,
        borderRightWidth: line.borderWidth,
        ...(line.borderColor && { borderRightColor: line.borderColor })
      }
    })
  }, [theme, nav, barBox, insets.top, insets.left, insets.bottom, railWidth, columnWidth])

  // The toast rides above the bottom bar while the tabs are what is on screen (not under a screen pushed over them).
  useReportBottomBar('tabs', isOnScreen && !rail && !keyboardUp ? barBox.height : 0)

  const countOf = (tab: ShellTab) => {
    if (!tab.counter || (tab.counterVisibility && !themeVisible(theme, tab.counterVisibility))) return undefined
    if (!unread || unread.total <= 0) return undefined
    return {
      text: countLabel(unread),
      detail: unreadMessagesText(t, unread.total, unread.more),
      slot: slots[tab.counter]
    }
  }

  const press = useCallback((route: any, focused: boolean) => () => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
    if (!focused && !event.defaultPrevented) {
      navigation.dispatch({ ...CommonActions.navigate(route.name, route.params), target: state.key })
    }
  }, [navigation, state.key])

  const longPress = useCallback((route: any) => () => {
    navigation.emit({ type: 'tabLongPress', target: route.key })
  }, [navigation])

  // A keyboard over the tabs (a search field) takes the bar away on Android, where the window resizes.
  if (keyboardUp && !rail) return null

  const tabs = (
    <>
      {state.routes.map((route, index) => {
        const tab = SHELL_TABS.find((candidate) => candidate.name === route.name)
        // A route that is not one of the four (a tab another area adds) has no look here: it is not drawn.
        if (!tab || (tab.tabVisibility && !themeVisible(theme, tab.tabVisibility))) return null
        const focused = state.index === index
        const label = t(tab.label.key, tab.label.fallback)
        const count = countOf(tab)
        return (
          <TabBarItem
            key={route.key}
            name={route.name}
            icon={tab.icon}
            label={label}
            accessibilityLabel={count ? `${label}, ${count.detail}` : (descriptors[route.key].options.tabBarAccessibilityLabel ?? label)}
            focused={focused}
            rail={rail}
            labelVisible={showLabels}
            badge={count && { text: count.text, slot: count.slot }}
            onPress={press(route, focused)}
            onLongPress={longPress(route)}
          />
        )
      })}
    </>
  )

  return (
    <View style={rail ? styles.rail : styles.bar} role='tablist' testID={rail ? 'side-rail' : 'tab-bar'}>
      {rail ? tabs : <View style={styles.tabs}>{tabs}</View>}
    </View>
  )
}

export default AppTabBar
