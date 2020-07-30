import * as React from 'react';
import { css } from '@emotion/core';
import { pX, pY, roundedPx, textSm, uiShadow } from '@/styles/atoms';
import { darken, lighten } from 'polished';

interface Props {
  color: string;
  children: React.ReactNode;
  className?: string;
}

export const tagStyle = (color: string) => css`
  ${[textSm, roundedPx, pX(1), pY(0.75), uiShadow]};
  // border: 1px solid ${lighten(0.1, color)};
  background-color: ${darken(0.1, color)};
`;

function Tag({ color, children, className }: Props) {
  return (
    <span css={tagStyle(color)} className={className}>
      {children}
    </span>
  );
}

export default Tag;
