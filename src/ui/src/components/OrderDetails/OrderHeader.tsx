import React from 'react'

import { Icon, OButton, ONavbar } from '../shared'

import { useLanguage } from '@components'

interface Props {
  title?: string
  subtitle?: string
  /** The time of the last change: the store's name gives way to it. */
  subtitleEnd?: string
  onBack?: () => void
  /** The print icon (`confirmation.order.print`). */
  onPrint?: () => void
  /** The three dots: the order's other actions. */
  onMore?: () => void
}

/**
 * The bar of the details: back, "Order #1053" with the store and the time under it, print and more (the message
 * button is in the customer's card, as in the mockups: the bar carries no unread mark). Without an
 * order yet (loading, load error) it is only the back arrow.
 */
export const OrderHeader = ({ title, subtitle, subtitleEnd, onBack, onPrint, onMore }: Props) => {
  const [, t] = useLanguage()
  const hasActions = !!onPrint || !!onMore
  return (
    <ONavbar
      title={title}
      subtitle={subtitle}
      subtitleEnd={subtitleEnd}
      onBack={onBack}
      rightButtons={hasActions}
      testID='order-header'
      right={hasActions
        ? (
          <>
            {!!onPrint && (
              <OButton
                iconOnly
                appearance='ghost'
                color='neutral'
                icon={<Icon name='print-outline' size='lg' />}
                onClick={onPrint}
                accessibilityLabel={t('PRINT_TICKET', 'Print ticket')}
                testID='header-print'
              />
            )}
            {!!onMore && (
              <OButton
                iconOnly
                appearance='ghost'
                color='neutral'
                icon={<Icon name='ellipsis-vertical' size='lg' />}
                onClick={onMore}
                accessibilityLabel={t('MORE_ACTIONS', 'More actions')}
                testID='header-more'
              />
            )}
          </>
        )
        : undefined}
    />
  )
}
