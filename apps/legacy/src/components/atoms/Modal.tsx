import * as React from 'react';
import { Suspense } from 'react';
import Loading from '../../components/molecules/Loading';
import { cls } from '../../utils/classnames';
import { Portal } from './Portal';

interface Props extends React.ComponentPropsWithRef<'div'> {
  mask?: boolean;
  onClickMask?: () => void;
  placement?: 'center' | 'panel';
}

const placementClassNames = {
  center: 'top-1/2 left-1/2 [transform:translate(-50%,-50%)]',
  panel: 'top-0 right-0',
} as const;

function Modal({ children, mask, onClickMask, placement = 'center', className, ...props }: Props) {
  return (
    <Portal>
      <div className={cls('fixed z-40', placementClassNames[placement], className)} {...props}>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </div>
      {mask && (
        <div
          className="bg-legacy-modal-mask animate-legacy-mask-in fixed inset-0 z-[39] opacity-0"
          onClick={onClickMask}
        />
      )}
    </Portal>
  );
}

export default Modal;
