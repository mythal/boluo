import styled from '@emotion/styled';
import { textSm } from '@/styles/atoms';
import { lighten } from 'polished';
import { errorColor } from '@/styles/colors';

export const ErrorMessage = styled.p`
  margin: 0;
  ${textSm};
  color: ${lighten(0.5, errorColor)};
`;
