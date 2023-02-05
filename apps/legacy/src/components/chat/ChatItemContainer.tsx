import { css } from '@emotion/react';
import { darken } from 'polished';
import { pX, pY, spacingN, textBase, textSm } from '../../styles/atoms';
import { bgColor, gray } from '../../styles/colors';

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

export const chatItemContainer = css`
  display: grid;
  position: relative;
  ${[pX(2), pY(1)]};
  background-color: ${chatItemBgColor};

  column-gap: ${spacingN(2)};
  row-gap: 0;
  grid-template-columns: 1.5rem auto 1fr;
  grid-template-rows: auto auto;
  grid-template-areas:
    'handle    name        .'
    'handle content content';

  &[data-no-name='true'] {
    grid-template-rows: auto;
    grid-template-areas: 'handle content content';
  }

  &[data-in-game='true'] {
    ${[textBase]};
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
