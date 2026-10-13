import styled from 'styled-components/native';

export const Header = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 15px;
  margin-bottom: 10px;
`

export const HeaderTitle = styled.View`
  flex: 1;
`

export const ExtraCard = styled.View`
  border-width: 1px;
  border-color: ${(props: any) => props.theme.colors.gray100};
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
`

export const ExtraHeader = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 12px 10px;
  background-color: ${(props: any) => props.theme.colors.white};
`

export const CheckboxButton = styled.TouchableOpacity`
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
`

export const ExtraToggle = styled.TouchableOpacity`
  flex: 1;
  flex-direction: row;
  align-items: center;
`

export const ExtraHeaderName = styled.View`
  flex: 1;
  margin-right: 10px;
`

export const OptionRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  padding-left: ${(props: any) => props.isSuboption ? '30px' : '10px'};
  border-top-width: 1px;
  border-top-color: ${(props: any) => props.theme.colors.gray100};
`

export const OptionName = styled.View`
  flex: 1;
  margin-right: 10px;
`

export const ToggleWrapper = styled.View`
  flex-direction: row;
  align-items: center;
`

export const UpdatingIndicator = styled.ActivityIndicator`
  margin-right: 8px;
`

export const RetryButton = styled.TouchableOpacity`
  padding: 4px 8px;
`

export const PlaceholderRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border-width: 1px;
  border-color: ${(props: any) => props.theme.colors.gray100};
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 10px;
`

export const EmptyWrapper = styled.View`
  margin-top: 20px;
`
