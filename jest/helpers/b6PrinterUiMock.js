/**
 * Partial @ui mock for B6 printer components.
 */
/* eslint-env jest */

const path = require('path')

const root = path.join(__dirname, '../..')
const req = (relativePath) => require(path.join(root, relativePath))

const buildB6PrinterUiMock = (options = {}) => {
  const React = require('react')
  const { View, Text } = require('react-native')

  return {
    Container: ({ children, noPadding, ...rest }) =>
      React.createElement(
        View,
        { testID: noPadding ? 'container-no-padding' : 'container', ...rest },
        children
      ),
    OText: req('src/ui/src/components/shared/OText').default,
    OButton: req('src/ui/src/components/shared/OButton').default,
    OInput: req('src/ui/src/components/shared/OInput').default,
    OIcon: req('src/ui/src/components/shared/OIcon').default,
    OIconButton: req('src/ui/src/components/shared/OIconButton').default,
    ONavbar: req('src/ui/src/components/shared/ONavbar').default,
    OModal: req('src/ui/src/components/shared/OModal').default,
    PrinterEdition:
      options.PrinterEdition ||
      ((props) =>
        React.createElement(
          View,
          { testID: 'printer-edition-stub' },
          React.createElement(Text, null, props.printer?.model || 'add')
        ))
  }
}

module.exports = { buildB6PrinterUiMock }
