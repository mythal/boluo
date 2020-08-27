import * as React from 'react';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { newId } from '../../utils/id';
import { clearRight, floatRight, mL, mR, mT, pX, pY, spacingN } from '../../styles/atoms';
import { useDispatch, useSelector } from '../../store';
import { ParseResult } from '../../interpreter/parser';
import { Preview, PreviewPost } from '../../api/events';
import { AppResult, patch, post, upload } from '../../api/request';
import ChatItemTime from '../../components/atoms/ChatItemTime';
import ChatItemContent from '../../components/molecules/ChatItemContent';
import { Message } from '../../api/messages';
import { nameColWidth, timeColWidth } from '../atoms/ChatItemContainer';
import { ChatItemContentContainer } from '../atoms/ChatItemContentContainer';
import ChatItemName from '../../components/atoms/ChatItemName';
import ChatComposeToolbar from '../../components/molecules/ChatComposeToolbar';
import ChatPreviewComposeInput from '../../components/molecules/ChatPreviewComposeInput';
import ChatPreviewComposeNameInput from '../../components/molecules/ChatPreviewComposeNameInput';
import { gray } from '../../styles/colors';
import ChatItemToolbarButton from '../../components/atoms/ChatItemToolbarButton';
import cancelIcon from '../../assets/icons/cancel.svg';
import editIcon from '../../assets/icons/edit.svg';
import paperPlane from '../../assets/icons/paper-plane.svg';
import { darken } from 'polished';
import { css } from '@emotion/core';
import { throwErr } from '../../utils/errors';
import { isMac } from '../../utils/browser';
import { useSend } from '../../hooks/useSend';
import MessageMedia from './MessageMedia';
import {
  allowImageType,
  fileSizeExceeded,
  formatIsNotSupported,
  imageFormatIsNotSupported,
  imageSizeExceeded,
  maxImageFileSize,
} from '../../validators';
import { showFlash } from '../../actions/flash';
import ChatImageUploadButton from './ChatImageUploadButton';
import { usePane } from '../../hooks/usePane';

interface Props {
  preview: Preview | undefined;
  editTo?: Message;
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

interface ComposeState {
  sending: boolean;
  inGame: boolean;
  broadcast: boolean;
  isAction: boolean;
  parsed: ParseResult | undefined;
  inputName: string;
  initial: boolean;
  media: File | undefined;
}

export type ComposeDispatch = React.Dispatch<Partial<ComposeState>>;

function ChatPreviewCompose({ preview, editTo }: Props) {
  const dispatch = useDispatch();
  const messageId = useRef(preview?.id ?? editTo?.id ?? newId());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pane = usePane();
  const channelId = useSelector((state) => state.chatPane[pane]!.channel.id);
  const nickname = useSelector((state) => state.profile!.user.nickname);
  const myMember = useSelector((state) => state.profile!.channels.get(channelId)!.member);

  const composeReducer = (state: ComposeState, update: Partial<ComposeState>): ComposeState => {
    if (update.media) {
      const file = update.media;
      if (file.size > maxImageFileSize) {
        dispatch(showFlash('WARNING', fileSizeExceeded));
        return state;
      } else if (file.type.startsWith('image')) {
        if (allowImageType.includes(file.type)) {
          if (file.size > maxImageFileSize) {
            dispatch(showFlash('WARNING', imageSizeExceeded));
            return state;
          }
        } else {
          dispatch(showFlash('WARNING', imageFormatIsNotSupported));
          return state;
        }
      } else {
        dispatch(showFlash('WARNING', formatIsNotSupported));
        return state;
      }
    }

    if (update.parsed !== undefined && update.parsed.text === '' && editTo === undefined) {
      messageId.current = newId();
    }
    return { ...state, ...update, initial: false };
  };

  const [{ sending, inGame, broadcast, isAction, inputName, parsed, initial, media }, composeDispatch] = useReducer(
    composeReducer,
    undefined,
    () => {
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
        parsed: undefined,
        inputName: name,
        initial: true,
        media: undefined,
      };
    }
  );

  useLayoutEffect(() => {
    composeDispatch({ inputName: myMember.characterName });
  }, [myMember.characterName]);
  const initialDraft = preview?.text || editTo?.text || '';
  const text = parsed?.text ?? initialDraft;
  const entities = parsed?.entities ?? preview?.entities ?? editTo?.entities ?? [];

  const name = inGame ? inputName : nickname;

  const send = useSend();
  const cancelEdit = useCallback(() => {
    if (editTo !== undefined) {
      const messageId = editTo.id;
      patch('/messages/edit', { messageId }).then();
      dispatch({ type: 'STOP_EDIT_MESSAGE', editFor: editTo.modified, messageId: editTo.id, pane });
    }
  }, [editTo, dispatch, pane]);
  useEffect(() => {
    if (initial) {
      return;
    }
    const preview: PreviewPost = {
      id: messageId.current,
      name,
      inGame,
      isAction,
      mediaId: null,
      editFor: editTo?.modified,
      text,
      entities,
    };
    send({ type: 'PREVIEW', preview });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTo, inGame, isAction, name, parsed, send]);
  const canNotSend = text === '' || (inGame && inputName === '') || sending;
  const onSend = async () => {
    if (canNotSend) {
      return;
    }
    composeDispatch({ sending: true });
    let mediaId = null;
    if (media) {
      const result = await upload(media, media.name, media.type);
      if (!result.isOk) {
        throwErr(dispatch)(result.value);
        return;
      }
      mediaId = result.value.id;
    }
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
        messageId: messageId.current,
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
      composeDispatch({ sending: false });
      return;
    } else {
      messageId.current = newId();
    }
  };
  const chatItemName = (
    <ChatItemName action={isAction} master={myMember.isMaster} name={name} userId={myMember.userId} />
  );
  const handleKeyDown: React.KeyboardEventHandler = async (e) => {
    if (e.metaKey && e.key === 'Enter') {
      e.preventDefault();
      await onSend();
    } else if (e.key === 'Alt') {
      e.preventDefault();
      composeDispatch({ inGame: !inGame });
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
          <ChatItemToolbarButton
            loading={sending}
            sprite={editTo ? editIcon : paperPlane}
            onClick={onSend}
            title={editTo ? '提交更改' : '发送'}
            info={isMac ? '⌘ + ⏎' : 'Ctrl + ⏎'}
            disabled={canNotSend}
            x="left"
          />
        </div>
      </ChatItemContentContainer>

      <ChatPreviewComposeInput
        inGame={inGame}
        composeDispatch={composeDispatch}
        autoFocus={!editTo}
        initialValue={initialDraft}
      />
      <ChatComposeToolbar inGame={inGame} isAction={isAction} broadcast={broadcast} composeDispatch={composeDispatch} />
    </div>
  );
}

export default React.memo(ChatPreviewCompose);
