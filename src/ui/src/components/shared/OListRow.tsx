import React, { useMemo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { nativeTextStyle, themeColor, themeControlHeight, themeOpacity } from '@/theme/helpers'
import OText from './OText'
import Icon, { type IconSet } from './Icon'
import IconTile from './IconTile'

/**
 * A row of a list or a menu: `components.list_row` (a leading tile, a title,
 * a subtitle and what the row ends with: a chevron when it opens something).
 * Every row is at least `list_row.min_height` (56) high; a row that opens something is the touch target.
 * `icon` draws the row's `tile` slot (an `IconTile`), or with `plain` the glyph alone.
 */
interface Props {
  title: string
  subtitle?: string
  icon?: string
  iconSet?: IconSet
  /** What the row starts with, in place of a glyph (an app's icon, a picture). */
  leading?: React.ReactNode
  /** What the row ends with, in place of the chevron of a row that opens something. */
  trailing?: React.ReactNode
  /**
   * The account pages' look of a row (the profile's lists): the glyph alone (`list_row.icon_size` and `icon_color`, no
   * tile), a height of the control's (`lg`, 50 pt, for a row that opens something; `md`, 44, for one that only says
   * something) in place of `min_height`, and, with something at its end (`trailing`), the title keeps its width and the end
   * gives way. The default is the tile's.
   */
  plain?: boolean
  /** The title's text style when it is not the row's own (`list_row.title`): a typography of the theme, as the account page's `row_title`. */
  titleText?: Record<string, any>
  /** The title in the danger color (log out, delete). */
  danger?: boolean
  /** The title in the muted color: a row that names a field whose value is the row's end (the profile's information). */
  titleMuted?: boolean
  /** A row that opens something ends with a chevron; `false` leaves it out (an action, not a destination). */
  chevron?: boolean
  /** What follows the title on its line, before the row's end (the schedule's "Today" badge). */
  titleEnd?: React.ReactNode
  /** How many lines the title may take (one by default). */
  titleLines?: number
  /** No line under the row (the last one of a list). */
  last?: boolean
  /**
   * A fill for this row in place of the list's (`list_row.base.background`): a row the list marks
   * (the schedule's today). The row paints its own background over whatever is behind it, so a
   * tint put on a wrapper would show only at the sides: it has to be this one.
   */
  background?: string
  onPress?: () => void
  disabled?: boolean
  testID?: string
}

export const OListRow = ({ title, subtitle, icon, iconSet, leading, trailing, plain, titleText, danger, titleMuted, chevron = true, titleEnd, titleLines = 1, last, background, onPress, disabled, testID }: Props) => {
  const theme: any = useTheme()
  const row = theme.native.components.list_row.base
  const tile = theme.native.components.list_row.slots.tile
  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: plain ? themeControlHeight(theme, onPress ? 'lg' : 'md') : row.min_height,
      paddingVertical: row.padding_y,
      gap: row.gap,
      backgroundColor: background ?? row.background,
      ...(!last && row.divider && { borderBottomWidth: row.divider.borderWidth, borderBottomColor: row.divider.borderColor }),
    },
    texts: { flex: 1 },
    // A plain row with something at its end: the title keeps the room it needs and the end gives way (a long value is cut, never the title).
    textsFirst: { flexGrow: 1, flexShrink: 0 },
    titleLine: { flexDirection: 'row', alignItems: 'center', gap: row.gap },
    titleText: { flexShrink: 1 },
    title: { ...nativeTextStyle(titleText ?? row.title), color: danger ? themeColor(theme, 'danger_text') : titleMuted ? themeColor(theme, 'text_muted') : row.title_color },
    subtitle: { ...nativeTextStyle(row.subtitle), color: row.subtitle_color },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    disabled: { opacity: themeOpacity(theme, 'disabled') },
  }), [theme, row, last, danger, titleMuted, background, plain, onPress, titleText])
  const content = (
    <>
      {leading}
      {!leading && !!icon && (plain
        ? <Icon set={iconSet} name={icon} size={row.icon_size} color={danger ? 'danger_text' : row.icon_color} />
        : <IconTile set={iconSet} icon={icon} size={tile.size} variant={tile.variant} />)}
      <View style={plain && trailing ? styles.textsFirst : styles.texts}>
        {titleEnd
          ? (
            <View style={styles.titleLine}>
              <OText style={[styles.title, styles.titleText]} numberOfLines={titleLines}>{title}</OText>
              {titleEnd}
            </View>
          )
          : <OText style={styles.title} numberOfLines={titleLines}>{title}</OText>}
        {!!subtitle && <OText style={styles.subtitle} numberOfLines={2}>{subtitle}</OText>}
      </View>
      {trailing ?? (onPress && chevron ? <Icon name='chevron-forward' size={row.trailing_icon_size} color={row.trailing_color} /> : null)}
    </>
  )
  if (!onPress) return <View style={styles.row} testID={testID}>{content}</View>
  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {content}
    </Pressable>
  )
}

export default OListRow
