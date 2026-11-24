import { orderTypeVariant } from '../orderTypeVariant'
import compiled from '../../../../../theme.compiled.json'

describe('orderTypeVariant', () => {
  it('colours a type by how the order leaves the store: with a driver, collected, or in the store', () => {
    // With a driver.
    expect(orderTypeVariant(1)).toBe('type_delivery')
    expect(orderTypeVariant(7)).toBe('type_delivery')
    // The customer collects it.
    expect(orderTypeVariant('2')).toBe('type_pickup')
    expect(orderTypeVariant(4)).toBe('type_pickup')
    expect(orderTypeVariant(5)).toBe('type_pickup')
    expect(orderTypeVariant(8)).toBe('type_pickup')
    // In the store.
    expect(orderTypeVariant(3)).toBe('type_in_store')
    expect(orderTypeVariant(9)).toBe('type_in_store')
  })

  it('gives the neutral badge to a type it does not know', () => {
    expect(orderTypeVariant(6)).toBe('neutral')
    expect(orderTypeVariant(undefined)).toBe('neutral')
    expect(orderTypeVariant(null)).toBe('neutral')
    expect(orderTypeVariant('')).toBe('neutral')
  })

  it('names only variants the theme has, each with a background and a text colour, and the theme has no other', () => {
    const variants = (compiled as any).values.components.badge.variants
    ;[1, 2, 3, 4, 5, 7, 8, 9].forEach((type) => {
      const look = variants[orderTypeVariant(type)]
      expect(look.background.$value).toMatch(/^#[0-9A-F]{6}$/i)
      expect(look.color.$value).toMatch(/^#[0-9A-F]{6}$/i)
    })
    expect(Object.keys(variants).filter((name) => name.startsWith('type_')).sort()).toEqual(['type_delivery', 'type_in_store', 'type_pickup'])
  })
})
