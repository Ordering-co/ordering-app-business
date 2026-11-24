import fs from 'fs'
import path from 'path'
import { defaultAppTheme } from '../engine'

/**
 * The bundled fonts are linked on both platforms: a missing file falls back to the system font without
 * an error. `react-native.config.js` links `src/assets/fonts`; the native project then has them in the
 * Android assets and in `UIAppFonts`. This is the check of the native step (docs/THEMING.md section 9).
 */
const root = path.join(__dirname, '../../..')
const schema = require('../../../product.schema.json')
const catalog: string[] = schema.tokens.font.body.$extensions['co.ordering.editor'].options.map((o: any) => o.value)

const infoPlist = (): string => {
  const ios = path.join(root, 'ios')
  const project = fs.readdirSync(ios).find((name) => fs.existsSync(path.join(ios, name, 'Info.plist')) && fs.readFileSync(path.join(ios, name, 'Info.plist'), 'utf8').includes('UIAppFonts'))
  return project ? fs.readFileSync(path.join(ios, project, 'Info.plist'), 'utf8') : ''
}

describe('the bundled fonts are linked', () => {
  const files = (font: string) => {
    const typography = Object.fromEntries(Object.entries(defaultAppTheme().values.tokens.typography).map(([k, v]: any) => [k, { ...v, family: font }]))
    const theme = JSON.parse(JSON.stringify({ font }))
    return Object.values(
      require('../engine').buildAppTheme({ version: 2, product_type: 'store_app', values: { tokens: { font: { heading: theme.font, body: theme.font }, typography } } }).native.fonts.body.files
    ) as string[]
  }

  it('react-native.config.js links the fonts folder', () => {
    expect(require('../../../react-native.config.js').assets).toContain('./src/assets/fonts')
  })

  it.each(catalog)('%s: every weight is in the Android assets and in Info.plist', (font) => {
    const plist = infoPlist()
    for (const file of files(font)) {
      expect({ file, android: fs.existsSync(path.join(root, 'android/app/src/main/assets/fonts', `${file}.ttf`)) }).toEqual({ file, android: true })
      expect({ file, ios: plist.includes(`<string>${file}.ttf</string>`) }).toEqual({ file, ios: true })
    }
  })
})
