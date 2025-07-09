import { css, keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';
import RotateCw from '../../assets/icons/rotate-cw.svg';
import { fontMono, pY, spacingN, textSm, textXl } from '../../styles/atoms';
import TextIcon from '../atoms/Icon';

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
      <TextIcon icon={RotateCw} spin css={rotateIconStyle} /> <span>{text}</span>
    </Container>
  );
}
