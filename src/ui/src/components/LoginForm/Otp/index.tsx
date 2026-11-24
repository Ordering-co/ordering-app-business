import React, { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { apiErrorText } from '../../../utils/errorText'
import { AuthAction, AuthScreen, AuthTimer, formatCountdown, useAuthStyles, useUntilEdited, AUTH_FIELD_SCOPE } from '../AuthPieces'
import { FieldError, OLink, OOtpInput, OText, ONotice } from '../../shared'
import { useCountdownTimer } from '../../../hooks/useCountdownTimer'
import type { OOtpInputHandle } from '../../shared/OOtpInput'
import { themePart } from '@/theme/helpers'

import { useLanguage } from '@components'

const FOCUS_FIELD_DELAY = 500
/** The seconds a login code lasts: 10 minutes. */
const CODE_LIFETIME = 600
/** The seconds before a code can be asked for again. */
const RESEND_WAIT = 80
const CODE_LENGTH = 6

export interface OtpProps {
  /** The address the code was sent to. */
  email?: string
  willVerifyOtpState: boolean
  /** The back arrow: closes the screen. */
  onBack: () => void
  /** Asks for a new code. */
  onResend: () => void
  handleLoginOtp: (code: string) => void
  /** The login's state: a code that was refused arrives here. */
  formState?: any
  /** The code request's state (`generateOtpCode` answers there): a refused request arrives here. */
  checkPhoneCodeState?: any
  pinCount?: number
}

/** The message of a state that failed: the server answers a text, `{ message }` or a list of them. */
const failureOf = (state: any, t: any): string | null => {
  if (!state || state.loading || !state.result?.error) return null
  const source = state.result.result ?? (typeof state.result.error === 'string' ? state.result.error : null)
  return source ? apiErrorText(source, t) : null
}

/**
 * The login code screen: the lead with the address, the six cells of the app's one code entry (the sixth digit
 * submits), the countdown (`components.timer`, a caption), the resend link with its wait (`auth_form.slots.resend`)
 * and "Verify" pinned to the bottom (the way to try again after an error). The back arrow is the way out.
 */
export const Otp = (props: OtpProps) => {
  const {
    email,
    willVerifyOtpState,
    onBack,
    onResend,
    handleLoginOtp,
    formState,
    checkPhoneCodeState,
    pinCount
  } = props
  const length = pinCount || CODE_LENGTH

  const theme: any = useTheme()
  const [, t] = useLanguage()
  const authStyles = useAuthStyles()
  const [code, setCode] = useState('')
  const [resent, setResent] = useState(false)
  const [otpLeftTime, , resetOtpLeftTime]: any = useCountdownTimer(CODE_LIFETIME, willVerifyOtpState)
  // The wait is the first seconds of the code's own countdown, so a resend restarts both.
  const resendLeft = Math.max(0, otpLeftTime - (CODE_LIFETIME - RESEND_WAIT))
  const codeRef = useRef<OOtpInputHandle>(null)
  const focusTimeoutRef = useRef<any>(null)

  const focusCode = () => {
    focusTimeoutRef.current && clearTimeout(focusTimeoutRef.current)
    focusTimeoutRef.current = setTimeout(() => codeRef.current?.focus(), FOCUS_FIELD_DELAY)
  }

  useEffect(() => {
    if (!willVerifyOtpState) return
    focusCode()
    return () => {
      focusTimeoutRef.current && clearTimeout(focusTimeoutRef.current)
    }
  }, [willVerifyOtpState])

  // The states the screen opened with are answers to earlier requests (a password that was refused), not to this
  // screen's: only an answer that comes after them is shown, until the code is edited.
  const openedWith = useRef({ formState, checkPhoneCodeState })
  const formFailure = formState !== openedWith.current.formState ? failureOf(formState, t) : null
  const codeFailure = checkPhoneCodeState !== openedWith.current.checkPhoneCodeState ? failureOf(checkPhoneCodeState, t) : null
  const [failure, clearFailure] = useUntilEdited(formFailure ? formState : checkPhoneCodeState, formFailure ?? codeFailure)

  const handleCodeChanged = (value: string) => {
    clearFailure()
    setResent(false)
    setCode(value)
  }

  const handleResend = () => {
    resetOtpLeftTime()
    setResent(true)
    onResend()
  }

  const expired = otpLeftTime === 0
  const resendSlot = themePart(theme, 'auth_form', 'slots.resend')

  return (
    <AuthScreen
      centered
      title={t('ENTER_THE_CODE', 'Enter the code')}
      onBack={onBack}
      footer={(
        <AuthAction
          testID='otp-verify'
          text={t('VERIFY', 'Verify')}
          disabled={code.length < length}
          loading={!!formState?.loading}
          onPress={() => handleLoginOtp(code)}
        />
      )}
    >
      <OText>
        {`${t('LOGIN_CODE_SENT_TO', 'We sent a 6-digit code to')} `}
        <OText preset='label'>{email}</OText>
      </OText>
      {resent && !failure && (
        <ONotice variant='success' testID='otp-resent'>{t('CODE_SENT', 'The code has been sent')}</ONotice>
      )}
      <View>
        <OOtpInput
          ref={codeRef}
          testID='otp-code'
          length={length}
          value={code}
          onChange={handleCodeChanged}
          onComplete={(filled: string) => handleLoginOtp(filled)}
          hasError={!!failure}
        />
        {!!failure && <FieldError center scope={AUTH_FIELD_SCOPE} testID='otp-error'>{failure}</FieldError>}
      </View>
      <View style={authStyles.timerBox}>
        <AuthTimer
          text={`${t('CODE_EXPIRES_IN', 'Code expires in')} ${formatCountdown(otpLeftTime)}`}
          expired={expired}
        />
        <OLink
          testID='otp-resend'
          shorcut={resendLeft > 0
            ? `${t('RESEND_CODE_IN', 'Resend code in')} ${formatCountdown(resendLeft, { padMinutes: false })}`
            : t('RESEND_CODE', 'Resend code')}
          onPress={handleResend}
          disabled={resendLeft > 0}
          size={resendSlot.size}
          variant={resendSlot.variant ?? undefined}
        />
      </View>
    </AuthScreen>
  )
}
