import { type ReactNode, type FC } from 'react';
import { type FailTo } from '../../state/channel.types';
import { Delay } from '@boluo/ui/Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';
import { TriangleAlert } from '@boluo/icons';
import { FormattedMessage, useIntl } from 'react-intl';

export const ChatItemMessageFail: FC<{ failTo: FailTo; retry?: () => void }> = ({
  failTo,
  retry,
}) => {
  const intl = useIntl();
  let message: ReactNode = null;
  switch (failTo.type) {
    case 'SEND':
      if (failTo.onUpload) {
        message = intl.formatMessage({ defaultMessage: 'Upload failed' });
      } else {
        message = intl.formatMessage({ defaultMessage: 'Send failed' });
      }
      break;
    case 'EDIT':
      if (failTo.onUpload) {
        message = intl.formatMessage({ defaultMessage: 'Upload failed' });
      } else {
        message = intl.formatMessage({ defaultMessage: 'Edit failed' });
      }
      break;
    case 'DELETE':
      message = intl.formatMessage({ defaultMessage: 'Delete failed' });
      break;
    case 'UPLOAD':
      message = intl.formatMessage({ defaultMessage: 'Upload failed' });
      break;
    case 'MOVE':
      message = intl.formatMessage({ defaultMessage: 'Move failed' });
      break;
  }
  return (
    <div className="relative">
      <Delay fallback={<FallbackIcon />}>
        <TriangleAlert className="text-state-danger-text inline text-xs" />
      </Delay>
      {message && (
        <div className="bg-surface-raised text-text-primary border-border-strong absolute bottom-full left-0 z-10 min-w-max rounded-sm border px-2 py-1 text-sm shadow-sm">
          {message}
          {retry && (
            <button className="cursor-pointer underline" onClick={retry}>
              <FormattedMessage defaultMessage="Retry" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
