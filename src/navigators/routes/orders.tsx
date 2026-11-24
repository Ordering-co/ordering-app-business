import type { AppScreen } from './types'

/**
 * Area `orders` has no stack screen: the list is the `Orders` tab (`pages/MyOrders`, mounted by the bottom navigator),
 * the search is a full-screen modal of the list and an order opens in the route of area `orderDetails`
 * (`OrderDetails`, params `{ order }` or `{ orderId }`). The list never carries a function in a route's params.
 */
export const ordersScreens: AppScreen[] = []
