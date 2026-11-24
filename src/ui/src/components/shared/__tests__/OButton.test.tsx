import React from 'react'
import { Platform, StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/businessSharedTestSetup')
import OButton from '../OButton'

setupSharedComponentHooks()

describe('OButton', () => {
  it('renders and handles press', () => {
    const onClick = jest.fn()
    const { getByText } = renderWithProviders(
      <OButton text="Continue" testID="continue-btn" onClick={onClick} />
    )
    fireEvent.press(getByText('Continue'))
    expect(onClick).toHaveBeenCalled()
  })

  it('renders disabled and loading states', () => {
    const { getByText } = renderWithProviders(
      <>
        <OButton text="Disabled" disabled />
        <OButton text="Loading" loading appearance="outline" />
      </>
    )
    expect(getByText('Disabled')).toBeTruthy()
    expect(getByText('Loading')).toBeTruthy()
  })

  it.each(['primary', 'secondary', 'danger', 'success', 'neutral', 'inverse'] as const)(
    'renders color %s in every appearance',
    (color) => {
      const { getAllByText } = renderWithProviders(
        <>
          {(['solid', 'outline', 'tonal', 'ghost'] as const).map((appearance) => (
            <OButton key={appearance} text={color} color={color} appearance={appearance} />
          ))}
        </>
      )
      expect(getAllByText(color)).toHaveLength(4)
    }
  )

  it('paints the theme: the size\'s height, the Identity radius and the color\'s fill', () => {
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const theme = defaultAppTheme()
    const { getByTestId } = renderWithProviders(<OButton text="Go" testID="go" size="lg" color="success" />)
    const { StyleSheet } = require('react-native')
    const box = StyleSheet.flatten(getByTestId('go').findByType(require('react-native').View).props.style)
    expect(box.minHeight).toBe(theme.native.components.button.sizes.lg.height)
    expect(box.borderRadius).toBe(theme.native.components.button.base.radius)
    expect(box.backgroundColor).toBe(theme.native.components.button.variants.success.solid.background)
  })

  it('does not press while disabled or loading', () => {
    const onClick = jest.fn()
    const { getByText } = renderWithProviders(
      <>
        <OButton text="Off" disabled onClick={onClick} />
        <OButton text="Busy" loading onClick={onClick} />
      </>
    )
    fireEvent.press(getByText('Off'))
    fireEvent.press(getByText('Busy'))
    expect(onClick).not.toHaveBeenCalled()
  })
  describe('the label of a button that fits its text', () => {
    const theme: any = require('../../../../../theme/engine').defaultAppTheme()
    const sizeLine = theme.native.components.button.sizes.md.text.lineHeight
    let replaced: { restore: () => void } | undefined
    afterEach(() => {
      replaced?.restore()
      replaced = undefined
    })
    const labelOf = (platform: 'android' | 'ios', fitText: boolean) => {
      replaced = jest.replaceProperty(Platform, 'OS', platform)
      const { getByText } = renderWithProviders(<OButton text="Go" fitText={fitText} />)
      const label = getByText('Go')
      return { label, style: StyleSheet.flatten(label.props.style) as any }
    }

    it('has no line height, no font padding and a centered text on Android', () => {
      const { label, style } = labelOf('android', true)
      expect(style.lineHeight).toBeUndefined()
      expect(style.includeFontPadding).toBe(false)
      expect(style.textAlignVertical).toBe('center')
      expect(label.props.adjustsFontSizeToFit).toBe(true)
    })

    it('keeps the size\'s line height on iOS', () => {
      const { style } = labelOf('ios', true)
      expect(sizeLine).toBeGreaterThan(0)
      expect(style.lineHeight).toBe(sizeLine)
      expect(style.includeFontPadding).toBeUndefined()
      expect(style.textAlignVertical).toBeUndefined()
    })

    it.each(['android', 'ios'] as const)('changes nothing without fitText on %s', (platform) => {
      const { label, style } = labelOf(platform, false)
      expect(style.lineHeight).toBe(sizeLine)
      expect(style.includeFontPadding).toBeUndefined()
      expect(style.textAlignVertical).toBeUndefined()
      expect(label.props.adjustsFontSizeToFit).toBeUndefined()
    })
  })
})

// H1 of the harmony review: every neutral outline painted a black line where the fields and the mockups draw `#909090`.
describe('the neutral outline', () => {
  const { defaultAppTheme } = require('../../../../../theme/engine')
  const { tokens } = defaultAppTheme().native
  const box = (view: any, id: string) => StyleSheet.flatten(view.getByTestId(id).children[0].props.style)

  it('draws the field\'s line (border_strong) with the label in the text color', () => {
    const view = renderWithProviders(<OButton text='Cancel' appearance='outline' color='neutral' testID='neutral' />)
    expect(box(view, 'neutral').borderColor).toBe(tokens.color.border_strong)
    expect(box(view, 'neutral').borderColor).toBe('#909090')
    expect(StyleSheet.flatten(view.getByText('Cancel').props.style).color).toBe(tokens.color.text)
  })

  it('leaves the other colors\' outlines in their own ink (the reject button\'s red line)', () => {
    const view = renderWithProviders(<><OButton text='Reject' appearance='outline' color='danger' testID='danger' /><OButton text='Edit' appearance='outline' color='primary' testID='primary' /></>)
    expect(box(view, 'danger').borderColor).not.toBe(tokens.color.border_strong)
    expect(box(view, 'primary').borderColor).not.toBe(tokens.color.border_strong)
  })

  it('does not touch a neutral button that has no outline', () => {
    const view = renderWithProviders(<OButton text='Soft' appearance='tonal' color='neutral' testID='tonal' />)
    expect(box(view, 'tonal').borderColor).toBeUndefined()
  })
})
