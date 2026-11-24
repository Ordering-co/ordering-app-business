import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { act } from '@testing-library/react-native'

import { Tabs } from '../Tabs'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'

const tabs = [{ key: 'a', text: 'A' }, { key: 'b', text: 'B' }, { key: 'c', text: 'C' }, { key: 'd', text: 'D' }]
const gutter = (defaultAppTheme() as any).native.tokens.layout.page_gutter

describe('Tabs endGutter', () => {
  it('leaves the content of a scrolling row as it was by default', () => {
    const { UNSAFE_getByType } = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} />)
    expect(StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle).paddingEnd).toBeUndefined()
  })

  it('ends the content of a scrolling row with the page gutter, so its last tab clears the screen\'s edge', () => {
    const { UNSAFE_getByType } = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} endGutter />)
    expect(StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle).paddingEnd).toBe(gutter)
  })

  it('shares a filled row as its content plus an equal part of the rest: no label shrinks for its neighbours\' sake', () => {
    const withIds = tabs.map((tab) => ({ ...tab, testID: `tab-${tab.key}` }))
    const { getByTestId } = renderWithProviders(<Tabs tabs={withIds} selected='a' onChange={jest.fn()} fill />)
    const tab = StyleSheet.flatten(getByTestId('tab-a').props.style)
    expect(tab).toMatchObject({ flexGrow: 1, flexShrink: 1, flexBasis: 'auto' })
    expect(tab.flex).toBeUndefined()
  })

  it('does nothing to tabs that share the row', () => {
    const { UNSAFE_queryAllByType } = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} fill endGutter />)
    expect(UNSAFE_queryAllByType(ScrollView)).toHaveLength(0)
  })

  describe('fitFill: share the row when the tabs fit, scroll when they do not', () => {
    const withIds = tabs.map((tab) => ({ ...tab, testID: `tab-${tab.key}` }))
    /** The row has `room` and its tabs take `track` together. */
    const measure = (screen: any, room: number, track: number) => {
      act(() => screen.UNSAFE_getByType(ScrollView).props.onLayout({ nativeEvent: { layout: { width: room + gutter, height: 44 } } }))
      act(() => screen.getByTestId('strip-track').props.onLayout({ nativeEvent: { layout: { width: track, height: 44 } } }))
    }

    it('scrolls (out to the edge) until it is measured, and keeps scrolling when the tabs take more than the row', () => {
      const screen = renderWithProviders(<Tabs tabs={withIds} selected='a' onChange={jest.fn()} fitFill endGutter testID='strip' />)
      expect(StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.style).marginEnd).toBe(-gutter)
      measure(screen, 360, 420)
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(1)
    })

    it('spreads the tabs over the full row when they fit it: each keeps its width and grows into the rest', () => {
      const screen = renderWithProviders(<Tabs tabs={withIds} selected='a' onChange={jest.fn()} fitFill endGutter testID='strip' />)
      measure(screen, 360, 333)
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0)
      expect(StyleSheet.flatten(screen.getByTestId('strip').props.style).width).toBe('100%')
      const tab = StyleSheet.flatten(screen.getByTestId('tab-a').props.style)
      expect(tab.flexGrow).toBe(1)
      expect(tab.flex).toBeUndefined()
    })

    it('does nothing without the prop: the Orders strip keeps scrolling', () => {
      const screen = renderWithProviders(<Tabs tabs={withIds} selected='a' onChange={jest.fn()} endGutter />)
      expect(StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.style).marginEnd).toBeUndefined()
      expect(screen.UNSAFE_getByType(ScrollView).props.onLayout).toBeUndefined()
    })
  })
})
