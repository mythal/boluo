import * as React from 'react';
import { css, keyframes } from '@emotion/core';
import { menuBgColor, roundedPx, spacingN, uiShadow } from '@/styles/atoms';

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
    transform: translateY(0);
  }
`;

const menuStyle = css`
  background-color: ${menuBgColor};
  padding: ${spacingN(4)} ${spacingN(2)};
  width: ${spacingN(48)};
  ${roundedPx};
  opacity: 0;
  transform: translateY(-1rem);
  ${uiShadow};
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
