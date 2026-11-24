import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE, type BuildOptions } from '../../src/theme/engine'

/**
 * A theme built the way the app builds one: the defaults' values, changed by `mutate`
 * (it receives a deep copy and changes it in place), then completed with the compiled
 * schema and converted with `toNative`. Never a raw JSON object or a spread of one.
 *
 *   const theme = themeWithValues((values) => { values.tokens.color.primary = '#FF0000' }, { platform: 'tablet' })
 */
export const themeWithValues = (mutate: (values: any) => void, options: BuildOptions = {}) => {
  const values = JSON.parse(JSON.stringify(defaultAppTheme().values))
  mutate(values)
  return buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values }, options)
}
