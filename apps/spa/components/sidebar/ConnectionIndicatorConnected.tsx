import { useAtomValue, useSetAtom } from 'jotai';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { chatAtom } from '../../state/chat.atoms';
import { devMode } from '../../state/dev.atoms';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import Unplug from '@boluo/icons/Unplug';

export const ConnectionIndicatorConnected: FC = () => {
  const isDevMode = useAtomValue(devMode);
  const dispatch = useSetAtom(chatAtom);
  const disconnect = () => {
    dispatch({ type: 'debugCloseConnection', payload: { countdown: 5 } });
  };
  return (
    <>
      <span className="grow">
        <FormattedMessage defaultMessage="Connected" />
      </span>
      {isDevMode && (
        <ButtonInline onClick={disconnect}>
          <Unplug />
          <span className="ml-1">
            <FormattedMessage defaultMessage="Disconnect" />
          </span>
        </ButtonInline>
      )}
    </>
  );
};
