/**
 * Native / third-party mocks for B5 stores & map UI tests.
 * Import as the first line in MapView / GoogleMap / BusinessProductList test files.
 */
/* eslint-env jest */

jest.mock('react-native-maps', () => {
  const React = require('react')
  const { View } = require('react-native')
  const MapView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
      animateCamera: jest.fn(),
      fitToCoordinates: jest.fn()
    }))
    return React.createElement(View, { testID: 'map-view', ...props })
  })
  MapView.Marker = (props) => React.createElement(View, { testID: 'map-marker', ...props })
  MapView.Polygon = (props) => React.createElement(View, { testID: 'map-polygon', ...props })
  MapView.Circle = (props) => React.createElement(View, { testID: 'map-circle', ...props })
  MapView.Callout = (props) => React.createElement(View, { testID: 'map-callout', ...props })
  return {
    __esModule: true,
    default: MapView,
    Marker: MapView.Marker,
    Polygon: MapView.Polygon,
    Circle: MapView.Circle,
    Callout: MapView.Callout,
    PROVIDER_GOOGLE: 'google',
    MarkerAnimated: View,
    AnimatedRegion: jest.fn()
  }
})

jest.mock('react-native-geocoding', () => ({
  init: jest.fn(),
  from: jest.fn(() =>
    Promise.resolve({
      results: [{
        formatted_address: '123 Main St',
        geometry: { location: { lat: 40.7128, lng: -74.006 } },
        address_components: [{ types: ['postal_code'], short_name: '10001' }],
        place_id: 'place-1'
      }]
    })
  )
}))

jest.mock('react-native-map-link', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    showLocation: jest.fn(),
    Popup: ({ isVisible, ...props }) =>
      isVisible
        ? React.createElement(View, { testID: 'map-link-popup', ...props })
        : null
  }
})

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn((success) =>
    success({ coords: { latitude: 40.7128, longitude: -74.006 } })
  ),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
  stopObserving: jest.fn()
}))

jest.mock('rn-placeholder', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    Placeholder: ({ children }) => React.createElement(View, { testID: 'placeholder' }, children),
    PlaceholderLine: () => React.createElement(View, { testID: 'placeholder-line' }),
    Fade: {}
  }
})

jest.mock('react-native-intersection-observer', () => {
  const React = require('react')
  const { ScrollView, View } = require('react-native')
  return {
    IOScrollView: (props) => React.createElement(ScrollView, props),
    InView: ({ children }) => React.createElement(View, null, children)
  }
})
