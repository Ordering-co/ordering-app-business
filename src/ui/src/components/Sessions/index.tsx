import React, { useCallback, useMemo } from 'react'
import { FlatList, Platform, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { SessionsParams } from '../../types'
import { themeGutter, themePart, themeSpace } from '@/theme/helpers'
import { useLayout } from '@/theme/platform'

import { useLanguage, useSession, Sessions as SessionsController } from '@components'
import { useFormats } from '@/hooks/useFormats'
import {
  IconTile,
  OBadge,
  OBottomBar,
  OButton,
  OCard,
  ONavbar,
  OText,
  ScreenContainer,
  SectionTitle,
  SkeletonBone,
  useConfirm
} from '../shared'
import { SessionRow as DeviceRow } from './SessionRow'

/** The rows the skeleton stands for. */
const SKELETON_ROWS = [0, 1, 2]

/** What the list holds when it has no rows to draw: the states of the screen are its header. */
const NO_ROWS: SessionRow[] = []

/** The rows of the other devices, with their two dates already written. */
interface SessionRow {
  session: any
  started: string
  until: string
}

const sessionsStyles = (theme: any) => {
  const page = themePart(theme, 'account_page', 'base')
  return StyleSheet.create({
    screen: { flex: 1 },
    // No `gap` here: the list would put it between its rows too (the rows carry their own divider).
    content: {
      paddingHorizontal: themeGutter(theme),
      paddingBottom: page.padding_bottom
    },
    header: { gap: themeSpace(theme, 'md') },
    skeletons: { gap: themeSpace(theme, 'md') },
    section: { gap: themeSpace(theme, 'xs') },
    othersTitle: { paddingBottom: themeSpace(theme, 'xs') },
    title: { marginBottom: 0 },
    current: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    texts: { flex: 1, minWidth: 0 },
    bones: { flex: 1, gap: themeSpace(theme, 'xs') },
    skeleton: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'md'), minHeight: theme.native.components.list_row.base.min_height },
    empty: { alignItems: 'center', gap: themeSpace(theme, 'md'), paddingVertical: themeSpace(theme, 'xl') }
  })
}

/**
 * Sessions (Sessions mockup): "This device" (its own label, built here: the API gives none) with "Current", then
 * "Other devices", each with the dates the API gives (Started, Valid until) and "Sign out"; the bar signs out of every other device.
 * Every sign-out asks first in the themed dialog. Signing out of this device is Log out's job, so the current
 * session has no button. When the account does not use `jwt_session` the screen offers to turn sessions on.
 */
export const SessionsUI = (props: SessionsParams) => {
  const {
    navigation,
    sessionsList,
    actionState,
    handleDeleteSession,
    handleDeleteAllSessions
  } = props

  const [, t] = useLanguage()
  const [{ user }] = useSession()
  const { dateTime } = useFormats()
  const theme: any = useTheme()
  const { tablet } = useLayout()
  const confirm = useConfirm()
  const styles = useMemo(() => sessionsStyles(theme), [theme])
  const tile = theme.native.components.icon_tile.sizes.md.size

  const jwt = user?.session_strategy === 'jwt_session'
  const sessions: any[] = sessionsList?.sessions ?? []
  const current = sessions.find((session) => session.current)
  // The newest first, without changing the list the controller holds.
  const others = [...sessions].filter((session) => !session.current).reverse()
  const busy = !!actionState?.loading

  // This device's label: what the app knows of the phone it runs on.
  const os = Platform.OS === 'ios' ? (tablet ? 'iPad' : 'iPhone') : 'Android'
  const deviceLabel = (tablet
    ? t('DEVICE_THIS_TABLET', '_os_ · this tablet')
    : t('DEVICE_THIS_PHONE', '_os_ · this phone')).replace('_os_', os)

  const onSignOut = (session: any) => confirm({
    message: t('QUESTION_DELETE_SESSION', 'Are you sure to delete this session?'),
    acceptText: t('SIGN_OUT', 'Sign out'),
    destructive: true,
    onAccept: () => handleDeleteSession(session)
  })

  const onSignOutOthers = () => confirm({
    message: t('QUESTION_DELETE_ALL_SESSIONS_EXCEPT_CURRENT', 'Are you sure that you want to delete all sessions except current?'),
    acceptText: t('SIGN_OUT', 'Sign out'),
    destructive: true,
    onAccept: () => handleDeleteAllSessions(false)
  })

  const onEnableSessions = () => confirm({
    message: t('QUESTION_ENABLE_ALL_SESSIONS', 'Are you sure to enable all sessions?'),
    acceptText: t('ACTIVE_SESSIONS', 'Active sessions'),
    onAccept: () => handleDeleteAllSessions(false)
  })

  const dates = (session: any) => ({
    started: `${t('STARTED', 'Started')} ${dateTime(session.created_at)}`,
    until: `${t('VALID_UNTIL', 'Valid until')} ${dateTime(session.valid_thru)}`
  })

  // The rows of the other devices: written once per change of the list (not on every render of the screen, and the two
  // dates of a session once each). An account with a hundred sessions made this screen the heaviest one to open.
  const otherRows: SessionRow[] = useMemo(() => others.map((session) => ({ session, ...dates(session) })), [sessionsList?.sessions, dateTime, t]) // eslint-disable-line react-hooks/exhaustive-deps

  // The list is virtualized: only the rows near the screen are mounted (a hundred and more sessions are a hundred and more
  // native rows otherwise). The row's renderer follows the controller's handler, so a row never signs out through an old one.
  const renderRow = useCallback(({ item }: { item: SessionRow }) => (
    <DeviceRow
      testID={`session-card-${item.session.id}`}
      title={item.started}
      subtitle={item.until}
      trailing={(
        <OButton
          testID={`session-delete-${item.session.id}`}
          appearance='outline'
          color='danger'
          size='md'
          text={t('SIGN_OUT', 'Sign out')}
          disabled={busy}
          onClick={() => onSignOut(item.session)}
        />
      )}
    />
  ), [busy, t]) // eslint-disable-line react-hooks/exhaustive-deps
  const keyOf = useCallback((item: SessionRow) => String(item.session.id), [])

  /** What comes above the rows: the whole screen when there are no rows (off, loading, none), else this device and the title. */
  const renderHeader = () => {
    if (!jwt) {
      return (
        <View style={styles.empty} testID='sessions-off'>
          <IconTile icon='phone-portrait-outline' size='xl' round />
          <OText align='center' color='text_muted'>
            {t('YOU_DONT_HAVE_ENABLED_THE_SESSIONS', 'You don\'t have enabled the sessions, please active them to have a better control of your sessions.')}
          </OText>
          <OButton
            testID='sessions-enable'
            appearance='tonal'
            color='primary'
            size='md'
            text={t('ACTIVE_SESSIONS', 'Active sessions')}
            disabled={busy}
            onClick={onEnableSessions}
          />
        </View>
      )
    }
    if (sessionsList?.loading) {
      return (
        <View style={styles.skeletons}>
          {SKELETON_ROWS.map((row) => (
            <View key={row} style={styles.skeleton} testID='session-skeleton'>
              <View style={styles.bones}>
                <SkeletonBone width='45%' />
                <SkeletonBone width='60%' />
              </View>
              <SkeletonBone width={tile} height={tile} />
            </View>
          ))}
        </View>
      )
    }
    if (sessions.length === 0) {
      return <OText align='center' color='text_muted' testID='sessions-none'>{t('YOU_DONT_HAVE_ANY_SESSIONS', 'You don\'t have any sessions')}</OText>
    }
    return (
      <View style={styles.header}>
        {!!current && (
          <View style={styles.section} testID='session-current'>
            <SectionTitle style={styles.title}>{t('THIS_DEVICE', 'This device')}</SectionTitle>
            <OCard>
              <View style={styles.current}>
                <IconTile icon={tablet ? 'tablet-portrait-outline' : 'phone-portrait-outline'} />
                <View style={styles.texts}>
                  <OText preset='label' numberOfLines={1}>{deviceLabel}</OText>
                  <OText preset='body_sm' color='text_muted' numberOfLines={1}>{dates(current).started}</OText>
                  <OText preset='body_sm' color='text_muted' numberOfLines={1}>{dates(current).until}</OText>
                </View>
                <OBadge variant='success_soft'>{t('CURRENT', 'Current')}</OBadge>
              </View>
            </OCard>
          </View>
        )}
        <View style={[styles.section, others.length > 0 && styles.othersTitle]} testID='session-others'>
          <SectionTitle style={styles.title}>{t('OTHER_DEVICES', 'Other devices')}</SectionTitle>
          {others.length === 0 && <OText preset='body_sm' color='text_muted' testID='sessions-no-others'>{t('NO_OTHER_DEVICES', 'You are signed in on this device only.')}</OText>}
        </View>
      </View>
    )
  }

  const showBar = jwt && !sessionsList?.loading && others.length > 0

  return (
    <ScreenContainer>
      <View style={styles.screen}>
        <ONavbar title={t('SESSIONS', 'Sessions')} onBack={() => navigation?.canGoBack?.() && navigation.goBack()} />
        <FlatList
          testID='sessions-list'
          style={styles.screen}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          data={jwt && !sessionsList?.loading ? otherRows : NO_ROWS}
          keyExtractor={keyOf}
          renderItem={renderRow}
          extraData={busy}
          ListHeaderComponent={renderHeader()}
        />
        {showBar && (
          <OBottomBar
            testID='sessions-bar'
            actions={[{
              slot: 'decline',
              text: t('SIGN_OUT_OF_OTHER_DEVICES', 'Sign out of all other devices'),
              testID: 'sessions-sign-out-others',
              disabled: busy,
              onClick: onSignOutOthers
            }]}
          />
        )}
      </View>
    </ScreenContainer>
  )
}

export const Sessions = (props: SessionsParams) => {
  const sessionsProps = {
    ...props,
    UIComponent: SessionsUI
  }
  return <SessionsController {...sessionsProps} />
}
