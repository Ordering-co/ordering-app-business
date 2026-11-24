import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal, Platform, StyleSheet, View } from 'react-native'
import { FullWindowOverlay } from 'react-native-screens'
import { useTheme } from 'styled-components/native'

import { nativeBoxStyle, nativeTextStyle, themeColor, themeGutter, themeSpace, themeTitleAlign } from '@/theme/helpers'
import OButton from './OButton'
import OText from './OText'
import { registerConfirmHost, type ConfirmRequest } from './confirmAction'
import { useModalOrientations } from './modalOrientations'

const dialogStyles = (theme: any) => {
  const modal = theme.native.components.modal.base
  return StyleSheet.create({
    // The theme's scrim over the whole window, the box centered on the page gutter.
    scrim: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: themeGutter(theme),
      backgroundColor: themeColor(theme, 'overlay'),
    },
    // The modal's box (`components.modal`, as `OModal box`: "Remove account"), never wider than its `sm` width.
    box: {
      width: '100%',
      maxWidth: theme.native.components.modal.sizes.sm.width,
      borderRadius: modal.radius,
      padding: modal.padding,
      gap: modal.gap,
      ...nativeBoxStyle({ background: modal.background, shadow: modal.shadow }),
    },
    title: { ...nativeTextStyle(modal.title), color: themeColor(theme, 'text'), textAlign: themeTitleAlign(theme) },
    // The mockups' two buttons share one row: Cancel on the left, the action on the right (a notice has one).
    actions: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
    action: { flex: 1 },
  })
}

/**
 * The app's confirmations and notices (`presentConfirm`, `useConfirm`, `OAlertOriginal`) in the modal's box (as
 * "Log out"): the title, the message, and the buttons in one row, Cancel (the app's neutral outline) on the left and the
 * accept one (solid, the danger color when it cannot be undone) on the right. The hardware back key of Android, as a
 * tap on the scrim, is the way out: it cancels (a notice, which has one button, closes). One dialog at a time; a
 * request that comes while one is open waits for its turn.
 *
 * Mounted once, at the root. On iOS it is drawn in a window of its own above the app's (`FullWindowOverlay`), so it
 * shows over a sheet or a modal page too (a second `Modal` cannot be presented while another is on screen); on
 * Android it is a `Modal`, and dialogs stack.
 */
export const ConfirmDialogHost = () => {
  const theme: any = useTheme()
  const [queue, setQueue] = useState<ConfirmRequest[]>([])
  const orientations = useModalOrientations()
  const styles = useMemo(() => dialogStyles(theme), [theme])

  useEffect(() => registerConfirmHost((request) => setQueue((waiting) => [...waiting, request])), [])

  const request = queue[0]
  const answer = useCallback((accepted: boolean) => {
    if (!request) return
    setQueue((waiting) => waiting.slice(1))
    if (accepted) request.onAccept?.()
    else request.onCancel?.()
  }, [request])

  if (!request) return null

  const dialog = (
    <View style={[StyleSheet.absoluteFill, styles.scrim]} testID='confirm-dialog'>
      <View style={styles.box} accessibilityViewIsModal>
        {!!request.title && <OText style={styles.title} accessibilityRole='header'>{request.title}</OText>}
        {!!request.message && <OText testID='confirm-message' color='text_muted'>{request.message}</OText>}
        <View style={styles.actions}>
          {!request.notice && (
            <View style={styles.action}>
              <OButton
                testID='confirm-cancel'
                text={request.cancelText}
                color='neutral'
                appearance='outline'
                onClick={() => answer(false)}
              />
            </View>
          )}
          <View style={styles.action}>
            <OButton
              testID='confirm-accept'
              text={request.acceptText}
              color={request.destructive ? 'danger' : 'primary'}
              onClick={() => answer(true)}
            />
          </View>
        </View>
      </View>
    </View>
  )

  return Platform.OS === 'ios' ? (
    <FullWindowOverlay>{dialog}</FullWindowOverlay>
  ) : (
    // The back key is the way out: it answers as the Cancel button (or, for a notice, as its one button).
    <Modal transparent supportedOrientations={orientations} statusBarTranslucent navigationBarTranslucent animationType='fade' visible onRequestClose={() => answer(!!request.notice)}>
      {dialog}
    </Modal>
  )
}

export default ConfirmDialogHost
