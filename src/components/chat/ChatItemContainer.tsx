import { pX, pY, spacingN, textLg, textSm } from '../../styles/atoms';
import { darken, lighten } from 'polished';
import { bgColor } from '../../styles/colors';
import { css } from '@emotion/core';

export const timeColWidth = '3.5rem';
export const nameColWidth = '8rem';

export const chatItemBgColor = lighten(0.03, bgColor);
export const chatItemHoverBgColor = lighten(0.05, bgColor);
export const chatItemOutGameBgColor = darken(0.05, bgColor);
export const chatItemOutGameHoverBgColor = darken(0.015, bgColor);

export const chatItemPlaceHolder = css`
  background-color: ${chatItemBgColor};
  &:hover {
    background-color: ${chatItemHoverBgColor};
  }
  &[data-in-game='false'] {
    background-color: ${chatItemOutGameBgColor};
    &:hover {
      background-color: ${chatItemOutGameHoverBgColor};
    }
  }
`;

export const chatItemContainer = css`
  display: grid;
  position: relative;
  ${[pX(2), pY(2)]};
  grid-template-columns: ${timeColWidth} ${nameColWidth} 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas: 'time name content';
  gap: ${spacingN(1)} ${spacingN(2)};
  background-color: ${chatItemBgColor};
  &[data-in-game='true'] {
    ${textLg};
  }

  &[data-in-game='false'] {
    background-color: ${chatItemOutGameBgColor};
    ${textSm};
    &:hover {
      background-color: ${chatItemOutGameHoverBgColor};
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
    pointer-events: none;
  }

  & .show-on-hover {
    visibility: hidden;
  }
  &:hover .show-on-hover {
    visibility: visible;
  }

  &:hover {
    background-color: ${chatItemHoverBgColor};
  }
`;
