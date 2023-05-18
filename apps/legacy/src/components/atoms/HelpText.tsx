import styled from '@emotion/styled';
import { block, spacingN, textSm } from '../../styles/atoms';
import { minorTextColor } from '../../styles/colors';

export const HelpText = styled.small`
  ${[textSm, block]};
  margin: 0;
  padding: ${spacingN(1)} 0;
  line-height: 1.5em;
  color: ${minorTextColor};
`;
