import { useSubscription } from '@apollo/react-hooks';
import { useRef } from 'react';
import { Message } from '../Message/Message';
import { UpdateQueryOptions } from 'apollo-client';
import { Id, QueryResult } from './Channel';
import gql from 'graphql-tag';

const CHANNEL_EVENT = gql`
  subscription channelEvent($id: ID!) {
    channelEvent(channelId: $id) {
      newMessage {
        id
        text
        created
        senderId
        character
        sender {
          id
          username
          nickname
          isOnline
        }
      }
      messageDeleted
      publishTime
    }
  }
`;

interface SubscribeChannelEvent {
  channelEvent: {
    newMessage?: Message;
    messageDeleted?: string;
    publishTime: number;
  };
}

type UpdateQuery = (mapFn: (prev: QueryResult, options: UpdateQueryOptions<Id>) => QueryResult) => void;

export const useChannelEvent = (id: string, updateQuery: UpdateQuery) => {
  const { loading, data, error } = useSubscription<SubscribeChannelEvent, Id>(CHANNEL_EVENT, { variables: { id } });

  const lastTimeRef = useRef<number>(new Date().getTime());
  if (loading || error || !data) {
    // if (error) {
    //   debugger;
    // }
    return;
  }
  const event = data.channelEvent;
  if (event.publishTime <= lastTimeRef.current) {
    return;
  }
  lastTimeRef.current = event.publishTime;
  if (event.newMessage) {
    const message = event.newMessage;
    updateQuery(prev => {
      const messages = [message, ...prev.getChannelById.messages];
      return { getChannelById: { ...prev.getChannelById, messages } };
    });
  } else if (event.messageDeleted) {
    const id = event.messageDeleted;
    updateQuery(prev => {
      const messages = prev.getChannelById.messages.filter(message => message.id !== id);
      return { getChannelById: { ...prev.getChannelById, messages } };
    });
  }
  return;
};
