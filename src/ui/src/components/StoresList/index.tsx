import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, BackHandler, FlatList, RefreshControl, View } from 'react-native'
import { useNetInfo } from '@react-native-community/netinfo'
import { useTheme } from 'styled-components/native'
import { BusinessList, ToastType, useLanguage, useToast } from '@components'
import { usePageSections } from '@/theme/sections'
import { themeColor, themeRadius, themeText, themeVisible } from '@/theme/helpers'
import ONavbar from '../shared/ONavbar'
import OInput from '../shared/OInput'
import OButton from '../shared/OButton'
import OLink from '../shared/OLink'
import ONotice from '../shared/ONotice'
import OCard from '../shared/OCard'
import ODivider from '../shared/ODivider'
import Icon from '../shared/Icon'
import { SkeletonBone } from '../shared/SkeletonBone'
import { BusinessController } from '../BusinessController'
import { NotFoundSource } from '../NotFoundSource'
import { dashboardUrl } from './dashboardUrl'
import { useNow } from './useNow'
import { useDebouncedCallback } from './useDebouncedCallback'
import { storesListStyles } from './styles'

/** Milliseconds the typing waits before the stores are asked for (the server does the search). */
export const SEARCH_DELAY = 400

/** A card shaped as a store's (the tile, two lines, the line and the status row). */
const StoreCardSkeleton = () => {
  const theme: any = useTheme()
  const styles = useMemo(() => storesListStyles(theme), [theme])
  const tile = theme.native.components.icon_tile.sizes.lg.size
  const bones = themeText(theme, 'label').lineHeight
  const small = themeText(theme, 'body_sm').lineHeight
  const track = theme.native.components.switch.base
  return (
    <OCard style={styles.skeletonCard} testID='store-skeleton'>
      <View style={styles.skeletonTop}>
        <SkeletonBone width={tile} height={tile} />
        <View style={styles.skeletonTexts}>
          <SkeletonBone width='55%' height={bones} />
          <SkeletonBone width='35%' height={small} />
        </View>
      </View>
      <ODivider />
      <View style={styles.skeletonTop}>
        <SkeletonBone width='45%' height={small} />
        <View style={styles.skeletonGrow} />
        <SkeletonBone width={track.track_width} height={track.track_height} borderRadius={themeRadius(theme, 'full', { fixed: true })} />
      </View>
    </OCard>
  )
}

/**
 * The Stores tab: the user's stores, each with the state of its orders (see `BusinessController`), a search that opens
 * under the header, the next page when the end of the list is reached, pull to refresh, and the link to the
 * dashboard at the foot. Offline, the switches are off and a notice says why.
 *
 * On a landscape tablet the screen passes `onSelectStore` / `selectedSlug` and the list picks the store whose menu
 * the other pane shows (the first one until the user picks).
 */
export const StoresListUI = (props: any) => {
  const {
    navigation,
    businessesList,
    paginationProps,
    getBusinesses,
    handleChangeSearch,
    searchValue,
    onSelectStore,
    selectedSlug,
  } = props
  const { loading, error, businesses = [] } = businessesList ?? {}
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const theme: any = useTheme()
  const styles = useMemo(() => storesListStyles(theme), [theme])
  const netInfo = useNetInfo()
  const isOffline = netInfo.isConnected === false
  const now = useNow()
  const { sections, isVisible } = usePageSections('stores')
  const [searching, setSearching] = useState(!!searchValue)
  const [text, setText] = useState<string>(searchValue ?? '')
  const [refreshing, setRefreshing] = useState(false)
  const asking = useRef(false)

  const debounced = useDebouncedCallback((value: string) => handleChangeSearch?.(value), SEARCH_DELAY)

  // An error of the first request or of a page: the list says so on screen and the toast says why.
  useEffect(() => {
    if (error) {
      showToast(ToastType.Error, (Array.isArray(error) ? error[0] : typeof error === 'string' ? error : null) || t('NETWORK_ERROR', 'Network Error'))
    }
  }, [error]) // eslint-disable-line react-hooks/exhaustive-deps

  // A request that finished frees the next one (and ends the pull to refresh).
  useEffect(() => {
    if (!loading) {
      asking.current = false
      setRefreshing(false)
    }
  }, [loading])

  // Two panes: the first store is shown until the user picks another.
  useEffect(() => {
    if (onSelectStore && !selectedSlug && businesses.length > 0) onSelectStore(businesses[0])
  }, [onSelectStore, selectedSlug, businesses])

  const hasMore = !!paginationProps?.totalPages && (paginationProps.currentPage ?? 0) < paginationProps.totalPages
  const loadMore = useCallback(() => {
    if (!hasMore || loading || asking.current) return
    asking.current = true
    getBusinesses?.()
  }, [hasMore, loading, getBusinesses])

  const refresh = useCallback(() => {
    if (loading || isOffline) return
    setRefreshing(true)
    asking.current = true
    getBusinesses?.(true)
  }, [loading, isOffline, getBusinesses])

  const onChangeText = (value: string) => {
    setText(value)
    debounced.call(value)
  }
  const closeSearch = () => {
    debounced.cancel()
    setText('')
    setSearching(false)
    if (searchValue) handleChangeSearch?.('')
  }
  // Android's back, with the search open, closes the search (as the menu's does) instead of going to another tab. The tab
  // stays mounted while another is shown, so only the focused screen answers.
  const closeSearchRef = useRef(closeSearch)
  closeSearchRef.current = closeSearch
  useEffect(() => {
    if (!searching) return undefined
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigation?.isFocused && !navigation.isFocused()) return false
      closeSearchRef.current()
      return true
    })
    return () => subscription.remove()
  }, [searching, navigation])
  const clearText = () => {
    debounced.cancel()
    setText('')
    handleChangeSearch?.('')
  }

  const canSearch = themeVisible(theme, 'stores.search') && !isOffline
  const url = dashboardUrl(t)
  const linkIndex = sections.findIndex((section) => section.key === 'dashboard_link')
  const listIndex = sections.findIndex((section) => section.key === 'stores')
  const showLink = isVisible('dashboard_link')

  const link = showLink && (
    <View style={styles.link}>
      <OLink url={url} shorcut={t('MORE_STORE_SETTINGS_IN_DASHBOARD', 'More store settings in the dashboard')} testID='stores-dashboard-link' />
    </View>
  )

  const initialLoading = !!loading && businesses.length === 0
  const failed = !!error && !loading && businesses.length === 0

  const empty = (() => {
    if (initialLoading) {
      return <View style={styles.skeletons}>{[0, 1, 2].map((index) => <StoreCardSkeleton key={index} />)}</View>
    }
    if (failed) {
      return (
        <NotFoundSource
          icon='alert-circle-outline'
          content={t('NETWORK_ERROR', 'Network Error')}
          btnTitle={t('RETRY', 'Retry')}
          onClickButton={() => getBusinesses?.(true)}
          actionTestID='stores-retry'
          testID='stores-error'
        />
      )
    }
    return (
      <NotFoundSource
        icon='storefront-outline'
        content={isOffline ? t('NETWORK_ERROR', 'Network Error') : t('NO_RESULTS_FOUND', 'Sorry, no results found')}
        testID='stores-empty'
      />
    )
  })()

  const headerLink = listIndex > linkIndex && linkIndex >= 0 ? link : null

  const header = (
    <>
      {isOffline && (
        <View style={styles.notice}>
          <ONotice variant='warning' testID='stores-offline'>
            {t('STORES_OFFLINE_NOTICE', 'You are offline. Orders can be paused or turned on again when the connection returns.')}
          </ONotice>
        </View>
      )}
    </>
  )

  return (
    <View style={styles.screen}>
      <ONavbar
        title={t('STORES', 'Stores')}
        rightButtons
        right={canSearch && !searching
          ? <OButton iconOnly appearance='ghost' color='neutral' onClick={() => setSearching(true)} icon={<Icon name='search-outline' size='lg' />} accessibilityLabel={t('SEARCH_STORES', 'Search stores')} testID='stores-search-button' />
          : undefined}
      />
      {searching && !isOffline && (
        <View style={styles.search}>
          <OInput
            autoFocus
            inline
            accessibilityLabel={t('SEARCH_STORES', 'Search stores')}
            placeholder={t('SEARCH_STORES', 'Search stores')}
            vertorIcon='magnify'
            value={text}
            isValueSync
            onChange={onChangeText}
            returnKeyType='search'
            autoCorrect={false}
            autoCapitalize='none'
            testID='stores-search-input'
            iconCustomRight={(
              <OButton
                iconOnly
                size='sm'
                appearance='ghost'
                color='neutral'
                onClick={text ? clearText : closeSearch}
                icon={<Icon name='close' size='md' />}
                accessibilityLabel={text ? t('CLEAR', 'Clear') : t('CLOSE', 'Close')}
                testID='stores-search-clear'
              />
            )}
          />
        </View>
      )}
      <FlatList
        testID='stores-flatlist'
        data={failed || initialLoading ? [] : businesses}
        keyExtractor={(item: any) => String(item.id)}
        style={styles.list}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={themeColor(theme, 'primary')} />}
        // No header cell when there is nothing in it: an empty one still gets the list's `gap` under it (15 extra under the bar).
        ListHeaderComponent={isOffline || headerLink ? <>{header}{headerLink}</> : undefined}
        renderItem={({ item }: any) => (
          <BusinessController
            business={item}
            navigation={navigation}
            now={now}
            isOffline={isOffline}
            selected={!!selectedSlug && item.slug === selectedSlug}
            onSelectStore={onSelectStore}
          />
        )}
        ListEmptyComponent={empty}
        ListFooterComponent={(
          <>
            {!!loading && businesses.length > 0 && (
              <View style={styles.more} testID='stores-loading-more'>
                <ActivityIndicator color={themeColor(theme, 'primary')} />
              </View>
            )}
            {listIndex < linkIndex || linkIndex < 0 ? link : null}
          </>
        )}
      />
    </View>
  )
}

export const StoresList = (props: any) => {
  const BusinessesListProps = {
    ...props,
    UIComponent: StoresListUI,
  }
  return <BusinessList {...BusinessesListProps} />
}
