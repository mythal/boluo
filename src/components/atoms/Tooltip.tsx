import * as React from 'react';
import { css } from '@emotion/core';
import { p, roundedPx, spacingN } from '@/styles/atoms';

interface Props {
  children: React.ReactNode;
  className?: string;
}

const tooltip = css`
  ${[p(2), roundedPx]};
  position: absolute;
  left: 50%;
  top: ${spacingN(-2)};
  z-index: 100;
  transform: translate(-50%, -100%);
  background-color: black;
`;

const inner = css`
  display: inline-block;
  width: max-content;
  max-width: 10rem;
`;

function Tooltip({ children, className }: Props) {
  return (
    <div css={tooltip} className={className}>
      <div css={inner}>{children}</div>
    </div>
  );
}

export default Tooltip;
