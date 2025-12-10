import { css } from '@emotion/react';
import * as React from 'react';
import { useCallback, useEffect } from 'react';
import RotateCw from '../../assets/icons/rotate-cw.svg';
import { breakpoint, mediaQuery, pX, pY, roundedMd, spacingN, textXl } from '../../styles/atoms';
import { dialogBgColor, dialogShadowColor, dialogTitleColor } from '../../styles/colors';
import Button, { type ButtonVariant } from '../atoms/Button';
import Icon from '../atoms/Icon';
import Modal from '../atoms/Modal';
import CloseButton from './CloseButton';

interface Props {
  children: React.ReactNode;
  mask?: boolean;
  title?: string;
  dismiss?: () => void;
  confirm?: () => void;
  confirmText?: string;
  noOverflow?: boolean;
  loading?: boolean;
  confirmButtonVariant?: ButtonVariant;
}

const style = css`
  background-color: ${dialogBgColor};
  ${roundedMd};
  box-shadow: 0 0 0 ${spacingN(2)} ${dialogShadowColor};
  transform: translate(-50%, -50%);
  min-width: 18em;
  display: flex;
  flex-direction: column;

  &[data-no-overflow='false'] {
    max-height: 80vh;
  }
  ${mediaQuery(breakpoint.md)} {
    min-width: 24em;
  }
`;

const buttonAreaStyle = css`
  text-align: right;
  padding-top: ${spacingN(4)};
  padding: ${spacingN(4)};
`;

const headerStyle = css`
  ${[textXl, pX(4), pY(3)]};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const titleStyle = css`
  color: ${dialogTitleColor};
`;

const contentStyle = css`
  padding: ${spacingN(4)};
  &[data-no-overflow='false'] {
    height: 100%;
    overflow-y: auto;
  }
`;

function Dialog({
  children,
  mask,
  dismiss,
  confirm,
  confirmText,
  title,
  noOverflow = false,
  loading = false,
  confirmButtonVariant = 'primary',
}: Props) {
  confirmText = confirmText || '确定';
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismiss) {
        dismiss();
      }
    },
    [dismiss],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <Modal css={style} mask={mask} data-no-overflow={noOverflow} onClickMask={dismiss}>
      {title && (
        <div css={headerStyle}>
          <span css={titleStyle}>{title}</span>
          {dismiss && <CloseButton onClick={dismiss} />}
        </div>
      )}
      <div css={contentStyle} data-no-overflow={noOverflow}>
        {children}
      </div>
      {confirm && (
        <div css={buttonAreaStyle}>
          <Button
            data-small
            autoFocus
            disabled={loading}
            data-variant={confirmButtonVariant}
            onClick={confirm}
          >
            {loading && <Icon icon={RotateCw} spin />}
            {confirmText}
          </Button>
        </div>
      )}
    </Modal>
  );
}

export default Dialog;
