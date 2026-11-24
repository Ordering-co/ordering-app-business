import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { Vibration } from 'react-native'

import { _retrieveStoreData, _setStoreData } from '../../providers/StoreUtil'

/** The sounds of the new-order alert, by id: the audio files are bundled with the app, the store keeps the id. */
export type AlertSoundId = 'bell' | 'chime' | 'alarm'

export interface AlertSettings {
  sound: AlertSoundId
  /** The alert rings again every few seconds until it is opened (off: it plays once). */
  ringUntilOpened: boolean
  vibrate: boolean
}

/** What the screen offers and how it names it (`labelKey` is the translation key, `fallback` its English). */
export const ALERT_SOUNDS: { id: AlertSoundId, labelKey: string, fallback: string }[] = [
  { id: 'bell', labelKey: 'SOUND_BELL', fallback: 'Bell' },
  { id: 'chime', labelKey: 'SOUND_CHIME', fallback: 'Chime' },
  { id: 'alarm', labelKey: 'SOUND_KITCHEN_ALARM', fallback: 'Kitchen alarm (loud)' }
]

/**
 * The sounds whose audio file the app bundles (`src/assets/sounds`, played by `alertSoundSource`): the three, so the picker
 * shows on the Alerts and sound screen. A sound without its file stays out of this list and out of the picker.
 */
export const BUNDLED_ALERT_SOUNDS: AlertSoundId[] = ['bell', 'chime', 'alarm']

/** The sounds to offer: the ones of `ALERT_SOUNDS` that are bundled. The picker needs a real choice (more than one). */
export const offeredAlertSounds = () => ALERT_SOUNDS.filter((sound) => BUNDLED_ALERT_SOUNDS.includes(sound.id))

/** Today's behaviour: the alert rings until it is opened, the order buzzes the phone. */
export const DEFAULT_ALERT_SETTINGS: AlertSettings = { sound: 'bell', ringUntilOpened: true, vibrate: true }

/** The AsyncStorage key (device setup: it survives log out, see `DEVICE_SETTINGS_KEYS`). */
export const ALERT_SETTINGS_KEY = 'alert_settings'

type Listener = () => void

let current: AlertSettings = DEFAULT_ALERT_SETTINGS
let loaded = false
let loading: Promise<AlertSettings> | null = null
const listeners = new Set<Listener>()
const testHandlers = new Set<(settings: AlertSettings) => void>()

const emit = () => listeners.forEach((listener) => listener())

/** What was stored, kept to the shape the app knows: a missing or odd value falls back to the default. */
export const normalizeAlertSettings = (stored: any): AlertSettings => {
  const sound = ALERT_SOUNDS.some((item) => item.id === stored?.sound) ? stored.sound : DEFAULT_ALERT_SETTINGS.sound
  return {
    sound,
    ringUntilOpened: typeof stored?.ringUntilOpened === 'boolean' ? stored.ringUntilOpened : DEFAULT_ALERT_SETTINGS.ringUntilOpened,
    vibrate: typeof stored?.vibrate === 'boolean' ? stored.vibrate : DEFAULT_ALERT_SETTINGS.vibrate
  }
}

const load = (): Promise<AlertSettings> => {
  if (loaded) return Promise.resolve(current)
  if (!loading) {
    loading = _retrieveStoreData(ALERT_SETTINGS_KEY).then((stored: any) => {
      // A change made while the store was being read wins over what was stored.
      if (!loaded) current = normalizeAlertSettings(stored)
      loaded = true
      loading = null
      emit()
      return current
    })
  }
  return loading
}

/** The settings, for code that is not a component (the websocket's vibration). */
export const getAlertSettings = (): Promise<AlertSettings> => load()

/** Changes the settings: at once for every reader, then persisted. */
export const updateAlertSettings = (patch: Partial<AlertSettings>) => {
  current = normalizeAlertSettings({ ...current, ...patch })
  loaded = true
  emit()
  return _setStoreData(ALERT_SETTINGS_KEY, current)
}

/**
 * The alert module registers how a test alert looks (its UI with a fake order and the sound); returns what removes it.
 * Without a handler the test only vibrates (when vibrate is on), so the button never does nothing.
 */
export const onTestAlert = (handler: (settings: AlertSettings) => void) => {
  testHandlers.add(handler)
  return () => { testHandlers.delete(handler) }
}

export const requestTestAlert = () => {
  if (testHandlers.size === 0) {
    if (current.vibrate) Vibration.vibrate()
    return
  }
  testHandlers.forEach((handler) => handler(current))
}

const subscribe = (listener: Listener) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** For tests: back to the defaults, nothing stored read. */
export const resetAlertSettings = () => {
  current = DEFAULT_ALERT_SETTINGS
  loaded = false
  loading = null
  testHandlers.clear()
  emit()
}

/**
 * The new-order alert's local settings (`useAlertSettings()`), shared by the Alerts and sound screen and the alert
 * itself: a change on the screen is the alert's next ring. `loaded` is false until the stored value is read (the
 * defaults are what shows meanwhile).
 */
export const useAlertSettings = () => {
  const settings = useSyncExternalStore(subscribe, () => current)
  useEffect(() => { load() }, [])
  const update = useCallback((patch: Partial<AlertSettings>) => { updateAlertSettings(patch) }, [])
  return { ...settings, loaded, update, requestTestAlert }
}
