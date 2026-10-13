import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';
import { OIcon, OText } from '../shared';
import { _retrieveStoreData, _clearStoreData } from '../../providers/StoreUtil';
import { LogoutAction, useLanguage } from '@components';

const LogoutButtonUI = (props: any) => {
  const { handleLogoutClick, setRootState } = props;
  const [, t] = useLanguage();
  const theme = useTheme();

  const handleClick = async () => {
    const data = await _retrieveStoreData('notification_state');
    const res = await handleLogoutClick(data);
    if (res) {
      _clearStoreData({ excludedKeys: ['isTutorial', 'language'] });
      setRootState && setRootState({ isAuth: false, token: null })
    }
  };

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      flexDirection: 'row',
      marginBottom: 30,
      marginTop: 10,
    },
    text: {
      color: theme.colors.textGray,
      fontWeight: '700',
      fontSize: 16,
      marginRight: 10,
    },
  });

  return (
    <TouchableOpacity style={styles.container} onPress={() => handleClick()}>
      <OText space style={styles.text}>
        {t('LOGOUT', 'Logout')}
      </OText>

      <OIcon
        src={theme.images.general.menulogout}
        width={18}
        height={18}
        color={theme.colors.disabledContrast}
      />
    </TouchableOpacity>
  );
};

export const LogoutButton = (props: any) => {
  const logoutProps = {
    ...props,
    isNative: true,
    UIComponent: LogoutButtonUI,
  };

  return <LogoutAction {...logoutProps} />;
};
