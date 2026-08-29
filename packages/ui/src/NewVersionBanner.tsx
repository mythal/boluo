import Refresh from '@boluo/icons/Refresh';
import X from '@boluo/icons/X';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from './Button';
import Icon from './Icon';

interface Props {
  onDismiss: () => void;
  onRefresh: () => void;
}

export const NewVersionBanner = ({ onDismiss, onRefresh }: Props) => {
  const intl = useIntl();
  const closeLabel = intl.formatMessage({ defaultMessage: 'Close' });

  return (
    <div
      role="status"
      className="bg-state-info-bg flex min-h-11 items-center gap-1 px-3 py-2 text-sm sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
    >
      <span className="min-w-0 grow text-left sm:col-start-2 sm:grow-0 sm:text-center">
        <FormattedMessage defaultMessage="A new version of Boluo is available." />
      </span>
      <div className="flex shrink-0 items-center gap-1 sm:col-start-3 sm:justify-self-end">
        <Button small variant="primary" onClick={onRefresh}>
          <Icon icon={Refresh} />
          <FormattedMessage defaultMessage="Refresh" />
        </Button>
        <Button small aria-label={closeLabel} title={closeLabel} onClick={onDismiss}>
          <X />
        </Button>
      </div>
    </div>
  );
};
