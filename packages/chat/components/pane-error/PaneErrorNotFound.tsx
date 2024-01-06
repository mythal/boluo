import { NotFoundError } from 'api';
import { AlertCircle } from 'icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { ClosePaneButton } from '../ClosePaneButton';
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
        <div className="text-xs pt-4">
          <FormattedMessage defaultMessage="Message from server" />
        </div>
        <pre className="text-sm py-1 text-surface-500">{error.message}</pre>
      </div>
    </PaneBox>
  );
};
