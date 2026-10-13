import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';

import { useApi } from '@components';
import {
  SafeAreaContainerLayout,
  BusinessProductList,
} from '@ui';

const BusinessProductListing = ({ navigation, route }: any) => {
  const theme = useTheme();
  const [ordering] = useApi();

  const businessProductListProps = {
    navigation,
    ordering,
    slug: route.params?.slug,
    businessProps: ['id', 'categories'],
    asDashboard: true,
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
      <BusinessProductList {...businessProductListProps} />
    </SafeAreaContainerLayout>
  );
};

export default BusinessProductListing;
