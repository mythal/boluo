import styled from '@emotion/styled';
import { NavLink } from 'react-router-dom';
import { pL, pR, primaryColor, pY, sidebarWidth, spacingN, textColor } from '@/styles/atoms';
import { darken } from 'polished';

export const sidebarItemColor = darken(0.1, textColor);

export const SidebarItemLink = styled(NavLink)`
  display: block;
  color: ${sidebarItemColor};
  text-decoration: none;
  white-space: nowrap;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  ${[pL(8), pR(4), pY(2), sidebarWidth]};

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  &:active,
  &.active {
    box-shadow: ${spacingN(1)} 0 0 0 ${primaryColor} inset;
    background-color: rgba(255, 255, 255, 0.05);
  }
`;
