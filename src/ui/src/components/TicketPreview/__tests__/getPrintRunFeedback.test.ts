import { getPrintRunFeedback } from '../getPrintRunFeedback'

describe('getPrintRunFeedback', () => {
  it('does not claim success when there were no printers', () => {
    expect(getPrintRunFeedback(null)).toEqual({
      printedCount: 0,
      failedCount: 0,
      showSuccessToast: false
    })
    expect(getPrintRunFeedback([])).toEqual({
      printedCount: 0,
      failedCount: 0,
      showSuccessToast: false
    })
  })

  it('claims success only when every printer in the run succeeded', () => {
    expect(getPrintRunFeedback([true, true])).toEqual({
      printedCount: 2,
      failedCount: 0,
      showSuccessToast: true
    })
  })

  it('does not claim success when an earlier printer failed and the last succeeded', () => {
    expect(getPrintRunFeedback([false, true])).toEqual({
      printedCount: 1,
      failedCount: 1,
      showSuccessToast: false
    })
  })

  it('does not claim success when the last printer failed', () => {
    expect(getPrintRunFeedback([true, false])).toEqual({
      printedCount: 1,
      failedCount: 1,
      showSuccessToast: false
    })
  })

  it('treats non-true values as failures', () => {
    expect(getPrintRunFeedback([true, undefined, 'ok'])).toEqual({
      printedCount: 1,
      failedCount: 2,
      showSuccessToast: false
    })
  })
})
