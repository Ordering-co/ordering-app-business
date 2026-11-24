/**
 * Whether the store app shows manual driver assignment. The project must turn it on (`assign_driver_enabled` is '1': a
 * project without that config has no "Assign" anywhere); the store app's own switch
 * (`store_app_manual_driver_assignment_enabled`) only turns it off when it is '0' and, being missing, keeps it on.
 */
export function isManualDriverAssignmentEnabled (configs?: Record<string, any> | null, level?: number | null): boolean {
  if (configs?.assign_driver_enabled?.value !== '1') {
    return false
  }

  if (configs?.store_app_manual_driver_assignment_enabled?.value === '0') {
    return false
  }

  if (level === 5) {
    return configs?.delivery_manager_manual_driver_assignment_enabled?.value !== '0'
  }

  return true
}
