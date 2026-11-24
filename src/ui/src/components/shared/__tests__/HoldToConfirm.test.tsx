import React from 'react'
import { AccessibilityInfo, Alert, StyleSheet } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/businessSharedTestSetup')
const { useToast, ToastType } = require('@components')
import OButton from '../OButton'
import { HOLD_MS } from '../HoldToConfirm'
import { afterRelease, resetHoldLatch, useSettledWhileHeld } from '../holdLatch'

setupSharedComponentHooks()

const { defaultAppTheme } = require('../../../../../theme/engine')

const reducedMotion = () => {
  const theme = defaultAppTheme()
  return { meta: { ...theme.meta, reduceMotion: true } }
}

/** The fake clock moves the hold's timer and the fill's animation frames together. */
const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms) })

const press = (node: any) => fireEvent(node, 'pressIn')
const release = (node: any, tap = true) => {
  fireEvent(node, 'pressOut')
  if (tap) fireEvent.press(node)
}

const renderHeld = (props: Record<string, any> = {}, options?: any) => {
  const onClick = jest.fn()
  const screen = renderWithProviders(
    <OButton text='Pickup complete' color='success' hold onClick={onClick} {...props} />,
    options
  )
  return { onClick, screen, button: screen.getByRole('button') }
}

/** The fill is hidden from the screen reader on purpose: the queries look at the hidden tree too. */
const hidden = { includeHiddenElements: true }
const fillIn = (screen: any) => screen.queryByTestId('hold-fill', hidden)

const toast = () => (useToast as jest.Mock).mock.results[0]?.value[1].showToast as jest.Mock

describe('OButton hold (press and hold to fire)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false)
    resetHoldLatch()
  })

  describe('a button without the option', () => {
    it('fires on a tap and draws no hold', () => {
      const onClick = jest.fn()
      const { getByRole, queryByTestId } = renderWithProviders(<OButton text='Continue' onClick={onClick} />)
      press(getByRole('button'))
      expect(queryByTestId('hold-fill', hidden)).toBeNull()
      fireEvent.press(getByRole('button'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('is the plain button: no press-in or press-out handler, no fill in its box, the pressed look of the whole box', () => {
      const { UNSAFE_root, getByRole } = renderWithProviders(<OButton text='Continue' icon={<></>} onClick={jest.fn()} />)
      // The Pressable: the one element that takes the press handlers and draws its child from `pressed`.
      const pressable = UNSAFE_root.find((node: any) => typeof node.props.children === 'function' && node.props.accessibilityRole === 'button')
      expect(pressable.props.onPressIn).toBeUndefined()
      expect(pressable.props.onPressOut).toBeUndefined()
      const box: any = getByRole('button').children[0]
      expect(box.children).toHaveLength(1)
      expect(box.findAll((node: any) => node.props.testID === 'hold-fill')).toHaveLength(0)
      // The box takes the pressed look when pressed (a function child of the Pressable gets `pressed`).
      const draw: any = pressable.props.children
      const rest = StyleSheet.flatten(draw({ pressed: false }).props.style)
      const down = StyleSheet.flatten(draw({ pressed: true }).props.style)
      const look = defaultAppTheme().native.components.button.variants.primary.solid
      expect(rest.backgroundColor).toBe(look.background)
      expect(down.backgroundColor).toBe(look.states.pressed.background)
    })

    it('stays plain when `hold` has nothing to fire', () => {
      const { getByRole, queryByTestId } = renderWithProviders(<OButton text='Continue' hold />)
      press(getByRole('button'))
      expect(queryByTestId('hold-fill', hidden)).toBeNull()
    })
  })

  describe('a tap', () => {
    it('does not fire, and says what to do', () => {
      const { onClick, button } = renderHeld()
      fireEvent.press(button)
      expect(onClick).not.toHaveBeenCalled()
      expect(toast()).toHaveBeenCalledWith(ToastType.Info, 'Hold to confirm', expect.any(Number))
    })

    it('leaves the control as it was: the hint is a toast, nothing in the button changes', () => {
      const plain = renderWithProviders(<OButton text='Pickup complete' color='success' onClick={jest.fn()} />)
      const plainBox = StyleSheet.flatten(plain.getByRole('button').children[0]?.props?.style)
      plain.unmount()
      const { button, screen } = renderHeld()
      fireEvent.press(button)
      expect(StyleSheet.flatten(button.children[0]?.props?.style)).toEqual(plainBox)
      expect(screen.getAllByText('Pickup complete', hidden)).toHaveLength(1)
    })

    it('a quick press and release is a tap: nothing fires, and nothing fires later', () => {
      const { onClick, button } = renderHeld()
      press(button)
      advance(HOLD_MS / 3)
      release(button)
      advance(HOLD_MS * 2)
      expect(onClick).not.toHaveBeenCalled()
      expect(toast()).toHaveBeenCalledWith(ToastType.Info, 'Hold to confirm', expect.any(Number))
    })
  })

  describe('a hold', () => {
    it('fires once, when it completes and not before', () => {
      const { onClick, button } = renderHeld()
      press(button)
      advance(HOLD_MS - 1)
      expect(onClick).not.toHaveBeenCalled()
      advance(1)
      expect(onClick).toHaveBeenCalledTimes(1)
      advance(HOLD_MS * 3)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('fires once at the release when the thread was too busy to run the timer (the hold lasted by the clock): no hint, no second fire', () => {
      const { onClick, button } = renderHeld()
      press(button)
      // The clock moved 0.9 s but the JS thread was blocked: the timer never ran, and the release is handled first.
      act(() => { jest.setSystemTime(Date.now() + 900) })
      expect(onClick).not.toHaveBeenCalled()
      release(button)
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(toast()).not.toHaveBeenCalled()
      advance(HOLD_MS * 3)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('a release just before the hold is complete by the clock is still the early one: nothing fires, the hint is shown', () => {
      const { onClick, button } = renderHeld()
      press(button)
      act(() => { jest.setSystemTime(Date.now() + HOLD_MS - 1) })
      release(button)
      expect(onClick).not.toHaveBeenCalled()
      expect(toast()).toHaveBeenCalledWith(ToastType.Info, 'Hold to confirm', expect.any(Number))
    })

    it('a re-render of the screen under a stationary finger (new props, a new handler) neither cancels the hold nor fires twice', () => {
      const first = jest.fn()
      const second = jest.fn()
      const screen = renderWithProviders(<OButton text='Pickup complete' color='success' hold onClick={first} />)
      press(screen.getByRole('button'))
      advance(HOLD_MS / 2)
      screen.rerender(<OButton text='Pickup complete' color='success' hold onClick={second} testID='again' />)
      advance(HOLD_MS / 2)
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
      release(screen.getByRole('button'))
      expect(second).toHaveBeenCalledTimes(1)
    })

    it('the release that follows a completed hold is not a tap: it fires nothing more and shows no hint', () => {
      const { onClick, button } = renderHeld()
      press(button)
      advance(HOLD_MS)
      release(button)
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(toast()).not.toHaveBeenCalled()
      // The next tap is a tap again.
      fireEvent.press(button)
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(toast()).toHaveBeenCalledTimes(1)
    })

    it('shows its progress on the button itself, and clears it when it ends', () => {
      const { button, screen } = renderHeld()
      expect(fillIn(screen)).toBeNull()
      press(button)
      expect(screen.getByTestId('hold-fill', hidden)).toBeTruthy()
      advance(HOLD_MS / 2)
      expect(screen.getByTestId('hold-fill', hidden)).toBeTruthy()
      advance(HOLD_MS / 2)
      expect(fillIn(screen)).toBeNull()
    })

    it('paints the button\'s own pressed look as the fill, over a button that keeps its resting look', () => {
      const { native } = defaultAppTheme()
      const look = native.components.button.variants.success.solid
      const { button, screen } = renderHeld()
      const box = () => StyleSheet.flatten(button.children[0]?.props?.style)
      expect(box().backgroundColor).toBe(look.background)
      press(button)
      // The box does not take the pressed look: the fill is the progress.
      expect(box().backgroundColor).toBe(look.background)
      const fill = screen.getByTestId('hold-fill', hidden)
      const grown = fill.children[0] as any
      expect(StyleSheet.flatten(grown.props.style).backgroundColor).toBe(look.states.pressed.background)
    })

    it('draws the label again over the fill, in the pressed ink, and reads it once', () => {
      const { button, screen } = renderHeld({ color: 'danger', appearance: 'tonal' })
      press(button)
      const labels = screen.getAllByText('Pickup complete', hidden)
      expect(labels).toHaveLength(2)
      const ink = (label: any) => StyleSheet.flatten(label.props.style).color
      const { variants } = defaultAppTheme().native.components.button
      expect(ink(labels[0])).toBe(variants.danger.tonal.color)
      expect(ink(labels[1])).toBe(variants.danger.tonal.states.pressed.color)
      // The copy is hidden from the screen reader and takes no touch.
      expect(screen.getByTestId('hold-fill', hidden).props.importantForAccessibility).toBe('no-hide-descendants')
      expect(screen.getByTestId('hold-fill', hidden).props.pointerEvents).toBe('none')
    })

    it('does not resize the control while it is held', () => {
      const { button, screen } = renderHeld()
      const rest = StyleSheet.flatten(button.children[0]?.props?.style)
      press(button)
      advance(HOLD_MS / 2)
      expect(StyleSheet.flatten(button.children[0]?.props?.style)).toEqual(rest)
      screen.unmount()
    })
  })

  describe('a hold that does not complete', () => {
    it('fires nothing when released early, and the fill goes', () => {
      const { onClick, button, screen } = renderHeld()
      press(button)
      advance(HOLD_MS - 100)
      release(button)
      expect(fillIn(screen)).toBeNull()
      advance(HOLD_MS * 2)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('fires nothing, and says nothing, when the finger leaves the button', () => {
      const { onClick, button, screen } = renderHeld()
      press(button)
      advance(HOLD_MS - 100)
      release(button, false)
      advance(HOLD_MS * 2)
      expect(onClick).not.toHaveBeenCalled()
      expect(toast()).not.toHaveBeenCalled()
      expect(fillIn(screen)).toBeNull()
    })

    it('starts again from nothing on the next press', () => {
      const { onClick, button } = renderHeld()
      press(button)
      advance(HOLD_MS - 100)
      release(button, false)
      press(button)
      advance(HOLD_MS - 100)
      expect(onClick).not.toHaveBeenCalled()
      advance(100)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('is dropped when the button goes away mid-hold', () => {
      const { onClick, button, screen } = renderHeld()
      press(button)
      advance(HOLD_MS / 2)
      screen.unmount()
      advance(HOLD_MS * 2)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('is dropped when the button is turned off mid-hold', () => {
      const onClick = jest.fn()
      const screen = renderWithProviders(<OButton text='Pickup complete' hold onClick={onClick} />)
      press(screen.getByRole('button'))
      advance(HOLD_MS / 2)
      screen.rerender(<OButton text='Pickup complete' hold onClick={onClick} disabled />)
      advance(HOLD_MS * 2)
      expect(onClick).not.toHaveBeenCalled()
      expect(fillIn(screen)).toBeNull()
    })
  })

  describe('a hold that fires with the finger still down', () => {
    it('is one press: the release is not a tap, and the next press (a hold or a tap) is the button\'s again', () => {
      const { onClick, button } = renderHeld()
      press(button)
      advance(HOLD_MS)
      expect(onClick).toHaveBeenCalledTimes(1)
      advance(HOLD_MS * 2)
      release(button)
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(toast()).not.toHaveBeenCalled()
      // A plain tap right after says what to do, as it does on any held button.
      release(button)
      press(button)
      release(button)
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(toast()).toHaveBeenCalledWith(ToastType.Info, 'Hold to confirm', expect.any(Number))
      // And a second hold fires a second time.
      press(button)
      advance(HOLD_MS)
      release(button)
      expect(onClick).toHaveBeenCalledTimes(2)
    })

    it('holds the screen\'s changes back while the finger is down (what a screen would replace the button with) and lets them in at the release', () => {
      const ran = jest.fn()
      const { button } = renderHeld()
      press(button)
      advance(HOLD_MS)
      afterRelease(ran)
      expect(ran).not.toHaveBeenCalled()
      release(button)
      expect(ran).toHaveBeenCalledTimes(1)
      afterRelease(ran)
      expect(ran).toHaveBeenCalledTimes(2)
    })

    it('lets them in when the touch ends away from the button too (the finger slid off before it lifted)', () => {
      const ran = jest.fn()
      const { button } = renderHeld()
      press(button)
      advance(HOLD_MS)
      // Pressable reports the leave as a press-out, and the lift (or the system taking the touch) as the touch's end.
      fireEvent(button, 'pressOut')
      afterRelease(ran)
      expect(ran).not.toHaveBeenCalled()
      fireEvent(button, 'touchEnd')
      expect(ran).toHaveBeenCalledTimes(1)
    })

    it('takes nothing while the hold has not completed: an early release or a hold that never fires holds nothing back', () => {
      const ran = jest.fn()
      const { button } = renderHeld()
      press(button)
      advance(HOLD_MS / 2)
      afterRelease(ran)
      expect(ran).toHaveBeenCalledTimes(1)
      release(button)
    })

    it('takes nothing when the release itself completes the hold (the timer was late): the finger is already up', () => {
      const ran = jest.fn()
      const { onClick, button } = renderHeld()
      press(button)
      act(() => { jest.setSystemTime(Date.now() + 900) })
      fireEvent(button, 'pressOut')
      expect(onClick).toHaveBeenCalledTimes(1)
      afterRelease(ran)
      expect(ran).toHaveBeenCalledTimes(1)
    })

    /** A bar as a screen draws it: the stage's button, and the next stage's when the step is taken. */
    const Bar = ({ calls }: { calls: string[] }) => {
      const [stage, setStage] = React.useState<'arrived' | 'pickup'>('arrived')
      const shown = useSettledWhileHeld(stage)
      return shown === 'arrived'
        ? <OButton key='arrived' text='Arrived' hold onClick={() => { calls.push('arrived'); setStage('pickup') }} />
        : <OButton key='pickup' text='Pickup complete' hold onClick={() => { calls.push('pickup'); setStage('arrived') }} />
    }

    it('keeps the pressed button mounted while the parent swaps its label, handler and key, and the next button takes the next press', () => {
      const calls: string[] = []
      const screen = renderWithProviders(<Bar calls={calls} />)
      const first = screen.getByRole('button')
      press(first)
      advance(HOLD_MS)
      // The step was taken and the stage changed, but the finger is still on the button: it is the same one.
      expect(calls).toEqual(['arrived'])
      expect(screen.getByText('Arrived')).toBeTruthy()
      expect(screen.queryByText('Pickup complete')).toBeNull()
      expect(screen.getByRole('button')).toBe(first)
      release(first)
      expect(screen.getByText('Pickup complete')).toBeTruthy()
      expect(screen.queryByText('Arrived')).toBeNull()
      // The very next hold reaches the new button, and fires its handler once.
      const second = screen.getByRole('button')
      press(second)
      advance(HOLD_MS)
      release(second)
      expect(calls).toEqual(['arrived', 'pickup'])
    })

    it('leaves no timer and no held finger behind when it goes away while pressed, before it fires', () => {
      const ran = jest.fn()
      const { onClick, button, screen } = renderHeld()
      press(button)
      advance(HOLD_MS / 2)
      expect(jest.getTimerCount()).toBeGreaterThan(0)
      screen.unmount()
      // What is left is at most the animation frame already scheduled: nothing of the hold (its timer is HOLD_MS away).
      advance(100)
      expect(jest.getTimerCount()).toBe(0)
      advance(HOLD_MS * 2)
      expect(onClick).not.toHaveBeenCalled()
      afterRelease(ran)
      expect(ran).toHaveBeenCalledTimes(1)
    })

    it('leaves no timer and no held finger behind when it goes away after it fired, with the finger still down', () => {
      const ran = jest.fn()
      const { onClick, button, screen } = renderHeld()
      press(button)
      advance(HOLD_MS)
      expect(onClick).toHaveBeenCalledTimes(1)
      afterRelease(ran)
      expect(ran).not.toHaveBeenCalled()
      screen.unmount()
      expect(ran).toHaveBeenCalledTimes(1)
      // The latch's own safety timer went with the finger.
      advance(100)
      expect(jest.getTimerCount()).toBe(0)
      advance(HOLD_MS * 2)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not freeze a screen for good when the touch\'s end never comes', () => {
      const ran = jest.fn()
      const { button } = renderHeld()
      press(button)
      advance(HOLD_MS)
      afterRelease(ran)
      expect(ran).not.toHaveBeenCalled()
      advance(20000)
      expect(ran).toHaveBeenCalledTimes(1)
    })

    it('takes no held finger with a screen reader on (its activation is a tap: a dialog)', async () => {
      const ran = jest.fn()
      jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true)
      const { button } = renderHeld()
      await act(async () => {})
      press(button)
      advance(HOLD_MS)
      afterRelease(ran)
      expect(ran).toHaveBeenCalledTimes(1)
    })
  })

  describe('a button that cannot be pressed', () => {
    it.each([['disabled'], ['loading']])('takes no hold while %s', (state) => {
      const { onClick, button, screen } = renderHeld({ [state]: true })
      press(button)
      advance(HOLD_MS * 2)
      fireEvent.press(button)
      expect(onClick).not.toHaveBeenCalled()
      expect(fillIn(screen)).toBeNull()
      expect(toast()).not.toHaveBeenCalled()
    })
  })

  describe('with a screen reader', () => {
    beforeEach(() => {
      jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true)
    })
    const renderReader = async () => {
      const held = renderHeld()
      await act(async () => {})
      return held
    }
    const buttons = () => (Alert.alert as jest.Mock).mock.calls[0][2]

    it('asks a confirmation dialog on activation, with the action\'s name on the accept button', async () => {
      const { onClick, button } = await renderReader()
      fireEvent.press(button)
      expect(onClick).not.toHaveBeenCalled()
      expect(Alert.alert).toHaveBeenCalledTimes(1)
      const [title, message] = (Alert.alert as jest.Mock).mock.calls[0]
      expect(title).toBe('Pickup complete')
      expect(message).toBe('Do you want to confirm this action?')
      expect(buttons().map((entry: any) => entry.text)).toEqual(['Pickup complete', 'Cancel'])
      expect(toast()).not.toHaveBeenCalled()
    })

    it('fires once when the dialog is accepted', async () => {
      const { onClick, button } = await renderReader()
      fireEvent.press(button)
      buttons()[0].onPress()
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('fires nothing when the dialog is cancelled', async () => {
      const { onClick, button } = await renderReader()
      fireEvent.press(button)
      buttons()[1].onPress?.()
      expect(onClick).not.toHaveBeenCalled()
    })

    it('takes no hold: a touch that stays down fires nothing and draws no fill', async () => {
      const { onClick, button, screen } = await renderReader()
      press(button)
      expect(fillIn(screen)).toBeNull()
      advance(HOLD_MS * 2)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('follows the screen reader being turned on while the button is on screen', async () => {
      jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false)
      const listeners: Array<(value: boolean) => void> = []
      jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_name: string, handler: any) => {
        listeners.push(handler)
        return { remove: jest.fn() }
      }) as any)
      const { onClick, button } = renderHeld()
      await act(async () => {})
      act(() => listeners.forEach((listener) => listener(true)))
      fireEvent.press(button)
      expect(Alert.alert).toHaveBeenCalledTimes(1)
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('with motion', () => {
    it('slides the fill across the button as the hold goes by', () => {
      const { button, screen } = renderHeld()
      press(button)
      const fill = () => screen.getByTestId('hold-fill', hidden)
      fireEvent(fill(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 44 } } })
      const width = () => StyleSheet.flatten((fill().children[0] as any).props.style).width.__getValue()
      advance(HOLD_MS / 4)
      const early = width()
      advance(HOLD_MS / 4)
      const half = width()
      expect(early).toBeGreaterThan(0)
      expect(half).toBeGreaterThan(early)
      expect(half).toBeLessThan(200)
    })
  })

  describe('with reduced motion', () => {
    it('still fires after the same hold', () => {
      const { onClick, button } = renderHeld({}, { themeOverrides: reducedMotion() })
      press(button)
      advance(HOLD_MS - 1)
      expect(onClick).not.toHaveBeenCalled()
      advance(1)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('shows the progress in steps, never as a slide, and never hides it', () => {
      const { button, screen } = renderHeld({}, { themeOverrides: reducedMotion() })
      press(button)
      const fill = () => screen.getByTestId('hold-fill', hidden)
      fireEvent(fill(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 44 } } })
      // The test renderer keeps the animated node in the style: its value is what the screen would paint.
      const width = () => StyleSheet.flatten((fill().children[0] as any).props.style).width.__getValue()
      expect(width()).toBe(0)
      advance(HOLD_MS / 4)
      expect(width()).toBe(50)
      // Between two steps nothing moves.
      advance(HOLD_MS / 8)
      expect(width()).toBe(50)
      advance(HOLD_MS / 8)
      expect(width()).toBe(100)
      advance(HOLD_MS / 4)
      expect(width()).toBe(150)
    })
  })
})
