import { type FC, type FormEvent, useId, useMemo } from 'react';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { FormattedMessage } from 'react-intl';
import { NameEditInput } from './NameInput';
import { chatAtom } from '../../state/chat.atoms';
import { type MemberWithUser } from '@boluo/api';
import { NameEditContentNameHistory } from './NameEditContentNameHistory';
import { collectCharacterNameHistory } from '../../state/name-history';

interface Props {
  member: MemberWithUser;
  dismiss: () => void;
}

export const NameEditContent: FC<Props> = ({ member, dismiss }) => {
  const { inGameAtom, composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const inGame = useAtomValue(inGameAtom);
  const baseId = useId();
  const store = useStore();
  const myId = member.user.id;
  const channelId = member.channel.channelId;
  const defaultCharacterName = member.channel.characterName;
  const nameHistory = useMemo(
    () =>
      collectCharacterNameHistory({
        state: store.get(chatAtom),
        userId: myId,
        preferredChannelId: channelId,
        seedNames: defaultCharacterName === '' ? [] : [defaultCharacterName],
        preferredLimit: 2000,
        otherLimit: 100,
      }),
    [channelId, defaultCharacterName, myId, store],
  );
  const id = {
    inputName: baseId + 'input-name',
    inGame: baseId + 'in-game',
  };
  const switchToInGame = () => {
    dispatch({ type: 'setInGame', payload: { inGame: true } });
  };
  const switchToOutOfGame = () => {
    dispatch({ type: 'setInGame', payload: { inGame: false } });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const compose = store.get(composeAtom);
    const len = compose.source.length;
    dispatch({ type: 'setRange', payload: { range: [len, len] } });
    dispatch({ type: 'focus', payload: {} });
    dismiss();
  };
  return (
    <form onSubmit={handleSubmit} className="grid w-52 grid-cols-[auto_auto] gap-x-1 gap-y-2">
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
      <div onFocus={switchToInGame} className="flex flex-col gap-1">
        <label htmlFor={id.inputName} className="block cursor-pointer select-none">
          <FormattedMessage defaultMessage="As the character of …" />
        </label>
        <NameEditInput channelId={member.channel.channelId} defaultName={defaultCharacterName} />
        <NameEditContentNameHistory
          names={nameHistory}
          defaultCharacterName={defaultCharacterName}
        />
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
        <div>
          <FormattedMessage defaultMessage="Out of Character" />
          <span className="text-text-secondary ml-1">({member.user.nickname})</span>
        </div>
      </label>
    </form>
  );
};
