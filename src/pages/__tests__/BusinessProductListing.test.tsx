import React from 'react'

import { useApi } from '@components'
import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import BusinessProductListing from '../BusinessProductListing'

describe('BusinessProductListing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useApi as jest.Mock).mockReturnValue([{ ordering: 'mock-ordering' }, {}])
  })

  it('renders product list with slug and ordering api', () => {
    const { getByTestId } = renderPage(BusinessProductListing, {
      route: { params: { slug: 'demo-store' } }
    })
    expect(getByTestId('business-product-list')).toBeTruthy()
    expect(getByTestId('business-product-slug').props.children).toBe('demo-store')
    expect(getByTestId('business-product-ordering').props.children).toBe('has-ordering')
    expect(getByTestId('safe-area-layout')).toBeTruthy()
  })
})
