import { useCallback } from 'react'
import { Alert } from 'react-native'
import { useLanguage } from '@components'

export interface ConfirmOptions {
  /**
   * The dialog's title: the question. When it is not given it is the action asked as a question ("Remove printer?",
   * "Log out?"), never the app's name.
   */
  title?: string
  message?: string
  /** The accept button is named after the action ("Delete", "Logout"): never a bare "OK". */
  acceptText: string
  /** What the other button says: "Cancel" unless the question needs a clearer way out ("Keep editing"). */
  cancelText?: string
  /** The action cannot be undone: its button is the danger one. */
  destructive?: boolean
  /** A notice, not a question: one button ("OK") that closes it, and no way out to ask for. */
  notice?: boolean
  onAccept?: () => void
  /** The way out: the Cancel button, the hardware back key of Android or a tap on the scrim. */
  onCancel?: () => void
}

/** What the dialog host is given: the options with the texts it draws. */
export type ConfirmRequest = Omit<ConfirmOptions, 'cancelText'> & { cancelText: string }

type Present = (request: ConfirmRequest) => void
let host: Present | null = null

/**
 * The dialog host (`ConfirmDialogHost`, mounted once at the root) takes the app's confirmations and notices: they are
 * its themed dialog, never a system alert (teal buttons on Android, no hardware back to dismiss them). Returns what
 * unregisters it.
 */
export const registerConfirmHost = (present: Present) => {
  host = present
  return () => { if (host === present) host = null }
}

/**
 * The app's confirmation, in the themed dialog: accept first (a destructive one in the danger look) and cancel
 * second. One implementation for the declarative `OAlertOriginal` (a piece with an `open` state) and for `useConfirm`
 * (a handler that asks on the spot). Before the host is mounted (a launch in progress, or a test) the system alert stands in,
 * so a question is never lost.
 */
export const presentConfirm = (request: ConfirmRequest) => {
  if (host) {
    host(request)
    return
  }
  const { title, message, acceptText, cancelText, destructive, notice, onAccept, onCancel } = request
  Alert.alert(title ?? '', message, [
    { text: acceptText, ...(destructive && { style: 'destructive' as const }), onPress: onAccept },
    ...(notice ? [] : [{ text: cancelText, onPress: onCancel }]),
  ])
}

/** The action as a question: "Remove printer" -> "Remove printer?". */
export const questionOf = (action: string) => {
  const text = (action ?? '').trim()
  return !text || /[?!.]$/.test(text) ? text : `${text}?`
}

/**
 * `confirm({ message, acceptText, destructive, onAccept })`: asks the user before something that
 * cannot be undone, titled by the action (`acceptText` + "?") unless the call gives a title, and "Cancel" to go back
 * unless the call says otherwise. Nothing happens until the accept button is pressed.
 */
export const useConfirm = () => {
  const [, t] = useLanguage()
  return useCallback((options: ConfirmOptions) => presentConfirm({
    ...options,
    title: options.title ?? questionOf(options.acceptText),
    cancelText: options.cancelText ?? t('CANCEL', 'Cancel'),
  }), [t])
}

/**
 * `notify({ title, message })`: tells the driver something that blocks (an error that stops what he was doing): the
 * same dialog with one "OK" button.
 */
export const useNotice = () => {
  const [, t] = useLanguage()
  return useCallback((options: Pick<ConfirmOptions, 'title' | 'message' | 'onAccept'> & { acceptText?: string }) => presentConfirm({
    ...options,
    notice: true,
    // A notice with no title of its own is its message: the app's name says nothing.
    title: options.title ?? '',
    acceptText: options.acceptText ?? t('OK', 'Ok'),
    cancelText: t('CANCEL', 'Cancel'),
  }), [t])
}
