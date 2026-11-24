import { act, renderHook } from '@testing-library/react-native'
import { checkNotifications, requestNotifications } from 'react-native-permissions'
import { getToken, getInitialNotification, onNotificationOpenedApp } from '@react-native-firebase/messaging'

import { useApi, useConfig, useSession } from '@components'
import { usePushSetup } from '../usePushSetup'

jest.mock('@ui', () => ({
  StoreMethods: { _setStoreData: jest.fn(), _retrieveStoreData: jest.fn(), _removeStoreData: jest.fn() }
}))
jest.mock('react-native-onesignal', () => require('../../../jest/helpers/mockOneSignal'))
jest.mock('react-native-permissions', () => ({
  checkNotifications: jest.fn(async () => ({ status: 'denied' })),
  requestNotifications: jest.fn(async () => ({ status: 'granted' }))
}))
jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => 'fcm-token'),
  getInitialNotification: jest.fn(async () => null),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  onMessage: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn())
}))
jest.mock('../../config.json', () => ({ notification_app: 'businessapp' }))

const mockOneSignal = require('react-native-onesignal')

const owner = { id: 7, level: 2, email: 'owner@example.test', cellphone: '3008282222', country_phone_code: 57 }
const flush = async () => { await act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }) }
const sdkCalls = (...names: string[]) => mockOneSignal.__calls
  .filter((call: string) => names.some(name => call === name || call.startsWith(`${name}:`)))

const world = ({ auth = true, configs = {}, loading = false }: any = {}) => {
  ;(useSession as jest.Mock).mockReturnValue([{ auth, user: auth ? owner : null, token: auth ? 'session-token' : null }, {}])
  ;(useConfig as jest.Mock).mockReturnValue([{ loading, configs }])
  ;(useApi as jest.Mock).mockReturnValue([{ project: 'demo', root: 'https://api.test' }, {}])
}
const oneSignalConfigs = { onesignal_businessapp_id: { value: 'os-app' } }
const firebaseConfigs = { firebase_push_enabled: { value: '1' } }

describe('usePushSetup', () => {
  beforeEach(() => {
    mockOneSignal.__reset()
    mockOneSignal.__answers.subscriptionId = 'sub-1'
    ;(global as any).fetch = jest.fn(async () => ({ ok: true }))
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  describe('OneSignal', () => {
    it('sets up for the business once the configs are in, and registers the token with the API', async () => {
      world({ configs: oneSignalConfigs })
      const view = renderHook(() => usePushSetup())
      await flush()
      expect(sdkCalls('initialize')).toEqual(['initialize:os-app'])
      expect(sdkCalls('login', 'addEmail', 'addSms')).toEqual(['login:demo-7', 'addEmail:owner@example.test', 'addSms:+57 3008282222'])
      expect(view.result.current.oneSignalState).toMatchObject({ notification_app: 'businessapp', notification_token: 'sub-1' })
      expect((global as any).fetch).toHaveBeenCalledWith(
        'https://api.test/users/7/notification_tokens',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'sub-1', user_id: 7, app: 'businessapp' }) })
      )
      expect(view.result.current.isPushLoading.loading).toBe(false)
    })

    it('never fires the system prompt at login: only requestNotificationPermission does', async () => {
      world({ configs: oneSignalConfigs })
      const view = renderHook(() => usePushSetup())
      await flush()
      expect(sdkCalls('requestPermission')).toEqual([])
      expect(requestNotifications).not.toHaveBeenCalled()
      ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'granted' })
      let answer: any
      await act(async () => { answer = await view.result.current.requestNotificationPermission() })
      expect(sdkCalls('requestPermission')).toHaveLength(1)
      expect(answer).toBe('granted')
    })

    it('answers what the system ended as when the business said no', async () => {
      world({ configs: oneSignalConfigs })
      const view = renderHook(() => usePushSetup())
      await flush()
      mockOneSignal.__answers.requestPermission = false
      ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'blocked' })
      let answer: any
      await act(async () => { answer = await view.result.current.requestNotificationPermission() })
      expect(answer).toBe('blocked')
    })

    it('does not set up without a session, without the app id or while the configs load, and does not make the launch wait', async () => {
      world({ auth: false, configs: oneSignalConfigs })
      expect(renderHook(() => usePushSetup()).result.current.isPushLoading.loading).toBe(false)
      await flush()
      expect(sdkCalls('initialize')).toEqual([])
      world({ configs: {}, loading: true })
      expect(renderHook(() => usePushSetup()).result.current.isPushLoading.loading).toBe(true)
      await flush()
      expect(sdkCalls('initialize')).toEqual([])
      world({ configs: {} })
      const view = renderHook(() => usePushSetup())
      await flush()
      expect(sdkCalls('initialize')).toEqual([])
      expect(view.result.current.isPushLoading.loading).toBe(false)
    })

    it('keeps the push the business tapped: the order and the kind', async () => {
      world({ configs: oneSignalConfigs })
      const view = renderHook(() => usePushSetup())
      await flush()
      act(() => mockOneSignal.__emit('click', { notification: { additionalData: { order_id: 5, type: 'order_message' } } }))
      expect(view.result.current.openedPush).toEqual({ orderId: 5, type: 'order_message' })
      act(() => view.result.current.clearOpenedPush())
      expect(view.result.current.openedPush).toBeNull()
      act(() => mockOneSignal.__emit('click', { notification: { additionalData: {} } }))
      expect(view.result.current.openedPush).toBeNull()
    })
  })

  describe('Firebase', () => {
    it('is the provider when the server says so, with no OneSignal and no system prompt at login', async () => {
      world({ configs: { ...oneSignalConfigs, ...firebaseConfigs } })
      const view = renderHook(() => usePushSetup())
      await flush()
      expect(getToken).toHaveBeenCalled()
      expect(sdkCalls('initialize')).toEqual([])
      expect(requestNotifications).not.toHaveBeenCalled()
      expect(view.result.current.oneSignalState).toMatchObject({ notification_token: 'fcm-token', notification_provider: 'fcm' })
      expect((global as any).fetch).toHaveBeenCalledWith(
        'https://api.test/users/7/notification_tokens',
        expect.objectContaining({ body: JSON.stringify({ token: 'fcm-token', user_id: 7, app: 'businessapp', provider: 'fcm' }) })
      )
    })

    it('fires the system prompt through the system, not OneSignal, when asked', async () => {
      world({ configs: firebaseConfigs })
      const view = renderHook(() => usePushSetup())
      await flush()
      ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'granted' })
      let answer: any
      await act(async () => { answer = await view.result.current.requestNotificationPermission() })
      expect(requestNotifications).toHaveBeenCalledWith(['alert', 'sound', 'badge'])
      expect(sdkCalls('requestPermission')).toEqual([])
      expect(answer).toBe('granted')
    })

    it('keeps the push that opened the app and the one tapped while it ran', async () => {
      ;(getInitialNotification as jest.Mock).mockResolvedValueOnce({ data: { order_id: '9', type: 'order_message' } })
      world({ configs: firebaseConfigs })
      const view = renderHook(() => usePushSetup())
      await flush()
      expect(view.result.current.openedPush).toEqual({ orderId: '9', type: 'order_message' })
      const onOpened = (onNotificationOpenedApp as jest.Mock).mock.calls[0][1]
      act(() => onOpened({ data: { order_id: 10 } }))
      expect(view.result.current.openedPush).toEqual({ orderId: 10, type: null })
    })
  })
})
