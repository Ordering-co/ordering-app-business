import * as React from 'react'
import { useLanguage } from '@components'
import { getTraduction } from '../../utils/errorText'
import { presentConfirm } from './confirmAction'

interface Props {
  open: boolean,
  title: string,
  content: Array<string>,
  onClose: () => void,
  onAccept: () => void,
  onCancel?: any,
  /** What the accept button says: the action's name ("Delete", "Remove"); "Accept" when it is not given. */
  acceptText?: string,
  /** What the other button says: "Cancel" when it is not given. */
  cancelText?: string,
  /** The accept button is a destructive one (the danger color). */
  destructive?: boolean,
}
const OAlert = (props: Props) => {
  const {
    open,
    title,
    content,
    onClose,
    onAccept,
    acceptText,
    cancelText,
    destructive
  } = props

  const [, t] = useLanguage();
  React.useEffect(() => {
    if (!open) return

    const message = typeof content === 'string'
      ? content
      : getTraduction(content?.[0], t)

    if (!title && !message) {
      onClose()
      return
    }

    presentConfirm({
      title,
      message,
      acceptText: acceptText ?? t('ACCEPT', 'Accept'),
      cancelText: cancelText ?? t('CANCEL', 'Cancel'),
      destructive,
      onAccept,
      onCancel: onClose
    })
  }, [open])

  return (
    <></>
  )
}

export default OAlert;
