import fs from 'fs'
import path from 'path'

describe('BusinessApp splash image', () => {
  it('shows the native launch screen image while the app loads', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../BusinessApp.tsx'),
      'utf8'
    )

    expect(src).not.toContain('loading-splash.png')
    expect(src).toMatch(/loadingSplash: Platform\.OS === 'ios'\s*\?\s*\{ uri: 'SplashImage' \}\s*:\s*require\('\.\.\/android\/app\/src\/main\/res\/mipmap-xxxhdpi\/splash\.png'\)/)
  })

  it('hides the native splash when the project is ready only on iOS, and always on error', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../onboarding/project-setup-gate.tsx'),
      'utf8'
    )

    expect(src).toMatch(/if \(error \|\| \(ready && Platform\.OS === 'ios'\)\) SplashScreen\.hide\(\)/)
  })
})
