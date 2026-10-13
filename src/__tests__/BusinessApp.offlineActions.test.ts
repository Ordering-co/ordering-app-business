import fs from 'fs'
import path from 'path'

describe('BusinessApp offline actions', () => {
  it('mounts OfflineActionsProvider inside OrderingProvider', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../BusinessApp.tsx'),
      'utf8'
    )

    expect(src).toContain('OfflineActionsProvider')
    expect(src).toMatch(
      /<OrderingProvider[\s\S]*<OfflineActionsProvider>[\s\S]*<\/OfflineActionsProvider>[\s\S]*<\/OrderingProvider>/
    )
  })
})
