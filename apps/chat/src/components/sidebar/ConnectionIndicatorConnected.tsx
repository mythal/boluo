import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useChatDispatch } from '../../state/chat.atoms';
import { devMode } from '../../state/dev.atoms';
import { TooltipButton } from './TooltipButton';

interface Props {
}

export const ConnectionIndicatorConnected: FC<Props> = ({}) => {
  const isDevMode = useAtomValue(devMode);
  const dispatch = useChatDispatch();
  const disconnect = () => {
    dispatch('debugCloseConnection', { countdown: 5 });
  };
  return (
    <div>
      <div>
        <FormattedMessage defaultMessage="Connected" />
      </div>
      {isDevMode && (
        <div className="mt-2">
          <TooltipButton onClick={disconnect}>
            <FormattedMessage defaultMessage="Disconnect" />
          </TooltipButton>
        </div>
      )}
    </div>
  );
};
