import { profileScreens } from '../profile'

jest.mock('@/pages/Sessions', () => () => null)
jest.mock('@/pages/ProfileEdit', () => () => null)
jest.mock('@/pages/ProfilePassword', () => () => null)
jest.mock('@/pages/Notifications', () => () => null)
jest.mock('@/pages/OrdersDisplay', () => () => null)

describe('the profile area\'s routes', () => {
  it('are the five stack screens the contract names, with no header of their own', () => {
    expect(profileScreens.map((screen) => screen.name)).toEqual(['ProfileEdit', 'ProfilePassword', 'Notifications', 'OrdersDisplay', 'Sessions'])
    profileScreens.forEach((screen) => expect(screen.options).toEqual({ headerShown: false }))
  })

  it('repeat no route name', () => {
    expect(new Set(profileScreens.map((screen) => screen.name)).size).toBe(profileScreens.length)
  })
})
