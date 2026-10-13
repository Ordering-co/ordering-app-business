import React, { useState } from 'react';
import { Platform, Dimensions, StatusBar, View } from 'react-native';
import styled, { css, useTheme } from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ContainerStyled = styled.ScrollView`
  flex: 1;
  ${(props: any) =>
    !props.noPadding &&
    css`
      padding: ${Platform.OS === 'ios' && props.orientation === 'Portrait'
        ? '0px 20px 20px'
        : '20px'};
    `}
  background-color:  ${(props: any) => props.theme.colors.backgroundPage};
`;

export const Container = (props: any) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [orientation, setOrientation] = useState(
    Dimensions.get('window').width < Dimensions.get('window').height
      ? 'Portrait'
      : 'Landscape',
  );

  Dimensions.addEventListener('change', ({ window: { width, height } }) => {
    if (width < height) {
      setOrientation('Portrait');
    } else {
      setOrientation('Landscape');
    }
  });

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.backgroundPage,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        props.style,
      ]}
    >
      <StatusBar
        backgroundColor={props?.style?.backgroundColor || 'transparent'}
        barStyle={props?.barStyle || 'dark-content'}
        translucent={props?.translucent || false}
        showHideTransition="fade"
        animated
      />
      <ContainerStyled
        contentContainerStyle={props.style}
        keyboardShouldPersistTaps="handled"
        orientation={orientation}
        ref={props?.forwardRef}
        noPadding={props?.noPadding}
      >
        {props.children}
      </ContainerStyled>
    </View>
  );
};
