jest.mock('../../../pages/BusinessProductListing', () => ({ __esModule: true, default: () => null }))
jest.mock('../../../pages/ProductOptions', () => ({ __esModule: true, default: () => null }))

import { storesScreens } from '../stores'

describe('storesScreens', () => {
  it('are the menu and a product\'s options, stack screens without a header', () => {
    expect(storesScreens.map((screen) => screen.name)).toEqual(['BusinessProductListing', 'ProductOptions'])
    storesScreens.forEach((screen) => {
      expect(typeof screen.component).toBe('function')
      expect(screen.options).toEqual({ headerShown: false })
    })
  })

  it('does not own the Stores tab (the bottom navigator does)', () => {
    expect(storesScreens.some((screen) => screen.name === 'Stores')).toBe(false)
  })
})
