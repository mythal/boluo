import * as React from 'react';
import { Portal } from './Portal';
import { css } from '@emotion/core';
import { modalMaskColor, modalZIndex } from '../../styles/theme';
import styled from '@emotion/styled';

type Props = React.HTMLAttributes<HTMLDivElement> & {
  mask?: boolean;
  onClickMask?: () => void;
};

const style = css`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: ${modalZIndex};
`;

const Mask = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: ${modalMaskColor};
  z-index: ${modalZIndex - 1};
`;

function Modal({ children, mask, onClickMask, ...props }: Props) {
  return (
    <Portal>
      <div css={style} {...props}>
        {children}
      </div>
      {mask && <Mask onClick={onClickMask} />}
    </Portal>
  );
}

export default Modal;
