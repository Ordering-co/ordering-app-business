import React, { useEffect, useMemo, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReviewCustomerParams } from '../../types'
import { reviewCommentList } from '../../utils'
import { isCustomerContactHidden } from '../../utils/contactVisibility'
import { usePageSections } from '@/theme/sections'
import { orderNumberText } from '../OrderDetails/orderData'

import { reviewStyles } from './styles'

import { useConfig, useLanguage, ReviewCustomer as ReviewCustomerController } from '@components'
import { FilterChip, KeyboardScreen, KeyboardScrollView, OBottomBar, ONavbar, ONotice, OTextarea, SectionTitle, StableText } from '../shared'

/** The blocks of the page `review` inside the scroll; `send` is the bar under it. */
const FORM_SECTIONS = ['customer', 'rating', 'quick_comments', 'comment']

/**
 * The review of a customer (Review): the page `review` in the theme's order. The top bar says whose order it is (the
 * customer's name stays out when `hide_customer_contact_business_app` is on, or the page's `customer` section is
 * hidden); the five labelled levels, the quick comments of the chosen level (`reviewCommentList`), the free comment and
 * the Send bar. Nothing is sent until a level is chosen.
 */
const ReviewCustomerUI = (props: ReviewCustomerParams & { initialQualification?: number }) => {
  const {
    order,
    closeModal,
    reviewState,
    setReviewState,
    actionState,
    handleSendCustomerReview,
    handleCustomCustomerReview,
    initialQualification
  } = props

  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig() as any
  const { top } = useSafeAreaInsets()
  const { render, isVisible } = usePageSections('review')
  const styles = useMemo(() => reviewStyles(theme, top), [theme, top])
  const [comments, setComments] = useState<Array<any>>([])
  const [extraComment, setExtraComment] = useState('')
  const [custom, setCustom] = useState({ loading: false, error: null as string | null })
  const form = theme.native.components.review_form

  const qualificationList = [
    { key: 1, text: t('TERRIBLE', 'Terrible') },
    { key: 2, text: t('BAD', 'Bad') },
    { key: 3, text: t('OKAY', 'Okay') },
    { key: 4, text: t('GOOD', 'Good') },
    { key: 5, text: t('GREAT', 'Great') }
  ]
  const commentsList = reviewCommentList('customer', t)
  const qualification = Number(reviewState?.qualification) || 0

  // A level chosen before the page opened (the stars of the done order).
  useEffect(() => {
    if (initialQualification) setReviewState?.((current: any) => ({ ...current, qualification: initialQualification }))
  }, [])

  const handleChangeQualification = (level: number) => {
    setReviewState?.((current: any) => ({ ...current, qualification: level, comment: '' }))
    setComments([])
  }

  const handleChangeComment = (item: any) => {
    setComments((current) => current.some((comment) => comment?.key === item.key)
      ? current.filter((comment) => comment?.key !== item.key)
      : [...current, item])
  }

  useEffect(() => {
    const quick = comments.map((comment: any) => `${comment.content}. `).join('')
    setReviewState?.((current: any) => ({ ...current, comment: quick + extraComment }))
  }, [comments, extraComment])

  const customerName = isCustomerContactHidden(configs) || !isVisible('customer')
    ? ''
    : [order?.customer?.name, order?.customer?.middle_name, order?.customer?.lastname, order?.customer?.second_lastname]
      .filter(Boolean).join(' ').trim()
  const orderLine = `${orderNumberText(order, t, configs)}${customerName ? ` · ${customerName}` : ''}`

  const send = async () => {
    if (!qualification) return
    if (handleCustomCustomerReview) {
      setCustom({ loading: true, error: null })
      try {
        await handleCustomCustomerReview({ qualification, comment: reviewState?.comment })
        setCustom({ loading: false, error: null })
      } catch (thrown: any) {
        setCustom({ loading: false, error: thrown?.message ?? t('ERROR', 'Error') })
      }
      return
    }
    handleSendCustomerReview?.()
  }

  const sending = !!actionState?.loading || custom.loading
  const errorText = custom.error ?? (Array.isArray(actionState?.error) ? actionState.error[0] : actionState?.error)

  const renderRating = () => (
    <View style={styles.block}>
      <SectionTitle style={styles.heading}>{t('HOW_WAS_YOUR_NO_CUSTOMER', 'How was your experience?')}</SectionTitle>
      <View style={styles.scale} accessibilityLabel={t('RATING', 'Rating')} testID='rating-scale'>
        {qualificationList.map((level) => (
          <Pressable
            key={level.key}
            accessibilityRole='button'
            accessibilityLabel={level.text}
            accessibilityState={{ selected: qualification === level.key }}
            onPress={() => handleChangeQualification(level.key)}
            style={({ pressed }) => [styles.level, qualification === level.key && styles.levelSelected, pressed && styles.levelPressed]}
            testID={`rating-level-${level.key}`}
          >
            <StableText
              boxStyle={styles.labelBox}
              style={[styles.label, qualification === level.key && styles.labelSelected]}
              weight={qualification === level.key ? 600 : undefined}
              reserveWeight={600}
              numberOfLines={1}
            >
              {level.text}
            </StableText>
          </Pressable>
        ))}
      </View>
    </View>
  )

  const renderQuickComments = () => !qualification ? null : (
    <View style={styles.block}>
      <SectionTitle style={styles.heading}>{commentsList[qualification]?.title?.trim()}</SectionTitle>
      <View style={styles.chips} testID='quick-comments'>
        {commentsList[qualification]?.list?.map((item: any) => (
          <FilterChip
            key={item.key}
            text={item.content}
            size={form.slots.chip.size}
            selected={comments.some((comment: any) => comment?.key === item.key)}
            onPress={() => handleChangeComment(item)}
          />
        ))}
      </View>
    </View>
  )

  const renderComment = () => (
    <OTextarea
      label={t('ANYTHING_TO_ADD_OPTIONAL', 'Anything to add? (optional)')}
      value={extraComment}
      onChange={setExtraComment}
      testID='review-comment'
    />
  )

  const renderSend = () => (
    <OBottomBar
      actions={[{
        slot: 'button',
        text: sending ? t('LOADING', 'Loading') : t('SEND_REVIEW_BUTTON', 'Send review'),
        onClick: send,
        loading: sending,
        disabled: sending || !qualification,
        testID: 'review-send'
      }]}
    />
  )

  return (
    <KeyboardScreen enabled behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.page}>
      <ONavbar title={t('REVIEW_CUSTOMER', 'Review customer')} subtitle={orderLine} onBack={() => closeModal?.()} />
      <KeyboardScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {render({
          customer: () => null,
          rating: renderRating,
          quick_comments: renderQuickComments,
          comment: renderComment
        }, { group: FORM_SECTIONS })}
        {!!errorText && <ONotice variant='danger' testID='review-error'>{String(errorText)}</ONotice>}
      </KeyboardScrollView>
      {render({ send: renderSend }, { group: ['send'] })}
    </KeyboardScreen>
  )
}

export const ReviewCustomer = (props: any) => (
  <ReviewCustomerController {...props} UIComponent={ReviewCustomerUI} />
)

export default ReviewCustomer
