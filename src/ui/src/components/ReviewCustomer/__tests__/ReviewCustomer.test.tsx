import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'
import { Keyboard, ScrollView } from 'react-native'

jest.mock('@components', () => require('../../OrderActions/__tests__/mocks').componentsMock())

import { ReviewCustomer } from '..'
import { canReviewCustomer } from '../../OrderActions/rules'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { testState, resetTestState } from '../../OrderActions/__tests__/setup'

const order = { id: 1041, status: 1, customer_id: 9, customer: { name: 'Nora', lastname: 'Ali' } }

describe('the customer review', () => {
  beforeEach(() => resetTestState())

  it('writes the order number the project shows (the external id when change_order_id is on) in the app\'s one phrase', () => {
    testState.configs = { change_order_id: { value: '1' } }
    const screen = renderWithProviders(<ReviewCustomer order={{ ...order, external_id: 'X-77' }} closeModal={jest.fn()} />)
    expect(screen.getByText('Order #X-77 · Nora Ali')).toBeTruthy()
  })

  it('has the header with the order and the customer, the five levels and no quick comments yet', () => {
    const screen = renderWithProviders(<ReviewCustomer order={order} closeModal={jest.fn()} />)
    expect(screen.getByText('Review customer')).toBeTruthy()
    expect(screen.getByText('Order #1041 · Nora Ali')).toBeTruthy()
    expect(screen.getByText('How was your experience?')).toBeTruthy()
    for (const level of ['Terrible', 'Bad', 'Okay', 'Good', 'Great']) expect(screen.getByText(level)).toBeTruthy()
    expect(screen.queryByTestId('quick-comments')).toBeNull()
    expect(screen.getByText('Anything to add? (optional)')).toBeTruthy()
  })

  it('sends nothing until a level is chosen', () => {
    const screen = renderWithProviders(<ReviewCustomer order={order} closeModal={jest.fn()} />)
    expect(screen.getByTestId('review-send').props.accessibilityState.disabled).toBe(true)
    fireEvent.press(screen.getByTestId('review-send'))
    expect(testState.reviewSent).not.toHaveBeenCalled()
  })

  it('marks the chosen level and shows the quick comments of that level', () => {
    const screen = renderWithProviders(<ReviewCustomer order={order} closeModal={jest.fn()} />)
    fireEvent.press(screen.getByTestId('rating-level-5'))
    expect(screen.getByTestId('rating-level-5').props.accessibilityState.selected).toBe(true)
    expect(screen.getByTestId('rating-level-4').props.accessibilityState.selected).toBe(false)
    expect(screen.getByText('What went well?')).toBeTruthy()
    expect(screen.getByText('Good communication')).toBeTruthy()
    fireEvent.press(screen.getByTestId('rating-level-1'))
    expect(screen.getByText('What went wrong?')).toBeTruthy()
    expect(screen.queryByText('Above and beyond')).toBeNull()
  })

  it('sends the level, the quick comments and the free comment', async () => {
    const screen = renderWithProviders(<ReviewCustomer order={order} closeModal={jest.fn()} />)
    fireEvent.press(screen.getByTestId('rating-level-4'))
    fireEvent.press(screen.getByText('Friendly'))
    fireEvent.changeText(screen.getByTestId('review-comment'), 'Quick pickup')
    await act(async () => { fireEvent.press(screen.getByTestId('review-send')) })
    expect(testState.reviewSent).toHaveBeenCalledWith(expect.objectContaining({
      qualification: 4,
      comment: 'Friendly. Quick pickup',
      order_id: 1041,
      user_id: 9
    }))
  })

  it('opens with the level the done order\'s stars chose', () => {
    const screen = renderWithProviders(<ReviewCustomer order={order} closeModal={jest.fn()} initialQualification={3} />)
    expect(screen.getByTestId('rating-level-3').props.accessibilityState.selected).toBe(true)
    expect(screen.getByTestId('review-send').props.accessibilityState.disabled).toBeFalsy()
  })

  it('sends a group\'s review through the list\'s handler', async () => {
    const handleCustomCustomerReview = jest.fn(async () => undefined)
    const screen = renderWithProviders(<ReviewCustomer order={order} closeModal={jest.fn()} handleCustomCustomerReview={handleCustomCustomerReview} />)
    fireEvent.press(screen.getByTestId('rating-level-2'))
    await act(async () => { fireEvent.press(screen.getByTestId('review-send')) })
    expect(handleCustomCustomerReview).toHaveBeenCalledWith({ qualification: 2, comment: '' })
    expect(testState.reviewSent).not.toHaveBeenCalled()
  })

  it('shows what a failed group review said', async () => {
    const handleCustomCustomerReview = jest.fn(async () => { throw new Error('Could not review') })
    const screen = renderWithProviders(<ReviewCustomer order={order} closeModal={jest.fn()} handleCustomCustomerReview={handleCustomCustomerReview} />)
    fireEvent.press(screen.getByTestId('rating-level-2'))
    await act(async () => { fireEvent.press(screen.getByTestId('review-send')) })
    expect(screen.getByTestId('review-error')).toBeTruthy()
    expect(screen.getByText('Could not review')).toBeTruthy()
  })

  it('goes back', () => {
    const closeModal = jest.fn()
    const screen = renderWithProviders(<ReviewCustomer order={order} closeModal={closeModal} />)
    fireEvent.press(screen.getByLabelText('Go back'))
    expect(closeModal).toHaveBeenCalled()
  })

  describe('the customer\'s name', () => {
    it('stays out when the project hides the customer contact', () => {
      testState.configs = { hide_customer_contact_business_app: { value: '1' } }
      const screen = renderWithProviders(<ReviewCustomer order={order} closeModal={jest.fn()} />)
      expect(screen.getByText('Order #1041')).toBeTruthy()
      expect(screen.queryByText(/Nora/)).toBeNull()
    })

    it('stays out when the theme hides the customer section', () => {
      const themeOverrides = themeWithValues((values) => {
        values.pages.review.sections.find((section: any) => section.key === 'customer').visible = false
      })
      const screen = renderWithProviders(<ReviewCustomer order={order} closeModal={jest.fn()} />, { themeOverrides })
      expect(screen.getByText('Order #1041')).toBeTruthy()
    })
  })

  it('hides a section the theme hides, and never the rating or the bar', () => {
    const themeOverrides = themeWithValues((values) => {
      for (const section of values.pages.review.sections) {
        if (['quick_comments', 'comment'].includes(section.key)) section.visible = false
      }
    })
    const screen = renderWithProviders(<ReviewCustomer order={order} closeModal={jest.fn()} initialQualification={5} />, { themeOverrides })
    expect(screen.queryByTestId('quick-comments')).toBeNull()
    expect(screen.queryByText('Anything to add? (optional)')).toBeNull()
    expect(screen.getByTestId('rating-scale')).toBeTruthy()
    expect(screen.getByTestId('review-send')).toBeTruthy()
  })

  it('is reachable for the statuses the rule allows, and 15 too', () => {
    expect(canReviewCustomer({ status: 15, customer_id: 1 })).toBe(true)
  })

  it('scrolls with the keyboard rule: the focused field is revealed by the primitive, taps go through, a drag closes the keyboard', () => {
    const screen = renderWithProviders(<ReviewCustomer order={order} closeModal={jest.fn()} initialQualification={4} />)
    const scroll: any = screen.UNSAFE_getByType(ScrollView)
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled')
    expect(scroll.props.keyboardDismissMode).toBe('on-drag')
  })

  it('is the same page on a tablet', () => {
    const screen = renderWithProviders(<ReviewCustomer order={order} closeModal={jest.fn()} />, { platform: 'tablet' })
    expect(screen.getByTestId('rating-scale')).toBeTruthy()
  })
})
