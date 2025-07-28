import React, { type FC, type ReactNode, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useAtomValue, useSetAtom } from 'jotai';
import Icon from '@boluo/ui/Icon';
import {
  Edit,
  PaperPlane,
  PersonRunning,
  TowerBroadcast,
  TriangleAlert,
  Whisper,
  X,
} from '@boluo/icons';
import { FormattedMessage } from 'react-intl';
import { useComposeError } from '../../hooks/useComposeError';
import { useSend } from './useSend';
import { type User } from '@boluo/api';
import clsx from 'clsx';
import { ComposeErrorReason } from '../compose/ComposeErrorReason';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { selectAtom } from 'jotai/utils';

interface Props {
  currentUser: User;
}

interface ToolbarButtonProps {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

const ToolbarButton = ({
  children,
  onClick,
  active = false,
  disabled = false,
  ref,
}: ToolbarButtonProps) => {
  return (
    <button
      onClick={onClick}
      onTouchEnd={(e) => {
        // https://stackoverflow.com/a/71725297
        e.preventDefault();
        onClick();
      }}
      data-active={active}
      ref={ref}
      disabled={disabled}
      className={clsx(
        'bg-preview-toolbar-bg hover:enabled:bg-preview-toolbar-hover border-transprent text-text-base inline-flex items-center gap-0.5 rounded-sm border px-1 py-0.5 text-xs shadow-sm',
        'data-[active="true"]:border-preview-toolbar-active-border data-[active="true"]:bg-preview-toolbar-active-bg data-[active="true"]:hover:enabled:bg-preview-toolbar-active-bgHover data-[active="true"]:translate-y-px',
        'disabled:text-text-light disabled:bg-surface-200 disabled:cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
};

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
    <ToolbarButton
      active={isAction}
      onClick={() => dispatch({ type: 'toggleAction', payload: {} })}
    >
      <Icon icon={PersonRunning} className={isAction ? '' : 'opacity-50'} />
      <FormattedMessage defaultMessage="Action" />
    </ToolbarButton>
  );
};

const SendButton: FC<{ currentUser: User }> = ({ currentUser }) => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const editAtom = useMemo(() => selectAtom(composeAtom, ({ edit }) => edit), [composeAtom]);
  const editMode = useAtomValue(editAtom) != null;
  const composeError = useComposeError();
  const send = useSend(currentUser);
  return (
    <>
      <ToolbarButton disabled={composeError != null} onClick={send}>
        <Icon icon={editMode ? Edit : PaperPlane} />
        {editMode ? (
          <FormattedMessage defaultMessage="Edit" />
        ) : (
          <FormattedMessage defaultMessage="Send" />
        )}
      </ToolbarButton>
      {editMode && (
        <ToolbarButton onClick={() => dispatch({ type: 'reset', payload: {} })}>
          <Icon icon={X} />
        </ToolbarButton>
      )}
      {composeError && composeError !== 'TEXT_EMPTY' && (
        <div className="bg-lowest border-text-warning absolute right-0 top-0 z-10 -translate-y-[calc(100%-2px)] rounded-sm border px-2 py-1 text-sm">
          <Icon icon={TriangleAlert} className="text-text-warning mr-1" />
          <ComposeErrorReason error={composeError} />
        </div>
      )}
    </>
  );
};

const WhisperButton: FC<{ currentUser: User }> = ({ currentUser }) => {
  const { isWhisperAtom, composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isWhisper = useAtomValue(isWhisperAtom);
  return (
    <ToolbarButton
      active={isWhisper}
      onClick={() =>
        dispatch({ type: 'toggleWhisper', payload: { username: currentUser.username } })
      }
    >
      <Icon icon={Whisper} className={isWhisper ? '' : 'opacity-50'} />
      <FormattedMessage defaultMessage="Whisper" />
    </ToolbarButton>
  );
};

export const SelfPreviewToolbar: FC<Props> = ({ currentUser }) => {
  const whisperButton = useMemo(() => <WhisperButton currentUser={currentUser} />, [currentUser]);
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
