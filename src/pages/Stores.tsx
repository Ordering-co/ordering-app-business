import React, { useCallback, useState } from 'react'
import { Platform } from 'react-native'
import { useLanguage } from '@components'
import {
  BusinessProductList,
  OBottomPopup,
  PaneLayout,
  SafeAreaContainerLayout,
  ScreenContainer,
  SelectStore,
  StoreProductOptions,
  StoresList,
} from '@ui'
import { useLayout } from '@/theme/platform'


/** The fields a store row needs: its state comes from `enabled`, `open`, `schedule`, `timezone` and `snooze_until`. */
const PROPS_TO_FETCH = ['id', 'name', 'logo', 'address', 'zipcode', 'enabled', 'slug', 'open', 'schedule', 'timezone', 'snooze_until']

const Stores = ({ navigation }: any) => {
  const layout = useLayout()
  const [, t] = useLanguage()
  const [selected, setSelected] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const onSelectStore = useCallback((store: any) => setSelected((previous: any) => (previous?.slug === store?.slug ? previous : store)), [])

  const storesProps = {
    navigation,
    isSearchByName: true,
    isSearchByDescription: true,
    propsToFetch: PROPS_TO_FETCH,
    // Twenty a page: the list asks for the next one when its end is reached.
    paginationSettings: { controlType: 'infinity', initialPage: 1, pageSize: 20 },
    asDashboard: true,
    isForceSearch: Platform.OS === 'ios',
  }

  // Landscape tablet: the stores and the selected store's menu side by side; a product's options open as a sheet.
  if (layout.landscapeTablet) {
    return (
      <SafeAreaContainerLayout>
        <PaneLayout
          testID='stores-panes'
          list={<StoresList {...storesProps} onSelectStore={onSelectStore} selectedSlug={selected?.slug} />}
          detail={selected
            ? (
              <BusinessProductList
                key={selected.slug}
                navigation={navigation}
                slug={selected.slug}
                fallbackName={selected.name}
                embedded
                asDashboard
                onOpenProduct={setProduct}
              />
            )
            : <SelectStore />}
        />
        {!!product && (
          <OBottomPopup open title={product.productName || t('PRODUCT_OPTIONS', 'Product options')} closeIcon padded onClose={() => setProduct(null)}>
            <StoreProductOptions variant='sheet' {...product} />
          </OBottomPopup>
        )}
      </SafeAreaContainerLayout>
    )
  }

  return (
    <SafeAreaContainerLayout>
      <ScreenContainer>
        <StoresList {...storesProps} />
      </ScreenContainer>
    </SafeAreaContainerLayout>
  )
}

export default Stores
