import React from 'react'
import { StyleSheet, TextStyle, View, ViewStyle } from 'react-native'
import OText from './OText'

interface Props {
  children: React.ReactNode
  /** The text look (a component's `text`), the same in both states. */
  style?: TextStyle | Array<TextStyle | false | null | undefined>
  /** The weight shown now (the selected one, or none for the look's own). */
  weight?: number | string
  /** The heaviest weight the text takes (its selected state): its room is kept. */
  reserveWeight: number | string
  color?: string
  numberOfLines?: number
  boxStyle?: ViewStyle
  /**
   * A one-line label in a cell of a fixed width (the five buttons of a scale, a choice tile): shrinks to fit its line
   * (down to `FIT_MINIMUM_SCALE`) instead of ending in an ellipsis when its translation is longer than the cell, or
   * when the cell is a hair narrower than the glyphs (the "Goo..." of the review's scale, "Other (ESC/P..." of the
   * printer's tiles). On by default for a label with `numberOfLines`; a chip that hugs its text is never narrower than it.
   */
  fit?: boolean
}

/** How far a label that `fit`s shrinks before it is cut. */
const FIT_MINIMUM_SCALE = 0.75

// Layout only (no theme values): safe at module level.
const layout = StyleSheet.create({
  hidden: { opacity: 0 },
  shown: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center' }
})

/**
 * A label whose weight changes with its state (a selected tab or category is
 * bold) without moving anything: a hidden copy at the heaviest weight keeps
 * its width and height, and the label is drawn over it. Selecting changes the
 * look, never the layout.
 */
export const StableText = ({ children, style, weight, reserveWeight, color, numberOfLines, boxStyle, fit = numberOfLines !== undefined }: Props) => {
  const shrink = fit ? { adjustsFontSizeToFit: true, minimumFontScale: FIT_MINIMUM_SCALE } : {}
  return (
  <View style={boxStyle}>
    <OText
      style={[style, layout.hidden] as any}
      weight={reserveWeight}
      color={color}
      numberOfLines={numberOfLines}
      {...shrink}
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
    >
      {children}
    </OText>
    <View style={layout.shown} pointerEvents='none'>
      <OText style={style} weight={weight} color={color} numberOfLines={numberOfLines} {...shrink}>
        {children}
      </OText>
    </View>
  </View>
  )
}

export default StableText
