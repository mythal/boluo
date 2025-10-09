import React, { useEffect, useRef } from 'react';
import { FormattedMessage } from 'react-intl';

interface Props {
  timestamp: number;
}

export const OthersPreviewNoBroadcast = React.memo<Props>(({ timestamp }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const now = new Date().getTime();
    if (now - timestamp > 2000) return;
    ref.current?.setAttribute('data-highlight', 'true');
    const handle = window.setTimeout(() => {
      ref.current?.setAttribute('data-highlight', 'false');
    }, 200);
    return () => window.clearTimeout(handle);
  }, [timestamp]);
  return (
    <div
      ref={ref}
      className="text-text-secondary data-[highlight=true]:text-text-subtle transition-colors duration-100"
    >
      *
      <span className="px-1 italic">
        <FormattedMessage defaultMessage="Broadcast has been turned off" />
      </span>
      *
    </div>
  );
});

OthersPreviewNoBroadcast.displayName = 'OthersPreviewNoBroadcast';
