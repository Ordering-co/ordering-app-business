import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { themeSpace } from '@/theme/helpers'

/**
 * The chips of one filter of the search (OrdersSearch mockup): they wrap onto as many lines as they need, `sm`
 * apart on both axes, so every chip is in sight.
 */
export const ChipRow = ({ children, testID }: { children: React.ReactNode, testID?: string }) => {
  const theme: any = useTheme()
  const styles = useMemo(() => StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: themeSpace(theme, 'sm') },
  }), [theme])
  return <View style={styles.row} testID={testID}>{children}</View>
}
