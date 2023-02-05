import { useEffect } from 'react';
import { PreviewPost } from '../../../api/events';
import { useChannelId } from '../../../hooks/useChannelId';
import { useParse } from '../../../hooks/useParse';
import { useSend } from '../../../hooks/useSend';
import { useSelector } from '../../../store';

export const useSendPreview = () => {
  const channelId = useChannelId();
  const send = useSend();
  const initialized = useSelector((state) => state.chatStates.get(channelId)?.initialized ?? false);
  const parse = useParse();
  const compose = useSelector((state) => state.chatStates.get(channelId)!.compose);
  const { source, whisperTo, broadcast, inGame, messageId, editFor, inputName, isAction } = compose;
  const id = messageId;
  const nickname = useSelector((state) => state.profile?.user.nickname)!;
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member)!;

  useEffect(() => {
    if (!initialized) {
      return;
    }
    const handle = window.setTimeout(async () => {
      let name = nickname;
      if (inGame) {
        if (inputName) {
          name = inputName;
        } else {
          name = myMember.characterName;
        }
      }
      const preview: PreviewPost = {
        name,
        inGame,
        id,
        isAction,
        mediaId: null,
        editFor,
        clear: false,
        channelId,
        text: '',
        entities: [],
      };
      if (!broadcast && source.trim() === '') {
        // clear preview
      } else if (!broadcast || whisperTo) {
        preview.text = null;
      } else {
        const { text, entities } = parse(source);
        preview.text = text;
        preview.entities = entities;
      }
      send({ type: 'PREVIEW', preview });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [
    broadcast,
    channelId,
    id,
    inGame,
    editFor,
    initialized,
    inputName,
    isAction,
    myMember.characterName,
    nickname,
    parse,
    send,
    source,
    whisperTo,
  ]);
};
