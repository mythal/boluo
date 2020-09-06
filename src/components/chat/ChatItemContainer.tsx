import { pX, textLg, textSm } from '../../styles/atoms';
import { darken } from 'polished';
import { bgColor, gray } from '../../styles/colors';
import { css } from '@emotion/core';

export const timeColWidth = '1.5rem';
export const nameColWidth = '9rem';

export const chatItemBgColor = gray['800'];
export const chatItemHoverBgColor = darken(0.05, gray['800']);
export const chatItemOutGameBgColor = bgColor;
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

export const itemMinHeight = 42;

export const chatItemContainer = css`
  display: grid;
  position: relative;
  ${[pX(2)]};
  min-height: ${itemMinHeight}px;
  grid-template-columns: ${timeColWidth} ${nameColWidth} 1fr;
  grid-template-areas: 'time name content';
  background-color: ${chatItemBgColor};
  &[data-in-game='true'] {
    ${[textLg]};
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
