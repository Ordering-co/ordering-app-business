import React, { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Canvas from 'react-native-canvas'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { themeColor, themeRadius, themeSpace } from '@/theme/helpers'
import { OSpinner, OText } from '../shared'

interface Props {
  canvasRef: React.MutableRefObject<any>
  ctxRef: React.MutableRefObject<any>
  /** A Star printer in bitmap mode (the TSP100) will print: mount the canvas its picture is drawn on. */
  bitmap: boolean
  /** Show the "Printing ticket..." banner (an automatic print is running). */
  banner: boolean
}

/**
 * What `usePrinting()` asks a screen to render once: the canvas a TSP100's ticket picture is drawn on (hidden, and only
 * mounted when a saved printer needs it: it is a web view) and the banner of an automatic print.
 */
export const PrintingHost = ({ canvasRef, ctxRef, bitmap, banner }: Props) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const styles = useMemo(() => StyleSheet.create({
    canvas: { position: 'absolute', top: 0, left: 0, opacity: 0 },
    banner: {
      position: 'absolute',
      top: themeSpace(theme, 'sm'),
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: themeSpace(theme, 'sm'),
      paddingVertical: themeSpace(theme, 'sm'),
      paddingHorizontal: themeSpace(theme, 'md'),
      borderRadius: themeRadius(theme, 'full', { fixed: true }),
      backgroundColor: themeColor(theme, 'inverse_surface'),
      zIndex: 10
    }
  }), [theme])

  useEffect(() => {
    if (bitmap && canvasRef.current) ctxRef.current = canvasRef.current.getContext('2d')
    if (!bitmap) ctxRef.current = null
  }, [bitmap, canvasRef, ctxRef])

  return (
    <>
      {banner && (
        <View style={styles.banner} pointerEvents='none' testID='printing-banner'>
          <OSpinner size='sm' color='on_inverse' />
          <OText preset='body_sm' color='on_inverse'>{t('PRINTING_TICKET', 'Printing ticket...')}</OText>
        </View>
      )}
      {bitmap && (
        <View style={styles.canvas} pointerEvents='none'>
          <Canvas ref={canvasRef} />
        </View>
      )}
    </>
  )
}
