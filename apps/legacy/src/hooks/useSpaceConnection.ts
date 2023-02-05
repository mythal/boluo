import { atom } from 'jotai';
import { useUpdateAtom } from 'jotai/utils';
import { useCallback, useRef } from 'react';
import { connectSpace, SpaceUpdated } from '../actions';
import { connect } from '../api/connect';
import { Events } from '../api/events';
import { get } from '../api/request';
import { selectBestBaseUrl } from '../base-url';
import store, { useDispatch, useSelector } from '../store';
import { Id } from '../utils/id';
import { useMyId } from './useMyId';

export type ConnectState = 'CONNECTING' | 'OPEN' | 'CLOSED';

export const connectStateAtom = atom<ConnectState>('CONNECTING');

export async function getConnectionToken(spaceId: Id, myId: Id | undefined): Promise<string | null> {
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
  const dispatch = useDispatch();
  const baseUrl = useSelector((state) => state.ui.baseUrl);
  const myId = useMyId();
  const spaceId = useSelector((state) => state.ui.spaceId);
  const setConnectState = useUpdateAtom(connectStateAtom);

  const after = useRef<number>(0);
  const retry = useRef<number>(0);

  const conn = useCallback(async (): Promise<WebSocket> => {
    if (!spaceId) {
      throw new Error('unexpected error: there is no space id');
    }
    const connection = await connect(baseUrl, spaceId, await getConnectionToken(spaceId, myId));
    connection.onerror = (e) => {
      console.warn(e);
    };
    connection.onopen = () => {
      retry.current = 0;
    };

    connection.onmessage = (wsMsg) => {
      setConnectState('OPEN');
      const event = JSON.parse(wsMsg.data) as Events;
      after.current = event.timestamp;
      const { body } = event;
      if (body.type === 'APP_UPDATED') {
        location.reload();
      }
      if (body.type === 'SPACE_UPDATED') {
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
      selectBestBaseUrl(baseUrl).then((baseUrl) => dispatch({ type: 'CHANGE_BASE_URL', baseUrl }));
    };
    connection.onclose = (e) => {
      console.warn('connection close: ', e);
      setConnectState('CLOSED');
    };
    dispatch(connectSpace(spaceId, connection));
    return connection;
  }, [baseUrl, dispatch, myId, setConnectState, spaceId]);

  return conn;
}
