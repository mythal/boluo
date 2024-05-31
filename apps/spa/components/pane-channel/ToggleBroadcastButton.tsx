import { SatelliteDish } from '@boluo/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { type FC, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';

interface Props {}

export const ToggleBroadcastButton: FC<Props> = () => {
  const { composeAtom, broadcastAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isBroadcasting = useAtomValue(broadcastAtom);
  const toggle = useCallback(() => dispatch({ type: 'toggleBroadcast', payload: {} }), [dispatch]);
  return (
    <Button data-small data-type="switch" data-on={isBroadcasting} onClick={toggle}>
      <SatelliteDish />
      <span className="@lg:inline hidden">
        <FormattedMessage defaultMessage="Broadcast" />
      </span>
    </Button>
  );
};
