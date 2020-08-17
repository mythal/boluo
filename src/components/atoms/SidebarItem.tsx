import styled from '@emotion/styled';
import { NavLink } from 'react-router-dom';
import { pL, pR, pY, sidebarWidth, spacingN } from '../../styles/atoms';
import { primaryColor, sidebarItemActiveBgColor, sidebarItemColor, sidebarItemHoverBgColor } from '../../styles/colors';

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
    background-color: ${sidebarItemHoverBgColor};
  }

  &:active,
  &.active {
    box-shadow: ${spacingN(1)} 0 0 0 ${primaryColor} inset;
    background-color: ${sidebarItemActiveBgColor};
  }
`;
