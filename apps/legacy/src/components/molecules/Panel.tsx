import * as React from 'react';
import { cls } from '../../utils/classnames';
import Modal from '../atoms/Modal';
import CloseButton from './CloseButton';

interface Props {
  dismiss?: () => void;
  mask?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const panelClassName =
  'h-full overflow-y-auto bg-legacy-dialog-background p-6 [box-shadow:0_0_0_0.5rem_var(--color-legacy-dialog-shadow)]';

function Panel({ dismiss, mask, children, className }: Props) {
  return (
    <Modal
      className={cls(panelClassName, className)}
      placement="panel"
      mask={mask}
      onClickMask={dismiss}
    >
      {dismiss && (
        <CloseButton
          aria-label="关闭"
          className="absolute top-[0.2rem] right-[0.2rem] text-[1.5em]"
          onClick={dismiss}
        />
      )}
      {children}
    </Modal>
  );
}

export default React.memo(Panel);
