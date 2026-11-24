import React from 'react'
import { StyleSheet } from 'react-native'

import { Tabs } from '../Tabs'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const strip = [
  { key: 'a', text: 'New', testID: 'tab-a' },
  { key: 'b', text: 'In progress', testID: 'tab-b' },
  { key: 'c', text: 'History', testID: 'tab-c' }
]

/** What decides a tab's width: its own style (a tab is its label; there is no counter to make room for). */
const layoutOf = (screen: any, id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style)

const render = (selected: string, platform: 'phone' | 'tablet' = 'phone') =>
  renderWithProviders(<Tabs fill size='sm' tabs={strip} selected={selected} onChange={jest.fn()} />, { platform })

describe('Tabs: the selection never changes a tab\'s width', () => {
  it('selecting another tab changes colors only: every tab keeps its width-bearing style', () => {
    const widthBearing = (tab: any) => ({ ...tab, backgroundColor: undefined })
    const first = render('a')
    const second = render('b')
    for (const id of ['tab-a', 'tab-b', 'tab-c']) {
      expect(widthBearing(layoutOf(first, id))).toEqual(widthBearing(layoutOf(second, id)))
    }
  })

  it.each(['phone', 'tablet'] as const)('draws no counter and keeps no room for one (%s)', (platform) => {
    const screen = render('a', platform)
    for (const id of ['tab-a', 'tab-b', 'tab-c']) {
      expect(screen.queryByTestId(`${id}-count`)).toBeNull()
      expect(screen.queryByTestId(`${id}-slot`, { includeHiddenElements: true })).toBeNull()
    }
  })
})
