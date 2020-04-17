import React from 'react';
import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/core';
import rotateIcon from '../assets/icons/rotate-cw.svg';
import TextIcon from './atoms/TextIcon';
import { spin } from '../styles/atoms';
import { spacingN, textXl } from '../styles/theme';

interface Props {
  className?: string;
}

const loadingKeyframes = keyframes`
  20% {
    content: '.  ';
  }

  40% {
    content: '.. ';
  }

  60% {
    content: '...';
  }

  80% {
    opacity: 100%;
  }
`;

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: monospace;
  font-size: ${textXl};

  &::after {
    opacity: 20%;
    white-space: pre;
    content: '   ';
    animation: ${loadingKeyframes} 2s linear infinite;
  }
`;

const rotateIconStyle = css`
  margin-inline-end: ${spacingN(1)};
  ${spin}
`;

export default function PageLoading({ className }: Props) {
  return (
    <Container className={className}>
      <TextIcon sprite={rotateIcon} css={rotateIconStyle} />
      <span>Loading</span>
    </Container>
  );
}
