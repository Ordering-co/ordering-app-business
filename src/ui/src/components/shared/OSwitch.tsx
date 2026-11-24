import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { themeMotion, themeOpacity, themeSpace } from '@/theme/helpers'
import OText from './OText'

/**
 * An on / off switch drawn by the app (`components.switch`): a pill track (44 × 24; green when on,
 * grey when off) with a round thumb, inside a touch box 52 wide and as tall as a control (44). It is
 * the same on both platforms and reads only the theme. Every mockup puts it at the end of a row:
 * a row of its own (`OListRow` with `trailing`), a card, or beside a short label.
 *
 *   <OSwitch value={on} onChange={setOn} accessibilityLabel={t('AVAILABLE', 'Available')} />
 *   <OSwitch value={on} onChange={setOn} label={t('ACCEPTING_ORDERS', 'Accepting orders')} />
 *
 * `label` is the muted caption drawn before the switch, which also names it for a screen reader.
 */
interface Props {
  value: boolean
  onChange: (value: boolean) => void
  /** A caption before the switch (12, muted). */
  label?: string
  disabled?: boolean
  testID?: string
  accessibilityLabel?: string
}

export const OSwitch = ({ value, onChange, label, disabled, testID, accessibilityLabel }: Props) => {
  const theme: any = useTheme()
  const look = theme.native.components.switch.base
  const motion = themeMotion(theme, 'fast')
  const travel = look.track_width - look.thumb_size - 2 * themeSpace(theme, 'xxs')
  const position = useRef(new Animated.Value(value ? 1 : 0)).current

  useEffect(() => {
    if (motion.duration === 0) position.setValue(value ? 1 : 0)
    else Animated.timing(position, { toValue: value ? 1 : 0, duration: motion.duration, easing: motion.easing, useNativeDriver: true }).start()
  }, [value, motion.duration, position, motion.easing])

  const styles = useMemo(() => StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    hit: { width: look.hit_width, height: theme.native.tokens.size.md, justifyContent: 'center', alignItems: 'flex-end' },
    track: {
      width: look.track_width,
      height: look.track_height,
      borderRadius: theme.native.tokens.radius.full,
      padding: themeSpace(theme, 'xxs'),
      justifyContent: 'center'
    },
    thumb: { width: look.thumb_size, height: look.thumb_size, borderRadius: theme.native.tokens.radius.full, backgroundColor: look.thumb },
    disabled: { opacity: themeOpacity(theme, 'disabled') }
  }), [theme, look])

  return (
    <View style={styles.row}>
      {!!label && <OText preset='body_sm' color='text_muted'>{label}</OText>}
      <Pressable
        testID={testID}
        accessibilityRole='switch'
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ checked: value, disabled: !!disabled }}
        disabled={disabled}
        onPress={() => onChange(!value)}
        style={[styles.hit, disabled && styles.disabled]}
      >
        <View style={[styles.track, { backgroundColor: value ? look.on : look.off }]}>
          <Animated.View style={[styles.thumb, { transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) }] }]} />
        </View>
      </Pressable>
    </View>
  )
}

export default OSwitch
