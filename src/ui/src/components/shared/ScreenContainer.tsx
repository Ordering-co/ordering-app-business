import React, { useMemo } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from 'styled-components/native'
import { themePart } from '@/theme/helpers'

interface Props {
  children?: React.ReactNode
  style?: ViewStyle
  testID?: string
}

/**
 * A stack screen's content column (`components.screen`): as wide as the window on a phone, and on a
 * tablet no wider than `screen.max_width` (600), centered, the page's background on both sides. The
 * header, the content and the pinned action bar of a screen all go inside it, so they share one column.
 * It fills its parent's height: a screen is `<ScreenContainer>` and what is in it.
 */
export const ScreenContainer = ({ children, style, testID }: Props) => {
  const theme: any = useTheme()
  const maxWidth: number = themePart(theme, 'screen', 'base.max_width')
  const styles = useMemo(() => StyleSheet.create({
    outer: { flex: 1, alignItems: 'center' },
    column: { flex: 1, width: '100%', ...(maxWidth > 0 && { maxWidth }) }
  }), [maxWidth])
  return (
    <View style={styles.outer} testID={testID}>
      <View style={[styles.column, style]}>{children}</View>
    </View>
  )
}

export default ScreenContainer
