jest.mock('@ui', () => ({ LoginForm: () => null, ForgotPasswordForm: () => null }))

import { accessScreens } from '../routes/access'
import Login from '../../pages/Login'
import ForgotPassword from '../../pages/ForgotPassword'

describe('accessScreens', () => {
  it('lists the login and the forgot password, by the names the app navigates with', () => {
    expect(accessScreens.map((screen) => screen.name)).toEqual(['Login', 'Forgot'])
    expect(accessScreens[0].component).toBe(Login)
    expect(accessScreens[1].component).toBe(ForgotPassword)
  })
})
