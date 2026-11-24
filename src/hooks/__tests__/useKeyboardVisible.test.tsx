import { Dimensions, Keyboard, Platform } from 'react-native'
import { act, renderHook } from '@testing-library/react-native'

import { keyboardTakesRoom, useKeyboardFloating, useKeyboardVisible } from '../useKeyboardVisible'

type Listener = (event?: any) => void

/** Runs the hook on a platform with the keyboard's events in hand; the keyboard starts hidden unless told. */
const setup = (platform: 'ios' | 'android', { visible = false, metrics }: { visible?: boolean, metrics?: any } = {}) => {
  const original = Platform.OS
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => platform })
  const listeners: Record<string, Listener[]> = {}
  const remove = jest.fn()
  const add = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, listener: Listener) => {
    ;(listeners[event] = listeners[event] ?? []).push(listener)
    return { remove }
  }) as any)
  const isVisible = jest.spyOn(Keyboard, 'isVisible').mockReturnValue(visible)
  const read = jest.spyOn(Keyboard, 'metrics').mockReturnValue(metrics)
  const view = renderHook(() => ({ visible: useKeyboardVisible(), floating: useKeyboardFloating() }))
  const emit = (event: string, height?: number, screenY?: number) =>
    act(() => listeners[event].forEach((listener) => listener(height === undefined ? undefined : { endCoordinates: { height, ...(screenY !== undefined && { screenY }) } })))
  return {
    ...view,
    listeners,
    emit,
    remove,
    restore: () => {
      add.mockRestore()
      isVisible.mockRestore()
      read.mockRestore()
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original })
    },
  }
}

describe('useKeyboardVisible on Android', () => {
  it('listens to the did-show and did-hide events', () => {
    const keyboard = setup('android')
    expect(Object.keys(keyboard.listeners).sort()).toEqual(['keyboardDidHide', 'keyboardDidShow'])
    keyboard.restore()
  })

  it('is not up for a floating keyboard, which Android reports as shown with a height of 0', () => {
    const keyboard = setup('android')
    keyboard.emit('keyboardDidShow', 0)
    expect(keyboard.result.current.visible).toBe(false)
    keyboard.restore()
  })

  it('is up once the keyboard has a real height, and down when it hides', () => {
    const keyboard = setup('android')
    keyboard.emit('keyboardDidShow', 0)
    keyboard.emit('keyboardDidShow', 312)
    expect(keyboard.result.current.visible).toBe(true)
    keyboard.emit('keyboardDidHide')
    expect(keyboard.result.current.visible).toBe(false)
    keyboard.restore()
  })

  it('goes down again when a docked keyboard is undocked into a floating one', () => {
    const keyboard = setup('android')
    keyboard.emit('keyboardDidShow', 312)
    expect(keyboard.result.current.visible).toBe(true)
    keyboard.emit('keyboardDidShow', 0)
    expect(keyboard.result.current.visible).toBe(false)
    keyboard.restore()
  })

  it('starts up only when the keyboard already showing takes room', () => {
    const docked = setup('android', { visible: true, metrics: { height: 300 } })
    expect(docked.result.current.visible).toBe(true)
    docked.restore()
    const floating = setup('android', { visible: true, metrics: { height: 0 } })
    expect(floating.result.current.visible).toBe(false)
    floating.restore()
    const hidden = setup('android')
    expect(hidden.result.current.visible).toBe(false)
    hidden.restore()
  })

  it('removes every listener on unmount (two hooks, two events each)', () => {
    const keyboard = setup('android')
    keyboard.unmount()
    expect(keyboard.remove).toHaveBeenCalledTimes(4)
    keyboard.restore()
  })
})

describe('a keyboard that takes no room on Android', () => {
  const display = 2400 / 2.625

  beforeEach(() => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 411, height: display, scale: 2.625, fontScale: 1 })
  })
  afterEach(() => jest.restoreAllMocks())

  it('is floating for an end height of 0, and for a frame that hovers over the content without reaching the display\'s bottom', () => {
    const keyboard = setup('android')
    expect(keyboard.result.current.floating).toBe(false)
    keyboard.emit('keyboardDidShow', 0, display - 24)
    expect(keyboard.result.current).toEqual({ visible: false, floating: true })
    keyboard.emit('keyboardDidShow', 280, 300)
    expect(keyboard.result.current).toEqual({ visible: false, floating: true })
    keyboard.restore()
  })

  it('is docked when its frame ends at the display\'s bottom, or at the navigation area\'s top', () => {
    const keyboard = setup('android')
    keyboard.emit('keyboardDidShow', 300, display - 300)
    expect(keyboard.result.current).toEqual({ visible: true, floating: false })
    keyboard.emit('keyboardDidShow', 300, display - 300 - 24)
    expect(keyboard.result.current).toEqual({ visible: true, floating: false })
    keyboard.restore()
  })

  it('is docked above the three buttons and above a tablet\'s taskbar: the frame stops at the bar\'s top (48 and 56 dp)', () => {
    const keyboard = setup('android')
    keyboard.emit('keyboardDidShow', 300, display - 300 - 48)
    expect(keyboard.result.current.floating).toBe(false)
    expect(keyboard.result.current.visible).toBe(true)
    keyboard.emit('keyboardDidShow', 300, display - 300 - 56)
    expect(keyboard.result.current.floating).toBe(false)
    expect(keyboard.result.current.visible).toBe(true)
    keyboard.restore()
  })

  it('is docked for the frame a phone with three buttons really reports (420 dpi): the sum lands on the bar\'s height, less a float\'s rounding', () => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 411.42857142857144, height: 914.2857142857143, scale: 2.625, fontScale: 1 })
    expect(622.09521484375 + 244.1904754638672).toBeLessThan(914.2857142857143 - 48)
    expect(keyboardTakesRoom({ height: 244.1904754638672, screenY: 622.09521484375 })).toBe(true)
  })

  it('is docked for the frame a tablet with a taskbar reports (2560 x 1600 at 320 dpi, the keyboard\'s top at 848 px)', () => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 1280, height: 800, scale: 2, fontScale: 1 })
    expect(keyboardTakesRoom({ height: 800 - 424 - 56, screenY: 424 })).toBe(true)
  })

  it('follows a transition floating -> docked -> floating, and is neither when the keyboard hides', () => {
    const keyboard = setup('android')
    keyboard.emit('keyboardDidShow', 0)
    expect(keyboard.result.current).toEqual({ visible: false, floating: true })
    keyboard.emit('keyboardDidShow', 300, display - 300)
    expect(keyboard.result.current).toEqual({ visible: true, floating: false })
    keyboard.emit('keyboardDidShow', 0)
    expect(keyboard.result.current).toEqual({ visible: false, floating: true })
    keyboard.emit('keyboardDidHide')
    expect(keyboard.result.current).toEqual({ visible: false, floating: false })
    keyboard.restore()
  })

  it('starts floating only when the keyboard already showing takes no room', () => {
    const floating = setup('android', { visible: true, metrics: { height: 0, screenY: display } })
    expect(floating.result.current.floating).toBe(true)
    floating.restore()
    const docked = setup('android', { visible: true, metrics: { height: 300, screenY: display - 300 } })
    expect(docked.result.current).toEqual({ visible: true, floating: false })
    docked.restore()
  })

  it('is one rule: keyboardTakesRoom reads the same frames', () => {
    const original = Platform.OS
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' })
    expect(keyboardTakesRoom({ height: 0, screenY: display })).toBe(false)
    expect(keyboardTakesRoom({ height: 300, screenY: 100 })).toBe(false)
    expect(keyboardTakesRoom({ height: 300, screenY: display - 300 })).toBe(true)
    expect(keyboardTakesRoom({ height: 300 })).toBe(true)
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original })
  })
})

describe('useKeyboardVisible on iOS', () => {
  it('keeps its rule: every will-show event is up, whatever its height, and will-hide is down', () => {
    const keyboard = setup('ios')
    expect(Object.keys(keyboard.listeners).sort()).toEqual(['keyboardDidHide', 'keyboardDidShow', 'keyboardWillHide', 'keyboardWillShow'])
    keyboard.emit('keyboardWillShow', 0)
    expect(keyboard.result.current.visible).toBe(true)
    keyboard.emit('keyboardWillHide')
    expect(keyboard.result.current.visible).toBe(false)
    keyboard.emit('keyboardWillShow')
    expect(keyboard.result.current.visible).toBe(true)
    // Never floating on iOS: the avoiding views stay as they are.
    expect(keyboard.result.current.floating).toBe(false)
    keyboard.restore()
  })

  it('starts up when the keyboard is already showing', () => {
    const keyboard = setup('ios', { visible: true })
    expect(keyboard.result.current.visible).toBe(true)
    keyboard.restore()
  })

  // IOS-A3: the sign-in's keyboard is dismissed by the navigation change that mounts the tabs. `Keyboard.isVisible()`
  // follows the did-show / did-hide pair only, so a hook that mounts after the will-hide read "visible" and never heard
  // the end of that keyboard: the tab bar stayed away until the app was relaunched.
  describe('a screen that mounts while the keyboard is on its way out (IOS-A3)', () => {
    it('starts up (isVisible is still true: the did-hide has not come) and goes down at the did-hide', () => {
      const keyboard = setup('ios', { visible: true })
      expect(keyboard.result.current.visible).toBe(true)
      keyboard.emit('keyboardDidHide')
      expect(keyboard.result.current.visible).toBe(false)
      keyboard.restore()
    })

    it('goes down at the did-hide even when the will-hide came before it mounted', () => {
      // No will-hide is ever emitted: it had gone by.
      const keyboard = setup('ios', { visible: true, metrics: { height: 336 } })
      expect(keyboard.listeners.keyboardWillHide).toHaveLength(2)
      keyboard.emit('keyboardDidHide')
      expect(keyboard.result.current).toEqual({ visible: false, floating: false })
      keyboard.restore()
    })

    it('reads the keyboard again once subscribed: a keyboard that has gone since the first render does not stay up', () => {
      const keyboard = setup('ios', { visible: true })
      expect(keyboard.result.current.visible).toBe(true)
      ;(Keyboard.isVisible as jest.Mock).mockReturnValue(false)
      keyboard.rerender({})
      keyboard.emit('keyboardWillShow')
      keyboard.emit('keyboardDidHide')
      expect(keyboard.result.current.visible).toBe(false)
      keyboard.restore()
    })

    it('comes up at the did-show of a keyboard that began showing before the screen mounted', () => {
      const keyboard = setup('ios')
      expect(keyboard.result.current.visible).toBe(false)
      keyboard.emit('keyboardDidShow', 336)
      expect(keyboard.result.current.visible).toBe(true)
      keyboard.restore()
    })
  })
})
