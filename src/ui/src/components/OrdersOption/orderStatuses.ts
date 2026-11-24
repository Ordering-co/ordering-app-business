import { ORDER_STATUS_IDS, orderStatusName } from '../shared/orderStatusName'

/** The names of an order's statuses as a list (the names themselves are `orderStatusName`'s, the app's one source). */
type Translate = (key: string, fallback: string) => string

export interface OrderStatusEntry {
  /** The status number of the API. */
  key: number
  /** The translated name. */
  text: string
}

/** Every status with its translated name, in the order of the status numbers (the names are `orderStatusName`'s). */
export const orderStatusList = (t: Translate): OrderStatusEntry[] =>
  ORDER_STATUS_IDS.map((key) => ({ key, text: orderStatusName(key, t) as string }))
