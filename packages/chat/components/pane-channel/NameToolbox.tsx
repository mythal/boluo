import { ChannelMember } from 'api';
import { atom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { FC, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
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

const OOC_STATE = 'BOLUO_OOC_STATE';

const NameHistory: FC<{ channelId: string; myId: string }> = (
  { channelId, myId },
) => {
  const intl = useIntl();
  const store = useStore();
  const { inGameAtom, inputedNameAtom } = useChannelAtoms();
  const title = intl.formatMessage({ defaultMessage: 'Name History' });
  const nameHistory = useMemo(
    // In this case, we don't need to use `useAtom` hooks.
    () => chatStateToNameList(store.get(chatAtom), channelId, myId),
    [channelId, myId, store],
  );
  const selectedValueAtom = useMemo(() =>
    atom((read) => {
      const inputedName = read(inputedNameAtom);
      const inGame = read(inGameAtom);
      if (!inGame) return OOC_STATE;
      if (inputedName.trim() === '') return ''; // Custom
      if (nameHistory.includes(inputedName)) return inputedName;
      return '';
    }), [inGameAtom, inputedNameAtom, nameHistory]);
  const selectedValue = useAtomValue(selectedValueAtom);

  const dispatch = useSetAtom(useComposeAtom());
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (value === OOC_STATE) {
      dispatch({ type: 'toggleInGame', payload: { inGame: false } });
    } else {
      dispatch({ type: 'toggleInGame', payload: { inGame: true } });
      dispatch({ type: 'setInputedName', payload: { inputedName: value } });
    }
  };
  return (
    <div className="flex-1">
      <select
        value={selectedValue}
        title={title}
        className="w-[6rem]"
        onChange={handleChange}
      >
        <option value={OOC_STATE}>
          <FormattedMessage defaultMessage="Out Of Character" />
        </option>
        <option value="">
          <FormattedMessage defaultMessage="Custom" />
        </option>
        {nameHistory.map((name, key) => <option key={key} value={name}>{name}</option>)}
      </select>
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
  const { channelId } = channelMember;
  const { inGameAtom, composeAtom, isActionAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isAction = useAtomValue(isActionAtom);
  const inGame = useAtomValue(inGameAtom);
  return (
    <div className="absolute font-normal right-0 top-full bg-lowest border border-surface-800 rounded-sm py-2 px-3 z-30 w-max text-sm flex flex-col gap-1">
      <div className="flex gap-2 text-sm items-center">
        <NameHistory myId={myId} channelId={channelId} />
        <label>
          <input type="checkbox" checked={isAction} onChange={() => dispatch({ type: 'toggleAction', payload: {} })} />
          <span className="ml-1">
            <FormattedMessage defaultMessage="Action" />
          </span>
        </label>
      </div>
      {inGame && (
        <div className="">
          <NameInput className="w-[10rem]" />
        </div>
      )}
    </div>
  );
};
