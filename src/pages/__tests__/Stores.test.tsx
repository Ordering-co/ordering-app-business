import React from 'react'
import { Platform } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

// The window decides the layout (`useLayout`): a landscape tablet has two panes.
let mockLandscapeTablet = false
jest.mock('@/theme/platform', () => ({
  ...jest.requireActual('@/theme/platform'),
  useLayout: () => ({ landscapeTablet: mockLandscapeTablet, height: 800 })
}))

jest.mock('@ui', () => {
  const React = require('react')
  const { View, Text, TouchableOpacity } = require('react-native')
  const base = require('../../../jest/helpers/mockUi')
  const stub = (testID: string) => (props: any) => React.createElement(View, { testID }, props.children)
  return {
    ...base,
    ScreenContainer: stub('screen-container'),
    OBottomPopup: ({ title, onClose, children }: any) => React.createElement(View, { testID: 'options-sheet' },
      React.createElement(Text, { testID: 'options-sheet-title' }, title),
      React.createElement(TouchableOpacity, { testID: 'options-sheet-close', onPress: onClose }),
      children),
    PaneLayout: ({ list, detail, testID }: any) => React.createElement(View, { testID },
      React.createElement(View, { testID: 'pane-list' }, list),
      React.createElement(View, { testID: 'pane-detail' }, detail)),
    StoresList: (props: any) => React.createElement(View, { testID: 'stores-list' },
      React.createElement(Text, { testID: 'stores-list-props' }, JSON.stringify({
        asDashboard: props.asDashboard,
        forceSearch: props.isForceSearch,
        propsToFetch: props.propsToFetch,
        paginationSettings: props.paginationSettings,
        orderBy: props.initialFilterKey,
        selected: props.selectedSlug,
        panes: typeof props.onSelectStore === 'function'
      })),
      React.createElement(TouchableOpacity, { testID: 'select-store', onPress: () => props.onSelectStore?.({ id: 2, slug: 'green-bowl', name: 'Green Bowl' }) })),
    BusinessProductList: (props: any) => React.createElement(View, { testID: 'menu-pane' },
      React.createElement(Text, { testID: 'menu-pane-slug' }, props.slug),
      React.createElement(Text, { testID: 'menu-pane-embedded' }, String(!!props.embedded)),
      React.createElement(TouchableOpacity, { testID: 'menu-pane-open', onPress: () => props.onOpenProduct?.({ businessId: 2, categoryId: 20, productId: 200, productName: 'Fries' }) })),
    SelectStore: () => React.createElement(Text, { testID: 'select-a-store' }, 'Select a store'),
    StoreProductOptions: (props: any) => React.createElement(Text, { testID: 'options-in-sheet' }, `${props.variant}:${props.productId}`)
  }
})

import Stores from '../Stores'

const listProps = (getByTestId: any) => JSON.parse(getByTestId('stores-list-props').props.children)

describe('Stores', () => {
  beforeEach(() => { mockLandscapeTablet = false })

  it('is the stores list in the phone\'s column, asked as the dashboard with the fields a store\'s state needs', () => {
    Platform.OS = 'ios'
    const { getByTestId, queryByTestId } = renderPage(Stores)
    expect(getByTestId('safe-area-layout')).toBeTruthy()
    expect(getByTestId('screen-container')).toBeTruthy()
    expect(queryByTestId('stores-panes')).toBeNull()
    const props = listProps(getByTestId)
    expect(props.asDashboard).toBe(true)
    expect(props.propsToFetch).toEqual(expect.arrayContaining(['id', 'name', 'logo', 'address', 'zipcode', 'enabled', 'slug', 'open', 'schedule', 'timezone', 'snooze_until']))
    expect(props.panes).toBe(false)
  })

  it('asks twenty a page, infinite, and does not ask for an order the controller would overwrite', () => {
    const { getByTestId } = renderPage(Stores)
    const props = listProps(getByTestId)
    expect(props.paginationSettings).toEqual({ controlType: 'infinity', initialPage: 1, pageSize: 20 })
    expect(props.orderBy).toBeUndefined()
  })

  it('forces the search text as it is on iOS, not on Android', () => {
    Platform.OS = 'ios'
    expect(listProps(renderPage(Stores).getByTestId).forceSearch).toBe(true)
    Platform.OS = 'android'
    expect(listProps(renderPage(Stores).getByTestId).forceSearch).toBe(false)
  })

  describe('a landscape tablet', () => {
    beforeEach(() => { mockLandscapeTablet = true })

    it('has the list and the menu of the selected store side by side', () => {
      const { getByTestId, queryByTestId } = renderPage(Stores)
      expect(getByTestId('stores-panes')).toBeTruthy()
      expect(listProps(getByTestId).panes).toBe(true)
      expect(queryByTestId('menu-pane')).toBeNull()
      // Nothing selected: the pane says so (never a blank pane), and the menu replaces it.
      expect(getByTestId('select-a-store')).toBeTruthy()
      fireEvent.press(getByTestId('select-store'))
      expect(queryByTestId('select-a-store')).toBeNull()
      expect(getByTestId('menu-pane-slug').props.children).toBe('green-bowl')
      expect(getByTestId('menu-pane-embedded').props.children).toBe('true')
      expect(listProps(getByTestId).selected).toBe('green-bowl')
    })

    it('opens a product\'s options as a sheet over the menu, and closes it', () => {
      const { getByTestId, queryByTestId } = renderPage(Stores)
      fireEvent.press(getByTestId('select-store'))
      expect(queryByTestId('options-sheet')).toBeNull()
      fireEvent.press(getByTestId('menu-pane-open'))
      expect(getByTestId('options-sheet-title').props.children).toBe('Fries')
      expect(getByTestId('options-in-sheet').props.children).toBe('sheet:200')
      fireEvent.press(getByTestId('options-sheet-close'))
      expect(queryByTestId('options-sheet')).toBeNull()
    })
  })
})
