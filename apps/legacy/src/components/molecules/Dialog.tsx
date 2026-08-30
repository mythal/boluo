import * as React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import RotateCw from '@boluo/icons/legacy/RotateCw';
import { cls } from '../../utils/classnames';
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
  className?: string;
}

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
  className,
}: Props) {
  confirmText = confirmText || '确定';
  const dialogRef = useRef<HTMLDivElement>(null);
  const [previousFocus] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  const titleId = useId();
  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismiss) {
        dismiss();
      }
    },
    [dismiss],
  );

  useEffect(() => {
    if (!dialogRef.current?.contains(document.activeElement)) {
      dialogRef.current?.focus();
    }
    return () => {
      previousFocus?.focus();
    };
  }, [previousFocus]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <Modal
      ref={dialogRef}
      role="dialog"
      aria-modal={mask || undefined}
      aria-labelledby={title ? titleId : undefined}
      tabIndex={-1}
      className={cls(
        'bg-legacy-dialog-background flex min-w-[18em] flex-col rounded-[5px] [box-shadow:0_0_0_0.5rem_var(--color-legacy-dialog-shadow)] data-[no-overflow=false]:max-h-[80vh] md:min-w-[24em]',
        className,
      )}
      mask={mask}
      data-no-overflow={noOverflow}
      onClickMask={dismiss}
    >
      {title && (
        <div className="flex items-center justify-between px-4 py-3 text-[1.25rem]">
          <span id={titleId} className="text-legacy-dialog-title">
            {title}
          </span>
          {dismiss && <CloseButton aria-label="关闭" onClick={dismiss} />}
        </div>
      )}
      <div
        className="p-4 data-[no-overflow=false]:h-full data-[no-overflow=false]:overflow-y-auto"
        data-no-overflow={noOverflow}
      >
        {children}
      </div>
      {confirm && (
        <div className="p-4 text-right">
          <Button
            size="small"
            autoFocus
            disabled={loading}
            variant={confirmButtonVariant}
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
