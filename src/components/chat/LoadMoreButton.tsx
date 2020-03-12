import { Id } from '../../id';
import { useDispatch } from '../Provider';
import React, { useState } from 'react';
import { get } from '../../api/request';
import { Loading } from '../Loading';
import { LoadMessages } from '../../actions/chat';
import { showError } from '../../actions/information';

interface Props {
  channelId: Id;
  before: number;
}

export const LoadMoreButton = React.memo<Props>(({ before, channelId }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    const limit = 128;
    get('/messages/by_channel', { channelId, before, limit }).then(result => {
      setLoading(false);
      if (result.isErr) {
        console.warn(result.value);
        showError(<span>载入新消息失败</span>);
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
      <button className="btn my-1 w-24 h-10 my-4" disabled={loading} onClick={handleClick}>
        {loading ? <Loading /> : '载入更多'}
      </button>
    </div>
  );
});
