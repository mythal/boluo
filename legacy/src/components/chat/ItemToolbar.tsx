import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';
import { pX, pY } from '../../styles/atoms';
import { floatPanel } from './styles';

export const toolbarRadius = css`
  border-radius: 4px;
`;

const Container = styled.div`
  position: absolute;
  width: max-content;
  z-index: 20;
  top: 0;
  right: 50%;
  transform: translateY(-65%) translateX(50%);
  ${[pY(2), pX(4)]};

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
  width: max-content;
  ${[pY(1), pX(1), floatPanel]};
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
