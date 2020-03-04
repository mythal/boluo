import { Id } from '../../id';
import { Dispatch } from '../App';
import React, { useEffect, useState } from 'react';
import { get } from '../../api/request';
import { LoadMessages, NewAlert } from '../../states/actions';
import { Loading } from '../Loading';

interface Props {
  channelId: Id;
  dispatch: Dispatch;
  before: number;
}

export const LoadMoreButton = React.memo<Props>(({ dispatch, before, channelId }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    const limit = 128;
    get('/messages/by_channel', { channelId, before, limit }).then(result => {
      setLoading(false);
      if (result.isErr) {
        console.warn(result.value);
        dispatch<NewAlert>({ type: 'NEW_ALERT', level: 'ERROR', message: '载入新消息失败' });
        return;
      }
      const messages = result.value;
      if (messages.length >= limit) {
        messages.pop();
        dispatch<LoadMessages>({ type: 'LOAD_MESSAGES', messages, finished: false });
      } else {
        dispatch<LoadMessages>({ type: 'LOAD_MESSAGES', messages, finished: true });
      }
    });
  };

  return (
    <div className="w-full text-center">
      <button className="btn my-1 w-24 h-10" disabled={loading} onClick={handleClick}>
        {loading ? <Loading /> : '载入更多'}
      </button>
    </div>
  );
});
