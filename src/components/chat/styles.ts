import { css } from '@emotion/core';
import {
  fontMono,
  fontNormal,
  headerShadow,
  m,
  mB,
  mL,
  pX,
  pY,
  roundedSm,
  spacingN,
  textLg,
  textSm,
  uiShadow,
} from '../../styles/atoms';
import { darken } from 'polished';
import { chatItemBgColor, chatItemOutGameBgColor } from './ChatItemContainer';
import { black, gray, headerBgColor, primary } from '../../styles/colors';

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
export const chatRight = css`
  grid-row: header-start / compose-end;
`;
export const chatHeaderPadding = css`
  ${[pX(2), pY(1.5)]};
`;
export const sidebarWidth = css`
  min-width: 200px;
  max-width: 200px;
`;
export const chatHeaderStyle = css`
  background-color: ${headerBgColor};
  ${[chatHeaderPadding]};
  grid-row: header-start / header-end;
  z-index: 6;
  ${headerShadow};
  display: grid;
  height: 100%;
  column-gap: ${spacingN(1)};
  align-items: center;
  justify-content: stretch;
  grid-template-columns: auto 1fr auto;
  grid-template-areas: 'title topic toolbar';
`;
export const chatHeaderToolbar = css`
  height: 100%;
  grid-area: toolbar;
`;
