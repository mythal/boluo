import * as React from 'react';
import { Id, newId } from '@/utils/id';
import styled from '@emotion/styled';
import { bgColor, p, previewStyle, pX, pY, roundedPx, spacingN, textBase, textColor } from '@/styles/atoms';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from '@/store';
import { Env as ParseEnv, parse, ParseResult } from '@/interpreter/parser';
import { getDiceFace } from '@/utils/game';
import { useSend } from '@/hooks';
import { Preview, PreviewPost } from '@/api/events';
import { patch, post } from '@/api/request';
import ChatItemTime from '@/components/atoms/ChatItemTime';
import { darken, lighten } from 'polished';
import { css } from '@emotion/core';
import ChatItemContent from '@/components/molecules/ChatItemContent';
import { Message } from '@/api/messages';
import { nameColWidth, timeColWidth } from '@/components/atoms/ChatItemContainer';
import { ChatItemContentContainer } from '../atoms/ChatItemContentContainer';
import ChatItemName from '@/components/atoms/ChatItemName';
import ChatComposeToolbar from '@/components/molecules/ChatComposeToolbar';

interface Props {
  preview: Preview | undefined;
  editTo?: Message;
}

export const Container = styled.div`
  display: grid;
  ${[pX(2), pY(2), previewStyle]};
  z-index: 10;
  border-top: 1px solid ${lighten(0.1, bgColor)};
  border-bottom: 1px solid ${lighten(0.1, bgColor)};
  position: sticky;
  top: 0;
  bottom: 0;
  grid-template-columns: ${timeColWidth} ${nameColWidth} auto 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    '  time    name content content'
    '     .       . compose compose';
  gap: ${spacingN(1)} ${spacingN(2)};
  &[data-edit='true'] {
    position: relative;
  }
`;

const inputStyle = css`
  ${[roundedPx, textBase]};
  background-color: ${darken(0.05, bgColor)};
  color: ${textColor};
  border: 1px solid ${lighten(0.2, bgColor)};
  &:hover {
    border-color: ${lighten(0.3, bgColor)};
  }
  &:focus {
    outline: none;
    border-color: ${lighten(0.4, bgColor)};
  }
  &:disabled {
    filter: contrast(60%);
  }
`;

const Compose = styled.textarea`
  ${[p(2), inputStyle]};
  grid-area: compose;
  resize: none;
  &:focus {
    outline: none;
  }
`;

const NameInput = styled.input`
  ${[p(1), inputStyle]};
  text-align: right;
  width: 100%;
  height: 2em;
`;

const Naming = styled.div`
  grid-area: name;
  display: flex;
  align-items: start;
  justify-content: flex-end;
`;

const PREVIEW_SEND_TIMEOUT_MILLIS = 200;
const useSendPreview = (nickname: string, editFor: number | null = null) => {
  const send = useSend();
  const sendPreviewTimeout = useRef<number | null>(null);
  return useCallback(
    (id: Id, inGame: boolean, isAction: boolean, isBroadcast: boolean, characterName: string, parsed: ParseResult) => {
      let content: Pick<PreviewPost, 'entities' | 'text'> = parsed;
      if (!isBroadcast) {
        content = { text: null, entities: [] };
      }
      const name = inGame ? characterName : nickname;

      const preview: PreviewPost = {
        id,
        name,
        inGame,
        isAction,
        mediaId: null,
        editFor,
        ...content,
      };

      if (sendPreviewTimeout.current !== null) {
        window.clearTimeout(sendPreviewTimeout.current);
        sendPreviewTimeout.current = null;
      }
      sendPreviewTimeout.current = window.setTimeout(async () => {
        send({ type: 'PREVIEW', preview });
        sendPreviewTimeout.current = null;
      }, PREVIEW_SEND_TIMEOUT_MILLIS);
    },
    [send, nickname, editFor]
  );
};

function useToggle(
  shouldPostPreview: React.MutableRefObject<boolean>,
  setState: React.Dispatch<React.SetStateAction<boolean>>
) {
  return useCallback(() => {
    setState((value) => !value);
    shouldPostPreview.current = true;
  }, [setState, shouldPostPreview]);
}

function ChatPreviewCompose({ preview, editTo }: Props) {
  const messageId = useRef(preview?.id ?? editTo?.id ?? newId());
  const containerRef = useRef<HTMLDivElement | null>(null);
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const channelId = useSelector((state) => state.chat!.channel.id);
  const nickname = useSelector((state) => state.profile!.user.nickname);
  const defaultDiceType = useSelector((state) => state.chat!.channel.defaultDiceType);
  const myMember = useSelector((state) => state.profile!.channels.get(channelId)!.member);
  /* eslint-disable @typescript-eslint/no-non-null-assertion */

  const [draft, setDraft] = useState(() => preview?.text || editTo?.text || '');
  const [inGame, setInGame] = useState(() => preview?.inGame || editTo?.inGame || false);
  const [broadcast, setBroadcast] = useState(true);
  const [isAction, setIsAction] = useState(() => preview?.isAction || editTo?.isAction || false);
  const [toolbarState, setToolbarState] = useState<'bottom' | 'top' | null>(null);
  const postPreview = useSendPreview(nickname, editTo?.modified);
  const shouldPostPreview = useRef(false);

  const [inputName, setName] = useState<string>(() => {
    if (preview && preview.inGame) {
      return preview.name;
    } else if (editTo?.name) {
      return editTo.name;
    } else if (myMember) {
      return myMember.characterName;
    } else {
      return '';
    }
  });
  useEffect(() => {
    if (myMember) {
      setName(myMember.characterName);
    }
  }, [myMember]);
  const name = inGame ? inputName : nickname;
  const trimmedDraft = draft.trim();
  const parsed = useMemo(() => {
    const parseEnv: ParseEnv = {
      defaultDiceFace: getDiceFace(defaultDiceType),
      resolveUsername: () => null,
    };
    return parse(trimmedDraft, true, parseEnv);
  }, [trimmedDraft, defaultDiceType]);

  const toggleInGame = useToggle(shouldPostPreview, setInGame);
  const toggleAction = useToggle(shouldPostPreview, setIsAction);
  const toggleBroadcast = useToggle(shouldPostPreview, setBroadcast);

  if (shouldPostPreview.current) {
    postPreview(messageId.current, inGame, isAction, broadcast, inputName, parsed);
    shouldPostPreview.current = false;
  }
  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const { value } = e.target;
    setDraft(value);
    const prev = draft.trim();
    const current = value.trim();
    if (prev !== current) {
      shouldPostPreview.current = true;
    }
    if (current === '' && editTo === undefined) {
      messageId.current = newId();
    }
  };
  const canNotSend = draft.trim() === '' || (inGame && inputName === '');
  const onSend = async () => {
    if (canNotSend) {
      return;
    }
    if (editTo) {
      await patch('/messages/edit', {
        messageId: editTo.id,
        name: inGame ? inputName : nickname,
        inGame,
        isAction,
        ...parsed,
      });
      return;
    }
    await post('/messages/send', {
      messageId: messageId.current,
      channelId,
      mediaId: null,
      name: inGame ? inputName : nickname,
      inGame,
      isAction,
      orderDate: null,
      ...parsed,
    });
    messageId.current = newId();
    setDraft('');
    setIsAction(false);
  };
  const onEditName: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const { value } = e.target;
    setName(value.substr(0, 32));
  };
  const chatItemName = <ChatItemName action={true} master={myMember.isMaster} name={name} userId={myMember.userId} />;

  const handleMouseEnter = () => {
    if (containerRef.current === null) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    console.log(rect);
    if (rect.top < 100) {
      setToolbarState('bottom');
    } else {
      setToolbarState('top');
    }
  };
  const handleMouseLeave = () => setToolbarState(null);
  return (
    <Container
      data-edit={editTo !== undefined}
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ChatItemTime timestamp={preview?.start || new Date().getTime()} />
      {inGame && (
        <Naming>
          <NameInput value={inputName} onChange={onEditName} placeholder="写下你的名字" />
        </Naming>
      )}
      {!inGame && !isAction && chatItemName}
      <ChatItemContentContainer data-action={isAction} data-in-game={inGame}>
        {isAction && chatItemName}
        <ChatItemContent entities={parsed.entities} text={parsed.text} />
      </ChatItemContentContainer>

      <Compose value={draft} placeholder={inGame ? '书写独一无二的冒险吧' : '尽情聊天吧'} onChange={handleChange} />
      {toolbarState !== null && (
        <ChatComposeToolbar
          inGame={inGame}
          toggleInGame={toggleInGame}
          isAction={isAction}
          toggleAction={toggleAction}
          broadcast={broadcast}
          toggleBroadcast={toggleBroadcast}
          toolbarPosition={toolbarState}
          send={onSend}
          editId={editTo?.id}
        />
      )}
    </Container>
  );
}

export default React.memo(ChatPreviewCompose);
