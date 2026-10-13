import React from 'react'
import { Dimensions, Modal, Platform, StyleSheet, Text, View } from 'react-native'
import { fireEvent, within } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/businessSharedTestSetup')

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react')
  const { View: RNView } = require('react-native')
  const inset = { top: 44, right: 59, bottom: 21, left: 59 }
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children, style, edges }: any) =>
      ReactModule.createElement(
        RNView,
        { testID: 'safe-area', style, edges },
        children
      ),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 1024, height: 1366 })
  }
})

import OModal from '../OModal'
import OIconButton from '../OIconButton'

setupSharedComponentHooks()

const mockScreen = (width: number, height: number) => {
  jest.spyOn(Dimensions, 'get').mockReturnValue({
    width,
    height,
    scale: 2,
    fontScale: 2
  } as any)
}

const renderSlaModal = () =>
  renderWithProviders(
    <OModal open entireModal customClose centerOnLargeScreen onClose={jest.fn()}>
      <Text>SLA body</Text>
    </OModal>
  )

const getCardWrapper = (modal: any) => {
  const views = within(modal).UNSAFE_queryAllByType(View)
  return views.find((node: any) => {
    const flattened = StyleSheet.flatten(node.props.style)
    return flattened?.maxWidth === 620
  })
}

describe('OModal', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows the SLA modal as a constrained card on large screens', () => {
    mockScreen(1024, 1366)
    const { UNSAFE_getByType } = renderSlaModal()
    const modal = UNSAFE_getByType(Modal)

    const card = getCardWrapper(modal)
    expect(card).toBeTruthy()

    const flattened = StyleSheet.flatten(card.props.style)
    expect(flattened.maxHeight).toBe('100%')
    expect(flattened.alignSelf).toBeUndefined()
    expect(modal.props.transparent).toBe(true)
    expect(within(modal).getByText('SLA body')).toBeTruthy()
  })

  it('keeps the SLA modal full screen on phone-sized screens', () => {
    mockScreen(390, 844)
    const { UNSAFE_getByType } = renderSlaModal()
    const modal = UNSAFE_getByType(Modal)

    expect(getCardWrapper(modal)).toBeUndefined()
    expect(within(modal).getByText('SLA body')).toBeTruthy()
  })

  it('applies the safe area inside the modal only when shown as a card', () => {
    mockScreen(1024, 1366)
    const { UNSAFE_getByType } = renderSlaModal()
    const safeArea = within(UNSAFE_getByType(Modal)).getByTestId('safe-area')

    expect(safeArea.props.edges).toEqual(
      expect.arrayContaining(['top', 'left', 'right', 'bottom'])
    )
  })

  it('does not add a safe area inside the modal on the default path', () => {
    mockScreen(1024, 1366)
    const { UNSAFE_getByType } = renderWithProviders(
      <OModal open entireModal customClose onClose={jest.fn()}>
        <Text>Search body</Text>
      </OModal>
    )
    expect(
      within(UNSAFE_getByType(Modal)).queryByTestId('safe-area')
    ).toBeNull()
  })

  it('closes the card when the backdrop is pressed', () => {
    mockScreen(1024, 1366)
    const onClose = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OModal open entireModal customClose centerOnLargeScreen onClose={onClose}>
        <Text>SLA body</Text>
      </OModal>
    )
    fireEvent.press(getByTestId('modal-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has no backdrop to press when rendered full screen', () => {
    mockScreen(390, 844)
    const { queryByTestId } = renderSlaModal()
    expect(queryByTestId('modal-backdrop')).toBeNull()
  })

  it('hides the back arrow in card mode but keeps it full screen', () => {
    mockScreen(1024, 1366)
    const card = renderWithProviders(
      <OModal open entireModal centerOnLargeScreen title="SLA" onClose={jest.fn()}>
        <Text>SLA body</Text>
      </OModal>
    )
    expect(card.UNSAFE_queryAllByType(OIconButton)).toHaveLength(0)

    mockScreen(390, 844)
    const fullScreen = renderWithProviders(
      <OModal open entireModal centerOnLargeScreen title="SLA" onClose={jest.fn()}>
        <Text>SLA body</Text>
      </OModal>
    )
    expect(fullScreen.UNSAFE_queryAllByType(OIconButton).length).toBeGreaterThan(0)
  })

  it('closes the card from the top right X button', () => {
    mockScreen(1024, 1366)
    const onClose = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OModal open entireModal customClose centerOnLargeScreen onClose={onClose}>
        <Text>SLA body</Text>
      </OModal>
    )
    const closeButton = getByTestId('modal-close')
    const flattened = StyleSheet.flatten(closeButton.props.style)

    expect(flattened.position).toBe('absolute')
    expect(flattened.top).toBe(10)
    expect(flattened.right).toBe(10)

    fireEvent.press(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows no X button when rendered full screen', () => {
    mockScreen(390, 844)
    const { queryByTestId } = renderSlaModal()
    expect(queryByTestId('modal-close')).toBeNull()
  })

  it('leaves other entire modals full screen on large screens', () => {
    mockScreen(1024, 1366)
    const { UNSAFE_getByType } = renderWithProviders(
      <OModal open entireModal customClose onClose={jest.fn()}>
        <Text>Search body</Text>
      </OModal>
    )
    const modal = UNSAFE_getByType(Modal)
    expect(getCardWrapper(modal)).toBeUndefined()
  })

  it('renders title, subtitle, and children', () => {
    const onClose = jest.fn()
    const { getByText } = renderWithProviders(
      <OModal open title="Modal title" subtitle="Subtitle" onClose={onClose}>
        <Text>Modal body</Text>
      </OModal>
    )
    expect(getByText('Modal title')).toBeTruthy()
    expect(getByText('Modal body')).toBeTruthy()
  })

  it('renders on ios and android', () => {
    Platform.OS = 'ios'
    const { getByText: getIos } = renderWithProviders(
      <OModal open title="iOS modal" onClose={jest.fn()} />
    )
    expect(getIos('iOS modal')).toBeTruthy()

    Platform.OS = 'android'
    const { getByText: getAndroid } = renderWithProviders(
      <OModal open title="Android modal" onClose={jest.fn()} isTransparent />
    )
    expect(getAndroid('Android modal')).toBeTruthy()
  })
})
