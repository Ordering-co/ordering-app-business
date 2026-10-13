/** Whether the store app shows manual driver assignment; a missing config keeps it enabled. */
export function isManualDriverAssignmentEnabled (configs?: Record<string, any> | null): boolean {
  if (configs?.assign_driver_enabled?.value !== '1') {
    return false
  }

  return configs?.store_app_manual_driver_assignment_enabled?.value !== '0'
}
