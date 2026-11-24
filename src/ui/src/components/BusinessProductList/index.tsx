import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Keyboard, Platform, ScrollView, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import * as components from '@components'
import { StoreProductList, ToastType, useLanguage, useToast, useUtils } from '@components'
import { usePageSections } from '@/theme/sections'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { barBottomSpace, themeColor, themeSpace, themeText, themeVisible } from '@/theme/helpers'
import ONavbar from '../shared/ONavbar'
import OInput from '../shared/OInput'
import OButton from '../shared/OButton'
import { OBottomBar } from '../shared/OBottomBar'
import ONotice from '../shared/ONotice'
import OText from '../shared/OText'
import OSwitch from '../shared/OSwitch'
import Icon from '../shared/Icon'
import { FilterChip } from '../shared/FilterChip'
import { SkeletonBone } from '../shared/SkeletonBone'
import { useConfirm } from '../shared/confirmAction'
import { NotFoundSource } from '../NotFoundSource'
import { PauseOrdersSheet } from '../StoresList/PauseOrdersSheet'
import { useNow } from '../StoresList/useNow'
import { useDebouncedCallback } from '../StoresList/useDebouncedCallback'
import { useWhen } from '../StoresList/useWhen'
import { useFormats } from '@/hooks/useFormats'
import { countText } from '../shared/countText'
import type { PauseOption } from '../StoresList/pauseOptions'
import { MenuRow } from './MenuRow'
import { menuStyles } from './styles'
import { columnBleed, useLayout } from '@/theme/platform'
import {
  availabilityOf,
  categoryIds,
  findCategory,
  groupProducts,
  reasonText,
  switchChanges,
  type CategoryNode,
  type MenuRowItem,
} from './productState'

/** Milliseconds a search of one category waits after the typing stops (the cross-category search has its own delay). */
const SEARCH_DELAY = 400
/** The longest the rows wait for the controller to start the list a filter asks for. */
const FILTER_PENDING_LIMIT = 1500

type Selection = number | 'all' | null

const firstMessage = (value: any): string | null => {
  if (!value) return null
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null
  return typeof value === 'string' ? value : null
}

const MenuRowSkeleton = () => {
  const theme: any = useTheme()
  const styles = useMemo(() => menuStyles(theme), [theme])
  const tile = theme.native.components.icon_tile.sizes.lg.size
  const track = theme.native.components.switch.base
  return (
    <View style={styles.skeletonRow} testID='menu-skeleton'>
      <SkeletonBone width={tile} height={tile} />
      <View style={styles.skeletonTexts}>
        <SkeletonBone width='55%' height={themeText(theme, 'label').lineHeight} />
        <SkeletonBone width='25%' height={themeText(theme, 'body_sm').lineHeight} />
      </View>
      <SkeletonBone width={track.track_width} height={track.track_height} />
    </View>
  )
}

/**
 * The menu of a store, one screen with two modes. Browse: the unavailable notice, the categories as chips (a category
 * with children shows them as a second row), and the products of the chosen category with the switch "available".
 * Search: a field over the whole menu and the filter "Unavailable" with "Make all available" -- only when the
 * installed `ordering-components` has `StoreProductSearch` (`typeof components.StoreProductSearch === 'function'`);
 * without it the search stays inside the chosen category and the filter and bulk action are not drawn.
 * The two modes are one route: the system back closes the search first.
 *
 * `embedded` is the right pane of a tablet's Stores: no back arrow, and `onOpenProduct` (the pane's sheet) takes the
 * place of the route to `ProductOptions`.
 */
export const MenuBoard = (props: any) => {
  const {
    navigation,
    businessState,
    categories = [],
    categoriesState,
    productsList,
    productSearch,
    search: searchApi,
    handleChangeCategory,
    handleChangeProductSearch,
    updateStoreCategory,
    updateStoreProduct,
    getCategoryProducts,
    embedded = false,
    onOpenProduct,
    fallbackName,
  } = props
  const capable = !!searchApi
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const [utils] = useUtils()
  const { time } = useFormats()
  const theme: any = useTheme()
  const layout = useLayout()
  const bleed = embedded ? 0 : columnBleed(layout)
  const styles = useMemo(() => menuStyles(theme, bleed), [theme, bleed])
  const confirm = useConfirm()
  const when = useWhen()
  const now = useNow()
  const { render } = usePageSections('menu')
  const insets = useSafeAreaInsets()

  const business = businessState?.business ?? {}
  const timeZone: string | null | undefined = business.timezone
  const [mode, setMode] = useState<'browse' | 'search'>('browse')
  const [selection, setSelection] = useState<Selection>(capable ? 'all' : null)
  const [childId, setChildId] = useState<number | null>(null)
  const [text, setText] = useState('')
  // A change of the filter shows at once (the chip, the title) but its list is asked for after the controller's search
  // delay: until that request starts, the list still held is the other filter's, so the rows say "loading", not that list.
  const [filterPending, setFilterPending] = useState(false)
  const [pausing, setPausing] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // --- the data, from the one source that exists ---------------------------------------------------------------
  const ps = searchApi?.productsState
  const products: any[] = capable ? ps.products : (productsList?.products ?? [])
  const loadingProducts = capable ? !!ps.loading : !!productsList?.loading
  const loadingMore = capable ? !!ps.loadingMore : !!productsList?.loading && products.length > 0
  const productsError = capable ? ps.error : productsList?.error
  const pagination = capable ? ps.pagination : productsList?.pagination
  const hasMore = !!pagination?.totalPages && (pagination.currentPage ?? 0) < pagination.totalPages
  const unavailableOnly = capable && !!searchApi.unavailableOnly
  const unavailableTotal: number | null = capable ? (searchApi.unavailableState?.total ?? null) : null

  const topCategory = typeof selection === 'number' ? findCategory(categories, selection) : null
  const selectedCategory: CategoryNode | null = childId !== null ? findCategory(categories, childId) : topCategory
  const selectedId = selectedCategory?.id ?? null

  // Non-capable: the first category is chosen once the tree is there (the controller lists one category's products).
  useEffect(() => {
    if (capable || selection !== null || !categories.length) return
    setSelection(categories[0].id)
    handleChangeCategory?.(categories[0])
  }, [capable, selection, categories]) // eslint-disable-line react-hooks/exhaustive-deps

  // Capable: the whole menu is loaded page after page in browse mode, so the chips can count (one full fetch).
  useEffect(() => {
    if (capable && mode === 'browse' && !ps.loading && !ps.loadingMore && !ps.error && hasMore) searchApi.loadMoreProducts()
  }, [capable, mode, ps?.loading, ps?.loadingMore, ps?.error, hasMore, pagination?.currentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  const fullyLoaded = capable && mode === 'browse' && !ps.loading && !ps.loadingMore && !ps.error && !!pagination?.totalPages && !hasMore && !searchApi.search && !unavailableOnly
  const countOf = useCallback((category: CategoryNode | null): number | null => {
    if (!fullyLoaded || !category) return null
    const ids = categoryIds(category)
    return products.filter((product) => ids.includes(product.category_id)).length
  }, [fullyLoaded, products])
  const showCounts = themeVisible(theme, 'products.category_count')

  // A failed action of the cross-category controller says why in a toast.
  const actionError = searchApi?.actionError
  useEffect(() => {
    if (actionError) {
      showToast(ToastType.Error, firstMessage(actionError) || t('ERROR', 'Error'))
      searchApi.clearActionError?.()
    }
  }, [actionError]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- search mode ---------------------------------------------------------------------------------------------
  const categorySearch = useDebouncedCallback((value: string) => handleChangeProductSearch?.(value), SEARCH_DELAY)
  const changeFilter = (only: boolean) => {
    if (!capable) return
    if (!!searchApi.unavailableOnly !== only) setFilterPending(true)
    searchApi.handleChangeUnavailableOnly(only)
  }
  // The controller's request has started (its list is emptied and `loading` is on): the pending gap is over. A change that
  // asks for nothing (a request never started) cannot hold the rows for more than a moment.
  useEffect(() => {
    if (!filterPending) return undefined
    if (ps?.loading) { setFilterPending(false); return undefined }
    const timer = setTimeout(() => setFilterPending(false), FILTER_PENDING_LIMIT)
    return () => clearTimeout(timer)
  }, [filterPending, ps?.loading])
  // The search button asks to type, so the field takes the focus; "View" on the notice asks to see a list, so it does not
  // (the keyboard would cover the "Make all available" bar). The field stays tappable either way.
  const [focusSearch, setFocusSearch] = useState(true)
  const openSearch = (unavailable = false) => {
    setFocusSearch(!unavailable)
    setMode('search')
    if (unavailable) changeFilter(true)
  }
  const closeSearch = useCallback(() => {
    categorySearch.cancel()
    setMode('browse')
    setText('')
    if (capable) {
      searchApi.handleChangeSearch('')
      changeFilter(false)
    } else if (productSearch) {
      handleChangeProductSearch?.('')
    }
  }, [capable, searchApi, productSearch, handleChangeProductSearch, categorySearch]) // eslint-disable-line react-hooks/exhaustive-deps
  const onChangeText = (value: string) => {
    setText(value)
    if (capable) searchApi.handleChangeSearch(value)
    else categorySearch.call(value)
  }

  // The route's back (hardware, header, gesture) closes the search before it leaves the screen.
  const modeRef = useRef(mode)
  modeRef.current = mode
  const closeRef = useRef(closeSearch)
  closeRef.current = closeSearch
  useEffect(() => {
    if (!navigation?.addListener) return undefined
    return navigation.addListener('beforeRemove', (event: any) => {
      if (modeRef.current !== 'search') return
      event.preventDefault?.()
      closeRef.current()
    })
  }, [navigation])

  // --- actions -------------------------------------------------------------------------------------------------
  const openProduct = (product: any) => {
    if (onOpenProduct) return onOpenProduct({ businessId: business.id, categoryId: product.category_id ?? selectedId, productId: product.id, productName: product.name })
    navigation?.navigate('ProductOptions', {
      businessId: business.id,
      categoryId: product.category_id ?? selectedId,
      productId: product.id,
      productName: product.name,
    })
  }

  const updateProduct = async (product: any, changes: Record<string, any>, message?: string): Promise<boolean> => {
    if (capable) {
      const saved = await searchApi.handleUpdateProduct(product, changes)
      if (saved) {
        showToast(ToastType.Success, message ?? (changes.enabled === false ? t('DISABLED_PRODUCT', 'Disabled product') : t('ENABLED_PRODUCT', 'Enabled product')))
        return true
      }
      return false
    }
    // The category's own controller shows its toast.
    await updateStoreProduct?.(product.category_id ?? selectedId, product.id, changes)
    return true
  }

  const toggleProduct = (product: any, turnOn: boolean) => { updateProduct(product, switchChanges(turnOn)) }

  const confirmPause = async (option: PauseOption) => {
    if (!pausing) return
    setSaving(true)
    const message = option.until
      ? t('PRODUCT_PAUSED_UNTIL', 'Product unavailable until _time_').replace('_time_', when(option.until, timeZone))
      : t('DISABLED_PRODUCT', 'Disabled product')
    const ok = await updateProduct(pausing, option.changes, message)
    setSaving(false)
    if (ok) setPausing(null)
  }

  const makeAllAvailable = () => {
    const count = searchApi.unavailableState?.total ?? products.length
    confirm({
      message: t('MAKE_ALL_AVAILABLE_CONFIRM', 'Make _count_ products available?').replace('_count_', String(count)),
      acceptText: t('MAKE_ALL_AVAILABLE', 'Make all available'),
      onAccept: async () => {
        const result = await searchApi.handleMakeAllAvailable()
        if (!result) return
        if (result.failed > 0) {
          showToast(ToastType.Error, t('PRODUCTS_MADE_AVAILABLE_PARTIAL', '_done_ of _total_ products made available').replace('_done_', String(result.done)).replace('_total_', String(result.total)))
        } else {
          showToast(ToastType.Success, t('PRODUCTS_MADE_AVAILABLE', 'Products made available'))
        }
      },
    })
  }

  const toggleCategory = (category: CategoryNode) => {
    updateStoreCategory?.(category.id, { enabled: category.enabled === false })
  }

  const chooseTop = (id: Selection, category?: CategoryNode) => {
    setSelection(id)
    setChildId(null)
    if (!capable && category) handleChangeCategory?.(category)
  }
  const chooseChild = (category: CategoryNode) => {
    const same = childId === category.id
    setChildId(same ? null : category.id)
    if (!capable) handleChangeCategory?.(same ? (topCategory as CategoryNode) : category)
  }

  // --- what is drawn -------------------------------------------------------------------------------------------
  const rows: MenuRowItem[] = useMemo(() => {
    if (capable && mode === 'browse') return groupProducts(products, categories, selection === 'all' ? null : selectedCategory)
    return products.map((product) => ({ type: 'product' as const, key: `p-${product.id}`, product }))
  }, [capable, mode, products, categories, selection, selectedCategory])

  const businessLoading = !!businessState?.loading
  const initialLoading = businessLoading || filterPending || (loadingProducts && products.length === 0) || (!capable && selection === null && !!categoriesState?.loading)
  const priceVisible = themeVisible(theme, 'products.price')
  const reasonVisible = themeVisible(theme, 'products.unavailable_reason')
  const priceOf = (product: any) => (priceVisible && typeof utils?.parsePrice === 'function' && product.price !== undefined && product.price !== null ? utils.parsePrice(product.price) : undefined)
  const categoryName = (product: any) => product?.category?.name ?? findCategory(categories, product.category_id)?.name ?? ''

  // The rows are memoized: they get the same three functions every render, which call the latest closures.
  const actions = useRef({ openProduct, toggleProduct })
  actions.current = { openProduct, toggleProduct }
  const handleOpen = useCallback((product: any) => actions.current.openProduct(product), [])
  const handleToggle = useCallback((product: any, turnOn: boolean) => actions.current.toggleProduct(product, turnOn), [])
  const handleReason = useCallback((product: any) => setPausing(product), [])

  const renderRow = ({ item }: { item: MenuRowItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.groupHeader}>
          <OText preset='body_lg'>{item.category?.name}</OText>
          <OText preset='body_sm' color='text_muted'>{productsText(item.count ?? 0)}</OText>
        </View>
      )
    }
    const product = item.product
    const availability = availabilityOf(product, now)
    const unavailable = availability.kind !== 'available'
    const reason = unavailable ? reasonText(availability, timeZone, now, t, time) : undefined
    // In the unavailable view the second line is "Category · back tomorrow"; in the menu a red line says it.
    const inUnavailableView = mode === 'search' && unavailableOnly
    return (
      <MenuRow
        product={product}
        unavailable={unavailable}
        price={priceOf(product)}
        detail={inUnavailableView ? [categoryName(product), reasonVisible ? reason : ''].filter(Boolean).join(' · ') : (mode === 'search' && categoryName(product) ? [categoryName(product), priceOf(product)].filter(Boolean).join(' · ') : undefined)}
        reason={unavailable && !inUnavailableView ? `${t('UNAVAILABLE', 'Unavailable')} · ${reason}` : undefined}
        busy={capable && searchApi.updatingProductIds?.includes(product.id)}
        onOpen={handleOpen}
        onToggle={handleToggle}
        onReason={handleReason}
      />
    )
  }

  const productsText = (count: number) => (count === 1
    ? t('PRODUCT_COUNT_ONE', '1 product')
    : t('CATEGORY_COUNT_PRODUCTS', '_count_ products').replace('_count_', String(count)))

  const chipText = (name: string, count: number | null) => (showCounts && count !== null ? `${name} ${countText(count)}` : name)

  const chipsRow = () => {
    if (!categories.length && !capable) return null
    const children: CategoryNode[] = topCategory?.subcategories ?? []
    return (
      <View style={styles.chipsBlock} testID='menu-categories'>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips}>
          {capable && (
            <FilterChip
              size='sm'
              text={t('ALL', 'All')}
              selected={selection === 'all'}
              onPress={() => chooseTop('all')}
              testID='menu-chip-all'
            />
          )}
          {categories.map((category: CategoryNode) => (
            <FilterChip
              key={category.id}
              size='sm'
              text={chipText(category.name, countOf(category))}
              selected={selection === category.id}
              onPress={() => chooseTop(category.id, category)}
              testID={`menu-chip-${category.id}`}
            />
          ))}
        </ScrollView>
        {children.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.children}>
            {children.map((category) => (
              <FilterChip
                key={category.id}
                size='sm'
                text={chipText(category.name, countOf(category))}
                selected={childId === category.id}
                onPress={() => chooseChild(category)}
                testID={`menu-chip-${category.id}`}
              />
            ))}
          </ScrollView>
        )}
      </View>
    )
  }

  const categoryHeader = () => {
    // A selected category always has its row with the switch (ANDROID-B13: a parent with subcategories had none).
    if (mode !== 'browse' || !selectedCategory) return null
    const enabled = selectedCategory.enabled !== false
    const count = countOf(selectedCategory)
    return (
      <View style={styles.categoryHeader} testID='menu-category-header'>
        <View style={styles.categoryTexts}>
          <OText preset='body_lg' numberOfLines={1}>{selectedCategory.name}</OText>
          {showCounts && count !== null && <OText preset='body_sm' color='text_muted'>{productsText(count)}</OText>}
        </View>
        <OSwitch
          value={enabled}
          label={enabled ? t('CATEGORY_ON', 'Category on') : t('CATEGORY_OFF', 'Category off')}
          accessibilityLabel={`${selectedCategory.name} · ${enabled ? t('CATEGORY_ON', 'Category on') : t('CATEGORY_OFF', 'Category off')}`}
          onChange={() => toggleCategory(selectedCategory)}
          testID='menu-category-switch'
        />
      </View>
    )
  }

  const emptyBlock = () => {
    if (initialLoading) return <View testID='menu-loading'>{[0, 1, 2, 3, 4, 5].map((index) => <MenuRowSkeleton key={index} />)}</View>
    if (businessState?.error) return <NotFoundSource icon='alert-circle-outline' content={t('NETWORK_ERROR', 'Network Error')} testID='menu-error' />
    if (productsError) {
      return (
        <NotFoundSource
          icon='alert-circle-outline'
          content={firstMessage(productsError) || t('NETWORK_ERROR', 'Network Error')}
          btnTitle={t('RETRY', 'Retry')}
          onClickButton={() => (capable ? searchApi.reloadProducts() : getCategoryProducts?.(true))}
          actionTestID='menu-retry'
          testID='menu-error'
        />
      )
    }
    // The unavailable view with no search typed and nothing in it is good news, not a failed search.
    if (mode === 'search' && unavailableOnly && !text.trim()) {
      return <NotFoundSource icon='checkmark-circle-outline' content={t('ALL_PRODUCTS_AVAILABLE', 'All products are available')} testID='menu-empty' />
    }
    return <NotFoundSource icon='restaurant-outline' content={t('NO_RESULTS_FOUND', 'Sorry, no results found')} testID='menu-empty' />
  }

  const loadMore = () => {
    if (!hasMore || loadingProducts || loadingMore) return
    if (capable) searchApi.loadMoreProducts()
    else getCategoryProducts?.(false)
  }

  // A filter chip is a choice of what to list: the keyboard of the search field goes down, so it never covers the result.
  const pickFilter = (only: boolean) => {
    Keyboard.dismiss()
    changeFilter(only)
  }

  const hasBar = capable && mode === 'search' && unavailableOnly && rows.length > 0 && themeVisible(theme, 'products.make_all_available')
  const productsList_ = (
    <FlatList
      data={initialLoading || productsError ? [] : rows}
      keyExtractor={(item: MenuRowItem) => item.key}
      renderItem={renderRow}
      style={styles.flex}
      contentContainerStyle={[styles.listContent, !hasBar && { paddingBottom: themeSpace(theme, 'lg') + barBottomSpace(theme, insets.bottom) }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps='handled'
      onEndReached={mode === 'search' || !capable ? loadMore : undefined}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={categoryHeader() ?? undefined}
      ListEmptyComponent={emptyBlock()}
      ListFooterComponent={(loadingMore && products.length > 0) ? <View style={styles.footer}><ActivityIndicator color={themeColor(theme, 'primary')} /></View> : undefined}
    />
  )

  const showNotice = mode === 'browse' && capable && (unavailableTotal ?? 0) > 0
  const searchChips = capable && mode === 'search'
  const name = business.name ?? fallbackName
  const searchButton = themeVisible(theme, 'products.search') && mode === 'browse'
    ? <OButton iconOnly appearance='ghost' color='neutral' onClick={() => openSearch(false)} icon={<Icon name='search-outline' size='lg' />} accessibilityLabel={t('SEARCH_PRODUCTS', 'Search products')} testID='menu-search-button' />
    : undefined
  const onBack = mode === 'search' ? closeSearch : (embedded ? undefined : () => navigation?.goBack?.())

  return (
    <View style={styles.screen}>
      <ONavbar title={t('MENU', 'Menu')} subtitle={name} onBack={onBack} right={searchButton} rightButtons testID='menu-header' />
      <View style={styles.body}>
        {mode === 'search' && (
          <OInput
            autoFocus={focusSearch}
            inline
            accessibilityLabel={capable ? t('SEARCH_ALL_PRODUCTS', 'Search all products') : t('SEARCH_PRODUCTS', 'Search products')}
            placeholder={capable ? t('SEARCH_ALL_PRODUCTS', 'Search all products') : t('SEARCH_PRODUCTS', 'Search products')}
            vertorIcon='magnify'
            value={text}
            isValueSync
            onChange={onChangeText}
            returnKeyType='search'
            autoCorrect={false}
            autoCapitalize='none'
            testID='menu-search-input'
          />
        )}
        {searchChips && (
          <View style={styles.children} testID='menu-filters'>
            <FilterChip size='sm' text={t('ALL', 'All')} selected={!unavailableOnly} onPress={() => pickFilter(false)} testID='menu-filter-all' />
            <FilterChip
              size='sm'
              text={unavailableTotal !== null ? t('UNAVAILABLE_COUNT', 'Unavailable _count_').replace('_count_', String(unavailableTotal)) : t('UNAVAILABLE', 'Unavailable')}
              selected={unavailableOnly}
              onPress={() => pickFilter(true)}
              testID='menu-filter-unavailable'
            />
          </View>
        )}
        {render({
          notice: () => showNotice
            ? (
              <ONotice
                variant='warning'
                action={{ text: t('VIEW', 'View'), onPress: () => openSearch(true), testID: 'menu-notice-view' }}
                testID='menu-notice'
              >
                {unavailableTotal === 1
                  ? t('PRODUCT_UNAVAILABLE_COUNT', '1 product is unavailable')
                  : t('PRODUCTS_UNAVAILABLE_COUNT', '_count_ products are unavailable').replace('_count_', String(unavailableTotal))}
              </ONotice>
            )
            : null,
          categories: () => (searchChips ? null : chipsRow()),
          products: () => productsList_,
        })}
      </View>
      {hasBar && (
        // The app's one pinned bar (it also tells the toast its height, so a toast rides above it).
        <OBottomBar
          testID='menu-bar'
          actions={[{
            text: t('MAKE_ALL_AVAILABLE', 'Make all available'),
            loading: !!searchApi.makeAvailableState?.loading,
            onClick: makeAllAvailable,
            testID: 'menu-make-all'
          }]}
        />
      )}
      {!!pausing && (
        <PauseOrdersSheet
          open
          kind='product'
          name={pausing.name}
          targets={[{ id: business.id, name: business.name, timezone: business.timezone, schedule: business.schedule }]}
          onClose={() => !saving && setPausing(null)}
          onConfirm={confirmPause}
          loading={saving}
        />
      )}
    </View>
  )
}

/** Wires the menu with the cross-category search when the installed components have it (`StoreProductSearch`). */
const SearchBridge = ({ listProps, ...search }: any) => <MenuBoard {...listProps} search={search} />

export const MenuController = (props: any) => {
  const business = props.businessState?.business
  const Search = (components as any).StoreProductSearch
  if (typeof Search !== 'function' || !business?.id) return <MenuBoard {...props} />
  return (
    <Search
      businessId={business.id}
      isIos={Platform.OS === 'ios'}
      pageSize={50}
      listProps={props}
      UIComponent={SearchBridge}
    />
  )
}

export const BusinessProductList = (props: any) => {
  const businessProductListProps = {
    ...props,
    businessProps: props.businessProps ?? ['id', 'name', 'categories', 'timezone', 'schedule'],
    UIComponent: MenuController,
  }
  return <StoreProductList {...businessProductListProps} />
}
