import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ToggleSwitch from 'toggle-switch-react-native';
import { Placeholder, PlaceholderLine, Fade } from 'rn-placeholder';

import {
  useLanguage,
  StoreProductOptions as StoreProductOptionsController
} from '@components';

import { OText, OIconButton } from '../shared';
import { NotFoundSource } from '../NotFoundSource';

import {
  Header,
  HeaderTitle,
  ExtraCard,
  ExtraHeader,
  CheckboxButton,
  ExtraToggle,
  ExtraHeaderName,
  OptionRow,
  OptionName,
  ToggleWrapper,
  UpdatingIndicator,
  RetryButton,
  PlaceholderRow,
  EmptyWrapper
} from './styles';

const AvailabilityToggle = (props: any) => {
  const { isOn, isUpdating, onToggle, testID } = props;
  const theme = useTheme();

  return (
    <ToggleWrapper testID={testID}>
      {isUpdating && (
        <UpdatingIndicator size="small" color={theme.colors.primary} testID={`${testID}-updating`} />
      )}
      <ToggleSwitch
        isOn={!!isOn}
        onColor={theme.colors.primary}
        offColor={theme.colors.offColor}
        size="small"
        disabled={!!isUpdating}
        onToggle={onToggle}
        animationSpeed={200}
      />
    </ToggleWrapper>
  );
};

const StoreProductOptionsUI = (props: any) => {
  const {
    navigation,
    productName,
    productState,
    extraOptionsState,
    updatingState,
    handleLoadExtraOptions,
    handleChangeProductExtra,
    handleUpdateOption,
    handleUpdateSuboption,
    handleReload
  } = props;

  const { product, extras, productExtraIds, loading, error } = productState;
  const isSavingProductExtras = updatingState?.extras?.length > 0;

  const [, t] = useLanguage();
  const theme = useTheme();
  const [expandedExtras, setExpandedExtras] = useState<number[]>([]);

  const toggleExtra = (extraId: number) => {
    const isExpanded = expandedExtras.includes(extraId);
    setExpandedExtras(prev => isExpanded
      ? prev.filter(id => id !== extraId)
      : [...prev, extraId]);
    if (!isExpanded) handleLoadExtraOptions(extraId);
  };

  const disabledLabel = t('DISABLED', 'Disabled');

  return (
    <>
      <Header>
        <OIconButton
          icon={theme.images.general.arrow_left}
          borderColor={theme.colors.clear}
          iconStyle={{ width: 24, height: 24 }}
          style={{
            borderWidth: 0,
            width: 32,
            height: 32,
            backgroundColor: theme.colors.clear,
            paddingLeft: 0,
            paddingRight: 0,
            marginRight: 10
          }}
          onClick={() => navigation?.canGoBack() && navigation.goBack()}
        />
        <HeaderTitle>
          <OText
            size={22}
            weight={700}
            numberOfLines={1}
            color={theme.colors.textGray}
            style={{ fontFamily: theme.fonts.special.name }}
          >
            {product?.name ?? productName ?? t('PRODUCT_OPTIONS', 'Product options')}
          </OText>
          <OText size={13} color={theme.colors.textSecondary}>
            {t('PRODUCT_OPTIONS', 'Product options')}
          </OText>
        </HeaderTitle>
      </Header>

      {loading && (
        <View testID="product-options-loading">
          {[...Array(5)].map((_, i) => (
            <Placeholder key={i} Animation={Fade}>
              <PlaceholderRow>
                <PlaceholderLine width={50} noMargin />
                <PlaceholderLine width={15} noMargin />
              </PlaceholderRow>
            </Placeholder>
          ))}
        </View>
      )}

      {!loading && !!error && (
        <EmptyWrapper>
          <NotFoundSource
            content={t('ERROR_LOADING_PRODUCT_OPTIONS', 'We couldn\'t load the product options')}
            image={theme.images.general.notFound}
            conditioned={false}
            btnTitle={t('RETRY', 'Retry')}
            onClickButton={handleReload}
          />
        </EmptyWrapper>
      )}

      {!loading && !error && extras?.length === 0 && (
        <EmptyWrapper>
          <NotFoundSource
            content={t('PRODUCT_WITHOUT_OPTIONS', 'This product has no options')}
            image={theme.images.general.notFound}
            conditioned={false}
          />
        </EmptyWrapper>
      )}

      {!loading && !error && extras?.length > 0 && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {extras.map((extra: any) => {
            const isExpanded = expandedExtras.includes(extra.id);
            const groupState = extraOptionsState?.[extra.id];
            const groupOptions = groupState?.options ?? [];
            const isAttached = !!productExtraIds?.includes(extra.id);
            const isSavingGroup = !!updatingState?.extras?.includes(extra.id);
            return (
              <ExtraCard key={extra.id}>
                <ExtraHeader>
                  <CheckboxButton
                    onPress={() => handleChangeProductExtra(extra.id, !isAttached)}
                    disabled={isSavingProductExtras}
                    testID={`extra-checkbox-${extra.id}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isAttached, disabled: isSavingProductExtras }}
                  >
                    {isSavingGroup ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} testID={`extra-checkbox-${extra.id}-saving`} />
                    ) : (
                      <MaterialCommunityIcons
                        name={isAttached ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={24}
                        color={isAttached ? theme.colors.primary : theme.colors.mediumGray}
                      />
                    )}
                  </CheckboxButton>
                  <ExtraToggle
                    onPress={() => toggleExtra(extra.id)}
                    testID={`extra-${extra.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                  >
                    <ExtraHeaderName>
                      <OText size={16} weight={700} numberOfLines={2}>{extra.name}</OText>
                      {extra.enabled === false && (
                        <OText size={12} color={theme.colors.textSecondary}>{disabledLabel}</OText>
                      )}
                    </ExtraHeaderName>
                    <AntDesignIcon
                      name={isExpanded ? 'down' : 'right'}
                      size={16}
                      color={theme.colors.textGray}
                    />
                  </ExtraToggle>
                </ExtraHeader>
                {isExpanded && groupState?.loading && (
                  <OptionRow>
                    <UpdatingIndicator size="small" color={theme.colors.primary} testID={`extra-${extra.id}-loading`} />
                  </OptionRow>
                )}
                {isExpanded && !groupState?.loading && !!groupState?.error && (
                  <OptionRow>
                    <OptionName>
                      <OText size={14} color={theme.colors.textSecondary}>
                        {t('ERROR_LOADING_PRODUCT_OPTIONS', 'We couldn\'t load the product options')}
                      </OText>
                    </OptionName>
                    <RetryButton
                      onPress={() => handleLoadExtraOptions(extra.id, true)}
                      testID={`extra-${extra.id}-retry`}
                      accessibilityRole="button"
                    >
                      <OText size={14} weight={600} color={theme.colors.primary}>{t('RETRY', 'Retry')}</OText>
                    </RetryButton>
                  </OptionRow>
                )}
                {isExpanded && groupState?.loaded && groupOptions.length === 0 && (
                  <OptionRow>
                    <OText size={14} color={theme.colors.textSecondary}>
                      {t('NO_OPTIONS_IN_GROUP', 'This group has no options')}
                    </OText>
                  </OptionRow>
                )}
                {isExpanded && groupState?.loaded && groupOptions.map((option: any) => (
                  <View key={option.id}>
                    <OptionRow>
                      <OptionName>
                        <OText size={15} weight={600} numberOfLines={2}>{option.name}</OText>
                        {!option.enabled && (
                          <OText size={12} color={theme.colors.textSecondary}>{disabledLabel}</OText>
                        )}
                      </OptionName>
                      <AvailabilityToggle
                        isOn={option.enabled}
                        isUpdating={updatingState?.options?.includes(option.id)}
                        onToggle={(value: boolean) => handleUpdateOption(extra.id, option.id, value)}
                        testID={`option-toggle-${option.id}`}
                      />
                    </OptionRow>
                    {option.suboptions?.map((suboption: any) => (
                      <OptionRow key={suboption.id} isSuboption>
                        <OptionName>
                          <OText size={14} numberOfLines={2}>{suboption.name}</OText>
                          {!suboption.enabled && (
                            <OText size={12} color={theme.colors.textSecondary}>{disabledLabel}</OText>
                          )}
                        </OptionName>
                        <AvailabilityToggle
                          isOn={suboption.enabled}
                          isUpdating={updatingState?.suboptions?.includes(suboption.id)}
                          onToggle={(value: boolean) => handleUpdateSuboption(extra.id, option.id, suboption.id, value)}
                          testID={`suboption-toggle-${suboption.id}`}
                        />
                      </OptionRow>
                    ))}
                  </View>
                ))}
              </ExtraCard>
            );
          })}
        </ScrollView>
      )}
    </>
  );
};

export const StoreProductOptions = (props: any) => {
  const storeProductOptionsProps = {
    ...props,
    UIComponent: StoreProductOptionsUI
  };

  return <StoreProductOptionsController {...storeProductOptionsProps} />;
};
