import React, { useState, createContext } from 'react';
import { Platform } from 'react-native';
import {
  checkMultiple,
  PERMISSIONS,
  requestMultiple,
  RESULTS
} from 'react-native-permissions';
import DeviceInfo from "react-native-device-info";

type PermissionsContextProps = {
  permissions: any;
  isGrantedPermissions: Boolean;
  askBluetoothPermission: () => void;
  checkBluetoothPermission: () => void;
  getPermissions: () => [];
  askNotificationsPermission?: () => void;
};

export const PermissionsContext = createContext({} as PermissionsContextProps);

export const PermissionsProvider = ({ children }: any) => {
  const [permissions, setPermissions] = useState({});
  const AndroidVersion: any = Platform.OS === 'android' && DeviceInfo.getSystemVersion()
  const isNewAndroidVersion = AndroidVersion >= 12

  const getPermissions = () => {
    const permissions: any = []
    if (isNewAndroidVersion) {
      permissions.push(PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE)
      permissions.push(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT)
      permissions.push(PERMISSIONS.ANDROID.BLUETOOTH_SCAN)
    }
    return permissions
  }

  const askBluetoothPermission = async () => {
    let permissionStatus: any;
    permissionStatus = await requestMultiple(getPermissions())
    setPermissions(permissionStatus);

    return permissionStatus;
  };

  const checkBluetoothPermission = async () => {
    let permissionStatus: any;
    permissionStatus = await checkMultiple(getPermissions());
    setPermissions(permissionStatus);
  };

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        askBluetoothPermission,
        checkBluetoothPermission,
        getPermissions,
        isGrantedPermissions: Object.values(permissions).every(p => p === RESULTS.GRANTED)
      }}>
      {children}
    </PermissionsContext.Provider>
  );
};
