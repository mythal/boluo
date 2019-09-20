import React from 'react';
import gql from 'graphql-tag';
import { useQuery } from '@apollo/react-hooks';
import { Message } from '../Message/Message';
import { useChannelEvent } from './event';
import { MessageList } from '../MessageList/MessageList';

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
        type
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

export interface QueryResult {
  getChannelById: Channel;
}

export interface Id {
  id: string;
}

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

  return (
    <article className="Channel">
      <h1>{channel.title}</h1>
      <MessageList messages={channel.messages} />
    </article>
  );
};
