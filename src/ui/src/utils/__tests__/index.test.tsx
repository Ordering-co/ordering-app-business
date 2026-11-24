import {
  capitalize,
  flatArray,
  getTraduction,
  sortInputFields,
  verifyDecimals,
  getProductPrice,
  transformDistance,
  calculateDistance,
  getOrderStatus,
  reviewCommentList,
  locale
} from '../index'

const t = (_key: string, fallback?: string) => fallback ?? _key

describe('utils — index', () => {
  it('flatArray flattens nested arrays', () => {
    expect(flatArray([1, [2, 3]])).toEqual([1, 2, 3])
  })

  it('capitalizes strings', () => {
    expect(capitalize('hello')).toBe('Hello')
  })

  it('getTraduction resolves known and fallback keys', () => {
    expect(getTraduction('ERROR_INVALID_COUPON', t, {})).toBe("The coupon doesn't exist")
    expect(getTraduction('Custom message', t, {})).toBe('Custom message')
    expect(getTraduction('SOME_KEY', t, {})).toBe('Some key')
  })

  it('sortInputFields orders fields by configured codes', () => {
    const values = [
      { code: 'email', name: 'Email' },
      { code: 'name', name: 'Name' }
    ]
    expect(sortInputFields({ values })).toEqual([
      { code: 'name', name: 'Name' },
      { code: 'email', name: 'Email' }
    ])
  })

  it('verifyDecimals keeps integers or applies parser', () => {
    expect(verifyDecimals(10, (n: number) => n.toFixed(2))).toBe(10)
    expect(verifyDecimals(10.5, (n: number) => n.toFixed(2))).toBe('10.50')
  })

  it('getProductPrice sums options and quantity', () => {
    const price = getProductPrice({
      quantity: 2,
      price: 5,
      options: [{
        suboptions: [{ quantity: 1, price: 2 }]
      }]
    })
    expect(price).toBe(14)
  })

  it('transformDistance converts units', () => {
    expect(transformDistance(1, 'mi')).toBe('0.62')
    expect(transformDistance(1, 'km')).toBe('1.00')
  })

  it('calculateDistance returns a positive distance', () => {
    expect(calculateDistance({ lat: 0, lng: 0 }, { latitude: 0, longitude: 1 })).toBeGreaterThan(0)
  })

  it('getOrderStatus returns a status object', () => {
    expect(getOrderStatus('7', t)?.slug).toBe('ACCEPTED_BY_BUSINESS')
  })

  it('reviewCommentList returns product like/dislike lists', () => {
    const product = reviewCommentList('product', t)
    expect(product.like.length).toBeGreaterThan(0)
    expect(product.dislike.length).toBeGreaterThan(0)
  })

  it('locale names the language', () => {
    expect(locale({ language: { code: 'en-US' } }, t).name).toBe('en')
  })
})
