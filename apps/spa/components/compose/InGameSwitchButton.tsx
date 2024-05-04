import { Mask } from '@boluo/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { FC } from 'react';
import { useIntl } from 'react-intl';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { InComposeButton } from './InComposeButton';
import { useQueryChannel } from '../../hooks/useQueryChannel';

interface Props {
  channelId: string;
}

export const InGameSwitchButton: FC<Props> = ({ channelId }) => {
  const { data: channel } = useQueryChannel(channelId);
  const { inGameAtom, composeAtom } = useChannelAtoms();
  const intl = useIntl();
  const inGame = useAtomValue(inGameAtom);
  const dispatch = useSetAtom(composeAtom);
  const title = intl.formatMessage({ defaultMessage: 'Toggle In Game' });
  return (
    <InComposeButton
      pressed={inGame}
      onClick={() =>
        dispatch({
          type: 'toggleInGame',
          payload: {
            defaultInGame: channel?.type === 'IN_GAME',
          },
        })
      }
      title={title}
    >
      <Mask className={inGame ? '' : 'text-text-lighter'} />
    </InComposeButton>
  );
};
