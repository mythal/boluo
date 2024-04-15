import { FC, ReactNode, useState } from 'react';
import { ErrorDisplay } from '../ErrorDisplay';
import { Button } from '@boluo/ui/Button';
import { FormattedMessage } from 'react-intl';
import { useBannerNode } from '../../hooks/useBannerNode';
import ReactDOM from 'react-dom';
import { AlertCircle } from '@boluo/icons';

interface Props {
  icon?: ReactNode;
  error: unknown;
  children: ReactNode;
}

export const FailedBanner: FC<Props> = ({ icon, error, children }) => {
  const [show, setShow] = useState(true);
  const banner = useBannerNode();
  if (!show || !banner) return null;
  return ReactDOM.createPortal(
    <div className="bg-failed-banner-bg border-failed-banner-border flex items-center gap-2 border-y px-3 py-2">
      <span className="text-text-lighter">{icon ?? <AlertCircle />}</span>
      {children}

      <div className="text-text-lighter flex-grow text-sm">
        <ErrorDisplay error={error} />
      </div>
      <Button data-small onClick={() => setShow(false)}>
        <FormattedMessage defaultMessage="Dismiss" />
      </Button>
    </div>,
    banner,
  );
};
