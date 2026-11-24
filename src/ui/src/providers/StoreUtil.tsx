import AsyncStorage from '@react-native-async-storage/async-storage';
import { flatArray } from '../utils'

export const _retrieveStoreData = async (key: string) => {
  if (!key) return
  try {
    const value = await AsyncStorage.getItem(key);
    return value != null ? JSON.parse(value) : null;
  } catch {
    return null
  }
};

export const _setStoreData = async (key: string, val: any) => {
  if (!key) return
  try {
    const value = JSON.stringify(val)
    await AsyncStorage.setItem(key, value)
  } catch {
    return null
  }
};

export const _removeStoreData = (key: string) => {
  if (!key) return
  try {
    AsyncStorage.removeItem(key)
  } catch {
    return null
  }
};

export const _clearStoreData = async (options: any = {}) => {
  try {
    const keys: any = await AsyncStorage.getAllKeys()
    let filterKeys: any = keys
    if (options?.excludedKeys) {
      filterKeys = filterKeys.filter((k: any) => !options?.excludedKeys.includes(k))
    }
    if (options?.includedKeys) {
      filterKeys.push(options?.includedKeys)
    }
    AsyncStorage.multiRemove(flatArray(filterKeys))
  } catch {
    return null
  }
}

/**
 * What belongs to this device and not to the person who signed in: the printers and their print settings, and
 * the new-order alert's settings. Log out keeps them (the kitchen does not set its printers up again at each
 * shift change); removing the account does not.
 */
export const DEVICE_SETTINGS_KEYS = [
  'printers',
  'auto_print_after_accept_order',
  'ticket_print_options',
  'ticket_copies',
  'printer_last_results',
  'alert_settings'
]

/** The keys log out keeps: the device's settings, the tutorial's flag and the language. */
export const KEPT_ON_LOGOUT = ['isTutorial', 'language', ...DEVICE_SETTINGS_KEYS]

/** What log out clears: everything of the person's session (the push state, the project, the offline caches). */
export const _clearStoreDataOnLogout = () => _clearStoreData({ excludedKeys: KEPT_ON_LOGOUT })

export const StoreMethods = {
  _retrieveStoreData,
  _setStoreData,
  _removeStoreData,
  _clearStoreData,
  _clearStoreDataOnLogout
}
