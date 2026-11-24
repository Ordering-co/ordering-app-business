export function getRemoveAccountSessionPlan (result: unknown) {
  if (result === 'OK') {
    return {
      logout: true,
      clearLocalStore: true
    }
  }

  return {
    logout: false,
    clearLocalStore: false
  }
}
