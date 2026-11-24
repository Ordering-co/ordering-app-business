import React, { useMemo } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from 'styled-components/native'

interface Props {
  /**
   * `steps`: a segment per step of a flow, the ones reached filled (the printer wizard's "Step 1 of 2");
   * `bar`: one track filled to `value` (the order's preparation time).
   */
  variant?: 'steps' | 'bar'
  /** `steps`: how many segments. */
  steps?: number
  /** `steps`: the step the flow is on (1-based): that many segments are filled. */
  step?: number
  /** `bar`: how full the track is, from 0 to 1. */
  value?: number
  /** The fill's color when it is not the variant's (a bar that runs late turns red): a color role of the theme. */
  fill?: string
  style?: ViewStyle
  testID?: string
}

/**
 * A progress piece (`components.progress`): the segmented step indicator of a wizard, or a single bar. It is
 * not tappable and not a spinner: it says how far something is.
 */
export const OProgress = ({ variant = 'bar', steps = 1, step = 0, value = 0, fill, style, testID }: Props) => {
  const theme: any = useTheme()
  const progress = theme.native.components.progress
  const look = progress.variants[variant]
  const styles = useMemo(() => StyleSheet.create({
    steps: { flexDirection: 'row', gap: look.gap },
    segment: { flex: 1, height: progress.base.height, borderRadius: progress.base.radius, backgroundColor: progress.base.track },
    track: { height: progress.base.height, borderRadius: progress.base.radius, backgroundColor: progress.base.track, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: progress.base.radius }
  }), [progress, look])
  const ink = fill ? (theme.native.tokens.color[fill] ?? fill) : look.fill
  if (variant === 'steps') {
    return (
      <View
        style={[styles.steps, style]}
        testID={testID}
        accessibilityRole='progressbar'
        accessibilityValue={{ min: 0, max: steps, now: Math.min(step, steps) }}
      >
        {Array.from({ length: steps }, (_, index) => (
          <View key={index} style={[styles.segment, index < step && { backgroundColor: ink }]} testID={testID && `${testID}-step-${index + 1}`} />
        ))}
      </View>
    )
  }
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <View
      style={[styles.track, style]}
      testID={testID}
      accessibilityRole='progressbar'
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: ink }]} />
    </View>
  )
}

export default OProgress
