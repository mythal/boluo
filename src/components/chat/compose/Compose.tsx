import * as React from 'react';
import { useMemo, useReducer, useRef } from 'react';
import { css } from '@emotion/core';
import { blue, gray, textColor, white } from '../../../styles/colors';
import { mR, mT, p, pX, pY, relative, roundedSm, spacingN, textBase, textXs } from '../../../styles/atoms';
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
import { post } from '../../../api/request';
import { throwErr } from '../../../utils/errors';
import { uploadMedia } from './helper';
import ComposeInput from './ComposeInput';
import MessageMedia from '../MessageMedia';
import ChatImageUploadButton from './ImageUploadButton';
import { handleKeyDown } from '../key';
import Tooltip from '../../atoms/Tooltip';
import mask from '../../../assets/icons/theater-masks.svg';

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

const inGameContainer = css`
  ${[relative]};

  & .tooltip {
    visibility: hidden;
  }

  &:hover .tooltip {
    visibility: visible;
  }
`;

const nameInput = css`
  border: 1px solid ${gray['800']};
  color: ${textColor};
  ${[textBase, pY(1.5), pX(1.5), roundedSm]};
  width: 8rem;
  background-color: ${gray['900']};
  &:focus {
    border-color: ${gray['700']};
    outline: none;
  }
`;

const sendContainer = css`
  grid-area: send;
  text-align: right;
`;

const mediaContainer = css`
  position: absolute;
  top: 0;
  right: 4rem;
  ${[roundedSm]};
  border: 1px solid ${white};
  transform: translateY(-90%) rotate(25deg);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialText = useMemo(() => preview?.text || '', []);
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
    text: initialText,
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
  const onKeyDown: React.KeyboardEventHandler = handleKeyDown(composeDispatch, onSend, inGame);
  const toggleInGame = () => composeDispatch(update({ inGame: !inGame }));

  return (
    <div css={container} ref={containerRef} onKeyDown={onKeyDown}>
      <div css={toolbar}>
        <BroadcastSwitch size="large" broadcast={broadcast} composeDispatch={composeDispatch} css={[mR(1)]} />
        <ActionSwitch size="large" isAction={isAction} composeDispatch={composeDispatch} css={[mR(1)]} />
        <div css={inGameContainer}>
          <Tooltip className="tooltip">
            <div>游戏内</div>
            <div css={[textXs]}>{isMac ? 'Option' : 'Alt'}</div>
            {inGame && (
              <div css={[mT(1)]}>
                <input value={inputName} css={nameInput} onChange={handleNameChange} placeholder="角色名" />
              </div>
            )}
          </Tooltip>
          <ChatItemToolbarButton on={inGame} onClick={toggleInGame} sprite={mask} size="large" />
        </div>
      </div>
      <ComposeInput
        id={messageId}
        autoFocus
        autoSize
        css={[input]}
        initialValue={initialText}
        composeDispatch={composeDispatch}
        inGame={inGame}
      />
      {media && (
        <div css={mediaContainer}>
          <MessageMedia file={media} />
        </div>
      )}
      <div css={sendContainer}>
        <ChatImageUploadButton
          size="large"
          hasImage={media !== undefined}
          composeDispatch={composeDispatch}
          css={[mR(1)]}
        />
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
