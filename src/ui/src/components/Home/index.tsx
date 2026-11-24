import React, { useState, useEffect, useMemo } from 'react';
import { DeviceEventEmitter, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useTheme } from 'styled-components/native';

import { _setStoreData } from '../../providers/StoreUtil';
import { Form, Logo, LogoFallback, Screen, Texts } from './styles';
import { themeControlHeight, themeImage, themePart, themeSpace } from '@/theme/helpers';

import { useLanguage, useApi } from '@components';
import { FieldError, IconTile, KeyboardScreen, KeyboardScrollView, OButton, OInput, OText, ScreenContainer } from '../shared';

/** The logotype's box: as wide as its image asks (4:1, docs/theme/pages-and-visibility.md section 3). */
const LOGOTYPE_RATIO = 4

// Layout only (no theme values): safe at module level.
const layout = StyleSheet.create({ fill: { flex: 1 } });

type HomeValues = { project_name: string };

/**
 * The project step of a multi-project build (`use_root_point`): the first screen of a signed-out launch, before
 * the Login, because the login methods are the project's. It looks like the Login (the page's background, the
 * store's logo, a title, one field, one button), with no photo. "Set project" saves the name
 * (`project_name`), changes the API's project and tells the app the project changed (`change_project`): the login
 * that follows saves its session and restarts the app. It goes on to the Login once the API holds the project.
 */
export const Home = (props: any) => {
  const { onNavigationRedirect } = props;

  const theme: any = useTheme();
  const insets = useSafeAreaInsets();
  const [ordering, { setOrdering }] = useApi();
  const [, t] = useLanguage();
  const { control, handleSubmit, formState: { errors } } = useForm<HomeValues>();

  const logo = themeImage(theme, 'logotype')
  const logoBox = { width: themeControlHeight(theme, 'md') * LOGOTYPE_RATIO, height: themeControlHeight(theme, 'md') }

  const content = useMemo(() => StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingHorizontal: themeSpace(theme, 'lg'),
      // Where the login's logo sits: under a header bar's room.
      paddingTop: insets.top + themePart(theme, 'header', 'base.height') + themeSpace(theme, 'lg'),
      paddingBottom: Math.max(insets.bottom, themeSpace(theme, 'lg')),
      gap: themeSpace(theme, 'lg'),
    },
  }).content, [theme, insets.top, insets.bottom]);

  const [projectName, setProjectName] = useState<any>(null);
  const [isLoadingProject, setLoadingProject] = useState(false);

  const onSubmit = (values: any) => {
    setLoadingProject(true);
    setProjectName(values);
    setOrdering({ ...ordering, project: values?.project_name });
    DeviceEventEmitter.emit('change_project', {
      setted: !!values?.project_name,
      changed: !!values?.project_name,
    });
    _setStoreData('project_name', values?.project_name);
  };

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setProjectName(null);
      setLoadingProject(false);
    }
  }, [errors]);

  useEffect(() => {
    if (ordering?.project === projectName?.project_name) {
      setLoadingProject(false);
      onNavigationRedirect('Login');
    }
  }, [ordering]);

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Screen testID='project-step'>
      <KeyboardScreen behavior='padding' style={layout.fill}>
        <ScreenContainer>
          <KeyboardScrollView contentContainerStyle={content} showsVerticalScrollIndicator={false}>
            {logo
              ? <Logo source={logo} box={logoBox} resizeMode='contain' testID='project-logo' />
              : <LogoFallback><IconTile icon='storefront-outline' size='lg' /></LogoFallback>}

            <Texts>
              <OText preset='h2' accessibilityRole='header'>{t('MANAGE_YOUR_BUSINESS', 'Manage your business')}</OText>
              <OText color='text_muted'>{t('PROJECT_STEP_TEXT', 'Enter your project name to continue.')}</OText>
            </Texts>

            <Form>
              <Controller
                control={control}
                name='project_name'
                rules={{ required: t('VALIDATION_ERROR_PROJECT_NAME_REQUIRED', 'The field project name is required') }}
                defaultValue=''
                render={({ field: { onChange, value } }) => (
                  <OInput
                    name='project_name'
                    placeholder={t('PROJECT_NAME', 'Project Name')}
                    hasError={hasErrors}
                    onChange={(e: any) => {
                      const project = e?.target?.value?.replace(/\s/g, '')
                      onChange(project)
                    }}
                    value={value}
                    returnKeyType='done'
                    autoCorrect={false}
                    autoCapitalize='none'
                    blurOnSubmit={false}
                    onSubmitEditing={() => handleSubmit(onSubmit)()}
                    isValueSync
                  />
                )}
              />
              {hasErrors && (
                <FieldError testID='home-project-error'>{errors.project_name?.message}</FieldError>
              )}
              <OButton
                text={t('SET_PROJECT', 'Set project')}
                size='lg'
                loading={isLoadingProject}
                onClick={() => handleSubmit(onSubmit)()}
              />
            </Form>
          </KeyboardScrollView>
        </ScreenContainer>
      </KeyboardScreen>
    </Screen>
  );
};
