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
  textXl,
} from '@/styles/atoms';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from '@/store';
import { Env as ParseEnv, parse, ParseResult } from '@/interpreter/parser';
import { getDiceFace } from '@/utils/game';
import { useSend } from '@/hooks';
import { Preview, PreviewPost } from '@/api/events';
import { patch, post } from '@/api/request';
import ChatItemTime from '@/components/atoms/ChatItemTime';
import { lighten } from 'polished';
import mask from '../../assets/icons/theater-masks.svg';
import running from '../../assets/icons/running.svg';
import broadcastTower from '../../assets/icons/broadcast-tower.svg';
import paperPlane from '../../assets/icons/paper-plane.svg';
import editIcon from '../../assets/icons/edit.svg';
import cancelIcon from '../../assets/icons/cancel.svg';
import Icon from '@/components/atoms/Icon';
import { css } from '@emotion/core';
import ChatItemContent from '@/components/molecules/ChatItemContent';
import { Message } from '@/api/messages';

interface Props {
  preview: Preview | undefined;
  editTo?: Message;
}

export const Container = styled.div`
  display: grid;
  ${[pX(2), pY(3), previewStyle]};
  border-top: 1px solid ${lighten(0.1, bgColor)};
  border-bottom: 1px solid ${lighten(0.1, bgColor)};
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
  &[data-edit='true'] {
    position: static;
  }
`;

const inputStyle = css`
  ${[roundedPx, textBase]};
  background-color: ${lighten(0.05, bgColor)};
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

const ButtonBar = styled.div`
  grid-area: buttons;
  display: flex;
  justify-content: space-between;
  align-items: stretch;
`;

const SendContainer = styled.div`
  grid-area: send;
  justify-self: right;
  display: flex;
  align-items: stretch;
`;

const ComposeButton = styled.button`
  border: none;
  color: ${textColor};
  cursor: pointer;
  background-color: rgba(255, 255, 255, 0.2);
  ${[roundedPx, pX(1), pY(1), textXl]};
  & > span {
    display: none;
  }

  ${mediaQuery(breakpoint.sm)} {
    ${[pX(2), pY(1), textBase]};
    & > span {
      display: inline;
    }
  }

  &:hover {
    box-shadow: 0 0 0 1px ${textColor} inset;
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
  grid-area: name;
  display: flex;
  align-items: start;
  justify-content: flex-end;
`;

const PREVIEW_SEND_TIMEOUT_MILLIS = 200;
const useSendPreview = (nickname: string, editFor: number | null = null) => {
  const send = useSend();
  const sendPreviewTimeout = useRef<number | null>(null);
  return (
    id: Id,
    inGame: boolean,
    isAction: boolean,
    isBroadcast: boolean,
    characterName: string,
    parsed: ParseResult
  ) => {
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

function ChatPreviewCompose({ preview, editTo }: Props) {
  const messageId = useRef(preview?.id ?? editTo?.id ?? newId());
  const dispatch = useDispatch();
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

  const postPreview = useSendPreview(nickname, editTo?.modified);
  const shouldPostPreview = useRef(false);

  const [name, setName] = useState<string>(() => {
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
    postPreview(messageId.current, inGame, isAction, broadcast, name, parsed);
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
  const canNotSend = draft.trim() === '' || (inGame && name === '');
  const onSend = async () => {
    if (canNotSend) {
      return;
    }
    if (editTo) {
      await patch('/messages/edit', {
        messageId: editTo.id,
        name: inGame ? name : nickname,
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
  const cancelEdit = () => {
    if (editTo !== undefined) {
      const messageId = editTo.id;
      patch('/messages/edit', { messageId }).then();
      dispatch({ type: 'STOP_EDIT_MESSAGE', messageId, editFor: editTo.modified });
    }
  };
  const onEditName: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const { value } = e.target;
    setName(value.substr(0, 32));
  };
  return (
    <Container data-edit={editTo !== undefined}>
      <ChatItemTime timestamp={preview?.start || new Date().getTime()} />
      <Naming>
        <NameInput
          value={inGame ? name : nickname}
          disabled={!inGame}
          onChange={onEditName}
          placeholder="写下你的名字"
        />
      </Naming>
      <ChatItemContent entities={parsed.entities} text={parsed.text} action={isAction} inGame={inGame} />
      <ButtonBar>
        <ComposeButton css={[mR(1)]} data-on={inGame} onClick={toggleInGame}>
          <Icon sprite={mask} />
          <span>游戏内</span>
        </ComposeButton>
        <ComposeButton css={[mR(1)]} data-on={isAction} onClick={toggleAction}>
          <Icon sprite={running} />
          <span>动作</span>
        </ComposeButton>
        <ComposeButton data-on={broadcast} onClick={toggleBroadcast}>
          <Icon sprite={broadcastTower} />
          <span>预览</span>
        </ComposeButton>
      </ButtonBar>
      <SendContainer>
        {editTo && (
          <ComposeButton css={mR(1)} onClick={cancelEdit}>
            <Icon sprite={cancelIcon} />
          </ComposeButton>
        )}
        {editTo ? (
          <ComposeButton onClick={onSend} disabled={canNotSend}>
            <Icon sprite={editIcon} />
            <span>修改</span>
          </ComposeButton>
        ) : (
          <ComposeButton onClick={onSend} disabled={canNotSend}>
            <Icon sprite={paperPlane} />
            <span>发送</span>
          </ComposeButton>
        )}
      </SendContainer>
      <Compose value={draft} placeholder={inGame ? '书写独一无二的冒险吧' : '尽情聊天吧'} onChange={handleChange} />
    </Container>
  );
}

export default ChatPreviewCompose;
