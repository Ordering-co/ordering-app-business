/**
 * Partial @ui mock for DriverMap (useLocation + dual FloatingButton).
 */
/* eslint-env jest */

const path = require('path')

const root = path.join(__dirname, '../..')
const req = (relativePath) => require(path.join(root, relativePath))
const { locationHookState } = require('./b5StoresUiMock')

const buildB7LegacyUiMock = (options = {}) => {
  const React = require('react')
  const { View, Pressable, Text } = require('react-native')

  return {
    OText: req('src/ui/src/components/shared/OText').default,
    OButton: req('src/ui/src/components/shared/OButton').default,
    OIcon: req('src/ui/src/components/shared/OIcon').default,
    OIconButton: req('src/ui/src/components/shared/OIconButton').default,
    OFab: req('src/ui/src/components/shared/OFab').default,
    OAlertOriginal: ({ open, content, title, onAccept, onClose }) =>
      open
        ? React.createElement(
          View,
          { testID: 'alert-original' },
          React.createElement(Text, null, title),
          ...(Array.isArray(content) ? content : [content]).map((line, i) =>
            React.createElement(Text, { key: i }, line)
          ),
          React.createElement(
            Pressable,
            { testID: 'alert-accept', onPress: onAccept || onClose },
            React.createElement(Text, null, 'OK')
          )
        )
        : null,
    FloatingButton: ({
      firstButtonClick,
      secondButtonClick,
      btnText,
      secondBtnText,
      secondButton,
      isHideRejectButtons
    }) =>
      React.createElement(
        View,
        { testID: 'floating-button-stub' },
        !isHideRejectButtons &&
          React.createElement(
            Pressable,
            { testID: 'floating-first', onPress: firstButtonClick },
            React.createElement(Text, null, btnText || 'Reject')
          ),
        (secondButton || secondButtonClick) &&
          React.createElement(
            Pressable,
            { testID: 'floating-second', onPress: secondButtonClick },
            React.createElement(Text, null, secondBtnText || 'Accept')
          )
      ),
    useLocation: options.useLocation || jest.fn(() => locationHookState)
  }
}

module.exports = { buildB7LegacyUiMock, locationHookState }
