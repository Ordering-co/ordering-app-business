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

  it('hides manual assignment for every level when the store app config is off', () => {
    const configs = {
      assign_driver_enabled: { value: '1' },
      store_app_manual_driver_assignment_enabled: { value: '0' },
      delivery_manager_manual_driver_assignment_enabled: { value: '1' }
    }

    expect(isManualDriverAssignmentEnabled(configs, 0)).toBe(false)
    expect(isManualDriverAssignmentEnabled(configs, 2)).toBe(false)
    expect(isManualDriverAssignmentEnabled(configs, 5)).toBe(false)
  })

  it('lets delivery managers assign when both configs are on', () => {
    expect(isManualDriverAssignmentEnabled({
      assign_driver_enabled: { value: '1' },
      store_app_manual_driver_assignment_enabled: { value: '1' },
      delivery_manager_manual_driver_assignment_enabled: { value: '1' }
    }, 5)).toBe(true)
  })

  it('hides manual assignment only for delivery managers when only their config is off', () => {
    expect(isManualDriverAssignmentEnabled({
      assign_driver_enabled: { value: '1' },
      store_app_manual_driver_assignment_enabled: { value: '1' },
      delivery_manager_manual_driver_assignment_enabled: { value: '0' }
    }, 5)).toBe(false)
  })

  it('keeps other levels assigning when only the delivery manager config is off', () => {
    const configs = {
      assign_driver_enabled: { value: '1' },
      store_app_manual_driver_assignment_enabled: { value: '1' },
      delivery_manager_manual_driver_assignment_enabled: { value: '0' }
    }

    expect(isManualDriverAssignmentEnabled(configs, 2)).toBe(true)
    expect(isManualDriverAssignmentEnabled(configs, 0)).toBe(true)
  })

  it('keeps delivery managers on admin driver assignment', () => {
    expect(isManualDriverAssignmentEnabled({
      assign_driver_enabled: { value: '0' }
    }, 5)).toBe(false)
  })

  it('is disabled without configs', () => {
    expect(isManualDriverAssignmentEnabled(undefined)).toBe(false)
    expect(isManualDriverAssignmentEnabled(null)).toBe(false)
    expect(isManualDriverAssignmentEnabled({})).toBe(false)
  })
})
