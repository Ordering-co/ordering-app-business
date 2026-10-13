import {
  isFirebasePushEnabled,
  getFirebasePushSetupPlan,
  getOpenedPushOrderId
} from '../getFirebasePushSetupPlan'

describe('isFirebasePushEnabled', () => {
  it('is true only when the config value is the string 1', () => {
    expect(isFirebasePushEnabled({ firebase_push_enabled: { value: '1' } })).toBe(true)
  })

  it('is false for disabled, missing, or malformed configs', () => {
    expect(isFirebasePushEnabled({ firebase_push_enabled: { value: '0' } })).toBe(false)
    expect(isFirebasePushEnabled({ firebase_push_enabled: {} })).toBe(false)
    expect(isFirebasePushEnabled({})).toBe(false)
    expect(isFirebasePushEnabled(undefined)).toBe(false)
    expect(isFirebasePushEnabled(null)).toBe(false)
  })
})

describe('getFirebasePushSetupPlan', () => {
  it('sets up when configs are ready, the flag is on, and the user is authed', () => {
    expect(getFirebasePushSetupPlan({
      configsLoading: false,
      enabled: true,
      auth: true
    })).toEqual({ shouldSetup: true })
  })

  it('does not set up while configs are loading', () => {
    expect(getFirebasePushSetupPlan({
      configsLoading: true,
      enabled: true,
      auth: true
    })).toEqual({ shouldSetup: false })
  })

  it('does not set up without the flag or without session', () => {
    expect(getFirebasePushSetupPlan({
      configsLoading: false,
      enabled: false,
      auth: true
    })).toEqual({ shouldSetup: false })
    expect(getFirebasePushSetupPlan({
      configsLoading: false,
      enabled: true,
      auth: false
    })).toEqual({ shouldSetup: false })
  })
})

describe('getOpenedPushOrderId', () => {
  it('returns the order id from an FCM data payload', () => {
    expect(getOpenedPushOrderId({ order_id: '123' })).toBe('123')
  })

  it('treats stringified null and empty values as absent', () => {
    expect(getOpenedPushOrderId({ order_id: 'null' })).toBeNull()
    expect(getOpenedPushOrderId({ order_id: '' })).toBeNull()
    expect(getOpenedPushOrderId({})).toBeNull()
    expect(getOpenedPushOrderId(undefined)).toBeNull()
  })
})
