import fs from 'fs'
import path from 'path'

describe('RootNavigator orders_register vibration', () => {
  it('unsubscribes with the same listener used to subscribe', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../RootNavigator.tsx'),
      'utf8'
    )

    expect(src).toContain('subscribeOrdersRegisterVibration')
    expect(src).not.toMatch(
      /socket\.off\(\s*['"]orders_register['"]\s*,\s*\(\)\s*=>\s*Vibration\.vibrate\(\)/
    )
  })
})
