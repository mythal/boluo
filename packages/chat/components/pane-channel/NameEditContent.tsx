import { FC, useId } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { FormattedMessage } from 'react-intl';
import { NameInput } from './NameInput';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';

interface Props {
  myId: string;
  channelId: string;
}

export const NameEditContent: FC<Props> = ({ myId, channelId }) => {
  const memberResult = useMyChannelMember(channelId);
  const myMember = memberResult.unwrap();
  const { inGameAtom, composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const inGame = useAtomValue(inGameAtom);
  const baseId = useId();
  const id = {
    inputName: baseId + 'input-name',
    inGame: baseId + 'in-game',
  };
  const switchToInGame = () => {
    dispatch({ type: 'toggleInGame', payload: { inGame: true } });
  };
  const switchToOutOfGame = () => {
    dispatch({ type: 'toggleInGame', payload: { inGame: false } });
  };
  return (
    <div className=" grid w-52 grid-cols-[auto_auto] gap-x-1 gap-y-2">
      <div>
        <input
          id={id.inputName}
          checked={inGame}
          type="radio"
          onChange={(e) => {
            if (e.target.checked) {
              switchToInGame();
            }
          }}
        />
      </div>
      <div onFocus={switchToInGame}>
        <label htmlFor={id.inputName} className="block cursor-pointer select-none">
          <FormattedMessage defaultMessage="In Character" />
        </label>
        <NameInput className="w-full" />
      </div>

      <div>
        <input
          id={id.inGame}
          checked={!inGame}
          type="radio"
          onChange={(e) => {
            if (e.target.checked) {
              switchToOutOfGame();
            }
          }}
        />
      </div>
      <label className="block cursor-pointer select-none" htmlFor={id.inGame}>
        <FormattedMessage defaultMessage="Out of Character" />
      </label>
    </div>
  );
};
