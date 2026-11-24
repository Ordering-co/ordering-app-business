import React, { memo, useCallback, useMemo, useRef } from 'react'
import { Animated } from 'react-native'
import { useTheme } from 'styled-components/native'
import { nativeTextStyle, themeColor, themeMotion, themeOpacity, themeSpace } from '@/theme/helpers'
import Icon from '../shared/Icon'
import OBadge from '../shared/OBadge'
import OText from '../shared/OText'
import { BadgeSlot, BarItem, IconBox, ItemContent, RailItem } from './styles'

export interface TabBarItemProps {
  name: string
  icon: string
  label: string
  /** What a screen reader says: the label and the count. */
  accessibilityLabel: string
  focused: boolean
  /** The tab beside the content in a side rail, not in the bottom bar. */
  rail?: boolean
  labelVisible: boolean
  /** The count the tab wears and the slot that paints it (`bottom_nav.slots`), when there is one to show. */
  badge?: { text: string, slot: { size: 'sm' | 'md', variant: any, shape?: string } }
  onPress: () => void
  onLongPress: () => void
  testID?: string
}

/**
 * One tab of the bar or the rail: a glyph at `bottom_nav.icon_size` over its label, in the bar's active or
 * inactive color, with an optional count badge on the glyph's top end (new orders, unread messages). Declared at
 * module level, never inside the navigator: a component type built on every render remounts its icons.
 *
 * A press answers at once (the owner's review, 2026-11-23: "the bottom menu has no animation when tapped"), as the library's own
 * tab button does: the tab dims to the theme's pressed opacity while it is held and comes back over the theme's `base` motion
 * (not at all when the theme turns motion off or the system asks to reduce it), and on Android the touch also spreads a ripple
 * in the theme's `border` grey. Only theme values; the feedback never moves the tab.
 */
export const TabBarItem = memo(({ name, icon, label, accessibilityLabel, focused, rail = false, labelVisible, badge, onPress, onLongPress, testID }: TabBarItemProps) => {
  const theme: any = useTheme()
  const nav = theme.native.components.bottom_nav.base
  const color = focused ? nav.active : nav.inactive
  const Item: any = rail ? RailItem : BarItem
  const dim = themeOpacity(theme, 'pressed')
  const motion = themeMotion(theme, 'base')
  const opacity = useRef(new Animated.Value(1)).current
  const pressIn = useCallback(() => { opacity.stopAnimation(); opacity.setValue(dim) }, [opacity, dim])
  const pressOut = useCallback(() => {
    if (motion.duration === 0) opacity.setValue(1)
    else Animated.timing(opacity, { toValue: 1, duration: motion.duration, easing: motion.easing, useNativeDriver: true }).start()
  }, [opacity, motion.duration, motion.easing])
  const ripple = useMemo(() => ({ color: themeColor(theme, 'border'), borderless: true }), [theme])
  return (
    <Item
      side={nav.item_size}
      role='tab'
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      android_ripple={ripple}
      testID={testID ?? `tab-${name}`}
    >
      <Animated.View style={{ opacity }} testID={`tab-${name}-press`}>
        <ItemContent>
          <IconBox>
            <Icon name={icon} size={nav.icon_size} color={color} />
            {badge && (
              <BadgeSlot top={-themeSpace(theme, 'xs')} left={nav.icon_size - themeSpace(theme, 'xs')}>
                <OBadge
                  variant={badge.slot.variant}
                  size={badge.slot.size}
                  count={badge.slot.shape !== 'plain'}
                  plain={badge.slot.shape === 'plain'}
                  testID={`tab-badge-${name}`}
                >
                  {badge.text}
                </OBadge>
              </BadgeSlot>
            )}
          </IconBox>
          {labelVisible && (
            // The tab you are on is semibold: its cell is fixed, so the heavier label moves nothing.
            <OText style={nativeTextStyle(focused ? nav.active_label : nav.label_text)} color={color} numberOfLines={1} adjustsFontSizeToFit>
              {label}
            </OText>
          )}
        </ItemContent>
      </Animated.View>
    </Item>
  )
})
TabBarItem.displayName = 'TabBarItem'
