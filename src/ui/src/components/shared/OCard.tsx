import React, { useMemo } from 'react'
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from 'styled-components/native'
import { nativeBoxStyle, nativeTextStyle, themeOpacity, themeSpace } from '@/theme/helpers'
import OText from './OText'

/**
 * A box of content: `components.card` (background, border, radius, shadow and
 * padding), or a component that inherits it (`look`: for example
 * `theme.native.components.order_card.base`). With `onPress` the whole card is
 * the touch target, with the theme's pressed opacity.
 */
interface Props {
  /** The look of a card kind that inherits `card`; `card`'s own by default. */
  look?: Record<string, any>
  /** `tint` (the hand-off card) and `muted` (the time card) are `card.variants`; `default` is the card's own. */
  variant?: 'default' | 'tint' | 'muted'
  /** The card's title (`card.title`): a label over its content. */
  title?: string
  onPress?: () => void
  disabled?: boolean
  children?: React.ReactNode
  style?: ViewStyle
  testID?: string
  accessibilityLabel?: string
}

export const OCard = ({ look, variant = 'default', title, onPress, disabled, children, style, testID, accessibilityLabel }: Props) => {
  const theme: any = useTheme()
  const styles = useMemo(() => {
    const card = theme.native.components.card.base
    const variants = theme.native.components.card.variants
    const own = { ...card, ...(variant !== 'default' ? variants[variant] : {}), ...(look ?? {}) }
    return StyleSheet.create({
      box: {
        borderRadius: own.radius,
        padding: own.padding ?? card.padding,
        gap: themeSpace(theme, 'sm'),
        ...nativeBoxStyle(own),
      },
      title: { ...nativeTextStyle(card.title), color: card.title_color },
      pressed: { opacity: themeOpacity(theme, 'pressed') },
    })
  }, [theme, look, variant])
  const content = (
    <>
      {!!title && <OText style={styles.title}>{title}</OText>}
      {children}
    </>
  )
  if (!onPress) return <View style={[styles.box, style]} testID={testID}>{content}</View>
  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.box, pressed && styles.pressed, style]}
    >
      {content}
    </Pressable>
  )
}

export default OCard
