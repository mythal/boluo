import styled from '@emotion/styled';
import { black } from '../../styles/colors';
import { fontMono, pX, pY, roundedSm, textSm } from '../../styles/atoms';

export const Code = styled.code`
  background-color: ${black};
  ${[roundedSm, textSm, fontMono, pX(2), pY(1)]};
`;
