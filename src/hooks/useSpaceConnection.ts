import { useDispatch, useSelector } from '../store';
import { useCallback, useRef } from 'react';
import { connect } from '../api/connect';
import { Events } from '../api/events';
import { connectSpace, SpaceUpdated } from '../actions/ui';
import { get } from '../api/request';
import { useMyId } from './useMyId';
import { Id } from '../utils/id';
import { atom } from 'jotai';
import { useUpdateAtom } from 'jotai/utils';

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
  const myId = useMyId();
  const spaceId = useSelector((state) => state.ui.spaceId);
  const setConnectState = useUpdateAtom(connectStateAtom);

  const after = useRef<number>(0);
  const retry = useRef<number>(0);

  const conn = useCallback(async (): Promise<WebSocket> => {
    if (!spaceId) {
      throw new Error('unexpected error: there is no space id');
    }
    const connection = await connect(spaceId, await getConnectionToken(spaceId, myId));
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
      } else {
        dispatch({ type: 'EVENT_RECEIVED', event });
      }
    };
    connection.onerror = (e) => {
      console.warn('connection error: ', e);
      setConnectState('CLOSED');
    };
    connection.onclose = (e) => {
      console.warn('connection close: ', e);
      setConnectState('CLOSED');
    };
    dispatch(connectSpace(spaceId, connection));
    return connection;
  }, [dispatch, myId, setConnectState, spaceId]);

  return conn;
}
