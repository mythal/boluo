import { type FC, type FormEvent, useId, useMemo } from 'react';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { FormattedMessage } from 'react-intl';
import { NameEditInput } from './NameInput';
import { type ChatSpaceState } from '../../state/chat.reducer';
import { chatAtom } from '../../state/chat.atoms';
import { type MemberWithUser } from '@boluo/api';
import { type ChannelState } from '../../state/channel.reducer';
import { backwards, last } from 'list';
import { NameEditContentNameHistory } from './NameEditContentNameHistory';
import { CharacterPicker } from './CharacterPicker';
import { useQueryCharacters } from '@boluo/hooks/useQueryCharacters';
import { useChannelCharacterName } from '../../hooks/useChannelCharacter';

interface Props {
  member: MemberWithUser;
  dismiss: () => void;
  onViewAllCharacters: () => void;
}

const RECENT_CHARACTER_LIMIT = 5;

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
  }

  return names;
};

export const NameEditContent: FC<Props> = ({ member, dismiss, onViewAllCharacters }) => {
  const { inGameAtom, composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const inGame = useAtomValue(inGameAtom);
  const baseId = useId();
  const store = useStore();
  const myId = member.user.id;
  const channelId = member.channel.channelId;
  const defaultCharacterName = useChannelCharacterName(member);
  const {
    data: characters,
    error: charactersError,
    isLoading: charactersLoading,
  } = useQueryCharacters({
    spaceId: member.space.spaceId,
    includeArchived: true,
    portrayableOnly: true,
  });
  const activeCharacters = useMemo(
    () => characters?.filter((character) => character.archivedAt == null),
    [characters],
  );
  const characterNames = useMemo(
    () => new Set(activeCharacters?.map((character) => character.name) ?? []),
    [activeCharacters],
  );
  const nameHistory = useMemo(
    // In this case, we don't need to use `useAtom` hooks.
    () =>
      chatStateToNameList(store.get(chatAtom), channelId, myId, defaultCharacterName).filter(
        (name) => !characterNames.has(name),
      ),
    [characterNames, channelId, defaultCharacterName, myId, store],
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
    <form
      onSubmit={handleSubmit}
      className="grid w-52 grid-cols-[auto_minmax(0,1fr)] gap-x-1 gap-y-2"
    >
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
      <div onFocus={switchToInGame} className="flex min-w-0 flex-col gap-1">
        <label htmlFor={id.inputName} className="block cursor-pointer select-none">
          <FormattedMessage defaultMessage="As the character of …" />
        </label>
        <NameEditInput
          channelId={member.channel.channelId}
          defaultName={defaultCharacterName}
          characterId={member.channel.characterId}
        />
        <NameEditContentNameHistory
          names={nameHistory}
          defaultCharacterName={defaultCharacterName}
        />
        <CharacterPicker
          member={member}
          characters={activeCharacters?.slice(0, RECENT_CHARACTER_LIMIT)}
          suggestionCharacters={characters}
          error={charactersError}
          isLoading={charactersLoading}
          onViewAll={onViewAllCharacters}
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
