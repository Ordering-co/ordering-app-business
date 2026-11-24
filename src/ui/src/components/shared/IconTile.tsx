import React, { useMemo } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from 'styled-components/native'
import Icon, { type IconSet } from './Icon'

/**
 * A glyph on a tinted base: `components.icon_tile` (sizes md 40, lg 44, xl 88; variants brand and
 * neutral; the `round` shape for a disc). The settings rows, the store and printer cards, the
 * sheets' tile, the empty states and the new-order alert all draw this one piece. It is not
 * tappable: the row or card that holds it is.
 *
 *   <IconTile icon='print-outline' />
 *   <IconTile icon='notifications' size='xl' round />
 */
interface Props {
  /** The glyph (Ionicons, or `set='mci'` for the Material Design Icons). */
  icon: string
  set?: IconSet
  size?: 'md' | 'lg' | 'xl'
  variant?: 'brand' | 'neutral'
  /** The disc (`shapes.round`). */
  round?: boolean
  style?: ViewStyle
  testID?: string
}

export const IconTile = ({ icon, set, size = 'md', variant = 'brand', round = false, style, testID }: Props) => {
  const theme: any = useTheme()
  const tile = theme.native.components.icon_tile
  const look = tile.variants[variant]
  const { size: box, icon_size: glyph } = tile.sizes[size]
  const styles = useMemo(() => StyleSheet.create({
    box: {
      width: box,
      height: box,
      borderRadius: round ? tile.shapes.round.radius : tile.base.radius,
      backgroundColor: look.background,
      alignItems: 'center',
      justifyContent: 'center'
    }
  }), [tile, box, look, round])
  return (
    <View style={[styles.box, style]} testID={testID} accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
      <Icon set={set} name={icon} size={glyph} color={look.color} />
    </View>
  )
}

export default IconTile
