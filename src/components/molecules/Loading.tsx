import React from 'react';
import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/core';
import rotateIcon from '../../assets/icons/rotate-cw.svg';
import TextIcon from '../atoms/Icon';
import { fontMono, pY, spacingN, textSm, textXl } from '../../styles/atoms';

interface Props {
  className?: string;
  text?: string;
}

const loadingKeyframes = keyframes`
  0% {
    opacity: 40%;
  }

  80% {
    opacity: 100%;
  }

  100% {
    opacity: 40%;
  }
`;

const Container = styled.div`
  width: 100%;
  height: 100%;
  ${pY(2)};
  display: flex;
  align-items: center;
  justify-content: center;
  ${fontMono};
  ${textSm};
  white-space: pre;
  animation: ${loadingKeyframes} 2s linear infinite;
`;

const rotateIconStyle = css`
  ${textXl};
  margin-inline-end: ${spacingN(1)};
`;

export default function Loading({ className, text = 'loading' }: Props) {
  return (
    <Container className={className}>
      <TextIcon sprite={rotateIcon} spin css={rotateIconStyle} /> <span>{text}</span>
    </Container>
  );
}
