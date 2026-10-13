import { getOneSignalSetupPlan, shouldRegisterPushToken } from '../getOneSignalSetupPlan'

describe('getOneSignalSetupPlan', () => {
  it('does not run setup while configs are still loading', () => {
    expect(getOneSignalSetupPlan({
      configsLoading: true,
      onesignalAppId: 'app-id',
      auth: true
    })).toEqual({
      shouldSetup: false,
      shouldClearPushLoading: false
    })
  })

  it('runs setup once when auth and app id are ready, without needing a token', () => {
    expect(getOneSignalSetupPlan({
      configsLoading: false,
      onesignalAppId: 'app-id',
      auth: true
    })).toEqual({
      shouldSetup: true,
      shouldClearPushLoading: false
    })
  })

  it('does not re-run setup when only a notification token appears', () => {
    const beforeToken = getOneSignalSetupPlan({
      configsLoading: false,
      onesignalAppId: 'app-id',
      auth: true
    })
    const afterToken = getOneSignalSetupPlan({
      configsLoading: false,
      onesignalAppId: 'app-id',
      auth: true
    })

    expect(beforeToken).toEqual(afterToken)
    expect(afterToken.shouldSetup).toBe(true)
  })

  it('clears push loading when logged out or missing an app id', () => {
    expect(getOneSignalSetupPlan({
      configsLoading: false,
      onesignalAppId: 'app-id',
      auth: false
    }).shouldClearPushLoading).toBe(true)

    expect(getOneSignalSetupPlan({
      configsLoading: false,
      onesignalAppId: undefined,
      auth: true
    }).shouldClearPushLoading).toBe(true)
  })
})

describe('shouldRegisterPushToken', () => {
  it('waits for a real device token before posting', () => {
    expect(shouldRegisterPushToken({
      auth: true,
      notificationToken: undefined
    })).toBe(false)

    expect(shouldRegisterPushToken({
      auth: true,
      notificationToken: ''
    })).toBe(false)
  })

  it('registers after login when a token exists', () => {
    expect(shouldRegisterPushToken({
      auth: true,
      notificationToken: 'onesignal-user-id'
    })).toBe(true)
  })

  it('does not register while logged out', () => {
    expect(shouldRegisterPushToken({
      auth: false,
      notificationToken: 'onesignal-user-id'
    })).toBe(false)
  })
})
