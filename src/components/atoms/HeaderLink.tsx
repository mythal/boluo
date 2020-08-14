import * as React from 'react';
import { css } from '@emotion/core';
import { breakpoint, headerTransition, mediaQuery, roundedPx, spacingN, textSm } from '@/styles/atoms';
import { NavLink } from 'react-router-dom';
import styled from '@emotion/styled';
import { darken } from 'polished';
import { bgColor, headerBgColor, textColor } from '@/styles/colors';

interface Props {
  to: string;
  exact?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const headerLinkStyle = css`
  color: ${textColor};
  ${textSm};
  cursor: pointer;
  text-decoration: none;
  padding: ${spacingN(1.5)} ${spacingN(2)};
  background-color: ${darken(0.05, headerBgColor)};
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
    background-color: ${bgColor};
  }
  &:hover {
    background-color: ${darken(0.1, headerBgColor)};
  }
  &:active {
    background-color: ${darken(0.15, headerBgColor)};
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
