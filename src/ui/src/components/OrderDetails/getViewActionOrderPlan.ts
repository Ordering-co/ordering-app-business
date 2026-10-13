export function getViewActionOrderPlan ({
  loading
}: {
  action?: string
  loading?: boolean
}) {
  if (loading) {
    return {
      ignore: true,
      persistStatusBeforeConfirm: false,
      openModal: false
    }
  }

  return {
    ignore: false,
    persistStatusBeforeConfirm: false,
    openModal: true
  }
}
