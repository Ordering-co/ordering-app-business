/**
 * Native mocks for B7. Import first in DriverMap / PhoneInputNumber tests.
 */
/* eslint-env jest */

require('./registerB5NativeMocks')

jest.mock('react-native-vector-icons/FontAwesome5', () => 'Icon')
jest.mock('react-native-vector-icons/FontAwesome', () => 'Icon')

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

jest.mock('react-native-phone-number-input', () => {
  const React = require('react')
  const { View, TextInput } = require('react-native')
  return React.forwardRef((props, ref) => {
    const lastRef = React.useRef(String(props.defaultValue || ''))
    React.useImperativeHandle(ref, () => ({
      isValidNumber: (n) => {
        const digits = String(n || '').replace(/\D/g, '')
        return digits.length >= 10 && digits.length <= 15
      },
      getCallingCode: () => '1',
      getNumberAfterPossiblyEliminatingZero: () => {
        const raw = String(lastRef.current || '')
        const digits = raw.replace(/\D/g, '')
        const number = digits.length > 10 ? digits.slice(-10) : digits
        return { number, formattedNumber: raw || `+1${number}` }
      }
    }))
    return React.createElement(
      View,
      { testID: 'phone-number-input' },
      React.createElement(TextInput, {
        testID: 'phone-number-text',
        placeholder: props.placeholder,
        defaultValue: props.defaultValue,
        onChangeText: (text) => {
          lastRef.current = text
          props.onChangeFormattedText?.(text)
        }
      })
    )
  })
})
