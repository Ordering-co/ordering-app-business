import type { AppScreen } from './types'
import OrderDetails from '../../pages/OrderDetails'

/** The order's details: pushed over the tabs from a card, a chat's "View order" or a push notification. */
export const orderDetailsScreens: AppScreen[] = [
  { name: 'OrderDetails', component: OrderDetails, options: { headerShown: false } }
]
