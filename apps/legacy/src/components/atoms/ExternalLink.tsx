import * as React from 'react';
import ExternalLinkIcon from '@boluo/icons/legacy/ExternalLink';
import Icon from '../../components/atoms/Icon';
import { cls } from '../../utils/classnames';

interface Props extends Omit<React.ComponentPropsWithRef<'a'>, 'href'> {
  to: string;
}

export const linkClassName =
  'border-b border-legacy-link text-legacy-link no-underline transition-all duration-200 ease-in hover:text-legacy-link-hover focus:rounded-[1px] focus:outline-none focus:shadow-[0_0_0_2px_var(--color-legacy-focus-outline),0_0_4px_0_var(--color-legacy-ui-shadow-muted),0_1px_1px_0_var(--color-legacy-ui-shadow)] active:translate-y-px';

function ExternalLink({ to, children, className, ref, ...props }: Props) {
  return (
    <a
      ref={ref}
      href={to}
      rel="noopener noreferrer"
      className={cls(linkClassName, className)}
      target="_blank"
      {...props}
    >
      {children}
      <Icon className="p-0.5" icon={ExternalLinkIcon} />
    </a>
  );
}

export default ExternalLink;
