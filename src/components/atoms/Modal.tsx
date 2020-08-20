import * as React from 'react';
import { Suspense } from 'react';
import { Portal } from './Portal';
import { css, keyframes } from '@emotion/core';
import styled from '@emotion/styled';
import { mask, modalZIndex } from '../../styles/atoms';
import Loading from '../../components/molecules/Loading';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  mask?: boolean;
  onClickMask?: () => void;
}

const style = css`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: ${modalZIndex};
`;

const maskIn = keyframes`
  100% {
    opacity: 100%;
  }
`;

const Mask = styled.div`
  ${mask};
  z-index: ${modalZIndex - 1};
  opacity: 0;
  animation: ${maskIn} 0.1s ease-in forwards;
`;

function Modal({ children, mask, onClickMask, ...props }: Props) {
  return (
    <Portal>
      <div css={style} {...props}>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </div>
      {mask && <Mask onClick={onClickMask} />}
    </Portal>
  );
}

export default Modal;
