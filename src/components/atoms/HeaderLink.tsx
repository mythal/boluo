import * as React from 'react';
import { css } from '@emotion/core';
import { bgColor, roundedPx, spacingN, textColor } from '../../styles/atoms';
import { NavLink } from 'react-router-dom';

interface Props {
  to: string;
  exact?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const style = css`
  color: ${textColor};
  text-decoration: none;
  padding: ${spacingN(2)} ${spacingN(3)};
  background-color: ${bgColor};
  ${roundedPx}
  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
  }
  &.active {
    background-color: rgba(255, 255, 255, 0.15);
  }
`;

function HeaderLink({ children, ...props }: Props) {
  return (
    <NavLink css={style} activeClassName="active" {...props}>
      {children}
    </NavLink>
  );
}

export default HeaderLink;
