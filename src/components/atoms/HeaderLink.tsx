import * as React from 'react';
import { css } from '@emotion/core';
import { bgColor, breakpoint, mediaQuery, roundedPx, spacingN, textColor } from '../../styles/atoms';
import { NavLink } from 'react-router-dom';
import styled from '@emotion/styled';

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
  max-width: 8rem;
  ${roundedPx};
  ${mediaQuery(breakpoint.sm)} {
    max-width: 16rem;
  }
  ${mediaQuery(breakpoint.lg)} {
    max-width: 24rem;
  }
  border: 0;
  line-height: 1.5em;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
  }
  &:active {
    background-color: rgba(255, 255, 255, 0.15);
  }
  &:focus {
    outline: none;
  }
`;

export const HeaderButton = styled.button(style);

function HeaderLink({ children, ...props }: Props) {
  return (
    <NavLink css={style} activeClassName="active" {...props}>
      {children}
    </NavLink>
  );
}

export default HeaderLink;
