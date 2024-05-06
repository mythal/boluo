import React, { FC, ReactNode } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useAtomValue, useSetAtom } from 'jotai';
import Icon from '@boluo/ui/Icon';
import { TowerBroadcast, MegaphoneOff, Whisper } from '@boluo/icons';
import { FormattedMessage } from 'react-intl';
import { PaneSize } from '../../hooks/usePaneSize';

const VisibilityButton: FC<{
  active: boolean;
  label: ReactNode;
  paneSize: PaneSize;
  command?: string;
  icon: typeof Whisper;
  onClick: () => void;
}> = ({ active, label, icon, command, onClick, paneSize }) => {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-sm px-1 ${active ? 'bg-preview-button-hover-bg' : 'text-text-lighter hover:text-text-base bg-preview-button-bg hover:bg-preview-button-hover-bg'}`}
    >
      <Icon icon={icon} className={'mx-0.5'} />
      <span className="@md:inline hidden">{label}</span>
    </button>
  );
};

export const SelfPreviewVisibilitySwitch = React.memo<{ paneSize: PaneSize }>(({ paneSize }) => {
  const { visibilityAtom, composeAtom } = useChannelAtoms();
  const visibility = useAtomValue(visibilityAtom);
  const dispatch = useSetAtom(composeAtom);
  const setBroadcast = () => dispatch({ type: 'setVisibility', payload: { visibility: 'BROADCAST' } });
  const setMute = () => dispatch({ type: 'setVisibility', payload: { visibility: 'MUTE' } });
  const setWhisper = () => dispatch({ type: 'setVisibility', payload: { visibility: 'WHISPER' } });
  return (
    <div className="inline-flex h-6 flex-none select-none items-center gap-0.5 pr-2 text-sm">
      <VisibilityButton
        paneSize={paneSize}
        active={visibility === 'BROADCAST'}
        label="Broadcast"
        icon={TowerBroadcast}
        onClick={setBroadcast}
      />
      <VisibilityButton
        paneSize={paneSize}
        active={visibility === 'MUTE'}
        label={<FormattedMessage defaultMessage="Mute" />}
        icon={MegaphoneOff}
        command=".mute"
        onClick={setMute}
      />
      <VisibilityButton
        paneSize={paneSize}
        active={visibility === 'WHISPER'}
        label={<FormattedMessage defaultMessage="Whisper" />}
        icon={Whisper}
        command=".h"
        onClick={setWhisper}
      />
    </div>
  );
});

SelfPreviewVisibilitySwitch.displayName = 'SelfPreviewVisibilitySwitch';
