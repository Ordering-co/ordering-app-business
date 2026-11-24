/**
 * Jest setup file referenced by jest.config.js (`setupFiles`).
 * Registers native-module mocks the React Native preset needs.
 */
/* eslint-env jest */

try {
  require('react-native-gesture-handler/jestSetup')
} catch (e) {}

jest.mock('@react-native-vector-icons/ionicons/static', () => 'Icon')
jest.mock('@react-native-vector-icons/material-design-icons/static', () => 'Icon')

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 }
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
  }
})

// React Navigation 7's packages import each other's internals (`createScreenFactory`…): the real
// package stays and only what a screen reads from the container is replaced.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
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
  useIsFocused: () => true,
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
  ...jest.requireActual('@react-navigation/bottom-tabs'),
  createBottomTabNavigator: () => ({
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

jest.mock('react-native-bootsplash', () => ({
  __esModule: true,
  default: {
    hide: jest.fn(() => Promise.resolve()),
    isVisible: jest.fn(() => Promise.resolve(false))
  }
}))

jest.mock('react-native-sound-player', () => ({
  playAsset: jest.fn(),
  playUrl: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() }))
}))

// OneSignal 5: every call is recorded and the listeners are kept (jest/helpers/mockOneSignal.js).
jest.mock('react-native-onesignal', () => require('./helpers/mockOneSignal'))

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(),
    displayNotification: jest.fn(() => Promise.resolve('notification-id')),
    onForegroundEvent: jest.fn(() => jest.fn())
  },
  AndroidImportance: { HIGH: 4 },
  EventType: { PRESS: 1 }
}))
