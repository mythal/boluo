import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useRef } from 'react';
import { connectSpace, SpaceUpdated } from '../actions';
import { connect } from '../api/connect';
import { EventId, Events } from '../api/events';
import { get } from '../api/request';
import { selectBestBaseUrl } from '../base-url';
import { autoSelectAtom } from '../states/connection';
import store, { useDispatch, useSelector } from '../store';
import { Id } from '../utils/id';
import { useMyId } from './useMyId';

export type ConnectState = 'CONNECTING' | 'OPEN' | 'CLOSED';

export const connectStateAtom = atom<ConnectState>('CONNECTING');

export async function getConnectionToken(
  spaceId: Id,
  myId: Id | undefined,
): Promise<string | null> {
  if (!myId) {
    return null;
  }
  const tokenResult = await get('/events/token', { id: spaceId });
  if (tokenResult.isOk) {
    if (tokenResult.value.token) {
      return tokenResult.value.token;
    }
  }
  return null;
}

export function useSpaceConnection() {
  const autoSelect = useAtomValue(autoSelectAtom);
  const dispatch = useDispatch();
  const baseUrl = useSelector((state) => state.ui.baseUrl);
  const myId = useMyId();
  const spaceId = useSelector((state) => state.ui.spaceId);
  const setConnectState = useSetAtom(connectStateAtom);

  const after = useRef<EventId>({ timestamp: 0, seq: 0, node: 0 });
  const retry = useRef<number>(0);

  const conn = useCallback(async (): Promise<WebSocket> => {
    if (!spaceId) {
      throw new Error('unexpected error: there is no space id');
    }
    const connection = connect(
      baseUrl,
      spaceId,
      await getConnectionToken(spaceId, myId),
      after.current.timestamp,
      after.current.node,
      after.current.seq,
    );
    connection.onerror = (e) => {
      console.warn(e);
    };
    connection.onopen = () => {
      retry.current = 0;
    };

    connection.onmessage = (wsMsg) => {
      setConnectState('OPEN');
      const event = JSON.parse(wsMsg.data as string) as Events;
      after.current = event.id;
      const { body } = event;
      if (body.type === 'APP_UPDATED') {
        location.reload();
      } else if (body.type === 'ERROR') {
        connection.close(300, body.code ?? 'UNEXPECTED');
        return;
      } else if (body.type === 'SPACE_UPDATED') {
        const { spaceWithRelated } = body;
        const action: SpaceUpdated = { type: 'SPACE_UPDATED', spaceWithRelated };
        dispatch(action);
      } else if (body.type === 'STATUS_MAP') {
        const { statusMap, spaceId } = body;
        const spaceResult = store.getState().ui.spaceSet.get(spaceId);
        if (!spaceResult || spaceResult.isErr) {
          return;
        }
        const { usersStatus } = spaceResult.value;
        let shouldUpdate = false;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [userId, status] of Object.entries(statusMap)) {
          if (userId in usersStatus && usersStatus[userId].kind !== statusMap[userId].kind) {
            shouldUpdate = true;
          }
        }
        if (shouldUpdate) {
          dispatch({ type: 'EVENT_RECEIVED', event });
        }
      } else {
        dispatch({ type: 'EVENT_RECEIVED', event });
      }
    };
    connection.onerror = (e) => {
      console.warn('connection error: ', e);
      setConnectState('CLOSED');
      if (autoSelect) {
        selectBestBaseUrl(baseUrl).then((baseUrl) =>
          dispatch({ type: 'CHANGE_BASE_URL', baseUrl }),
        );
      }
    };
    connection.onclose = (e) => {
      console.warn('connection close: ', e);
      setConnectState('CLOSED');
    };
    dispatch(connectSpace(spaceId, connection));
    return connection;
  }, [autoSelect, baseUrl, dispatch, myId, setConnectState, spaceId]);

  return conn;
}
