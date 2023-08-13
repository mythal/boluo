import { SatelliteDish } from 'icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, useCallback, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { useComposeAtom } from '../../hooks/useComposeAtom';

interface Props {
}

export const ToggleBroadcastButton: FC<Props> = () => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const isBroadcasting = useAtomValue(
    useMemo(() => selectAtom(composeAtom, (compose) => compose.broadcast), [composeAtom]),
  );
  const toggle = useCallback(() => dispatch({ type: 'toggleBroadcast', payload: {} }), [dispatch]);
  return (
    <Button data-small data-type="switch" data-on={isBroadcasting} onClick={toggle}>
      <SatelliteDish />
      <span className="hidden @xs:inline">
        <FormattedMessage defaultMessage="Broadcast" />
      </span>
    </Button>
  );
};
