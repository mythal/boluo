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
      className="bg-state-info-bg flex min-h-11 items-center justify-center gap-1 px-3 py-2 text-sm"
    >
      <span className="grow text-center">
        <FormattedMessage defaultMessage="A new version of Boluo is available." />
      </span>
      <Button small variant="primary" onClick={onRefresh}>
        <Icon icon={Refresh} />
        <FormattedMessage defaultMessage="Refresh" />
      </Button>
      <Button small aria-label={closeLabel} title={closeLabel} onClick={onDismiss}>
        <X />
      </Button>
    </div>
  );
};
