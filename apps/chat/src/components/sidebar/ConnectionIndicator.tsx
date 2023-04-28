import { Cloud, CloudOff } from 'icons';
import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { Spinner } from 'ui';
import { connectionStateAtom } from '../../state/chat.atoms';

interface Props {
  className?: string;
}

export const ConnectionIndicatior: FC<Props> = ({ className = '' }) => {
  const connectionState = useAtomValue(connectionStateAtom);
  return (
    <div className={className}>
      {connectionState.type === 'CLOSED' && <CloudOff />}
      {connectionState.type === 'CONNECTING' && <Spinner />}
      {connectionState.type === 'CONNECTED' && <Cloud />}
    </div>
  );
};
