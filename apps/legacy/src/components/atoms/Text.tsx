import React from 'react';
import { cls } from '../../utils/classnames';

type TextSize = 'normal' | 'small';

const textSizeClassNames: Record<TextSize, string> = {
  normal: 'text-[1rem]',
  small: 'text-[0.875rem]',
};

type Props = React.ComponentPropsWithRef<'p'> & {
  textSize?: TextSize;
};

export function Text({ className, ref, textSize = 'normal', ...props }: Props) {
  return (
    <p
      ref={ref}
      className={cls(
        'text-legacy-text m-0 py-1 leading-7',
        textSizeClassNames[textSize],
        className,
      )}
      {...props}
    />
  );
}

export default Text;
