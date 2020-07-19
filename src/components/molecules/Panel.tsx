import * as React from 'react';
import Modal from '../atoms/Modal';
import { css, keyframes } from '@emotion/core';
import { dialogBgColor, spacingN } from '../../styles/theme';
import CloseButton from './CloseButton';

interface Props {
  dismiss?: () => void;
  mask?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const slideIn = keyframes`
  from {
    transform: translateX(100%);
  }

  to {
    transform: translateX(0);
  }
`;

const style = css`
  position: fixed;
  height: 100%;
  left: unset;
  transform: unset;
  right: 0;
  top: 0;
  background-color: ${dialogBgColor};
  padding: ${spacingN(6)} ${spacingN(12)} ${spacingN(6)} ${spacingN(6)};
  box-shadow: 0 0 24px #000000;
  animation: ${slideIn} 0.25s ease-in forwards;
`;

const closeButtonStyle = css`
  position: absolute;
  right: 0;
  top: 0;
  font-size: 1.5em;
`;

function Panel({ dismiss, mask, children, className }: Props) {
  return (
    <Modal css={style} mask={mask} onClickMask={dismiss} className={className}>
      {dismiss && <CloseButton css={closeButtonStyle} onClick={dismiss} />}
      {children}
    </Modal>
  );
}

export default React.memo(Panel);
