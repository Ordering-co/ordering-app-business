import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Image, Keyboard, StyleSheet, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { getVersion } from 'react-native-device-info';
import Recaptcha from 'react-native-recaptcha-that-works'
import { useTheme } from 'styled-components/native';

import { RecaptchaV3 } from '../RecaptchaV3'
import { apiErrorText } from '../../utils/errorText'
import { Otp } from './Otp'
import {
  AUTH_FIELD_SCOPE,
  AuthScreen,
  RecaptchaCheckbox,
  useAuthFieldLabel,
  useAuthStyles,
  useUntilEdited
} from './AuthPieces'
import { FieldError, IconTile, ODivider, OButton, OInput, OLink, OModal, ONotice, OText, PasswordToggle } from '../shared'
import { LanguageSelector } from '../LanguageSelector'
import { PhoneInputNumber } from '../PhoneInputNumber'
import { VerifyPhone } from '../VerifyPhone'
import { themeControlHeight, themeImage, themePart, themeSpace, themeVisible } from '@/theme/helpers'
import { usePageSections } from '@/theme/sections'

import {
  LoginForm as LoginFormController,
  useLanguage,
  useConfig
} from '@components';

/**
 * The login, as the mockup draws it: the logo, the title with its line, the fields (their labels above and their
 * messages under them), "Forgot your password?" at the end of the line, the main button, and, when the project
 * has the e-mail code, the outline button "Email me a login code" under an "or" line; then the version. It is the
 * page `login` of the theme (sections `logo`, `title`, `form`); the language button is at the end of the bar.
 *
 * The ways in are the controller's (it reads the project's configs): e-mail and password; phone and password,
 * only when the project has no e-mail login (the phone field takes the e-mail's place); a code by e-mail (the
 * outline button, which asks for the code with only the e-mail field filled); the phone verification of Twilio. What
 * belongs to no field (the server's answer, the reCAPTCHA's retry) is a notice that stays until the user edits.
 */
type LoginValues = { email: string; password: string };

/** The channels the controller's `generateOtpCode` takes for a code to a phone: an SMS, a WhatsApp message. */
const OTP_CHANNEL_SMS = 2
const OTP_CHANNEL_WHATSAPP = 4
/** The logotype is 4:1 (docs/theme/pages-and-visibility.md section 3). */
const LOGOTYPE_RATIO = 4

/** The first message of a result that failed: the server answers a text or a list of them. */
const messageOf = (state: any): any => {
  if (!state || state.loading || !state.result?.error || !state.result?.result) return null
  return state.result.result
}

/** What the controller hands the form and what the page gives it. */
type LoginFormProps = {
  navigation?: any
  formState?: any
  handleButtonLoginClick?: any
  onNavigationRedirect?: (page: string) => void
  loginTab?: string
  handleChangeTab: (tab: string) => void
  useLoginByCellphone?: boolean
  useLoginByEmail?: boolean
  handleSendVerifyCode?: any
  verifyPhoneState?: any
  checkPhoneCodeState?: any
  handleCheckPhoneCode?: any
  setCheckPhoneCodeState?: any
  handleReCaptcha?: any
  enableReCaptcha?: boolean
  useLoginOtp?: boolean
  otpType?: string
  setOtpType: (type: string) => void
  generateOtpCode: (values?: any, channel?: number) => void
  useLoginOtpEmail?: boolean
  useLoginOtpCellphone?: boolean
  useLoginOtpWhatsapp?: boolean
}

const LoginFormUI = (props: LoginFormProps) => {
  const {
    formState,
    handleButtonLoginClick,
    onNavigationRedirect,
    loginTab,
    useLoginByCellphone,
    useLoginByEmail,
    handleSendVerifyCode,
    verifyPhoneState,
    checkPhoneCodeState,
    handleCheckPhoneCode,
    setCheckPhoneCodeState,
    handleReCaptcha,
    enableReCaptcha,

    useLoginOtp,
    otpType,
    setOtpType,
    generateOtpCode,
    useLoginOtpEmail,
    useLoginOtpWhatsapp,
  } = props;

  const [, t] = useLanguage();
  const theme: any = useTheme();
  const authStyles = useAuthStyles();
  const fieldLabel = useAuthFieldLabel();
  const sections = usePageSections('login');
  const [{ configs }] = useConfig();
  const { control, handleSubmit, clearErrors, trigger, getValues, formState: { errors } } = useForm<LoginValues>();

  const inputRef = useRef<any>(null);
  const inputMailRef = useRef<any>(null);

  const [passwordSee, setPasswordSee] = useState(false);
  const [isLoadingVerifyModal, setIsLoadingVerifyModal] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneInputData, setPhoneInputData] = useState({
    error: '',
    phone: {
      country_phone_code: null,
      cellphone: null,
    },
  });
  // The phone field was left empty where it is needed (its own message is the invalid number's).
  const [phoneMissing, setPhoneMissing] = useState('');

  const [recaptchaConfig, setRecaptchaConfig] = useState<any>({})
  const [recaptchaVerified, setRecaptchaVerified] = useState(false)
  // The check cannot open: the project has no site key or no base url.
  const [recaptchaError, setRecaptchaError] = useState('')

  const recaptchaRef = useRef<any>({});

  const [willVerifyOtpState, setWillVerifyOtpState] = useState(false)
  // The address the e-mail code went to (the code screen says it).
  const [codeEmail, setCodeEmail] = useState('')

  // The channel of the code the phone's OTP asks for; the code screen's resend asks again by the same one.
  const otpChannelRef = useRef(OTP_CHANNEL_SMS)
  // The way in the form was on before it asked for a code: the code screen's back arrow returns to it.
  const tabBeforeCode = useRef<string | undefined>(undefined)

  // What each field shows: the e-mail with its tab (or the e-mail code), the phone with its tab (or the phone code),
  // the password on every tab but the code's.
  const emailShown = (useLoginByEmail && loginTab === 'email') || (loginTab === 'otp' && otpType === 'email')
  const phoneShown = (useLoginByCellphone && loginTab === 'cellphone') || (loginTab === 'otp' && otpType === 'cellphone')
  const passwordShown = loginTab !== 'otp'
  const otpPhoneShown = loginTab === 'otp' && otpType === 'cellphone'
  const whatsappShown = otpPhoneShown && !!useLoginOtpWhatsapp
  const methodsShown = !!(useLoginByCellphone || useLoginByEmail || useLoginOtp)
  // The code by e-mail is asked for from the other ways; once on it, the main button is the one that asks.
  const emailCodeShown = !!useLoginOtpEmail && loginTab !== 'otp'
  const smsShown = !!useLoginByCellphone &&
    loginTab === 'cellphone' &&
    !!configs &&
    Object.keys(configs).length > 0 &&
    (configs?.twilio_service_enabled?.value === 'true' || configs?.twilio_service_enabled?.value === '1')
  // A way back to the password, for the form that is on the code's tab with a password way to return to.
  const passwordWayBack = loginTab === 'otp' && otpType === 'email' && !!useLoginByCellphone && !useLoginByEmail

  // The notices of what belongs to no field: the server's answer to the login, to the code request.
  const formMessage = messageOf(formState)
  const [formNotice, clearFormNotice] = useUntilEdited(
    formState,
    formMessage === null
      ? null
      : formMessage?.[0] === 'ERROR_AUTH_VERIFICATION_CODE'
        ? { variant: 'info' as const, text: t('PLEASE_TRY_AGAIN', 'Please try again') }
        : { variant: 'danger' as const, text: apiErrorText(formMessage, t) }
  )
  const verifyMessage = messageOf(verifyPhoneState)
  const [verifyNotice, clearVerifyNotice] = useUntilEdited(
    verifyPhoneState,
    verifyMessage === null ? null : { variant: 'danger' as const, text: apiErrorText(verifyMessage, t) }
  )
  const clearNotices = () => {
    clearFormNotice()
    clearVerifyNotice()
  }

  const phoneRequiredMessage = t('VALIDATION_ERROR_MOBILE_PHONE_REQUIRED', 'The field Mobile phone is required.')
  const isPhoneEmpty = !phoneInputData.error && !phoneInputData.phone.country_phone_code && !phoneInputData.phone.cellphone

  const handleOpenRecaptcha = () => {
    setRecaptchaVerified(false)
    if (!recaptchaConfig?.siteKey) {
      setRecaptchaError(t('NO_RECAPTCHA_SITE_KEY', 'The config doesn\'t have recaptcha site key'));
      return
    }
    if (!recaptchaConfig?.baseUrl) {
      setRecaptchaError(t('NO_RECAPTCHA_BASE_URL', 'The config doesn\'t have recaptcha base url'));
      return
    }
    setRecaptchaError('')
    recaptchaRef.current.open()
  }

  const onRecaptchaVerify = (token: any) => {
    setRecaptchaVerified(true)
    handleReCaptcha({ code: token, version: recaptchaConfig?.version })
  }

  useEffect(() => {
    if (configs && Object.keys(configs).length > 0 && enableReCaptcha) {
      if (configs?.security_recaptcha_type?.value === 'v3' &&
        configs?.security_recaptcha_score_v3?.value > 0 &&
        configs?.security_recaptcha_site_key_v3?.value
      ) {
        setRecaptchaConfig({
          version: 'v3',
          siteKey: configs?.security_recaptcha_site_key_v3?.value || null,
          baseUrl: configs?.security_recaptcha_base_url?.value || null
        })
        return
      }
      if (configs?.security_recaptcha_site_key?.value) {
        setRecaptchaConfig({
          version: 'v2',
          siteKey: configs?.security_recaptcha_site_key?.value || null,
          baseUrl: configs?.security_recaptcha_base_url?.value || null
        })
      }
    }
  }, [configs, enableReCaptcha])

  const handleChangeTab = (val: string) => {
    setPhoneInputData({ ...phoneInputData, error: '' });
    setPhoneMissing('');
    setRecaptchaError('');
    clearNotices();
    // The other tab's red fields and messages do not follow the user to this one.
    clearErrors();
    props.handleChangeTab(val);
  };

  const handleChangeInputEmail = (value: string, onChange: any) => {
    clearNotices();
    onChange(value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, ''));
  };

  const handleLogin = () => {
    setLoading(true);
    // Both the form's fields and the phone's are checked at once, so each shows what it lacks.
    const missing = phoneShown && isPhoneEmpty;
    setPhoneMissing(missing ? phoneRequiredMessage : '');
    handleSubmit((values) => {
      if (!missing) onSubmit(values);
    }, () => setLoading(false))();
  };

  const mainLogin = (values: any) => {
    if (loginTab === 'otp') {
      if (phoneInputData.error && otpType === 'cellphone') {
        return
      }
      setCodeEmail(values?.email ?? '')
      generateOtpCode({
        ...values,
        ...phoneInputData.phone
      }, otpChannelRef.current)
      setWillVerifyOtpState(true)
    } else {
      if (phoneInputData.error) {
        return;
      }
      handleButtonLoginClick({
        ...values,
        ...phoneInputData.phone,
      });
    }
  }

  const onSubmit = (values: any) => {
    // The request goes with the keyboard closed (a failed check keeps it, to fix the field).
    Keyboard.dismiss();

    if (phoneInputData.error) {
      return;
    }
    mainLogin(values)
  };

  // The form's way in becomes the e-mail code (what the tab of the code does).
  const handleChangeOtpType = (type: string) => {
    tabBeforeCode.current = loginTab === 'otp' ? tabBeforeCode.current : loginTab
    handleChangeTab('otp')
    setOtpType(type)
  }

  // "Email me a login code": only the e-mail field is checked (the password is not asked for).
  const handleEmailCode = async () => {
    if (!emailShown) {
      // The form has no e-mail field (the phone's way): its tab shows it, and the main button asks.
      handleChangeOtpType('email')
      return
    }
    const valid = await trigger('email')
    if (!valid) return
    Keyboard.dismiss()
    handleChangeOtpType('email')
    const email = getValues('email')
    setCodeEmail(email)
    generateOtpCode({ email })
    setWillVerifyOtpState(true)
  }

  // The code screen's back arrow: the form is on the way it was on before the code.
  const handleCloseCode = () => {
    setWillVerifyOtpState(false)
    props.handleChangeTab(tabBeforeCode.current ?? (useLoginByEmail ? 'email' : useLoginByCellphone ? 'cellphone' : 'otp'))
  }

  // The code screen's resend: the same request again.
  const handleResendCode = () => {
    generateOtpCode({ email: getValues('email'), ...phoneInputData.phone }, otpChannelRef.current)
  }

  // The code goes by the channel of the button that asked for it (the main one is the SMS).
  const handleSendOtp = (channel: number) => {
    otpChannelRef.current = channel
    handleLogin()
  }

  const handleLoginOtp = (code: string) => {
    handleButtonLoginClick({ code })
  }

  const handleVerifyCodeClick = () => {
    if (phoneInputData.error) {
      return;
    }

    if (isPhoneEmpty) {
      setPhoneMissing(phoneRequiredMessage);
      return;
    }

    handleSendVerifyCode && handleSendVerifyCode(phoneInputData.phone);
    setIsLoadingVerifyModal(true);
  };

  useEffect(() => {
    if (!formState?.loading && formState?.result?.error) {
      if (formState.result?.result?.[0] === 'ERROR_AUTH_VERIFICATION_CODE') {
        setRecaptchaVerified(false)
        setRecaptchaConfig({
          version: 'v2',
          siteKey: configs?.security_recaptcha_site_key?.value || null,
          baseUrl: configs?.security_recaptcha_base_url?.value || null
        })
      }
      return
    }
    if (!formState?.loading && !formState?.result?.error) {
      setWillVerifyOtpState(false)
    }
  }, [formState]);

  useEffect(() => {
    if (verifyPhoneState && !verifyPhoneState?.loading) {
      if (verifyPhoneState.result?.error) {
        setIsLoadingVerifyModal(false);
        return;
      }

      const okResult = verifyPhoneState.result?.result === 'OK';
      if (okResult) {
        !isModalVisible && setIsModalVisible(true);
        setIsLoadingVerifyModal(false);
      }
    }
  }, [verifyPhoneState]);

  useEffect(() => {
    if (loading && !formState?.loading) {
      setLoading(false);
    }
  }, [loading]);

  const mainSlot = themePart(theme, 'auth_form', 'slots.submit');
  const secondarySlot = themePart(theme, 'auth_form', 'slots.secondary');
  const styles = useMemo(() => {
    const logoHeight = themeControlHeight(theme, 'md')
    return StyleSheet.create({
      grow: { flex: 1 },
      // The room of the invisible reCAPTCHA v3 check (a WebView).
      recaptchaV3: { height: themeControlHeight(theme, 'md') },
      or: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
      line: { flex: 1 },
      logo: { width: logoHeight * LOGOTYPE_RATIO, height: logoHeight },
      title: { gap: themeSpace(theme, 'xs') },
      version: { textAlign: 'center' },
    })
  }, [theme]);

  const logoSource = themeImage(theme, 'logotype')
  const email = (
    <View>
      <Controller
        control={control}
        render={({ field: { onChange, value } }) => (
          <OInput
            scope={AUTH_FIELD_SCOPE}
            {...fieldLabel(t('EMAIL', 'Email'), t('EMAIL_PLACEHOLDER', 'name@store.com'))}
            hasError={!!errors?.email}
            onChange={(e: any) => handleChangeInputEmail(e, onChange)}
            value={value}
            autoCapitalize="none"
            autoCorrect={false}
            type="email-address"
            autoCompleteType="email"
            forwardRef={inputMailRef}
            returnKeyType={passwordShown ? 'next' : 'done'}
            onSubmitEditing={() => passwordShown ? inputRef.current?.focus() : handleSendOtp(OTP_CHANNEL_SMS)}
            blurOnSubmit={!passwordShown}
          />
        )}
        name="email"
        rules={{
          required: t(
            'VALIDATION_ERROR_EMAIL_REQUIRED',
            'The field Email is required',
          ).replace('_attribute_', t('EMAIL', 'Email')),
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: t(
              'INVALID_ERROR_EMAIL',
              'Invalid email address',
            ).replace('_attribute_', t('EMAIL', 'Email')),
          },
        }}
        defaultValue=""
      />
      {!!errors?.email && (
        <FieldError scope={AUTH_FIELD_SCOPE} testID='error-email'>{errors.email.message}</FieldError>
      )}
    </View>
  )

  const password = (
    <View>
      <Controller
        control={control}
        render={({ field: { onChange, value } }) => (
          <OInput
            scope={AUTH_FIELD_SCOPE}
            isSecured={!passwordSee}
            {...fieldLabel(t('PASSWORD', 'Password'))}
            hasError={!!errors?.password}
            iconCustomRight={
              <PasswordToggle scope={AUTH_FIELD_SCOPE} visible={passwordSee} onToggle={() => setPasswordSee(!passwordSee)} />
            }
            value={value}
            forwardRef={inputRef}
            onChange={(val: any) => {
              clearNotices();
              onChange(val);
            }}
            returnKeyType="done"
            onSubmitEditing={() => handleLogin()}
            blurOnSubmit
          />
        )}
        name="password"
        rules={{
          required: t(
            'VALIDATION_ERROR_PASSWORD_REQUIRED',
            'The field Password is required',
          ).replace('_attribute_', t('PASSWORD', 'Password')),
        }}
        defaultValue=""
      />
      {!!errors?.password && (
        <FieldError scope={AUTH_FIELD_SCOPE} testID='error-password'>{errors.password.message}</FieldError>
      )}
    </View>
  )

  const renderLogo = () => (
    logoSource
      ? <Image source={logoSource} style={styles.logo} resizeMode='contain' accessibilityIgnoresInvertColors testID='login-logo' />
      // Without a logo (the theme sets none): the store's glyph.
      : <IconTile icon='storefront-outline' size='lg' testID='login-logo' />
  )

  const renderTitle = () => (
    <View style={styles.title}>
      <OText preset='h2'>{t('MANAGE_YOUR_BUSINESS', 'Manage your business')}</OText>
      <OText color='text_muted'>{t('LOGIN_TO_MANAGE_YOUR_ORDERS', 'Log in to receive and manage your orders.')}</OText>
    </View>
  )

  const renderForm = () => !!methodsShown && (
    <>
      {[formNotice, verifyNotice].map((notice, i) => notice && (
        <ONotice key={i} variant={notice.variant} testID='login-notice'>{notice.text}</ONotice>
      ))}

      <View style={authStyles.fields}>
        {emailShown && email}

        {phoneShown && (
          <PhoneInputNumber
            scope={AUTH_FIELD_SCOPE}
            data={{ ...phoneInputData, error: phoneInputData.error || phoneMissing }}
            handleData={(val: any) => {
              setPhoneMissing('');
              clearNotices();
              setPhoneInputData(val);
            }}
            onSubmitEditing={() => null}
            textInputProps={{
              returnKeyType: 'next',
              onSubmitEditing: () => inputRef?.current?.focus?.(),
            }}
          />
        )}

        {passwordShown && password}

        {!!onNavigationRedirect && passwordShown && themeVisible(theme, 'auth.forgot_password_link') && (
          <View style={authStyles.end}>
            <OLink
              testID='login-forgot'
              shorcut={t('FORGOT_YOUR_PASSWORD', 'Forgot your password?')}
              onPress={() => onNavigationRedirect('Forgot')}
            />
          </View>
        )}

        {(enableReCaptcha && recaptchaConfig?.version) && (
          <>
            {recaptchaConfig?.version === 'v3' ? (
              <RecaptchaV3
                url={recaptchaConfig?.baseUrl}
                siteKey={recaptchaConfig?.siteKey}
                containerStyle={styles.recaptchaV3}
                onExecute={onRecaptchaVerify}
              />
            ) : (
              <View>
                <RecaptchaCheckbox
                  checked={recaptchaVerified}
                  onPress={handleOpenRecaptcha}
                  label={t('VERIFY_ReCAPTCHA', 'Verify reCAPTCHA')}
                />
                {!!recaptchaError && (
                  <FieldError scope={AUTH_FIELD_SCOPE} testID='error-recaptcha'>{recaptchaError}</FieldError>
                )}
                <Recaptcha
                  ref={recaptchaRef}
                  siteKey={recaptchaConfig?.siteKey}
                  baseUrl={recaptchaConfig?.baseUrl}
                  onVerify={onRecaptchaVerify}
                  onExpire={() => setRecaptchaVerified(false)}
                />
              </View>
            )}
          </>
        )}
      </View>

      <View style={authStyles.actions}>
        <OButton
          testID='login-submit'
          onClick={() => handleSendOtp(OTP_CHANNEL_SMS)}
          text={loginTab !== 'otp'
            ? t('LOGIN_BUTTON', 'Log in')
            : otpType === 'email'
              ? t('EMAIL_ME_A_LOGIN_CODE', 'Email me a login code')
              : whatsappShown ? t('SEND_BY_SMS', 'Send by SMS') : t('GET_VERIFICATION_CODE', 'Get verification code')}
          color={mainSlot.color}
          appearance={mainSlot.appearance}
          size={mainSlot.size}
          loading={formState?.loading || loading}
        />

        {whatsappShown && (
          <OButton
            testID='login-whatsapp'
            onClick={() => handleSendOtp(OTP_CHANNEL_WHATSAPP)}
            text={t('SEND_BY_WHATSAPP', 'Send by WhatsApp')}
            color={secondarySlot.color}
            appearance={secondarySlot.appearance}
            size={secondarySlot.size}
            loading={formState?.loading || loading}
          />
        )}

        {(emailCodeShown || smsShown) && (
          <>
            <View style={styles.or}>
              <View style={styles.line}><ODivider /></View>
              <OText preset='body_sm' color='text_muted'>{t('LOGIN_OR_DIVIDER', 'or')}</OText>
              <View style={styles.line}><ODivider /></View>
            </View>

            {emailCodeShown && (
              <OButton
                testID='login-email-code'
                onClick={handleEmailCode}
                text={t('EMAIL_ME_A_LOGIN_CODE', 'Email me a login code')}
                color={secondarySlot.color}
                appearance={secondarySlot.appearance}
                size={secondarySlot.size}
              />
            )}

            {smsShown && (
              <OButton
                testID='login-verify-phone'
                onClick={handleVerifyCodeClick}
                text={t('GET_VERIFICATION_CODE', 'Get verification code')}
                color={secondarySlot.color}
                appearance={secondarySlot.appearance}
                size={secondarySlot.size}
                loading={isLoadingVerifyModal}
              />
            )}
          </>
        )}

        {passwordWayBack && (
          <View style={authStyles.end}>
            <OLink
              testID='login-password-way'
              shorcut={t('LOGIN_WITH_PASSWORD', 'Log in with your password')}
              onPress={() => handleChangeTab(tabBeforeCode.current ?? 'cellphone')}
            />
          </View>
        )}
      </View>
    </>
  )

  return (
    <>
      <AuthScreen barEnd={<LanguageSelector variant='link' />}>
        {sections.render({ logo: renderLogo, title: renderTitle, form: renderForm })}
        <View style={styles.grow} />
        {themeVisible(theme, 'auth.version') && (
          <OText preset='body_sm' color='text_muted' style={styles.version} testID='login-version'>
            {t('APP_VERSION', 'Version _version_').replace('_version_', getVersion())}
          </OText>
        )}
      </AuthScreen>

      <OModal
        open={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        entireModal
        customClose
      >
        <VerifyPhone
          phone={phoneInputData.phone}
          verifyPhoneState={verifyPhoneState}
          checkPhoneCodeState={checkPhoneCodeState}
          handleCheckPhoneCode={handleCheckPhoneCode}
          setCheckPhoneCodeState={setCheckPhoneCodeState}
          handleVerifyCodeClick={handleVerifyCodeClick}
          onClose={() => setIsModalVisible(false)}
        />
      </OModal>
      <OModal
        open={willVerifyOtpState}
        onClose={handleCloseCode}
        entireModal
        customClose
      >
        {willVerifyOtpState && (
          <Otp
            email={codeEmail}
            willVerifyOtpState={willVerifyOtpState}
            onBack={handleCloseCode}
            onResend={handleResendCode}
            handleLoginOtp={handleLoginOtp}
            formState={formState}
            checkPhoneCodeState={checkPhoneCodeState}
          />
        )}
      </OModal>
    </>
  );
};

export const LoginForm = (props: any) => {
  const loginProps = {
    ...props,
    isRecaptchaEnable: true,
    UIComponent: LoginFormUI,
  };

  return <LoginFormController {...loginProps} />;
};
