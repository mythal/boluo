import React, { MouseEventHandler } from 'react';
import { Dialog } from './Dialog';

interface Props {
  dismiss: () => void;
  submit: MouseEventHandler;
  open?: boolean;
  confirmText?: string;
}

export const ConfirmDialog: React.FC<Props> = React.memo<Props>(({ dismiss, submit, open, children, confirmText }) => {
  if (!open) {
    return null;
  }
  return (
    <Dialog className="p-4" dismiss={dismiss}>
      <div className="py-1">{children}</div>
      <div className="text-right">
        <button className="btn mr-2" onClick={dismiss}>
          取消
        </button>
        <button className="btn btn-primary" onClick={submit}>
          {confirmText ?? '确定'}
        </button>
      </div>
    </Dialog>
  );
});
