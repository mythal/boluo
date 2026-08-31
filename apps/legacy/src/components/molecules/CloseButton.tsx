import * as React from 'react';
import X from '@boluo/icons/legacy/X';
import { cls } from '../../utils/classnames';
import Icon from '../atoms/Icon';

type Props = Omit<React.ComponentPropsWithRef<'button'>, 'children'>;

function CloseButton({ className, type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={cls(
        'text-legacy-text hover:bg-legacy-close-hover active:bg-legacy-close-active h-[1.4em] w-[1.4em] rounded-full border-0 bg-transparent p-0 leading-[1em] focus:outline-none',
        className,
      )}
      {...props}
    >
      <Icon icon={X} />
    </button>
  );
}

export default CloseButton;
