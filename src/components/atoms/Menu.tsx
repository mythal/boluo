import * as React from 'react';
import { css, keyframes } from '@emotion/core';
import { roundedMd, spacingN } from '@/styles/atoms';
import { menuBgColor } from '@/styles/colors';

interface Props {
  children: React.ReactNode;
  dismiss: () => void;
}

const menuEnter = keyframes`
  60% {
    opacity: 100%;
  }
  100% {
    opacity: 100%;
    transform: translateY(-0.25rem);
  }
`;

const menuStyle = css`
  background-color: ${menuBgColor};
  padding: ${spacingN(2)} ${spacingN(2)};
  width: ${spacingN(48)};
  ${roundedMd};
  opacity: 0;
  transform: translateY(-1rem);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  animation: ${menuEnter} 0.1s ease-in forwards;
`;

function Menu({ children, dismiss }: Props) {
  return (
    <div css={menuStyle} onClick={dismiss}>
      {children}
    </div>
  );
}

export default Menu;
