import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => {
  const React = require('react')
  const { View, Text } = require('react-native')
  const base = require('../../../jest/helpers/mockUi')
  return {
    ...base,
    ScreenContainer: ({ children }: any) => React.createElement(View, { testID: 'screen-container' }, children),
    BusinessProductList: (props: any) => React.createElement(View, { testID: 'business-product-list' },
      React.createElement(Text, { testID: 'business-product-slug' }, props.slug),
      React.createElement(Text, { testID: 'business-product-name' }, props.fallbackName),
      React.createElement(Text, { testID: 'business-product-props' }, JSON.stringify({ businessProps: props.businessProps, asDashboard: props.asDashboard })))
  }
})

import BusinessProductListing from '../BusinessProductListing'

describe('BusinessProductListing', () => {
  it('is the menu of the store of the route, in the phone\'s column', () => {
    const { getByTestId } = renderPage(BusinessProductListing, { route: { params: { slug: 'demo-store', name: 'Demo Store' } } })
    expect(getByTestId('business-product-list')).toBeTruthy()
    expect(getByTestId('business-product-slug').props.children).toBe('demo-store')
    expect(getByTestId('business-product-name').props.children).toBe('Demo Store')
    expect(getByTestId('safe-area-layout')).toBeTruthy()
    expect(getByTestId('screen-container')).toBeTruthy()
  })

  it('asks for the store\'s name, time zone and schedule with its categories, as the dashboard', () => {
    const { getByTestId } = renderPage(BusinessProductListing, { route: { params: { slug: 'demo-store' } } })
    expect(JSON.parse(getByTestId('business-product-props').props.children)).toEqual({ businessProps: ['id', 'name', 'categories', 'timezone', 'schedule'], asDashboard: true })
  })
})
