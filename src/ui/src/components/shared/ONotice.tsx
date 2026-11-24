import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import { nativeBoxStyle, nativeTextStyle, themeControlHeight, themeOpacity, themeSpace } from '@/theme/helpers';
import OText from './OText';
import Icon from './Icon';

/**
 * A notice box: `components.alert` (info, success, warning, danger), its
 * background, border, icon color and text. Not the system `Alert` dialog.
 *
 *   <ONotice variant='danger'>{t('ERROR', 'Error')}: {message}</ONotice>
 */
export type NoticeVariant = 'info' | 'success' | 'warning' | 'danger';

const ICONS: Record<NoticeVariant, string> = {
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  warning: 'warning-outline',
  danger: 'alert-circle-outline',
};

interface Props {
  variant?: NoticeVariant;
  children?: React.ReactNode;
  showIcon?: boolean;
  /** A bold line over the message (`alert.title`). */
  title?: string;
  /**
   * The notice's action (`alert.slots.action`, a link): bold text at the end of the notice in the notice's own ink,
   * underlined, as the mockups draw "View" and "Clear" (44 high without making the notice taller).
   */
  action?: { text: string, onPress: () => void, testID?: string };
  style?: ViewStyle;
  testID?: string;
}

const ONotice = ({ variant = 'info', children, showIcon = true, title, action, style, testID }: Props) => {
  const theme: any = useTheme();
  const alert = theme.native.components.alert;
  const look = alert.variants[variant];
  const slot = alert.slots.action;
  const controlHeight = themeControlHeight(theme, 'md');
  const actionText = theme.native.components.link.sizes[slot.size].text;
  const styles = React.useMemo(() => StyleSheet.create({
    box: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: alert.base.gap,
      // The theme's padding over and under, and at the sides: a notice is a line or two, not a card.
      paddingVertical: alert.base.padding_y,
      paddingHorizontal: alert.base.padding,
      borderRadius: alert.base.radius,
      ...nativeBoxStyle({ background: look.background, border: look.border, shadow: alert.base.shadow }),
    },
    // No `flex` on the text or its holder: in the body's column it would give the text no height of its own
    // (a flex basis of 0) and cut a long message at its first line. The body takes the width, the text its lines.
    text: { ...nativeTextStyle(alert.base.text), color: look.color },
    title: { ...nativeTextStyle(alert.base.title), color: look.color },
    body: { flex: 1, flexShrink: 1 },
    // A link of the control height: it grows the touch area, and leaves the notice its own height.
    action: {
      height: controlHeight,
      justifyContent: 'center',
      paddingHorizontal: themeSpace(theme, 'xs'),
      marginVertical: -alert.base.padding_y,
      alignSelf: 'center'
    },
    actionText: { ...nativeTextStyle(actionText), color: look.color, textDecorationLine: 'underline' },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
  }), [alert, look, theme, controlHeight, actionText]);
  return (
    <View style={[styles.box, style]} testID={testID} accessibilityRole='alert'>
      {showIcon && <Icon name={ICONS[variant]} size={alert.base.icon_size} color={look.icon_color} />}
      <View style={styles.body}>
        {!!title && <OText style={styles.title}>{title}</OText>}
        {typeof children === 'string' || typeof children === 'number'
          ? <OText style={styles.text}>{children}</OText>
          : <View>{children}</View>}
      </View>
      {!!action && (
        <Pressable
          accessibilityRole='button'
          onPress={action.onPress}
          testID={action.testID}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <OText style={styles.actionText} numberOfLines={1}>{action.text}</OText>
        </Pressable>
      )}
    </View>
  );
};

export default ONotice;
