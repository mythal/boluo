import { useMe } from 'common';
import { atom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { FC, useCallback, useMemo, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { ChatSpaceState } from '../../state/chat.reducer';
import { chatAtom } from '../../state/chat.atoms';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { Option, Select } from './SelfPreviewToolboxNameSelect';

const OOC_STATE = 'BOLUO_OOC_STATE';

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

const truncateName = (name: string) => {
  if (name.length <= 24) return name;
  return `${name.slice(0, 18)}…`;
};

interface Props {
  defaultCharacterName: string;
  channelId: string;
  myId: string;
}

export const SelfPreviewToolboxNameHistory: FC<Props> = ({ channelId, myId, defaultCharacterName }) => {
  const me = useMe();
  const store = useStore();
  const { inGameAtom, inputedNameAtom } = useChannelAtoms();
  const nameHistory = useMemo(
    // In this case, we don't need to use `useAtom` hooks.
    () => chatStateToNameList(store.get(chatAtom), channelId, myId),
    [channelId, myId, store],
  );
  const selectedValueAtom = useMemo(
    () =>
      atom((read) => {
        const inputedName = read(inputedNameAtom);
        const inGame = read(inGameAtom);
        if (!inGame) return OOC_STATE;
        if (inputedName.trim() === '') return ''; // Custom
        if (nameHistory.includes(inputedName)) return inputedName;
        return '';
      }),
    [inGameAtom, inputedNameAtom, nameHistory],
  );

  const dispatch = useSetAtom(useComposeAtom());
  const nameOptions = useMemo(
    () =>
      nameHistory.map((name, key) => (
        <Option key={key} name={name}>
          {truncateName(name)}
        </Option>
      )),
    [nameHistory],
  );
  const handleChange = useCallback(
    (name: string) => {
      if (name === OOC_STATE) {
        dispatch({ type: 'toggleInGame', payload: { inGame: false } });
      } else {
        dispatch({ type: 'toggleInGame', payload: { inGame: true } });
        dispatch({ type: 'setInputedName', payload: { inputedName: name } });
      }
    },
    [dispatch],
  );
  if (me == null) {
    alert('Unexpected error: You are not logged in.');
    return null;
  }
  return (
    <div className="relative col-span-1 flex h-full w-full">
      <Select selectedValueAtom={selectedValueAtom} onChange={handleChange}>
        {nameOptions}
        <Option name={OOC_STATE}>
          <div>{me === 'LOADING' ? '…' : me.user.nickname}</div>
          <div className="text-text-light text-xs font-normal leading-tight">
            <FormattedMessage defaultMessage="Out Of Game" />
          </div>
        </Option>
        <Option name="">
          {defaultCharacterName === '' ? (
            <FormattedMessage defaultMessage="New..." />
          ) : (
            <>
              <div>{defaultCharacterName}</div>
              <div className="text-text-light text-xs font-normal leading-tight">
                <FormattedMessage defaultMessage="Default" />
              </div>
            </>
          )}
        </Option>
      </Select>
    </div>
  );
};
