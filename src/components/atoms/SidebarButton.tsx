import styled from '@emotion/styled';
import { focusShadow, roundedPx, spacingN } from '../../styles/atoms';
import { textColor } from '../../styles/colors';

export const SidebarButton = styled.button`
  color: ${textColor};
  cursor: pointer;
  ${roundedPx};
  padding: ${spacingN(1.5)} ${spacingN(1.5)};
  text-decoration: none;
  background-color: transparent;
  border: none;
  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
  }
  &:active {
    background-color: rgba(255, 255, 255, 0.15);
  }
  &:focus {
    outline: none;
    ${focusShadow};
  }
`;
