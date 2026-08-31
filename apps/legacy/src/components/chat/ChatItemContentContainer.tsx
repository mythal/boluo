import * as React from 'react';
import { cls } from '../../utils/classnames';
import { chatItemContentClassName } from './classNames';

export function ChatItemContentContainer({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<'div'>) {
  return <div className={cls(chatItemContentClassName, className)} ref={ref} {...props} />;
}
