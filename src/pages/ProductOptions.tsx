import React from 'react'
import { SafeAreaContainerLayout, ScreenContainer, StoreProductOptions } from '@ui'

const ProductOptions = ({ navigation, route }: any) => {
  const storeProductOptionsProps = {
    navigation,
    businessId: route.params?.businessId,
    categoryId: route.params?.categoryId,
    productId: route.params?.productId,
    productName: route.params?.productName,
  }

  return (
    <SafeAreaContainerLayout>
      <ScreenContainer>
        <StoreProductOptions {...storeProductOptionsProps} />
      </ScreenContainer>
    </SafeAreaContainerLayout>
  )
}

export default ProductOptions
