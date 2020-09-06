import * as React from 'react';
import { css } from '@emotion/core';
import { p, roundedSm, spacingN, textBase } from '../../styles/atoms';
import { black } from '../../styles/colors';

export interface TooltipProps {
  children: React.ReactNode;
  className?: string;
  x?: 'left' | 'center' | 'right';
}

const arrowSize = '0.5rem';

const tooltip = css`
  ${[p(2), roundedSm, textBase]};
  position: absolute;
  left: 50%;
  top: ${spacingN(-1)};
  z-index: 100;
  transform: translate(-50%, -100%);
  border: 1px solid ${black};
  background-color: ${black};

  &::after {
    content: '';
    position: absolute;
    display: block;
    left: 50%;
    top: 100%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-top: ${arrowSize} solid ${black};
    border-left: ${arrowSize} solid transparent;
    border-right: ${arrowSize} solid transparent;
    border-bottom: ${arrowSize} solid transparent;
  }
  &[data-x='left'] {
    left: 100%;
    transform: translate(-100%, -100%);

    &::after {
      left: unset;
      right: 0;
    }
  }
`;

const inner = css`
  display: inline-block;
  width: max-content;
  max-width: 10rem;
`;

function Tooltip({ children, className, x = 'center' }: TooltipProps) {
  return (
    <div css={tooltip} className={className} data-x={x}>
      <div css={inner}>{children}</div>
    </div>
  );
}

export default Tooltip;
