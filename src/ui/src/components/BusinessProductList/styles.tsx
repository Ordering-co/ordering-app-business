import styled from 'styled-components/native';

export const CategoryTab = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-left: ${(props: any) => props.isSpace ? '10px' : '0px'};
`
