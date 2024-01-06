import { css } from '@emotion/react';
import { useAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { connectSpace } from '../../actions';
import { connect } from '../../api/connect';
import { compareEvents, EventId, Events, SpaceUpdated } from '../../api/events';
import { get } from '../../api/request';
import { connectionStateAtom } from '../../states/connection';
import store, { Dispatch, useDispatch, useSelector } from '../../store';
import { shadowXl, spacingN, textSm } from '../../styles/atoms';
import { Id } from '../../utils/id';
import Button from '../atoms/Button';

export const PING = '♥';
export const PONG = '♡';

export const style = css`
  z-index: 999;
  position: fixed;
  border-radius: 0.25rem;
  ${shadowXl};
  ${textSm};
  top: ${spacingN(6)};
  right: 50%;
  transform: translateX(50%);
  padding: ${spacingN(2)} ${spacingN(4)};
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

interface Props {
  spaceId: Id;
  myId: Id | undefined;
}

const RETRY_WAIT_SEC = [0, 0, 1, 2, 3, 3, 5, 6, 6, 6, 6];
const DEVELOPMENT = false;

export const Connector = ({ spaceId, myId }: Props) => {
  const dispatch = useDispatch();
  const baseUrl = useSelector((state) => state.ui.baseUrl);
  const [state, setState] = useAtom(connectionStateAtom);
  const stateRef = useRef<ConnectState>(state);
  const [retrySec, setRetrySec] = useState<number>(0);
  const connectionRef = useRef<WebSocket | null>(null);
  const baseUrlRef = useRef<string>(baseUrl);

  const retryCount = useRef(0);
  const after = useRef<EventId>({ timestamp: 0, node: 0, seq: 0 });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    baseUrlRef.current = baseUrl;
    if (stateRef.current === 'OPEN') {
      if (connectionRef.current) {
        connectionRef.current.close();
      }
    }
    return () => {
      setState('CLOSED');
    };
  }, [baseUrl, setState]);

  useEffect(() => {
    const makeConnection = async () => {
      const retry = () => {
        setState('CLOSED');
        retryCount.current += 1;
        if (retryCount.current <= 2) {
          setRetrySec(0);
        } else if (retryCount.current >= RETRY_WAIT_SEC.length) {
          setRetrySec(7);
        } else {
          const x = Math.random();
          let sec = RETRY_WAIT_SEC[retryCount.current];
          if (x > 0.66666) {
            sec += 1;
          } else if (x < 0.33333) {
            sec -= 1;
          }
          setRetrySec(sec);
        }
        connectionRef.current = null;
      };
      setState('CONNECTING');
      let token: string | null = null;
      try {
        token = await getConnectionToken(spaceId, myId);
      } catch {
        retry();
        return;
      }
      const connection = connect(baseUrlRef.current, spaceId, token, after.current.timestamp, after.current.seq);
      connectionRef.current = connection;
      connection.onclose = (event) => {
        console.log('Websocket connection closed', event);
        if (event.code !== 1000) {
          retry();
          return;
        }
        connectionRef.current = null;
      };
      connection.onerror = (event) => {
        console.warn('WebSocket error ', event);
      };
      connection.onmessage = (onMessageEvent) => {
        retryCount.current = 0;
        if (stateRef.current !== 'OPEN') {
          setState('OPEN');
        }
        const received = onMessageEvent.data as string;
        if (received === PING) {
          connection.send(PONG);
          return;
        }
        const event: Events = JSON.parse(received) as Events;
        if (compareEvents(after.current, event.id) > 0) {
          return;
        }
        after.current = event.id;
        handleEvent(dispatch, event);
      };
      dispatch(connectSpace(spaceId, connection));
    };
    if (state === 'CLOSED' && retrySec === 0) {
      console.log('attempt to reconnection ', retryCount.current);
      makeConnection().catch(console.warn);
    }
  }, [state, spaceId, myId, dispatch, retrySec, setState]);

  useEffect(() => {
    if (retrySec === 0) {
      return;
    }
    const handle = window.setTimeout(() => {
      setRetrySec((x) => x - 1);
    }, 1000);
    return () => {
      window.clearTimeout(handle);
    };
  }, [retrySec]);

  if (state === 'OPEN') {
    if (DEVELOPMENT) {
      return (
        <div css={style}>
          <Button
            onClick={() => {
              retryCount.current = 10;
              setRetrySec(5);
              connectionRef.current?.close();
            }}
          >
            断开连接
          </Button>
        </div>
      );
    }
    return null;
  }
  if (state === 'CLOSED' && retrySec > 0) {
    return <div css={style}>链接出错，等待重连 ({retrySec})</div>;
  }
  return <div css={style}>连接中……</div>;
};
