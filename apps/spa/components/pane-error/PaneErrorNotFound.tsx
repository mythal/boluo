import { type NotFoundError } from '@boluo/api';
import AlertCircle from '@boluo/icons/AlertCircle';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';

interface Props {
  error: NotFoundError;
}

export const PaneErrorNotFound: FC<Props> = ({ error }) => {
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<AlertCircle />}>
          <FormattedMessage defaultMessage="Not Found" />
        </PaneHeaderBox>
      }
    >
      <div className="h-full p-4">
        <div>
          <FormattedMessage defaultMessage="Not found, Perhaps resource was deleted." />
        </div>
        <div className="pt-4 text-xs">
          <FormattedMessage defaultMessage="Message from server" />
        </div>
        <pre className="text-text-muted py-1 text-sm">{error.message}</pre>
      </div>
    </PaneBox>
  );
};
