/** The clock time of a moment (ms since epoch) in the device's format: "12:14 PM", "12:14". */
export const formatClock = (at: number): string =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
