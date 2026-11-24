module.exports = {
  dependencies: {
    // iOS only: on Android the system print dialog saves the PDF, and the library's pdfbox-android brings BouncyCastle (about 4 MB) for nothing
    'react-native-html-to-pdf': { platforms: { android: null } }
  },
  project: {
    ios: {},
    android: {} // grouped into "project"
  },
  assets: ['./src/assets/fonts'] // stays the same
}
