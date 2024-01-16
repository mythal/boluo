import { ChannelMember } from 'api';
import { useMe } from 'common';
import { atom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { FC, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Select } from 'ui/Select';
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

const truncateName = (name: string) => {
  if (name.length <= 24) return name;
  return `${name.slice(0, 18)}…`;
};

const NameHistory: FC<{ channelId: string; myId: string }> = ({ channelId, myId }) => {
  const me = useMe();
  const intl = useIntl();
  const store = useStore();
  const { inGameAtom, inputedNameAtom } = useChannelAtoms();
  const title = intl.formatMessage({ defaultMessage: 'Select Character' });
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
  const selectedValue = useAtomValue(selectedValueAtom);

  const dispatch = useSetAtom(useComposeAtom());
  const nameOptions = useMemo(
    () =>
      nameHistory.map((name, key) => (
        <option key={key} value={name}>
          {truncateName(name)}
        </option>
      )),
    [nameHistory],
  );
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (value === OOC_STATE) {
      dispatch({ type: 'toggleInGame', payload: { inGame: false } });
    } else {
      dispatch({ type: 'toggleInGame', payload: { inGame: true } });
      dispatch({ type: 'setInputedName', payload: { inputedName: value } });
    }
  };
  if (me == null) {
    throw new Error('Unexpected: empty me');
  }
  return (
    <div className="w-[6rem] flex-1">
      <Select value={selectedValue} title={title} onChange={handleChange}>
        <option value={OOC_STATE}>{me === 'LOADING' ? '…' : me.user.nickname}</option>
        <option value="">
          <FormattedMessage defaultMessage="New…" />
        </option>
        {nameOptions.length > 0 && (
          <option disabled>
            - <FormattedMessage defaultMessage="History Character" /> -
          </option>
        )}
        {nameOptions}
      </Select>
    </div>
  );
};

export const NameToolbox: FC<{ channelMember: ChannelMember }> = ({ channelMember }) => {
  const myId = channelMember.userId;
  const { channelId } = channelMember;
  const { inGameAtom, composeAtom, isActionAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isAction = useAtomValue(isActionAtom);
  const inGame = useAtomValue(inGameAtom);
  return (
    <div className="bg-lowest border-surface-200 flex w-max flex-col gap-1 rounded-sm border px-3 py-2 text-sm font-normal shadow-sm">
      <div className="flex items-center gap-2 text-sm">
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
