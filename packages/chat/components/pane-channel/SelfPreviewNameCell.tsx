import { ChannelMember } from 'api';
import clsx from 'clsx';
import { History, Save } from 'icons';
import { useSetAtom, useStore } from 'jotai';
import { FC, memo, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import Icon from 'ui/Icon';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useEditChannelCharacterName } from '../../hooks/useEditChannelCharacterName';
import { chatAtom } from '../../state/chat.atoms';
import { ChatSpaceState } from '../../state/chat.reducer';
import { InGameSwitchButton } from '../compose/InGameSwitchButton';
import { IsActionIndicator } from './IsActionIndicator';
import { Name } from './Name';
import { NameInput } from './NameInput';

interface Props {
  inGame: boolean;
  isAction: boolean;
  name: string;
  channelMember: ChannelMember;
}

const SaveAsCharacterName: FC<{ channelId: string; characterName: string }> = ({ channelId, characterName }) => {
  const {
    trigger,
    isMutating,
  } = useEditChannelCharacterName(channelId);
  return (
    <button
      className={clsx(
        'absolute left-0 bottom-full w-max bg-pin-brand-600 text-pin-lowest rounded-sm shadow-1/2 shadow-surface-400/50 px-2 py-1 -translate-x-2',
        'opacity-40 hover:opacity-100 group-hover:opacity-100',
      )}
      onClick={() => trigger({ characterName })}
    >
      {isMutating
        ? (
          <span className="text-sm animate-pulse text-pin-lowest">
            <FormattedMessage defaultMessage="Saving…" />
          </span>
        )
        : (
          <span className="text-sm flex-none">
            <Icon icon={Save} className="mr-1" />
            <FormattedMessage defaultMessage="Keep name" />
          </span>
        )}
    </button>
  );
};

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

export const SelfPreviewNameCell = memo<Props>(({ inGame, name, isAction, channelMember }) => {
  const { isMaster, characterName } = channelMember;
  return (
    <div className="flex @2xl:flex-col pb-2 gap-y-1 gap-x-4 items-center @2xl:items-end justify-between @2xl:justify-start">
      <div className="flex-grow flex-shrink-1 @2xl:flex-shrink-0 max-w-full relative">
        {!isAction ? <Name name={name} isMaster={isMaster} isPreview self /> : <IsActionIndicator />}

        {inGame && name !== '' && characterName !== name && (
          <SaveAsCharacterName channelId={channelMember.channelId} characterName={name} />
        )}
      </div>

      <div className="flex-shrink flex gap-1 h-8">
        {inGame && <NameInput className="text-sm w-[5rem] @xs:w-[7rem] @2xl:w-full " />}

        {inGame && <NameHistory myId={channelMember.userId} channelId={channelMember.channelId} />}
        <InGameSwitchButton type="ICON" />
      </div>
    </div>
  );
});
SelfPreviewNameCell.displayName = 'SelfPreviewNameCell';
