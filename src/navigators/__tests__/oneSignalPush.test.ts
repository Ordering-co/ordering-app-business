import { createOneSignalPush } from '../oneSignalPush'

jest.mock('react-native-onesignal', () => require('../../../jest/helpers/mockOneSignal'))

const mockOneSignal = require('react-native-onesignal')

const identity = {
  appId: 'app-1',
  externalId: 'demo-7',
  email: 'ana@example.test',
  cellphone: '+57 3008282222'
}

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

const sdkCalls = (...names: string[]) => mockOneSignal.__calls
  .filter((call: string) => names.some(name => call === name || call.startsWith(`${name}:`)))

describe('createOneSignalPush (OneSignal 5 for the root navigator)', () => {
  beforeEach(() => {
    mockOneSignal.__reset()
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => jest.restoreAllMocks())

  it('initializes once, logs the user in and adds the email and the phone', async () => {
    const push = createOneSignalPush({ onToken: jest.fn(), onNotificationClick: jest.fn() })
    await push.setup(identity)
    expect(sdkCalls('initialize')).toEqual(['initialize:app-1'])
    expect(sdkCalls('login', 'addEmail', 'addSms')).toEqual([
      'login:demo-7',
      'addEmail:ana@example.test',
      'addSms:+57 3008282222'
    ])
  })

  it('does nothing without an app id, and nothing again for an identity it already set up', async () => {
    const push = createOneSignalPush({ onToken: jest.fn(), onNotificationClick: jest.fn() })
    await push.setup({ ...identity, appId: '' })
    expect(sdkCalls('initialize')).toEqual([])
    await push.setup(identity)
    await push.setup(identity)
    expect(sdkCalls('initialize')).toHaveLength(1)
    expect(sdkCalls('addEmail')).toHaveLength(1)
  })

  it('never fires the system\'s notification prompt: the explainer sheet asks for it after the first sign-in', async () => {
    const push = createOneSignalPush({ onToken: jest.fn(), onNotificationClick: jest.fn() })
    await push.setup(identity)
    await flush()
    expect(sdkCalls('requestPermission')).toEqual([])
  })

  it('asks the system for the permission only when told to, and says whether it was granted', async () => {
    const push = createOneSignalPush({ onToken: jest.fn(), onNotificationClick: jest.fn() })
    mockOneSignal.__answers.requestPermission = true
    await expect(push.requestPermission()).resolves.toBe(true)
    expect(sdkCalls('requestPermission')).toHaveLength(1)
    mockOneSignal.__answers.requestPermission = false
    await expect(push.requestPermission()).resolves.toBe(false)
  })

  it('answers "not granted" when the prompt fails', async () => {
    const push = createOneSignalPush({ onToken: jest.fn(), onNotificationClick: jest.fn() })
    mockOneSignal.__answers.requestPermission = () => Promise.reject(new Error('no'))
    await expect(push.requestPermission()).resolves.toBe(false)
  })

  it('tells the token once the subscription has an id, and when it changes', async () => {
    const onToken = jest.fn()
    const push = createOneSignalPush({ onToken, onNotificationClick: jest.fn() })
    mockOneSignal.__answers.subscriptionId = 'sub-1'
    await push.setup(identity)
    expect(onToken).toHaveBeenCalledWith('sub-1')
    mockOneSignal.__emit('change', { current: { id: 'sub-2', optedIn: true } })
    expect(onToken).toHaveBeenCalledWith('sub-2')
  })

  it('hands a tapped notification to the app, and stops listening when disposed', async () => {
    const onNotificationClick = jest.fn()
    const push = createOneSignalPush({ onToken: jest.fn(), onNotificationClick })
    await push.setup(identity)
    const notification = { additionalData: { order_id: 5, type: 'order_message' } }
    mockOneSignal.__emit('click', { notification })
    expect(onNotificationClick).toHaveBeenCalledWith(notification)
    push.dispose()
    expect(mockOneSignal.OneSignal.Notifications.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function))
    await push.setup({ ...identity, appId: 'app-2' })
    expect(sdkCalls('initialize')).toEqual(['initialize:app-1'])
  })
})
