import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@ui', () => {
  const OText = require('@/ui/src/components/shared/OText').default
  return { OText }
})

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/businessSharedTestSetup')
import ONavbar, { navbarTextScale } from '../ONavbar'
import { defaultAppTheme } from '../../../../../theme/engine'

setupSharedComponentHooks()

describe('ONavbar', () => {
  it('renders title and back action', () => {
    const onBack = jest.fn()
    const { getByText, getByLabelText } = renderWithProviders(
      <ONavbar title="Orders" onBack={onBack} />
    )
    expect(getByText('Orders')).toBeTruthy()
    fireEvent.press(getByLabelText('Go back'))
    expect(onBack).toHaveBeenCalled()
  })

  describe('the room it owns (decision H8: one rule for every screen)', () => {
    const theme: any = defaultAppTheme()
    const flat = (node: any) => StyleSheet.flatten(node.props.style)
    /** The first ancestor of a node that sets a style key (its own box, past the text components in between). */
    const boxOf = (node: any, key: string) => {
      for (let up = node.parent; up; up = up.parent) if (up.props?.style && flat(up)?.[key] !== undefined) return up
      throw new Error(`no ancestor sets ${key}`)
    }
    /** The room: the first ancestor of the bar with a padding under it. */
    const roomOf = (bar: any) => {
      for (let up = bar.parent; up; up = up.parent) if (up.props?.style && flat(up)?.paddingBottom !== undefined) return flat(up)
      return {} as any
    }

    it('carries the page gutter on its sides and `sm` under the bar (the 10 the mockups draw), so a screen adds neither', () => {
      const { getByTestId } = renderWithProviders(<ONavbar title='Orders' testID='bar' />)
      // The room is the bar's parent: its sides and the space between the bar and what follows.
      const room = roomOf(getByTestId('bar'))
      expect(room.paddingHorizontal).toBe(theme.native.tokens.layout.page_gutter)
      expect(room.paddingBottom).toBe(theme.native.tokens.space.sm)
      expect(room.paddingBottom).toBe(10)
      // The bar itself is the header's height, without the space under it.
      expect(flat(getByTestId('bar')).height).toBe(theme.native.components.header.base.height)
    })

    it('is the same room with a back arrow, a subtitle and actions at the end', () => {
      const { getByTestId, getByText } = renderWithProviders(
        <ONavbar title='Chat' subtitle='Business' onBack={jest.fn()} right={<Text>actions</Text>} testID='bar' />
      )
      expect(roomOf(getByTestId('bar')).paddingBottom).toBe(theme.native.tokens.space.sm)
      expect(getByText('Business')).toBeTruthy()
      expect(getByText('actions')).toBeTruthy()
    })

    it('lets the subtitle give way to its end (the store\'s name to the time), never the end to the subtitle', () => {
      const { getByText } = renderWithProviders(<ONavbar title='Order #1' subtitle='A very long store name' subtitleEnd='ready 09:58 PM' />)
      const name = flat(getByText('A very long store name'))
      expect(name.flexShrink).toBe(1)
      expect(getByText('A very long store name').props.numberOfLines).toBe(1)
      expect(flat(getByText(' · ready 09:58 PM')).flexShrink).toBeUndefined()
    })

    // Main, Messages, OrdersInProgress/History, the printer wizard and the board open with a strip, 5 under the bar.
    it('leaves `xs` (5) under the bar for a screen that opens with a strip, as the boards draw it', () => {
      const { getByTestId } = renderWithProviders(<ONavbar title='Orders' tight testID='bar' />)
      expect(roomOf(getByTestId('bar')).paddingBottom).toBe(theme.native.tokens.space.xs)
      expect(roomOf(getByTestId('bar')).paddingBottom).toBe(5)
    })

    it('is exactly `header.height` tall with one line or two, and everything is centered on its middle', () => {
      const header = theme.native.components.header.base
      const one = renderWithProviders(<ONavbar title='Orders' testID='bar' />)
      const two = renderWithProviders(<ONavbar title='Store' subtitle='Business' onBack={jest.fn()} testID='bar' />)
      ;[one, two].forEach(({ getByTestId }) => {
        expect(flat(getByTestId('bar')).height).toBe(header.height)
        expect(flat(getByTestId('bar')).minHeight).toBeUndefined()
        expect(flat(getByTestId('bar')).alignItems).toBe('center')
      })
      // The texts bring no room of their own: the bar's height centers them, as it centers the back button.
      const box = boxOf(two.getByText('Store'), 'flex')
      expect(flat(box).paddingVertical).toBeUndefined()
      expect(boxOf(two.getByText('Business'), 'flex')).toBe(box)
    })

    it('holds a title with its subtitle in the build\'s height, and no system font size grows the bar', () => {
      const header = theme.native.components.header.base
      const lines = header.title.lineHeight + theme.native.tokens.typography.body_sm.lineHeight
      expect(lines).toBeLessThanOrEqual(header.height)
      const scale = navbarTextScale(theme)
      expect(scale).toBeGreaterThanOrEqual(1)
      expect(scale).toBeLessThanOrEqual(1.3)
      expect(lines * scale).toBeLessThanOrEqual(header.height)
      const { getByText } = renderWithProviders(<ONavbar title='Store' subtitle='Business' />)
      expect(getByText('Store').props.maxFontSizeMultiplier).toBe(scale)
      expect(getByText('Business').props.maxFontSizeMultiplier).toBe(scale)
      // A theme with a bar too low for two lines never shrinks a text under the system's size.
      const low = { native: { ...theme.native, components: { ...theme.native.components, header: { base: { ...header, height: lines - 1 } } } } }
      expect(navbarTextScale(low)).toBe(1)
    })

    it('lays its texts in the same box with a title or with a skeleton\'s bones', () => {
      const text = renderWithProviders(<ONavbar title='Store' subtitle='Business' />)
      const bones = renderWithProviders(<ONavbar><Text>bone</Text></ONavbar>)
      expect(flat(boxOf(bones.getByText('bone'), 'flex'))).toEqual(flat(boxOf(text.getByText('Store'), 'flex')))
    })

    it('lays the actions at its end `header.gap` apart, whoever passes them', () => {
      const header = theme.native.components.header.base
      const { getByText } = renderWithProviders(
        <ONavbar title='Orders' right={<><Text>one</Text><Text>two</Text></>} />
      )
      const actions = boxOf(getByText('one'), 'gap')
      expect(flat(actions).flexDirection).toBe('row')
      expect(flat(actions).gap).toBe(header.gap)
      expect(boxOf(getByText('two'), 'gap')).toBe(actions)
    })

    it('draws what it is given in place of the title (a skeleton\'s bones)', () => {
      const { getByText, queryByText } = renderWithProviders(
        <ONavbar title='Hidden' subtitle='Hidden too'><Text>bones</Text></ONavbar>
      )
      expect(getByText('bones')).toBeTruthy()
      expect(queryByText('Hidden')).toBeNull()
      expect(queryByText('Hidden too')).toBeNull()
    })
  })
})
