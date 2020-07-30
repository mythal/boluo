import React from 'react';
import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/core';
import rotateIcon from '@/assets/icons/rotate-cw.svg';
import TextIcon from '../atoms/Icon';
import { pY, spacingN, textXl } from '@/styles/atoms';

interface Props {
  className?: string;
}

const loadingKeyframes = keyframes`
  0% {
    opacity: 20%;
  }

  80% {
    opacity: 100%;
  }

  100% {
    opacity: 20%;
  }
`;

const Container = styled.div`
  width: 100%;
  height: 100%;
  ${pY(2)};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: monospace;
  ${textXl};
  white-space: pre;
  animation: ${loadingKeyframes} 2s linear infinite;
`;

const rotateIconStyle = css`
  margin-inline-end: ${spacingN(1)};
`;

export default function Loading({ className }: Props) {
  return (
    <Container className={className}>
      <TextIcon sprite={rotateIcon} spin css={rotateIconStyle} />
      <span>Loading ...</span>
    </Container>
  );
}
