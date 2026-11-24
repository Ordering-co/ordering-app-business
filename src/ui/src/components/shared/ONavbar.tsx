import React from 'react'
import { StyleSheet, TextStyle, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import OText, { TEXT_SCALE_LIMIT } from './OText'
import { BackButton, closeButtonInset } from './styles'
import { nativeTextStyle, themeGutter, themeSpace, themeTitleAlign } from '@/theme/helpers'

/**
 * A screen's top bar: `components.header` of the theme. The back button (when
 * the screen has somewhere to go back to), the title in the header's text look
 * and, at the end, what the screen puts there (`right`). The screen lays it
 * under the safe-area inset and outside its scroll (a header never scrolls).
 *
 * The bar owns its own room, so every screen has the same: the page gutter on
 * its sides (`layout.page_gutter`) and `sm` under it, between the bar and the
 * first thing of the screen: the 10 that 23 of the 35 mockups put under the 56 bar
 * (harmony H2; it was `md`, 15, on every screen, 5 more than the boards draw). The
 * screens that open with a strip (the orders' tabs, the messages' filters, the printer
 * wizard's steps) pass `tight` and get `xs`, the 5 their boards draw. A screen never adds
 * a space of its own under its bar nor a gutter around it.
 *
 * Every bar is exactly `header.height` tall, with one line of text or two, and
 * what is in it is centered on its middle: the back button, the texts and the
 * actions at the end (laid with `header.gap` between them, whoever passes
 * them, and the back button and the title with the same gap). So the back button sits at the same height on every screen, centered
 * on the bar and on nothing else. The theme's height (56 by default) holds a
 * title with its subtitle; the bar's texts follow the system's font size only
 * as far as the two lines still fit (`textScale`), so no text grows a bar. The
 * skeleton of a bar (`children`) is laid in the same box.
 */
interface Props {
  title?: string
  /** A line under the title (who the chat is with, an order's number). */
  subtitle?: string
  /**
   * What the subtitle ends with and must never lose (the order's time after the store's name): the subtitle gives way to it,
   * with an ellipsis, when the line is short.
   */
  subtitleEnd?: string
  onBack?: () => void
  right?: React.ReactNode
  /**
   * What `right` holds is icon buttons (the order's copy and messages, the orders' refresh and search): the last one's
   * touch box reaches into the gutter, so its glyph, not its box, sits at the bar's end as the back arrow does at its
   * start. Without it the end keeps the gutter (a picture, a badge, a logo).
   */
  rightButtons?: boolean
  /**
   * The title keeps its own width and what is at the end gives way when the bar is short (a pill's text shortens, the buttons
   * keep their size), instead of the title ending in an ellipsis first. The title still ends in one when it alone is wider than the bar.
   */
  titleFirst?: boolean
  /** The screen opens with a strip (tabs, filter chips, steps): the bar leaves `xs` under it instead of `sm`. */
  tight?: boolean
  /** Takes the place of the title and the subtitle (the chat's skeleton: bones where the texts will be). */
  children?: React.ReactNode
  testID?: string
}

const navbarStyles = (theme: any, tight: boolean) => {
  const header = theme.native.components.header.base
  return StyleSheet.create({
    // The bar's room: its sides and the space under it.
    room: {
      width: '100%',
      paddingHorizontal: themeGutter(theme),
      paddingBottom: themeSpace(theme, tight ? 'xs' : 'sm'),
    },
    bar: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      height: header.height,
      gap: header.gap,
    },
    titleBox: { flex: 1 },
    titleFirst: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto', maxWidth: '100%' },
    rightShrinks: { flexShrink: 1, minWidth: 0 },
    title: { ...nativeTextStyle(header.title), color: header.color },
    subtitle: { ...nativeTextStyle(header.subtitle), color: header.subtitle_color },
    subtitleRow: { flexDirection: 'row' },
    subtitleShrinks: { flexShrink: 1 },
    right: { flexDirection: 'row', alignItems: 'center', gap: header.gap },
    rightButtons: { marginRight: -closeButtonInset(theme) },
  })
}

/**
 * How far the bar's texts follow the system's font size: as far as a title with its subtitle still fits the
 * bar's height (never under 1, never over the app's own limit for a text).
 */
export const navbarTextScale = (theme: any) => {
  const header = theme.native.components.header.base
  const lines = nativeTextStyle(header.title).lineHeight + theme.native.tokens.typography.body_sm.lineHeight
  return Math.min(TEXT_SCALE_LIMIT, Math.max(1, Math.floor((header.height / lines) * 100) / 100))
}

const ONavbar = ({ title, subtitle, subtitleEnd, onBack, right, rightButtons = false, titleFirst = false, tight = false, children, testID }: Props) => {
  const theme: any = useTheme()
  const styles = React.useMemo(() => navbarStyles(theme, tight), [theme, tight])
  const textScale = React.useMemo(() => navbarTextScale(theme), [theme])
  // The title aligns as every title of the app (`section_header.base.align`).
  const align: TextStyle = { textAlign: themeTitleAlign(theme) }
  return (
    <View style={styles.room}>
      <View style={styles.bar} testID={testID}>
        {!!onBack && <BackButton onPress={onBack} />}
        <View style={[styles.titleBox, titleFirst && styles.titleFirst]}>
          {children}
          {!children && !!title && <OText style={[styles.title, align]} numberOfLines={1} maxFontSizeMultiplier={textScale}>{title}</OText>}
          {!children && !!subtitle && !subtitleEnd && <OText style={[styles.subtitle, align]} numberOfLines={1} maxFontSizeMultiplier={textScale}>{subtitle}</OText>}
          {!children && !!subtitle && !!subtitleEnd && (
            <View style={styles.subtitleRow}>
              <OText style={[styles.subtitle, styles.subtitleShrinks, align]} numberOfLines={1} maxFontSizeMultiplier={textScale}>{subtitle}</OText>
              <OText style={[styles.subtitle, align]} numberOfLines={1} maxFontSizeMultiplier={textScale}>{` · ${subtitleEnd}`}</OText>
            </View>
          )}
        </View>
        {!!right && <View style={[styles.right, rightButtons && styles.rightButtons, titleFirst && styles.rightShrinks]}>{right}</View>}
      </View>
    </View>
  )
}

export default ONavbar
