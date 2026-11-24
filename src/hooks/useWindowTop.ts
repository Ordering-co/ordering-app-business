import { useCallback, useRef, useState } from 'react'
import { LayoutChangeEvent } from 'react-native'

/**
 * How far below the top of the window a screen's room starts. The keyboard's position (`screenY`) is in the window's
 * coordinates, while a `KeyboardAvoidingView` measures its own frame against its parent only (`frame.y`): it takes the
 * top of its parent for the window's and falls short of the keyboard by the distance between the two. That distance is
 * the safe area the screen sits under (iOS: the status bar and the island, 62 pt on an iPhone 17 Pro; Android: the
 * system bars the activity pads the content by) and anything else above it, such as the column of a `ScreenContainer`
 * or a header. `keyboardVerticalOffset` is the documented way to give the difference: the view measured here is the one
 * to put around the avoiding view (its own `frame.y` is then 0).
 *
 * Both platforms measure it, the same way: asking the platform for the safe area would be wrong as soon as something
 * else sits above the screen (a modal is a window of its own that starts at the top: it measures 0).
 *
 * Screens do not use it directly: `KeyboardScreen` (ui/shared) is the keyboard-avoiding view of every screen and
 * wraps this (a view with `ref` and `onLayout`, the avoiding view inside it with `keyboardVerticalOffset={top}`).
 */
export const useWindowTop = () => {
  // The native view's own methods (`measureInWindow`) are what is asked of it.
  const ref = useRef<any>(null)
  const [top, setTop] = useState(0)
  const onLayout = useCallback((_event?: LayoutChangeEvent) => {
    ref.current?.measureInWindow?.((_x: number, y: number) => setTop(Math.max(0, Math.round(y))))
  }, [])
  return { ref, onLayout, top }
}
