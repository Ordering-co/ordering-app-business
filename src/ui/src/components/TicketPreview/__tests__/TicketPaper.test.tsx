import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { TicketPaper, wrapAtColumns } from '../TicketPaper'

const lay = (view: any, width: number) => fireEvent(view.getByTestId('paper'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 100 } } })
const sizeOf = (view: any) => StyleSheet.flatten(view.getByTestId('paper-text').props.style).fontSize

describe('the ticket paper', () => {
  it('shows the ticket text as it is', () => {
    const text = 'Order No. 1053\n------\nTOTAL      $32.37'
    const view = renderWithProviders(<TicketPaper testID='paper' text={text} columns={37} />)
    expect(view.getByTestId('paper-text').props.children).toBe(text)
  })

  it('breaks a line longer than the columns at the last column, as the printer does, not at a space', () => {
    // "Full Address: " (14) + a 24-letter piece: the ticket text is one column over a 37-column paper.
    const long = 'Full Address: 350 5th Ave, New York, N'
    expect(long.length).toBe(38)
    expect(wrapAtColumns(long, 37)).toBe('Full Address: 350 5th Ave, New York, \nN')
    expect(wrapAtColumns('short\n\nline', 37)).toBe('short\n\nline')
    expect(wrapAtColumns('x'.repeat(74), 37)).toBe(`${'x'.repeat(37)}\n${'x'.repeat(37)}`)
    const view = renderWithProviders(<TicketPaper testID='paper' text={`${long}\nTotal`} columns={37} />)
    expect(view.getByTestId('paper-text').props.children).toBe('Full Address: 350 5th Ave, New York, \nN\nTotal')
  })

  it('keeps the theme\'s letter size while the columns fit, and shrinks the letters to fit a narrow room', () => {
    const view = renderWithProviders(<TicketPaper testID='paper' text='x' columns={37} />)
    lay(view, 390)
    const roomy = sizeOf(view)
    view.unmount()
    const narrow = renderWithProviders(<TicketPaper testID='paper' text='x' columns={48} />)
    lay(narrow, 300)
    expect(sizeOf(narrow)).toBeLessThan(roomy)
  })

  it('draws a 58 mm ticket on a narrower sheet than an 80 mm one', () => {
    const wide = renderWithProviders(<TicketPaper testID='paper' text='x' columns={48} />)
    lay(wide, 600)
    const wideWidth = StyleSheet.flatten(wide.getByTestId('paper').children[1].props.style).width
    wide.unmount()
    const thin = renderWithProviders(<TicketPaper testID='paper' text='x' columns={32} />)
    lay(thin, 600)
    expect(StyleSheet.flatten(thin.getByTestId('paper').children[1].props.style).width).toBeLessThan(wideWidth)
  })

  it('leaves room for the widest real fixed-pitch letter (Menlo 0.602 em): a full line of 37 columns never wraps', () => {
    const view = renderWithProviders(<TicketPaper testID='paper' text='x' columns={37} />)
    lay(view, 362)
    const sheet = StyleSheet.flatten(view.getByTestId('paper').children[1].props.style)
    const letters = 37 * sizeOf(view) * 0.602
    // The sheet's inner width (without its padding and border) holds the 37 letters, with the margin the iOS pass missed.
    expect(sheet.width - 2 * sheet.padding - 2 * (sheet.borderWidth ?? 0)).toBeGreaterThan(letters + 1)
    expect(view.queryByTestId('paper-scroll')).toBeNull()
  })

  it('keeps a readable letter size on a narrow room and scrolls the sheet sideways instead of shrinking further', () => {
    const roomy = renderWithProviders(<TicketPaper testID='paper' text='x' columns={48} />)
    lay(roomy, 390)
    const base = sizeOf(roomy)
    roomy.unmount()
    const view = renderWithProviders(<TicketPaper testID='paper' text='x' columns={48} />)
    lay(view, 200)
    expect(view.getByTestId('paper-scroll')).toBeTruthy()
    // Never below three quarters of the size it has when it fits, and never above it.
    expect(sizeOf(view)).toBeGreaterThanOrEqual(base * 0.75 - 0.1)
    expect(sizeOf(view)).toBeLessThanOrEqual(base)
  })

  it('measures the font instead of assuming it: a wider font (Android\'s) gets a smaller size for the same columns, a narrower one a larger', () => {
    const measure = (view: any, em: number) => fireEvent(view.getByTestId('paper-sample', { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 20 * 12 * em, height: 20 } } })
    const wide = renderWithProviders(<TicketPaper testID='paper' text='x' columns={37} />)
    lay(wide, 330)
    measure(wide, 0.66)
    const wideSize = sizeOf(wide)
    wide.unmount()
    const narrow = renderWithProviders(<TicketPaper testID='paper' text='x' columns={37} />)
    lay(narrow, 330)
    measure(narrow, 0.55)
    expect(sizeOf(narrow)).toBeGreaterThan(wideSize)
  })

  it('widens its margin when a line of the ticket still wraps (re-checks the real layout)', () => {
    const view = renderWithProviders(<TicketPaper testID='paper' text={'a\nb'} columns={48} />)
    lay(view, 600)
    const before = StyleSheet.flatten(view.getByTestId('paper').children[1].props.style).width
    fireEvent(view.getByTestId('paper-text'), 'textLayout', { nativeEvent: { lines: [{}, {}, {}] } })
    expect(StyleSheet.flatten(view.getByTestId('paper').children[1].props.style).width).toBeGreaterThan(before)
  })

  it('hides its measuring sample from the screen readers', () => {
    const view = renderWithProviders(<TicketPaper testID='paper' text='x' columns={37} />)
    expect(view.getByTestId('paper-sample', { includeHiddenElements: true }).props.importantForAccessibility).toBe('no-hide-descendants')
  })

  it('cuts the paper after the lines it is asked to show', () => {
    const view = renderWithProviders(<TicketPaper testID='paper' text={'a\nb\nc\nd'} columns={37} maxLines={2} />)
    expect(view.getByTestId('paper-text').props.children).toBe('a\nb')
  })
})
