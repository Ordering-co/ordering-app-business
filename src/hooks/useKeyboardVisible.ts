import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, KeyboardEvent, KeyboardMetrics, Platform } from 'react-native';

/**
 * The tallest system bar a docked keyboard's frame can stop above (dp): React Native reports the keyboard's height
 * without the bar under it, so `screenY + height` is the display's height minus that bar: 24 with gesture navigation,
 * 48 with the three buttons, 56 with a tablet's taskbar.
 */
const SYSTEM_BAR_MAX = 56;

/**
 * How far above the display's bottom a docked keyboard's frame may end (dp): the tallest bar plus slack, so a sum that
 * lands on a bar's exact height is never decided by the rounding of two floats. A floating keyboard that was dragged
 * close to the bottom is still well above that.
 */
const DOCKED_TOLERANCE = SYSTEM_BAR_MAX + 16;

/**
 * Whether a keyboard frame takes room from the screen at the bottom. On Android a floating (undocked) keyboard is
 * reported as shown with an end height of 0 (or a frame that hovers over the content and does not reach the bottom
 * of the display): it covers nothing, so a sheet, a pinned bar or an avoiding view must keep its resting place and
 * not lift for it. iOS keeps its own rule: every show event counts (its floating iPad keyboard is out of scope).
 * This is the one rule of the app: every reader of the keyboard (this hook, `KeyboardScreen`, `OBottomPopup`, the
 * pinned bar, the field reveal) asks it.
 */
export const keyboardTakesRoom = (frame?: Partial<KeyboardMetrics> | null) => {
  if (Platform.OS === 'ios') return true;
  const height = frame?.height ?? 0;
  if (height <= 0) return false;
  // A frame with no position (a docked keyboard that reports only its height) is taken as docked.
  if (typeof frame?.screenY !== 'number') return true;
  return frame.screenY + height >= Dimensions.get('screen').height - DOCKED_TOLERANCE;
};

/**
 * Runs `read` on the keyboard's frame now and on every show / hide event; a hidden keyboard reads `hidden`.
 *
 * iOS announces a keyboard twice, `will` (the animation starts) and `did` (it ended), and `Keyboard.isVisible()` only
 * follows the `did` pair. A screen that mounts between the two (the sign-in's keyboard is dismissed by the navigation
 * change that mounts the tabs) reads "visible" from `isVisible()` after the `will-hide` has gone by, so the hook
 * listens to the `did` events too: the end of the animation puts the state right. It also reads the keyboard again
 * once subscribed, as the state it started from may be a render old.
 */
const useKeyboardReading = (read: (frame?: Partial<KeyboardMetrics> | null) => boolean, hidden = false) => {
  const current = () => (Keyboard.isVisible() ? read(Keyboard.metrics()) : hidden);
  const [value, setValue] = useState(current);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const showEvents = ios ? ['keyboardWillShow', 'keyboardDidShow'] : ['keyboardDidShow'];
    const hideEvents = ios ? ['keyboardWillHide', 'keyboardDidHide'] : ['keyboardDidHide'];
    // Each show event says what the keyboard is now: a docked one after a floating one is up, and the other way round.
    const subscriptions = [
      ...showEvents.map((name) =>
        Keyboard.addListener(name as any, (event: KeyboardEvent) => setValue(read(event?.endCoordinates))),
      ),
      ...hideEvents.map((name) => Keyboard.addListener(name as any, () => setValue(hidden))),
    ];
    setValue(current());

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
    // `read` and `hidden` are module-level rules, not state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
};

const takes = (frame?: Partial<KeyboardMetrics> | null) => keyboardTakesRoom(frame);
const floats = (frame?: Partial<KeyboardMetrics> | null) => !keyboardTakesRoom(frame);

/** Whether the keyboard is up and takes room from the screen. */
export const useKeyboardVisible = () => useKeyboardReading(takes);

/**
 * Whether a keyboard is showing that takes no room (a floating Gboard): what an avoiding view must be told so it adds
 * no padding for it. False with no keyboard and with a docked one, so a docked keyboard behaves as it always has.
 */
export const useKeyboardFloating = () => useKeyboardReading(floats);
