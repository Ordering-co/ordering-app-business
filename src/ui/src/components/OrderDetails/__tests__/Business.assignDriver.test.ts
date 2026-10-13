import fs from 'fs'
import path from 'path'

describe('Order Details assign driver', () => {
  it('gates the assign driver picker with the store app config', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../Business.tsx'),
      'utf8'
    )

    expect(src).toContain('isManualDriverAssignmentEnabled')
    expect(src).not.toContain("configs?.assign_driver_enabled?.value === '1'")
    expect(src).toMatch(/isManualDriverAssignmentEnabled\(configs\)[\s\S]*<AssignDriver>/)
  })
})
