import { type UserStatus } from '@boluo/api';
import clsx from 'clsx';
import React from 'react';
import { useIntl } from 'react-intl';
import { useTooltip } from '@boluo/ui/hooks/useTooltip';
import { TooltipBox } from '@boluo/ui/TooltipBox';

export const MemberStatusBadge = React.memo(({ status }: { status: UserStatus }) => {
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
    <div
      className="MemberStatusBadge inline-flex h-6 items-center"
      ref={refs.setReference}
      {...getReferenceProps()}
    >
      <span
        className={clsx(
          'box-content inline-block h-[0.5em] w-[0.5em] rounded-full border-[0.125em]',
          status.kind === 'ONLINE' && 'border-lamp-on-border bg-lamp-on-bg',
        )}
        aria-label={text}
      />
      <TooltipBox
        show={showTooltip}
        ref={refs.setFloating}
        style={floatingStyles}
        {...getFloatingProps()}
        defaultStyle
      >
        <div className="font-bold">{text}</div>
      </TooltipBox>
    </div>
  );
});
MemberStatusBadge.displayName = 'MemberStatusBadge';
