import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { Link, NavLink } from 'react-router-dom';
import {
  breakpoint,
  headerTransition,
  mediaQuery,
  roundedPx,
  spacingN,
  textLg,
} from '../../styles/atoms';
import { gray, textColor } from '../../styles/colors';

export const chatHeaderButtonStyle = css`
  color: ${textColor};
  cursor: pointer;
  flex-shrink: 0;
  ${roundedPx};
  padding: ${spacingN(1.5)} ${spacingN(2)};
  max-width: 6rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: none;
  text-decoration: none;
  background-color: ${gray['700']};
  ${headerTransition};
  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
  }
  &.active,
  &[data-active='true'],
  &:active {
    background-color: ${gray['900']};
  }
  &:focus {
    outline: none;
  }
  ${mediaQuery(breakpoint.sm)} {
    max-width: 6rem;
  }
  ${mediaQuery(breakpoint.md)} {
    max-width: 8rem;
  }
`;

export const sidebarIconButton = css`
  ${[textLg]};
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 2.5rem;
  height: 2.5rem;
`;

export const ChatHeaderButton = styled.button(chatHeaderButtonStyle);

export const ChatHeaderButtonLink = styled(Link)(chatHeaderButtonStyle);

export const ChatHeaderButtonNavLink = styled(NavLink)(chatHeaderButtonStyle);

export default ChatHeaderButton;
