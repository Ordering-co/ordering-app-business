import '../../../../../../jest/helpers/registerB5NativeMocks'

import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@ui', () => {
  const { buildB5StoresUiMock } = require('../../../../../../jest/helpers/b5StoresUiMock')
  return buildB5StoresUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  const { businessProductListDefaults } = require('../../../../../../jest/helpers/b5StoresDefaults')
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
    StoreProductList: renderUiController(businessProductListDefaults)
  }
})

import { BusinessProductList } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('BusinessProductList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders categories header and category names', () => {
    const { getByText } = renderWithProviders(<BusinessProductList />)
    expect(getByText('Categories')).toBeTruthy()
    expect(getByText('Burgers')).toBeTruthy()
  })

  it('shows empty state when no categories', () => {
    const { getByText } = renderWithProviders(
      <BusinessProductList categories={[]} />
    )
    expect(getByText('Sorry, no results found')).toBeTruthy()
  })

  it('goes back when arrow pressed', () => {
    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true)
    }
    const { UNSAFE_getAllByType } = renderWithProviders(
      <BusinessProductList navigation={navigation} />
    )
    const { TouchableOpacity } = require('react-native')
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0])
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it('opens products modal when category pressed', () => {
    const handleChangeCategory = jest.fn()
    const { getByText } = renderWithProviders(
      <BusinessProductList handleChangeCategory={handleChangeCategory} />
    )
    fireEvent.press(getByText('Burgers'))
    expect(handleChangeCategory).toHaveBeenCalled()
    expect(getByText('Products')).toBeTruthy()
    expect(getByText('Cheeseburger')).toBeTruthy()
  })

  it('opens the product options screen when a product is pressed', () => {
    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true)
    }
    const updateStoreProduct = jest.fn()
    const { getByText, getByTestId } = renderWithProviders(
      <BusinessProductList navigation={navigation} updateStoreProduct={updateStoreProduct} />
    )
    fireEvent.press(getByText('Burgers'))
    fireEvent.press(getByTestId('product-open-100'))
    expect(navigation.navigate).toHaveBeenCalledWith('ProductOptions', {
      businessId: 1,
      categoryId: 10,
      productId: 100,
      productName: 'Cheeseburger'
    })
    expect(updateStoreProduct).not.toHaveBeenCalled()
  })
})
