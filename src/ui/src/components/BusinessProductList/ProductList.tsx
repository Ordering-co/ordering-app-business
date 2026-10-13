import React from 'react'
import { StyleSheet, View, TouchableOpacity } from 'react-native'
import { IOScrollView } from 'react-native-intersection-observer';
import { useTheme } from 'styled-components/native';
import ToggleSwitch from 'toggle-switch-react-native';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import { Placeholder, PlaceholderLine, Fade } from 'rn-placeholder';

import {
  useLanguage,
  useUtils,
  ToastType,
  useToast,
} from '@components'
import { OIcon, OText, NotFoundSource, SearchBar, OIconButton } from '@ui'

const PIXELS_TO_SCROLL = 2000

export const ProductList = (props: any) => {
  const { productsList, onClose, updateProduct, searchValue, handleChangeSearch, getCategoryProducts, onOpenProduct } = props

  const { loading, products, error } = productsList

  const theme = useTheme()
  const [{ optimizeImage }] = useUtils();
  const [, { showToast }] = useToast()
  const [, t] = useLanguage()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      marginBottom: 0
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
      marginTop: 15,
    },
    sectionTitle: {
      fontFamily: theme.fonts.special.name,
      fontWeight: '700',
      fontSize: 26,
      color: theme.colors.textGray,
    },
    btnBackArrow: {
      borderWidth: 0,
      width: 32,
      height: 32,
      tintColor: theme.colors.textGray,
      backgroundColor: theme.colors.clear,
      borderColor: theme.colors.clear,
      shadowColor: theme.colors.clear,
      paddingLeft: 0,
      paddingRight: 0,
      marginRight: 10,
    },
    logo: {
      padding: 2,
      borderRadius: 18,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1.5,
      },
      shadowOpacity: 0.21,
      shadowRadius: 3,
      elevation: 7,
    },
    icon: {
      borderRadius: 7.6,
      width: 35,
      height: 35,
      marginRight: 5
    },
    borderStyle: {
      borderColor: theme.colors.red,
      borderWidth: 0,
      borderRadius: 10,
    },
  });

  const handleSwitch = (enabled: boolean, categoryId: any, productId: any) => {
    updateProduct && updateProduct(categoryId, productId, { enabled })
  };

  const handleScroll = ({ nativeEvent }: any) => {
    const y = nativeEvent.contentOffset.y;
    const height = nativeEvent.contentSize.height;
    const hasMore = !(
      productsList.pagination.totalPages === productsList.pagination.currentPage
    );

    if (y + PIXELS_TO_SCROLL > height && !productsList.loading && hasMore && productsList?.products?.length > 0) {
      getCategoryProducts(false)
      showToast(ToastType.Info, t('LOADING_MORE_PRODUCTS', 'Loading more products'))
    }
  };

  return (
    <>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', bottom: 3 }}>
          <OIconButton
            icon={theme.images.general.arrow_left}
            borderColor={theme.colors.clear}
            iconStyle={{ width: 24, height: 24 }}
            style={styles.btnBackArrow}
            onClick={() => onClose()}
          />
          <OText style={styles.sectionTitle}>{t('PRODUCTS', 'Products')}</OText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <SearchBar
            borderStyle={styles.borderStyle}
            onSearch={handleChangeSearch}
            searchValue={searchValue}
            lazyLoad
            isCancelXButtonShow={!!searchValue}
            onCancel={() => handleChangeSearch('')}
            placeholder={t('SEARCH', 'Search')}
            containerStyle={{ width: 140, height: 40 }}
          />
        </View>
      </View>
      <IOScrollView
        style={styles.container}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {!loading && products?.length === 0 && (
          <NotFoundSource
            content={t('NO_RESULTS_FOUND', 'Sorry, no results found')}
            image={theme.images.general.notFound}
            conditioned={false}
          />
        )}
        {!loading && products?.length > 0 && (
          <View>
            {products.map((product: any, i: number) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  borderColor: theme.colors.gray100,
                  borderWidth: 1,
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 10
                }}
              >
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 36 }}
                  onPress={() => onOpenProduct && onOpenProduct(product)}
                  disabled={!onOpenProduct}
                  testID={`product-open-${product.id}`}
                  accessibilityRole="button"
                >
                  <OIcon
                    url={optimizeImage(product?.images, 'h_300,c_limit')}
                    src={!product?.images && theme?.images?.dummies?.businessLogo}
                    style={styles.icon}
                  />
                  <OText style={{ flex: 1 }} numberOfLines={2} size={16} ellipsizeMode='tail' weight={700}>{product?.name}</OText>
                  {!!onOpenProduct && (
                    <AntDesignIcon name='right' size={14} color={theme.colors.textGray} />
                  )}
                </TouchableOpacity>
                <ToggleSwitch
                  isOn={product?.enabled}
                  onColor={theme.colors.primary}
                  offColor={theme.colors.offColor}
                  size="small"
                  onToggle={(value: boolean) => handleSwitch(value, product?.category_id, product.id)}
                  disabled={loading}
                  animationSpeed={200}
                />
              </View>
            ))}
          </View>
        )}
        {loading && (
          <View>
            {[...Array(6)].map((item, i) => (
              <Placeholder key={i} Animation={Fade}>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderColor: theme.colors.gray100,
                    borderWidth: 1,
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 10
                  }}
                >
                  <PlaceholderLine width={50} />
                  <PlaceholderLine width={20} />
                </View>
              </Placeholder>
            ))}
          </View>
        )}
      </IOScrollView>
    </>
  )
}
