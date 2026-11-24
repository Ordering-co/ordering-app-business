import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, ScrollView, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import DeviceInfo from 'react-native-device-info'

import { ProfileRow } from './ProfileRow'
import { ProfilePhotoSheet } from './ProfilePhotoSheet'
import { ProfileSkeleton } from './ProfileSkeleton'
import { RemoveAccountModal } from './RemoveAccountModal'
import { RowsCard } from './RowsCard'
import { useProfilePhoto } from './useProfilePhoto'
import { getRemoveAccountSessionPlan } from './getRemoveAccountSessionPlan'
import { profileStyles } from './styles'
import { PRINTERS_ROUTE, PROFILE_EDIT_ROUTE, PROFILE_PASSWORD_ROUTE, NOTIFICATIONS_ROUTE, ORDERS_DISPLAY_ROUTE, SESSIONS_ROUTE } from './routes'
import { SessionsCount, sessionsSummary } from './SessionsCount'
import { _clearStoreData, _retrieveStoreData } from '../../providers/StoreUtil'
import { accountFieldList } from '../UserFormDetails/accountFields'
import { offeredAlertSounds, useAlertSettings } from '../AlertSettings'
import { LanguageSelector } from '../LanguageSelector'
import { LogoutButton } from '../LogoutButton'
import { Icon, OAvatar, OButton, OLink, ONavbar, OSpinner, OText, SectionTitle } from '../shared'
import { themePart, themeVisible } from '@/theme/helpers'
import { usePageSections } from '@/theme/sections'
import settings from '@/config.json'

import { ToastType, UserFormDetails as UserFormDetailsController, useLanguage, useSession, useToast } from '@components'

/** The roles of the business app's users, by level (the chat names them the same way). */
const ROLES: Record<number, [string, string]> = {
  0: ['ADMINISTRATOR', 'Administrator'],
  2: ['BUSINESS_OWNER', 'Business owner'],
  5: ['DRIVER_MANAGER', 'Driver manager']
}

/** What the Password row shows in the list: a mask that says nothing of the real one. */
const PASSWORD_MASK = '••••••••'

/** The help page the project's app config points to; empty when it has none (the Help center row is then not drawn). */
const helpUrl = (): string => {
  const url = (settings as { help_url?: unknown }).help_url
  return typeof url === 'string' ? url.trim() : ''
}

/** A row of the information card: a field of the user, written as the user has it. */
type InfoRow = { key: string, title: string, value: string }

interface Props {
  navigation: any
  /** Changes each time the tab is focused again: the rows that read the device (printers, sessions) read it again. */
  focusCount?: number
  // The user form's controller (`UserFormDetails`) hands the rest: the photo's save, the fields and the removal.
  formState?: any
  validationFields?: any
  showField?: (code: string) => boolean
  handleButtonUpdateClick?: (changes: any, isImage?: boolean, image?: string) => void
  handleRemovePhoto?: () => void
  handleRemoveAccount?: (id: number) => Promise<unknown>
}

/**
 * The profile tab, the driver's way (decision of 2026-11-23): who the user is (the photo, which opens the photo sheet,
 * the name with the role of their level, the e-mail and the phone), the personal information as read-only rows with
 * Edit and the Password row, the account's rows (sessions, printers, alerts and sound, orders display, language),
 * support (help center, version), log out and, quiet and last, remove account. Each block is a section of the theme's
 * `profile` page (order, hidden) and each row keeps its condition (a theme visibility key, the server's session
 * strategy, the project's languages, the app config's help page). The photo is the one thing this page saves; every
 * other change has its own screen.
 */
const ProfileUI = (props: Props) => {
  const { navigation, focusCount = 0, formState, validationFields, showField, handleButtonUpdateClick, handleRemovePhoto, handleRemoveAccount } = props
  const [{ user, sessionLoading }, { logout }] = useSession()
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const theme: any = useTheme()
  const styles = useMemo(() => profileStyles(theme), [theme])
  const { render, isVisible } = usePageSections('profile')
  const alerts = useAlertSettings()

  const [sessionCount, setSessionCount] = useState<number | null>(null)
  const [printers, setPrinters] = useState<any[]>([])
  const [openPhotoSheet, setOpenPhotoSheet] = useState(false)
  const [openRemoveAccount, setOpenRemoveAccount] = useState(false)
  // The language row reports late whether the project has more than one language.
  const [languageShown, setLanguageShown] = useState(false)

  useEffect(() => {
    let active = true
    _retrieveStoreData('printers').then((stored: any) => {
      if (active) setPrinters(Array.isArray(stored) ? stored : [])
    })
    return () => { active = false }
  }, [focusCount])

  const { takePhoto, chooseFromGallery } = useProfilePhoto({
    onPicked: (url) => handleButtonUpdateClick?.(null, true, url),
    onDone: () => setOpenPhotoSheet(false)
  })

  // The photo is the only thing this page saves: its answer is the toast.
  useEffect(() => {
    if (formState?.result?.result && !formState?.loading) {
      if (formState.result.error) {
        const message = Array.isArray(formState.result.result) ? formState.result.result[0] : formState.result.result
        showToast(ToastType.Error, String(message))
      } else {
        showToast(ToastType.Success, t('UPDATE_SUCCESSFULLY', 'Update successfully'))
      }
    }
  }, [formState?.result])

  const go = useCallback((route: string) => () => navigation.navigate(route), [navigation])

  const photo = themePart(theme, 'profile_photo', 'base')
  const cameraSlot = themePart(theme, 'profile_photo', 'slots.edit')
  // The profile's section titles are small (`account_page.title`); the other screens' keep `section_header`'s.
  const sectionTitle = themePart(theme, 'account_page', 'base.title')
  const isUploading = !!formState?.loading
  const isAdmin = user?.level === 0
  const fullName = [user?.name, user?.lastname].filter(Boolean).join(' ')
  const [roleKey, roleFallback] = ROLES[user?.level] ?? []
  const role = roleKey ? t(roleKey, roleFallback) : ''
  const phoneToShow = user?.cellphone
    ? (user?.country_phone_code ? `(+${user.country_phone_code}) ${user.cellphone}` : `${user.cellphone}`)
    : ''

  // The fields of the personal information, as the edit screen has them (the account's own are always there), and the phone.
  const infoRows: InfoRow[] = [
    ...accountFieldList(validationFields, t, showField).map((field: any) => ({
      key: field.code,
      title: t(field.code.toUpperCase(), field?.name),
      value: `${user?.[field.code] ?? ''}`
    })),
    { key: 'cellphone', title: t('PHONE', 'Phone'), value: phoneToShow || t('NOT_PHONE', 'Not Phone') }
  ]

  const printersSummary = (() => {
    const names = printers.map((printer: any) => printer?.nickname || printer?.model).filter(Boolean)
    if (names.length === 0) return undefined
    return names.length === 1
      ? names[0]
      : t('PRINTER_AND_MORE', '_name_ and _count_ more').replace('_name_', names[0]).replace('_count_', `${names.length - 1}`)
  })()

  const alertsSummary = alerts.ringUntilOpened
    ? t('RING_UNTIL_OPENED', 'Ring until opened')
    : (() => {
      // The sound is named only when the picker exists (more than one bundled sound): the three are.
      const sounds = offeredAlertSounds()
      const sound = sounds.length > 1 ? sounds.find((item) => item.id === alerts.sound) : undefined
      return sound ? t(sound.labelKey, sound.fallback) : undefined
    })()


  const url = helpUrl()
  const jwtSessions = user?.session_strategy === 'jwt_session'
  const showPassword = themeVisible(theme, 'profile.password')
  const showSessions = themeVisible(theme, 'menu.sessions')
  const showPrinters = themeVisible(theme, 'menu.printers')
  const showNotifications = themeVisible(theme, 'menu.notifications')
  const showOrdersDisplay = themeVisible(theme, 'menu.orders_display')
  const showLanguage = themeVisible(theme, 'menu.language')
  const showHelp = themeVisible(theme, 'menu.help') && !!url
  const showAbout = themeVisible(theme, 'menu.about')

  // The photo is a touch target of its own, and the camera button on its corner opens the same sheet.
  const renderPhoto = () => (
    <View style={styles.identity}>
      <View style={styles.photoFrame}>
        <Pressable
          testID='profile-photo'
          accessibilityRole='imagebutton'
          accessibilityLabel={t('CHANGE_PHOTO', 'Change photo')}
          disabled={isUploading}
          onPress={() => setOpenPhotoSheet(true)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <OAvatar
            testID='profile-photo-box'
            source={user?.photo ?? null}
            name={fullName || user?.email}
            size={photo.size}
            radius={photo.radius}
            iconSize={photo.placeholder_icon_size}
          />
        </Pressable>
        {isUploading && (
          <View style={styles.uploading} pointerEvents='none'>
            <OSpinner testID='profile-photo-loading' color='on_overlay' />
          </View>
        )}
        <View style={styles.camera}>
          <OButton
            iconOnly
            round={cameraSlot.shape === 'round'}
            size={cameraSlot.size}
            color={cameraSlot.color}
            appearance={cameraSlot.appearance}
            testID='profile-photo-edit'
            accessibilityLabel={t('CHANGE_PHOTO', 'Change photo')}
            disabled={isUploading}
            icon={<Icon name='camera-outline' size='sm' />}
            onClick={() => setOpenPhotoSheet(true)}
          />
        </View>
      </View>
      <View style={styles.who}>
        {!!fullName && <OText style={styles.name} numberOfLines={1} testID='profile-name'>{fullName}</OText>}
        {!!role && <OText preset='body_sm' color='text_muted' numberOfLines={1} testID='profile-role'>{role}</OText>}
        {!!user?.email && <OText preset='body_sm' color='text_muted' numberOfLines={1} testID='profile-email'>{user.email}</OText>}
        {!!phoneToShow && <OText preset='body_sm' color='text_muted' numberOfLines={1} testID='profile-phone'>{phoneToShow}</OText>}
      </View>
    </View>
  )

  // The personal data, read-only, and the way to change it: Edit (the information's own screen) and the Password row
  // (its own screen too).
  const renderInformation = () => (
    <View testID='profile-information'>
      <View style={styles.titleRow}>
        <SectionTitle text={sectionTitle} style={styles.titleText}>{t('INFORMATION', 'Information')}</SectionTitle>
        <OLink testID='profile-edit' shorcut={t('EDIT', 'Edit')} onPress={go(PROFILE_EDIT_ROUTE)} />
      </View>
      <RowsCard>
        {infoRows.map((row) => (
          <ProfileRow key={row.key} testID={`profile-info-${row.key}`} information title={row.title} value={row.value} />
        ))}
        {showPassword && (
          <ProfileRow
            key='password'
            testID='profile-row-password'
            information
            title={t('PASSWORD', 'Password')}
            value={PASSWORD_MASK}
            onPress={go(PROFILE_PASSWORD_ROUTE)}
          />
        )}
      </RowsCard>
    </View>
  )

  const accountRows = [
    showSessions && { key: 'sessions', icon: 'phone-portrait-outline', title: t('SESSIONS', 'Sessions'), value: jwtSessions ? sessionsSummary(sessionCount, t) : undefined, onPress: go(SESSIONS_ROUTE) },
    showPrinters && { key: 'printers', icon: 'print-outline', title: t('PRINTERS', 'Printers'), value: printersSummary, onPress: go(PRINTERS_ROUTE) },
    showNotifications && { key: 'notifications', icon: 'notifications-outline', title: t('ALERTS_AND_SOUND', 'Alerts and sound'), value: alertsSummary, onPress: go(NOTIFICATIONS_ROUTE) },
    // No value at the row's end (the owner's choice, 2026-11-23): its two settings do not fit there whole; the screen says them.
    showOrdersDisplay && { key: 'orders-display', icon: 'options-outline', title: t('ORDERS_DISPLAY', 'Orders display'), onPress: go(ORDERS_DISPLAY_ROUTE) }
  ].filter(Boolean) as Array<{ key: string, icon: string, title: string, value?: string, onPress: () => void }>

  // The language is the last row of the account's card. It arrives late and a project may have only one language: the
  // card stays out of sight until it is known that there is a row in it.
  const renderAccount = () => {
    if (accountRows.length === 0 && !showLanguage) return null
    const nothingYet = accountRows.length === 0 && !languageShown
    return (
      <View style={nothingYet ? styles.none : undefined} testID='profile-account'>
        <SectionTitle text={sectionTitle} style={styles.titleAlone}>{t('ACCOUNT', 'Account')}</SectionTitle>
        <RowsCard trailing={showLanguage ? <LanguageSelector divided={accountRows.length > 0} onShownChange={setLanguageShown} /> : undefined}>
          {accountRows.map((row) => (
            <ProfileRow key={row.key} testID={`profile-row-${row.key}`} icon={row.icon} title={row.title} value={row.value} onPress={row.onPress} />
          ))}
        </RowsCard>
        {showSessions && jwtSessions && <SessionsCount key={focusCount} onCount={setSessionCount} />}
      </View>
    )
  }

  const renderSupport = () => (showHelp || showAbout) && (
    <View testID='profile-support'>
      <SectionTitle text={sectionTitle} style={styles.titleAlone}>{t('SUPPORT', 'Support')}</SectionTitle>
      <RowsCard>
        {showHelp && (
          <ProfileRow
            key='help'
            testID='profile-row-help'
            icon='chatbubble-ellipses-outline'
            title={t('HELP_CENTER', 'Help center')}
            onPress={() => { Linking.openURL(url).catch(() => {}) }}
          />
        )}
        {showAbout && (
          <ProfileRow
            key='about'
            testID='profile-row-about'
            icon='information-circle-outline'
            title={t('ABOUT', 'About')}
            value={t('APP_VERSION', 'Version _version_').replace('_version_', DeviceInfo.getVersion())}
          />
        )}
      </RowsCard>
    </View>
  )

  const renderLogout = () => <LogoutButton />

  // The remove link is quiet on purpose: a destructive action is not the page's loudest thing. An administrator cannot
  // remove the account here, and the page says so.
  const renderDeleteAccount = () => (
    <View style={styles.remove}>
      <OLink
        testID='profile-remove-account'
        variant='danger'
        disabled={isAdmin}
        shorcut={t('REMOVE_ACCOUNT', 'Remove account')}
        onPress={() => setOpenRemoveAccount(true)}
      />
      {isAdmin && (
        <OText preset='body_sm' color='text_muted' style={styles.note} testID='profile-remove-account-hint'>
          {t('ADMIN_CANT_REMOVE_ACCOUNT', 'Administrator accounts can\'t be removed here.')}
        </OText>
      )}
    </View>
  )

  // Removing the account, once the password was checked: the delete and, only when the server says OK, the end of the
  // session and the wipe of what the device kept (the language and the tutorial flag stay).
  const removeAccount = async (): Promise<boolean> => {
    const plan = getRemoveAccountSessionPlan(await handleRemoveAccount?.(user?.id))
    if (!plan.logout) return false
    await logout?.()
    if (plan.clearLocalStore) _clearStoreData({ excludedKeys: ['isTutorial', 'language'] })
    return true
  }

  // The sections the theme shows, in its order; a hidden or empty one draws nothing and leaves no gap.
  const sections = render({
    profile_photo: renderPhoto,
    information: renderInformation,
    account: renderAccount,
    support: renderSupport,
    logout: renderLogout,
    delete_account: renderDeleteAccount
  })

  return (
    <View style={styles.page}>
      <ONavbar title={t('PROFILE', 'Profile')} />
      {sessionLoading
        ? <ProfileSkeleton />
        : (
          <>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.content}>
              {sections}
            </ScrollView>
            <ProfilePhotoSheet
              open={openPhotoSheet}
              onClose={() => setOpenPhotoSheet(false)}
              onTakePhoto={takePhoto}
              onChooseFromGallery={chooseFromGallery}
              hasPhoto={!!user?.photo}
              onRemovePhoto={typeof handleRemovePhoto === 'function' ? handleRemovePhoto : undefined}
            />
            <RemoveAccountModal
              open={openRemoveAccount}
              onClose={() => setOpenRemoveAccount(false)}
              onConfirm={removeAccount}
            />
          </>
        )}
    </View>
  )
}

/** The profile wired to the user form's headless controller: it saves the photo and removes the account. */
export const UserProfileForm = (props: any) => {
  const profileProps = {
    ...props,
    UIComponent: ProfileUI
  }

  return <UserFormDetailsController {...profileProps} />
}
