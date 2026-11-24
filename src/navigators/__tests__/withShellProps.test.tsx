import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'

import { ShellContext, SHELL_DEFAULTS } from '../../context/ShellContext'
import { withShellProps } from '../withShellProps'

const Screen = (props: any) => (
  <Text>{`changed=${props.projectChanged} token=${props.route.params.notification_state.notification_token} id=${props.route.params.id}`}</Text>
)

describe('withShellProps', () => {
  it('gives a screen whether the project changed and the push state of the device (without losing its own params)', () => {
    const Wrapped = withShellProps(Screen)
    const view = render(
      <ShellContext.Provider value={{ ...SHELL_DEFAULTS, projectChanged: true, notificationState: { notification_token: 'tok' } }}>
        <Wrapped route={{ params: { id: 4 } }} />
      </ShellContext.Provider>
    )
    expect(view.getByText('changed=true token=tok id=4')).toBeTruthy()
  })

  it('follows the shell when it changes', () => {
    const Wrapped = withShellProps(Screen)
    const tree = (token: string) => (
      <ShellContext.Provider value={{ ...SHELL_DEFAULTS, notificationState: { notification_token: token } }}>
        <Wrapped route={{ params: {} }} />
      </ShellContext.Provider>
    )
    const view = render(tree('one'))
    view.rerender(tree('two'))
    expect(view.getByText('changed=false token=two id=undefined')).toBeTruthy()
  })

  it('wraps a screen once, so its type is stable and the screen never remounts', () => {
    expect(withShellProps(Screen)).toBe(withShellProps(Screen))
    expect(withShellProps(Screen)).not.toBe(Screen)
  })

  it('works without a provider (nothing changed, no token)', () => {
    const Wrapped = withShellProps(Screen)
    expect(render(<Wrapped route={{ params: {} }} />).getByText('changed=false token=undefined id=undefined')).toBeTruthy()
  })
})
