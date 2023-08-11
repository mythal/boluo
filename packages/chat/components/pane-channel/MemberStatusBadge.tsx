import { FloatingPortal } from '@floating-ui/react';
import { UserStatus } from 'api';
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
          'inline-block rounded-full w-[0.5em] h-[0.5em] border-[0.125em] box-content',
          status.kind === 'ONLINE' && 'bg-green-400 border-green-500',
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
            className="px-2 py-1 text-sm bg-highest/75 shadow text-lowest rounded"
          >
            <div className="font-bold">
              {text}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
});
MemberStatusBadge.displayName = 'MemberStatusBadge';
