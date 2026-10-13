import styled from "styled-components/native";

export const Container = styled.View`
  margin-bottom: 50px;
`

export const TitleGroups = styled.View`
  align-items: center;
  flex-direction: row;
  min-height: 33px;
`

export const BackButton = styled.TouchableOpacity`
  border-width: 0;
  width: 32px;
  height: 32px;
  tint-color: ${(props: any) => props.theme.colors.textGray};
  background-color: ${(props: any) => props.theme.colors.clear};
  border-color: ${(props: any) => props.theme.colors.clear};
  shadow-color: ${(props: any) => props.theme.colors.clear};
  padding-left: 0px;
  padding-right: 0px;
`
