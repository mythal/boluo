import React, { FC, ReactNode, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useAtomValue, useSetAtom } from 'jotai';
import Icon from '@boluo/ui/Icon';
import { PaperPlane, PersonRunning, TowerBroadcast, Whisper } from '@boluo/icons';
import { FormattedMessage } from 'react-intl';
import { useComposeError } from '../../hooks/useComposeError';
import { useSend } from './useSend';
import { User } from '@boluo/api';
import clsx from 'clsx';
import { ComposeErrorReason } from '../compose/ComposeErrorReason';

interface Props {
  currentUser: User;
}

const ToolbarButton = React.forwardRef<
  HTMLButtonElement,
  { children: ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }
>(({ children, onClick, active = false, disabled = false }, ref) => {
  return (
    <button
      onClick={onClick}
      data-active={active}
      ref={ref}
      disabled={disabled}
      className={clsx(
        'bg-lowest hover:enabled:bg-surface-100 inline-flex items-center gap-0.5 rounded-sm border border-gray-200 px-1 py-0.5 text-xs shadow-sm group-hover:enabled:border-gray-500',
        'data-[active="true"]:border-brand-600 data-[active="true"]:bg-brand-50 data-[active="true"]:translate-y-px ',
        'disabled:text-text-light disabled:bg-surface-200 disabled:cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
});
ToolbarButton.displayName = 'ToolbarButton';

const MuteButton = () => {
  const { broadcastAtom, isWhisperAtom, composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isWhisper = useAtomValue(isWhisperAtom);
  const isBroadcast = useAtomValue(broadcastAtom);
  const isMute = !isBroadcast || isWhisper;
  return (
    <ToolbarButton
      disabled={isWhisper}
      active={isMute}
      onClick={() => dispatch({ type: 'toggleBroadcast', payload: {} })}
    >
      <Icon icon={TowerBroadcast} className={isMute ? 'opacity-50' : ''} />
      <FormattedMessage defaultMessage="Mute" />
    </ToolbarButton>
  );
};

const ActionButton = () => {
  const { isActionAtom, composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isAction = useAtomValue(isActionAtom);
  return (
    <ToolbarButton active={isAction} onClick={() => dispatch({ type: 'toggleAction', payload: {} })}>
      <Icon icon={PersonRunning} className={isAction ? '' : 'opacity-50'} />
      <FormattedMessage defaultMessage="Action" />
    </ToolbarButton>
  );
};

const SendButton: FC<{ currentUser: User }> = ({ currentUser }) => {
  const composeError = useComposeError();
  const send = useSend(currentUser, composeError);
  return (
    <>
      <ToolbarButton disabled={composeError !== null} onClick={send}>
        <Icon icon={PaperPlane} />
        <FormattedMessage defaultMessage="Send" />
      </ToolbarButton>
      {composeError && (
        <div className="bg-lowest absolute right-0 top-0 z-10 -translate-y-[calc(100%+0.25rem)] rounded-sm border px-2 py-1 text-sm shadow">
          <ComposeErrorReason error={composeError} />
        </div>
      )}
    </>
  );
};

const WhisperButton = () => {
  const { isWhisperAtom, composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isWhisper = useAtomValue(isWhisperAtom);
  return (
    <ToolbarButton active={isWhisper} onClick={() => dispatch({ type: 'toggleWhisper', payload: {} })}>
      <Icon icon={Whisper} className={isWhisper ? '' : 'opacity-50'} />
      <FormattedMessage defaultMessage="Whisper" />
    </ToolbarButton>
  );
};

export const SelfPreviewToolbar: FC<Props> = ({ currentUser }) => {
  const whisperButton = useMemo(() => <WhisperButton />, []);
  const muteButton = useMemo(() => <MuteButton />, []);
  const actionButton = useMemo(() => <ActionButton />, []);
  const sendButton = useMemo(() => <SendButton currentUser={currentUser} />, [currentUser]);
  return (
    <div className="relative flex justify-end gap-1">
      {whisperButton}
      {muteButton}
      {actionButton}
      {sendButton}
    </div>
  );
};
