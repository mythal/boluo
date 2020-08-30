import * as React from 'react';
import { useReducer, useRef } from 'react';
import { css } from '@emotion/core';
import { useAutoHeight } from '../../../hooks/useAutoHeight';
import { blue, textColor } from '../../../styles/colors';
import {
  flex,
  inlineBlock,
  mR,
  p,
  pX,
  pY,
  relative,
  roundedSm,
  textBase,
  textSm,
  uiShadow,
} from '../../../styles/atoms';
import ChatItemToolbarButton from '../../atoms/ChatItemToolbarButton';
import historyIcon from '../../../assets/icons/history.svg';
import { isMac } from '../../../utils/browser';
import paperPlane from '../../../assets/icons/paper-plane.svg';
import { useAutoWidth } from '../../../hooks/useAutoWidth';
import Icon from '../../atoms/Icon';
import { darken } from 'polished';
import BroadcastSwitch from './BroadcastSwitch';
import ActionSwitch from './ActionSwitch';
import { Preview } from '../../../api/events';
import { Id, newId } from '../../../utils/id';
import { ChannelMember } from '../../../api/channels';
import { useDispatch, useSelector } from '../../../store';
import { useSend } from '../../../hooks/useSend';
import { composeReducer, update } from './reducer';
import InGameSwitch from './InGameSwitch';
import { post } from '../../../api/request';
import { throwErr } from '../../../utils/errors';
import { uploadMedia } from './helper';
import PreviewComposeInput from './PreviewComposeInput';

const container = css`
  grid-row: compose-start / compose-end;
  display: flex;
  align-items: flex-end;
  background-color: ${darken(0.05, blue['900'])};
  ${pX(2)} ${pY(2)};
  position: relative;
  &:focus-within {
    background-color: ${blue['900']};
  }
`;

const input = css`
  flex: 1 1;
  resize: none;
  border: none;
  align-self: center;
  color: ${textColor};
  ${textBase};
  background-color: transparent;
  &:focus {
    outline: none;
  }
`;

const nameInput = css`
  border: none;
  color: ${textColor};
  ${[textSm, pY(1)]};
  background-color: transparent;

  &:focus {
    outline: none;
  }
`;

const nameContainer = css`
  ${[roundedSm, p(2), uiShadow, flex]};
  position: absolute;
  width: max-content;
  top: 0;
  left: 0;
  transform: translate(0, -100%);
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(1px);

  visibility: hidden;

  &[data-show='true'] {
    visibility: visible;
  }
`;

interface Props {
  channelId: Id;
  member: ChannelMember;
  preview: Preview | undefined;
}

function Compose({ preview, channelId, member }: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nickname = useSelector((state) => state.profile!.user.nickname);
  const dispatch = useDispatch();
  const sendEvent = useSend();
  const makeInitState = () => ({
    sending: false,
    inGame: preview?.inGame || false,
    broadcast: true,
    isAction: preview?.isAction || false,
    inputName: preview?.name || member.characterName,
    nickname,
    initial: true,
    media: undefined,
    sendEvent,
    editFor: undefined,
    appDispatch: dispatch,
    messageId: preview?.id || newId(),
    text: preview?.text || '',
    entities: preview?.entities || [],
  });
  const [
    { messageId, text, broadcast, isAction, inGame, sending, inputName, media, entities, canSubmit },
    composeDispatch,
  ] = useReducer(composeReducer, undefined, makeInitState);

  useAutoHeight(text, inputRef);
  useAutoWidth(name, nameInputRef);
  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    composeDispatch(update({ inputName: e.target.value }));
  };
  const onSend = async () => {
    if (!canSubmit) {
      return;
    }
    composeDispatch(update({ sending: true }));
    const mediaId = await uploadMedia(dispatch, media);
    const result = await post('/messages/send', {
      messageId,
      channelId,
      mediaId,
      name: inGame ? inputName : nickname,
      inGame,
      isAction,
      orderDate: null,
      text,
      entities,
    });
    if (!result.isOk) {
      throwErr(dispatch)(result.value);
      composeDispatch(update({ sending: false }));
      return;
    } else {
      composeDispatch(
        update({
          messageId: newId(),
          text: '',
          entities: [],
          initial: true,
          media: undefined,
          sending: false,
        })
      );
    }
  };
  return (
    <div css={container} ref={containerRef}>
      <BroadcastSwitch broadcast={broadcast} composeDispatch={composeDispatch} css={[mR(1)]} />
      <ActionSwitch isAction={isAction} composeDispatch={composeDispatch} css={[mR(1)]} />
      <div css={[inlineBlock, relative, mR(2)]}>
        <InGameSwitch inGame={inGame} composeDispatch={composeDispatch} />
        <div css={nameContainer} data-show={inGame}>
          <input
            value={inputName}
            ref={nameInputRef}
            css={nameInput}
            onChange={handleNameChange}
            placeholder="角色名"
          />
          <Icon sprite={historyIcon} />
        </div>
      </div>
      <PreviewComposeInput
        key={messageId}
        autoFocus
        css={[mR(1), input]}
        initialValue={text}
        composeDispatch={composeDispatch}
        inGame={inGame}
      />
      <ChatItemToolbarButton
        loading={sending}
        sprite={paperPlane}
        onClick={onSend}
        title="发送"
        info={isMac ? '⌘ + ⏎' : 'Ctrl + ⏎'}
        x="left"
      />
    </div>
  );
}

export default React.memo(Compose);
