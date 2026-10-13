import { getRemoveAccountSessionPlan } from '../getRemoveAccountSessionPlan'

describe('getRemoveAccountSessionPlan', () => {
  it('ends the session after a successful delete', () => {
    expect(getRemoveAccountSessionPlan('OK')).toEqual({
      logout: true,
      clearLocalStore: true
    })
  })

  it('keeps the session when delete does not return OK', () => {
    expect(getRemoveAccountSessionPlan('ERROR_USER_DELETE')).toEqual({
      logout: false,
      clearLocalStore: false
    })
  })

  it('keeps the session when delete returns nothing', () => {
    expect(getRemoveAccountSessionPlan(undefined)).toEqual({
      logout: false,
      clearLocalStore: false
    })
  })
})
