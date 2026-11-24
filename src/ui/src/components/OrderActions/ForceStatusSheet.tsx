import React, { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { OButton, OText, OTextarea, SheetFooter } from '../shared'
import { SheetError } from './SheetParts'
import { sheetStyles } from './styles'
import { useStatusRequest } from './useStatusRequest'
import type { ActionRequest } from './types'

interface Props {
  request: ActionRequest
  onFinish: (orders: any[]) => void
}

/**
 * The reason a status regression needs (`order_status_regression_validation_enabled`): the change the API refused is
 * sent again with the reason as `reasons`. The reason is required.
 */
export const ForceStatusSheet = ({ request, onFinish }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = useMemo(() => sheetStyles(theme), [theme])
  const { send, submitting, error, orders } = useStatusRequest(request)
  const [reason, setReason] = useState('')
  const pending = request.opts?.pendingStatusBody ?? {}

  const confirm = async () => {
    const text = reason.trim()
    if (!text) return
    const outcome = await send(pending.status, { ...pending, reasons: text })
    if (outcome.done) onFinish(orders)
  }

  return (
    <View style={styles.body} testID='order-sheet-force-status'>
      <OText color='text_muted'>
        {t('ORDER_STATUS_REGRESSION_DESCRIPTION', 'Moving an order back to a previous status requires a reason. Write it to confirm the change or cancel to keep the current status.')}
      </OText>
      <OTextarea
        placeholder={t('PLEASE_TYPE_YOUR_COMMENTS_IN_HERE', 'Please type your comments in here')}
        value={reason}
        onChange={setReason}
        testID='force-status-reason'
      />
      <SheetFooter>
        <View style={styles.footer}>
          <SheetError>{error}</SheetError>
          <OButton
            color='danger'
            size='lg'
            text={t('CONFIRM', 'Confirm')}
            loading={submitting}
            disabled={submitting || !reason.trim()}
            onClick={confirm}
            testID='order-action'
          />
        </View>
      </SheetFooter>
    </View>
  )
}

export default ForceStatusSheet
