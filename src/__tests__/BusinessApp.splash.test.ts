import fs from 'fs'
import path from 'path'

describe('BusinessApp splash', () => {
  const src = fs.readFileSync(path.join(__dirname, '../BusinessApp.tsx'), 'utf8')

  it('hides the native splash on both platforms, once the cached theme is read', () => {
    expect(src).toMatch(/if \(cachedTheme !== undefined && \(!configStore\.loading \|\| !settings\.use_root_point\)\) \{\s*hideSplash\(\);/)
    expect(src).not.toContain('react-native-splash-screen')
    expect(src).not.toContain('Platform.OS')
  })

  it('paints nothing until the cached theme is read, then mounts the one theme provider above everything', () => {
    expect(src).toContain('if (cachedTheme === undefined) return null')
    expect(src).toMatch(/<AppThemeProvider initialEnvelope=\{cachedTheme\}>[\s\S]*<OrderingProvider[\s\S]*<RemoteThemeLoader[\s\S]*<OToast \/>/)
    expect(src).not.toContain('theme.json')
    expect(src).not.toMatch(/ThemeProvider[^R]*from '@ui'/)
  })
})
