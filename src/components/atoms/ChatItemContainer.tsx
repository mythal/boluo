import styled from '@emotion/styled';
import { bgColor, pX, pY, spacingN } from '@/styles/atoms';
import { darken, lighten } from 'polished';

export const timeColWidth = '2.5rem';
export const nameColWidth = '8rem';

export const ChatItemContainer = styled.div`
  display: grid;
  position: relative;
  ${[pX(2), pY(2)]};
  grid-template-columns: ${timeColWidth} ${nameColWidth} 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas: 'time name content';
  gap: ${spacingN(1)} ${spacingN(2)};
  background-color: ${bgColor};

  &[data-in-game='false'] {
    background-color: ${darken(0.035, bgColor)};
    &:hover {
      background-color: ${darken(0.015, bgColor)};
    }
  }

  & .show-on-hover {
    visibility: hidden;
  }
  &:hover .show-on-hover {
    visibility: visible;
  }

  &:hover {
    background-color: ${lighten(0.025, bgColor)};
  }
`;
