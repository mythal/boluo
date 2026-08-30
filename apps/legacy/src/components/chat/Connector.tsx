import { useAtom } from 'jotai';
import { publishOwnPreviewAcknowledgement } from '@boluo/api/preview/ack';
import { closeWebSocketNormally } from '@boluo/api/websocket/close';
import { useEffect, useRef, useState } from 'react';
import { connectSpace } from '../../actions';
import { connect } from '../../api/connect';
import { selectFailoverBaseUrl } from '../../base-url';
import {
  compareEvents,
  type EventId,
  type Events,
  type SpaceUpdated,
  shouldAdvanceCursor,
} from '../../api/events';
import { get } from '../../api/request';
import { connectionStateAtom } from '../../states/connection';
import store, { type Dispatch, useDispatch, useSelector } from '../../store';
import { type Id } from '../../utils/id';
import Button from '../atoms/Button';
import { captureRecoverableException, recordWarning } from '../../error-reporting';

export const PING = '♥';
export const PONG = '♡';

export const connectionStatusClassName =
  'fixed top-6 right-1/2 z-[999] translate-x-1/2 rounded-[0.25rem] bg-[aqua] px-4 py-2 text-[0.875rem] text-legacy-gray-900 shadow-[0_0_24px_#000]';

const RETRY_SLEEP_MS = [0, 20, 100];
const TOKEN_VALIDITY_MS = 60_000;
const TOKEN_EXPIRY_SAFETY_MS = 5_000;
const MAX_TOKEN_AGE_MS = TOKEN_VALIDITY_MS - TOKEN_EXPIRY_SAFETY_MS;

async function getConnectionToken(
  spaceId: Id,
  userId: Id | undefined,
  retryCount: number = 0,
): Promise<
  { token: string; issuedAt: number } | 'NETWORK_ERROR' | 'UNAUTHENTICATED' | 'UNEXPECTED'
> {
  const tokenResult = await get('/updates/token', { spaceId, userId });
  if (tokenResult.isOk) {
    return { token: tokenResult.value.token, issuedAt: tokenResult.value.issuedAt };
  }
  const err = tokenResult.value;
  if (err.code === 'FETCH_FAIL') {
    if (retryCount >= RETRY_SLEEP_MS.length) {
      return 'NETWORK_ERROR';
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_SLEEP_MS[retryCount]));
    return getConnectionToken(spaceId, userId, retryCount + 1);
  } else if (err.code === 'UNAUTHENTICATED') {
    return 'UNAUTHENTICATED';
  } else {
    return 'UNEXPECTED';
  }
}

export type ConnectState = 'CONNECTING' | 'OPEN' | 'CLOSED';

const handleEvent = (
  dispatch: Dispatch,
  setState: (state: ConnectState) => void,
  event: Events,
  resetCursor: () => void,
  refreshInvalidatedSpace: (spaceId: Id) => void,
) => {
  const { body } = event;
  if (body.type === 'APP_UPDATED') {
    location.reload();
  } else if (body.type === 'ERROR') {
    if (body.code === 'CURSOR_TOO_OLD') {
      if (confirm('客户端状态已过期，是否刷新页面？')) {
        location.reload();
      } else {
        // The server closes the connection after this error; without a
        // cursor reset every automatic reconnect would hit the same error
        // and reopen this dialog.
        resetCursor();
      }
      return;
    }
    recordWarning(`WebSocket server error: ${body.code}`, { source: 'websocket-server' });
    setState('CLOSED');
  } else if (body.type === 'SPACE_UPDATED') {
    const { spaceWithRelated } = body;
    const action: SpaceUpdated = { type: 'SPACE_UPDATED', spaceWithRelated };
    dispatch(action);
  } else if (body.type === 'CHANNEL_INVALIDATED' || body.type === 'SPACE_INVALIDATED') {
    const invalidatedSpaceId = body.type === 'SPACE_INVALIDATED' ? body.spaceId : event.mailbox;
    refreshInvalidatedSpace(invalidatedSpaceId);
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
  const baseUrlChangeReason = useSelector((state) => state.ui.baseUrlChangeReason);
  const [state, setState] = useAtom(connectionStateAtom);
  const stateRef = useRef<ConnectState>(state);
  const [retrySec, setRetrySec] = useState<number>(0);
  const connectionRef = useRef<WebSocket | null>(null);
  const baseUrlRef = useRef<string>(baseUrl);
  const mountedRef = useRef(false);

  const retryCount = useRef(0);
  const cursor = useRef<EventId>({ timestamp: 0, node: 0, seq: 0 });
  const spaceRefreshIdRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      baseUrlRef.current = baseUrl;
      return;
    }
    baseUrlRef.current = baseUrl;
    if (connectionRef.current) {
      connectionRef.current.onclose = null;
      connectionRef.current.onerror = null;
      connectionRef.current.onmessage = null;
      closeWebSocketNormally(connectionRef.current, baseUrlChangeReason);
      connectionRef.current = null;
    }
    retryCount.current = 0;
    // Part of the reconnect state machine: a new base URL restarts backoff.
    // eslint-disable-next-line @eslint-react/set-state-in-effect
    setRetrySec(0);
    setState('CLOSED');
  }, [baseUrl, baseUrlChangeReason, setState]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stateRef.current = 'CLOSED';
      setState('CLOSED');
      const connection = connectionRef.current;
      if (connection) {
        connection.onclose = null;
        connection.onerror = null;
        connection.onmessage = null;
        closeWebSocketNormally(connection, 'LEGACY_CONNECTOR_DISPOSED');
        connectionRef.current = null;
      }
    };
  }, [setState]);

  useEffect(() => {
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
    const makeConnection = async () => {
      setState('CONNECTING');
      const tokenResult = await getConnectionToken(spaceId, myId);
      if (!mountedRef.current) {
        return;
      }
      if (tokenResult === 'UNAUTHENTICATED') {
        retry();
        return;
      }
      if (tokenResult === 'NETWORK_ERROR') {
        retry();
        return;
      }
      if (tokenResult === 'UNEXPECTED') {
        retry();
        return;
      }
      const tokenAgeMs = Math.max(0, Date.now() - tokenResult.issuedAt);
      if (tokenAgeMs > MAX_TOKEN_AGE_MS) {
        retry();
        return;
      }
      const connection = connect(
        baseUrlRef.current,
        spaceId,
        myId,
        tokenResult.token,
        cursor.current.timestamp,
        cursor.current.node,
        cursor.current.seq,
      );
      connectionRef.current = connection;
      const refreshInvalidatedSpace = (invalidatedSpaceId: Id) => {
        if (invalidatedSpaceId !== spaceId) {
          return;
        }
        const refreshId = ++spaceRefreshIdRef.current;
        void get('/spaces/query_with_related', { id: invalidatedSpaceId }).then((result) => {
          if (
            !mountedRef.current ||
            connectionRef.current !== connection ||
            spaceRefreshIdRef.current !== refreshId ||
            result.isErr
          ) {
            return;
          }
          const action: SpaceUpdated = {
            type: 'SPACE_UPDATED',
            spaceWithRelated: result.value,
          };
          dispatch(action);
        });
      };
      connection.onclose = (event) => {
        if (event.code === 1000) {
          retry();
          return;
        }
        setState('CONNECTING');
        const failedBaseUrl = baseUrlRef.current;
        void selectFailoverBaseUrl(failedBaseUrl)
          .then((selectedUrl) => {
            const isCurrentFailure =
              mountedRef.current &&
              connectionRef.current === connection &&
              store.getState().ui.baseUrl === failedBaseUrl;
            if (!isCurrentFailure) return;
            if (selectedUrl && selectedUrl !== failedBaseUrl) {
              dispatch({
                type: 'CHANGE_BASE_URL',
                baseUrl: selectedUrl,
                reason: 'LEGACY_FAILOVER_ROUTE_CHANGED',
              });
            } else {
              retry();
            }
          })
          .catch(() => {
            if (
              mountedRef.current &&
              connectionRef.current === connection &&
              store.getState().ui.baseUrl === failedBaseUrl
            ) {
              retry();
            }
          });
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
        let event: Events;
        try {
          event = JSON.parse(received) as Events;
        } catch (e) {
          captureRecoverableException(e, { source: 'websocket-message-parser' });
          return;
        }

        // Advance cursor
        if (shouldAdvanceCursor(event)) {
          if (compareEvents(event.id, cursor.current) <= 0) return;
          cursor.current = event.id;
        }

        publishOwnPreviewAcknowledgement(event, myId, connection);
        handleEvent(
          dispatch,
          setState,
          event,
          () => {
            cursor.current = { timestamp: 0, node: 0, seq: 0 };
          },
          refreshInvalidatedSpace,
        );
      };
      dispatch(connectSpace(spaceId, connection));
    };
    if (state === 'CLOSED' && retrySec === 0) {
      void makeConnection().catch((error: unknown) => {
        if (!mountedRef.current) {
          return;
        }
        captureRecoverableException(error, { source: 'websocket-connect' });
        retry();
      });
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
        <div className={connectionStatusClassName}>
          <Button
            onClick={() => {
              retryCount.current = 10;
              setRetrySec(5);
              const connection = connectionRef.current;
              if (connection != null) {
                closeWebSocketNormally(connection, 'DEBUG_DISCONNECT');
              }
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
    return <div className={connectionStatusClassName}>链接出错，等待重连 ({retrySec})</div>;
  }
  return <div className={connectionStatusClassName}>连接中……</div>;
};
