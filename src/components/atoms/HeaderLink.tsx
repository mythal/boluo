import * as React from 'react';
import { css } from '@emotion/core';
import {
  bgColor,
  breakpoint,
  headerTransition,
  mediaQuery,
  primaryColor,
  roundedPx,
  spacingN,
  textColor,
} from '@/styles/atoms';
import { NavLink } from 'react-router-dom';
import styled from '@emotion/styled';
import { darken, lighten } from 'polished';

interface Props {
  to: string;
  exact?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const headerLinkStyle = css`
  color: ${textColor};
  cursor: pointer;
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
  ${headerTransition};
  &.active {
    background-color: ${darken(0.03, bgColor)};
    box-shadow: 0 -2px 0 0 ${primaryColor} inset;
  }
  &:hover {
    background-color: ${lighten(0.1, bgColor)};
    box-shadow: 0 -2px 0 0 ${primaryColor} inset;
  }
  &:active {
    background-color: rgba(255, 255, 255, 0.15);
  }
  &:focus {
    outline: none;
  }
`;

export const HeaderButton = styled.button(headerLinkStyle);

function HeaderLink({ children, ...props }: Props) {
  return (
    <NavLink css={headerLinkStyle} activeClassName="active" {...props}>
      {children}
    </NavLink>
  );
}

export default HeaderLink;
