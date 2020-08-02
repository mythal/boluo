import styled from '@emotion/styled';
import { pX, pY, spacingN } from '@/styles/atoms';

export const ChatItemContainer = styled.div`
  display: grid;
  ${[pX(2), pY(1)]};
  grid-template-columns: 8rem 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'name content'
    'time content';
  gap: ${spacingN(1)} ${spacingN(2)};
`;
