import { pL, pR, pX, pY, uiShadow } from '../../styles/atoms';
import styled from '@emotion/styled';
import { css } from '@emotion/core';
import React from 'react';
import { gray } from '../../styles/colors';

export const toolbarRadius = css`
  border-radius: 4px;
`;

const Container = styled.div`
  position: absolute;
  z-index: 20;
  top: 0;
  right: 0;
  transform: translateY(-75%);
  ${[pR(2), pL(12), pY(2)]};

  &[data-position='bottom'] {
    top: unset;
    bottom: 0;
    transform: translateY(80%);
  }
  &[data-x='left'] {
    right: unset;
    left: 0;
  }
`;

const Toolbar = styled.div`
  background-color: ${gray['800']};
  ${[uiShadow, pY(1), pX(1), toolbarRadius]};
`;

export interface Props {
  className?: string;
  children: React.ReactNode;
  position?: 'bottom' | 'top';
  x?: 'left' | 'right';
}

export function ItemToolbar({ children, className, position = 'top', x = 'right' }: Props) {
  return (
    <Container className={className} data-position={position} data-x={x}>
      <Toolbar>{children}</Toolbar>
    </Container>
  );
}

export default ItemToolbar;
