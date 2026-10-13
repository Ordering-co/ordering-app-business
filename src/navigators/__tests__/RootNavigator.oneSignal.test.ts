import fs from 'fs'
import path from 'path'

describe('RootNavigator OneSignal setup and subscribe', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '../RootNavigator.tsx'),
    'utf8'
  )

  it('does not re-run OneSignal setup when a notification token arrives', () => {
    expect(src).toContain('getOneSignalSetupPlan')
    expect(src).toMatch(
      /useEffect\([\s\S]*getOneSignalSetupPlan[\s\S]*\[configsLoading,\s*configs\?\.onesignal_businessapp_id\?\.value,\s*auth\]/
    )
    expect(src).not.toMatch(
      /\[configsLoading,\s*configs,\s*auth,\s*oneSignalState\?\.notification_token\]/
    )
  })

  it('registers the push token only after a real device token exists', () => {
    expect(src).toContain('shouldRegisterPushToken')
    expect(src).toMatch(
      /useEffect\([\s\S]*shouldRegisterPushToken[\s\S]*\[oneSignalState\.notification_token,\s*auth\]/
    )
    expect(src).not.toMatch(
      /if \(auth && oneSignalState\.notification_app\)/
    )
  })
})
