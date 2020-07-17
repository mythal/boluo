import * as React from 'react';
import { css } from '@emotion/core';
import { dialogBgColor, dialogHeaderBgColor, dialogTitleColor, spacingN, textSm } from '../../styles/theme';
import Button from '../atoms/Button';
import { roundedPx, uiShadow } from '../../styles/atoms';
import CloseButton from './CloseButton';
import Modal from '../atoms/Modal';

interface Props {
  children: React.ReactChild;
  mask?: boolean;
  title?: string;
  dismiss?: () => void;
  confirm?: () => void;
  confirmText?: string;
}

const style = css`
  background-color: ${dialogBgColor};
  ${roundedPx};
  ${uiShadow};
  transform: translate(-50%, -50%);
  min-width: 20em;
`;

const buttonAreaStyle = css`
  text-align: right;
  padding-top: ${spacingN(4)};
  padding: ${spacingN(2)};
`;

const headerStyle = css`
  font-size: ${textSm};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${dialogHeaderBgColor};
`;

const titleStyle = css`
  color: ${dialogTitleColor};
  padding: ${spacingN(2)};
`;

const contentStyle = css`
  padding: ${spacingN(2)};
`;

function Dialog({ children, mask, dismiss, confirm, confirmText, title }: Props) {
  confirmText = confirmText || '确定';
  return (
    <Modal css={style} mask={mask} onClickMask={dismiss}>
      {title && (
        <div css={headerStyle}>
          <span css={titleStyle}>{title}</span>
          {dismiss && <CloseButton onClick={dismiss} />}
        </div>
      )}
      <div css={contentStyle}>{children}</div>
      {confirm && (
        <div css={buttonAreaStyle}>
          <Button small variant="primary" onClick={confirm}>
            {confirmText}
          </Button>
        </div>
      )}
    </Modal>
  );
}

export default Dialog;
