import styled from '@emotion/styled';
import { bgColor, pX, pY, spacingN } from '@/styles/atoms';
import { darken } from 'polished';

export const ChatItemContainer = styled.div`
  display: grid;
  ${[pX(2), pY(1)]};
  grid-template-columns: 8rem 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'name content'
    'time content';
  gap: ${spacingN(1)} ${spacingN(2)};

  &[data-in-game='false'] {
    background-color: ${darken(0.035, bgColor)};
  }
`;
