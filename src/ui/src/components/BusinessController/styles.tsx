import styled from 'styled-components/native';

export const Card = styled.View`
  flex: 1;
  justify-content: center;
  align-items: flex-start;
  flex-direction: row;
  margin-bottom: 20px;
  min-height: 64px;
  border-width: 1px;
  border-color: ${({ theme }: any) => theme.colors.gray100};
  border-radius: 10px;
  padding: 10px;
`;

export const Information = styled.View`
  margin-horizontal: 10px;
  flex: 1;
`;

export const Logo = styled.View`
  min-height: 52px;
`;
