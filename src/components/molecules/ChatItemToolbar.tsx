import { bgColor, pX, pY, uiShadow } from '@/styles/atoms';
import styled from '@emotion/styled';
import { css } from '@emotion/core';
import React from 'react';
import { darken } from 'polished';

export const toolbarRadius = css`
  border-radius: 4px;
`;

const Container = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  transform: translateY(-75%);
  ${[pX(6), pY(2)]};
`;

const Toolbar = styled.div`
  background-color: ${darken(0.05, bgColor)};
  ${[uiShadow, pY(2), pX(2), toolbarRadius]};
`;

export interface Props {
  className?: string;
  children: React.ReactNode;
}

export function ChatItemToolbar({ children, className }: Props) {
  return (
    <Container className={className}>
      <Toolbar>{children}</Toolbar>
    </Container>
  );
}

export default ChatItemToolbar;
