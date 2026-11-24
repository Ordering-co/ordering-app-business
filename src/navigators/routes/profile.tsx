import type { AppScreen } from './types'
import Sessions from '@/pages/Sessions'
import ProfileEdit from '@/pages/ProfileEdit'
import ProfilePassword from '@/pages/ProfilePassword'
import Notifications from '@/pages/Notifications'
import OrdersDisplay from '@/pages/OrdersDisplay'

/**
 * The profile area's stack screens (the shell mounts them in the authed stack). The Profile itself is the tab:
 * `import Profile from '@/pages/Profile'`.
 */
export const profileScreens: AppScreen[] = [
  { name: 'ProfileEdit', component: ProfileEdit, options: { headerShown: false } },
  { name: 'ProfilePassword', component: ProfilePassword, options: { headerShown: false } },
  { name: 'Notifications', component: Notifications, options: { headerShown: false } },
  { name: 'OrdersDisplay', component: OrdersDisplay, options: { headerShown: false } },
  { name: 'Sessions', component: Sessions, options: { headerShown: false } }
]
