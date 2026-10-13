import { getViewActionOrderPlan } from '../getViewActionOrderPlan'

describe('getViewActionOrderPlan', () => {
  it('does not persist accept before prep-time confirm', () => {
    expect(getViewActionOrderPlan({
      action: 'accept',
      loading: false
    })).toEqual({
      ignore: false,
      persistStatusBeforeConfirm: false,
      openModal: true
    })
  })

  it('ignores taps while an update is in flight', () => {
    expect(getViewActionOrderPlan({
      action: 'accept',
      loading: true
    })).toEqual({
      ignore: true,
      persistStatusBeforeConfirm: false,
      openModal: false
    })
  })

  it('opens reject confirm without persisting first', () => {
    expect(getViewActionOrderPlan({
      action: 'reject',
      loading: false
    })).toEqual({
      ignore: false,
      persistStatusBeforeConfirm: false,
      openModal: true
    })
  })
})
