import { ClientEvent, PreviewPost } from 'api';
import { useEffect, useRef } from 'react';
import { makeId } from 'utils';
import { ComposeState } from '../../state/compose';
import { getConnection } from '../../state/connection';

const SEND_PREVIEW_TIMEOUT_MS = 250;
const isVaildName = (name: string) => {
  return name.trim().length > 0;
};

export const useSendPreview = (channelId: string, nickname: string, compose: ComposeState) => {
  const sendTimeoutRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(sendTimeoutRef.current);

    sendTimeoutRef.current = window.setTimeout(() => {
      const { inGame, isAction, source, previewId, inputedName } = compose;
      const inGameName = inputedName || '';
      if (!previewId) {
        return;
      }
      const preview: PreviewPost = {
        id: previewId || makeId(),
        channelId,
        name: inGame ? inGameName : nickname,
        mediaId: null,
        inGame,
        isAction,
        text: source,
        clear: false,
        entities: [],
        editFor: null,
      };

      const clientEvent: ClientEvent = { type: 'PREVIEW', preview };
      const connection = getConnection();
      if (connection) {
        connection.send(JSON.stringify(clientEvent));
      }
    }, SEND_PREVIEW_TIMEOUT_MS);
    return () => window.clearTimeout(sendTimeoutRef.current);
  }, [channelId, compose, nickname]);
};
