import React, { useMemo } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from 'styled-components/native'
import { nativeTextStyle } from '@/theme/helpers'
import Icon from './Icon'
import OText from './OText'

/**
 * A label that is not tapped: `components.badge` (a status, an order type, a
 * count). Its variant is its meaning (decision D4): `primary` pending or in
 * progress, `success`, `warning`, `danger`, `neutral`. The rule of the app: an order status is a solid variant, any
 * other word with a state colour (Paid, Current, Always on, Disabled) is a `*_soft` one, both `md`; `sm` is for counts.
 *
 *   <OBadge variant='success'>{t('COMPLETED', 'Completed')}</OBadge>
 *   <OBadge variant='danger' count>3</OBadge>
 */
/**
 * The order types' colours (`type_*`), by how the order leaves the store: with a driver, collected by the customer, or
 * served in the store. A medium tint with dark text of its hue: stronger than the soft state words (Paid, Unpaid), quieter
 * than a status, which is the only solid chip of a card.
 */
export type OrderTypeBadgeVariant = 'type_delivery' | 'type_pickup' | 'type_in_store'

export type BadgeVariant = 'primary' | 'neutral' | 'inverse' | 'warning' | 'danger' | 'success' | 'primary_soft' | 'success_soft' | 'warning_soft' | 'danger_soft' | OrderTypeBadgeVariant

interface Props {
  variant?: BadgeVariant
  /**
   * `md` (24 high, 12 pt) by default: a word with a state colour (Paid, Current, Always on) is the same pill on every
   * screen. `sm` (20, 10 pt) is the counter's: a `count` badge takes it unless a size is given.
   */
  size?: 'sm' | 'md'
  /** A round count (`shapes.count`). */
  count?: boolean
  /** No box: only the text (and the dot) in the variant's ink, as the store's open line (`shapes.plain`). */
  plain?: boolean
  /** A dot before the text in the variant's own dot color (the `*_soft` variants have one): a live state. */
  dot?: boolean
  /**
   * The text takes as many lines as it needs and the chip grows with it (a status of the order card: its words are the server's and
   * the translations', long ones, and are never cut). Without it the text is one line that ends in an ellipsis.
   */
  wrap?: boolean
  /** A glyph (Ionicons) before the text, in the variant's ink and the icon size `sm` (a preorder's calendar). */
  icon?: string
  children?: React.ReactNode
  style?: ViewStyle
  testID?: string
}

export const OBadge = ({ variant = 'primary', size: sizeProp, count = false, plain = false, dot = false, wrap = false, icon, children, style, testID }: Props) => {
  const theme: any = useTheme()
  const size = sizeProp ?? (count ? 'sm' : 'md')
  const badges = theme.native.components.badge
  const ink: string = (badges.variants[variant] ?? badges.variants.primary).color
  const styles = useMemo(() => {
    const badge = theme.native.components.badge
    const look = badge.variants[variant] ?? badge.variants.primary
    const sized = badge.sizes[size]
    return StyleSheet.create({
      box: {
        alignSelf: 'flex-start',
        // Never wider than the room it is given: a long name (a status from the server) ends in an ellipsis, not past the edge.
        maxWidth: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: badge.base.dot_gap,
        minHeight: sized.height,
        minWidth: plain ? undefined : sized.height,
        // A count keeps its size's side padding (5): `99+` sits inside its pill; a single digit stays a circle (`minWidth`).
        paddingHorizontal: plain ? badge.shapes.plain.padding_x : sized.padding_x,
        borderRadius: count ? badge.shapes.count.radius : badge.base.radius,
        ...(!(plain && !badge.shapes.plain.filled) && { backgroundColor: look.background }),
      },
      // A size may carry its own text (the counter's 10): else the badge's.
      text: { ...nativeTextStyle(sized.text ?? badge.base.text), color: look.color, flexShrink: 1 },
      // A text of several lines: centred, and the box has no room of its own above or below it (a line is as tall as the badge).
      wrapText: { ...nativeTextStyle(sized.text ?? badge.base.text), color: look.color, flexShrink: 1, textAlign: 'center' },
      dot: { width: badge.base.dot_size, height: badge.base.dot_size, borderRadius: theme.native.tokens.radius.full, backgroundColor: look.dot ?? look.color },
    })
  }, [theme, variant, size, count, plain])
  return (
    <View style={[styles.box, style]} testID={testID}>
      {dot && <View style={styles.dot} testID={testID && `${testID}-dot`} />}
      {!!icon && <Icon name={icon} size='sm' color={ink} />}
      <OText style={wrap ? styles.wrapText : styles.text} numberOfLines={wrap ? undefined : 1}>{children}</OText>
    </View>
  )
}

export default OBadge
