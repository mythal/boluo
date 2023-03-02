import type { ClientEvent, PreviewPost } from 'api';
import { atomFamily, atomWithReducer } from 'jotai/utils';
import { makeId } from 'utils';
import { composeReducer, ComposeState, initialComposeState } from '../compose';
import { getConnection } from '../connection';
import { store } from '../store';

const SEND_PREVIEW_TIMEOUT_MS = 250;

export const composeAtomFamily = atomFamily((channelId: string) => {
  const composeAtom = atomWithReducer(initialComposeState, composeReducer);
  let sendPreviewTimeout: number | undefined;
  store.sub(composeAtom, () => {
    window.clearTimeout(sendPreviewTimeout);
    sendPreviewTimeout = window.setTimeout(() => {
      const compose: ComposeState = store.get(composeAtom);
      if (!compose) return;

      const { inGame, isAction, source, previewId } = compose;
      const preview: PreviewPost = {
        id: previewId || makeId(),
        channelId,
        name: 'koppa',
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
  });
  return composeAtom;
});
