import { FloatingPortal } from '@floating-ui/react';
import { UserStatus } from '@boluo/api';
import clsx from 'clsx';
import React, { FC } from 'react';
import { useIntl } from 'react-intl';
import { useTooltip } from '../../hooks/useTooltip';

export const MemberStatusBadge: FC<{ status: UserStatus }> = React.memo(({ status }) => {
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } = useTooltip();
  const intl = useIntl();
  let text = intl.formatMessage({ defaultMessage: 'Unknown' });
  switch (status.kind) {
    case 'ONLINE':
      text = intl.formatMessage({ defaultMessage: 'Online' });
      break;
    case 'OFFLINE':
      text = intl.formatMessage({ defaultMessage: 'Offline' });
      break;
    case 'AWAY':
      text = intl.formatMessage({ defaultMessage: 'Away' });
      break;
  }
  // const lastSeen = new Date(status.timestamp);

  if (status.kind === 'OFFLINE') return null;

  return (
    <>
      <span
        ref={refs.setReference}
        className={clsx(
          'box-content inline-block h-[0.5em] w-[0.5em] rounded-full border-[0.125em]',
          status.kind === 'ONLINE' && 'border-green-500 bg-green-400',
        )}
        aria-label={text}
        {...getReferenceProps()}
      />
      {showTooltip && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="bg-highest/75 text-lowest rounded px-2 py-1 text-sm shadow"
          >
            <div className="font-bold">{text}</div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
});
MemberStatusBadge.displayName = 'MemberStatusBadge';
