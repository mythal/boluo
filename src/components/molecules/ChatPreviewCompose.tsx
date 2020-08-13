import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { newId } from '@/utils/id';
import styled from '@emotion/styled';
import { bgColor, previewStyle, pX, pY, spacingN } from '@/styles/atoms';
import { useSelector } from '@/store';
import { ParseResult } from '@/interpreter/parser';
import { useSend } from '@/hooks';
import { Preview, PreviewPost } from '@/api/events';
import { patch, post } from '@/api/request';
import ChatItemTime from '@/components/atoms/ChatItemTime';
import { lighten } from 'polished';
import ChatItemContent from '@/components/molecules/ChatItemContent';
import { Message } from '@/api/messages';
import { nameColWidth, timeColWidth } from '@/components/atoms/ChatItemContainer';
import { ChatItemContentContainer } from '../atoms/ChatItemContentContainer';
import ChatItemName from '@/components/atoms/ChatItemName';
import ChatComposeToolbar from '@/components/molecules/ChatComposeToolbar';
import ChatPreviewComposeInput from '@/components/molecules/ChatPreviewComposeInput';
import ChatPreviewComposeNameInput from '@/components/molecules/ChatPreviewComposeNameInput';

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

function useToggle(setState: React.Dispatch<React.SetStateAction<boolean>>) {
  return useCallback(() => {
    setState((value) => !value);
  }, [setState]);
}

function ChatPreviewCompose({ preview, editTo }: Props) {
  const messageId = useRef(preview?.id ?? editTo?.id ?? newId());
  const containerRef = useRef<HTMLDivElement | null>(null);
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const channelId = useSelector((state) => state.chat!.channel.id);
  const nickname = useSelector((state) => state.profile!.user.nickname);
  const myMember = useSelector((state) => state.profile!.channels.get(channelId)!.member);
  /* eslint-disable @typescript-eslint/no-non-null-assertion */

  const [inGame, setInGame] = useState(() => preview?.inGame || editTo?.inGame || false);
  const [broadcast, setBroadcast] = useState(true);
  const [isAction, setIsAction] = useState(() => preview?.isAction || editTo?.isAction || false);
  const [toolbarState, setToolbarState] = useState<'bottom' | 'top' | null>(null);
  const [parsed, setParsed] = useState<ParseResult | undefined>(undefined);
  const initialDraft = preview?.text || editTo?.text || '';
  const text = parsed?.text ?? initialDraft;
  const entities = parsed?.entities ?? preview?.entities ?? editTo?.entities ?? [];

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

  const toggleInGame = useToggle(setInGame);
  const toggleAction = useToggle(setIsAction);
  const toggleBroadcast = useToggle(setBroadcast);

  const send = useSend();
  useEffect(() => {
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
  }, [editTo?.modified, inGame, isAction, name, text, send]);
  const handleChange = (next: ParseResult) => {
    setParsed(next);
    if (next.text === '' && editTo === undefined) {
      messageId.current = newId();
    }
  };
  const canNotSend = text === '' || (inGame && inputName === '');
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
        text,
        entities,
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
      text,
      entities,
    });
    messageId.current = newId();
  };
  const chatItemName = <ChatItemName action={true} master={myMember.isMaster} name={name} userId={myMember.userId} />;

  const handleMouseEnter = () => {
    if (containerRef.current === null) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
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
      {inGame && <ChatPreviewComposeNameInput value={inputName} onChange={setName} />}
      {!inGame && !isAction && chatItemName}
      <ChatItemContentContainer data-action={isAction} data-in-game={inGame}>
        {isAction && chatItemName}
        <ChatItemContent entities={entities} text={text} />
      </ChatItemContentContainer>

      <ChatPreviewComposeInput inGame={inGame} onChange={handleChange} initialValue={initialDraft} />
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
