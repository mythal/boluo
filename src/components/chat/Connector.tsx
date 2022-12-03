import { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/core';
import React from 'react';
import { spacingN } from '../../styles/atoms';
import { Id } from '../../utils/id';
import { get } from '../../api/request';
import store, { Dispatch, useDispatch } from '../../store';
import { connect } from '../../api/connect';
import { Events, SpaceUpdated } from '../../api/events';
import { connectSpace } from '../../actions';

export const PING = '♥';
export const PONG = '♡';

export const style = css`
  z-index: 999;
  position: fixed;
  top: ${spacingN(2)};
  right: ${spacingN(2)};
  padding: ${spacingN(2)};
  background-color: aqua;
  color: #1a202c;
`;

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

export type ConnectState = 'CONNECTING' | 'OPEN' | 'CLOSED';

const handleEvent = (dispatch: Dispatch, event: Events) => {
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
    for (const [userId, status] of Object.entries(statusMap)) {
      if (userId in usersStatus && usersStatus[userId].kind !== status.kind) {
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

const Retry = ({ second }: { second: number }) => {
  const [sec, setSec] = useState(second);
  useEffect(() => {
    const handle = window.setInterval(() => setSec((sec) => Math.max(sec - 1, 0)), 1000);
    return () => window.clearInterval(handle);
  }, []);
  return <div css={style}>链接出错，等待重连 ({sec})</div>;
};

interface Props {
  spaceId: Id;
  myId: Id | undefined;
}

const MAX_RETRY_WAIT_SEC = 7;

export const Connector = ({ spaceId, myId }: Props) => {
  const dispatch = useDispatch();
  const [state, setState] = useState<ConnectState>('CLOSED');
  const connectionRef = useRef<WebSocket | null>(null);

  const retrySec = useRef(0);
  const after = useRef<number>(0);

  useEffect(() => {
    const makeConnection = async () => {
      setState('CONNECTING');
      let token: string | null = null;
      try {
        token = await getConnectionToken(spaceId, myId);
      } catch {
        setState('CLOSED');
        if (Math.random() > 0.75) {
          retrySec.current += 1;
        } else {
          retrySec.current += 2;
        }
        if (retrySec.current >= MAX_RETRY_WAIT_SEC) {
          retrySec.current = MAX_RETRY_WAIT_SEC;
        }
        return;
      }
      const connection = connect(spaceId, token);
      connectionRef.current = connection;
      connection.onclose = (event) => {
        console.log('Websocket connection closed', event);
        if (event.code !== 1000) {
          setState('CLOSED');
          retrySec.current += 1;
        }
        connectionRef.current = null;
      };
      connection.onerror = (event) => {
        console.warn('WebSocket error ' + event);
      };
      connection.onmessage = (onMessageEvent) => {
        retrySec.current = 0;
        setState('OPEN');
        const received = onMessageEvent.data;
        if (received === PING) {
          connection.send(PONG);
          return;
        }
        const event: Events = JSON.parse(onMessageEvent.data);
        if (after.current >= event.timestamp) {
          return;
        }
        after.current = event.timestamp;
        handleEvent(dispatch, event);
      };
      dispatch(connectSpace(spaceId, connection));
    };
    if (state === 'CLOSED') {
      console.log('attempt to reconnection ', retrySec.current);
      const handle = window.setTimeout(() => {
        makeConnection().catch(console.warn);
      }, retrySec.current * 1000);
      return () => window.clearTimeout(handle);
    }
  }, [state, spaceId, myId, dispatch]);

  if (state === 'OPEN') {
    return null;
  }
  if (state === 'CLOSED' && retrySec.current > 0) {
    return <Retry second={retrySec.current} />;
  }
  return <div css={style}>连接中……</div>;
};
