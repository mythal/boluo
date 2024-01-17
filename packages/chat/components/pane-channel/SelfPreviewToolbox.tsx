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
import { PersonRunning, SatelliteDish, Whisper } from 'icons';

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

export const SelfPreviewToolbox: FC<{ channelMember: ChannelMember }> = ({ channelMember }) => {
  const myId = channelMember.userId;
  const { channelId } = channelMember;
  const { inGameAtom, composeAtom, isActionAtom, broadcastAtom, isWhisperAtom } = useChannelAtoms();
  const intl = useIntl();
  const dispatch = useSetAtom(composeAtom);
  const isAction = useAtomValue(isActionAtom);
  const broadcast = useAtomValue(broadcastAtom);
  const inGame = useAtomValue(inGameAtom);
  const isWhisper = useAtomValue(isWhisperAtom);
  const broadcastTitle = intl.formatMessage({ defaultMessage: 'Whether to broadcast your input' });
  const actionTitle = intl.formatMessage({ defaultMessage: 'Describe an action' });
  const whisperTitle = intl.formatMessage({ defaultMessage: 'Only certain people can read' });
  return (
    <div className="bg-surface-100 border-lowest flex w-[14em] select-none flex-col gap-1 rounded border px-2 py-2 text-sm font-normal shadow">
      <div className="flex justify-between gap-1">
        <label className="block" title={actionTitle}>
          <div className="text-xs leading-none">Action</div>
          <div className="text-right">
            <span className="ml-1">
              <PersonRunning className="inline" />
            </span>
            <input
              type="checkbox"
              checked={isAction}
              onChange={() => dispatch({ type: 'toggleAction', payload: {} })}
            />
          </div>
        </label>

        <label className="block" title={broadcastTitle}>
          <div className="text-xs leading-none">Broadcast</div>
          <div className="text-right">
            <span className="mr-1">
              <SatelliteDish className="inline" />
            </span>
            <input
              type="checkbox"
              checked={broadcast}
              onChange={() => dispatch({ type: 'toggleBroadcast', payload: {} })}
            />
          </div>
        </label>

        <label className="block" title={whisperTitle}>
          <div className="text-xs leading-none">Whisper</div>
          <div className="text-right">
            <span className="mr-1">
              <Whisper className="inline" />
            </span>
            <input
              type="checkbox"
              checked={isWhisper}
              onChange={() => dispatch({ type: 'toggleWhisper', payload: {} })}
            />
          </div>
        </label>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label>
          <input type="checkbox" checked={inGame} onChange={() => dispatch({ type: 'toggleInGame', payload: {} })} />
          <span className="ml-1">
            <FormattedMessage defaultMessage="As" />
          </span>
        </label>
        <NameHistory myId={myId} channelId={channelId} />
      </div>
      {inGame && (
        <div className="">
          <NameInput className="w-full" />
        </div>
      )}
    </div>
  );
};
