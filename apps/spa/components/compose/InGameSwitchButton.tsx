import { Mask } from '@boluo/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { FC } from 'react';
import { useIntl } from 'react-intl';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { InComposeButton } from './InComposeButton';
import { useDefaultInGame } from '../../hooks/useDefaultInGame';

interface Props {}

export const InGameSwitchButton: FC<Props> = () => {
  const defaultInGame = useDefaultInGame();
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
            defaultInGame,
          },
        })
      }
      title={title}
    >
      <Mask className={inGame ? '' : 'text-text-lighter'} />
    </InComposeButton>
  );
};
