import { css } from '@emotion/react';
import { lighten } from 'polished';
import * as React from 'react';
import { pX, pY, textXs } from '../../styles/atoms';
import { gray } from '../../styles/colors';

interface Props {
  color?: string;
  children: React.ReactNode;
  className?: string;
}

export const tagStyle = (color: string) =>
  css`
  ${[textXs, pX(1.5), pY(0.25)]};
  border-left: 2px solid ${lighten(0.1, color)};
  background-color: ${color};
  border-top-right-radius: 2px;
  border-bottom-right-radius: 2px;
  display: inline-block;
  white-space: nowrap;
`;

function Badge({ color = gray['700'], children, className }: Props) {
  return (
    <span css={tagStyle(color)} className={className}>
      {children}
    </span>
  );
}

export default Badge;
