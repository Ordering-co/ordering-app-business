import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { Placeholder, PlaceholderLine, Fade } from 'rn-placeholder';
import { useTheme } from 'styled-components/native';

import { IterateCategories } from './IterateCategories';
import { ProductList } from './ProductList'

import {
  ToastType,
  useToast,
  useLanguage,
  StoreProductList
} from '@components';

import { OText, OIcon, SearchBar, NotFoundSource, OIconButton } from '@ui';

const BusinessProductListUI = (props: any) => {
  const {
    navigation,
    businessState,
    productsList,
    updateStoreCategory,
    updateStoreProduct,
    productSearch,
    categorySearch,
    handleChangeCategory,
    handleChangeProductSearch,
    handleChangeCategorySearch,
    getCategoryProducts,
    categories,
    categoriesState
  } = props;

  const { loading, error, business } = businessState;

  const [, t] = useLanguage();
  const [, { showToast }] = useToast();
  const theme = useTheme();

  const [showModal, setShowModal] = useState(false)

  const handleOpenProducts = (category: any) => {
    handleChangeCategory(category)
    setShowModal(true)
  }

  useEffect(() => {
    if (error) {
      showToast(
        ToastType.Error,
        error || error[0] || t('NETWORK_ERROR', 'Network Error'),
      );
    }
  }, [loading]);

  const styles = StyleSheet.create({
    container: {
      paddingBottom: 20,
      marginBottom: 0,
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
      marginTop: 15,
    },
    sectionTitle: {
      fontWeight: '700',
      fontSize: 26,
      color: theme.colors.textGray,
      fontFamily: theme.fonts.special.name,
    },
    borderStyle: {
      borderColor: theme.colors.red,
      borderWidth: 0,
      borderRadius: 10,
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
  });

  return (
    <>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', bottom: 3 }}>
          <OIconButton
            icon={theme.images.general.arrow_left}
            borderColor={theme.colors.clear}
            iconStyle={{ width: 24, height: 24 }}
            style={styles.btnBackArrow}
            onClick={() => navigation?.canGoBack() && navigation.goBack()}
          />
          <OText style={styles.sectionTitle}>{t('CATEGORIES', 'Categories')}</OText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <SearchBar
            borderStyle={styles.borderStyle}
            onSearch={handleChangeCategorySearch}
            searchValue={categorySearch}
            lazyLoad
            isCancelXButtonShow={!!categorySearch}
            onCancel={() => handleChangeCategorySearch('')}
            placeholder={t('SEARCH', 'Search')}
            containerStyle={{ width: 140, height: 40 }}
          />
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.container}>
        {!loading && !categoriesState.loading && categories?.length === 0 && (
          <NotFoundSource
            content={t('NO_RESULTS_FOUND', 'Sorry, no results found')}
            image={theme.images.general.notFound}
            conditioned={false}
          />
        )}
        {!error && !loading && !categoriesState.loading && categories?.length > 0 && (
          <View>
            <IterateCategories
              list={categories}
              handlerClickCategory={handleOpenProducts}
              updateCategory={updateStoreCategory}
            />
          </View>
        )}
        {loading && categoriesState.loading && (
          <View>
            {[...Array(6)].map((item, i) => (
              <Placeholder key={i} Animation={Fade}>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: theme?.colors?.gray100,
                    borderRadius: 10,
                    padding: 10,
                    marginTop: 10
                  }}
                >
                  <PlaceholderLine width={50} />
                  <PlaceholderLine width={20} />
                </View>
              </Placeholder>
            ))}
          </View>
        )}
      </ScrollView>
      {showModal && (
        <View
          style={{
            flex: 1,
            position: 'absolute',
            top: 0,
            width: Dimensions.get('window').width,
            height: Dimensions.get('window').height,
            backgroundColor: theme.colors.white,
            left: 0,
            paddingHorizontal: 20,
          }}
        >
          <ProductList
            productsList={productsList}
            updateProduct={updateStoreProduct}
            searchValue={productSearch}
            handleChangeSearch={handleChangeProductSearch}
            getCategoryProducts={getCategoryProducts}
            onClose={() => setShowModal(false)}
            onOpenProduct={(product: any) => navigation?.navigate('ProductOptions', {
              businessId: business?.id,
              categoryId: product?.category_id,
              productId: product?.id,
              productName: product?.name
            })}
          />
        </View>
      )}
    </>
  );
};

export const BusinessProductList = (props: any) => {
  const businessProductListProps = {
    ...props,
    UIComponent: BusinessProductListUI,
    isIos: Platform.OS === 'ios'
  };

  return <StoreProductList {...businessProductListProps} />;
};
