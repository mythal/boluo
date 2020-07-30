import styled from '@emotion/styled';
import { errorColor, textSm } from '@/styles/atoms';
import { lighten } from 'polished';

export const ErrorMessage = styled.p`
  margin: 0;
  ${textSm};
  color: ${lighten(0.5, errorColor)};
`;
