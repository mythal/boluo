import { SatelliteDish } from 'icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { FC, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';

interface Props {
}

export const ToggleBroadcastButton: FC<Props> = () => {
  const { composeAtom, broadcastAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isBroadcasting = useAtomValue(broadcastAtom);
  const toggle = useCallback(() => dispatch({ type: 'toggleBroadcast', payload: {} }), [dispatch]);
  return (
    <Button data-small data-type="switch" data-on={isBroadcasting} onClick={toggle}>
      <SatelliteDish />
      <span className="hidden @lg:inline">
        <FormattedMessage defaultMessage="Broadcast" />
      </span>
    </Button>
  );
};
