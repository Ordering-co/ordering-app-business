import React, { createContext, useContext, useLayoutEffect } from 'react'
import { Modal, TouchableWithoutFeedback, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'

import SheetHeader from './SheetHeader'
import KeyboardScrollView from './KeyboardScrollView'
import { useTheme } from 'styled-components/native';
import { useKeyboardFloating, useKeyboardVisible } from '@/hooks/useKeyboardVisible'
import { useModalOrientations } from './modalOrientations'
import { barBottomSpace, nativeShadowStyle, themeColor, themeSpace } from '@/theme/helpers'

/**
 * What a sheet's body hands up to the sheet: the action that stays pinned under the scrolling part (`SheetFooter`).
 * Without a sheet around it the footer is drawn where it stands.
 */
const SheetFooterContext = createContext<((footer: React.ReactNode) => void) | null>(null)

/**
 * The action of a sheet that holds fields (reject, force status, the option groups): the sheet's body scrolls inside the
 * room the keyboard and the top safe area leave, and this stays pinned under it, at the sheet's side padding and the
 * space a pinned bar keeps over the keyboard. Write it anywhere in the sheet's body:
 *
 *   <OBottomPopup open keyboardAware padded title='Reject order' closeIcon onClose={close}>
 *     <ReasonChips /> <NoteField />
 *     <SheetFooter><OButton text='Reject order' onClick={reject} /></SheetFooter>
 *   </OBottomPopup>
 */
export const SheetFooter = ({ children }: { children?: React.ReactNode }) => {
  const setFooter = useContext(SheetFooterContext)
  // The sheet draws it (under the scroll) and gets the latest one after each render of the body.
  useLayoutEffect(() => { setFooter?.(children) })
  useLayoutEffect(() => () => setFooter?.(null), [setFooter])
  return setFooter ? null : <>{children}</>
}

interface Props {
  open: boolean;
  transparent?: boolean;
  title?: string;
  children?: any;
  onClose?: any;
  bottomContainerStyle?: any;
  /** @deprecated use `bottomContainerStyle`. */
  containerStyle?: any;
  titleStyle?: any;
  closeIcon?: boolean;
  presentationStyle?: "fullScreen" | "pageSheet" | "formSheet" | "overFullScreen" | undefined;
  /**
   * The small handle drawn at the top of the sheet (`components.sheet.base.handle_color`), as in the mockups of
   * every sheet. It is decoration: the sheet is not dragged, it is closed by its close icon, the dimmed page or
   * the system's back. On by default; `false` leaves it out.
   */
  showHandleBar?: boolean;
  animationType?: "slide" | "fade" | "none";
  childenOutsideContainer?: boolean; //
  /**
   * The sheet owns the padding of its body: the sheet's padding
   * (`components.sheet.base.padding`) at the sides and under it, over the
   * system space the sheet keeps at the bottom. The caller then adds none.
   * Off for a body that goes from edge to edge (a list of rows, as the select's).
   */
  padded?: boolean;
  /**
   * The sheet holds a field: it rides above the keyboard on both platforms
   * (the room the keyboard covers is measured, so a window the system already
   * resized is not pushed twice). With the keyboard up the sheet's last control stands where a pinned bar's
   * does (`components.bottom_bar.base.padding` over the keyboard, no system space under it: the keyboard covers
   * it), so the gap over the keyboard is the same on every screen and sheet.
   */
  keyboardAware?: boolean;
  /**
   * The body scrolls inside the sheet when it is taller than the room: a sheet never passes the top safe area (the
   * status bar, the island), with or without the keyboard (the room is what the keyboard leaves, under the top inset).
   * On by default for a `padded` sheet and for a `keyboardAware` one; off for a body that is its own list (the select's),
   * which a scroll around it would nest. While the keyboard is up the focused field is scrolled into view.
   */
  scroll?: boolean;
  testID?: string;
}
/**
 * What the sheet draws, inside its own `SafeAreaProvider`. A sheet is a modal, a window of its own: on Android the
 * activity pads the app's screens, so the insets outside it read 0 while its window runs under the navigation
 * area (edge to edge). Only the provider inside the modal measures that window, so the inset is read here (as
 * `OModal` does) and the sheet's last control clears the navigation area as a pinned bar does.
 */
const OBottomPopupBody = (props: Props) => {
  const {
    title,
    onClose,
    children,
    titleStyle,
    bottomContainerStyle,
    containerStyle,
    closeIcon,
    showHandleBar = true,
    childenOutsideContainer,
    padded = false,
    keyboardAware = false,
    scroll = padded || keyboardAware,
    testID
  } = props

  const insets = useSafeAreaInsets()
  const theme: any = useTheme();
  const [footer, setFooter] = React.useState<React.ReactNode>(null)

  // Only a sheet that holds a field changes with the keyboard: the others never read it.
  const keyboardVisible = useKeyboardVisible()
  // A floating keyboard takes no room: the sheet does not ride above it (its padding left a strip of scrim under the sheet, as tall as the navigation area).
  const keyboardFloating = useKeyboardFloating()
  const keyboardUp = keyboardAware && keyboardVisible
  const styles = React.useMemo(() => sheetStyles(theme, keyboardUp, insets.top, insets.bottom, !!footer), [theme, keyboardUp, insets.top, insets.bottom, !!footer])
  const centered = theme.native.components.sheet.base.presentation === 'centered'
  // A centred card floats in the middle of the page: it has no system space to keep at its bottom.
  const bottomSpace = keyboardUp || centered ? 0 : barBottomSpace(theme, insets.bottom)

  return (
    <>
      <KeyboardAvoidingView style={styles.container} behavior='padding' enabled={keyboardAware && !keyboardFloating} testID={testID}>
        {/* The dimmed page behind the sheet closes it, whether the sheet is docked or a centred card. */}
        <TouchableWithoutFeedback onPress={() => onClose()}>
          <View style={styles.touchableOutsideStyle} testID='sheet-backdrop' />
        </TouchableWithoutFeedback>
        <View style={styles.frame} pointerEvents='box-none' testID='sheet-frame'>
          <View style={{ ...styles.bottomContainer, ...containerStyle, ...bottomContainerStyle }}>
            <View style={[styles.inner, { paddingBottom: bottomSpace }]} testID='sheet-bottom-space'>
              <SheetHeader title={title} titleStyle={titleStyle} onClose={closeIcon ? onClose : undefined} handle={showHandleBar && !centered} />
              {!childenOutsideContainer && (
                <SheetFooterContext.Provider value={setFooter}>
                  {scroll
                    ? (
                      <KeyboardScrollView style={styles.scroll} bounces={false} testID='sheet-scroll'>
                        {padded ? <View style={styles.body} testID='sheet-body'>{children}</View> : children}
                      </KeyboardScrollView>
                    )
                    : (padded ? <View style={styles.body} testID='sheet-body'>{children}</View> : children)}
                </SheetFooterContext.Provider>
              )}
              {!!footer && <View style={styles.footer} testID='sheet-footer'>{footer}</View>}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      {/* Only a caller that draws outside the sheet gets this one: with nothing in it, its own keyboard
          padding still took room at the bottom of the modal, a transparent strip (the page, undimmed)
          between the sheet and the keyboard. */}
      {childenOutsideContainer && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          enabled={!keyboardFloating}
          keyboardVerticalOffset={themeSpace(theme, 'xl')}
        >
          {children}
        </KeyboardAvoidingView>
      )}
    </>
  )
}

const OBottomPopup = (props: Props) => {
  const { open, transparent, onClose, presentationStyle, animationType } = props
  const orientations = useModalOrientations()
  return (
    <Modal
      animationType={animationType || 'fade'}
      transparent={transparent ?? true}
      visible={open}
      // The orientations of the screen under it (iOS shows a modal in portrait only unless told): all four on a tablet.
      supportedOrientations={orientations}
      // Android: the window covers the whole display (the scrim dims the status bar and the taskbar too); the provider inside reads the insets.
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => onClose()}
      presentationStyle={presentationStyle || 'overFullScreen'}
    >
      <SafeAreaProvider>
        <OBottomPopupBody {...props} />
      </SafeAreaProvider>
    </Modal>
  )
}

// Styles from `components.sheet`, built with the theme (never at module level).
const sheetStyles = (theme: any, keyboardUp: boolean, topInset: number, bottomInset: number, hasFooter: boolean) => {
  const sheet = theme.native.components.sheet.base
  // `presentation`: docked at the bottom (a phone), or a card in the middle (a tablet); `max_width` caps it (0: the whole width).
  const centered = sheet.presentation === 'centered'
  // A centred card keeps the same margin over and under it, clear of the larger system inset: a tall one (a product with
  // many options) scrolls inside that room and never reaches the screen's edge.
  const margin = Math.max(topInset, bottomInset) + themeSpace(theme, 'xl')
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColor(theme, 'overlay'),
      // The sheet never passes the top safe area: what is left under it (and over the keyboard) is its room.
      paddingTop: topInset
    },
    // The sheet's room, inside the container's padding (the top inset, and the keyboard's: `KeyboardAvoidingView` writes
    // the container's bottom padding itself, so a margin of the sheet's cannot live there). The sheet's `maxHeight` is this room's.
    frame: {
      flex: 1,
      alignSelf: 'stretch',
      justifyContent: centered ? 'center' : 'flex-end',
      alignItems: 'center',
      ...(centered && { marginTop: margin - topInset, marginBottom: margin })
    },
    // The dimmed page behind the sheet, over the whole window.
    touchableOutsideStyle: {
      ...StyleSheet.absoluteFill
    },
    bottomContainer: {
      ...(centered
        ? { borderRadius: sheet.radius }
        : { borderTopLeftRadius: sheet.radius, borderTopRightRadius: sheet.radius }),
      backgroundColor: sheet.background,
      width: '100%',
      maxHeight: '100%',
      ...(sheet.max_width > 0 && { maxWidth: sheet.max_width }),
      ...nativeShadowStyle(sheet.shadow)
    },
    // The sheet's content shrinks to the room its container has, and its body scrolls inside it.
    inner: { flexShrink: 1 },
    scroll: { flexShrink: 1 },
    // With the keyboard up the body ends where a pinned bar does (its own padding over the keyboard), not at the
    // sheet's larger padding.
    // With a pinned footer the body's content ends `md` above it and the footer carries the space under it.
    body: {
      paddingHorizontal: sheet.padding,
      paddingBottom: hasFooter ? themeSpace(theme, 'md') : (keyboardUp ? theme.native.components.bottom_bar.base.padding : sheet.padding)
    },
    footer: {
      paddingHorizontal: sheet.padding,
      paddingBottom: keyboardUp ? theme.native.components.bottom_bar.base.padding : sheet.padding
    }
  })
}

export default OBottomPopup
