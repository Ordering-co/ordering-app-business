import React from 'react'
import { DeviceEventEmitter } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

import { useApi } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'

const mockStore = { set: jest.fn() }
jest.mock('../../../providers/StoreUtil', () => ({ _setStoreData: (...args: any[]) => mockStore.set(...args) }))

import { Home } from '..'

describe('Home (the project step of a multi-project build)', () => {
  let setOrdering: jest.Mock

  const mount = (onNavigationRedirect = jest.fn(), theme?: any) =>
    renderWithProviders(<Home onNavigationRedirect={onNavigationRedirect} />, { themeOverrides: theme })

  beforeEach(() => {
    setOrdering = jest.fn()
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'demo' }, { setOrdering }])
  })

  it('is the login\'s look: a title, a project field and "Set project", with no photo and no Login button', () => {
    const view = mount()
    expect(view.getByText('Manage your business')).toBeTruthy()
    expect(view.getByText('Enter your project name to continue.')).toBeTruthy()
    expect(view.getByLabelText('Project Name')).toBeTruthy()
    expect(view.getByText('Set project')).toBeTruthy()
    expect(view.queryByText('Login')).toBeNull()
    expect(view.queryByText('Fast and easy')).toBeNull()
  })

  it('draws the store\'s glyph where the logo goes while the theme has no logo, and the logo when it has one', () => {
    expect(mount().queryByTestId('project-logo')).toBeNull()
    const theme = themeWithValues((values) => { values.images.logotype = 'https://cdn.test/logo.png' })
    const view = mount(jest.fn(), theme)
    expect(view.getByTestId('project-logo').props.source).toEqual({ uri: 'https://cdn.test/logo.png' })
  })

  it('asks for the project name before anything else', async () => {
    const view = mount()
    await act(async () => { fireEvent.press(view.getByText('Set project')) })
    expect(view.getByText('The field project name is required')).toBeTruthy()
    expect(setOrdering).not.toHaveBeenCalled()
    expect(mockStore.set).not.toHaveBeenCalled()
  })

  it('saves the project, changes the API\'s and tells the app the project changed (the login then restarts)', async () => {
    const changed = jest.fn()
    const subscription = DeviceEventEmitter.addListener('change_project', changed)
    const view = mount()
    await act(async () => { fireEvent.changeText(view.getByLabelText('Project Name'), 'my project') })
    await act(async () => { fireEvent.press(view.getByText('Set project')) })
    // Spaces are not part of a project name.
    expect(setOrdering).toHaveBeenCalledWith({ project: 'myproject' })
    expect(mockStore.set).toHaveBeenCalledWith('project_name', 'myproject')
    expect(changed).toHaveBeenCalledWith({ setted: true, changed: true })
    subscription.remove()
  })

  it('goes on to Login once the API holds the project that was typed', async () => {
    const onNavigationRedirect = jest.fn()
    const view = mount(onNavigationRedirect)
    await act(async () => { fireEvent.changeText(view.getByLabelText('Project Name'), 'acme') })
    await act(async () => { fireEvent.press(view.getByText('Set project')) })
    expect(onNavigationRedirect).not.toHaveBeenCalled()
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'acme' }, { setOrdering }])
    view.rerender(<Home onNavigationRedirect={onNavigationRedirect} />)
    expect(onNavigationRedirect).toHaveBeenCalledWith('Login')
  })
})
