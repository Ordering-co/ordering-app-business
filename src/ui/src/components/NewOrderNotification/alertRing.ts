import { useEffect, useState } from 'react'
import { AppState, Vibration } from 'react-native'
import SoundPlayer from 'react-native-sound-player'

import type { AlertSoundId } from '../AlertSettings'

/**
 * The sound the alert had before the three were bundled (a remote file). It is only the fallback: it plays when a
 * bundled file cannot be played, so an alert is never silent for a missing asset.
 */
const FALLBACK_SOUND_URL = 'https://d33aymufw4jvwf.cloudfront.net/notification.mp3'

/** How often the alert rings again while it stays open ("ring until opened"). */
export const RING_EVERY_MS = 2500

/** The repeating vibration of an open alert: a pause, then three buzzes (the driver app's). */
export const VIBRATION_PATTERN = [0, 800, 400, 800, 400, 800]

/**
 * The files of the three sounds, bundled with the JavaScript (`src/assets/sounds`, made as `docs/SOUNDS.md` says): the
 * alert plays the chosen one by its id, with no network. (A push that arrives while the app is in the background plays
 * the native file fixed at build time, which is the Bell.)
 */
const BUNDLED: Record<AlertSoundId, number> = {
  bell: require('../../../../assets/sounds/bell.mp3'),
  chime: require('../../../../assets/sounds/chime.mp3'),
  alarm: require('../../../../assets/sounds/alarm.mp3')
}

/** How long each file plays (`docs/SOUNDS.md`): a repeat never cuts the Kitchen alarm off, it waits a second after it. */
const LENGTH_MS: Record<AlertSoundId, number> = { bell: 550, chime: 450, alarm: 3000 }

/** The time between two rings of a sound while the alert stays open. */
export const ringEveryMs = (id: AlertSoundId): number => Math.max(RING_EVERY_MS, (LENGTH_MS[id] ?? 0) + 1000)

export interface AlertSoundSource {
  /** The bundled file (a `require()` asset number). */
  asset: number
  /** What plays if the bundled file cannot. */
  fallbackUrl: string
}

/** The one place that says what plays for a sound of the settings. An id the app does not know is the Bell. */
export const alertSoundSource = (id: AlertSoundId): AlertSoundSource => ({ asset: BUNDLED[id] ?? BUNDLED.bell, fallbackUrl: FALLBACK_SOUND_URL })

/**
 * Plays the alert's sound once (the bundled file of `id`) and answers what stops it. Never throws: a sound that fails
 * falls back to the remote file, and if that fails too the alert is silent, not broken.
 */
export const playAlertSound = (id: AlertSoundId): (() => void) => {
  const { asset, fallbackUrl } = alertSoundSource(id)
  let failed: { remove: () => void } | null = null
  const fallBack = () => {
    try {
      SoundPlayer.playUrl(fallbackUrl)
    } catch (error: any) {
      console.log('Sound Error - ', error?.message)
    }
  }
  try {
    // A file the system cannot set up reports it as an event, not as an exception.
    if (typeof SoundPlayer.addEventListener === 'function') {
      failed = SoundPlayer.addEventListener('OnSetupError', () => { failed?.remove(); failed = null; fallBack() })
    }
    SoundPlayer.playAsset(asset)
  } catch (error: any) {
    console.log('Sound Error - ', error?.message)
    fallBack()
  }
  return () => {
    try {
      failed?.remove()
      failed = null
      SoundPlayer.stop()
    } catch (error: any) {
      console.log('Sound Error - ', error?.message)
    }
  }
}

/** The app is in front unless the system says it is in the background or inactive (not known yet counts as in front). */
const inFront = (state: string | null | undefined) => state !== 'background' && state !== 'inactive'

/** Whether the app is in front: an alert rings only then (a push rings in the background). */
export const useAppActive = (): boolean => {
  const [active, setActive] = useState(inFront(AppState.currentState))
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(inFront(state)))
    return () => subscription.remove()
  }, [])
  return active
}

interface RingOptions {
  /** Ring now: an alert is open, not muted, and the app is in front. */
  ringing: boolean
  sound: AlertSoundId
  /** Ring again every few seconds until the alert is closed (else once). */
  loop: boolean
  vibrate: boolean
  /** Counts every arrival: a new order rings again, even when the alert was already open. */
  arrival: number
}

/**
 * The sound and the vibration of an open alert: the sound on the alert's arrival and, with `loop`, again every
 * `RING_EVERY_MS`; the vibration, with `vibrate`, as a repeating pattern. Stopping (a mute, the alert closing, the
 * app leaving the front, a setting that changed) stops both.
 */
export const useAlertRing = ({ ringing, sound, loop, vibrate, arrival }: RingOptions) => {
  useEffect(() => {
    if (!ringing) return
    if (vibrate) Vibration.vibrate(VIBRATION_PATTERN, true)
    let stop = playAlertSound(sound)
    const timer = loop
      ? setInterval(() => {
        stop()
        stop = playAlertSound(sound)
      }, ringEveryMs(sound))
      : null
    return () => {
      if (timer) clearInterval(timer)
      stop()
      if (vibrate) Vibration.cancel()
    }
  }, [ringing, sound, loop, vibrate, arrival])
}

/** Whether an alert is mounted: the single global buzz (`subscribeOrdersRegisterVibration`) stays only when none is. */
let hosts = 0
export const registerAlertHost = (): (() => void) => {
  hosts += 1
  let released = false
  return () => {
    if (released) return
    released = true
    hosts -= 1
  }
}
export const isAlertHostMounted = (): boolean => hosts > 0
