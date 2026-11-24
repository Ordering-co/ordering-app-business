import React, { useMemo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import StableText from './StableText'
import Icon from './Icon'
import { nativeBoxStyle, nativeTextStyle, reservedBorder, themeColor, themeControlHeight } from '@/theme/helpers'

interface Props {
  text?: string
  /** A glyph before the text: Ionicons, or `iconSet='mci'` for MaterialCommunityIcons. */
  icon?: string
  iconSet?: 'ion' | 'mci'
  /** A picture before the text (a business type's image), in place of a glyph. */
  leading?: React.ReactNode
  /** Something after the text: a count (`<OBadge count>`), as the Messages' `Unread` chip. */
  trailing?: React.ReactNode
  /** A status dot before the text, in a color role of the theme (`success`, `warning`, `danger`, `primary`…): the store's open state. */
  dot?: string
  selected?: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  onPress?: () => void
  testID?: string
  accessibilityLabel?: string
}

/**
 * A chip of the theme (`components.chip`): the filters, reasons, quick replies and
 * time presets of the screens. `sm` is 36 high (the filter rows), `md` 44; its touch
 * target is at least the `md` control height. Selected turns it tinted, its text
 * semibold (`selected_text`); disabled paints the disabled text color.
 */
export const FilterChip = ({ text, icon, iconSet, leading, trailing, dot, selected, disabled, size = 'md', onPress, testID, accessibilityLabel }: Props) => {
  const theme: any = useTheme()
  const styles = useMemo(() => {
    const chip = theme.native.components.chip
    const states = chip.variants.default.states
    const height = chip.sizes[size].height
    const slop = Math.max(0, (themeControlHeight(theme, 'md') - height) / 2)
    // Every state keeps the widest border's room (see-through where a state has
    // none), so pressing or selecting a chip changes its look, never its size.
    const ring = reservedBorder([chip.base, states.pressed, states.selected])
    return {
      slop: { top: slop, bottom: slop },
      ...StyleSheet.create({
        box: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          paddingHorizontal: chip.sizes[size].padding_x,
          gap: chip.base.gap,
          borderRadius: chip.base.radius,
          ...nativeBoxStyle(chip.base),
          ...ring(chip.base)
        },
        pressed: { ...nativeBoxStyle(states.pressed), ...ring(states.pressed, chip.base) },
        selected: { ...nativeBoxStyle(states.selected), ...ring(states.selected, chip.base) },
        text: { ...nativeTextStyle(chip.base.text), color: chip.base.color, textAlign: 'center' },
        selectedText: { ...nativeTextStyle(chip.base.selected_text), color: states.selected.color },
        disabledText: { color: states.disabled.color },
        dot: { width: chip.base.dot_size, height: chip.base.dot_size, borderRadius: theme.native.tokens.radius.full }
      }),
      color: chip.base.color,
      selectedColor: states.selected.color,
      disabledColor: states.disabled.color
    }
  }, [theme, size])

  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? text}
      hitSlop={styles.slop}
      onPress={onPress}
      style={({ pressed }) => [styles.box, pressed && !disabled && styles.pressed, selected && styles.selected]}
    >
      {leading}
      {!leading && !!dot && <View style={[styles.dot, { backgroundColor: themeColor(theme, dot) }]} testID={testID && `${testID}-dot`} />}
      {!leading && !!icon && <Icon set={iconSet} name={icon} size='sm' color={disabled ? styles.disabledColor : selected ? styles.selectedColor : styles.color} />}
      {!!text && (
        // Semibold when selected, in the room of its semibold copy: selecting changes the look, never the chip's width.
        <StableText style={[styles.text, selected && styles.selectedText, disabled && styles.disabledText]} weight={selected ? 600 : undefined} reserveWeight={600} numberOfLines={1}>
          {text}
        </StableText>
      )}
      {trailing}
    </Pressable>
  )
}
