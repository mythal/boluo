import React, { Activity, type FC, type ReactNode, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import Icon from '@boluo/ui/Icon';
import Edit from '@boluo/icons/Edit';
import PaperPlane from '@boluo/icons/PaperPlane';
import PersonRunning from '@boluo/icons/PersonRunning';
import TowerBroadcast from '@boluo/icons/TowerBroadcast';
import TriangleAlert from '@boluo/icons/TriangleAlert';
import Whisper from '@boluo/icons/Whisper';
import X from '@boluo/icons/X';
import { FormattedMessage, type IntlShape, useIntl } from 'react-intl';
import { useComposeError } from '../../hooks/useComposeError';
import { useSend } from './useSend';
import { type User } from '@boluo/api';
import { ComposeErrorReason } from '../compose/ComposeErrorReason';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { selectAtom } from 'jotai/utils';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { useTooltip } from '@boluo/ui/hooks/useTooltip';
import { TooltipBox } from '@boluo/ui/TooltipBox';

interface Props {
  currentUser: User;
}

interface ToolbarButtonProps {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  tooltip?: ReactNode;
  variant?: 'default' | 'primary';
  ref?: React.Ref<HTMLButtonElement>;
}

const ToolbarButton = ({
  children,
  onClick,
  active = false,
  disabled = false,
  ref,
  tooltip,
  variant = 'default',
}: ToolbarButtonProps) => {
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } =
    useTooltip('top-start');
  return (
    <span ref={refs.setReference} {...getReferenceProps()}>
      <ButtonInline
        variant={variant}
        onClick={onClick}
        onTouchEnd={(e) => {
          // https://stackoverflow.com/a/71725297
          e.preventDefault();
          onClick();
        }}
        data-active={active}
        ref={ref}
        disabled={disabled}
      >
        {children}
      </ButtonInline>
      {tooltip && (
        <Activity mode={showTooltip ? 'visible' : 'hidden'}>
          <TooltipBox
            show
            style={floatingStyles}
            ref={refs.setFloating}
            {...getFloatingProps()}
            defaultStyle
          >
            {tooltip}
          </TooltipBox>
        </Activity>
      )}
    </span>
  );
};

const MuteButton: FC<{ intl: IntlShape }> = ({ intl }) => {
  const { broadcastAtom, isWhisperAtom, composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isWhisper = useAtomValue(isWhisperAtom);
  const isBroadcast = useAtomValue(broadcastAtom);
  const isMute = !isBroadcast || isWhisper;
  let tooltip: ReactNode = intl.formatMessage({
    defaultMessage: 'Whether broadcast your input preview.',
  });
  if (isWhisper) {
    tooltip = (
      <>
        <Icon icon={TriangleAlert} className="mr-1" />
        {intl.formatMessage({ defaultMessage: 'Will not broadcast when whispering.' })}
      </>
    );
  }
  return (
    <ToolbarButton
      active={isMute}
      tooltip={tooltip}
      onClick={() => dispatch({ type: 'toggleBroadcast', payload: {} })}
    >
      <Icon icon={TowerBroadcast} className={isMute ? 'opacity-50' : ''} />
      <span className="ml-1">
        <FormattedMessage defaultMessage="Mute" />
      </span>
    </ToolbarButton>
  );
};

const ActionButton: FC<{ intl: IntlShape }> = ({ intl }) => {
  const { isActionAtom, composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isAction = useAtomValue(isActionAtom);
  const tooltip = intl.formatMessage({ defaultMessage: 'Mark as an action.' });
  return (
    <ToolbarButton
      active={isAction}
      tooltip={tooltip}
      onClick={() => dispatch({ type: 'toggleAction', payload: {} })}
    >
      <Icon icon={PersonRunning} className={isAction ? '' : 'opacity-50'} />
      <span className="ml-1">
        <FormattedMessage defaultMessage="Action" />
      </span>
    </ToolbarButton>
  );
};

const SendButton: FC<{ intl: IntlShape }> = () => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const editAtom = useMemo(() => selectAtom(composeAtom, ({ edit }) => edit), [composeAtom]);
  const editMode = useAtomValue(editAtom) != null;
  const composeError = useComposeError();
  const send = useSend();
  return (
    <>
      <ToolbarButton
        disabled={composeError != null}
        variant="primary"
        tooltip={
          composeError &&
          composeError !== 'TEXT_EMPTY' && (
            <>
              <Icon icon={TriangleAlert} className="mr-1" />
              <ComposeErrorReason error={composeError} />
            </>
          )
        }
        onClick={() => void send()}
      >
        <Icon icon={editMode ? Edit : PaperPlane} />
        <span className="ml-1">
          {editMode ? (
            <FormattedMessage defaultMessage="Edit" />
          ) : (
            <FormattedMessage defaultMessage="Send" />
          )}
        </span>
      </ToolbarButton>
      {editMode && (
        <ToolbarButton onClick={() => dispatch({ type: 'reset', payload: {} })}>
          <Icon icon={X} />
        </ToolbarButton>
      )}
    </>
  );
};

const WhisperButton: FC<{ currentUser: User; intl: IntlShape }> = ({ currentUser, intl }) => {
  const { isWhisperAtom, composeAtom, lastWhisperTargetsAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const isWhisper = useAtomValue(isWhisperAtom);
  const store = useStore();
  const onClick = () => {
    const lastWhisperTargets = store.get(lastWhisperTargetsAtom);
    const usernames =
      lastWhisperTargets == null || lastWhisperTargets.length === 0
        ? [currentUser.username]
        : lastWhisperTargets;

    dispatch({
      type: 'toggleWhisper',
      payload: {
        usernames,
      },
    });
  };
  return (
    <ToolbarButton
      active={isWhisper}
      tooltip={intl.formatMessage({ defaultMessage: 'Only visible to selected people.' })}
      onClick={onClick}
    >
      <Icon icon={Whisper} className={isWhisper ? '' : 'opacity-50'} />
      <span className="ml-1">
        <FormattedMessage defaultMessage="Whisper" />
      </span>
    </ToolbarButton>
  );
};

export const SelfPreviewToolbar: FC<Props> = ({ currentUser }) => {
  const intl = useIntl();
  const whisperButton = useMemo(
    () => <WhisperButton intl={intl} currentUser={currentUser} />,
    [currentUser, intl],
  );
  const muteButton = useMemo(() => <MuteButton intl={intl} />, [intl]);
  const actionButton = useMemo(() => <ActionButton intl={intl} />, [intl]);
  const sendButton = useMemo(() => <SendButton intl={intl} />, [intl]);
  return (
    <div className="SelfPreviewToolbar pr-message-small compact:pr-message-compact irc:pr-message font-ui relative flex w-full justify-start gap-1 text-sm">
      {actionButton}
      {whisperButton}
      {muteButton}
      <span className="grow" />
      {sendButton}
    </div>
  );
};
