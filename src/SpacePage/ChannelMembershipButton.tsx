import React from 'react';
import { post } from '../api/request';
import { useDispatch } from '../App/App';
import { JOINED_CHANNEL, JoinedChannel, LEFT_CHANNEL, LeftChannel } from '../App/actions';
import { Channel } from '../api/channels';
import { errorText } from '../api/error';

interface Props {
  channel: Channel;
  joined: boolean;
}

export const ChannelMembershipButton: React.FC<Props> = ({ joined, channel }) => {
  const dispatch = useDispatch();
  const { id, name } = channel;
  const channelId = id;
  const handle = async () => {
    if (!joined) {
      const characterName = '';
      const result = await post('/channels/join', { channelId, characterName });
      if (result.isOk) {
        dispatch<JoinedChannel>({ tag: JOINED_CHANNEL, ...result.value });
      }
    } else if (window.confirm(`你确认要离开「${name}」频道吗？`)) {
      const result = await post('/channels/leave', {}, { id });
      if (result.isOk) {
        dispatch<LeftChannel>({ tag: LEFT_CHANNEL, id });
      } else {
        alert(errorText(result.value));
      }
    }
  };
  return (
    <button className="btn p-1" type="button" onClick={handle}>
      {joined ? '离开频道' : '加入频道'}
    </button>
  );
};
