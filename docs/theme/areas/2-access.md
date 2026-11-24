# Area 2 — access (Home, Login, Forgot, code screens, permission explainer, Splash)

Phase 1 analysis, read-only. **Nothing was run** (no simulator, device, tests, typecheck or lint): every statement comes from reading code, mockups, the driver-theming repo, api-core and screenshots. Business repo = `/Users/work/Ordering/ordering-app-business-theming` (paths below are relative to it unless prefixed `driver-theming:` = `/Users/work/Ordering/ordering-app-driver-theming`, `driver-v26:` = `/Users/work/Ordering/ordering-app-driver-v26`).

Files read completely: pages `Home`, `Login`, `ForgotPassword`, `Signup`, `Splash`, `IntroductoryTutorial` (first 60 lines + diff against the driver); UI `Home`, `LoginForm` (+`Otp`, `styles`), `ForgotPasswordForm`, `NotificationSetting`, `LanguageSelector` (first 120 lines); submodule controllers `LoginForm/index.js` and `getLoginSessionDecision.js`, `ForgotPasswordForm/index.js`; `src/navigators/RootNavigator.tsx`, `getOneSignalSetupPlan.ts`, `getFirebasePushSetupPlan.ts`; `src/BusinessApp.tsx` (project/splash parts); the four mockups and their `SPECS.md` entries (section G); driver-theming's `LoginForm/{index,AuthPieces,Otp}`, `Home`, `ForgotPasswordForm`, `VerifyPhone`, `PhoneInputNumber`, `RecaptchaV3`, `shared/{OOtpInput,KeyboardScreen,FieldError}`, pages `Home/Login/ForgotPassword/Splash`, `navigators/{getProjectSwitchPlan,firebasePushConsent,oneSignalGate}.ts`, `docs/SPLASH.md`, `docs/theme/pages-and-visibility.md`, the "Access" and "Phone login" rows of `decisions.md`, and the driver's `product.schema.json` components (`auth_form`, `home_hero`, `timer`, `field`, `input.sizes.code`).

## 1. Today

### 1.1 Screens, routes, files

| Screen | Route (file:line) | Shown when | Page | UI component | Controller |
|---|---|---|---|---|---|
| Splash | `Splash` in `src/navigators/RootNavigator.tsx:360-366` (also `HomeNavigator.tsx:112`) | Root: `!loaded`. `loaded` becomes true when `!orderStatus.loading && !isPushLoading.loading` (`:229-233`) or, signed out, `!sessionLoading && !isPushLoading.loading && !auth` (`:247-251`) | `src/pages/Splash.tsx` | none (page paints) | none |
| Home (welcome photo) | `Home` `:371-375` | `loaded && !auth`; first route of the signed-out stack | `src/pages/Home.tsx` | `src/ui/src/components/Home/index.tsx` | none |
| Login | `Login` `:376-382`, `initialParams={{ notification_state: oneSignalState }}`, gets `projectChanged={generalProjectState.changed}` | `!auth`; pushed from Home | `src/pages/Login.tsx` | `LoginForm/index.tsx` | `LoginForm` (`src/@/components/src/components/LoginForm/index.js`) |
| Forgot | `Forgot` `:383-387` | `!auth`; `onNavigationRedirect('Forgot')` from Login (`LoginForm/index.tsx:616`) | `src/pages/ForgotPassword.tsx` | `ForgotPasswordForm/index.tsx` | `ForgotPasswordForm` (`.../ForgotPasswordForm/index.js`) |
| Login code (OTP) | not a route: `OModal entireModal hideIcons` inside Login, `LoginForm/index.tsx:718-733` | `willVerifyOtpState` (set by `mainLogin`, `:207`) | — | `LoginForm/Otp/index.tsx` | same `LoginForm` controller (`generateOtpCode` `:357-400`, auth with `one_time_password` `:94-98`) |
| Phone verification (Twilio) | `OModal` inside Login `:705-717` | after "Get Verify Code" succeeds (`verifyPhoneState.result.result === 'OK'`, `:320-323`) | — | `VerifyPhone/index.tsx` | same controller (`sendVerifyPhoneCode` `:256-288`, `checkVerifyPhoneCode` `:299-355`) |
| Notification permission | no screen. The system dialog fires from `RootNavigator` at login (`:67` `requestNotifications`, Firebase path; `:209` `OneSignal.promptForPushNotificationsWithUserResponse`, OneSignal path). Screenshot `14-post-login-primera-pantalla` shows it over the orders list with no explanation | `auth` + push configured (`getOneSignalSetupPlan.ts:15-18`, `getFirebasePushSetupPlan.ts:15-23`) | — | the only explainer that exists is `NotificationSetting` (below) | — |
| `NotificationSetting` | mounted inside `OrdersOption` (`:1274-1277`) and `OrdersListManager` (`:911`) when `checkNotification` is true (`src/pages/MyOrders.tsx:57`) | on mount, if `checkNotifications().status === 'blocked'` (`NotificationSetting/index.tsx:18-24`) it opens an `OBottomPopup` "Enable notifications" with a button that calls `openSettings()` | — | `NotificationSetting/index.tsx` | none |
| IntroductoryTutorial | **not registered anywhere** | never | `src/pages/IntroductoryTutorial.tsx` (214 lines, `react-native-app-intro-slider`) | — | — |
| Signup | **not registered anywhere** | never | `src/pages/Signup.tsx` (`signupLevel: 2`, `:21`) | `SignupForm/index.tsx` (532 lines) | `SignupForm` |

Dead code, with evidence: `grep` for `IntroductoryTutorial`, `show_tutorials`, `Signup`, `SignupForm` outside their own files, tests, `src/ui/index.tsx` (the `@ui` export) and the type files returns only `src/config.json` (`"show_tutorials": true`, read by nobody). `git log -S IntroductoryTutorial` shows the page came with the first commit (`39f8196 add functional files`) and was never wired into this repo's `RootNavigator`. So the tutorial and the sign-up are unreachable; their assets are dead weight: `src/assets/images/slide1-4.png` (7.5 MB), `theme.images.tutorials` (`src/BusinessApp.tsx:101-106`, `src/theme.json:107-112`), dependency `react-native-app-intro-slider` (+ `src/types/react-native-app-intro-slider/index.d.ts`), `SignupForm` and its types (`SignupParams`, `src/types/index.tsx:78`, `src/ui/src/types/index.tsx:104`). Also dead inside live code: `LoginPropsAreEqual` (`src/pages/Login.tsx:13-17`, never used), `useLoginByCellphone: true` / `useLoginByEmail: true` passed by the page (`:25-26`: the controller overrides them with the project's configs, `LoginForm/index.js:486-487`), the project-name interval in `LoginForm/index.tsx:160-169` and the `values.project_name` branch of `onSubmit` (`:228-237`, `:367-375`) because the login form has no project field (nothing sets `projectName.name`).

### 1.2 Conditions

| Condition | Where (file:line) | Effect |
|---|---|---|
| `allowedLevels: [0, 2]` | `src/pages/Login.tsx:27`; applied in the controller `index.js:61-73` + `getLoginSessionDecision.js:2-8`, on e-mail/password and OTP (`:170-172`), Twilio (`:321`) and Spoonity (`:419`) | a user of another level is logged out again and gets the message of key `YOU_DO_NOT_HAVE_PERMISSION` ("Your session have been closed") as a toast; same in the driver app with `[4]` |
| `phone_password_login_enabled` | `index.js:41` | `useLoginByCellphone` |
| `opt_email_enabled`, `otp_cellphone_enabled`, `whatsapp_otp_login_enabled` | `index.js:42-44` | `useLoginOtpEmail`, `useLoginOtpCellphone`, `useLoginOtpWhatsapp` (`useLoginOtp` = any of the three, `:50`) |
| `email_password_login_enabled` | `index.js:45-48` | `useLoginByEmail`: if any phone/OTP way is on, the e-mail login exists only when this config is `'1'`; with none of them it is always true |
| first tab | `index.js:53`, `:229-230` | `email` if e-mail login, else `cellphone` if phone login, else `otp`. `otpType` starts `cellphone` only when OTP e-mail is off and OTP phone on (`:55`) |
| tabs shown | `LoginForm/index.tsx:475` `(Number(useLoginByEmail) + Number(useLoginOtpEmail)) && (...)`; the tab list is **static** `[Email, OTP Email]` (`:111-117`) | defects: (a) when both are false (phone-only project) the expression is `0` and React Native renders a bare `0` (the same defect the driver fixed, decisions "Access" 2026-11-18); (b) the "OTP Email" tab shows even when `opt_email_enabled` is off; (c) there is no Phone tab and no OTP-phone/WhatsApp entry: the OTP tab always calls `handleChangeOtpType('email')` (`:489`, `:240-243`), so phone password login is reachable only when e-mail login is off (default tab `cellphone`), and phone OTP / WhatsApp are unreachable (the code for them, `:551-564`, `:197`, is dead) |
| reCAPTCHA on | `index.js:225-227`: `props.isRecaptchaEnable` (the UI wrapper passes `true`, `LoginForm/index.tsx:748`) and `configs.security_recaptcha_auth === '1'` | `enableReCaptcha` |
| reCAPTCHA version | `LoginForm/index.tsx:136-157` | v3 if `security_recaptcha_type === 'v3'` and `security_recaptcha_score_v3 > 0` and `security_recaptcha_site_key_v3`; else v2 if `security_recaptcha_site_key`; base url from `security_recaptcha_base_url`. v3: `@fatnlazycat/react-native-recaptcha-v3` (invisible WebView, `:625-631`); v2: tappable checkbox row + `react-native-recaptcha-that-works` modal (`:634-661`). No site key / base url: toast `NO_RECAPTCHA_SITE_KEY` / `NO_RECAPTCHA_BASE_URL` (`:118-129`). Server answer `ERROR_AUTH_VERIFICATION_CODE` flips to v2 and toasts `TRY_AGAIN` (`:284-293`) |
| reCAPTCHA required client-side | `index.js:114-128` | without a token the controller fails with `RECAPTCHA_VALIDATION_IS_REQUIRED` **also on the OTP code verification**, although api-core skips reCAPTCHA for OTP logins (`api-core/app/Http/Controllers/UserController.php:321-329`: `$use_recaptcha && !$use_otp`). Submodule behavior; report, do not edit |
| Twilio "Get Verify Code" | `LoginForm/index.tsx:677-703` | only on the `cellphone` tab with `twilio_service_enabled` `'true'`/`'1'`; opens `VerifyPhone` after `OK` |
| Forgot password link | `:613-621` | `onNavigationRedirect && loginTab !== 'otp'` (no theme key today) |
| `use_root_point` | `src/config.json` (passed to `Home` by `src/pages/Home.tsx:28`; commented out in `Login.tsx:39`) | Home shows a project-name field and "Set project" instead of "Login" (`Home/index.tsx:143-203`); on submit: `setOrdering({project})`, `DeviceEventEmitter.emit('change_project', {setted, changed})` (the Root listens `RootNavigator.tsx:349-356`), `_setStoreData('project_name')` (`Home:77-86`), then navigates to Login (`:95-100`). `Login` then receives `projectChanged = true`, and its `handleSuccessLogin` persists the session and `RNRestart.restart()` (`Login.tsx:28-33`). `BusinessApp.tsx:115-130` reads the stored project at start. The login configs (tabs, OTP, reCAPTCHA) are those of the project, so the project must be set **before** the login form decides its methods |
| `show_tutorials` | `src/config.json` | read by nobody (see dead code) |
| `isBusinessApp`, `useDefualtSessionManager` | controller default `useDefualtSessionManager: true` (`index.js:557`) | the controller logs the user in itself; the page does nothing on success unless `projectChanged` |
| language list | `LanguageSelector` controller; hidden when `languages.length <= 1` (`LanguageSelector/index.tsx:57`) | today only in Profile (`UserProfileForm/index.tsx:606`); Home and Login have none (INDEX note on `01`) |

### 1.3 States of each screen

Login (`LoginForm/index.tsx`): empty; e-mail/phone/password fields (placeholder = label; field border `inputSignup`, `:420-438`); password hidden / visible (`:571-591`, MaterialCommunityIcons eye, 24, no touch area guaranteed); validation errors (react-hook-form v6, `errors`): **all are joined into one red toast** (`:328-359`, screenshot `03`), the fields are not marked; phone error from `PhoneInputNumber` also goes to the toast (`:223-226`, `:259`); server failure: toast with `result[0]` (`:295-300`; screenshot `13`: the server's message arrives in the project's language and cut); loading (`formState.loading || loading`, `:672`); tab Email / OTP Email; OTP e-mail "Get verify code" (`:668`) opens the code modal; reCAPTCHA v2 unchecked/checked, v3 invisible; phone + Twilio flow. Screenshots: `02`, `03`, `04`, `05`, `06`, `11`, `12`, `13`.

Code modal (`Otp/index.tsx`): countdown 600 s shown as `9:58` (`formatSeconds`, `:92`), six `@twotalltotems/react-native-otp-input` cells 45×60 (`:94-104`), auto-submits on the 6th digit (`onCodeFilled`, `:99`), "Resend code" greyed for the first 80 s (`disabled={otpLeftTime > 520}`, `:105`), pressing it opens an alert "The code has been sent" (`:32-38`), at zero an alert "Time is up" (`:41-48`), a wrong code opens a native `Alert.alert` (`:51-65`) and clears the cells, "Cancel" closes (`:110-117`). Screenshot `07` (title left-aligned unlike Login's centered one; Android clipboard toast).

Forgot (`ForgotPasswordForm/index.tsx`): empty; validation error as a toast (`:51-62`); server error toast; sent: success toast with the e-mail, button turns grey "Link Sent" and does nothing (`:140-165`); no resend. Screenshots `08`, `09`, `10` (the green toast splits the address in two lines). The controller never enables reCAPTCHA on Forgot (`isRecaptchaEnable` is not passed by the wrapper).

Home: photo `theme.images.backgroundsImages.login` + 0.4 black overlay, logo `logotypeInvert`, "Manage your business" + "Fast and easy" (`FAST_AND_EASY` is **not** in `i18n/translations.json`), button "Login" or, with `use_root_point`, field + "Set project" (`Home/index.tsx:102-211`). Screenshot `01`.

### 1.4 Actions and what they call

| Action | Calls |
|---|---|
| Login | `handleButtonLoginClick` = controller `handleLoginClick` -> `ordering.setAccessToken(null).users().auth(credentials, {headers})` (`index.js:162`) with `notification_app` / `notification_token` from `route.params.notification_state` when the push token exists (`:140-143`); then `login({user, token})` (`:189-193`), `events.emit('userLogin')`, `handleSuccessLogin` |
| Get verify code (OTP) | `generateOtpCode` -> `POST {root}/codes/generate {type: 4, channel: 1 (e-mail) / 2, size: 6}` (`index.js:357-400`); api-core rate-limits it per e-mail/IP/project (`CodeController.php:122-160`, defaults 20 per 60 s, penalties 60/120 s, error `ERROR_VERIFICATION_CODE_GENERATE_PLEASE_WAIT_RETRY`) |
| Verify code | `handleLoginOtp(code)` -> `handleButtonLoginClick({code})` -> auth with `{email, one_time_password}` |
| Forgot | `ordering.users().forgotPassword(values)` -> `POST /users/forgot`; **api-core always answers `OK`** (`UserController.php:3818-3838`), whether or not the account exists, and silently skips the e-mail when the account exceeded `forgot_password_rate_*` (`:3844-3861`) |
| Twilio verify | `POST {root}/auth/sms/twilio/verify`, then `POST {root}/auth/sms/twilio` |
| Set project (Home) | see 1.2 |
| Push permission | `RootNavigator.tsx:67`, `:209` (see 1.1) |

### 1.5 i18n keys used today

Login: `LOGIN`, `EMAIL`, `OTP_EMAIL`, `PASSWORD`, `FORGOT_YOUR_PASSWORD`, `GET_VERIFY_CODE` (two casings: "Get verify code" is only a fallback, the catalog has "Get Verify Code"), `OR`, `VERIFY_ReCAPTCHA` (not in the catalog), `NO_RECAPTCHA_SITE_KEY`, `NO_RECAPTCHA_BASE_URL`, `TRY_AGAIN`, `RECAPTCHA_VALIDATION_IS_REQUIRED`, `VALIDATION_ERROR_EMAIL_REQUIRED`, `INVALID_ERROR_EMAIL`, `VALIDATION_ERROR_PASSWORD_REQUIRED`, `VALIDATION_ERROR_MOBILE_PHONE_REQUIRED`, `INVALID_PHONE_NUMBER`, `ENTER_VERIFICATION_CODE`. Code: `CODE_SENT`, `TIME_IS_UP`, `PLEASE_RESEND_CODE`, `RESEND_CODE`, `CANCEL`, `ERROR`, `ACCEPT`. Forgot: `FORGOT_YOUR_PASSWORD`, `FORGOT_PASSWORD_TEXT_MESSAGE` (English has the typo "we'll sent", catalog and fallback), `EMAIL`, `VALIDATION_ERROR_EMAIL_REQUIRED`, `INVALID_ERROR_EMAIL`, `SUCCESS_SEND_FORGOT_PASSWORD`, `LINK_SEND_FORGOT_PASSWORD`, `FRONT_RECOVER_PASSWORD`. Home: `MANAGE_YOUR_BUSINESS`, `FAST_AND_EASY` (page prop, missing from catalog), `PROJECT_NAME`, `SET_PROJECT`, `VALIDATION_ERROR_PROJECT_NAME_REQUIRED`, `LOGIN`. Notification sheet: `ENABLE_NOTIFICATIONS`, `ACTIVE_NOTIFICATION_TO_RECEIVE_INFORMATION`. VerifyPhone/PhoneInput (unchanged from the driver original): `VERIFY_PHONE`, `MESSAGE_ENTER_VERIFY_CODE`, `ARE_YOU_NOT_SEEING_THE_CODE`, `SEND_AGAIN`, `INVALID_ERROR_PHONE_NUMBER`, `PHONE_NUMBER`.

### 1.6 Libraries that paint their own UI

| Library | Where | Paints |
|---|---|---|
| `@twotalltotems/react-native-otp-input` | `Otp/index.tsx` only | the code cells (45×60, own highlight) |
| `react-native-phone-number-input` + `react-native-country-picker-modal` | `PhoneInputNumber/index.tsx` (also used by `UserFormDetails`, the profile, and `SignupForm`) | the flag button and a country modal |
| `react-native-country-picker-modal` | `LanguageSelector/index.tsx`, `OrderDetails/Business.tsx` | a country-style modal used as the language list |
| `react-native-recaptcha-that-works` | `LoginForm/index.tsx` only | a modal with Google's v2 widget (Google's content: stays) |
| `@fatnlazycat/react-native-recaptcha-v3` (old `react-native-webview` ^11) | `LoginForm/index.tsx` only | invisible; a 40 px WebView frame |
| `react-native-app-intro-slider` | dead page | slides |
| `react-native-splash-screen` | `BusinessApp.tsx:3,142`, `Splash.tsx:3` | the native splash (driver replaced it with `react-native-bootsplash`) |
| native `Alert.alert` | `Otp/index.tsx:52` | the wrong-code dialog |
| `OToast` | all error and success messages of the three forms | toasts |

## 2. Target

### 2.0 What can be ported as is (diff against the original driver app, `driver-v26`)

| File | Diff business vs `driver-v26` | Port from `driver-theming` |
|---|---|---|
| `src/pages/Splash.tsx` | 0 lines | `driver-theming:src/pages/Splash.tsx` (32 lines: centered launch logo on `background`) + `src/theme/bundledImages.ts` + `docs/SPLASH.md` approach. Needs the `react-native-bootsplash` migration of the native worktree |
| `LoginForm/styles.tsx`, `Otp/styles.tsx`, `ForgotPasswordForm/{index,styles}.tsx`, `VerifyPhone/{index,styles}.tsx`, `PhoneInputNumber/{index,styles}.tsx` | 0 lines (identical templates) | the driver-theming rewrites apply with no merge work: `LoginForm/{index,AuthPieces}.tsx`, `LoginForm/Otp/index.tsx`, `ForgotPasswordForm/index.tsx`, `VerifyPhone/index.tsx`, `PhoneInputNumber/{index,calling,countries,CountryFlag,styles}`, `RecaptchaV3/{index,styles}` |
| `LoginForm/index.tsx` | 35 lines (the driver later fixed the alert content/`willVerifyOtpState &&`/`isAlertOpen`; business lacks them) | driver-theming's covers them |
| `LoginForm/Otp/index.tsx` | 39 lines (focus handling; the driver's current one replaced the third-party cells by `OOtpInput`) | driver-theming's |
| `src/pages/Login.tsx` | 19 lines: `allowedLevels` `[0, 2]` vs `[4]`; the driver adds `validateDeveloperMode` (drop) and `getProjectLoginSuccessPlan` | port `driver-theming:src/navigators/getProjectSwitchPlan.ts` (pure, with tests) and call it as the driver does; keep `[0, 2]`; delete `LoginPropsAreEqual` |
| `src/pages/ForgotPassword.tsx` | 4 lines | driver-theming's 10-line page (the form lays its own screen) |
| `src/pages/Home.tsx` | 9 lines (title key) | not ported (see 2.1: Home goes) |
| `Home/index.tsx` | 252 lines (the business is the old one, the driver's is rewritten) | rewritten, not ported |
| `IntroductoryTutorial.tsx` / `Signup.tsx` / `SignupForm` | 40 / 11 / 4 lines | dead: deleted |
| `RootNavigator.tsx` | 779 lines | not portable; only the signed-out stack lines change (see 2.1) |
| `config.json`, `theme.json` | differ by app | n/a |

Hard dependencies of the port (owned by other areas, must land first): `react-hook-form` **7** (driver `^7.91.0`; business is on `^6.15.1`: the driver files use `render={({ field })}` and `formState: { errors }`, the v6 API in today's files is incompatible), `src/theme/*` (`helpers.ts`, `sections.tsx`, `engine.ts`; the business has no `src/theme` yet), and the shared primitives: `OInput` (scope, label above, `hasError`), `OButton` (color/appearance/size/loading), `OLink`, `ONotice`, `FieldError`, `PasswordToggle`, `Tabs`, `OOtpInput`, `ChoiceMark`, `ODivider`, `OSelect`, `Icon`, `KeyboardScreen` (+ `src/hooks/useWindowTop`, `useKeyboardFloating`), `LoadingOverlay`, `ConfirmDialogHost` / `useNotice`, `OModal`, `FloatingButton` (inline pinned variant), `SafeAreaContainerLayout`, `ONavbar`, utils `apiErrorText`, `formatCountdown`, `getTraduction` (`driver-theming:src/ui/src/utils/{index,formats}`). Business already has `useCountdownTimer` (identical to the driver's).

### 2.1 Navigation change: Login is the first screen, Home goes

Mockup `Login.dc.html` has no back arrow and no photo: the signed-out stack starts at `Login`. `Home.tsx` + `Home/index.tsx` are rewritten or deleted according to question Q2 (a project step is needed only for `use_root_point` builds). `RootNavigator.tsx:367-388` (signed-out branch) becomes `Login` + `Forgot` (+ `Home` only for `use_root_point`, if Q2 recommended option is taken). This file is shared with other areas (push, session): the access agent edits **only** the signed-out branch and the notification-prompt hooks described in 2.4, and reports.

### 2.2 Login (`design/redesign/screens/Login.dc.html`, SPECS "Login")

Rewritten file: `src/ui/src/components/LoginForm/index.tsx` (+ `AuthPieces.tsx`, `Otp/index.tsx`); ported from `driver-theming:src/ui/src/components/LoginForm/index.tsx` and its `AuthPieces.tsx`, with these changes for the business app and for the mockup:

Component tree:

```
LoginForm (controller) -> LoginFormUI
  AuthScreen variant "root"              (port of AuthPieces.AuthScreen: SafeAreaContainerLayout > KeyboardScreen > bar > ScrollView)
    bar 56, content end-aligned, no title, no back arrow
      LanguageSelector variant "plain"   (globe 20 + current language name 14, 44 high; hidden when the project has one language)
    ScrollView, gutter 20, gap 20, centered column with max width on tablet
      [section logo]  OIcon themeImage('logotype') 180x44
      [section title] OText h1 24/700 "Manage your business" + OText body 14 muted subtitle
      ONotice(s)      server answer / verify-phone answer, until edited (port: useUntilEdited)
      Fields, gap 15
        OInput scope=auth_form  label above "Email", placeholder "name@store.com", hasError + FieldError
        OInput  "Password" + PasswordToggle (44 touch), hasError + FieldError
        OLink "Forgot your password?"  aligned END (driver: start), 44 touch   [visibility auth.forgot_password_link]
        reCAPTCHA row (RecaptchaCheckbox v2 / RecaptchaV3) when the project has it
      Actions, gap 15
        OButton solid primary size lg (50) "Log in"
        or-divider (ODivider, "Or", 12 muted)                                  only if there is a code button
        OButton outline neutral size lg "Email me a login code"                 only if useLoginOtpEmail
      [Twilio "Get Verify Code" block of today]                                  only phone-only projects (Q1)
    footer (not pinned: bottom of the scroll, centered 12 muted) "Version x.y"   [visibility auth.version]
  OModal (full screen) > VerifyPhone     (ported)
  OModal (full screen) > Otp             (see 2.3)
  app dialog (ConfirmDialogHost)         for check-phone-code errors (replaces OAlertOriginal)
```

What must change from the driver's login and for the business app:

- `allowedLevels` stays `[0, 2]` (`Login.tsx`); drop `validateDeveloperMode`; keep `notificationState`, `projectChanged`, `RNRestart`.
- The driver pins the main action in the bottom bar (`AuthAction`) on every auth screen; **the mockup puts "Log in" and "Forgot" buttons inline** (only the code screen has a pinned action bar). `AuthScreen` already takes an optional `footer`; Login and Forgot pass none and render their buttons in the scroll. The version text is the last element of the screen (`flex: 1` spacer then the text; on a short screen or with the keyboard it scrolls).
- Tabs: the mockup has none. The driver's `Tabs` strip is not used for e-mail and e-mail code (the code is the outline button). Phone ways: Q1.
- "Email me a login code" validates **only the e-mail field** (not the password), calls `props.handleChangeTab('otp')` + `setOtpType('email')` (what `handleChangeOtpType` does today, `LoginForm/index.tsx:240-243`), `generateOtpCode`, and opens the code screen; going back from the code screen puts the controller back on the `email` tab (`handleChangeTab('email')`), so the next password login is not sent as `one_time_password`. App-only wiring, no controller change (the controller already switches on `loginTab === 'otp'`, `index.js:94-98`).
- If the project has OTP e-mail but not e-mail/password (`useLoginByEmail` false, `useLoginOtpEmail` true, no phone): the form is the e-mail field and the primary button reads "Email me a login code" (no password, no "or").
- If no way is enabled (`methodsShown` false, as the driver) the screen shows only logo, title and an empty form: keep, as today.
- Today's bare `0` (`:475`) disappears with the tabs (`!!` coercion in the port).
- Errors: validation under each field (driver `FieldError`), server answer and reCAPTCHA retry in `ONotice` until edited; toasts of this area are removed. The mockup draws no error state: states derive from the driver's rules.
- The back arrow of the old Login bar is gone; the system/Android back exits the app (root screen).
- New: language button (needs a `plain` variant of the ported `LanguageSelector`; the driver has `pill`/`row`, `driver-theming:src/ui/src/components/LanguageSelector/index.tsx`; business `LanguageSelector` is byte-identical to the driver-v26 original, it uses `react-native-country-picker-modal`), logo from theme image, subtitle, placeholder example, version line (`react-native-device-info` `getVersion()`, already a dependency, used in `src/utils/sentry.ts:11`).

Shared primitives used: `AuthScreen`, `OInput` (scope `auth_form`), `FieldError`, `PasswordToggle`, `OLink`, `ONotice`, `OButton`, `ODivider`, `OIcon`, `OText`, `LanguageSelector`, `RecaptchaCheckbox`, `RecaptchaV3`, `OModal`, `PhoneInputNumber` (only for phone ways).

### 2.3 Login code (`LoginCode.dc.html`)

Rewritten file: `LoginForm/Otp/index.tsx`, ported from `driver-theming:LoginForm/Otp/index.tsx`, `shared/OOtpInput.tsx`, `LoginForm/AuthPieces.tsx` (`AuthTimer`, `AuthAction`). Still a full-screen `OModal` inside Login (the code state lives in `LoginFormUI`, as in the driver).

```
AuthScreen (title "Enter the code", back arrow -> setWillVerifyOtpState(false) and controller tab back to email; no Cancel)
  OText body "We sent a 6-digit code to" + OText 600 <the e-mail typed>
  OOtpInput length 6, cells 50x56 gap 10 radius 8, digits 20/700, focus border 2 primary   (the driver's `input.sizes.code` is already 56 high, 50 wide, gap sm, h2)
  FieldError center under the cells (wrong code: replaces the native Alert.alert of today)
  caption block, centered: "Code expires in 09:42" (12 muted, plain text: the driver's timer pill goes) ; OLink-button "Resend code in 0:38" disabled grey until 0:00, then "Resend code"
  footer (pinned, top line): AuthAction "Verify", disabled until 6 digits, loading while submitting
```

Differences from the driver's code screen: back arrow instead of Cancel-only; lead text with the destination; the countdown is a caption with a label and no pill (`components.timer` defaults change: no background, `body_sm`, muted; no new key); the resend control shows its own cooldown (today: 80 s, `otpLeftTime > 520`; api-core's real wait comes in the error `ERROR_VERIFICATION_CODE_GENERATE_PLEASE_WAIT_RETRY`, shown as the field notice); "Verify" is new (today the 6th digit submits at once: keep that too, Q5). The resend no longer opens the "The code has been sent" alert (`Otp/index.tsx:32-38`): the resent state is the caption restarting, plus a notice. The "Time is up" alert becomes the expired color of the caption plus the resend enabled.

### 2.4 Forgot password (`Forgot.dc.html`, "link sent" state)

Rewritten: `ForgotPasswordForm/index.tsx`, ported from `driver-theming:ForgotPasswordForm/index.tsx`.

```
AuthScreen (title "Forgot your password?", back arrow; no pinned footer)
  OText body muted lead (FORGOT_PASSWORD_TEXT_MESSAGE with the mockup's wording)
  OInput e-mail, label above, hasError + FieldError
  ONotice success "Link sent." (600) + " Check the inbox of <email>."          (after the answer)
  OButton solid lg: "Recover Password" (not drawn in the mockup) -> after sending: disabled "Send again in 0:45", then "Send again"
  OLink centered "Back to log in" (44 touch, 600) -> navigation.goBack()/navigate('Login')
```

Changes from the driver: no pinned bar (inline), the cooldown button and "Back to log in" are new. The cooldown is app-only: api-core answers `OK` to every request and applies its limit silently (`UserController.php:3818-3861`), so the client counter is the only feedback; pick 45 s (the mockup) as a constant.

### 2.5 Notifications permission (`NotificationsPermission.dc.html`)

Component: rewrite `src/ui/src/components/NotificationSetting/index.tsx` (it is already the explainer sheet, mounted on the orders list through `checkNotification`; `OBottomPopup` ported from the driver, whose mapping table says "`OBottomPopup` (2: notifications, chat) -> `sheet`"). Tree: scrim, `sheet` (radius 15 top, handle 40x4, padding 10/20/20, gap 15), tile 44 radius 8 tinted primary with bell 20, title 18/600 "Turn on order alerts", body 14 muted, `OButton` solid lg "Turn on notifications", `OButton` ghost neutral md (44) "Not now".

Logic (app-only, see section 3): state from `checkNotifications()`: `granted`/`unavailable` -> nothing; `denied` (not asked yet, or asked once on Android) -> the sheet; primary button runs the ask that today runs at login (`requestNotifications(['alert','sound','badge'])` for FCM, `OneSignal.promptForPushNotificationsWithUserResponse` for OneSignal); `blocked` -> same sheet, primary button opens settings (today's `NotificationSetting` behavior, text `ENABLE_NOTIFICATIONS`). "Not now" stores the time and closes. This requires editing `RootNavigator.tsx:67` and `:209` so the system dialog is no longer raised at login (they must be deferred behind the sheet). `RootNavigator` is shared: report to the coordinator; the pure part (decision from status + stored time) goes in a new `src/navigators/notificationPromptPlan.ts` with tests, like the driver's `*Plan.ts` files.

Precedent in the driver: `DriverLocationDialog` (explainer before the location permission, `driver-theming:src/ui/src/components/DriverLocationDialog`, hook `useDriverLocationTracking`).

### 2.6 Splash

`src/pages/Splash.tsx` replaced by the driver's 32-line version; the native splash by bootsplash (`docs/SPLASH.md`: native worktree). Today's page does frame arithmetic per platform around `theme.images.general.loadingSplash` and hides the native splash on image load (`Splash.tsx:33-89`, test `src/pages/__tests__/Splash.test.tsx` 94 lines). Branding mismatch seen in `00-splash-ordering-carga` (splash says "Ordering", Home "OrderingPlus").

### 2.7 Home (only if `use_root_point` stays, Q2)

Rewrite `Home/index.tsx` as a light "project" screen in the Login mockup's language (same bar with language button, logo, title, project `OInput` + `FieldError`, primary "Set project"); no photo, no overlay, no `home_hero`. Keep `onSubmit` (`setOrdering`, `DeviceEventEmitter.emit('change_project')`, `_setStoreData('project_name')`) and the "navigate when `ordering.project` equals the typed one" effect unchanged. Ported structure from `driver-theming:Home/index.tsx` minus the hero.

## 3. Behaviour kept / changed

| Behaviour | Today | Target | Class / evidence |
|---|---|---|---|
| Login by e-mail + password, `allowedLevels [0, 2]`, session persisted by controller, `projectChanged` restart | `Login.tsx:23-40`, `index.js:61-73,170-197` | kept | works today |
| Login methods decided by configs (`phone_password_login_enabled`, `opt_email_enabled`, `otp_cellphone_enabled`, `whatsapp_otp_login_enabled`, `email_password_login_enabled`) | `index.js:41-55` | kept (no theme switch for them) | works today |
| OTP e-mail login | tab + "Get verify code" | outline button "Email me a login code" under the form | works today (the controller flow is unchanged); wiring of the tab switch is app-only (2.2) |
| OTP tab shown although `opt_email_enabled` is off | `LoginForm/index.tsx:111-117` | the code button shows only when `useLoginOtpEmail` | changes a defect |
| Bare `0` when e-mail login and OTP e-mail are both off | `:475` | gone | defect fixed |
| Phone password login | only when e-mail login is off | Q1 | open |
| Phone OTP / WhatsApp | unreachable | Q1 | open; backend supports them (`CodeController.php:69-76,101-114`, channel 2/3/4) |
| Twilio verify flow (`twilio_service_enabled`) | `:677-717` | kept as a ported full-screen page | works today |
| reCAPTCHA v2/v3 rules and the `ERROR_AUTH_VERIFICATION_CODE` fallback | `:136-157,282-306` | kept | works today; the OTP+reCAPTCHA client-side requirement stays a submodule matter |
| Login without the intermediate Home screen | Home first | Login first | app-only new logic: signed-out branch of `RootNavigator.tsx:367-388`; `use_root_point` consequence in Q2 |
| Language selector on Login | none | globe button, opens the app's language sheet | works today (the `LanguageSelector` controller already reads the project's languages and changes the language, used in Profile); only the trigger look is new |
| Errors under their fields | one joined toast (`:328-359`) | under each field; server answer in a notice until edited | works today for validation (react-hook-form already produces per-field `errors`); server answers have no field (list of messages, `result[0]`) so they stay a notice |
| Wrong-code error | native `Alert.alert` | under the cells | app-only new logic |
| Code screen with "Verify" | 6th digit submits | "Verify" pinned + 6th digit still submits (Q5) | app-only; the endpoint is the same |
| "Resend code in 0:38" and "Code expires in 09:42" | greyed 80 s, 600 s dial | labelled captions | works today (same two timers); copy and format are new. The server enforces its own wait (`ERROR_VERIFICATION_CODE_GENERATE_PLEASE_WAIT_RETRY`) |
| Back arrow on the code screen | "Cancel" button | arrow | app-only |
| Forgot: "Send again in 0:45", "Back to log in", success notice | grey "Link Sent", toast | as drawn | app-only new logic (the counter); needs no backend: `forgot` is rate-limited by the server per account and silently (`UserController.php:3844-3861`); the notice cannot tell the user the server skipped the mail |
| Notifications explainer before the system dialog | system dialog at login | sheet first, system dialog on its button | app-only new logic (`checkNotifications`, a stored "asked" time, deferring `RootNavigator.tsx:67,209`); no backend. Blocked-state behavior exists today (`NotificationSetting`) |
| "Version 1.0" line | none on Login | real `getVersion()` | works today (`DeviceInfo` already used) |
| Tutorial, Sign up | unreachable | deleted | dead code (1.1) |
| Splash | frame-by-frame `Splash.tsx` | driver's centered logo | needs the bootsplash migration (native worktree) |
| Toasts for form errors (`useToast`) | all three forms | none in this area | changes; `OToast` stays for other areas |

## 4. Proposed theme pieces

Product schema `product.schema.json` of the business app, same family as the driver's (read `driver-theming:product.schema.json`: `components.auth_form` = `{scope: {input, field, timer}, slots: {submit, cancel, method_tabs, resend}}`, `components.field.base`, `components.timer.base`, `components.input.sizes.code` already 50 × 56, gap `sm`, text `h2`, which is the mockup's code cell).

**Pages and sections.** Replace the driver's `home` page (`logo`, `title`, `login_account`) by a page `login` in editor group `access`: sections `logo` (hideable), `title` (hideable: title and subtitle), `form` (fixed). Forgot, code screens, phone verification, notification sheet and Splash have no sections of their own. No `onboarding` page (the tutorial is dead: drop `pages.onboarding`, `images.onboarding.slide_1..5`, `components.tutorial`, `visibility.onboarding.skip`).

**Visibility keys** (boolean, default true):

| Key | Hides | Name source |
|---|---|---|
| `auth.forgot_password_link` | the "Forgot your password?" link | same as driver and marketplace (`M`) |
| `auth.version` | the version line | new (business); the driver has no such line |

Not keys: the language button (hidden by the server's language list), the code button (`opt_email_enabled`), reCAPTCHA (`security_recaptcha_*`), the Twilio block, the notification sheet (behavior, decided by permission state).

**Images.** `logotype` (marketplace/driver name; 600 × 150, 4:1, alpha) paints the Login logo; bundled source for the business app is `src/assets/images/logotype.png` (dark logo for a white screen), **not** `logotype-invert.png` (the white logo the old Home used over the photo; the driver maps `logotype` to the invert file because its hero is dark). `home_hero` (`backgroundsImages.login`, `background.png` 754 KB) is dropped unless Q2 keeps a photo screen. No welcome background in the new design.

**Component keys beyond the driver's `product.schema.json`:**

| Key | Why |
|---|---|
| `components.auth_form.base.max_width` (default 480) | tablet: the column's width on Login, Forgot, code screens |
| `components.auth_form.slots.secondary` (button outline, neutral, `lg`) | "Email me a login code" |
| `components.auth_form.slots.language` (ghost, neutral, `md`) | the language button of the bar (or a `plain` variant of the language selector in code) |
| `components.timer.base` defaults only: no background, no radius, `body_sm`, muted, `expired_color` danger | the caption "Code expires in …" (the driver draws a pill). No new key |
| `components.sheet.base` icon tile (`icon_box_size` 44, `icon_size` 20, tinted primary background / primary text) | the bell tile of the notification sheet; shared with the NewOrderAlert sheet (bell tile 44 in `NewOrderAlert.dc.html`): coordinate with the area that owns it. The driver's `new_order_alert.base.icon_box_size/icon_size` is the precedent |
| `components.home_hero`, `images.home_hero` | dropped (Q2) |

Pieces that need no key: header 56, button sizes 44/50, radius 8 on inputs/buttons, the "or" divider (`ODivider`), the notice (`ONotice` success: `#D6FFF7` / `#00713F`, radius 10, padding 10/15 in the mockup = the driver's `alert` component).

## 5. New i18n keys

Reuse where the English matches; mockup texts are English samples. New keys (English fallback):

| Key | English |
|---|---|
| `LOGIN_TO_MANAGE_YOUR_ORDERS` | Log in to receive and manage your orders. |
| `EMAIL_PLACEHOLDER` | name@store.com |
| `EMAIL_ME_A_LOGIN_CODE` | Email me a login code |
| `ENTER_THE_CODE` | Enter the code |
| `LOGIN_CODE_SENT_TO` | We sent a 6-digit code to |
| `CODE_EXPIRES_IN` | Code expires in |
| `RESEND_CODE_IN` | Resend code in |
| `VERIFY` | Verify |
| `FORGOT_LINK_SENT` | Link sent. |
| `FORGOT_CHECK_INBOX` | Check the inbox of |
| `SEND_AGAIN_IN` | Send again in |
| `BACK_TO_LOGIN` | Back to log in |
| `APP_VERSION` | Version |
| `TURN_ON_ORDER_ALERTS` | Turn on order alerts |
| `NOTIFICATIONS_PROMPT_TEXT` | Without notifications you won't hear new orders when the app is closed. |
| `TURN_ON_NOTIFICATIONS` | Turn on notifications |
| `NOT_NOW` | Not now |
| `LANGUAGE` | Language (exists in the driver catalog, missing here) |
| `SHOW_PASSWORD` / `HIDE_PASSWORD` | Show password / Hide password (screen reader; exist in the driver catalog) |
| `SELECT_COUNTRY` | Select country (exists in the driver catalog; only with phone ways) |

Existing keys reused: `LOGIN` (catalog "Login"; the mockup button says "Log in": keep the key, owner may want a copy change), `MANAGE_YOUR_BUSINESS`, `EMAIL`, `PASSWORD`, `FORGOT_YOUR_PASSWORD`, `OR` (catalog "Or"; mockup lowercase "or"), `RESEND_CODE`, `FRONT_RECOVER_PASSWORD`, `SEND_AGAIN`, `GO_BACK`, `CLOSE`, `ERROR`, `ACCEPT`, `CANCEL`, `TRY_AGAIN`, `ENABLE_NOTIFICATIONS` and `ACTIVE_NOTIFICATION_TO_RECEIVE_INFORMATION` (blocked state of the sheet), validation keys, `PROJECT_NAME`, `SET_PROJECT`.
Changed text: `FORGOT_PASSWORD_TEXT_MESSAGE` English becomes "Enter your email and we'll send you a link to reset your password." (the catalog and fallback carry the typo "sent", seen in screenshot `08`; the driver already has "send"). `VERIFY_ReCAPTCHA` is missing from the catalog (used with fallback). Removed (dead): `FAST_AND_EASY` (never in the catalog), `RECIEVE_ORDERS*`, `ORDER_DETAILS_INST`, `ASSIGN_DRIVER_INST`, `FOLLOW_UP_INST`, `TITLE_SIGN_UP`-style Signup keys, `OTP_EMAIL` (only if Q1 drops the tab text). Add `OTP_PHONE`, `SEND_BY_SMS`, `SEND_BY_WHATSAPP`, `PHONE` only if Q1 picks the driver's phone ways.

## 6. Tablet

The mockups have no access screen on a tablet; proposal: the bar spans the full width, the content is one column of `auth_form.base.max_width` (480), centered horizontally and kept in the upper part (not vertically centered, so the keyboard does not move it); the code cells keep 50 × 56; the sheet (notification) is a centered sheet of the same width, not full-width. Splash: centered logo as the driver. Portrait and landscape use the same column.

Today: `Login`, `ForgotPassword` and `Signup` wrap the form in `Container` (`src/ui/src/layouts/Container.tsx`: a `ScrollView` with padding `20` and an orientation listener, no max width), so on a tablet the inputs, buttons and tabs stretch to the full width (up to ~1180 pt in landscape). `Home` is a full-bleed `ImageBackground` with `padding-horizontal: 40` (`Home/styles.tsx:23`) and the form stretched likewise. `Otp` cells are fixed 45×60 inside a full-width `OTPInputView` (`width: '100%'`). iOS allows landscape (`Info.plist` `UISupportedInterfaceOrientations`); Android handles `orientation|screenSize` changes itself (`AndroidManifest.xml:34`). `DeviceInfo.isTablet()` is used in `MyOrders.tsx:28` and `PreviousOrders/OrderItem.tsx:54`, not in these screens.

## 7. Open questions for the owner

| # | Question | Options (recommended first) |
|---|---|---|
| Q1 | The mockup shows e-mail password plus e-mail code only. Phone password, phone code (SMS) and WhatsApp code (the driver added them on 2026-11-19, "Phone login") | (a) **Keep today's reach**: mockup as drawn; phone password only when e-mail login is off (as today, same form with the phone field), Twilio verify kept; phone code and WhatsApp stay out (unreachable today) · (b) port the driver's way tabs (Email, Phone, OTP Email, OTP Phone, "Send by WhatsApp") and use the outline button only on the e-mail tab · (c) drop phone ways altogether |
| Q2 | `use_root_point` builds need a project step and the mockup has no Home. The login methods are the project's, so the project must be known before the form is drawn | (a) **Keep a light first screen only when `use_root_point` is true** (project field, "Set project", same look as Login, no photo); other builds start at Login · (b) a project field at the top of Login, applied on "Log in" (the form's methods would be those of the previous project until then) · (c) drop `use_root_point` from this app |
| Q3 | Delete the dead tutorial, Sign up, `SignupForm`, their tests, assets (`slide1-4.png`, 7.5 MB), `react-native-app-intro-slider` and its type file, `theme.images.tutorials`, the `show_tutorials` flag | (a) **delete all** · (b) keep Sign up only (it needs a design: none exists) · (c) wire the tutorial (needs a design: none exists) |
| Q4 | When the notification sheet shows | (a) **after the first sign-in, when permission is `denied`/never asked, once per install; "Not now" re-offers it after 7 days; `blocked` shows it with an "open settings" button, as `NotificationSetting` does today** · (b) every time the orders tab opens while not granted · (c) only from Profile "Alerts and sound" |
| Q5 | The code screen: the 6th digit submits today; the mockup adds "Verify" | (a) **both: the 6th digit submits, "Verify" is the manual submit and the retry after an error** · (b) only "Verify" |
| Q6 | Exact copy: button "Log in" (mockup) vs key `LOGIN` "Login"; "or" lowercase vs "Or" | (a) **reuse `LOGIN` and `OR` as they are (catalog English)** · (b) add `LOG_IN` and `OR_LOWER` keys (12 locale rows each) |
| Q7 | Logo asset: the mockup draws a `[YOUR LOGO]` placeholder | (a) **theme image `logotype` over `logotype.png`** · (b) a project-uploaded logo only (empty if none) |
| Q8 | Forgot: the cooldown | (a) **45 s constant in the app** · (b) read the server's `forgot_password_rate_*` (not exposed to clients today: would need backend) |

## 8. Work breakdown

Files an implementation agent for area 2 would own (after the foundation area has ported `src/theme`, the shared primitives and react-hook-form 7):

- Rewrite/port: `src/ui/src/components/LoginForm/index.tsx`, `LoginForm/AuthPieces.tsx` (new), `LoginForm/Otp/index.tsx`, `LoginForm/styles.tsx` (deleted: styles move to the pieces), `ForgotPasswordForm/index.tsx`, `VerifyPhone/index.tsx`, `PhoneInputNumber/{index,calling,countries,CountryFlag,styles}` (shared with `UserFormDetails`, the profile area's form: coordinate), new `RecaptchaV3/{index,styles}` (replaces `@fatnlazycat/react-native-recaptcha-v3`; needs `react-native-webview` current), `NotificationSetting/index.tsx` (the sheet), `LanguageSelector/index.tsx` (add the `plain` variant; profile area owns the row variant), `Home/index.tsx` (+`styles.tsx`) per Q2.
- Pages: `src/pages/Login.tsx`, `ForgotPassword.tsx`, `Splash.tsx`, `Home.tsx` (per Q2); delete `IntroductoryTutorial.tsx`, `Signup.tsx`.
- Delete (Q3): `SignupForm/`, `IntroductoryTutorial` page, its test, `Signup` test, `slide1-4.png`, `src/types/react-native-app-intro-slider`, the type entries `SignupParams` (both `types/index.tsx` files), the `@ui` export of `SignupForm`.
- New pure files: `src/navigators/getProjectSwitchPlan.ts` (ported with its test), `src/navigators/notificationPromptPlan.ts` (new) and its test.
- Shared, **report to the coordinator, not owned**: `src/navigators/RootNavigator.tsx` (signed-out branch `:367-388`, ask at `:67` and `:209`), `src/BusinessApp.tsx` (splash hide `:142`, images `:101-106`, `logos`/`backgroundsImages`), `src/theme.json`, `jest/helpers/b2AuthUiMock.js` and `b2AuthDefaults.js` (used by auth, `UserProfileForm`, `UserFormDetails`, `Sessions` tests too), `package.json`, i18n catalog.

Tests of the area today (all to be rewritten or deleted):

| Test | Lines | Fate |
|---|---|---|
| `src/pages/__tests__/Home.test.tsx` | 23 | rewrite (Q2) or delete |
| `src/pages/__tests__/Login.test.tsx` | 51 | rewrite (port driver's; keep `[0, 2]`) |
| `src/pages/__tests__/ForgotPassword.test.tsx` | 22 | rewrite |
| `src/pages/__tests__/Splash.test.tsx` | 94 | rewrite (driver's) |
| `src/pages/__tests__/IntroductoryTutorial.test.tsx`, `Signup.test.tsx` | 35, 51 | delete (Q3) |
| `src/ui/src/components/Home/__tests__/Home.test.tsx` | 82 | rewrite or delete |
| `src/ui/src/components/LoginForm/__tests__/LoginForm.test.tsx` | 220 (18 cases: email controls, forgot redirect, cellphone, OTP label and tab, reCAPTCHA v2/v3, Twilio button, password toggle, verify-phone error/modal, check-code error, `ERROR_AUTH_VERIFICATION_CODE`) | rewrite from `driver-theming:LoginForm/__tests__/{LoginForm,AuthScreen}.test.tsx`; add the code-button and tablet width cases |
| `src/ui/src/components/LoginForm/Otp/__tests__/Otp.test.tsx` | 104 | rewrite from the driver's |
| `src/ui/src/components/ForgotPasswordForm/__tests__/ForgotPasswordForm.test.tsx` | 90 | rewrite (cooldown, notice, back link) |
| `src/ui/src/components/VerifyPhone/__tests__/VerifyPhone.test.tsx` | 77 | rewrite from the driver's |
| `src/ui/src/components/PhoneInputNumber/__tests__/PhoneInputNumber.test.tsx` | 75 | replace by the driver's three (`PhoneInputNumber`, `calling`, `countries`) |
| `src/ui/src/components/SignupForm/__tests__/SignupForm.test.tsx` | 125 | delete (Q3) |
| `src/ui/src/components/NotificationSetting/__tests__/NotificationSetting.test.tsx` | not read | rewrite for the new sheet |
| new | — | `RecaptchaV3.test.tsx`, `getProjectSwitchPlan.test.ts`, `notificationPromptPlan.test.ts` |
| `jest/helpers/b2AuthUiMock.js` (62 lines), `b2AuthDefaults.js` (137) | — | update (shared with profile/sessions tests) |

Also `src/navigators/__tests__/RootNavigator.oneSignal.test.ts` and `getOneSignalSetupPlan.test.ts` / `getFirebasePushSetupPlan.test.ts` will change when the ask is deferred (owned by whoever owns push).

## 9. What I did not see / did not verify

- Nothing was run: no typecheck, lint, test, simulator or device. Every "works today" line comes from reading code and api-core, not from running it.
- Screenshots: I opened `INDEX.md` and viewed only `01`, `04`, `07`, `14`; the rest of `00`-`14` I used through the index text. I did not look at the mockups rendered (read the HTML text and SPECS only), so spacing statements come from inline styles.
- I did not verify that the driver-theming files compile or pass in the business repo; the business app has no `src/theme`, no react-hook-form 7, no ported primitives yet. I only compared files with `diff` against `driver-v26`.
- Not verified on devices: what `checkNotifications()` returns before the first ask on iOS and on Android 13+ (I rely on the library's documented behavior and on `NotificationSetting` testing for `blocked`), and the OneSignal 4.5.2 prompt behavior when `promptForPushNotificationsWithUserResponse` is not called at login.
- I did not read the whole `IntroductoryTutorial`, `SignupForm`, `VerifyPhone` (business), `PhoneInputNumber` (business, first 30 lines), the test bodies (only names of `LoginForm` and `Otp`), `jest/helpers/*`, `NotificationSetting.test.tsx`, or the Builder's strings for the native splash.
- The api-core statements are read from `UserController.php` / `CodeController.php` / `Config.php` of the local checkout (`/Users/work/Ordering/api-core`), not from a running server; the "login methods" configs are the key names the controller reads, not the values of any project.
- Whether `OBottomPopup`, `OModal`, `FloatingButton` of the driver already match the mockup's sheet and bars (handle, radius 15, padding) was not checked beyond the driver's `components.md` mapping rows.
- Business `LanguageSelector` was compared to the driver-v26 original (identical) but not to driver-theming's file beyond its first 80 lines.
