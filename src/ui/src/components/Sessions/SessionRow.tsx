import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { nativeTextStyle, themePart, themeSpace } from '@/theme/helpers'
import { OText } from '../shared'

interface Props {
  title: string
  subtitle: string
  /** What the row ends with: the "Sign out" button. */
  trailing: React.ReactNode
  testID?: string
}

/**
 * A device of the list (Sessions mockup): the list row's texts, gap and line (`list_row`), with the vertical room of a row that
 * ends with a button: the button's height (`button.sizes.md`) and `space.sm` over and under it, so the row is 64 high where the
 * plain list row (`list_row.base.padding_y`, for rows that end with a glyph) would draw 56.
 */
export const SessionRow = ({ title, subtitle, trailing, testID }: Props) => {
  const theme: any = useTheme()
  const styles = useMemo(() => {
    const row = themePart(theme, 'list_row', 'base')
    const padding = themeSpace(theme, 'sm')
    const button = themePart(theme, 'button', 'sizes.md')
    const height = button.height + padding + padding
    return StyleSheet.create({
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: height,
        paddingVertical: padding,
        gap: row.gap,
        backgroundColor: row.background,
        ...(row.divider && { borderBottomWidth: row.divider.borderWidth, borderBottomColor: row.divider.borderColor })
      },
      texts: { flex: 1, minWidth: 0 },
      title: { ...nativeTextStyle(row.title), color: row.title_color },
      subtitle: { ...nativeTextStyle(row.subtitle), color: row.subtitle_color }
    })
  }, [theme])
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.texts}>
        <OText style={styles.title} numberOfLines={1}>{title}</OText>
        <OText style={styles.subtitle} numberOfLines={2}>{subtitle}</OText>
      </View>
      {trailing}
    </View>
  )
}

export default SessionRow
