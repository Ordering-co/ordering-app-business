import React, { useCallback, useMemo, useState } from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { ChoiceMark, KeyboardScreen, KeyboardScrollView, OBottomBar, ONavbar, OText, ScreenContainer } from '../shared'
import { SafeAreaContainerLayout } from '../../layouts/SafeAreaContainer'
import { nativeTextStyle, themeControlHeight, themeGutter, themeOpacity, themeScoped, themeSpace } from '@/theme/helpers'

/**
 * Pieces shared by the auth screens (login, login code, phone verification, forgot
 * password): `components.auth_form` and what it scopes. A scoped component is
 * the form's own look of it when the theme sets one, else the global one
 * (`themeScoped(theme, 'auth_form', '<name>')`).
 */
const AUTH = 'auth_form'

/**
 * The group the auth forms' fields are in: its `scope` of `field` puts the label above the box (`label_position: above`)
 * and its `input` is the field's look, so a form of this group is the same field as the profile's.
 */
export const AUTH_FIELD_SCOPE = AUTH

/** A component as the auth forms see it (`auth_form.scope.<name>`, or the global one). */
export const authScoped = (theme: any, name: string) => themeScoped(theme, AUTH, name)

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * A countdown in seconds as `mm:ss` ("09:42": the time a code lasts) or, with `padMinutes: false`, `m:ss`
 * ("0:38": the wait to resend). Never negative; a value that is not a number is 0.
 */
export const formatCountdown = (seconds: number, { padMinutes = true }: { padMinutes?: boolean } = {}): string => {
  const number = Number(seconds)
  const total = Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
  const minutes = Math.floor(total / 60)
  return `${padMinutes ? pad(minutes) : minutes}:${pad(total % 60)}`
}

export const useAuthStyles = () => {
  const theme: any = useTheme()
  return useMemo(() => {
    const field = authScoped(theme, 'field').base
    const timer = authScoped(theme, 'timer').base
    return StyleSheet.create({
      screen: { flex: 1 },
      // A screen's blocks, a block's space (`lg`) apart, on the page's gutter (the bar over them is fixed).
      content: { flexGrow: 1, paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'lg'), gap: themeSpace(theme, 'lg') },
      // A screen of a code: its pieces start at the gutter, as the mockup draws them.
      centered: { alignItems: 'stretch' },
      // The fields of a form, `field.gap` apart.
      fields: { width: '100%', gap: field.gap },
      // The actions of a form (the button, the "or" line and the other way in), `field.gap` apart.
      actions: { width: '100%', gap: field.gap },
      // The link under the password, at the end of the line.
      end: { alignSelf: 'flex-end' },
      checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: field.label_gap,
        minHeight: themeControlHeight(theme, 'md'),
      },
      checkboxLabel: { flexShrink: 1 },
      pressed: { opacity: themeOpacity(theme, 'pressed') },
      // The countdown is a caption: plain text in the timer's look.
      timerBox: { alignItems: 'center' },
      timerText: { ...nativeTextStyle(timer.text), color: timer.color, textAlign: 'center' },
      timerExpired: { color: timer.expired_color },
    })
  }, [theme])
}

interface ScreenProps {
  title?: string
  /** The bar's back arrow; the login, the root of the signed-out stack, has none. */
  onBack?: () => void
  /** What goes at the end of the bar (the login's language button). */
  barEnd?: React.ReactNode
  /** The bar pinned under the scroll (`AuthAction`). */
  footer?: React.ReactNode
  /** A screen of a code: its blocks fill the width, the code under its lead. */
  centered?: boolean
  children?: React.ReactNode
}

/**
 * A screen of the auth flow: the fixed bar with its title, a scroll with the form on the page gutter and, when
 * the screen has one, the main action pinned under it. The whole is a column of `screen.max_width` (centered
 * on a tablet) and the keyboard lifts it, so the action and the field being typed in stay in sight.
 */
export const AuthScreen = ({ title, onBack, barEnd, footer, centered = false, children }: ScreenProps) => {
  const styles = useAuthStyles()
  return (
    <SafeAreaContainerLayout>
      <KeyboardScreen
        enabled
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.screen}
      >
        <ScreenContainer testID='auth-column'>
          <ONavbar title={title} onBack={onBack} right={barEnd} rightButtons />
          <KeyboardScrollView
            style={styles.screen}
            contentContainerStyle={[styles.content, centered && styles.centered]}
            // Without a pinned action the screen's own button is the end of the form: it comes over the keyboard with the field.
            keepEndInSight={!footer}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </KeyboardScrollView>
          {footer}
        </ScreenContainer>
      </KeyboardScreen>
    </SafeAreaContainerLayout>
  )
}

interface ActionProps {
  text: string
  /** The look of the button: the main one (`button`), or the outline one of a screen's way out (`secondary`). */
  slot?: 'button' | 'secondary'
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  testID?: string
}

/** The screen's action in the app's bottom bar (`bottom_bar`): its `button` slot, or `secondary` for a way out. */
export const AuthAction = ({ text, slot = 'button', onPress, loading, disabled, testID }: ActionProps) => (
  <OBottomBar actions={[{ slot, text, onClick: onPress, loading, disabled, testID }]} />
)

/**
 * The props of an auth field for its label: above the box, with the example inside it, when the theme puts the
 * labels above (`field.label_position`); else the label is the placeholder (the example is not drawn).
 */
export const useAuthFieldLabel = () => {
  const theme: any = useTheme()
  const above = authScoped(theme, 'field').base.label_position === 'above'
  return useCallback((label: string, hint?: string) => above ? { label, placeholder: hint ?? label } : { placeholder: label }, [above])
}

/**
 * A message that stays on the screen until the user edits what it is about. It belongs to the result
 * it came with (`source`): a new result shows its own, and `clear` hides the current one.
 */
export const useUntilEdited = <T, >(source: unknown, value: T | null): [T | null, () => void] => {
  const [cleared, setCleared] = useState<unknown>(undefined)
  const clear = useCallback(() => setCleared(source), [source])
  return [cleared === source ? null : value, clear]
}

/** The reCAPTCHA v2 check row: the theme's checkbox mark and its label, the whole row to tap. */
export const RecaptchaCheckbox = ({ checked, onPress, label }: { checked: boolean, onPress: () => void, label: string }) => {
  const styles = useAuthStyles()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='checkbox'
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <View style={styles.checkboxRow}>
        <ChoiceMark kind='check' checked={checked} />
        <OText style={styles.checkboxLabel}>{label}</OText>
      </View>
    </Pressable>
  )
}

/** The countdown of a code (`components.timer`): a caption, in its expired color at zero. */
export const AuthTimer = ({ text, expired = false }: { text: string, expired?: boolean }) => {
  const styles = useAuthStyles()
  return (
    <View style={styles.timerBox}>
      <OText style={[styles.timerText, expired && styles.timerExpired]}>{text}</OText>
    </View>
  )
}
