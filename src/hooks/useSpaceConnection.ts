import { useDispatch, useSelector } from '../store';
import { useEffect, useRef } from 'react';
import { connect } from '../api/connect';
import { Events } from '../api/events';
import { connectSpace, SpaceUpdated } from '../actions/ui';

export function useSpaceConnection() {
  const dispatch = useDispatch();
  const spaceId = useSelector((state) => state.ui.spaceId);

  const after = useRef<number>(0);

  const conn = async (): Promise<WebSocket> => {
    if (!spaceId) {
      throw new Error('unexpected');
    }
    const connection = await connect(spaceId);
    connection.onerror = (e) => {
      console.warn(e);
    };

    connection.onmessage = (wsMsg) => {
      const last = after.current;
      const event = JSON.parse(wsMsg.data) as Events;
      // if (event.timestamp < last) {
      //   return;
      // }
      after.current = event.timestamp;
      const { body } = event;
      if (body.type === 'SPACE_UPDATED') {
        const { spaceWithRelated } = body;
        const action: SpaceUpdated = { type: 'SPACE_UPDATED', spaceWithRelated };
        dispatch(action);
      } else {
        dispatch({ type: 'EVENT_RECEIVED', event });
      }
    };
    // connection.onclose = (e) => {
    //   console.warn(e);
    //   window.setTimeout(() => {dispatch}, 5000);
    // };
    return connection;
  };

  useEffect(() => {
    if (spaceId) {
      (async () => {
        const connection = await conn();
        dispatch(connectSpace(spaceId, connection));
        return () => {
          connection.onerror = null;
          connection.onclose = null;
          connection.close();
        };
      })();
    }
  }, [spaceId, dispatch]);
}
