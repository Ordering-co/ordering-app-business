import { act, renderHook } from '@testing-library/react-native'

import { LAUNCH_NOTICE_MS, LAUNCH_TIME_LIMIT_MS, useLaunchTimeLimit } from '../useLaunchTimeLimit'

type Props = { loaded: boolean, sessionLoading?: boolean, onLimit?: (state: { loaded: boolean }) => void }

describe('useLaunchTimeLimit', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  const mount = (initialProps: Props) => renderHook((props: Props) => useLaunchTimeLimit(props), { initialProps })
  const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms) })

  it('is fifteen seconds, and its notice stays up long enough to be read', () => {
    expect(LAUNCH_TIME_LIMIT_MS).toBe(15000)
    expect(LAUNCH_NOTICE_MS).toBeGreaterThan(3000)
  })

  it('is closed until the launch has loaded', () => {
    const view = mount({ loaded: false })
    expect(view.result.current).toBe(false)
    view.rerender({ loaded: true })
    expect(view.result.current).toBe(true)
  })

  it('opens at the limit, once, and calls onLimit once', () => {
    const onLimit = jest.fn()
    const view = mount({ loaded: false, sessionLoading: false, onLimit })
    advance(LAUNCH_TIME_LIMIT_MS - 1)
    expect(view.result.current).toBe(false)
    expect(onLimit).not.toHaveBeenCalled()
    advance(1)
    expect(view.result.current).toBe(true)
    advance(LAUNCH_TIME_LIMIT_MS * 2)
    expect(onLimit).toHaveBeenCalledTimes(1)
  })

  it('waits for the session read from the device even at the limit', () => {
    const view = mount({ loaded: false, sessionLoading: true })
    advance(LAUNCH_TIME_LIMIT_MS)
    expect(view.result.current).toBe(false)
    view.rerender({ loaded: false, sessionLoading: false })
    expect(view.result.current).toBe(true)
  })

  it('is cancelled for good by a launch that loaded in time', () => {
    const onLimit = jest.fn()
    const view = mount({ loaded: false, onLimit })
    advance(LAUNCH_TIME_LIMIT_MS - 1000)
    view.rerender({ loaded: true, onLimit })
    advance(LAUNCH_TIME_LIMIT_MS * 2)
    expect(onLimit).not.toHaveBeenCalled()
    expect(view.result.current).toBe(true)
  })

  it('tells onLimit that the API had not answered when the launch never loaded', () => {
    const onLimit = jest.fn()
    mount({ loaded: false, sessionLoading: false, onLimit })
    advance(LAUNCH_TIME_LIMIT_MS)
    expect(onLimit).toHaveBeenCalledWith({ loaded: false })
  })

  it('does not restart when the launch un-loads again', () => {
    const onLimit = jest.fn()
    const view = mount({ loaded: true, onLimit })
    view.rerender({ loaded: false, onLimit })
    advance(LAUNCH_TIME_LIMIT_MS * 2)
    expect(onLimit).not.toHaveBeenCalled()
  })
})
