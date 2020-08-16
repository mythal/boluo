import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { newId } from '@/utils/id';
import styled from '@emotion/styled';
import { floatRight, mL, mR, mT, pX, pY, spacingN } from '@/styles/atoms';
import { useSelector } from '@/store';
import { ParseResult } from '@/interpreter/parser';
import { useSend } from '@/hooks';
import { Preview, PreviewPost } from '@/api/events';
import { patch, post } from '@/api/request';
import ChatItemTime from '@/components/atoms/ChatItemTime';
import ChatItemContent from '@/components/molecules/ChatItemContent';
import { Message } from '@/api/messages';
import { nameColWidth, timeColWidth } from '@/components/atoms/ChatItemContainer';
import { ChatItemContentContainer } from '../atoms/ChatItemContentContainer';
import ChatItemName from '@/components/atoms/ChatItemName';
import ChatComposeToolbar from '@/components/molecules/ChatComposeToolbar';
import ChatPreviewComposeInput from '@/components/molecules/ChatPreviewComposeInput';
import ChatPreviewComposeNameInput from '@/components/molecules/ChatPreviewComposeNameInput';
import { gray } from '@/styles/colors';
import ChatItemToolbarButton from '@/components/atoms/ChatItemToolbarButton';
import cancelIcon from '@/assets/icons/cancel.svg';
import editIcon from '@/assets/icons/edit.svg';
import paperPlane from '@/assets/icons/paper-plane.svg';
import { darken } from 'polished';
import { css } from '@emotion/core';

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

export const Container = styled.div`
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
  &:hover {
    ${previewStyle(darken(0.05, gray['900']), darken(0.175, gray['900']))};
  }
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
  const channelId = useSelector((state) => state.chat!.channel.id);
  const nickname = useSelector((state) => state.profile!.user.nickname);
  const myMember = useSelector((state) => state.profile!.channels.get(channelId)!.member);

  const [inGame, setInGame] = useState(() => preview?.inGame || editTo?.inGame || false);
  const [broadcast, setBroadcast] = useState(true);
  const [isAction, setIsAction] = useState(() => preview?.isAction || editTo?.isAction || false);
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
  const cancelEdit = useCallback(() => {
    if (editTo !== undefined) {
      const messageId = editTo.id;
      patch('/messages/edit', { messageId }).then();
    }
  }, [editTo]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const chatItemName = (
    <ChatItemName action={isAction} master={myMember.isMaster} name={name} userId={myMember.userId} />
  );

  return (
    <Container data-edit={editTo !== undefined} ref={containerRef}>
      <ChatItemTime timestamp={preview?.start || new Date().getTime()} />
      {inGame && <ChatPreviewComposeNameInput value={inputName} onChange={setName} />}
      {!inGame && !isAction && chatItemName}
      <ChatItemContentContainer data-action={isAction} data-in-game={inGame}>
        {isAction && chatItemName}
        <ChatItemContent entities={entities} text={text} />
        <div css={[mL(2), mT(2), floatRight]}>
          {editTo && <ChatItemToolbarButton css={mR(1)} sprite={cancelIcon} onClick={cancelEdit} title="取消" />}
          <ChatItemToolbarButton
            sprite={editTo ? editIcon : paperPlane}
            onClick={onSend}
            title={editTo ? '提交' : '发送'}
          />
        </div>
      </ChatItemContentContainer>

      <ChatPreviewComposeInput inGame={inGame} onChange={handleChange} initialValue={initialDraft} />
      <ChatComposeToolbar
        inGame={inGame}
        toggleInGame={toggleInGame}
        isAction={isAction}
        toggleAction={toggleAction}
        broadcast={broadcast}
        toggleBroadcast={toggleBroadcast}
      />
    </Container>
  );
}

export default React.memo(ChatPreviewCompose);
