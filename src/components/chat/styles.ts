import { css } from '@emotion/core';
import { alignRight, mB, mL, pY, textLg, textSm } from '../../styles/atoms';
import { darken } from 'polished';
import { chatItemBgColor, chatItemOutGameBgColor } from './ChatItemContainer';

export const chatContentLineHeight = css`
  line-height: 1.6rem;
`;

export const itemImage = css`
  float: right;
  clear: right;
  ${[mL(1), mB(1)]};
`;

const previewStripWidth = 3;

export const previewStyle = (colorA: string, colorB: string) => css`
  background: repeating-linear-gradient(
    45deg,
    ${colorA},
    ${colorA} ${previewStripWidth}px,
    ${colorB} ${previewStripWidth}px,
    ${colorB} ${previewStripWidth * 2}px
  );
`;

export const textInGame = textLg;
export const textOutGame = textSm;
export const previewInGame = previewStyle(chatItemBgColor, darken(0.15, chatItemBgColor));
export const previewOutGame = previewStyle(chatItemOutGameBgColor, darken(0.15, chatItemOutGameBgColor));

export const nameContainer = css`
  grid-area: name;
  ${[pY(1), alignRight]};
`;
