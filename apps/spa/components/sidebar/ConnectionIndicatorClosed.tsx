import { useSetAtom } from 'jotai';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { chatAtom } from '../../state/chat.atoms';
import { ButtonInline } from '@boluo/ui/ButtonInline';

interface Props {
  countdown: number;
}

export const ConnectionIndicatorClosed: FC<Props> = ({ countdown }) => {
  const dispatch = useSetAtom(chatAtom);
  const immediatelyReconnect = () => {
    dispatch({ type: 'reconnectCountdownTick', payload: { immediately: true } });
  };
  return (
    <>
      <div className="grow">
        <FormattedMessage defaultMessage="Waiting {countdown}s" values={{ countdown }} />
      </div>
      <div>
        <ButtonInline onClick={immediatelyReconnect}>Reconnect</ButtonInline>
      </div>
    </>
  );
};
