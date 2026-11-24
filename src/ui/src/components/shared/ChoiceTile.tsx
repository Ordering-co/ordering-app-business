import React, { useMemo } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { useTheme } from 'styled-components/native'
import { nativeBoxStyle, nativeTextStyle, reservedBorder, themeOpacity } from '@/theme/helpers'
import StableText from './StableText'

interface Props {
  /** What the tile says (a brand, a model): it turns semibold when selected, in the room of its semibold copy. */
  children: string
  selected?: boolean
  disabled?: boolean
  onPress?: () => void
  testID?: string
  accessibilityLabel?: string
}

/**
 * A selectable tile: `components.choice` (a box 64 high with a line, a tinted fill and its text in the
 * brand color when selected). The printer's brand and model are drawn with it. A list of choices
 * with a mark is a `ChoiceRow`, not this.
 */
export const ChoiceTile = ({ children, selected = false, disabled = false, onPress, testID, accessibilityLabel }: Props) => {
  const theme: any = useTheme()
  const styles = useMemo(() => {
    const choice = theme.native.components.choice
    const { selected: on, disabled: off } = choice.variants.default.states
    // Every state keeps the widest border's room, so selecting a tile changes its look, never its size.
    const ring = reservedBorder([choice.base, on])
    return StyleSheet.create({
      box: {
        minHeight: choice.base.height,
        borderRadius: choice.base.radius,
        alignItems: 'center',
        justifyContent: 'center',
        ...nativeBoxStyle({ background: choice.base.background, shadow: choice.base.shadow }),
        ...ring(choice.base)
      },
      selected: { ...nativeBoxStyle({ background: on.background }), ...ring(on, choice.base) },
      disabled: { opacity: off.opacity },
      pressed: { opacity: themeOpacity(theme, 'pressed') },
      text: { ...nativeTextStyle(choice.base.text), color: choice.base.color, textAlign: 'center' },
      selectedText: { ...nativeTextStyle(choice.base.selected_text), color: on.color, textAlign: 'center' }
    })
  }, [theme])
  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? children}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.box, selected && styles.selected, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <StableText style={selected ? styles.selectedText : styles.text} weight={selected ? 600 : undefined} reserveWeight={600} numberOfLines={1}>
        {children}
      </StableText>
    </Pressable>
  )
}

export default ChoiceTile
