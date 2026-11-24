import type { AppScreen } from './types'
import BusinessProductListing from '../../pages/BusinessProductListing'
import ProductOptions from '../../pages/ProductOptions'

/**
 * The stack screens of the stores and menu area. The Stores tab itself is `pages/Stores` (the bottom navigator
 * mounts it); the menu and a product's options are stack screens above the tabs.
 */
export const storesScreens: AppScreen[] = [
  { name: 'BusinessProductListing', component: BusinessProductListing, options: { headerShown: false } },
  { name: 'ProductOptions', component: ProductOptions, options: { headerShown: false } },
]
