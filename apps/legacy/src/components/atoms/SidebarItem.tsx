import styled from '@emotion/styled';
import { NavLink } from 'react-router-dom';
import { pL, pR, spacingN } from '../../styles/atoms';
import {
  primaryColor,
  sidebarItemActiveBgColor,
  sidebarItemColor,
  sidebarItemHoverBgColor,
} from '../../styles/colors';
import { sidebarWidth } from '../chat/styles';

export const SidebarItemLink = styled(NavLink)`
  display: flex;
  flex-shrink: 0;
  flex-grow: 0;
  height: 2.5rem;
  align-items: center;
  color: ${sidebarItemColor};
  text-decoration: none;
  white-space: nowrap;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  ${[pL(8), pR(4), sidebarWidth]};

  &:hover {
    background-color: ${sidebarItemHoverBgColor};
  }

  &:active,
  &.active {
    box-shadow: ${spacingN(1)} 0 0 0 ${primaryColor} inset;
    background-color: ${sidebarItemActiveBgColor};
  }
`;
