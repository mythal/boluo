import { type FC, useId, useMemo } from 'react';
import { atom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { FormattedMessage } from 'react-intl';
import { NameEditInput } from './NameInput';
import { type ChatSpaceState } from '../../state/chat.reducer';
import { chatAtom } from '../../state/chat.atoms';
import { type MemberWithUser } from '@boluo/api';
import { type ChannelState } from '../../state/channel.reducer';
import { backwards, last } from 'list';
import { ButtonInline } from '@boluo/ui/ButtonInline';

interface Props {
  member: MemberWithUser;
}

const NAME_HISTORY_MAX = 5;

const searchChannelForNames = (
  names: string[],
  channelState: ChannelState,
  userId: string,
  searchLimit: number,
) => {
  let count = 0;
  for (const message of backwards(channelState.messages)) {
    if (
      !message.inGame ||
      message.folded ||
      message.senderId !== userId ||
      message.name === '' ||
      names.includes(message.name)
    )
      continue;
    names.push(message.name);
    if (++count >= searchLimit) return;
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
    const aCreated = last(a.messages)!.created;
    const bCreated = last(b.messages)!.created;
    const aTime = new Date(aCreated).getTime();
    const bTime = new Date(bCreated).getTime();
    return bTime - aTime;
  });

  for (const channel of channels) {
    searchChannelForNames(names, channel, myId, 100);
    if (names.length > NAME_HISTORY_MAX) return names;
  }

  return names;
};

const NameButton: FC<{ name: string; defaultCharacterName: string }> = ({
  name,
  defaultCharacterName,
}) => {
  const { composeAtom, characterNameAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const pressedAtom = useMemo(
    () =>
      atom((read) => {
        const characterName = read(characterNameAtom);
        return characterName === name;
      }),
    [characterNameAtom, name],
  );
  const pressed = useAtomValue(pressedAtom);
  return (
    <ButtonInline
      key={name}
      data-active={pressed}
      onClick={() => {
        dispatch({
          type: 'setCharacterName',
          payload: { name, setInGame: true },
        });
      }}
    >
      {name}
    </ButtonInline>
  );
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
    dispatch({ type: 'setInGame', payload: { inGame: true } });
  };
  const switchToOutOfGame = () => {
    dispatch({ type: 'setInGame', payload: { inGame: false } });
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
              <NameButton key={name} name={name} defaultCharacterName={defaultCharacterName} />
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
          <span className="text-text-secondary ml-1">({member.user.nickname})</span>
        </div>
      </label>
    </div>
  );
};
