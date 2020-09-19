import * as React from 'react';
import { useCallback, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import { clearRight, floatRight, mL, mR, mT, pX, textSm } from '../../../styles/atoms';
import { useDispatch, useSelector } from '../../../store';
import { Preview } from '../../../api/events';
import { AppResult, patch } from '../../../api/request';
import ChatItemContent from '../ItemContent';
import { Message } from '../../../api/messages';
import { nameColWidth, timeColWidth } from '../ChatItemContainer';
import { ChatItemContentContainer } from '../ChatItemContentContainer';
import ChatItemName from '../ChatItemName';
import ChatComposeToolbar from './ComposeToolbar';
import ComposeInput from './ComposeInput';
import ChatPreviewComposeNameInput from './EditComposeNameInput';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import cancelIcon from '../../../assets/icons/cancel.svg';
import saveIcon from '../../../assets/icons/save.svg';
import { css } from '@emotion/core';
import { throwErr } from '../../../utils/errors';
import { useSend } from '../../../hooks/useSend';
import MessageMedia from '../MessageMedia';
import ChatImageUploadButton from './ImageUploadButton';
import { usePane } from '../../../hooks/usePane';
import { composeReducerMaker, ComposeState, update, UserItem } from './reducer';
import { uploadMedia } from './helper';
import { inputStyle } from '../../atoms/Input';
import {
  chatSplitLine,
  itemImage,
  nameContainer,
  previewInGame,
  previewOutGame,
  textInGame,
  textOutGame,
} from '../styles';
import { isMac } from '../../../utils/browser';
import { handleKeyDown } from '../key';

interface Props {
  preview?: Preview;
  editTo: Message;
}

const composeWrapper = css`
  grid-area: compose;
  ${[pX(3), mL(2), chatSplitLine]};
`;

const compose = css`
  ${[inputStyle, textSm]};
  resize: none;
  height: 4rem;
`;

export const container = css`
  display: grid;
  ${[pX(2), previewInGame]};
  position: relative;
  top: 0;
  bottom: 0;
  grid-template-columns: ${timeColWidth} ${nameColWidth} auto 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    '   time    name content content'
    'toolbar toolbar compose compose';
  &[data-edit='true'] {
    position: relative;
  }
  &[data-in-game='true'] {
    ${[textInGame, previewInGame]};
  }
  &[data-in-game='false'] {
    ${[textOutGame, previewOutGame]};
  }
  &:focus {
    outline: none;
  }
  & .show-on-hover {
    visibility: hidden;
  }
  &:hover .show-on-hover {
    visibility: visible;
  }
`;

function EditCompose({ preview, editTo }: Props) {
  const dispatch = useDispatch();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pane = usePane();
  const channelId = useSelector((state) => state.chatPane[pane]!.channel.id);
  const nickname = useSelector((state) => state.profile!.user.nickname);
  const myMember = useSelector((state) => state.profile!.channels.get(channelId)!.member);
  const enterSend = useSelector((state) => state.profile!.settings.enterSend);
  const sendEvent = useSend();
  const characterName = myMember.characterName;

  const makeInitState = (): ComposeState => {
    const inGame = preview?.inGame || editTo.inGame;
    let inputName = '';
    if (inGame) {
      if (preview) {
        inputName = preview.name;
      } else if (editTo.inGame) {
        inputName = editTo.name;
      } else {
        inputName = myMember.characterName;
      }
    }
    const whisperTo: UserItem[] | null | undefined = editTo.whisperToUsers?.map((value) => ({ value, label: '' }));
    return {
      sending: false,
      inGame,
      broadcast: true,
      isAction: preview?.isAction || editTo.isAction,
      inputName,
      initial: true,
      media: undefined,
      editFor: editTo.modified,
      messageId: editTo.id,
      text: preview?.text ?? editTo?.text ?? '',
      entities: preview?.entities ?? editTo?.entities ?? [],
      canSubmit: true,
      clear: false,
      whisperTo,
    };
  };
  const composeReducer = useMemo(() => composeReducerMaker({ sendEvent, dispatch, nickname, characterName }), [
    sendEvent,
    dispatch,
    nickname,
    characterName,
  ]);

  const [
    { inGame, broadcast, isAction, inputName, media, text, entities, canSubmit, sending },
    composeDispatch,
  ] = useReducer(composeReducer, undefined, makeInitState);

  useLayoutEffect(() => {
    if (inputName !== myMember.characterName) {
      composeDispatch(update({ inputName: myMember.characterName }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myMember.characterName]);
  const initialDraft = preview?.text || editTo?.text || '';

  const name = inGame ? inputName : nickname;

  const cancelEdit = useCallback(() => {
    composeDispatch(update({ text: '', entities: [], clear: true }));
    dispatch({ type: 'STOP_EDIT_MESSAGE', editFor: editTo.modified, messageId: editTo.id, pane });
  }, [editTo, dispatch, pane]);

  const onSend = async () => {
    if (!canSubmit) {
      return;
    }
    composeDispatch(update({ sending: true }));
    const mediaId = await uploadMedia(dispatch, media);
    const result: AppResult<Message> = await patch('/messages/edit', {
      messageId: editTo.id,
      name: inGame ? inputName : nickname,
      inGame,
      isAction,
      text,
      entities,
      mediaId,
    });
    if (!result.isOk) {
      throwErr(dispatch)(result.value);
      composeDispatch(update({ sending: false }));
      return;
    }
  };
  const chatItemName = (
    <ChatItemName inGame={inGame} action={isAction} master={myMember.isMaster} name={name} userId={myMember.userId} />
  );
  const onKeyDown: React.KeyboardEventHandler = handleKeyDown(composeDispatch, onSend, inGame, enterSend);
  return (
    <div css={container} data-edit={true} ref={containerRef} onKeyDown={onKeyDown} data-in-game={inGame}>
      <div css={nameContainer}>
        {inGame && <ChatPreviewComposeNameInput value={inputName} composeDispatch={composeDispatch} />}
        {!inGame && !isAction && chatItemName}
      </div>
      <ChatItemContentContainer data-action={isAction} data-in-game={inGame}>
        <MessageMedia css={itemImage} mediaId={editTo.mediaId} file={media} />
        <div css={[mL(2), mT(2), floatRight, clearRight]}>
          <ChatImageUploadButton
            hasImage={Boolean(media || preview?.mediaId)}
            composeDispatch={composeDispatch}
            css={[mR(1)]}
          />
          <ChatItemToolbarButton css={mR(1)} sprite={cancelIcon} onClick={cancelEdit} title="取消" />
          <ChatItemToolbarButton
            loading={sending}
            sprite={saveIcon}
            onClick={onSend}
            data-size="small"
            data-icon
            data-variant="primary"
            title="提交更改"
            info={isMac ? '⌘ + ⏎' : 'Ctrl + ⏎'}
            disabled={!canSubmit}
            x="left"
          />
        </div>

        {isAction && chatItemName}
        <ChatItemContent entities={entities} text={text} />
      </ChatItemContentContainer>
      <div css={composeWrapper}>
        <ComposeInput
          css={compose}
          inGame={inGame}
          composeDispatch={composeDispatch}
          initialValue={initialDraft}
          isAction={isAction}
        />
      </div>
      <ChatComposeToolbar inGame={inGame} isAction={isAction} broadcast={broadcast} composeDispatch={composeDispatch} />
    </div>
  );
}

export default React.memo(EditCompose);
