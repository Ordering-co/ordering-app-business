export function getPrintRunFeedback (results: unknown) {
  const outcomes = Array.isArray(results)
    ? results.map((result) => result === true)
    : []

  const printedCount = outcomes.filter(Boolean).length
  const failedCount = outcomes.length - printedCount

  return {
    printedCount,
    failedCount,
    showSuccessToast: outcomes.length > 0 && failedCount === 0
  }
}
