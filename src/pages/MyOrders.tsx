import React, { useRef } from 'react'
import { useNetInfo } from '@react-native-community/netinfo'
import { useTheme } from 'styled-components/native'

import * as ui from '@ui'
import { OrdersOption, SafeAreaContainerLayout, ScreenContainer } from '@ui'
import { themeVisible } from '@/theme/helpers'
import { useLayout } from '@/theme/platform'
import { KeptSearchContext, type KeptSearch } from '../ui/src/components/OrdersOption/keptSearch'

/**
 * The Orders tab. On a phone, and on a tablet in portrait, the list (tabs New / In progress / History, in the
 * column of `screen.max_width`); on a tablet turned sideways with the board on (`orders.board`) the kitchen board of
 * area `ordersLive` (`OrdersBoard`), which receives the same props. The board is looked up by name so this page
 * works before that area exports it: without it the list is drawn. A search in use survives turning the tablet (the other
 * layout is another screen with its own controller): the page keeps it in a box both read (`KeptSearchContext`).
 */
const MyOrders = (props: any) => {
  const { navigation, route } = props
  const theme = useTheme()
  const netInfo = useNetInfo()
  const { landscapeTablet } = useLayout()
  const keptSearch = useRef<KeptSearch | null>(null)

  const MyOrderProps = {
    navigation,
    // The tab the shell asks for (`openOrdersTab`: the alert's "View orders", a push): `{ tab, stage?, at }` in the route's params (`stage`: the chip of New).
    tabRequest: route?.params?.at ? route.params : undefined,
    onNavigationRedirect: (page: string, params: any) => {
      if (!page) return
      navigation.navigate(page, params)
    },
    paginationSettings: {
      initialPage: 1,
      pageSize: 50,
      controlType: 'infinity'
    },
    // The real connectivity: the list shows the offline notice and its copy of the lists when it is false.
    isNetConnected: netInfo.isConnected,
    isBusinessApp: true,
    useDefualtSessionManager: true,
    checkNotification: true
  }

  const Board = (ui as { OrdersBoard?: React.ComponentType<any> }).OrdersBoard
  const board = landscapeTablet && themeVisible(theme, 'orders.board') && !!Board

  return (
    <SafeAreaContainerLayout>
      <KeptSearchContext.Provider value={keptSearch}>
        {board && Board
          ? <Board {...MyOrderProps} />
          : (
            <ScreenContainer>
              <OrdersOption {...MyOrderProps} />
            </ScreenContainer>
            )}
      </KeptSearchContext.Provider>
    </SafeAreaContainerLayout>
  )
}

export default MyOrders
