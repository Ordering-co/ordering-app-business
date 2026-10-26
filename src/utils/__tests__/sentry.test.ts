import * as Sentry from '@sentry/react-native'

import settings from '../../config.json'
import sentryConfig from '../../sentry.json'
import { initSentry } from '../sentry'

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setTag: jest.fn()
}))

jest.mock('react-native-device-info', () => ({
  getBundleId: jest.fn(() => 'com.ordering.app1'),
  getVersion: jest.fn(() => '2.3.4'),
  getBuildNumber: jest.fn(() => '57')
}))

const DSN = 'https://key@example.invalid/1'

describe('initSentry', () => {
  const originalDev = (global as any).__DEV__
  const originalDsn = sentryConfig.dsn

  afterEach(() => {
    ;(global as any).__DEV__ = originalDev
    sentryConfig.dsn = originalDsn
  })

  it('does not initialize in development builds', () => {
    ;(global as any).__DEV__ = true
    sentryConfig.dsn = DSN

    initSentry()

    expect(Sentry.init).not.toHaveBeenCalled()
    expect(Sentry.setTag).not.toHaveBeenCalled()
  })

  it('does not initialize when the dsn is empty', () => {
    ;(global as any).__DEV__ = false
    sentryConfig.dsn = ''

    initSentry()

    expect(Sentry.init).not.toHaveBeenCalled()
    expect(Sentry.setTag).not.toHaveBeenCalled()
  })

  it('initializes with release, dist and tags in production builds', () => {
    ;(global as any).__DEV__ = false
    sentryConfig.dsn = DSN

    initSentry()

    expect(Sentry.init).toHaveBeenCalledTimes(1)
    expect(Sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'production',
      release: 'com.ordering.app1@2.3.4+57',
      dist: '57',
      enableNativeCrashHandling: false,
      enableAppHangTracking: false,
      tracesSampleRate: 0.1
    })
    expect(Sentry.setTag).toHaveBeenCalledWith('app', 'app-business-26')
    expect(Sentry.setTag).toHaveBeenCalledWith('project', settings.project)
  })

  it('swallows errors thrown while initializing', () => {
    ;(global as any).__DEV__ = false
    sentryConfig.dsn = DSN
    ;(Sentry.init as jest.Mock).mockImplementationOnce(() => {
      throw new Error('init failed')
    })

    expect(() => initSentry()).not.toThrow()
    expect(Sentry.setTag).not.toHaveBeenCalled()
  })
})
