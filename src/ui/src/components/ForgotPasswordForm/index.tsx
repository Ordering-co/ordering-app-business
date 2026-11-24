import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useTheme } from 'styled-components/native';

import { AUTH_FIELD_SCOPE, AuthScreen, formatCountdown, useAuthFieldLabel, useAuthStyles } from '../LoginForm/AuthPieces';
import { apiErrorText } from '../../utils/errorText';
import { useCountdownTimer } from '../../hooks/useCountdownTimer';
import { nativeTextStyle, themePart } from '@/theme/helpers';

import {
  ForgotPasswordForm as ForgotPasswordController,
  useLanguage,
} from '@components';
import { FieldError, OButton, OInput, OLink, ONotice, OText } from '../shared';

/**
 * The seconds before the link can be asked for again. The server answers "OK" to every request and applies its
 * own limit without saying so (it skips the mail), so this wait is the only feedback the user has: a constant of
 * the app (the mockup draws 0:45).
 */
const RESEND_WAIT = 45;

/**
 * The forgot password screen: the lead, the e-mail field with its label above, the button and, once the link was
 * sent, the notice that says where, the button counting the wait to send again, and the way back to the login.
 * What the server answers stays on the screen: a failure is a notice until the address is edited.
 */
type ForgotPasswordValues = { email: string };

const ForgotPasswordUI = (props: any) => {
  const { navigation, formState, handleButtonForgotPasswordClick } = props;

  const authStyles = useAuthStyles();
  const fieldLabel = useAuthFieldLabel();
  const theme: any = useTheme();
  const [, t] = useLanguage();
  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordValues>();

  const [emailSent, setEmailSent] = useState<string | null>(null);
  // What the server answered to the address that was sent: the link is on its way, or it failed.
  const [answer, setAnswer] = useState<{ variant: 'success' | 'danger', text: string } | null>(null);
  const sent = answer?.variant === 'success';
  const [secondsLeft, , restartCountdown]: any = useCountdownTimer(RESEND_WAIT, sent);

  const onSubmit = (values: any) => {
    // The request goes with the keyboard closed (a failed check keeps it, to fix the field).
    Keyboard.dismiss();
    setEmailSent(values.email);
    setAnswer(null);
    handleButtonForgotPasswordClick && handleButtonForgotPasswordClick(values);
  };

  const handleChangeInputEmail = (value: string, onChange: any) => {
    // A new address is a new request: the button sends again and the answer to the old one goes.
    setEmailSent(null);
    setAnswer(null);
    onChange(value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, ''));
  };

  useEffect(() => {
    if (!formState.loading && emailSent) {
      if (formState.result?.error) {
        setEmailSent(null);
        // The server answers a list of messages, or a text (a network failure).
        const { result } = formState.result;
        result && setAnswer({ variant: 'danger', text: apiErrorText(result, t) });
        return;
      }
      restartCountdown();
      setAnswer({ variant: 'success', text: '' });
    }
  }, [formState]);

  const waiting = sent && secondsLeft > 0;
  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation?.navigate?.('Login');
  };

  // The success notice is one line of text with its first words in bold: its look is the notice's own.
  const submitSlot = themePart(theme, 'auth_form', 'slots.submit');
  const alert = themePart(theme, 'alert', 'base');
  const success = themePart(theme, 'alert', 'variants.success');
  const noticeStyles = useMemo(() => StyleSheet.create({
    text: { ...nativeTextStyle(alert.text), color: success.color },
    bold: { ...nativeTextStyle(alert.title), color: success.color },
  }), [alert, success]);

  return (
    <AuthScreen
      title={t('FORGOT_YOUR_PASSWORD', 'Forgot your password?')}
      onBack={goBack}
    >
      <OText color='text_muted'>
        {t(
          'FORGOT_PASSWORD_INSTRUCTIONS',
          "Enter your email and we'll send you a link to reset your password.",
        )}
      </OText>

      <View style={authStyles.fields}>
        <View>
          <Controller
            control={control}
            render={({ field: { onChange, value } }) => (
              <OInput
                scope={AUTH_FIELD_SCOPE}
                {...fieldLabel(t('EMAIL', 'Email'), t('EMAIL_PLACEHOLDER', 'name@store.com'))}
                hasError={!!errors?.email}
                onChange={(e: any) => {
                  handleChangeInputEmail(e, onChange);
                }}
                value={value}
                autoCapitalize="none"
                autoCorrect={false}
                type="email-address"
                autoCompleteType="email"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => handleSubmit(onSubmit)()}
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

        {answer?.variant === 'danger' && (
          <ONotice variant='danger' testID='forgot-notice'>{answer.text}</ONotice>
        )}
        {sent && (
          <ONotice variant='success' testID='forgot-notice'>
            <OText style={noticeStyles.text}>
              <OText style={noticeStyles.bold}>{t('FORGOT_LINK_SENT', 'Link sent.')}</OText>
              {` ${t('FORGOT_CHECK_INBOX', 'Check the inbox of')} ${emailSent}.`}
            </OText>
          </ONotice>
        )}
      </View>

      <OButton
        testID='forgot-submit'
        text={
          waiting
            ? `${t('SEND_AGAIN_IN', 'Send again in')} ${formatCountdown(secondsLeft, { padMinutes: false })}`
            : sent
              ? t('FORGOT_SEND_AGAIN', 'Send again')
              : t('RECOVER_PASSWORD_BUTTON', 'Recover password')
        }
        color={submitSlot.color}
        appearance={submitSlot.appearance}
        size={submitSlot.size}
        disabled={waiting}
        loading={formState.loading}
        onClick={() => handleSubmit(onSubmit)()}
      />

      <View style={authStyles.timerBox}>
        <OLink testID='forgot-back' shorcut={t('BACK_TO_LOGIN', 'Back to log in')} onPress={goBack} />
      </View>
    </AuthScreen>
  );
};

export const ForgotPasswordForm = (props: any) => {
  const ForgotPasswordProps = {
    ...props,
    UIComponent: ForgotPasswordUI,
  };
  return <ForgotPasswordController {...ForgotPasswordProps} />;
};
