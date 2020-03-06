import React, { FormEventHandler } from 'react';
import { Dialog } from './Dialog';
import { cls } from '../classname';
import { AlertItem } from './AlertItem';

interface Props {
  dismiss: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submit: () => any;
  open?: boolean;
  confirmText?: string;
  className?: string;
  error?: string | null;
  disabled?: boolean;
}

export const ConfirmDialog: React.FC<Props> = React.memo<Props>(
  ({ dismiss, submit, open, children, confirmText, className, error, disabled }) => {
    if (!open) {
      return null;
    }
    const handleSubmit: FormEventHandler = e => {
      e.preventDefault();
      submit();
    };

    return (
      <Dialog dismiss={dismiss}>
        <form onSubmit={handleSubmit} className={cls('p-4', className)}>
          {!error ? null : <AlertItem level="ERROR" message={error} />}
          <div className="py-1">{children}</div>
          <div className="text-right mt-4">
            <button className="btn mr-2" onClick={dismiss}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={disabled}>
              {confirmText ?? '确定'}
            </button>
          </div>
        </form>
      </Dialog>
    );
  }
);
