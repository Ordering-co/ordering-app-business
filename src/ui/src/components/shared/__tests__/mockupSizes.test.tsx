import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { Tabs } from '../Tabs'
import { FilterChip } from '../FilterChip'
import OButton from '../OButton'
import OFab from '../OFab'
import Icon from '../Icon'
import { nativeTextStyle } from '@/theme/helpers'

const flat = (node: any) => StyleSheet.flatten(node.props.style)
const tabs = [{ key: 'a', text: 'Pending' }, { key: 'b', text: 'Done' }]
const themed = (values: any): any => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })

describe('the sizes the mockups draw', () => {
  const { components, tokens } = defaultAppTheme().native

  // The orders strip: the mockups drew a pill of 46 holding 36 tabs with a 12 label; the owner raised it on 2026-11-23 (schema
  // 1.1.0) to a pill of 50 holding 40 tabs with the body size, 14. Still 5 inside it and 5 apart.
  it('Tabs: the orders strip is a 50 pill (5 inside) holding 40 tabs, 5 apart, its label 14', () => {
    const { getByTestId, getAllByRole } = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} fill size='sm' testID='tabs' />)
    const inset = components.tabs.variants.pill.inset
    expect(inset).toBe(5)
    expect(components.tabs.sizes.sm.height).toBe(50)
    expect(nativeTextStyle(components.tabs.base.text).fontSize).toBe(14)
    expect(flat(getAllByRole('tab')[0]).minHeight).toBe(40)
    const track = flat(getByTestId('tabs'))
    expect(track.padding).toBe(inset)
    expect(track.gap).toBe(5)
    expect(flat(getAllByRole('tab')[0]).minHeight + 2 * track.padding).toBe(50)
  })

  it('Tabs: the size\'s height is the whole bar, so each size\'s tab sits in its track, a tab never under 36', () => {
    const { getByTestId, getAllByRole } = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} fill testID='tabs' />)
    const inset = components.tabs.variants.pill.inset
    expect(flat(getAllByRole('tab')[0]).minHeight).toBe(components.tabs.sizes.md.height - 2 * inset)
    expect(flat(getByTestId('tabs')).padding).toBe(inset)
    for (const size of ['sm', 'md', 'lg']) expect(components.tabs.sizes[size].height - 2 * inset).toBeGreaterThanOrEqual(36)
  })

  it('Tabs: a variant with no inset keeps the whole height on its tabs', () => {
    const { getAllByRole } = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} variant='underline' />)
    expect(flat(getAllByRole('tab')[0]).minHeight).toBe(components.tabs.sizes.md.height)
  })

  it('Tabs: a theme that sets a bigger inset makes the tab lower, never the bar higher', () => {
    const theme = themed({ components: { tabs: { variants: { pill: { inset: 10 } } } } })
    const { getByTestId, getAllByRole } = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} fill testID='tabs' />, { themeOverrides: theme })
    const tab = flat(getAllByRole('tab')[0]).minHeight
    expect(tab + 2 * flat(getByTestId('tabs')).padding).toBe(theme.native.components.tabs.sizes.md.height)
  })

  it('FilterChip: 44 high by default, and a screen can still ask for a smaller one', () => {
    const { getAllByRole } = renderWithProviders(<><FilterChip text='Today' /><FilterChip text='Small' size='sm' /></>)
    expect(flat(getAllByRole('button')[0]).height).toBe(components.chip.sizes.md.height)
    expect(flat(getAllByRole('button')[0]).height).toBe(44)
    expect(flat(getAllByRole('button')[1]).height).toBe(components.chip.sizes.sm.height)
  })

  it('FilterChip: draws what it is given after the text (a count), inside the same button', () => {
    const { getByRole, getByText } = renderWithProviders(<FilterChip text='Unread' trailing={<Text>2</Text>} />)
    expect(getByRole('button')).toContainElement(getByText('2'))
    expect(getByText('Unread')).toBeTruthy()
  })

  it('OButton: an icon-only button is round only when it says so', () => {
    const icon = <Icon name='send' />
    const { getByLabelText } = renderWithProviders(
      <>
        <OButton iconOnly accessibilityLabel='square' icon={icon} />
        <OButton iconOnly round accessibilityLabel='round' icon={icon} />
        <OButton text='Text' round accessibilityLabel='text' />
      </>
    )
    const radius = (label: string) => flat(getByLabelText(label).children[0]).borderRadius
    expect(radius('square')).toBe(components.button.shapes.icon.radius)
    expect(radius('round')).toBe(components.button.shapes.round.radius)
    expect(radius('round')).toBe(tokens.radius.full)
    // A button with a label that asks for `round` gets fully round ends (a pill), and keeps its own width.
    expect(radius('text')).toBe(components.button.shapes.round.radius)
    expect(flat(getByLabelText('text').children[0]).width).toBeUndefined()
  })

  it('OButton: a labelled button keeps its own corner unless it asks to be round', () => {
    const { getByLabelText } = renderWithProviders(<OButton text='Text' accessibilityLabel='plain' />)
    expect(flat(getByLabelText('plain').children[0]).borderRadius).toBe(components.button.base.radius)
  })

  it('OFab: keeps the map\'s floating shadow although Identity is flat', () => {
    const { getByRole } = renderWithProviders(<OFab iconName='locate' onPress={jest.fn()} />)
    // The shadow is the disc's (the opaque white box under the ghost button), two levels over the button's own box.
    let box: any = getByRole('button')
    while (box && flat(box)?.shadowOpacity === undefined) box = box.parent
    box = flat(box)
    expect(box.shadowOpacity).toBe(components.map_marker.base.shadow.shadowOpacity)
    expect(box.shadowOpacity).toBeGreaterThan(0)
  })
})
