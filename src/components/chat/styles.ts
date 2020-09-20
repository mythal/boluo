import { css } from '@emotion/core';
import { fontMono, fontNormal, m, mB, mL, pX, pY, roundedSm, textLg, textSm, uiShadow } from '../../styles/atoms';
import { darken } from 'polished';
import { chatItemBgColor, chatItemOutGameBgColor } from './ChatItemContainer';
import { black, gray, primary } from '../../styles/colors';

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
`;

export const chatSplitLine = css`
  // border-left: 1px solid ${gray['700']};
`;
export const sidebarButtonPrimary = css`
  background-color: ${primary['600']};
  &:hover {
    background-color: ${primary['500']};
  }
  &:active {
    background-color: ${primary['700']};
  }
`;

export const floatPanel = css`
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(1px);
  ${[roundedSm, uiShadow]};
`;

export const codeBlockStyle = css`
  background-color: ${black};
  ${[roundedSm, textSm, fontNormal, fontMono, pX(2), pY(1), m(0)]};
`;
