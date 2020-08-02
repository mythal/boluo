import styled from '@emotion/styled';
import { breakpoint, headerTransition, mediaQuery, primaryColor, roundedPx, spacingN, textColor } from '@/styles/atoms';
import { css } from '@emotion/core';
import { Link } from 'react-router-dom';

export const chatHeaderButtonStyle = css`
  color: ${textColor};
  cursor: pointer;
  ${roundedPx};
  padding: ${spacingN(1.5)} ${spacingN(2)};
  max-width: 6rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: none;
  text-decoration: none;
  background-color: rgba(255, 255, 255, 0.1);
  ${headerTransition};
  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 -2px 0 0 ${primaryColor} inset;
  }
  &[data-active='true'],
  &:active {
    background-color: rgba(255, 255, 255, 0.05);
    box-shadow: 0 -2px 0 0 ${primaryColor} inset;
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

export const ChatHeaderButton = styled.button(chatHeaderButtonStyle);

export const ChatHeaderButtonLink = styled(Link)(chatHeaderButtonStyle);

export default ChatHeaderButton;
