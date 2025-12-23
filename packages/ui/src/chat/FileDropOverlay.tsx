import clsx from 'clsx';
import Icon from '../Icon';
import FileDown from '@boluo/icons/FileDown';
import { FormattedMessage } from 'react-intl';

interface Props {
  className?: string;
  innerClassName?: string;
}

export const FileDropOverlay = ({ className, innerClassName }: Props) => {
  return (
    <div className={clsx('pointer-events-none absolute inset-0 z-10', className)}>
      <div
        className={clsx(
          'bg-surface-default/75 border-border-strong text-text-primary absolute inset-4 flex flex-col items-center justify-center gap-2 rounded-lg border-4 border-dashed text-lg font-medium shadow-lg backdrop-blur-sm',
          innerClassName,
        )}
      >
        <span className="animate-bounce text-4xl motion-reduce:animate-none">
          <Icon icon={FileDown} />
        </span>
        <span>
          <FormattedMessage defaultMessage="Drop to attach a file" />
        </span>
      </div>
    </div>
  );
};
