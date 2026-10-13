import * as React from 'react'
import { useLanguage } from '@components'
import { Alert as RNAlert } from 'react-native';
import { useTheme } from 'styled-components/native'
import { getTraduction } from '../../utils'

interface Props {
  open: boolean,
  title: string,
  content: Array<string>,
  onClose: () => void,
  onAccept: () => void,
  onCancel?: any,
}
const OAlert = (props: Props) => {
  const {
    open,
    title,
    content,
    onClose,
    onAccept,
    onCancel
  } = props

  const theme = useTheme();
  const [, t] = useLanguage();
  React.useEffect(() => {
    if (open) {
    RNAlert.alert(title, typeof content === 'string'
      ? content
      : getTraduction(content?.[0], t), [
      { text: t('ACCEPT', 'Accept'), onPress: onAccept },
      { text: t('CANCEL', 'Cancel'), onPress: onClose }
    ])
    }
  }, [open])

  return (
    <></>
  )
}

export default OAlert;
