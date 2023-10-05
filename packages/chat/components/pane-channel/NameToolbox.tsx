import { ChannelMember } from 'api';
import { History } from 'icons';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { FC, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import Icon from 'ui/Icon';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { chatAtom } from '../../state/chat.atoms';
import { ChatSpaceState } from '../../state/chat.reducer';
import { NameInput } from './NameInput';

interface Props {}

const chatStateToNameList = (state: ChatSpaceState, channelId: string, myId: string): string[] => {
  const channelState = state.channels[channelId];
  if (channelState == null) return [];
  const names: string[] = [];

  for (let i = channelState.messages.length - 1; i >= 0; i--) {
    const message = channelState.messages[i]!;
    if (!message.inGame || message.senderId !== myId || names.includes(message.name)) continue;
    names.push(message.name);
    if (names.length > 4) return names;
  }
  return names;
};

const NameHistory: FC<{ channelId: string; myId: string }> = ({ channelId, myId }) => {
  const intl = useIntl();
  const store = useStore();
  const title = intl.formatMessage({ defaultMessage: 'Name History' });
  const nameHistory = useMemo(
    // In this case, we don't need to use atom
    () => chatStateToNameList(store.get(chatAtom), channelId, myId),
    [channelId, myId, store],
  );

  const dispatch = useSetAtom(useComposeAtom());
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: 'setInputedName', payload: { inputedName: e.target.value } });
  };
  if (nameHistory.length === 0) {
    return null;
  }
  return (
    <div className="w-8 relative inline-block flex-none">
      <select
        value={''}
        title={title}
        className="border rounded bg-surface-300 hover:bg-surface-200 w-full h-full text-sm appearance-none outline-none text-transprent"
        onChange={handleChange}
      >
        <option value="">
          <FormattedMessage defaultMessage="Name History" />
        </option>
        {nameHistory.map((name, key) => <option key={key} value={name}>{name}</option>)}
      </select>
      <Icon className="absolute left-0 translate-x-1/2 pointer-events-none top-0 translate-y-1/2" icon={History} />
    </div>
  );
};

const SaveName: FC<{ characterName: string }> = ({ characterName }) => {
  const { inputedNameAtom } = useChannelAtoms();
  const inputedName = useAtomValue(inputedNameAtom);
  if (inputedName.trim() === '' || inputedName === characterName) {
    return null;
  }

  return <button className="underline">Save</button>;
};

export const NameToolbox: FC<{ channelMember: ChannelMember }> = ({ channelMember }) => {
  const myId = channelMember.userId;
  const { channelId, characterName } = channelMember;
  const { inGameAtom, composeAtom, isActionAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isAction = useAtomValue(isActionAtom);
  const inGame = useAtomValue(inGameAtom);
  return (
    <div className="absolute font-normal right-0 top-full bg-lowest border border-surface-800 rounded-sm py-2 px-3 w-max text-sm">
      <div className="flex gap-2 justify-end">
        <label>
          <input type="checkbox" checked={isAction} onChange={() => dispatch({ type: 'toggleAction', payload: {} })} />
          <span className="ml-1">
            <FormattedMessage defaultMessage="Action" />
          </span>
        </label>

        <label>
          <input type="checkbox" checked={inGame} onChange={() => dispatch({ type: 'toggleInGame', payload: {} })} />
          <span className="ml-1">
            <FormattedMessage defaultMessage="In Game" />
          </span>
        </label>
      </div>
      {inGame && (
        <div className="">
          <label className="block">
            <div className="py-1">
              <FormattedMessage defaultMessage="Character Name" />
            </div>
            <NameInput className="w-[10rem]" />
          </label>
          <div className="flex justify-between">
            <div>
              History <NameHistory myId={myId} channelId={channelId} />
            </div>
            <SaveName characterName={channelMember.characterName} />
          </div>
        </div>
      )}
    </div>
  );
};
