import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { Icon, OListRow, OText } from '../shared'
import { CardRow } from './RowsCard'
import { themePart } from '@/theme/helpers'

interface Props {
  title: string
  /** What the row says now (the language, the printers, the version): muted, before the chevron. */
  value?: string
  icon?: string
  /** The row opens something: a chevron ends it. */
  onPress?: () => void
  /** The title and the glyph in the danger color. */
  danger?: boolean
  /**
   * An information row (Profile): the field's name is muted and its value is the row's own text, in the body size and
   * color; an account row names the destination in the text color and its value, small, muted.
   */
  information?: boolean
  /** No chevron on a row that acts (log out) instead of opening a screen. */
  chevron?: boolean
  disabled?: boolean
  testID?: string
}

/**
 * A row of the account page's lists (`RowsCard`): the app's list row (`components.list_row`) in its plain look (the glyph
 * alone, no tile) with the value it shows at its end, in the muted metadata look (an `information` row inverts it: the name
 * muted, the value in the text color), ahead of the chevron of a row that opens something. The list draws the line between
 * rows, so a row never draws its own. The value gives way to the title: a long one is cut, never the title. The title is
 * the account page's `row_title` (the body weight, as the driver app's rows; the owner's choice of 2026-11-23), not the list
 * row's own semibold one, which the other screens keep.
 */
export const ProfileRow = ({ title, value, icon, onPress, danger, information, chevron = true, disabled, testID }: Props) => {
  const theme: any = useTheme()
  const row = themePart(theme, 'list_row', 'base')
  const rowTitle = themePart(theme, 'account_page', 'base.row_title')
  const styles = useMemo(() => StyleSheet.create({
    end: { flexDirection: 'row', alignItems: 'center', gap: row.gap, flexShrink: 1, maxWidth: '60%' },
    value: { flexShrink: 1, textAlign: 'right' },
  }), [row.gap])
  return (
    <CardRow>
      <OListRow
        plain
        titleText={rowTitle}
        last
        testID={testID}
        title={title}
        icon={icon}
        danger={danger}
        titleMuted={information}
        chevron={chevron}
        disabled={disabled}
        onPress={onPress}
        trailing={value ? (
          <View style={styles.end}>
            {information
              ? <OText preset='body' style={styles.value} numberOfLines={1}>{value}</OText>
              : <OText preset='body_sm' color='text_muted' style={styles.value} numberOfLines={1}>{value}</OText>}
            {!!onPress && chevron && <Icon name='chevron-forward' size={row.trailing_icon_size} color='text_muted' />}
          </View>
        ) : undefined}
      />
    </CardRow>
  )
}
