import styled from '@emotion/styled';
import { lighten } from 'polished';
import { textSm } from '../../styles/atoms';
import { errorColor } from '../../styles/colors';

export const ErrorMessage = styled.p`
  margin: 0;
  ${textSm};
  color: ${lighten(0.5, errorColor)};
`;
