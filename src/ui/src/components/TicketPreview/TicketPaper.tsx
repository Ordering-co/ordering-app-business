import React, { useEffect, useMemo, useState } from 'react'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { nativeBoxStyle, nativeTextStyle, themeColor } from '@/theme/helpers'

/**
 * The first guess of how wide a letter of a fixed-pitch font is, in em, used until the real one is measured: the
 * platforms' fonts are 0.6 (Android's monospace, Courier) to 0.602 (Menlo, iOS) and other devices' differ. The paper
 * never trusts it: it lays a sample of letters out in the real font and reads the width (`SAMPLE`), then checks the
 * ticket's own lines for a wrap and widens its margin until none breaks.
 */
const GUESSED_ADVANCE = 0.62

/** How many letters the hidden sample has: enough to read a width to a fraction of a letter, narrow enough for any screen. */
const SAMPLE = 20

/** What is added over the measured width of the columns (rounding of the font's metrics), and what each wrapped re-check adds. */
const MARGIN = 0.01
const MARGIN_STEP = 0.01
const MAX_STEPS = 8

/** The letters never shrink below this share of the theme's text size: smaller than that the paper scrolls sideways. */
const MIN_SHRINK = 0.75

/**
 * A printer breaks a line longer than its columns at its last column, in the middle of a word (the Star and Epson text of the
 * ticket is longer than the paper by a column or two on some lines: "Full Address: ..." and "Delivery Date: ..."). The paper
 * breaks them the same way, so it shows what the printer prints; left to the text view they would break at a space, which no
 * printer does.
 */
export const wrapAtColumns = (text: string, columns: number): string =>
  columns > 0
    ? text.split('\n').map((line) => {
      const chunks: string[] = []
      for (let at = 0; at < line.length; at += columns) chunks.push(line.slice(at, at + columns))
      return chunks.length ? chunks.join('\n') : line
    }).join('\n')
    : text

interface Props {
  /** The ticket, as the printer prints it: lines already broken at `columns` (a longer one is broken there by the paper). */
  text: string
  /** The printer's columns for this paper (37 / 24 for Star and Epson, 48 / 32 for generic ESC/POS). */
  columns: number
  /** Show only the first lines (the phone's ticket settings): the paper is cut there. */
  maxLines?: number
  testID?: string
}

/**
 * The ticket as it is on the paper (`components.ticket_paper`): the page's grey box with a white sheet in it and the
 * ticket's text in a fixed pitch, at the printer's real width (its column count), so what is read here breaks where
 * the printer breaks. The sheet is as wide as its columns need, and the letters shrink only when the room is smaller,
 * down to a readable minimum; below it the sheet keeps that size and scrolls sideways (the printed text is untouched).
 * The paper is not themed beyond its colors, border and spacing: its letters are the platform's monospace font (the
 * printed ticket imitates a fixed pitch; the catalog's fonts are proportional).
 */
export const TicketPaper = ({ text, columns, maxLines, testID }: Props) => {
  const theme: any = useTheme()
  const paper = theme.native.components.ticket_paper.base
  const [room, setRoom] = useState(0)
  // The measured width of the sample at the theme's size, and how many times a wrapped line made the margin grow.
  const [sample, setSample] = useState(0)
  const [steps, setSteps] = useState(0)
  useEffect(() => setSteps(0), [columns])
  const size: number = paper.text.fontSize
  const line: number = paper.text.lineHeight
  const border = 2 * (paper.paper_border?.borderWidth ?? 0)
  const inner = room - 2 * paper.padding - 2 * paper.paper_padding - border
  const advance = sample > 0 ? sample / (SAMPLE * size) : GUESSED_ADVANCE
  const margin = 1 + MARGIN + steps * MARGIN_STEP
  // The font size that makes `columns` letters fit `inner`, never larger than the theme's text nor below its minimum.
  const minSize = Math.floor(size * MIN_SHRINK * 10) / 10
  const fitSize = Math.floor((inner / (columns * advance * margin)) * 10) / 10
  const fontSize = room > 0 ? Math.max(minSize, Math.min(size, fitSize)) : size
  const lineHeight = Math.round(line * (fontSize / size))
  const sheetWidth = Math.ceil(columns * fontSize * advance * margin) + 2 * paper.paper_padding + border

  const styles = useMemo(() => StyleSheet.create({
    box: {
      alignItems: 'center',
      padding: paper.padding,
      borderRadius: paper.radius,
      ...nativeBoxStyle({ background: paper.background })
    },
    sheet: {
      padding: paper.paper_padding,
      overflow: 'hidden',
      ...nativeBoxStyle({ background: paper.paper_background, border: paper.paper_border })
    },
    scroll: { alignSelf: 'stretch' },
    // The sample is laid out and never seen: out of the flow, drawn at no size (its layout is still measured), and without a say in the paper's width.
    sample: { position: 'absolute', transform: [{ scale: 0 }] },
    text: {
      ...nativeTextStyle(paper.text),
      // THEME-EXCEPTION: the paper's letters are the platform's fixed-pitch font (docs/theme/tokens.md 2.5)
      fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
      color: themeColor(theme, 'text')
    }
  }), [theme, paper])

  const available = room > 0 ? room - 2 * paper.padding : sheetWidth
  const scrolls = room > 0 && fitSize < minSize

  const shown = wrapAtColumns(maxLines ? text.split('\n').slice(0, maxLines).join('\n') : text, columns)

  // A line that broke where the ticket did not (the font is wider than measured) widens the margin and lays out again.
  const expectedLines = shown.split('\n').length
  const checkLines = (event: { nativeEvent: { lines: unknown[] } }) => {
    if (event.nativeEvent.lines.length > expectedLines && steps < MAX_STEPS) setSteps(steps + 1)
  }
  const body = (
    <Text style={[styles.text, { fontSize, lineHeight }]} onTextLayout={checkLines} testID={testID && `${testID}-text`}>{shown}</Text>
  )

  return (
    <View style={styles.box} onLayout={(event) => setRoom(Math.floor(event.nativeEvent.layout.width))} testID={testID}>
      <Text
        style={[styles.text, styles.sample, { fontSize: size }]}
        numberOfLines={1}
        accessibilityElementsHidden
        importantForAccessibility='no-hide-descendants'
        onLayout={(event) => setSample(event.nativeEvent.layout.width)}
        testID={testID && `${testID}-sample`}
      >
        {'0'.repeat(SAMPLE)}
      </Text>
      {scrolls
        ? (
          <ScrollView horizontal showsHorizontalScrollIndicator style={styles.scroll} testID={testID && `${testID}-scroll`}>
            <View style={[styles.sheet, { width: sheetWidth }]}>{body}</View>
          </ScrollView>
          )
        : <View style={[styles.sheet, { width: Math.min(sheetWidth, available) }]}>{body}</View>}
    </View>
  )
}

export default TicketPaper
