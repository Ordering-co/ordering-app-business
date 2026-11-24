import { ORDER_STATUS_IDS, orderStatusName } from '../orderStatusName'
import { statusLabel } from '../../OrderDetails/orderStages'
import { orderStatusList } from '../../OrdersOption/orderStatuses'
import { orderStatusNames } from '../../Chat/changeEntries'

const catalog = require('../../../../../../i18n/translations.json')

const t = (_key: string, fallback: string) => fallback

describe('orderStatusName: the one name of a status', () => {
  it('names every status id, short, with a key of the catalog', () => {
    for (const id of ORDER_STATUS_IDS) {
      const keys: string[] = []
      const name = orderStatusName(id, (key: string, fallback: string) => { keys.push(key); return fallback })
      expect(name).toBeTruthy()
      expect(name).not.toBe(String(id))
      expect(keys).toHaveLength(1)
      expect(catalog[keys[0]]?.en).toBe(name)
    }
  })

  it('says the mockups\' short words, not the server\'s long ones', () => {
    expect(orderStatusName(15, t)).toBe('Picked up by customer')
    expect(orderStatusName(9, t)).toBe('Picked up by driver')
    expect(orderStatusName(7, t)).toBe('Accepted by business')
    expect(orderStatusName(5, t)).toBe('Rejected by business')
    for (const id of ORDER_STATUS_IDS) {
      expect(orderStatusName(id, t)).not.toMatch(/completed by|Order status|almost arrived to/i)
    }
  })

  it('has nothing for a status it does not know', () => {
    expect(orderStatusName(99, t)).toBeUndefined()
    expect(orderStatusName(null, t)).toBeUndefined()
    expect(orderStatusName(undefined, t)).toBeUndefined()
  })

  it('is the list the cards and the filters read, the details\' label and the chat\'s pills (the completed pill is the mockup\'s event)', () => {
    const list = orderStatusList(t)
    const pills = orderStatusNames(t)
    for (const id of ORDER_STATUS_IDS) {
      expect(list.find((entry) => entry.key === id)?.text).toBe(orderStatusName(id, t))
      expect(statusLabel(id, t, { delivery_type: 1 })).toBe(orderStatusName(id, t))
      if (id !== 1) expect(pills[id]).toBe(orderStatusName(id, t))
    }
    expect(pills[1]).toBe('Order completed')
  })
})
