import styled from '@emotion/styled';
import { block, minorTextColor, spacingN, textSm } from '@/styles/atoms';

export const HelpText = styled.small`
  ${[textSm, block]};
  margin: 0;
  padding: ${spacingN(1)} 0;
  line-height: 1.5em;
  color: ${minorTextColor};
`;
