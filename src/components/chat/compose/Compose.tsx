import * as React from 'react';
import { useMemo, useReducer, useRef } from 'react';
import { css } from '@emotion/core';
import { blue, gray, textColor, white } from '../../../styles/colors';
import {
  breakpoint,
  mediaQuery,
  mR,
  p,
  pX,
  pY,
  roundedSm,
  spacing,
  spacingN,
  textBase,
  uiShadow,
} from '../../../styles/atoms';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { isMac } from '../../../utils/browser';
import paperPlane from '../../../assets/icons/paper-plane.svg';
import { darken } from 'polished';
import BroadcastSwitch from './BroadcastSwitch';
import { Preview } from '../../../api/events';
import { Id, newId } from '../../../utils/id';
import { ChannelMember } from '../../../api/channels';
import { useDispatch, useSelector } from '../../../store';
import { useSend } from '../../../hooks/useSend';
import { calculateCanSubmit, composeReducerMaker, ComposeState, update } from './reducer';
import { post } from '../../../api/request';
import { throwErr } from '../../../utils/errors';
import { uploadMedia } from './helper';
import ComposeInput, { ComposeInputAction } from './ComposeInput';
import MessageMedia from '../MessageMedia';
import { handleKeyDown } from '../key';
import { showFlash } from '../../../actions/flash';
import InGameButton from './InGameButton';
import MenuButton from './MenuButton';
import { NewMessage } from '../../../api/messages';
import { usePane } from '../../../hooks/usePane';
import d20 from '../../../assets/icons/d20.svg';
import { floatPanel } from '../styles';

const container = css`
  grid-row: compose-start / compose-end;
  display: grid;
  grid-template-columns: 1fr auto auto;
  grid-template-areas:
    '    . toolbar  send'
    'input   input input';
  ${mediaQuery(breakpoint.md)} {
    grid-template-columns: auto 1fr auto;
    grid-template-areas: 'toolbar input  send';
  }
  gap: ${spacingN(2)};
  align-items: flex-end;
  background-color: ${darken(0.05, blue['900'])};
  ${pX(2)} ${pY(2)};
  position: relative;
  &:focus-within {
    background-color: ${blue['900']};
  }

  &:focus-within .float-toolbar {
    opacity: 100%;
  }
  & .float-toolbar {
    opacity: 25%;
    position: absolute;
    top: 0;
    left: 0;
    transform: translateY(calc(-100% - ${spacing} * 2));
    ${[p(1), roundedSm, uiShadow, floatPanel]};
    ${mediaQuery(breakpoint.md)} {
      left: unset;
      right: 0;
    }
  }
`;

const toolbar = css`
  grid-area: toolbar;
  display: flex;
`;

const inputContainer = css`
  width: 100%;
  display: flex;
  grid-area: input;
  position: relative;
`;

const input = css`
  resize: none;
  height: 2.5rem;
  width: 100%;
  min-height: 100%;
  color: ${textColor};
  ${[textBase, p(2), roundedSm]};
  background-color: ${gray['900']};
  border: none;
  &:focus {
    outline: none;
  }
`;

const sendContainer = css`
  grid-area: send;
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
  const inputRef = useRef<ComposeInputAction>(null);
  const nickname = useSelector((state) => state.profile!.user.nickname);
  const enterSend = useSelector((state) => state.profile!.settings.enterSend);
  const pane = usePane();
  const rollCommand = useSelector((state) => state.chatStates.get(pane)!.channel.defaultRollCommand);
  const dispatch = useDispatch();
  const sendEvent = useSend();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialText = useMemo(() => preview?.text || '', []);
  const characterName = member.characterName;
  const makeInitState = (): ComposeState => {
    const inGame = preview?.inGame || false;
    const entities = preview?.entities || [];
    return {
      sending: false,
      inGame,
      broadcast: true,
      isAction: preview?.isAction || false,
      inputName: '',
      initial: true,
      media: undefined,
      editFor: undefined,
      messageId: newId(),
      text: initialText,
      entities: entities,
      clear: false,
      canSubmit: calculateCanSubmit(initialText, entities, inGame, characterName),
    };
  };
  const composeReducer = useMemo(
    () => composeReducerMaker({ sendEvent, dispatch, nickname, channelId, characterName }),
    [sendEvent, dispatch, nickname, characterName, channelId]
  );
  const [
    { messageId, text, broadcast, isAction, inGame, sending, inputName, media, entities, canSubmit, whisperTo },
    composeDispatch,
  ] = useReducer(composeReducer, undefined, makeInitState);

  let whyCannotSend: string | null = null;

  if (!canSubmit) {
    if (text === '' || entities.length === 0) {
      whyCannotSend = '消息不能为空';
    } else if (inGame && characterName === '') {
      whyCannotSend = '角色名为空';
    }
  }
  let sendButtonInfo = isMac ? '⌘ + ⏎' : 'Ctrl + ⏎';
  if (enterSend) {
    sendButtonInfo = '⏎';
  }
  sendButtonInfo = whyCannotSend || sendButtonInfo;

  const onSend = async () => {
    if (!canSubmit) {
      dispatch(showFlash('WARNING', whyCannotSend));
      return;
    }
    composeDispatch(update({ sending: true }));
    const mediaId = await uploadMedia(dispatch, media);
    const newMessage: NewMessage = {
      messageId,
      channelId,
      mediaId,
      name: inGame ? inputName || characterName : nickname,
      inGame,
      isAction,
      orderDate: null,
      text,
      entities,
    };
    if (whisperTo !== null && whisperTo !== undefined) {
      newMessage.whisperToUsers = whisperTo.map((item) => item.value);
    }
    composeDispatch(update({ messageId: newId() }));
    const result = await post('/messages/send', newMessage);
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
          prevSubmit: new Date().getTime(),
          pos: undefined,
        })
      );
      inputRef.current?.reset();
    }
  };
  const onKeyDown: React.KeyboardEventHandler = handleKeyDown(composeDispatch, onSend, inGame, enterSend);
  const appendDice: React.MouseEventHandler = (e) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.appendDice(rollCommand);
    }
  };
  const hasImage = media !== undefined;
  return (
    <div css={container} ref={containerRef} onKeyDown={onKeyDown}>
      <div css={toolbar}>
        <BroadcastSwitch size="large" broadcast={broadcast} composeDispatch={composeDispatch} css={[mR(1)]} />
        <InGameButton inGame={inGame} composeDispatch={composeDispatch} inputName={inputName} css={[mR(1)]} />
      </div>
      <div css={inputContainer}>
        <div className="float-toolbar">
          <ChatItemToolbarButton onClick={appendDice} sprite={d20} title="添加骰子" />
        </div>
        <ComposeInput
          ref={inputRef}
          autoFocus
          autoSize
          css={[input]}
          initialValue={initialText}
          composeDispatch={composeDispatch}
          inGame={inGame}
          isAction={isAction}
        />
      </div>
      {media && (
        <div css={mediaContainer}>
          <MessageMedia file={media} />
        </div>
      )}
      <div css={sendContainer}>
        <MenuButton
          isAction={isAction}
          inGame={inGame}
          composeDispatch={composeDispatch}
          inputName={inputName}
          composeInputRef={inputRef}
          hasImage={hasImage}
          whisperTo={whisperTo}
        />
        <ChatItemToolbarButton
          loading={sending}
          sprite={paperPlane}
          onClick={onSend}
          disabled={!canSubmit}
          title="发送"
          size="large"
          info={sendButtonInfo}
          x="left"
        />
      </div>
    </div>
  );
}

export default React.memo(Compose);
