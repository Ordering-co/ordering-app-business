import * as React from "react";
import { AccessibilityInfo, Animated, Keyboard, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { nativeShadowStyle, nativeTextStyle, themeControlHeight, themeGutter, themeMotion, themeOpacity } from "@/theme/helpers";
import { ToastType, useLanguage, useToast } from '@components';
import { apiErrorText, getTraduction, messageText } from '../../utils/errorText';
import { useTheme } from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomBarHeight } from '../../../../context/BottomBarContext';
import { clearToastAction, toastActionOf, toastPlacementOf } from './toastAction';

// Read when a toast is drawn, not at import: the toast types are the logic submodule's.
const variantName = (type: any): string => ({
	[ToastType.Info]: 'info',
	[ToastType.Error]: 'error',
	[ToastType.Success]: 'success',
} as Record<string, string>)[type];

export const Toast: React.FC = () => {
	const theme: any = useTheme();
	const toast = theme.native.components.toast;
	const motion = React.useMemo(() => themeMotion(theme, 'base'), [theme]);
	// The toast's own speed; none when it is not animated or the theme turns motion off.
	const duration = toast.base.animated && motion.duration ? toast.base.speed : 0;
	const styles = React.useMemo(() => toastStyles(theme), [theme]);
	const insets = useSafeAreaInsets();
	// A bar pinned to the bottom (the tabs, a screen's actions) is under the toast's room: above it, its inset included.
	const barHeight = useBottomBarHeight();
	// iOS draws its keyboard over the app: a toast at the bottom would be under it, so it rides above it.
	const [keyboardHeight, setKeyboardHeight] = React.useState(0);
	React.useEffect(() => {
		if (Platform.OS !== 'ios') return;
		const shown = Keyboard.addListener('keyboardWillShow', (event) => setKeyboardHeight(event.endCoordinates.height));
		const hidden = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
		return () => { shown.remove(); hidden.remove(); };
	}, []);
	const [toastConfig, { hideToast }] = useToast();
	const [, t] = useLanguage();
	const opacity = React.useRef(new Animated.Value(0)).current;

	const fadeIn = React.useCallback(() => {
		Animated.timing(opacity, {
			toValue: 1,
			duration,
			easing: motion.easing,
			useNativeDriver: true,
		}).start();
	}, [opacity, duration, motion.easing]);

	const fadeOut = React.useCallback(() => {
		Animated.timing(opacity, {
			toValue: 0,
			duration,
			easing: motion.easing,
			useNativeDriver: true,
		}).start(() => {
			clearToastAction();
			hideToast && hideToast();
		});
	}, [opacity, hideToast, duration, motion.easing]);

	const { type, message } = toastConfig ?? ({} as any);
	// A toast never shows without a message. An error says what the API said, worded as every API message
	// (a list, `{ message }` or a code), and the generic failure when it said nothing; the other kinds
	// have a text of the app's own, and with none there is nothing to show.
	const text = toastConfig ? (type === ToastType.Error ? apiErrorText(message, t) : getTraduction(messageText(message), t)) : '';
	// The notice's action, when the message on screen is the one it was shown with (`toastAction.ts`).
	const action = text ? toastActionOf(message) : undefined;
	// A notice shown for the top stands under the screen's header (`components.header.base.height` under the safe area).
	const atTop = toastPlacementOf(message) === 'top';

	React.useEffect(() => {
		if (!toastConfig) {
			return;
		}

		fadeIn();
		const timer = setTimeout(fadeOut, toastConfig.duration);

		return () => clearTimeout(timer);
	}, [toastConfig, fadeIn, fadeOut]);

	// A screen reader is told of the notice as it appears (and of its action), as it cannot see it come and go.
	React.useEffect(() => {
		if (!text) return;
		AccessibilityInfo.announceForAccessibility?.(action ? `${text}. ${action.text}` : text);
	}, [toastConfig, text, action]);

	if (!text) {
		return null;
	}

	const variant = toast.variants[variantName(type)] ?? toast.variants.info;

	const press = () => {
		if (!action) return;
		clearToastAction();
		hideToast && hideToast();
		action.onPress();
	};

	return (
		<Animated.View
			// With an action the notice lets every touch through but the action's; without one it takes none.
			pointerEvents={action ? "box-none" : "none"}
			accessibilityLiveRegion="polite"
			style={[
				styles.container,
				atTop
					? { top: insets.top + theme.native.components.header.base.height + toast.base.offset, opacity }
					: { bottom: Math.max(barHeight || insets.bottom, keyboardHeight) + toast.base.offset, opacity },
			]}
		>
			<View pointerEvents={action ? "box-none" : "none"} style={[styles.toast, { backgroundColor: variant.background }]}>
				{action ? (
					<View pointerEvents="box-none" style={styles.withAction}>
						<View pointerEvents="none" style={styles.messageBox}>
							<Text maxFontSizeMultiplier={1.3} style={[styles.message, styles.messageWithAction, { color: variant.color }]}>{text}</Text>
						</View>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={action.text}
							onPress={press}
							testID={action.testID ?? "toast-action"}
							style={({ pressed }) => [styles.action, pressed && styles.pressed]}
						>
							<Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={[styles.actionText, { color: variant.color }]}>{action.text}</Text>
						</Pressable>
					</View>
				) : (
					<Text maxFontSizeMultiplier={1.3} style={[styles.message, { color: variant.color }]}>{text}</Text>
				)}
			</View>
		</Animated.View>
	);
};

const toastStyles = (theme: any) => {
	const toast = theme.native.components.toast;
	const link = theme.native.components.link;
	const actionText = nativeTextStyle(link.sizes[toast.slots.action.size].text);
	// The action's touch area is the control height; what it has over its text is taken from its margin, so the notice
	// is no taller for it (the notice's padding holds the rest).
	const slop = Math.max(0, Math.ceil((themeControlHeight(theme, 'md') - actionText.lineHeight) / 2));
	return StyleSheet.create({
		// Centered between the page gutters: a long message never reaches the screen's edges
		// on a phone narrower than the toast's `max_width`. It takes no touch (what is under it does).
		container: {
			position: "absolute",
			left: themeGutter(theme),
			right: themeGutter(theme),
			alignItems: "center",
			zIndex: 9999,
		},
		toast: {
			maxWidth: toast.base.max_width,
			borderRadius: toast.base.radius,
			padding: toast.base.padding,
			...nativeShadowStyle(toast.base.shadow),
		},
		message: {
			...nativeTextStyle(toast.base.text),
			textAlign: "center",
		},
		// The message and its action on one line, and the action under the message when they do not fit.
		withAction: {
			flexDirection: "row",
			flexWrap: "wrap",
			alignItems: "center",
			justifyContent: "center",
			columnGap: toast.base.padding,
		},
		messageBox: { flexShrink: 1 },
		messageWithAction: { textAlign: "left" },
		action: {
			minHeight: themeControlHeight(theme, 'md'),
			justifyContent: "center",
			marginVertical: -slop,
		},
		actionText: { ...actionText, textDecorationLine: "underline" },
		pressed: { opacity: themeOpacity(theme, 'pressed') },
	});
};
