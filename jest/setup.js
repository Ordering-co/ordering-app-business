/**
 * Jest setup file referenced by jest.config.js (`setupFiles`).
 * Registers native-module mocks the React Native preset needs.
 */
/* eslint-env jest */

try {
  require('react-native-gesture-handler/jestSetup')
} catch (e) {}

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon')
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon')
jest.mock('react-native-vector-icons/Foundation', () => 'Icon')
jest.mock('react-native-vector-icons/AntDesign', () => 'Icon')
jest.mock('react-native-vector-icons/Feather', () => 'Icon')

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true })

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 }
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
  }
})

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn())
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
  createNavigatorFactory: () => () => ({
    Navigator: ({ children }) => children,
    Screen: () => null,
    Group: ({ children }) => children
  })
}))

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null
  }),
  CardStyleInterpolators: {},
  TransitionSpecs: {},
  HeaderStyleInterpolators: {}
}))

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null
  })
}))

jest.mock('@react-navigation/drawer', () => ({
  createDrawerNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null
  })
}))

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  useNetInfo: jest.fn(() => ({ isConnected: true }))
}))

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1'),
  getBundleId: jest.fn(() => 'com.businessapp'),
  isTablet: jest.fn(() => false)
}))

jest.mock('react-native-restart', () => ({
  restart: jest.fn()
}))

jest.mock('react-native-fast-image', () => {
  const React = require('react')
  const { View } = require('react-native')
  const FastImage = (props) => React.createElement(View, { testID: 'fast-image', ...props })
  FastImage.resizeMode = { contain: 'contain', cover: 'cover', stretch: 'stretch' }
  FastImage.priority = { low: 'low', normal: 'normal', high: 'high' }
  FastImage.cacheControl = { immutable: 'immutable', web: 'web', cacheOnly: 'cacheOnly' }
  return { __esModule: true, default: FastImage, resizeMode: FastImage.resizeMode }
})

jest.mock('toggle-switch-react-native', () => {
  const React = require('react')
  const { View } = require('react-native')
  return (props) => React.createElement(View, { testID: 'toggle-switch', ...props })
})

jest.mock('react-native-splash-screen', () => ({
  hide: jest.fn(),
  show: jest.fn()
}))

jest.mock('@twotalltotems/react-native-otp-input', () => {
  const React = require('react')
  const { View } = require('react-native')
  return () => React.createElement(View, { testID: 'otp-input-view' })
})

jest.mock('react-native-sound-player', () => ({
  playAsset: jest.fn(),
  stop: jest.fn()
}))

jest.mock('react-native-onesignal', () => ({
  setAppId: jest.fn(),
  setNotificationOpenedHandler: jest.fn(),
  setNotificationWillShowInForegroundHandler: jest.fn(),
  promptForPushNotificationsWithUserResponse: jest.fn(),
  setExternalUserId: jest.fn(),
  removeExternalUserId: jest.fn()
}))
