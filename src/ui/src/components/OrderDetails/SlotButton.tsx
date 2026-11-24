import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { themeColor, themePart, themeSpace } from '@/theme/helpers'
import { OBadge, OButton } from '../shared'
import { countText } from '../shared/countText'
import type { ButtonAppearance, ButtonColor } from '../shared/OButton'

interface Props {
  /** The look of the button in `components.order_details.slots`: `call` and `messages` are icon buttons, `action` a labelled one. */
  slot: 'call' | 'messages' | 'action'
  icon?: React.ReactNode
  text?: string
  onClick?: () => void
  /** A count over the corner (the unread messages). */
  count?: number
  /** A look in place of the slot's own (a button on a tinted card). */
  appearance?: ButtonAppearance
  color?: ButtonColor
  /** The button stands on a tinted card (the hand-off): a plain surface disc-box under a ghost button, as the mockup draws it. */
  onTint?: boolean
  disabled?: boolean
  loading?: boolean
  testID?: string
  accessibilityLabel?: string
}

/** A button of the order's details in the theme's look for its slot (call, message, or a labelled action). */
export const SlotButton = ({ slot, icon, text, onClick, count = 0, appearance, color, onTint = false, disabled, loading, testID, accessibilityLabel }: Props) => {
  const theme: any = useTheme()
  const look = theme.native.components.order_details.slots[slot]
  const styles = useMemo(() => StyleSheet.create({
    wrap: { alignSelf: 'flex-start' },
    full: { alignSelf: 'stretch' },
    // The white box of a button on a tinted card; the button over it is ghost (its glyph keeps the slot's color).
    tint: { backgroundColor: themeColor(theme, 'background'), borderRadius: themePart(theme, 'button', 'shapes.icon.radius') },
    badge: { position: 'absolute', top: -themeSpace(theme, 'xs'), right: -themeSpace(theme, 'xs') }
  }), [theme])
  const iconOnly = look.shape === 'icon'
  const button = (
    <OButton
      text={iconOnly ? undefined : text}
      icon={icon}
      iconOnly={iconOnly}
      size={look.size}
      appearance={onTint ? 'ghost' : appearance ?? look.appearance}
      color={color ?? look.color}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? (typeof text === 'string' ? text : undefined)}
    />
  )
  return (
    <View style={iconOnly ? styles.wrap : styles.full}>
      {onTint ? <View style={styles.tint}>{button}</View> : button}
      {count > 0 && (
        <View style={styles.badge} pointerEvents='none'>
          <OBadge variant='danger' count size='sm' testID={testID && `${testID}-count`}>{countText(count)}</OBadge>
        </View>
      )}
    </View>
  )
}
