import React from 'react'
import { KeyboardAvoidingView, KeyboardAvoidingViewProps, StyleSheet, View } from 'react-native'
import { useWindowTop } from '@/hooks/useWindowTop'
import { useKeyboardFloating } from '@/hooks/useKeyboardVisible'

/**
 * The keyboard-avoiding view of every screen that has a field and an action to keep in sight: the one rule
 * of how a screen rides above the keyboard, so a new screen gets it by using this instead of
 * `KeyboardAvoidingView`. Its parts, with `OBottomBar`, `OBottomPopup` and `KeyboardScrollView`, are the app's
 * keyboard rule (docs/THEMING.md, "The keyboard"):
 *
 * - **A pinned bar sits its own padding above the keyboard**: this view lifts what is inside it by the room the
 *   keyboard takes from it, and `OBottomBar` drops its system inset while the keyboard is up (the keyboard covers it).
 * - **The focused field is brought into view** by `KeyboardScrollView`, the scroll to use inside it.
 *
 * A `KeyboardAvoidingView` measures its frame against its parent (`frame.y`) and takes the top of the parent for the
 * top of the window, so it falls short of the keyboard by the distance of its screen from the window's top: the safe
 * area (Android: one bar inset, 63 px on a 420 dpi phone, as the activity pads the screens; iOS: 62 pt under the
 * island) and whatever else sits above it (a `ScreenContainer`'s column hides the safe area from its child's `frame.y`).
 * The pinned bar went that much under the keyboard (the printer wizard, the password form). The view that wraps it
 * here is measured in the window (`useWindowTop`) and the distance is given as `keyboardVerticalOffset`, so the same
 * view is right in the padded screens of the stack, under a column, and in a modal, a window of its own that starts at
 * the screen's top (offset 0). The wrapper fills the screen's room (`flex: 1`); `style` is the avoiding view's own
 * (its canvas and its own `flex: 1`), and its `frame.y` is 0 inside it.
 *
 * A keyboard that takes no room (Android's floating Gboard: end height 0, or a frame that does not reach the display's
 * bottom) lifts nothing: the avoiding view is turned off while it is up, so the screen keeps its resting place (it
 * measured the floating keyboard's frame against its own bottom and lifted the pinned bar by the navigation area, or
 * flickered between the two). A docked keyboard leaves the view as it has always been.
 */
interface Props extends KeyboardAvoidingViewProps {
  /** The test id of the view that is measured (the avoiding view's parent). */
  windowTestID?: string
}

export const KeyboardScreen = ({ windowTestID, children, ...avoiding }: Props) => {
  const { ref, onLayout, top } = useWindowTop()
  const floating = useKeyboardFloating()
  const view = (
    <KeyboardAvoidingView {...avoiding} enabled={(avoiding.enabled ?? true) && !floating} keyboardVerticalOffset={top}>
      {children}
    </KeyboardAvoidingView>
  )
  return (
    <View ref={ref} onLayout={onLayout} style={styles.fill} testID={windowTestID} collapsable={false}>
      {view}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})

export default KeyboardScreen
