import React, { useRef } from 'react';
import gql from 'graphql-tag';
import { useQuery, useSubscription } from '@apollo/react-hooks';
import { Message } from '../Message/Message';
import { MessageView } from '../Message/MessageView';
import { UpdateQueryOptions } from 'apollo-client';

export interface Props {
  id: string;
}

const CHANNEL = gql`
  query getChannel($id: ID!) {
    getChannelById(id: $id) {
      title
      topic
      created
      modified
      messages {
        id
        text
        created
        senderId
        character
        sender {
          id
          username
          nickname
        }
      }
    }
  }
`;

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
        }
      }
      messageDeleted
      publishTime
    }
  }
`;

interface Channel {
  title: string;
  topic: string;
  created: Date;
  modified: Date;
  messages: Message[];
}

interface QueryResult {
  getChannelById: Channel;
}

interface Id {
  id: string;
}

interface SubscribeChannelEvent {
  channelEvent: {
    newMessage?: Message;
    messageDeleted?: string;
    publishTime: number;
  };
}

type UpdateQuery = (mapFn: (prev: QueryResult, options: UpdateQueryOptions<Id>) => QueryResult) => void;

const useChannelEvent = (id: string, updateQuery: UpdateQuery) => {
  const { loading, data, error } = useSubscription<SubscribeChannelEvent, Id>(CHANNEL_EVENT, { variables: { id } });

  const lastTimeRef = useRef<number>(new Date().getTime());
  if (loading) {
    return;
  } else if (error) {
    console.warn('Unknown subscription error');
    console.log(error);
    return;
  } else if (data === undefined) {
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

export const Channel = ({ id }: Props) => {
  const { error, loading, data, updateQuery } = useQuery<QueryResult, Id>(CHANNEL, { variables: { id } });

  useChannelEvent(id, updateQuery);
  if (error) {
    return <p>Failed to fetch channel.</p>;
  } else if (loading) {
    return <p>Loading...</p>;
  } else if (data === undefined) {
    return <p>Failure: empty data.</p>;
  }
  const channel = data.getChannelById;
  const messages = channel.messages.map(message => (
    <li key={message.id}>
      <MessageView message={message} />
    </li>
  ));
  return (
    <article className="Channel">
      <h1>{channel.title}</h1>
      <ul>{messages}</ul>
    </article>
  );
};
