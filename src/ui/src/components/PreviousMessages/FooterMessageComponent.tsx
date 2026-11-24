import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { useTheme } from 'styled-components/native'
import { useLanguage } from '@components'
import { OButton } from '../shared'
import { MessageListSkeleton } from './MessageListSkeleton'
import { themeSpace } from '@/theme/helpers'

/** The end of the messages list: the rows loading next, or the button that asks for them. */
export const FooterComponent = (props: any) => {
  const {
    loading,
    reload,
    pagination,
    loadMore,
    skeletonCount = 2,
    showMore = true,
  } = props

  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = useMemo(() => StyleSheet.create({
    more: { marginTop: themeSpace(theme, 'xs'), marginBottom: themeSpace(theme, 'sm') },
  }), [theme])

  return (
    <>
      {(loading || reload) && skeletonCount > 0 && (
        <MessageListSkeleton count={skeletonCount} />
      )}

      {showMore && pagination?.totalPages &&
        !loading &&
        !reload &&
        pagination?.currentPage < pagination?.totalPages && (
          <View style={styles.more}>
            <OButton
              onClick={() => loadMore && loadMore()}
              text={t('LOAD_MORE_ORDERS', 'Load more orders')}
              testID='messages-load-more'
            />
          </View>
        )}
    </>
  )
}
