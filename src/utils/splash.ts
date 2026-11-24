import BootSplash from 'react-native-bootsplash'

/**
 * Hides the native launch splash (react-native-bootsplash: iOS's BootSplash.storyboard,
 * Android's BootTheme), fading out. It stays over the app from the first frame until this
 * is called. Hiding it again is harmless. The only place that talks to the library:
 * `BusinessApp` (iOS, first render) and the `Splash` page (image drawn, failed or 5 s).
 */
export const hideSplash = () => {
  BootSplash.hide({ fade: true }).catch(() => undefined)
}
