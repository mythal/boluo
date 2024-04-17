import { FC, useId, useMemo } from 'react';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { FormattedMessage } from 'react-intl';
import { NameEditInput } from './NameInput';
import { ChatSpaceState } from '../../state/chat.reducer';
import { chatAtom } from '../../state/chat.atoms';
import { Member } from '@boluo/api';
import { ChannelState } from '../../state/channel.reducer';

interface Props {
  member: Member;
}

const NAME_HISTORY_MAX = 5;

const searchChannelForNames = (names: string[], channelState: ChannelState, userId: string, messageLimit: number) => {
  const searchLimit = Math.min(channelState.messages.length - 1, messageLimit);

  for (let i = searchLimit; i >= 0; i--) {
    const message = channelState.messages[i]!;
    if (
      !message.inGame ||
      message.folded ||
      message.senderId !== userId ||
      message.name === '' ||
      names.includes(message.name)
    )
      continue;
    names.push(message.name);
    if (names.length > NAME_HISTORY_MAX) return;
  }
};

const chatStateToNameList = (
  state: ChatSpaceState,
  channelId: string,
  myId: string,
  defaultName?: string,
): string[] => {
  const names: string[] = defaultName == null || defaultName === '' ? [] : [defaultName];

  const currentChannel = state.channels[channelId];
  if (currentChannel != null) {
    searchChannelForNames(names, currentChannel, myId, 2000);
  }

  const channels = Object.values(state.channels).filter(
    (channel) => channel.id !== currentChannel?.id && channel.messages.length > 0,
  );
  // sort by last message time
  channels.sort((a, b) => {
    const aCreated = a.messages[a.messages.length - 1]!.created;
    const bCreated = b.messages[b.messages.length - 1]!.created;
    const aTime = new Date(aCreated).getTime();
    const bTime = new Date(bCreated).getTime();
    return bTime - aTime;
  });
  console.log(channels);

  for (const channel of channels) {
    searchChannelForNames(names, channel, myId, 100);
    if (names.length > NAME_HISTORY_MAX) return names;
  }

  return names;
};

export const NameEditContent: FC<Props> = ({ member }) => {
  const { inGameAtom, composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const inGame = useAtomValue(inGameAtom);
  const baseId = useId();
  const store = useStore();
  const myId = member.user.id;
  const channelId = member.channel.channelId;
  const defaultCharacterName = member.channel.characterName;
  const nameHistory = useMemo(
    // In this case, we don't need to use `useAtom` hooks.
    () => chatStateToNameList(store.get(chatAtom), channelId, myId, defaultCharacterName),
    [channelId, defaultCharacterName, myId, store],
  );
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
    <div className="grid w-52 grid-cols-[auto_auto] gap-x-1 gap-y-2">
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
        {nameHistory.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {nameHistory.map((name) => (
              <button
                key={name}
                className="bg-name-history-bg hover:bg-name-history-hover-bg inline-block max-w-[10rem] truncate rounded-sm border px-2 py-1 text-sm shadow-sm"
                onClick={() => {
                  dispatch({ type: 'setInputedName', payload: { inputedName: name, setInGame: true } });
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
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
          <span className="text-text-light ml-1">({member.user.nickname})</span>
        </div>
      </label>
    </div>
  );
};
