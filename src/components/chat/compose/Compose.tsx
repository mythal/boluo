import * as React from 'react';
import { useReducer, useRef } from 'react';
import { css } from '@emotion/core';
import { blue, gray, textColor } from '../../../styles/colors';
import { alignRight, mR, p, pX, pY, roundedSm, spacingN, textBase } from '../../../styles/atoms';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { isMac } from '../../../utils/browser';
import paperPlane from '../../../assets/icons/paper-plane.svg';
import { darken } from 'polished';
import BroadcastSwitch from './BroadcastSwitch';
import ActionSwitch from './ActionSwitch';
import { Preview } from '../../../api/events';
import { Id, newId } from '../../../utils/id';
import { ChannelMember } from '../../../api/channels';
import { useDispatch, useSelector } from '../../../store';
import { useSend } from '../../../hooks/useSend';
import { composeReducer, ComposeState, update } from './reducer';
import InGameSwitch from './InGameSwitch';
import { post } from '../../../api/request';
import { throwErr } from '../../../utils/errors';
import { uploadMedia } from './helper';
import ComposeInput from './ComposeInput';

const container = css`
  grid-row: compose-start / compose-end;
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas: 'toolbar input  send';
  gap: ${spacingN(2)};
  align-items: flex-end;
  background-color: ${darken(0.05, blue['900'])};
  ${pX(2)} ${pY(2)};
  position: relative;
  &:focus-within {
    background-color: ${blue['900']};
  }
`;

const toolbar = css`
  grid-area: toolbar;
  display: flex;
`;

const input = css`
  grid-area: input;
  resize: none;
  height: 2.5rem;
  min-height: 100%;
  color: ${textColor};
  ${[textBase, p(2), roundedSm]};
  background-color: ${gray['900']};
  border: none;
  &:focus {
    outline: none;
  }
`;

const nameInput = css`
  flex: 1 1;
  border: none;
  color: ${textColor};
  ${[textBase, pY(1.5), pX(1.5), alignRight, roundedSm]};
  width: 0;
  background-color: ${darken(0.1, blue['900'])};
  &:focus {
    outline: none;
  }
`;

const sendContainer = css`
  grid-area: send;
  text-align: right;
`;

const mediaContainer = css`
  grid-area: media;
`;

const nameContainer = css`
  grid-area: name;
  display: flex;
`;

interface Props {
  channelId: Id;
  member: ChannelMember;
  preview: Preview | undefined;
}

function Compose({ preview, channelId, member }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nickname = useSelector((state) => state.profile!.user.nickname);
  const dispatch = useDispatch();
  const sendEvent = useSend();
  const makeInitState = (): ComposeState => ({
    sending: false,
    inGame: preview?.inGame || false,
    broadcast: true,
    isAction: preview?.isAction || false,
    inputName: (preview?.inGame && preview.name) || member.characterName,
    nickname,
    initial: true,
    media: undefined,
    sendEvent,
    editFor: undefined,
    appDispatch: dispatch,
    messageId: preview?.id || newId(),
    text: preview?.text || '',
    entities: preview?.entities || [],
    clear: false,
  });
  const [
    { messageId, text, broadcast, isAction, inGame, sending, inputName, media, entities, canSubmit },
    composeDispatch,
  ] = useReducer(composeReducer, undefined, makeInitState);

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
      <div css={toolbar}>
        <BroadcastSwitch size="large" broadcast={broadcast} composeDispatch={composeDispatch} css={[mR(1)]} />
        <ActionSwitch size="large" isAction={isAction} composeDispatch={composeDispatch} css={[mR(1)]} />
        <InGameSwitch size="large" inGame={inGame} composeDispatch={composeDispatch} />
      </div>
      {/*{inGame && (*/}
      {/*  <div css={nameContainer} data-show={inGame}>*/}
      {/*    <input value={inputName} css={nameInput} onChange={handleNameChange} placeholder="角色名" />*/}
      {/*    /!*<Icon sprite={historyIcon} />*!/*/}
      {/*  </div>*/}
      {/*)}*/}
      <ComposeInput
        key={messageId}
        autoFocus
        autoSize
        css={[input]}
        initialValue={text}
        composeDispatch={composeDispatch}
        inGame={inGame}
      />
      {/*<div css={mediaContainer}>*/}
      {/*  <MessageMedia file={media} />*/}
      {/*</div>*/}
      <div css={sendContainer}>
        <ChatItemToolbarButton
          loading={sending}
          sprite={paperPlane}
          onClick={onSend}
          title="发送"
          size="large"
          info={isMac ? '⌘ + ⏎' : 'Ctrl + ⏎'}
          x="left"
        />
      </div>
    </div>
  );
}

export default React.memo(Compose);
