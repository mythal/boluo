import styled from '@emotion/styled';
import { pX, pY, spacingN } from '../../styles/atoms';
import { darken, lighten } from 'polished';
import { bgColor } from '../../styles/colors';

export const timeColWidth = '3.5rem';
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

  & .handle {
    opacity: 30%;
  }

  &:hover {
    .time {
      filter: brightness(150%);
    }
    .handle {
      opacity: 100%;
    }
  }

  &[data-moving='true'] {
    filter: blur(2px);
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
