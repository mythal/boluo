import { useEffect, useRef } from 'react';
import { type ClientEvent, type PreviewPost } from '../../../api/events';
import { useChannelId } from '../../../hooks/useChannelId';
import { useParse } from '../../../hooks/useParse';
import { useSelector } from '../../../store';
import {
  buildPreviewDiffPlan,
  nextKeyframeVersion,
  type PreviewSendState,
  toPreviewSendState,
} from './previewDiffPlanner';

const SEND_PREVIEW_TIMEOUT_MS = 200;

export const useSendPreview = () => {
  const channelId = useChannelId();
  const initialized = useSelector((state) => state.chatStates.get(channelId)?.initialized ?? false);
  const parse = useParse();
  const compose = useSelector((state) => state.chatStates.get(channelId)!.compose);
  const { source, whisperTo, broadcast, inGame, messageId, edit, inputName, isAction } = compose;
  const id = messageId;
  const nickname = useSelector((state) => state.profile?.user.nickname)!;
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member)!;
  const connection = useSelector((state) => state.ui.connection);
  const sendTimeoutRef = useRef<number | undefined>(undefined);
  const sendStateRef = useRef<PreviewSendState | null>(null);
  const previousConnectionRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (connection == null) {
      previousConnectionRef.current = null;
      sendStateRef.current = null;
      return;
    }
    if (previousConnectionRef.current !== connection) {
      previousConnectionRef.current = connection;
      sendStateRef.current = null;
    }
  }, [connection]);

  useEffect(() => {
    if (!initialized) return;
    if (connection == null) return;
    if (!document.hasFocus()) return;
    window.clearTimeout(sendTimeoutRef.current);
    sendTimeoutRef.current = window.setTimeout(() => {
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
        edit,
        clear: false,
        channelId,
        text: '',
        entities: [],
      };
      const doNotBroadcast = !broadcast || whisperTo != null;
      if (!broadcast && source.trim() === '') {
        // clear preview
      } else if (doNotBroadcast) {
        preview.text = null;
      } else {
        const { text, entities } = parse(source);
        preview.text = text;
        preview.entities = entities;
      }
      const resetPreview = preview.text === '' || preview.entities.length === 0;
      const currentSendState = sendStateRef.current;
      const now = Date.now();
      if (currentSendState != null) {
        const diffPlan = buildPreviewDiffPlan({
          channelId,
          currentSendState,
          nextPreview: preview,
          now,
          doNotBroadcast,
          resetPreview,
        });
        if (diffPlan.type === 'DIFF') {
          const clientEvent: ClientEvent = { type: 'DIFF', preview: diffPlan.diff };
          if (connection.readyState !== WebSocket.OPEN) {
            return;
          }
          connection.send(JSON.stringify(clientEvent));
          sendStateRef.current = diffPlan.nextState;
          return;
        }
        if (diffPlan.type === 'NOOP') {
          return;
        }
      }

      const keyframeVersion = nextKeyframeVersion(currentSendState, id);
      const keyframePreview: PreviewPost = { ...preview, v: keyframeVersion };
      const clientEvent: ClientEvent = { type: 'PREVIEW', preview: keyframePreview };
      if (connection.readyState !== WebSocket.OPEN) {
        return;
      }
      connection.send(JSON.stringify(clientEvent));
      sendStateRef.current = toPreviewSendState(keyframePreview, keyframeVersion, now);
    }, SEND_PREVIEW_TIMEOUT_MS);
    return () => window.clearTimeout(sendTimeoutRef.current);
  }, [
    broadcast,
    channelId,
    connection,
    id,
    inGame,
    edit,
    initialized,
    inputName,
    isAction,
    myMember.characterName,
    nickname,
    parse,
    source,
    whisperTo,
  ]);
};
