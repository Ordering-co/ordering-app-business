/**
 * The four tabs of the signed-in app, in the order of the bar and the rail (`Main.dc.html`). The route names are
 * the contract (`Orders`, `Messages`, `Stores`, `Profile`): other areas navigate to them
 * (`navigate('BottomTab', { screen: 'Orders' })`).
 *
 * `counter` names the slot of `components.bottom_nav.slots` that draws the tab's count badge (only Messages has one: the app
 * shows no number of orders), and `visibility` the
 * keys that hide the tab or its counter (`pages-and-visibility.md`).
 */
export type ShellTabName = 'Orders' | 'Messages' | 'Stores' | 'Profile'

export interface ShellTab {
  name: ShellTabName
  /** An Ionicons glyph, outline: the bar draws every tab the same way and only the color tells the current one. */
  icon: string
  /** The text's catalog key and its English fallback. */
  label: { key: string, fallback: string }
  /** The slot of `bottom_nav.slots` that paints this tab's count, if the tab has one. */
  counter?: 'messages_count'
  /** The visibility key that removes the whole tab from the bar (its screen stays registered for redirects). */
  tabVisibility?: string
  /** The visibility key that hides the tab's count. */
  counterVisibility?: string
}

export const SHELL_TABS: ShellTab[] = [
  {
    name: 'Orders',
    icon: 'list-outline',
    label: { key: 'ORDERS', fallback: 'Orders' }
  },
  {
    name: 'Messages',
    icon: 'chatbubble-outline',
    label: { key: 'MESSAGES', fallback: 'Messages' },
    counter: 'messages_count',
    tabVisibility: 'bottom_nav.messages',
    counterVisibility: 'messages.unread_badge'
  },
  {
    name: 'Stores',
    icon: 'storefront-outline',
    label: { key: 'STORES', fallback: 'Stores' }
  },
  {
    name: 'Profile',
    icon: 'person-outline',
    label: { key: 'PROFILE', fallback: 'Profile' }
  }
]
