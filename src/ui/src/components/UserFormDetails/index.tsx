import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { useTheme } from 'styled-components/native'

import {
  FieldError,
  KeyboardScreen,
  KeyboardScrollView,
  OBottomBar,
  OInput,
  ONavbar,
  ONotice,
  OText,
  PasswordToggle,
  ScreenContainer,
  useConfirm
} from '../shared'
import { PhoneInputNumber } from '../PhoneInputNumber'
import { ACCOUNT_FIELDS, ACCOUNT_FIELD_CODES, accountFieldList } from './accountFields'
import { themeGutter, themePart, themeSpace, themeVisible } from '@/theme/helpers'

import {
  UserFormDetails as UserFormDetailsController,
  useApi,
  useSession,
  useLanguage,
  ToastType,
  useToast
} from '@components'

/** The profile's fields: the ones its project asks for (by code) and the password screen's three. */
type UserFormDetailsValues = { [field: string]: string }

/** The two screens this form is: the personal information, or the password alone. */
export type UserFormPart = 'information' | 'password'

/** The shortest password the server accepts (its `users` update rules). */
export const PASSWORD_MIN_LENGTH = 8

/** A value as a form holds it: a missing one and an empty one are the same. */
const asTyped = (value: any) => (value === null || value === undefined ? '' : String(value))

/** Whether a field's value is other than the one the screen opened with (`opened`: what the session holds). */
export const differsFromOpened = (value: any, opened: any) => asTyped(value) !== asTyped(opened)

/**
 * A screen of its own for what the profile lets the user change: the personal information (`information`: the
 * fields the server asks for and the phone; the photo and delete account are the Profile's own) or the password (`password`: the
 * current one, checked with the server, the new one and its confirmation). It lives in its own headless controller,
 * so leaving the screen leaves what was typed unsaved: nothing is sent until the bar's button. The server's
 * validation fields decide which fields exist and which are required; a save that goes through shows its toast and
 * takes the user back. Leaving with what was typed not saved (the bar's back arrow, the system's back button or
 * swipe) asks first: it throws the typing away.
 */
export const UserFormDetailsUI = (props: any) => {
  const {
    part = 'information',
    isEdit,
    formState,
    showField,
    isRequiredField,
    validationFields,
    handleChangeInput,
    handleButtonUpdateClick,
    navigation
  } = props

  const theme: any = useTheme()
  const styles = useMemo(() => {
    const field = themePart(theme, 'field', 'base')
    return StyleSheet.create({
      screen: { flex: 1 },
      content: { paddingHorizontal: themeGutter(theme), gap: themeSpace(theme, 'md') },
      field: { gap: field.gap },
      hint: { marginTop: field.message_gap }
    })
  }, [theme])
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const [ordering] = useApi()
  const { handleSubmit, control, setValue, formState: { errors } } = useForm<UserFormDetailsValues>()

  const [{ user, token }] = useSession()
  const confirm = useConfirm()
  const isPassword = part === 'password'

  // The personal information.
  const [phoneInputData, setPhoneInputData] = useState({
    error: '',
    phone: {
      country_phone_code: null,
      cellphone: null
    }
  })
  const [phoneRequired, setPhoneRequired] = useState(false)

  // The password.
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [currentError, setCurrentError] = useState('')
  const [checking, setChecking] = useState(false)
  // The answer of a save that failed, drawn under the form (the kit: form errors are inline, never toasts).
  const [saveError, setSaveError] = useState<string | null>(null)
  const [currentSee, setCurrentSee] = useState(false)
  const [nextSee, setNextSee] = useState(false)
  const [confirmSee, setConfirmSee] = useState(false)

  // The phone is the account's own data, as the name and the e-mail are: it is always there (the checkout's validation
  // fields are the customers' form: a project that turns them off still has a name, a last name, an e-mail and a phone here).
  const showInputPhoneNumber = true

  const checkoutHas = (code: string) => !!validationFields?.fields?.checkout?.[code]

  const getInputRules = (field: any) => {
    const rules: any = {
      required: (isRequiredField(field.code) || (!checkoutHas(field.code) && !!ACCOUNT_FIELDS.find(({ code }) => code === field.code)?.required))
        ? t(
          `VALIDATION_ERROR_${field.code.toUpperCase()}_REQUIRED`,
          `${field.name} is required`
        ).replace('_attribute_', t(field.name, field.code))
        : null
    }
    if (field.code && field.code === 'email') {
      rules.pattern = {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: t('INVALID_ERROR_EMAIL', 'Invalid email address').replace(
          '_attribute_',
          t('EMAIL', 'Email')
        )
      }
    }

    return rules
  }

  const onSubmit = () => {
    setSaveError(null)
    if (phoneInputData.error) return
    if (Object.keys(formState.changes).length === 0) return
    if (
      formState.changes?.cellphone === null &&
      validationFields?.fields?.checkout?.cellphone?.enabled &&
      validationFields?.fields?.checkout?.cellphone?.required
    ) {
      setPhoneRequired(true)
      return
    }
    setPhoneRequired(false)
    handleButtonUpdateClick(null)
  }

  const handleChangePhoneNumber = (number: any) => {
    setPhoneInputData(number)
    setPhoneRequired(false)
    const phoneNumber = {
      country_phone_code: {
        name: 'country_phone_code',
        value: number.phone.country_phone_code
      },
      cellphone: {
        name: 'cellphone',
        value: number.phone.cellphone
      }
    }
    handleChangeInput(phoneNumber, true)
  }

  // The save's answer: its error, or its success (and the way back, below).
  useEffect(() => {
    if (formState?.result?.result && !formState?.loading) {
      if (formState.result.error) {
        const message = Array.isArray(formState.result.result) ? formState.result.result[0] : formState.result.result
        // A save error is the form's own, under it: never a toast.
        setSaveError(String(message))
      } else {
        setSaveError(null)
        showToast(ToastType.Success, t('UPDATE_SUCCESSFULLY', 'Update successfully'))
      }
    }
  }, [formState?.result])

  // What was typed and not saved: a value of the data that is not the one the screen opened with (typing a letter
  // and deleting it is no change), or anything in the password fields (they open empty).
  const hasDataChanges = Object.keys(formState?.changes ?? {}).some((key) => differsFromOpened(formState.changes[key], user?.[key]))
  const hasUnsaved = isPassword
    ? current.length > 0 || next.length > 0 || confirmation.length > 0
    : hasDataChanges
  const hasUnsavedRef = useRef(false)
  hasUnsavedRef.current = hasUnsaved
  // The way out is open: the save went through (the form's own way back) or the user chose to discard.
  const leavingRef = useRef(false)

  // Leaving with unsaved typing asks first; `proceed` is the way out the user chose.
  const askToDiscard = (proceed: () => void) => confirm({
    message: t('QUESTION_DISCARD_CHANGES', 'You have changes that are not saved. Do you want to discard them?'),
    acceptText: t('DISCARD', 'Discard'),
    cancelText: t('KEEP_EDITING', 'Keep editing'),
    destructive: true,
    onAccept: () => {
      leavingRef.current = true
      proceed()
    }
  })

  const handleBack = () => {
    if (hasUnsavedRef.current && !leavingRef.current) {
      askToDiscard(() => navigation?.goBack?.())
      return
    }
    navigation?.goBack?.()
  }

  // The system's back button and the swipe leave without the bar's arrow: they ask the same.
  const askToDiscardRef = useRef(askToDiscard)
  askToDiscardRef.current = askToDiscard
  useEffect(() => {
    if (!navigation?.addListener) return
    return navigation.addListener('beforeRemove', (event: any) => {
      if (!hasUnsavedRef.current || leavingRef.current) return
      event.preventDefault()
      askToDiscardRef.current(() => navigation.dispatch(event.data.action))
    })
  }, [navigation])

  // The controller turns the edit off when the save went through: the user goes back to the profile.
  useEffect(() => {
    if (!isEdit) {
      leavingRef.current = true
      navigation?.goBack?.()
    }
  }, [isEdit])

  // The account's own fields come first and are always drawn (ANDROID: "Personal information" showed only "Name" because
  // the project's checkout validation fields had the others off); the project's other fields follow, as it orders and shows them.
  const fields: any[] = accountFieldList(validationFields, t)
  const sanitizeEmail = (value: string) =>
    value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, '')

  // The password: all three typed, the new one long enough and the confirmation the same.
  const newTooShort = next.length > 0 && next.length < PASSWORD_MIN_LENGTH
  const passwordsDiffer = confirmation.length > 0 && next !== confirmation
  const canUpdatePassword = current.length > 0 && next.length >= PASSWORD_MIN_LENGTH && confirmation === next

  // The password is changed only once the server says the current one is right.
  const handleUpdatePassword = async () => {
    if (!canUpdatePassword || checking) return
    setSaveError(null)
    try {
      setChecking(true)
      setCurrentError('')
      const response = await fetch(`${ordering.root}/users/check_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-App-X': ordering.appId,
          'X-INTERNAL-PRODUCT-X': ordering.appInternalName
        },
        body: JSON.stringify({ password: current })
      })
      const { error: wrong } = await response.json()
      setChecking(false)
      if (wrong) {
        setCurrentError(t('ERROR_CURRENT_PASSWORD_WRONG', 'The current password is not right.'))
        return
      }
      handleButtonUpdateClick({ password: next })
    } catch (err: any) {
      setChecking(false)
      setSaveError(err?.message ?? t('NETWORK_ERROR', 'Network Error'))
    }
  }

  const renderFields = () => fields.map(
    (field: any) =>
      (ACCOUNT_FIELD_CODES.includes(field.code) || (showField && showField(field.code))) &&
      (
        <View key={field.id ?? field.code}>
          <Controller
            control={control}
            render={() => (
              <OInput
                scope='account_page'
                name={field.code}
                placeholder={t(field.code.toUpperCase(), field?.name)}
                autoCapitalize={field.code === 'email' ? 'none' : 'sentences'}
                hasError={!!errors?.[field.code]}
                value={
                  formState?.changes[field.code] ??
                  (user && user[field.code]) ??
                  ''
                }
                onChange={(val: any) => {
                  field.code !== 'email'
                    ? setValue(field.code, val.target.value)
                    : setValue(field.code, sanitizeEmail(val.target.value))
                  field.code !== 'email'
                    ? handleChangeInput(val)
                    : handleChangeInput({
                      target: {
                        name: 'email',
                        value: sanitizeEmail(val.target.value)
                      }
                    })
                }}
                autoCorrect={field.code === 'email' && false}
                type={field.code === 'email' ? 'email-address' : 'default'}
                returnKeyType='done'
                autoCompleteType={field.code === 'email' ? 'email' : 'off'}
              />
            )}
            name={field.code}
            rules={getInputRules(field)}
            defaultValue={user && user[field.code]}
          />
          {!!errors?.[field.code] && (
            <FieldError scope='account_page' testID={`error-${field.code}`}>{errors[field.code]?.message as string}</FieldError>
          )}
        </View>
      )
  )

  const renderPhone = () => !!showInputPhoneNumber && (
    <View>
      <PhoneInputNumber
        scope='account_page'
        data={phoneInputData}
        handleData={(val: any) => handleChangePhoneNumber(val)}
        defaultValue={user?.cellphone}
        defaultCode={user?.country_phone_code || null}
      />
      {phoneRequired && (
        <FieldError scope='account_page' testID='error-cellphone'>
          {t('VALIDATION_ERROR_MOBILE_PHONE_REQUIRED', 'The field Mobile phone is required.')}
        </FieldError>
      )}
    </View>
  )

  const renderPasswordFields = () => (
    <>
      <View>
        <OInput
          scope='account_page'
          testID='password-current'
          isSecured={!currentSee}
          placeholder={t('CURRENT_PASSWORD', 'Current password')}
          iconCustomRight={<PasswordToggle scope='account_page' visible={currentSee} onToggle={() => setCurrentSee(!currentSee)} />}
          hasError={!!currentError}
          value={current}
          onChange={(value: string) => { setCurrent(value); setCurrentError('') }}
          returnKeyType='done'
          blurOnSubmit
        />
        {!!currentError && <FieldError scope='account_page' testID='error-currentPassword'>{currentError}</FieldError>}
      </View>

      <View>
        <OInput
          scope='account_page'
          testID='password-new'
          isSecured={!nextSee}
          placeholder={t('NEW_PASSWORD', 'New password')}
          iconCustomRight={<PasswordToggle scope='account_page' visible={nextSee} onToggle={() => setNextSee(!nextSee)} />}
          hasError={newTooShort}
          value={next}
          onChange={(value: string) => setNext(value)}
          returnKeyType='done'
          blurOnSubmit
        />
        {newTooShort
          ? <FieldError scope='account_page' testID='error-newPassword'>{t('PASSWORD_MIN_HINT', 'At least _min_ characters.').replace('_min_', `${PASSWORD_MIN_LENGTH}`)}</FieldError>
          : (
            <OText preset='body_sm' color='text_muted' style={styles.hint} testID='password-hint'>
              {t('PASSWORD_MIN_HINT', 'At least _min_ characters.').replace('_min_', `${PASSWORD_MIN_LENGTH}`)}
            </OText>
          )}
      </View>

      <View>
        <OInput
          scope='account_page'
          testID='password-confirm'
          isSecured={!confirmSee}
          placeholder={t('CONFIRM_NEW_PASSWORD', 'Confirm new password')}
          iconCustomRight={<PasswordToggle scope='account_page' visible={confirmSee} onToggle={() => setConfirmSee(!confirmSee)} />}
          hasError={passwordsDiffer}
          value={confirmation}
          onChange={(value: string) => setConfirmation(value)}
          returnKeyType='done'
          blurOnSubmit
        />
        {passwordsDiffer && (
          <FieldError scope='account_page' testID='error-confirmPassword'>
            {t('VALIDATION_ERROR_PASSWORDS_MATCH', 'The passwords do not match')}
          </FieldError>
        )}
      </View>
    </>
  )

  const saving = isPassword ? checking || !!formState?.loading : !!formState?.loading
  return (
    <ScreenContainer>
      <KeyboardScreen
        enabled
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.screen}
      >
        <ONavbar
          title={isPassword ? t('PASSWORD', 'Password') : t('PERSONAL_INFORMATION', 'Personal information')}
          onBack={handleBack}
        />
        <KeyboardScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
         
          showsVerticalScrollIndicator={false}
        >
          {isPassword
            ? (themeVisible(theme, 'profile.password') && renderPasswordFields())
            : (
              <>
                {renderFields()}
                {renderPhone()}
              </>
            )}
          {!!saveError && <ONotice variant='danger' testID='profile-form-error'>{saveError}</ONotice>}
        </KeyboardScrollView>
        {/* The app's bottom bar, in the flow so the keyboard lifts it with the screen. */}
        <OBottomBar
          testID='profile-form-bar'
          actions={[{
            text: isPassword ? t('UPDATE_PASSWORD', 'Update password') : t('SAVE_CHANGES', 'Save changes'),
            testID: 'profile-form-update',
            loading: saving,
            disabled: saving || !!validationFields?.loading || (isPassword ? !canUpdatePassword : !hasDataChanges),
            onClick: isPassword ? handleUpdatePassword : () => handleSubmit(onSubmit)()
          }]}
        />
      </KeyboardScreen>
    </ScreenContainer>
  )
}

/** The form wired to its own headless controller: what it holds is lost with the screen. */
export const UserFormDetails = (props: any) => {
  const formProps = {
    ...props,
    UIComponent: UserFormDetailsUI
  }

  return <UserFormDetailsController {...formProps} />
}
