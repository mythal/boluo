import { ChannelMember } from 'api';
import { useAtomValue, useSetAtom } from 'jotai';
import { FC, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { NameInput } from './NameInput';
import { Mask, PersonRunning, Platte, SatelliteDish, Whisper, X } from 'icons';
import { SelfPreviewToolboxSwitch } from './SelfPreviewToolboxSwitch';
import { SelfPreviewToolboxNameHistory } from './SelfPreviewToolboxNameHistory';
import { SelfPreviewToolboxWhisper } from './SelfPreviewToolboxWhisper';
import { SelfPreviewToolboxWhisperSwitch } from './SelfPreviewToolboxWhisperSwitch';

interface Props {
  channelMember: ChannelMember;
  dismiss: () => void;
}

export const SelfPreviewToolbox: FC<Props> = ({ channelMember, dismiss }) => {
  const myId = channelMember.userId;
  const { channelId, characterName } = channelMember;
  const { inGameAtom, composeAtom, isActionAtom, broadcastAtom, isWhisperAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isAction = useAtomValue(isActionAtom);
  const broadcast = useAtomValue(broadcastAtom);
  const inGame = useAtomValue(inGameAtom);
  return (
    <div className="bg-surface-100 border-lowest relative grid w-[17em] select-none grid-cols-4 items-stretch gap-1 rounded border px-2 py-2 text-sm font-normal shadow">
      <SelfPreviewToolboxSwitch
        checked={inGame}
        onChange={() => dispatch({ type: 'toggleInGame', payload: {} })}
        icon={Mask}
      >
        <FormattedMessage defaultMessage="As" />
      </SelfPreviewToolboxSwitch>
      <SelfPreviewToolboxSwitch
        checked={isAction}
        onChange={() => dispatch({ type: 'toggleAction', payload: {} })}
        icon={PersonRunning}
      >
        <FormattedMessage defaultMessage="Action" />
      </SelfPreviewToolboxSwitch>
      <SelfPreviewToolboxSwitch
        checked={broadcast}
        icon={SatelliteDish}
        onChange={() => dispatch({ type: 'toggleBroadcast', payload: {} })}
      >
        <FormattedMessage defaultMessage="Live" />
      </SelfPreviewToolboxSwitch>

      <SelfPreviewToolboxWhisperSwitch channelMember={channelMember} />

      <SelfPreviewToolboxNameHistory myId={myId} channelId={channelId} defaultCharacterName={characterName} />
      <div className="col-span-3 w-full">
        <NameInput disabled={!inGame} className="w-full" defaultCharacterName={characterName} />
      </div>
      <button
        className="absolute -bottom-2 -right-2 rounded-full border border-blue-600 bg-blue-300 p-1 text-lg"
        onClick={() => alert('Work in Process')}
      >
        <Platte />
        <input type="color" hidden />
      </button>
    </div>
  );
};
