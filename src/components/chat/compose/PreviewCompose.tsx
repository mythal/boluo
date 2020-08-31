import * as React from 'react';
import { useCallback, useLayoutEffect, useReducer, useRef } from 'react';
import { newId } from '../../../utils/id';
import { clearRight, floatRight, mL, mR, mT, pX, pY, spacingN } from '../../../styles/atoms';
import { useDispatch, useSelector } from '../../../store';
import { Preview } from '../../../api/events';
import { AppResult, patch, post } from '../../../api/request';
import ChatItemTime from '../ChatItemTime';
import ChatItemContent from '../ItemContent';
import { Message } from '../../../api/messages';
import { nameColWidth, timeColWidth } from '../ChatItemContainer';
import { ChatItemContentContainer } from '../ChatItemContentContainer';
import ChatItemName from '../ChatItemName';
import ChatComposeToolbar from './ComposeToolbar';
import ChatPreviewComposeInput from './ComposeInput';
import ChatPreviewComposeNameInput from './PreviewComposeNameInput';
import { gray } from '../../../styles/colors';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import cancelIcon from '../../../assets/icons/cancel.svg';
import saveIcon from '../../../assets/icons/save.svg';
import paperPlane from '../../../assets/icons/paper-plane.svg';
import { darken } from 'polished';
import { css } from '@emotion/core';
import { throwErr } from '../../../utils/errors';
import { useSend } from '../../../hooks/useSend';
import MessageMedia from '../MessageMedia';
import ChatImageUploadButton from './ImageUploadButton';
import { usePane } from '../../../hooks/usePane';
import Button from '../../atoms/Button';
import Icon from '../../atoms/Icon';
import { composeReducer, update } from './reducer';
import { uploadMedia } from './helper';
import { inputStyle } from '../../atoms/Input';

interface Props {
  preview: Preview | undefined;
  editTo?: Message;
  measure: () => void;
}

const previewStripWidth = 3;

export const previewStyle = (colorA: string, colorB: string) => css`
  background: repeating-linear-gradient(
    45deg,
    ${colorA},
    ${colorA} ${previewStripWidth}px,
    ${colorB} ${previewStripWidth}px,
    ${colorB} ${previewStripWidth * 2}px
  );
`;

const compose = css`
  grid-area: compose;
  ${inputStyle};
`;

export const container = css`
  display: grid;
  ${[pX(2), pY(2), previewStyle(gray['900'], darken(0.15, gray['900']))]};
  border-top: 1px solid ${gray['900']};
  border-bottom: 1px solid ${gray['900']};
  position: relative;
  top: 0;
  bottom: 0;
  grid-template-columns: ${timeColWidth} ${nameColWidth} auto 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    '   time    name content content'
    'toolbar toolbar compose compose';
  gap: ${spacingN(1)} ${spacingN(2)};
  &[data-edit='true'] {
    position: relative;
  }
  &:focus {
    outline: none;
  }
`;

function PreviewCompose({ preview, editTo, measure }: Props) {
  const dispatch = useDispatch();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pane = usePane();
  const channelId = useSelector((state) => state.chatPane[pane]!.channel.id);
  const nickname = useSelector((state) => state.profile!.user.nickname);
  const myMember = useSelector((state) => state.profile!.channels.get(channelId)!.member);
  const sendEvent = useSend();

  useLayoutEffect(() => {
    measure();
  });

  const [
    { inGame, broadcast, isAction, inputName, media, messageId, text, entities, canSubmit },
    composeDispatch,
  ] = useReducer(composeReducer, undefined, () => {
    let name = '';
    if (preview && preview.inGame) {
      name = preview.name;
    } else if (editTo?.name) {
      name = editTo.name;
    } else {
      name = myMember.characterName;
    }
    return {
      sending: false,
      inGame: preview?.inGame || editTo?.inGame || false,
      broadcast: true,
      isAction: preview?.isAction || editTo?.isAction || false,
      inputName: name,
      initial: true,
      media: undefined,
      nickname,
      sendEvent,
      editFor: editTo?.modified,
      appDispatch: dispatch,
      messageId: preview?.id ?? editTo?.id ?? newId(),
      text: preview?.text ?? editTo?.text ?? '',
      entities: preview?.entities ?? editTo?.entities ?? [],
      clear: false,
    };
  });

  useLayoutEffect(() => {
    composeDispatch(update({ inputName: myMember.characterName }));
  }, [myMember.characterName]);
  const initialDraft = preview?.text || editTo?.text || '';

  const name = inGame ? inputName : nickname;

  const cancelEdit = useCallback(() => {
    if (editTo !== undefined) {
      composeDispatch(update({ text: '', entities: [], clear: true }));
      dispatch({ type: 'STOP_EDIT_MESSAGE', editFor: editTo.modified, messageId: editTo.id, pane });
    }
  }, [editTo, dispatch, pane]);

  const onSend = async () => {
    if (!canSubmit) {
      return;
    }
    composeDispatch(update({ sending: true }));
    const mediaId = await uploadMedia(dispatch, media);
    let result: AppResult<Message>;
    if (editTo) {
      result = await patch('/messages/edit', {
        messageId: editTo.id,
        name: inGame ? inputName : nickname,
        inGame,
        isAction,
        text,
        entities,
        mediaId,
      });
    } else {
      result = await post('/messages/send', {
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
    }
    if (!result.isOk) {
      throwErr(dispatch)(result.value);
      composeDispatch(update({ sending: false }));
      return;
    } else {
      composeDispatch(update({ messageId: newId() }));
    }
  };
  const chatItemName = (
    <ChatItemName inGame={inGame} action={isAction} master={myMember.isMaster} name={name} userId={myMember.userId} />
  );
  const handleKeyDown: React.KeyboardEventHandler = async (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      await onSend();
    } else if (e.key === 'Alt') {
      e.preventDefault();
      composeDispatch(update({ inGame: !inGame }));
    }
  };
  return (
    <div css={container} data-edit={editTo !== undefined} ref={containerRef} onKeyDown={handleKeyDown}>
      <ChatItemTime timestamp={editTo?.created || preview?.start || new Date().getTime()} />
      {inGame && <ChatPreviewComposeNameInput value={inputName} composeDispatch={composeDispatch} />}
      {!inGame && !isAction && chatItemName}
      <ChatItemContentContainer data-action={isAction} data-in-game={inGame}>
        <MessageMedia mediaId={editTo?.mediaId} file={media} />
        {isAction && chatItemName}
        <ChatItemContent entities={entities} text={text} />
        <div css={[mL(2), mT(2), floatRight, clearRight]}>
          <ChatImageUploadButton hasImage={media !== undefined} composeDispatch={composeDispatch} css={[mR(1)]} />
          {editTo && <ChatItemToolbarButton css={mR(1)} sprite={cancelIcon} onClick={cancelEdit} title="取消" />}
          <Button
            // loading={sending}
            // sprite={editTo ? editIcon : paperPlane}
            onClick={onSend}
            data-size="small"
            data-icon
            data-variant="primary"
            title={editTo ? '提交更改' : '发送'}
            // info={isMac ? '⌘ + ⏎' : 'Ctrl + ⏎'}
            disabled={!canSubmit}
            // x="left"
          >
            <Icon sprite={editTo ? saveIcon : paperPlane} />
          </Button>
        </div>
      </ChatItemContentContainer>

      <ChatPreviewComposeInput
        css={compose}
        inGame={inGame}
        composeDispatch={composeDispatch}
        initialValue={initialDraft}
      />
      <ChatComposeToolbar inGame={inGame} isAction={isAction} broadcast={broadcast} composeDispatch={composeDispatch} />
    </div>
  );
}

export default React.memo(PreviewCompose);
