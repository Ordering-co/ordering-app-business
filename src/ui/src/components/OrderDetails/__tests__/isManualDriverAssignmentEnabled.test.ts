import { isManualDriverAssignmentEnabled } from '../isManualDriverAssignmentEnabled'

describe('isManualDriverAssignmentEnabled', () => {
  it('is disabled when admin driver assignment is off', () => {
    expect(isManualDriverAssignmentEnabled({
      assign_driver_enabled: { value: '0' },
      store_app_manual_driver_assignment_enabled: { value: '1' }
    })).toBe(false)
  })

  it('keeps the manual flow when the store app config is missing', () => {
    expect(isManualDriverAssignmentEnabled({
      assign_driver_enabled: { value: '1' }
    })).toBe(true)
  })

  it('keeps the manual flow when the store app config is on', () => {
    expect(isManualDriverAssignmentEnabled({
      assign_driver_enabled: { value: '1' },
      store_app_manual_driver_assignment_enabled: { value: '1' }
    })).toBe(true)
  })

  it('hides manual assignment when the store app config is off', () => {
    expect(isManualDriverAssignmentEnabled({
      assign_driver_enabled: { value: '1' },
      store_app_manual_driver_assignment_enabled: { value: '0' }
    })).toBe(false)
  })

  it('is disabled without configs', () => {
    expect(isManualDriverAssignmentEnabled(undefined)).toBe(false)
    expect(isManualDriverAssignmentEnabled(null)).toBe(false)
    expect(isManualDriverAssignmentEnabled({})).toBe(false)
  })
})
