import { Dimensions } from 'react-native'
import { renderHook } from '@testing-library/react-native'

import { useDeviceOrientation, useIsLargeScreen } from '../DeviceOrientation'

describe('useDeviceOrientation', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('removes its dimensions listener on unmount', () => {
    const remove = jest.fn()
    jest.spyOn(Dimensions, 'addEventListener').mockReturnValue({ remove } as any)

    const { unmount } = renderHook(() => useDeviceOrientation())
    expect(remove).not.toHaveBeenCalled()

    unmount()
    expect(remove).toHaveBeenCalledTimes(1)
  })
})

describe('useIsLargeScreen', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('is true at the tablet breakpoint and false below it', () => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({
      width: 768,
      height: 1024,
      scale: 2,
      fontScale: 2
    } as any)
    expect(renderHook(() => useIsLargeScreen()).result.current).toBe(true)

    jest.spyOn(Dimensions, 'get').mockReturnValue({
      width: 767,
      height: 1024,
      scale: 2,
      fontScale: 2
    } as any)
    expect(renderHook(() => useIsLargeScreen()).result.current).toBe(false)
  })
})
