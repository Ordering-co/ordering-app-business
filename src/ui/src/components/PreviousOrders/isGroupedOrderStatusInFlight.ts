/** A status change is running (the controller's flag, or one this list just sent): a second one is not sent. */
export function isGroupedOrderStatusInFlight ({ loadingChangeOrder, submitting }: { loadingChangeOrder?: boolean, submitting?: boolean }) {
  return !!(loadingChangeOrder || submitting)
}
