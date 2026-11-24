import * as React from 'react';
import { LogBox } from 'react-native';
import { hideSplash } from '@/utils/splash';

import sourceSettings from './config.json';
import { ProjectSetupGate } from './onboarding/project-setup-gate';
import { LocalSimulatorBanner } from './onboarding/local-simulator-banner';
import AppContainer from './AppContainer';
import { PermissionsProvider } from './context/PermissionsContext';
import { BottomBarProvider } from './context/BottomBarContext';

import { OrderingProvider } from '@components';
import { OToast, ConfirmDialogHost, OAlertOriginal as Alert, StoreMethods, OfflineActionsProvider } from '@ui';
import { AppThemeProvider, RemoteThemeLoader, readCachedTheme } from './theme/AppThemeContext';
import type { ThemeEnvelope } from './theme/engine';
import { ThemedStatusBar } from './theme/navigation';

const { _retrieveStoreData, _removeStoreData } = StoreMethods

LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered.',
  'Non-serializable values were found in the navigation state.',
  'Setting a timer',
  'The `value` prop is required for the `<Context.Provider>`',
  "Can't perform a React state update",
  'Remote debugger',
  'Task orphaned for request',
  "JSON value '<null>'",
  'VirtualizedLists should never be nested',
  'Could not receive settings from Segment',
  'No info about this app',
  'ViewPropTypes will be removed',
  'EdgeInsetsPropTypes will be removed',
  'EdgeInsetsPropType will be removed',
  'PointPropTypes will be removed',
  'PointPropType will be removed',
  'ColorPropType will be removed'
]);

const BusinessAppContent = ({ settings }: { settings: typeof sourceSettings }) => {
  const [configStore, setConfigStore] = React.useState({ loading: settings.use_root_point })
  const [configFile, setConfigFile] = React.useState<any>(settings)
  // The last served theme of the project (undefined until it is read): painted from the first frame.
  const [cachedTheme, setCachedTheme] = React.useState<ThemeEnvelope | null | undefined>(undefined)

  const manageProjectAction = async () => {
    let project: any = null
    try {
      setConfigStore({ ...configStore, loading: true })
      // A single-project build knows its project already: its cached theme is read
      // while the stored project name is cleared, not after.
      let cleared: Promise<any> | null = null
      if (settings.use_root_point) {
        project = await _retrieveStoreData('project_name')
      } else {
        cleared = Promise.resolve(_removeStoreData('project_name')).catch(() => {})
      }

      if (project) {
        setConfigFile({ ...configFile, project })
        configFile.project = project
      }
      const [cached] = await Promise.all([readCachedTheme(configFile.project), cleared])
      setCachedTheme(cached)
      setConfigStore({ ...configFile, loading: false })
    } catch (error) {
      setCachedTheme(null)
      setConfigStore({ ...configFile, loading: false })
    }
  }

  React.useEffect(() => {
    manageProjectAction()
  }, []);

  React.useEffect(() => {
    // Not before the cached theme is read: the first frame already paints it.
    if (cachedTheme !== undefined && (!configStore.loading || !settings.use_root_point)) {
      hideSplash();
    }
  }, [configStore, cachedTheme]);

  // Nothing is painted until the cached theme is read: the native splash stays up meanwhile.
  if (cachedTheme === undefined) return null

  return (
    <AppThemeProvider initialEnvelope={cachedTheme}>
      {/* The one status bar: its content follows the theme's background. */}
      <ThemedStatusBar />
      <OrderingProvider settings={configFile} Alert={Alert} isDisableToast={true}>
        <RemoteThemeLoader project={configFile.project} appId={settings.app_id} />
        <OfflineActionsProvider>
          <PermissionsProvider>
            <BottomBarProvider>
              <LocalSimulatorBanner project={configFile.project}>
                <AppContainer />
              </LocalSimulatorBanner>
              <OToast />
              {/* The themed confirmations and notices (`useConfirm`, `OAlertOriginal`): one host, at the root. */}
              <ConfirmDialogHost />
            </BottomBarProvider>
          </PermissionsProvider>
        </OfflineActionsProvider>
      </OrderingProvider>
    </AppThemeProvider>
  );
};

const BusinessApp = () => (
  <ProjectSetupGate settings={sourceSettings}>
    {settings => <BusinessAppContent settings={settings} />}
  </ProjectSetupGate>
);

export default BusinessApp;
