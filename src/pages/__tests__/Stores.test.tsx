import React from 'react'
import { Platform } from 'react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import Stores from '../Stores'

describe('Stores', () => {
  it('renders stores list with dashboard props on ios', () => {
    Platform.OS = 'ios'
    const { getByTestId } = renderPage(Stores)
    expect(getByTestId('stores-list')).toBeTruthy()
    expect(getByTestId('stores-list-dashboard').props.children).toBe('dashboard')
    expect(getByTestId('stores-list-force-search').props.children).toBe('true')
    expect(getByTestId('safe-area-layout')).toBeTruthy()
  })

  it('disables force search on android', () => {
    Platform.OS = 'android'
    const { getByTestId } = renderPage(Stores)
    expect(getByTestId('stores-list-force-search').props.children).toBe('false')
  })
})
