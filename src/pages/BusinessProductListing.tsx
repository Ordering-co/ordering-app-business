import React from 'react'
import { BusinessProductList, SafeAreaContainerLayout, ScreenContainer } from '@ui'

const BusinessProductListing = ({ navigation, route }: any) => {
  const businessProductListProps = {
    navigation,
    slug: route.params?.slug,
    fallbackName: route.params?.name,
    businessProps: ['id', 'name', 'categories', 'timezone', 'schedule'],
    asDashboard: true,
  }

  return (
    <SafeAreaContainerLayout>
      <ScreenContainer>
        <BusinessProductList {...businessProductListProps} />
      </ScreenContainer>
    </SafeAreaContainerLayout>
  )
}

export default BusinessProductListing
