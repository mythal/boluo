import * as React from 'react';
import { Id, newId } from '@/utils/id';
import styled from '@emotion/styled';
import {
  bgColor,
  breakpoint,
  mediaQuery,
  mR,
  p,
  previewStyle,
  primaryColor,
  pX,
  pY,
  roundedPx,
  spacingN,
  textBase,
  textColor,
  textSm,
} from '@/styles/atoms';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from '@/store';
import { Env as ParseEnv, parse } from '@/interpreter/parser';
import { getDiceFace } from '@/utils/game';
import { useSend } from '@/hooks';
import { Preview, PreviewPost } from '@/api/events';
import { post } from '@/api/request';
import ChatItemTime from '@/components/atoms/ChatItemTime';
import ChatItemName from '@/components/atoms/ChatItemName';
import ChatPreviewItem from '@/components/molecules/ChatPreviewItem';
import { lighten } from 'polished';
import mask from '../../assets/icons/theater-masks.svg';
import running from '../../assets/icons/running.svg';
import broadcastTower from '../../assets/icons/broadcast-tower.svg';
import paperPlane from '../../assets/icons/paper-plane.svg';
import Icon from '@/components/atoms/Icon';

interface Props {
  preview: Preview | undefined;
}

export const Container = styled.div`
  display: grid;
  ${[pX(2), pY(1), previewStyle]};
  position: sticky;
  top: 0;
  bottom: 0;
  grid-template-columns: 8rem auto 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    '  name content content'
    '  time content content'
    '  time buttons    send'
    'naming compose compose';
  gap: ${spacingN(1)} ${spacingN(2)};
`;

const Content = styled.div`
  grid-area: content;
`;

const Compose = styled.textarea`
  ${[p(2)]};
  grid-area: compose;
  background-color: ${bgColor};
  color: ${textColor};
  border: 1px solid ${lighten(0.2, bgColor)};
  resize: none;
  &:focus {
    outline: none;
  }
`;

const NameInput = styled.input`
  ${p(1)};
  background-color: ${bgColor};
  color: ${textColor};
  text-align: right;
  ${textBase};
  width: 100%;
  border: 1px solid ${lighten(0.2, bgColor)};

  &:focus {
    outline: none;
  }
  &:disabled {
    filter: contrast(60%);
  }
`;

const ButtonBar = styled.div`
  grid-area: buttons;
  display: flex;
  justify-content: space-between;
  align-items: stretch;
`;

const SendContainer = styled.div`
  grid-area: send;
  justify-self: right;
`;

const ComposeButton = styled.button`
  border: none;
  color: ${textColor};
  cursor: pointer;
  background-color: rgba(255, 255, 255, 0.1);
  ${[roundedPx, pX(1), pY(0.5), textSm]};

  ${mediaQuery(breakpoint.sm)} {
    ${[pX(2), pY(1), textBase]};
  }

  &[data-on='false'] {
    filter: brightness(40%);

    &:hover {
      filter: brightness(80%);
    }

    &:active {
      filter: brightness(120%);
    }
  }

  &[data-on='true'] {
    color: ${lighten(0.3, primaryColor)};
    box-shadow: 0 0 0 1px ${lighten(0.3, primaryColor)} inset;
  }

  &:focus {
    outline: none;
  }

  &:disabled {
    filter: contrast(60%);
    cursor: not-allowed;
  }
`;

const Naming = styled.div`
  grid-area: naming;
  display: flex;
  align-items: start;
  justify-content: flex-end;
`;

const PREVIEW_SEND_TIMEOUT_MILLIS = 200;
const useSendPreview = (nickname: string, env: ParseEnv) => {
  const send = useSend();
  const sendPreviewTimeout = useRef<number | null>(null);
  return (id: Id, inGame: boolean, isAction: boolean, isBroadcast: boolean, characterName: string, text: string) => {
    const content = isBroadcast ? parse(text, true, env) : { text: null, entities: [] };
    const name = inGame ? characterName : nickname;

    const preview: PreviewPost = {
      id,
      name,
      inGame,
      isAction,
      mediaId: null,
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
  };
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

function ChatMyPreview({ preview }: Props) {
  const messageId = useRef(preview?.id ?? newId());
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const channelId = useSelector((state) => state.chat!.channel.id);
  const nickname = useSelector((state) => state.profile!.user.nickname);
  const defaultDiceType = useSelector((state) => state.chat!.channel.defaultDiceType);
  const myMember = useSelector((state) => state.profile!.channels.get(channelId)?.member);
  /* eslint-disable @typescript-eslint/no-non-null-assertion */

  const [draft, setDraft] = useState(() => preview?.text || '');
  const [inGame, setInGame] = useState(() => preview?.inGame || false);
  const [broadcast, setBroadcast] = useState(true);
  const [isAction, setIsAction] = useState(() => preview?.isAction || false);
  const parseEnv: ParseEnv = {
    defaultDiceFace: getDiceFace(defaultDiceType),
    resolveUsername: () => null,
  };
  const postPreview = useSendPreview(nickname, parseEnv);
  const shouldPostPreview = useRef(false);

  const [name, setName] = useState<string>(() => {
    if (preview && preview.inGame) {
      return preview.name;
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
  }, [myMember, myMember?.characterName]);

  const toggleInGame = useToggle(shouldPostPreview, setInGame);
  const toggleAction = useToggle(shouldPostPreview, setIsAction);
  const toggleBroadcast = useToggle(shouldPostPreview, setBroadcast);

  if (!myMember) {
    if (preview) {
      return <ChatPreviewItem preview={preview} />;
    } else {
      return null;
    }
  }
  const characterName = myMember.characterName;
  if (shouldPostPreview.current) {
    postPreview(messageId.current, inGame, isAction, broadcast, characterName, draft);
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
    if (current === '') {
      messageId.current = newId();
    }
  };
  const canNotSend = draft.trim() === '' || (inGame && name === '');
  const onSend = async () => {
    if (canNotSend) {
      return;
    }
    const parsed = parse(draft, true, parseEnv);
    await post('/messages/send', {
      messageId: messageId.current,
      channelId,
      mediaId: null,
      name: inGame ? name : nickname,
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
  return (
    <Container>
      <ChatItemName master={myMember.isMaster} name={inGame ? name : nickname} userId={myMember.userId} />
      <ChatItemTime timestamp={preview?.start || new Date().getTime()} />
      <Naming>
        <NameInput
          value={inGame ? name : nickname}
          disabled={!inGame}
          onChange={onEditName}
          placeholder="写下你的名字"
        />
      </Naming>
      <Content>{preview?.text}</Content>
      <ButtonBar>
        <ComposeButton css={[mR(1)]} data-on={inGame} onClick={toggleInGame}>
          <Icon sprite={mask} />
          游戏内
        </ComposeButton>
        <ComposeButton css={[mR(1)]} data-on={isAction} onClick={toggleAction}>
          <Icon sprite={running} />
          动作
        </ComposeButton>
        <ComposeButton data-on={broadcast} onClick={toggleBroadcast}>
          <Icon sprite={broadcastTower} />
          预览
        </ComposeButton>
      </ButtonBar>
      <SendContainer>
        <ComposeButton onClick={onSend} disabled={canNotSend}>
          <Icon sprite={paperPlane} />
          发送
        </ComposeButton>
      </SendContainer>
      <Compose value={draft} placeholder={inGame ? '书写独一无二的冒险吧' : '尽情聊天吧'} onChange={handleChange} />
    </Container>
  );
}

export default ChatMyPreview;
