import type React from 'react'

import Login from '../../pages/Login'
import ForgotPassword from '../../pages/ForgotPassword'

/**
 * The signed-out stack's screens of the access area: the login (the first screen) and the forgot password.
 * The login code and the phone verification are full-screen modals inside the login, not routes. The shell
 * mounts this list (and gives `Login` its `projectChanged` and `notification_state`).
 */
export const accessScreens: { name: string; component: React.ComponentType<any>; options?: object }[] = [
  { name: 'Login', component: Login },
  { name: 'Forgot', component: ForgotPassword },
]
