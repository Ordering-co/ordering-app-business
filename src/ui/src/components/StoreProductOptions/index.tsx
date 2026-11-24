import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { StoreProductOptions as StoreProductOptionsController, useLanguage, useUtils } from '@components'
import { useFormats } from '@/hooks/useFormats'
import { usePageSections } from '@/theme/sections'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { barBottomSpace, themeSpace, themeText, themeVisible } from '@/theme/helpers'
import ONavbar from '../shared/ONavbar'
import OText from '../shared/OText'
import OCard from '../shared/OCard'
import OSwitch from '../shared/OSwitch'
import ONotice from '../shared/ONotice'
import OListRow from '../shared/OListRow'
import SectionTitle from '../shared/SectionTitle'
import { OBadge } from '../shared/OBadge'
import { SkeletonBone } from '../shared/SkeletonBone'
import { NotFoundSource } from '../NotFoundSource'
import { PauseOrdersSheet } from '../StoresList/PauseOrdersSheet'
import { useNow } from '../StoresList/useNow'
import type { PauseOption } from '../StoresList/pauseOptions'
import { availabilityOf, reasonText, switchChanges } from '../BusinessProductList/productState'
import { OptionGroupsSheet } from './OptionGroupsSheet'
import { optionRule } from './optionRules'
import { optionsStyles } from './styles'

interface RowProps { title: string, price?: string, enabled: boolean, busy: boolean, last: boolean, onChange: (value: boolean) => void, testID: string }

/** A row of an option's card: its name (muted and "Unavailable" when it is off), its price and its switch. */
const OptionRow = ({ title, price, enabled, busy, last, onChange, testID }: RowProps) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const styles = useMemo(() => optionsStyles(theme), [theme])
  return (
    <View style={[styles.row, !last && styles.rowDivider]} testID={`${testID}-row`}>
      <View style={styles.rowTexts}>
        <OText preset='label' color={enabled ? 'text' : 'text_muted'} numberOfLines={2}>{title}</OText>
        {!enabled && <OText preset='body_sm' color='danger_text'>{t('UNAVAILABLE', 'Unavailable')}</OText>}
      </View>
      {!!price && <OText preset='body_sm' color='text_muted'>{price}</OText>}
      <OSwitch
        value={enabled}
        disabled={busy}
        onChange={onChange}
        accessibilityLabel={t('AVAILABLE_NAME', '_name_ available').replace('_name_', title)}
        testID={testID}
      />
    </View>
  )
}

const messageOf = (value: any): string | null => {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null
  return typeof value === 'string' ? value : null
}

/**
 * The options of one product, as `ProductOptions` draws them. The API has three levels (group, option, suboption); the
 * screen shows a section per option of every group the product uses ("Size · Choose 1") and a row per suboption with
 * its price and its switch. A suboption off is "Unavailable"; turning it off hides it in every product that uses the
 * group (the note at the end says so). Above the sections: the product's own availability switch (when the
 * controller has `handleUpdateProduct`), and a row "Option groups" that opens the check list to attach or detach
 * groups. An option with no suboptions is one row with its own switch.
 *
 * `variant='sheet'` draws the body only (the tablet's sheet has its own title and close).
 */
export const StoreProductOptionsUI = (props: any) => {
  const {
    navigation,
    productName,
    businessId,
    variant = 'screen',
    productState,
    extraOptionsState = {},
    updatingState = { extras: [], options: [], suboptions: [], products: [] },
    filteredExtras = [],
    extraSearch = '',
    handleChangeExtraSearch,
    handleLoadExtraOptions,
    handleChangeProductExtra,
    handleUpdateProduct,
    handleUpdateOption,
    handleUpdateSuboption,
    handleReload,
  } = props
  const [, t] = useLanguage()
  const [utils] = useUtils()
  const { time } = useFormats()
  const theme: any = useTheme()
  const styles = useMemo(() => optionsStyles(theme), [theme])
  const { render } = usePageSections('product_options')
  const insets = useSafeAreaInsets()
  const now = useNow()
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [saving, setSaving] = useState(false)

  const loading = !!productState?.loading
  const error = productState?.error
  const product = productState?.product
  const attachedIds: Array<number | string> = productState?.productExtraIds ?? []
  const attached = useMemo(() => (productState?.extras ?? []).filter((extra: any) => attachedIds.includes(extra.id)), [productState?.extras, attachedIds])

  // The options of every group the product uses are loaded when the product is (the controller loads one group at a time).
  useEffect(() => {
    if (loading || error) return
    attachedIds.forEach((id) => handleLoadExtraOptions?.(id))
  }, [loading, error, attachedIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const priceVisible = themeVisible(theme, 'product.options.price')
  const priceOf = (value: any) => (priceVisible && typeof utils?.parsePrice === 'function' && value !== undefined && value !== null ? `+${utils.parsePrice(Number(value))}` : undefined)

  const name = product?.name ?? productName

  const optionSections = () => attached.flatMap((extra: any) => {
    const state = extraOptionsState[extra.id]
    if (!state || state.loading) {
      return [(
        <View key={`loading-${extra.id}`} style={styles.skeleton} testID={`options-loading-${extra.id}`}>
          <SkeletonBone width='40%' height={themeText(theme, 'body_sm').lineHeight} />
          <OCard style={styles.group}>
            {[0, 1].map((index) => (
              <View key={index} style={styles.skeletonRow}>
                <SkeletonBone width='50%' height={themeText(theme, 'label').lineHeight} />
              </View>
            ))}
          </OCard>
        </View>
      )]
    }
    if (state.error) {
      return [(
        <ONotice
          key={`error-${extra.id}`}
          variant='danger'
          action={{ text: t('RETRY', 'Retry'), onPress: () => handleLoadExtraOptions?.(extra.id, true), testID: `options-retry-${extra.id}` }}
        >
          {`${extra.name}: ${messageOf(state.error) ?? t('ERROR_LOADING_PRODUCT_OPTIONS', "We couldn't load the product options")}`}
        </ONotice>
      )]
    }
    return (state.options ?? []).map((option: any) => {
      const rule = optionRule(option, t)
      const suboptions: any[] = option.suboptions ?? []
      const optionEnabled = option.enabled !== false
      return (
        <View key={`option-${extra.id}-${option.id}`} style={styles.section} testID={`option-section-${option.id}`}>
          <View style={styles.sectionHeader}>
            <SectionTitle style={styles.sectionTitle}>{rule ? `${option.name} · ${rule}` : option.name}</SectionTitle>
            {!optionEnabled && suboptions.length > 0 && <OBadge variant='neutral'>{t('DISABLED', 'Disabled')}</OBadge>}
          </View>
          <OCard style={styles.group}>
            {suboptions.length === 0
              ? (
                <OptionRow
                  title={option.name}
                  enabled={optionEnabled}
                  busy={updatingState.options.includes(option.id)}
                  last
                  onChange={(value) => handleUpdateOption?.(extra.id, option.id, value)}
                  testID={`option-switch-${option.id}`}
                />
              )
              : suboptions.map((suboption, index) => (
                <OptionRow
                  key={suboption.id}
                  title={suboption.name}
                  price={priceOf(suboption.price)}
                  enabled={suboption.enabled !== false && optionEnabled}
                  busy={updatingState.suboptions.includes(suboption.id) || !optionEnabled}
                  last={index === suboptions.length - 1}
                  onChange={(value) => handleUpdateSuboption?.(extra.id, option.id, suboption.id, value)}
                  testID={`suboption-switch-${suboption.id}`}
                />
              ))}
          </OCard>
        </View>
      )
    })
  })

  const availability = product ? availabilityOf(product, now) : { kind: 'available' as const }
  const canUpdateProduct = typeof handleUpdateProduct === 'function'
  const productBusy = !!updatingState.products?.length
  const reason = availability.kind !== 'available'
    ? `${t('UNAVAILABLE', 'Unavailable')} · ${reasonText(availability, undefined, now, t, time)}`
    : null

  const confirmPause = async (option: PauseOption) => {
    setSaving(true)
    const saved = await handleUpdateProduct(option.changes)
    setSaving(false)
    if (saved) setPausing(false)
  }

  const availabilityCard = () => {
    if (!canUpdateProduct || !product) return null
    return (
      <OCard style={styles.availability} testID='product-availability'>
        <View style={styles.availabilityTexts}>
          <OText preset='label'>{t('PRODUCT_AVAILABLE', 'Product available')}</OText>
          {reason && themeVisible(theme, 'products.unavailable_reason')
            ? (
              <Pressable accessibilityRole='button' accessibilityLabel={reason} onPress={() => setPausing(true)} style={({ pressed }) => pressed && styles.pressed} testID='product-reason'>
                <OText preset='body_sm' color='danger_text'>{reason}</OText>
              </Pressable>
            )
            : <OText preset='body_sm' color='text_muted'>{t('PRODUCT_SHOWN_IN_MENU', 'Shown in the menu')}</OText>}
        </View>
        <OSwitch
          value={availability.kind === 'available'}
          disabled={productBusy}
          onChange={(turnOn) => handleUpdateProduct(switchChanges(turnOn))}
          accessibilityLabel={t('PRODUCT_AVAILABLE', 'Product available')}
          testID='product-available-switch'
        />
      </OCard>
    )
  }

  const optionsBlock = () => {
    const sections = optionSections()
    return (
      <>
        {typeof handleChangeProductExtra === 'function' && (
          <OCard style={styles.groupsRow}>
            <OListRow
              title={t('OPTION_GROUPS', 'Option groups')}
              subtitle={t('OPTION_GROUPS_USED', '_count_ used by this product').replace('_count_', String(attachedIds.length))}
              icon='options-outline'
              last
              onPress={() => setGroupsOpen(true)}
              testID='option-groups-row'
            />
          </OCard>
        )}
        {attached.length === 0
          ? <NotFoundSource icon='options-outline' content={t('PRODUCT_WITHOUT_OPTIONS', 'This product has no options')} testID='options-empty' />
          : sections}
      </>
    )
  }

  const body = () => {
    if (loading) {
      return (
        <View style={styles.skeleton} testID='options-skeleton'>
          <OCard><SkeletonBone width='60%' height={themeText(theme, 'label').lineHeight} /></OCard>
          <SkeletonBone width='40%' height={themeText(theme, 'body_sm').lineHeight} />
          <OCard style={styles.group}>
            {[0, 1, 2].map((index) => (
              <View key={index} style={styles.skeletonRow}>
                <SkeletonBone width='50%' height={themeText(theme, 'label').lineHeight} />
              </View>
            ))}
          </OCard>
        </View>
      )
    }
    if (error) {
      return (
        <NotFoundSource
          icon='alert-circle-outline'
          content={t('ERROR_LOADING_PRODUCT_OPTIONS', "We couldn't load the product options")}
          text={messageOf(error) ?? undefined}
          btnTitle={t('RETRY', 'Retry')}
          onClickButton={() => handleReload?.()}
          actionTestID='options-retry'
          testID='options-error'
        />
      )
    }
    return (
      <>
        {render({
          availability: availabilityCard,
          options: optionsBlock,
          shared_notice: () => (attached.length > 0
            ? <ONotice variant='info' testID='options-shared-notice'>{t('OPTION_GROUP_SHARED_NOTICE', 'Turning off an option hides it in every product that uses this group.')}</ONotice>
            : null),
        })}
      </>
    )
  }

  const content = (
    <>
      {variant === 'sheet'
        // The tablet's sheet scrolls itself (`OBottomPopup padded`): its body is a plain column.
        ? <View style={styles.sheetContent}>{body()}</View>
        : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.content, { paddingBottom: themeSpace(theme, 'lg') + barBottomSpace(theme, insets.bottom) }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
          >
            {body()}
          </ScrollView>
        )}
      {groupsOpen && (
        <OptionGroupsSheet
          open
          onClose={() => setGroupsOpen(false)}
          groups={filteredExtras}
          attached={attachedIds}
          updating={updatingState.extras ?? []}
          search={extraSearch}
          onSearch={(value) => handleChangeExtraSearch?.(value)}
          onToggle={(id, attach) => handleChangeProductExtra?.(id, attach)}
        />
      )}
      {pausing && (
        <PauseOrdersSheet
          open
          kind='product'
          name={name}
          targets={[{ id: businessId ?? 0, name }]}
          onClose={() => !saving && setPausing(false)}
          onConfirm={confirmPause}
          loading={saving}
        />
      )}
    </>
  )

  if (variant === 'sheet') return <View style={styles.sheetBody}>{content}</View>

  return (
    <View style={styles.screen}>
      <ONavbar
        title={name}
        subtitle={t('OPTIONS_AND_EXTRAS', 'Options and extras')}
        onBack={() => navigation?.goBack?.()}
        testID='options-header'
      />
      {content}
    </View>
  )
}

export const StoreProductOptions = (props: any) => {
  const storeProductOptionsProps = {
    ...props,
    UIComponent: StoreProductOptionsUI,
  }
  return <StoreProductOptionsController {...storeProductOptionsProps} />
}
