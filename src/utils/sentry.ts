import * as Sentry from '@sentry/react-native'
import DeviceInfo from 'react-native-device-info'

import settings from '../config.json'
import sentryConfig from '../sentry.json'

export const initSentry = () => {
  if (__DEV__ || !sentryConfig.dsn) return

  try {
    const version = DeviceInfo.getVersion()
    const buildNumber = DeviceInfo.getBuildNumber()

    Sentry.init({
      dsn: sentryConfig.dsn,
      environment: 'production',
      release: `${DeviceInfo.getBundleId()}@${version}+${buildNumber}`,
      dist: buildNumber,
      enableNativeCrashHandling: false,
      enableAppHangTracking: false,
      tracesSampleRate: 0.1
    })

    Sentry.setTag('app', 'app-business-26')
    Sentry.setTag('project', settings.project)
  } catch (e) {}
}
