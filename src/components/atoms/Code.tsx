import styled from '@emotion/styled';
import { gray } from '../../styles/colors';
import { fontMono, mX, pX, pY, roundedSm, textSm } from '../../styles/atoms';

export const Code = styled.code`
  background-color: ${gray['900']};
  ${[roundedSm, textSm, fontMono, pX(2), pY(1), mX(1)]};
`;
