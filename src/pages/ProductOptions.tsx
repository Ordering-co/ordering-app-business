import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';

import {
  SafeAreaContainerLayout,
  StoreProductOptions,
} from '@ui';

const ProductOptions = ({ navigation, route }: any) => {
  const theme = useTheme();

  const storeProductOptionsProps = {
    navigation,
    businessId: route.params?.businessId,
    categoryId: route.params?.categoryId,
    productId: route.params?.productId,
    productName: route.params?.productName,
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.backgroundPage,
    },
  });

  return (
    <SafeAreaContainerLayout
      style={styles.container}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StoreProductOptions {...storeProductOptionsProps} />
    </SafeAreaContainerLayout>
  );
};

export default ProductOptions;
