import { Linking } from 'react-native'
import { useLanguage } from '@components'
import { useNotice } from '../shared/confirmAction'

/**
 * Opens a contact link (`tel:`, `mailto:`, the maps app) of a party as the app's links do: a number that is not
 * dialable (`invalid`) or a link the phone cannot open says so with the app's dialog.
 */
export const useOpenContact = () => {
  const [, t] = useLanguage()
  const notify = useNotice()

  const alert = (message: string) =>
    notify({ title: t('ERROR_OPENING_THE_LINK', 'Error opening the link'), message })

  return async (url?: string | null) => {
    if (!url) return
    if (url.includes('tel:') && url.includes('invalid')) {
      alert(t('INVALID_NUMBER', 'Invalid number'))
      return
    }
    try {
      if (await Linking.canOpenURL(url)) await Linking.openURL(url)
      else alert(t('LINK_UNSUPPORTED', 'Link could not be opened or is not supported'))
    } catch (error) {
      alert(t('LINK_UNSUPPORTED', 'Link could not be opened or is not supported'))
    }
  }
}
